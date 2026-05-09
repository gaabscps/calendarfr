/**
 * Phase history and expected pipeline normalisation.
 */

import type { Session } from '../types';

import { isRecord, isArray, isRole, isPhaseName } from './guards';

export function normalisePhases(sessionYml: unknown): Session['phases'] {
  if (!isRecord(sessionYml)) return [];
  const history = sessionYml.phase_history;
  if (!isArray(history)) return [];

  return history.flatMap((entry): Session['phases'] => {
    if (!isRecord(entry)) return [];
    const name = entry.phase;
    if (!isPhaseName(name)) return [];
    const startedAt = typeof entry.started_at === 'string' ? entry.started_at : null;
    const completedAt = typeof entry.completed_at === 'string' ? entry.completed_at : null;
    const status = typeof entry.artifact_status === 'string' ? entry.artifact_status : 'unknown';
    return [{ name, startedAt, completedAt, status }];
  });
}

export function normaliseExpectedPipeline(manifest: unknown): Session['expectedPipeline'] {
  if (!isRecord(manifest)) return [];
  const pipeline = manifest.expected_pipeline;
  if (!isArray(pipeline)) return [];
  return pipeline.flatMap((entry): Session['expectedPipeline'] => {
    if (!isRecord(entry)) return [];
    const requiredRoles = isArray(entry.required_roles) ? entry.required_roles.filter(isRole) : [];
    // Use exactOptionalPropertyTypes-compatible spread: only include optional fields when defined
    const item: Session['expectedPipeline'][number] = { requiredRoles };
    if (typeof entry.batch_id === 'string') item.batchId = entry.batch_id;
    if (typeof entry.task_id === 'string') item.taskId = entry.task_id;
    return [item];
  });
}
