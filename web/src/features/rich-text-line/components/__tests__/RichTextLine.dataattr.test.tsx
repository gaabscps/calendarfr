/**
 * DOM marker test: RichTextLine — AC-013.
 *
 * Verifies that the rendered DOM exposes a stable `data-tiptap-editor`
 * attribute that downstream features (e.g. undo-delete global handler)
 * can use to detect focus inside a Tiptap editor via
 * `document.activeElement.closest('[data-tiptap-editor]')`.
 */

import { waitFor } from '@testing-library/react';

import { RichTextLine } from '../RichTextLine.js';

import { renderWithProviders } from '@/test-utils';

describe('RichTextLine — data-tiptap-editor marker (AC-013)', () => {
  it('renders an element with [data-tiptap-editor] attribute in the DOM', async () => {
    const { container } = renderWithProviders(
      <RichTextLine value="hello" onChange={jest.fn()} ariaLabel="rt" />,
    );

    // Wait for Tiptap to mount (the wrapper exists immediately, but we
    // assert post-mount so the marker is verified in steady state).
    await waitFor(() => {
      expect(container.querySelector('[data-tiptap-editor]')).not.toBeNull();
    });

    const marker = container.querySelector('[data-tiptap-editor]');
    // Marker must contain the contenteditable element so that
    // `activeElement.closest('[data-tiptap-editor]')` resolves while editing.
    expect(marker?.querySelector('[contenteditable]')).not.toBeNull();
  });
});
