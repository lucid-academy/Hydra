// `?debug=1`: a small panel with the seed and simulation state, drawn above every other scene.
// Turn, ticks and visibility show "-" until the systems that own them exist (M1).

import * as Phaser from 'phaser';
import { getContext } from '../scenes/context';
import { SceneKey } from '../scenes/sceneKeys';

export class DebugOverlayScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.DebugOverlay);
  }

  create(): void {
    this.label = this.add.text(4, 4, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8f0e0',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 3 },
    });
    this.refresh();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
  }

  private refresh(): void {
    const { seed } = getContext(this);
    const active = this.scene.manager
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((key) => key !== SceneKey.DebugOverlay);
    this.label.setText(
      [
        `seed: ${seed}`,
        `scene: ${active.join(', ') || '-'}`,
        'turn: -   ticks: -',
        'visibility: -',
        `fps: ${Math.round(this.game.loop.actualFps)}`,
      ].join('\n'),
    );
    this.scene.bringToTop();
  }
}
