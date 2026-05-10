/**
 * Unit tests for lib/prefixCycle.ts.
 *
 * Covers: AC-008 (cycle order • → → → — → ★ → •), AC-009 (wrap-around).
 *
 * Pure function — no DOM, no React. Runs in Node.
 */

import { nextPrefix, PREFIX_ORDER } from '../prefixCycle.js';

describe('PREFIX_ORDER', () => {
  it('contains exactly 4 entries in canonical order', () => {
    expect(PREFIX_ORDER).toEqual(['•', '→', '—', '★']);
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(PREFIX_ORDER)).toBe(true);
  });

  it('rejects mutation attempts (strict-mode throws or no-op)', () => {
    // Document strict-mode contract: Object.freeze + strict-mode (default
    // in ES modules) throws TypeError on assignment. Otherwise the assign
    // is silently dropped. Either way the array stays canonical.
    const before = [...PREFIX_ORDER];
    try {
      // @ts-expect-error — runtime check; TS forbids this at compile time
      PREFIX_ORDER[0] = '★';
    } catch {
      // strict-mode TypeError — expected
    }
    expect([...PREFIX_ORDER]).toEqual(before);
  });
});

describe('nextPrefix', () => {
  it('cycles • → →', () => {
    expect(nextPrefix('•')).toBe('→');
  });

  it('cycles → → —', () => {
    expect(nextPrefix('→')).toBe('—');
  });

  it('cycles — → ★', () => {
    expect(nextPrefix('—')).toBe('★');
  });

  it('cycles ★ → • (wrap-around)', () => {
    expect(nextPrefix('★')).toBe('•');
  });

  it('completes a full cycle back to start', () => {
    let p = '•' as ReturnType<typeof nextPrefix>;
    const visited: string[] = [p];
    for (let i = 0; i < PREFIX_ORDER.length; i++) {
      p = nextPrefix(p);
      visited.push(p);
    }
    // After 4 steps we are back at '•'
    expect(visited[PREFIX_ORDER.length]).toBe('•');
    // Visited all 4 distinct prefixes
    const unique = new Set(visited.slice(0, PREFIX_ORDER.length));
    expect(unique.size).toBe(PREFIX_ORDER.length);
  });

  it('returns first prefix defensively for an unknown value', () => {
    // Cast to bypass TypeScript union — defensive branch coverage
    const unknown = '*' as unknown as import('@calendarfr/shared').NotePrefix;
    expect(nextPrefix(unknown)).toBe('•');
  });
});
