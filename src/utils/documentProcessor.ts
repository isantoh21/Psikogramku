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
 * Extracts text from a PDF document using PDF.js.
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
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      if (pageText.trim()) {
        fullText += `\n[--- HALAMAN ${pageNum} ---]\n${pageText}\n`;
      }
    }
    
    return fullText.trim();
  } catch (err) {
    console.warn('[PDF.js Text Extraction Warning]', err);
    return '';
  }
}

/**
 * Renders the first page of a scanned PDF to a compressed JPEG image.
 * This allows OpenAI/KoboiLLM Vision to read scanned PDFs without rejecting the mimeType!
 */
export async function renderPdfFirstPageToImage(arrayBuffer: ArrayBuffer): Promise<string | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) return null;
    
    const page = await pdf.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1] || null;
  } catch (err) {
    console.warn('[PDF.js Page Render Warning]', err);
    return null;
  }
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
      // Try to extract text first
      const extractedText = await extractTextFromPdf(arrayBuffer);
      
      if (extractedText && extractedText.length > 80) {
        // Digital PDF with rich text! Pass extracted text directly for instant, lightweight extraction
        result.text = extractedText;
      } else {
        // Scanned PDF (image-only): Render first page to JPEG for KoboiLLM/OpenAI Vision
        const renderedJpgBase64 = await renderPdfFirstPageToImage(arrayBuffer);
        if (renderedJpgBase64) {
          result.base64 = renderedJpgBase64;
          result.mimeType = 'image/jpeg';
          result.isScannedPdf = true;
        }
      }
      
      // If neither text nor render succeeded, fallback to raw base64
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
