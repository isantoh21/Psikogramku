import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { uploadFileToSupabase } from './supabase';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface DeterministicKraepelin {
  kecepatan: number;
  ketelitian: number;
  ketekunan: number;
  dayaTahanStres: number;
  pankerRaw?: string;
  tiankerRaw?: string;
  jankerRaw?: string;
  hankerRaw?: string;
}

export interface ProcessedDocument {
  filename: string;
  mimeType: string;
  text?: string;
  base64?: string;
  supabaseUrl?: string;
  isScannedPdf?: boolean;
  kraepelinDirect?: DeterministicKraepelin;
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
 * Extracts text from a PDF document using PDF.js with 2D spatial layout awareness (preserving table rows, columns, and checkmark alignments).
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    const CHAR_WIDTH = 6;
    
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

      // Cluster items with Y within 5px into the same line
      const lines: { y: number; items: typeof itemsWithCoords }[] = [];
      for (const item of itemsWithCoords) {
        let line = lines.find(l => Math.abs(l.y - item.y) <= 5);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }

      // Re-sort lines from top to bottom
      lines.sort((a, b) => b.y - a.y);

      // Within each line, position items along spatial character grid so columns align!
      const pageLines = lines.map(line => {
        line.items.sort((a, b) => a.x - b.x);
        const lineChars: string[] = [];
        for (const item of line.items) {
          const colIndex = Math.max(0, Math.round(item.x / CHAR_WIDTH));
          while (lineChars.length < colIndex) {
            lineChars.push(' ');
          }
          for (let i = 0; i < item.str.length; i++) {
            lineChars[colIndex + i] = item.str[i];
          }
        }
        return lineChars.join('').trimEnd();
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
 * Deterministically extracts Kraepelin / Sikap Kerja results directly from PDF vector text coordinates.
 * Matches rows (Panker, Tianker, Janker, Hanker) and columns (Baik Sekali, Baik, Sedang, Kurang, Kurang Sekali)
 * based on minimum Euclidean horizontal distance to row checkmarks (V, ✓, X).
 */
export async function extractDeterministicKraepelin(arrayBuffer: ArrayBuffer): Promise<DeterministicKraepelin | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 4); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = (textContent.items || []).map((it: any) => ({
        str: (it && typeof it.str === 'string') ? it.str.trim() : '',
        x: it.transform ? Number(it.transform[4]) : 0,
        y: it.transform ? Number(it.transform[5]) : 0
      })).filter((it: any) => it.str.length > 0);

      // Group items into lines
      const lines: { y: number; items: typeof items }[] = [];
      items.sort((a, b) => b.y - a.y);
      for (const item of items) {
        let line = lines.find(l => Math.abs(l.y - item.y) <= 6);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }

      // Check if page contains Kraepelin keywords
      const hasKraepelinKeywords = lines.some(l => 
        l.items.some(it => /kraeplin|kraepelin|panker|tianker|janker|hanker/i.test(it.str))
      );
      if (!hasKraepelinKeywords) continue;

      // Find column headers line(s)
      const detectedCols: { type: 'BS' | 'B' | 'R' | 'K' | 'KS'; x: number }[] = [];
      for (const line of lines) {
        const lineText = line.items.map(i => i.str.toLowerCase()).join(' ');
        if (lineText.includes('baik') && (lineText.includes('sedang') || lineText.includes('cukup') || lineText.includes('kurang'))) {
          line.items.sort((a, b) => a.x - b.x);
          const subLine = lines.find(l => l !== line && Math.abs(l.y - line.y) <= 22 && l.y < line.y);
          const subItems = subLine ? subLine.items : [];

          for (const item of line.items) {
            const s = item.str.toLowerCase();
            let colType: 'BS' | 'B' | 'R' | 'K' | 'KS' | '' = '';
            if (s === 'baik' || s === 'baik sekali') {
              const hasSekali = s.includes('sekali') || subItems.some(si => si.str.toLowerCase().includes('sekali') && Math.abs(si.x - item.x) <= 35);
              colType = hasSekali ? 'BS' : 'B';
            } else if (s === 'sedang' || s === 'cukup') {
              colType = 'R';
            } else if (s === 'kurang' || s === 'kurang sekali') {
              const hasSekali = s.includes('sekali') || subItems.some(si => si.str.toLowerCase().includes('sekali') && Math.abs(si.x - item.x) <= 35);
              colType = hasSekali ? 'KS' : 'K';
            } else if (['bs', 'b', 'r', 'c', 'k', 'ks'].includes(s)) {
              colType = (s.toUpperCase() === 'C' ? 'R' : s.toUpperCase()) as any;
            }

            if (colType) {
              detectedCols.push({ type: colType, x: item.x });
            }
          }
          if (detectedCols.length >= 3) break;
        }
      }

      if (detectedCols.length < 3) continue;

      const rowDefs = [
        { key: 'kecepatan' as const, patterns: [/^panker/i, /kecepatan/i], rawKey: 'pankerRaw' as const },
        { key: 'ketelitian' as const, patterns: [/^tianker/i, /ketelitian/i], rawKey: 'tiankerRaw' as const },
        { key: 'ketekunan' as const, patterns: [/^janker/i, /ketekunan/i, /stabilitas/i], rawKey: 'jankerRaw' as const },
        { key: 'dayaTahanStres' as const, patterns: [/^hanker/i, /daya tahan/i, /ketahanan/i], rawKey: 'hankerRaw' as const }
      ];

      const scoreMap: Record<string, number> = { 'BS': 7, 'B': 6, 'R': 4, 'K': 2, 'KS': 1 };
      const kraepelinResult: Partial<DeterministicKraepelin> = {};
      let matchCount = 0;

      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
        for (const rowDef of rowDefs) {
          const labelIndex = line.items.findIndex(it => rowDef.patterns.some(p => p.test(it.str)));
          if (labelIndex >= 0) {
            const labelItem = line.items[labelIndex];
            const candidateMarks = line.items.filter(it => it.x > labelItem.x + 10);
            const mark = candidateMarks.find(it => /^[vx✓√•1-7c]$/i.test(it.str) || it.str === 'V') || candidateMarks[0];
            if (mark) {
              let closest = detectedCols[0];
              let minDist = 99999;
              for (const col of detectedCols) {
                const d = Math.abs(col.x - mark.x);
                if (d < minDist) {
                  minDist = d;
                  closest = col;
                }
              }
              kraepelinResult[rowDef.key] = scoreMap[closest.type] || 4;
              kraepelinResult[rowDef.rawKey] = closest.type;
              matchCount++;
            }
          }
        }
      }

      if (matchCount >= 3) {
        return kraepelinResult as DeterministicKraepelin;
      }
    }
  } catch (e) {
    console.warn('[Deterministic Kraepelin Parsing Warning]', e);
  }
  return null;
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

      // CRITICAL: Fill with pure white background, otherwise transparent pixels convert to black in JPEG!
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        // CRITICAL: Fill with pure white background
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

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

    combinedCtx.fillStyle = '#ffffff';
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

      // 2. Check for deterministic Kraepelin / Sikap Kerja data directly from coordinates
      const directKraepelin = await extractDeterministicKraepelin(arrayBuffer);
      if (directKraepelin) {
        result.kraepelinDirect = directKraepelin;
        const hint = `[HASIL ANALISIS TABEL KRAEPELIN PRESISI TINGGI DARI KOORDINAT ASLI]:\n` +
          `- Panker (Kecepatan Kerja): ${directKraepelin.pankerRaw} (Nilai: ${directKraepelin.kecepatan})\n` +
          `- Tianker (Ketelitian Kerja): ${directKraepelin.tiankerRaw} (Nilai: ${directKraepelin.ketelitian})\n` +
          `- Janker (Ketekunan / Stabilitas Kerja): ${directKraepelin.jankerRaw} (Nilai: ${directKraepelin.ketekunan})\n` +
          `- Hanker (Ketahanan / Daya Tahan Stres): ${directKraepelin.hankerRaw} (Nilai: ${directKraepelin.dayaTahanStres})\n\n`;
        result.text = hint + (result.text || '');
      }
      
      // 3. ALWAYS render page(s) into JPEG image so Multimodal Vision AI can inspect
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
