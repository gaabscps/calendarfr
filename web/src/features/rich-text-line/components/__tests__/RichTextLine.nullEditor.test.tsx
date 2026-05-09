/**
 * Null-editor guard tests for RichTextLine.
 *
 * Exercises the `if (!editor) return` early-return branches (RichTextLine.tsx
 * line 62 and line 51 "autoFocus && editor" false path when editor is null)
 * by mocking useRichTextLine to always return null — simulating the initial
 * render cycle before Tiptap's useEditor resolves.
 *
 * These tests are in a separate file from RichTextLine.integration.test.tsx
 * because jest.mock() is hoisted to the top of each file; putting it in the
 * integration file would break all other tests that need a real editor.
 */

import { renderWithProviders } from '@/test-utils';
import { RichTextLine } from '../RichTextLine.js';

// Mock useRichTextLine to return null — simulates pre-init state of editor.
// This is intentional: it exercises the defensive `if (!editor) return;` guard.
jest.mock('../../hooks/useRichTextLine.js', () => ({
  useRichTextLine: jest.fn().mockReturnValue(null),
}));

// Also mock @tiptap/react BubbleMenu to avoid errors when editor is null.
jest.mock('@tiptap/react', () => ({
  ...jest.requireActual('@tiptap/react'),
  BubbleMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bubble-menu-wrapper">{children}</div>
  ),
  EditorContent: () => <div data-testid="editor-content-null" />,
}));

describe('RichTextLine — null editor guard (line 62)', () => {
  it('renders without crash when editor is null (null-editor early-return branch, line 62)', () => {
    // When useRichTextLine returns null:
    //   - useEffect line 62: `if (!editor) return` → true branch exercised
    //   - useEffect line 51: `autoFocus && editor` → false (editor=null) exercised
    // The component renders only the wrapper div without FloatingToolbar.
    expect(() => {
      renderWithProviders(
        <RichTextLine value="" onChange={jest.fn()} ariaLabel="test-label" />,
      );
    }).not.toThrow();
  });

  it('autoFocus with null editor: autoFocus && editor = false (line 51 false branch)', () => {
    // autoFocus=true but editor=null → `autoFocus && editor` is false → no focus() call.
    // This exercises the false branch of the first useEffect's condition.
    expect(() => {
      renderWithProviders(
        <RichTextLine value="" onChange={jest.fn()} autoFocus />,
      );
    }).not.toThrow();
  });
});
