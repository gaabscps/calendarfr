import type { MissionId } from '../types.js';

export interface MissionTarget {
  selector: string;
  focus: 'self' | 'input' | 'firstRichText' | 'firstCheckbox' | 'firstRichTextOrButton';
  hint?: 'format';
}

export const MISSION_TARGETS: Record<MissionId, MissionTarget> = {
  'M-INTENTION': { selector: '[data-onboarding-target="intention"]', focus: 'input' },
  'M-MOOD': { selector: '[data-onboarding-target="mood"]', focus: 'self' },
  'M-PRIORITY': { selector: '[data-onboarding-target="priorities"]', focus: 'firstRichText' },
  'M-FORMAT': {
    selector: '[data-onboarding-target="priorities"]',
    focus: 'firstRichText',
    hint: 'format',
  },
  'M-CHECK': { selector: '[data-onboarding-target="priorities"]', focus: 'firstCheckbox' },
  'M-WRITE': { selector: '[data-onboarding-target="agenda"]', focus: 'firstRichText' },
  'M-GRATITUDE': {
    selector: '[data-onboarding-target="gratitude"]',
    focus: 'firstRichTextOrButton',
  },
};
