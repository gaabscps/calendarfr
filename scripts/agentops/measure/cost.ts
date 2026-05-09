/**
 * measure/cost.ts — token cost metric sub-function.
 * All functions are pure (no I/O, no Date.now(), no random).
 * Uses TOKEN_PATHS from constants.ts for best-effort scan (Plan D14, AC-022).
 */

import { TOKEN_PATHS } from '../constants';
import type { Session } from '../types';

interface TokenCost {
  total: number | null;
  perAc: number | null;
}

/**
 * Deep-reads a nested path from an object.
 * Returns the value if found and it is a number, otherwise undefined.
 */
function getNestedNumber(
  obj: Record<string, unknown>,
  pathArr: readonly string[],
): number | undefined {
  let current: unknown = obj;
  for (const key of pathArr) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'number' ? current : undefined;
}

/**
 * Extracts total token count from a single Output Packet.
 * Scans TOKEN_PATHS in order.
 *
 * Special handling for split tokens (input + output, no total):
 * when 'usage.input_tokens' and 'usage.output_tokens' are both present but
 * 'usage.total_tokens' is absent, we sum them.
 */
function extractTokensFromPacket(data: unknown): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  // Try each TOKEN_PATH in order
  for (const tokenPath of TOKEN_PATHS) {
    // Skip the individual input/output paths in the first pass — handled below
    const pathKey = tokenPath.join('.');
    if (pathKey === 'usage.input_tokens' || pathKey === 'usage.output_tokens') {
      continue;
    }
    const value = getNestedNumber(obj, tokenPath);
    if (value !== undefined) return value;
  }

  // Fallback: try summing input_tokens + output_tokens
  const inputTokens = getNestedNumber(obj, ['usage', 'input_tokens']);
  const outputTokens = getNestedNumber(obj, ['usage', 'output_tokens']);
  if (inputTokens !== undefined && outputTokens !== undefined) {
    return inputTokens + outputTokens;
  }

  return null;
}

/**
 * Computes total token cost across all dispatches with output packets.
 * Returns null for total/perAc if no output packet has token data (AC-023).
 */
export function computeTokenCost(session: Session): TokenCost {
  let total = 0;
  let hasAnyTokenData = false;

  for (const d of session.dispatches) {
    if (!d.outputPacket) continue;
    const tokens = extractTokensFromPacket(d.outputPacket);
    if (tokens !== null) {
      total += tokens;
      hasAnyTokenData = true;
    }
  }

  if (!hasAnyTokenData) {
    return { total: null, perAc: null };
  }

  const totalAcs = session.acs.length;
  const perAc = totalAcs > 0 ? total / totalAcs : null;
  return { total, perAc };
}
