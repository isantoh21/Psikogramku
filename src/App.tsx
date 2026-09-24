import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { FormInput } from './components/FormInput';
import { PreviewPsikogram } from './components/PreviewPsikogram';
import { FormInputSD } from './components/FormInputSD';
import { PreviewPsikogramSD } from './components/PreviewPsikogramSD';
import { FormInputStaff } from './components/FormInputStaff';
import { PreviewPsikogramStaff } from './components/PreviewPsikogramStaff';
import { MarkItDown } from './components/MarkItDown';
import { HasilBEI } from './components/HasilBEI';
import { AISettingsModal } from './components/AISettingsModal';
import { getAISettings, AISettings } from './utils/aiSettings';
import { AppState, SdAppState, StaffAppState, INITIAL_STATE, INITIAL_SD_STATE, INITIAL_STAFF_STATE } from './types';
import { FileText, Menu, X, Briefcase, GraduationCap, Users, FileDown, Settings, Bot, Sparkles } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const activeApp = location.pathname.includes('/markitdown') 
    ? 'markitdown' 
    : location.pathname.includes('/bei') 
      ? 'bei' 
      : location.pathname.includes('/staff') 
        ? 'staff' 
        : location.pathname.includes('/sd') 
          ? 'sd' 
          : 'penjurusan';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(getAISettings());

  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [sdState, setSdState] = useState<SdAppState>(INITIAL_SD_STATE);
  const [staffState, setStaffState] = useState<StaffAppState>(INITIAL_STAFF_STATE);
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

    setIsLoaded(true);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (isLoaded) {
      if (state) localStorage.setItem('psikogramState', JSON.stringify(state));
      if (sdState) localStorage.setItem('psikogramSdState', JSON.stringify(sdState));
      if (staffState) localStorage.setItem('psikogramStaffState', JSON.stringify(staffState));
    }
  }, [state, sdState, staffState, isLoaded]);

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
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans print:bg-white overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Admin Panel Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 flex-shrink-0 bg-gray-900 text-white transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-0 lg:translate-x-0 overflow-hidden'}
      `}>
        <div className="w-72 h-full flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-lg whitespace-nowrap">Admin Panel</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Generator Psikogram</p>
            <nav className="space-y-2">
              <Link
                to="/penjurusan"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeApp === 'penjurusan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left whitespace-nowrap">Tes Minat Bakat Penjurusan</span>
              </Link>
              <Link
                to="/sd"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeApp === 'sd' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <GraduationCap className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left whitespace-nowrap">Tes Minat Bakat SD</span>
              </Link>
              <Link
                to="/staff"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeApp === 'staff' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left whitespace-nowrap">Tes Seleksi Staff</span>
              </Link>
              <Link
                to="/markitdown"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeApp === 'markitdown' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <FileDown className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left whitespace-nowrap">Mark It Down</span>
              </Link>
              <Link
                to="/bei"
                onClick={() => setIsSidebarOpen(window.innerWidth >= 1024)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeApp === 'bei' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left whitespace-nowrap">Hasil BEI</span>
              </Link>
            </nav>
          </div>

          {/* AI Settings button in sidebar footer */}
          <div className="p-4 border-t border-gray-800 bg-gray-950/40">
            <button
              onClick={() => setIsAISettingsOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-gray-200 transition-all group"
            >
              <div className="flex items-center space-x-2.5">
                <Bot className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                <span className="text-xs font-medium">Pengaturan AI</span>
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                {aiSettings.provider}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header - Hidden on print */}
        <header className="bg-indigo-700 text-white shadow-md print:hidden flex-none z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 text-white hover:text-gray-200 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {activeApp === 'penjurusan' ? 'Psikogram Tes Minat Bakat Penjurusan' : activeApp === 'sd' ? 'Psikogram Tes Minat Bakat SD' : activeApp === 'markitdown' ? 'Mark It Down Converter' : activeApp === 'bei' ? 'Hasil BEI' : 'Psikogram Tes Seleksi Staff'}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAISettingsOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-800/90 hover:bg-indigo-900 border border-indigo-400/40 text-xs sm:text-sm font-medium text-white shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Konfigurasi AI Provider & API Key"
              >
                <Bot className="w-4 h-4 text-indigo-300" />
                <span className="hidden sm:inline">Pengaturan AI</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider font-semibold font-mono">
                  {aiSettings.provider}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 overflow-hidden">
          {activeApp === 'markitdown' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <MarkItDown />
            </div>
          ) : activeApp === 'bei' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <HasilBEI />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:block h-full">
              
              {/* Left Column: Form Input (Hidden on print) */}
              <div className="xl:col-span-5 2xl:col-span-4 print:hidden h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  <Route path="/staff" element={
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <FormInputStaff state={staffState} setState={setStaffState} />
                    </div>
                  } />
                  <Route path="*" element={<Navigate to="/penjurusan" replace />} />
                </Routes>
              </div>

              {/* Right Column: Live Preview */}
              <div className="xl:col-span-7 2xl:col-span-8 print:col-span-12 print:block flex justify-center h-full overflow-y-auto print:h-auto print:overflow-visible custom-scrollbar bg-gray-200 print:bg-white rounded-xl shadow-inner border border-gray-200"> 
                 <div className="my-8 print:my-0 shadow-xl print:shadow-none bg-white">
                   <Routes>
                     <Route path="/penjurusan" element={<PreviewPsikogram state={state} />} />
                     <Route path="/sd" element={<PreviewPsikogramSD state={sdState} />} />
                     <Route path="/staff" element={<PreviewPsikogramStaff state={staffState} />} />
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
