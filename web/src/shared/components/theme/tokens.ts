export const colors = {
  paper: '#fff9f0',
  paperLine: '#e8e0d0',
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
} as const;

export const paper = {
  rule: `repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 17px,
    #e8e0d0 17px,
    #e8e0d0 18px
  )`,
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
  spring: { type: 'spring' as const, stiffness: 220, damping: 20 },
} as const;

export interface Tokens {
  colors: typeof colors;
  fonts: typeof fonts;
  paper: typeof paper;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  motion: typeof motion;
}
