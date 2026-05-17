import { SOUND_URLS, type SoundId } from '../sounds.js';

describe('sounds registry', () => {
  it('exposes the two expected sound ids', () => {
    const ids: SoundId[] = ['mission-complete', 'day-complete'];
    ids.forEach((id) => {
      expect(SOUND_URLS[id]).toMatch(/^\/sounds\/.+\.ogg(\?v=\d+)?$/);
    });
  });

  it('has exactly two entries', () => {
    expect(Object.keys(SOUND_URLS)).toHaveLength(2);
  });
});
