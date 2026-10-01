// Map HUD drawn above the map: turn, moves, body, resources, the Alert bar, the minimap and the End Turn button.
// Also shows short messages (collected, rested, Bones), the shrine panel, and the game-over panel when the hydra dies.

import * as Phaser from 'phaser';
import { color, getContext } from '../scenes/context';
import { requireRun, startNewRun } from '../scenes/RunController';
import type { RunController } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import type { Hex } from '../sim/hex';
import type { RunEvent } from '../sim/turn';
import { Button } from './Button';
import { onKeyDown } from './keys';
import { Minimap } from './Minimap';
import { ShrinePanel } from './ShrinePanel';

const BAR_HEIGHT = 16;
const ALERT_BAR_WIDTH = 100;
/** Where each resource counter starts in the top bar. */
const RESOURCE_X = { muck: 228, moisture: 296, bones: 390 } as const;
const TOAST_MS = 2400;

export class HudScene extends Phaser.Scene {
  private run!: RunController;
  private info!: Phaser.GameObjects.Text;
  private alertFill!: Phaser.GameObjects.Rectangle;
  private alertValue!: Phaser.GameObjects.Text;
  private endTurnButton!: Button;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private minimap!: Minimap;
  private shrinePanel!: ShrinePanel;
  private resourceTexts!: Record<'muck' | 'moisture' | 'bones', Phaser.GameObjects.Text>;
  /** Messages on screen now, top to bottom, so new ones go below. */
  private toasts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SceneKey.Hud);
  }

  create(): void {
    this.run = requireRun(this);
    const { palette, text } = getContext(this).data;
    const { width, height } = this.scale.gameSize;
    const mono = { fontFamily: 'monospace', fontSize: '10px' };

    // Top bar. Interactive, so taps on it don't reach the map below.
    this.add.rectangle(0, 0, width, BAR_HEIGHT, color(palette.underground.black), 0.85).setOrigin(0, 0).setInteractive();
    this.info = this.add.text(6, 3, '', { ...mono, color: '#d8e4d0' });
    // Resources: a small coloured square and the amount.
    const resourceColors = { muck: '#8a5a2a', moisture: '#3f9fb8', bones: '#d8d0c0' } as const;
    this.resourceTexts = Object.fromEntries(
      (['muck', 'moisture', 'bones'] as const).map((r) => {
        const x = RESOURCE_X[r];
        this.add.rectangle(x, 5, 6, 6, color(resourceColors[r])).setOrigin(0, 0);
        return [r, this.add.text(x + 9, 3, '', { ...mono, color: '#d8e4d0' })];
      }),
    ) as Record<'muck' | 'moisture' | 'bones', Phaser.GameObjects.Text>;

    const alertX = width - ALERT_BAR_WIDTH - 36;
    this.add.text(alertX - 4, 3, text.hud.alert, { ...mono, color: palette.order.gold }).setOrigin(1, 0);
    this.add.rectangle(alertX, 4, ALERT_BAR_WIDTH, 8, 0x000000).setOrigin(0, 0).setStrokeStyle(1, color(palette.order.gold));
    this.alertFill = this.add.rectangle(alertX + 1, 5, 0, 6, color(palette.order.orange)).setOrigin(0, 0);
    this.alertValue = this.add.text(alertX + ALERT_BAR_WIDTH + 4, 3, '', { ...mono, color: palette.order.gold });

    this.endTurnButton = new Button(
      this,
      width - 50,
      height - 20,
      text.hud.endTurn,
      { width: 88, height: 28, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#e8f0e0', fontSize: '12px' },
      () => this.run.endTurn(),
    );
    onKeyDown(this, (event) => {
      if (event.key === 'Enter') this.run.endTurn();
    });

    this.minimap = new Minimap(this, 4, height - 4, this.run, getContext(this).data, (h) => this.lookAt(h));
    this.shrinePanel = new ShrinePanel(this, getContext(this).data, () => this.run.acceptBlessing(), () => this.run.refuseBlessing());
    this.gameOverPanel = this.createGameOverPanel();
    this.toasts = [];

    const onChanged = (): void => this.refresh();
    const onEvents = (events: RunEvent[]): void => this.announce(events);
    this.run.on('changed', onChanged);
    this.run.on('events', onEvents);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run.off('changed', onChanged);
      this.run.off('events', onEvents);
    });
    // What happened just before this screen opened, e.g. the Bones from the battle that just ended.
    this.announce(this.run.lastEvents);
    this.run.lastEvents = [];
    this.refresh();
  }

  /** Short messages for things worth noticing. */
  private announce(events: readonly RunEvent[]): void {
    const { text, palette, shrines } = getContext(this).data;
    for (const event of events) {
      if (event.type === 'collected') this.toast(`+${event.amount} ${event.resource === 'muck' ? text.hud.muck : text.hud.moisture}`, '#d8e4d0');
      else if (event.type === 'battleWon' && event.bones > 0) this.toast(`+${event.bones} ${text.hud.bones}`, '#d8d0c0');
      else if (event.type === 'rested') this.toast(text.hud.rested, palette.underground.bioluminescence);
      else if (event.type === 'blessingAccepted') this.toast(shrines.blessings.find((b) => b.id === event.blessingId)?.name ?? event.blessingId, '#7fe0d6');
    }
  }

  private toast(message: string, textColor: string): void {
    const { width } = this.scale.gameSize;
    const label = this.add
      .text(width / 2, BAR_HEIGHT + 6 + this.toasts.length * 15, message, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: textColor,
        backgroundColor: '#05090acc',
        padding: { x: 5, y: 2 },
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5, 0)
      .setDepth(80);
    this.toasts.push(label);
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: TOAST_MS,
      duration: 500,
      onComplete: () => {
        this.toasts = this.toasts.filter((t) => t !== label);
        label.destroy();
      },
    });
  }

  private lookAt(h: Hex): void {
    const map = this.scene.get(SceneKey.Map) as unknown as { lookAt?: (h: Hex) => void };
    map.lookAt?.(h);
  }

  /** Shown when the hydra has died: the run is over, start a new one. */
  private createGameOverPanel(): Phaser.GameObjects.Container {
    const { palette, text } = getContext(this).data;
    const { width, height } = this.scale.gameSize;
    const panel = this.add.container(width / 2, height / 2);
    // Full-screen dimmer: also blocks taps on the map while the panel is open.
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setInteractive();
    const box = this.add.rectangle(0, 0, 300, 120, color(palette.underground.black)).setStrokeStyle(1, color(palette.order.bannerRed));
    const title = this.add
      .text(0, -32, text.gameOver.title, { fontFamily: 'Georgia, serif', fontSize: '16px', color: palette.order.fire })
      .setOrigin(0.5);
    const body = this.add
      .text(0, -6, text.gameOver.body, { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#e8e0d0', align: 'center', wordWrap: { width: 270 } })
      .setOrigin(0.5);
    const again = new Button(
      this,
      0,
      32,
      text.gameOver.newRunButton,
      { width: 140, height: 26, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' },
      () => {
        // A fresh random seed; Math.random is fine outside sim/.
        startNewRun(this, Math.floor(Math.random() * 1_000_000));
        this.scene.stop();
        this.scene.start(SceneKey.Map);
      },
    );
    panel.add([dim, box, title, body, again]);
    panel.setDepth(100).setVisible(false);
    return panel;
  }

  private refresh(): void {
    const { text, balance } = getContext(this).data;
    const { turn, hydra, resources, alert, pendingBattle, pendingShrine, over, map } = this.run.state;
    this.info.setText(
      `${text.hud.turn} ${turn}  ${text.hud.moves} ${hydra.movementLeft}/${hydra.movementPerTurn}  ` +
        `${text.battle.body} ${Math.ceil(hydra.bodyHp)}/${hydra.bodyMaxHp}`,
    );
    this.resourceTexts.muck.setText(`${text.hud.muck} ${resources.muck}`);
    this.resourceTexts.moisture.setText(`${text.hud.moisture} ${resources.moisture}`);
    this.resourceTexts.bones.setText(`${text.hud.bones} ${resources.bones}`);
    const shrine = pendingShrine ? map.tiles.get(`${pendingShrine.q},${pendingShrine.r}`)?.object : null;
    this.shrinePanel.show(shrine?.kind === 'shrine' ? shrine.blessingId : null);
    const share = (alert - balance.alert.min) / (balance.alert.max - balance.alert.min);
    this.alertFill.setSize(Math.round((ALERT_BAR_WIDTH - 2) * share), 6);
    this.alertValue.setText(String(Math.floor(alert)));
    this.endTurnButton.setEnabled(pendingBattle === null && pendingShrine === null && !over);
    this.gameOverPanel.setVisible(over);
    this.minimap.redraw();
  }
}
