// Visibility = what the player knows about the map (fog of war). Not to be confused with mist.
// A hex missing from the Visibility map is Unexplored.

import { hasLineOfSight, hexKey, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import type { HexMap, TerrainTable } from './types';

export type VisibilityState = 'visible' | 'remembered';
export type Visibility = Map<string, VisibilityState>;

/** Keys of hexes seen from `from` within `range`, with rock blocking sight. */
export function hexesSeenFrom(map: HexMap, from: Hex, range: number, terrain: TerrainTable): Set<string> {
  const blocksSight = (h: Hex): boolean => {
    const tile = map.tiles.get(hexKey(h));
    return !tile || terrain[tile.terrain].blocksSight;
  };
  const seen = new Set<string>();
  for (const h of hexesInRange(from, range)) {
    if (map.tiles.has(hexKey(h)) && hasLineOfSight(from, h, blocksSight)) seen.add(hexKey(h));
  }
  return seen;
}

/**
 * Replaces what is currently visible: previously visible hexes become remembered.
 * Returns how many hexes were seen for the first time.
 */
export function updateVisibility(visibility: Visibility, nowVisible: Set<string>): number {
  let discovered = 0;
  for (const [key, state] of visibility) {
    if (state === 'visible' && !nowVisible.has(key)) visibility.set(key, 'remembered');
  }
  for (const key of nowVisible) {
    if (!visibility.has(key)) discovered++;
    visibility.set(key, 'visible');
  }
  return discovered;
}
