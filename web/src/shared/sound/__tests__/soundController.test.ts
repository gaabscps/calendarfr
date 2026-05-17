import { createSoundController } from '../soundController.js';

type AudioLike = { volume: number; play: jest.Mock; cloneNode: jest.Mock; src: string };

describe('soundController — audio playback', () => {
  let audioInstances: AudioLike[];
  let originalAudio: typeof window.Audio;

  beforeEach(() => {
    localStorage.clear();
    audioInstances = [];
    originalAudio = window.Audio;

    class FakeAudio {
      src: string;
      volume = 1;
      preload = '';
      paused = true;
      play = jest.fn().mockResolvedValue(undefined);
      cloneNode: jest.Mock;

      constructor(src = '') {
        this.src = src;
        audioInstances.push(this as unknown as AudioLike);
        this.cloneNode = jest.fn(() => new FakeAudio(this.src));
      }
    }

    // @ts-expect-error — replacing Audio for test
    globalThis.Audio = FakeAudio;
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
  });

  it('lazy-loads an Audio instance on first play() per id', () => {
    const c = createSoundController();
    expect(audioInstances).toHaveLength(0);
    c.play('mission-complete');
    expect(audioInstances).toHaveLength(2);
    c.play('mission-complete');
    expect(audioInstances).toHaveLength(3);
  });

  it('does not play when muted', () => {
    const c = createSoundController();
    c.setMuted(true);
    c.play('mission-complete');
    expect(audioInstances).toHaveLength(0);
  });

  it('swallows autoplay rejection without throwing', async () => {
    const c = createSoundController();
    class RejectingAudio {
      src: string;
      volume = 1;
      preload = '';
      play = jest.fn().mockRejectedValue(new Error('autoplay'));
      cloneNode: jest.Mock;
      constructor(src = '') {
        this.src = src;
        audioInstances.push(this as unknown as AudioLike);
        this.cloneNode = jest.fn(() => new RejectingAudio(this.src));
      }
    }
    // @ts-expect-error — replacing Audio for test
    globalThis.Audio = RejectingAudio;
    expect(() => c.play('mission-complete')).not.toThrow();
    await Promise.resolve();
  });

  it('respects prefers-reduced-motion by lowering volume', () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-expect-error — jsdom doesn't always set matchMedia
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    const c = createSoundController();
    c.play('mission-complete');
    const playedClone = audioInstances[audioInstances.length - 1]!;
    expect(playedClone.volume).toBeCloseTo(0.25, 2);
    window.matchMedia = originalMatchMedia;
  });
});

describe('soundController — mute state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to muted=false when localStorage is empty', () => {
    const c = createSoundController();
    expect(c.isMuted()).toBe(false);
  });

  it('reads muted=true from localStorage on init', () => {
    localStorage.setItem('calendarfr:sound:muted', '1');
    const c = createSoundController();
    expect(c.isMuted()).toBe(true);
  });

  it('persists mute toggle to localStorage', () => {
    const c = createSoundController();
    c.setMuted(true);
    expect(localStorage.getItem('calendarfr:sound:muted')).toBe('1');
    c.setMuted(false);
    expect(localStorage.getItem('calendarfr:sound:muted')).toBe('0');
  });

  it('notifies subscribers when mute changes', () => {
    const c = createSoundController();
    const spy = jest.fn();
    const unsub = c.subscribe(spy);
    c.setMuted(true);
    expect(spy).toHaveBeenCalledTimes(1);
    c.setMuted(false);
    expect(spy).toHaveBeenCalledTimes(2);
    unsub();
    c.setMuted(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('subscribe returns unsubscribe that removes only that listener', () => {
    const c = createSoundController();
    const a = jest.fn();
    const b = jest.fn();
    const unsubA = c.subscribe(a);
    c.subscribe(b);
    c.setMuted(true);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unsubA();
    c.setMuted(false);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });
});
