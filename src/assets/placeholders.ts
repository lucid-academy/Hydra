// Placeholder graphics drawn in code, used while the manifest has `"file": null`.
// Each function draws one manifest key. Replace them by putting real files in the manifest.

import { color } from '../scenes/context';
import { Rng } from '../sim/rng';
import { BODY_FOOT, TILE } from './battleArt';
import { fillHex, hexRowSpans } from './drawing';
import type { PlaceholderDrawer } from './drawing';
import { mapPlaceholderDrawers, mapPlaceholderFor } from './mapPlaceholders';

const drawTitleBackground: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  // Fixed seed: the placeholder looks the same every time, whatever the run seed.
  const rng = new Rng(7);

  // Night sky fading into the swamp: flat bands, pixel-art style (no smooth gradients).
  const bands = [palette.underground.black, '#071214', '#0a1a1c', palette.underground.deepTeal];
  const bandHeight = Math.ceil(height / 2 / bands.length);
  bands.forEach((hex, i) => {
    g.fillStyle(color(hex));
    g.fillRect(0, i * bandHeight, width, bandHeight);
  });

  // Far shore between sky and swamp, so the mist has something to lie on.
  g.fillStyle(color('#0b1614'));
  g.fillRect(0, Math.round(height * 0.5), width, Math.round(height * 0.12));

  // Hill with the Order's castle on the right, windows lit by the Eternal Flame.
  g.fillStyle(color('#0b0f10'));
  g.fillTriangle(width * 0.45, height * 0.62, width * 0.78, height * 0.3, width * 1.1, height * 0.62);
  const castleX = Math.round(width * 0.72);
  const castleY = Math.round(height * 0.3) + 16; // sunk into the hilltop
  g.fillRect(castleX - 24, castleY - 20, 48, 22);
  g.fillRect(castleX - 30, castleY - 34, 10, 36);
  g.fillRect(castleX + 20, castleY - 30, 10, 32);
  g.fillRect(castleX - 5, castleY - 52, 10, 34); // cathedral spire
  g.fillStyle(color(palette.order.fire));
  g.fillRect(castleX - 1, castleY - 58, 2, 4); // the Eternal Flame
  g.fillStyle(color(palette.order.orange));
  for (const [dx, dy] of [[-16, -10], [-4, -8], [10, -12], [-26, -24], [24, -20]] as const) {
    g.fillRect(castleX + dx, castleY + dy, 2, 3);
  }

  // Swamp water.
  g.fillStyle(color(palette.underground.swampGreen));
  g.fillRect(0, Math.round(height * 0.62), width, height);
  g.fillStyle(color(palette.underground.deepTeal));
  for (let y = Math.round(height * 0.66); y < height; y += 6) {
    for (let x = rng.int(0, 20); x < width; x += rng.int(30, 70)) {
      g.fillRect(x, y, rng.int(6, 18), 1);
    }
  }

  // Mist drifting over the water: cold against the warm castle lights.
  g.fillStyle(color(palette.mist), 0.18);
  for (let i = 0; i < 7; i++) {
    const y = Math.round(height * 0.55) + i * 9 + rng.int(-3, 3);
    g.fillRect(rng.int(-80, 40), y, rng.int(width * 0.5, width * 0.9), rng.int(4, 8));
  }

  // Bioluminescent spores.
  g.fillStyle(color(palette.underground.bioluminescence));
  for (let i = 0; i < 40; i++) {
    g.fillRect(rng.int(0, width), rng.int(Math.round(height * 0.6), height), 1, 1);
  }

  g.generateTexture(key, width, height);
  g.destroy();
};

// ---------------------------------------------------------------- battle (slanted view)

/**
 * One tile of the battle board seen from a slant: a squashed hex top plus the earth wall under its two lower edges.
 * Tiles are drawn row by row from the top, so each row hides the walls of the row behind it and only the front
 * edge of the board shows its walls, like a thick slab.
 */
function battleTile(top: string, detail: string, edge: string, wallLeft: string, wallRight: string, seed: number): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    const rng = new Rng(seed);
    const faceHeight = TILE.faceHeight;
    const wall = height - faceHeight;
    const spans = hexRowSpans(width, faceHeight);
    // Walls: the same hex shape pushed down, split into a darker left and a lighter right half.
    spans.forEach(([x0, x1], y) => {
      g.fillStyle(color(wallLeft));
      g.fillRect(x0, y + wall, Math.ceil((x1 - x0) / 2), 1);
      g.fillStyle(color(wallRight));
      g.fillRect(x0 + Math.ceil((x1 - x0) / 2), y + wall, Math.floor((x1 - x0) / 2), 1);
    });
    g.fillStyle(0x000000, 0.25);
    for (let i = 0; i < 3; i++) g.fillRect(0, faceHeight - 6 + wall + i * 3, width, 1); // earth layers
    // Top face with a dark rim, so neighbouring tiles read as separate hexes.
    spans.forEach(([x0, x1], y) => {
      g.fillStyle(color(edge));
      g.fillRect(x0, y, x1 - x0, 1);
      if (y === 0 || y === faceHeight - 1) return;
      g.fillStyle(color(top));
      g.fillRect(x0 + 1, y, x1 - x0 - 2, 1);
    });
    g.fillStyle(color(detail));
    for (let i = 0; i < 7; i++) {
      const y = rng.int(4, faceHeight - 5);
      const [x0, x1] = spans[y]!;
      g.fillRect(rng.int(x0 + 3, Math.max(x0 + 3, x1 - 8)), y, rng.int(2, 5), 1);
    }
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** A hex outline or a filled hex, in white, to be tinted: reach, targets, Mist over a hex. */
function battleHexShape(filled: boolean): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff);
    const spans = hexRowSpans(width, height);
    spans.forEach(([x0, x1], y) => {
      if (filled) g.fillRect(x0, y, x1 - x0, 1);
      else if (y <= 1 || y >= height - 2) g.fillRect(x0, y, x1 - x0, 1);
      else {
        g.fillRect(x0, y, 2, 1);
        g.fillRect(x1 - 2, y, 2, 1);
      }
    });
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** Round, soft-edged blob in white: shadows under feet (tinted black) and puffs of Mist. */
function battleBlob(dithered: boolean): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    const rng = new Rng(29);
    g.fillStyle(0xffffff);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = Math.hypot((x + 0.5 - width / 2) / (width / 2), (y + 0.5 - height / 2) / (height / 2));
        if (d >= 1) continue;
        if (!dithered || d < 0.55 || rng.next() > (d - 0.55) / 0.45) g.fillRect(x, y, 1, 1);
      }
    }
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/**
 * The hydra's body seen from a slant: a big mound over its seven hexes, rising above them.
 * The middle of its footprint is at BODY_FOOT; necks are drawn by the game.
 */
const drawBattleBody: PlaceholderDrawer = (scene, key, width) => {
  const g = scene.make.graphics({}, false);
  const cx = BODY_FOOT.x;
  const cy = BODY_FOOT.y;
  g.fillStyle(0x0c0f0c);
  g.fillEllipse(cx, cy, width - 2, 86);
  g.fillStyle(color('#1b3522'));
  g.fillEllipse(cx, cy, width - 6, 80);
  g.fillStyle(color('#2a5233'));
  g.fillEllipse(cx, cy - 10, width - 14, 74);
  g.fillStyle(color('#35683f'));
  g.fillEllipse(cx - 3, cy - 22, width - 36, 58);
  g.fillStyle(color('#43804f'));
  g.fillEllipse(cx - 7, cy - 32, width - 66, 38);
  g.fillStyle(color('#56925f'));
  g.fillEllipse(cx - 10, cy - 38, width - 96, 18);
  // Rows of paler scales around the mound.
  g.fillStyle(color('#6aa874'));
  for (const [rx, ry, dy, count] of [[50, 26, -12, 18], [34, 17, -26, 13]] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + dy + Math.sin(a) * ry), 2, 2);
    }
  }
  g.generateTexture(key, width, BODY_FOOT.y + 44);
  g.destroy();
};

/** One head seen from the side, facing right, drawn pale so the game can tint it with its class colour. */
const drawBattleHead: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const cy = Math.floor(height / 2);
  g.fillStyle(0x101010);
  g.fillEllipse(8, cy, 16, height - 1);
  g.fillRect(10, cy - 2, width - 10, 6);
  g.fillStyle(0xe6e6e6);
  g.fillEllipse(8, cy, 14, height - 3);
  g.fillRect(10, cy - 1, width - 11, 4); // snout
  g.fillStyle(0x303030);
  g.fillRect(11, cy + 1, width - 12, 1); // mouth
  g.fillRect(3, 1, 2, 2); // crest
  g.fillRect(6, 0, 2, 2);
  g.fillStyle(0xfff38a);
  g.fillRect(9, cy - 3, 2, 2); // eye
  g.generateTexture(key, width, height);
  g.destroy();
};

/**
 * A soldier of the Order standing on a hex, seen from a slant, facing right.
 * Feet at the bottom middle of the image; what they carry is held on the right.
 */
function battleSoldier(tabard: string, emblem: string, gear: 'sword' | 'axe' | 'torch', heavy: boolean): PlaceholderDrawer {
  return (scene, key, width, height, palette) => {
    const g = scene.make.graphics({}, false);
    const cx = Math.floor(width / 2);
    const feet = height - 1;
    const body = heavy ? 8 : 7; // half-width of the torso
    g.fillStyle(0x2a2a2e);
    g.fillRect(cx - 4, feet - 8, 3, 8); // legs
    g.fillRect(cx + 1, feet - 8, 3, 8);
    g.fillStyle(0x101010);
    g.fillRect(cx - body - 1, feet - 23, body * 2 + 2, 16);
    g.fillStyle(color(tabard));
    g.fillRect(cx - body, feet - 22, body * 2, 14);
    g.fillStyle(color(emblem));
    g.fillRect(cx - 2, feet - 19, 4, 5);
    g.fillStyle(0x8d8d8d);
    g.fillRect(cx - body - 3, feet - 22, 3, 9); // arms
    g.fillRect(cx + body, feet - 22, 3, 9);
    g.fillStyle(0x101010);
    g.fillCircle(cx, feet - 27, 5);
    if (gear === 'torch') {
      g.fillStyle(color('#c9a27a')); // a lay brother: no helmet, a tonsure
      g.fillCircle(cx, feet - 27, 4);
      g.fillStyle(color('#6b5530'));
      g.fillRect(cx - 4, feet - 31, 8, 2);
    } else {
      g.fillStyle(0xa9a9ad);
      g.fillCircle(cx, feet - 27, 4);
      g.fillStyle(0x3a3a3e);
      g.fillRect(cx - 3, feet - 28, 7, 2); // visor
    }
    const hand = cx + body + 2;
    if (gear === 'sword') {
      g.fillStyle(0xd8d8d8);
      g.fillRect(hand, feet - 34, 2, 20);
      g.fillStyle(0x6b4a2a);
      g.fillRect(hand - 2, feet - 15, 6, 2);
    } else if (gear === 'axe') {
      g.fillStyle(0x6b4a2a);
      g.fillRect(hand, feet - 33, 2, 24);
      g.fillStyle(0xd0d0d0);
      g.fillRect(hand - 1, feet - 35, 5, 7);
    } else {
      g.fillStyle(0x6b4a2a);
      g.fillRect(hand, feet - 28, 2, 18);
      g.fillStyle(color(palette.order.orange));
      g.fillRect(hand - 1, feet - 34, 4, 6);
      g.fillStyle(color(palette.order.fire));
      g.fillRect(hand, feet - 33, 2, 3);
    }
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/**
 * The lower jaw as its own image, so the game can open the mouth. The placeholder head already has its jaw drawn in,
 * so this one stays empty; real art brings both parts (see docs/ASSETS.md, battle_head).
 */
const drawEmpty: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** A dialogue portrait: a dark bust in front of a swampy glow, eyes catching the light. */
const drawPortrait: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color(palette.underground.deepTeal));
  g.fillRect(0, 0, width, height);
  g.fillStyle(color(palette.underground.swampGreen));
  g.fillEllipse(width / 2, height, width * 1.1, height * 0.7); // shoulders
  g.fillEllipse(width / 2, height * 0.45, width * 0.75, height * 0.42); // head
  g.fillStyle(color(palette.underground.bioluminescence));
  g.fillRect(Math.round(width * 0.33), Math.round(height * 0.42), 6, 3);
  g.fillRect(Math.round(width * 0.6), Math.round(height * 0.42), 6, 3);
  g.generateTexture(key, width, height);
  g.destroy();
};

function battleDot(fill: string, rim: string): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    g.fillStyle(color(rim));
    g.fillEllipse(width / 2, height / 2, width, height);
    g.fillStyle(color(fill));
    g.fillEllipse(width / 2, height / 2, width - 2, height - 2);
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

export const placeholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  ...mapPlaceholderDrawers,
  battle_hex_mark: battleHexShape(false),
  battle_hex_fill: battleHexShape(true),
  battle_shadow: battleBlob(false),
  battle_mist_puff: battleBlob(true),
  battle_body: drawBattleBody,
  battle_head: drawBattleHead,
  battle_head_jaw: drawEmpty,
  battle_enemy_manAtArms: battleSoldier('#9e2323', '#d9a93b', 'sword', false),
  battle_enemy_headhunter: battleSoldier('#5a1a1a', '#b08a3a', 'axe', true),
  battle_enemy_torchbearer: battleSoldier('#6b5530', '#8a7040', 'torch', false),
  battle_stump: battleDot('#8a2a2a', '#3a0d0d'),
  battle_scar: battleDot('#2a2220', '#111111'),
  title_background: drawTitleBackground,
  portrait_oldMotherToad: drawPortrait,
};

/** battle_tile_<biome>_<ground|water>: a battle tile in the colours of the biome where the fight takes place. */
const drawBiomeBattleTile: PlaceholderDrawer = (scene, key, width, height, palette, data) => {
  const [, biomeId, kind] = /^battle_tile_(.+)_(ground|water)$/.exec(key) ?? [];
  const colors = data.biomes.biomes[biomeId ?? '']?.colors;
  if (!colors) throw new Error(`No biome colours for "${key}"`);
  const top = kind === 'water' ? colors.water : colors.ground;
  const seed = [...key].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
  battleTile(top, colors.detail, darker(top), darker(colors.rock), colors.rock, seed)(scene, key, width, height, palette, data);
};

function darker(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `#${[16, 8, 0].map((s) => Math.round(((n >> s) & 255) * 0.55).toString(16).padStart(2, '0')).join('')}`;
}

/** The placeholder for a manifest key: a fixed one, or one made from a biome's colours (map_ground_*, map_rock_*, battle_tile_*). */
export function placeholderFor(key: string): PlaceholderDrawer | undefined {
  if (/^battle_tile_.+_(ground|water)$/.test(key)) return drawBiomeBattleTile;
  return placeholderDrawers[key] ?? mapPlaceholderFor(key);
}
