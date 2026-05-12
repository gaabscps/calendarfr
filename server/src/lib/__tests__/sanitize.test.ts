/**
 * @jest-environment node
 *
 * Unit tests for sanitize.ts (T-007, AC-018..021).
 * 7 scenarios per tasks.md T-007.
 */

import type { DailyPageData } from '@calendarfr/shared';

import { sanitizeDayHtml, sanitizeText } from '../sanitize';

// ---------------------------------------------------------------------------
// Scenario 1: plain text preserved unchanged
// ---------------------------------------------------------------------------
it('sanitizeText preserves plain text without HTML tags', () => {
  expect(sanitizeText('sem html')).toBe('sem html');
});

// ---------------------------------------------------------------------------
// Scenario 2: allowed tags (<b><i><u><s>) pass through
// ---------------------------------------------------------------------------
it('sanitizeText allows <b>, <i>, <u>, <s> tags', () => {
  expect(sanitizeText('<b>bold</b>')).toBe('<b>bold</b>');
  expect(sanitizeText('<i>italic</i>')).toBe('<i>italic</i>');
  expect(sanitizeText('<u>under</u>')).toBe('<u>under</u>');
  expect(sanitizeText('<s>strike</s>')).toBe('<s>strike</s>');
});

// ---------------------------------------------------------------------------
// Scenario 3: <script> stripped, safe content preserved
// ---------------------------------------------------------------------------
it('sanitizeText strips <script> but keeps allowed tags around it', () => {
  const result = sanitizeText('<script>alert(1)</script><b>safe</b>');
  expect(result).toBe('<b>safe</b>');
  expect(result).not.toContain('script');
  expect(result).not.toContain('alert');
});

// ---------------------------------------------------------------------------
// Scenario 4: <a href> stripped, inner text preserved
// ---------------------------------------------------------------------------
it('sanitizeText strips <a href=...> anchor but keeps inner text', () => {
  const result = sanitizeText("<a href='http://evil.com'>link</a>");
  expect(result).toBe('link');
  expect(result).not.toContain('href');
  expect(result).not.toContain('<a');
});

// ---------------------------------------------------------------------------
// Scenario 5: event handler attribute stripped
// ---------------------------------------------------------------------------
it('sanitizeText strips onclick attribute and wrapping tag', () => {
  const result = sanitizeText("<span onclick='evil()'>x</span>");
  expect(result).toBe('x');
  expect(result).not.toContain('onclick');
});

// ---------------------------------------------------------------------------
// Scenario 6: <style> block removed entirely
// ---------------------------------------------------------------------------
it('sanitizeText removes <style> block entirely', () => {
  const result = sanitizeText('<style>body{color:red}</style>');
  expect(result).toBe('');
  expect(result).not.toContain('style');
  expect(result).not.toContain('color');
});

// ---------------------------------------------------------------------------
// Scenario 7 (new): <p> tags pass through — RichTextBlock emits wrapped paragraphs
// ---------------------------------------------------------------------------
it('sanitizeText allows <p> tags so paragraph breaks survive PUT roundtrip', () => {
  expect(sanitizeText('<p>line1</p><p>line2</p>')).toBe('<p>line1</p><p>line2</p>');
});

it('sanitizeText allows <p> with inline allowed tags inside', () => {
  expect(sanitizeText('<p><b>bold</b> normal</p>')).toBe('<p><b>bold</b> normal</p>');
});

// ---------------------------------------------------------------------------
// Scenario 8 (new): <br> tags pass through
// ---------------------------------------------------------------------------
it('sanitizeText allows <br> tags for line breaks', () => {
  // DOMPurify serialises <br> as <br> (no slash)
  const result = sanitizeText('line1<br>line2');
  expect(result).toBe('line1<br>line2');
});

// ---------------------------------------------------------------------------
// Scenario 9 (original): sanitizeDayHtml maps all fields correctly
// ---------------------------------------------------------------------------
it('sanitizeDayHtml sanitizes priorities, agenda, notes and leaves mood/timestamps intact', () => {
  const day: DailyPageData = {
    schemaVersion: 1,
    date: '2026-05-09',
    mood: { emoji: '😊', label: 'happy', color: '#fff' },
    priorities: [
      { id: 'p1', text: '<script>bad</script><b>ok</b>', done: false },
      { id: 'p2', text: 'plain', done: false },
      { id: 'p3', text: '<i>italic</i>', done: true },
    ],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      // DOMPurify strips <a> but preserves inner text: "bad" + "keep" = "badkeep"
      text: i === 0 ? "<a href='x'>bad</a>keep" : '',
    })) as unknown as DailyPageData['agenda'],
    notes: [
      { id: 'n1', prefix: '•', text: '<style>.x{}</style>text' },
      { id: 'n2', prefix: '→', text: 'clean' },
    ],
    createdAt: '2026-05-09T10:00:00.000Z',
    updatedAt: '2026-05-09T10:01:00.000Z',
  };

  const result = sanitizeDayHtml(day);

  // priorities sanitized
  expect(result.priorities[0]?.text).toBe('<b>ok</b>');
  expect(result.priorities[1]?.text).toBe('plain');
  expect(result.priorities[2]?.text).toBe('<i>italic</i>');

  // agenda sanitized — <a> stripped, inner text preserved, concatenated
  expect(result.agenda[0]?.text).toBe('badkeep');
  expect(result.agenda[1]?.text).toBe('');

  // notes sanitized
  expect(result.notes[0]?.text).toBe('text');
  expect(result.notes[1]?.text).toBe('clean');

  // mood untouched
  expect(result.mood).toEqual(day.mood);

  // timestamps untouched
  expect(result.createdAt).toBe(day.createdAt);
  expect(result.updatedAt).toBe(day.updatedAt);

  // all 18 agenda slots present
  expect(result.agenda).toHaveLength(18);
});
