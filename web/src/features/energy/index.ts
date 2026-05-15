/**
 * Barrel — única superfície pública da feature energy.
 * Outras features só importam daqui.
 *
 * EnergyButton/EnergyPalette serão adicionados em tasks futuras (T8/T9).
 */

export { useEnergySuggestion } from './hooks/useEnergySuggestion.js';
export { ENERGY_PALETTE } from './lib/palette.js';
export type { Energy } from './types.js';
export type { PaletteEntry } from './lib/palette.js';
