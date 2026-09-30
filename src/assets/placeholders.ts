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

  // Hill with the Order's castle on the right, windows lit by the Eternal Flame.
  g.fillStyle(color('#0b0f10'));
  g.fillTriangle(width * 0.45, height * 0.62, width * 0.78, height * 0.3, width * 1.1, height * 0.62);
  const castleX = Math.round(width * 0.72);
  const castleY = Math.round(height * 0.3);
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

export const placeholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  title_background: drawTitleBackground,
};
