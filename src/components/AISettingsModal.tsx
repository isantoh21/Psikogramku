import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, RefreshCw, Sparkles, Key, 
  Cpu, Globe, ExternalLink, Zap, CheckCircle2, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { 
  AISettings, 
  AIProvider, 
  PROVIDER_OPTIONS, 
  getAISettings, 
  saveAISettings 
} from '../utils/aiSettings';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AISettingsModal({ isOpen, onClose, onSaved }: AISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(getAISettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getAISettings();
      setSettings(current);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOption = PROVIDER_OPTIONS.find(p => p.id === settings.provider) || PROVIDER_OPTIONS[0];

  const handleProviderChange = (provider: AIProvider) => {
    const opt = PROVIDER_OPTIONS.find(p => p.id === provider);
    setSettings(prev => ({
      ...prev,
      provider,
      model: opt?.defaultModel || '',
      baseUrl: opt?.defaultBaseUrl !== undefined ? opt.defaultBaseUrl : (provider === 'custom' ? (prev.baseUrl || 'https://api.openai.com/v1') : ''),
      contextLength: opt?.defaultContextLength !== undefined ? opt.defaultContextLength : (prev.contextLength || 1050000),
      supportsVision: opt?.supportsVision !== undefined ? opt.supportsVision : true
    }));
    setTestResult(null);
    setFetchedModels([]);
  };

  const handleFetchModels = async () => {
    const baseUrl = settings.baseUrl || (settings.provider === 'koboillm' ? 'https://api.koboillm.com/v1' : '');
    if (!baseUrl) {
      setTestResult({
        success: false,
        message: 'Masukkan Base URL terlebih dahulu untuk auto fetch model.'
      });
      return;
    }

    setIsFetchingModels(true);
    try {
      const res = await fetch('/api/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: settings.apiKey
        })
      });
      const data = await res.json();
      if (res.ok && data.models && data.models.length > 0) {
        const modelNames = data.models.map((m: any) => m.id || m.name);
        setFetchedModels(modelNames);
        // Auto select first model if current is empty or auto
        if (!settings.model || settings.model === 'auto' || !modelNames.includes(settings.model)) {
          setSettings(prev => ({ ...prev, model: modelNames[0] }));
        }
        setTestResult({
          success: true,
          message: `Berhasil mengambil ${modelNames.length} model dari server: ${modelNames.join(', ')}`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Tidak ada model yang ditemukan dari endpoint /models.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Gagal auto fetch model: ${err?.message}`
      });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiConfig: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            baseUrl: settings.baseUrl
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Koneksi ke ${currentOption.name} berhasil!`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Gagal terhubung ke penyedia AI. Periksa API key atau kuota.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Gagal melakukan tes koneksi jaringan.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveAISettings(settings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      if (onSaved) onSaved();
      onClose();
    }, 600);
  };

  const isCustomOrKoboi = settings.provider === 'custom' || settings.provider === 'koboillm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/50 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pengaturan Penyedia AI</h2>
              <p className="text-xs text-indigo-200">Gunakan KoboiLLM, Gemini, OpenAI, atau Custom Provider</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-gray-700 custom-scrollbar">
          
          {/* Provider Selection */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Pilih Penyedia AI (AI Provider)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROVIDER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleProviderChange(opt.id)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    settings.provider === opt.id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-gray-900">{opt.name}</span>
                    {settings.provider === opt.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Base URL Input (For Custom or KoboiLLM) */}
          {isCustomOrKoboi && (
            <div>
              <label className="font-semibold text-gray-800 flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Base URL Endpoint</span>
                </div>
                {settings.provider === 'koboillm' && (
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Preset Aktif
                  </span>
                )}
              </label>
              <input
                type="text"
                value={settings.baseUrl || ''}
                onChange={e => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.koboillm.com/v1"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono text-xs transition"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Endpoint API yang mendukung format OpenAI Chat Completions (<code className="text-gray-700 font-semibold">/chat/completions</code> &amp; <code className="text-gray-700 font-semibold">/models</code>).
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-gray-800 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>API Key</span>
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center space-x-1"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showApiKey ? 'Sembunyikan' : 'Lihat'}</span>
              </button>
            </div>
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.apiKey || ''}
              onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder={currentOption.placeholderKey}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono text-xs transition"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Kunci API disimpan secara aman di browser lokal Anda.
            </p>
          </div>

          {/* Model Selection with Auto-fetch button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-gray-800 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Nama Model</span>
              </label>
              {isCustomOrKoboi && (
                <button
                  type="button"
                  disabled={isFetchingModels}
                  onClick={handleFetchModels}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 hover:underline disabled:opacity-50"
                  title="Ambil daftar model secara otomatis dari server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                  <span>{isFetchingModels ? 'Mengambil...' : 'Auto Fetch Model'}</span>
                </button>
              )}
            </div>

            <input
              type="text"
              value={settings.model || ''}
              onChange={e => setSettings(prev => ({ ...prev, model: e.target.value }))}
              placeholder={currentOption.defaultModel}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono text-xs transition"
            />

            {/* Quick Model Chips or Fetched Models */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {fetchedModels.length > 0 ? (
                fetchedModels.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettings(p => ({ ...p, model: m }))}
                    className={`px-2 py-1 text-xs rounded-md border font-mono transition ${
                      settings.model === m 
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold' 
                        : 'bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 border-gray-200 text-gray-800'
                    }`}
                  >
                    {m}
                  </button>
                ))
              ) : (
                isCustomOrKoboi ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => setSettings(p => ({ ...p, model: 'gemini/gemini-2.5-flash' }))}
                      className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-md border border-gray-200 font-mono"
                    >
                      gemini/gemini-2.5-flash (Default KoboiLLM)
                    </button>
                  </>
                ) : null
              )}
            </div>
          </div>

          {/* Advanced Info: Context Length & Vision Support */}
          {isCustomOrKoboi && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Context Length</label>
                <input
                  type="number"
                  value={settings.contextLength || 1050000}
                  onChange={e => setSettings(prev => ({ ...prev, contextLength: parseInt(e.target.value, 10) || 1050000 }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                />
                <span className="text-[10px] text-gray-500">Mendukung hingga 1.05M token</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Vision / Multimodal</label>
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="visionCheck"
                    checked={settings.supportsVision ?? true}
                    onChange={e => setSettings(prev => ({ ...prev, supportsVision: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="visionCheck" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Mendukung Gambar &amp; Dokumen (Y)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Connection Test Result */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 text-xs ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestConnection}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 border border-gray-300 transition disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menghubungi AI...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Tes Koneksi</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-200 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-medium text-white transition shadow-sm ${
                saveSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <span>Terapkan Pengaturan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
