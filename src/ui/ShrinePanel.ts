// Panel shown while the hydra stands at a shrine of the Great Serpent: the blessing's name, its words,
// what it would change (good for the hydra in green, bad in orange), and Accept or Refuse.

import * as Phaser from 'phaser';
import type { GameData } from '../data';
import type { BLESSING_EFFECTS } from '../data/schemas';
import { color } from '../scenes/context';
import { Button } from './Button';

type EffectName = (typeof BLESSING_EFFECTS)[number];

const WIDTH = 360;
const HEIGHT = 176;

export class ShrinePanel {
  private readonly container: Phaser.GameObjects.Container;
  private shownFor: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly data: GameData,
    private readonly onAccept: () => void,
    private readonly onRefuse: () => void,
  ) {
    const { width, height } = scene.scale.gameSize;
    this.container = scene.add.container(width / 2, height / 2).setDepth(90).setVisible(false);
  }

  /** Shows the panel for this blessing, or hides it (null). */
  show(blessingId: string | null): void {
    if (blessingId !== this.shownFor) {
      this.shownFor = blessingId;
      if (blessingId) this.build(blessingId);
    }
    this.container.setVisible(blessingId !== null);
  }

  private build(blessingId: string): void {
    const { palette, text, shrines } = this.data;
    const blessing = shrines.blessings.find((b) => b.id === blessingId);
    if (!blessing) throw new Error(`Unknown blessing "${blessingId}"`);
    const { width, height } = this.scene.scale.gameSize;
    this.container.removeAll(true);

    // Full-screen dimmer: also stops taps from reaching the map while the panel is open.
    const dim = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.55).setInteractive();
    const box = this.scene.add.rectangle(0, 0, WIDTH, HEIGHT, color(palette.underground.black), 0.96).setStrokeStyle(1, 0x7fe0d6);
    const top = -HEIGHT / 2;
    const title = this.scene.add.text(0, top + 8, text.shrine.title, { fontFamily: 'Georgia, serif', fontSize: '10px', color: palette.order.gold }).setOrigin(0.5, 0);
    const name = this.scene.add.text(0, top + 22, blessing.name, { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8e0d0' }).setOrigin(0.5, 0);
    const words = this.scene.add
      .text(0, top + 44, blessing.text, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#c8c0b0', align: 'center', wordWrap: { width: WIDTH - 30 } })
      .setOrigin(0.5, 0);

    // What it changes, side by side and centred.
    const effects = (Object.entries(blessing.effects) as Array<[EffectName, number]>).map(([effect, n]) => {
      const signed = n > 0 ? `+${n}` : String(n);
      const good = effect === 'alert' ? n < 0 : n > 0;
      return this.scene.add
        .text(0, words.y + words.height + 14, text.shrine.effects[effect].replace('{n}', signed), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: good ? palette.underground.bioluminescence : palette.order.orange,
        })
        .setOrigin(0, 0);
    });
    const gap = 14;
    let x = -(effects.reduce((sum, t) => sum + t.width, 0) + gap * (effects.length - 1)) / 2;
    for (const t of effects) {
      t.setX(Math.round(x));
      x += t.width + gap;
    }

    const style = { width: 110, height: 22, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' };
    const accept = new Button(this.scene, -62, HEIGHT / 2 - 20, text.shrine.acceptButton, style, () => this.onAccept());
    const refuse = new Button(this.scene, 62, HEIGHT / 2 - 20, text.shrine.refuseButton, { ...style, fill: 0x1a1f20, border: 0x5a6a6a }, () => this.onRefuse());
    this.container.add([dim, box, title, name, words, ...effects, accept, refuse]);
  }
}
