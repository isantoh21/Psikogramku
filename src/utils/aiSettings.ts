export type AIProvider = 'koboillm' | 'sumopod' | 'custom' | 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  contextLength?: number;
  supportsVision?: boolean;
}

const STORAGE_KEY = 'psikogram_ai_settings';

export const PROVIDER_OPTIONS: { 
  id: AIProvider; 
  name: string; 
  description: string; 
  defaultModel: string; 
  defaultBaseUrl?: string;
  defaultApiKey?: string;
  placeholderKey: string;
  defaultContextLength?: number;
  supportsVision?: boolean;
}[] = [
  {
    id: 'sumopod',
    name: 'Sumopod AI (OpenAI Compatible)',
    description: 'Endpoint Sumopod v1 (glm-5.3-flash, deepseek-v4.1-flash) siap pakai saat Gemini limit.',
    defaultModel: 'glm-5.3-flash',
    defaultBaseUrl: 'https://ai.sumopod.com/v1',
    defaultApiKey: 'sk-DFe4pA8Vmm2p4OIr01pwJw',
    placeholderKey: 'sk-DFe4...',
    defaultContextLength: 128000,
    supportsVision: false
  },
  {
    id: 'koboillm',
    name: 'KoboiLLM (Custom Provider)',
    description: 'Endpoint Koboillm API v1 (gemini/gemini-3.1-flash-lite, Context: 1.05M, Supports Vision).',
    defaultModel: 'gemini/gemini-3.1-flash-lite',
    defaultBaseUrl: 'https://api.koboillm.com/v1',
    defaultApiKey: 'sk-wMaVBOWC1G69emLkQ5T9Ng',
    placeholderKey: 'sk-wMaV...',
    defaultContextLength: 1050000,
    supportsVision: true
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    description: 'Gunakan endpoint API pihak ketiga lainnya (Ollama, Together, Mistral, dll).',
    defaultModel: 'gemini/gemini-3.1-flash-lite',
    defaultBaseUrl: 'https://api.koboillm.com/v1',
    placeholderKey: 'API Key...',
    defaultContextLength: 1050000,
    supportsVision: true
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Default)',
    description: 'Menggunakan Gemini 2.5 Flash Lite / 3.5 dengan sistem auto-fallback saat kuota habis.',
    defaultModel: 'gemini-2.5-flash-lite',
    placeholderKey: 'AIzaSy... (Kosongkan jika menggunakan env server)'
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    description: 'Menggunakan GPT-4o-mini atau GPT-4o via OpenAI API Key.',
    defaultModel: 'gpt-4o-mini',
    placeholderKey: 'sk-proj-... atau sk-...'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Multi-Provider)',
    description: 'Akses Claude 3.5, Gemini, DeepSeek, & GPT dengan 1 API key OpenRouter.',
    defaultModel: 'google/gemini-2.0-flash-001',
    placeholderKey: 'sk-or-v1-...'
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Model open-source ultra-cepat (Llama 3.3 70B, Llama 3.2 Vision).',
    defaultModel: 'llama-3.3-70b-versatile',
    placeholderKey: 'gsk_...'
  }
];

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'koboillm',
  apiKey: 'sk-wMaVBOWC1G69emLkQ5T9Ng',
  model: 'gemini/gemini-3.1-flash-lite',
  baseUrl: 'https://api.koboillm.com/v1',
  contextLength: 1050000,
  supportsVision: true
};

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-update legacy expired key to the new active KoboiLLM key
      if (
        !parsed.apiKey || 
        parsed.apiKey === 'sk-1wbq_Yt3lZPxwkDRXZYQow' || 
        (parsed.provider === 'koboillm' && (!parsed.apiKey || parsed.apiKey.includes('1wbq')))
      ) {
        const updated = {
          ...parsed,
          provider: 'koboillm',
          apiKey: DEFAULT_AI_SETTINGS.apiKey,
          baseUrl: DEFAULT_AI_SETTINGS.baseUrl,
          model: DEFAULT_AI_SETTINGS.model
        };
        saveAISettings(updated);
        return updated;
      }
      // Auto-fill active key and baseUrl for Sumopod if missing
      if (parsed.provider === 'sumopod') {
        let changed = false;
        if (!parsed.apiKey || parsed.apiKey.trim() === '') {
          parsed.apiKey = 'sk-DFe4pA8Vmm2p4OIr01pwJw';
          changed = true;
        }
        if (!parsed.baseUrl || parsed.baseUrl.trim() === '') {
          parsed.baseUrl = 'https://ai.sumopod.com/v1';
          changed = true;
        }
        if (!parsed.model || parsed.model.trim() === '') {
          parsed.model = 'glm-5.3-flash';
          changed = true;
        }
        if (parsed.supportsVision !== false) {
          parsed.supportsVision = false;
          changed = true;
        }
        if (changed) {
          saveAISettings(parsed);
        }
      }
      return { ...DEFAULT_AI_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load AI settings from localStorage', e);
  }
  return DEFAULT_AI_SETTINGS;
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save AI settings to localStorage', e);
  }
}

export function getAIHeaders(): Record<string, string> {
  const settings = getAISettings();
  const headers: Record<string, string> = {
    'x-ai-provider': settings.provider || 'gemini'
  };
  if (settings.apiKey && settings.apiKey.trim()) {
    headers['x-ai-api-key'] = settings.apiKey.trim();
  }
  if (settings.model && settings.model.trim()) {
    headers['x-ai-model'] = settings.model.trim();
  }
  if (settings.baseUrl && settings.baseUrl.trim()) {
    headers['x-ai-base-url'] = settings.baseUrl.trim();
  }
  return headers;
}
