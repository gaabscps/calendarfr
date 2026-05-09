/**
 * AgentOps observability extractor — render/index-report.ts
 * T-013: renders the cross-flow index Markdown report (AC-002..AC-005, AC-025).
 *
 * renderIndexReport(allMetrics, trendInsights, generatedAt) → string
 */

import type { Insight, Metrics, Session } from '../types';

// ---------------------------------------------------------------------------
// Status symbol mapping (AC-003)
// ---------------------------------------------------------------------------

type FlowStatus = Metrics['status'];

function statusSymbol(status: FlowStatus): string {
  switch (status) {
    case 'done':
      return '✓';
    case 'escalated':
      return '⚠';
    case 'paused':
      return '⏸';
    case 'running':
    case 'specify-only':
    default:
      return '…';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a number as a percentage string, or '—' for unavailable */
function fmtPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

/** Formats dispatches/AC ratio */
function fmtRatio(value: number): string {
  if (value === 0) return '—';
  return value.toFixed(2);
}

/** Extracts ISO date (YYYY-MM-DD) from ISO timestamp */
function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Builds a Markdown table from headers and rows */
function mdTable(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderCrossFlowTable(allMetrics: { session: Session; metrics: Metrics }[]): string {
  const headers = [
    'ID',
    'Feature',
    'Phase',
    'Status',
    'Dispatches',
    'ACs',
    'Disp/AC',
    'Esc %',
    'Created',
  ];
  const rows = allMetrics.map(({ metrics: m }) => {
    const symbol = statusSymbol(m.status);
    const escPct = m.totalDispatches === 0 ? '—' : fmtPct(m.escalationRate);
    return [
      `${symbol} ${m.taskId}`,
      m.featureName,
      m.currentPhase,
      m.status,
      String(m.totalDispatches),
      String(m.acClosure.total),
      fmtRatio(m.dispatchesPerAc),
      escPct,
      isoDate(m.startedAt),
    ];
  });
  return mdTable(headers, rows);
}

function renderTrends(trendInsights: Insight[], completedFlowCount: number): string {
  if (completedFlowCount < 2) {
    return '## Trends\n\n- (need ≥ 2 completed flows for trend analysis)';
  }
  if (trendInsights.length === 0) {
    return '## Trends\n\n- (need ≥ 2 completed flows for trend analysis)';
  }
  const bullets = trendInsights.map((i) => `- ${i.message}`).join('\n');
  return `## Trends\n\n${bullets}`;
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Renders the cross-flow index Markdown report.
 * Sections: H1, header, cross-flow table (or no-flows message), trends.
 */
export function renderIndexReport(
  allMetrics: { session: Session; metrics: Metrics }[],
  trendInsights: Insight[],
  generatedAt: string,
): string {
  const sections: string[] = [];

  // H1
  sections.push('# AgentOps observability — overview');

  // Header (AC-004)
  sections.push(`> Generated at: ${generatedAt} | Total flows: ${allMetrics.length}`);

  // Cross-flow snapshot (AC-002, AC-003, AC-005)
  sections.push('## Cross-flow snapshot');
  if (allMetrics.length === 0) {
    sections.push('(no flows yet)');
  } else {
    sections.push(renderCrossFlowTable(allMetrics));
  }

  // Trends (AC-025)
  const completedCount = allMetrics.filter((m) => m.metrics.status === 'done').length;
  sections.push(renderTrends(trendInsights, completedCount));

  return sections.join('\n\n') + '\n';
}
