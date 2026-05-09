/**
 * Dispatch normalisation, QA results aggregation, and output packet attachment.
 */

import type { RawSession, Session } from '../types';

import { isRecord, isArray, isRole, isDispatchStatus, isQaStatus } from './guards';

export function normaliseDispatches(manifest: unknown): Session['dispatches'] {
  if (!isRecord(manifest)) return [];
  const actualDispatches = manifest.actual_dispatches;
  if (!isArray(actualDispatches)) return [];

  return actualDispatches.flatMap((raw): Session['dispatches'] => {
    if (!isRecord(raw)) return [];
    const role = raw.role;
    const status = raw.status;
    const dispatchId = raw.dispatch_id;
    const startedAt = raw.started_at;

    if (!isRole(role) || !isDispatchStatus(status)) return [];
    if (typeof dispatchId !== 'string' || typeof startedAt !== 'string') {
      return [];
    }

    const completedAt = typeof raw.completed_at === 'string' ? raw.completed_at : null;
    const loop =
      typeof raw.loop === 'number'
        ? raw.loop
        : typeof raw.review_loop === 'number'
          ? raw.review_loop
          : null;
    const pmNote = typeof raw.pm_note === 'string' ? raw.pm_note : null;

    return [
      {
        dispatchId,
        role,
        status,
        startedAt,
        completedAt,
        outputPacket: null, // resolved later by caller if needed
        loop,
        pmNote,
      },
    ];
  });
}

export function aggregateQaResults(outputs: RawSession['outputs']): Session['qaResults'] {
  const results: Session['qaResults'] = [];
  for (const output of outputs) {
    if (!isRecord(output.data)) continue;
    const role = output.data.role;
    if (role !== 'qa') continue;
    const acCoverage = output.data.ac_coverage;
    if (!isArray(acCoverage)) continue;
    for (const entry of acCoverage) {
      if (!isRecord(entry)) continue;
      const ac = entry.ac;
      const status = entry.status;
      if (typeof ac === 'string' && isQaStatus(status)) {
        results.push({ ac, status });
      }
    }
  }
  return results;
}

export function attachOutputPackets(
  dispatches: Session['dispatches'],
  outputs: RawSession['outputs'],
): Session['dispatches'] {
  return dispatches.map((d) => {
    const match = outputs.find((o) => {
      if (!isRecord(o.data)) return false;
      return o.data.dispatch_id === d.dispatchId;
    });
    if (match && isRecord(match.data)) {
      return { ...d, outputPacket: match.data };
    }
    return d;
  });
}
