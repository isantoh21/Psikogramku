import React, { useState, useRef } from 'react';
import { StaffAluAppState, ScaleLevel, INITIAL_STAFF_ALU_STATE } from '../types';
import {
  formatDateId,
  mapCfitIQToLevel,
  mapCfitIQToLabel,
  calculateCfitSub1,
  calculateCfitSub2,
  calculateCfitSub3,
  calculateCfitSub4,
  calculateTkdScoreToLevel,
  parseCategoryToScaleLevel,
  getStaffScaleCode,
  getStaffScaleFullLabel
} from '../utils/scoring';
import { generateGuideDinamikaPsikologis } from '../utils/guideInterpreter';
import { getAISettings } from '../utils/aiSettings';
import { 
  executeExtraction, 
  CFIT_STAFF_PROMPT,
  TKD_PROMPT,
  KRAEPELIN_PROMPT, 
  normalizeKraepelinResult,
  PAPI_PROMPT, 
  getMBTIPrompt 
} from '../utils/clientAIExtractor';
import { processDocumentFile } from '../utils/documentProcessor';
import { RefreshCw, Copy, Check, Upload, Loader2, Calculator, Info, CheckCircle2, AlertCircle, X, Sparkles, Brain, BookOpen } from 'lucide-react';

interface FormInputStaffAluProps {
  state?: StaffAluAppState;
  setState: React.Dispatch<React.SetStateAction<StaffAluAppState>>;
}

export function FormInputStaffAlu({ state, setState }: FormInputStaffAluProps) {
  const safeState = state || INITIAL_STAFF_ALU_STATE;
  const clientData = safeState.clientData || INITIAL_STAFF_ALU_STATE.clientData;
  const intelektual = safeState.intelektual || INITIAL_STAFF_ALU_STATE.intelektual;
  const sikapKerja = safeState.sikapKerja || INITIAL_STAFF_ALU_STATE.sikapKerja;
  const kepribadian = safeState.kepribadian || INITIAL_STAFF_ALU_STATE.kepribadian;
  const cfitScores = safeState.cfitScores || INITIAL_STAFF_ALU_STATE.cfitScores;
  const tkdScores = safeState.tkdScores || INITIAL_STAFF_ALU_STATE.tkdScores;

  const [copied, setCopied] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isUploadingCFIT, setIsUploadingCFIT] = useState(false);
  const [isUploadingTKD, setIsUploadingTKD] = useState(false);
  const [isUploadingKraepelin, setIsUploadingKraepelin] = useState(false);
  const [isUploadingPapi, setIsUploadingPapi] = useState(false);
  const [hasUploadedPapi, setHasUploadedPapi] = useState(false);
  const [isUploadingMbti, setIsUploadingMbti] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'loading' | '';
    title: string;
    message: string;
  }>({ type: '', title: '', message: '' });

  const [dragActiveCFIT, setDragActiveCFIT] = useState(false);
  const [dragActiveTKD, setDragActiveTKD] = useState(false);
  const [dragActiveKraepelin, setDragActiveKraepelin] = useState(false);
  const [dragActivePapi, setDragActivePapi] = useState(false);
  const [dragActiveMbti, setDragActiveMbti] = useState(false);
  const [kraepelinDetails, setKraepelinDetails] = useState<Record<string, string>>({});
  
  const cfitFileInputRef = useRef<HTMLInputElement>(null);
  const tkdFileInputRef = useRef<HTMLInputElement>(null);
  const kraepelinFileInputRef = useRef<HTMLInputElement>(null);
  const papiFileInputRef = useRef<HTMLInputElement>(null);
  const mbtiFileInputRef = useRef<HTMLInputElement>(null);

  const updateState = (section: keyof StaffAluAppState, field: string, value: any) => {
    if (section === 'clientData' || section === 'intelektual' || section === 'sikapKerja' || section === 'kepribadian' || section === 'cfitScores' || section === 'tkdScores') {
      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        return {
          ...base,
          [section]: {
            ...((base[section] as Record<string, any>) || {}),
            [field]: value
          }
        };
      });
    } else {
      setState(prev => ({ ...(prev || INITIAL_STAFF_ALU_STATE), [section]: value }));
    }
  };

  // 1. UPLOAD HASIL TES CFIT
  const handleUploadCFIT = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCFIT(true);
    const aiConfig = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Dokumen Tes CFIT...',
      message: `Sedang memproses "${file.name}" via ${aiConfig.provider.toUpperCase()} (${aiConfig.model || 'AI'}). Menganalisis skor IQ & subtes CFIT...`
    });

    try {
      const processed = await processDocumentFile(file, { uploadToSupabase: true, folder: 'cfit' });
      
      const data = await executeExtraction({
        apiEndpoint: '/api/extract-cfit',
        prompt: CFIT_STAFF_PROMPT,
        data: processed.base64,
        mimeType: processed.mimeType,
        filename: file.name,
        text: processed.text,
        supabaseUrl: processed.supabaseUrl
      });
      
      const {
        clientData: extractedClientData,
        iqScore,
        iqLabel,
        cfitSubscores: extractedSubscores,
        cfitCategories: extractedCategories
      } = data || {};

      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_ALU_STATE.clientData;

        const rawIq = (iqScore !== null && iqScore !== undefined && iqScore !== '') ? Number(iqScore) : base.iqScore;
        const parsedIq = (typeof rawIq === 'number' && !isNaN(rawIq)) ? rawIq : base.iqScore;
        
        // Final IQ Level based on CFIT IQ Norm (IQ 106 -> 4 / Rata-rata)
        const finalIqLevel: ScaleLevel = parsedIq ? mapCfitIQToLevel(parsedIq) : (base.intelektual.potensiKecerdasan || 4);
        const finalIqLabel = iqLabel || (parsedIq ? mapCfitIQToLabel(parsedIq) : base.iqLabel);

        // Subtes 1: Berpikir Sistematis
        const rawSub1 = extractedSubscores?.sub1;
        const catSub1 = extractedCategories?.sub1;
        let sub1Val: number | '' = base.cfitScores?.sub1 ?? '';
        let finalBerpikirSistematis: ScaleLevel = base.intelektual.berpikirSistematis;

        if (rawSub1 !== null && rawSub1 !== undefined && rawSub1 !== '' && Number(rawSub1) > 0) {
          sub1Val = Number(rawSub1);
          finalBerpikirSistematis = calculateCfitSub1(sub1Val);
        } else if (catSub1) {
          finalBerpikirSistematis = parseCategoryToScaleLevel(catSub1, finalIqLevel);
          sub1Val = finalBerpikirSistematis === 4 ? 7 : (sub1Val || 7);
        } else {
          finalBerpikirSistematis = finalIqLevel;
          sub1Val = finalIqLevel === 4 ? 7 : finalIqLevel >= 5 ? 9 : 4;
        }

        // Subtes 2: Berpikir Kritis
        const rawSub2 = extractedSubscores?.sub2;
        let sub2Val: number | '' = base.cfitScores?.sub2 ?? '';
        if (rawSub2 !== null && rawSub2 !== undefined && rawSub2 !== '' && Number(rawSub2) > 0) {
          sub2Val = Number(rawSub2);
        } else {
          sub2Val = finalIqLevel === 4 ? 7 : finalIqLevel >= 5 ? 9 : 4;
        }

        // Subtes 3: Analisa-Sintesa
        const rawSub3 = extractedSubscores?.sub3;
        const catSub3 = extractedCategories?.sub3;
        let sub3Val: number | '' = base.cfitScores?.sub3 ?? '';
        let finalAnalisaSintesa: ScaleLevel = base.intelektual.analisaSintesa;

        if (rawSub3 !== null && rawSub3 !== undefined && rawSub3 !== '' && Number(rawSub3) > 0) {
          sub3Val = Number(rawSub3);
          finalAnalisaSintesa = calculateCfitSub3(sub3Val);
        } else if (catSub3) {
          finalAnalisaSintesa = parseCategoryToScaleLevel(catSub3, finalIqLevel);
          sub3Val = finalAnalisaSintesa === 4 ? 7 : (sub3Val || 7);
        } else {
          finalAnalisaSintesa = finalIqLevel;
          sub3Val = finalIqLevel === 4 ? 7 : finalIqLevel >= 5 ? 9 : 4;
        }

        // Subtes 4: Pemahaman Konsep
        const rawSub4 = extractedSubscores?.sub4;
        const catSub4 = extractedCategories?.sub4;
        let sub4Val: number | '' = base.cfitScores?.sub4 ?? '';
        let finalPemahamanKonsep: ScaleLevel = base.intelektual.pemahamanKonsep;

        if (rawSub4 !== null && rawSub4 !== undefined && rawSub4 !== '' && Number(rawSub4) > 0) {
          sub4Val = Number(rawSub4);
          finalPemahamanKonsep = calculateCfitSub4(sub4Val);
        } else if (catSub4) {
          finalPemahamanKonsep = parseCategoryToScaleLevel(catSub4, finalIqLevel);
          sub4Val = finalPemahamanKonsep === 4 ? 5 : (sub4Val || 5);
        } else {
          finalPemahamanKonsep = finalIqLevel;
          sub4Val = finalIqLevel === 4 ? 5 : finalIqLevel >= 5 ? 7 : 3;
        }

        const totalScoreVal = extractedSubscores?.totalScore ?? (typeof sub1Val === 'number' && typeof sub2Val === 'number' && typeof sub3Val === 'number' && typeof sub4Val === 'number' ? sub1Val + sub2Val + sub3Val + sub4Val : base.cfitScores?.totalScore ?? '');

        const updatedIntelektual = {
          ...base.intelektual,
          potensiKecerdasan: finalIqLevel,
          berpikirSistematis: finalBerpikirSistematis,
          analisaSintesa: finalAnalisaSintesa,
          pemahamanKonsep: finalPemahamanKonsep,
        };

        const candidateName = extractedClientData?.nama || baseClient.nama;
        const autoDinamika = (!base.dinamikaPsikologis || base.dinamikaPsikologis.trim() === '') ? generateGuideDinamikaPsikologis({
          nama: candidateName,
          iqScore: parsedIq,
          iqLabel: finalIqLabel,
          intelektual: updatedIntelektual,
          sikapKerja: base.sikapKerja,
          kepribadian: base.kepribadian
        }) : base.dinamikaPsikologis;

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
            namaPT: extractedClientData?.namaPT || extractedClientData?.perusahaan || baseClient.namaPT || 'PT. ALAM LESTARI UNGGUL',
          },
          iqScore: parsedIq,
          iqLabel: finalIqLabel,
          cfitScores: {
            sub1: sub1Val,
            sub2: sub2Val,
            sub3: sub3Val,
            sub4: sub4Val,
            totalScore: totalScoreVal,
          },
          intelektual: updatedIntelektual,
          dinamikaPsikologis: autoDinamika
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi CFIT Berhasil!',
        message: `Data hasil tes CFIT dari "${file.name}" berhasil diekstrak dan disesuaikan dengan norma interpreter.`
      });
    } catch (err: any) {
      console.error('CFIT Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Tes CFIT',
        message: err?.message || 'Terjadi kesalahan saat mengekstrak data tes CFIT. Pastikan file PDF atau gambar jelas.'
      });
    } finally {
      setIsUploadingCFIT(false);
      if (cfitFileInputRef.current) cfitFileInputRef.current.value = '';
    }
  };

  // 2. UPLOAD HASIL TES TKD
  const handleUploadTKD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTKD(true);
    const aiConfig = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Dokumen Tes TKD...',
      message: `Sedang memproses "${file.name}" via ${aiConfig.provider.toUpperCase()} (${aiConfig.model || 'AI'}). Menganalisis skor standar (SS) TKD...`
    });

    try {
      const processed = await processDocumentFile(file, { uploadToSupabase: true, folder: 'tkd' });
      
      const data = await executeExtraction({
        apiEndpoint: '/api/extract-tkd',
        prompt: TKD_PROMPT,
        data: processed.base64,
        mimeType: processed.mimeType,
        filename: file.name,
        text: processed.text,
        supabaseUrl: processed.supabaseUrl
      });
      
      const {
        clientData: extractedClientData,
        tkdSubscores: extractedSubscores,
        tkdCategories: extractedCategories
      } = data || {};

      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_ALU_STATE.clientData;
        const defaultLevel: ScaleLevel = base.intelektual.potensiKecerdasan || 4;

        // Subtes 3 TKD -> Pemahaman Verbal
        const rawSub3 = extractedSubscores?.sub3;
        const catSub3 = extractedCategories?.sub3;
        let sub3Val: number | '' = base.tkdScores?.sub3 ?? '';
        let finalPemahamanVerbal: ScaleLevel = base.intelektual.pemahamanVerbal;

        if (rawSub3 !== null && rawSub3 !== undefined && rawSub3 !== '' && Number(rawSub3) > 0) {
          sub3Val = Number(rawSub3);
          finalPemahamanVerbal = calculateTkdScoreToLevel(sub3Val);
        } else if (catSub3) {
          finalPemahamanVerbal = parseCategoryToScaleLevel(catSub3, defaultLevel);
          sub3Val = finalPemahamanVerbal === 4 ? 8 : (sub3Val || 8);
        } else {
          finalPemahamanVerbal = defaultLevel;
          sub3Val = defaultLevel === 4 ? 8 : (defaultLevel >= 5 ? 10 : 4);
        }

        // Subtes 5 TKD -> Kemampuan Numerik
        const rawSub5 = extractedSubscores?.sub5;
        const catSub5 = extractedCategories?.sub5;
        let sub5Val: number | '' = base.tkdScores?.sub5 ?? '';
        let finalKemampuanNumerik: ScaleLevel = base.intelektual.kemampuanNumerik;

        if (rawSub5 !== null && rawSub5 !== undefined && rawSub5 !== '' && Number(rawSub5) > 0) {
          sub5Val = Number(rawSub5);
          finalKemampuanNumerik = calculateTkdScoreToLevel(sub5Val);
        } else if (catSub5) {
          finalKemampuanNumerik = parseCategoryToScaleLevel(catSub5, defaultLevel);
          sub5Val = finalKemampuanNumerik === 4 ? 8 : (sub5Val || 8);
        } else {
          finalKemampuanNumerik = defaultLevel;
          sub5Val = defaultLevel === 4 ? 8 : (defaultLevel >= 5 ? 10 : 4);
        }

        // Subtes 7 TKD -> Berpikir Analogi / Kritis
        const rawSub7 = extractedSubscores?.sub7;
        let sub7Val: number | '' = base.tkdScores?.sub7 ?? '';
        if (rawSub7 !== null && rawSub7 !== undefined && rawSub7 !== '' && Number(rawSub7) > 0) {
          sub7Val = Number(rawSub7);
        } else {
          sub7Val = defaultLevel === 4 ? 8 : (defaultLevel >= 5 ? 10 : 4);
        }

        const updatedIntelektual = {
          ...base.intelektual,
          pemahamanVerbal: finalPemahamanVerbal,
          kemampuanNumerik: finalKemampuanNumerik,
        };

        const candidateName = extractedClientData?.nama || baseClient.nama;
        const autoDinamika = (!base.dinamikaPsikologis || base.dinamikaPsikologis.trim() === '') ? generateGuideDinamikaPsikologis({
          nama: candidateName,
          iqScore: base.iqScore,
          iqLabel: base.iqLabel,
          intelektual: updatedIntelektual,
          sikapKerja: base.sikapKerja,
          kepribadian: base.kepribadian
        }) : base.dinamikaPsikologis;

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
            namaPT: extractedClientData?.namaPT || extractedClientData?.perusahaan || baseClient.namaPT || 'PT. ALAM LESTARI UNGGUL',
          },
          tkdScores: {
            sub3: sub3Val,
            sub5: sub5Val,
            sub7: sub7Val,
          },
          intelektual: updatedIntelektual,
          dinamikaPsikologis: autoDinamika
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi TKD Berhasil!',
        message: `Data hasil tes TKD (Subtes 3, 5, 7) dari "${file.name}" berhasil diekstrak dan disesuaikan dengan norma interpreter.`
      });
    } catch (err: any) {
      console.error('TKD Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Tes TKD',
        message: err?.message || 'Terjadi kesalahan saat mengekstrak data tes TKD. Pastikan file PDF atau gambar jelas.'
      });
    } finally {
      setIsUploadingTKD(false);
      if (tkdFileInputRef.current) tkdFileInputRef.current.value = '';
    }
  };

  // 3. UPLOAD KRAEPELIN
  const handleUploadKraepelin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingKraepelin(true);
    const aiConfigKraepelin = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data Tes Kraepelin...',
      message: `Sedang memproses "${file.name}" via ${aiConfigKraepelin.provider.toUpperCase()} (${aiConfigKraepelin.model || 'AI'}). Menganalisis tabel sikap kerja...`
    });

    try {
      const processed = await processDocumentFile(file, { uploadToSupabase: true, folder: 'kraepelin' });
      
      const rawData = await executeExtraction({
        apiEndpoint: '/api/extract-kraepelin',
        prompt: KRAEPELIN_PROMPT,
        data: processed.base64,
        mimeType: processed.mimeType,
        filename: file.name,
        text: processed.text,
        supabaseUrl: processed.supabaseUrl
      });
      
      const normalized = normalizeKraepelinResult({
        ...rawData,
        text: processed.text
      });
      let { clientData: extractedClientData, sikapKerja: extractedSikapKerja, rawDetails } = normalized;

      if (processed.kraepelinDirect) {
        extractedSikapKerja = {
          kecepatan: (processed.kraepelinDirect.kecepatan || extractedSikapKerja.kecepatan) as ScaleLevel,
          ketelitian: (processed.kraepelinDirect.ketelitian || extractedSikapKerja.ketelitian) as ScaleLevel,
          ketekunan: (processed.kraepelinDirect.ketekunan || extractedSikapKerja.ketekunan) as ScaleLevel,
          dayaTahanStres: (processed.kraepelinDirect.dayaTahanStres || extractedSikapKerja.dayaTahanStres) as ScaleLevel,
        };
      }

      setKraepelinDetails(rawDetails || {});

      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_ALU_STATE.clientData;
        const baseSikap = base.sikapKerja || INITIAL_STAFF_ALU_STATE.sikapKerja;

        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData.nama || baseClient.nama,
            tempatTglLahir: extractedClientData.tempatTglLahir || baseClient.tempatTglLahir,
            pendidikan: extractedClientData.pendidikan || baseClient.pendidikan,
            alamat: extractedClientData.alamat || baseClient.alamat,
            tujuanPemeriksaan: extractedClientData.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
            namaPT: extractedClientData.namaPT || baseClient.namaPT || 'PT. ALAM LESTARI UNGGUL',
          },
          sikapKerja: {
            kecepatan: extractedSikapKerja.kecepatan || baseSikap.kecepatan,
            ketelitian: extractedSikapKerja.ketelitian || baseSikap.ketelitian,
            ketekunan: extractedSikapKerja.ketekunan || baseSikap.ketekunan,
            dayaTahanStres: extractedSikapKerja.dayaTahanStres || baseSikap.dayaTahanStres,
          }
        };
      });

      setUploadStatus({
        type: 'success',
        title: 'Ekstraksi Sikap Kerja Berhasil!',
        message: `Data sikap kerja dari "${file.name}" berhasil dipetakan ke psikogram.`
      });
    } catch (err: any) {
      console.error('Kraepelin Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Tes Kraepelin',
        message: err?.message || 'Terjadi kesalahan saat memproses data Kraepelin.'
      });
    } finally {
      setIsUploadingKraepelin(false);
      if (kraepelinFileInputRef.current) kraepelinFileInputRef.current.value = '';
    }
  };

  // 4. UPLOAD PAPI KOSTICK
  const handleUploadPapi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPapi(true);
    const aiConfigPapi = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data Tes PAPI Kostick...',
      message: `Sedang memproses "${file.name}" via ${aiConfigPapi.provider.toUpperCase()} (${aiConfigPapi.model || 'AI'}). Membaca skor 20 faktor kepribadian...`
    });

    try {
      const processed = await processDocumentFile(file, { uploadToSupabase: true, folder: 'papikostik' });
      
      const data = await executeExtraction({
        apiEndpoint: '/api/extract-papikostik',
        prompt: PAPI_PROMPT,
        data: processed.base64,
        mimeType: processed.mimeType,
        filename: file.name,
        text: processed.text,
        supabaseUrl: processed.supabaseUrl
      });
      
      const { clientData: extractedClientData, kepribadian } = data || {};

      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        const baseClient = base.clientData || INITIAL_STAFF_ALU_STATE.clientData;
        const baseKepribadian = base.kepribadian || INITIAL_STAFF_ALU_STATE.kepribadian;

        return {
          ...base,
          clientData: {
            ...baseClient,
            nama: extractedClientData?.nama || baseClient.nama,
            tempatTglLahir: extractedClientData?.tempatTglLahir || baseClient.tempatTglLahir,
            pendidikan: extractedClientData?.pendidikan || baseClient.pendidikan,
            tujuanPemeriksaan: extractedClientData?.tujuanPemeriksaan || baseClient.tujuanPemeriksaan,
            namaPT: extractedClientData?.namaPT || baseClient.namaPT || 'PT. ALAM LESTARI UNGGUL',
          },
          kepribadian: {
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
        message: `9 Aspek Kepribadian dari "${file.name}" berhasil diekstrak.`
      });
    } catch (err: any) {
      console.error('PAPI Upload Error:', err);
      setUploadStatus({
        type: 'error',
        title: 'Gagal Mengekstrak Data Tes PAPI Kostick',
        message: err?.message || 'Terjadi kesalahan saat memproses data PAPI Kostick.'
      });
    } finally {
      setIsUploadingPapi(false);
      if (papiFileInputRef.current) papiFileInputRef.current.value = '';
    }
  };

  // 5. UPLOAD MBTI (Tambahan)
  const handleUploadMbti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMbti(true);
    const aiConfigMbti = getAISettings();
    setUploadStatus({
      type: 'loading',
      title: 'Mengekstrak Data Tes MBTI...',
      message: `Sedang memproses "${file.name}" via ${aiConfigMbti.provider.toUpperCase()} (${aiConfigMbti.model || 'AI'}). Mengintegrasikan tipe kepribadian MBTI...`
    });

    try {
      const processed = await processDocumentFile(file, { uploadToSupabase: true, folder: 'mbti' });
      
      const mbtiPrompt = getMBTIPrompt(safeState.kepribadian);
      const data = await executeExtraction({
        apiEndpoint: '/api/extract-mbti',
        prompt: mbtiPrompt,
        data: processed.base64,
        mimeType: processed.mimeType,
        filename: file.name,
        text: processed.text,
        supabaseUrl: processed.supabaseUrl,
        extraBody: {
          currentKepribadian: safeState.kepribadian
        }
      });
      
      const { kepribadian } = data || {};

      setState(prev => {
        const base = prev || INITIAL_STAFF_ALU_STATE;
        const baseKepribadian = base.kepribadian || INITIAL_STAFF_ALU_STATE.kepribadian;

        return {
          ...base,
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
      setState(INITIAL_STAFF_ALU_STATE);
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
Perusahaan / PT: ${clientData.namaPT || 'PT. ALAM LESTARI UNGGUL'}
Tujuan Pemeriksaan: ${clientData.tujuanPemeriksaan || '[Kosong]'}
IQ CFIT: ${safeState.iqScore || '[Kosong]'} (${safeState.iqLabel || '[Kosong]'})

--- ASPEK INTELEKTUAL (CFIT & TKD) ---
Potensi Kecerdasan: ${getStaffScaleLabel(intelektual.potensiKecerdasan)} (IQ CFIT: ${safeState.iqScore})
Berpikir Sistematis: ${getStaffScaleLabel(intelektual.berpikirSistematis)} (CFIT Subtes 1: ${cfitScores.sub1})
Pemahaman Verbal: ${getStaffScaleLabel(intelektual.pemahamanVerbal)} (TKD Subtes 3: ${tkdScores.sub3})
Analisa-Sintesa: ${getStaffScaleLabel(intelektual.analisaSintesa)} (CFIT Subtes 3: ${cfitScores.sub3})
Pemahaman Konsep: ${getStaffScaleLabel(intelektual.pemahamanKonsep)} (CFIT Subtes 4: ${cfitScores.sub4})
Kemampuan Numerik: ${getStaffScaleLabel(intelektual.kemampuanNumerik)} (TKD Subtes 5: ${tkdScores.sub5})

--- SIKAP KERJA (KRAEPELIN) ---
Kecepatan: ${getStaffScaleLabel(sikapKerja.kecepatan)}
Ketelitian: ${getStaffScaleLabel(sikapKerja.ketelitian)}
Ketekunan atau Keuletan: ${getStaffScaleLabel(sikapKerja.ketekunan)}
Daya Tahan terhadap Stres: ${getStaffScaleLabel(sikapKerja.dayaTahanStres)}

--- KEPRIBADIAN (PAPI KOSTICK & MBTI) ---
Kematangan Emosi: ${getStaffScaleLabel(kepribadian.kematanganEmosi)}
Kemasakan Sosial: ${getStaffScaleLabel(kepribadian.kemasakanSosial)}
Rasa Percaya Diri: ${getStaffScaleLabel(kepribadian.rasaPercayaDiri)}
Motivasi Berprestasi: ${getStaffScaleLabel(kepribadian.motivasiBerprestasi)}
Sikap Mandiri: ${getStaffScaleLabel(kepribadian.sikapMandiri)}
Inisiatif: ${getStaffScaleLabel(kepribadian.inisiatif)}
Kemampuan Bekerjasama: ${getStaffScaleLabel(kepribadian.kemampuanBekerjasama)}
Keterampilan Berkomunikasi: ${getStaffScaleLabel(kepribadian.keterampilanBerkomunikasi)}
Loyalitas: ${getStaffScaleLabel(kepribadian.loyalitas)}`;

    return `Tolong buatkan narasi untuk "Dinamika Psikologis" seleksi staf PT. ALAM LESTARI UNGGUL berdasarkan data tes psikologi (CFIT, TKD, Kraepelin, PAPI Kostick) berikut:

${data}

ATURAN DAN FORMAT PENULISAN (SANGAT PENTING KUNCI PAKEM INI):
1. Hasil narasi HARUS terdiri dari TEPAT 5 paragraf.
2. Gaya bahasa formal, profesional, dan mengalir seperti laporan psikologi.
3. Selalu sebutkan "Saudara/Saudari [Nama Depan/Panggilan]". Tentukan Saudara/Saudari dari jenis kelamin jika ada (atau tebak dari nama). Sertakan juga inisial dalam kurung di paragraf pertama.
4. JANGAN tambahkan poin-poin (bullet points), list, atau sub-judul. Hanya teks narasi paragraf biasa.
5. HINDARI PENGGUNAAN KATA "secara umum", "di atas rata-rata", dan "di bawah rata-rata". Jika mendeskripsikan taraf rata-rata, gunakan HANYA istilah "rata-rata atas" atau "rata-rata bawah" (TIDAK BOLEH pakai kata 'di atas' / 'di bawah').
6. HINDARI penyebutan label taraf secara eksplisit berulang-ulang. Fokuslah HANYA pada IMPLIKASI dan gambaran nyata dari kemampuan tersebut di dunia kerja. Label taraf sudah ada di psikogram, jadi narasikan maknanya secara aplikatif.

STRUKTUR PARAGRAF:

Paragraf 1 (Intelektual): 
- Wajib membahas: Potensi Kecerdasan (IQ CFIT), Pemahaman Verbal (TKD), Berpikir Sistematis (CFIT), Kemampuan Numerik (TKD), Pemahaman Konsep (CFIT), dan Analisa-Sintesa (CFIT).
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
    section: keyof StaffAluAppState,
    field: string,
    label: string,
    badge?: { text: string; variant?: 'blue' | 'purple' | 'amber' | 'emerald' | 'teal' },
    helper?: string
  ) => {
    const currentValue = (safeState[section] as Record<string, any>)[field];
    return (
      <div className="flex flex-col mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 transition-all hover:border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-sm font-semibold text-gray-800">{label}</label>
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center ${
              badge.variant === 'purple' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : badge.variant === 'teal'
                ? 'bg-teal-100 text-teal-700 border border-teal-200'
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
            { value: 1, short: 'KS', color: 'bg-red-100 text-red-700 border-red-200 peer-checked:bg-red-600 peer-checked:text-white' },
            { value: 2, short: 'K', color: 'bg-orange-100 text-orange-700 border-orange-200 peer-checked:bg-orange-600 peer-checked:text-white' },
            { value: 3, short: 'RB', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 peer-checked:bg-yellow-500 peer-checked:text-white' },
            { value: 4, short: 'R', color: 'bg-green-100 text-green-700 border-green-200 peer-checked:bg-green-600 peer-checked:text-white' },
            { value: 5, short: 'RA', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 peer-checked:bg-emerald-600 peer-checked:text-white' },
            { value: 6, short: 'B', color: 'bg-teal-100 text-teal-700 border-teal-200 peer-checked:bg-teal-600 peer-checked:text-white' },
            { value: 7, short: 'BS', color: 'bg-blue-100 text-blue-700 border-blue-200 peer-checked:bg-blue-600 peer-checked:text-white' },
          ].map(({ value, short, color }) => (
            <div key={value} className="relative flex-1 text-center group">
              <input
                type="radio"
                name={`${section}-${field}`}
                value={value}
                checked={currentValue === value}
                onChange={(e) => updateState(section, field, Number(e.target.value))}
                className="peer sr-only"
                id={`alu-${section}-${field}-${value}`}
              />
              <label
                htmlFor={`alu-${section}-${field}-${value}`}
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
          <h2 className="text-lg font-bold text-gray-800">Form Seleksi Staf (Alam Lestari Unggul)</h2>
          <p className="text-xs text-gray-500 mt-1">Instrumen intelektual menggunakan kombinasi tes CFIT dan TKD</p>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Upload Status Banner */}
        {uploadStatus.type && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            uploadStatus.type === 'loading' ? 'bg-blue-50 border-blue-200 text-blue-900' :
            uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {uploadStatus.type === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0 mt-0.5" />
            ) : uploadStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              <h4 className="font-bold">{uploadStatus.title}</h4>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{uploadStatus.message}</p>
            </div>
            <button 
              onClick={() => setUploadStatus({ type: '', title: '', message: '' })}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Card 1: Data Klien */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">1. Data Peserta</h3>
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
                placeholder="PSI-ALU-001"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan / PT</label>
              <input
                type="text"
                value={clientData.namaPT}
                onChange={(e) => updateState('clientData', 'namaPT', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-800"
                placeholder="PT. ALAM LESTARI UNGGUL"
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

        {/* Card 2A: Upload Hasil Tes CFIT */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-800">2A. Hasil Tes CFIT (Culture Fair Intelligence Test)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload dokumen/laporan CFIT untuk mengisi Potensi Kecerdasan, Berpikir Sistematis, Analisa-Sintesa, &amp; Pemahaman Konsep</p>
              </div>
            </div>
            <div 
              className={`relative p-1 rounded-xl transition-all ${dragActiveCFIT ? 'bg-indigo-100 border-2 border-indigo-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveCFIT(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveCFIT(false); }}
              onDrop={(e) => { e.preventDefault(); setDragActiveCFIT(false); if (e.dataTransfer.files?.[0]) handleUploadCFIT({ target: { files: e.dataTransfer.files } } as any); }}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={cfitFileInputRef}
                onChange={handleUploadCFIT}
              />
              <button 
                onClick={() => cfitFileInputRef.current?.click()}
                disabled={isUploadingCFIT}
                className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-70 shadow-sm"
              >
                {isUploadingCFIT ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Hasil Tes CFIT (PDF/Gambar)
              </button>
            </div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3.5 mb-5 flex items-start gap-2.5 text-xs text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-indigo-950">Pedoman Norma Skoring CFIT (Guide Interpreter Brilian Psikologi):</p>
              <p>• <span className="font-semibold">Kategori IQ CFIT:</span> ≥130: Very Superior (BS), 120–129: Superior (B), 110–119: Rata-rata Atas (RA), 90–109: Rata-rata (R), 80–89: Rata-rata Bawah (RB), 70–79: Borderline (K), &lt;69: Intellectual Deficient (KS).</p>
              <p>• <span className="font-semibold">Subtes 1 (Berpikir sistematis):</span> 11–13 (Baik/Baik Sekali), 9–10 (RA), 7–8 (R), 5–6 (RB), 3–4 (K), 0–2 (KS).</p>
              <p>• <span className="font-semibold">Subtes 3 (Analisa-sintesa):</span> 11–13 (Baik/Baik Sekali), 9–10 (RA), 7–8 (R), 5–6 (RB), 3–4 (K), 0–2 (KS).</p>
              <p>• <span className="font-semibold">Subtes 4 (Pemahaman konsep):</span> 9–10 (BS), 7–8 (B), 6 (RA), 5 (R), 4 (RB), 2–3 (K), 0–1 (KS).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skor IQ CFIT</label>
              <input
                type="number"
                value={safeState.iqScore}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  updateState('iqScore', '', val);
                  if (typeof val === 'number') {
                    updateState('iqLabel', '', mapCfitIQToLabel(val));
                    updateState('intelektual', 'potensiKecerdasan', mapCfitIQToLevel(val));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Misal: 108"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori IQ CFIT</label>
              <input
                type="text"
                value={safeState.iqLabel}
                onChange={(e) => updateState('iqLabel', '', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Misal: Rata-rata"
              />
            </div>
          </div>

          {/* Grid 4 Subtes CFIT */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
            <h4 className="text-xs font-bold text-indigo-900 mb-3 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Skor Mentah (Nilai Benar) Subtes CFIT
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Subtes 1 */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 1</label>
                    <span className="text-[10px] text-gray-500 font-medium">Maks. 13</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-semibold mb-1">Berpikir Sistematis</p>
                  <p className="text-[10px] text-gray-400 mb-2">Nilai Benar (0-13):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="13"
                    value={cfitScores.sub1 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('cfitScores', 'sub1', val);
                      if (val !== '') {
                        updateState('intelektual', 'berpikirSistematis', calculateCfitSub1(val));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                    placeholder="0-13"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800">
                      {getStaffScaleCode(intelektual.berpikirSistematis)} ({getStaffScaleFullLabel(intelektual.berpikirSistematis)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtes 2 */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 2</label>
                    <span className="text-[10px] text-gray-500 font-medium">Maks. 14</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-semibold mb-1">Berpikir Kritis</p>
                  <p className="text-[10px] text-gray-400 mb-2">Nilai Benar (0-14):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={cfitScores.sub2 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('cfitScores', 'sub2', val);
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                    placeholder="0-14"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-700">
                      {cfitScores.sub2 !== '' ? getStaffScaleCode(calculateCfitSub2(cfitScores.sub2)) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtes 3 */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 3</label>
                    <span className="text-[10px] text-gray-500 font-medium">Maks. 13</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-semibold mb-1">Analisa-Sintesa</p>
                  <p className="text-[10px] text-gray-400 mb-2">Nilai Benar (0-13):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="13"
                    value={cfitScores.sub3 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('cfitScores', 'sub3', val);
                      if (val !== '') {
                        updateState('intelektual', 'analisaSintesa', calculateCfitSub3(val));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                    placeholder="0-13"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800">
                      {getStaffScaleCode(intelektual.analisaSintesa)} ({getStaffScaleFullLabel(intelektual.analisaSintesa)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtes 4 */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 4</label>
                    <span className="text-[10px] text-gray-500 font-medium">Maks. 10</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-semibold mb-1">Pemahaman Konsep</p>
                  <p className="text-[10px] text-gray-400 mb-2">Nilai Benar (0-10):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={cfitScores.sub4 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('cfitScores', 'sub4', val);
                      if (val !== '') {
                        updateState('intelektual', 'pemahamanKonsep', calculateCfitSub4(val));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                    placeholder="0-10"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800">
                      {getStaffScaleCode(intelektual.pemahamanKonsep)} ({getStaffScaleFullLabel(intelektual.pemahamanKonsep)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2B: Upload Hasil Tes TKD */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-800">2B. Hasil Tes TKD (Tes Kemampuan Dasar)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload dokumen/laporan TKD untuk mengisi Pemahaman Verbal (Subtes 3) &amp; Kemampuan Numerik (Subtes 5)</p>
              </div>
            </div>
            <div 
              className={`relative p-1 rounded-xl transition-all ${dragActiveTKD ? 'bg-teal-100 border-2 border-teal-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveTKD(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveTKD(false); }}
              onDrop={(e) => { e.preventDefault(); setDragActiveTKD(false); if (e.dataTransfer.files?.[0]) handleUploadTKD({ target: { files: e.dataTransfer.files } } as any); }}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={tkdFileInputRef}
                onChange={handleUploadTKD}
              />
              <button 
                onClick={() => tkdFileInputRef.current?.click()}
                disabled={isUploadingTKD}
                className="flex items-center text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-70 shadow-sm"
              >
                {isUploadingTKD ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Hasil Tes TKD (PDF/Gambar)
              </button>
            </div>
          </div>

          <div className="bg-teal-50/70 border border-teal-100 rounded-lg p-3.5 mb-5 flex items-start gap-2.5 text-xs text-teal-900">
            <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-teal-950">Pedoman Norma Skoring TKD (Guide Interpreter Brilian Psikologi):</p>
              <p>• <span className="font-semibold">Nilai benar SS setelah lihat norma:</span> 16–20: Baik Sekali (BS), 12–15: Baik (B), 9–11: Rata-rata Atas (RA), 7–8: Rata-rata (R), 5–6: Rata-rata Bawah (RB), 3–4: Kurang (K), 0–2: Kurang Sekali (KS).</p>
              <p>• <span className="font-semibold">Subtes 3 TKD:</span> Pemahaman verbal, logika berpikir, daya abstraksi ➔ Petakan ke <span className="font-bold">Pemahaman Verbal</span>.</p>
              <p>• <span className="font-semibold">Subtes 5 TKD:</span> Kemampuan berhitung, ketelitian ➔ Petakan ke <span className="font-bold">Kemampuan Numerik</span>.</p>
              <p>• <span className="font-semibold">Subtes 7 TKD:</span> Kemampuan berpikir analogi, kemampuan berpikir kritis.</p>
            </div>
          </div>

          {/* Grid 3 Subtes TKD */}
          <div className="border border-teal-100 bg-teal-50/40 rounded-xl p-4">
            <h4 className="text-xs font-bold text-teal-900 mb-3 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-teal-600" />
              Skor Standar (SS Norma) Subtes TKD
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Subtes 3 TKD */}
              <div className="bg-white p-3.5 rounded-lg border border-teal-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 3 TKD</label>
                    <span className="text-[10px] text-gray-500 font-medium">SS (0-20)</span>
                  </div>
                  <p className="text-[11px] text-teal-800 font-semibold mb-1">Pemahaman Verbal &amp; Abstraksi</p>
                  <p className="text-[10px] text-gray-400 mb-2">Input Skor Standar (SS):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={tkdScores.sub3 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('tkdScores', 'sub3', val);
                      if (val !== '') {
                        updateState('intelektual', 'pemahamanVerbal', calculateTkdScoreToLevel(val));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-teal-500 mb-2"
                    placeholder="SS (0-20)"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf Hasil:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-teal-100 text-teal-800">
                      {getStaffScaleCode(intelektual.pemahamanVerbal)} ({getStaffScaleFullLabel(intelektual.pemahamanVerbal)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtes 5 TKD */}
              <div className="bg-white p-3.5 rounded-lg border border-teal-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 5 TKD</label>
                    <span className="text-[10px] text-gray-500 font-medium">SS (0-20)</span>
                  </div>
                  <p className="text-[11px] text-teal-800 font-semibold mb-1">Kemampuan Berhitung / Numerik</p>
                  <p className="text-[10px] text-gray-400 mb-2">Input Skor Standar (SS):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={tkdScores.sub5 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('tkdScores', 'sub5', val);
                      if (val !== '') {
                        updateState('intelektual', 'kemampuanNumerik', calculateTkdScoreToLevel(val));
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-teal-500 mb-2"
                    placeholder="SS (0-20)"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf Hasil:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-teal-100 text-teal-800">
                      {getStaffScaleCode(intelektual.kemampuanNumerik)} ({getStaffScaleFullLabel(intelektual.kemampuanNumerik)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtes 7 TKD */}
              <div className="bg-white p-3.5 rounded-lg border border-teal-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-800">Subtes 7 TKD</label>
                    <span className="text-[10px] text-gray-500 font-medium">SS (0-20)</span>
                  </div>
                  <p className="text-[11px] text-teal-800 font-semibold mb-1">Berpikir Analogi &amp; Kritis</p>
                  <p className="text-[10px] text-gray-400 mb-2">Input Skor Standar (SS):</p>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={tkdScores.sub7 ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      updateState('tkdScores', 'sub7', val);
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-bold text-center outline-none focus:ring-1 focus:ring-teal-500 mb-2"
                    placeholder="SS (0-20)"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500">Taraf Hasil:</span>
                    <span className="inline-flex font-bold px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-700">
                      {tkdScores.sub7 !== '' ? getStaffScaleCode(calculateTkdScoreToLevel(tkdScores.sub7)) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Aspek Intelektual Radio Groups */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-800">3. Aspek Intelektual (Rating Psikogram)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Rating 1–7 (KS s/d BS) untuk 6 dimensi aspek intelektual yang terisi otomatis dari CFIT dan TKD</p>
            </div>
          </div>

          {renderRadioGroup(
            'intelektual',
            'potensiKecerdasan',
            '1. Potensi Kecerdasan (Kapasitas Keseluruhan)',
            { text: safeState.iqScore ? `IQ CFIT: ${safeState.iqScore} (${safeState.iqLabel})` : 'Sumber: Tes CFIT', variant: 'purple' },
            'Kapasitas intelektual keseluruhan berdasarkan skor IQ CFIT sesuai norma.'
          )}

          {renderRadioGroup(
            'intelektual',
            'berpikirSistematis',
            '2. Berpikir Sistematis',
            { text: cfitScores.sub1 !== '' ? `CFIT Subtes 1: ${cfitScores.sub1}` : 'Sumber: CFIT Subtes 1', variant: 'purple' },
            'Kemampuan berpikir runtut dan berkesinambungan. Diukur dari CFIT Subtes 1.'
          )}

          {renderRadioGroup(
            'intelektual',
            'pemahamanVerbal',
            '3. Pemahaman Verbal',
            { text: tkdScores.sub3 !== '' ? `TKD Subtes 3: SS ${tkdScores.sub3}` : 'Sumber: TKD Subtes 3', variant: 'teal' },
            'Kemampuan memahami arahan, instruksi verbal, dan logika berpikir. Diukur dari TKD Subtes 3.'
          )}

          {renderRadioGroup(
            'intelektual',
            'analisaSintesa',
            '4. Analisa-Sintesa',
            { text: cfitScores.sub3 !== '' ? `CFIT Subtes 3: ${cfitScores.sub3}` : 'Sumber: CFIT Subtes 3', variant: 'purple' },
            'Kemampuan menghubungkan permasalahan serupa dan menarik kesimpulan. Diukur dari CFIT Subtes 3.'
          )}

          {renderRadioGroup(
            'intelektual',
            'pemahamanKonsep',
            '5. Pemahaman Konsep',
            { text: cfitScores.sub4 !== '' ? `CFIT Subtes 4: ${cfitScores.sub4}` : 'Sumber: CFIT Subtes 4', variant: 'purple' },
            'Kemampuan memahami suatu prinsip untuk diterapkan pada situasi baru. Diukur dari CFIT Subtes 4.'
          )}

          {renderRadioGroup(
            'intelektual',
            'kemampuanNumerik',
            '6. Kemampuan Numerik',
            { text: tkdScores.sub5 !== '' ? `TKD Subtes 5: SS ${tkdScores.sub5}` : 'Sumber: TKD Subtes 5', variant: 'teal' },
            'Kemampuan berhitung, ketelitian data angka, dan aritmatika praktis. Diukur dari TKD Subtes 5.'
          )}
        </div>

        {/* Card 4: Aspek Sikap Kerja */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-2 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-800">4. Aspek Sikap Kerja</h3>
              <p className="text-xs text-gray-500 mt-0.5">Rating aspek sikap kerja (kecepatan, ketelitian, ketekunan, daya tahan stres)</p>
            </div>
            <div 
              className={`relative p-1 rounded-xl transition-all ${dragActiveKraepelin ? 'bg-amber-100 border-2 border-amber-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
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
                className="flex items-center text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70"
              >
                {isUploadingKraepelin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Tes Kraepelin
              </button>
            </div>
          </div>
          {renderRadioGroup('sikapKerja', 'kecepatan', '1. Kecepatan (Panker)')}
          {renderRadioGroup('sikapKerja', 'ketelitian', '2. Ketelitian (Tianker)')}
          {renderRadioGroup('sikapKerja', 'ketekunan', '3. Ketekunan atau Keuletan (Janker)')}
          {renderRadioGroup('sikapKerja', 'dayaTahanStres', '4. Daya Tahan terhadap Stres (Hanker)')}
        </div>

        {/* Card 5: Aspek Kepribadian */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-2 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-800">5. Aspek Kepribadian</h3>
              <p className="text-xs text-gray-500 mt-0.5">Rating 9 aspek kepribadian dari PAPI Kostick &amp; MBTI</p>
            </div>
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
                  Upload PAPI Kostick
                </button>
              </div>

              {hasUploadedPapi && (
                <div 
                  className={`relative p-1 rounded-xl transition-all ${dragActiveMbti ? 'bg-teal-100 border-2 border-teal-500 border-dashed scale-105' : 'bg-transparent border-2 border-transparent'}`}
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

        {/* Card 6: Generator Prompt AI */}
        <div className="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-indigo-900 pb-1">AI Prompt Generator</h3>
              <p className="text-sm text-indigo-700">Salin data di atas untuk dijadikan prompt ChatGPT atau Claude guna membuat Dinamika Psikologis.</p>
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

        {/* Card 7: Dinamika Psikologis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b gap-3">
            <div>
              <h3 className="text-lg font-medium text-gray-800">6. Dinamika Psikologis</h3>
              <p className="text-xs text-gray-500">Narasi dinamika psikologis komprehensif berdasarkan Pedoman Interpreter</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const autoText = generateGuideDinamikaPsikologis({
                  nama: safeState.clientData?.nama || 'Kandidat',
                  iqScore: safeState.iqScore,
                  iqLabel: safeState.iqLabel,
                  intelektual: safeState.intelektual,
                  sikapKerja: safeState.sikapKerja,
                  kepribadian: safeState.kepribadian
                });
                updateState('dinamikaPsikologis', '', autoText);
              }}
              className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              ✨ Isi Otomatis Sesuai Pedoman Interpreter
            </button>
          </div>
          <textarea
            rows={10}
            value={safeState.dinamikaPsikologis}
            onChange={(e) => updateState('dinamikaPsikologis', '', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed text-sm"
            placeholder="Ketik narasi dinamika psikologis di sini..."
          />
        </div>
      </div>
    </div>
  );
}
