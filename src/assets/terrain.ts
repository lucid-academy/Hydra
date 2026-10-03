// Hex terrain cut out of square ground and rock textures (real art, see docs/ASSETS.md and docs/ART_PROMPTS.md).
// The game does it once, when it starts: every tile gets a few variants, each from a different part of the texture,
// so neighbouring hexes don't look the same. Plain pixel work on RGBA arrays (no Phaser), so it can be tested.

import { Rng } from '../sim/rng';
import { hexRowSpans } from './drawing';

/** How many differently cut versions of each tile the game makes. */
export const TERRAIN_VARIANTS = 8;

export const groundTextureKey = (biome: string, terrain: string): string => `texture_ground_${biome}_${terrain}`;
export const rockTextureKey = (biome: string): string => `texture_rock_${biome}`;

/** Textures are raw material for tiles, never drawn on their own, so they need no placeholder. */
export function isTerrainTextureKey(key: string): boolean {
  return key.startsWith('texture_');
}

export const variantKey = (tileKey: string, variant: number): string => `${tileKey}_v${variant}`;

/** An image as RGBA bytes, row by row (the same layout as the browser's ImageData). */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
}

/** How a tile is shaped: a squashed hex face on top and its walls hanging this many pixels below the face. */
export interface TileShape {
  width: number;
  faceHeight: number;
  wallDepth: number;
}

/** How much darker or lighter each part is than the texture (1 = as drawn). */
export interface TileShading {
  face: number;
  rim: number;
  wallLeft: number;
  wallRight: number;
  /** Every few rows the wall gets a darker line, like layers of earth (1 = no lines). */
  wallLayers: number;
}

export const GROUND_SHADING: TileShading = { face: 1, rim: 0.72, wallLeft: 0.5, wallRight: 0.68, wallLayers: 0.82 };
export const ROCK_SHADING: TileShading = { face: 1.08, rim: 0.8, wallLeft: 0.42, wallRight: 0.62, wallLayers: 1 };

/** A stable number from a text, so each tile key gets its own (but always the same) cuts. */
export function seedOf(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Where in a texture a window of the given size starts; the window stays inside the texture when it fits. */
function windowOffset(rng: Rng, textureSize: number, windowSize: number): number {
  return textureSize > windowSize ? rng.int(0, textureSize - windowSize) : 0;
}

/**
 * One tile: the hex face cut from `faceTexture`, with a 1 px darker rim so neighbouring hexes read as separate
 * fields, and walls under its lower edges cut from `wallTexture`, darker on the left and lighter on the right
 * (light comes from the upper left). Everything outside the shape stays transparent.
 * The same `seed` always gives the same cut.
 */
export function cutTile(faceTexture: Pixels, wallTexture: Pixels, shape: TileShape, shading: TileShading, seed: number): Pixels {
  const { width, faceHeight, wallDepth } = shape;
  const height = faceHeight + wallDepth;
  const out: Pixels = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const rng = new Rng(seed);
  const face = { x: windowOffset(rng, faceTexture.width, width), y: windowOffset(rng, faceTexture.height, faceHeight) };
  const wall = { x: windowOffset(rng, wallTexture.width, width), y: windowOffset(rng, wallTexture.height, height) };
  const spans = hexRowSpans(width, faceHeight);

  // Walls first: the hex shape pushed down row by row; the face then covers all of it except below its lower edges.
  for (let offset = wallDepth; offset >= 1; offset--) {
    spans.forEach(([x0, x1], y) => {
      const outY = y + offset;
      const half = x0 + Math.ceil((x1 - x0) / 2);
      const layer = (outY - faceHeight) % 3 === 2 ? shading.wallLayers : 1;
      for (let x = x0; x < x1; x++) {
        const shade = (x < half ? shading.wallLeft : shading.wallRight) * layer;
        copyPixel(wallTexture, wall.x + x, wall.y + outY, out, x, outY, shade);
      }
    });
  }
  spans.forEach(([x0, x1], y) => {
    for (let x = x0; x < x1; x++) {
      const rim = y === 0 || y === faceHeight - 1 || x === x0 || x === x1 - 1;
      copyPixel(faceTexture, face.x + x, face.y + y, out, x, y, rim ? shading.rim : shading.face);
    }
  });
  return out;
}

/** Copies one texture pixel (wrapping round if the texture is too small), made darker or lighter, fully opaque. */
function copyPixel(from: Pixels, fx: number, fy: number, to: Pixels, tx: number, ty: number, shade: number): void {
  const src = ((((fy % from.height) + from.height) % from.height) * from.width + (((fx % from.width) + from.width) % from.width)) * 4;
  const dst = (ty * to.width + tx) * 4;
  to.data[dst] = from.data[src]! * shade;
  to.data[dst + 1] = from.data[src + 1]! * shade;
  to.data[dst + 2] = from.data[src + 2]! * shade;
  to.data[dst + 3] = 255;
}
