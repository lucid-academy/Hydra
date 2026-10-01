// A small map of everything the hydra knows, in the bottom-left corner of the map screen.
// One dot per hex, coloured by its biome and ground; brighter where the hydra sees now.
// Tapping it moves the view to that part of the map.

import * as Phaser from 'phaser';
import type { GameData } from '../data';
import { color } from '../scenes/context';
import type { RunController } from '../scenes/RunController';
import { hexRound } from '../sim/hex';
import type { Hex } from '../sim/hex';

/** Size of one hex on the minimap, in screen pixels: across, and from row to row. */
const DOT = { across: 3, down: 2.5 };
const PADDING = 4;

export class Minimap {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly center: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    left: number,
    bottom: number,
    private readonly run: RunController,
    private readonly data: GameData,
    onLookAt: (h: Hex) => void,
  ) {
    const radius = run.state.map.radius;
    const width = Math.ceil((radius * 2 + 1) * DOT.across) + PADDING * 2;
    const height = Math.ceil((radius * 2 + 1) * DOT.down) + PADDING * 2;
    const top = bottom - height;
    this.center = { x: left + width / 2, y: top + height / 2 };
    const panel = scene.add
      .rectangle(left, top, width, height, color(data.palette.underground.black), 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x2c3a3a)
      .setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const r = (pointer.y - this.center.y) / DOT.down;
      const q = (pointer.x - this.center.x) / DOT.across - r / 2;
      onLookAt(hexRound(q, r));
    });
    this.graphics = scene.add.graphics();
  }

  redraw(): void {
    const g = this.graphics;
    g.clear();
    const { map, visibility, hydra } = this.run.state;
    const dot = (h: Hex, fill: number, alpha = 1, size = 2) => {
      g.fillStyle(fill, alpha);
      g.fillRect(Math.round(this.center.x + (h.q + h.r / 2) * DOT.across - size / 2), Math.round(this.center.y + h.r * DOT.down - size / 2), size + 1, size);
    };
    for (const [key, state] of visibility) {
      const tile = map.tiles.get(key);
      if (!tile) continue;
      const colors = this.data.biomes.biomes[tile.biome]?.colors;
      if (!colors) continue;
      const fill = tile.terrain === 'rock' ? colors.rock : tile.terrain === 'water' ? colors.water : colors.ground;
      dot(tile.hex, color(fill), state === 'visible' ? 1 : 0.6);
    }
    // Things worth finding again: the lair, shrines, passages, the Order's people.
    const { palette } = this.data;
    for (const key of visibility.keys()) {
      const tile = map.tiles.get(key);
      const kind = tile?.object?.kind;
      if (!tile || !kind) continue;
      if (kind === 'lair') dot(tile.hex, color(palette.underground.bioluminescence), 1, 3);
      else if (kind === 'shrine') dot(tile.hex, 0x7fe0d6, 1, 2);
      else if (kind === 'passage') dot(tile.hex, 0xd0e4dc, 1, 2);
      else if (kind === 'encounter') dot(tile.hex, color(palette.order.bannerRed), 1, 2);
    }
    dot(hydra.position, 0xffffff, 1, 3);
  }
}
