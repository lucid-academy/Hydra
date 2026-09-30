// Geometry of the battle board: which hexes exist, where the body lies, how far things are from it,
// and how humans find their way around.

import { HEX_DIRECTIONS, hex, hexAdd, hexDistance, hexKey, hexNeighbors, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import type { BoardSize } from './types';

/**
 * The board is a rectangle on screen with its middle hex at (0, 0).
 * Rows are shifted by half a hex each, so every other row is one hex shorter and the board stays symmetric.
 */
export function isOnBoard(h: Hex, size: BoardSize): boolean {
  const halfRows = (size.boardRows - 1) / 2;
  const halfColumns = (size.boardColumns - 1) / 2;
  return Math.abs(h.r) <= halfRows && Math.abs(h.q + h.r / 2) <= halfColumns;
}

/** Every hex of the board, row by row from the top, left to right. */
export function boardHexes(size: BoardSize): Hex[] {
  const halfRows = (size.boardRows - 1) / 2;
  const halfColumns = (size.boardColumns - 1) / 2;
  const result: Hex[] = [];
  for (let r = -halfRows; r <= halfRows; r++) {
    for (let q = Math.ceil(-halfColumns - r / 2); q + r / 2 <= halfColumns; q++) result.push(hex(q, r));
  }
  return result;
}

/** Hexes on the edge of the board (they have a neighbour outside it). */
export function rimHexes(size: BoardSize): Hex[] {
  return boardHexes(size).filter((h) => hexNeighbors(h).some((n) => !isOnBoard(n, size)));
}

/** The seven hexes the body covers: its middle hex and the six around it. */
export function bodyHexes(center: Hex): Hex[] {
  return hexesInRange(center, 1);
}

/** Steps from the body's edge: 0 = under the body, 1 = standing right next to it. */
export function bodyDistance(center: Hex, h: Hex): number {
  return Math.max(0, hexDistance(center, h) - 1);
}

/** Can the body's middle be on this hex (all seven hexes on the board)? */
export function canBodyStandAt(center: Hex, size: BoardSize): boolean {
  return bodyHexes(center).every((h) => isOnBoard(h, size));
}

/** Position of a hex centre on a flat, unsquashed map (one hex = 1 wide). Used for directions only. */
export function hexPoint(h: Hex): { x: number; y: number } {
  return { x: h.q + h.r / 2, y: (h.r * Math.sqrt(3)) / 2 };
}

/** Direction from one hex to another, in radians: 0 = east, π/2 = south (down the screen). */
export function hexAngle(from: Hex, to: Hex): number {
  const a = hexPoint(from);
  const b = hexPoint(to);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Smallest difference between two directions, 0..π. */
export function angleDifference(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/**
 * The outer body hex nearest to a neck's direction: where that head rests, and where its stump is.
 * Exact ties go to the earlier direction in HEX_DIRECTIONS, so the answer never depends on rounding.
 */
export function anchorHex(center: Hex, anchorAngle: number): Hex {
  let best = hexAdd(center, HEX_DIRECTIONS[0]!);
  let bestDifference = Infinity;
  for (const direction of HEX_DIRECTIONS) {
    const candidate = hexAdd(center, direction);
    const difference = angleDifference(hexAngle(center, candidate), anchorAngle);
    if (difference < bestDifference - 1e-9) {
      best = candidate;
      bestDifference = difference;
    }
  }
  return best;
}

/**
 * Steps to the nearest goal from every hex that can reach one, walking only over hexes where `isOpen` is true.
 * Goals count as 0 steps. Hexes that can't reach any goal are left out.
 */
export function distanceField(goals: readonly Hex[], isOpen: (h: Hex) => boolean): Map<string, number> {
  const field = new Map<string, number>();
  let frontier: Hex[] = [];
  for (const goal of goals) {
    if (field.has(hexKey(goal))) continue;
    field.set(hexKey(goal), 0);
    frontier.push(goal);
  }
  for (let steps = 1; frontier.length > 0; steps++) {
    const next: Hex[] = [];
    for (const current of frontier) {
      for (const neighbor of hexNeighbors(current)) {
        const key = hexKey(neighbor);
        if (field.has(key) || !isOpen(neighbor)) continue;
        field.set(key, steps);
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return field;
}
