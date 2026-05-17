import type { MissionId } from '../../types.js';
import { MISSION_TARGETS } from '../missionTargets.js';

const EXPECTED_IDS: MissionId[] = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
];

describe('MISSION_TARGETS', () => {
  it('has an entry for all 7 mission IDs', () => {
    for (const id of EXPECTED_IDS) {
      expect(MISSION_TARGETS).toHaveProperty(id);
    }
  });

  it('selectors are non-empty strings', () => {
    for (const id of EXPECTED_IDS) {
      const target = MISSION_TARGETS[id];
      expect(typeof target.selector).toBe('string');
      expect(target.selector.length).toBeGreaterThan(0);
    }
  });

  it('focus modes are valid enum values', () => {
    const validModes = ['self', 'input', 'firstRichText', 'firstCheckbox', 'firstRichTextOrButton'];
    for (const id of EXPECTED_IDS) {
      expect(validModes).toContain(MISSION_TARGETS[id].focus);
    }
  });

  it('M-FORMAT has hint: format', () => {
    expect(MISSION_TARGETS['M-FORMAT'].hint).toBe('format');
  });

  it('missions without hint have no hint property (or undefined)', () => {
    const noHintMissions: MissionId[] = [
      'M-INTENTION',
      'M-MOOD',
      'M-PRIORITY',
      'M-CHECK',
      'M-WRITE',
      'M-GRATITUDE',
    ];
    for (const id of noHintMissions) {
      expect(MISSION_TARGETS[id].hint).toBeUndefined();
    }
  });
});
