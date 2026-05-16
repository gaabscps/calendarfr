export const colors = {
  paper: '#fff9f0',
  paperLine: '#e8e0d0',
  paperLineSoft: '#ede5d2',
  paperMargin: 'rgba(192,57,43,0.32)',
  paperVignette: 'rgba(60,40,20,0.08)',
  /** Cor da "mesa" sob a página — tom de couro/madeira clara para contraste suave com o papel. */
  desk: '#d8c9ad',
  ink: '#2c2416',
  inkSecondary: '#5a4a32',
  inkMuted: '#9a8a72',
  accent: '#c0392b',
  shadow: 'rgba(60,40,20,0.12)',
  danger: '#e74c3c',
  success: '#27ae60',
} as const;

export const fonts = {
  hand: "'Caveat', cursive",
  body: "'Inter', sans-serif",
  mono: "'Courier New', Courier, monospace",
} as const;

/**
 * Fibra de papel — SVG noise inline (feTurbulence). Tile 160x160 com opacidade
 * muito baixa (5%) para imitar grão do Moleskine sem virar ruído visual.
 */
const paperFiberSvg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18 0 0 0 0 0.14 0 0 0 0 0.08 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.18'/></svg>";

/** Textura de fibra mais densa para a "mesa" — tom amarelado mais saturado. */
const deskFiberSvg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.22 0 0 0 0 0.16 0 0 0 0 0.08 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.28'/></svg>";

export const paper = {
  rule: `repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 23px,
    #e8e0d0 23px,
    #e8e0d0 24px
  )`,
  fiber: `url("${paperFiberSvg}")`,
  deskFiber: `url("${deskFiberSvg}")`,
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radii = {
  sm: 2,
  md: 4,
  lg: 8,
  full: 9999,
} as const;

export const shadows = {
  paper: '0 4px 16px rgba(60,40,20,0.12)',
  floating: '0 8px 32px rgba(60,40,20,0.18)',
} as const;

export const motion = {
  fast: '120ms',
  base: '220ms',
  slow: '320ms',
  page: '300ms',
  pulse: '1.4s',
  spring: { type: 'spring' as const, stiffness: 220, damping: 20 },
} as const;

/**
 * Vertical rhythm contract (FEAT-017):
 * - height, min-height, max-height, padding-top, padding-bottom,
 *   margin-top, margin-bottom, gap em flex-column => múltiplos de
 *   24 (--baseline) ou 12 (--baseline-half). Sem outros valores.
 * - horizontals (width, padding-left/right, margin-left/right,
 *   gap em flex-row) => livres, mas preferir --spacing-* tokens.
 * Verificado por scripts/rhythm-check.mjs (CI).
 */
export const baseline = {
  base: 24,
  half: 12,
} as const;

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.5rem',
  display: '3rem',
} as const;

export const focusRing = {
  ring: '2px solid var(--color-accent)',
  offset: '2px',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  toolbar: 200,
  modal: 1000,
} as const;

export interface Tokens {
  colors: typeof colors;
  fonts: typeof fonts;
  paper: typeof paper;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  motion: typeof motion;
  fontSize: typeof fontSize;
  focusRing: typeof focusRing;
  zIndex: typeof zIndex;
  baseline: typeof baseline;
}
