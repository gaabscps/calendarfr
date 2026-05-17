import { createSoundController } from '../soundController.js';

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
