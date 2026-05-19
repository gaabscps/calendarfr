import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './supabase-types';

// Env reads use LITERAL `process.env.VITE_*` accesses, not a dynamic key
// lookup. Reason: Vite's `define` in vite.config.ts substitutes these literals
// at build time (so the browser bundle never references `process`, which is
// undefined there). A dynamic `process.env[key]` would not be rewritten and
// would crash on first render. In Jest, the same literals resolve to real
// process.env values at runtime — no special config needed.
function readEnv(name: string, value: string): string {
  if (!value || value.length < 10 || value.includes('<') || value.includes('TODO')) {
    throw new Error(`Missing ${name} — check .env`);
  }
  return value;
}

const url = readEnv('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL ?? '');
const anonKey = readEnv('VITE_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY ?? '');

// Default options: persistSession=true, storage=localStorage. The session
// access_token therefore lives in localStorage and is reachable by any
// XSS-injected script. server/src/lib/sanitize.ts (the Tiptap HTML
// allowlist) is the canonical XSS gate — relax it only with extreme care.
// TODO(FEAT-032): when sanitize.ts migrates to web/, update this reference.
export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey);
