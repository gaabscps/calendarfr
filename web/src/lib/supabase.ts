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

// Default options: persistSession=true, storage=localStorage. The session
// access_token therefore lives in localStorage and is reachable by any
// XSS-injected script. server/src/lib/sanitize.ts (the Tiptap HTML
// allowlist) is the canonical XSS gate — relax it only with extreme care.
// TODO(FEAT-032): when sanitize.ts migrates to web/, update this reference.
export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey);
