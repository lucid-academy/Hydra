import { describe, expect, it } from 'vitest';
import {
  formatManifest,
  ImportError,
  importArt,
  removeMagenta,
  ruleFor,
  shrink,
  toGrey,
  toPalette,
} from '../scripts/artImport';
import type { ManifestEntry, Picture } from '../scripts/artImport';
import manifestJson from '../src/assets/manifest.json';

type Rgba = [number, number, number, number];
const MAGENTA: Rgba = [255, 0, 255, 255];
const GREEN: Rgba = [40, 90, 40, 255];

function picture(width: number, height: number, paint: (x: number, y: number) => Rgba): Picture {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  return { width, height, data };
}

const at = (p: Picture, x: number, y: number) => [...p.data.slice((y * p.width + x) * 4, (y * p.width + x) * 4 + 4)];
const inside = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;
const opaqueBox = (p: Picture) => {
  let [minX, minY, maxX, maxY] = [p.width, p.height, -1, -1];
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (at(p, x, y)[3] === 0) continue;
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
    }
  }
  return { minX, minY, maxX, maxY };
};

describe('removing the magenta background', () => {
  it('clears magenta even when GPT got it slightly wrong, and the soft edge around the figure', () => {
    const src = picture(20, 20, (x, y) => {
      if (inside(x, y, 6, 6, 14, 14)) return GREEN;
      if (inside(x, y, 5, 5, 15, 15)) return [148, 45, 148, 255]; // half magenta, half green: a soft edge
      return x < 10 ? MAGENTA : [236, 24, 228, 255];
    });
    const out = removeMagenta(src);
    expect(at(out, 0, 0)[3]).toBe(0);
    expect(at(out, 19, 19)[3]).toBe(0);
    expect(at(out, 5, 5)[3]).toBe(0);
    expect(at(out, 10, 10)).toEqual(GREEN);
  });

  it('keeps purple inside a figure that the background does not touch', () => {
    const purple: Rgba = [198, 91, 214, 255];
    const src = picture(20, 20, (x, y) => (inside(x, y, 8, 8, 12, 12) ? purple : inside(x, y, 4, 4, 16, 16) ? GREEN : MAGENTA));
    expect(at(removeMagenta(src), 10, 10)).toEqual(purple);
  });
});

describe('shrinking', () => {
  it('gives each new pixel the most common colour of its block, not a blur', () => {
    const src = picture(10, 10, (x, y) => (x + y * 10 < 60 ? [200, 0, 0, 255] : [0, 0, 200, 255]));
    const out = shrink(src, { x: 0, y: 0, width: 10, height: 10 }, 1, 1);
    expect(at(out, 0, 0)).toEqual([200, 0, 0, 255]);
  });

  it('leaves a pixel see-through when most of its block is', () => {
    const src = picture(4, 4, (x, y) => (x === 0 && y === 0 ? GREEN : [0, 0, 0, 0]));
    expect(at(shrink(src, { x: 0, y: 0, width: 4, height: 4 }, 1, 1), 0, 0)[3]).toBe(0);
  });
});

describe('importing pictures', () => {
  const entries = manifestJson.images as Record<string, ManifestEntry>;

  it('squashes a square texture to the game size', () => {
    const src = picture(200, 200, (x) => (x < 100 ? GREEN : [90, 70, 50, 255]));
    const { images } = importArt([src], 'texture_ground_lairSwamp_mud', entries, null);
    expect(images).toHaveLength(1);
    expect([images[0]!.picture.width, images[0]!.picture.height]).toEqual([96, 67]);
    expect(at(images[0]!.picture, 10, 30)).toEqual(GREEN);
    expect(at(images[0]!.picture, 90, 30)).toEqual([90, 70, 50, 255]);
  });

  it('trims a sprite, fits it into its box and stands it on the bottom edge', () => {
    // A wide figure in the middle of a big magenta picture.
    const src = picture(400, 400, (x, y) => (inside(x, y, 100, 150, 300, 250) ? GREEN : MAGENTA));
    const { images } = importArt([src], 'battle_body', entries, null);
    const body = images[0]!.picture;
    expect([body.width, body.height]).toEqual([132, 110]);
    const box = opaqueBox(body);
    expect([box.minX, box.maxX]).toEqual([0, 131]); // as wide as it can be
    expect(box.maxY).toBe(109); // feet on the bottom edge
    expect(box.maxY - box.minY + 1).toBe(66); // and the shape kept (2:1)
  });

  it('drops stray specks GPT leaves on the background', () => {
    const src = picture(400, 400, (x, y) => (inside(x, y, 100, 150, 300, 250) || inside(x, y, 5, 5, 7, 7) ? GREEN : MAGENTA));
    const box = opaqueBox(importArt([src], 'battle_body', entries, null).images[0]!.picture);
    expect(box.minX).toBe(0); // the speck in the corner did not stretch the trimmed box
    expect(box.maxY - box.minY + 1).toBe(66);
  });

  it('splits the head and its jaw, at one scale, and greys them for tinting', () => {
    const src = picture(300, 120, (x, y) => {
      if (inside(x, y, 10, 10, 150, 110)) return [200, 210, 200, 255]; // head: 140×100
      if (inside(x, y, 190, 40, 260, 60)) return [120, 120, 120, 255]; // jaw: 70×20, apart from the head
      return MAGENTA;
    });
    const { images } = importArt([src], 'battle_head', entries, null);
    expect(images.map((i) => i.key)).toEqual(['battle_head', 'battle_head_jaw']);
    const [head, jaw] = images.map((i) => i.picture);
    expect([head!.width, head!.height, jaw!.width, jaw!.height]).toEqual([20, 14, 20, 7]);
    const headBox = opaqueBox(head!);
    const jawBox = opaqueBox(jaw!);
    expect(headBox.maxY).toBe(13); // the head sits on its bottom edge...
    expect([jawBox.minY, jawBox.maxX]).toEqual([0, 19]); // ...the jaw hangs from the top, tip on the right
    // Same scale: the jaw is half as long as the head, as drawn.
    expect(jawBox.maxX - jawBox.minX + 1).toBe(Math.round((headBox.maxX - headBox.minX + 1) / 2));
    const [r, g, b] = at(head!, 10, 10);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBe(255); // the brightest grey becomes white
  });

  it('says what is wrong when the head and jaw touch', () => {
    const src = picture(300, 120, (x, y) => (inside(x, y, 10, 10, 260, 110) ? [200, 200, 200, 255] : MAGENTA));
    expect(() => importArt([src], 'battle_head', entries, null)).toThrow(ImportError);
    expect(() => importArt([src], 'battle_head', entries, null)).toThrow(/2 separate pieces, found 1/);
  });

  it('crops frames of an animation by one common box, so the figure does not jump', () => {
    const frame = (dx: number) => picture(200, 200, (x, y) => (inside(x, y, 50 + dx, 40, 90 + dx, 160) ? GREEN : MAGENTA));
    const { images } = importArt([frame(0), frame(40)], 'battle_enemy_manAtArms', entries, null);
    const strip = images[0]!.picture;
    expect(images[0]!.frames).toBe(2);
    expect([strip.width, strip.height]).toEqual([52, 38]);
    // The figure fills the left half of the common box in frame 1 and the right half in frame 2, as drawn.
    const columns = (from: number) => [...Array(26).keys()].filter((x) => [...Array(38).keys()].some((y) => at(strip, from + x, y)[3] === 255));
    expect(Math.max(...columns(0))).toBeLessThan(13);
    expect(Math.min(...columns(26))).toBeGreaterThanOrEqual(12);
  });

  it('matches colours to the palette when there is one', () => {
    const src = picture(2, 1, (x) => (x === 0 ? [250, 10, 10, 255] : [10, 10, 240, 255]));
    const out = toPalette(src, [[255, 0, 0], [0, 0, 255], [0, 0, 0]]);
    expect(at(out, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(at(out, 1, 0)).toEqual([0, 0, 255, 255]);
  });

  it('turns colours to grey', () => {
    const out = toGrey(picture(1, 1, () => [200, 100, 50, 255]));
    expect(at(out, 0, 0).slice(0, 3)).toEqual([255, 255, 255]);
  });

  it('knows how each kind of image is imported', () => {
    expect(ruleFor('texture_rock_saltMines').fit).toBe('texture');
    expect(ruleFor('title_background').fit).toBe('cover');
    expect(ruleFor('battle_enemy_headhunter').parts[0]!.align).toBe('bottom');
    expect(ruleFor('battle_head').parts).toHaveLength(2);
  });
});

describe('the manifest', () => {
  it('is written back exactly as it is laid out by hand', async () => {
    const text = (await import('../src/assets/manifest.json?raw')).default;
    expect(formatManifest(JSON.parse(text))).toBe(text);
  });
});
