// Converting between hexes and pixels (pointy-top).
// Sizes are chosen so neighbouring hex centres sit on whole pixels, which pixel art needs.

import { hexRound } from './hex';
import type { Hex } from './hex';

export interface HexLayout {
  /** Horizontal distance between neighbouring hex centres in one row, in pixels. */
  columnWidth: number;
  /** Vertical distance between rows, in pixels. */
  rowHeight: number;
  /** Pixel position of hex (0, 0). */
  originX: number;
  originY: number;
}

export function hexToPixel(layout: HexLayout, h: Hex): { x: number; y: number } {
  return {
    x: layout.originX + layout.columnWidth * (h.q + h.r / 2),
    y: layout.originY + layout.rowHeight * h.r,
  };
}

export function pixelToHex(layout: HexLayout, x: number, y: number): Hex {
  const r = (y - layout.originY) / layout.rowHeight;
  const q = (x - layout.originX) / layout.columnWidth - r / 2;
  return hexRound(q, r);
}
