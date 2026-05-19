import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import type { UseSessionState } from '../types.js';

export function useSession(): UseSessionState {
  const [state, setState] = useState<UseSessionState>({ session: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setState({ session: data.session, loading: false });
      })
      .catch(() => {
        // onAuthStateChange will still fire INITIAL_SESSION — leave state until then.
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState({ session, loading: false });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
