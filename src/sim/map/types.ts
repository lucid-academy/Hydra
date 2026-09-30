import type { Hex } from '../hex';

export const TERRAIN_TYPES = ['water', 'mud', 'rock'] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];

export interface TerrainRules {
  /** Movement points to enter this hex; null = impassable. */
  moveCost: number | null;
  blocksSight: boolean;
}

export type TerrainTable = Readonly<Record<TerrainType, TerrainRules>>;

export type MapObject =
  | { kind: 'lair' }
  | { kind: 'encounter' }
  | { kind: 'muck'; amount: number };

export interface Tile {
  readonly hex: Hex;
  terrain: TerrainType;
  object: MapObject | null;
}

export interface HexMap {
  readonly radius: number;
  /** Every hex of the map, keyed by hexKey(). */
  readonly tiles: Map<string, Tile>;
  readonly lair: Hex;
}
