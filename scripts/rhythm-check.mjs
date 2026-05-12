#!/usr/bin/env node
/**
 * rhythm-check.mjs — Vertical rhythm (baseline grid) CLI entry
 *
 * Delegates scanning to ./rhythm-check-scan.mjs. This module owns CLI args,
 * aggregation, reporting and exit-code policy only.
 *
 * Governed properties, accepted values and resolution rules: see scan module.
 *
 * CLI: --threshold N (default 90); env RHYTHM_THRESHOLD overrides default.
 * Exit 0 if score ≥ threshold; exit 1 otherwise.
 */

import { relative } from 'path';
import { getCssFiles, scanFile, ROOT } from './rhythm-check-scan.mjs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseThreshold() {
  const envVal = process.env.RHYTHM_THRESHOLD;
  let threshold = envVal !== undefined ? Number(envVal) : 90;

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--threshold' && i + 1 < args.length) {
      threshold = Number(args[i + 1]);
      i += 1;
    } else if (args[i].startsWith('--threshold=')) {
      threshold = Number(args[i].slice('--threshold='.length));
    }
  }

  if (!Number.isFinite(threshold)) {
    console.error('rhythm-check: invalid threshold value; falling back to 90');
    threshold = 90;
  }
  return threshold;
}

const THRESHOLD = parseThreshold();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = getCssFiles();

if (files.length === 0) {
  console.error('rhythm-check: no *.module.css files found under web/src/');
  process.exit(1);
}

let totalCompliant = 0;
let totalGoverned = 0;
/** @type {Array<{file:string;line:number;prop:string;value:string}>} */
const allViolations = [];

for (const file of files) {
  const { compliant, governed, violations } = scanFile(file);
  totalCompliant += compliant;
  totalGoverned += governed;
  for (const v of violations) allViolations.push(v);
}

const score = totalGoverned === 0 ? 100 : (totalCompliant / totalGoverned) * 100;

console.log('');
console.log('## Vertical Rhythm Check\n');
console.log(`Files scanned:       ${files.length}`);
console.log(`Governed decls:      ${totalGoverned}`);
console.log(`Compliant decls:     ${totalCompliant}`);
console.log(`Violations:          ${allViolations.length}`);
console.log(`Score:               ${score.toFixed(1)}%`);
console.log(`Threshold:           ${THRESHOLD}%`);
console.log('');

if (allViolations.length > 0) {
  console.error('### Rhythm violations (not a multiple of 12 or 24):\n');
  for (const v of allViolations) {
    const rel = relative(ROOT, v.file);
    console.error(`  ${rel}:${v.line}  ${v.prop}: ${v.value}`);
  }
  console.error('');
}

if (score >= THRESHOLD) {
  console.log(`OK — score ${score.toFixed(1)}% meets threshold ${THRESHOLD}%.`);
  process.exit(0);
} else {
  console.error(`FAIL — score ${score.toFixed(1)}% below threshold ${THRESHOLD}%.`);
  process.exit(1);
}
