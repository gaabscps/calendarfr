/**
 * Unit tests for sanitizeHtml — AC-005, AC-016, AC-017, AC-018, AC-019,
 * AC-020, AC-033.
 *
 * The isomorphic-dompurify import is auto-mapped to __mocks__/isomorphic-
 * dompurify.js by jest.config.js — no jest.mock() call needed here.
 */

import { sanitizeHtml } from '../sanitizeHtml.js';

// ─── 4 allowed tags survive ──────────────────────────────────────────────────

describe('sanitizeHtml — allowed tags', () => {
  it('preserves <b> tag', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
  });

  it('preserves <i> tag', () => {
    expect(sanitizeHtml('<i>italic</i>')).toBe('<i>italic</i>');
  });

  it('preserves <u> tag', () => {
    expect(sanitizeHtml('<u>underline</u>')).toBe('<u>underline</u>');
  });

  it('preserves <s> tag', () => {
    expect(sanitizeHtml('<s>strike</s>')).toBe('<s>strike</s>');
  });

  it('preserves combined allowed tags', () => {
    const input = '<b>a</b> <i>b</i> <u>c</u> <s>d</s>';
    expect(sanitizeHtml(input)).toBe('<b>a</b> <i>b</i> <u>c</u> <s>d</s>');
  });
});

// ─── Attributes stripped ─────────────────────────────────────────────────────

describe('sanitizeHtml — attribute stripping', () => {
  it('strips style attribute from allowed tag', () => {
    expect(sanitizeHtml('<b style="color:red">bold</b>')).toBe('<b>bold</b>');
  });

  it('strips class attribute from allowed tag', () => {
    expect(sanitizeHtml('<b class="foo">bold</b>')).toBe('<b>bold</b>');
  });

  it('strips id attribute from allowed tag', () => {
    expect(sanitizeHtml('<b id="x">bold</b>')).toBe('<b>bold</b>');
  });

  it('strips event handler attributes', () => {
    expect(sanitizeHtml('<b onclick="alert(1)">bold</b>')).toBe('<b>bold</b>');
  });

  it('strips href from <a> (disallowed tag) and keeps text', () => {
    // <a> is disallowed; href is also disallowed attribute — text survives via KEEP_CONTENT
    expect(sanitizeHtml('<a href="https://evil.com">link text</a>')).toBe('link text');
  });
});

// ─── Forbidden tags removed, KEEP_CONTENT preserves text ─────────────────────

describe('sanitizeHtml — forbidden tag removal', () => {
  it('removes <script> entirely (no KEEP_CONTENT for script)', () => {
    // DOMPurify removes <script> body too (force_body security rule)
    const result = sanitizeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });

  it('removes <iframe> entirely', () => {
    const result = sanitizeHtml('<iframe src="x"></iframe>');
    expect(result).not.toContain('<iframe>');
  });

  it('removes <img> tag', () => {
    const result = sanitizeHtml('<img src="x.png" alt="img"/>');
    expect(result).not.toContain('<img');
  });

  it('removes <table> but keeps text content via KEEP_CONTENT', () => {
    const result = sanitizeHtml('<table><tr><td>cell</td></tr></table>');
    expect(result).not.toContain('<table');
    expect(result).toContain('cell');
  });

  it('removes <style> tag', () => {
    const result = sanitizeHtml('<style>body { color: red; }</style>');
    expect(result).not.toContain('<style');
  });

  it('removes <div> but keeps text via KEEP_CONTENT', () => {
    const result = sanitizeHtml('<div>content</div>');
    expect(result).not.toContain('<div>');
    expect(result).toContain('content');
  });

  it('removes <span> with style but keeps text via KEEP_CONTENT', () => {
    const result = sanitizeHtml('<span style="font-family:Arial">hello</span>');
    expect(result).not.toContain('<span');
    expect(result).toContain('hello');
  });
});

// ─── Plain text passes through unchanged ─────────────────────────────────────

describe('sanitizeHtml — plain text', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles text with numbers and punctuation', () => {
    expect(sanitizeHtml('Price: $9.99 — 20% off!')).toBe('Price: $9.99 — 20% off!');
  });
});

// ─── collapseToSingleLine ─────────────────────────────────────────────────────

describe('sanitizeHtml — collapseToSingleLine', () => {
  it('joins two <p> blocks with a space', () => {
    const result = sanitizeHtml('<p>line1</p><p>line2</p>', {
      collapseToSingleLine: true,
    });
    expect(result).toBe('line1 line2');
  });

  it('converts <br> to space', () => {
    const result = sanitizeHtml('a<br>b', { collapseToSingleLine: true });
    expect(result).toBe('a b');
  });

  it('converts <br/> (self-closing) to space', () => {
    const result = sanitizeHtml('a<br/>b', { collapseToSingleLine: true });
    expect(result).toBe('a b');
  });

  it('collapses multiple spaces to one', () => {
    const result = sanitizeHtml('<p>  spaces  </p>', {
      collapseToSingleLine: true,
    });
    expect(result).toBe('spaces');
  });

  it('joins multiple paragraphs with single spaces', () => {
    const result = sanitizeHtml('<p>a</p><p>b</p><p>c</p>', {
      collapseToSingleLine: true,
    });
    expect(result).toBe('a b c');
  });

  it('strips forbidden tags while collapsing', () => {
    const input =
      '<p><span style="font-family:Arial">hello</span></p><p><a href="x">world</a></p><p><b>bold</b></p>';
    const result = sanitizeHtml(input, { collapseToSingleLine: true });
    expect(result).toBe('hello world <b>bold</b>');
  });

  it('handles mixed block and inline content', () => {
    const result = sanitizeHtml('<p>before</p><p>after</p>', {
      collapseToSingleLine: true,
    });
    expect(result).toBe('before after');
  });

  it('without collapseToSingleLine does NOT collapse blocks', () => {
    // When option is not set, paragraphs are returned as-is after purify
    const result = sanitizeHtml('<p>line1</p><p>line2</p>');
    // <p> tags are removed (not in allowed list) but text survives
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    // No forced space between them — collapseToSingleLine not requested
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('sanitizeHtml — idempotency (AC-019)', () => {
  const cases = [
    '<b>bold</b>',
    '<i>italic</i> text',
    'plain text',
    '<b><i>nested</i></b>',
    '',
    '<b>a</b> <s>b</s>',
  ] as const;

  it.each(cases)('sanitize(sanitize(x)) === sanitize(x) for: %s', (input) => {
    const once = sanitizeHtml(input);
    const twice = sanitizeHtml(once);
    expect(twice).toBe(once);
  });

  it('idempotent with collapseToSingleLine', () => {
    const input = '<p>a</p><p>b</p>';
    const once = sanitizeHtml(input, { collapseToSingleLine: true });
    const twice = sanitizeHtml(once, { collapseToSingleLine: true });
    expect(twice).toBe(once);
  });
});

// ─── Complex real-world paste scenario ───────────────────────────────────────

describe('sanitizeHtml — real-world paste', () => {
  it('handles Word-like paste with mixed tags', () => {
    const wordPaste =
      '<span style="font-family:Arial">hello</span> <a href="x">world</a> <b>bold</b> <script>alert(1)</script>';
    const result = sanitizeHtml(wordPaste, { collapseToSingleLine: true });
    expect(result).not.toContain('alert(1)');
    expect(result).not.toContain('<span');
    expect(result).not.toContain('<a ');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('<b>bold</b>');
  });
});

// ─── Adversarial XSS vectors (AC-033) ────────────────────────────────────────

describe('sanitizeHtml — adversarial XSS vectors (AC-033)', () => {
  it('removes <svg> with onload handler entirely', () => {
    const result = sanitizeHtml('<svg onload="alert(1)">payload</svg>');
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert(1)');
  });

  it('strips javascript: URL from <a> and keeps link text', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(result).not.toContain('<a');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('x');
  });

  it('removes <img> with data: URL (no base64 images)', () => {
    const result = sanitizeHtml(
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" alt="img">',
    );
    expect(result).not.toContain('<img');
    expect(result).not.toContain('data:image');
  });

  it('strips style and onclick from <b> but keeps <b> tag and text', () => {
    const result = sanitizeHtml('<b style="color:red" onclick="x()">x</b>');
    expect(result).toBe('<b>x</b>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('onclick');
  });

  it('removes <script> injected inside allowed tag context', () => {
    const result = sanitizeHtml('<b>safe<script>evil()</script></b>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('evil()');
  });

  it('removes event handlers on all disallowed tags', () => {
    const result = sanitizeHtml(
      '<div onmouseover="steal()"><span onfocus="hack()">text</span></div>',
    );
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('onfocus');
    expect(result).not.toContain('steal()');
    expect(result).not.toContain('hack()');
    expect(result).toContain('text');
  });
});

// ─── Idempotency adversarial (AC-019) ────────────────────────────────────────

describe('sanitizeHtml — idempotency adversarial (AC-019)', () => {
  it('collapseToSingleLine is idempotent with nested allowed tags in multi-<p>', () => {
    const input = '<p><b>x</b></p><p><i>y</i></p>';
    const once = sanitizeHtml(input, { collapseToSingleLine: true });
    const twice = sanitizeHtml(once, { collapseToSingleLine: true });
    expect(twice).toBe(once);
  });

  it('collapseToSingleLine result is idempotent for complex mixed content', () => {
    const input = '<p><b>hello</b> world</p><p><i>foo</i></p><p><s>bar</s></p>';
    const once = sanitizeHtml(input, { collapseToSingleLine: true });
    const twice = sanitizeHtml(once, { collapseToSingleLine: true });
    expect(twice).toBe(once);
  });
});
