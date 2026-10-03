// The art import, step by step, on plain RGBA pixels (scripts/art.mjs reads and writes the files and the manifest).
// A picture from GPT goes in; out come images at the game's exact size, ready for public/images/:
//   sprites:  magenta background removed, stray specks dropped, split into parts, trimmed, shrunk, placed in their box;
//   textures: squashed from a square to the camera angle (they fill the whole picture, no background);
//   cover:    a full-screen picture, cropped to the screen's shape and shrunk.
// Shrinking is pixel-art friendly: each game pixel takes the most common colour of the block of pixels it covers,
// so there are no blurred in-between colours.

export interface Picture {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ManifestEntry {
  file: string | null;
  width: number;
  height: number;
  frames?: number;
}

export type Align = 'center' | 'bottom' | 'top-right';

export interface ImportRule {
  /** texture: fills the box, squashed; cover: fills the box keeping its shape, the overflow cut off; sprite: on magenta, trimmed and fitted. */
  fit: 'texture' | 'cover' | 'sprite';
  /** Grey only, for images the game tints (head classes, mist, marks). */
  grey: boolean;
  /** Pieces drawn side by side on one picture, left to right; each becomes its own image, all at the same scale. */
  parts: Array<{ key: string; align: Align }>;
}

const TINTED = /^(battle_head|battle_head_jaw|battle_mist_puff|battle_shadow|battle_hex_mark|battle_hex_fill|map_glow|map_mark)$/;
const STANDING = /^(battle_body|battle_enemy_.+|map_deco_.+|map_encounter_.+|map_(lair|shrine|passage|muck|moisture|hydra)|portrait_.+)$/;

/** How a picture named after a manifest key is imported. */
export function ruleFor(key: string): ImportRule {
  if (key.startsWith('texture_')) return { fit: 'texture', grey: false, parts: [{ key, align: 'center' }] };
  if (key === 'title_background') return { fit: 'cover', grey: false, parts: [{ key, align: 'center' }] };
  if (key === 'battle_head') {
    // The head and its lower jaw side by side; the jaw hangs under the head in the game (docs/ASSETS.md).
    return { fit: 'sprite', grey: true, parts: [{ key: 'battle_head', align: 'bottom' }, { key: 'battle_head_jaw', align: 'top-right' }] };
  }
  if (key === 'battle_head_jaw') return { fit: 'sprite', grey: true, parts: [{ key, align: 'top-right' }] };
  return { fit: 'sprite', grey: TINTED.test(key), parts: [{ key, align: STANDING.test(key) ? 'bottom' : 'center' }] };
}

/** Textures are drawn as squares straight from above; the game sees the ground from about 45°, so they get this flat. */
export const TEXTURE_SQUASH = 0.7;

export interface ImportResult {
  images: Array<{ key: string; picture: Picture; frames?: number }>;
  notes: string[];
}

/**
 * Imports one picture (or the frames of one animation, in order) for a manifest key.
 * `entries` are the manifest entries of every key the picture fills (several for a picture in parts).
 */
export function importArt(sources: Picture[], key: string, entries: Record<string, ManifestEntry>, palette: Rgb[] | null): ImportResult {
  const rule = ruleFor(key);
  const notes: string[] = [];
  for (const part of rule.parts) {
    if (!entries[part.key]) throw new ImportError(`${key}: the manifest has no image "${part.key}"`);
  }
  const finish = (picture: Picture): Picture => {
    let out = rule.grey ? toGrey(picture) : picture;
    if (palette && !rule.grey) out = toPalette(out, palette);
    return out;
  };

  if (rule.fit !== 'sprite') {
    if (sources.length > 1) throw new ImportError(`${key}: textures and full-screen pictures have no frames`);
    const entry = entries[key]!;
    const source = sources[0]!;
    const crop = rule.fit === 'texture' ? centredCrop(source, 1) : centredCrop(source, entry.width / entry.height);
    if (rule.fit === 'texture' && Math.abs(entry.height / entry.width - TEXTURE_SQUASH) > 0.02) {
      notes.push(`${key}: the manifest size ${entry.width}×${entry.height} is not a square squashed to ${TEXTURE_SQUASH}`);
    }
    return { images: [{ key, picture: finish(shrink(source, crop, entry.width, entry.height)) }], notes };
  }

  const cleaned = sources.map((s) => dropSpecks(removeMagenta(s)));
  cleaned.forEach((c, i) => {
    if (c.opaque === 0) throw new ImportError(`${key}${sources.length > 1 ? `, frame ${i + 1}` : ''}: nothing left after removing the magenta background`);
    if (c.magentaLeft > 0.01 * c.opaque) notes.push(`${key}: some magenta is left inside the picture (holes or a pink edge?)`);
  });

  // Several frames of one animation: one common box for all of them, so the character doesn't jump between frames.
  if (cleaned.length > 1) {
    if (rule.parts.length > 1) throw new ImportError(`${key}: a picture in parts can't have frames`);
    if (sources.some((s) => s.width !== sources[0]!.width || s.height !== sources[0]!.height)) {
      throw new ImportError(`${key}: all frames must be pictures of the same size`);
    }
    const entry = entries[key]!;
    const box = unionBox(cleaned.map((c) => c.box));
    const size = fitSize(box, entry, notes, key);
    const strip = blank(entry.width * cleaned.length, entry.height);
    cleaned.forEach((c, i) => paste(strip, place(shrink(c.picture, box, size.width, size.height), entry, rule.parts[0]!.align), i * entry.width, 0));
    return { images: [{ key, picture: finish(strip), frames: cleaned.length }], notes };
  }

  const only = cleaned[0]!;
  const entry = entries[key]!;
  if (entry.frames !== undefined) {
    // A sprite sheet: the frames are separate figures on one picture, read left to right.
    const pieces = splitPieces(only, entry.frames, key);
    const scale = Math.min(...pieces.map((p) => Math.min(entry.width / p.box.width, entry.height / p.box.height)));
    const strip = blank(entry.width * pieces.length, entry.height);
    pieces.forEach((p, i) => paste(strip, place(shrinkBy(p, scale), entry, rule.parts[0]!.align), i * entry.width, 0));
    return { images: [{ key, picture: finish(strip), frames: pieces.length }], notes };
  }

  const pieces = rule.parts.length > 1 ? splitPieces(only, rule.parts.length, key) : [only];
  // All parts at the same scale (the one that makes every part fit its box), so they match in the game.
  const scale = Math.min(...pieces.map((p, i) => {
    const target = entries[rule.parts[i]!.key]!;
    return Math.min(target.width / p.box.width, target.height / p.box.height);
  }));
  if (scale > 1) notes.push(`${key}: the picture is smaller than the game image, it will look blocky`);
  const images = pieces.map((p, i) => {
    const part = rule.parts[i]!;
    return { key: part.key, picture: finish(place(shrinkBy(p, scale), entries[part.key]!, part.align)) };
  });
  return { images, notes };
}

export class ImportError extends Error {}

// ------------------------------------------------------------------ background and pieces

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Cleaned {
  picture: Picture;
  box: Box;
  opaque: number;
  magentaLeft: number;
}

/** How strongly a colour leans to magenta: both red and blue above green. */
function magentaness(r: number, g: number, b: number): number {
  return Math.abs(r - b) < Math.min(r, b) - g ? Math.min(r, b) - g : 0;
}

/**
 * Makes the magenta background see-through. GPT never paints exactly #FF00FF, so: clearly magenta pixels go,
 * and so do dimmer magenta-ish pixels joined to them (soft edges, shadows on the background), but a purple
 * inside the figure that the background doesn't reach stays.
 */
export function removeMagenta(source: Picture): Picture {
  const { width, height } = source;
  const data = new Uint8ClampedArray(source.data);
  const background = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]!;
    const g = data[i * 4 + 1]!;
    const b = data[i * 4 + 2]!;
    const strong = data[i * 4 + 3]! < 128 || (magentaness(r, g, b) >= 120 && r >= 150 && b >= 150);
    if (strong) {
      background[i] = 1;
      queue.push(i);
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (background[n]) continue;
      if (magentaness(data[n * 4]!, data[n * 4 + 1]!, data[n * 4 + 2]!) >= 50) {
        background[n] = 1;
        queue.push(n);
      }
    }
  }
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = background[i] ? 0 : 255;
  return { width, height, data };
}

/** Groups of touching opaque pixels (diagonals count), each with its size and bounding box. */
function findPieces(picture: Picture): { labels: Int32Array; pieces: Array<Box & { area: number; label: number }> } {
  const { width, height, data } = picture;
  const labels = new Int32Array(width * height).fill(-1);
  const pieces: Array<Box & { area: number; label: number }> = [];
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== -1 || data[start * 4 + 3] === 0) continue;
    const label = pieces.length;
    let [minX, minY, maxX, maxY, area] = [width, height, -1, -1, 0];
    labels[start] = label;
    stack.push(start);
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      area++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (labels[n] !== -1 || data[n * 4 + 3] === 0) continue;
          labels[n] = label;
          stack.push(n);
        }
      }
    }
    pieces.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area, label });
  }
  return { labels, pieces };
}

/** Drops stray specks (tiny pieces far smaller than the figure) and measures what is left. */
export function dropSpecks(picture: Picture): Cleaned {
  const { labels, pieces } = findPieces(picture);
  const largest = Math.max(0, ...pieces.map((p) => p.area));
  const keep = new Set(pieces.filter((p) => p.area >= Math.max(4, largest * 0.005)).map((p) => p.label));
  const data = new Uint8ClampedArray(picture.data);
  let opaque = 0;
  let magentaLeft = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === -1) continue;
    if (!keep.has(labels[i]!)) {
      data[i * 4 + 3] = 0;
      continue;
    }
    opaque++;
    if (magentaness(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!) >= 50) magentaLeft++;
  }
  const kept = pieces.filter((p) => keep.has(p.label));
  return { picture: { ...picture, data }, box: unionBox(kept), opaque, magentaLeft };
}

/**
 * Splits a cleaned picture into `count` pieces, left to right: the `count` biggest pieces, each also taking the
 * smaller bits nearest to it (a tooth or a glint drawn apart from the rest).
 */
function splitPieces(cleaned: Cleaned, count: number, key: string): Cleaned[] {
  const { labels, pieces } = findPieces(cleaned.picture);
  const bySize = [...pieces].sort((a, b) => b.area - a.area);
  const main = bySize.slice(0, count);
  const second = bySize[count];
  if (main.length < count || main[count - 1]!.area < bySize[0]!.area * 0.05) {
    const big = bySize.filter((p) => p.area >= bySize[0]!.area * 0.05).length;
    throw new ImportError(`${key}: expected ${count} separate pieces, found ${big}. They must not touch each other.`);
  }
  if (second && second.area >= bySize[0]!.area * 0.25) {
    throw new ImportError(`${key}: expected ${count} separate pieces, found more. Remove the extra ones or join them.`);
  }
  main.sort((a, b) => a.x - b.x);
  const owner = new Map<number, number>();
  for (const p of pieces) {
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    let best = 0;
    let bestDistance = Infinity;
    main.forEach((m, i) => {
      const dx = Math.max(m.x - cx, 0, cx - (m.x + m.width));
      const dy = Math.max(m.y - cy, 0, cy - (m.y + m.height));
      const d = Math.hypot(dx, dy);
      if (d < bestDistance) [best, bestDistance] = [i, d];
    });
    owner.set(p.label, best);
  }
  return main.map((_, index) => {
    const data = new Uint8ClampedArray(cleaned.picture.data);
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] !== -1 && owner.get(labels[i]!) !== index) data[i * 4 + 3] = 0;
    }
    const mine = pieces.filter((p) => owner.get(p.label) === index);
    return { picture: { ...cleaned.picture, data }, box: unionBox(mine), opaque: mine.reduce((s, p) => s + p.area, 0), magentaLeft: 0 };
  });
}

// ------------------------------------------------------------------ shrinking and placing

/** The biggest box of the given shape (width / height) in the middle of the picture. */
export function centredCrop(picture: Picture, aspect: number): Box {
  const width = Math.min(picture.width, Math.round(picture.height * aspect));
  const height = Math.min(picture.height, Math.round(width / aspect));
  return { x: Math.floor((picture.width - width) / 2), y: Math.floor((picture.height - height) / 2), width, height };
}

/**
 * Shrinks the `box` part of a picture to width × height. Each new pixel covers a block of old ones and takes their
 * most common colour (similar colours count together); it is see-through if most of the block is.
 */
export function shrink(source: Picture, box: Box, width: number, height: number): Picture {
  const out = blank(width, height);
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let oy = 0; oy < height; oy++) {
    const y0 = box.y + Math.floor((oy * box.height) / height);
    const y1 = Math.max(y0 + 1, box.y + Math.floor(((oy + 1) * box.height) / height));
    for (let ox = 0; ox < width; ox++) {
      const x0 = box.x + Math.floor((ox * box.width) / width);
      const x1 = Math.max(x0 + 1, box.x + Math.floor(((ox + 1) * box.width) / width));
      counts.clear();
      let clear = 0;
      let total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * source.width + x) * 4;
          total++;
          if (source.data[i + 3]! < 128) {
            clear++;
            continue;
          }
          const r = source.data[i]!;
          const g = source.data[i + 1]!;
          const b = source.data[i + 2]!;
          const bucket = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const c = counts.get(bucket);
          if (c) {
            c.n++;
            c.r += r;
            c.g += g;
            c.b += b;
          } else counts.set(bucket, { n: 1, r, g, b });
        }
      }
      if (clear * 2 > total || counts.size === 0) continue;
      let best = { n: 0, r: 0, g: 0, b: 0 };
      for (const c of counts.values()) if (c.n > best.n) best = c;
      const o = (oy * width + ox) * 4;
      out.data[o] = Math.round(best.r / best.n);
      out.data[o + 1] = Math.round(best.g / best.n);
      out.data[o + 2] = Math.round(best.b / best.n);
      out.data[o + 3] = 255;
    }
  }
  return out;
}

/** Shrinks a cleaned piece by a scale factor (its trimmed box times the scale, at least 1 pixel). */
function shrinkBy(piece: Cleaned, scale: number): Picture {
  const width = Math.max(1, Math.round(piece.box.width * scale));
  const height = Math.max(1, Math.round(piece.box.height * scale));
  return shrink(piece.picture, piece.box, width, height);
}

/** The size a trimmed box gets when fitted into an entry's box, keeping its shape. */
function fitSize(box: Box, entry: ManifestEntry, notes: string[], key: string): { width: number; height: number } {
  const scale = Math.min(entry.width / box.width, entry.height / box.height);
  if (scale > 1) notes.push(`${key}: the picture is smaller than the game image, it will look blocky`);
  return { width: Math.max(1, Math.round(box.width * scale)), height: Math.max(1, Math.round(box.height * scale)) };
}

/** Puts a shrunk figure into an empty image the size of the manifest entry. */
function place(figure: Picture, entry: ManifestEntry, align: Align): Picture {
  const out = blank(entry.width, entry.height);
  const x = align === 'top-right' ? entry.width - figure.width : Math.floor((entry.width - figure.width) / 2);
  const y = align === 'bottom' ? entry.height - figure.height : align === 'top-right' ? 0 : Math.floor((entry.height - figure.height) / 2);
  paste(out, figure, x, y);
  return out;
}

function paste(into: Picture, figure: Picture, left: number, top: number): void {
  for (let y = 0; y < figure.height; y++) {
    for (let x = 0; x < figure.width; x++) {
      const tx = left + x;
      const ty = top + y;
      if (tx < 0 || ty < 0 || tx >= into.width || ty >= into.height) continue;
      const from = (y * figure.width + x) * 4;
      if (figure.data[from + 3] === 0) continue;
      into.data.set(figure.data.subarray(from, from + 4), (ty * into.width + tx) * 4);
    }
  }
}

function blank(width: number, height: number): Picture {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function unionBox(boxes: Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

// ------------------------------------------------------------------ colours

export type Rgb = [number, number, number];

/** Grey only, stretched so the brightest part is white: the game tints it, and white takes the tint fully. */
export function toGrey(picture: Picture): Picture {
  const data = new Uint8ClampedArray(picture.data);
  const levels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    levels.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
  }
  levels.sort((a, b) => a - b);
  const bright = Math.max(1, levels[Math.floor(levels.length * 0.98)] ?? 255);
  for (let i = 0; i < data.length; i += 4) {
    const level = Math.min(255, Math.round(((0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) * 255) / bright));
    data[i] = data[i + 1] = data[i + 2] = level;
  }
  return { ...picture, data };
}

/** Every colour replaced by the nearest colour of the palette (as the eye sees it, roughly). */
export function toPalette(picture: Picture, palette: Rgb[]): Picture {
  const data = new Uint8ClampedArray(picture.data);
  const cache = new Map<number, Rgb>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    let near = cache.get(key);
    if (!near) {
      near = nearest([data[i]!, data[i + 1]!, data[i + 2]!], palette);
      cache.set(key, near);
    }
    data.set(near, i);
  }
  return { ...picture, data };
}

function nearest(c: Rgb, palette: Rgb[]): Rgb {
  let best = palette[0]!;
  let bestDistance = Infinity;
  for (const p of palette) {
    // "Redmean" distance: plain RGB distance weighted the way the eye weighs red, green and blue.
    const rm = (c[0] + p[0]) / 2;
    const dr = c[0] - p[0];
    const dg = c[1] - p[1];
    const db = c[2] - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestDistance) [best, bestDistance] = [p, d];
  }
  return best;
}

export function parseHexColor(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ------------------------------------------------------------------ manifest

/** The manifest written back the way it is laid out by hand: one image per line. */
export function formatManifest(manifest: { images: Record<string, ManifestEntry> }): string {
  const lines = Object.entries(manifest.images).map(([key, e]) => {
    const frames = e.frames !== undefined ? `, "frames": ${e.frames}` : '';
    return `    ${JSON.stringify(key)}: { "file": ${JSON.stringify(e.file)}, "width": ${e.width}, "height": ${e.height}${frames} }`;
  });
  return `{\n  "images": {\n${lines.join(',\n')}\n  }\n}\n`;
}
