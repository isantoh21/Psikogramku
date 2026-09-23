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

// Express Router for API endpoints
const apiRouter = express.Router();

// Health check endpoint (helpful to verify if API is up on Vercel)
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// IST Test extraction
apiRouter.post("/extract-ist", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables' });
    }
    const { data, filename } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data) {
      return res.status(400).json({ error: 'Data file tidak ditemukan' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan"
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data,
            mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing IST:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data tes IST' });
  }
});

// Kraepelin extraction
apiRouter.post("/extract-kraepelin", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables' });
    }
    const { data, filename } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data) {
      return res.status(400).json({ error: 'Data file tidak ditemukan' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Ekstrak data hasil tes Kraepelin dan biodata dari dokumen ini. Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta saja tanpa keterangan perusahaannya",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "pendidikan peserta",
    "alamat": "alamat lengkap peserta",
    "tujuanPemeriksaan": "posisi peserta"
  },
  "sikapKerja": {
    "kecepatan": 0,
    "ketelitian": 0,
    "ketekunan": 0,
    "dayaTahanStres": 0
  }
}

Aturan ekstraksi Sikap Kerja dari centang (V) di tabel KRAEPLIN:
- Kolom "Kurang Sekali" = 1
- Kolom "Kurang" = 2
- Kolom "Sedang" = 4
- Kolom "Baik" = 6
- Kolom "Baik Sekali" = 7

Pemetaan baris tabel KRAEPLIN:
- Panker = kecepatan
- Tianker = ketelitian
- Janker = ketekunan
- Hanker = dayaTahanStres

Jika data biodata tidak ditemukan, set string menjadi "". Jika data sikap kerja tidak ditemukan, set angka menjadi 0.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data,
            mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing Kraepelin:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data Kraepelin' });
  }
});

// PAPI Kostick extraction
apiRouter.post("/extract-papikostik", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables' });
    }
    const { data, filename } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data) {
      return res.status(400).json({ error: 'Data file tidak ditemukan' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Ekstrak data biodata dan hasil tes PAPI Kostick dari dokumen ini. Kamu harus memahami Guide Interpreter PAPI Kostick. Berdasarkan skor dari masing-masing faktor PAPI Kostick (N, G, A, L, P, I, T, V, X, S, B, O, R, D, C, Z, E, K, F, W) yang ada di dokumen, hitung dan petakan ke dalam 9 aspek kepribadian berikut dengan taraf (level) dari 1 sampai 7 (1=Kurang Sekali, 2=Kurang, 3=Rata-rata Bawah, 4=Rata-rata, 5=Rata-rata Atas, 6=Baik, 7=Baik Sekali) sesuai dengan panduan / standar interpretasi psikologi yang berlaku.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada)",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "Pendidikan peserta (jika ada)",
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)"
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data,
            mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing PAPI Kostick:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data PAPI Kostick' });
  }
});

// MBTI extraction
apiRouter.post("/extract-mbti", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables' });
    }
    const { data, filename, currentKepribadian } = req.body;
    const mimeType = normalizeMimeType(req.body.mimeType, filename, data);
    
    if (!data) {
      return res.status(400).json({ error: 'Data file tidak ditemukan' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)"
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data,
            mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing MBTI:', error);
    res.status(500).json({ error: error?.message || 'Gagal mengekstrak data MBTI' });
  }
});

// BEI Extraction
apiRouter.post('/extract-bei', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
  const file = req.file;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let mimeType = file.mimetype;
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

    if (!extractedText.trim()) {
      const fileBuffer = fs.readFileSync(file.path);
      const base64Data = fileBuffer.toString('base64');
      
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
      } else {
        try {
          const rawUtf8 = fileBuffer.toString('utf-8');
          if (rawUtf8 && rawUtf8.length > 20) {
            extractedText = rawUtf8;
          } else {
            const markitdownModule = await import('markitdown-js');
            const Markitdown = markitdownModule.default || markitdownModule.MarkItDown || (markitdownModule as any).Markitdown;
            const converter = new Markitdown();
            const result = await converter.convert(file.path, { fileExtension: ext });
            extractedText = result?.textContent || '';
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

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

    let contents: any[] = [];
    if (isMultimodal && inlineDataPayload) {
      contents = [
        prompt,
        {
          inlineData: inlineDataPayload
        }
      ];
    } else {
      contents = [
        prompt,
        `\n\n=== BERIKUT TEKS CATATAN / TRANSKRIP WAWANCARA DARI FILE (${file.originalname}) ===\n${extractedText}`
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    let text = (response.text || '{}').trim();
    if (text.startsWith('```json')) text = text.substring(7);
    if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);
    text = text.trim();

    const parsedData = JSON.parse(text);

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

    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      console.error('Error deleting temp file:', e);
    }
    
    res.json(normalizedData);
  } catch (error: any) {
    console.error('Extract BEI error:', error);
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      console.error('Error deleting file in catch block:', e);
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
    const converter = new Markitdown({
      llmCall: async ({ messages, base64Image, file: mediaFile }: any) => {
        if (!process.env.GEMINI_API_KEY) return null;
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          if (base64Image) {
            const prompt = messages?.map((m: any) => m.content).join('\n') || 'Describe this image in detail.';
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
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
            if (process.env.GEMINI_API_KEY) {
              const fileBuffer = fs.readFileSync(file.path);
              const base64Data = fileBuffer.toString('base64');
              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              let targetMime = file.mimetype || 'application/pdf';
              if (extension === '.pdf') targetMime = 'application/pdf';
              
              const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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

export default app;
