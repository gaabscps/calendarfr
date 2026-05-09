/**
 * AgentOps observability extractor — index.ts (CLI entry)
 * Plan D5–D8, API-1/2/3. Env: AGENTOPS_ROOT, AGENTOPS_OUT.
 * Exit 0 on success (even with warnings), 1 on critical failure.
 */

import { promises as fsp } from 'fs';
import path from 'path';

import { enrich } from './enrich';
import { applyInsightRules, computeTrends } from './insights';
import { measure } from './measure';
import { parse } from './parse';
import { renderFlowReport } from './render/flow-report';
import { renderIndexReport } from './render/index-report';
import { scan } from './scan';
import type { Metrics, Session } from './types';

// ---------------------------------------------------------------------------
// Markdown formatting helpers (NFR-003: output must pass prettier --check).
// Replicates prettier's markdown table alignment without the prettier import
// (prettier 3 uses dynamic imports that break Jest's CJS transform).
// ---------------------------------------------------------------------------

function escapeMdCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/(?<!\*)\*(?!\*)/g, (m, offset: number) => {
    // Lone * with no matching pair in the same cell → escape
    const rest = text.slice(offset + 1);
    const pre = text.slice(0, offset);
    if (/(?<!\*)\*(?!\*)/.test(rest) || /(?<!\*)\*(?!\*)/.test(pre)) return m;
    return '\\*';
  });
}

function escapeMdLine(line: string): string {
  if (line.startsWith('#') || line.startsWith('>') || line.startsWith('!')) {
    return line.replace(/(?<!\\)\*/g, '\\*');
  }
  return line;
}

function alignMarkdownTables(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trimStart().startsWith('|')) {
      result.push(escapeMdLine(line));
      i++;
      continue;
    }
    const tableLines: string[] = [];
    while (i < lines.length && (lines[i]?.trimStart().startsWith('|') ?? false)) {
      tableLines.push(lines[i] ?? '');
      i++;
    }
    const rows = tableLines.map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
    const colCount = rows[0]?.length ?? 0;
    if (colCount === 0) { result.push(...tableLines); continue; } // prettier-ignore
    const escaped = rows.map((r, ri) => (ri === 1 ? r : r.map(escapeMdCell)));
    const widths = Array.from({ length: colCount }, (_, ci) =>
      Math.max(3, ...escaped.map((r) => r[ci]?.length ?? 0)),
    );
    result.push(
      ...escaped.map((r, ri) => {
        const cells =
          ri === 1
            ? widths.map((w) => '-'.repeat(w))
            : widths.map((w, ci) => (r[ci] ?? '').padEnd(w));
        return `| ${cells.join(' | ')} |`;
      }),
    );
  }
  return result.join('\n');
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const formatted = alignMarkdownTables(content);
  const tmp = `${filePath}.tmp`;
  await fsp.writeFile(tmp, formatted, 'utf-8');
  await fsp.rename(tmp, filePath);
}

interface Processed {
  session: Session;
  metrics: Metrics;
}

// ---------------------------------------------------------------------------
// main() — exported for integration tests; guards against module-level side-effects
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const startMs = Date.now();
  const root = process.env.AGENTOPS_ROOT ?? path.join(process.cwd(), '.agent-session');
  const outDir = process.env.AGENTOPS_OUT ?? path.join(process.cwd(), 'docs/agentops');
  const relRoot = path.relative(process.cwd(), root) || root;
  // eslint-disable-next-line no-console
  console.log(`[agentops] scanning ${relRoot}/...`);

  try {
    await fsp.mkdir(outDir, { recursive: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[agentops] fatal: cannot create output dir ${outDir}: ${msg}\n`);
    process.exit(1);
  }

  const sessionPaths = await scan(root);
  const processed: Processed[] = [];

  await Promise.all(
    sessionPaths.map(async (sessionPath) => {
      const taskId = path.basename(sessionPath);
      try {
        const raw = await parse(sessionPath);
        // AC-019: manifest exists but null → corrupted JSON → skip with warning
        if (raw.manifest === null) {
          const manifestPath = path.join(sessionPath, 'dispatch-manifest.json');
          try {
            await fsp.access(manifestPath);
            throw new Error('dispatch-manifest.json exists but contains invalid JSON');
          } catch (e) {
            if (e instanceof Error && e.message.includes('dispatch-manifest.json exists')) throw e;
            // file absent → spec-only session (AC-020), continue
          }
        }
        const session = enrich(raw);
        const baseMetrics = measure(session);
        const insights = applyInsightRules(baseMetrics);
        const m: Metrics = { ...baseMetrics, insights };
        processed.push({ session, metrics: m });
        // eslint-disable-next-line no-console
        console.log(`[agentops] processed ${taskId} (${m.totalDispatches} dispatches)`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[agentops] skipped ${taskId}: ${reason}`);
      }
    }),
  );

  processed.sort((a, b) => a.metrics.taskId.localeCompare(b.metrics.taskId));
  const generatedAt = new Date().toISOString();
  const relOut = path.relative(process.cwd(), outDir) || outDir;

  for (const { metrics } of processed) {
    const md = renderFlowReport(
      metrics,
      metrics.insights,
      generatedAt,
      metrics.featureName,
      metrics.currentPhase,
    );
    const outFile = path.join(outDir, `${metrics.taskId}.md`);
    await atomicWrite(outFile, md);
    // eslint-disable-next-line no-console
    console.log(`[agentops] wrote ${path.join(relOut, `${metrics.taskId}.md`)}`);
  }

  const trendInsights = computeTrends(processed.map((p) => p.metrics));
  const indexMd = renderIndexReport(processed, trendInsights, generatedAt);
  await atomicWrite(path.join(outDir, 'index.md'), indexMd);
  // eslint-disable-next-line no-console
  console.log(`[agentops] wrote ${path.join(relOut, 'index.md')}`);
  // eslint-disable-next-line no-console
  console.log(`[agentops] done in ${((Date.now() - startMs) / 1000).toFixed(2)}s`);
}

/* istanbul ignore next */
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
