// A simple tappable text button, sized for fingers as well as the mouse.

import * as Phaser from 'phaser';

export interface ButtonStyle {
  width: number;
  height: number;
  fill: number;
  border: number;
  textColor: string;
  fontSize?: string;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: ButtonStyle, onPress: () => void) {
    super(scene, x, y);
    this.background = scene.add
      .rectangle(0, 0, style.width, style.height, style.fill)
      .setStrokeStyle(1, style.border)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(0, 0, text, { fontFamily: 'monospace', fontSize: style.fontSize ?? '11px', color: style.textColor })
      .setOrigin(0.5);
    this.add([this.background, this.label]);
    this.setSize(style.width, style.height);

    this.background.on('pointerdown', () => this.background.setAlpha(0.7));
    this.background.on('pointerout', () => this.background.setAlpha(1));
    this.background.on('pointerup', () => {
      this.background.setAlpha(1);
      if (this.enabled) onPress();
    });
    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.4);
    return this;
  }
}
