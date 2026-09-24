import React, { useState, useRef } from 'react';
import { StaffAppState, ScaleLevel, INITIAL_STAFF_STATE } from '../types';
import {
  formatDateId,
  convertCategoryToStaffScale,
  convertStaffAspectWithScore,
  mapISTSubscoreToLevel,
  calculateISTBerpikirSistematis,
  calculateISTPemahamanKonsep,
  getStaffScaleCode,
  getStaffScaleFullLabel
} from '../utils/scoring';
import { getAIHeaders, getAISettings } from '../utils/aiSettings';
import { RefreshCw, FileText, Copy, Check, Upload, Loader2, Calculator, Info, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface FormInputStaffProps {
  state?: StaffAppState;
  setState: React.Dispatch<React.SetStateAction<StaffAppState>>;
}

export function FormInputStaff({ state, setState }: FormInputStaffProps) {
  const safeState = state || INITIAL_STAFF_STATE;
  const clientData = safeState.clientData || INITIAL_STAFF_STATE.clientData;
  const intelektual = safeState.intelektual || INITIAL_STAFF_STATE.intelektual;
  const sikapKerja = safeState.sikapKerja || INITIAL_STAFF_STATE.sikapKerja;
  const kepribadian = safeState.kepribadian || INITIAL_STAFF_STATE.kepribadian;
  const istSubscores = safeState.istSubscores || INITIAL_STAFF_STATE.istSubscores;
  const aspekScores = safeState.aspekScores || INITIAL_STAFF_STATE.aspekScores;
  const aspekKategori = safeState.aspekKategori || INITIAL_STAFF_STATE.aspekKategori;

  const [copied, setCopied] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isUploadingIST, setIsUploadingIST] = useState(false);
  const [isUploadingKraepelin, setIsUploadingKraepelin] = useState(false);
  const [isUploadingPapi, setIsUploadingPapi] = useState(false);
  const [hasUploadedPapi, setHasUploadedPapi] = useState(false);
  const [isUploadingMbti, setIsUploadingMbti] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAllISTSubtests, setShowAllISTSubtests] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'loading' | '';
    title: string;
    message: string;
  }>({ type: '', title: '', message: '' });

  const [dragActiveIST, setDragActiveIST] = useState(false);
  const [dragActiveKraepelin, setDragActiveKraepelin] = useState(false);
  const [dragActivePapi, setDragActivePapi] = useState(false);
  const [dragActiveMbti, setDragActiveMbti] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kraepelinFileInputRef = useRef<HTMLInputElement>(null);
  const papiFileInputRef = useRef<HTMLInputElement>(null);
  const mbtiFileInputRef = useRef<HTMLInputElement>(null);

  const compressImageIfNeeded = async (file: File): Promise<Blob> => {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 2048; // Crisp resolution for text/table OCR
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
        if (!ctx) return resolve(file);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  const readFileAsBase64 = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    // Vercel serverless function payload limit is 4.5MB. Base64 encoding adds ~33% overhead.
    // Raw binary files like PDF must be <= 3.0MB to avoid 413 or FUNCTION_INVOCATION_FAILED.
    if (file.size > 3.0 * 1024 * 1024 && !file.type.startsWith('image/')) {
      throw new Error(
        `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas aman upload Vercel (maksimal 3MB untuk file PDF). Harap kompres file PDF terlebih dahulu (misalnya via ilovepdf.com).`
      );
    }

    const processedBlob = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          let mimeType = processedBlob.type || file.type;
          if (!mimeType || mimeType === 'application/octet-stream') {
            const name = file.name.toLowerCase();
            if (name.endsWith('.pdf')) mimeType = 'application/pdf';
            else if (name.endsWith('.png')) mimeType = 'image/png';
            else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (name.endsWith('.webp')) mimeType = 'image/webp';
            else if (name.endsWith('.txt')) mimeType = 'text/plain';
            else mimeType = 'application/pdf';
          }
          resolve({ base64, mimeType });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(processedBlob);
    });
  };

  const handleApiResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type');
    let data: any = null;
    let rawText = '';
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      rawText = await response.text();
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'API Server tidak ditemukan di Vercel (Status 404). Pastikan file vercel.json dan folder api/ sudah terdeploy ke repositori GitHub.'
        );
      }
      if (response.status === 413) {
        throw new Error(
          'Ukuran file melebihi batas serverless Vercel (Maksimal 4.5MB). Harap kompres file PDF atau gambar sebelum diunggah.'
        );
      }
      if (response.status === 504) {
        throw new Error(
          'Server Vercel Timeout (Status 504). Proses ekstraksi AI melebihi batas waktu serverless.'
        );
      }
      const errText = data?.error || rawText || '';
      if (errText.includes('FUNCTION_INVOCATION_FAILED')) {
        throw new Error(
          'Vercel Serverless Function gagal dijalankan (FUNCTION_INVOCATION_FAILED). Pastikan kode perubahan terbaru sudah di-push ke GitHub dan file PDF berukuran di bawah 3MB.'
        );
      }
      if (errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
        throw new Error(
          'Kuota harian gratis AI telah habis (Error 429: Quota Exceeded). Silakan buka menu "⚙️ Pengaturan AI" di bagian atas untuk beralih ke OpenAI / OpenRouter atau memasukkan API Key pribadi Anda.'
        );
      }
      if (errText.includes('GEMINI_API_KEY')) {
        throw new Error(
          'GEMINI_API_KEY belum dikonfigurasi. Anda dapat mengisinya di menu "⚙️ Pengaturan AI" atau di Environment Variables Vercel.'
        );
      }
      throw new Error(errText || `Gagal memproses file (Status ${response.status})`);
    }

    return data;
  };

  const updateState = (section: keyof StaffAppState, field: string, value: any) => {
    if (section === 'clientData' || section === 'intelektual' || section === 'sikapKerja' || section === 'kepribadian' || section === 'istSubscores') {
      setState(prev => {
        const base = prev || INITIAL_STAFF_STATE;
        return {
          ...base,
          [section]: {
            ...((base[section] as Record<string, any>) || {}),
            [field]: value
          }
        };
      });
    } else {
      setState(prev => ({ ...(prev || INITIAL_STAFF_STATE), [section]: value }));
    }
  };

  const mapIQToLevel = (score: number): ScaleLevel => {
    if (score >= 130) return 7; // BS (Baik Sekali / Very Superior)
    if (score >= 120) return 6; // B (Baik / Superior)
    if (score >= 110) return 5; // RA (Rata-rata Atas)
    if (score >= 90) return 4;  // R (Rata-rata)
    if (score >= 80) return 3;  // RB (Rata-rata Bawah)
    if (score >= 70) return 2;  // K (Kurang / Borderline)
    return 1;                   // KS (Kurang Sekali / Deficient)
  };

  const mapISTToLabel = (iq: number): string => {
    if (iq >= 130) return 'Very Superior';
    if (iq >= 120) return 'Superior';
    if (iq >= 110) return 'Rata-rata Atas';
    if (iq >= 90) return 'Rata-rata';
    if (iq >= 80) return 'Rata-rata Bawah';
    if (iq >= 70) return 'Borderline';
    return 'Intellectual Deficient';
  };

  const handleUpdateAspectScoreOrCategory = (
    field: 'pemahamanVerbal' | 'analisaSintesa' | 'kemampuanNumerik',
    newScore: number | '',
    newCat: string
  ) => {
    const level = convertStaffAspectWithScore(newCat, newScore);
    setState(prev => ({
      ...prev,
      aspekScores: {
        ...prev.aspekScores,
        [field]: newScore,
      },
      aspekKategori: {
        ...prev.aspekKategori,
        [field]: newCat,
      },
      intelektual: {
        ...prev.intelektual,
        [field]: level,
      }
    }));
  };

  const handleUploadIST = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIST(true);
    const aiConfig = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Dokumen Tes IST...',
      message: `Sedang memproses "${file.name}" via ${aiConfig.provider.toUpperCase()} (${aiConfig.model || 'AI'}). Mohon tunggu beberapa detik...`
    });

    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      
      const response = await fetch('/api/extract-ist', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAIHeaders()
        },
        body: JSON.stringify({
          mimeType,
          data: base64,
          filename: file.name
        })
      });
      
      const data = (await handleApiResponse(response)) || {};
      
      const {
        clientData: extractedClientData,
        iqScore,
        iqLabel,
        skorLangsung,
        tarafLangsung,
        istSubscores,
        tarafBerpikirSistematis,
        tarafPemahamanKonsep,
        tarafAnalisaSintesa
      } = data;

      setState(prev => {
        const base = prev || INITIAL_STAFF_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_STATE.clientData;

        // 1. Aspek Pemahaman Verbal, Analisa-Sintesa, Kemampuan Numerik (Skor Maksimal 20 & Kategori PDF)
        const verbalScore = (skorLangsung?.pemahamanVerbal !== null && skorLangsung?.pemahamanVerbal !== undefined && skorLangsung?.pemahamanVerbal !== '')
          ? Number(skorLangsung.pemahamanVerbal)
          : (istSubscores?.WA && istSubscores?.GE ? Math.round((Number(istSubscores.WA) + Number(istSubscores.GE)) / 2) : (base.aspekScores?.pemahamanVerbal ?? ''));

        const se = Number(istSubscores?.SE) || 0;
        const wa = Number(istSubscores?.WA) || 0;
        const fa = Number(istSubscores?.FA) || 0;
        const wu = Number(istSubscores?.WU) || 0;
        const analisaScore = (skorLangsung?.analisaSintesa !== null && skorLangsung?.analisaSintesa !== undefined && skorLangsung?.analisaSintesa !== '')
          ? Number(skorLangsung.analisaSintesa)
          : ((se || wa || fa || wu) ? Math.round((se + wa + fa + wu) / 4) : (base.aspekScores?.analisaSintesa ?? ''));

        const numerikScore = (skorLangsung?.kemampuanNumerik !== null && skorLangsung?.kemampuanNumerik !== undefined && skorLangsung?.kemampuanNumerik !== '')
          ? Number(skorLangsung.kemampuanNumerik)
          : (istSubscores?.RA && istSubscores?.ZR ? Math.round((Number(istSubscores.RA) + Number(istSubscores.ZR)) / 2) : (base.aspekScores?.kemampuanNumerik ?? ''));

        const verbalCat = (tarafLangsung?.pemahamanVerbal ?? base.aspekKategori?.pemahamanVerbal ?? '').trim();
        const analisaCat = (tarafLangsung?.analisaSintesa ?? tarafAnalisaSintesa ?? base.aspekKategori?.analisaSintesa ?? '').trim();
        const numerikCat = (tarafLangsung?.kemampuanNumerik ?? base.aspekKategori?.kemampuanNumerik ?? '').trim();

        const finalVerbal = convertStaffAspectWithScore(verbalCat, verbalScore);
        const finalAnalisaSintesa = convertStaffAspectWithScore(analisaCat, analisaScore);
        const finalNumerik = convertStaffAspectWithScore(numerikCat, numerikScore);

        // 2. Berpikir Sistematis (ZR)
        let finalBerpikirSistematis: ScaleLevel = base.intelektual.berpikirSistematis;
        if (istSubscores?.ZR !== null && istSubscores?.ZR !== undefined && istSubscores?.ZR !== '') {
          finalBerpikirSistematis = calculateISTBerpikirSistematis(istSubscores.ZR);
        } else if (tarafBerpikirSistematis) {
          finalBerpikirSistematis = convertStaffAspectWithScore(tarafBerpikirSistematis, istSubscores?.ZR);
        }

        // 3. Pemahaman Konsep (AN + ZR) / 2
        let finalPemahamanKonsep: ScaleLevel = base.intelektual.pemahamanKonsep;
        if (
          (istSubscores?.AN !== null && istSubscores?.AN !== undefined && istSubscores?.AN !== '') ||
          (istSubscores?.ZR !== null && istSubscores?.ZR !== undefined && istSubscores?.ZR !== '')
        ) {
          finalPemahamanKonsep = calculateISTPemahamanKonsep(istSubscores?.AN, istSubscores?.ZR);
        } else if (tarafPemahamanKonsep) {
          finalPemahamanKonsep = convertStaffAspectWithScore(tarafPemahamanKonsep, '');
        }

        const parsedIq = iqScore ? Number(iqScore) : base.iqScore;

        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData?.nama || baseClient.nama,
            tempatTglLahir: extractedClientData?.tempatTglLahir || baseClient.tempatTglLahir,
            jenisKelamin: extractedClientData?.jenisKelamin || baseClient.jenisKelamin,
            nomor: extractedClientData?.nomor || baseClient.nomor,
            tanggalTes: extractedClientData?.tanggalTes || baseClient.tanggalTes,
            pendidikan: extractedClientData?.pendidikan || baseClient.pendidikan,
            tujuanPemeriksaan: extractedClientData?.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
          },
          iqScore: parsedIq,
          iqLabel: iqLabel || (parsedIq ? mapISTToLabel(Number(parsedIq)) : base.iqLabel),
          istSubscores: {
            SE: istSubscores?.SE ?? base.istSubscores?.SE ?? '',
            WA: istSubscores?.WA ?? base.istSubscores?.WA ?? '',
            AN: istSubscores?.AN ?? base.istSubscores?.AN ?? '',
            GE: istSubscores?.GE ?? base.istSubscores?.GE ?? '',
            ME: istSubscores?.ME ?? base.istSubscores?.ME ?? '',
            RA: istSubscores?.RA ?? base.istSubscores?.RA ?? '',
            ZR: istSubscores?.ZR ?? base.istSubscores?.ZR ?? '',
            FA: istSubscores?.FA ?? base.istSubscores?.FA ?? '',
            WU: istSubscores?.WU ?? base.istSubscores?.WU ?? '',
          },
          aspekScores: {
            pemahamanVerbal: verbalScore,
            analisaSintesa: analisaScore,
            kemampuanNumerik: numerikScore,
          },
          aspekKategori: {
            pemahamanVerbal: verbalCat,
            analisaSintesa: analisaCat,
            kemampuanNumerik: numerikCat,
          },
          intelektual: {
            ...base.intelektual,
            potensiKecerdasan: parsedIq ? mapIQToLevel(Number(parsedIq)) : base.intelektual.potensiKecerdasan,
            berpikirSistematis: finalBerpikirSistematis,
            pemahamanVerbal: finalVerbal,
            analisaSintesa: finalAnalisaSintesa,
            pemahamanKonsep: finalPemahamanKonsep,
            kemampuanNumerik: finalNumerik,
          }
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi Berhasil!',
        message: `Data tes IST dan profil klien dari "${file.name}" berhasil diekstrak dan diisikan ke form.`
      });
    } catch (err: any) {
      console.error('IST Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Tes IST',
        message: err?.message || 'Terjadi kesalahan saat mengekstrak data tes IST. Pastikan file berupa PDF atau gambar yang jelas.'
      });
    } finally {
      setIsUploadingIST(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadKraepelin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingKraepelin(true);
    const aiConfigKraepelin = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data Tes Kraepelin...',
      message: `Sedang memproses "${file.name}" via ${aiConfigKraepelin.provider.toUpperCase()} (${aiConfigKraepelin.model || 'AI'}). Mohon tunggu beberapa detik...`
    });

    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      
      const response = await fetch('/api/extract-kraepelin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAIHeaders()
        },
        body: JSON.stringify({
          mimeType,
          data: base64,
          filename: file.name
        })
      });
      
      const data = (await handleApiResponse(response)) || {};
      const { clientData: extractedClientData, sikapKerja } = data;

      setState(prev => {
        const base = prev || INITIAL_STAFF_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_STATE.clientData;
        const baseSikapKerja = base.sikapKerja || INITIAL_STAFF_STATE.sikapKerja;
        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData?.nama || baseClient.nama,
            tempatTglLahir: extractedClientData?.tempatTglLahir || baseClient.tempatTglLahir,
            pendidikan: extractedClientData?.pendidikan || baseClient.pendidikan,
            alamat: extractedClientData?.alamat || baseClient.alamat,
            tujuanPemeriksaan: extractedClientData?.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
          },
          sikapKerja: {
            ...baseSikapKerja,
            kecepatan: sikapKerja?.kecepatan || baseSikapKerja.kecepatan,
            ketelitian: sikapKerja?.ketelitian || baseSikapKerja.ketelitian,
            ketekunan: sikapKerja?.ketekunan || baseSikapKerja.ketekunan,
            dayaTahanStres: sikapKerja?.dayaTahanStres || baseSikapKerja.dayaTahanStres,
          }
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi Kraepelin Berhasil!',
        message: `Data Sikap Kerja dari "${file.name}" berhasil diekstrak dan diisikan ke form.`
      });
    } catch (err: any) {
      console.error('Kraepelin Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Kraepelin',
        message: err?.message || 'Terjadi kesalahan saat memproses file Kraepelin.'
      });
    } finally {
      setIsUploadingKraepelin(false);
      if (kraepelinFileInputRef.current) kraepelinFileInputRef.current.value = '';
    }
  };

  const handleUploadPapi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPapi(true);
    const aiConfigPapi = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data PAPI Kostick...',
      message: `Sedang memproses "${file.name}" via ${aiConfigPapi.provider.toUpperCase()} (${aiConfigPapi.model || 'AI'}). Mohon tunggu beberapa detik...`
    });

    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      
      const response = await fetch('/api/extract-papikostik', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAIHeaders()
        },
        body: JSON.stringify({
          mimeType,
          data: base64,
          filename: file.name
        })
      });
      
      const data = (await handleApiResponse(response)) || {};
      const { clientData: extractedClientData, kepribadian } = data;

      setState(prev => {
        const base = prev || INITIAL_STAFF_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_STATE.clientData;
        const baseKepribadian = base.kepribadian || INITIAL_STAFF_STATE.kepribadian;
        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData?.nama || baseClient.nama,
            tempatTglLahir: extractedClientData?.tempatTglLahir || baseClient.tempatTglLahir,
            pendidikan: extractedClientData?.pendidikan || baseClient.pendidikan,
            tujuanPemeriksaan: extractedClientData?.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
          },
          kepribadian: {
            ...baseKepribadian,
            kematanganEmosi: kepribadian?.kematanganEmosi || baseKepribadian.kematanganEmosi,
            kemasakanSosial: kepribadian?.kemasakanSosial || baseKepribadian.kemasakanSosial,
            rasaPercayaDiri: kepribadian?.rasaPercayaDiri || baseKepribadian.rasaPercayaDiri,
            motivasiBerprestasi: kepribadian?.motivasiBerprestasi || baseKepribadian.motivasiBerprestasi,
            sikapMandiri: kepribadian?.sikapMandiri || baseKepribadian.sikapMandiri,
            inisiatif: kepribadian?.inisiatif || baseKepribadian.inisiatif,
            kemampuanBekerjasama: kepribadian?.kemampuanBekerjasama || baseKepribadian.kemampuanBekerjasama,
            keterampilanBerkomunikasi: kepribadian?.keterampilanBerkomunikasi || baseKepribadian.keterampilanBerkomunikasi,
            loyalitas: kepribadian?.loyalitas || baseKepribadian.loyalitas,
          }
        };
      });
      
      setHasUploadedPapi(true);
      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi PAPI Kostick Berhasil!',
        message: `Data Kepribadian dari "${file.name}" berhasil dihitung dan diisikan ke form.`
      });
    } catch (err: any) {
      console.error('PAPI Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data PAPI Kostick',
        message: err?.message || 'Terjadi kesalahan saat memproses file PAPI Kostick.'
      });
    } finally {
      setIsUploadingPapi(false);
      if (papiFileInputRef.current) papiFileInputRef.current.value = '';
    }
  };

  const handleUploadMbti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMbti(true);
    const aiConfigMbti = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data MBTI...',
      message: `Sedang memproses "${file.name}" via ${aiConfigMbti.provider.toUpperCase()} (${aiConfigMbti.model || 'AI'}). Mohon tunggu beberapa detik...`
    });

    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      
      const response = await fetch('/api/extract-mbti', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAIHeaders()
        },
        body: JSON.stringify({
          mimeType,
          data: base64,
          filename: file.name,
          currentKepribadian: state?.kepribadian
        })
      });
      
      const data = (await handleApiResponse(response)) || {};
      const { clientData: extractedClientData, kepribadian } = data;

      setState(prev => {
        const base = prev || INITIAL_STAFF_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_STATE.clientData;
        const baseKepribadian = base.kepribadian || INITIAL_STAFF_STATE.kepribadian;
        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData?.nama || baseClient.nama,
            tempatTglLahir: extractedClientData?.tempatTglLahir || baseClient.tempatTglLahir,
            pendidikan: extractedClientData?.pendidikan || baseClient.pendidikan,
            tujuanPemeriksaan: extractedClientData?.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
          },
          kepribadian: {
            ...baseKepribadian,
            kematanganEmosi: kepribadian?.kematanganEmosi || baseKepribadian.kematanganEmosi,
            kemasakanSosial: kepribadian?.kemasakanSosial || baseKepribadian.kemasakanSosial,
            rasaPercayaDiri: kepribadian?.rasaPercayaDiri || baseKepribadian.rasaPercayaDiri,
            motivasiBerprestasi: kepribadian?.motivasiBerprestasi || baseKepribadian.motivasiBerprestasi,
            sikapMandiri: kepribadian?.sikapMandiri || baseKepribadian.sikapMandiri,
            inisiatif: kepribadian?.inisiatif || baseKepribadian.inisiatif,
            kemampuanBekerjasama: kepribadian?.kemampuanBekerjasama || baseKepribadian.kemampuanBekerjasama,
            keterampilanBerkomunikasi: kepribadian?.keterampilanBerkomunikasi || baseKepribadian.keterampilanBerkomunikasi,
            loyalitas: kepribadian?.loyalitas || baseKepribadian.loyalitas,
          }
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Penyesuaian MBTI Berhasil!',
        message: `Aspek kepribadian dari "${file.name}" berhasil dianalisis dan disesuaikan.`
      });
    } catch (err: any) {
      console.error('MBTI Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data MBTI',
        message: err?.message || 'Terjadi kesalahan saat memproses file MBTI.'
      });
    } finally {
      setIsUploadingMbti(false);
      if (mbtiFileInputRef.current) mbtiFileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    if (confirmReset) {
      setState(INITIAL_STAFF_STATE);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const getStaffScaleLabel = (level: number) => {
    const labels = ['KS', 'K', 'RB', 'R', 'RA', 'B', 'BS'];
    return labels[level - 1] || '';
  };

  const generatePrompt = () => {
    const data = `--- DATA KLIEN ---
Nama: ${clientData.nama || '[Kosong]'}
Tujuan Pemeriksaan: ${clientData.tujuanPemeriksaan || '[Kosong]'}
IQ: ${safeState.iqScore || '[Kosong]'} (${safeState.iqLabel || '[Kosong]'})

--- ASPEK INTELEKTUAL ---
Potensi Kecerdasan: ${getStaffScaleLabel(intelektual.potensiKecerdasan)}
Berpikir Sistematis: ${getStaffScaleLabel(intelektual.berpikirSistematis)}
Pemahaman Verbal: ${getStaffScaleLabel(intelektual.pemahamanVerbal)}
Analisa-Sintesa: ${getStaffScaleLabel(intelektual.analisaSintesa)}
Pemahaman Konsep: ${getStaffScaleLabel(intelektual.pemahamanKonsep)}
Kemampuan Numerik: ${getStaffScaleLabel(intelektual.kemampuanNumerik)}

--- SIKAP KERJA ---
Kecepatan: ${getStaffScaleLabel(sikapKerja.kecepatan)}
Ketelitian: ${getStaffScaleLabel(sikapKerja.ketelitian)}
Ketekunan atau Keuletan: ${getStaffScaleLabel(sikapKerja.ketekunan)}
Daya Tahan terhadap Stres: ${getStaffScaleLabel(sikapKerja.dayaTahanStres)}

--- KEPRIBADIAN ---
Kematangan Emosi: ${getStaffScaleLabel(kepribadian.kematanganEmosi)}
Kemasakan Sosial: ${getStaffScaleLabel(kepribadian.kemasakanSosial)}
Rasa Percaya Diri: ${getStaffScaleLabel(kepribadian.rasaPercayaDiri)}
Motivasi Berprestasi: ${getStaffScaleLabel(kepribadian.motivasiBerprestasi)}
Sikap Mandiri: ${getStaffScaleLabel(kepribadian.sikapMandiri)}
Inisiatif: ${getStaffScaleLabel(kepribadian.inisiatif)}
Kemampuan Bekerjasama: ${getStaffScaleLabel(kepribadian.kemampuanBekerjasama)}
Keterampilan Berkomunikasi: ${getStaffScaleLabel(kepribadian.keterampilanBerkomunikasi)}
Loyalitas: ${getStaffScaleLabel(kepribadian.loyalitas)}`;

    return `Tolong buatkan narasi untuk "Dinamika Psikologis" berdasarkan data tes psikologi berikut:

${data}

ATURAN DAN FORMAT PENULISAN (SANGAT PENTING KUNCI PAKEM INI):
1. Hasil narasi HARUS terdiri dari TEPAT 5 paragraf.
2. Gaya bahasa formal, profesional, dan mengalir seperti laporan psikologi.
3. Selalu sebutkan "Saudara/Saudari [Nama Depan/Panggilan]". Tentukan Saudara/Saudari dari jenis kelamin jika ada (atau tebak dari nama). Sertakan juga inisial dalam kurung di paragraf pertama.
4. JANGAN tambahkan poin-poin (bullet points), list, atau sub-judul. Hanya teks narasi paragraf biasa.
5. HINDARI PENGGUNAAN KATA "secara umum", "di atas rata-rata", dan "di bawah rata-rata". Jika mendeskripsikan taraf rata-rata, gunakan HANYA istilah "rata-rata atas" atau "rata-rata bawah" (TIDAK BOLEH pakai kata 'di atas' / 'di bawah').
6. HINDARI penyebutan label taraf secara eksplisit berulang-ulang (misal: "kemampuan verbalnya berada pada taraf Baik"). Fokuslah HANYA pada IMPLIKASI dan gambaran nyata dari kemampuan tersebut di dunia kerja (contoh: "ia mampu mengomunikasikan gagasan dengan sangat jelas dan persuasif"). Label taraf sudah ada di psikogram, jadi narasikan maknanya secara aplikatif.

STRUKTUR PARAGRAF:

Paragraf 1 (Intelektual): 
- Wajib membahas: Potensi Kecerdasan (IQ), Pemahaman Verbal, Berpikir Sistematis, Kemampuan Numerik, Pemahaman Konsep, dan Analisa-Sintesa.
- Format kalimat pembuka: "Saudara/Saudari [Nama Panggilan] ([Inisial]) memiliki kapasitas intelektual yang berada pada kategori [Kategori IQ/Potensi Kecerdasan]."

Paragraf 2 (Sikap Kerja):
- Wajib membahas: Daya Tahan terhadap Stres, Ketekunan atau Keuletan, Kecepatan, dan Ketelitian.
- Format kalimat pembuka: "Sikap kerja yang dimiliki saudara/saudari [Nama Panggilan]..."

Paragraf 3 (Kepribadian - Sosial & Emosi):
- Wajib membahas: Kemampuan Bekerjasama, Kematangan Emosi (regulasi emosi), Keterampilan Berkomunikasi, Kemasakan Sosial, dan Rasa Percaya Diri.
- Format kalimat pembuka: "Sebagai pribadi, saudara/saudari [Nama Panggilan]..."

Paragraf 4 (Kepribadian - Motivasi & Gaya Kerja):
- Wajib membahas: Motivasi Berprestasi, serta deskripsi gaya/pola kerjanya berdasarkan keseluruhan data.
- Format kalimat pembuka: "Sebagai pekerja, saudara/saudari [Nama Panggilan] merupakan pribadi yang..."

Paragraf 5 (Kepribadian - Ketaatan & Kemandirian):
- Wajib membahas: Sikap Mandiri, Inisiatif, dan Loyalitas (dukungan terhadap atasan/kebijakan).
- Format kalimat pembuka: "Sebagai penerima perintah, saudara/saudari [Nama Panggilan] merupakan pribadi yang..."
`;
  };

  const handleCopyPrompt = () => {
    const prompt = generatePrompt();
    navigator.clipboard.writeText(prompt);
    setGeneratedPrompt(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderRadioGroup = (
    section: keyof StaffAppState,
    field: string,
    label: string,
    badge?: { text: string; variant?: 'blue' | 'purple' | 'amber' | 'emerald' },
    helper?: string
  ) => {
    const currentValue = (state[section] as Record<string, any>)[field];
    return (
      <div className="flex flex-col mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 transition-all hover:border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-sm font-semibold text-gray-800">{label}</label>
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center ${
              badge.variant === 'purple' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : badge.variant === 'amber'
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : badge.variant === 'emerald'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              {badge.text}
            </span>
          )}
        </div>
        {helper && <p className="text-xs text-gray-500 mb-2.5 leading-relaxed">{helper}</p>}
        <div className="flex justify-between items-center w-full max-w-2xl gap-2">
          {[
            { value: 1, label: 'Kurang Sekali (KS)', short: 'KS', color: 'bg-red-100 text-red-700 border-red-200 peer-checked:bg-red-600 peer-checked:text-white' },
            { value: 2, label: 'Kurang (K)', short: 'K', color: 'bg-orange-100 text-orange-700 border-orange-200 peer-checked:bg-orange-600 peer-checked:text-white' },
            { value: 3, label: 'Rata-rata Bawah (RB)', short: 'RB', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 peer-checked:bg-yellow-500 peer-checked:text-white' },
            { value: 4, label: 'Rata-rata (R)', short: 'R', color: 'bg-green-100 text-green-700 border-green-200 peer-checked:bg-green-600 peer-checked:text-white' },
            { value: 5, label: 'Rata-rata Atas (RA)', short: 'RA', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 peer-checked:bg-emerald-600 peer-checked:text-white' },
            { value: 6, label: 'Baik (B)', short: 'B', color: 'bg-teal-100 text-teal-700 border-teal-200 peer-checked:bg-teal-600 peer-checked:text-white' },
            { value: 7, label: 'Baik Sekali (BS)', short: 'BS', color: 'bg-blue-100 text-blue-700 border-blue-200 peer-checked:bg-blue-600 peer-checked:text-white' },
          ].map(({ value, short, color }) => (
            <div key={value} className="relative flex-1 text-center group">
              <input
                type="radio"
                name={`${section}-${field}`}
                value={value}
                checked={currentValue === value}
                onChange={(e) => updateState(section, field, Number(e.target.value))}
                className="peer sr-only"
                id={`${section}-${field}-${value}`}
              />
              <label
                htmlFor={`${section}-${field}-${value}`}
                className={`flex flex-col items-center justify-center w-full py-2 border rounded-md cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md ${color} ${currentValue === value ? 'ring-2 ring-offset-1 ring-indigo-500 shadow-sm transform scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
                title={short}
              >
                <span className="text-xs font-bold">{short}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Form Psikogram Staff</h2>
          <p className="text-xs text-gray-500 mt-1">Isi data untuk menghasilkan dokumen PDF</p>
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
        
        {/* Notifikasi Status Unggah & Ekstraksi */}
        {uploadStatus.type && (
          <div
            className={`p-4 rounded-xl flex items-start justify-between gap-3 text-sm transition-all shadow-sm ${
              uploadStatus.type === 'loading'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                : uploadStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {uploadStatus.type === 'loading' ? (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
              ) : uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold">{uploadStatus.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{uploadStatus.message}</p>
              </div>
            </div>
            {uploadStatus.type !== 'loading' && (
              <button
                type="button"
                onClick={() => setUploadStatus({ type: '', title: '', message: '' })}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Card 1: Identitas Klien */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">1. Identitas Klien & Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={clientData.nama}
                onChange={(e) => updateState('clientData', 'nama', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempat/Tgl Lahir</label>
              <input
                type="text"
                value={clientData.tempatTglLahir}
                onChange={(e) => updateState('clientData', 'tempatTglLahir', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Gresik, 3 November 1999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pendidikan</label>
              <input
                type="text"
                value={clientData.pendidikan}
                onChange={(e) => updateState('clientData', 'pendidikan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <input
                type="text"
                value={clientData.alamat}
                onChange={(e) => updateState('clientData', 'alamat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor</label>
              <input
                type="text"
                value={clientData.nomor}
                onChange={(e) => updateState('clientData', 'nomor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="PSI-DIAN-607-135"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select
                value={clientData.jenisKelamin}
                onChange={(e) => updateState('clientData', 'jenisKelamin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Pilih...</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan Pemeriksaan</label>
              <input
                type="text"
                value={clientData.tujuanPemeriksaan}
                onChange={(e) => updateState('clientData', 'tujuanPemeriksaan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Seleksi Karyawan Posisi..."
              />
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

        {/* Card 1.5: IQ Score & Guide Interpreter IST */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-2 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-800">2. Potensi Kecerdasan & Tes IST</h3>
              <p className="text-xs text-gray-500 mt-0.5">Upload hasil tes IST atau input skor Standard Wert (SW) subtes IST untuk ekstraksi otomatis</p>
            </div>
            <div 
              className={`relative p-1 rounded-xl transition-all ${dragActiveIST ? 'bg-indigo-100 border-2 border-indigo-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveIST(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveIST(false); }}
              onDrop={(e) => { e.preventDefault(); setDragActiveIST(false); if (e.dataTransfer.files?.[0]) handleUploadIST({ target: { files: e.dataTransfer.files } } as any); }}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleUploadIST}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingIST}
                className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-70 shadow-sm"
              >
                {isUploadingIST ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Data Tes IST (PDF/Gambar)
              </button>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 mb-5 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-blue-950">Aturan Pengisian & Ekstraksi Seleksi Staf (Tes IST):</p>
              <p>• <span className="font-semibold">Pemahaman Verbal, Analisa-Sintesa, & Kemampuan Numerik:</span> Langsung diambil dari kategori PDF tanpa dihitung, otomatis dikonversi dari <span className="font-semibold">SR, R, S, T, ST</span> ke <span className="font-semibold">KS, K, RB, R, RA, B, BS</span>.</p>
              <p>• <span className="font-semibold">Berpikir Sistematis & Pemahaman Konsep:</span> Dihitung otomatis sesuai norma <span className="font-semibold">Guide Interpreter IST</span> (Berpikir Sistematis dari subtes <span className="font-semibold">ZR</span>, dan Pemahaman Konsep / Daya Paham dari rumus <span className="font-semibold">(AN + ZR) / 2</span>).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skor IQ (IST)</label>
              <input
                type="number"
                value={state.iqScore}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  updateState('iqScore', '', val);
                  if (typeof val === 'number') {
                    updateState('iqLabel', '', mapISTToLabel(val));
                    updateState('intelektual', 'potensiKecerdasan', mapIQToLevel(val));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Misal: 104"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori IQ</label>
              <input
                type="text"
                value={state.iqLabel}
                onChange={(e) => updateState('iqLabel', '', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Misal: Rata-rata"
              />
            </div>
          </div>

          {/* Section: Perhitungan Guide Interpreter IST */}
          <div className="border border-purple-100 bg-purple-50/40 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-purple-100 text-purple-900">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold">Perhitungan Berpikir Sistematis & Pemahaman Konsep (Guide Interpreter IST)</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAllISTSubtests(!showAllISTSubtests)}
                className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 cursor-pointer"
              >
                {showAllISTSubtests ? 'Sembunyikan Subtes Lain' : 'Tampilkan Semua 9 Subtes IST'}
                {showAllISTSubtests ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IST Subtes ZR -> Berpikir Sistematis */}
              <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Subtes ZR (Zahlenreihen / Deret Angka)</label>
                  <span className="text-[10px] text-gray-500 font-medium">Skor Standar (SW)</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">Menghitung aspek: <span className="font-semibold text-purple-800">Berpikir Sistematis</span></p>
                
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.istSubscores?.ZR ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('istSubscores', 'ZR', val);
                      if (val !== '') {
                        updateState('intelektual', 'berpikirSistematis', calculateISTBerpikirSistematis(val));
                        updateState('intelektual', 'pemahamanKonsep', calculateISTPemahamanKonsep(state.istSubscores?.AN, val));
                      }
                    }}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-bold text-center outline-none"
                    placeholder="SW (0-20)"
                  />
                  <div className="flex-1 text-xs">
                    <span className="text-gray-500 block text-[10px]">Taraf Hasil Perhitungan:</span>
                    <span className="inline-flex items-center font-bold px-2 py-0.5 mt-0.5 rounded text-xs bg-purple-100 text-purple-800 border border-purple-200">
                      {getStaffScaleCode(state.intelektual.berpikirSistematis)} ({getStaffScaleFullLabel(state.intelektual.berpikirSistematis)})
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 leading-tight">
                  Norma SW: ≤3 (KS) | 4-5 (K) | 6-7 (RB) | 8-11 (R) | 12-13 (RA) | 14-15 (B) | ≥16 (BS)
                </div>
              </div>

              {/* IST Subtes AN + ZR -> Pemahaman Konsep */}
              <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Subtes AN (Analogien / Analogi Hubungan)</label>
                  <span className="text-[10px] text-gray-500 font-medium">Skor Standar (SW)</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">
                  Daya Paham <span className="font-semibold text-purple-800">(AN + ZR) / 2</span>: <span className="font-semibold text-purple-800">Pemahaman Konsep</span>
                </p>
                
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.istSubscores?.AN ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('istSubscores', 'AN', val);
                      if (val !== '') {
                        updateState('intelektual', 'pemahamanKonsep', calculateISTPemahamanKonsep(val, state.istSubscores?.ZR));
                      }
                    }}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-bold text-center outline-none"
                    placeholder="SW (0-20)"
                  />
                  <div className="flex-1 text-xs">
                    <span className="text-gray-500 block text-[10px]">Taraf Hasil Perhitungan:</span>
                    <span className="inline-flex items-center font-bold px-2 py-0.5 mt-0.5 rounded text-xs bg-purple-100 text-purple-800 border border-purple-200">
                      {getStaffScaleCode(state.intelektual.pemahamanKonsep)} ({getStaffScaleFullLabel(state.intelektual.pemahamanKonsep)})
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 leading-tight">
                  Rumus Guide Interpreter: Rata-rata (AN + ZR) dipetakan ke skala 1-7.
                </div>
              </div>
            </div>

            {/* Skor (Maksimal 20) & Kategori PDF: Verbal, Analisa-Sintesa, Numerik */}
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Skor Aspek (Maksimal 20) & Kategori PDF
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Mempertimbangkan kombinasi skor (0-20) dan kategori (SR, R, S, T, ST):
                  </p>
                </div>
                <div className="text-[10px] px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-md font-medium">
                  💡 Aturan: R dengan skor ≥6 ➔ <strong>RB</strong> | Skor ≤5 ➔ <strong>K</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Aspek Pemahaman Verbal */}
                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-800">Pemahaman Verbal</label>
                      <span className="text-[10px] text-gray-500">Subtes WA + GE</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Input skor (0-20) & kategori PDF:</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Skor (0-20)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={state.aspekScores?.pemahamanVerbal ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            handleUpdateAspectScoreOrCategory('pemahamanVerbal', val, state.aspekKategori?.pemahamanVerbal || '');
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0-20"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Kategori PDF</span>
                        <input
                          type="text"
                          value={state.aspekKategori?.pemahamanVerbal || ''}
                          onChange={(e) => {
                            handleUpdateAspectScoreOrCategory('pemahamanVerbal', state.aspekScores?.pemahamanVerbal ?? '', e.target.value);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center uppercase outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="R / S / T"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-gray-500 font-medium">Taraf Hasil:</span>
                      <span className="inline-flex items-center font-bold px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
                        {getStaffScaleCode(state.intelektual.pemahamanVerbal)} ({getStaffScaleFullLabel(state.intelektual.pemahamanVerbal)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aspek Analisa-Sintesa */}
                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-800">Analisa-Sintesa</label>
                      <span className="text-[10px] text-gray-500">Logika & Sintesa</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Input skor (0-20) & kategori PDF:</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Skor (0-20)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={state.aspekScores?.analisaSintesa ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            handleUpdateAspectScoreOrCategory('analisaSintesa', val, state.aspekKategori?.analisaSintesa || '');
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0-20"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Kategori PDF</span>
                        <input
                          type="text"
                          value={state.aspekKategori?.analisaSintesa || ''}
                          onChange={(e) => {
                            handleUpdateAspectScoreOrCategory('analisaSintesa', state.aspekScores?.analisaSintesa ?? '', e.target.value);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center uppercase outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="R / S / T"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-gray-500 font-medium">Taraf Hasil:</span>
                      <span className="inline-flex items-center font-bold px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
                        {getStaffScaleCode(state.intelektual.analisaSintesa)} ({getStaffScaleFullLabel(state.intelektual.analisaSintesa)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aspek Kemampuan Numerik */}
                <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-800">Kemampuan Numerik</label>
                      <span className="text-[10px] text-gray-500">Subtes RA + ZR</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">Input skor (0-20) & kategori PDF:</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Skor (0-20)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={state.aspekScores?.kemampuanNumerik ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            handleUpdateAspectScoreOrCategory('kemampuanNumerik', val, state.aspekKategori?.kemampuanNumerik || '');
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0-20"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Kategori PDF</span>
                        <input
                          type="text"
                          value={state.aspekKategori?.kemampuanNumerik || ''}
                          onChange={(e) => {
                            handleUpdateAspectScoreOrCategory('kemampuanNumerik', state.aspekScores?.kemampuanNumerik ?? '', e.target.value);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center uppercase outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="R / S / T"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-gray-500 font-medium">Taraf Hasil:</span>
                      <span className="inline-flex items-center font-bold px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
                        {getStaffScaleCode(state.intelektual.kemampuanNumerik)} ({getStaffScaleFullLabel(state.intelektual.kemampuanNumerik)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional 9 Subtests of IST */}
            {showAllISTSubtests && (
              <div className="mt-4 pt-3 border-t border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-2">Skor Standar (SW) Lengkap 9 Subtes IST:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {(['SE', 'WA', 'AN', 'GE', 'ME', 'RA', 'ZR', 'FA', 'WU'] as const).map((subtest) => (
                    <div key={subtest} className="bg-white p-2 rounded border border-purple-100 text-center">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">{subtest}</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={state.istSubscores?.[subtest] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          updateState('istSubscores', subtest, val);
                          if (subtest === 'ZR') {
                            updateState('intelektual', 'berpikirSistematis', calculateISTBerpikirSistematis(val));
                            updateState('intelektual', 'pemahamanKonsep', calculateISTPemahamanKonsep(state.istSubscores?.AN, val));
                          } else if (subtest === 'AN') {
                            updateState('intelektual', 'pemahamanKonsep', calculateISTPemahamanKonsep(val, state.istSubscores?.ZR));
                          }
                        }}
                        className="w-full px-1 py-1 border border-gray-200 rounded text-center text-xs font-semibold outline-none focus:border-purple-500"
                        placeholder="SW"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Aspek Intelektual */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-800">3. Aspek Intelektual</h3>
              <p className="text-xs text-gray-500 mt-0.5">Rating aspek intelektual (KS, K, RB, R, RA, B, BS)</p>
            </div>
          </div>

          {renderRadioGroup(
            'intelektual',
            'potensiKecerdasan',
            '1. Potensi Kecerdasan (Kapasitas Keseluruhan)',
            undefined,
            'Menggambarkan kapasitas intelektual secara komprehensif berdasarkan skor IQ IST.'
          )}

          {renderRadioGroup(
            'intelektual',
            'berpikirSistematis',
            '2. Berpikir Sistematis',
            { text: 'Guide Interpreter IST (Subtes ZR / Deret Angka)', variant: 'purple' },
            'Dihitung otomatis dari subtes ZR sesuai norma Guide Interpreter IST (atau sesuaikan bila perlu).'
          )}

          {renderRadioGroup(
            'intelektual',
            'pemahamanVerbal',
            '3. Pemahaman Verbal',
            state.aspekScores?.pemahamanVerbal !== '' || state.aspekKategori?.pemahamanVerbal
              ? { text: `Skor: ${state.aspekScores?.pemahamanVerbal !== '' && state.aspekScores?.pemahamanVerbal !== undefined ? state.aspekScores?.pemahamanVerbal : '-'} | Kat PDF: ${state.aspekKategori?.pemahamanVerbal || '-'}`, variant: 'blue' }
              : { text: 'Skor & Kategori PDF (Maks 20)', variant: 'blue' },
            'Mempertimbangkan skor (maks 20) & kategori PDF: jika R dengan skor ≥6 menjadi RB, jika ≤5 menjadi K.'
          )}

          {renderRadioGroup(
            'intelektual',
            'analisaSintesa',
            '4. Analisa-Sintesa',
            state.aspekScores?.analisaSintesa !== '' || state.aspekKategori?.analisaSintesa
              ? { text: `Skor: ${state.aspekScores?.analisaSintesa !== '' && state.aspekScores?.analisaSintesa !== undefined ? state.aspekScores?.analisaSintesa : '-'} | Kat PDF: ${state.aspekKategori?.analisaSintesa || '-'}`, variant: 'blue' }
              : { text: 'Skor & Kategori PDF (Maks 20)', variant: 'blue' },
            'Mempertimbangkan skor (maks 20) & kategori PDF: jika R dengan skor ≥6 menjadi RB, jika ≤5 menjadi K.'
          )}

          {renderRadioGroup(
            'intelektual',
            'pemahamanKonsep',
            '5. Pemahaman Konsep',
            { text: 'Guide Interpreter IST (Daya Paham: (AN + ZR) / 2)', variant: 'purple' },
            'Dihitung otomatis dari rumus Daya Paham: (AN + ZR) / 2 sesuai norma Guide Interpreter IST (atau sesuaikan bila perlu).'
          )}

          {renderRadioGroup(
            'intelektual',
            'kemampuanNumerik',
            '6. Kemampuan Numerik',
            state.aspekScores?.kemampuanNumerik !== '' || state.aspekKategori?.kemampuanNumerik
              ? { text: `Skor: ${state.aspekScores?.kemampuanNumerik !== '' && state.aspekScores?.kemampuanNumerik !== undefined ? state.aspekScores?.kemampuanNumerik : '-'} | Kat PDF: ${state.aspekKategori?.kemampuanNumerik || '-'}`, variant: 'blue' }
              : { text: 'Skor & Kategori PDF (Maks 20)', variant: 'blue' },
            'Mempertimbangkan skor (maks 20) & kategori PDF: jika R dengan skor ≥6 menjadi RB, jika ≤5 menjadi K.'
          )}
        </div>

        {/* Card 3: Sikap Kerja */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h3 className="text-lg font-medium text-gray-800">4. Sikap Kerja</h3>
            <div 
              className={`relative p-1 rounded-xl transition-all ${dragActiveKraepelin ? 'bg-indigo-100 border-2 border-indigo-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveKraepelin(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveKraepelin(false); }}
              onDrop={(e) => { e.preventDefault(); setDragActiveKraepelin(false); if (e.dataTransfer.files?.[0]) handleUploadKraepelin({ target: { files: e.dataTransfer.files } } as any); }}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={kraepelinFileInputRef}
                onChange={handleUploadKraepelin}
              />
              <button 
                onClick={() => kraepelinFileInputRef.current?.click()}
                disabled={isUploadingKraepelin}
                className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
              >
                {isUploadingKraepelin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Data Kraepelin
              </button>
            </div>
          </div>
          {renderRadioGroup('sikapKerja', 'kecepatan', '1. Kecepatan')}
          {renderRadioGroup('sikapKerja', 'ketelitian', '2. Ketelitian')}
          {renderRadioGroup('sikapKerja', 'ketekunan', '3. Ketekunan atau Keuletan')}
          {renderRadioGroup('sikapKerja', 'dayaTahanStres', '4. Daya Tahan terhadap Stres')}
        </div>

        {/* Card 4: Kepribadian */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h3 className="text-lg font-medium text-gray-800">5. Kepribadian</h3>
            <div className="flex items-center gap-2">
              <div 
                className={`relative p-1 rounded-xl transition-all ${dragActivePapi ? 'bg-indigo-100 border-2 border-indigo-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActivePapi(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActivePapi(false); }}
                onDrop={(e) => { e.preventDefault(); setDragActivePapi(false); if (e.dataTransfer.files?.[0]) handleUploadPapi({ target: { files: e.dataTransfer.files } } as any); }}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  ref={papiFileInputRef}
                  onChange={handleUploadPapi}
                />
                <button 
                  onClick={() => papiFileInputRef.current?.click()}
                  disabled={isUploadingPapi}
                  className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
                >
                  {isUploadingPapi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Data Papikostik
                </button>
              </div>
              {hasUploadedPapi && (
                <div 
                  className={`relative p-1 rounded-xl transition-all ${dragActiveMbti ? 'bg-indigo-100 border-2 border-indigo-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActiveMbti(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActiveMbti(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragActiveMbti(false); if (e.dataTransfer.files?.[0]) handleUploadMbti({ target: { files: e.dataTransfer.files } } as any); }}
                >
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    className="hidden" 
                    ref={mbtiFileInputRef}
                    onChange={handleUploadMbti}
                  />
                  <button 
                    onClick={() => mbtiFileInputRef.current?.click()}
                    disabled={isUploadingMbti}
                    className="flex items-center text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
                  >
                    {isUploadingMbti ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload MBTI (Tambahan)
                  </button>
                </div>
              )}
            </div>
          </div>
          {renderRadioGroup('kepribadian', 'kematanganEmosi', '1. Kematangan Emosi')}
          {renderRadioGroup('kepribadian', 'kemasakanSosial', '2. Kemasakan Sosial')}
          {renderRadioGroup('kepribadian', 'rasaPercayaDiri', '3. Rasa Percaya Diri')}
          {renderRadioGroup('kepribadian', 'motivasiBerprestasi', '4. Motivasi Berprestasi')}
          {renderRadioGroup('kepribadian', 'sikapMandiri', '5. Sikap Mandiri')}
          {renderRadioGroup('kepribadian', 'inisiatif', '6. Inisiatif')}
          {renderRadioGroup('kepribadian', 'kemampuanBekerjasama', '7. Kemampuan Bekerjasama')}
          {renderRadioGroup('kepribadian', 'keterampilanBerkomunikasi', '8. Keterampilan Berkomunikasi')}
          {renderRadioGroup('kepribadian', 'loyalitas', '9. Loyalitas')}
        </div>

        {/* Card 5: Generator Prompt AI */}
        <div className="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-indigo-900 pb-1">AI Prompt Generator</h3>
              <p className="text-sm text-indigo-700">Salin data di atas untuk dijadikan prompt ChatGPT atau Claude.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCopyPrompt}
                className="flex items-center text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg transition-colors"
                title="Salin prompt untuk ChatGPT"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Disalin!' : 'Copy Prompt AI'}
              </button>
            </div>
          </div>
          {generatedPrompt && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100 shadow-inner max-h-60 overflow-y-auto">
              <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2">Preview Prompt</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {generatedPrompt}
              </p>
            </div>
          )}
        </div>

        {/* Card 6: Dinamika Psikologis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">6. Dinamika Psikologis</h3>
          <textarea
            rows={10}
            value={state.dinamikaPsikologis}
            onChange={(e) => updateState('dinamikaPsikologis', '', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            placeholder="Ketik narasi dinamika psikologis di sini..."
          />
        </div>



      </div>
    </div>
  );
}
