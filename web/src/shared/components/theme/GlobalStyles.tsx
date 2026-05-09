import { colors, fonts, paper, radii, shadows } from './tokens';

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
    --shadow-paper: ${shadows.paper};
    --shadow-floating: ${shadows.floating};
    --radius-sm: ${radii.sm}px;
    --radius-md: ${radii.md}px;
    --radius-lg: ${radii.lg}px;
    --radius-full: ${radii.full}px;
  }
`;

export function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
