/**
 * Unit tests for isEditableTarget.
 *
 * Verifies that the function correctly identifies editable focusable elements
 * to guard keyboard shortcuts and swipe gestures (AC-015, AC-018).
 */

import { isEditableTarget } from '../isEditableTarget';

describe('isEditableTarget', () => {
  describe('null and non-element targets', () => {
    it('returns false for null', () => {
      expect(isEditableTarget(null)).toBe(false);
    });

    it('returns false for a text node (EventTarget that is not Element)', () => {
      const textNode = document.createTextNode('hello');
      expect(isEditableTarget(textNode)).toBe(false);
    });
  });

  describe('<input> elements', () => {
    it('returns true for input[type=text]', () => {
      const input = document.createElement('input');
      input.type = 'text';
      expect(isEditableTarget(input)).toBe(true);
    });

    it('returns true for input without type (defaults to text)', () => {
      const input = document.createElement('input');
      expect(isEditableTarget(input)).toBe(true);
    });

    it('returns true for input[type=email]', () => {
      const input = document.createElement('input');
      input.type = 'email';
      expect(isEditableTarget(input)).toBe(true);
    });

    it('returns true for input[type=password]', () => {
      const input = document.createElement('input');
      input.type = 'password';
      expect(isEditableTarget(input)).toBe(true);
    });

    it('returns false for input[type=hidden] — not user-editable focusable', () => {
      const input = document.createElement('input');
      input.type = 'hidden';
      expect(isEditableTarget(input)).toBe(false);
    });

    it('returns false for input[type=checkbox] — no text cursor', () => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      expect(isEditableTarget(input)).toBe(false);
    });

    it('returns false for input[type=radio] — no text cursor', () => {
      const input = document.createElement('input');
      input.type = 'radio';
      expect(isEditableTarget(input)).toBe(false);
    });

    it('returns false for input[type=range] — no text cursor', () => {
      const input = document.createElement('input');
      input.type = 'range';
      expect(isEditableTarget(input)).toBe(false);
    });

    it('returns false for input[type=submit] — no text cursor', () => {
      const input = document.createElement('input');
      input.type = 'submit';
      expect(isEditableTarget(input)).toBe(false);
    });

    it('returns false for input[type=button] — no text cursor', () => {
      const input = document.createElement('input');
      input.type = 'button';
      expect(isEditableTarget(input)).toBe(false);
    });
  });

  describe('<textarea> elements', () => {
    it('returns true for textarea', () => {
      const textarea = document.createElement('textarea');
      expect(isEditableTarget(textarea)).toBe(true);
    });
  });

  describe('contenteditable elements', () => {
    it('returns true for element with contenteditable="true"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      expect(isEditableTarget(div)).toBe(true);
    });

    it('returns false for element with contenteditable="false"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'false');
      expect(isEditableTarget(div)).toBe(false);
    });

    it('returns false for element with contenteditable="inherit" without contenteditable ancestor', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'inherit');
      expect(isEditableTarget(div)).toBe(false);
    });
  });

  describe('descendants of contenteditable', () => {
    it('returns true for a child of contenteditable="true"', () => {
      const parent = document.createElement('div');
      parent.setAttribute('contenteditable', 'true');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(isEditableTarget(child)).toBe(true);

      document.body.removeChild(parent);
    });

    it('returns true for a deeply nested child of contenteditable="true"', () => {
      const parent = document.createElement('div');
      parent.setAttribute('contenteditable', 'true');
      const mid = document.createElement('p');
      const child = document.createElement('strong');
      mid.appendChild(child);
      parent.appendChild(mid);
      document.body.appendChild(parent);

      expect(isEditableTarget(child)).toBe(true);

      document.body.removeChild(parent);
    });

    it('returns false for a child of contenteditable="false"', () => {
      const parent = document.createElement('div');
      parent.setAttribute('contenteditable', 'false');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(isEditableTarget(child)).toBe(false);

      document.body.removeChild(parent);
    });

    it('Tiptap pattern: inner child of contenteditable="false" node-view returns false', () => {
      // Outer editor: contenteditable="true"
      const outer = document.createElement('div');
      outer.setAttribute('contenteditable', 'true');
      // Tiptap node-view: contenteditable="false" inside the editor
      const nodeView = document.createElement('span');
      nodeView.setAttribute('contenteditable', 'false');
      // Content inside the node-view (e.g., a rendered icon or decoration)
      const inner = document.createElement('i');
      nodeView.appendChild(inner);
      outer.appendChild(nodeView);
      document.body.appendChild(outer);

      // The closest [contenteditable] from inner is the node-view (false) → not editable
      expect(isEditableTarget(inner)).toBe(false);

      document.body.removeChild(outer);
    });

    it('Tiptap valid: direct text-bearing child of contenteditable="true" returns true', () => {
      // Outer editor: contenteditable="true"
      const outer = document.createElement('div');
      outer.setAttribute('contenteditable', 'true');
      // Direct child — no inner contenteditable barrier
      const child = document.createElement('p');
      outer.appendChild(child);
      document.body.appendChild(outer);

      expect(isEditableTarget(child)).toBe(true);

      document.body.removeChild(outer);
    });
  });

  describe('non-editable elements', () => {
    it('returns false for a regular div', () => {
      const div = document.createElement('div');
      expect(isEditableTarget(div)).toBe(false);
    });

    it('returns false for a button', () => {
      const button = document.createElement('button');
      expect(isEditableTarget(button)).toBe(false);
    });

    it('returns false for a span', () => {
      const span = document.createElement('span');
      expect(isEditableTarget(span)).toBe(false);
    });

    it('returns false for a paragraph', () => {
      const p = document.createElement('p');
      expect(isEditableTarget(p)).toBe(false);
    });

    it('returns false for an anchor', () => {
      const a = document.createElement('a');
      expect(isEditableTarget(a)).toBe(false);
    });
  });
});
