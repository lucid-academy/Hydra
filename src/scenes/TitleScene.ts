import * as Phaser from 'phaser';
import { color, getContext } from './context';
import { SceneKey } from './sceneKeys';
import { markReady } from '../testHooks';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Title);
  }

  create(): void {
    const { data } = getContext(this);
    const { palette, text } = data;
    const { width, height } = this.scale.gameSize;

    this.add.image(0, 0, 'title_background').setOrigin(0, 0);

    this.add
      .text(width / 2, 70, text.title.gameTitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: palette.underground.bioluminescence,
        stroke: palette.underground.black,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 116, text.title.subtitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        fontStyle: 'italic',
        color: palette.mist,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height - 40, text.title.pressToStart, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: palette.order.gold,
        backgroundColor: palette.underground.black,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    const start = (): void => {
      this.scene.start(SceneKey.Map);
    };
    this.input.once('pointerup', start);
    this.input.keyboard?.once('keydown', start);

    this.cameras.main.setBackgroundColor(color(palette.underground.black));
    markReady(SceneKey.Title);
  }
}
