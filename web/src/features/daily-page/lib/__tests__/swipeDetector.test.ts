/**
 * Unit tests for swipeDetector.ts
 *
 * Covers: AC-017 (swipe threshold matrix), AC-018 (directional mapping).
 * All tests are pure — no DOM, no React.
 */

import {
  detectSwipe,
  SWIPE_MIN_DISTANCE_PX,
  SWIPE_MIN_VELOCITY,
  SWIPE_VERTICAL_RATIO,
} from '../swipeDetector.js';

describe('swipeDetector constants', () => {
  it('exports SWIPE_MIN_DISTANCE_PX = 80', () => {
    expect(SWIPE_MIN_DISTANCE_PX).toBe(80);
  });

  it('exports SWIPE_MIN_VELOCITY = 0.5', () => {
    expect(SWIPE_MIN_VELOCITY).toBe(0.5);
  });

  it('exports SWIPE_VERTICAL_RATIO = 2', () => {
    expect(SWIPE_VERTICAL_RATIO).toBe(2);
  });
});

describe('detectSwipe — directional mapping', () => {
  it('returns "next" for clear left swipe (deltaX negative, large)', () => {
    // deltaX = -120, velocity = 0.6 px/ms, |dx| >> 2*|dy|
    expect(detectSwipe({ deltaX: -120, deltaY: 0, duration: 200 })).toBe('next');
  });

  it('returns "prev" for clear right swipe (deltaX positive, large)', () => {
    // deltaX = +120, velocity = 0.6 px/ms, |dx| >> 2*|dy|
    expect(detectSwipe({ deltaX: 120, deltaY: 0, duration: 200 })).toBe('prev');
  });
});

describe('detectSwipe — distance threshold (80px)', () => {
  it('returns null when |deltaX| < 80 (distance below threshold)', () => {
    // deltaX = -30, velocity = 0.15 px/ms — below both distance and velocity
    expect(detectSwipe({ deltaX: -30, deltaY: 0, duration: 200 })).toBeNull();
  });

  it('returns null when |deltaX| is exactly 79 (just below threshold)', () => {
    expect(detectSwipe({ deltaX: -79, deltaY: 0, duration: 100 })).toBeNull();
  });

  it('returns "next" when |deltaX| is exactly 80 (at threshold)', () => {
    // velocity = 80/100 = 0.8, horizontal dominant
    expect(detectSwipe({ deltaX: -80, deltaY: 0, duration: 100 })).toBe('next');
  });
});

describe('detectSwipe — velocity threshold (0.5 px/ms)', () => {
  it('returns null when velocity is below 0.5 px/ms (slow swipe)', () => {
    // deltaX = -120, duration = 1000 → velocity = 0.12 px/ms
    expect(detectSwipe({ deltaX: -120, deltaY: 0, duration: 1000 })).toBeNull();
  });

  it('returns null when velocity is exactly 0.49 px/ms', () => {
    // deltaX = -98, duration = 200 → velocity = 0.49 px/ms
    expect(detectSwipe({ deltaX: -98, deltaY: 0, duration: 200 })).toBeNull();
  });

  it('returns "next" when velocity is exactly 0.5 px/ms', () => {
    // deltaX = -100, duration = 200 → velocity = 0.5 px/ms
    expect(detectSwipe({ deltaX: -100, deltaY: 0, duration: 200 })).toBe('next');
  });
});

describe('detectSwipe — vertical dominance (|dx| >= 2*|dy|)', () => {
  it('returns null when vertically dominant (|dy| > |dx|/2)', () => {
    // deltaX = -120, deltaY = -100 → |dx|=120, 2*|dy|=200 → 120 < 200 → vertical dominant
    expect(detectSwipe({ deltaX: -120, deltaY: -100, duration: 200 })).toBeNull();
  });

  it('returns null when diagonal (|dx| just below 2*|dy|)', () => {
    // deltaX = -100, deltaY = -51 → |dx|=100, 2*|dy|=102 → 100 < 102
    expect(detectSwipe({ deltaX: -100, deltaY: -51, duration: 200 })).toBeNull();
  });

  it('returns "prev" when just above all thresholds with slight Y component', () => {
    // deltaX=80, deltaY=39, duration=160
    // |dx|=80 >= 80 ✓, velocity=80/160=0.5 ✓, |dx|=80 >= 2*39=78 ✓
    expect(detectSwipe({ deltaX: 80, deltaY: 39, duration: 160 })).toBe('prev');
  });

  it('returns null when |dx| equals exactly 2*|dy| - 1 (horizontal not dominant enough)', () => {
    // deltaX = -100, deltaY = 51 → |dx|=100, 2*|dy|=102 → 100 < 102
    expect(detectSwipe({ deltaX: -100, deltaY: 51, duration: 200 })).toBeNull();
  });

  it('returns "next" when |dx| equals exactly 2*|dy| (borderline horizontal)', () => {
    // deltaX = -100, deltaY = 50 → |dx|=100, 2*|dy|=100 → 100 >= 100 ✓
    expect(detectSwipe({ deltaX: -100, deltaY: 50, duration: 200 })).toBe('next');
  });
});

describe('detectSwipe — combined boundary (all 3 gates at minimum simultaneously)', () => {
  it('returns "next" when deltaX=-80, deltaY=0, duration=160 (all gates at threshold)', () => {
    // |deltaX|=80 >= 80 ✓, velocity=80/160=0.5 ✓, |dx|=80 >= 2*0=0 ✓
    expect(detectSwipe({ deltaX: -80, deltaY: 0, duration: 160 })).toBe('next');
  });

  it('returns null for stationary pointer (deltaX=0, deltaY=0, duration=500)', () => {
    expect(detectSwipe({ deltaX: 0, deltaY: 0, duration: 500 })).toBeNull();
  });
});

describe('detectSwipe — defensive edge cases', () => {
  it('returns null for zero deltaX, zero deltaY, zero duration', () => {
    expect(detectSwipe({ deltaX: 0, deltaY: 0, duration: 0 })).toBeNull();
  });

  it('returns null for negative duration (invalid — guard against divide-by-zero)', () => {
    expect(detectSwipe({ deltaX: -120, deltaY: 0, duration: -10 })).toBeNull();
  });

  it('returns null for zero duration (avoids Infinity velocity divide-by-zero)', () => {
    // Even if deltaX is large, duration=0 → guard before division
    expect(detectSwipe({ deltaX: -120, deltaY: 0, duration: 0 })).toBeNull();
  });

  it('returns null for positive deltaX below distance threshold', () => {
    expect(detectSwipe({ deltaX: 50, deltaY: 0, duration: 100 })).toBeNull();
  });
});
