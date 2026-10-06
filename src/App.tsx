import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { FormInput } from './components/FormInput';
import { PreviewPsikogram } from './components/PreviewPsikogram';
import { FormInputSD } from './components/FormInputSD';
import { PreviewPsikogramSD } from './components/PreviewPsikogramSD';
import { FormInputStaff } from './components/FormInputStaff';
import { PreviewPsikogramStaff } from './components/PreviewPsikogramStaff';
import { FormInputStaffAlu } from './components/FormInputStaffAlu';
import { PreviewPsikogramStaffAlu } from './components/PreviewPsikogramStaffAlu';
import { FormInputManajer } from './components/FormInputManajer';
import { PreviewPsikogramManajer } from './components/PreviewPsikogramManajer';
import { FormInputCfit3 } from './components/FormInputCfit3';
import { PreviewPsikogramCfit3 } from './components/PreviewPsikogramCfit3';
import { MarkItDown } from './components/MarkItDown';
import { HasilBEI } from './components/HasilBEI';
import { AISettingsModal } from './components/AISettingsModal';
import { getAISettings, AISettings } from './utils/aiSettings';
import { AppState, SdAppState, StaffAppState, ManagerAppState, StaffAluAppState, Cfit3AppState, INITIAL_STATE, INITIAL_SD_STATE, INITIAL_STAFF_STATE, INITIAL_MANAGER_STATE, INITIAL_STAFF_ALU_STATE, INITIAL_CFIT3_STATE } from './types';
import { FileText, Menu, X, Briefcase, GraduationCap, Users, FileDown, Settings, Bot, Sparkles, ShieldCheck, Building2, Award } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const activeApp = location.pathname.includes('/markitdown') 
    ? 'markitdown' 
    : location.pathname.includes('/bei') 
      ? 'bei' 
      : location.pathname.includes('/manajer')
        ? 'manajer'
        : location.pathname.includes('/staff-alu')
          ? 'staff-alu'
          : location.pathname.includes('/staff') 
            ? 'staff' 
            : location.pathname.includes('/sd') 
              ? 'sd' 
              : location.pathname.includes('/cfit3')
                ? 'cfit3'
                : 'penjurusan';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(getAISettings());

  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [sdState, setSdState] = useState<SdAppState>(INITIAL_SD_STATE);
  const [staffState, setStaffState] = useState<StaffAppState>(INITIAL_STAFF_STATE);
  const [staffAluState, setStaffAluState] = useState<StaffAluAppState>(INITIAL_STAFF_ALU_STATE);
  const [managerState, setManagerState] = useState<ManagerAppState>(INITIAL_MANAGER_STATE);
  const [cfit3State, setCfit3State] = useState<Cfit3AppState>(INITIAL_CFIT3_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('psikogramState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setState({
            ...INITIAL_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_STATE.clientData,
              ...(parsed.clientData || {})
            },
            istScores: {
              ...INITIAL_STATE.istScores,
              ...(parsed.istScores || {})
            },
            personalityScores: {
              ...INITIAL_STATE.personalityScores,
              ...(parsed.personalityScores || {})
            },
            interests: Array.isArray(parsed.interests) ? parsed.interests : INITIAL_STATE.interests,
            learningStyle: typeof parsed.learningStyle === 'string' ? parsed.learningStyle : '',
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    
    const savedSd = localStorage.getItem('psikogramSdState');
    if (savedSd) {
      try {
        const parsed = JSON.parse(savedSd);
        if (parsed && typeof parsed === 'object') {
          setSdState({
            ...INITIAL_SD_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_SD_STATE.clientData,
              ...(parsed.clientData || {})
            },
            cfitScores: {
              ...INITIAL_SD_STATE.cfitScores,
              ...(parsed.cfitScores || {})
            },
            kecerdasanUmum: {
              ...INITIAL_SD_STATE.kecerdasanUmum,
              ...(parsed.kecerdasanUmum || {})
            },
            bakatKemampuan: {
              ...INITIAL_SD_STATE.bakatKemampuan,
              ...(parsed.bakatKemampuan || {})
            },
            kepribadian: {
              ...INITIAL_SD_STATE.kepribadian,
              ...(parsed.kepribadian || {})
            },
            interests: Array.isArray(parsed.interests) ? parsed.interests : INITIAL_SD_STATE.interests,
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage SD', e);
      }
    }

    const savedStaff = localStorage.getItem('psikogramStaffState');
    if (savedStaff) {
      try {
        const parsed = JSON.parse(savedStaff);
        if (parsed && typeof parsed === 'object') {
          setStaffState({
            ...INITIAL_STAFF_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_STAFF_STATE.clientData,
              ...(parsed.clientData || {})
            },
            istSubscores: {
              ...INITIAL_STAFF_STATE.istSubscores,
              ...(parsed.istSubscores || {})
            },
            aspekScores: {
              ...INITIAL_STAFF_STATE.aspekScores,
              ...(parsed.aspekScores || {})
            },
            aspekKategori: {
              ...INITIAL_STAFF_STATE.aspekKategori,
              ...(parsed.aspekKategori || {})
            },
            intelektual: {
              ...INITIAL_STAFF_STATE.intelektual,
              ...(parsed.intelektual || {})
            },
            sikapKerja: {
              ...INITIAL_STAFF_STATE.sikapKerja,
              ...(parsed.sikapKerja || {})
            },
            kepribadian: {
              ...INITIAL_STAFF_STATE.kepribadian,
              ...(parsed.kepribadian || {})
            },
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage Staff', e);
      }
    }

    const savedStaffAlu = localStorage.getItem('psikogramStaffAluState');
    if (savedStaffAlu) {
      try {
        const parsed = JSON.parse(savedStaffAlu);
        if (parsed && typeof parsed === 'object') {
          setStaffAluState({
            ...INITIAL_STAFF_ALU_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_STAFF_ALU_STATE.clientData,
              ...(parsed.clientData || {})
            },
            cfitScores: {
              ...INITIAL_STAFF_ALU_STATE.cfitScores,
              ...(parsed.cfitScores || {})
            },
            tkdScores: {
              ...INITIAL_STAFF_ALU_STATE.tkdScores,
              ...(parsed.tkdScores || {})
            },
            aspekScores: {
              ...INITIAL_STAFF_ALU_STATE.aspekScores,
              ...(parsed.aspekScores || {})
            },
            aspekKategori: {
              ...INITIAL_STAFF_ALU_STATE.aspekKategori,
              ...(parsed.aspekKategori || {})
            },
            intelektual: {
              ...INITIAL_STAFF_ALU_STATE.intelektual,
              ...(parsed.intelektual || {})
            },
            sikapKerja: {
              ...INITIAL_STAFF_ALU_STATE.sikapKerja,
              ...(parsed.sikapKerja || {})
            },
            kepribadian: {
              ...INITIAL_STAFF_ALU_STATE.kepribadian,
              ...(parsed.kepribadian || {})
            },
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage Staff ALU', e);
      }
    }

    const savedManager = localStorage.getItem('psikogramManagerState');
    if (savedManager) {
      try {
        const parsed = JSON.parse(savedManager);
        if (parsed && typeof parsed === 'object') {
          setManagerState({
            ...INITIAL_MANAGER_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_MANAGER_STATE.clientData,
              ...(parsed.clientData || {})
            },
            istSubscores: {
              ...INITIAL_MANAGER_STATE.istSubscores,
              ...(parsed.istSubscores || {})
            },
            aspekScores: {
              ...INITIAL_MANAGER_STATE.aspekScores,
              ...(parsed.aspekScores || {})
            },
            aspekKategori: {
              ...INITIAL_MANAGER_STATE.aspekKategori,
              ...(parsed.aspekKategori || {})
            },
            intelektual: {
              ...INITIAL_MANAGER_STATE.intelektual,
              ...(parsed.intelektual || {})
            },
            sikapKerja: {
              ...INITIAL_MANAGER_STATE.sikapKerja,
              ...(parsed.sikapKerja || {})
            },
            kepribadian: {
              ...INITIAL_MANAGER_STATE.kepribadian,
              ...(parsed.kepribadian || {})
            },
            kepemimpinan: {
              ...INITIAL_MANAGER_STATE.kepemimpinan,
              ...(parsed.kepemimpinan || {})
            },
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage Manager', e);
      }
    }

    const savedCfit3 = localStorage.getItem('psikogramCfit3State');
    if (savedCfit3) {
      try {
        const parsed = JSON.parse(savedCfit3);
        if (parsed && typeof parsed === 'object') {
          setCfit3State({
            ...INITIAL_CFIT3_STATE,
            ...parsed,
            clientData: {
              ...INITIAL_CFIT3_STATE.clientData,
              ...(parsed.clientData || {})
            },
            cfitScores: {
              ...INITIAL_CFIT3_STATE.cfitScores,
              ...(parsed.cfitScores || {})
            },
            rawAnswers: {
              ...INITIAL_CFIT3_STATE.rawAnswers,
              ...(parsed.rawAnswers || {})
            },
            kecerdasanUmum: {
              ...INITIAL_CFIT3_STATE.kecerdasanUmum,
              ...(parsed.kecerdasanUmum || {})
            },
            bakatKemampuan: {
              ...INITIAL_CFIT3_STATE.bakatKemampuan,
              ...(parsed.bakatKemampuan || {})
            },
            rmibInterests: Array.isArray(parsed.rmibInterests) ? parsed.rmibInterests : INITIAL_CFIT3_STATE.rmibInterests,
            dreamJobs: Array.isArray(parsed.dreamJobs) ? parsed.dreamJobs : INITIAL_CFIT3_STATE.dreamJobs,
          });
        }
      } catch (e) {
        console.error('Failed to parse local storage CFIT3', e);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (isLoaded) {
      if (state) localStorage.setItem('psikogramState', JSON.stringify(state));
      if (sdState) localStorage.setItem('psikogramSdState', JSON.stringify(sdState));
      if (staffState) localStorage.setItem('psikogramStaffState', JSON.stringify(staffState));
      if (staffAluState) localStorage.setItem('psikogramStaffAluState', JSON.stringify(staffAluState));
      if (managerState) localStorage.setItem('psikogramManagerState', JSON.stringify(managerState));
      if (cfit3State) localStorage.setItem('psikogramCfit3State', JSON.stringify(cfit3State));
    }
  }, [state, sdState, staffState, staffAluState, managerState, cfit3State, isLoaded]);

  const updateState = (section: keyof AppState, field: string, value: any) => {
    if (section === 'recommendation' || section === 'interests' || section === 'learningStyle') {
      setState(prev => ({ ...prev, [section]: value }));
      return;
    }
    setState(prev => {
      const baseState = prev || INITIAL_STATE;
      const baseSection = (baseState[section] as Record<string, any>) || {};
      return {
        ...baseState,
        [section]: {
          ...baseSection,
          [field]: value
        }
      };
    });
  };

  const resetForm = () => {
    setState(INITIAL_STATE);
  };

  const exportToDocx = () => {
    const element = document.getElementById('psikogram-preview');
    if (!element) return;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Psikogram DOCX</title>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const html = header + element.innerHTML + footer;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Psikogram_${state?.clientData?.fullName || 'Klien'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans print:bg-white overflow-hidden print:overflow-visible print:h-auto print:block">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden print:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Admin Panel Sidebar - Modern Sleek Obsidian */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 flex-shrink-0 bg-[#0b0f19] text-slate-200 transition-all duration-300 ease-in-out print:hidden border-r border-slate-800/80 shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 overflow-hidden'}
      `}>
        <div className="w-72 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-white tracking-tight block leading-tight">Psikogram Studio</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">An-Nur Psycho Center</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Modul Laporan</p>
            <nav className="space-y-1">
              <Link
                to="/penjurusan"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'penjurusan' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Tes Minat Bakat Penjurusan</span>
              </Link>
              <Link
                to="/sd"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'sd' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <GraduationCap className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Tes Minat Bakat SD</span>
              </Link>
              <Link
                to="/cfit3"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'cfit3' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Award className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Laporan Panti Clarak</span>
              </Link>
              <Link
                to="/staff"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'staff' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Tes Seleksi Staff</span>
              </Link>
              <Link
                to="/staff-alu"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'staff-alu' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Seleksi Staf (ALU)</span>
              </Link>
              <Link
                to="/manajer"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'manajer' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Tes Seleksi Manajer</span>
              </Link>
              <Link
                to="/markitdown"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'markitdown' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <FileDown className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Mark It Down</span>
              </Link>
              <Link
                to="/bei"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeApp === 'bei' 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="text-left whitespace-nowrap">Hasil BEI</span>
              </Link>
            </nav>
          </div>

          {/* AI Settings Footer Widget */}
          <div className="p-4 border-t border-slate-800/80 bg-[#070a12]">
            <button
              onClick={() => setIsAISettingsOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white transition-all group shadow-2xs"
            >
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Bot className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium">Pengaturan AI</span>
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                {aiSettings.provider}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 print:block print:h-auto print:overflow-visible">
        
        {/* Header - Clean Modern Topbar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-2xs print:hidden flex-none z-10 transition-colors">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate flex items-center gap-2">
                  <span>
                    {activeApp === 'penjurusan' ? 'Psikogram Tes Minat Bakat Penjurusan' : activeApp === 'sd' ? 'Psikogram Tes Minat Bakat SD' : activeApp === 'cfit3' ? 'Laporan Panti Clarak (1 Lembar)' : activeApp === 'markitdown' ? 'Mark It Down Converter' : activeApp === 'bei' ? 'Hasil BEI' : activeApp === 'manajer' ? 'Psikogram Tes Seleksi Manajer' : activeApp === 'staff-alu' ? 'Seleksi Staf (Alam Lestari Unggul)' : 'Psikogram Tes Seleksi Staff'}
                  </span>
                  <span className="hidden md:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Dokumen A4
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAISettingsOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 shadow-2xs transition-all active:scale-[0.98]"
                title="Konfigurasi AI Provider & API Key"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <Bot className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">AI Config</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 uppercase tracking-wider font-semibold font-mono shadow-2xs">
                  {aiSettings.provider}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Canvas Stage */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 print:p-0 print:m-0 overflow-hidden print:overflow-visible print:h-auto print:block">
          {activeApp === 'markitdown' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <MarkItDown />
            </div>
          ) : activeApp === 'bei' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <HasilBEI />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 print:block h-full print:h-auto">
              
              {/* Left Column: Form Input (Hidden on print) */}
              <div className="xl:col-span-5 2xl:col-span-4 print:hidden h-full bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
                <Routes>
                  <Route path="/penjurusan" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInput state={state} updateState={updateState} resetForm={resetForm} exportToDocx={exportToDocx} />
                    </div>
                  } />
                  <Route path="/sd" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputSD state={sdState} setState={setSdState} />
                    </div>
                  } />
                  <Route path="/cfit3" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputCfit3 state={cfit3State} setState={setCfit3State} />
                    </div>
                  } />
                  <Route path="/staff" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputStaff state={staffState} setState={setStaffState} />
                    </div>
                  } />
                  <Route path="/staff-alu" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputStaffAlu state={staffAluState} setState={setStaffAluState} />
                    </div>
                  } />
                  <Route path="/manajer" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputManajer state={managerState} setState={setManagerState} />
                    </div>
                  } />
                  <Route path="*" element={<Navigate to="/penjurusan" replace />} />
                </Routes>
              </div>

              {/* Right Column: Live Preview Canvas */}
              <div className="xl:col-span-7 2xl:col-span-8 print:col-span-12 print:block flex justify-center h-full overflow-y-auto print:h-auto print:overflow-visible custom-scrollbar bg-[#f1f5f9] print:bg-white rounded-2xl border border-slate-200/70"> 
                 <div className="my-6 print:my-0 shadow-lg shadow-slate-300/40 print:shadow-none bg-white rounded-xs border border-slate-200/60 print:border-none">
                   <Routes>
                     <Route path="/penjurusan" element={<PreviewPsikogram state={state} />} />
                     <Route path="/sd" element={<PreviewPsikogramSD state={sdState} />} />
                     <Route path="/cfit3" element={<PreviewPsikogramCfit3 state={cfit3State} />} />
                     <Route path="/staff" element={<PreviewPsikogramStaff state={staffState} />} />
                     <Route path="/staff-alu" element={<PreviewPsikogramStaffAlu state={staffAluState} />} />
                     <Route path="/manajer" element={<PreviewPsikogramManajer state={managerState} />} />
                     <Route path="*" element={<Navigate to="/penjurusan" replace />} />
                   </Routes>
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Provider & API Key Settings Modal */}
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        onSaved={() => setAiSettings(getAISettings())}
      />

      {/* Custom Scrollbar CSS specifically for the scrollable areas */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
