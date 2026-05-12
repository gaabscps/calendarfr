import { render } from '@testing-library/react';

import { GlobalStyles } from '../GlobalStyles';
import * as tokens from '../tokens';

function kebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

describe('GlobalStyles', () => {
  it('exposes every token key as CSS custom property in :root', () => {
    render(<GlobalStyles />);
    const styleTag = document.querySelector('style');
    const css = styleTag?.innerHTML ?? '';

    const checks = [
      // colors
      ...Object.keys(tokens.colors).map((k) => `--color-${kebab(k)}`),
      // spacing
      ...Object.keys(tokens.spacing).map((k) => `--spacing-${k}`),
      // fontSize
      ...Object.keys(tokens.fontSize).map((k) => `--font-size-${k}`),
      // motion — only string values (skip motion.spring which is an object)
      ...Object.keys(tokens.motion)
        .filter((k) => typeof tokens.motion[k as keyof typeof tokens.motion] === 'string')
        .map((k) => `--motion-${k}`),
      // radii
      ...Object.keys(tokens.radii).map((k) => `--radius-${k}`),
      // shadows
      ...Object.keys(tokens.shadows).map((k) => `--shadow-${kebab(k)}`),
      // zIndex
      ...Object.keys(tokens.zIndex).map((k) => `--z-${k}`),
      // focusRing (explicit)
      '--focus-ring',
      '--focus-ring-offset',
      // fonts/paper (already exist)
      '--font-hand',
      '--font-body',
      '--font-mono',
      '--paper-rule',
      // baseline rhythm (FEAT-017)
      '--baseline',
      '--baseline-half',
    ];

    for (const cssVar of checks) {
      expect(css).toContain(cssVar + ':');
    }
  });

  it('exposes --baseline=24px and --baseline-half=12px in :root (FEAT-017)', () => {
    render(<GlobalStyles />);
    const styleTag = document.querySelector('style');
    const css = styleTag?.innerHTML ?? '';

    expect(css).toMatch(/--baseline:\s*24px/);
    expect(css).toMatch(/--baseline-half:\s*12px/);
  });
});
