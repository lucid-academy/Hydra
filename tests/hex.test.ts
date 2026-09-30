import { describe, expect, it } from 'vitest';
import {
  hasLineOfSight,
  hex,
  hexDistance,
  hexEquals,
  hexesInRange,
  hexKey,
  hexLine,
  hexNeighbors,
  hexRound,
  hexToPixel,
  pixelToHex,
} from '../src/sim/hex';
import type { HexLayout } from '../src/sim/hex';

describe('hex basics', () => {
  it('has six distinct neighbours, each one step away', () => {
    const center = hex(2, -1);
    const neighbors = hexNeighbors(center);
    expect(new Set(neighbors.map(hexKey)).size).toBe(6);
    for (const n of neighbors) expect(hexDistance(center, n)).toBe(1);
  });

  it('measures distance in steps', () => {
    expect(hexDistance(hex(0, 0), hex(0, 0))).toBe(0);
    expect(hexDistance(hex(0, 0), hex(3, 0))).toBe(3);
    expect(hexDistance(hex(0, 0), hex(2, -3))).toBe(3);
    expect(hexDistance(hex(-2, 2), hex(2, -2))).toBe(4);
  });

  it('range of radius N has 3N(N+1)+1 hexes, all within N', () => {
    for (const radius of [0, 1, 2, 9]) {
      const hexes = hexesInRange(hex(1, 1), radius);
      expect(hexes.length).toBe(3 * radius * (radius + 1) + 1);
      for (const h of hexes) expect(hexDistance(hex(1, 1), h)).toBeLessThanOrEqual(radius);
    }
  });

  it('never produces negative zero keys', () => {
    expect(hexKey(hexRound(-0.1, 0.1))).toBe('0,0');
  });
});

describe('hexLine and line of sight', () => {
  it('line has distance+1 hexes, each a step from the previous', () => {
    const a = hex(-3, 1);
    const b = hex(4, -2);
    const line = hexLine(a, b);
    expect(line.length).toBe(hexDistance(a, b) + 1);
    expect(hexEquals(line[0]!, a)).toBe(true);
    expect(hexEquals(line[line.length - 1]!, b)).toBe(true);
    for (let i = 1; i < line.length; i++) expect(hexDistance(line[i - 1]!, line[i]!)).toBe(1);
  });

  it('is blocked by a wall between, but the wall itself is visible', () => {
    const wall = hex(1, 0);
    const blocks = (h: { q: number; r: number }) => hexEquals(h, wall);
    expect(hasLineOfSight(hex(0, 0), hex(2, 0), blocks)).toBe(false);
    expect(hasLineOfSight(hex(0, 0), wall, blocks)).toBe(true);
    expect(hasLineOfSight(hex(0, 0), hex(0, 2), blocks)).toBe(true);
  });
});

describe('pixel conversion', () => {
  const layout: HexLayout = { columnWidth: 28, rowHeight: 24, originX: 100, originY: 50 };

  it('puts hex centres on whole pixels', () => {
    for (const h of hexesInRange(hex(0, 0), 5)) {
      const { x, y } = hexToPixel(layout, h);
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
    }
  });

  it('round-trips hex → pixel → hex, also for points near the centre', () => {
    for (const h of hexesInRange(hex(0, 0), 5)) {
      const { x, y } = hexToPixel(layout, h);
      for (const [dx, dy] of [[0, 0], [8, 0], [-8, 0], [0, 10], [0, -10], [6, 6]]) {
        expect(hexKey(pixelToHex(layout, x + dx!, y + dy!))).toBe(hexKey(h));
      }
    }
  });
});
