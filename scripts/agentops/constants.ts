/**
 * AgentOps observability extractor — industrial threshold constants.
 * Each constant cites its source reference.
 */

// Galileo healthy escalation band (ref: Galileo blog, 2026 — "10–15% escalation rate is healthy")
export const GALILEO_HEALTHY_ESCALATION_BAND = { lower: 0.1, upper: 0.15 } as const;

// Project heuristic: task success rate (trust score) below 60% warrants investigation
export const TRUST_SCORE_INVESTIGATE_THRESHOLD = 0.6;

// Project heuristic: task success rate at or above 80% is considered healthy/positive signal
export const TRUST_SCORE_HEALTHY_THRESHOLD = 0.8;

// Project heuristic: loop rate above 50% suggests systemic re-work — investigate preflight contract
export const LOOP_RATE_INVESTIGATE_THRESHOLD = 0.5;

/**
 * Paths to scan for token usage within each Output Packet JSON object.
 * Ordered by preference (most standard first).
 * Ref: OpenTelemetry GenAI Semantic Conventions (https://opentelemetry.io/docs/specs/semconv/gen-ai/)
 */
export const TOKEN_PATHS: readonly (readonly string[])[] = [
  // OTel GenAI semconv — preferred standard namespace
  ['gen_ai', 'usage', 'total_tokens'],
  // Common usage block — total tokens (sum of input + output)
  ['usage', 'total_tokens'],
  // OTel GenAI semconv — input tokens (combined with output_tokens when total absent)
  ['usage', 'input_tokens'],
  // OTel GenAI semconv — output tokens (combined with input_tokens when total absent)
  ['usage', 'output_tokens'],
  // Legacy / custom metadata block
  ['metadata', 'tokens'],
] as const;
