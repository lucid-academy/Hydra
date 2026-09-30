// Placeholder graphics drawn in code, used while the manifest has `"file": null`.
// Each function draws one manifest key. Replace them by putting real files in the manifest.

import type * as Phaser from 'phaser';
import type { Palette } from '../data/schemas';
import { color } from '../scenes/context';
import { Rng } from '../sim/rng';

type PlaceholderDrawer = (scene: Phaser.Scene, key: string, width: number, height: number, palette: Palette) => void;

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

function fillHex(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
  hexRowSpans(width, height).forEach(([x0, x1], y) => g.fillRect(x0, y, x1 - x0, 1));
}

/** Hex tile: base colour plus scattered detail pixels inside the hex. */
function hexTile(base: string, detail: string, detailCount: number, detailWidth: number, seed: number): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    const rng = new Rng(seed);
    g.fillStyle(color(base));
    fillHex(g, width, height);
    g.fillStyle(color(detail));
    const spans = hexRowSpans(width, height);
    for (let i = 0; i < detailCount; i++) {
      const y = rng.int(3, height - 4);
      const [x0, x1] = spans[y]!;
      g.fillRect(rng.int(x0 + 2, Math.max(x0 + 2, x1 - detailWidth - 2)), y, detailWidth, 1);
    }
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** Darkens a hex that was seen before but is out of sight now. */
const drawHexShade: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color(palette.underground.black), 0.6);
  fillHex(g, width, height);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** Outline marking hexes the hydra can reach this turn. */
const drawHexReachable: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color(palette.underground.bioluminescence), 0.55);
  hexRowSpans(width, height).forEach(([x0, x1], y) => {
    if (y <= 1 || y >= height - 2) g.fillRect(x0, y, x1 - x0, 1);
    else {
      g.fillRect(x0, y, 1, 1);
      g.fillRect(x1 - 1, y, 1, 1);
    }
  });
  g.fillStyle(color(palette.underground.bioluminescence), 0.12);
  fillHex(g, width, height);
  g.generateTexture(key, width, height);
  g.destroy();
};

const drawLairIcon: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  const cx = width / 2;
  const cy = height / 2;
  g.fillStyle(color(palette.underground.black));
  g.fillCircle(cx, cy, width / 2 - 1);
  g.lineStyle(1, color(palette.underground.bioluminescence));
  g.strokeCircle(cx, cy, width / 2 - 2);
  g.strokeCircle(cx, cy, width / 4);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** A red banner of the Order on a pole. */
const drawEncounterIcon: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color(palette.order.gold));
  g.fillRect(3, 1, 1, height - 2);
  g.fillStyle(color(palette.order.bannerRed));
  g.fillRect(4, 2, width - 6, height / 2);
  g.fillStyle(color(palette.order.fire));
  g.fillRect(Math.round(width / 2), Math.round(height / 4), 2, 2);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** A glistening lump of swamp muck. */
const drawMuckIcon: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color('#1b140a'));
  g.fillEllipse(width / 2, height / 2 + 1, width, height - 3);
  g.fillStyle(color('#8a6a34'));
  g.fillEllipse(width / 2, height / 2 + 1, width - 2, height - 5);
  g.fillStyle(color('#c49a52'));
  g.fillRect(width / 2 - 3, height / 2 - 2, 3, 1);
  g.fillRect(width / 2 + 1, height / 2, 2, 1);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** Map token: the hydra's body with three heads. */
const drawHydraToken: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  const cx = Math.round(width / 2);
  g.fillStyle(color(palette.underground.black));
  g.fillEllipse(cx, height - 6, width - 4, 9);
  g.fillStyle(color('#3f7a4c'));
  g.fillEllipse(cx, height - 7, width - 6, 7);
  for (const [dx, top] of [[-5, 3], [0, 1], [5, 3]] as const) {
    g.fillRect(cx + dx - 1, top + 2, 2, height - top - 9);
    g.fillRect(cx + dx - 2, top, 4, 3);
    g.fillStyle(color(palette.underground.bioluminescence));
    g.fillRect(cx + dx, top + 1, 1, 1);
    g.fillStyle(color('#3f7a4c'));
  }
  g.generateTexture(key, width, height);
  g.destroy();
};

/** Battle arena floor, seen from above. */
function arenaFloor(base: string, detail: string, glow: string, seed: number): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    const rng = new Rng(seed);
    g.fillStyle(color(base));
    g.fillRect(0, 0, width, height);
    g.fillStyle(color(detail));
    for (let i = 0; i < 260; i++) g.fillRect(rng.int(0, width), rng.int(0, height), rng.int(2, 9), 1);
    g.fillStyle(color(glow));
    for (let i = 0; i < 45; i++) g.fillRect(rng.int(0, width), rng.int(0, height), 1, 1);
    // Darker edges, like a cave wall closing in.
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, width, 6);
    g.fillRect(0, height - 6, width, 6);
    g.fillRect(0, 0, 6, height);
    g.fillRect(width - 6, 0, 6, height);
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** The hydra's body from above: a dark green mass with a paler back ridge. */
const drawBattleBody: PlaceholderDrawer = (scene, key, width, height, palette) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(color(palette.underground.black));
  g.fillEllipse(width / 2, height / 2, width, height);
  g.fillStyle(color('#2f5e3a'));
  g.fillEllipse(width / 2, height / 2, width - 4, height - 4);
  g.fillStyle(color('#3f7a4c'));
  g.fillEllipse(width / 2 - 2, height / 2 - 2, width - 14, height - 14);
  g.fillStyle(color('#56925f'));
  for (let x = 8; x < width - 8; x += 5) g.fillRect(x, height / 2 - 1, 2, 2);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** A head, drawn pale so it can be tinted with its class colour. Faces right. */
const drawBattleHead: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x101010);
  g.fillEllipse(width / 2, height / 2, width, height - 2);
  g.fillStyle(0xe6e6e6);
  g.fillEllipse(width / 2, height / 2, width - 2, height - 4);
  g.fillRect(width - 4, height / 2 - 1, 3, 2); // snout
  g.fillStyle(0xfff38a);
  g.fillRect(width / 2 + 1, height / 2 - 3, 2, 1);
  g.fillRect(width / 2 + 1, height / 2 + 2, 2, 1);
  g.generateTexture(key, width, height);
  g.destroy();
};

/** A soldier of the Order from above: helmet, shoulders, tabard colour, and what they carry. */
function battleEnemy(tabard: string, extra: 'sword' | 'axe' | 'torch'): PlaceholderDrawer {
  return (scene, key, width, height, palette) => {
    const g = scene.make.graphics({}, false);
    const cx = width / 2;
    g.fillStyle(0x111111);
    g.fillEllipse(cx, height / 2 + 1, width - 2, height - 4);
    g.fillStyle(color(tabard));
    g.fillEllipse(cx, height / 2 + 1, width - 4, height - 6);
    g.fillStyle(0x9a9a9a);
    g.fillCircle(cx, height / 2, 3); // helmet
    if (extra === 'sword') {
      g.fillStyle(0xd0d0d0);
      g.fillRect(1, 2, 1, height - 6);
    } else if (extra === 'axe') {
      g.fillStyle(0x6b4a2a);
      g.fillRect(1, 3, 1, height - 6);
      g.fillStyle(0xd0d0d0);
      g.fillRect(0, 2, 3, 3);
    } else {
      g.fillStyle(0x6b4a2a);
      g.fillRect(1, 5, 1, height - 7);
      g.fillStyle(color(palette.order.orange));
      g.fillRect(0, 2, 3, 3);
      g.fillStyle(color(palette.order.fire));
      g.fillRect(1, 1, 1, 2);
    }
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

function battleDot(fill: string, rim: string): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    g.fillStyle(color(rim));
    g.fillCircle(width / 2, height / 2, width / 2);
    g.fillStyle(color(fill));
    g.fillCircle(width / 2, height / 2, width / 2 - 1);
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** A Mist cloud from above: a pale, dithered blob, drawn white-ish so it can be tinted (acid clouds turn yellow-green). */
const drawMistCloud: PlaceholderDrawer = (scene, key, width, height) => {
  const g = scene.make.graphics({}, false);
  const rng = new Rng(23);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width / 2;
  g.fillStyle(0xffffff);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
      if (d >= 1) continue;
      // Solid in the middle, thinning out in scattered pixels towards the edge.
      if (d < 0.55 || rng.next() > (d - 0.55) / 0.45) g.fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture(key, width, height);
  g.destroy();
};

export const placeholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  battle_arena_water: arenaFloor('#0c3033', '#154347', '#c6e04a', 21),
  battle_arena_mud: arenaFloor('#262d1b', '#333a22', '#c6e04a', 22),
  battle_body: drawBattleBody,
  battle_head: drawBattleHead,
  battle_enemy_manAtArms: battleEnemy('#9e2323', 'sword'),
  battle_enemy_headhunter: battleEnemy('#5a1a1a', 'axe'),
  battle_enemy_torchbearer: battleEnemy('#6b5530', 'torch'),
  battle_stump: battleDot('#8a2a2a', '#3a0d0d'),
  battle_scar: battleDot('#2a2220', '#111111'),
  battle_mist_cloud: drawMistCloud,
  title_background: drawTitleBackground,
  hex_water: hexTile('#0e3b3f', '#1d5a5c', 6, 4, 11),
  hex_mud: hexTile('#2f3a22', '#443f26', 8, 2, 12),
  hex_rock: hexTile('#1a1c1d', '#2c2f30', 10, 1, 13),
  hex_shade: drawHexShade,
  hex_reachable: drawHexReachable,
  icon_lair: drawLairIcon,
  icon_encounter: drawEncounterIcon,
  icon_muck: drawMuckIcon,
  token_hydra: drawHydraToken,
};
