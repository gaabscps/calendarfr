import type { Meta, StoryObj } from '@storybook/react';

import focusRingStyles from './focusRing.module.css';

/**
 * FocusRing — CSS utility for consistent focus-visible ring.
 *
 * Not a React component. Import the CSS module and apply the `.focusable`
 * class to any custom focusable element that is not already a Button,
 * IconButton or Checkbox atom (those have their own :focus-visible rules).
 *
 * ```tsx
 * import focusRingStyles from '@/shared/components/FocusRing/focusRing.module.css';
 * // or via barrel:
 * import { focusRingStyles } from '@/shared/components/FocusRing';
 *
 * <div tabIndex={0} className={focusRingStyles.focusable}>custom</div>
 * ```
 *
 * The ring is driven by two CSS custom properties exposed by GlobalStyles:
 * - `--focus-ring`: `2px solid var(--color-accent)` (≈4.8:1 contrast, WCAG AA)
 * - `--focus-ring-offset`: `2px`
 */

/* Proxy component so Storybook can render stories without a real React component */
function FocusRingDemo({
  withClass,
  element,
}: {
  withClass: boolean;
  element: 'button' | 'a' | 'div';
}) {
  const className = withClass ? focusRingStyles.focusable : undefined;
  const label = withClass ? 'With .focusable (focus me)' : 'Without .focusable (focus me)';

  if (element === 'button') {
    return (
      <button className={className} style={{ padding: '8px 16px', cursor: 'pointer' }}>
        {label}
      </button>
    );
  }

  if (element === 'a') {
    return (
      <a href="#" className={className} style={{ padding: '8px 16px', display: 'inline-block' }}>
        {label}
      </a>
    );
  }

  return (
    <div
      tabIndex={0}
      className={className}
      style={{ padding: '8px 16px', display: 'inline-block', cursor: 'default' }}
    >
      {label}
    </div>
  );
}

const meta = {
  title: 'Shared/FocusRing',
  component: FocusRingDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'CSS utility class that applies the canonical focus-visible ring via `var(--focus-ring)`. Tab into each element below to compare behaviour with and without the class.',
      },
    },
  },
} satisfies Meta<typeof FocusRingDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before: native `<button>` without `.focusable` — browser default outline (or none). */
export const ButtonBefore: Story = {
  name: 'button — before (no class)',
  args: { withClass: false, element: 'button' },
};

/** After: `<button>` with `.focusable` — canonical 2px accent ring. */
export const ButtonAfter: Story = {
  name: 'button — after (.focusable)',
  args: { withClass: true, element: 'button' },
};

/** Before: `<a>` without `.focusable`. */
export const LinkBefore: Story = {
  name: 'a — before (no class)',
  args: { withClass: false, element: 'a' },
};

/** After: `<a>` with `.focusable`. */
export const LinkAfter: Story = {
  name: 'a — after (.focusable)',
  args: { withClass: true, element: 'a' },
};

/** Before: `<div tabIndex={0}>` without `.focusable` — no visible focus. */
export const DivBefore: Story = {
  name: 'div[tabindex] — before (no class)',
  args: { withClass: false, element: 'div' },
};

/** After: `<div tabIndex={0}>` with `.focusable` — explicit ring via outline. */
export const DivAfter: Story = {
  name: 'div[tabindex] — after (.focusable)',
  args: { withClass: true, element: 'div' },
};
