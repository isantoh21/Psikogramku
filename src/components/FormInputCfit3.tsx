import React, { useState } from 'react';
import { Cfit3AppState, ScaleLevel, INITIAL_CFIT3_STATE } from '../types';
import { 
  PREDEFINED_INTERESTS, 
  getScaleLabel, 
  getIqClassification, 
  calculateAge, 
  getAgeInYears,
  calculatePsikogramCfit3,
  calculateIqCfit3,
  CFIT3_ANSWER_KEYS,
  gradeCfit3Subtest
} from '../utils/scoring';
import { callDirectAI } from '../utils/clientAIExtractor';
import { getAISettings } from '../utils/aiSettings';
import { 
  Bot, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Edit3, 
  ListChecks, 
  Zap, 
  Briefcase, 
  GraduationCap,
  Info
} from 'lucide-react';

interface FormInputCfit3Props {
  state?: Cfit3AppState;
  setState: React.Dispatch<React.SetStateAction<Cfit3AppState>>;
}

export function FormInputCfit3({ state, setState }: FormInputCfit3Props) {
  const safeState = state || INITIAL_CFIT3_STATE;
  const clientData = safeState.clientData || INITIAL_CFIT3_STATE.clientData;
  const cfitScores = safeState.cfitScores || INITIAL_CFIT3_STATE.cfitScores;
  const rawAnswers = safeState.rawAnswers || INITIAL_CFIT3_STATE.rawAnswers;
  const kecerdasanUmum = safeState.kecerdasanUmum || INITIAL_CFIT3_STATE.kecerdasanUmum;
  const bakatKemampuan = safeState.bakatKemampuan || INITIAL_CFIT3_STATE.bakatKemampuan;
  const rmibInterests = safeState.rmibInterests || INITIAL_CFIT3_STATE.rmibInterests;
  const dreamJobs = safeState.dreamJobs || INITIAL_CFIT3_STATE.dreamJobs;

  const [inputMode, setInputMode] = useState<'quick' | 'answers'>('quick');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ageYears = getAgeInYears(clientData.tanggalLahir, clientData.tanggalTes);
  const ageDisplay = calculateAge(clientData.tanggalLahir, clientData.tanggalTes);

  // Recalculate psychogram and IQ when scores change
  const applyScoreUpdate = (
    newScores: { sub1: number | ''; sub2: number | ''; sub3: number | ''; sub4: number | '' },
    currentDob = clientData.tanggalLahir,
    currentTestDate = clientData.tanggalTes
  ) => {
    const age = getAgeInYears(currentDob, currentTestDate);
    const numScores = {
      sub1: Number(newScores.sub1) || 0,
      sub2: Number(newScores.sub2) || 0,
      sub3: Number(newScores.sub3) || 0,
      sub4: Number(newScores.sub4) || 0,
    };
    const total = numScores.sub1 + numScores.sub2 + numScores.sub3 + numScores.sub4;
    const calc = calculatePsikogramCfit3(numScores, age);

    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      cfitScores: newScores,
      rawScoreTotal: total,
      iqScore: calc.estimatedIq,
      iqLabel: calc.iqLabel,
      kecerdasanUmum: {
        ...((prev || INITIAL_CFIT3_STATE).kecerdasanUmum),
        ...calc.bagianA
      },
      bakatKemampuan: {
        ...((prev || INITIAL_CFIT3_STATE).bakatKemampuan),
        ...calc.bagianB
      }
    }));
  };

  const handleClientDataChange = (field: keyof typeof clientData, value: string) => {
    setState(prev => {
      const base = prev || INITIAL_CFIT3_STATE;
      const updatedClient = { ...base.clientData, [field]: value };
      
      // Auto recalculate IQ & aspects if dates change
      if (field === 'tanggalLahir' || field === 'tanggalTes') {
        const age = getAgeInYears(
          field === 'tanggalLahir' ? value : updatedClient.tanggalLahir,
          field === 'tanggalTes' ? value : updatedClient.tanggalTes
        );
        const numScores = {
          sub1: Number(base.cfitScores.sub1) || 0,
          sub2: Number(base.cfitScores.sub2) || 0,
          sub3: Number(base.cfitScores.sub3) || 0,
          sub4: Number(base.cfitScores.sub4) || 0,
        };
        const calc = calculatePsikogramCfit3(numScores, age);
        return {
          ...base,
          clientData: updatedClient,
          iqScore: calc.estimatedIq,
          iqLabel: calc.iqLabel,
          kecerdasanUmum: { ...base.kecerdasanUmum, ...calc.bagianA },
          bakatKemampuan: { ...base.bakatKemampuan, ...calc.bagianB },
        };
      }

      return {
        ...base,
        clientData: updatedClient
      };
    });
  };

  const handleSubscoreChange = (sub: 'sub1' | 'sub2' | 'sub3' | 'sub4', val: string) => {
    const maxLimits = { sub1: 13, sub2: 14, sub3: 13, sub4: 10 };
    let numVal: number | '' = val === '' ? '' : Number(val);
    if (typeof numVal === 'number') {
      if (numVal < 0) numVal = 0;
      if (numVal > maxLimits[sub]) numVal = maxLimits[sub];
    }
    const newScores = { ...cfitScores, [sub]: numVal };
    applyScoreUpdate(newScores);
  };

  const handleManualIqChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      iqScore: num,
      iqLabel: num === '' ? '-' : getIqClassification(num)
    }));
  };

  const handleSingleAnswerChange = (sub: 'sub1' | 'sub2' | 'sub3' | 'sub4', idx: number, val: string) => {
    const currentSubAnswers = [...(rawAnswers[sub] || [])];
    currentSubAnswers[idx] = val.trim().toUpperCase();
    const updatedAnswers = { ...rawAnswers, [sub]: currentSubAnswers };

    // Grade and update score
    const graded1 = gradeCfit3Subtest(sub === 'sub1' ? currentSubAnswers : (rawAnswers.sub1 || []), 'sub1');
    const graded2 = gradeCfit3Subtest(sub === 'sub2' ? currentSubAnswers : (rawAnswers.sub2 || []), 'sub2');
    const graded3 = gradeCfit3Subtest(sub === 'sub3' ? currentSubAnswers : (rawAnswers.sub3 || []), 'sub3');
    const graded4 = gradeCfit3Subtest(sub === 'sub4' ? currentSubAnswers : (rawAnswers.sub4 || []), 'sub4');

    const newScores = {
      sub1: graded1.correctCount,
      sub2: graded2.correctCount,
      sub3: graded3.correctCount,
      sub4: graded4.correctCount,
    };

    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      rawAnswers: updatedAnswers
    }));
    applyScoreUpdate(newScores);
  };

  const handleAspectChange = (
    section: 'kecerdasanUmum' | 'bakatKemampuan',
    aspect: string,
    val: ScaleLevel
  ) => {
    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      [section]: {
        ...((prev || INITIAL_CFIT3_STATE)[section]),
        [aspect]: val
      }
    }));
  };

  const handleInterestSelect = (index: number, interestName: string) => {
    const desc = PREDEFINED_INTERESTS[interestName] || '';
    const updated = [...rmibInterests];
    updated[index] = { name: interestName, description: desc };
    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      rmibInterests: updated
    }));
  };

  const handleInterestDescChange = (index: number, desc: string) => {
    const updated = [...rmibInterests];
    updated[index] = { ...updated[index], description: desc };
    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      rmibInterests: updated
    }));
  };

  const handleDreamJobChange = (index: number, val: string) => {
    const updated = [...dreamJobs];
    updated[index] = val;
    setState(prev => ({
      ...(prev || INITIAL_CFIT3_STATE),
      dreamJobs: updated
    }));
  };

  const isSmp = clientData.pendidikan === 'SMP' || (typeof ageYears === 'number' && ageYears <= 15);

  const buildAiPrompt = () => {
    const jenjangStr = isSmp ? 'Siswa Jenjang SMP (Sekolah Menengah Pertama)' : 'Siswa/Individu Jenjang SMA / SMK / Mahasiswa / Dewasa';
    
    return `Anda adalah seorang Psikolog Pendidikan dan Karir profesional.
Tugas Anda adalah menyusun REKOMENDASI TINDAK LANJUT yang tajam, solutif, komprehensif, dan langsung aplikatif untuk Laporan Hasil Pemeriksaan Psikologis 1 Lembar (CFIT Skala 3 & Minat Bakat).

=== DATA KLIEN ===
Nama: ${clientData.nama || 'Klien'}
Usia: ${ageDisplay || (ageYears ? `${ageYears} tahun` : '15 tahun')}
Jenjang / Asal Sekolah: ${clientData.pendidikan || 'SMP'} - ${clientData.asalSekolah || '-'}
Target Level: ${jenjangStr}

=== HASIL TES INTELIGENSI CFIT SKALA 3 ===
Skor IQ: ${safeState.iqScore || '-'} (${safeState.iqLabel || getIqClassification(safeState.iqScore)})
- Total Jawaban Benar CFIT: ${safeState.rawScoreTotal || '-'} dari 50 soal
- Aspek Kecerdasan Umum:
  * Pemahaman: ${getScaleLabel(kecerdasanUmum.pemahaman)}
  * Penalaran: ${getScaleLabel(kecerdasanUmum.penalaran)}
  * Daya Analisis: ${getScaleLabel(kecerdasanUmum.dayaAnalisis)}
  * Daya Sintesis: ${getScaleLabel(kecerdasanUmum.dayaSintesis)}
  * Daya Ingat: ${getScaleLabel(kecerdasanUmum.dayaIngat)}
- Aspek Bakat Kemampuan:
  * Sistematika Berpikir: ${getScaleLabel(bakatKemampuan.sistematikaBerpikir)}
  * Logika Hubungan: ${getScaleLabel(bakatKemampuan.logikaHubungan)}
  * Ketajaman Diferensiasi: ${getScaleLabel(bakatKemampuan.ketajamanDiferensiasi)}

=== HASIL PEMINATAN RMIB (TOP 3) ===
1. ${rmibInterests[0]?.name || '-'} : ${rmibInterests[0]?.description || '-'}
2. ${rmibInterests[1]?.name || '-'} : ${rmibInterests[1]?.description || '-'}
3. ${rmibInterests[2]?.name || '-'} : ${rmibInterests[2]?.description || '-'}

=== CITA-CITA / PEKERJAAN IMPIAN KLIEN (TOP 3) ===
1. ${dreamJobs[0] || 'Pekerjaan Impian 1'}
2. ${dreamJobs[1] || 'Pekerjaan Impian 2'}
3. ${dreamJobs[2] || 'Pekerjaan Impian 3'}

=== PANDUAN PENYUSUNAN REKOMENDASI ===
${isSmp ? `KARENA KLIEN BERADA DI USIA / JENJANG SMP:
1. Rekomendasi Pilihan Sekolah Lanjutan: Berikan ketegasan apakah lebih direkomendasikan masuk SMA atau SMK, disertai alasan kecocokan antara potensi kognitif CFIT Skala 3, pola pikir, dan minat RMIB.
2. Rekomendasi Jurusan / Program Keahlian: Tentukan penjurusan spesifik di SMA (misal MIPA/IPA, IPS) atau program keahlian di SMK yang paling selaras untuk membuka jalan menuju 3 pekerjaan impian klien.
3. Penguatan Belajar Mata Pelajaran: Sebutkan mata pelajaran sekolah yang WAJIB diperkuat dan dioptimalkan mulai saat ini beserta tips belajarnya untuk menunjang pencapaian cita-cita tersebut.` : `KARENA KLIEN BERADA DI USIA / JENJANG SMA KE ATAS:
1. Rekomendasi Jalur Karir & Studi Lanjutan: Berikan rekomendasi apakah disarankan melanjutkan ke Perguruan Tinggi (Kuliah) atau Dunia Kerja / Vokasi. Sebutkan program studi / jurusan kuliah atau bidang karir spesifik yang paling relevan dengan potensi kognitif dan 3 pekerjaan impian klien.
2. Usaha & Persiapan Konkret: Rincikan apa saja yang harus diusahakan dan dipersiapkan secara nyata mulai sekarang (misal: penguatan portofolio, kompetensi teknis, sertifikasi, penguasaan bahasa asing, logika matematika, serta pengembangan kepribadian) guna mewujudkan cita-cita tersebut.`}

ATURAN OUTPUT:
- Susun secara ringkas, padat, elegan, berbobot psikologis, dan profesional (sekitar 2-3 paragraf berkesinambungan atau poin bernomor yang rapi).
- Tidak bertele-tele karena akan dimuat di lembar rekomendasi psikogram 1 lembar A4.
- Kembalikan langsung teks narasi rekomendasi (tanpa format markdown rumit/tanda kutip berlebih).`;
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const prompt = buildAiPrompt();
      const aiConfig = getAISettings();
      const result = await callDirectAI({
        prompt: prompt + '\n\nKembalikan rekomendasi dalam bentuk teks narasi rekomendasi psikologis langsung yang rapi dan terstruktur.'
      });

      let textOutput = '';
      if (typeof result === 'string') {
        textOutput = result;
      } else if (result?.rekomendasi) {
        textOutput = result.rekomendasi;
      } else if (result?.text) {
        textOutput = result.text;
      } else if (result?.output) {
        textOutput = result.output;
      } else {
        textOutput = JSON.stringify(result, null, 2);
      }

      setState(prev => ({
        ...(prev || INITIAL_CFIT3_STATE),
        rekomendasi: textOutput.trim()
      }));
    } catch (err: any) {
      console.error('Error generating recommendation:', err);
      setAiError(err.message || 'Gagal menghasilkan rekomendasi via AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(buildAiPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (confirmReset) {
      setState(INITIAL_CFIT3_STATE);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-8 text-gray-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-100 text-indigo-700">CFIT SKALA 3</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">Form A (1 Lembar)</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Input Data & Skor CFIT Skala 3</h2>
          <p className="text-xs text-gray-500">Kalkulasi norma otomatis berdasarkan usia klien & rekomendasi AI terintegrasi RMIB</p>
        </div>
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
            confirmReset 
              ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700' 
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {confirmReset ? 'Yakin Reset Semua?' : 'Reset Form'}
        </button>
      </div>

      {/* SECTION 1: DATA KLIEN */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          1. Identitas Klien
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={clientData.nama}
              onChange={e => handleClientDataChange('nama', e.target.value)}
              placeholder="Contoh: Muhammad Raihan Pratama"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Jenis Kelamin</label>
            <select
              value={clientData.jenisKelamin}
              onChange={e => handleClientDataChange('jenisKelamin', e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Tanggal Lahir</label>
            <input
              type="date"
              value={clientData.tanggalLahir}
              onChange={e => handleClientDataChange('tanggalLahir', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Tanggal Tes</label>
            <input
              type="date"
              value={clientData.tanggalTes}
              onChange={e => handleClientDataChange('tanggalTes', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Jenjang Pendidikan</label>
            <select
              value={clientData.pendidikan}
              onChange={e => handleClientDataChange('pendidikan', e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="SMP">SMP (Usia 12-15 th)</option>
              <option value="SMA">SMA (Usia 15-18 th)</option>
              <option value="SMK">SMK (Usia 15-18 th)</option>
              <option value="Mahasiswa">Mahasiswa</option>
              <option value="Dewasa/Umum">Dewasa / Umum</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Asal Sekolah / Lembaga</label>
            <input
              type="text"
              value={clientData.asalSekolah}
              onChange={e => handleClientDataChange('asalSekolah', e.target.value)}
              placeholder="Contoh: SMP Negeri 1 Probolinggo"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-medium text-gray-700 mb-1">Nomor Laporan (Opsional)</label>
            <input
              type="text"
              value={clientData.nomorLaporan || ''}
              onChange={e => handleClientDataChange('nomorLaporan', e.target.value)}
              placeholder="Contoh: 042/PSI-APC/X/2026"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Info Usia Kronologis */}
        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Usia Terhitung: <strong>{ageDisplay || 'Isi tanggal lahir & tes'}</strong></span>
          </div>
          <span className="font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
            Norma Acuan: Usia {ageYears ? `${Math.min(17, Math.max(13, ageYears))} th` : '17+ th'}
          </span>
        </div>
      </div>

      {/* SECTION 2: INPUT SKOR CFIT SKALA 3 */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            2. Skoring CFIT Skala 3
          </h3>

          {/* Toggle Mode */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setInputMode('quick')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                inputMode === 'quick' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mode Cepat (Jumlah Benar)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('answers')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                inputMode === 'answers' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Koreksi Jawaban (Kunci Soal)
            </button>
          </div>
        </div>

        {inputMode === 'quick' ? (
          /* MODE CEPAT: INPUT JUMLAH BENAR PER SUBTES */
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                <span className="font-bold text-gray-800 block">Subtes 1 (Seri)</span>
                <span className="text-[11px] text-gray-500 block mb-1">Maks: 13 soal</span>
                <input
                  type="number"
                  min="0"
                  max="13"
                  value={cfitScores.sub1}
                  onChange={e => handleSubscoreChange('sub1', e.target.value)}
                  placeholder="0 - 13"
                  className="w-full text-center text-lg font-bold py-1.5 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                <span className="font-bold text-gray-800 block">Subtes 2 (Klasifikasi)</span>
                <span className="text-[11px] text-gray-500 block mb-1">Maks: 14 soal (2 pilihan)</span>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={cfitScores.sub2}
                  onChange={e => handleSubscoreChange('sub2', e.target.value)}
                  placeholder="0 - 14"
                  className="w-full text-center text-lg font-bold py-1.5 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                <span className="font-bold text-gray-800 block">Subtes 3 (Matriks)</span>
                <span className="text-[11px] text-gray-500 block mb-1">Maks: 13 soal</span>
                <input
                  type="number"
                  min="0"
                  max="13"
                  value={cfitScores.sub3}
                  onChange={e => handleSubscoreChange('sub3', e.target.value)}
                  placeholder="0 - 13"
                  className="w-full text-center text-lg font-bold py-1.5 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                <span className="font-bold text-gray-800 block">Subtes 4 (Kondisi)</span>
                <span className="text-[11px] text-gray-500 block mb-1">Maks: 10 soal</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={cfitScores.sub4}
                  onChange={e => handleSubscoreChange('sub4', e.target.value)}
                  placeholder="0 - 10"
                  className="w-full text-center text-lg font-bold py-1.5 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        ) : (
          /* MODE LEMBAR JAWABAN: INPUT PER BUTIR SOAL TERHADAP KUNCI JAWABAN */
          <div className="space-y-4">
            <div className="text-xs text-gray-600 bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                Kunci jawaban otomatis mencocokkan lembar tes: Tes 1 (13 soal), Tes 2 (14 soal, 2 pilihan huruf bebas urutan, contoh: BE/EB), Tes 3 (13 soal), Tes 4 (10 soal).
              </span>
            </div>

            {/* Subtes 1 */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-800">Tes 1: Seri (13 Butir)</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Benar: {cfitScores.sub1 || 0} / 13
                </span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5">
                {CFIT3_ANSWER_KEYS.sub1.map((key, i) => {
                  const val = (rawAnswers.sub1?.[i] || '').toUpperCase();
                  const isMatch = val === key;
                  return (
                    <div key={i} className="text-center">
                      <span className="text-[10px] text-gray-400 block font-mono">{i + 1} ({key})</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={e => handleSingleAnswerChange('sub1', i, e.target.value)}
                        className={`w-full text-center font-bold text-xs py-1 rounded border uppercase ${
                          !val ? 'bg-white border-gray-300' : isMatch ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtes 2 */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-800">Tes 2: Klasifikasi (14 Butir - 2 Huruf)</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Benar: {cfitScores.sub2 || 0} / 14
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {CFIT3_ANSWER_KEYS.sub2.map((key, i) => {
                  const val = (rawAnswers.sub2?.[i] || '').toUpperCase();
                  const isMatch = val.replace(/[^A-F]/g, '').split('').sort().join('') === key.split('').sort().join('');
                  return (
                    <div key={i} className="text-center">
                      <span className="text-[10px] text-gray-400 block font-mono">{i + 1} ({key})</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={val}
                        placeholder={key}
                        onChange={e => handleSingleAnswerChange('sub2', i, e.target.value)}
                        className={`w-full text-center font-bold text-xs py-1 rounded border uppercase ${
                          !val ? 'bg-white border-gray-300' : isMatch ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtes 3 */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-800">Tes 3: Matriks (13 Butir)</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Benar: {cfitScores.sub3 || 0} / 13
                </span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5">
                {CFIT3_ANSWER_KEYS.sub3.map((key, i) => {
                  const val = (rawAnswers.sub3?.[i] || '').toUpperCase();
                  const isMatch = val === key;
                  return (
                    <div key={i} className="text-center">
                      <span className="text-[10px] text-gray-400 block font-mono">{i + 1} ({key})</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={e => handleSingleAnswerChange('sub3', i, e.target.value)}
                        className={`w-full text-center font-bold text-xs py-1 rounded border uppercase ${
                          !val ? 'bg-white border-gray-300' : isMatch ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtes 4 */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-800">Tes 4: Kondisi (10 Butir)</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Benar: {cfitScores.sub4 || 0} / 10
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {CFIT3_ANSWER_KEYS.sub4.map((key, i) => {
                  const val = (rawAnswers.sub4?.[i] || '').toUpperCase();
                  const isMatch = val === key;
                  return (
                    <div key={i} className="text-center">
                      <span className="text-[10px] text-gray-400 block font-mono">{i + 1} ({key})</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={e => handleSingleAnswerChange('sub4', i, e.target.value)}
                        className={`w-full text-center font-bold text-xs py-1 rounded border uppercase ${
                          !val ? 'bg-white border-gray-300' : isMatch ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY TOTAL RAW SCORE & IQ */}
        <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <span className="text-xs font-semibold text-gray-600 block">Total Jawaban Benar (Raw Score)</span>
            <span className="text-2xl font-black text-indigo-900">
              {safeState.rawScoreTotal !== '' ? safeState.rawScoreTotal : 0} <span className="text-xs font-medium text-gray-500">/ 50</span>
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Skor IQ CFIT Skala 3</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={safeState.iqScore}
                onChange={e => handleManualIqChange(e.target.value)}
                placeholder="IQ"
                className="w-24 px-3 py-1 bg-white border border-indigo-300 rounded-lg font-black text-xl text-indigo-700 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-gray-500">(Otomatis/Bisa Diedit)</span>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs font-semibold text-gray-600 block">Taraf Kecerdasan</span>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm mt-0.5">
              {safeState.iqLabel || (safeState.iqScore !== '' ? getIqClassification(safeState.iqScore) : '-')}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: ASPEK CFIT SKALA 3 (Kecerdasan Umum & Bakat) */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            3. Aspek Hasil CFIT Skala 3 (Kapasitas Aspek)
          </h3>
          <span className="text-[11px] text-gray-500">Otomatis terisi dari skor subtes</span>
        </div>

        {/* Bagian A: Kecerdasan Umum */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
          <h4 className="text-xs font-bold text-indigo-900 uppercase">A. Aspek Kecerdasan Umum</h4>
          <div className="space-y-2 text-xs">
            {[
              { key: 'pemahaman', label: '1. Pemahaman', desc: 'Pemahaman pola & persyaratan (Subtes 4 & 1)' },
              { key: 'penalaran', label: '2. Penalaran', desc: 'Penalaran logis fluid menyeluruh (Total Skor)' },
              { key: 'dayaAnalisis', label: '3. Daya Analisis', desc: 'Mengurai detail & diferensiasi (Subtes 2 & 3)' },
              { key: 'dayaSintesis', label: '4. Daya Sintesis', desc: 'Menghubungkan bagian pola utuh (Subtes 3 & 1)' },
              { key: 'dayaIngat', label: '5. Daya Ingat', desc: 'Mempertahankan aturan & memori kerja (Subtes 1 & 4)' },
            ].map(item => {
              const currentVal = kecerdasanUmum[item.key as keyof typeof kecerdasanUmum];
              return (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-semibold text-gray-800">{item.label}</span>
                    <span className="text-[11px] text-gray-500 block">{item.desc}</span>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    {([1, 2, 3, 4, 5, 6, 7] as ScaleLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleAspectChange('kecerdasanUmum', item.key, lvl)}
                        className={`w-7 h-7 text-xs font-bold rounded transition-all ${
                          currentVal === lvl
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {getScaleLabel(lvl)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bagian B: Bakat Kemampuan */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
          <h4 className="text-xs font-bold text-indigo-900 uppercase">B. Aspek Bakat Kemampuan</h4>
          <div className="space-y-2 text-xs">
            {[
              { key: 'sistematikaBerpikir', label: '1. Sistematika Berpikir', desc: 'Berpikir urut & teratur (Subtes 1 - Seri)' },
              { key: 'logikaHubungan', label: '2. Logika Hubungan', desc: 'Korelasi objek abstrak & matriks (Subtes 3 - Matriks)' },
              { key: 'ketajamanDiferensiasi', label: '3. Ketajaman Diferensiasi', desc: 'Detail & diskriminasi pola (Subtes 2 - Klasifikasi)' },
            ].map(item => {
              const currentVal = bakatKemampuan[item.key as keyof typeof bakatKemampuan];
              return (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-semibold text-gray-800">{item.label}</span>
                    <span className="text-[11px] text-gray-500 block">{item.desc}</span>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    {([1, 2, 3, 4, 5, 6, 7] as ScaleLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleAspectChange('bakatKemampuan', item.key, lvl)}
                        className={`w-7 h-7 text-xs font-bold rounded transition-all ${
                          currentVal === lvl
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {getScaleLabel(lvl)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 4: RMIB (TOP 3 MINAT) & PEKERJAAN IMPIAN */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          4. Hasil Minat RMIB & Pekerjaan Impian Klien
        </h3>

        {/* Top 3 Minat RMIB */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-700 block">Top 3 Minat Anak (Berdasarkan Tes RMIB):</span>
          {[0, 1, 2].map(idx => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <select
                  value={rmibInterests[idx]?.name || ''}
                  onChange={e => handleInterestSelect(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md font-semibold text-gray-800 text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Kategori RMIB --</option>
                  {Object.keys(PREDEFINED_INTERESTS).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                value={rmibInterests[idx]?.description || ''}
                onChange={e => handleInterestDescChange(idx, e.target.value)}
                placeholder="Deskripsi minat..."
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] text-gray-600 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>

        {/* Top 3 Pekerjaan Impian */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-gray-700 block">Top 3 Cita-cita / Pekerjaan Impian Klien (Input Manual):</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                  Pekerjaan Impian #{idx + 1}
                </label>
                <input
                  type="text"
                  value={dreamJobs[idx] || ''}
                  onChange={e => handleDreamJobChange(idx, e.target.value)}
                  placeholder={`Contoh: ${idx === 0 ? 'Software Engineer' : idx === 1 ? 'Data Analyst' : 'Arsitek'}`}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-md font-medium text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: GENERATOR REKOMENDASI AI */}
      <div className="space-y-4 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 p-4 rounded-xl border border-indigo-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              5. Rekomendasi Tindak Lanjut (Bantuan AI)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSmp 
                ? 'Target Usia SMP: Rekomendasi SMA vs SMK, Jurusan pilihan, dan Mata Pelajaran yang harus diperkuat.' 
                : 'Target SMA ke atas: Rekomendasi Kuliah vs Kerja, Jurusan/Profesi, dan usaha konkret yang harus diperjuangkan.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 shadow-sm"
              title="Salin Prompt untuk ChatGPT/Claude"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Prompt'}
            </button>

            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isGenerating ? 'Menganalisis...' : 'Generate Rekomendasi AI'}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            <strong>Gagal Memanggil AI:</strong> {aiError}
            <div className="mt-1 text-[11px] text-rose-600">
              Anda tetap dapat menuliskan rekomendasi secara manual di bawah, atau cek menu "⚙️ Pengaturan AI" di navigasi atas.
            </div>
          </div>
        )}

        <div>
          <textarea
            rows={7}
            value={safeState.rekomendasi}
            onChange={e => setState(prev => ({ ...(prev || INITIAL_CFIT3_STATE), rekomendasi: e.target.value }))}
            placeholder={
              isSmp
                ? "Draf rekomendasi akan muncul di sini...\n\nContoh:\n1. Pilihan Sekolah Lanjutan: Direkomendasikan melanjutkan ke SMA / SMK...\n2. Jurusan Pilihan: Rekomendasi peminatan...\n3. Penguatan Belajar: Disarankan fokus memperkuat mata pelajaran Matematika & Fisika..."
                : "Draf rekomendasi akan muncul di sini...\n\nContoh:\n1. Jalur Studi & Karir: Direkomendasikan melanjutkan ke jenjang Perguruan Tinggi (S1) dengan pilihan Program Studi...\n2. Usaha & Persiapan Konkret: Mengembangkan kemampuan analitis data, portofolio proyek..."
            }
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 shadow-inner font-sans"
          />
          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
            <span>Rekomendasi ini dapat diedit bebas dan akan tampil di lembar laporan hasil pemeriksaan psikologis.</span>
            <span>{safeState.rekomendasi.length} karakter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
