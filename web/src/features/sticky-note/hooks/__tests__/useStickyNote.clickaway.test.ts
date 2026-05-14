/**
 * Click-away behavior has been moved to useMultiStickyNote (FEAT-021).
 *
 * AC-007 / AC-008: isOpen, setIsOpen, and tabRef were removed from
 * useStickyNote in FEAT-021 (T-006). Click-away is now handled by the
 * orchestrator hook useMultiStickyNote, which manages open/close state and
 * the global mousedown listener across all active color instances.
 *
 * Tests for click-away behavior should be added to:
 *   web/src/features/sticky-note/hooks/__tests__/useMultiStickyNote.clickaway.test.ts
 */

describe('useStickyNote click-away (migrated)', () => {
  it('click-away behavior moved to useMultiStickyNote — this file is a migration marker', () => {
    // AC-007/AC-008 click-away logic removed from useStickyNote in FEAT-021 T-006.
    // No assertions needed here; tests live in useMultiStickyNote.clickaway.test.ts.
    expect(true).toBe(true);
  });
});
