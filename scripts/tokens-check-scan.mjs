#!/usr/bin/env node
/**
 * tokens-check-scan.mjs — scanning helpers for tokens-check.mjs
 *
 * Exports:
 *   getCssFiles()  — resolves *.module.css paths under web/src/
 *   scanFile(path) — counts tokenized vs total per CATEGORIES
 *   CATEGORIES     — array of { label, regex } for governed properties
 */

import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';

export const ROOT = new URL('..', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Category definitions (property regex → label)
// ---------------------------------------------------------------------------

/** @type {Array<{label: string; regex: RegExp}>} */
export const CATEGORIES = [
  { label: 'font-size', regex: /\bfont-size\s*:\s*([^;]+)/gi },
  { label: 'gap', regex: /\bgap\s*:\s*([^;]+)/gi },
  { label: 'padding', regex: /\bpadding(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/gi },
  { label: 'margin', regex: /\bmargin(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/gi },
  { label: 'color', regex: /(?<![a-z-])color\s*:\s*([^;]+)/gi },
  { label: 'background', regex: /\bbackground(?:-color)?\s*:\s*([^;]+)/gi },
  { label: 'border-radius', regex: /\bborder-radius\s*:\s*([^;]+)/gi },
  { label: 'box-shadow', regex: /\bbox-shadow\s*:\s*([^;]+)/gi },
  { label: 'transition-duration', regex: /\btransition-duration\s*:\s*([^;]+)/gi },
  { label: 'transition', regex: /\btransition\s*:\s*([^;]+)/gi },
  { label: 'animation-duration', regex: /\banimation-duration\s*:\s*([^;]+)/gi },
  { label: 'animation', regex: /\banimation\s*:\s*([^;]+)/gi },
  { label: 'outline', regex: /\boutline\s*:\s*([^;]+)/gi },
];

// Values always considered trivially tokenized — skip them
export const TRIVIAL = /^\s*(0|none|inherit|initial|transparent|currentcolor|unset)\s*$/i;

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

let _glob = null;
try {
  const fg = await import('fast-glob');
  _glob = fg.default;
} catch {
  _glob = null;
}

/** @returns {Promise<string[]>} */
export async function getCssFiles() {
  if (_glob) {
    return _glob.sync('web/src/**/*.module.css', {
      cwd: ROOT,
      ignore: ['**/node_modules/**', '**/__tests__/**'],
      absolute: true,
    });
  }

  // Fallback: recursive readdir
  const { readdirSync, statSync } = await import('fs');
  /** @param {string} dir */
  function walk(dir) {
    /** @type {string[]} */
    const results = [];
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      const full = pathJoin(dir, entry);
      if (statSync(full).isDirectory()) {
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
// Per-file scanning
// ---------------------------------------------------------------------------

/**
 * @typedef {{ tokenized: number; total: number }} CategoryStats
 */

/**
 * @param {string} value raw CSS value string
 * @returns {{ skip: boolean; tokenized: boolean }}
 */
export function classifyValue(value) {
  const v = value
    .trim()
    .replace(/\/\*.*?\*\//gs, '')
    .trim();
  if (TRIVIAL.test(v)) return { skip: true, tokenized: false };
  return { skip: false, tokenized: v.includes('var(--') };
}

/**
 * @param {string} filePath
 * @returns {{ categories: Record<string, CategoryStats>; total: number; nonTokenized: number }}
 */
export function scanFile(filePath) {
  const source = readFileSync(filePath, 'utf8');

  /** @type {Record<string, CategoryStats>} */
  const categories = {};
  for (const { label } of CATEGORIES) {
    categories[label] = { tokenized: 0, total: 0 };
  }

  for (const { label, regex } of CATEGORIES) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const value = match[1];
      const { skip, tokenized } = classifyValue(value);
      if (skip) continue;
      categories[label].total += 1;
      if (tokenized) categories[label].tokenized += 1;
    }
    regex.lastIndex = 0;
  }

  let total = 0;
  let tokenized = 0;
  for (const stats of Object.values(categories)) {
    total += stats.total;
    tokenized += stats.tokenized;
  }

  return { categories, total, nonTokenized: total - tokenized };
}
