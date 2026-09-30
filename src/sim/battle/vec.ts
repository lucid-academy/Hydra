import type { Vec } from './types';

export function vec(x: number, y: number): Vec {
  return { x, y };
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Point moved from `from` towards `to` by at most `step`. */
export function moveTowards(from: Vec, to: Vec, step: number): Vec {
  const d = distance(from, to);
  if (d <= step || d === 0) return { x: to.x, y: to.y };
  return { x: from.x + ((to.x - from.x) / d) * step, y: from.y + ((to.y - from.y) / d) * step };
}

export function fromAngle(origin: Vec, angle: number, length: number): Vec {
  return { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length };
}

export function angleTo(from: Vec, to: Vec): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function clampToArena(p: Vec, width: number, height: number, margin: number): Vec {
  return {
    x: Math.min(width - margin, Math.max(margin, p.x)),
    y: Math.min(height - margin, Math.max(margin, p.y)),
  };
}
