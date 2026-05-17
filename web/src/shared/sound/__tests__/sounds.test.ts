import { SOUND_URLS, type SoundId } from '../sounds.js';

describe('sounds registry', () => {
  it('exposes the four expected sound ids', () => {
    const ids: SoundId[] = ['mission-complete', 'day-complete', 'sticky-attach', 'sticky-peel'];
    ids.forEach((id) => {
      expect(SOUND_URLS[id]).toMatch(/^\/sounds\/.+\.ogg$/);
    });
  });

  it('has exactly four entries', () => {
    expect(Object.keys(SOUND_URLS)).toHaveLength(4);
  });
});
