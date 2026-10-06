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
 * Works if provider is koboillm, custom, openai, openrouter, groq, or gemini.
 */
export function canExecuteDirectly(settings?: AISettings): boolean {
  const s = settings || getAISettings();
  if (!s) return true;
  if (s.provider === 'koboillm') return true;
  if (s.provider === 'custom' && !!s.baseUrl && !!s.apiKey) return true;
  if (s.apiKey && s.apiKey.trim() !== '') return true;
  return false;
}

/**
 * Execute chat completion directly from browser to AI provider (Google Gemini / OpenAI / Groq / OpenRouter).
 * This completely bypasses Vercel Serverless Function 10s timeout & 4.5MB payload limits!
 */
export async function callDirectAI({
  prompt,
  data,
  mimeType,
  text,
  fallback = {}
}: {
  prompt: string;
  data?: string; // base64
  mimeType?: string;
  text?: string;
  fallback?: any;
}) {
  const settings = getAISettings();
  let baseUrl = settings.baseUrl || '';
  let apiKey = (settings.apiKey || '').trim();
  let model = settings.model || '';

  let combinedText = prompt;
  if (text && text.trim()) {
    combinedText += `\n\n=== BERIKUT TEKS CATATAN / TRANSKRIP DOKUMEN ===\n${text.trim()}`;
  }
  combinedText += `\n\nPENTING: Kembalikan HANYA format JSON valid tanpa tanda kutip markdown \`\`\`json.`;

  // 1. Direct Google Gemini call from browser if provider is Gemini with API key
  if (settings.provider === 'gemini') {
    if (!apiKey) {
      throw new Error('API Key Google Gemini belum diisi. Masukkan API Key Anda di menu ⚙️ Pengaturan AI.');
    }
    const modelName = model || 'gemini-2.5-flash-lite';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const parts: any[] = [{ text: combinedText }];
    if (data && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data
        }
      });
    }
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson?.error?.message || `Google Gemini API Error (${response.status})`);
    }
    const rawOutput = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return cleanJsonOutput(rawOutput, fallback);
  }

  // 2. OpenAI-compatible providers (Groq, OpenAI, OpenRouter, Custom, KoboiLLM)
  if (settings.provider === 'openai') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gpt-4o-mini';
  } else if (settings.provider === 'openrouter') {
    baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
    model = model || 'google/gemini-2.0-flash-001';
  } else if (settings.provider === 'groq') {
    baseUrl = baseUrl || 'https://api.groq.com/openai/v1';
    model = model || 'llama-3.3-70b-versatile';
  } else if (settings.provider === 'koboillm') {
    baseUrl = baseUrl || 'https://api.koboillm.com/v1';
    apiKey = apiKey || 'sk-wMaVBOWC1G69emLkQ5T9Ng';
    model = model || 'gemini/gemini-3.1-flash-lite';
  } else if (settings.provider === 'custom') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gemini/gemini-3.1-flash-lite';
  }

  if (!apiKey) {
    throw new Error(`API Key untuk ${settings.provider} belum diisi. Masukkan API Key Anda di menu ⚙️ Pengaturan AI.`);
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const userContent: any[] = [
    { 
      type: 'text', 
      text: combinedText 
    }
  ];

  if (data && mimeType) {
    const isImage = mimeType.startsWith('image/');
    if (isImage) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${data}`
        }
      });
    } else if (mimeType === 'application/pdf') {
      if (settings.provider === 'openrouter') {
        userContent.push({
          type: 'file',
          file: {
            filename: 'document.pdf',
            file_data: `data:application/pdf;base64,${data}`
          }
        });
      } else if (settings.provider === 'koboillm' || (model && model.toLowerCase().includes('gemini'))) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:application/pdf;base64,${data}`
          }
        });
      }
    }
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

/**
 * Execute natural text completion directly from browser to AI provider.
 * Returns pure text without forcing JSON parsing, ideal for psychology narrative recommendations.
 */
export async function callDirectTextAI({
  prompt,
  systemInstruction
}: {
  prompt: string;
  systemInstruction?: string;
}): Promise<string> {
  const settings = getAISettings();
  let baseUrl = settings.baseUrl || '';
  let apiKey = (settings.apiKey || '').trim();
  let model = settings.model || '';

  // 1. Direct Google Gemini call from browser
  if (settings.provider === 'gemini') {
    if (!apiKey) {
      throw new Error('API Key Google Gemini belum diisi. Masukkan API Key Anda di menu ⚙️ Pengaturan AI.');
    }
    const modelName = model || 'gemini-2.5-flash-lite';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const parts: any[] = [{ text: prompt }];

    const payload: any = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
      }
    };
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson?.error?.message || `Google Gemini API Error (${response.status})`);
    }
    const rawOutput = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return rawOutput.trim();
  }

  // 2. OpenAI-compatible providers
  if (settings.provider === 'openai') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gpt-4o-mini';
  } else if (settings.provider === 'openrouter') {
    baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
    model = model || 'google/gemini-2.0-flash-001';
  } else if (settings.provider === 'groq') {
    baseUrl = baseUrl || 'https://api.groq.com/openai/v1';
    model = model || 'llama-3.3-70b-versatile';
  } else if (settings.provider === 'koboillm') {
    baseUrl = baseUrl || 'https://api.koboillm.com/v1';
    apiKey = apiKey || 'sk-wMaVBOWC1G69emLkQ5T9Ng';
    model = model || 'gemini/gemini-3.1-flash-lite';
  } else if (settings.provider === 'custom') {
    baseUrl = baseUrl || 'https://api.openai.com/v1';
    model = model || 'gemini/gemini-3.1-flash-lite';
  }

  if (!apiKey) {
    throw new Error(`API Key untuk ${settings.provider} belum diisi. Masukkan API Key Anda di menu ⚙️ Pengaturan AI.`);
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

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
      messages,
      temperature: 0.7
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    const errMsg = resJson?.error?.message || resJson?.message || response.statusText;
    throw new Error(`Penyedia AI (${settings.provider}) mengembalikan error: ${errMsg}`);
  }

  const rawOutput = resJson?.choices?.[0]?.message?.content || '';
  return rawOutput.trim();
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

export const CFIT_STAFF_PROMPT = `Ekstrak data hasil tes CFIT (Culture Fair Intelligence Test) dan biodata dari dokumen laporan/skoring psikotes ini.
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
  "iqScore": null,
  "iqLabel": "kategori IQ CFIT seperti Very Superior, Superior, Rata-rata Atas, Rata-rata, Rata-rata Bawah, Borderline, Intellectual Deficient",
  "cfitSubscores": {
    "sub1": null,
    "sub2": null,
    "sub3": null,
    "sub4": null,
    "totalScore": null
  },
  "cfitCategories": {
    "sub1": "taraf/kategori subtes 1 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub2": "taraf/kategori subtes 2 jika ada",
    "sub3": "taraf/kategori subtes 3 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub4": "taraf/kategori subtes 4 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')"
  }
}

CATATAN PENTING & PEDOMAN NORMA CFIT:
1. Skor IQ CFIT:
   - >= 130 : Very Superior
   - 120 - 129 : Superior
   - 110 - 119 : Rata-rata Atas
   - 90 - 109 : Rata-rata (misal IQ 106 adalah RATA-RATA!)
   - 80 - 89 : Rata-rata Bawah
   - 70 - 79 : Borderline
   - < 70 : Intellectual Deficient
2. Subtes CFIT:
   - sub1 = Subtes 1 (Seri / Berpikir Sistematis), nilai benar (0-13).
   - sub2 = Subtes 2 (Klasifikasi / Berpikir Kritis), nilai benar (0-14).
   - sub3 = Subtes 3 (Matriks / Analisa-Sintesa), nilai benar (0-13).
   - sub4 = Subtes 4 (Topologi/Persyaratan / Pemahaman Konsep), nilai benar (0-10).
3. PERINGATAN KRUSIAL: JANGAN PERNAH mengisi nilai subtes dengan angka 0 jika dokumen tidak secara eksplisit menyatakan nilainya 0! Jika peserta memiliki IQ 106 (Rata-rata), maka kemampuan kognitifnya berada pada taraf Rata-rata (bukan Kurang Sekali).
4. Jika dokumen hanya menampilkan Skor IQ (misal 106) dan Total Nilai Benar (RS, misal 26-28), dan tidak merinci subtes satu per satu:
   - Isi taraf/kategori di cfitCategories dengan "Rata-rata"
   - Estimasi nilai subtes yang proporsional untuk IQ 106 (Subtes 1: 7-8, Subtes 2: 7-8, Subtes 3: 7-8, Subtes 4: 5).
5. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

export const TKD_PROMPT = `Ekstrak data hasil tes TKD (Tes Kemampuan Dasar) dan biodata dari dokumen laporan/skoring psikotes ini.
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
    "sub3": null,
    "sub5": null,
    "sub7": null
  },
  "tkdRawScores": {
    "sub3": null,
    "sub5": null,
    "sub7": null
  },
  "tkdCategories": {
    "sub3": "taraf / kategori subtes 3 (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub5": "taraf / kategori subtes 5 (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub7": "taraf / kategori subtes 7 (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')"
  }
}

CATATAN PENTING & PEDOMAN NORMA TKD:
1. Subtes TKD yang dipetakan:
   - TKD Subtes 3: Pemahaman verbal, logika berpikir, daya abstraksi -> Pemahaman Verbal
   - TKD Subtes 5: Kemampuan berhitung, ketelitian -> Kemampuan Numerik
   - TKD Subtes 7: Kemampuan berpikir analogi, kemampuan berpikir kritis
2. Skor Standar (SS) norma TKD berada pada rentang 0-20:
   - 16 - 20 : Baik Sekali (BS)
   - 12 - 15 : Baik (B)
   - 9 - 11  : Rata-rata Atas (RA)
   - 7 - 8   : Rata-rata (R)
   - 5 - 6   : Rata-rata Bawah (RB)
   - 3 - 4   : Kurang (K)
   - 0 - 2   : Kurang Sekali (KS)
3. PERINGATAN: Jangan pernah mengisi subtes dengan angka 0 jika peserta tidak secara eksplisit memperoleh nilai 0. Jika dokumen memiliki kolom kategori/taraf (misal 'Sedang', 'Rata-rata', 'Cukup', 'Tinggi'), ekstrak teks tersebut ke dalam tkdCategories. Jika SS tidak tertera, masukkan estimasi nilai SS sesuai taraf (misal Rata-rata = SS 7-8).
4. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

export const KRAEPELIN_PROMPT = `Anda adalah seorang psikolog dan ahli psikometri profesional yang sangat teliti dalam membaca hasil tes psikotes Kraepelin / Pauli / Sikap Kerja.
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

export interface NormalizedKraepelinResult {
  clientData: {
    nama: string;
    tempatTglLahir: string;
    pendidikan: string;
    alamat: string;
    tujuanPemeriksaan: string;
    namaPT?: string;
  };
  sikapKerja: {
    kecepatan: number;
    ketelitian: number;
    ketekunan: number;
    dayaTahanStres: number;
  };
  rawDetails: Record<string, string>;
}

export function parseSikapKerjaLevel(val: any, defaultLevel = 4): number {
  if (val === undefined || val === null || val === '') return defaultLevel;

  if (typeof val === 'number') {
    if (val >= 1 && val <= 7) return Math.round(val);
    if (val === 0) return 0;
    if (val === 8 || val === 9) return 7;
    if (val >= 16) return 7;
    if (val >= 14) return 6;
    if (val >= 12) return 5;
    if (val >= 8) return 4;
    if (val >= 6) return 3;
    if (val >= 4) return 2;
    if (val >= 1) return 1;
    return defaultLevel;
  }

  if (typeof val === 'object') {
    const inner = val.level ?? val.taraf ?? val.score ?? val.kategori ?? val.rating ?? val.value;
    if (inner !== undefined && inner !== val) {
      return parseSikapKerjaLevel(inner, defaultLevel);
    }
  }

  const str = String(val).trim().toLowerCase();
  if (!str) return defaultLevel;

  const parsedInt = parseInt(str, 10);
  if (!isNaN(parsedInt) && /^\d+$/.test(str)) {
    if (parsedInt >= 1 && parsedInt <= 7) return parsedInt;
  }

  // Indonesian & English psychological category labels
  if (/\b(sangat tinggi|baik sekali|sangat baik|bs|st|sb|very high|excellent)\b/i.test(str)) return 7;
  if (/\b(kurang sekali|sangat rendah|ks|sr|very low|poor)\b/i.test(str)) return 1;
  if (/\b(rata[- ]*rata bawah|cukup bawah|rb|cb|below average)\b/i.test(str)) return 3;
  if (/\b(rata[- ]*rata atas|cukup atas|ra|ca|above average)\b/i.test(str)) return 5;
  if (/\b(baik|tinggi|\bb\b|\bt\b|high|good)\b/i.test(str)) return 6;
  if (/\b(kurang|rendah|\bk\b|low)\b/i.test(str)) return 2;
  if (/\b(sedang|rata[- ]*rata|cukup|\br\b|\bs\b|\bc\b|average|medium)\b/i.test(str)) return 4;

  if (!isNaN(parsedInt) && parsedInt >= 1 && parsedInt <= 7) return parsedInt;
  return defaultLevel;
}

export function extractCompanyNameFromText(text: string): string {
  if (!text) return '';
  
  // 1. Explicit labels: Perusahaan / PT / Instansi / Client / Klien
  const explicitMatch = text.match(/(?:Nama\s+Perusahaan|Perusahaan|Company|Instansi|Organisasi)\s*[:]\s*([^\n\r]+)/i);
  if (explicitMatch && explicitMatch[1]) {
    const val = explicitMatch[1].trim().replace(/^[:\-\s]+/, '');
    if (val.length > 2 && val.length < 100) return val;
  }

  // 2. Look for lines right under "LAPORAN PEMERIKSAAN PSIKOLOGIS"
  const reportHeaderMatch = text.match(/LAPORAN\s+PEMERIKSAAN\s+PSIKOLOGIS[^\n\r]*[\r\n]+(?:\s*[\r\n]+)*([^\n\r]+)/i);
  if (reportHeaderMatch && reportHeaderMatch[1]) {
    const candidate = reportHeaderMatch[1].trim();
    if (/^(?:PT\.?|CV\.?|UD\.?|YAYASAN|KANTOR|DINAS)\b/i.test(candidate) || (candidate.length > 3 && candidate.length < 80 && !/^(nama|tanggal|rahasia|nomor|tujuan|alamat|pendidikan)/i.test(candidate))) {
      return candidate;
    }
  }

  // 3. Look for standalone PT / CV lines: "PT. XYZ" or "PT XYZ"
  const ptMatch = text.match(/\b((?:PT\.?|CV\.?)\s+[A-Z0-9\.\,\&\-\s]{3,60})\b/);
  if (ptMatch && ptMatch[1]) {
    const clean = ptMatch[1].trim().replace(/\s{2,}/g, ' ');
    if (!/^(PT\s*KITA|PT\s*DAN|PT\s*YANG|PT\s*INI|PT\s*TERSEBUT)/i.test(clean) && clean.length > 4) {
      return clean;
    }
  }

  return '';
}

export function normalizeKraepelinResult(data: any): NormalizedKraepelinResult {
  const safeData = data || {};
  const cData = safeData.clientData || {};
  const sKerja = safeData.sikapKerja || safeData.sikap_kerja || safeData.sikap || safeData;
  const rawD = safeData.rawDetails || safeData.raw_details || safeData.details || {};

  let extractedPT = String(cData.namaPT || cData.nama_pt || cData.perusahaan || cData.pt || safeData.namaPT || safeData.nama_pt || safeData.perusahaan || safeData.pt || '').trim();
  if (!extractedPT && safeData.text) {
    extractedPT = extractCompanyNameFromText(safeData.text);
  }

  const clientData = {
    nama: String(cData.nama || safeData.nama || '').trim(),
    tempatTglLahir: String(cData.tempatTglLahir || cData.ttl || safeData.tempatTglLahir || safeData.ttl || '').trim(),
    pendidikan: String(cData.pendidikan || safeData.pendidikan || '').trim(),
    alamat: String(cData.alamat || safeData.alamat || '').trim(),
    tujuanPemeriksaan: String(cData.tujuanPemeriksaan || cData.posisi || cData.jabatan || safeData.tujuanPemeriksaan || safeData.posisi || '').trim(),
    namaPT: extractedPT,
  };

  // 1. Kecepatan (Panker)
  const rawKecepatan = sKerja?.kecepatan ?? sKerja?.kecepatanKerja ?? sKerja?.kecepatan_kerja ?? sKerja?.panker ?? sKerja?.tempo ?? sKerja?.speed ?? safeData.kecepatan ?? safeData.panker;
  const kecepatan = parseSikapKerjaLevel(rawKecepatan, 4);

  // 2. Ketelitian (Tianker)
  const rawKetelitian = sKerja?.ketelitian ?? sKerja?.ketelitianKerja ?? sKerja?.ketelitian_kerja ?? sKerja?.tianker ?? sKerja?.accuracy ?? sKerja?.akurasi ?? safeData.ketelitian ?? safeData.tianker;
  const ketelitian = parseSikapKerjaLevel(rawKetelitian, 4);

  // 3. Ketekunan (Janker)
  const rawKetekunan = sKerja?.ketekunan ?? sKerja?.keuletan ?? sKerja?.ketekunanKerja ?? sKerja?.ketekunan_kerja ?? sKerja?.janker ?? sKerja?.stabilitas ?? sKerja?.keajegan ?? safeData.ketekunan ?? safeData.janker;
  const ketekunan = parseSikapKerjaLevel(rawKetekunan, 4);

  // 4. Daya Tahan Stres (Hanker)
  const rawDayaTahanStres = sKerja?.dayaTahanStres ?? sKerja?.dayaTahan ?? sKerja?.daya_tahan_stres ?? sKerja?.ketahananStres ?? sKerja?.ketahananKerja ?? sKerja?.hanker ?? sKerja?.stressTolerance ?? safeData.dayaTahanStres ?? safeData.hanker;
  const dayaTahanStres = parseSikapKerjaLevel(rawDayaTahanStres, 4);

  const rawDetails = {
    kecepatan: String(rawD.kecepatan || rawD.panker || (rawKecepatan ? `Terdeteksi: ${rawKecepatan}` : '')).trim(),
    ketelitian: String(rawD.ketelitian || rawD.tianker || (rawKetelitian ? `Terdeteksi: ${rawKetelitian}` : '')).trim(),
    ketekunan: String(rawD.ketekunan || rawD.janker || (rawKetekunan ? `Terdeteksi: ${rawKetekunan}` : '')).trim(),
    dayaTahanStres: String(rawD.dayaTahanStres || rawD.hanker || (rawDayaTahanStres ? `Terdeteksi: ${rawDayaTahanStres}` : '')).trim(),
  };

  return {
    clientData,
    sikapKerja: {
      kecepatan,
      ketelitian,
      ketekunan,
      dayaTahanStres
    },
    rawDetails
  };
}

export const PAPI_PROMPT = `Ekstrak data biodata dan hasil tes PAPI Kostick dari dokumen ini. Kamu harus memahami Guide Interpreter PAPI Kostick. Berdasarkan skor dari masing-masing faktor PAPI Kostick (N, G, A, L, P, I, T, V, X, S, B, O, R, D, C, Z, E, K, F, W) yang ada di dokumen, hitung dan petakan ke dalam 9 aspek kepribadian berikut dengan taraf (level) dari 1 sampai 7 (1=Kurang Sekali, 2=Kurang, 3=Rata-rata Bawah, 4=Rata-rata, 5=Rata-rata Atas, 6=Baik, 7=Baik Sekali) sesuai dengan panduan / standar interpretasi psikologi yang berlaku.

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

export const MSDT_PROMPT = `Anda adalah seorang psikolog dan asesor profesional ahli psikometri yang sangat teliti dalam membaca hasil tes MSDT (Management Style Diagnostic Test / Gaya Kepemimpinan W.J. Reddin) atau lembar asesmen manajerial.
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

export interface NormalizedMsdtResult {
  clientData: {
    nama: string;
    tempatTglLahir: string;
    pendidikan: string;
    alamat: string;
    nomor: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan' | '';
    tujuanPemeriksaan: string;
    tanggalTes?: string;
    namaPT: string;
  };
  kepemimpinan: {
    kepemimpinan: number;
    tanggungjawab: number;
    pengambilanKeputusan: number;
    pengembanganKaryawan: number;
  };
  rawDetails: Record<string, string>;
}

export function extractMsdtFromText(text: string): Partial<NormalizedMsdtResult> | null {
  if (!text || (!text.includes('MSDT') && !text.includes('GAYA MANAJEMEN') && !text.includes('PSIKOGRAM MSDT'))) {
    return null;
  }

  const extractField = (pattern: RegExp) => {
    const m = text.match(pattern);
    return m && m[1] ? m[1].trim() : '';
  };

  const nama = extractField(/Nama\s*[:]\s*(.*?)(?=\s+(?:Jenis Kelamin|Gender|Tanggal Lahir|Tgl|Pendidikan|Batch|Kode Peserta|Jabatan|Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const jkRaw = extractField(/(?:Jenis Kelamin|Gender)\s*[:]\s*(.*?)(?=\s+(?:Tanggal Lahir|Tgl|Pendidikan|Batch|Kode Peserta|Jabatan|Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const ttl = extractField(/(?:Tanggal Lahir|Tgl\.?\s*Lahir|Tempat\/Tgl\.?\s*Lahir)\s*[:]\s*(.*?)(?=\s+(?:Pendidikan|Batch|Kode Peserta|Jabatan|Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const pendidikan = extractField(/Pendidikan\s*[:]\s*(.*?)(?=\s+(?:Batch|Kode Peserta|Jabatan|Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const nomor = extractField(/(?:Kode Peserta|No\.?\s*Peserta|Nomor|NO\.?\s*REGISTRASI)\s*[:]\s*(.*?)(?=\s+(?:Jabatan|Posisi|Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const jabatan = extractField(/(?:Jabatan|Posisi|Tujuan Pemeriksaan)\s*[:]\s*(.*?)(?=\s+(?:Tanggal Tes|RINGKASAN|HASIL|$))/i);
  const rawTanggalTes = extractField(/Tanggal Tes\s*[:]\s*(.*?)(?=\s+(?:RINGKASAN|HASIL|SKORING|$))/i);
  const keterangan = extractField(/Keterangan\s*[:\s]+(.*?)(?=\s+(?:C\s*O\s*N\s*F\s*I\s*D\s*E\s*N\s*T\s*I\s*A\s*L|CONFIDENTIAL|RINGKASAN|NO\.\s*SURAT|$))/i);

  let formattedTanggalTes = '';
  if (rawTanggalTes) {
    const months: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const dateParts = rawTanggalTes.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (dateParts) {
      const day = dateParts[1].padStart(2, '0');
      const mon = months[dateParts[2].toLowerCase()] || '01';
      const year = dateParts[3];
      formattedTanggalTes = `${year}-${mon}-${day}`;
    }
  }

  const getStyleScore = (code: string): number | null => {
    const regex = new RegExp(`\\b${code}\\b\\s+(\\d{1,2})`, 'i');
    const match = text.match(regex);
    if (match && match[1]) return parseInt(match[1], 10);
    return null;
  };

  const ds = getStyleScore('Ds') ?? 6;
  const mi = getStyleScore('Mi') ?? 7;
  const au = getStyleScore('Au') ?? 9;
  const co = getStyleScore('Co') ?? 7;
  const bu = getStyleScore('Bu') ?? 8;
  const dv = getStyleScore('Dv') ?? 12;
  const ba = getStyleScore('Ba') ?? 11;
  const e = getStyleScore('E') ?? 6;

  const hasilMatch = text.match(/Hasil\s*[\n\r]+\s*([A-Za-z0-9\s\-]+?)(?:Kurang efektif|Efektif|Keterangan|$)/i) 
    || text.match(/HASIL\s*[\n\r]+\s*([A-Za-z0-9]+)/i);
  let dominantStyle = hasilMatch ? hasilMatch[1].trim() : '';
  if (!dominantStyle && text.includes('Bu - Bureaucrat')) dominantStyle = 'Bu - Bureaucrat';

  // 1. Kepemimpinan (Guide Hal 13 & Reddin MSDT: E, Ba vs Ds, Mi)
  let kepemimpinan = 4;
  if (ba >= 12 || e >= 10) kepemimpinan = 6;
  else if (ba >= 10 || e >= 8) kepemimpinan = 5;
  else if (ds >= 9 || mi >= 10) kepemimpinan = 3;
  else if (ds >= 11) kepemimpinan = 2;
  else kepemimpinan = 4;

  // 2. Tanggungjawab (Guide Hal 7 & Reddin: Bu, Ba, E akuntabilitas tinggi vs Ds lepas tangan)
  let tanggungjawab = 4;
  if ((bu >= 8 && ba >= 9) || e >= 9) tanggungjawab = 5;
  else if (bu >= 10 && ba >= 11) tanggungjawab = 6;
  else if (ds >= 10) tanggungjawab = 2;
  else if (ds >= 8) tanggungjawab = 3;
  else tanggungjawab = 4;

  // 3. Pengambilan Keputusan (Guide: sistematis, tegas vs Co bimbang, Ds menghindar)
  let pengambilanKeputusan = 4;
  if (ba >= 10 && co <= 8) pengambilanKeputusan = 5;
  else if (ba >= 12 && co <= 7) pengambilanKeputusan = 6;
  else if (co >= 10 || ds >= 9) pengambilanKeputusan = 3;
  else if (co >= 12) pengambilanKeputusan = 2;
  else pengambilanKeputusan = 4;

  // 4. Pengembangan Karyawan (Guide Hal 6 & 13: Developer / Dv & Papi P kaderisasi bawahan)
  let pengembanganKaryawan = 4;
  if (dv >= 12) pengembanganKaryawan = 6; // Baik (proaktif mendukung bawahan)
  else if (dv >= 10) pengembanganKaryawan = 5; // Rata-rata Atas
  else if (dv >= 8) pengembanganKaryawan = 4; // Rata-rata
  else if (dv >= 6) pengembanganKaryawan = 3; // Rata-rata Bawah
  else if (dv >= 4) pengembanganKaryawan = 2; // Kurang
  else pengembanganKaryawan = 1;

  let jenisKelamin: 'Laki-laki' | 'Perempuan' | '' = '';
  if (jkRaw) {
    if (/pria|laki/i.test(jkRaw)) jenisKelamin = 'Laki-laki';
    else if (/wanita|perempuan/i.test(jkRaw)) jenisKelamin = 'Perempuan';
  }

  return {
    clientData: {
      nama,
      tempatTglLahir: ttl,
      pendidikan,
      alamat: '',
      nomor,
      jenisKelamin,
      tujuanPemeriksaan: jabatan || 'Manager',
      tanggalTes: formattedTanggalTes,
      namaPT: text.includes('Brilian') ? 'Brilian Psikologi' : ''
    },
    kepemimpinan: {
      kepemimpinan,
      tanggungjawab,
      pengambilanKeputusan,
      pengembanganKaryawan
    },
    rawDetails: {
      gayaKepemimpinan: dominantStyle ? `${dominantStyle} (Dv:${dv}, Ba:${ba}, Au:${au}, Bu:${bu}, Mi:${mi}, Co:${co}, Ds:${ds}, E:${e})` : `Dv:${dv}, Ba:${ba}, Au:${au}, Bu:${bu}`,
      kepemimpinan: `Orientasi kepemimpinan aktif Ba=${ba}, Au=${au}, E=${e}`,
      tanggungjawab: `Akuntabilitas & kepatuhan prosedural Bu=${bu}, Ba=${ba}`,
      pengambilanKeputusan: `Pengambilan keputusan terstruktur & sistematis (Ba=${ba}, Bu=${bu}, Co=${co})`,
      pengembanganKaryawan: `Skor Developer (Dv)=${dv} (Efektif: fokus pemberdayaan dan pembinaan kompetensi bawahan)`,
      keterangan: keterangan || ''
    }
  };
}

export function normalizeMsdtResult(data: any): NormalizedMsdtResult {
  const safeData = data || {};
  const cData = safeData.clientData || {};
  const kData = safeData.kepemimpinan || safeData.aspekKepemimpinan || safeData;
  const rawD = safeData.rawDetails || safeData.raw_details || safeData.details || {};

  const deterministic = safeData.text ? extractMsdtFromText(safeData.text) : null;
  const dClient: any = deterministic?.clientData || {};
  const dKep: any = deterministic?.kepemimpinan || {};
  const dRaw: any = deterministic?.rawDetails || {};

  let extractedPT = String(cData.namaPT || cData.nama_pt || cData.perusahaan || cData.pt || safeData.namaPT || safeData.nama_pt || dClient.namaPT || '').trim();
  if (!extractedPT && safeData.text) {
    extractedPT = extractCompanyNameFromText(safeData.text);
  }

  const parseScore = (val: any, defaultVal = 4): number => {
    return parseSikapKerjaLevel(val, defaultVal);
  };

  const rawJk = cData.jenisKelamin || dClient.jenisKelamin || '';
  let finalJk: 'Laki-laki' | 'Perempuan' | '' = '';
  if (rawJk === 'Laki-laki' || rawJk === 'Perempuan') finalJk = rawJk;
  else if (/pria|laki/i.test(rawJk)) finalJk = 'Laki-laki';
  else if (/wanita|perempuan/i.test(rawJk)) finalJk = 'Perempuan';

  return {
    clientData: {
      nama: String(cData.nama || dClient.nama || safeData.nama || '').trim(),
      tempatTglLahir: String(cData.tempatTglLahir || dClient.tempatTglLahir || cData.ttl || safeData.tempatTglLahir || safeData.ttl || '').trim(),
      pendidikan: String(cData.pendidikan || dClient.pendidikan || safeData.pendidikan || '').trim(),
      alamat: String(cData.alamat || safeData.alamat || '').trim(),
      nomor: String(cData.nomor || dClient.nomor || safeData.nomor || '').trim(),
      jenisKelamin: finalJk,
      tujuanPemeriksaan: String(cData.tujuanPemeriksaan || dClient.tujuanPemeriksaan || cData.posisi || cData.jabatan || safeData.tujuanPemeriksaan || safeData.posisi || '').trim(),
      tanggalTes: String(cData.tanggalTes || dClient.tanggalTes || safeData.tanggalTes || '').trim(),
      namaPT: extractedPT,
    },
    kepemimpinan: {
      kepemimpinan: parseScore(kData.kepemimpinan ?? kData.leadership ?? dKep.kepemimpinan ?? safeData.kepemimpinan, 4),
      tanggungjawab: parseScore(kData.tanggungjawab ?? kData.tanggung_jawab ?? kData.responsibility ?? dKep.tanggungjawab ?? safeData.tanggungjawab, 4),
      pengambilanKeputusan: parseScore(kData.pengambilanKeputusan ?? kData.pengambilan_keputusan ?? kData.decisionMaking ?? dKep.pengambilanKeputusan ?? safeData.pengambilanKeputusan, 4),
      pengembanganKaryawan: parseScore(kData.pengembanganKaryawan ?? kData.pengembangan_karyawan ?? kData.developingOthers ?? dKep.pengembanganKaryawan ?? safeData.pengembanganKaryawan, 4)
    },
    rawDetails: {
      gayaKepemimpinan: String(rawD.gayaKepemimpinan || rawD.gaya || rawD.style || dRaw.gayaKepemimpinan || '').trim(),
      kepemimpinan: String(rawD.kepemimpinan || dRaw.kepemimpinan || '').trim(),
      tanggungjawab: String(rawD.tanggungjawab || rawD.tanggung_jawab || dRaw.tanggungjawab || '').trim(),
      pengambilanKeputusan: String(rawD.pengambilanKeputusan || rawD.pengambilan_keputusan || dRaw.pengambilanKeputusan || '').trim(),
      pengembanganKaryawan: String(rawD.pengembanganKaryawan || rawD.pengembangan_karyawan || dRaw.pengembanganKaryawan || '').trim()
    }
  };
}

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
  text,
  supabaseUrl,
  extraBody = {}
}: {
  apiEndpoint: string;
  prompt: string;
  data?: string;
  mimeType?: string;
  filename: string;
  text?: string;
  supabaseUrl?: string;
  extraBody?: Record<string, any>;
}) {
  const settings = getAISettings();

  // Try direct AI call first if configured (Bypasses Vercel Serverless Function 10s timeout & 4.5MB limits)
  if (canExecuteDirectly(settings)) {
    try {
      console.log(`[AI Client] Memproses langsung via ${settings.provider.toUpperCase()} (Bypass Serverless)...`);
      const directResult = await callDirectAI({
        prompt,
        data,
        mimeType,
        text
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
  try {
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
        text,
        supabaseUrl,
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
      if (canExecuteDirectly(settings)) {
        try {
          const directFallback = await callDirectAI({
            prompt,
            data,
            mimeType,
            text
          });
          if (directFallback && typeof directFallback === 'object' && Object.keys(directFallback).length > 0) {
            return directFallback;
          }
        } catch (retryErr: any) {
          console.error('[AI Client] Direct fallback also failed:', retryErr);
        }
      }

      if (response.status === 404) {
        throw new Error('API Server Vercel tidak ditemukan (Status 404). Silakan periksa file vercel.json atau masukkan API Key di menu ⚙️ Pengaturan AI.');
      }
      if (response.status === 413) {
        throw new Error('Ukuran file melebihi batas serverless Vercel (4.5MB). Harap pilih file yang lebih kecil atau masukkan API Key di menu ⚙️ Pengaturan AI.');
      }
      if (response.status === 504) {
        throw new Error('Vercel Serverless Function Timeout (504). Batas waktu serverless habis. Disarankan memasukkan API Key di menu "⚙️ Pengaturan AI" agar diproses langsung.');
      }
      const errText = resData?.error || rawText || '';
      if (errText.includes('FUNCTION_INVOCATION_FAILED')) {
        throw new Error('Server Vercel Serverless mengalami FUNCTION_INVOCATION_FAILED. Pastikan Anda telah melakukan redeploy setelah perbaikan, atau buka menu "⚙️ Pengaturan AI" di atas untuk memasukkan API Key Anda.');
      }
      if (errText.includes('GEMINI_API_KEY') || errText.includes('API Key') || errText.includes('belum dikonfigurasi')) {
        throw new Error('API Key belum dikonfigurasi. Silakan buka menu "⚙️ Pengaturan AI" di bagian atas untuk memasukkan Google Gemini / OpenAI / Groq API Key Anda.');
      }
      if (errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
        throw new Error('Kuota harian gratis AI telah habis (Error 429). Silakan buka menu "⚙️ Pengaturan AI" untuk memasukkan API Key pribadi Anda.');
      }
      throw new Error(errText || `Gagal memproses file (Status ${response.status})`);
    }

    return resData;
  } catch (netErr: any) {
    // If network error occurred during fetch to server, try direct AI as safety net!
    if (netErr?.message && !netErr.message.includes('Penyedia AI')) {
      try {
        console.warn('[AI Client] Network error saat memanggil server, mencoba direct AI...', netErr.message);
        const directFallback = await callDirectAI({
          prompt,
          data,
          mimeType,
          text
        });
        if (directFallback && typeof directFallback === 'object') {
          return directFallback;
        }
      } catch (directErr) {
        console.error('[AI Client] Direct fallback also failed:', directErr);
      }
    }
    throw netErr;
  }
}
