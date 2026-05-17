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
    min-height: 100vh;
  }

  html, #root {
    padding: 0;
  }

  #root {
    display: flex;
    flex-direction: column;
  }

  body {
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: var(--color-ink);
    /* "Mesa" — superfície sob a página. Tom couro/madeira clara com fibra
       sutil. O padding cria o espaço onde a mesa aparece em torno do papel. */
    background-color: var(--color-desk);
    background-image: var(--paper-desk-fiber);
    background-attachment: fixed;
    padding: var(--spacing-lg);
  }

  @media (max-width: 767px) {
    body {
      /* Mobile: papel ocupa quase toda tela; mesa aparece só como halo fino. */
      padding: var(--spacing-sm);
    }
  }

  :root {
    --color-paper: ${colors.paper};
    --color-paper-line: ${colors.paperLine};
    --color-paper-line-soft: ${colors.paperLineSoft};
    --color-paper-margin: ${colors.paperMargin};
    --color-paper-vignette: ${colors.paperVignette};
    --color-desk: ${colors.desk};
    --color-ink: ${colors.ink};
    --color-ink-secondary: ${colors.inkSecondary};
    --color-ink-muted: ${colors.inkMuted};
    --color-accent: ${colors.accent};
    --color-shadow: ${colors.shadow};
    --color-danger: ${colors.danger};
    --color-success: ${colors.success};
    --paper-rule: ${paper.rule};
    --paper-fiber: ${paper.fiber};
    --paper-desk-fiber: ${paper.deskFiber};
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

// Cross-cutting onboarding pulse — box-shadow so :focus-visible outline coexists (NFR-004).
// Target widgets live in domain features (priorities, agenda, etc) per FEAT-028 AC-024.
const pulseCSS = `
  @keyframes onboarding-pulse-keyframes {
    0%   { box-shadow: 0 0 0 2px transparent; }
    25%  { box-shadow: 0 0 0 2px var(--color-accent); }
    75%  { box-shadow: 0 0 0 2px var(--color-accent); }
    100% { box-shadow: 0 0 0 2px transparent; }
  }
  .onboarding-pulse {
    box-shadow: 0 0 0 2px transparent;
    animation: onboarding-pulse-keyframes 800ms ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .onboarding-pulse {
      animation: none;
      box-shadow: 0 0 0 2px var(--color-accent);
    }
  }
  .onboarding-pulse-format {
    position: relative;
  }
  .onboarding-pulse-format::after {
    content: 'Selecione texto e use a barra flutuante';
    position: absolute;
    bottom: -28px;
    left: 0;
    font-family: var(--font-hand);
    font-size: var(--font-size-sm);
    color: var(--color-accent);
    pointer-events: none;
    animation: onboarding-pulse-keyframes 800ms ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .onboarding-pulse-format::after {
      animation: none;
    }
  }
`;

export function GlobalStyles() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <style dangerouslySetInnerHTML={{ __html: pulseCSS }} />
    </>
  );
}
