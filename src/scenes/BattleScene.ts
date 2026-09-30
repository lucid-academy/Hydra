// Battle screen: runs the battle simulation in fixed ticks and draws it.
// The battle starts paused. Space / the Pause button stops and starts the ticks; orders can be given while paused.
// Controls: tap a head (or its card, or 1–9) to select it, then tap an enemy to make it attack.
// With no head selected, tap the ground to move the body (right-click always moves it).

import * as Phaser from 'phaser';
import { applyCommand, battleResult, createBattle, distance, fromAngle, isAcid, stepBattle, stumpPosition } from '../sim/battle';
import type { BattleEvent, BattleState, Vec } from '../sim/battle';
import { hexKey } from '../sim/hex';
import { exposeBattleSummary, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import { HeadCards } from '../ui/HeadCards';
import { onKeyDown } from '../ui/keys';
import { pinToScreen } from '../ui/pinToScreen';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';

/** The arena starts this far below the top of the screen (room for the top bar). */
const ARENA_TOP = 16;
/** How far from an enemy's edge a tap still counts as tapping it (arena pixels). Generous, for fingers. */
const TAP_SLOP = 12;
/** A tap this close to a head's centre selects it. */
const HEAD_TAP_RADIUS = 16;
const SPEEDS = [1, 0.5] as const;
const NECK_SEGMENTS = 9;
const DEFAULT_TEST_GROUP = 'burningDetail';
/** After a combo the battle runs this many times slower for a moment, so the player can see it land. */
const COMBO_SLOWDOWN = 0.3;
const COMBO_SLOWDOWN_MS = 350;

export class BattleScene extends Phaser.Scene {
  private run!: RunController;
  private battle!: BattleState;
  private paused = true;
  /** False until the player starts the battle for the first time; the how-to-play hint shows until then. */
  private started = false;
  private speedIndex = 0;
  private accumulator = 0;
  private selectedHeadId: string | null = null;
  private finished = false;
  /** Real milliseconds of combo slow-down left. */
  private slowdownLeft = 0;
  /** Ids of combos that fired in this battle, in order (for the smoke test). */
  private combosSeen: string[] = [];

  private necks!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private body!: Phaser.GameObjects.Image;
  private headSprites = new Map<string, Phaser.GameObjects.Image>();
  private enemySprites = new Map<number, Phaser.GameObjects.Image>();
  private stumpSprites = new Map<number, Phaser.GameObjects.Image>();
  private cloudSprites = new Map<number, Phaser.GameObjects.Image>();
  private cards!: HeadCards;
  private bodyHpText!: Phaser.GameObjects.Text;
  private pausedText!: Phaser.GameObjects.Text;
  private pausedFrame!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private pauseButton!: Button;
  private speedButton!: Button;

  constructor() {
    super(SceneKey.Battle);
  }

  /** Current simulation tick, for the debug overlay. */
  get tick(): number | null {
    return this.battle && !this.finished ? this.battle.tick : null;
  }

  create(): void {
    const { data, params } = getContext(this);
    let run = getRun(this);
    if (!run || (!run.state.pendingBattle && params.scene === SceneKey.Battle)) {
      // ?scene=battle: a test battle without walking to an encounter.
      run = run ?? startNewRun(this);
      run.startTestBattle(params.group ?? DEFAULT_TEST_GROUP, params.hp);
    }
    this.run = run;
    const setup = run.battleSetup();
    if (!setup) {
      this.scene.start(SceneKey.Map);
      return;
    }

    this.battle = createBattle(setup, run.battleRules);
    this.combosSeen = [];
    // Every battle starts paused: time to look around and give the first orders.
    this.paused = true;
    this.started = false;
    this.speedIndex = 0;
    this.accumulator = 0;
    this.selectedHeadId = null;
    this.finished = false;
    this.slowdownLeft = 0;
    this.cloudSprites = new Map();
    this.headSprites = new Map();
    this.enemySprites = new Map();
    this.stumpSprites = new Map();

    const { palette } = data;
    const cam = this.cameras.main;
    cam.setBackgroundColor(color(palette.underground.black));
    cam.setScroll(0, -ARENA_TOP);

    const pending = run.state.pendingBattle!;
    const terrain = run.state.map.tiles.get(hexKey(pending.at))?.terrain ?? 'mud';
    this.add.image(0, 0, terrain === 'water' ? 'battle_arena_water' : 'battle_arena_mud').setOrigin(0, 0);

    this.necks = this.add.graphics().setDepth(2);
    this.body = this.add.image(0, 0, 'battle_body').setDepth(3);
    this.overlay = this.add.graphics().setDepth(20);

    this.createUi();
    this.setUpInput();
    this.syncSprites();
    this.draw();
    exposeBattleSummary(() => ({
      tick: this.battle.tick,
      outcome: this.battle.outcome,
      paused: this.paused,
      enemies: this.battle.enemies.map((e) => ({ id: e.id, typeId: e.typeId, x: e.pos.x, y: e.pos.y + ARENA_TOP })),
      heads: this.battle.heads.map((h) => ({ id: h.id, classId: h.classId, x: h.pos.x, y: h.pos.y + ARENA_TOP })),
      clouds: this.battle.clouds.length,
      combos: [...this.combosSeen],
    }));
    markReady(SceneKey.Battle);
  }

  // ------------------------------------------------------------ UI

  private createUi(): void {
    const { palette, text, heads } = getContext(this).data;
    const { width, height } = this.scale.gameSize;

    this.add.rectangle(0, 0, width, ARENA_TOP, color(palette.underground.black), 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(40).setInteractive();
    this.bodyHpText = this.add
      .text(6, 3, '', { fontFamily: 'monospace', fontSize: '10px', color: '#d8e4d0' })
      .setScrollFactor(0)
      .setDepth(41);
    // Paused = the word in the top bar plus a gold frame around the arena, so nothing on the battlefield is covered.
    const { arenaHeight } = this.run.battleRules;
    this.pausedText = this.add
      .text(width / 2, 3, text.battle.paused, { fontFamily: 'monospace', fontSize: '10px', color: palette.order.gold })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(41);
    this.pausedFrame = this.add.graphics().setScrollFactor(0).setDepth(39);
    this.pausedFrame.lineStyle(2, color(palette.order.gold), 0.9);
    this.pausedFrame.strokeRect(1, ARENA_TOP + 1, width - 2, arenaHeight - 2);

    // How to play, shown until the battle is started. It sits between the hydra and the top edge,
    // where nobody stands at the start (the Order begins on a ring near the edges).
    this.hintText = this.add
      .text(width / 2, ARENA_TOP + 58, text.battle.hintSelectHead, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#e8f0e0',
        backgroundColor: '#000000aa',
        padding: { x: 5, y: 2 },
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(41);

    const panelY = ARENA_TOP + arenaHeight;
    this.add.rectangle(0, panelY, width, height - panelY, color(palette.underground.black)).setOrigin(0, 0).setScrollFactor(0).setDepth(45).setInteractive();

    const buttonWidth = 70;
    this.cards = new HeadCards(
      this,
      {
        x: 2,
        y: panelY + 2,
        width: width - buttonWidth - 8,
        maxCards: this.run.battleRules.maxHeads,
        classColors: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.color])),
        classNames: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.displayName])),
      },
      (headId) => this.selectHead(headId),
    );

    const buttonStyle = {
      width: buttonWidth,
      height: 20,
      fill: color(palette.underground.deepTeal),
      border: color(palette.underground.bioluminescence),
      textColor: '#e8f0e0',
      fontSize: '10px',
    };
    this.pauseButton = new Button(this, width - buttonWidth / 2 - 3, panelY + 12, text.battle.pauseButton, buttonStyle, () => this.togglePause());
    this.speedButton = new Button(this, width - buttonWidth / 2 - 3, panelY + 33, '', buttonStyle, () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.updateButtons();
    });
    for (const b of [this.pauseButton, this.speedButton]) pinToScreen(b).setDepth(50);
    this.updateButtons();
  }

  private updateButtons(): void {
    const { text } = getContext(this).data;
    this.pauseButton.setLabel(this.paused ? text.battle.resumeButton : text.battle.pauseButton);
    this.speedButton.setLabel(`${text.battle.speed} ${SPEEDS[this.speedIndex]}×`);
    this.pausedText.setVisible(this.paused && !this.finished);
    this.pausedFrame.setVisible(this.paused && !this.finished);
    this.hintText.setVisible(!this.started && !this.finished);
  }

  private togglePause(): void {
    if (this.finished) return;
    this.paused = !this.paused;
    if (!this.paused) this.started = true;
    this.updateButtons();
  }

  private selectHead(headId: string | null): void {
    this.selectedHeadId = this.selectedHeadId === headId ? null : headId;
  }

  // ------------------------------------------------------------ input

  private setUpInput(): void {
    this.input.mouse?.disableContextMenu();
    onKeyDown(this, (event) => {
      if (event.code === 'Space') this.togglePause();
      else if (event.key === 'Escape') this.selectedHeadId = null;
      else if (/^[1-9]$/.test(event.key)) {
        const head = this.battle.heads[Number(event.key) - 1];
        if (head) this.selectHead(head.id);
      }
    });

    // Full-arena zone: UI elements above it catch their own taps first.
    const { arenaWidth, arenaHeight } = this.run.battleRules;
    const zone = this.add.zone(0, 0, arenaWidth, arenaHeight).setOrigin(0, 0).setDepth(1).setInteractive();
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.finished) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.handleTap({ x: world.x, y: world.y }, pointer.rightButtonReleased());
    });
  }

  private handleTap(at: Vec, rightButton: boolean): void {
    const rules = this.run.battleRules;
    if (!rightButton) {
      const enemy = this.battle.enemies.find((e) => distance(e.pos, at) <= rules.enemyTypes[e.typeId]!.radius + TAP_SLOP);
      if (enemy) {
        if (this.selectedHeadId) applyCommand(this.battle, { type: 'attack', headId: this.selectedHeadId, enemyId: enemy.id }, rules);
        return;
      }
      const head = this.battle.heads.find((h) => distance(h.pos, at) <= HEAD_TAP_RADIUS);
      if (head) {
        this.selectHead(head.id);
        return;
      }
      // A tap that missed everything while a head is selected only lets go of the head:
      // on a phone it is usually a missed enemy, and the body must not wander off because of it.
      if (this.selectedHeadId) {
        this.selectedHeadId = null;
        return;
      }
    }
    applyCommand(this.battle, { type: 'moveBody', to: at }, rules);
    this.selectedHeadId = null;
  }

  // ------------------------------------------------------------ simulation loop

  override update(_time: number, delta: number): void {
    if (!this.battle) return;
    const rules = this.run.battleRules;
    if (!this.paused && !this.finished) {
      const stepMs = 1000 / rules.ticksPerSecond;
      const slow = this.slowdownLeft > 0 ? COMBO_SLOWDOWN : 1;
      this.slowdownLeft = Math.max(0, this.slowdownLeft - delta);
      // ?speed=4 fast-forwards battles (for tests).
      const fastForward = getContext(this).params.speed ?? 1;
      // Never try to catch up more than a quarter second (e.g. after the tab was hidden).
      this.accumulator = Math.min(this.accumulator + delta * SPEEDS[this.speedIndex]! * slow * fastForward, 250 * fastForward);
      while (this.accumulator >= stepMs && !this.battle.outcome) {
        stepBattle(this.battle, rules);
        this.showEvents(this.battle.events);
        this.accumulator -= stepMs;
      }
    }
    if (this.selectedHeadId && !this.battle.heads.some((h) => h.id === this.selectedHeadId)) this.selectedHeadId = null;
    this.syncSprites();
    this.draw();
    if (this.battle.outcome && !this.finished) this.finish();
  }

  // ------------------------------------------------------------ drawing

  /** Creates and removes sprites so there is exactly one per head, enemy and stump. */
  private syncSprites(): void {
    const { heads } = getContext(this).data;
    sync(this.headSprites, this.battle.heads.map((h) => h.id), (id) => {
      const head = this.battle.heads.find((h) => h.id === id)!;
      return this.add.image(0, 0, 'battle_head').setDepth(6).setTint(color(heads.classes[head.classId]?.color ?? '#cccccc'));
    });
    sync(this.enemySprites, this.battle.enemies.map((e) => e.id), (id) => {
      const enemy = this.battle.enemies.find((e) => e.id === id)!;
      const key = `battle_enemy_${enemy.typeId}`;
      return this.add.image(0, 0, this.textures.exists(key) ? key : 'battle_enemy_manAtArms').setDepth(5);
    });
    sync(this.stumpSprites, this.battle.stumps.map((s) => s.id), () => this.add.image(0, 0, 'battle_stump').setDepth(4));
    // Mist lies over heads and people, half see-through.
    sync(this.cloudSprites, this.battle.clouds.map((c) => c.id), () => this.add.image(0, 0, 'battle_mist_cloud').setDepth(8).setAlpha(0));
  }

  private draw(): void {
    const rules = this.run.battleRules;
    const { body } = this.battle;
    this.body.setPosition(Math.round(body.pos.x), Math.round(body.pos.y));

    // Necks: a chain of segments from the body's edge to each head, bending slightly.
    this.necks.clear();
    for (const head of this.battle.heads) {
      const base = fromAngle(body.pos, head.anchorAngle, rules.body.radius - 3);
      const bend = fromAngle(body.pos, head.anchorAngle, rules.body.radius + rules.neck.restDistance * 0.5);
      for (let i = 0; i <= NECK_SEGMENTS; i++) {
        const t = i / NECK_SEGMENTS;
        const x = (1 - t) * (1 - t) * base.x + 2 * (1 - t) * t * bend.x + t * t * head.pos.x;
        const y = (1 - t) * (1 - t) * base.y + 2 * (1 - t) * t * bend.y + t * t * head.pos.y;
        this.necks.fillStyle(0x111111);
        this.necks.fillCircle(Math.round(x), Math.round(y), 5 - 1.5 * t);
        this.necks.fillStyle(0x3f7a4c);
        this.necks.fillCircle(Math.round(x), Math.round(y), 4 - 1.5 * t);
      }
    }

    for (const head of this.battle.heads) {
      const sprite = this.headSprites.get(head.id)!;
      const target = this.battle.enemies.find((e) => e.id === head.orderTargetId);
      const facing = target ? Math.atan2(target.pos.y - head.pos.y, target.pos.x - head.pos.x) : head.anchorAngle;
      sprite.setPosition(Math.round(head.pos.x), Math.round(head.pos.y)).setRotation(facing);
    }
    for (const enemy of this.battle.enemies) {
      this.enemySprites.get(enemy.id)!.setPosition(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    }
    for (const stump of this.battle.stumps) {
      const pos = stumpPosition(body.pos, stump, rules);
      this.stumpSprites.get(stump.id)!.setPosition(Math.round(pos.x), Math.round(pos.y)).setTexture(stump.cauterized ? 'battle_scar' : 'battle_stump');
    }

    const { palette, text } = getContext(this).data;
    for (const cloud of this.battle.clouds) {
      const sprite = this.cloudSprites.get(cloud.id)!;
      const acid = isAcid(this.battle, cloud);
      // Thins out over its last second.
      const fade = Math.min(1, (cloud.untilTick - this.battle.tick) / rules.ticksPerSecond);
      sprite
        .setPosition(Math.round(cloud.pos.x), Math.round(cloud.pos.y))
        .setScale((cloud.radius * 2) / sprite.width)
        .setTint(color(acid ? palette.underground.bioluminescence : palette.mist))
        .setAlpha((acid ? 0.55 : 0.4) * Math.max(0, fade));
    }

    this.drawOverlay();
    this.bodyHpText.setText(`${text.battle.body} ${Math.max(0, Math.ceil(body.hp))}/${body.maxHp}`);
    this.cards.update(this.battle.heads, this.selectedHeadId);
  }

  /** HP bars, status marks, selection ring, order lines, stump timers. */
  private drawOverlay(): void {
    const g = this.overlay;
    const rules = this.run.battleRules;
    const { combos } = getContext(this).data;
    g.clear();

    for (const enemy of this.battle.enemies) {
      const r = rules.enemyTypes[enemy.typeId]!.radius;
      hpBar(g, enemy.pos.x, enemy.pos.y - r - 5, 14, enemy.hp / enemy.maxHp, 0xd04030);
      // One small square per status above the HP bar; black with a gold rim = armor broken, grey = torch out.
      const marks = enemy.statuses.map((s) => color(combos.statuses[s.id]?.color ?? '#ffffff'));
      if (this.battle.tick < enemy.torchOutUntilTick) marks.push(0x777777);
      marks.forEach((fill, i) => {
        const x = Math.round(enemy.pos.x - 7 + i * 5);
        const y = Math.round(enemy.pos.y - r - 11);
        g.fillStyle(0x000000);
        g.fillRect(x, y, 4, 4);
        g.fillStyle(fill);
        g.fillRect(x + 1, y + 1, 2, 2);
      });
      if (enemy.armorBroken) {
        g.lineStyle(1, 0xd9a93b);
        g.strokeRect(Math.round(enemy.pos.x - 8) - 0.5, Math.round(enemy.pos.y - r - 6) - 0.5, 17, 4);
      }
      if (enemy.cauterizingStumpId !== null) {
        const stump = this.battle.stumps.find((s) => s.id === enemy.cauterizingStumpId);
        const cauterizeTicks = rules.enemyTypes[enemy.typeId]!.cauterizeTicks ?? 1;
        if (stump) hpBar(g, enemy.pos.x, enemy.pos.y + r + 3, 14, stump.cauterizeProgress / cauterizeTicks, 0xffa030);
      }
    }
    for (const head of this.battle.heads) {
      hpBar(g, head.pos.x, head.pos.y - 12, 14, head.hp / head.maxHp, 0x7fc05a);
      if (head.id === this.selectedHeadId) {
        g.lineStyle(1, 0xc6e04a);
        g.strokeCircle(Math.round(head.pos.x), Math.round(head.pos.y), 11);
        const target = this.battle.enemies.find((e) => e.id === head.orderTargetId);
        if (target) {
          g.lineStyle(1, 0xc6e04a, 0.5);
          g.lineBetween(head.pos.x, head.pos.y, target.pos.x, target.pos.y);
        }
      }
    }
    // Regrowth timer under each open stump.
    for (const stump of this.battle.stumps) {
      if (stump.cauterized) continue;
      const pos = stumpPosition(this.battle.body.pos, stump, rules);
      const left = (stump.regrowAtTick - this.battle.tick) / rules.regrowTicks;
      hpBar(g, pos.x, pos.y + 6, 10, 1 - left, 0xc6e04a);
    }
    const { body } = this.battle;
    if (body.moveTarget) {
      g.lineStyle(1, 0xc6e04a, 0.6);
      g.strokeCircle(Math.round(body.moveTarget.x), Math.round(body.moveTarget.y), 3);
    }
  }

  private showEvents(events: readonly BattleEvent[]): void {
    const { text, combos, palette } = getContext(this).data;
    for (const event of events) {
      switch (event.type) {
        case 'hit': {
          const sprite =
            event.targetKind === 'enemy'
              ? this.enemySprites.get(event.targetId as number)
              : event.targetKind === 'head'
                ? this.headSprites.get(event.targetId as string)
                : this.body;
          if (sprite) this.flash(sprite);
          break;
        }
        case 'severed':
          this.floatText(this.battle.body.pos, text.battle.severed.replace('{name}', event.name), '#ff8060');
          this.cameras.main.shake(120, 0.004);
          break;
        case 'regrown':
          this.floatText(this.battle.body.pos, text.battle.regrown, '#c6e04a');
          break;
        case 'cauterized':
          this.floatText(this.battle.body.pos, text.battle.cauterized, '#ffcf5c');
          break;
        case 'combo': {
          const name = combos.combos.find((c) => c.id === event.comboId)?.displayName ?? event.comboId;
          this.floatText(event.at, name, palette.order.gold, '12px');
          this.slowdownLeft = COMBO_SLOWDOWN_MS;
          this.combosSeen.push(event.comboId);
          break;
        }
        default:
          break;
      }
    }
  }

  private flash(sprite: Phaser.GameObjects.Image): void {
    const originalTint = sprite.tint;
    sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      if (!sprite.active) return;
      sprite.setTintMode(Phaser.TintModes.MULTIPLY).setTint(originalTint);
    });
  }

  private floatText(at: Vec, message: string, textColor: string, fontSize = '10px'): void {
    const label = this.add
      .text(Math.round(at.x), Math.round(at.y) - 30, message, {
        fontFamily: 'monospace',
        fontSize,
        color: textColor,
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: label, y: label.y - 16, alpha: 0, delay: 700, duration: 700, onComplete: () => label.destroy() });
  }

  // ------------------------------------------------------------ end of battle

  private finish(): void {
    this.finished = true;
    this.updateButtons();
    const { palette, text } = getContext(this).data;
    const { width } = this.scale.gameSize;
    const won = this.battle.outcome === 'won';
    const result = battleResult(this.battle, this.run.battleRules);

    const panel = this.add.container(width / 2, ARENA_TOP + 110).setScrollFactor(0).setDepth(60);
    const box = this.add.rectangle(0, 0, 300, 90, color(palette.underground.black), 0.95).setStrokeStyle(1, color(won ? palette.underground.bioluminescence : palette.order.bannerRed));
    const title = this.add
      .text(0, -22, won ? text.battle.victoryTitle : text.battle.defeatTitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: won ? '#e8f0e0' : palette.order.fire,
        align: 'center',
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5);
    const button = new Button(
      this,
      0,
      22,
      text.battle.continueButton,
      { width: 120, height: 24, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' },
      () => {
        this.run.finishBattle(result);
        this.scene.start(SceneKey.Map);
      },
    );
    panel.add([box, title, button]);
    pinToScreen(panel);
  }
}

function hpBar(g: Phaser.GameObjects.Graphics, cx: number, y: number, width: number, share: number, fill: number): void {
  const x = Math.round(cx - width / 2);
  g.fillStyle(0x000000, 0.8);
  g.fillRect(x - 1, Math.round(y) - 1, width + 2, 4);
  g.fillStyle(fill);
  g.fillRect(x, Math.round(y), Math.round(width * Math.max(0, Math.min(1, share))), 2);
}

/** Keeps `sprites` in line with `ids`: creates missing ones, destroys ones no longer needed. */
function sync<K>(sprites: Map<K, Phaser.GameObjects.Image>, ids: readonly K[], create: (id: K) => Phaser.GameObjects.Image): void {
  const wanted = new Set(ids);
  for (const [id, sprite] of sprites) {
    if (!wanted.has(id)) {
      sprite.destroy();
      sprites.delete(id);
    }
  }
  for (const id of ids) if (!sprites.has(id)) sprites.set(id, create(id));
}
