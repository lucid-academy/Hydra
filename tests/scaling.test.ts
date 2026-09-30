import { describe, expect, it } from 'vitest';
import { computeZoom } from '../src/scaling';

describe('computeZoom', () => {
  it('uses the largest whole-number zoom that fits', () => {
    expect(computeZoom(1920, 1080, 640, 360)).toBe(3);
    expect(computeZoom(1366, 768, 640, 360)).toBe(2);
    expect(computeZoom(844, 390, 640, 360)).toBe(1);
  });

  it('shrinks by a fraction only when the screen is smaller than the game', () => {
    expect(computeZoom(390, 844, 640, 360)).toBeCloseTo(390 / 640);
  });
});
