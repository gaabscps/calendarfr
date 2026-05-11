/**
 * Unit tests for normalizeHtml — AC-023, AC-026, AC-028.
 * Unit tests for normalizeBlockHtml — AC-032.
 */

import { normalizeHtml, normalizeBlockHtml } from '../normalizeHtml.js';

// ─── Empty representations → "" ──────────────────────────────────────────────

describe('normalizeHtml — empty cases map to ""', () => {
  it('maps empty string to ""', () => {
    expect(normalizeHtml('')).toBe('');
  });

  it('maps "<p></p>" to ""', () => {
    expect(normalizeHtml('<p></p>')).toBe('');
  });

  it('maps "<p><br></p>" to ""', () => {
    expect(normalizeHtml('<p><br></p>')).toBe('');
  });

  it('maps "<p><br/>" (self-closing) to ""', () => {
    expect(normalizeHtml('<p><br/></p>')).toBe('');
  });

  it('maps "<p> </p>" (single space) to ""', () => {
    expect(normalizeHtml('<p> </p>')).toBe('');
  });

  it('maps whitespace-only string to ""', () => {
    expect(normalizeHtml('   ')).toBe('');
  });

  // AC-023: Tiptap Placeholder extension adds class="is-editor-empty"
  it("maps '<p class=\"is-editor-empty\"></p>' to '' (placeholder class variant)", () => {
    expect(normalizeHtml('<p class="is-editor-empty"></p>')).toBe('');
  });

  it('maps \'<p class="is-editor-empty"><br class="ProseMirror-trailingBreak"></p>\' to \'\'', () => {
    expect(
      normalizeHtml('<p class="is-editor-empty"><br class="ProseMirror-trailingBreak"></p>'),
    ).toBe('');
  });
});

// ─── AC-028: <p> wrapper stripped so "text" === normalizeHtml("<p>text</p>") ─

describe('normalizeHtml — AC-028: <p> wrapper stripping for cursor-jump prevention', () => {
  it('"texto" and "<p>texto</p>" normalise to the same value', () => {
    expect(normalizeHtml('texto')).toBe(normalizeHtml('<p>texto</p>'));
  });

  it('"texto" normalises to "texto"', () => {
    expect(normalizeHtml('texto')).toBe('texto');
  });

  it('"<p>texto</p>" normalises to "texto" (strips wrapper)', () => {
    expect(normalizeHtml('<p>texto</p>')).toBe('texto');
  });

  it('"<p><b>x</b></p>" normalises to "<b>x</b>" (nested allowed tags)', () => {
    expect(normalizeHtml('<p><b>x</b></p>')).toBe('<b>x</b>');
  });

  it('"<p class="foo"><b>x</b></p>" strips wrapper with attributes', () => {
    expect(normalizeHtml('<p class="foo"><b>x</b></p>')).toBe('<b>x</b>');
  });

  it('plain text without <p> wrapper is returned as-is', () => {
    expect(normalizeHtml('hello world')).toBe('hello world');
  });

  it('text with allowed inline tags (no <p>) is returned as-is', () => {
    expect(normalizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
  });

  it('text with multiple allowed tags and <p> strips wrapper', () => {
    const inner = '<b>a</b> <i>b</i> <u>c</u> <s>d</s>';
    expect(normalizeHtml(`<p>${inner}</p>`)).toBe(inner);
  });
});

// ─── Non-empty content preserved ─────────────────────────────────────────────

describe('normalizeHtml — non-empty values preserved after normalisation', () => {
  it('returns plain text unchanged', () => {
    expect(normalizeHtml('hello world')).toBe('hello world');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeHtml('  hello  ')).toBe('hello');
  });

  it('returns a non-empty paragraph with leading/trailing whitespace trimmed', () => {
    expect(normalizeHtml('  <p>text</p>  ')).toBe('text');
  });
});

// ─── AC-032: normalizeBlockHtml — keeps <p> structure for non-empty content ──

describe('normalizeBlockHtml — AC-032', () => {
  it('maps empty string to ""', () => {
    expect(normalizeBlockHtml('')).toBe('');
  });

  it('maps "<p></p>" to ""', () => {
    expect(normalizeBlockHtml('<p></p>')).toBe('');
  });

  it('maps "<p><br></p>" to ""', () => {
    expect(normalizeBlockHtml('<p><br></p>')).toBe('');
  });

  it('keeps outer <p> for non-empty single paragraph', () => {
    expect(normalizeBlockHtml('<p>texto</p>')).toBe('<p>texto</p>');
  });

  it('keeps multiple paragraphs as-is', () => {
    expect(normalizeBlockHtml('<p>a</p><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });

  it('maps "<p></p><p></p>" (multiple empty paragraphs) to ""', () => {
    expect(normalizeBlockHtml('<p></p><p></p>')).toBe('');
  });

  it('maps "<p><br></p><p><br></p>" to ""', () => {
    expect(normalizeBlockHtml('<p><br></p><p><br></p>')).toBe('');
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('normalizeHtml — idempotency', () => {
  const cases = [
    '',
    '<p></p>',
    '<p><br></p>',
    '<p>text</p>',
    'hello',
    'texto',
    '<b>x</b>',
    '<p><b>x</b></p>',
    '<p class="is-editor-empty"></p>',
  ] as const;

  it.each(cases)('normalizeHtml(normalizeHtml(x)) === normalizeHtml(x) for: %s', (input) => {
    const once = normalizeHtml(input);
    const twice = normalizeHtml(once);
    expect(twice).toBe(once);
  });
});
