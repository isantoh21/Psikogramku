import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import dotenv from "dotenv";

dotenv.config();

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || 
         process.env.GOOGLE_API_KEY || 
         process.env.VITE_GEMINI_API_KEY || 
         process.env.API_KEY ||
         process.env.GEMINI_KEY;
}

export function normalizeMimeType(mimeType?: string, filename?: string, base64Data?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream' && mimeType.trim() !== '') {
    return mimeType;
  }
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.txt') return 'text/plain';
  }
  if (base64Data) {
    const header = base64Data.substring(0, 15);
    if (header.startsWith('JVBER')) return 'application/pdf';
    if (header.startsWith('/9j/')) return 'image/jpeg';
    if (header.startsWith('iVBORw')) return 'image/png';
    if (header.startsWith('UklGR')) return 'image/webp';
  }
  return 'application/pdf';
}

export function safeJsonParse(rawText: string, fallback: any = {}) {
  let cleaned = (rawText || '{}').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', rawText, err);
    return fallback;
  }
}

// Fallback model sequence for Google Gemini to prevent 429 quota blocks
export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash'
];

/**
 * Universal AI Caller supporting Google Gemini (with auto-fallback cascade),
 * OpenAI (ChatGPT), OpenRouter, Groq, and custom OpenAI-compatible providers.
 */
export async function callUnifiedAI({
  req,
  prompt,
  data,
  mimeType,
  text,
  fallback = {}
}: {
  req: express.Request;
  prompt: string;
  data?: string; // base64 representation
  mimeType?: string;
  text?: string; // plain text representation
  fallback?: any;
}) {
  const providerHeader = (req.headers['x-ai-provider'] as string) || req.body?.aiConfig?.provider;
  const keyHeader = (req.headers['x-ai-api-key'] as string) || req.body?.aiConfig?.apiKey;
  const modelHeader = (req.headers['x-ai-model'] as string) || req.body?.aiConfig?.model;
  const baseUrlHeader = (req.headers['x-ai-base-url'] as string) || req.body?.aiConfig?.baseUrl;

  let provider: string = providerHeader || 'gemini';

  // If client didn't explicitly specify a provider, check server envs
  if (!providerHeader) {
    if (getGeminiApiKey()) {
      provider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      provider = 'openai';
    } else if (process.env.OPENROUTER_API_KEY) {
      provider = 'openrouter';
    } else if (process.env.GROQ_API_KEY) {
      provider = 'groq';
    }
  }

  const effectivePrompt = (text && text.trim())
    ? `${prompt}\n\n=== BERIKUT TEKS DOKUMEN YANG DIEKSTRAK ===\n${text.trim()}`
    : prompt;

  // 1. Google Gemini Provider (Primary with automatic model fallback cascade)
  if (provider === 'gemini') {
    const apiKey = keyHeader || getGeminiApiKey();
    if (!apiKey) {
      console.warn('GEMINI_API_KEY tidak dikonfigurasi di server, auto-fallback ke KoboiLLM...');
      provider = 'koboillm';
    } else {
      const ai = new GoogleGenAI({ apiKey });
      // Prioritize user's requested model if provided, then cascade
      const modelsToTry = modelHeader 
        ? [modelHeader, ...GEMINI_FALLBACK_MODELS.filter(m => m !== modelHeader)] 
        : GEMINI_FALLBACK_MODELS;

      let lastError: any = null;
      let succeeded = false;
      for (const model of modelsToTry) {
        try {
          const contents: any[] = [effectivePrompt];
          if (data && mimeType) {
            contents.push({
              inlineData: {
                data,
                mimeType
              }
            });
          }

          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              responseMimeType: "application/json"
            }
          });

          const text = response.text || '{}';
          succeeded = true;
          return safeJsonParse(text, fallback);
        } catch (err: any) {
          lastError = err;
          const msg = err?.message || '';
          if (
            msg.includes('429') || 
            msg.includes('RESOURCE_EXHAUSTED') || 
            msg.includes('503') || 
            msg.includes('404') ||
            msg.includes('quota')
          ) {
            console.warn(`Gemini model [${model}] quota limit/unavailable (${msg.slice(0, 110)}). Mencoba model fallback berikutnya...`);
            continue;
          }
          break;
        }
      }

      if (!succeeded) {
        console.warn(`Semua model Gemini gagal (${lastError?.message}), auto-fallback ke KoboiLLM...`);
        provider = 'koboillm';
      }
    }
  }

  // 2. OpenAI / OpenRouter / Groq / Custom Provider (OpenAI Compatible Chat Completions API)
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let apiKey = keyHeader;
  let model = modelHeader;

  if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    apiKey = apiKey || process.env.OPENAI_API_KEY;
    model = model || 'gpt-4o-mini';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY belum dikonfigurasi. Masukkan kunci Anda melalui menu "⚙️ Pengaturan AI" atau di Environment Variables.');
    }
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    model = model || 'google/gemini-2.0-flash-001';
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY belum dikonfigurasi. Masukkan kunci Anda melalui menu "⚙️ Pengaturan AI" atau di Environment Variables.');
    }
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    apiKey = apiKey || process.env.GROQ_API_KEY;
    model = model || 'llama-3.3-70b-versatile';
    if (!apiKey) {
      throw new Error('GROQ_API_KEY belum dikonfigurasi. Masukkan kunci Anda melalui menu "⚙️ Pengaturan AI" atau di Environment Variables.');
    }
  } else if (provider === 'custom' || provider === 'koboillm') {
    const defaultUrl = provider === 'koboillm' ? 'https://api.koboillm.com/v1' : 'https://api.openai.com/v1';
    const effectiveBase = baseUrlHeader || defaultUrl;
    endpoint = `${effectiveBase.replace(/\/$/, '')}/chat/completions`;
    apiKey = apiKey || (provider === 'koboillm' ? (process.env.KOBOILLM_API_KEY || 'sk-wMaVBOWC1G69emLkQ5T9Ng') : '');
    
    if (!model || model === 'auto') {
      // Auto fetch model if model is empty or 'auto'
      try {
        const cleanBase = effectiveBase.replace(/\/$/, '');
        const modelsUrl = `${cleanBase}/models`;
        const mResp = await fetch(modelsUrl, {
          headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
        });
        if (mResp.ok) {
          const mData: any = await mResp.json();
          const firstModel = mData?.data?.[0]?.id || mData?.[0]?.id;
          if (firstModel) {
            model = firstModel;
          }
        }
      } catch (e) {
        console.warn('Auto fetch model failed in server:', e);
      }
    }
    model = model || 'gemini/gemini-3.1-flash-lite';
    if (!apiKey) {
      throw new Error(`API Key untuk ${provider} belum diisi.`);
    }
  }

  // Construct OpenAI-compatible prompt and multimodal contents
  const userContent: any[] = [
    { type: 'text', text: `${effectivePrompt}\n\nPENTING: Kembalikan HANYA format JSON valid tanpa tanda kutip markdown \`\`\`json.` }
  ];

  if (data && mimeType) {
    if (mimeType.startsWith('image/')) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${data}`
        }
      });
    } else if (mimeType === 'application/pdf') {
      if (provider === 'openrouter') {
        userContent.push({
          type: 'file',
          file: {
            filename: 'document.pdf',
            file_data: `data:application/pdf;base64,${data}`
          }
        });
      } else if (provider === 'koboillm' || (model && model.toLowerCase().includes('gemini'))) {
        // KoboiLLM / Gemini endpoints support PDF directly in image_url format
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:application/pdf;base64,${data}`
          }
        });
      }

      // Extract text from PDF buffer using Uint8Array as required by pdf-parse
      try {
        const buffer = Buffer.from(data, 'base64');
        const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const pdfModule = await import('pdf-parse');
        const PDFParseClass = (pdfModule as any).PDFParse;
        if (PDFParseClass) {
          const parser = new PDFParseClass(uint8Data);
          const parsedRes = await parser.getText();
          const pdfText = typeof parsedRes === 'string' ? parsedRes : (parsedRes?.text || '');
          if (pdfText && pdfText.trim()) {
            userContent.push({
              type: 'text',
              text: `\n\n--- TEKS DOKUMEN YANG DIEKSTRAK DARI PDF ---\n${pdfText.trim()}`
            });
          }
        }
      } catch (pdfErr) {
        console.warn('Could not extract text from PDF:', pdfErr);
      }
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? {
        'HTTP-Referer': 'https://psikogram.vercel.app',
        'X-Title': 'Psikogram AI Generator'
      } : {})
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah seorang asisten AI ahli psikometri dan psikolog yang bertugas mengekstrak data dari dokumen hasil tes psikotes ke dalam format JSON yang valid.'
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const resJson: any = await response.json();
  if (!response.ok) {
    const errMsg = resJson?.error?.message || resJson?.message || response.statusText;
    throw new Error(`Penyedia AI (${provider}) mengembalikan error: ${errMsg}`);
  }

  const rawOutput = resJson?.choices?.[0]?.message?.content || '{}';
  return safeJsonParse(rawOutput, fallback);
}

// Multer configured with os.tmpdir() for safe execution on Vercel Serverless (read-only filesystem) and standard servers
const uploadDir = path.join(os.tmpdir(), 'psikogram-uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload directory in os.tmpdir, continuing with fallback:', e);
}

const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

const turndownService = new TurndownService();

export const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Vercel Serverless Function route normalizer
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] as string) || 
                      (req.headers['x-vercel-matched-path'] as string) ||
                      (req.headers['x-forwarded-uri'] as string);
  const vercelRoute = (req.query?.__vercel_route__ as string);

  if (matchedPath && matchedPath.startsWith('/api') && req.url !== matchedPath) {
    req.url = matchedPath;
  } else if (vercelRoute) {
    req.url = `/api/${vercelRoute.replace(/^\//, '')}`;
  }
  next();
});

// Express Router for API endpoints
const apiRouter = express.Router();

// Health check endpoint (helpful to verify if API is up on Vercel)
apiRouter.get("/health", (req, res) => {
  const geminiKey = getGeminiApiKey();
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    providersConfigured: {
      gemini: !!geminiKey,
      openai: !!openaiKey,
      openrouter: !!openrouterKey,
      groq: !!groqKey
    },
    geminiConfigured: !!geminiKey,
    timestamp: new Date().toISOString()
  });
});

// Auto-purge old files endpoint (scheduled via Vercel Cron or called manually)
const purgeHandler = async (req: express.Request, res: express.Response) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ucgpmljuplocjmbspnag.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZ3BtbGp1cGxvY2ptYnNwbmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTYwNzMsImV4cCI6MjEwNTg5MjA3M30.DTWsgiS8auTN81k1_5RUYILw92ka8yUpmPU2EqmuKx8';
  const bucketName = process.env.SUPABASE_BUCKET || 'psikogram-files';

  const maxAgeDays = Number(req.query.days || req.body?.days || 30);
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const folders = ['ist', 'kraepelin', 'papi', 'mbti', 'msdt', 'bei', 'documents', 'markitdown', 'psikotes', ''];
    const deletedFiles: string[] = [];

    for (const folder of folders) {
      const { data: files, error } = await supabase.storage.from(bucketName).list(folder, { limit: 100 });
      if (error || !files) continue;

      const toRemove: string[] = [];
      for (const file of files) {
        if (!file.name || file.name === '.emptyFolderPlaceholder') continue;
        
        let fileTime = file.created_at ? new Date(file.created_at).getTime() : 0;
        const match = file.name.match(/^(\d{13})_/);
        if (match) {
          fileTime = Number(match[1]);
        }

        if (fileTime && fileTime < cutoffTime) {
          const fullPath = folder ? `${folder}/${file.name}` : file.name;
          toRemove.push(fullPath);
        }
      }

      if (toRemove.length > 0) {
        const { error: delErr } = await supabase.storage.from(bucketName).remove(toRemove);
        if (!delErr) {
          deletedFiles.push(...toRemove);
        } else {
          console.warn(`[Auto-Purge Warning] Failed to delete in ${folder}:`, delErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Auto-purge selesai. Berhasil membersihkan ${deletedFiles.length} file yang berusia lebih dari ${maxAgeDays} hari (1 bulan).`,
      purgedCount: deletedFiles.length,
      purgedFiles: deletedFiles,
      cutoffDate: new Date(cutoffTime).toISOString()
    });
  } catch (err: any) {
    console.error('Auto purge error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal menjalankan auto-purge file lama'
    });
  }
};

apiRouter.get('/purge-files', purgeHandler);
apiRouter.post('/purge-files', purgeHandler);

// Test connection endpoint for the AI Settings modal
apiRouter.post("/test-ai", async (req, res) => {
  const startTime = Date.now();
  try {
    const testResult = await callUnifiedAI({
      req,
      prompt: 'Jawab HANYA dengan JSON valid persis: {"status": "ok", "message": "Koneksi berhasil"}',
      fallback: { status: "ok" }
    });
    const latency = Date.now() - startTime;
    res.json({
      success: true,
      message: `Koneksi berhasil! Waktu respons: ${latency}ms`,
      result: testResult
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Gagal terhubung ke penyedia AI'
    });
  }
});

// Endpoint to fetch models list from any OpenAI-compatible provider
apiRouter.post("/fetch-models", async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    if (!baseUrl) {
      return res.status(400).json({ error: 'Base URL diperlukan' });
    }
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const modelsUrl = cleanUrl.endsWith('/models') ? cleanUrl : `${cleanUrl}/models`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const resp = await fetch(modelsUrl, { headers });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: `Gagal mengambil model (${resp.status}): ${errText.slice(0, 150)}` });
    }
    const data: any = await resp.json();
    const modelsList: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    res.json({
      success: true,
      models: modelsList.map(m => ({
        id: m.id || m.name,
        name: m.id || m.name,
        maxTokens: m.max_input_tokens || m.context_length || 1050000
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal mengambil daftar model' });
  }
});

// IST Test extraction
apiRouter.post("/extract-ist", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Ekstrak data hasil tes IST (Intelligenz Struktur Test) dan biodata dari dokumen laporan psikotes seleksi staf ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir (misal: 'Jakarta, 1 Januari 1995')",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan terakhir",
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "iqScore": 0,
  "iqLabel": "kategori IQ seperti Rata-rata, Superior, Rata-rata Atas, dll",
  "skorLangsung": {
    "pemahamanVerbal": null,
    "analisaSintesa": null,
    "kemampuanNumerik": null
  },
  "tarafLangsung": {
    "pemahamanVerbal": "ambil teks kategori/taraf verbal langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', 'KS', 'K', 'RB', 'R', 'RA', 'B', 'BS', atau 'Sedang', 'Tinggi', dll)",
    "analisaSintesa": "ambil teks kategori/taraf analisa sintesa langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', dll)",
    "kemampuanNumerik": "ambil teks kategori/taraf numerik/berhitung langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', dll)"
  },
  "istSubscores": {
    "SE": 0, "WA": 0, "AN": 0, "GE": 0, "ME": 0, "RA": 0, "ZR": 0, "FA": 0, "WU": 0
  },
  "tarafBerpikirSistematis": "taraf berpikir sistematis jika tertulis langsung di PDF",
  "tarafPemahamanKonsep": "taraf pemahaman konsep jika tertulis langsung di PDF",
  "tarafAnalisaSintesa": "taraf analisa sintesa jika tertulis langsung di PDF"
}

CATATAN PENTING:
1. Untuk pemahamanVerbal, analisaSintesa, dan kemampuanNumerik: 
   - AMBIL LANGSUNG teks kategori yang tertulis di PDF (misalnya kolom Taraf/Kategori yang berisi SR, R, S, T, ST atau Kurang Sekali, Kurang, Sedang, Tinggi, Sangat Tinggi) ke dalam tarafLangsung.
   - AMBIL JUGA angka skor (skala nilai 0-20 atau Standard Wert/SW yang tertera untuk aspek tersebut) ke dalam skorLangsung.
2. Untuk subtes IST (SE, WA, AN, GE, ME, RA, ZR, FA, WU): ambil nilai Standard Wert (SW) atau nilai skor tertera untuk masing-masing subtes jika ada.
3. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing IST:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data tes IST' });
  }
});

// CFIT Test extraction
apiRouter.post("/extract-cfit", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Ekstrak data hasil tes CFIT (Culture Fair Intelligence Test) dan biodata dari dokumen laporan/skoring psikotes ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir (misal: 'Jakarta, 1 Januari 1995')",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan terakhir",
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "iqScore": 0,
  "iqLabel": "kategori IQ CFIT seperti Very Superior, Superior, Rata-rata Atas, Rata-rata, Rata-rata Bawah, Borderline, Intellectual Deficient",
  "cfitSubscores": {
    "sub1": 0,
    "sub2": 0,
    "sub3": 0,
    "sub4": 0,
    "totalScore": 0
  }
}

CATATAN PENTING:
1. sub1 adalah Subtes 1 (Seri / Berpikir Sistematis), nilai benar (0-13).
2. sub2 adalah Subtes 2 (Klasifikasi / Berpikir Kritis), nilai benar (0-14).
3. sub3 adalah Subtes 3 (Matriks / Analisa-Sintesa), nilai benar (0-13).
4. sub4 adalah Subtes 4 (Topologi/Persyaratan / Pemahaman Konsep), nilai benar (0-10).
5. totalScore adalah total nilai mentah (RS) jika ada.
6. iqScore adalah skor IQ CFIT (misal: 105, 118, 125, dsb).
7. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing CFIT:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data tes CFIT' });
  }
});

// TKD Test extraction
apiRouter.post("/extract-tkd", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Ekstrak data hasil tes TKD (Tes Kemampuan Dasar) dan biodata dari dokumen laporan/skoring psikotes ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan",
    "tujuanPemeriksaan": "jabatan/posisi",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "tkdSubscores": {
    "sub3": 0,
    "sub5": 0,
    "sub7": 0
  },
  "tkdRawScores": {
    "sub3": null,
    "sub5": null,
    "sub7": null
  },
  "tkdCategories": {
    "sub3": "kategori / taraf subtes 3 jika tertera (misal: R, S, T, Baik, dll)",
    "sub5": "kategori / taraf subtes 5 jika tertera",
    "sub7": "kategori / taraf subtes 7 jika tertera"
  }
}

CATATAN PENTING:
1. TKD Subtes 3: Pemahaman verbal, logika berpikir, daya abstraksi (prioritaskan Standard Score / SS skala 0-20 jika ada, atau nilai benar).
2. TKD Subtes 5: Kemampuan berhitung, ketelitian (prioritaskan Standard Score / SS skala 0-20).
3. TKD Subtes 7: Kemampuan berpikir analogi, kemampuan berpikir kritis (prioritaskan Standard Score / SS skala 0-20).
4. Jika ada tabel skor standar (SS) atau angka setelah norma, masukkan ke tkdSubscores. Jika ada skor mentah (RS), masukkan ke tkdRawScores.
5. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing TKD:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data tes TKD' });
  }
});

// Kraepelin extraction
apiRouter.post("/extract-kraepelin", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Anda adalah seorang psikolog dan ahli psikometri profesional yang sangat teliti dalam membaca hasil tes psikotes Kraepelin / Pauli / Sikap Kerja.
Tugas Anda adalah mengekstrak data biodata peserta (termasuk NAMA PT / PERUSAHAAN jika tertera di dokumen, kop surat, header laporan, atau tabel identitas) dan nilai 4 dimensi Sikap Kerja dari dokumen yang diberikan (berupa gambar tabel, grafik kurva kerja Kraepelin, lembar skoring, laporan psikotes, atau teks).

=== PERINGATAN KRUSIAL: BACA HEADER KOLOM TABEL SECARA VERTIKAL DENGAN TELITI ===
JANGAN PERNAH MENGASUMSIKAN URUTAN KOLOM DARI KIRI KE KANAN!
Banyak tabel Kraepelin di Indonesia menyusun kolom dalam urutan TERBALIK:
Urutan 1 (Tinggi di Kiri): [Aspek] | Baik Sekali | Baik | Sedang | Kurang | Kurang Sekali
Urutan 2 (Rendah di Kiri): [Aspek] | Kurang Sekali | Kurang | Sedang | Baik | Baik Sekali
Urutan 3 (7 Kolom): [Aspek] | KS | K | RB | R | RA | B | BS (atau sebaliknya BS sampai KS)

ATURAN WAJIB UNTUK MENENTUKAN NILAI SETIAP ASPEK:
1. Temukan baris untuk setiap aspek:
   - Panker = Kecepatan (kecepatan)
   - Tianker = Ketelitian (ketelitian)
   - Janker = Ketekunan / Keuletan (ketekunan)
   - Hanker = Daya Tahan terhadap Stres (dayaTahanStres)
2. Pada baris aspek tersebut, cari di mana tanda centang (V / ✓ / X / dot ●) berada.
3. Tarik garis lurus vertikal dari tanda centang tersebut lurus ke atas sampai ke baris JUDUL HEADER KOLOM di atasnya.
4. BACA TEKS JUDUL HEADER KOLOM TERSEBUT SECARA LANGSUNG, lalu petakan ke nilai 1-7 berikut:
   - Header "Kurang Sekali" / "KS" / "Sangat Rendah" -> Nilai = 1 (KS)
   - Header "Kurang" / "K" / "Rendah" -> Nilai = 2 (K)
   - Header "Rata-rata Bawah" / "RB" / "Cukup Bawah" -> Nilai = 3 (RB)
   - Header "Sedang" / "Cukup" / "Rata-rata" / "R" / "S" / "C" -> Nilai = 4 (R)
   - Header "Rata-rata Atas" / "RA" / "Cukup Atas" -> Nilai = 5 (RA)
   - Header "Baik" / "B" / "Tinggi" -> Nilai = 6 (B)
   - Header "Baik Sekali" / "BS" / "Sangat Tinggi" -> Nilai = 7 (BS)

CONTOH NYATA PADA TABEL KRAEPELIN:
Jika tabel memiliki header: | Baik Sekali | Baik | Sedang | Kurang | Kurang Sekali |
- Baris Panker bertanda V di kolom 'Kurang' -> kecepatan = 2 (K) (JANGAN set 6!)
- Baris Tianker bertanda V di kolom 'Kurang Sekali' -> ketelitian = 1 (KS) (JANGAN set 7!)
- Baris Janker bertanda V di kolom 'Sedang' -> ketekunan = 4 (R)
- Baris Hanker bertanda V di kolom 'Baik Sekali' -> dayaTahanStres = 7 (BS) (JANGAN set 1!)

=== FORMAT OUTPUT JSON WAJIB ===
Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama lengkap peserta jika tertera",
    "tempatTglLahir": "Tempat dan tanggal lahir lengkap jika tertera",
    "pendidikan": "Pendidikan jika tertera",
    "alamat": "Alamat tempat tinggal jika tertera",
    "tujuanPemeriksaan": "Posisi / jabatan jika tertera",
    "namaPT": "Nama PT / perusahaan / instansi / organisasi tempat tes atau melamar jika tertera (misal: 'PT. PAMITRA JAYA KONSTRUKSI', 'PT XYZ'). Jika tidak ada, isi string kosong \"\""
  },
  "sikapKerja": {
    "kecepatan": 2,
    "ketelitian": 1,
    "ketekunan": 4,
    "dayaTahanStres": 7
  },
  "rawDetails": {
    "kecepatan": "Panker: tanda V di kolom Kurang (skor 2 / K)",
    "ketelitian": "Tianker: tanda V di kolom Kurang Sekali (skor 1 / KS)",
    "ketekunan": "Janker: tanda V di kolom Sedang (skor 4 / R)",
    "dayaTahanStres": "Hanker: tanda V di kolom Baik Sekali (skor 7 / BS)"
  }
}

Jika data biodata tidak ditemukan, gunakan string kosong "".
Nilai kecepatan, ketelitian, ketekunan, dayaTahanStres WAJIB berupa angka integer 1 sampai 7.`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    // Helper to safely parse level to 1-7
    const parseLevel = (val: any) => {
      if (typeof val === 'number') {
        if (val >= 1 && val <= 7) return Math.round(val);
        if (val >= 16) return 7;
        if (val >= 14) return 6;
        if (val >= 12) return 5;
        if (val >= 8) return 4;
        if (val >= 6) return 3;
        if (val >= 4) return 2;
        if (val >= 1) return 1;
        return 4;
      }
      const s = String(val || '').trim().toLowerCase();
      if (!s) return 4;
      if (/\b(sangat tinggi|baik sekali|sangat baik|bs|st|sb)\b/i.test(s)) return 7;
      if (/\b(kurang sekali|sangat rendah|ks|sr)\b/i.test(s)) return 1;
      if (/\b(rata[- ]*rata bawah|cukup bawah|rb|cb)\b/i.test(s)) return 3;
      if (/\b(rata[- ]*rata atas|cukup atas|ra|ca)\b/i.test(s)) return 5;
      if (/\b(baik|tinggi|\bb\b|\bt\b)\b/i.test(s)) return 6;
      if (/\b(kurang|rendah|\bk\b)\b/i.test(s)) return 2;
      if (/\b(sedang|rata[- ]*rata|cukup|\br\b|\bs\b|\bc\b)\b/i.test(s)) return 4;
      const num = parseInt(s, 10);
      return !isNaN(num) && num >= 1 && num <= 7 ? num : 4;
    };

    let extractedPT = String(
      parsed?.clientData?.namaPT ||
      parsed?.clientData?.nama_pt ||
      parsed?.clientData?.perusahaan ||
      parsed?.clientData?.pt ||
      ''
    ).trim();

    if (!extractedPT && text) {
      const explicitMatch = text.match(/(?:Nama\s+Perusahaan|Perusahaan|Company|Instansi|Organisasi)\s*[:]\s*([^\n\r]+)/i);
      if (explicitMatch && explicitMatch[1]) {
        extractedPT = explicitMatch[1].trim().replace(/^[:\-\s]+/, '');
      } else {
        const ptMatch = text.match(/\b((?:PT\.?|CV\.?)\s+[A-Z0-9\.\,\&\-\s]{3,60})\b/);
        if (ptMatch && ptMatch[1]) {
          extractedPT = ptMatch[1].trim().replace(/\s{2,}/g, ' ');
        }
      }
    }

    const sK = parsed?.sikapKerja || parsed?.sikap_kerja || parsed || {};
    const normalizedResponse = {
      clientData: {
        nama: parsed?.clientData?.nama || '',
        tempatTglLahir: parsed?.clientData?.tempatTglLahir || '',
        pendidikan: parsed?.clientData?.pendidikan || '',
        alamat: parsed?.clientData?.alamat || '',
        tujuanPemeriksaan: parsed?.clientData?.tujuanPemeriksaan || '',
        namaPT: extractedPT
      },
      sikapKerja: {
        kecepatan: parseLevel(sK.kecepatan ?? sK.panker ?? sK.kecepatanKerja),
        ketelitian: parseLevel(sK.ketelitian ?? sK.tianker ?? sK.ketelitianKerja),
        ketekunan: parseLevel(sK.ketekunan ?? sK.janker ?? sK.ketekunanKerja ?? sK.keuletan),
        dayaTahanStres: parseLevel(sK.dayaTahanStres ?? sK.hanker ?? sK.dayaTahan ?? sK.ketahananStres)
      },
      rawDetails: parsed?.rawDetails || parsed?.raw_details || {}
    };

    res.json(normalizedResponse);
  } catch (error: any) {
    console.error('Error parsing Kraepelin:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data Kraepelin' });
  }
});

// PAPI Kostick extraction
apiRouter.post("/extract-papikostik", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Ekstrak data biodata dan hasil tes PAPI Kostick dari dokumen ini. Kamu harus memahami Guide Interpreter PAPI Kostick. Berdasarkan skor dari masing-masing faktor PAPI Kostick (N, G, A, L, P, I, T, V, X, S, B, O, R, D, C, Z, E, K, F, W) yang ada di dokumen, hitung dan petakan ke dalam 9 aspek kepribadian berikut dengan taraf (level) dari 1 sampai 7 (1=Kurang Sekali, 2=Kurang, 3=Rata-rata Bawah, 4=Rata-rata, 5=Rata-rata Atas, 6=Baik, 7=Baik Sekali) sesuai dengan panduan / standar interpretasi psikologi yang berlaku.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada)",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "Pendidikan peserta (jika ada)",
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)",
    "namaPT": "Nama PT / perusahaan jika tertera (jika ada)"
  },
  "kepribadian": {
    "kematanganEmosi": 0,
    "kemasakanSosial": 0,
    "rasaPercayaDiri": 0,
    "motivasiBerprestasi": 0,
    "sikapMandiri": 0,
    "inisiatif": 0,
    "kemampuanBekerjasama": 0,
    "keterampilanBerkomunikasi": 0,
    "loyalitas": 0
  }
}
Jika data tidak ditemukan, set string menjadi "" dan angka menjadi 0.`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing PAPI Kostick:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data PAPI Kostick' });
  }
});

// MBTI extraction
apiRouter.post("/extract-mbti", async (req, res) => {
  try {
    const { data, filename, text, currentKepribadian } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Ekstrak data biodata dan hasil tes MBTI dari dokumen ini. Kamu harus memahami Guide Interpreter MBTI dan profil/deskripsi tipe kepribadian (seperti ESTJ, INFP, dll.).
Berikut adalah skor/taraf dari 9 aspek kepribadian berdasarkan tes (PAPI Kostick) sebelumnya:
${JSON.stringify(currentKepribadian || {}, null, 2)}

Tugas Anda adalah:
1. Analisis hasil tes MBTI peserta.
2. Gunakan hasil MBTI sebagai "second opinion" atau pertimbangan tambahan.
3. Sesuaikan taraf ke-9 aspek kepribadian tersebut (skala 1 sampai 7). Jika berdasarkan profil MBTI peserta cenderung kuat di suatu aspek, Anda bisa menaikkan skornya, jika kurang maka diturunkan, atau dipertahankan jika sudah sesuai.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada)",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "Pendidikan peserta (jika ada)",
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)",
    "namaPT": "Nama PT / perusahaan jika tertera (jika ada)"
  },
  "kepribadian": {
    "kematanganEmosi": 0,
    "kemasakanSosial": 0,
    "rasaPercayaDiri": 0,
    "motivasiBerprestasi": 0,
    "sikapMandiri": 0,
    "inisiatif": 0,
    "kemampuanBekerjasama": 0,
    "keterampilanBerkomunikasi": 0,
    "loyalitas": 0
  }
}
Jika data MBTI tidak ditemukan, kembalikan data kepribadian sebelumnya saja tanpa perubahan.`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing MBTI:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data MBTI' });
  }
});

// MSDT Test extraction
apiRouter.post("/extract-msdt", async (req, res) => {
  try {
    const { data, filename, text } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data && !text) {
      return res.status(400).json({ error: 'Data file atau teks dokumen tidak ditemukan' });
    }
    
    const prompt = `Anda adalah seorang psikolog dan asesor profesional ahli psikometri yang sangat teliti dalam membaca hasil tes MSDT (Management Style Diagnostic Test / Gaya Kepemimpinan W.J. Reddin) atau lembar asesmen manajerial.
Tugas Anda adalah:
1. Ekstrak data biodata peserta (nama, tempat tanggal lahir, jenis kelamin, pendidikan, nomor peserta, tujuan pemeriksaan/posisi jabatan, nama PT/perusahaan).
2. Analisis hasil tes MSDT peserta dari dokumen yang diberikan (berupa gambar/PDF grafik profil MSDT, lembar skoring, laporan psikotes, atau transkrip). Dokumen mungkin berisi:
   - Skor dimensi TO (Task Orientation), RO (Relationships Orientation), dan E (Effectiveness).
   - Tipe gaya kepemimpinan (Executive, Developer, Benevolent Autocrat, Bureaucrat, Compromiser, Missionary, Autocrat, Deserter).
   - Tabel penilaian kompetensi kepemimpinan.
3. Petakan dan tentukan nilai taraf 1 sampai 7 (1=KS / Kurang Sekali, 2=K / Kurang, 3=RB / Rata-rata Bawah, 4=R / Rata-rata, 5=RA / Rata-rata Atas, 6=B / Baik, 7=BS / Baik Sekali) untuk 4 aspek Kepemimpinan berikut:
   1. Kepemimpinan: "Memproyeksikan dirinya sebagai pemimpin dan mencoba menggunakan orang lain untuk mencapai tujuannya."
      - Taraf tinggi (5-7): Orientasi tugas & wibawa kepemimpinan kuat, gaya Executive atau Benevolent Autocrat, mampu mengarahkan tim dengan mantap dan tegas.
      - Taraf sedang (4): Mampu memimpin tim standar sesuai tugas yang diberikan.
      - Taraf rendah (1-3): Kurang percaya diri memimpin orang lain, pasif, atau cenderung menghindar (Deserter / Missionary lemah).
   2. Tanggungjawab: "Kesediaan bertanggung jawab atas hasil kerjanya dan orang lain yang dipimpin."
      - Taraf tinggi (5-7): Komitmen tinggi terhadap hasil tim, akuntabilitas kuat, gaya Executive / Benevolent Autocrat / Bureaucrat berintegritas.
      - Taraf sedang (4): Bertanggung jawab atas tugas rutin sendiri dan tim.
      - Taraf rendah (1-3): Kurang akuntabel atau melempar kesalahan pada situasi/bawahan (Deserter).
   3. Pengambilan Keputusan: "Kemampuan memilih suatu tindakan dari beberapa alternatif tindakan secara sistematis sebagai cara pemecahan masalah."
      - Taraf tinggi (5-7): Cepat, tepat, dan sistematis dalam memutuskan tindakan di bawah ketidakpastian; gaya Executive / Benevolent Autocrat.
      - Taraf sedang (4): Mampu mengambil keputusan pada situasi kerja umum.
      - Taraf rendah (1-3): Ragu-ragu, kompromistis tanpa prinsip (Compromiser), lambat atau takut resiko.
   4. Pengembangan Karyawan: "Kemampuan dalam memberdayakan bawahan melalui pemberian wewenang serta memberikan kesempatan untuk meningkatkan kompetensinya."
      - Taraf tinggi (5-7): Orientasi hubungan (RO) tinggi & berdaya guna, gaya Developer atau Executive, aktif melatih, mendelegasikan, dan memotivasi bawahan.
      - Taraf sedang (4): Memberikan arahan standar dan mendelegasikan tugas rutin.
      - Taraf rendah (1-3): Cenderung one-man show (Autocrat kaku) atau acuh tak acuh terhadap peningkatan kompetensi bawahan (Deserter).

=== ATURAN PRIORITAS TABEL LANGSUNG ===
JIKA di dalam dokumen sudah tercantum secara eksplisit tabel atau teks kategori/skor langsung untuk "Kepemimpinan", "Tanggungjawab", "Pengambilan Keputusan", dan "Pengembangan Karyawan" (atau istilah serupa seperti Leadership, Responsibility, Decision Making, People Development):
- BACA DAN PRIORITASKAN NILAI TERSEBUT LANGSUNG (konversikan ke skala 1-7: KS=1, K=2, RB=3, R=4, RA=5, B=6, BS=7 atau Sangat Rendah=1 s/d Sangat Tinggi=7).

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama lengkap peserta jika tertera",
    "tempatTglLahir": "Tempat dan tanggal lahir lengkap jika tertera",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "pendidikan": "Pendidikan jika tertera",
    "nomor": "Nomor tes/peserta jika tertera",
    "alamat": "Alamat jika tertera",
    "tujuanPemeriksaan": "Posisi / jabatan manajerial jika tertera",
    "namaPT": "Nama PT / perusahaan jika tertera"
  },
  "kepemimpinan": {
    "kepemimpinan": 4,
    "tanggungjawab": 4,
    "pengambilanKeputusan": 4,
    "pengembanganKaryawan": 4
  },
  "rawDetails": {
    "gayaKepemimpinan": "Gaya kepemimpinan utama terdeteksi (misal: Executive / Developer dll beserta skor TO/RO/E jika ada)",
    "kepemimpinan": "Penjelasan singkat analisis / dasar skor aspek kepemimpinan",
    "tanggungjawab": "Penjelasan singkat analisis / dasar skor aspek tanggung jawab",
    "pengambilanKeputusan": "Penjelasan singkat analisis / dasar skor aspek pengambilan keputusan",
    "pengembanganKaryawan": "Penjelasan singkat analisis / dasar skor aspek pengembangan karyawan"
  }
}

Jika data biodata tidak ditemukan, gunakan string kosong "".
Nilai kepemimpinan, tanggungjawab, pengambilanKeputusan, pengembanganKaryawan WAJIB berupa angka integer 1 sampai 7.`;

    const parsed = await callUnifiedAI({
      req,
      prompt,
      data,
      mimeType,
      text,
      fallback: {}
    });

    const parseLevel = (val: any) => {
      if (typeof val === 'number') {
        if (val >= 1 && val <= 7) return Math.round(val);
        if (val >= 16) return 7;
        if (val >= 14) return 6;
        if (val >= 12) return 5;
        if (val >= 8) return 4;
        if (val >= 6) return 3;
        if (val >= 4) return 2;
        if (val >= 1) return 1;
        return 4;
      }
      const s = String(val || '').trim().toLowerCase();
      if (!s) return 4;
      if (/\b(sangat tinggi|baik sekali|sangat baik|bs|st|sb)\b/i.test(s)) return 7;
      if (/\b(kurang sekali|sangat rendah|ks|sr)\b/i.test(s)) return 1;
      if (/\b(rata[- ]*rata bawah|cukup bawah|rb|cb)\b/i.test(s)) return 3;
      if (/\b(rata[- ]*rata atas|cukup atas|ra|ca)\b/i.test(s)) return 5;
      if (/\b(baik|tinggi|\bb\b|\bt\b)\b/i.test(s)) return 6;
      if (/\b(kurang|rendah|\bk\b)\b/i.test(s)) return 2;
      if (/\b(sedang|rata[- ]*rata|cukup|\br\b|\bs\b|\bc\b)\b/i.test(s)) return 4;
      const num = parseInt(s, 10);
      return !isNaN(num) && num >= 1 && num <= 7 ? num : 4;
    };

    const kData = parsed?.kepemimpinan || parsed?.aspekKepemimpinan || parsed || {};
    const normalizedResponse = {
      clientData: {
        nama: parsed?.clientData?.nama || '',
        tempatTglLahir: parsed?.clientData?.tempatTglLahir || '',
        pendidikan: parsed?.clientData?.pendidikan || '',
        alamat: parsed?.clientData?.alamat || '',
        nomor: parsed?.clientData?.nomor || '',
        jenisKelamin: parsed?.clientData?.jenisKelamin || '',
        tujuanPemeriksaan: parsed?.clientData?.tujuanPemeriksaan || '',
        tanggalTes: parsed?.clientData?.tanggalTes || '',
        namaPT: parsed?.clientData?.namaPT || ''
      },
      kepemimpinan: {
        kepemimpinan: parseLevel(kData.kepemimpinan ?? kData.leadership),
        tanggungjawab: parseLevel(kData.tanggungjawab ?? kData.tanggung_jawab ?? kData.responsibility),
        pengambilanKeputusan: parseLevel(kData.pengambilanKeputusan ?? kData.pengambilan_keputusan ?? kData.decisionMaking),
        pengembanganKaryawan: parseLevel(kData.pengembanganKaryawan ?? kData.pengembangan_karyawan ?? kData.developingOthers)
      },
      rawDetails: parsed?.rawDetails || parsed?.raw_details || {}
    };

    res.json(normalizedResponse);
  } catch (error: any) {
    console.error('Error parsing MSDT:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data MSDT' });
  }
});

// BEI Extraction
apiRouter.post('/extract-bei', upload.single('file'), async (req, res) => {
  const file = req.file;
  const body = req.body || {};

  if (!file && !body.data && !body.text) {
    return res.status(400).json({ error: 'Tidak ada file atau dokumen yang diunggah' });
  }

  const tempPathToDelete: string | null = file ? file.path : null;

  try {
    const originalName = file ? file.originalname : (body.filename || 'dokumen.pdf');
    const ext = path.extname(originalName).toLowerCase();
    let mimeType = file ? file.mimetype : (body.mimeType || 'application/pdf');
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') mimeType = 'application/msword';
      else if (ext === '.txt') mimeType = 'text/plain';
      else if (ext === '.md') mimeType = 'text/markdown';
      else if (ext === '.mp3') mimeType = 'audio/mp3';
      else if (ext === '.m4a') mimeType = 'audio/m4a';
      else if (ext === '.wav') mimeType = 'audio/wav';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    }

    let extractedText = '';
    let isMultimodal = false;
    let inlineDataPayload: { data: string; mimeType: string } | null = null;

    if (body.text && body.text.trim()) {
      extractedText = body.text;
    } else if (file) {
      if (ext === '.docx') {
        try {
          const mammothResult = await mammoth.extractRawText({ path: file.path });
          extractedText = mammothResult?.value || '';
        } catch (docxErr) {
          console.warn('Mammoth extraction failed, falling back:', docxErr);
        }
      } else if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json') {
        try {
          extractedText = fs.readFileSync(file.path, 'utf-8');
        } catch (txtErr) {
          console.warn('Text file read failed:', txtErr);
        }
      }
    } else if (body.data) {
      const buffer = Buffer.from(body.data, 'base64');
      if (ext === '.docx') {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer });
          extractedText = mammothResult?.value || '';
        } catch (docxErr) {
          console.warn('Mammoth buffer extraction failed:', docxErr);
        }
      } else if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json') {
        extractedText = buffer.toString('utf-8');
      }
    }

    if (!extractedText.trim()) {
      let base64Data = '';
      let targetMime = mimeType;
      if (ext === '.pdf') targetMime = 'application/pdf';
      else if (['.jpg', '.jpeg'].includes(ext)) targetMime = 'image/jpeg';
      else if (ext === '.png') targetMime = 'image/png';
      else if (ext === '.webp') targetMime = 'image/webp';
      else if (ext === '.mp3') targetMime = 'audio/mp3';
      else if (ext === '.m4a') targetMime = 'audio/m4a';
      else if (ext === '.wav') targetMime = 'audio/wav';
      else if (ext === '.ogg') targetMime = 'audio/ogg';
      else if (ext === '.aac') targetMime = 'audio/aac';
      else if (ext === '.flac') targetMime = 'audio/flac';

      if (file) {
        const fileBuffer = fs.readFileSync(file.path);
        base64Data = fileBuffer.toString('base64');
        if (targetMime === 'application/pdf') {
          try {
            const uint8Data = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
            const pdfModule = await import('pdf-parse');
            const PDFParseClass = (pdfModule as any).PDFParse;
            if (PDFParseClass) {
              const parser = new PDFParseClass(uint8Data);
              const parsedRes = await parser.getText();
              const pdfText = typeof parsedRes === 'string' ? parsedRes : (parsedRes?.text || '');
              if (pdfText && pdfText.trim()) {
                extractedText = pdfText.trim();
              }
            }
          } catch (e) {
            console.warn('PDF text extraction error:', e);
          }
        }
      } else if (body.data) {
        base64Data = body.data;
        if (targetMime === 'application/pdf') {
          try {
            const buffer = Buffer.from(body.data, 'base64');
            const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const pdfModule = await import('pdf-parse');
            const PDFParseClass = (pdfModule as any).PDFParse;
            if (PDFParseClass) {
              const parser = new PDFParseClass(uint8Data);
              const parsedRes = await parser.getText();
              const pdfText = typeof parsedRes === 'string' ? parsedRes : (parsedRes?.text || '');
              if (pdfText && pdfText.trim()) {
                extractedText = pdfText.trim();
              }
            }
          } catch (e) {
            console.warn('PDF buffer text extraction error:', e);
          }
        }
      }

      if (
        targetMime.startsWith('image/') ||
        targetMime.startsWith('audio/') ||
        targetMime === 'application/pdf'
      ) {
        isMultimodal = true;
        inlineDataPayload = {
          data: base64Data,
          mimeType: targetMime,
        };
      } else if (!extractedText.trim()) {
        try {
          const rawBuffer = file ? fs.readFileSync(file.path) : Buffer.from(body.data, 'base64');
          const rawUtf8 = rawBuffer.toString('utf-8');
          if (rawUtf8 && rawUtf8.length > 20) {
            extractedText = rawUtf8;
          } else if (file) {
            try {
              const markitdownModule = await import('markitdown-js');
              const Markitdown = markitdownModule.default || markitdownModule.MarkItDown || (markitdownModule as any).Markitdown;
              const converter = new Markitdown();
              const result = await converter.convert(file.path, { fileExtension: ext });
              extractedText = result?.textContent || '';
            } catch (mdErr) {
              console.warn('Markitdown extraction error in fallback:', mdErr);
            }
          }
        } catch (e) {
          console.warn('Fallback text extraction failed:', e);
          isMultimodal = true;
          inlineDataPayload = {
            data: base64Data,
            mimeType: targetMime || 'application/octet-stream',
          };
        }
      }
    }

    const prompt = `Anda adalah seorang psikolog dan asesor wawancara kerja profesional.
Tugas Anda adalah mengekstrak data Behavior Event Interview (BEI) dari file / dokumen wawancara ini ke dalam format metode STAR (Situation, Task, Action, Result) untuk 9 aspek kompetensi:
1. kematanganEmosi (Kematangan Emosi)
2. kematanganSosial (Kematangan Sosial)
3. rasaPercayaDiri (Rasa Percaya Diri)
4. motivasiBerprestasi (Motivasi Berprestasi)
5. sikapMandiri (Sikap Mandiri)
6. inisiatif (Inisiatif)
7. kemampuanBekerjasama (Kemampuan Bekerjasama)
8. keterampilanBerkomunikasi (Keterampilan Berkomunikasi)
9. loyalitas (Loyalitas)

PANDUAN EKSTRAKSI:
- Ekstrak data peserta jika ada: nama, posisi/level yang dituju, dan ringkasan pengalaman kerja / perkenalan.
- Untuk setiap aspek kompetensi, ekstrak 4 komponen STAR:
  * situation: Situasi, konteks, latar belakang tantangan atau masalah yang dihadapi kandidat.
  * task: Tugas, tanggung jawab, atau target yang harus diselesaikan kandidat dalam situasi tersebut.
  * action: Aksi nyata, langkah konkret, atau inisiatif yang diambil kandidat untuk menyelesaikan tugas.
  * result: Hasil, pencapaian, dampak, atau pembelajaran akhir dari tindakan tersebut.
- Jika suatu aspek atau komponen STAR tidak ada dalam catatan/transkrip wawancara, biarkan string kosong "". Jangan mengarang data.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada, atau '')",
    "posisi": "Posisi/level (jika ada, atau '')",
    "pengalaman": "Ringkasan pengalaman kerja / perkenalan (jika ada, atau '')"
  },
  "kematanganEmosi": { "situation": "", "task": "", "action": "", "result": "" },
  "kematanganSosial": { "situation": "", "task": "", "action": "", "result": "" },
  "rasaPercayaDiri": { "situation": "", "task": "", "action": "", "result": "" },
  "motivasiBerprestasi": { "situation": "", "task": "", "action": "", "result": "" },
  "sikapMandiri": { "situation": "", "task": "", "action": "", "result": "" },
  "inisiatif": { "situation": "", "task": "", "action": "", "result": "" },
  "kemampuanBekerjasama": { "situation": "", "task": "", "action": "", "result": "" },
  "keterampilanBerkomunikasi": { "situation": "", "task": "", "action": "", "result": "" },
  "loyalitas": { "situation": "", "task": "", "action": "", "result": "" }
}`;

    const effectivePrompt = extractedText.trim()
      ? `${prompt}\n\n=== BERIKUT TEKS CATATAN / TRANSKRIP WAWANCARA DARI FILE (${originalName}) ===\n${extractedText}`
      : prompt;

    const parsedData = await callUnifiedAI({
      req,
      prompt: effectivePrompt,
      data: inlineDataPayload?.data,
      mimeType: inlineDataPayload?.mimeType,
      fallback: {}
    });

    const defaultSTAR = { situation: '', task: '', action: '', result: '' };
    const normalizedData = {
      clientData: {
        nama: parsedData.clientData?.nama || '',
        posisi: parsedData.clientData?.posisi || '',
        pengalaman: parsedData.clientData?.pengalaman || ''
      },
      kematanganEmosi: { ...defaultSTAR, ...(parsedData.kematanganEmosi || {}) },
      kematanganSosial: { ...defaultSTAR, ...(parsedData.kematanganSosial || {}) },
      rasaPercayaDiri: { ...defaultSTAR, ...(parsedData.rasaPercayaDiri || {}) },
      motivasiBerprestasi: { ...defaultSTAR, ...(parsedData.motivasiBerprestasi || {}) },
      sikapMandiri: { ...defaultSTAR, ...(parsedData.sikapMandiri || {}) },
      inisiatif: { ...defaultSTAR, ...(parsedData.inisiatif || {}) },
      kemampuanBekerjasama: { ...defaultSTAR, ...(parsedData.kemampuanBekerjasama || {}) },
      keterampilanBerkomunikasi: { ...defaultSTAR, ...(parsedData.keterampilanBerkomunikasi || {}) },
      loyalitas: { ...defaultSTAR, ...(parsedData.loyalitas || {}) }
    };

    if (tempPathToDelete && fs.existsSync(tempPathToDelete)) {
      try {
        fs.unlinkSync(tempPathToDelete);
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }
    }
    
    res.json(normalizedData);
  } catch (error: any) {
    console.error('Extract BEI error:', error);
    if (tempPathToDelete && fs.existsSync(tempPathToDelete)) {
      try {
        fs.unlinkSync(tempPathToDelete);
      } catch (e) {
        console.error('Error deleting file in catch block:', e);
      }
    }
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data dari file.' });
  }
});

// MarkItDown Endpoint
apiRouter.post('/markitdown', upload.array('files', 5), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  try {
    const markitdownModule = await import('markitdown-js');
    const Markitdown = markitdownModule.default || markitdownModule.MarkItDown || (markitdownModule as any).Markitdown;
    const apiKey = getGeminiApiKey();
    const converter = new Markitdown({
      llmCall: async ({ messages, base64Image, file: mediaFile }: any) => {
        if (!apiKey) return null;
        try {
          const ai = new GoogleGenAI({ apiKey });
          if (base64Image) {
            const prompt = messages?.map((m: any) => m.content).join('\n') || 'Describe this image in detail.';
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-lite',
              contents: [
                prompt,
                { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
              ]
            });
            return response.text;
          }
        } catch (err) {
          console.error('LLM vision error:', err);
        }
        return null;
      }
    });

    const results = [];
    for (const file of files) {
      try {
        const extension = path.extname(file.originalname).toLowerCase();
        let markdownText = '';
        
        if (extension === '.docx') {
          try {
            const htmlRes = await mammoth.convertToHtml({ path: file.path });
            markdownText = turndownService.turndown(htmlRes.value);
          } catch (mErr) {
            console.warn('Mammoth conversion fallback:', mErr);
          }
        } else if (['.txt', '.md', '.csv', '.json'].includes(extension)) {
          markdownText = fs.readFileSync(file.path, 'utf-8');
        }

        if (!markdownText) {
          try {
            const result = await converter.convert(file.path, { fileExtension: extension });
            markdownText = result?.textContent || '';
          } catch (convErr) {
            if (apiKey) {
              const fileBuffer = fs.readFileSync(file.path);
              const base64Data = fileBuffer.toString('base64');
              const ai = new GoogleGenAI({ apiKey });
              let targetMime = file.mimetype || 'application/pdf';
              if (extension === '.pdf') targetMime = 'application/pdf';
              
              const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents: [
                  'Convert the contents of this document into clean, well-formatted Markdown. Return ONLY the markdown content without code block backticks if possible.',
                  { inlineData: { data: base64Data, mimeType: targetMime } }
                ]
              });
              markdownText = resp.text || '';
            } else {
              throw convErr;
            }
          }
        }

        results.push({
          filename: file.originalname,
          markdown: markdownText,
          success: true
        });
      } catch (err: any) {
        console.error(`Error converting ${file.originalname}:`, err);
        results.push({
          filename: file.originalname,
          markdown: '',
          success: false,
          error: err?.message || 'Failed to convert file'
        });
      } finally {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('MarkItDown error:', error);
    for (const file of files) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (e) {
        console.error('Error deleting file in catch block:', e);
      }
    }
    res.status(500).json({ error: 'Conversion failed or file format not supported.' });
  }
});

// Mount both under '/api' and '/' so rewrites work seamlessly on Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler for Serverless stability
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Terjadi kesalahan internal pada server' });
  }
});

export default app;
