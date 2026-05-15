import { useMemo } from 'react';

import { suggestEnergy } from '../lib/suggest.js';

/**
 * Memoiza a sugestão de emoji para um texto de slot.
 * Roda síncrono (regex sobre string curta), só re-computa quando text muda.
 */
export function useEnergySuggestion(text: string): string | null {
  return useMemo(() => suggestEnergy(text), [text]);
}
