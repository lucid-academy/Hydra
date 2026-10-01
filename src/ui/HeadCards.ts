// Row of head cards along the bottom of the battle screen: name, class, HP and how charged its attack is
// (the thin bar fills up and turns bright when the next attack is ready, like weapons in FTL).
// Tapping a card selects that head (same as keys 1–9); with Ctrl or Shift held it is added to the selected heads.

import * as Phaser from 'phaser';
import { wantsToAdd } from './keys';

const CARD_HEIGHT = 40;
/** Cards are drawn above the bottom panel. */
const DEPTH = 150;
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

interface Card {
  bg: Phaser.GameObjects.Rectangle;
  hp: Phaser.GameObjects.Rectangle;
  charge: Phaser.GameObjects.Rectangle;
}

/**
 * The cards are plain objects on the screen, not inside a Phaser container: interactive objects in a container
 * that is rebuilt were sometimes not registered for taps. They are rebuilt only when the heads change;
 * picking a head just recolours its card.
 */
export class HeadCards {
  private readonly style: HeadCardsStyle;
  private readonly cardWidth: number;
  private cards = new Map<string, Card>();
  private objects: Phaser.GameObjects.GameObject[] = [];
  /** Which heads the cards were built for. */
  private builtFor = '';

  constructor(
    private readonly scene: Phaser.Scene,
    style: HeadCardsStyle,
    private readonly onSelect: (headId: string, add: boolean) => void,
  ) {
    this.style = style;
    this.cardWidth = Math.floor((style.width - GAP * (style.maxCards - 1)) / style.maxCards);
  }

  update(heads: readonly HeadCardInfo[], selected: ReadonlySet<string>): void {
    const layout = heads.map((h) => h.id).join('|');
    if (layout !== this.builtFor) {
      this.builtFor = layout;
      this.build(heads);
    }
    const barWidth = this.cardWidth - 9;
    for (const head of heads) {
      const card = this.cards.get(head.id);
      if (!card) continue;
      const picked = selected.has(head.id);
      card.bg.setFillStyle(picked ? 0x2a3a1a : 0x0b1112, 0.95).setStrokeStyle(1, picked ? 0xc6e04a : 0x2c3a3a);
      const hpShare = Math.max(0, head.hp / head.maxHp);
      card.hp.setSize(Math.round(barWidth * hpShare), 5).setFillStyle(hpShare > 0.35 ? HP_COLOR : HP_LOW_COLOR);
      const charge = Math.max(0, Math.min(1, head.charge));
      card.charge.setSize(Math.round(barWidth * charge), 2).setFillStyle(charge >= 1 ? CHARGE_READY_COLOR : CHARGE_COLOR);
    }
  }

  private build(heads: readonly HeadCardInfo[]): void {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.cards.clear();
    const barWidth = this.cardWidth - 9;
    // Fixed width: long names are cut off at the card's edge instead of spilling onto the next card.
    const textWidth = this.cardWidth - 6;
    const top = this.style.y;
    heads.forEach((head, i) => {
      const x = this.style.x + i * (this.cardWidth + GAP);
      const classColor = Phaser.Display.Color.HexStringToColor(this.style.classColors[head.classId] ?? '#cccccc').color;
      const bg = this.scene.add.rectangle(x, top, this.cardWidth, CARD_HEIGHT, 0x0b1112, 0.95).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      bg.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onSelect(head.id, wantsToAdd(pointer)));
      const stripe = this.scene.add.rectangle(x, top, 3, CARD_HEIGHT, classColor).setOrigin(0, 0);
      const name = this.scene.add.text(x + 5, top + 2, `${i + 1} ${head.name}`, { fontFamily: 'monospace', fontSize: '9px', color: '#e8f0e0', fixedWidth: textWidth });
      const cls = this.scene.add.text(x + 5, top + 13, this.style.classNames[head.classId] ?? head.classId, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#9fb0a0',
        fixedWidth: textWidth,
      });
      const hpBack = this.scene.add.rectangle(x + 5, top + 25, barWidth, 5, 0x000000).setOrigin(0, 0);
      const hp = this.scene.add.rectangle(x + 5, top + 25, barWidth, 5, HP_COLOR).setOrigin(0, 0);
      const chargeBack = this.scene.add.rectangle(x + 5, top + 33, barWidth, 2, 0x000000).setOrigin(0, 0);
      const charge = this.scene.add.rectangle(x + 5, top + 33, 0, 2, CHARGE_COLOR).setOrigin(0, 0);
      const parts = [bg, stripe, name, cls, hpBack, hp, chargeBack, charge];
      for (const part of parts) part.setScrollFactor(0).setDepth(DEPTH);
      this.objects.push(...parts);
      this.cards.set(head.id, { bg, hp, charge });
    });
  }
}
