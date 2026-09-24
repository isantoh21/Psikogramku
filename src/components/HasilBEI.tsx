import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, Download, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { getAIHeaders, getAISettings } from '../utils/aiSettings';
import { callDirectAI, canExecuteDirectly, BEI_PROMPT } from '../utils/clientAIExtractor';

type STAR = { situation: string; task: string; action: string; result: string };
type BEIState = {
  clientData: { nama: string; posisi: string; pengalaman: string };
  kematanganEmosi: STAR;
  kematanganSosial: STAR;
  rasaPercayaDiri: STAR;
  motivasiBerprestasi: STAR;
  sikapMandiri: STAR;
  inisiatif: STAR;
  kemampuanBekerjasama: STAR;
  keterampilanBerkomunikasi: STAR;
  loyalitas: STAR;
};

const INITIAL_STAR: STAR = { situation: '', task: '', action: '', result: '' };
const INITIAL_STATE: BEIState = {
  clientData: { nama: '', posisi: '', pengalaman: '' },
  kematanganEmosi: { ...INITIAL_STAR },
  kematanganSosial: { ...INITIAL_STAR },
  rasaPercayaDiri: { ...INITIAL_STAR },
  motivasiBerprestasi: { ...INITIAL_STAR },
  sikapMandiri: { ...INITIAL_STAR },
  inisiatif: { ...INITIAL_STAR },
  kemampuanBekerjasama: { ...INITIAL_STAR },
  keterampilanBerkomunikasi: { ...INITIAL_STAR },
  loyalitas: { ...INITIAL_STAR },
};

export function HasilBEI() {
  const [state, setState] = useState<BEIState>(INITIAL_STATE);
  const safeState = state || INITIAL_STATE;
  const clientData = safeState.clientData || INITIAL_STATE.clientData;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateStar = (aspek: keyof Omit<BEIState, 'clientData'>, field: keyof STAR, value: string) => {
    setState(prev => {
      const base = prev || INITIAL_STATE;
      return {
        ...base,
        [aspek]: {
          ...(base[aspek] || {}),
          [field]: value
        }
      };
    });
  };

  const handleUpdateClient = (field: keyof BEIState['clientData'], value: string) => {
    setState(prev => {
      const base = prev || INITIAL_STATE;
      const baseClient = base.clientData || INITIAL_STATE.clientData;
      return {
        ...base,
        clientData: {
          ...baseClient,
          [field]: value
        }
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | any) => {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFileName(file.name);
    setStatusMessage({ type: '', text: '' });

    if (file.size > 4.4 * 1024 * 1024 && !canExecuteDirectly()) {
      setIsUploading(false);
      setStatusMessage({
        type: 'error',
        text: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas upload Vercel (maksimal 4.5MB). Harap kompres dokumen atau audio terlebih dahulu.`
      });
      return;
    }

    try {
      let data: any = null;

      // Try direct client-side AI processing (bypasses Vercel Serverless Function 10s timeout & 4.5MB limits)
      if (canExecuteDirectly()) {
        try {
          if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const textContent = await file.text();
            data = await callDirectAI({
              prompt: `${BEI_PROMPT}\n\n=== BERIKUT TEKS CATATAN / TRANSKRIP WAWANCARA DARI FILE (${file.name}) ===\n${textContent}`
            });
          } else if (file.type.includes('pdf') || file.type.startsWith('image/')) {
            const reader = new FileReader();
            const base64Promise = new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
              reader.onload = () => {
                const res = reader.result as string;
                const base64 = res.split(',')[1];
                resolve({ base64, mimeType: file.type || 'application/pdf' });
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(file);
            const { base64, mimeType } = await base64Promise;
            data = await callDirectAI({
              prompt: BEI_PROMPT,
              data: base64,
              mimeType
            });
          }
        } catch (clientErr: any) {
          console.warn('Client direct BEI extraction failed, trying server:', clientErr);
        }
      }

      if (!data) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/extract-bei', {
          method: 'POST',
          headers: {
            ...getAIHeaders()
          },
          body: formData,
        });

        let rawText = '';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          rawText = await response.text();
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('API Server tidak ditemukan di Vercel (Status 404). Pastikan file vercel.json dan folder api/ sudah terdeploy ke repositori GitHub.');
          }
          if (response.status === 413) {
            throw new Error('Ukuran file melebihi batas serverless Vercel (Maksimal 4.5MB). Harap kompres file sebelum diunggah.');
          }
          if (response.status === 504) {
            throw new Error('Server Vercel Timeout (Status 504). Proses ekstraksi AI melebihi batas waktu serverless. Disarankan menggunakan Custom Provider di Pengaturan AI.');
          }
          const errText = data?.error || rawText || '';
          if (errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
            throw new Error('Kuota harian gratis AI telah habis (Error 429). Silakan gunakan tombol "⚙️ Pengaturan AI" di bagian atas untuk beralih ke OpenAI / OpenRouter atau memasukkan API Key pribadi Anda.');
          }
          if (errText.includes('GEMINI_API_KEY')) {
            throw new Error('GEMINI_API_KEY belum dikonfigurasi. Anda dapat mengisinya di menu "⚙️ Pengaturan AI" atau di Environment Variables Vercel.');
          }
          throw new Error(errText || `Gagal mengekstrak data dari file (Status ${response.status})`);
        }
      }

      const extractedClient = data?.clientData || {};
      setState(prev => {
        const base = prev || INITIAL_STATE;
        const baseClient = base.clientData || INITIAL_STATE.clientData;
        return {
          ...base,
          clientData: {
            nama: extractedClient.nama || baseClient.nama,
            posisi: extractedClient.posisi || baseClient.posisi,
            pengalaman: extractedClient.pengalaman || baseClient.pengalaman,
          },
          kematanganEmosi: { ...base.kematanganEmosi, ...(data?.kematanganEmosi || {}) },
          kematanganSosial: { ...base.kematanganSosial, ...(data?.kematanganSosial || {}) },
          rasaPercayaDiri: { ...base.rasaPercayaDiri, ...(data?.rasaPercayaDiri || {}) },
          motivasiBerprestasi: { ...base.motivasiBerprestasi, ...(data?.motivasiBerprestasi || {}) },
          sikapMandiri: { ...base.sikapMandiri, ...(data?.sikapMandiri || {}) },
          inisiatif: { ...base.inisiatif, ...(data?.inisiatif || {}) },
          kemampuanBekerjasama: { ...base.kemampuanBekerjasama, ...(data?.kemampuanBekerjasama || {}) },
          keterampilanBerkomunikasi: { ...base.keterampilanBerkomunikasi, ...(data?.keterampilanBerkomunikasi || {}) },
          loyalitas: { ...base.loyalitas, ...(data?.loyalitas || {}) },
        };
      });

      setStatusMessage({
        type: 'success',
        text: `Berhasil mengekstrak data wawancara BEI dari "${file.name}"!`
      });
    } catch (error: any) {
      console.error('Error uploading BEI file:', error);
      setStatusMessage({
        type: 'error',
        text: error?.message || 'Gagal memproses file. Pastikan format file sesuai (PDF, DOCX, TXT, Audio, Gambar).'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadMarkdown = () => {
    const md = `## **BEHAVIOR EVENT INTERVIEW (STAFF)**
## **Nama : ${clientData.nama}**

**Posisi/level : ${clientData.posisi}**

**Pertanyaan pembuka untuk kemudian di lakukan probing dengan BEI**

1. Perkenalkan diri Anda
2. Jelaskan pengalaman kerja Anda

${clientData.pengalaman || '-'}

========================================================================

**Pertanyaan BEI**

**1. Kematangan Emosi**
Situation :
${safeState.kematanganEmosi.situation || '-'}

Task :
${safeState.kematanganEmosi.task || '-'}

Action :
${state.kematanganEmosi.action || '-'}

Result :
${state.kematanganEmosi.result || '-'}


**2. Kematangan Sosial**
Situation :
${state.kematanganSosial.situation || '-'}

Task :
${state.kematanganSosial.task || '-'}

Action :
${state.kematanganSosial.action || '-'}

Result :
${state.kematanganSosial.result || '-'}


**3. Rasa Percaya Diri**
Situation :
${state.rasaPercayaDiri.situation || '-'}

Task :
${state.rasaPercayaDiri.task || '-'}

Action :
${state.rasaPercayaDiri.action || '-'}

Result :
${state.rasaPercayaDiri.result || '-'}


**4. Motivasi Berprestasi**
Situation :
${state.motivasiBerprestasi.situation || '-'}

Task :
${state.motivasiBerprestasi.task || '-'}

Action :
${state.motivasiBerprestasi.action || '-'}

Result :
${state.motivasiBerprestasi.result || '-'}


**5. Sikap Mandiri**
Situation :
${state.sikapMandiri.situation || '-'}

Task :
${state.sikapMandiri.task || '-'}

Action :
${state.sikapMandiri.action || '-'}

Result :
${state.sikapMandiri.result || '-'}


**6. Inisiatif**
Situation :
${state.inisiatif.situation || '-'}

Task :
${state.inisiatif.task || '-'}

Action :
${state.inisiatif.action || '-'}

Result :
${state.inisiatif.result || '-'}


**7. Kemampuan Bekerjasama**
Situation :
${state.kemampuanBekerjasama.situation || '-'}

Task :
${state.kemampuanBekerjasama.task || '-'}

Action :
${state.kemampuanBekerjasama.action || '-'}

Result :
${state.kemampuanBekerjasama.result || '-'}


**8. Keterampilan Berkomunikasi**
Situation :
${state.keterampilanBerkomunikasi.situation || '-'}

Task :
${state.keterampilanBerkomunikasi.task || '-'}

Action :
${state.keterampilanBerkomunikasi.action || '-'}

Result :
${state.keterampilanBerkomunikasi.result || '-'}


**9. Loyalitas**
Situation :
${state.loyalitas.situation || '-'}

Task :
${state.loyalitas.task || '-'}

Action :
${state.loyalitas.action || '-'}

Result :
${state.loyalitas.result || '-'}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const namaPeserta = clientData.nama || 'Peserta';
    const posisiPeserta = clientData.posisi ? `_${clientData.posisi}` : '';
    link.download = `Hasil BEI_${namaPeserta}${posisiPeserta}_SUDAH INPUT.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStarCard = (title: string, index: number, field: keyof Omit<BEIState, 'clientData'>) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6" key={field}>
      <h3 className="text-lg font-medium text-gray-800 mb-4">{index}. {title}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Situation :</label>
          <textarea
            value={state[field].situation}
            onChange={(e) => handleUpdateStar(field, 'situation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task :</label>
          <textarea
            value={state[field].task}
            onChange={(e) => handleUpdateStar(field, 'task', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action :</label>
          <textarea
            value={state[field].action}
            onChange={(e) => handleUpdateStar(field, 'action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Result :</label>
          <textarea
            value={state[field].result}
            onChange={(e) => handleUpdateStar(field, 'result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hasil BEI (Staff)</h1>
          <p className="text-gray-600">
            Upload dokumen transkrip BEI atau ketik manual untuk menghasilkan format terstruktur.
          </p>
        </div>
        <button 
          onClick={downloadMarkdown}
          className="flex items-center text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl shadow-sm transition-all"
        >
          <Download className="w-5 h-5 mr-2" />
          Download .MD
        </button>
      </div>

      <div className="space-y-6">
        {/* Notifikasi Status Unggah */}
        {statusMessage.text && (
          <div
            className={`p-4 rounded-xl flex items-start justify-between gap-3 text-sm animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage({ type: '', text: '' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dropzone Upload */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white shadow-sm ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]' 
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/20'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.doc,.txt,.md,.mp3,.m4a,.wav,.ogg,.aac,.flac,.jpg,.jpeg,.png"
            className="hidden" 
          />
          <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
            <div className="bg-indigo-100 p-4 rounded-full mb-3 text-indigo-600">
              {isUploading ? <Loader2 size={32} className="animate-spin text-indigo-600" /> : <Upload size={32} />}
            </div>
            {isUploading ? (
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Mengekstrak Dokumen Wawancara...</h3>
                <p className="text-xs text-indigo-600 font-medium">
                  {uploadFileName ? `Memproses file "${uploadFileName}" via AI Gemini` : 'Mohon tunggu beberapa detik...'}
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-medium text-gray-900 mb-1">Klik atau Drag & Drop file hasil wawancara</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-3">
                  Upload transkrip wawancara, catatan asesor, atau rekaman audio untuk diekstrak otomatis ke format STAR
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 text-[11px] font-medium text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">📄 PDF</span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">📝 DOCX / DOC</span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">📃 TXT / MD</span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">🎙️ Audio (MP3/M4A/WAV)</span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">🖼️ Gambar / Scan</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Data Peserta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={clientData.nama}
                onChange={(e) => handleUpdateClient('nama', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posisi/level</label>
              <input
                type="text"
                value={clientData.posisi}
                onChange={(e) => handleUpdateClient('posisi', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pengalaman Kerja</label>
            <textarea
              value={clientData.pengalaman}
              onChange={(e) => handleUpdateClient('pengalaman', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
            />
          </div>
        </div>

        <div className="space-y-6">
          {renderStarCard("Kematangan Emosi", 1, "kematanganEmosi")}
          {renderStarCard("Kematangan Sosial", 2, "kematanganSosial")}
          {renderStarCard("Rasa Percaya Diri", 3, "rasaPercayaDiri")}
          {renderStarCard("Motivasi Berprestasi", 4, "motivasiBerprestasi")}
          {renderStarCard("Sikap Mandiri", 5, "sikapMandiri")}
          {renderStarCard("Inisiatif", 6, "inisiatif")}
          {renderStarCard("Kemampuan Bekerjasama", 7, "kemampuanBekerjasama")}
          {renderStarCard("Keterampilan Berkomunikasi", 8, "keterampilanBerkomunikasi")}
          {renderStarCard("Loyalitas", 9, "loyalitas")}
        </div>
      </div>
    </div>
  );
}
