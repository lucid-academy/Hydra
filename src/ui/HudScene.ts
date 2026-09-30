// Map HUD drawn above the map: turn, moves, Muck, the Alert bar and the End Turn button.
// Also shows the temporary battle placeholder until battles exist (M1 part B).

import * as Phaser from 'phaser';
import { color, getContext } from '../scenes/context';
import { requireRun } from '../scenes/RunController';
import type { RunController } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import { Button } from './Button';

const BAR_HEIGHT = 16;
const ALERT_BAR_WIDTH = 100;

export class HudScene extends Phaser.Scene {
  private run!: RunController;
  private info!: Phaser.GameObjects.Text;
  private alertFill!: Phaser.GameObjects.Rectangle;
  private alertValue!: Phaser.GameObjects.Text;
  private endTurnButton!: Button;
  private battlePanel!: Phaser.GameObjects.Container;

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
    this.input.keyboard?.on('keydown-ENTER', () => this.run.endTurn());

    this.battlePanel = this.createBattlePanel();

    const onChanged = (): void => this.refresh();
    this.run.on('changed', onChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.run.off('changed', onChanged));
    this.refresh();
  }

  private createBattlePanel(): Phaser.GameObjects.Container {
    const { palette, text } = getContext(this).data;
    const { width, height } = this.scale.gameSize;
    const panel = this.add.container(width / 2, height / 2);
    // Full-screen dimmer: also blocks taps on the map while the panel is open.
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setInteractive();
    const box = this.add.rectangle(0, 0, 300, 130, color(palette.underground.black)).setStrokeStyle(1, color(palette.order.bannerRed));
    const message = this.add
      .text(0, -22, text.battlePlaceholder.message, {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#e8e0d0',
        align: 'center',
        wordWrap: { width: 270 },
      })
      .setOrigin(0.5);
    const win = new Button(
      this,
      0,
      44,
      text.battlePlaceholder.winButton,
      { width: 140, height: 26, fill: color(palette.order.bannerRed), border: color(palette.order.gold), textColor: '#ffffff', fontSize: '11px' },
      () => this.run.winBattle(),
    );
    panel.add([dim, box, message, win]);
    panel.setDepth(100).setVisible(false);
    return panel;
  }

  private refresh(): void {
    const { text, balance } = getContext(this).data;
    const { turn, hydra, resources, alert, pendingBattle } = this.run.state;
    this.info.setText(
      `${text.hud.turn} ${turn}   ${text.hud.moves} ${hydra.movementLeft}/${balance.map.movementPointsPerTurn}   ${text.hud.muck} ${resources.muck}`,
    );
    const share = (alert - balance.alert.min) / (balance.alert.max - balance.alert.min);
    this.alertFill.setSize(Math.round((ALERT_BAR_WIDTH - 2) * share), 6);
    this.alertValue.setText(String(Math.floor(alert)));
    this.endTurnButton.setEnabled(pendingBattle === null);
    this.battlePanel.setVisible(pendingBattle !== null);
  }
}
