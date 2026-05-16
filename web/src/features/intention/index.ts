/**
 * Public surface of the intention feature.
 *
 * Intention = palavra/frase curta de intenção do dia (manhã do daily ritual loop).
 * Renderiza como chip handwritten na header, ao lado do MoodPopover.
 */

export { IntentionChip } from './components/IntentionChip.js';
export type { IntentionChipProps } from './components/IntentionChip.js';

export { MAX_INTENTION_LENGTH } from './lib/constants.js';
