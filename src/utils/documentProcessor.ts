import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { uploadFileToSupabase } from './supabase';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ProcessedDocument {
  filename: string;
  mimeType: string;
  text?: string;
  base64?: string;
  supabaseUrl?: string;
  isScannedPdf?: boolean;
}

/**
 * Resizes and compresses an image if it exceeds max dimension.
 */
export async function compressImageIfNeeded(file: File | Blob, maxDim = 1600): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.85);
      } else {
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/**
 * Reads a Blob/File as Base64 string (without the data URL prefix).
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts text from a PDF document using PDF.js with 2D layout awareness (preserving table rows and columns).
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    const maxPages = Math.min(pdf.numPages, 10);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const rawItems = (textContent.items || []).filter((item: any) => item && typeof item.str === 'string' && item.str.trim() !== '');

      if (rawItems.length === 0) continue;

      // Group items into rows based on Y coordinate (PDF.js transform: [scaleX, skewY, skewX, scaleY, transX, transY])
      const itemsWithCoords = rawItems.map((item: any) => ({
        str: item.str,
        x: item.transform ? Number(item.transform[4]) : 0,
        y: item.transform ? Number(item.transform[5]) : 0
      }));

      // Sort items by Y descending (top-to-bottom on page)
      itemsWithCoords.sort((a, b) => b.y - a.y);

      // Cluster items with Y within 4px into the same line
      const lines: { y: number; items: typeof itemsWithCoords }[] = [];
      for (const item of itemsWithCoords) {
        let line = lines.find(l => Math.abs(l.y - item.y) <= 4);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }

      // Re-sort lines from top to bottom
      lines.sort((a, b) => b.y - a.y);

      // Within each line, sort from left to right and join with appropriate spacing
      const pageLines = lines.map(line => {
        line.items.sort((a, b) => a.x - b.x);
        let lineStr = '';
        let lastX = -1;
        for (const item of line.items) {
          if (lastX >= 0) {
            const gap = item.x - lastX;
            if (gap > 20) lineStr += '\t';
            else lineStr += ' ';
          }
          lineStr += item.str;
          lastX = item.x + (item.str.length * 5);
        }
        return lineStr.trim();
      }).filter(Boolean);

      if (pageLines.length > 0) {
        fullText += `\n[--- HALAMAN ${pageNum} ---]\n` + pageLines.join('\n') + '\n';
      }
    }
    
    return fullText.trim();
  } catch (err) {
    console.warn('[PDF.js Text Extraction Warning]', err);
    return '';
  }
}

/**
 * Renders up to maxPages of a PDF into a high-quality composite JPEG image.
 * This allows multimodal AI vision (Gemini / KoboiLLM / OpenAI / Groq) to accurately inspect
 * visual tables, checkmarks (V / ✓ / X), dots, and Kraepelin curve graphs across multiple pages.
 */
export async function renderPdfPagesToImage(arrayBuffer: ArrayBuffer, maxPages = 4): Promise<string | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) return null;

    const pagesToRender = Math.min(pdf.numPages, maxPages);

    if (pagesToRender === 1) {
      const page = await pdf.getPage(1);
      const scale = 1.8;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      return dataUrl.split(',')[1] || null;
    }

    // Multiple pages: render each to an offscreen canvas and stack onto a single vertical canvas
    const renderedPages: { canvas: HTMLCanvasElement; width: number; height: number }[] = [];
    const scale = 1.5;
    let maxWidth = 0;
    let totalHeight = 0;
    const spacing = 16;

    for (let p = 1; p <= pagesToRender; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = viewport.width;
      pageCanvas.height = viewport.height;
      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        await page.render({ canvasContext: pageCtx, viewport }).promise;
        renderedPages.push({ canvas: pageCanvas, width: viewport.width, height: viewport.height });
        maxWidth = Math.max(maxWidth, viewport.width);
        totalHeight += viewport.height + (p > 1 ? spacing : 0);
      }
    }

    if (renderedPages.length === 0) return null;

    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = maxWidth;
    combinedCanvas.height = totalHeight;
    const combinedCtx = combinedCanvas.getContext('2d');
    if (!combinedCtx) return null;

    combinedCtx.fillStyle = '#e2e8f0';
    combinedCtx.fillRect(0, 0, maxWidth, totalHeight);

    let currentY = 0;
    for (let i = 0; i < renderedPages.length; i++) {
      const { canvas: pCanvas, width: pW, height: pH } = renderedPages[i];
      const offsetX = Math.round((maxWidth - pW) / 2);
      combinedCtx.drawImage(pCanvas, offsetX, currentY);
      currentY += pH + spacing;
    }

    const dataUrl = combinedCanvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1] || null;
  } catch (err) {
    console.warn('[PDF.js Multi-Page Render Warning]', err);
    return null;
  }
}

/**
 * Backward compatibility alias for single page render.
 */
export async function renderPdfFirstPageToImage(arrayBuffer: ArrayBuffer): Promise<string | null> {
  return renderPdfPagesToImage(arrayBuffer, 1);
}

/**
 * Comprehensive Universal Document Processor:
 * 1. Checks file type.
 * 2. If PDF: extracts text directly in browser (fast & lightweight). If scanned PDF, renders page to JPEG for AI vision.
 * 3. If Image: auto compresses to avoid 4.5MB serverless limits.
 * 4. If DOCX: extracts text via Mammoth.
 * 5. If Text: reads text directly.
 * 6. Concurrently uploads original file to Supabase Storage if configured.
 */
export async function processDocumentFile(
  file: File,
  options: {
    uploadToSupabase?: boolean;
    folder?: string;
  } = { uploadToSupabase: true, folder: 'psikotes' }
): Promise<ProcessedDocument> {
  const filename = file.name;
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  
  let result: ProcessedDocument = {
    filename,
    mimeType: file.type || 'application/octet-stream'
  };

  // Optional background upload to Supabase Storage
  let supabasePromise: Promise<any> | null = null;
  if (options.uploadToSupabase) {
    supabasePromise = uploadFileToSupabase(file, filename, options.folder)
      .then(res => {
        if (res.success && res.publicUrl) {
          result.supabaseUrl = res.publicUrl;
        }
      })
      .catch(e => console.warn('[Supabase Auto-Upload Skipped]', e));
  }

  // 1. Plain Text / Markdown / CSV / JSON
  if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
    const textContent = await file.text();
    result.text = textContent;
    result.mimeType = 'text/plain';
    if (supabasePromise) await supabasePromise;
    return result;
  }

  // 2. Word Document (.docx)
  if (ext === '.docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammothRes = await mammoth.extractRawText({ arrayBuffer });
      const text = (mammothRes?.value || '').trim();
      if (text) {
        result.text = text;
        result.mimeType = 'text/plain';
        if (supabasePromise) await supabasePromise;
        return result;
      }
    } catch (e) {
      console.warn('[Mammoth Extraction Warning]', e);
    }
  }

  // 3. PDF Document (.pdf)
  if (ext === '.pdf' || file.type === 'application/pdf') {
    result.mimeType = 'application/pdf';
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 1. Extract 2D layout-aware text
      const extractedText = await extractTextFromPdf(arrayBuffer);
      if (extractedText) {
        result.text = extractedText;
      }
      
      // 2. ALWAYS render page(s) into JPEG image so Multimodal Vision AI can inspect
      // checkboxes, tables, tick marks, and graphs with 100% precision!
      const renderedJpgBase64 = await renderPdfPagesToImage(arrayBuffer, 4);
      if (renderedJpgBase64) {
        result.base64 = renderedJpgBase64;
        result.mimeType = 'image/jpeg';
        result.isScannedPdf = (!extractedText || extractedText.length < 80);
      }
      
      // If render did not produce base64 and there is no text, fallback to raw base64
      if (!result.text && !result.base64) {
        result.base64 = await fileToBase64(file);
      }
    } catch (pdfErr) {
      console.warn('[PDF Processing Fallback]', pdfErr);
      result.base64 = await fileToBase64(file);
    }

    if (supabasePromise) await supabasePromise;
    return result;
  }

  // 4. Image Files (.png, .jpg, .jpeg, .webp)
  if (file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    const compressedBlob = await compressImageIfNeeded(file);
    result.base64 = await fileToBase64(compressedBlob);
    result.mimeType = compressedBlob.type || 'image/jpeg';
    if (supabasePromise) await supabasePromise;
    return result;
  }

  // 5. Default fallback
  result.base64 = await fileToBase64(file);
  if (supabasePromise) await supabasePromise;
  return result;
}
