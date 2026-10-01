import type { Hex } from '../hex';

export const TERRAIN_TYPES = ['water', 'mud', 'roots', 'rock'] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];

export interface TerrainRules {
  /** Movement points to enter this hex; null = impassable. */
  moveCost: number | null;
  blocksSight: boolean;
}

export type TerrainTable = Readonly<Record<TerrainType, TerrainRules>>;

export type MapObject =
  | { kind: 'lair' }
  | { kind: 'encounter'; groupId: string; tier: number }
  | { kind: 'muck'; amount: number }
  | { kind: 'moisture'; amount: number }
  /** A shrine of the Great Serpent, offering one blessing (shrines.json) until it is accepted. */
  | { kind: 'shrine'; blessingId: string; used: boolean }
  /** A way up to the surface (sealed until the surface exists). */
  | { kind: 'passage' };

export interface Tile {
  readonly hex: Hex;
  /** Which biome (from biomes.json) this hex belongs to. */
  readonly biome: string;
  terrain: TerrainType;
  object: MapObject | null;
}

export interface HexMap {
  readonly radius: number;
  /** Every hex of the map, keyed by hexKey(). */
  readonly tiles: Map<string, Tile>;
  readonly lair: Hex;
}
