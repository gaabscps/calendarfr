/**
 * Tests for useRichTextBlock — FEAT-018 ACs: AC-012..AC-018.
 * AC-013: Enter intercepted when onEnter → returns true
 * AC-014: Shift+Enter intercepted when onShiftEnter → returns true
 * AC-015: IME guard (isComposing || keyCode===229) runs before any intercept
 * AC-016: without onEnter, Enter returns false
 * AC-017: without onShiftEnter, Shift+Enter returns false
 * AC-018: callbacks stored in refs, stale-closure proof
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { useRichTextBlock } from '../useRichTextBlock.js';

async function waitForEditor(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useRichTextBlock>, Parameters<typeof useRichTextBlock>[0]>
  >['result'],
) {
  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
}

/** Creates a fake KeyboardEvent-like object matching what ProseMirror's handleKeyDown receives */
function makeKeyEvent(opts: {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}): KeyboardEvent {
  return {
    key: opts.key,
    shiftKey: opts.shiftKey ?? false,
    isComposing: opts.isComposing ?? false,
    keyCode: opts.keyCode ?? (opts.key === 'Enter' ? 13 : 0),
  } as unknown as KeyboardEvent;
}

/** Extracts handleKeyDown from the editor's view props */
function getHandleKeyDown(
  editor: NonNullable<ReturnType<typeof useRichTextBlock>>,
): (_view: unknown, _event: KeyboardEvent) => boolean {
  const fn = editor.view.props.handleKeyDown;
  if (!fn) throw new Error('handleKeyDown not set in editorProps');
  return fn as (_view: unknown, _event: KeyboardEvent) => boolean;
}

// ─── AC-013: Enter intercepted when onEnter provided ─────────────────────────

describe('useRichTextBlock (FEAT-018) — AC-013: Enter intercepted when onEnter provided', () => {
  it('calls onEnter and returns true when Enter is pressed (no shift)', async () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '<p>text</p>', onChange: jest.fn(), onEnter }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: false });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(returned!).toBe(true);
  });
});

// ─── AC-014: Shift+Enter intercepted when onShiftEnter provided ───────────────

describe('useRichTextBlock (FEAT-018) — AC-014: Shift+Enter intercepted when onShiftEnter provided', () => {
  it('calls onShiftEnter and returns true when Shift+Enter is pressed', async () => {
    const onShiftEnter = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '<p>text</p>', onChange: jest.fn(), onShiftEnter }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: true });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onShiftEnter).toHaveBeenCalledTimes(1);
    expect(returned!).toBe(true);
  });
});

// ─── AC-015: IME guard runs before intercept ──────────────────────────────────

describe('useRichTextBlock (FEAT-018) — AC-015: IME guard skips intercept', () => {
  it('does NOT call onEnter and returns false when isComposing is true', async () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onEnter }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: false, isComposing: true });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(returned!).toBe(false);
  });

  it('does NOT call onEnter and returns false when keyCode is 229 (IME)', async () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onEnter }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: false, keyCode: 229 });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(returned!).toBe(false);
  });

  it('does NOT call onShiftEnter and returns false when isComposing is true (Shift+Enter)', async () => {
    const onShiftEnter = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onShiftEnter }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: true, isComposing: true });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onShiftEnter).not.toHaveBeenCalled();
    expect(returned!).toBe(false);
  });
});

// ─── AC-016: without onEnter, Enter returns false ────────────────────────────

describe('useRichTextBlock (FEAT-018) — AC-016: without onEnter, Enter returns false', () => {
  it('returns false for Enter when no onEnter prop is provided', async () => {
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange: jest.fn() }));
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: false });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(returned!).toBe(false);
  });
});

// ─── AC-017: without onShiftEnter, Shift+Enter returns false ─────────────────

describe('useRichTextBlock (FEAT-018) — AC-017: without onShiftEnter, Shift+Enter returns false', () => {
  it('returns false for Shift+Enter when no onShiftEnter prop is provided', async () => {
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange: jest.fn() }));
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: true });

    let returned: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(returned!).toBe(false);
  });
});

// ─── AC-018: stale-closure proof — refs updated every render ─────────────────

describe('useRichTextBlock (FEAT-018) — AC-018: callbacks are stale-closure proof', () => {
  it('uses the latest onEnter ref even after it changes between renders', async () => {
    const onEnter1 = jest.fn();
    const onEnter2 = jest.fn();
    let currentOnEnter = onEnter1;

    const { result, rerender } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onEnter: currentOnEnter }),
    );
    await waitForEditor(result);

    // Update the callback between renders
    currentOnEnter = onEnter2;
    rerender();

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: false });

    act(() => {
      handleKeyDown(result.current!.view, event);
    });

    // The second callback (latest) should have been called, not the first
    expect(onEnter2).toHaveBeenCalledTimes(1);
    expect(onEnter1).not.toHaveBeenCalled();
  });

  it('uses the latest onShiftEnter ref even after it changes between renders', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    let current = cb1;

    const { result, rerender } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onShiftEnter: current }),
    );
    await waitForEditor(result);

    current = cb2;
    rerender();

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Enter', shiftKey: true });

    act(() => {
      handleKeyDown(result.current!.view, event);
    });

    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb1).not.toHaveBeenCalled();
  });
});
