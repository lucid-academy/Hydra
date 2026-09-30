import { describe, expect, it } from 'vitest';
import { Rng, seedFromString } from '../src/sim/rng';

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gives different sequences for different seeds', () => {
    expect(new Rng(1).next()).not.toEqual(new Rng(2).next());
  });

  it('keeps next() in [0, 1) and int() within bounds', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 10_000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(-3, 5);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('reaches both ends of an int range', () => {
    const rng = new Rng(9);
    const seen = new Set(Array.from({ length: 1000 }, () => rng.int(1, 6)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('continues exactly from a saved state', () => {
    const rng = new Rng(77);
    rng.next();
    rng.next();
    const copy = Rng.fromState(rng.getState());
    expect(copy.next()).toEqual(rng.next());
  });

  it('pick() throws on an empty array', () => {
    expect(() => new Rng(1).pick([])).toThrow();
  });
});

describe('seedFromString', () => {
  it('uses plain numbers as-is', () => {
    expect(seedFromString('123')).toBe(123);
  });

  it('hashes text into a stable number', () => {
    expect(seedFromString('swamp')).toBe(seedFromString('swamp'));
    expect(seedFromString('swamp')).not.toBe(seedFromString('swamq'));
  });
});
