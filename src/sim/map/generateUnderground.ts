// Underground map generator (M1: small version). Deterministic: same seed, same map.
// Steps: random noise → smoothing → terrain by share → keep only what the lair can reach → place objects.

import { hex, hexDistance, hexKey, hexNeighbors, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import type { HexMap, TerrainTable, Tile } from './types';

export interface UndergroundGeneratorSettings {
  radius: number;
  rockShare: number;
  waterShare: number;
  smoothingPasses: number;
  minPassableShare: number;
  encounterCount: number;
  encounterMinDistanceFromLair: number;
  muckDepositCount: number;
  muckPerDeposit: number;
  /** Which group of enemies waits at each encounter, picked by weight. */
  encounterGroups: ReadonlyArray<{ id: string; weight: number }>;
}

const MAX_ATTEMPTS = 100;

export function generateUnderground(seed: number, settings: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap {
  const rng = new Rng(seed);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const map = tryGenerate(rng, settings, terrain);
    if (map) return map;
  }
  throw new Error(`Underground generator failed ${MAX_ATTEMPTS} times for seed ${seed}; check undergroundGenerator settings.`);
}

function tryGenerate(rng: Rng, s: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap | null {
  const lair = hex(0, 0);
  const all = hexesInRange(lair, s.radius);

  // 1. Noise, smoothed so terrain forms blobs instead of salt-and-pepper.
  let noise = new Map(all.map((h) => [hexKey(h), rng.next()]));
  for (let pass = 0; pass < s.smoothingPasses; pass++) {
    const next = new Map<string, number>();
    for (const h of all) {
      const values = [h, ...hexNeighbors(h)].map((n) => noise.get(hexKey(n))).filter((v) => v !== undefined);
      next.set(hexKey(h), values.reduce((a, b) => a + b, 0) / values.length);
    }
    noise = next;
  }

  // 2. Terrain by share: lowest values are water, highest are rock, the rest mud.
  const sorted = [...all].sort((a, b) => noise.get(hexKey(a))! - noise.get(hexKey(b))!);
  const waterCount = Math.round(all.length * s.waterShare);
  const rockStart = all.length - Math.round(all.length * s.rockShare);
  const tiles = new Map<string, Tile>();
  sorted.forEach((h, i) => {
    tiles.set(hexKey(h), { hex: h, terrain: i < waterCount ? 'water' : i >= rockStart ? 'rock' : 'mud', object: null });
  });

  // The lair and its neighbours are always open.
  for (const h of [lair, ...hexNeighbors(lair)]) {
    const tile = tiles.get(hexKey(h))!;
    if (terrain[tile.terrain].moveCost === null) tile.terrain = 'mud';
  }

  // 3. Everything the lair cannot reach becomes rock, so every open hex is reachable.
  const reachable = floodFill(tiles, lair, terrain);
  for (const tile of tiles.values()) {
    if (!reachable.has(hexKey(tile.hex))) tile.terrain = 'rock';
  }
  if (reachable.size < all.length * s.minPassableShare) return null;

  // 4. Objects on open hexes, never two on one hex.
  tiles.get(hexKey(lair))!.object = { kind: 'lair' };
  const free = [...reachable].map((key) => tiles.get(key)!).filter((t) => t.object === null);

  const encounterSpots = free.filter((t) => hexDistance(t.hex, lair) >= s.encounterMinDistanceFromLair);
  if (encounterSpots.length < s.encounterCount) return null;
  for (const tile of takeRandom(rng, encounterSpots, s.encounterCount)) {
    tile.object = { kind: 'encounter', groupId: rng.weightedPick(s.encounterGroups).id };
  }

  const muckSpots = free.filter((t) => t.object === null);
  if (muckSpots.length < s.muckDepositCount) return null;
  for (const tile of takeRandom(rng, muckSpots, s.muckDepositCount)) tile.object = { kind: 'muck', amount: s.muckPerDeposit };

  return { radius: s.radius, tiles, lair };
}

/** Keys of all passable hexes connected to `start`. */
export function floodFill(tiles: Map<string, Tile>, start: Hex, terrain: TerrainTable): Set<string> {
  const seen = new Set([hexKey(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const n of hexNeighbors(current)) {
      const key = hexKey(n);
      const tile = tiles.get(key);
      if (!tile || seen.has(key) || terrain[tile.terrain].moveCost === null) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

/** `count` distinct random items (partial Fisher–Yates on a copy). */
function takeRandom<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = rng.int(i, pool.length - 1);
    [pool[i], pool[j]] = [pool[j] as T, pool[i] as T];
  }
  return pool.slice(0, count);
}
