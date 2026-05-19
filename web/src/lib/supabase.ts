import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './supabase-types';

type EnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY';

// process.env instead of import.meta.env: SWC CJS transform used by Jest does not
// support import.meta syntax; process.env is the cross-environment fallback.
function readEnv(key: EnvKey): string {
  const value: string = process.env[key] ?? '';
  if (value.length < 10 || value.includes('<') || value.includes('TODO')) {
    throw new Error(`Missing ${key} — check .env`);
  }
  return value;
}

const url = readEnv('VITE_SUPABASE_URL');
const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey);
