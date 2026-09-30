// Seeded random number generator (mulberry32).
// Everything random in sim/ must go through this, never Math.random(),
// so the same seed and the same commands always give the same result.

export type RngState = number;

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Random item, where items with higher `weight` come up proportionally more often. */
  weightedPick<T extends { weight: number }>(items: readonly T[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    if (items.length === 0 || total <= 0) throw new Error('Rng.weightedPick: nothing to pick');
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll < 0) return item;
    }
    return items[items.length - 1] as T;
  }

  /** For saving the game: the generator continues exactly where it stopped. */
  getState(): RngState {
    return this.state;
  }

  static fromState(state: RngState): Rng {
    return new Rng(state);
  }
}

/**
 * Turns any text into a 32-bit seed, so `?seed=swamp` works as well as `?seed=123`.
 * Plain non-negative integers are used as-is, to keep seeds easy to read and share.
 */
export function seedFromString(text: string): number {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) >>> 0;
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
