import type { MissionId } from '../types.js';

import { MISSION_TARGETS, type MissionTarget } from './missionTargets.js';

export function goToMission(missionId: MissionId, prefersReducedMotion: boolean): void {
  const target = MISSION_TARGETS[missionId];
  // querySelector returns Element|null; cast to HTMLElement needed for focus/classList.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const el = document.querySelector(target.selector) as HTMLElement | null;
  if (!el) return;

  try {
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  } catch {
    /* silent — AC-028 */
  }

  try {
    resolveFocusTarget(el, target.focus)?.focus();
  } catch {
    /* silent — AC-028 */
  }

  try {
    el.classList.add('onboarding-pulse');
  } catch {
    /* silent — AC-028 */
  }
  if (target.hint === 'format') {
    try {
      el.classList.add('onboarding-pulse-format');
    } catch {
      /* silent — AC-028 */
    }
  }
  setTimeout(() => {
    try {
      el.classList.remove('onboarding-pulse');
      el.classList.remove('onboarding-pulse-format');
    } catch {
      /* silent — AC-028 */
    }
  }, 800);
}

function resolveFocusTarget(
  container: HTMLElement,
  mode: MissionTarget['focus'],
): HTMLElement | null {
  switch (mode) {
    case 'self':
      return container;
    case 'input': {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const input = container.querySelector(
        'input, textarea, [contenteditable="true"]',
      ) as HTMLElement | null;
      if (!input) {
        const trigger = container.querySelector('button');
        if (trigger) {
          trigger.click();
          requestAnimationFrame(() => {
            const newInput =
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              container.querySelector(
                'input, textarea, [contenteditable="true"]',
              ) as HTMLElement | null;
            newInput?.focus();
          });
        }
        return null;
      }
      return input;
    }
    case 'firstRichText':
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return container.querySelector(
        '[role="textbox"], [contenteditable="true"]',
      ) as HTMLElement | null;
    case 'firstCheckbox':
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return container.querySelector(
        'input[type="checkbox"], [role="checkbox"]',
      ) as HTMLElement | null;
    case 'firstRichTextOrButton':
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return container.querySelector(
        '[role="textbox"], [contenteditable="true"], button, [role="button"]',
      ) as HTMLElement | null;
  }
}
