// Strategic map: draws the hex map from the run state and turns taps into move commands.
// Drag to look around; tap a highlighted hex to move there.

import * as Phaser from 'phaser';
import { hexKey, hexToPixel, hexesInRange, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import type { MapObject } from '../sim/map';
import type { RunEvent } from '../sim/turn';
import { exposeReachable, exposeRunSummary, markReady } from '../testHooks';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';

const LAYOUT: HexLayout = { columnWidth: 28, rowHeight: 24, originX: 0, originY: 0 };
const WORLD_MARGIN = 48;
/** Pointer must move this far (in screen pixels) before a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 6;
const STEP_DURATION_MS = 110;
/** Below this page zoom (small screens, e.g. phones) the map camera zooms in 2×, so hexes are big enough for fingers. */
const SMALL_SCREEN_ZOOM = 2;

const OBJECT_ICONS: Record<MapObject['kind'], string> = {
  lair: 'icon_lair',
  encounter: 'icon_encounter',
  muck: 'icon_muck',
};

interface TileView {
  ground: Phaser.GameObjects.Image;
  shade: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image | null;
}

export class MapScene extends Phaser.Scene {
  private run!: RunController;
  private tiles = new Map<string, TileView>();
  private reachableMarks: Phaser.GameObjects.Image[] = [];
  private token!: Phaser.GameObjects.Image;
  private animating = false;
  private press: { x: number; y: number; dragging: boolean } | null = null;

  constructor() {
    super(SceneKey.Map);
  }

  create(): void {
    this.run = getRun(this) ?? startNewRun(this);
    this.tiles.clear();
    this.reachableMarks = [];
    this.animating = false;
    this.press = null;
    this.cameras.main.setBackgroundColor(color(getContext(this).data.palette.underground.black));

    this.drawMap();
    this.token = this.add.image(0, 0, 'token_hydra').setDepth(10);
    this.placeToken(this.run.state.hydra.position);
    this.setUpCamera();
    this.setUpInput();
    const onResize = (): void => this.fitCameraZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    const onChanged = (): void => {
      if (!this.animating) this.refresh();
    };
    const onEvents = (events: RunEvent[]): void => this.animate(events);
    this.run.on('changed', onChanged);
    this.run.on('events', onEvents);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run.off('changed', onChanged);
      this.run.off('events', onEvents);
    });

    this.refresh();
    this.scene.launch(SceneKey.Hud);
    exposeReachable(() => {
      const cam = this.cameras.main;
      const { map, visibility } = this.run.state;
      return [...this.run.reachable().entries()].map(([key, { cost }]) => {
        const tile = map.tiles.get(key)!;
        const { x, y } = hexToPixel(LAYOUT, tile.hex);
        const unexploredNear = hexesInRange(tile.hex, this.run.rules.sightRangeHexes).filter((h) => map.tiles.has(hexKey(h)) && !visibility.has(hexKey(h))).length;
        return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom, cost, encounter: tile.object?.kind === 'encounter', unexploredNear };
      });
    });
    exposeRunSummary(() => {
      const { turn, resources, alert, pendingBattle, visibility } = this.run.state;
      return { turn, muck: resources.muck, alert, inBattle: pendingBattle !== null, explored: visibility.size };
    });
    markReady(SceneKey.Map);
  }

  private drawMap(): void {
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      this.tiles.set(hexKey(tile.hex), {
        ground: this.add.image(x, y, `hex_${tile.terrain}`),
        shade: this.add.image(x, y, 'hex_shade').setDepth(5),
        icon: tile.object ? this.add.image(x, y, OBJECT_ICONS[tile.object.kind]).setDepth(4) : null,
      });
    }
  }

  /** Brings every hex in line with the run state: visibility, objects, reachable hexes. */
  private refresh(): void {
    const { map, visibility } = this.run.state;
    for (const [key, view] of this.tiles) {
      const state = visibility.get(key);
      const known = state !== undefined;
      view.ground.setVisible(known);
      view.shade.setVisible(state === 'remembered');
      if (view.icon && map.tiles.get(key)!.object === null) {
        view.icon.destroy();
        view.icon = null;
      }
      view.icon?.setVisible(known);
    }

    for (const mark of this.reachableMarks) mark.destroy();
    this.reachableMarks = [];
    if (this.run.state.pendingBattle) return;
    for (const key of this.run.reachable().keys()) {
      const { x, y } = hexToPixel(LAYOUT, map.tiles.get(key)!.hex);
      this.reachableMarks.push(this.add.image(x, y, 'hex_reachable').setDepth(6));
    }
  }

  private animate(events: RunEvent[]): void {
    const moved = events.find((e) => e.type === 'moved');
    if (!moved || moved.path.length === 0) return;
    this.animating = true;
    for (const mark of this.reachableMarks) mark.setVisible(false);
    this.tweens.chain({
      targets: this.token,
      tweens: moved.path.map((step) => ({ ...this.tokenPosition(step), duration: STEP_DURATION_MS })),
      onComplete: () => {
        this.animating = false;
        if (this.run.state.pendingBattle) {
          this.startBattle();
          return;
        }
        this.refresh();
        this.panTo(this.run.state.hydra.position);
      },
    });
  }

  private startBattle(): void {
    this.cameras.main.flash(250, 158, 35, 35);
    this.time.delayedCall(250, () => {
      this.scene.stop(SceneKey.Hud);
      this.scene.start(SceneKey.Battle);
    });
  }

  private tokenPosition(h: Hex): { x: number; y: number } {
    const { x, y } = hexToPixel(LAYOUT, h);
    return { x, y: y - 4 };
  }

  private placeToken(h: Hex): void {
    const { x, y } = this.tokenPosition(h);
    this.token.setPosition(x, y);
  }

  private setUpCamera(): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const cam = this.cameras.main;
    cam.setBounds(
      minX - WORLD_MARGIN,
      minY - WORLD_MARGIN,
      maxX - minX + WORLD_MARGIN * 2,
      maxY - minY + WORLD_MARGIN * 2,
    );
    cam.setRoundPixels(true);
    this.fitCameraZoom();
  }

  private fitCameraZoom(): void {
    const cam = this.cameras.main;
    cam.setZoom(this.scale.zoom < SMALL_SCREEN_ZOOM ? 2 : 1);
    const { x, y } = hexToPixel(LAYOUT, this.run.state.hydra.position);
    cam.centerOn(x, y);
  }

  private panTo(h: Hex): void {
    const { x, y } = hexToPixel(LAYOUT, h);
    this.cameras.main.pan(x, y, 300, 'Sine.easeOut');
  }

  private setUpInput(): void {
    // A full-screen zone catches presses on the map. HUD buttons sit in a scene above,
    // so pressing a button never reaches this zone.
    const { width, height } = this.scale.gameSize;
    const zone = this.add.zone(0, 0, width, height).setOrigin(0, 0).setScrollFactor(0).setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.press = { x: pointer.x, y: pointer.y, dragging: false };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.press || !pointer.isDown) return;
      if (!this.press.dragging && Phaser.Math.Distance.Between(this.press.x, this.press.y, pointer.x, pointer.y) > DRAG_THRESHOLD) {
        this.press.dragging = true;
      }
      if (this.press.dragging) {
        const cam = this.cameras.main;
        cam.stopFollow();
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const press = this.press;
      this.press = null;
      if (!press || press.dragging || this.animating) return;
      // Converted with this scene's camera: pointer.worldX may come from another scene's camera.
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const target = pixelToHex(LAYOUT, world.x, world.y);
      if (this.run.reachable().has(hexKey(target))) this.run.moveTo(target);
    });
  }
}
