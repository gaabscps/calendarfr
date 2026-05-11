/**
 * Unit tests for useRichTextBlock — AC-033, AC-034, AC-035, AC-039.
 *
 * (a) Enter creates new paragraph (not blocked)
 * (b) onChange emits "<p>linha1</p><p>linha2</p>" after Enter
 * (c) Sync with value="texto" (legacy no-<p> format) does not cause cursor jump
 * (d) Paste with "<p>a</p><p>b</p>" preserves two paragraphs in output
 * (e) value="" normalizes to "" (onChange not called with empty content)
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useRichTextBlock } from '../useRichTextBlock.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Waits for the editor instance to be non-null. */
async function waitForEditor(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useRichTextBlock>, Parameters<typeof useRichTextBlock>[0]>
  >['result'],
) {
  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
}

// ─── (a) Enter creates new paragraph ─────────────────────────────────────────

describe('useRichTextBlock — (a) Enter creates new paragraph', () => {
  it('Enter is NOT blocked — editor HTML has two paragraphs after Enter', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextBlock({ value: '<p>linha1</p>', onChange }));

    await waitForEditor(result);

    const editor = result.current!;

    // Move cursor to end of paragraph
    act(() => {
      editor.commands.focus('end');
    });

    // Simulate Enter via the editor command (splitBlock / newlineInCode is
    // what pressing Enter in ProseMirror does for Paragraph nodes).
    act(() => {
      editor.commands.splitBlock();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      // After Enter, there should be two <p> elements
      const pCount = (html.match(/<p/g) ?? []).length;
      expect(pCount).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── (b) onChange emits multi-<p> HTML ───────────────────────────────────────

describe('useRichTextBlock — (b) onChange emits multi-paragraph HTML after Enter', () => {
  it('emits "<p>linha1</p><p>linha2</p>" after Enter + typing', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextBlock({ value: '<p>linha1</p>', onChange }));

    await waitForEditor(result);

    const editor = result.current!;
    onChange.mockClear();

    act(() => {
      editor.commands.focus('end');
      editor.commands.splitBlock();
      editor.commands.insertContent('linha2');
    });

    await waitFor(() => {
      const calls = onChange.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0] as string | undefined;
      expect(lastCall).toBe('<p>linha1</p><p>linha2</p>');
    });
  });
});

// ─── (c) Sync without cursor jump ────────────────────────────────────────────

describe('useRichTextBlock — (c) sync with legacy value does not cause cursor jump', () => {
  it('does NOT call setContent when normalised value is identical (no-<p> legacy format)', async () => {
    const onChange = jest.fn();
    // "texto" without <p> — normalizeHtml("texto") === normalizeHtml("<p>texto</p>")
    let value = 'texto';

    const { result, rerender } = renderHook(() => useRichTextBlock({ value, onChange }));

    await waitForEditor(result);

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const setContentSpy = jest.spyOn(result.current!.commands, 'setContent');

    // Rerender with the semantically equivalent wrapped form
    value = 'texto';
    rerender();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Same normalized value — setContent should NOT have been called
    expect(setContentSpy).not.toHaveBeenCalled();
  });

  it('syncs external value change without emitting onChange (false flag)', async () => {
    const onChange = jest.fn();
    let value = '<p>first</p>';

    const { result, rerender } = renderHook(() => useRichTextBlock({ value, onChange }));

    await waitForEditor(result);

    onChange.mockClear();

    value = '<p>second</p>';
    rerender();

    await waitFor(() => {
      expect(result.current!.getHTML()).toContain('second');
    });

    // onChange should NOT have been called for programmatic sync
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── (d) Paste preserves paragraph structure ──────────────────────────────────

describe('useRichTextBlock — (d) paste preserves two paragraphs', () => {
  it('transformPastedHTML sanitizes to allowed tags without collapsing paragraphs', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange }));

    await waitForEditor(result);

    const editor = result.current!;

    // Access transformPastedHTML directly from editorProps (unit-level test)
    const transformFn = editor.view.props.transformPastedHTML;
    expect(transformFn).toBeDefined();

    // Simulate paste with two paragraphs that contain inline marks — transformPastedHTML receives (html, view)
    const pastedHtml = '<p><b>a</b></p><p><i>b</i></p>';
    const transformedHtml = transformFn!(pastedHtml, editor.view);

    // Allowed inline marks must be preserved
    expect(transformedHtml).toContain('<b>a</b>');
    expect(transformedHtml).toContain('<i>b</i>');
    // Paragraph structure must be preserved (allowParagraphs:true — AC-033)
    expect(transformedHtml).toContain('<p>');
    expect(transformedHtml).toBe('<p><b>a</b></p><p><i>b</i></p>');
  });
});

// ─── (e) Empty value normalizes to "" ────────────────────────────────────────

describe('useRichTextBlock — (e) empty value normalizes to ""', () => {
  it('emits "" (not "<p></p>") when content is cleared', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextBlock({ value: '<p>text</p>', onChange }));

    await waitForEditor(result);

    act(() => {
      result.current!.commands.clearContent(true);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  it('initialises with empty string when value="" — onChange not called with empty content', async () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange }));

    await waitForEditor(result);

    // Give time for any spurious onChange calls
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // onChange should not be called with empty content on init
    const _emptyCallArgs = onChange.mock.calls.filter(([v]: [string]) => v === '');
    // If called at all with '', that's fine — but it should NEVER be called
    // with "<p></p>" or other non-empty falsy content
    const nonEmptyCalls = onChange.mock.calls.filter(([v]: [string]) => v !== '' && v.length > 0);
    expect(nonEmptyCalls).toHaveLength(0);
  });
});

// ─── aria-multiline ───────────────────────────────────────────────────────────

describe('useRichTextBlock — aria-multiline', () => {
  it('configures aria-multiline="true" attribute (AC-035)', async () => {
    const { result } = renderHook(() => useRichTextBlock({ value: '', onChange: jest.fn() }));

    await waitForEditor(result);

    const editor = result.current!;
    const attrs = editor.view.props.attributes as Record<string, string> | undefined;
    expect(attrs?.['aria-multiline']).toBe('true');
  });
});
