import React, { useState } from 'react';
import { SdAppState, ScaleLevel, Interest, INITIAL_SD_STATE } from '../types';
import { PREDEFINED_INTERESTS, getScaleLabel, getIqClassification, calculatePsikogramCFIT, calculateAge, getAgeInYears } from '../utils/scoring';
import { RefreshCw, FileText, Bot, Loader2, Copy, Check, Sparkles, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface FormInputSDProps {
  state?: SdAppState;
  setState: React.Dispatch<React.SetStateAction<SdAppState>>;
}

export function FormInputSD({ state, setState }: FormInputSDProps) {
  const safeState = state || INITIAL_SD_STATE;
  const clientData = safeState.clientData || INITIAL_SD_STATE.clientData;
  const cfitScores = safeState.cfitScores || INITIAL_SD_STATE.cfitScores;
  const kecerdasanUmum = safeState.kecerdasanUmum || INITIAL_SD_STATE.kecerdasanUmum;
  const bakatKemampuan = safeState.bakatKemampuan || INITIAL_SD_STATE.bakatKemampuan;
  const kepribadian = safeState.kepribadian || INITIAL_SD_STATE.kepribadian;
  const interests = safeState.interests || INITIAL_SD_STATE.interests;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const updateState = (section: keyof SdAppState, field: string, value: any) => {
    if (section === 'clientData' || section === 'kecerdasanUmum' || section === 'bakatKemampuan' || section === 'kepribadian' || section === 'cfitScores') {
      setState(prev => {
        const prevBase = prev || INITIAL_SD_STATE;
        const prevClient = prevBase.clientData || INITIAL_SD_STATE.clientData;
        const updatedSection = {
          ...((prevBase[section] as Record<string, any>) || {}),
          [field]: value
        };
        const newState = {
          ...prevBase,
          [section]: updatedSection
        };

        // Jika tanggalLahir atau tanggalTes diubah, dan ada skor CFIT, hitung ulang dengan norma usia baru
        if (section === 'clientData' && (field === 'tanggalLahir' || field === 'tanggalTes')) {
          const dob = field === 'tanggalLahir' ? value : prevClient.tanggalLahir;
          const testDate = field === 'tanggalTes' ? value : prevClient.tanggalTes;
          const age = getAgeInYears(dob, testDate);
          
          if (prevBase.cfitScores && (prevBase.cfitScores.sub1 !== '' || prevBase.cfitScores.sub2 !== '' || prevBase.cfitScores.sub3 !== '' || prevBase.cfitScores.sub4 !== '')) {
            const calcRaw = {
              sub1: Number(prevBase.cfitScores.sub1) || 0,
              sub2: Number(prevBase.cfitScores.sub2) || 0,
              sub3: Number(prevBase.cfitScores.sub3) || 0,
              sub4: Number(prevBase.cfitScores.sub4) || 0,
            };
            const calculated = calculatePsikogramCFIT(calcRaw, age);
            newState.kecerdasanUmum = {
              ...newState.kecerdasanUmum,
              ...calculated.bagianA
            };
            newState.bakatKemampuan = {
              ...newState.bakatKemampuan,
              ...calculated.bagianB
            };
          }
        }

        return newState;
      });
    } else {
      setState(prev => ({ ...(prev || INITIAL_SD_STATE), [section]: value }));
    }
  };

  const handleCfitChange = (sub: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    
    setState(prev => {
      const prevBase = prev || INITIAL_SD_STATE;
      const prevClient = prevBase.clientData || INITIAL_SD_STATE.clientData;
      const newCfitScores = { ...(prevBase.cfitScores || {}), [sub]: numValue };
      
      const calcRaw = {
        sub1: Number(newCfitScores.sub1) || 0,
        sub2: Number(newCfitScores.sub2) || 0,
        sub3: Number(newCfitScores.sub3) || 0,
        sub4: Number(newCfitScores.sub4) || 0,
      };
      
      const age = getAgeInYears(prevClient.tanggalLahir, prevClient.tanggalTes);
      const calculated = calculatePsikogramCFIT(calcRaw, age);
      const hasAnyScore = newCfitScores.sub1 !== '' || newCfitScores.sub2 !== '' || newCfitScores.sub3 !== '' || newCfitScores.sub4 !== '';

      return {
        ...prevBase,
        cfitScores: newCfitScores,
        iqScore: (prevBase.iqScore === '' || prevBase.iqScore === undefined) && hasAnyScore ? calculated.estimatedIq : prevBase.iqScore,
        kecerdasanUmum: {
          ...prevBase.kecerdasanUmum,
          ...calculated.bagianA
        },
        bakatKemampuan: {
          ...prevBase.bakatKemampuan,
          ...calculated.bagianB
        }
      };
    });
  };

  const currentAge = getAgeInYears(clientData.tanggalLahir, clientData.tanggalTes);
  const currentCalc = calculatePsikogramCFIT({
    sub1: Number(cfitScores?.sub1) || 0,
    sub2: Number(cfitScores?.sub2) || 0,
    sub3: Number(cfitScores?.sub3) || 0,
    sub4: Number(cfitScores?.sub4) || 0,
  }, currentAge);

  const handleClear = () => {
    if (confirmReset) {
      setState(INITIAL_SD_STATE);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Saya sedang menyusun laporan hasil pemeriksaan psikologis (Psikogram Tes Bakat Minat SD).
Tolong buatkan draf narasi analisis hasil psikogram berdasarkan data klien berikut:

--- METODOLOGI ASESMEN ---
Instrumen Inteligensi: CFIT (Culture Fair Intelligence Test) Skala 2 terstandardisasi khusus untuk anak usia di bawah 15 tahun (siswa SD).

--- DATA KLIEN ---
Nama: ${clientData.nama || '[Kosong]'}
Usia: ${calculateAge(clientData.tanggalLahir, clientData.tanggalTes) || '[Kosong]'}
Jenis Kelamin: ${clientData.jenisKelamin || '[Kosong]'}
IQ: ${state.iqScore || '[Kosong]'} (${getIqClassification(state.iqScore)})

--- ASPEK KECERDASAN UMUM ---
Pemahaman: ${getScaleLabel(state.kecerdasanUmum.pemahaman)}
Penalaran: ${getScaleLabel(state.kecerdasanUmum.penalaran)}
Daya Analisis: ${getScaleLabel(state.kecerdasanUmum.dayaAnalisis)}
Daya Sintesis: ${getScaleLabel(state.kecerdasanUmum.dayaSintesis)}
Daya Ingat: ${getScaleLabel(state.kecerdasanUmum.dayaIngat)}

--- ASPEK BAKAT KEMAMPUAN ---
Sistematika Berpikir: ${getScaleLabel(state.bakatKemampuan.sistematikaBerpikir)}
Logika Hubungan: ${getScaleLabel(state.bakatKemampuan.logikaHubungan)}
Ketajaman Diferensiasi: ${getScaleLabel(state.bakatKemampuan.ketajamanDiferensiasi)}

--- ASPEK KEPRIBADIAN ---
Stabilitas Emosi: ${getScaleLabel(state.kepribadian.stabilitasEmosi)}
Motivasi: ${getScaleLabel(state.kepribadian.motivasi)}
Kepercayaan Diri: ${getScaleLabel(state.kepribadian.kepercayaanDiri)}
Penyesuaian Diri: ${getScaleLabel(state.kepribadian.penyesuaianDiri)}
Kerja Sama: ${getScaleLabel(state.kepribadian.kerjaSama)}

--- ASPEK MINAT ---
1. ${state.interests[0]?.name || '[Kosong]'} - ${state.interests[0]?.description || ''}
2. ${state.interests[1]?.name || '[Kosong]'} - ${state.interests[1]?.description || ''}
3. ${state.interests[2]?.name || '[Kosong]'} - ${state.interests[2]?.description || ''}

--- GAYA BELAJAR ---
Utama: ${state.learningStyle || '[Belum dipilih]'}

--- TUGASMU ---
Buatlah narasi yang rapi, profesional, mudah dipahami orang tua, dan mengalir:
- Buatlah deskripsi analisis psikologis yang komprehensif, membahas potensi kecerdasan umum, bakat, kepribadian, serta profil minat dan gaya belajar anak berdasarkan skor di atas.

ATURAN DAN FORMAT PENULISAN:
1. Gunakan bahasa Indonesia yang baku namun luwes, sesuai dengan standar penulisan laporan psikologi untuk orang tua.
2. JANGAN tambahkan poin-poin (bullet points), list, atau sub-judul. Hanya teks narasi paragraf biasa.
3. HINDARI PENGGUNAAN KATA "secara umum", "di atas rata-rata", dan "di bawah rata-rata". Jika mendeskripsikan taraf rata-rata, gunakan HANYA istilah "rata-rata atas" atau "rata-rata bawah" (TIDAK BOLEH pakai kata 'di atas' / 'di bawah').
4. HINDARI penyebutan label taraf secara eksplisit berulang-ulang (misal: "kemampuan penalaran berada pada taraf Cukup"). Fokuslah HANYA pada IMPLIKASI dan gambaran nyata dari kemampuan tersebut di dunia belajar anak. Label taraf sudah ada di psikogram, jadi narasikan maknanya secara aplikatif. Hindari menyebutkan angka skor mentah.`;

      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderScaleInputs = (section: keyof SdAppState, label: string, name: string) => {
    const value = (state[section] as any)[name];
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-2">
        <label className="text-sm text-gray-700 font-medium mb-2 sm:mb-0 w-1/3">{label}</label>
        <div className="flex space-x-1 w-2/3 justify-between">
          {([1, 2, 3, 4, 5, 6, 7] as ScaleLevel[]).map(level => (
            <label key={level} className="flex flex-col items-center cursor-pointer">
              <input
                type="radio"
                name={`${section}_${name}`}
                value={level}
                checked={value === level}
                onChange={() => updateState(section, name, level)}
                className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs text-gray-500 mt-1">
                {['SR', 'R', 'C-', 'C', 'C+', 'T', 'ST'][level - 1]}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-white flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Panel Input Data (SD)</h2>
          <p className="text-sm text-gray-500">Isi data di bawah ini untuk melihat pratinjau psikogram</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className={`flex items-center text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 bg-red-50 hover:bg-red-100'
          }`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {confirmReset ? 'Yakin?' : 'Reset'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50">
        
        {/* Card 1: Identitas Klien */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">1. Identitas Klien</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={clientData.nama}
                onChange={(e) => updateState('clientData', 'nama', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Nama peserta..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={clientData.tanggalLahir}
                onChange={(e) => updateState('clientData', 'tanggalLahir', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="text-xs text-gray-500 mt-1 h-4">
                {calculateAge(clientData.tanggalLahir, clientData.tanggalTes)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select
                value={clientData.jenisKelamin}
                onChange={(e) => updateState('clientData', 'jenisKelamin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Pilih Jenis Kelamin...</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Tes</label>
              <input
                type="date"
                value={clientData.tanggalTes}
                onChange={(e) => updateState('clientData', 'tanggalTes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* IQ Score */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Taraf Kecerdasan Umum</h3>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Skor IQ</label>
            <input
              type="number"
              value={state.iqScore}
              onChange={(e) => updateState('iqScore', '', e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Skor IQ..."
            />
          </div>
        </div>

        {/* Card 1.5: Skor Mentah CFIT */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-800">Skor Mentah CFIT Skala 2 (Otomatis)</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Norma Anak &lt; 15 Tahun
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Masukkan skor mentah CFIT Skala 2 untuk menghitung otomatis Aspek Kecerdasan Umum &amp; Bakat Kemampuan berdasarkan norma terstandarisasi anak usia di bawah 15 tahun.
              </p>
            </div>
            {currentCalc.rawTotal > 0 && (
              <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-right">
                <div className="text-xs text-gray-500">Estimasi IQ CFIT:</div>
                <div className="text-base font-bold text-indigo-600">
                  {currentCalc.estimatedIq} <span className="text-xs font-normal text-gray-600">({getIqClassification(currentCalc.estimatedIq)})</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtes 1 (Deret)</label>
              <input
                type="number"
                max="13"
                min="0"
                value={state.cfitScores?.sub1 ?? ''}
                onChange={(e) => handleCfitChange('sub1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Max 13"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtes 2 (Klasifikasi)</label>
              <input
                type="number"
                max="14"
                min="0"
                value={state.cfitScores?.sub2 ?? ''}
                onChange={(e) => handleCfitChange('sub2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Max 14"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtes 3 (Matriks)</label>
              <input
                type="number"
                max="13"
                min="0"
                value={state.cfitScores?.sub3 ?? ''}
                onChange={(e) => handleCfitChange('sub3', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Max 13"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtes 4 (Titik)</label>
              <input
                type="number"
                max="10"
                min="0"
                value={state.cfitScores?.sub4 ?? ''}
                onChange={(e) => handleCfitChange('sub4', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Max 10"
              />
            </div>
          </div>

          {/* Info Acuan Norma Usia Anak */}
          <div className="flex flex-wrap items-center justify-between p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Kelompok Norma:</span>
              <span>
                {currentCalc.isAgeSpecific 
                  ? `Usia ${currentCalc.ageUsed} Tahun (Otomatis dari Tanggal Lahir & Tes)` 
                  : 'Standar Siswa SD (Acuan Usia 10 Tahun)'}
              </span>
              <span className="text-blue-300">|</span>
              <span>Total Skor Mentah: <strong className="font-bold">{currentCalc.rawTotal} / 50</strong></span>
            </div>
            {currentCalc.rawTotal > 0 && state.iqScore !== currentCalc.estimatedIq && (
              <button
                type="button"
                onClick={() => updateState('iqScore', '', currentCalc.estimatedIq)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Terapkan IQ ({currentCalc.estimatedIq}) ke Form
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Aspek Kecerdasan Umum */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">A. Aspek Kecerdasan Umum</h3>
          <div className="flex flex-col space-y-4">
            <div className="flex text-xs font-semibold text-gray-500 mb-2">
              <div className="w-1/3">Aspek</div>
              <div className="w-2/3 flex justify-between px-2">
                <span>S.Rendah</span><span>S.Tinggi</span>
              </div>
            </div>
            {renderScaleInputs('kecerdasanUmum', 'Pemahaman', 'pemahaman')}
            {renderScaleInputs('kecerdasanUmum', 'Penalaran', 'penalaran')}
            {renderScaleInputs('kecerdasanUmum', 'Daya Analisis', 'dayaAnalisis')}
            {renderScaleInputs('kecerdasanUmum', 'Daya Sintesis', 'dayaSintesis')}
            {renderScaleInputs('kecerdasanUmum', 'Daya Ingat', 'dayaIngat')}
          </div>
        </div>

        {/* Card 3: Aspek Bakat Kemampuan */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">B. Aspek Bakat Kemampuan</h3>
          <div className="flex flex-col space-y-4">
            <div className="flex text-xs font-semibold text-gray-500 mb-2">
              <div className="w-1/3">Aspek</div>
              <div className="w-2/3 flex justify-between px-2">
                <span>S.Rendah</span><span>S.Tinggi</span>
              </div>
            </div>
            {renderScaleInputs('bakatKemampuan', 'Sistematika Berpikir', 'sistematikaBerpikir')}
            {renderScaleInputs('bakatKemampuan', 'Logika Hubungan', 'logikaHubungan')}
            {renderScaleInputs('bakatKemampuan', 'Ketajaman Diferensiasi', 'ketajamanDiferensiasi')}
          </div>
        </div>

        {/* Card 4: Aspek Kepribadian */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">C. Aspek Kepribadian</h3>
          <div className="flex flex-col space-y-4">
            <div className="flex text-xs font-semibold text-gray-500 mb-2">
              <div className="w-1/3">Aspek</div>
              <div className="w-2/3 flex justify-between px-2">
                <span>S.Rendah</span><span>S.Tinggi</span>
              </div>
            </div>
            {renderScaleInputs('kepribadian', 'Stabilitas Emosi', 'stabilitasEmosi')}
            {renderScaleInputs('kepribadian', 'Motivasi', 'motivasi')}
            {renderScaleInputs('kepribadian', 'Kepercayaan Diri', 'kepercayaanDiri')}
            {renderScaleInputs('kepribadian', 'Penyesuaian Diri', 'penyesuaianDiri')}
            {renderScaleInputs('kepribadian', 'Kerja Sama', 'kerjaSama')}
          </div>
        </div>

        {/* Card 5: Aspek Minat */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">D. Aspek Minat</h3>
          <div className="space-y-6">
            {state.interests.map((interest, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-gray-50 pb-4">
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minat {index + 1}</label>
                  <select
                    value={interest.name}
                    onChange={(e) => {
                      const newInterests = [...state.interests];
                      const selectedName = e.target.value;
                      newInterests[index] = { 
                        name: selectedName, 
                        description: selectedName ? PREDEFINED_INTERESTS[selectedName] : '' 
                      };
                      updateState('interests', '', newInterests);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Pilih Minat --</option>
                    {Object.keys(PREDEFINED_INTERESTS).map(key => {
                      const isSelectedElsewhere = state.interests.some((inter, i) => i !== index && inter.name === key);
                      if (isSelectedElsewhere) return null;
                      return (
                        <option key={key} value={key}>{key}</option>
                      );
                    })}
                  </select>
                </div>
                <div className="w-full sm:w-2/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    readOnly
                    value={interest.description}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-300 rounded-lg outline-none resize-y"
                    placeholder="Deskripsi minat akan terisi otomatis..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 6: Gaya Belajar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">Gaya Belajar</h3>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Gaya Belajar Dominan</label>
            <div className="flex gap-4">
              {['Visual', 'Auditori', 'Kinestetik'].map(style => (
                <label key={style} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="learningStyle"
                    value={style}
                    checked={state.learningStyle === style}
                    onChange={(e) => updateState('learningStyle', '', e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-gray-700 text-sm font-medium">{style}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Card 7: Rekomendasi */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h3 className="text-lg font-medium text-gray-800">Narasi Analisis Psikologis</h3>
            <button
              onClick={generatePrompt}
              disabled={isGenerating}
              className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-70"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
              Buat Prompt Analisis AI
            </button>
          </div>

          {generatedPrompt && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Prompt untuk Gemini Pro / ChatGPT</span>
                <button
                  onClick={copyToClipboard}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs font-medium bg-white px-2 py-1 rounded shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'Tersalin!' : 'Salin Prompt'}
                </button>
              </div>
              <p className="text-sm text-indigo-900 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-indigo-50 max-h-60 overflow-y-auto">
                {generatedPrompt}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rekomendasi Tindak Lanjut</label>
              <textarea
                value={state.rekomendasi}
                onChange={(e) => updateState('rekomendasi', '', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Rekomendasi..."
              />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
