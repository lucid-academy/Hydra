// Strategic map: the underground seen from a slant (like the battle board), drawn from the run state.
// Ground tiles in each biome's look, rock raised into blocks, decorations and objects standing on their hexes,
// lights at the lair, shrines and glowing fungi. Drag to look around; tap a highlighted hex to move there.

import * as Phaser from 'phaser';
import { GLOWING_DECORATIONS, MAP_COLUMN_WIDTH, MAP_FEET_BELOW_HEX_CENTER, MAP_ROCK_LIFT, MAP_ROW_HEIGHT, MAP_TILE } from '../assets/mapArt';
import type { DecorationKind } from '../assets/mapArt';
import { hex, hexKey, hexNeighbors, hexToPixel, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import type { MapObject, Tile } from '../sim/map';
import { Rng } from '../sim/rng';
import type { RunEvent } from '../sim/turn';
import { exposeReachable, exposeRunSummary, markReady } from '../testHooks';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';

const LAYOUT: HexLayout = { columnWidth: MAP_COLUMN_WIDTH, rowHeight: MAP_ROW_HEIGHT, originX: 0, originY: 0 };
const WORLD_MARGIN = 60;
/** Pointer must move this far (in screen pixels) before a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 6;
const STEP_DURATION_MS = 130;
/** Below this page zoom (small screens, e.g. phones) the map camera zooms in 2×, so hexes are big enough for fingers. */
const SMALL_SCREEN_ZOOM = 2;
/** Hexes seen before but out of sight now are drawn this much darker. */
const REMEMBERED_TINT = 0x808080;
/** A shrine that has given its blessing. */
const SPENT_TINT = 0x5a5a5a;
const BIOME_LABEL_MS = 2600;

// Ground lies flat at the bottom; everything that stands up is sorted by how low on the screen it stands.
const DEPTH = { ground: 0, mark: 5, standing: 10, glow: 30, fogEdge: 35 } as const;

/** Everything drawn for one hex, so it can be shown, dimmed or hidden together. */
interface HexView {
  tile: Tile;
  ground: Phaser.GameObjects.Image;
  props: Phaser.GameObjects.Image[];
  object: Phaser.GameObjects.Image | null;
  glows: Array<{ image: Phaser.GameObjects.Image; alpha: number }>;
  mark: Phaser.GameObjects.Image | null;
  fogEdge: Phaser.GameObjects.Image;
}

export class MapScene extends Phaser.Scene {
  private run!: RunController;
  private views = new Map<string, HexView>();
  private token!: Phaser.GameObjects.Image;
  private animating = false;
  private press: { x: number; y: number; dragging: boolean } | null = null;
  /** Biome names waiting to be shown, one after another (two at once would overlap). */
  private biomeNames: string[] = [];
  private showingBiomeName = false;

  constructor() {
    super(SceneKey.Map);
  }

  create(): void {
    const firstTime = !getRun(this);
    this.run = getRun(this) ?? startNewRun(this);
    const { near } = getContext(this).params;
    if (firstTime && near) this.run.placeNear(near);
    this.views = new Map();
    this.animating = false;
    this.press = null;
    this.biomeNames = [];
    this.showingBiomeName = false;
    this.cameras.main.setBackgroundColor(color(getContext(this).data.palette.underground.black));

    this.drawMap();
    this.token = this.add.image(0, 0, 'map_hydra').setOrigin(0.5, 1);
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
        const around = [tile.hex, ...hexNeighbors(tile.hex)].flatMap((h) => [h, ...hexNeighbors(h)]);
        const unexploredNear = new Set(around.map(hexKey).filter((k) => map.tiles.has(k) && !visibility.has(k))).size;
        return {
          x: (x - cam.worldView.x) * cam.zoom,
          y: (y - cam.worldView.y) * cam.zoom,
          cost,
          encounter: tile.object?.kind === 'encounter',
          object: tile.object?.kind ?? null,
          unexploredNear,
        };
      });
    });
    exposeRunSummary(() => {
      const { turn, resources, alert, pendingBattle, pendingShrine, visibility, hydra } = this.run.state;
      return {
        turn,
        muck: resources.muck,
        moisture: resources.moisture,
        bones: resources.bones,
        alert,
        inBattle: pendingBattle !== null,
        atShrine: pendingShrine !== null,
        blessings: hydra.blessings.length,
        explored: visibility.size,
      };
    });
    markReady(SceneKey.Map);
  }

  // ------------------------------------------------------------ building the map

  private drawMap(): void {
    const { data, seed } = getContext(this);
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      const rock = tile.terrain === 'rock';
      const ground = this.add.image(x, y, rock ? `map_rock_${tile.biome}` : `map_ground_${tile.biome}_${tile.terrain}`);
      // The image's anchor is the middle of the hex face (for rock: of the hex it stands on, below the raised top).
      const faceMiddle = MAP_TILE.faceHeight / 2 + (rock ? MAP_ROCK_LIFT : 0);
      ground.setOrigin(0.5, faceMiddle / ground.height);
      ground.setDepth(rock ? this.standingDepth(y + MAP_TILE.faceHeight / 2) : DEPTH.ground + y / 10000);

      const fogEdge = this.add.image(x, y, 'map_fog_edge').setDepth(DEPTH.fogEdge).setVisible(false);
      fogEdge.setOrigin(0.5, MAP_TILE.faceHeight / 2 / fogEdge.height);
      const view: HexView = {
        tile,
        ground,
        props: [],
        object: null,
        glows: [],
        mark: rock ? null : this.add.image(x, y, 'map_mark').setDepth(DEPTH.mark).setTint(color(data.palette.underground.bioluminescence)).setVisible(false),
        fogEdge,
      };
      if (!rock) this.decorate(view, x, y, (seed ^ Math.imul(tile.hex.q + 64, 73856093) ^ Math.imul(tile.hex.r + 64, 19349663)) >>> 0);
      this.views.set(hexKey(tile.hex), view);
      this.placeObject(view);
    }
  }

  /** A few small things on each open hex, picked from the biome's list; the same map always looks the same. */
  private decorate(view: HexView, x: number, y: number, seed: number): void {
    const biome = getContext(this).data.biomes.biomes[view.tile.biome];
    if (!biome || biome.decorations.length === 0 || view.tile.object) return;
    const rng = new Rng(seed);
    const count = rng.chance(0.25) ? 2 : rng.chance(0.75) ? 1 : 0;
    for (let i = 0; i < count; i++) {
      let kind: DecorationKind = rng.pick(biome.decorations);
      // Only reeds grow out of water.
      if (view.tile.terrain === 'water' && kind !== 'reeds') {
        if (!biome.decorations.includes('reeds')) continue;
        kind = 'reeds';
      }
      const px = x + rng.int(-9, 9);
      const py = y + rng.int(-4, 5);
      view.props.push(this.add.image(px, py, `map_deco_${kind}`).setOrigin(0.5, 1).setDepth(this.standingDepth(py)));
      if (GLOWING_DECORATIONS.includes(kind)) view.glows.push(this.glow(px, py - 9, biome.colors.glow, 0.55, 0.5));
    }
  }

  private objectKey(object: MapObject): string {
    return object.kind === 'encounter' ? `map_encounter_${Math.min(3, object.tier)}` : `map_${object.kind}`;
  }

  /** The object on a hex (lair, encounter, shrine...), standing on it, with its light if it has one. */
  private placeObject(view: HexView): void {
    const object = view.tile.object;
    if (!object) return;
    const { palette } = getContext(this).data;
    const { x, y } = hexToPixel(LAYOUT, view.tile.hex);
    const feet = object.kind === 'lair' ? y + 9 : y + MAP_FEET_BELOW_HEX_CENTER;
    const image = this.add.image(x, feet, this.objectKey(object)).setOrigin(0.5, 1).setDepth(this.standingDepth(feet));
    view.object = image;
    if (object.kind === 'lair') view.glows.push(this.glow(x, y, palette.underground.bioluminescence, 1.3, 0.45));
    if (object.kind === 'shrine') view.glows.push(this.glow(x, feet - 40, '#7fe0d6', 0.9, 0.55));
    if (object.kind === 'moisture') view.glows.push(this.glow(x, feet - 6, '#7fd0e0', 0.5, 0.45));
    if (object.kind === 'passage') view.glows.push(this.glow(x, feet - 8, '#d0e4dc', 0.8, 0.35));
    if (object.kind === 'encounter' && object.tier >= 3) view.glows.push(this.glow(x + 12, feet - 18, palette.order.orange, 0.6, 0.6));
  }

  private glow(x: number, y: number, tint: string, scale: number, alpha: number): { image: Phaser.GameObjects.Image; alpha: number } {
    const image = this.add.image(x, y, 'map_glow').setTint(color(tint)).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow);
    return { image, alpha };
  }

  private standingDepth(feetY: number): number {
    return DEPTH.standing + feetY / 1000;
  }

  // ------------------------------------------------------------ keeping it up to date

  /** Brings every hex in line with the run state: what is known, objects taken, where the hydra can go. */
  private refresh(): void {
    const { map, visibility } = this.run.state;
    for (const [key, view] of this.views) {
      const state = visibility.get(key);
      const known = state !== undefined;
      const tint = state === 'remembered' ? REMEMBERED_TINT : 0xffffff;
      if (view.object && map.tiles.get(key)!.object === null) {
        view.object.destroy();
        view.object = null;
        for (const glow of view.glows.splice(0)) glow.image.destroy();
      }
      for (const image of [view.ground, ...view.props, ...(view.object ? [view.object] : [])]) image.setVisible(known).setTint(tint);
      // A shrine whose blessing was taken goes dark.
      const object = map.tiles.get(key)!.object;
      if (object?.kind === 'shrine' && object.used) {
        view.object?.setTint(SPENT_TINT);
        for (const glow of view.glows.splice(0)) glow.image.destroy();
      }
      for (const glow of view.glows) glow.image.setVisible(known).setAlpha(state === 'remembered' ? glow.alpha * 0.4 : glow.alpha);
      // Known hexes at the edge of the unknown fade into the dark.
      const edge = known && hexNeighbors(view.tile.hex).some((n) => map.tiles.has(hexKey(n)) && !visibility.has(hexKey(n)));
      view.fogEdge.setVisible(edge).setAlpha(0.55);
      view.mark?.setVisible(false);
    }
    if (!this.run.state.pendingBattle) {
      for (const key of this.run.reachable().keys()) this.views.get(key)?.mark?.setVisible(true).setAlpha(0.75);
    }
    this.announceNewBiomes();
  }

  /** The first time the hydra sees a biome other than its own swamp, the biome's name comes up. */
  private announceNewBiomes(): void {
    const { biomes } = getContext(this).data;
    const { map, visibility } = this.run.state;
    for (const [key, state] of visibility) {
      if (state !== 'visible') continue;
      const biomeId = map.tiles.get(key)!.biome;
      if (this.run.knownBiomes.has(biomeId)) continue;
      this.run.knownBiomes.add(biomeId);
      const name = biomes.biomes[biomeId]?.displayName;
      if (name && biomeId !== biomes.lairBiome) this.biomeNames.push(name);
    }
    this.showNextBiomeName();
  }

  private showNextBiomeName(): void {
    const name = this.biomeNames.shift();
    if (name === undefined || this.showingBiomeName) {
      if (name !== undefined) this.biomeNames.unshift(name);
      return;
    }
    this.showingBiomeName = true;
    const { width } = this.scale.gameSize;
    const label = this.add
      // Below the HUD's short messages, so the two never overlap.
      .text(width / 2, 64, name, { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8e0d0', backgroundColor: '#05090acc', padding: { x: 8, y: 3 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.tweens.chain({
      targets: label,
      tweens: [
        { alpha: 1, duration: 400 },
        { alpha: 1, duration: BIOME_LABEL_MS - 900 },
        { alpha: 0, duration: 500 },
      ],
      onComplete: () => {
        label.destroy();
        this.showingBiomeName = false;
        this.showNextBiomeName();
      },
    });
  }

  private animate(events: RunEvent[]): void {
    const moved = events.find((e) => e.type === 'moved');
    if (!moved || moved.path.length === 0) return;
    this.animating = true;
    for (const view of this.views.values()) view.mark?.setVisible(false);
    this.tweens.chain({
      targets: this.token,
      tweens: moved.path.map((step) => ({ ...this.tokenPosition(step), duration: STEP_DURATION_MS })),
      onUpdate: () => this.token.setDepth(this.standingDepth(this.token.y) + 0.0005),
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
    return { x, y: y + MAP_FEET_BELOW_HEX_CENTER };
  }

  private placeToken(h: Hex): void {
    const { x, y } = this.tokenPosition(h);
    this.token.setPosition(x, y).setDepth(this.standingDepth(y) + 0.0005);
  }

  // ------------------------------------------------------------ camera

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
    cam.setBounds(minX - WORLD_MARGIN, minY - WORLD_MARGIN, maxX - minX + WORLD_MARGIN * 2, maxY - minY + WORLD_MARGIN * 2);
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

  /** Moves the view to a hex (used by the minimap). */
  lookAt(h: Hex): void {
    this.panTo(h);
  }

  // ------------------------------------------------------------ input

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
      const tapped = pixelToHex(LAYOUT, world.x, world.y);
      // Things stand up from their hex, so a tap on their upper part lands on the hex behind: try the hexes in front too.
      const reachable = this.run.reachable();
      const target = [tapped, hex(tapped.q, tapped.r + 1), hex(tapped.q - 1, tapped.r + 1)].find((h) => reachable.has(hexKey(h)));
      if (target) this.run.moveTo(target);
    });
  }
}
