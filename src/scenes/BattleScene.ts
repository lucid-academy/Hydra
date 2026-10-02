// Battle screen: a board of hexes seen from a slant (a thick slab, as in Into the Breach) with the hydra in the middle.
// Runs the battle simulation in fixed ticks and draws it; taps and keys become commands to the simulation.
// The battle starts paused. Space / the Pause button stops and starts the ticks; orders can be given while paused.
// Controls: tap a head (or its card, or 1–9) to select it, then tap an enemy to make it attack.
// Several heads at once: Ctrl or Shift + tap on heads or cards (Shift + 1–9), or "All heads" (key A).
// With no head selected, tap a free hex to move the body there (right-click always moves it).

import * as Phaser from 'phaser';
import { BODY_FOOT, FEET_BELOW_HEX_CENTER, HEX_COLUMN_WIDTH, HEX_ROW_HEIGHT, TILE } from '../assets/battleArt';
import { applyCommand, battleResult, bodyDistance, boardHexes, createBattle, isAcid, isOnBoard, stepBattle } from '../sim/battle';
import type { BattleEvent, BattleHead, BattleState, Enemy, Walker } from '../sim/battle';
import { hexDistance, hexKey, hexToPixel, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import { exposeBattleSummary, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import { HeadCards } from '../ui/HeadCards';
import { onKeyDown, wantsToAdd } from '../ui/keys';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';

/** Top bar above the board, panel with head cards below it. */
const ARENA_TOP = 16;
const PANEL_TOP = 316;
/** Screen position of the board's middle hex, where the body starts. */
const LAYOUT: HexLayout = { columnWidth: HEX_COLUMN_WIDTH, rowHeight: HEX_ROW_HEIGHT, originX: 320, originY: 170 };
const SPEEDS = [1, 0.5] as const;
const DEFAULT_TEST_GROUP = 'burningDetail';
/** After a combo the battle runs this many times slower for a moment, so the player can see it land. */
const COMBO_SLOWDOWN = 0.3;
const COMBO_SLOWDOWN_MS = 350;
/** A tap this close to a head selects it (screen pixels). */
const HEAD_TAP_RADIUS = 14;
/** Soldier images: how far around their feet a tap still counts as tapping them. */
const SOLDIER_TAP = { halfWidth: 13, up: 38, down: 4 };
/** Necks are drawn as overlapping discs, one every few pixels, so long necks stay one smooth tube. */
const NECK_DISC_SPACING = 2.5;
/** How fast drawn heads follow where they should be (ms to cover most of the way). */
const HEAD_FOLLOW_MS = 90;

// Depths: board, then things on it sorted by how low on the screen they stand, then necks and heads, then UI.
const DEPTH = { tile: 0, mark: 1, shadow: 2, standing: 10, mist: 40, necks: 50, heads: 51, overlay: 60, text: 70, ui: 100 } as const;

interface Point {
  x: number;
  y: number;
}

/** How a head is drawn right now; it glides towards where the simulation says it should be. */
interface HeadView {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  lungeUntil: number;
  lungeTo: Point;
  phase: number;
}

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  lungeUntil: number;
  lungeTo: Point;
  phase: number;
  /** Last feet position, for a fading body when it falls. */
  feet: Point;
}

export class BattleScene extends Phaser.Scene {
  private run!: RunController;
  private battle!: BattleState;
  private paused = true;
  /** False until the player starts the battle for the first time; the how-to-play hint shows until then. */
  private started = false;
  private speedIndex = 0;
  private accumulator = 0;
  /** Heads picked by the player; an order goes to all of them. */
  private selected = new Set<string>();
  private finished = false;
  /** Real milliseconds of combo slow-down left. */
  private slowdownLeft = 0;
  /** Ids of combos that fired in this battle, in order (for the smoke test). */
  private combosSeen: string[] = [];

  private marks = new Map<string, Phaser.GameObjects.Image>();
  private mistTiles = new Map<string, Phaser.GameObjects.Image>();
  private mistPuffs = new Map<number, Phaser.GameObjects.Image[]>();
  private bodySprite!: Phaser.GameObjects.Image;
  private heads = new Map<string, HeadView>();
  private enemies = new Map<number, EnemyView>();
  private stumpSprites = new Map<number, Phaser.GameObjects.Image>();
  private necks!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
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
    this.selected = new Set();
    this.finished = false;
    this.slowdownLeft = 0;
    this.marks = new Map();
    this.mistTiles = new Map();
    this.mistPuffs = new Map();
    this.heads = new Map();
    this.enemies = new Map();
    this.stumpSprites = new Map();

    this.cameras.main.setBackgroundColor(color(data.palette.underground.black));
    // The board looks like the place of the encounter: its biome, and water if it was fought in water.
    const pending = run.state.pendingBattle!;
    const tile = run.state.map.tiles.get(hexKey(pending.at));
    const biome = tile?.biome ?? data.biomes.lairBiome;
    this.createBoard(`battle_tile_${biome}_${tile?.terrain === 'water' ? 'water' : 'ground'}`);

    this.bodySprite = this.add.image(0, 0, 'battle_body');
    this.bodySprite.setOrigin(BODY_FOOT.x / this.bodySprite.width, BODY_FOOT.y / this.bodySprite.height);
    this.necks = this.add.graphics().setDepth(DEPTH.necks);
    this.overlay = this.add.graphics().setDepth(DEPTH.overlay);

    this.createUi();
    this.setUpInput();
    this.syncSprites();
    this.draw(0);
    exposeBattleSummary(() => ({
      tick: this.battle.tick,
      outcome: this.battle.outcome,
      paused: this.paused,
      enemies: this.battle.enemies.map((e) => {
        const feet = this.enemies.get(e.id)?.feet ?? this.hexFeet(e.hex);
        return { id: e.id, typeId: e.typeId, x: feet.x, y: feet.y - 16 };
      }),
      heads: this.battle.heads.map((h) => ({ id: h.id, classId: h.classId, x: this.heads.get(h.id)?.x ?? 0, y: this.heads.get(h.id)?.y ?? 0 })),
      selected: [...this.selected],
      cards: this.cards.centers(),
      orders: Object.fromEntries(this.battle.heads.map((h) => [h.id, h.orderTargetId])),
      clouds: this.battle.clouds.length,
      combos: [...this.combosSeen],
    }));
    markReady(SceneKey.Battle);
  }

  // ------------------------------------------------------------ board

  /** Tiles row by row from the top: each row hides the walls of the row behind it, so only the front edge shows its walls. */
  private createBoard(tileKey: string): void {
    const rules = this.run.battleRules;
    const originY = TILE.faceHeight / 2 / (TILE.faceHeight + TILE.wallHeight);
    for (const h of boardHexes(rules)) {
      const p = this.hexCenter(h);
      this.add.image(p.x, p.y, tileKey).setOrigin(0.5, originY).setDepth(DEPTH.tile + p.y / 10000);
      this.marks.set(hexKey(h), this.add.image(p.x, p.y, 'battle_hex_mark').setDepth(DEPTH.mark).setVisible(false));
      this.mistTiles.set(hexKey(h), this.add.image(p.x, p.y, 'battle_hex_fill').setDepth(DEPTH.mark).setVisible(false));
    }
    // A few glowing spores in the dark around the board.
    const { palette } = getContext(this).data;
    const g = this.add.graphics().setDepth(DEPTH.tile - 1);
    g.fillStyle(color(palette.underground.bioluminescence), 0.6);
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(((i * 173) % 640) + ((i * 7) % 5)), ARENA_TOP + ((i * 97) % 300), 1, 1);
  }

  private hexCenter(h: Hex): Point {
    return hexToPixel(LAYOUT, h);
  }

  private hexFeet(h: Hex): Point {
    const c = this.hexCenter(h);
    return { x: c.x, y: c.y + FEET_BELOW_HEX_CENTER };
  }

  /** How far into the current tick we are (0..1), so walking looks smooth between ticks. */
  private tickFraction(): number {
    if (this.paused || this.finished) return 0;
    return Math.min(1, this.accumulator / (1000 / this.run.battleRules.ticksPerSecond));
  }

  /** Where something walking between hexes is drawn right now, and how high it hops (0 when standing). */
  private walkerPosition(w: Walker, at: Hex): { point: Point; hop: number } {
    const to = this.hexCenter(at);
    const now = this.battle.tick + this.tickFraction();
    if (now >= w.stepEndTick || w.stepEndTick <= w.stepStartTick) return { point: to, hop: 0 };
    const from = this.hexCenter(w.stepFrom);
    const t = Math.max(0, (now - w.stepStartTick) / (w.stepEndTick - w.stepStartTick));
    return { point: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, hop: Math.sin(t * Math.PI) };
  }

  private bodyCenter(): Point {
    return this.walkerPosition(this.battle.body, this.battle.body.center).point;
  }

  /** Where a neck leaves the body: on the upper rim of the mound, in the neck's direction. */
  private neckBase(body: Point, angle: number): Point {
    return { x: body.x + Math.cos(angle) * 44, y: body.y - 16 + Math.sin(angle) * 24 };
  }

  // ------------------------------------------------------------ UI

  private createUi(): void {
    const { palette, text, heads } = getContext(this).data;
    const { width, height } = this.scale.gameSize;

    // The bars above and below the board are not interactive: the board's own tap area ends where they begin,
    // and an interactive bar could be counted as lying on top of the buttons and cards drawn on it.
    this.add.rectangle(0, 0, width, ARENA_TOP, color(palette.underground.black), 0.9).setOrigin(0, 0).setDepth(DEPTH.ui);
    this.bodyHpText = this.add.text(6, 3, '', { fontFamily: 'monospace', fontSize: '10px', color: '#d8e4d0' }).setDepth(DEPTH.ui + 1);
    // Paused = the word in the top bar plus a gold frame around the board area, so nothing on the board is covered.
    this.pausedText = this.add
      .text(width / 2, 3, text.battle.paused, { fontFamily: 'monospace', fontSize: '10px', color: palette.order.gold })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.ui + 1);
    this.pausedFrame = this.add.graphics().setDepth(DEPTH.ui - 1);
    this.pausedFrame.lineStyle(2, color(palette.order.gold), 0.9);
    this.pausedFrame.strokeRect(1, ARENA_TOP + 1, width - 2, PANEL_TOP - ARENA_TOP - 2);

    // How to play, shown until the battle is started. It lies over the front wall of the board, where it covers nobody.
    this.hintText = this.add
      .text(width / 2, PANEL_TOP - 1, text.battle.hintSelectHead, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#e8f0e0',
        backgroundColor: '#000000bb',
        padding: { x: 5, y: 2 },
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui + 1);

    this.add.rectangle(0, PANEL_TOP, width, height - PANEL_TOP, color(palette.underground.black)).setOrigin(0, 0).setDepth(DEPTH.ui);

    const buttonWidth = 70;
    this.cards = new HeadCards(
      this,
      {
        x: 2,
        y: PANEL_TOP + 2,
        width: width - buttonWidth - 8,
        maxCards: this.run.battleRules.maxHeads,
        classColors: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.color])),
        classNames: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.displayName])),
      },
      (headId, add) => this.selectHead(headId, add),
    );

    const buttonStyle = {
      width: buttonWidth,
      height: 20,
      fill: color(palette.underground.deepTeal),
      border: color(palette.underground.bioluminescence),
      textColor: '#e8f0e0',
      fontSize: '10px',
    };
    this.pauseButton = new Button(this, width - buttonWidth / 2 - 3, PANEL_TOP + 12, text.battle.pauseButton, buttonStyle, () => this.togglePause());
    this.speedButton = new Button(this, width - buttonWidth / 2 - 3, PANEL_TOP + 33, '', buttonStyle, () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.updateButtons();
    });
    const allHeads = new Button(
      this,
      width - 40,
      ARENA_TOP / 2,
      text.battle.selectAllButton,
      { ...buttonStyle, width: 74, height: 13, fontSize: '9px' },
      () => this.selectAllHeads(),
    );
    for (const b of [this.pauseButton, this.speedButton, allHeads]) b.setDepth(DEPTH.ui + 2);
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

  /** A plain tap picks one head (or lets go of it); with `add` (Ctrl, Shift) the head joins the picked ones or leaves them. */
  private selectHead(headId: string, add: boolean): void {
    if (add) {
      if (this.selected.has(headId)) this.selected.delete(headId);
      else this.selected.add(headId);
      return;
    }
    const onlyThisOne = this.selected.size === 1 && this.selected.has(headId);
    this.selected = onlyThisOne ? new Set() : new Set([headId]);
  }

  private selectAllHeads(): void {
    if (!this.finished) this.selected = new Set(this.battle.heads.map((h) => h.id));
  }

  // ------------------------------------------------------------ input

  private setUpInput(): void {
    this.input.mouse?.disableContextMenu();
    onKeyDown(this, (event) => {
      // Key codes, not characters: Shift + 1 still counts as 1 on every keyboard layout.
      const digit = /^Digit([1-9])$/.exec(event.code);
      if (event.code === 'Space') this.togglePause();
      else if (event.key === 'Escape') this.selected = new Set();
      else if (event.code === 'KeyA') this.selectAllHeads();
      else if (digit) {
        const head = this.battle.heads[Number(digit[1]) - 1];
        if (head) this.selectHead(head.id, event.shiftKey);
      }
    });

    // The board area: buttons, cards and the top bar lie above it and catch their own taps first.
    const zone = this.add.zone(0, ARENA_TOP, this.scale.gameSize.width, PANEL_TOP - ARENA_TOP).setOrigin(0, 0).setDepth(DEPTH.tile).setInteractive();
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.finished) this.handleTap({ x: pointer.worldX, y: pointer.worldY }, pointer.rightButtonReleased(), wantsToAdd(pointer));
    });
  }

  private handleTap(at: Point, rightButton: boolean, add: boolean): void {
    const rules = this.run.battleRules;
    const tappedHex = pixelToHex(LAYOUT, at.x, at.y);
    if (!rightButton) {
      // With heads picked, a tap on an enemy is an order, even if a head hangs right next to it;
      // with none picked, a tap picks a head.
      const enemy = this.enemyAt(at, tappedHex);
      if (enemy && this.selected.size > 0 && !add) {
        for (const headId of this.selected) applyCommand(this.battle, { type: 'attack', headId, enemyId: enemy.id }, rules);
        return;
      }
      const head = this.headAt(at);
      if (head) {
        this.selectHead(head.id, add);
        return;
      }
      if (enemy) return;
      // A tap that missed everything while heads are selected only lets go of them:
      // on a phone it is usually a missed enemy, and the body must not wander off because of it.
      if (this.selected.size > 0) {
        this.selected = new Set();
        return;
      }
    }
    if (isOnBoard(tappedHex, rules)) applyCommand(this.battle, { type: 'moveBody', to: tappedHex }, rules);
    this.selected = new Set();
  }

  private headAt(at: Point): BattleHead | null {
    let best: BattleHead | null = null;
    let bestDistance = HEAD_TAP_RADIUS;
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      const d = Math.hypot(view.x - at.x, view.y - at.y);
      if (d <= bestDistance) {
        best = head;
        bestDistance = d;
      }
    }
    return best;
  }

  /** The soldier drawn under the pointer (the one in front, if they overlap), or the one standing on the tapped hex. */
  private enemyAt(at: Point, tappedHex: Hex): Enemy | null {
    let best: Enemy | null = null;
    let bestFeetY = -Infinity;
    for (const enemy of this.battle.enemies) {
      const feet = this.enemies.get(enemy.id)?.feet ?? this.hexFeet(enemy.hex);
      const inside = Math.abs(at.x - feet.x) <= SOLDIER_TAP.halfWidth && at.y >= feet.y - SOLDIER_TAP.up && at.y <= feet.y + SOLDIER_TAP.down;
      if (inside && feet.y > bestFeetY) {
        best = enemy;
        bestFeetY = feet.y;
      }
    }
    return best ?? this.battle.enemies.find((e) => e.hex.q === tappedHex.q && e.hex.r === tappedHex.r) ?? null;
  }

  // ------------------------------------------------------------ simulation loop

  override update(time: number, delta: number): void {
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
        this.showEvents(this.battle.events, time);
        this.accumulator -= stepMs;
      }
    }
    for (const id of this.selected) if (!this.battle.heads.some((h) => h.id === id)) this.selected.delete(id);
    this.syncSprites();
    this.draw(delta);
    if (this.battle.outcome && !this.finished) this.finish();
  }

  // ------------------------------------------------------------ drawing

  /** Creates and removes images so there is exactly one set per head, enemy, stump and cloud. */
  private syncSprites(): void {
    const { heads } = getContext(this).data;
    const body = this.bodyCenter();

    const headIds = new Set(this.battle.heads.map((h) => h.id));
    for (const [id, view] of this.heads) {
      if (headIds.has(id)) continue;
      view.sprite.destroy();
      this.heads.delete(id);
    }
    for (const head of this.battle.heads) {
      if (this.heads.has(head.id)) continue;
      const base = this.neckBase(body, head.anchorAngle);
      const sprite = this.add.image(base.x, base.y, 'battle_head').setDepth(DEPTH.heads).setTint(color(heads.classes[head.classId]?.color ?? '#cccccc'));
      // New heads start at the stump and grow out from there.
      this.heads.set(head.id, { sprite, x: base.x, y: base.y, lungeUntil: 0, lungeTo: base, phase: this.heads.size * 1.7 + head.anchorAngle });
    }

    const enemyIds = new Set(this.battle.enemies.map((e) => e.id));
    for (const [id, view] of this.enemies) {
      if (enemyIds.has(id)) continue;
      this.fallDown(view);
      this.enemies.delete(id);
    }
    for (const enemy of this.battle.enemies) {
      if (this.enemies.has(enemy.id)) continue;
      const key = `battle_enemy_${enemy.typeId}`;
      const feet = this.hexFeet(enemy.hex);
      const sprite = this.add.image(feet.x, feet.y, this.textures.exists(key) ? key : 'battle_enemy_manAtArms').setOrigin(0.5, 1);
      const shadow = this.add.image(feet.x, feet.y, 'battle_shadow').setTint(0x000000).setAlpha(0.45).setDepth(DEPTH.shadow);
      this.enemies.set(enemy.id, { sprite, shadow, lungeUntil: 0, lungeTo: feet, phase: enemy.id * 2.3, feet });
    }

    const stumpIds = new Set(this.battle.stumps.map((s) => s.id));
    for (const [id, sprite] of this.stumpSprites) {
      if (stumpIds.has(id)) continue;
      sprite.destroy();
      this.stumpSprites.delete(id);
    }
    for (const stump of this.battle.stumps) {
      if (!this.stumpSprites.has(stump.id)) this.stumpSprites.set(stump.id, this.add.image(0, 0, 'battle_stump').setDepth(DEPTH.necks - 1));
    }

    const cloudIds = new Set(this.battle.clouds.map((c) => c.id));
    for (const [id, puffs] of this.mistPuffs) {
      if (cloudIds.has(id)) continue;
      for (const puff of puffs) puff.destroy();
      this.mistPuffs.delete(id);
    }
    for (const cloud of this.battle.clouds) {
      if (this.mistPuffs.has(cloud.id)) continue;
      const puffs = boardHexes(this.run.battleRules)
        .filter((h) => hexDistance(h, cloud.center) <= cloud.radius)
        .map((h) => {
          const p = this.hexCenter(h);
          return this.add.image(p.x, p.y - 10, 'battle_mist_puff').setDepth(DEPTH.mist).setAlpha(0).setData('x0', p.x);
        });
      this.mistPuffs.set(cloud.id, puffs);
    }
  }

  private draw(delta: number): void {
    const rules = this.run.battleRules;
    const now = this.time.now;
    const body = this.bodyCenter();
    this.bodySprite.setPosition(Math.round(body.x), Math.round(body.y)).setDepth(DEPTH.standing + body.y / 1000);

    for (const enemy of this.battle.enemies) this.drawEnemy(enemy, body, now);
    this.drawMist(now);
    this.drawHeads(body, now, delta);

    for (const stump of this.battle.stumps) {
      const p = this.neckBase(body, stump.anchorAngle);
      this.stumpSprites.get(stump.id)?.setPosition(Math.round(p.x), Math.round(p.y)).setTexture(stump.cauterized ? 'battle_scar' : 'battle_stump');
    }

    this.drawMarks();
    this.drawOverlay(body);
    const { text } = getContext(this).data;
    this.bodyHpText.setText(`${text.battle.body} ${Math.max(0, Math.ceil(this.battle.body.hp))}/${this.battle.body.maxHp}`);
    this.cards.update(
      this.battle.heads.map((h) => ({ ...h, charge: 1 - h.cooldown / rules.headClasses[h.classId]!.attack.cooldownTicks })),
      this.selected,
    );
  }

  private drawEnemy(enemy: Enemy, body: Point, now: number): void {
    const view = this.enemies.get(enemy.id);
    if (!view) return;
    const { point, hop } = this.walkerPosition(enemy, enemy.hex);
    let x = point.x;
    let y = point.y + FEET_BELOW_HEX_CENTER;
    view.feet = { x, y };
    view.shadow.setPosition(Math.round(x), Math.round(y));
    // Standing still they shift their weight a little; walking they hop; attacking they lunge.
    y -= hop > 0 ? Math.round(hop * 3) : Math.sin(now / 280 + view.phase) > 0.6 ? 1 : 0;
    if (now < view.lungeUntil) {
      x += Math.sign(view.lungeTo.x - x) * 3;
      y += Math.sign(view.lungeTo.y - y) * 2;
    }
    const facingLeft = hop > 0 ? this.hexCenter(enemy.hex).x < this.hexCenter(enemy.stepFrom).x : x > body.x;
    view.sprite
      .setPosition(Math.round(x), Math.round(y))
      .setFlipX(facingLeft)
      .setDepth(DEPTH.standing + view.feet.y / 1000);
  }

  private drawHeads(body: Point, now: number, delta: number): void {
    const rules = this.run.battleRules;
    const follow = 1 - Math.exp(-Math.max(delta, 1) / HEAD_FOLLOW_MS);
    this.necks.clear();
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      const base = this.neckBase(body, head.anchorAngle);
      const target = head.targetId !== null ? this.enemies.get(head.targetId) : undefined;
      const melee = rules.headClasses[head.classId]!.attack.melee;
      let want: Point;
      let facing = Math.cos(head.anchorAngle) >= 0 ? 1 : -1;
      if (target && melee) {
        // Biting: right beside the enemy, at chest height, on the side facing the body.
        const side = target.feet.x >= body.x ? 1 : -1;
        want = { x: target.feet.x - side * 17, y: target.feet.y - 21 };
        facing = side;
      } else if (target) {
        // Spitting or breathing from the body: leaning towards the enemy.
        const dx = target.feet.x - base.x;
        const dy = target.feet.y - base.y;
        const d = Math.hypot(dx, dy) || 1;
        want = { x: base.x + (dx / d) * 22, y: base.y + (dy / d) * 12 - 20 };
        facing = dx >= 0 ? 1 : -1;
      } else {
        // Resting: raised above its side of the body, swaying a little.
        want = {
          x: base.x + Math.cos(head.anchorAngle) * 16 + Math.sin(now / 700 + view.phase) * 2,
          y: base.y + Math.sin(head.anchorAngle) * 8 - 22 + Math.cos(now / 900 + view.phase) * 1.5,
        };
      }
      view.x += (want.x - view.x) * follow;
      view.y += (want.y - view.y) * follow;
      let x = view.x;
      let y = view.y;
      if (now < view.lungeUntil) {
        const dx = view.lungeTo.x - x;
        const dy = view.lungeTo.y - y;
        const d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * 6;
        y += (dy / d) * 6;
      }
      this.drawNeck(base, { x, y });
      view.sprite.setPosition(Math.round(x), Math.round(y)).setFlipX(facing < 0);
    }
  }

  /** A neck as a chain of segments rising from the body in an arc, thinner towards the head. */
  private drawNeck(from: Point, to: Point): void {
    const bend = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 18 };
    const length = Math.hypot(bend.x - from.x, bend.y - from.y) + Math.hypot(to.x - bend.x, to.y - bend.y);
    const discs = Math.max(8, Math.ceil(length / NECK_DISC_SPACING));
    for (const [width, fill] of [[5, 0x0e120e], [3.8, 0x3f7a4c]] as const) {
      this.necks.fillStyle(fill);
      for (let i = 0; i <= discs; i++) {
        const t = i / discs;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * bend.x + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * bend.y + t * t * to.y;
        this.necks.fillCircle(Math.round(x), Math.round(y), width - 1.5 * t);
      }
    }
  }

  /** Mist: tinted hexes under each cloud, and puffs drifting over it (yellow-green when it has turned to acid). */
  private drawMist(now: number): void {
    const { palette } = getContext(this).data;
    const rules = this.run.battleRules;
    const cover = new Map<string, { alpha: number; acid: boolean }>();
    for (const cloud of this.battle.clouds) {
      const acid = isAcid(this.battle, cloud);
      // Thins out over its last second.
      const fade = Math.max(0, Math.min(1, (cloud.untilTick - this.battle.tick) / rules.ticksPerSecond));
      for (const h of boardHexes(rules)) {
        if (hexDistance(h, cloud.center) > cloud.radius) continue;
        const prev = cover.get(hexKey(h));
        cover.set(hexKey(h), { alpha: Math.max(prev?.alpha ?? 0, fade), acid: (prev?.acid ?? false) || acid });
      }
      (this.mistPuffs.get(cloud.id) ?? []).forEach((puff, i) => {
        const drift = Math.round(Math.sin(now / 900 + i * 1.3 + cloud.id) * 3);
        puff
          .setX((puff.getData('x0') as number) + drift)
          .setTint(color(acid ? palette.underground.bioluminescence : palette.mist))
          .setAlpha((acid ? 0.55 : 0.45) * fade);
      });
    }
    for (const [key, tile] of this.mistTiles) {
      const c = cover.get(key);
      tile.setVisible(c !== undefined);
      if (c) tile.setTint(color(c.acid ? palette.underground.bioluminescence : palette.mist)).setAlpha((c.acid ? 0.35 : 0.28) * c.alpha);
    }
  }

  /** Hex outlines: how far the selected heads reach, which enemies they can take, where the body is going. */
  private drawMarks(): void {
    const rules = this.run.battleRules;
    for (const mark of this.marks.values()) mark.setVisible(false);
    const show = (h: Hex, tint: number, alpha: number): void => {
      this.marks.get(hexKey(h))?.setVisible(true).setTint(tint).setAlpha(alpha);
    };
    const center = this.battle.body.center;
    const picked = this.battle.heads.filter((h) => this.selected.has(h.id));
    if (picked.length > 0 && !this.finished) {
      const rangeOf = (h: BattleHead) => rules.headClasses[h.classId]!.attack.range;
      const reach = Math.max(...picked.map(rangeOf));
      for (const h of boardHexes(rules)) {
        const d = bodyDistance(center, h);
        if (d >= 1 && d <= reach) show(h, 0xc6e04a, 0.45);
      }
      // Orange: enemies at least one of them can reach. Red: enemies they were ordered to attack.
      const ordered = new Set(picked.map((h) => h.orderTargetId));
      for (const enemy of this.battle.enemies) {
        const inReach = picked.some((h) => bodyDistance(center, enemy.hex) <= rangeOf(h));
        if (ordered.has(enemy.id)) show(enemy.hex, 0xff5030, 0.95);
        else if (inReach) show(enemy.hex, 0xffa030, 0.95);
      }
    }
    if (this.battle.body.moveTarget && !this.finished) show(this.battle.body.moveTarget, 0xe8f0e0, 0.7);
  }

  /** HP bars, status marks, the selection ring, the order line, stump timers. */
  private drawOverlay(body: Point): void {
    const g = this.overlay;
    const rules = this.run.battleRules;
    const { combos } = getContext(this).data;
    g.clear();

    for (const enemy of this.battle.enemies) {
      const view = this.enemies.get(enemy.id);
      if (!view) continue;
      const top = view.feet.y - 44;
      hpBar(g, view.feet.x, top, 18, enemy.hp / enemy.maxHp, 0xd04030);
      if (enemy.armorBroken) {
        g.lineStyle(1, 0xd9a93b);
        g.strokeRect(Math.round(view.feet.x - 10) - 0.5, Math.round(top) - 1.5, 21, 5);
      }
      // One small square per status above the HP bar; grey = torch out.
      const marks = enemy.statuses.map((s) => color(combos.statuses[s.id]?.color ?? '#ffffff'));
      if (this.battle.tick < enemy.torchOutUntilTick) marks.push(0x777777);
      marks.forEach((fill, i) => {
        const x = Math.round(view.feet.x - 9 + i * 5);
        const y = Math.round(top - 6);
        g.fillStyle(0x000000);
        g.fillRect(x, y, 4, 4);
        g.fillStyle(fill);
        g.fillRect(x + 1, y + 1, 2, 2);
      });
      if (enemy.cauterizingStumpId !== null) {
        const stump = this.battle.stumps.find((s) => s.id === enemy.cauterizingStumpId);
        const cauterizeTicks = rules.enemyTypes[enemy.typeId]!.cauterizeTicks ?? 1;
        if (stump) hpBar(g, view.feet.x, view.feet.y + 3, 18, stump.cauterizeProgress / cauterizeTicks, 0xffa030);
      }
    }
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      hpBar(g, view.x, view.y - 11, 14, head.hp / head.maxHp, 0x7fc05a);
      if (!this.selected.has(head.id)) continue;
      g.lineStyle(1, 0xc6e04a);
      g.strokeEllipse(Math.round(view.x), Math.round(view.y), 26, 20);
      const ordered = head.orderTargetId !== null ? this.enemies.get(head.orderTargetId) : undefined;
      if (ordered) {
        g.lineStyle(1, 0xff5030, 0.7);
        g.lineBetween(view.x, view.y, ordered.feet.x, ordered.feet.y - 16);
      }
    }
    // Regrowth timer under each open stump.
    for (const stump of this.battle.stumps) {
      if (stump.cauterized) continue;
      const p = this.neckBase(body, stump.anchorAngle);
      hpBar(g, p.x, p.y + 6, 12, 1 - (stump.regrowAtTick - this.battle.tick) / rules.regrowTicks, 0xc6e04a);
    }
  }

  private fallDown(view: EnemyView): void {
    view.shadow.destroy();
    this.tweens.add({ targets: view.sprite, alpha: 0, y: view.sprite.y + 4, duration: 500, onComplete: () => view.sprite.destroy() });
  }

  private showEvents(events: readonly BattleEvent[], now: number): void {
    const { text, combos, palette } = getContext(this).data;
    const body = this.bodyCenter();
    const above = { x: body.x, y: body.y - 40 };
    for (const event of events) {
      switch (event.type) {
        case 'hit':
          this.showHit(event, now);
          break;
        case 'severed':
          this.floatText(above, text.battle.severed.replace('{name}', event.name), '#ff8060');
          this.cameras.main.shake(120, 0.004);
          break;
        case 'regrown':
          this.floatText(above, text.battle.regrown, '#c6e04a');
          break;
        case 'cauterized':
          this.floatText(above, text.battle.cauterized, '#ffcf5c');
          break;
        case 'combo': {
          const name = combos.combos.find((c) => c.id === event.comboId)?.displayName ?? event.comboId;
          const at = this.hexFeet(event.at);
          this.floatText({ x: at.x, y: at.y - 50 }, name, palette.order.gold, '12px');
          this.slowdownLeft = COMBO_SLOWDOWN_MS;
          this.combosSeen.push(event.comboId);
          break;
        }
        default:
          break;
      }
    }
  }

  /** Who hit whom: the attacker lunges, the one hit flashes. */
  private showHit(event: Extract<BattleEvent, { type: 'hit' }>, now: number): void {
    const hitAt = this.hexFeet(event.at);
    if (event.attacker === 'head' && typeof event.attackerId === 'string') {
      const view = this.heads.get(event.attackerId);
      if (view) Object.assign(view, { lungeUntil: now + 110, lungeTo: { x: hitAt.x, y: hitAt.y - 16 } });
    }
    if (event.attacker === 'enemy' && typeof event.attackerId === 'number') {
      const view = this.enemies.get(event.attackerId);
      const target = event.targetKind === 'head' ? this.heads.get(event.targetId as string) : undefined;
      if (view) Object.assign(view, { lungeUntil: now + 120, lungeTo: target ? { x: target.x, y: target.y } : this.bodyCenter() });
    }
    const sprite =
      event.targetKind === 'enemy'
        ? this.enemies.get(event.targetId as number)?.sprite
        : event.targetKind === 'head'
          ? this.heads.get(event.targetId as string)?.sprite
          : this.bodySprite;
    if (sprite) this.flash(sprite);
  }

  private flash(sprite: Phaser.GameObjects.Image): void {
    const originalTint = sprite.tint;
    sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      if (!sprite.active) return;
      sprite.setTintMode(Phaser.TintModes.MULTIPLY).setTint(originalTint);
    });
  }

  private floatText(at: Point, message: string, textColor: string, fontSize = '10px'): void {
    const label = this.add
      .text(Math.round(at.x), Math.round(at.y), message, {
        fontFamily: 'monospace',
        fontSize,
        color: textColor,
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text);
    this.tweens.add({ targets: label, y: label.y - 16, alpha: 0, delay: 700, duration: 700, onComplete: () => label.destroy() });
  }

  // ------------------------------------------------------------ end of battle

  private finish(): void {
    this.finished = true;
    this.updateButtons();
    this.drawMarks();
    const { palette, text } = getContext(this).data;
    const { width } = this.scale.gameSize;
    const won = this.battle.outcome === 'won';
    const result = battleResult(this.battle, this.run.battleRules);

    const panel = this.add.container(width / 2, ARENA_TOP + 110).setDepth(DEPTH.ui + 10);
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
  }
}

function hpBar(g: Phaser.GameObjects.Graphics, cx: number, y: number, width: number, share: number, fill: number): void {
  const x = Math.round(cx - width / 2);
  g.fillStyle(0x000000, 0.8);
  g.fillRect(x - 1, Math.round(y) - 1, width + 2, 4);
  g.fillStyle(fill);
  g.fillRect(x, Math.round(y), Math.round(width * Math.max(0, Math.min(1, share))), 2);
}
