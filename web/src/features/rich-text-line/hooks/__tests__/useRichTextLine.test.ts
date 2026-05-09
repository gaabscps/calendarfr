/**
 * Unit tests for useRichTextLine — AC-001, AC-025, AC-026, AC-027, AC-028,
 * AC-032.
 *
 * Strategy: renderHook from @testing-library/react instantiates the hook in a
 * real React tree. Tiptap creates an actual ProseMirror editor in jsdom.
 *
 * Note: useEditor is asynchronous on first render — the editor is null on the
 * first render pass and becomes available after a useEffect flush. We use
 * `waitFor` to allow the editor to initialise before asserting.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useRichTextLine } from '../useRichTextLine.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Waits for the editor instance to be non-null. */
async function waitForEditor(
  result: ReturnType<typeof renderHook<ReturnType<typeof useRichTextLine>, Parameters<typeof useRichTextLine>[0]>>['result'],
) {
  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
}

// ─── Mount with initial value ─────────────────────────────────────────────────

describe('useRichTextLine — initial value', () => {
  it('returns an editor instance after mount', async () => {
    const { result } = renderHook(() =>
      useRichTextLine({ value: '', onChange: jest.fn() }),
    );

    await waitForEditor(result);
    expect(result.current).not.toBeNull();
  });

  it('initialises editor with provided HTML value', async () => {
    const { result } = renderHook(() =>
      useRichTextLine({
        value: '<p><b>hello</b></p>',
        onChange: jest.fn(),
      }),
    );

    await waitForEditor(result);
    expect(result.current!.getHTML()).toContain('hello');
  });

  it('initialises with empty string when value is ""', async () => {
    const { result } = renderHook(() =>
      useRichTextLine({ value: '', onChange: jest.fn() }),
    );

    await waitForEditor(result);
    // Editor is empty — getHTML returns the empty paragraph representation
    const html = result.current!.getHTML();
    // Either "" or the Tiptap empty doc representation; both normalise to ""
    expect(html.replace(/<p>\s*<\/p>/, '')).toBe('');
  });
});

// ─── onUpdate emits normalised HTML ──────────────────────────────────────────

describe('useRichTextLine — onUpdate / onChange', () => {
  it('emits normalised HTML via onChange when content is inserted programmatically', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useRichTextLine({ value: '', onChange }),
    );

    await waitForEditor(result);

    act(() => {
      result.current!.commands.setContent('<p>hello</p>', true);
    });

    // normalizeHtml strips the outer <p> wrapper (AC-028), so onChange
    // receives "hello" not "<p>hello</p>".
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hello');
    });
  });

  it('emits "" (not "<p></p>") for an empty editor after clearing content', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange }),
    );

    await waitForEditor(result);

    act(() => {
      result.current!.commands.clearContent(true);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});

// ─── External value sync ──────────────────────────────────────────────────────

describe('useRichTextLine — external value sync', () => {
  it('calls setContent when value prop changes to a different value', async () => {
    const onChange = jest.fn();
    let value = '<p>initial</p>';

    const { result, rerender } = renderHook(() =>
      useRichTextLine({ value, onChange }),
    );

    await waitForEditor(result);

    // Spy on the editor's chain method — commands delegates to chain internally
    // We verify the sync by checking the editor's actual HTML content instead.
    const editorRef = result.current!;

    // Change the external value
    value = '<p>updated</p>';
    rerender();

    await waitFor(() => {
      expect(editorRef.getHTML()).toBe('<p>updated</p>');
    });
  });

  it('does NOT call setContent when normalised value is identical to current editor HTML', async () => {
    const onChange = jest.fn();
    // Start with empty value
    let value = '';

    const { result, rerender } = renderHook(() =>
      useRichTextLine({ value, onChange }),
    );

    await waitForEditor(result);

    // Wait for editor to settle
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const setContentSpy = jest.spyOn(
      result.current!.commands,
      'setContent',
    );

    // Pass the same empty value again — normalised form matches
    value = '';
    rerender();

    // Give React time to run effects
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // setContent should NOT have been called because value didn't change
    expect(setContentSpy).not.toHaveBeenCalled();
  });

  it('syncs external value without emitting onChange (false flag)', async () => {
    const onChange = jest.fn();
    let value = '<p>first</p>';

    const { result, rerender } = renderHook(() =>
      useRichTextLine({ value, onChange }),
    );

    await waitForEditor(result);

    // Clear any onChange calls from initial setup
    onChange.mockClear();

    // Change external value
    value = '<p>second</p>';
    rerender();

    await waitFor(() => {
      // Editor should have the new content
      expect(result.current!.getHTML()).toContain('second');
    });

    // onChange should NOT have been called for this external sync
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── Unmount / cleanup ────────────────────────────────────────────────────────

describe('useRichTextLine — unmount', () => {
  it('destroys the editor on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useRichTextLine({ value: '', onChange: jest.fn() }),
    );

    await waitForEditor(result);

    const editorRef = result.current!;
    expect(editorRef.isDestroyed).toBe(false);

    act(() => {
      unmount();
    });

    // Tiptap scheduleDestroy runs in a setTimeout(..., 1); wait for it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // After unmount + timer flush the editor is destroyed
    expect(editorRef.isDestroyed).toBe(true);
  });
});

// ─── disabled mode ────────────────────────────────────────────────────────────

describe('useRichTextLine — disabled prop', () => {
  it('creates editor with editable=false when disabled=true', async () => {
    const { result } = renderHook(() =>
      useRichTextLine({ value: '', onChange: jest.fn(), disabled: true }),
    );

    await waitForEditor(result);
    expect(result.current!.isEditable).toBe(false);
  });

  it('creates editor with editable=true when disabled is not set', async () => {
    const { result } = renderHook(() =>
      useRichTextLine({ value: '', onChange: jest.fn() }),
    );

    await waitForEditor(result);
    expect(result.current!.isEditable).toBe(true);
  });
});

// ─── onEnter callback ─────────────────────────────────────────────────────────

describe('useRichTextLine — onEnter', () => {
  it('exposes editor that has Enter blocked via SingleLineParagraph', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();

    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange, onEnter }),
    );

    await waitForEditor(result);

    // Verify the editor has the extensions configured (indirect check)
    const extensionNames = result.current!.extensionManager.extensions.map(
      (e) => e.name,
    );
    expect(extensionNames).toContain('paragraph');
    expect(extensionNames).toContain('bold');
    expect(extensionNames).toContain('italic');
    expect(extensionNames).toContain('underline');
    expect(extensionNames).toContain('strike');
    expect(extensionNames).toContain('history');
  });

  it('calls onEnter when Enter key is pressed (real keydown dispatch)', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();

    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange, onEnter }),
    );

    await waitForEditor(result);

    const editor = result.current!;

    act(() => {
      // Dispatch a real Enter keydown through the ProseMirror view's event
      // handler — this is the path that handleKeyDown intercepts.
      editor.view.someProp('handleKeyDown', (f) =>
        f(editor.view, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
    });

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onEnter when Enter key is pressed during IME composition', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();

    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange, onEnter }),
    );

    await waitForEditor(result);

    const editor = result.current!;

    act(() => {
      // Simulate IME composition Enter (isComposing=true)
      editor.view.someProp('handleKeyDown', (f) =>
        f(
          editor.view,
          new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
        ),
      );
    });

    // onEnter must NOT be called during IME composition
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('does NOT call onEnter for keyCode 229 (IME synthetic Enter)', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();

    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange, onEnter }),
    );

    await waitForEditor(result);

    const editor = result.current!;

    act(() => {
      // keyCode 229 is the IME in-progress keycode. KeyboardEvent.keyCode is
      // read-only, so we use Object.defineProperty to override it.
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      Object.defineProperty(event, 'keyCode', { value: 229, configurable: true });
      editor.view.someProp('handleKeyDown', (f) => f(editor.view, event));
    });

    expect(onEnter).not.toHaveBeenCalled();
  });

  it('does not modify HTML when Enter is pressed (single-line invariant)', async () => {
    const onChange = jest.fn();
    const onEnter = jest.fn();

    const { result } = renderHook(() =>
      useRichTextLine({ value: '<p>abc</p>', onChange, onEnter }),
    );

    await waitForEditor(result);

    const editor = result.current!;
    onChange.mockClear();

    act(() => {
      editor.view.someProp('handleKeyDown', (f) =>
        f(editor.view, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
    });

    // onChange should not have been called (HTML unchanged)
    expect(onChange).not.toHaveBeenCalled();
    // Editor HTML should still be the original content
    expect(editor.getHTML()).toBe('<p>abc</p>');
  });

  it('calls latest onEnter when prop is updated after mount (stale closure fix)', async () => {
    const onEnterV1 = jest.fn();
    const onEnterV2 = jest.fn();
    let currentOnEnter = onEnterV1;

    const { result, rerender } = renderHook(() =>
      useRichTextLine({ value: '<p>text</p>', onChange: jest.fn(), onEnter: currentOnEnter }),
    );

    await waitForEditor(result);

    // Update to v2 callback
    currentOnEnter = onEnterV2;
    rerender();

    const editor = result.current!;

    act(() => {
      editor.view.someProp('handleKeyDown', (f) =>
        f(editor.view, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
    });

    // v1 should NOT be called (would indicate stale closure)
    expect(onEnterV1).not.toHaveBeenCalled();
    // v2 SHOULD be called (latest ref)
    expect(onEnterV2).toHaveBeenCalledTimes(1);
  });
});
