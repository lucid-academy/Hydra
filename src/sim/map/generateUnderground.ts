// Underground map generator. Deterministic: same seed, same map.
// 1. Biomes: a swamp round the lair, the other biomes in wide wedges around it, with ragged borders.
// 2. Rock walls from smoothed noise, as many as each biome's rockShare.
// 3. Open ground of each biome (water, mud, roots) in the biome's shares, also from smoothed noise,
//    so it forms pools and patches instead of salt-and-pepper.
// 4. Whatever the lair cannot reach becomes rock: every open hex can be reached.
// 5. Objects by the rules of GAME_DESIGN.md section 9: shrines and passages far out and apart from each other,
//    encounters denser and stronger the further from the lair, Muck scattered, Moisture next to water.

import { hex, hexDistance, hexKey, hexNeighbors, hexToPixel, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import type { HexMap, TerrainTable, TerrainType, Tile } from './types';

export type GroundType = Exclude<TerrainType, 'rock'>;

/** Open ground is laid from the wettest hexes up: water first, then mud, then roots. */
const GROUND_ORDER: readonly GroundType[] = ['water', 'mud', 'roots'];

export interface BiomeSettings {
  id: string;
  /** Share of each kind of open ground in the biome (they add up to 1). */
  ground: Readonly<Partial<Record<GroundType, number>>>;
  /** Share of the biome's hexes that are rock walls. */
  rockShare: number;
}

/** How many of something to place, how far from the lair, and how far from each other. */
export interface PlacementRule {
  count: number;
  minDistanceFromLair: number;
  minDistanceApart: number;
}

export interface UndergroundGeneratorSettings {
  radius: number;
  smoothingPasses: number;
  minPassableShare: number;
  lairBiome: BiomeSettings;
  lairBiomeRadius: number;
  /** The other biomes, each taking a wedge of the map around the lair. */
  outerBiomes: readonly BiomeSettings[];
  shrines: PlacementRule;
  passages: PlacementRule;
  encounters: PlacementRule & {
    /** Tier n (counting from 1) of enemy groups starts this many hexes from the lair: tierStartsAtDistance[n - 1]. */
    tierStartsAtDistance: readonly number[];
    /** Enemy groups of each tier, picked by weight. */
    groupsByTier: Readonly<Record<number, ReadonlyArray<{ id: string; weight: number }>>>;
  };
  muck: { count: number; minDistanceFromLair: number; perDeposit: number };
  moisture: { count: number; minDistanceFromLair: number; perSource: number };
}

const MAX_ATTEMPTS = 100;
/** How far from the lair the middle of each outer biome lies, as a share of the map radius. */
const BIOME_CENTER_DISTANCE = 0.62;
/** Hex centres on a flat map (1 = distance between neighbours), for measuring straight-line distances. */
const FLAT = { columnWidth: 1, rowHeight: Math.sqrt(3) / 2, originX: 0, originY: 0 };

export function generateUnderground(seed: number, settings: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap {
  const rng = new Rng(seed);
  const grid = new HexGrid(settings.radius);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const map = tryGenerate(rng, grid, settings, terrain);
    if (map) return map;
  }
  throw new Error(`Underground generator failed ${MAX_ATTEMPTS} times for seed ${seed}; check undergroundGenerator settings.`);
}

/** The hexes of the map numbered 0..n-1, with each hex's neighbours as numbers too (fast to work with). */
class HexGrid {
  readonly hexes: Hex[];
  readonly neighbors: number[][];

  constructor(radius: number) {
    this.hexes = hexesInRange(hex(0, 0), radius);
    const index = new Map(this.hexes.map((h, i) => [hexKey(h), i]));
    this.neighbors = this.hexes.map((h) => hexNeighbors(h).flatMap((n) => index.get(hexKey(n)) ?? []));
  }
}

function tryGenerate(rng: Rng, grid: HexGrid, s: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap | null {
  const lair = hex(0, 0);
  const all = grid.hexes;
  const fromLairOf = all.map((h) => hexDistance(h, lair));

  // 1. Biomes. Each outer biome takes the hexes nearest to its middle; noise makes the borders wander.
  const ragged = smoothNoise(rng, grid, s.smoothingPasses + 1);
  const turn = rng.next() * Math.PI * 2;
  const middles = s.outerBiomes.map((biome, i) => {
    const angle = turn + (i / s.outerBiomes.length) * Math.PI * 2;
    const d = s.radius * BIOME_CENTER_DISTANCE;
    return { biome, x: Math.cos(angle) * d, y: Math.sin(angle) * d };
  });
  const biomeOf: BiomeSettings[] = all.map((h, i) => {
    const jitter = (ragged[i]! - 0.5) * 3;
    const d = fromLairOf[i]!;
    // The swamp round the lair: everything up to one hex short of its radius, and a ragged edge beyond.
    if (d < s.lairBiomeRadius || d + jitter <= s.lairBiomeRadius) return s.lairBiome;
    const p = hexToPixel(FLAT, h);
    return minBy(middles, (m) => Math.hypot(p.x - m.x, p.y - m.y) + jitter * 2)?.biome ?? s.lairBiome;
  });

  // 2 and 3. Rock walls, then open ground, biome by biome.
  const walls = smoothNoise(rng, grid, s.smoothingPasses);
  const wetness = smoothNoise(rng, grid, s.smoothingPasses);
  const terrainOf: TerrainType[] = all.map(() => 'mud');
  for (const biome of [s.lairBiome, ...s.outerBiomes]) {
    const members = all.map((_, i) => i).filter((i) => biomeOf[i] === biome);
    const byWalls = members.sort((a, b) => walls[a]! - walls[b]!);
    const firstRock = byWalls.length - Math.round(byWalls.length * biome.rockShare);
    for (const i of byWalls.slice(firstRock)) terrainOf[i] = 'rock';

    const byWetness = byWalls.slice(0, firstRock).sort((a, b) => wetness[a]! - wetness[b]!);
    const kinds = GROUND_ORDER.filter((g) => (biome.ground[g] ?? 0) > 0);
    let shareSoFar = 0;
    let from = 0;
    kinds.forEach((kind, k) => {
      shareSoFar += biome.ground[kind] ?? 0;
      const to = k === kinds.length - 1 ? byWetness.length : Math.round(byWetness.length * shareSoFar);
      for (const i of byWetness.slice(from, to)) terrainOf[i] = kind;
      from = to;
    });
  }

  // The lair and its neighbours are always open.
  all.forEach((_, i) => {
    if (fromLairOf[i]! <= 1 && terrain[terrainOf[i]!].moveCost === null) terrainOf[i] = 'mud';
  });

  // 4. Everything the lair cannot reach becomes rock, so every open hex is reachable.
  const lairIndex = fromLairOf.indexOf(0);
  const reached = new Uint8Array(all.length);
  const queue = [lairIndex];
  reached[lairIndex] = 1;
  for (let head = 0; head < queue.length; head++) {
    for (const n of grid.neighbors[queue[head]!]!) {
      if (reached[n] || terrain[terrainOf[n]!].moveCost === null) continue;
      reached[n] = 1;
      queue.push(n);
    }
  }
  all.forEach((_, i) => {
    if (!reached[i]) terrainOf[i] = 'rock';
  });
  if (queue.length < all.length * s.minPassableShare) return null;

  const tiles = new Map<string, Tile>();
  all.forEach((h, i) => tiles.set(hexKey(h), { hex: h, biome: biomeOf[i]!.id, terrain: terrainOf[i]!, object: null }));

  // 5. Objects on open hexes, never two on one hex.
  tiles.get(hexKey(lair))!.object = { kind: 'lair' };
  const open = queue.map((i) => tiles.get(hexKey(all[i]!))!);
  const fromLair = (t: Tile) => hexDistance(t.hex, lair);
  const free = (minDistanceFromLair: number) => open.filter((t) => t.object === null && fromLair(t) >= minDistanceFromLair);
  const dry = (t: Tile) => t.terrain !== 'water';

  // Passages up to the surface: as far out as possible.
  const passages = pickSpread(rng, free(s.passages.minDistanceFromLair).filter(dry), s.passages, (t) => fromLair(t) ** 2);
  if (!passages) return null;
  for (const t of passages) t.object = { kind: 'passage' };

  const shrines = pickSpread(rng, free(s.shrines.minDistanceFromLair).filter(dry), s.shrines, () => 1);
  if (!shrines) return null;
  for (const t of shrines) t.object = { kind: 'shrine' };

  // Encounters: the further from the lair, the more likely, and the stronger the group.
  const encounters = pickSpread(rng, free(s.encounters.minDistanceFromLair), s.encounters, fromLair);
  if (!encounters) return null;
  for (const t of encounters) {
    const tier = encounterTier(fromLair(t), s.encounters.tierStartsAtDistance);
    const groups = s.encounters.groupsByTier[tier];
    if (!groups || groups.length === 0) throw new Error(`No enemy group has tier ${tier}`);
    t.object = { kind: 'encounter', groupId: rng.weightedPick(groups).id, tier };
  }

  const nextToWater = (t: Tile) => t.terrain === 'water' || hexNeighbors(t.hex).some((n) => tiles.get(hexKey(n))?.terrain === 'water');
  const moisture = pickSpread(rng, free(s.moisture.minDistanceFromLair).filter(nextToWater), { count: s.moisture.count, minDistanceApart: 2 }, () => 1);
  if (!moisture) return null;
  for (const t of moisture) t.object = { kind: 'moisture', amount: s.moisture.perSource };

  const muck = pickSpread(rng, free(s.muck.minDistanceFromLair), { count: s.muck.count, minDistanceApart: 1 }, () => 1);
  if (!muck) return null;
  for (const t of muck) t.object = { kind: 'muck', amount: s.muck.perDeposit };

  return { radius: s.radius, tiles, lair };
}

/** Tier of enemy groups met this far from the lair: 1 near it, higher further out. */
export function encounterTier(distanceFromLair: number, tierStartsAtDistance: readonly number[]): number {
  let tier = 1;
  tierStartsAtDistance.forEach((start, i) => {
    if (distanceFromLair >= start) tier = i + 1;
  });
  return tier;
}

/** Keys of all passable hexes connected to `start`. */
export function floodFill(tiles: Map<string, Tile>, start: Hex, terrain: TerrainTable): Set<string> {
  const seen = new Set([hexKey(start)]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const n of hexNeighbors(queue[head]!)) {
      const key = hexKey(n);
      const tile = tiles.get(key);
      if (!tile || seen.has(key) || terrain[tile.terrain].moveCost === null) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

/**
 * Random values over the hexes, averaged with their neighbours `passes` times (so they form blobs),
 * then turned into ranks from 0 to 1 (so "the top 30%" really is 30% of the hexes).
 */
function smoothNoise(rng: Rng, grid: HexGrid, passes: number): Float64Array {
  const n = grid.hexes.length;
  let values = Float64Array.from({ length: n }, () => rng.next());
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = values[i]!;
      for (const j of grid.neighbors[i]!) sum += values[j]!;
      next[i] = sum / (grid.neighbors[i]!.length + 1);
    }
    values = next;
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a]! - values[b]!);
  const ranks = new Float64Array(n);
  order.forEach((i, rank) => (ranks[i] = rank / Math.max(1, n - 1)));
  return ranks;
}

/**
 * Picks `rule.count` tiles at least `rule.minDistanceApart` hexes from each other, favouring higher weights.
 * Null when they don't fit (the generator then tries again).
 */
function pickSpread(rng: Rng, candidates: readonly Tile[], rule: { count: number; minDistanceApart: number }, weight: (t: Tile) => number): Tile[] | null {
  let pool = candidates.map((tile) => ({ tile, weight: Math.max(0.001, weight(tile)) }));
  const picked: Tile[] = [];
  while (picked.length < rule.count) {
    if (pool.length === 0) return null;
    const choice = rng.weightedPick(pool).tile;
    picked.push(choice);
    pool = pool.filter((p) => hexDistance(p.tile.hex, choice.hex) >= rule.minDistanceApart);
  }
  return picked;
}

function minBy<T>(items: readonly T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    const value = score(item);
    if (value < bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}
