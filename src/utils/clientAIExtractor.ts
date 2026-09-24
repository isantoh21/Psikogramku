import { getAISettings, AISettings, getAIHeaders } from './aiSettings';

export function cleanJsonOutput(rawText: string, fallback: any = {}) {
  let cleaned = (rawText || '{}').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON output:', rawText, err);
    return fallback;
  }
}

/**
 * Checks whether client-side direct execution is possible.
 * Works if provider is koboillm, custom, openai, openrouter, groq, or gemini with user key.
 */
export function canExecuteDirectly(settings?: AISettings): boolean {
  const s = settings || getAISettings();
  if (!s) return false;
  if (s.provider === 'koboillm') return true;
  if (s.provider === 'custom' && !!s.baseUrl && !!s.apiKey) return true;
  if (s.apiKey && s.apiKey.trim() !== '') return true;
  return false;
}

/**
 * Execute chat completion directly from browser to AI provider (KoboiLLM / OpenAI / etc).
 * This completely bypasses Vercel Serverless Function 10s timeout & 4.5MB payload limits!
 */
export async function callDirectAI({
  prompt,
  data,
  mimeType,
  fallback = {}
}: {
  prompt: string;
  data?: string; // base64
  mimeType?: string;
  fallback?: any;
}) {
  const settings = getAISettings();
  let baseUrl = settings.baseUrl || '';
  let apiKey = settings.apiKey || '';
  let model = settings.model || 'gemini/gemini-2.5-flash';

  if (settings.provider === 'koboillm') {
    baseUrl = baseUrl || 'https://api.koboillm.com/v1';
    apiKey = apiKey || 'sk-1wbq_Yt3lZPxwkDRXZYQow';
    model = model || 'gemini/gemini-2.5-flash';
  } else if (settings.provider === 'openai') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gpt-4o-mini';
  } else if (settings.provider === 'openrouter') {
    baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
    model = model || 'google/gemini-2.5-flash';
  } else if (settings.provider === 'groq') {
    baseUrl = baseUrl || 'https://api.groq.com/openai/v1';
    model = model || 'llama-3.3-70b-versatile';
  } else if (settings.provider === 'custom') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gemini/gemini-2.5-flash';
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const userContent: any[] = [
    { 
      type: 'text', 
      text: `${prompt}\n\nPENTING: Kembalikan HANYA format JSON valid tanpa tanda kutip markdown \`\`\`json.` 
    }
  ];

  if (data && mimeType) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${data}`
      }
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(settings.provider === 'openrouter' ? {
        'HTTP-Referer': window.location.origin,
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

  const resJson = await response.json();
  if (!response.ok) {
    const errMsg = resJson?.error?.message || resJson?.message || response.statusText;
    throw new Error(`Penyedia AI (${settings.provider}) mengembalikan error: ${errMsg}`);
  }

  const rawOutput = resJson?.choices?.[0]?.message?.content || '{}';
  return cleanJsonOutput(rawOutput, fallback);
}

// Prompts
export const IST_PROMPT = `Ekstrak data hasil tes IST (Intelligenz Struktur Test) dan biodata dari dokumen laporan psikotes seleksi staf ini.
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

export const KRAEPELIN_PROMPT = `Ekstrak data hasil tes Kraepelin dan biodata dari dokumen ini. Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
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

export const PAPI_PROMPT = `Ekstrak data biodata dan hasil tes PAPI Kostick dari dokumen ini. Kamu harus memahami Guide Interpreter PAPI Kostick. Berdasarkan skor dari masing-masing faktor PAPI Kostick (N, G, A, L, P, I, T, V, X, S, B, O, R, D, C, Z, E, K, F, W) yang ada di dokumen, hitung dan petakan ke dalam 9 aspek kepribadian berikut dengan taraf (level) dari 1 sampai 7 (1=Kurang Sekali, 2=Kurang, 3=Rata-rata Bawah, 4=Rata-rata, 5=Rata-rata Atas, 6=Baik, 7=Baik Sekali) sesuai dengan panduan / standar interpretasi psikologi yang berlaku.

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

export function getMBTIPrompt(currentKepribadian?: any) {
  return `Ekstrak data biodata dan hasil tes MBTI dari dokumen ini. Kamu harus memahami Guide Interpreter MBTI dan profil/deskripsi tipe kepribadian (seperti ESTJ, INFP, dll.).
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
}

export const BEI_PROMPT = `Anda adalah seorang psikolog dan asesor ahli dalam metode Behavior Event Interview (BEI) dengan pendekatan STAR (Situation, Task, Action, Result).
Tugas Anda adalah menganalisis dokumen/transkrip wawancara berikut dan mengekstrak data STAR untuk 9 aspek kompetensi kepribadian:
1. Kematangan Emosi
2. Kematangan Sosial
3. Rasa Percaya Diri
4. Motivasi Berprestasi
5. Sikap Mandiri
6. Inisiatif
7. Kemampuan Bekerjasama
8. Keterampilan Berkomunikasi
9. Loyalitas

Aturan Ekstraksi:
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

/**
 * Universal Unified Extraction Runner:
 * 1. Checks if direct client-side AI is available.
 * 2. If available, tries direct call first (bypassing Vercel serverless function limits).
 * 3. If direct call fails or not available, seamlessly falls back to server API endpoint.
 */
export async function executeExtraction({
  apiEndpoint,
  prompt,
  data,
  mimeType,
  filename,
  extraBody = {}
}: {
  apiEndpoint: string;
  prompt: string;
  data: string;
  mimeType: string;
  filename: string;
  extraBody?: Record<string, any>;
}) {
  const settings = getAISettings();

  // Try direct AI call first if configured
  if (canExecuteDirectly(settings)) {
    try {
      console.log(`[AI Client] Memproses langsung via ${settings.provider.toUpperCase()} (Bypass Serverless)...`);
      const directResult = await callDirectAI({
        prompt,
        data,
        mimeType
      });
      if (directResult && typeof directResult === 'object') {
        return directResult;
      }
    } catch (directErr: any) {
      console.warn('[AI Client] Direct call failed, falling back to server endpoint:', directErr?.message);
    }
  }

  // Fallback to server API endpoint
  console.log(`[AI Client] Menggunakan server endpoint: ${apiEndpoint}`);
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAIHeaders()
    },
    body: JSON.stringify({
      mimeType,
      data,
      filename,
      ...extraBody
    })
  });

  let resData: any;
  let rawText = '';
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    resData = await response.json();
  } else {
    rawText = await response.text();
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('API Server Vercel tidak ditemukan (Status 404). Silakan periksa file vercel.json atau gunakan Custom Provider di Pengaturan AI.');
    }
    if (response.status === 413) {
      throw new Error('Ukuran file melebihi batas serverless Vercel (4.5MB). Harap pilih file yang lebih kecil atau gunakan mode Custom Provider.');
    }
    if (response.status === 504) {
      throw new Error('Vercel Serverless Function Timeout (504). Batas waktu gratis Vercel telah habis. Silakan buka menu "⚙️ Pengaturan AI" dan beralih ke KoboiLLM / OpenAI untuk koneksi langsung tanpa batasan serverless.');
    }
    const errText = resData?.error || rawText || '';
    if (errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
      throw new Error('Kuota harian gratis AI telah habis (Error 429). Silakan buka menu "⚙️ Pengaturan AI" untuk memasukkan API Key atau beralih ke KoboiLLM / OpenAI.');
    }
    throw new Error(errText || `Gagal memproses file (Status ${response.status})`);
  }

  return resData;
}
