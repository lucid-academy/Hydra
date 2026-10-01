// Small helpers for placeholder graphics drawn in code.

import type * as Phaser from 'phaser';
import type { GameData } from '../data';
import type { Palette } from '../data/schemas';

/** Draws the placeholder for one manifest key into a texture of the given size. */
export type PlaceholderDrawer = (scene: Phaser.Scene, key: string, width: number, height: number, palette: Palette, data: GameData) => void;

/**
 * Horizontal spans [x0, x1) of a pointy-top hex filling a width×height box, row by row.
 * Drawing hexes as pixel rows keeps edges crisp (canvas polygons would be anti-aliased).
 */
export function hexRowSpans(width: number, height: number): Array<[number, number]> {
  const cap = height / 4; // height of the slanted top and bottom parts
  const spans: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    const fromEdge = Math.min(y + 0.5, height - y - 0.5);
    const half = fromEdge < cap ? (width / 2) * (fromEdge / cap) : width / 2;
    const x0 = Math.round(width / 2 - half);
    spans.push([x0, width - x0]);
  }
  return spans;
}

/** Fills a hex of the given size, its top edge `top` pixels down. */
export function fillHex(g: Phaser.GameObjects.Graphics, width: number, height: number, top = 0): void {
  hexRowSpans(width, height).forEach(([x0, x1], y) => g.fillRect(x0, y + top, x1 - x0, 1));
}
