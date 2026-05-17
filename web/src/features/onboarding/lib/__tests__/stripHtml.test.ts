import { stripHtml } from '../stripHtml.js';

describe('stripHtml', () => {
  it('removes simple tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold');
    expect(stripHtml('<i>italic</i>')).toBe('italic');
    expect(stripHtml('<u>underline</u>')).toBe('underline');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<b><i>bold italic</i></b>')).toBe('bold italic');
    expect(stripHtml('<div><p>text</p></div>')).toBe('text');
  });

  it('removes tags with attributes', () => {
    expect(stripHtml('<a href="http://example.com">link</a>')).toBe('link');
    expect(stripHtml('<img src="test.jpg" alt="image">')).toBe('');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles malformed tags', () => {
    expect(stripHtml('text <br text>more')).toBe('text more');
    expect(stripHtml('<b>text</b text>')).toBe('text');
  });

  it('handles empty tags', () => {
    expect(stripHtml('<b></b>')).toBe('');
    expect(stripHtml('<b></b>text')).toBe('text');
  });

  it('preserves whitespace-only content inside a tag', () => {
    expect(stripHtml('<b>   </b>')).toBe('   ');
  });

  it('preserves text without tags', () => {
    expect(stripHtml('plain text')).toBe('plain text');
  });
});
