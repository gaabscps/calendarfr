/**
 * Converts any Supabase error (auth, query, RPC) into a friendly PT-BR message.
 *
 * Heuristic: substring matching against err.message (lowercased). Supabase
 * does not expose stable error codes for auth/postgrest errors — only strings.
 * If Supabase renames a known string in a minor update, this util degrades
 * silently to the generic fallback. A contract test in
 * e2e/real/supabase-error-contract.spec.ts provokes each mapped error against
 * the real Supabase instance and asserts the substring still matches —
 * that's the safety net.
 */
export function supabaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object' || !('message' in err)) {
    return 'Algo deu errado. Tente novamente.';
  }
  const message = String(err.message).toLowerCase();

  // Auth
  if (message.includes('invalid login credentials')) return 'Email ou senha incorretos.';
  if (message.includes('user already registered')) return 'Este email já tem conta. Faça login.';
  if (message.includes('email') && message.includes('confirm')) {
    return 'Confirme seu email antes de entrar.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns minutos.';
  }

  // Postgres / RLS (prep for FEAT-032)
  if (message.includes('jwt expired')) return 'Sua sessão expirou. Faça login novamente.';
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Você não tem acesso a esse recurso.';
  }

  return 'Algo deu errado. Tente novamente.';
}
