import { getAISettings, AISettings, getAIHeaders } from './aiSettings';
import { 
  cleanJsonOutput, 
  safeJsonParse, 
  IST_PROMPT, 
  CFIT_STAFF_PROMPT, 
  CFIT_PROMPT,
  TKD_PROMPT, 
  KRAEPELIN_PROMPT, 
  PAPI_PROMPT, 
  getMBTIPrompt, 
  BEI_PROMPT, 
  MSDT_PROMPT 
} from './prompts';

export { 
  cleanJsonOutput, 
  safeJsonParse, 
  IST_PROMPT, 
  CFIT_STAFF_PROMPT, 
  CFIT_PROMPT,
  TKD_PROMPT, 
  KRAEPELIN_PROMPT, 
  PAPI_PROMPT, 
  getMBTIPrompt, 
  BEI_PROMPT, 
  MSDT_PROMPT 
};

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
