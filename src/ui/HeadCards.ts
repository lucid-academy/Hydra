// Row of head cards along the bottom of the battle screen: name, class and HP for each head.
// Tapping a card selects that head (same as keys 1–9).

import * as Phaser from 'phaser';
import type { BattleHead } from '../sim/battle';
import { pinToScreen } from './pinToScreen';

const CARD_HEIGHT = 40;
const GAP = 2;

export interface HeadCardsStyle {
  x: number;
  y: number;
  width: number;
  classColors: Readonly<Record<string, string>>;
  classNames: Readonly<Record<string, string>>;
  maxCards: number;
}

export class HeadCards {
  private readonly container: Phaser.GameObjects.Container;
  private readonly style: HeadCardsStyle;
  private shownKey = '';

  constructor(
    private readonly scene: Phaser.Scene,
    style: HeadCardsStyle,
    private readonly onSelect: (headId: string) => void,
  ) {
    this.style = style;
    this.container = pinToScreen(scene.add.container(style.x, style.y)).setDepth(50);
  }

  /** Redraws only when heads, HP or selection changed. */
  update(heads: readonly BattleHead[], selectedId: string | null): void {
    const key = heads.map((h) => `${h.id}:${Math.ceil(h.hp)}`).join('|') + `#${selectedId}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.container.removeAll(true);

    const cardWidth = Math.floor((this.style.width - GAP * (this.style.maxCards - 1)) / this.style.maxCards);
    heads.forEach((head, i) => {
      const x = i * (cardWidth + GAP);
      const selected = head.id === selectedId;
      const classColor = Phaser.Display.Color.HexStringToColor(this.style.classColors[head.classId] ?? '#cccccc').color;

      const bg = this.scene.add
        .rectangle(x, 0, cardWidth, CARD_HEIGHT, selected ? 0x2a3a1a : 0x0b1112, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, selected ? 0xc6e04a : 0x2c3a3a)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this.onSelect(head.id));

      const stripe = this.scene.add.rectangle(x, 0, 3, CARD_HEIGHT, classColor).setOrigin(0, 0);
      // Fixed width: long names are cut off at the card's edge instead of spilling onto the next card.
      const textWidth = cardWidth - 6;
      const name = this.scene.add.text(x + 5, 2, `${i + 1} ${head.name}`, { fontFamily: 'monospace', fontSize: '9px', color: '#e8f0e0', fixedWidth: textWidth });
      const cls = this.scene.add.text(x + 5, 13, this.style.classNames[head.classId] ?? head.classId, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#9fb0a0',
        fixedWidth: textWidth,
      });
      const barWidth = cardWidth - 9;
      const share = Math.max(0, head.hp / head.maxHp);
      const barBack = this.scene.add.rectangle(x + 5, 28, barWidth, 5, 0x000000).setOrigin(0, 0);
      const barFill = this.scene.add
        .rectangle(x + 5, 28, Math.max(0, Math.round(barWidth * share)), 5, share > 0.35 ? 0x5f9a4a : 0xc0392b)
        .setOrigin(0, 0);
      this.container.add([bg, stripe, name, cls, barBack, barFill]);
    });
    pinToScreen(this.container);
  }
}
