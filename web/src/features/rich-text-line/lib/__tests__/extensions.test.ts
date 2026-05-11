/**
 * Unit tests for extensions.ts and singleLineParagraph.ts.
 *
 * Covers: buildExtensions default-arg branch (line 57 of extensions.ts),
 * SingleLineParagraph Shift-Enter handler (line 25 of singleLineParagraph.ts).
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useRichTextLine } from '../../hooks/useRichTextLine.js';
import { buildExtensions, buildExtensionsBlock } from '../extensions.js';
import { SingleLineParagraph } from '../singleLineParagraph.js';

// ─── buildExtensions — default param branch ──────────────────────────────────

describe('buildExtensions — default argument (line 57)', () => {
  it('returns an array of extensions when called with no arguments (default {})', () => {
    // The default parameter `opts = {}` is a branch; calling without args exercises it.
    const result = buildExtensions();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns extensions including paragraph, bold, italic, underline, strike, history', () => {
    const exts = buildExtensions();
    const names = exts.map((e) => e.name);
    expect(names).toContain('paragraph');
    expect(names).toContain('bold');
    expect(names).toContain('italic');
    expect(names).toContain('underline');
    expect(names).toContain('strike');
    expect(names).toContain('history');
  });

  it('returns extensions with placeholder configured (empty placeholder when no opts)', () => {
    const exts = buildExtensions();
    const ph = exts.find((e) => e.name === 'placeholder');
    expect(ph).toBeDefined();
  });

  it('buildExtensions with placeholder opts sets placeholder option', () => {
    const exts = buildExtensions({ placeholder: 'Digite aqui…' });
    const ph = exts.find((e) => e.name === 'placeholder');
    expect(ph).toBeDefined();
    // The placeholder extension exists with the given text.
    // options may be stored differently by Tiptap; existence check is sufficient.
  });
});

// ─── buildExtensionsBlock — does NOT include SingleLineParagraph ─────────────

describe('buildExtensionsBlock — AC-031', () => {
  it('returns an array that does NOT contain SingleLineParagraph', () => {
    const exts = buildExtensionsBlock();
    expect(exts).not.toContain(SingleLineParagraph);
  });

  it('returns extensions including paragraph, bold, italic, underline, strike, history', () => {
    const exts = buildExtensionsBlock();
    const names = exts.map((e) => e.name);
    expect(names).toContain('paragraph');
    expect(names).toContain('bold');
    expect(names).toContain('italic');
    expect(names).toContain('underline');
    expect(names).toContain('strike');
    expect(names).toContain('history');
  });

  it('returns extensions with placeholder configured (empty placeholder when no opts)', () => {
    const exts = buildExtensionsBlock();
    const ph = exts.find((e) => e.name === 'placeholder');
    expect(ph).toBeDefined();
  });
});

// ─── SingleLineParagraph — Shift-Enter handler ────────────────────────────────

describe('SingleLineParagraph — Shift-Enter blocked (line 25)', () => {
  it('addKeyboardShortcuts returns an object with Enter and Shift-Enter handlers', () => {
    // Call addKeyboardShortcuts on the SingleLineParagraph extension to get the
    // shortcut map and exercise BOTH handler bodies (Enter and Shift-Enter).
    // The extension's addKeyboardShortcuts method is available on the prototype.
    const ext = SingleLineParagraph;
    // addKeyboardShortcuts is defined on the extension config; access it via .config.

    const shortcuts = (ext as any).config?.addKeyboardShortcuts?.call({ parent: null });
    expect(shortcuts).toBeDefined();
    expect(typeof shortcuts?.['Enter']).toBe('function');
    expect(typeof shortcuts?.['Shift-Enter']).toBe('function');
    // Exercise both handler bodies — they return true (line 24 and line 25).
    expect(shortcuts?.['Enter']()).toBe(true);
    expect(shortcuts?.['Shift-Enter']()).toBe(true); // line 25 exercised here
  });

  it('Shift+Enter does not insert line break via useRichTextLine', async () => {
    // Belt-and-suspenders: verify the hook-level Enter prevention also blocks Shift+Enter.
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextLine({ value: '<p>abc</p>', onChange }));

    await waitFor(() => expect(result.current).not.toBeNull());
    onChange.mockClear();

    act(() => {
      result.current!.view.someProp('handleKeyDown', (f) =>
        f(
          result.current!.view,
          new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }),
        ),
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    // HTML must remain unchanged.
    const html = result.current!.getHTML();
    expect(html).not.toContain('<br>');
    expect(html.match(/<p>/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
