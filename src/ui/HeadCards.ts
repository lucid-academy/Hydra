// Row of head cards along the bottom of the battle screen: name, class, HP and how charged its attack is
// (the thin bar fills up and turns bright when the next attack is ready, like weapons in FTL).
// Tapping a card selects that head (same as keys 1–9).

import * as Phaser from 'phaser';
import { pinToScreen } from './pinToScreen';

const CARD_HEIGHT = 40;
const GAP = 2;
const HP_COLOR = 0x5f9a4a;
const HP_LOW_COLOR = 0xc0392b;
const CHARGE_COLOR = 0x8a7a45;
const CHARGE_READY_COLOR = 0xffe27a;

export interface HeadCardsStyle {
  x: number;
  y: number;
  width: number;
  classColors: Readonly<Record<string, string>>;
  classNames: Readonly<Record<string, string>>;
  maxCards: number;
}

/** What a card shows about one head. */
export interface HeadCardInfo {
  id: string;
  name: string;
  classId: string;
  hp: number;
  maxHp: number;
  /** 0 = just attacked, 1 = the next attack is ready. */
  charge: number;
}

interface CardBars {
  hp: Phaser.GameObjects.Rectangle;
  charge: Phaser.GameObjects.Rectangle;
}

export class HeadCards {
  private readonly container: Phaser.GameObjects.Container;
  private readonly style: HeadCardsStyle;
  private readonly cardWidth: number;
  private bars = new Map<string, CardBars>();
  /** Which heads (and which selection) the cards were built for; they are rebuilt only when this changes. */
  private builtFor = '';

  constructor(
    private readonly scene: Phaser.Scene,
    style: HeadCardsStyle,
    private readonly onSelect: (headId: string) => void,
  ) {
    this.style = style;
    this.cardWidth = Math.floor((style.width - GAP * (style.maxCards - 1)) / style.maxCards);
    this.container = pinToScreen(scene.add.container(style.x, style.y)).setDepth(150);
  }

  update(heads: readonly HeadCardInfo[], selectedId: string | null): void {
    const layout = heads.map((h) => h.id).join('|') + `#${selectedId}`;
    if (layout !== this.builtFor) {
      this.builtFor = layout;
      this.build(heads, selectedId);
    }
    const barWidth = this.cardWidth - 9;
    for (const head of heads) {
      const bars = this.bars.get(head.id);
      if (!bars) continue;
      const hpShare = Math.max(0, head.hp / head.maxHp);
      bars.hp.setSize(Math.round(barWidth * hpShare), 5).setFillStyle(hpShare > 0.35 ? HP_COLOR : HP_LOW_COLOR);
      const charge = Math.max(0, Math.min(1, head.charge));
      bars.charge.setSize(Math.round(barWidth * charge), 2).setFillStyle(charge >= 1 ? CHARGE_READY_COLOR : CHARGE_COLOR);
    }
  }

  private build(heads: readonly HeadCardInfo[], selectedId: string | null): void {
    this.container.removeAll(true);
    this.bars.clear();
    const barWidth = this.cardWidth - 9;
    // Fixed width: long names are cut off at the card's edge instead of spilling onto the next card.
    const textWidth = this.cardWidth - 6;
    heads.forEach((head, i) => {
      const x = i * (this.cardWidth + GAP);
      const selected = head.id === selectedId;
      const classColor = Phaser.Display.Color.HexStringToColor(this.style.classColors[head.classId] ?? '#cccccc').color;

      const bg = this.scene.add
        .rectangle(x, 0, this.cardWidth, CARD_HEIGHT, selected ? 0x2a3a1a : 0x0b1112, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, selected ? 0xc6e04a : 0x2c3a3a)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this.onSelect(head.id));

      const stripe = this.scene.add.rectangle(x, 0, 3, CARD_HEIGHT, classColor).setOrigin(0, 0);
      const name = this.scene.add.text(x + 5, 2, `${i + 1} ${head.name}`, { fontFamily: 'monospace', fontSize: '9px', color: '#e8f0e0', fixedWidth: textWidth });
      const cls = this.scene.add.text(x + 5, 13, this.style.classNames[head.classId] ?? head.classId, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#9fb0a0',
        fixedWidth: textWidth,
      });
      const hpBack = this.scene.add.rectangle(x + 5, 25, barWidth, 5, 0x000000).setOrigin(0, 0);
      const hp = this.scene.add.rectangle(x + 5, 25, barWidth, 5, HP_COLOR).setOrigin(0, 0);
      const chargeBack = this.scene.add.rectangle(x + 5, 33, barWidth, 2, 0x000000).setOrigin(0, 0);
      const charge = this.scene.add.rectangle(x + 5, 33, 0, 2, CHARGE_COLOR).setOrigin(0, 0);
      this.container.add([bg, stripe, name, cls, hpBack, hp, chargeBack, charge]);
      this.bars.set(head.id, { hp, charge });
    });
    pinToScreen(this.container);
  }
}
