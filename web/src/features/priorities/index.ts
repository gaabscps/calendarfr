/**
 * Public surface of the priorities feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #1).
 * Components will be added in BATCH-B.
 *
 * Covers: AC-019.
 */

// Types
export type { Priority, PrioritiesTuple } from './types.js';
export { EMPTY_PRIORITY } from './types.js';

// Hook
export { usePriorities } from './hooks/usePriorities.js';
export type { UsePrioritiesReturn } from './hooks/usePriorities.js';

// Components
export { Priorities } from './components/Priorities.js';
export { PriorityItem } from './components/PriorityItem.js';
export type { PrioritiesProps } from './components/Priorities.js';
export type { PriorityItemProps } from './components/PriorityItem.js';
