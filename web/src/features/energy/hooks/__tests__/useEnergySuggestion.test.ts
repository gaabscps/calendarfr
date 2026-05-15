import { describe, it, expect } from '@jest/globals';
import { renderHook } from '@testing-library/react';

import { useEnergySuggestion } from '../useEnergySuggestion.js';

describe('useEnergySuggestion', () => {
  it('retorna null para texto vazio', () => {
    const { result } = renderHook(() => useEnergySuggestion(''));
    expect(result.current).toBeNull();
  });

  it('retorna emoji sugerido para texto matched', () => {
    const { result } = renderHook(() => useEnergySuggestion('Reunião'));
    expect(result.current).toBe('🤝');
  });

  it('memoiza por texto — não re-computa se text não mudar', () => {
    const { result, rerender } = renderHook(({ text }) => useEnergySuggestion(text), {
      initialProps: { text: 'foco' },
    });
    const first = result.current;
    rerender({ text: 'foco' });
    expect(result.current).toBe(first);
  });

  it('re-computa quando texto muda', () => {
    const { result, rerender } = renderHook(({ text }) => useEnergySuggestion(text), {
      initialProps: { text: 'foco' },
    });
    expect(result.current).toBe('🎯');
    rerender({ text: 'reunião' });
    expect(result.current).toBe('🤝');
  });
});
