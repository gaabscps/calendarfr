/**
 * Tests for useRichTextBlock Backspace-on-empty intercept.
 *
 * Behaviour (bullet-list UX — Notion/Apple Notes parity):
 *  - When `onBackspaceEmpty` is provided AND the editor doc is empty
 *    (`textContent === ''` AND `childCount === 1`) the callback is invoked and
 *    handleKeyDown returns `true` (event consumed).
 *  - When the editor is non-empty, the callback is NOT invoked and the handler
 *    returns `false` so Tiptap's default character-deletion runs.
 *  - When `onBackspaceEmpty` is absent, the handler returns `false` regardless.
 *  - The IME guard (isComposing || keyCode === 229) is honoured.
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

function makeKeyEvent(opts: {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
}): KeyboardEvent {
  return {
    key: opts.key,
    shiftKey: false,
    isComposing: opts.isComposing ?? false,
    keyCode: opts.keyCode ?? (opts.key === 'Backspace' ? 8 : 0),
  } as unknown as KeyboardEvent;
}

function getHandleKeyDown(
  editor: NonNullable<ReturnType<typeof useRichTextBlock>>,
): (_view: unknown, _event: KeyboardEvent) => boolean {
  const fn = editor.view.props.handleKeyDown;
  if (!fn) throw new Error('handleKeyDown not set in editorProps');
  return fn as (_view: unknown, _event: KeyboardEvent) => boolean;
}

describe('useRichTextBlock — Backspace on empty intercept', () => {
  it('calls onBackspaceEmpty and returns true when editor is empty', async () => {
    const onBackspaceEmpty = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onBackspaceEmpty }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Backspace' });

    let returned!: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onBackspaceEmpty).toHaveBeenCalledTimes(1);
    expect(returned).toBe(true);
  });

  it('does NOT call onBackspaceEmpty and returns false when editor has text', async () => {
    const onBackspaceEmpty = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '<p>hello</p>', onChange: jest.fn(), onBackspaceEmpty }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Backspace' });

    let returned!: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onBackspaceEmpty).not.toHaveBeenCalled();
    expect(returned).toBe(false);
  });

  it('returns false when onBackspaceEmpty is absent (no intercept)', async () => {
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange: jest.fn() }));
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Backspace' });

    let returned!: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(returned).toBe(false);
  });

  it('IME guard: isComposing skips backspace intercept', async () => {
    const onBackspaceEmpty = jest.fn();
    const { result } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onBackspaceEmpty }),
    );
    await waitForEditor(result);

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Backspace', isComposing: true });

    let returned!: boolean;
    act(() => {
      returned = handleKeyDown(result.current!.view, event);
    });

    expect(onBackspaceEmpty).not.toHaveBeenCalled();
    expect(returned).toBe(false);
  });

  it('stores callback in ref — invokes latest onBackspaceEmpty after rerender', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    let current = cb1;
    const { result, rerender } = renderHook(() =>
      useRichTextBlock({ value: '', onChange: jest.fn(), onBackspaceEmpty: current }),
    );
    await waitForEditor(result);

    current = cb2;
    rerender();

    const handleKeyDown = getHandleKeyDown(result.current!);
    const event = makeKeyEvent({ key: 'Backspace' });

    act(() => {
      handleKeyDown(result.current!.view, event);
    });

    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb1).not.toHaveBeenCalled();
  });
});
