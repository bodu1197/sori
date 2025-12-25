import { createClient } from '@supabase/supabase-js';

// Trim whitespace/newlines from env vars (fixes CRLF issues)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'sori-auth',
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
