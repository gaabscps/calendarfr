import type { MissionId } from '../types.js';

import { MISSION_TARGETS, type MissionTarget } from './missionTargets.js';

export function goToMission(missionId: MissionId, prefersReducedMotion: boolean): void {
  const target = MISSION_TARGETS[missionId];
  // querySelector returns Element|null; cast to HTMLElement needed for focus/classList.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const container = document.querySelector(target.selector) as HTMLElement | null;
  if (!container) return;

  try {
    container.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  } catch {
    /* silent — AC-028 */
  }

  const focusEl = resolveFocusTarget(container, target.focus);
  try {
    focusEl?.focus();
  } catch {
    /* silent — AC-028 */
  }

  // Pulse goes on the focus target (small element), not the container. When the container is a
  // whole feature column (priorities, agenda…), pulsing the box-shadow on it produces a giant
  // red rectangle covering hundreds of pixels — the user feedback was unambiguous on this.
  // Fallback to container only when no inner focus target was resolved (e.g. focus:self).
  const pulseEl: HTMLElement = resolvePulseTarget(focusEl) ?? container;
  try {
    pulseEl.classList.add('onboarding-pulse');
  } catch {
    /* silent — AC-028 */
  }
  // The "format" hint label is anchored to the same element as the pulse so the
  // "Selecione texto e use a barra flutuante" caption sits next to the rich-text editor.
  if (target.hint === 'format') {
    try {
      pulseEl.classList.add('onboarding-pulse-format');
    } catch {
      /* silent — AC-028 */
    }
  }
  setTimeout(() => {
    try {
      pulseEl.classList.remove('onboarding-pulse');
      pulseEl.classList.remove('onboarding-pulse-format');
    } catch {
      /* silent — AC-028 */
    }
  }, 800);
}

/**
 * When the resolved focus element is a sr-only input (typical for custom-styled checkboxes
 * like the shared Checkbox atom — 1×1px input hidden inside a 24×24 label hit-area), pulsing
 * on the input is invisible. Prefer the closest visible ancestor that owns the visual hit
 * area: <label> for native form controls. For everything else, the focus element itself is
 * the right place to pulse.
 */
function resolvePulseTarget(focusEl: HTMLElement | null): HTMLElement | null {
  if (!focusEl) return null;
  if (focusEl instanceof HTMLInputElement && focusEl.type === 'checkbox') {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const label = focusEl.closest('label') as HTMLLabelElement | null;
    if (label) return label;
  }
  return focusEl;
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
