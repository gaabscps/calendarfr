import type { Session } from '@supabase/supabase-js';

export interface UseSessionState {
  session: Session | null;
  loading: boolean;
}
