// Hex grid math: axial coordinates (q, r), pointy-top hexes.
// Algorithms follow Red Blob Games, "Hexagonal Grids": https://www.redblobgames.com/grids/hexagons/

export interface Hex {
  readonly q: number;
  readonly r: number;
}

export function hex(q: number, r: number): Hex {
  // `+ 0` turns -0 into 0, so keys and equality never see a negative zero.
  return { q: q + 0, r: r + 0 };
}

/** Third cube coordinate; q + r + s = 0 always. */
export function hexS(h: Hex): number {
  return -h.q - h.r;
}

/** Stable string key, for use in Maps and Sets. */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: Hex, b: Hex): Hex {
  return hex(a.q + b.q, a.r + b.r);
}

export function hexSubtract(a: Hex, b: Hex): Hex {
  return hex(a.q - b.q, a.r - b.r);
}

/** The six directions, starting east and going counter-clockwise. */
export const HEX_DIRECTIONS: readonly Hex[] = [
  hex(1, 0),
  hex(1, -1),
  hex(0, -1),
  hex(-1, 0),
  hex(-1, 1),
  hex(0, 1),
];

export function hexNeighbors(h: Hex): Hex[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

/** Number of steps between two hexes. */
export function hexDistance(a: Hex, b: Hex): number {
  const d = hexSubtract(a, b);
  return (Math.abs(d.q) + Math.abs(d.r) + Math.abs(hexS(d))) / 2;
}

/** All hexes within `radius` steps of `center`, including the center. */
export function hexesInRange(center: Hex, radius: number): Hex[] {
  const result: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) result.push(hexAdd(center, hex(q, r)));
  }
  return result;
}

/** Rounds fractional axial coordinates to the nearest hex. */
export function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return hex(rq, rr);
}

/**
 * Hexes on a straight line from `a` to `b`, both included.
 * The tiny nudge keeps the line from running exactly along hex edges, so results are consistent.
 */
export function hexLine(a: Hex, b: Hex): Hex[] {
  const n = hexDistance(a, b);
  if (n === 0) return [a];
  const eps = 1e-6;
  const aq = a.q + eps;
  const ar = a.r + eps;
  const bq = b.q + eps;
  const br = b.r + eps;
  const result: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    result.push(hexRound(aq + (bq - aq) * t, ar + (br - ar) * t));
  }
  return result;
}

/**
 * Can `from` see `to`? Sight is blocked by any hex strictly between them for which `blocksSight` is true.
 * The target itself may block sight and still be seen (you can see a rock wall).
 */
export function hasLineOfSight(from: Hex, to: Hex, blocksSight: (h: Hex) => boolean): boolean {
  const line = hexLine(from, to);
  for (let i = 1; i < line.length - 1; i++) {
    if (blocksSight(line[i] as Hex)) return false;
  }
  return true;
}
