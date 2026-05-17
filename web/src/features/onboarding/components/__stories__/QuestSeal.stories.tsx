import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { QuestSeal } from '../QuestSeal.js';

/**
 * Patches window.matchMedia so useReducedMotion() returns true inside this story.
 * Must run synchronously before component mount.
 */
function ReducedMotionDecorator(Story: Parameters<Decorator>[0]): ReturnType<Decorator> {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = (query: string) => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    }
    return originalMatchMedia(query);
  };
  return <Story />;
}

const reducedMotionDecorator: Decorator = ReducedMotionDecorator;

const meta = {
  title: 'Features/Onboarding/QuestSeal',
  component: QuestSeal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestSeal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pending — dotted outline circle, no fill. Represents a mission not yet completed.
 */
export const Pending: Story = {
  args: {
    completed: false,
  },
};

/**
 * Completed — filled accent-color circle with hand-drawn texture.
 * The seal enters with a spring animation (scale 0→1.15→1 with slight rotation).
 * Use the Controls panel to toggle `completed` back to false.
 *
 * The "Reduced motion" variant uses a plain fade instead of the spring (AC-015).
 */
export const Completed: Story = {
  args: {
    completed: true,
  },
};

/**
 * CompletedReducedMotion — same completed state but with prefers-reduced-motion: reduce.
 * Entrance is a plain opacity fade ≤ 80ms (AC-015, NFR-003).
 */
export const CompletedReducedMotion: Story = {
  args: {
    completed: true,
  },
  decorators: [reducedMotionDecorator],
};
