// Placeholder graphics for the strategic map, seen from a slant (like the battle board).
// Ground and rock tiles are made from each biome's colours in biomes.json: map_ground_<biome>_<terrain>, map_rock_<biome>.

import type * as Phaser from 'phaser';
import { color } from '../scenes/context';
import { Rng } from '../sim/rng';
import { fillHex, hexRowSpans } from './drawing';
import type { PlaceholderDrawer } from './drawing';
import { MAP_ROCK_LIFT, MAP_TILE } from './mapArt';

type Graphics = Phaser.GameObjects.Graphics;

function finish(g: Graphics, key: string, width: number, height: number): void {
  g.generateTexture(key, width, height);
  g.destroy();
}

/** A stable small number from a text, so each tile key gets its own (but always the same) speckles. */
function seedOf(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Same hex face pushed down a few pixels, darker on the left and lighter on the right: the side of a block. */
function wall(g: Graphics, width: number, faceHeight: number, from: number, to: number, left: string, right: string): void {
  const spans = hexRowSpans(width, faceHeight);
  for (let offset = to; offset >= from; offset--) {
    spans.forEach(([x0, x1], y) => {
      const half = Math.ceil((x1 - x0) / 2);
      g.fillStyle(color(left));
      g.fillRect(x0, y + offset, half, 1);
      g.fillStyle(color(right));
      g.fillRect(x0 + half, y + offset, x1 - x0 - half, 1);
    });
  }
}

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * amount)));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** map_ground_<biome>_<terrain>: the hex face in the biome's colours, with a thin earth wall under its lower edges. */
const drawGround: PlaceholderDrawer = (scene, key, width, height, _palette, data) => {
  const [, biomeId, terrain] = /^map_ground_(.+)_(water|mud|roots|salt)$/.exec(key) ?? [];
  const colors = data.biomes.biomes[biomeId ?? '']?.colors;
  if (!colors) throw new Error(`No biome colours for "${key}"`);
  const g = scene.make.graphics({}, false);
  const rng = new Rng(seedOf(key));
  const face = MAP_TILE.faceHeight;
  wall(g, width, face, 1, height - face, shade(colors.rock, 0.55), shade(colors.rock, 0.75));
  const base = terrain === 'water' ? colors.water : colors.ground;
  g.fillStyle(color(shade(base, 0.8)));
  fillHex(g, width, face); // a darker rim...
  g.fillStyle(color(base));
  hexRowSpans(width, face).forEach(([x0, x1], y) => {
    if (y > 0 && y < face - 1) g.fillRect(x0 + 1, y, x1 - x0 - 2, 1); // ...inside it the ground itself
  });
  const spans = hexRowSpans(width, face);
  const speck = (fill: string, count: number, w: number) => {
    g.fillStyle(color(fill));
    for (let i = 0; i < count; i++) {
      const y = rng.int(3, face - 4);
      const [x0, x1] = spans[y]!;
      g.fillRect(rng.int(x0 + 2, Math.max(x0 + 2, x1 - w - 2)), y, w, 1);
    }
  };
  if (terrain === 'water') {
    speck(shade(colors.water, 1.6), 4, 4); // ripples
    speck(shade(colors.water, 1.3), 3, 2);
  } else {
    speck(colors.detail, 9, 2);
    speck(shade(colors.ground, 1.25), 5, 1);
  }
  if (terrain === 'salt') {
    // A dry white crust, cracked, with crystals catching the light.
    speck('#cfc6bc', 10, 3);
    speck('#f4eee8', 6, 1);
    speck(shade(colors.ground, 0.6), 4, 4); // cracks
  }
  if (terrain === 'roots') {
    // Roots crawling over the ground.
    for (let i = 0; i < 3; i++) {
      let x = rng.int(3, 8);
      let y = rng.int(6, face - 7);
      g.fillStyle(color('#1a120b'));
      for (let step = 0; step < 22 && x < width - 3; step++, x++) {
        y = Math.max(4, Math.min(face - 5, y + rng.int(-1, 1)));
        g.fillRect(x, y, 1, 2);
      }
    }
    speck('#6b4a2a', 6, 3);
  }
  finish(g, key, width, height);
};

/** map_rock_<biome>: the hex raised into a rough block of cave rock. */
const drawRock: PlaceholderDrawer = (scene, key, width, height, _palette, data) => {
  const biomeId = /^map_rock_(.+)$/.exec(key)?.[1];
  const colors = data.biomes.biomes[biomeId ?? '']?.colors;
  if (!colors) throw new Error(`No biome colours for "${key}"`);
  const g = scene.make.graphics({}, false);
  const rng = new Rng(seedOf(key));
  const face = MAP_TILE.faceHeight;
  wall(g, width, face, 1, height - face, shade(colors.rock, 0.45), shade(colors.rock, 0.7));
  g.fillStyle(color(shade(colors.rock, 1.1)));
  fillHex(g, width, face);
  g.fillStyle(color(shade(colors.rock, 1.3)));
  fillHex(g, width - 10, face - 8, 2); // a lighter top, a little off-centre
  const spans = hexRowSpans(width, face);
  g.fillStyle(color(shade(colors.rock, 1.55)));
  for (let i = 0; i < 6; i++) {
    const y = rng.int(3, face - 4);
    const [x0, x1] = spans[y]!;
    g.fillRect(rng.int(x0 + 2, Math.max(x0 + 2, x1 - 4)), y, 2, 1);
  }
  g.fillStyle(color(shade(colors.rock, 0.35)));
  for (let i = 0; i < 4; i++) g.fillRect(rng.int(2, width - 4), face + rng.int(2, MAP_ROCK_LIFT), 1, rng.int(2, 4)); // cracks
  finish(g, key, width, height);
};

/** Decorations: small things standing on the ground, feet at the bottom middle. */
function decoration(draw: (g: Graphics, cx: number, bottom: number) => void): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    draw(g, Math.floor(width / 2), height - 1);
    finish(g, key, width, height);
  };
}

const px = (g: Graphics, fill: string | number, x: number, y: number, w = 1, h = 1) => {
  g.fillStyle(typeof fill === 'number' ? fill : color(fill));
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

const decorations: Record<string, PlaceholderDrawer> = {
  map_deco_reeds: decoration((g, cx, b) => {
    for (const [dx, h, c] of [[-4, 9, '#5c7a3a'], [-1, 12, '#6b8a44'], [2, 10, '#5c7a3a'], [5, 7, '#4a6630']] as const) {
      px(g, c, cx + dx, b - h, 1, h);
      px(g, '#7a5a30', cx + dx, b - h - 2, 1, 2);
    }
  }),
  map_deco_bones: decoration((g, cx, b) => {
    px(g, '#1a1612', cx - 5, b - 2, 9, 2);
    px(g, '#d8d0c0', cx - 4, b - 2, 7, 1);
    px(g, '#d8d0c0', cx - 5, b - 3, 2, 2);
    px(g, '#d8d0c0', cx + 2, b - 3, 2, 2);
    px(g, '#bfb7a8', cx + 4, b - 1, 3, 1);
  }),
  map_deco_pebbles: decoration((g, cx, b) => {
    for (const [dx, dy] of [[-4, 0], [1, -1], [4, 0]] as const) {
      px(g, '#1a1612', cx + dx - 1, b + dy - 1, 3, 2);
      px(g, '#6b6052', cx + dx - 1, b + dy - 1, 2, 1);
    }
  }),
  map_deco_stalagmite: decoration((g, cx, b) => {
    for (let y = 0; y < 13; y++) {
      const half = Math.floor((y / 13) * 4);
      px(g, '#15110d', cx - half - 1, b - 13 + y, half * 2 + 3, 1);
      px(g, y < 4 ? '#6b6052' : '#4d443a', cx - half, b - 13 + y, half * 2 + 1, 1);
    }
    px(g, '#7a6e60', cx - 1, b - 8, 1, 5);
  }),
  map_deco_puddle: decoration((g, cx, b) => {
    px(g, '#0b2a33', cx - 5, b - 2, 11, 3);
    px(g, '#2a6e78', cx - 4, b - 2, 9, 2);
    px(g, '#7fd0e0', cx - 1, b - 2, 3, 1);
  }),
  map_deco_roots: decoration((g, cx, b) => {
    for (let x = -6; x <= 6; x++) {
      const y = b - 2 - Math.round(Math.abs(Math.sin((x + 6) / 3)) * 4);
      px(g, '#1a120b', cx + x, y, 1, 3);
      px(g, '#6b4a2a', cx + x, y, 1, 1);
    }
  }),
  map_deco_sprout: decoration((g, cx, b) => {
    px(g, '#3a5a24', cx, b - 7, 1, 7);
    px(g, '#6b9a44', cx - 3, b - 6, 3, 2);
    px(g, '#6b9a44', cx + 1, b - 8, 3, 2);
  }),
  map_deco_mushroom: decoration((g, cx, b) => {
    px(g, '#d8cfe0', cx - 1, b - 6, 2, 6);
    px(g, '#1a1020', cx - 5, b - 9, 10, 4);
    px(g, '#8a6a5a', cx - 4, b - 9, 8, 3);
    px(g, '#b08a78', cx - 2, b - 9, 3, 1);
  }),
  map_deco_crystal: decoration((g, cx, b) => {
    for (const [dx, h, w] of [[-3, 9, 3], [1, 13, 3], [4, 7, 2]] as const) {
      px(g, '#3a3036', cx + dx - 1, b - h - 1, w + 2, h + 1);
      px(g, '#e8d8e0', cx + dx, b - h, w, h);
      px(g, '#ffffff', cx + dx, b - h, 1, Math.floor(h / 2));
      px(g, '#c8a8b8', cx + dx + w - 1, b - h + 2, 1, h - 2);
    }
  }),
  map_deco_urn: decoration((g, cx, b) => {
    px(g, '#1a1410', cx - 4, b - 10, 9, 10);
    px(g, '#8a5a3a', cx - 3, b - 9, 7, 8);
    px(g, '#a8744c', cx - 2, b - 8, 2, 5);
    px(g, '#1a1410', cx - 2, b - 12, 5, 3);
    px(g, '#6b4a2a', cx - 1, b - 11, 3, 1);
  }),
  map_deco_brokenPillar: decoration((g, cx, b) => {
    px(g, '#15120f', cx - 5, b - 13, 11, 13);
    px(g, '#6b6458', cx - 4, b - 12, 9, 12);
    px(g, '#8a8276', cx - 4, b - 12, 2, 12);
    px(g, '#4a443c', cx + 2, b - 12, 2, 12);
    px(g, '#15120f', cx - 4, b - 14, 4, 2); // broken top
    px(g, '#15120f', cx + 1, b - 15, 4, 3);
    px(g, '#6b6458', cx + 7, b - 2, 3, 2); // a fallen chunk
  }),
  map_deco_glowMushroom: decoration((g, cx, b) => {
    px(g, '#e8dff0', cx - 1, b - 8, 2, 8);
    px(g, '#1a1020', cx - 5, b - 12, 11, 5);
    px(g, '#c65bd6', cx - 4, b - 12, 9, 4);
    px(g, '#f0c8f8', cx - 2, b - 12, 3, 1);
    px(g, '#7fd6c8', cx + 3, b - 3, 2, 2); // a little one beside it
  }),
};

/** A soft round light, white, for adding glow (the game tints it and draws it brighter-on-top). */
const drawGlow: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const r = (width / 2) * (1 - i / steps);
    g.fillStyle(0xffffff, 0.06 + (i / steps) * 0.05);
    g.fillEllipse(width / 2, height / 2, r * 2, r * 2 * (height / width));
  }
  finish(g, key, width, height);
};

/** Outline of a squashed hex (where the hydra can go), in white to be tinted. */
const drawMark: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff);
  hexRowSpans(width, height).forEach(([x0, x1], y) => {
    if (y === 0 || y === height - 1) g.fillRect(x0, y, x1 - x0, 1);
    else {
      g.fillRect(x0, y, 1, 1);
      g.fillRect(x1 - 1, y, 1, 1);
    }
  });
  finish(g, key, width, height);
};

/** Ragged dark edge laid over unknown hexes next to known ones, so the darkness doesn't end in a hard line. */
const drawFogEdge: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const rng = new Rng(77);
  g.fillStyle(0x05090a);
  hexRowSpans(width, MAP_TILE.faceHeight).forEach(([x0, x1], y) => {
    for (let x = x0; x < x1; x++) if (rng.next() < 0.55) g.fillRect(x, y, 1, 1);
  });
  finish(g, key, width, height);
};

const drawLair: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  const cx = width / 2;
  const cy = height - 10;
  g.fillStyle(color('#0b1a0c'));
  g.fillEllipse(cx, cy, width - 6, 18);
  g.fillStyle(color(palette.underground.black));
  g.fillEllipse(cx, cy, width - 10, 14);
  g.lineStyle(1, color(palette.underground.bioluminescence));
  g.strokeEllipse(cx, cy, width - 8, 16);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = cx + Math.cos(a) * (width / 2 - 2);
    const y = cy + Math.sin(a) * 9;
    px(g, i % 2 ? '#5c7a3a' : '#6b8a44', x, y - 8, 1, 8);
  }
  px(g, '#d8d0c0', cx + 8, cy - 1, 4, 2);
  px(g, '#d8d0c0', cx - 13, cy + 2, 5, 2);
  finish(g, key, width, height);
};

const drawShrine: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const cx = Math.floor(width / 2);
  const b = height - 1;
  px(g, '#1a1612', cx - 10, b - 5, 21, 6);
  px(g, '#4a4238', cx - 9, b - 6, 19, 3); // plinth
  px(g, '#15120f', cx - 4, b - 36, 9, 31);
  px(g, '#5a5248', cx - 3, b - 35, 7, 29); // pillar
  // The Great Serpent coiled round the pillar.
  for (let t = 0; t <= 60; t++) {
    const y = b - 7 - t * 0.45;
    const x = cx + Math.sin(t / 6.5) * 7;
    px(g, '#0c0f0c', x - 1, y - 1, 3, 3);
  }
  for (let t = 0; t <= 60; t++) {
    const y = b - 7 - t * 0.45;
    const x = cx + Math.sin(t / 6.5) * 7;
    px(g, '#3f8f6a', x, y, 1, 2);
  }
  px(g, '#0c0f0c', cx - 3, b - 42, 7, 6);
  px(g, '#7fe0d6', cx - 2, b - 41, 5, 4); // the gem
  px(g, '#e0fffa', cx - 1, b - 41, 1, 1);
  finish(g, key, width, height);
};

const drawPassage: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const cx = width / 2;
  const b = height - 1;
  // A shaft of pale light falling from a crack in the cave roof.
  for (let y = 0; y < b - 4; y++) {
    const half = 3 + (y / b) * (width / 2 - 6);
    g.fillStyle(0xd0e4dc, 0.05 + (y / b) * 0.12);
    g.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
  }
  px(g, '#1a1612', cx - 13, b - 6, 26, 6);
  px(g, '#3a342c', cx - 12, b - 6, 24, 4);
  px(g, '#5a5248', cx - 9, b - 9, 5, 4);
  px(g, '#6b6052', cx + 3, b - 8, 6, 3);
  px(g, '#5a5248', cx - 2, b - 11, 4, 4);
  finish(g, key, width, height);
};

const drawMuck: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color('#1b140a'));
  g.fillEllipse(width / 2, height / 2 + 1, width, height - 2);
  g.fillStyle(color('#5b3b1a'));
  g.fillEllipse(width / 2, height / 2, width - 3, height - 4);
  px(g, '#c49a52', width / 2 - 3, height / 2 - 2, 3, 1);
  px(g, '#9b7a4a', width / 2 + 2, height / 2, 2, 1);
  finish(g, key, width, height);
};

const drawMoisture: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const cx = width / 2;
  const b = height - 1;
  g.fillStyle(color('#0b2a33'));
  g.fillEllipse(cx, b - 3, width - 1, 6);
  g.fillStyle(color('#3f9fb8'));
  g.fillEllipse(cx, b - 3, width - 4, 4);
  px(g, '#7fd0e0', cx - 1, b - 14, 2, 9); // a trickle from above
  px(g, '#7fd0e0', cx - 1, b - 18, 2, 2);
  px(g, '#e0f8ff', cx, b - 4, 2, 1);
  finish(g, key, width, height);
};

/** A small soldier of the Order standing on the map, `x` = middle of the feet. */
function mapSoldier(g: Graphics, x: number, b: number, tabard: string, skin = false): void {
  px(g, '#2a2a2e', x - 2, b - 4, 2, 4);
  px(g, '#2a2a2e', x + 1, b - 4, 2, 4);
  px(g, '#101010', x - 4, b - 13, 9, 10);
  px(g, tabard, x - 3, b - 12, 7, 8);
  px(g, '#d9a93b', x - 1, b - 10, 2, 3);
  px(g, '#101010', x - 3, b - 18, 7, 6);
  px(g, skin ? '#c9a27a' : '#a9a9ad', x - 2, b - 17, 5, 4);
}

function drawEncounter(tier: number): PlaceholderDrawer {
  return (scene, key, width, height, palette) => {
    const g = scene.make.graphics({}, false);
    const b = height - 1;
    const cx = Math.floor(width / 2);
    // More soldiers and a bigger banner: a stronger group. Tier 3 brings torches.
    const spots = tier === 1 ? [0] : tier === 2 ? [-7, 7] : [-12, 0, 12];
    const banner = { x: cx + spots[0]! + 5, h: 16 + tier * 4, w: 6 + tier * 2 };
    px(g, '#8a6238', banner.x, b - banner.h - 6, 1, banner.h);
    px(g, palette.order.bannerRed, banner.x + 1, b - banner.h - 6, banner.w, 5 + tier);
    px(g, palette.order.fire, banner.x + 2 + Math.floor(banner.w / 3), b - banner.h - 5, 2, 2 + tier);
    spots.forEach((dx, i) => {
      mapSoldier(g, cx + dx, b - (i % 2), i === 2 ? '#6b5530' : palette.order.bannerRed, i === 2);
      if (tier === 3 && i === 2) {
        px(g, '#6b4a2a', cx + dx + 4, b - 18, 1, 10);
        px(g, palette.order.orange, cx + dx + 3, b - 21, 3, 4);
        px(g, palette.order.fire, cx + dx + 4, b - 20, 1, 2);
      }
    });
    finish(g, key, width, height);
  };
}

const drawHydra: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  const cx = Math.floor(width / 2);
  const b = height - 1;
  g.fillStyle(color('#0c0f0c'));
  g.fillEllipse(cx, b - 6, 22, 13);
  g.fillStyle(color('#2f5e3a'));
  g.fillEllipse(cx, b - 6, 20, 11);
  g.fillStyle(color('#43804f'));
  g.fillEllipse(cx - 2, b - 8, 11, 6);
  for (const [dx, top, fill] of [[-7, 9, '#5f9a4a'], [0, 4, '#b7d13a'], [7, 10, '#8fb3a8']] as const) {
    for (let y = top + 3; y < b - 8; y++) {
      px(g, '#0c0f0c', cx + dx * ((y - top) / (b - 8 - top)) * 0.6 + dx * 0.4 - 1, y, 3, 1);
      px(g, '#3f7a4c', cx + dx * ((y - top) / (b - 8 - top)) * 0.6 + dx * 0.4, y, 1, 1);
    }
    px(g, '#0c0f0c', cx + dx - 2, top - 1, 6, 5);
    px(g, fill, cx + dx - 1, top, 4, 3);
    px(g, palette.underground.bioluminescence, cx + dx + 1, top, 1, 1);
  }
  finish(g, key, width, height);
};

export const mapPlaceholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  ...decorations,
  map_glow: drawGlow,
  map_mark: drawMark,
  map_fog_edge: drawFogEdge,
  map_lair: drawLair,
  map_shrine: drawShrine,
  map_passage: drawPassage,
  map_muck: drawMuck,
  map_moisture: drawMoisture,
  map_encounter_1: drawEncounter(1),
  map_encounter_2: drawEncounter(2),
  map_encounter_3: drawEncounter(3),
  map_hydra: drawHydra,
};

/** Placeholders made from a biome's colours: map_ground_<biome>_<water|mud|roots> and map_rock_<biome>. */
export function mapPlaceholderFor(key: string): PlaceholderDrawer | undefined {
  if (/^map_ground_.+_(water|mud|roots|salt)$/.test(key)) return drawGround;
  if (/^map_rock_.+$/.test(key)) return drawRock;
  return undefined;
}
