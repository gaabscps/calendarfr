/**
 * Null-editor guard test for useRichTextLine.
 *
 * Exercises the `if (!editor) return` early-return branch (line 104) in
 * useRichTextLine's external-value sync useEffect by mocking useEditor from
 * @tiptap/react to always return null — simulating the hook's pre-init state.
 */

import { renderHook } from '@testing-library/react';

import { useRichTextLine } from '../useRichTextLine.js';

// Mock @tiptap/react to return null from useEditor — simulates the initial
// render cycle before Tiptap initialises, exercising the `if (!editor) return`
// guard in the useEffect at line 104.
jest.mock('@tiptap/react', () => ({
  ...jest.requireActual('@tiptap/react'),
  useEditor: jest.fn().mockReturnValue(null),
}));

describe('useRichTextLine — null editor guard (line 104)', () => {
  it('returns null when useEditor is not yet resolved (null early-return branch)', () => {
    // When useEditor returns null, the hook returns null and the useEffect
    // `if (!editor) return` branch (line 104) fires with its true path.
    const onChange = jest.fn();
    const { result } = renderHook(() => useRichTextLine({ value: '', onChange }));
    // The hook returns null (editor not initialised).
    expect(result.current).toBeNull();
    // onChange must not have been called (no editor, no onUpdate).
    expect(onChange).not.toHaveBeenCalled();
  });

  it('external value change with null editor: effect fires and early-returns cleanly', () => {
    // Re-render with a new value while editor is null — ensures the effect runs
    // again and hits the `if (!editor) return` true branch on each render.
    const onChange = jest.fn();
    let value = '';
    const { rerender, result } = renderHook(() => useRichTextLine({ value, onChange }));
    expect(result.current).toBeNull();
    value = 'new value';
    rerender();
    // Still null — editor never initialised.
    expect(result.current).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
