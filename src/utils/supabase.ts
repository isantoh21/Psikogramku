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

/**
 * Purges files older than maxAgeDays (default: 30 days / 1 month) from Supabase Storage.
 */
export async function purgeOldFiles(
  maxAgeDays = 30
): Promise<{ success: boolean; purgedCount: number; purgedFiles: string[]; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, purgedCount: 0, purgedFiles: [], error: 'Supabase belum dikonfigurasi' };
  }

  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const folders = ['ist', 'kraepelin', 'papi', 'mbti', 'bei', 'documents', 'markitdown', 'psikotes', ''];
  const deletedFiles: string[] = [];

  try {
    for (const folder of folders) {
      const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 100 });
      if (error || !files) continue;

      const toRemove: string[] = [];
      for (const f of files) {
        if (!f.name || f.name === '.emptyFolderPlaceholder') continue;

        let fileTime = f.created_at ? new Date(f.created_at).getTime() : 0;
        const match = f.name.match(/^(\d{13})_/);
        if (match) {
          fileTime = Number(match[1]);
        }

        if (fileTime && fileTime < cutoffTime) {
          toRemove.push(folder ? `${folder}/${f.name}` : f.name);
        }
      }

      if (toRemove.length > 0) {
        const { error: delErr } = await supabase.storage.from(BUCKET_NAME).remove(toRemove);
        if (!delErr) {
          deletedFiles.push(...toRemove);
        }
      }
    }

    return {
      success: true,
      purgedCount: deletedFiles.length,
      purgedFiles: deletedFiles
    };
  } catch (err: any) {
    console.warn('[Supabase Storage Purge Exception]', err);
    return {
      success: false,
      purgedCount: deletedFiles.length,
      purgedFiles: deletedFiles,
      error: err?.message || 'Gagal membersihkan file lama'
    };
  }
}
