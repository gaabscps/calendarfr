import {
  baseline,
  colors,
  fonts,
  fontSize,
  focusRing,
  motion,
  paper,
  radii,
  shadows,
  spacing,
  zIndex,
} from './tokens';

const css = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  body {
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--color-paper);
    color: var(--color-ink);
  }

  :root {
    --color-paper: ${colors.paper};
    --color-paper-line: ${colors.paperLine};
    --color-ink: ${colors.ink};
    --color-ink-secondary: ${colors.inkSecondary};
    --color-ink-muted: ${colors.inkMuted};
    --color-accent: ${colors.accent};
    --color-shadow: ${colors.shadow};
    --color-danger: ${colors.danger};
    --color-success: ${colors.success};
    --paper-rule: ${paper.rule};
    --font-hand: ${fonts.hand};
    --font-body: ${fonts.body};
    --font-mono: ${fonts.mono};
    --shadow-paper: ${shadows.paper};
    --shadow-floating: ${shadows.floating};
    --radius-sm: ${radii.sm}px;
    --radius-md: ${radii.md}px;
    --radius-lg: ${radii.lg}px;
    --radius-full: ${radii.full}px;
    --spacing-none: ${spacing.none};
    --spacing-xs: ${spacing.xs}px;
    --spacing-sm: ${spacing.sm}px;
    --spacing-md: ${spacing.md}px;
    --spacing-base: ${spacing.base}px;
    --spacing-lg: ${spacing.lg}px;
    --spacing-xl: ${spacing.xl}px;
    --spacing-2xl: ${spacing['2xl']}px;
    --spacing-3xl: ${spacing['3xl']}px;
    --font-size-xs: ${fontSize.xs};
    --font-size-sm: ${fontSize.sm};
    --font-size-base: ${fontSize.base};
    --font-size-lg: ${fontSize.lg};
    --font-size-xl: ${fontSize.xl};
    --font-size-display: ${fontSize.display};
    --motion-fast: ${motion.fast};
    --motion-base: ${motion.base};
    --motion-slow: ${motion.slow};
    --motion-page: ${motion.page};
    --motion-pulse: ${motion.pulse};
    --focus-ring: ${focusRing.ring};
    --focus-ring-offset: ${focusRing.offset};
    --z-base: ${zIndex.base};
    --z-dropdown: ${zIndex.dropdown};
    --z-toolbar: ${zIndex.toolbar};
    --z-modal: ${zIndex.modal};
    --baseline: ${baseline.base}px;
    --baseline-half: ${baseline.half}px;
  }
`;

export function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
