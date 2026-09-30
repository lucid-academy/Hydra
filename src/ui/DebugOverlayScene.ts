// `?debug=1`: a small panel with the seed and simulation state, drawn above every other scene.
// Ticks show "-" outside battles; turn and visibility show "-" outside a run.

import * as Phaser from 'phaser';
import { getContext } from '../scenes/context';
import type { BattleScene } from '../scenes/BattleScene';
import { getRun } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';

export class DebugOverlayScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.DebugOverlay);
  }

  create(): void {
    // Below the HUD's top bar.
    this.label = this.add.text(4, 20, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8f0e0',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 3 },
    });
    this.refresh();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
  }

  private battleTick(): number | null {
    return this.scene.isActive(SceneKey.Battle) ? (this.scene.get(SceneKey.Battle) as BattleScene).tick : null;
  }

  private refresh(): void {
    const run = getRun(this)?.state;
    const seed = run?.seed ?? getContext(this).seed;
    let visibility = '-';
    let turn = '-';
    if (run) {
      const states = [...run.visibility.values()];
      const visible = states.filter((s) => s === 'visible').length;
      visibility = `${visible} visible, ${states.length - visible} remembered, ${run.map.tiles.size - states.length} unexplored`;
      turn = `${run.turn}  alert: ${run.alert.toFixed(1)}`;
    }
    const active = this.scene.manager
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((key) => key !== SceneKey.DebugOverlay);
    this.label.setText(
      [
        `seed: ${seed}`,
        `scene: ${active.join(', ') || '-'}`,
        `turn: ${turn}   ticks: ${this.battleTick() ?? '-'}`,
        `visibility: ${visibility}`,
        `fps: ${Math.round(this.game.loop.actualFps)}`,
      ].join('\n'),
    );
    this.scene.bringToTop();
  }
}
