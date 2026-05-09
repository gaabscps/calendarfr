/**
 * flow-report/header.ts — H1, status block, and Insights section.
 * Extracted from flow-report.ts (T-013 refactor).
 */

import type { Insight, Metrics } from '../../types';

export function renderHeader(
  metrics: Metrics,
  insights: Insight[],
  generatedAt: string,
  featureName: string,
  currentPhase: string,
): string {
  const sections: string[] = [];

  // H1
  sections.push(`# ${featureName} — ${metrics.taskId}`);

  // Status block
  sections.push(
    [
      `> Feature: ${featureName}`,
      `> Task ID: ${metrics.taskId}`,
      `> Phase: ${currentPhase}`,
      `> Generated at: ${generatedAt}`,
    ].join('\n'),
  );

  // Insights
  if (insights.length === 0) {
    sections.push('## Insights\n\nNo insights triggered.');
  } else {
    const bullets = insights
      .map((i) => {
        const prefix = i.severity === 'warn' ? '⚠' : i.severity === 'error' ? '✖' : 'ℹ';
        const src = i.source ? ` _(${i.source})_` : '';
        return `- ${prefix} ${i.message}${src}`;
      })
      .join('\n');
    sections.push(`## Insights\n\n${bullets}`);
  }

  return sections.join('\n\n');
}
