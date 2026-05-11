/**
 * Unit tests for backoff utilities.
 *
 * Tests verify that each attempt produces values within the expected range
 * (base ± 20% jitter). We use Math.random stub for deterministic results.
 */

import { computeBackoffDelay } from '../backoff';

describe('computeBackoffDelay', () => {
  describe('with Math.random stubbed to 0 (minimum jitter)', () => {
    let originalRandom: () => number;

    beforeEach(() => {
      originalRandom = Math.random;
      // Math.random() = 0 → jitter = base * 0.2 * (2 * 0 - 1) = -base * 0.2
      // result = base * (1 - 0.2) = base * 0.8
      Math.random = () => 0;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('attempt 0 returns 160 (200 * 0.8)', () => {
      expect(computeBackoffDelay(0)).toBe(160);
    });

    it('attempt 1 returns 640 (800 * 0.8)', () => {
      expect(computeBackoffDelay(1)).toBe(640);
    });

    it('attempt 2 returns 2560 (3200 * 0.8)', () => {
      expect(computeBackoffDelay(2)).toBe(2560);
    });
  });

  describe('with Math.random stubbed to 1 (maximum jitter)', () => {
    let originalRandom: () => number;

    beforeEach(() => {
      originalRandom = Math.random;
      // Math.random() = 1 → jitter = base * 0.2 * (2 * 1 - 1) = base * 0.2
      // result = base * (1 + 0.2) = base * 1.2
      Math.random = () => 1;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('attempt 0 returns 240 (200 * 1.2)', () => {
      expect(computeBackoffDelay(0)).toBe(240);
    });

    it('attempt 1 returns 960 (800 * 1.2)', () => {
      expect(computeBackoffDelay(1)).toBe(960);
    });

    it('attempt 2 returns 3840 (3200 * 1.2)', () => {
      expect(computeBackoffDelay(2)).toBe(3840);
    });
  });

  describe('with Math.random stubbed to 0.5 (no jitter — midpoint)', () => {
    let originalRandom: () => number;

    beforeEach(() => {
      originalRandom = Math.random;
      // Math.random() = 0.5 → jitter = base * 0.2 * (2 * 0.5 - 1) = 0
      // result = base exactly
      Math.random = () => 0.5;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('attempt 0 returns 200 exactly', () => {
      expect(computeBackoffDelay(0)).toBe(200);
    });

    it('attempt 1 returns 800 exactly', () => {
      expect(computeBackoffDelay(1)).toBe(800);
    });

    it('attempt 2 returns 3200 exactly', () => {
      expect(computeBackoffDelay(2)).toBe(3200);
    });
  });

  describe('range checks (real Math.random)', () => {
    it('attempt 0 result is in range [160, 240]', () => {
      for (let i = 0; i < 50; i++) {
        const delay = computeBackoffDelay(0);
        expect(delay).toBeGreaterThanOrEqual(160);
        expect(delay).toBeLessThanOrEqual(240);
      }
    });

    it('attempt 1 result is in range [640, 960]', () => {
      for (let i = 0; i < 50; i++) {
        const delay = computeBackoffDelay(1);
        expect(delay).toBeGreaterThanOrEqual(640);
        expect(delay).toBeLessThanOrEqual(960);
      }
    });

    it('attempt 2 result is in range [2560, 3840]', () => {
      for (let i = 0; i < 50; i++) {
        const delay = computeBackoffDelay(2);
        expect(delay).toBeGreaterThanOrEqual(2560);
        expect(delay).toBeLessThanOrEqual(3840);
      }
    });

    it('attempt 3 is clamped to attempt 2 — result is in range [2560, 3840]', () => {
      // attempt=3 exceeds the valid range [0,2] and is clamped to 2.
      // The resulting range should be identical to attempt=2: [2560, 3840].
      for (let i = 0; i < 50; i++) {
        const delay = computeBackoffDelay(3);
        expect(delay).toBeGreaterThanOrEqual(2560);
        expect(delay).toBeLessThanOrEqual(3840);
      }
    });
  });
});
