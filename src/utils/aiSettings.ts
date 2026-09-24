export type AIProvider = 'koboillm' | 'custom' | 'gemini' | 'openai' | 'openrouter' | 'groq';

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
  placeholderKey: string;
  defaultContextLength?: number;
  supportsVision?: boolean;
}[] = [
  {
    id: 'koboillm',
    name: 'KoboiLLM (Custom Provider)',
    description: 'Endpoint Koboillm API v1 (gemini/gemini-2.5-flash, Context: 1.05M, Supports Vision).',
    defaultModel: 'gemini/gemini-2.5-flash',
    defaultBaseUrl: 'https://api.koboillm.com/v1',
    placeholderKey: 'sk-1wbq...',
    defaultContextLength: 1050000,
    supportsVision: true
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    description: 'Gunakan endpoint API pihak ketiga lainnya (Ollama, Together, Mistral, dll).',
    defaultModel: 'gemini/gemini-2.5-flash',
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
  apiKey: 'sk-1wbq_Yt3lZPxwkDRXZYQow',
  model: 'gemini/gemini-2.5-flash',
  baseUrl: 'https://api.koboillm.com/v1',
  contextLength: 1050000,
  supportsVision: true
};

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
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
