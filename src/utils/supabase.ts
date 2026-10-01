import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://ucgpmljuplocjmbspnag.supabase.co';

export const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZ3BtbGp1cGxvY2ptYnNwbmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTYwNzMsImV4cCI6MjEwNTg5MjA3M30.DTWsgiS8auTN81k1_5RUYILw92ka8yUpmPU2EqmuKx8';

export const BUCKET_NAME = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_BUCKET) || 
  'psikogram-files';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export interface SupabaseUploadResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  error?: string;
}

/**
 * Uploads a file to Supabase Storage.
 * Generates a unique sanitized filename to prevent name collisions.
 */
export async function uploadFileToSupabase(
  file: File | Blob,
  fileName?: string,
  folder = 'documents'
): Promise<SupabaseUploadResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client belum dikonfigurasi.'
    };
  }

  try {
    const rawName = fileName || (file instanceof File ? file.name : 'upload.bin');
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Storage Upload Warning]', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      publicUrl: urlData?.publicUrl,
      path: data.path
    };
  } catch (err: any) {
    console.warn('[Supabase Storage Upload Exception]', err);
    return {
      success: false,
      error: err?.message || 'Gagal mengunggah file ke Supabase Storage'
    };
  }
}
