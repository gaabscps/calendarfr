#!/usr/bin/env node
/**
 * tokens-check.mjs — CSS Design Token Coverage Checker
 *
 * Scans web/src/**\/*.module.css and verifies that spacing, color, typography
 * and other design values reference CSS custom properties (var(--)) instead of
 * hardcoded values.
 *
 * Exit 0  — total coverage ≥ 95% AND no tracked category below 80%
 *           (categories with < 5 total declarations are excluded from the
 *            per-category threshold to avoid noise).
 * Exit 1  — threshold violated or script error.
 */

import { relative } from 'path';
import { getCssFiles, scanFile, CATEGORIES, ROOT } from './tokens-check-scan.mjs';

// ---------------------------------------------------------------------------
// 1. Collect files
// ---------------------------------------------------------------------------

const files = await getCssFiles();

if (files.length === 0) {
  console.error('tokens-check: no *.module.css files found under web/src/');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Aggregate per-category and per-file stats
// ---------------------------------------------------------------------------

/** @type {Record<string, {tokenized: number; total: number}>} */
const globalCategories = {};
for (const { label } of CATEGORIES) {
  globalCategories[label] = { tokenized: 0, total: 0 };
}

/** @type {Array<{file: string; total: number; nonTokenized: number}>} */
const fileStats = [];

for (const file of files) {
  const { categories, total, nonTokenized } = scanFile(file);
  fileStats.push({ file, total, nonTokenized });

  for (const [label, stats] of Object.entries(categories)) {
    globalCategories[label].tokenized += stats.tokenized;
    globalCategories[label].total += stats.total;
  }
}

// ---------------------------------------------------------------------------
// 3. Compute totals
// ---------------------------------------------------------------------------

let grandTotal = 0;
let grandTokenized = 0;
for (const stats of Object.values(globalCategories)) {
  grandTotal += stats.total;
  grandTokenized += stats.tokenized;
}

const grandCoverage = grandTotal === 0 ? 100 : (grandTokenized / grandTotal) * 100;

// ---------------------------------------------------------------------------
// 4. Print Markdown table
// ---------------------------------------------------------------------------

/** @param {string|number} s @param {number} n */
const pad = (s, n) => String(s).padEnd(n);

console.log('');
console.log('## CSS Token Coverage Report\n');
console.log('| Category             | Tokenized | Total | Coverage |');
console.log('| -------------------- | --------- | ----- | -------- |');

for (const { label } of CATEGORIES) {
  const { tokenized, total } = globalCategories[label];
  const pct = total === 0 ? '—' : `${((tokenized / total) * 100).toFixed(1)}%`;
  console.log(`| ${pad(label, 20)} | ${pad(tokenized, 9)} | ${pad(total, 5)} | ${pct.padEnd(8)} |`);
}

console.log('| -------------------- | --------- | ----- | -------- |');
// Use fixed-width label for TOTAL to avoid padEnd miscounting markdown bold
console.log(
  `| ${'TOTAL'.padEnd(20)} | ${pad(grandTokenized, 9)} | ${pad(grandTotal, 5)} | ${grandCoverage.toFixed(1)}% |`,
);
console.log('');

// ---------------------------------------------------------------------------
// 5. Top 10 files with lowest coverage
// ---------------------------------------------------------------------------

const sortedFiles = [...fileStats]
  .filter((f) => f.total > 0)
  .sort((a, b) => {
    const aCovPct = (a.total - a.nonTokenized) / a.total;
    const bCovPct = (b.total - b.nonTokenized) / b.total;
    return aCovPct - bCovPct;
  })
  .slice(0, 10);

if (sortedFiles.length > 0) {
  console.log('### Top files with lowest token coverage\n');
  console.log('| File | Total Decls | Non-Tokenized |');
  console.log('| ---- | ----------- | ------------- |');
  for (const { file, total, nonTokenized } of sortedFiles) {
    const rel = relative(ROOT, file);
    console.log(`| ${rel} | ${total} | ${nonTokenized} |`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// 6. Threshold enforcement
// ---------------------------------------------------------------------------

const TOTAL_THRESHOLD = 95;
const CATEGORY_THRESHOLD = 80;
const CATEGORY_MIN_DECLS = 5;

/** @type {string[]} */
const violations = [];

if (grandCoverage < TOTAL_THRESHOLD) {
  violations.push(
    `Total coverage ${grandCoverage.toFixed(1)}% is below required ${TOTAL_THRESHOLD}%`,
  );
}

for (const { label } of CATEGORIES) {
  const { tokenized, total } = globalCategories[label];
  if (total < CATEGORY_MIN_DECLS) continue;
  const pct = (tokenized / total) * 100;
  if (pct < CATEGORY_THRESHOLD) {
    violations.push(
      `Category "${label}" coverage ${pct.toFixed(1)}% is below required ${CATEGORY_THRESHOLD}% (${tokenized}/${total})`,
    );
  }
}

if (violations.length > 0) {
  console.error('### Token coverage violations:\n');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  console.error('');
  console.error('Fix: replace hardcoded values with var(--token) references.');
  process.exit(1);
} else {
  console.log(`All thresholds met (total: ${grandCoverage.toFixed(1)}%).`);
  process.exit(0);
}
