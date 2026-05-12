#!/usr/bin/env node
/**
 * rhythm-check-scan.mjs — scanning helpers for rhythm-check.mjs
 *
 * Exports:
 *   getCssFiles()                    — resolves *.module.css paths under web/src/
 *   classifyValue(raw)               — 'compliant' | 'violation' | 'ignore'
 *   splitBlocks(source)              — top-level CSS blocks
 *   isVerticalContainer(body, path)  — heuristic for gap qualification
 *   extractVerticalShorthand(raw)    — vertical components of padding/margin shorthand
 *   scanFile(path)                   — { compliant, governed, violations }
 *   TOKEN_MAP                        — 1-level resolution map for known vars
 *   ROOT                             — repo root URL pathname
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join as pathJoin } from 'path';

export const ROOT = new URL('..', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Token resolution map (1 level)
// ---------------------------------------------------------------------------

export const TOKEN_MAP = {
  '--baseline': 24,
  '--baseline-half': 12,
  '--spacing-none': 0,
  '--spacing-xs': 4,
  '--spacing-sm': 8,
  '--spacing-md': 12,
  '--spacing-base': 16,
  '--spacing-lg': 24,
  '--spacing-xl': 32,
  '--spacing-2xl': 48,
  '--spacing-3xl': 64,
};

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export function getCssFiles() {
  /** @param {string} dir */
  function walk(dir) {
    /** @type {string[]} */
    const results = [];
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return results;
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      const full = pathJoin(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        results.push(...walk(full));
      } else if (entry.endsWith('.module.css')) {
        results.push(full);
      }
    }
    return results;
  }
  return walk(pathJoin(ROOT, 'web', 'src'));
}

// ---------------------------------------------------------------------------
// Value classification
// ---------------------------------------------------------------------------

/**
 * Classify a single vertical value token.
 * Returns one of:
 *   - 'compliant' — accepted (multiple of 12/24, or ≤4 border-like, or 0)
 *   - 'violation' — literal/var resolved to non-multiple
 *   - 'ignore'    — could not resolve (unknown var, complex value); not counted
 * @param {string} rawVal
 */
export function classifyValue(rawVal) {
  const v = rawVal
    .trim()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (
    v === '' ||
    v === 'auto' ||
    v === 'inherit' ||
    v === 'initial' ||
    v === 'unset' ||
    v === 'none' ||
    v === 'normal'
  ) {
    return 'ignore';
  }

  // Bare zero
  if (/^0(?:px|rem|em)?$/.test(v)) return 'compliant';

  // calc(var(--baseline) * N) or calc(var(--baseline-half) * N) — accept symbolically
  if (/^calc\(\s*var\(\s*--baseline(?:-half)?\s*\)\s*\*\s*[\d.]+\s*\)$/.test(v)) return 'compliant';
  // calc(N * var(--baseline)) order swapped
  if (/^calc\(\s*[\d.]+\s*\*\s*var\(\s*--baseline(?:-half)?\s*\)\s*\)$/.test(v)) return 'compliant';

  // Generic calc with --baseline/--baseline-half (best-effort): accept
  if (/^calc\(.*var\(\s*--baseline(?:-half)?\s*\).*\)$/.test(v)) return 'compliant';

  // var(--token) — resolve 1 level
  const varMatch = v.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*[^)]+)?\)$/i);
  if (varMatch) {
    const tok = varMatch[1];
    if (Object.prototype.hasOwnProperty.call(TOKEN_MAP, tok)) {
      const n = TOKEN_MAP[tok];
      if (n === 0) return 'compliant';
      if (n <= 4) return 'compliant';
      if (n % 24 === 0 || n % 12 === 0) return 'compliant';
      return 'violation';
    }
    return 'ignore';
  }

  // Literal px / unitless
  const pxMatch = v.match(/^(-?[\d.]+)px$/);
  const numMatch = v.match(/^(-?[\d.]+)$/);
  if (pxMatch || numMatch) {
    const n = Math.abs(Number((pxMatch || numMatch)[1]));
    if (n === 0) return 'compliant';
    if (n <= 4) return 'compliant'; // border-like tolerance
    if (n % 24 === 0 || n % 12 === 0) return 'compliant';
    return 'violation';
  }

  // rem / em / %, etc. — ignore (not directly comparable)
  if (/^-?[\d.]+(rem|em|%|vh|vw|ch|ex)$/.test(v)) return 'ignore';

  return 'ignore';
}

// ---------------------------------------------------------------------------
// Block splitting (naive parser — sufficient for module CSS without nesting)
// ---------------------------------------------------------------------------

/**
 * @param {string} source
 * @returns {Array<{selector: string; body: string; startLine: number; endIndex: number}>}
 */
export function splitBlocks(source) {
  /** @type {Array<{selector: string; body: string; startLine: number; endIndex: number}>} */
  const blocks = [];
  let depth = 0;
  let blockStart = -1;
  let selectorStart = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      if (depth === 0) blockStart = i + 1;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && blockStart >= 0) {
        const selectorRaw = source.slice(selectorStart, blockStart - 1).trim();
        const body = source.slice(blockStart, i);
        const startLine = source.slice(0, blockStart).split('\n').length;
        blocks.push({ selector: selectorRaw, body, startLine, endIndex: i });
        selectorStart = i + 1;
        blockStart = -1;
      }
    }
  }
  return blocks;
}

/**
 * Determine if a block represents a vertical-flow container for gap purposes.
 * @param {string} body
 * @param {string} filePath
 */
export function isVerticalContainer(body, filePath) {
  if (/flex-direction\s*:\s*column/i.test(body)) return true;
  if (/grid-auto-flow\s*:\s*row/i.test(body)) return true;
  const base = filePath.toLowerCase();
  if (/(list|stack|column)/.test(base)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Shorthand vertical extraction (padding / margin)
// ---------------------------------------------------------------------------

/**
 * Given a shorthand value (1–4 tokens), return [top, bottom] components.
 * @param {string} rawVal
 * @returns {string[]}
 */
export function extractVerticalShorthand(rawVal) {
  const tokens = [];
  let depth = 0;
  let cur = '';
  const v = rawVal.trim();
  for (let i = 0; i < v.length; i += 1) {
    const ch = v[i];
    if (ch === '(') {
      depth += 1;
      cur += ch;
    } else if (ch === ')') {
      depth -= 1;
      cur += ch;
    } else if (/\s/.test(ch) && depth === 0) {
      if (cur.length > 0) {
        tokens.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) tokens.push(cur);

  if (tokens.length === 1) return [tokens[0], tokens[0]];
  if (tokens.length === 2) return [tokens[0], tokens[0]];
  if (tokens.length === 3) return [tokens[0], tokens[2]];
  if (tokens.length >= 4) return [tokens[0], tokens[2]];
  return [];
}

// ---------------------------------------------------------------------------
// Per-file scan
// ---------------------------------------------------------------------------

/**
 * @param {string} filePath
 * @returns {{ compliant: number; governed: number; violations: Array<{file:string;line:number;prop:string;value:string}> }}
 */
export function scanFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const blocks = splitBlocks(source);

  let compliant = 0;
  let governed = 0;
  /** @type {Array<{file:string;line:number;prop:string;value:string}>} */
  const violations = [];

  const lineStarts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') lineStarts.push(i + 1);
  }
  /** @param {number} absOffset */
  function offsetToLine(absOffset) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= absOffset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  for (const block of blocks) {
    const bodyStartAbs = source.indexOf(block.body, 0);
    const verticalCtx = isVerticalContainer(block.body, filePath);

    const declRegex = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/g;
    let m;
    while ((m = declRegex.exec(block.body)) !== null) {
      const prop = m[1].toLowerCase();
      const value = m[2].trim();
      const line = bodyStartAbs >= 0 ? offsetToLine(bodyStartAbs + m.index) : block.startLine;

      if (prop === 'height' || prop === 'min-height' || prop === 'max-height') {
        const cls = classifyValue(value);
        if (cls === 'ignore') continue;
        governed += 1;
        if (cls === 'compliant') compliant += 1;
        else violations.push({ file: filePath, line, prop, value });
        continue;
      }

      if (
        prop === 'padding-top' ||
        prop === 'padding-bottom' ||
        prop === 'margin-top' ||
        prop === 'margin-bottom'
      ) {
        const cls = classifyValue(value);
        if (cls === 'ignore') continue;
        governed += 1;
        if (cls === 'compliant') compliant += 1;
        else violations.push({ file: filePath, line, prop, value });
        continue;
      }

      if (prop === 'padding' || prop === 'margin') {
        const verts = extractVerticalShorthand(value);
        for (let idx = 0; idx < verts.length; idx += 1) {
          const cls = classifyValue(verts[idx]);
          if (cls === 'ignore') continue;
          governed += 1;
          if (cls === 'compliant') compliant += 1;
          else
            violations.push({
              file: filePath,
              line,
              prop: `${prop}(${idx === 0 ? 'top' : 'bottom'})`,
              value: verts[idx],
            });
        }
        continue;
      }

      if (prop === 'gap' || prop === 'row-gap') {
        if (prop === 'row-gap' || verticalCtx) {
          const verts = extractVerticalShorthand(value);
          const rowVal = verts.length > 0 ? verts[0] : value;
          const cls = classifyValue(rowVal);
          if (cls === 'ignore') continue;
          governed += 1;
          if (cls === 'compliant') compliant += 1;
          else violations.push({ file: filePath, line, prop, value: rowVal });
        }
        continue;
      }
    }
  }

  return { compliant, governed, violations };
}
