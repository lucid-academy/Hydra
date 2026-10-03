// Loads every image listed in the manifest (or draws its placeholder), cuts hex tiles out of terrain textures,
// then starts the first scene.

import * as Phaser from 'phaser';
import { placeholderFor } from '../assets/placeholders';
import { isTerrainTextureKey } from '../assets/terrain';
import { buildTerrainTiles } from '../assets/terrainTiles';
import { getContext } from './context';
import { SceneKey, startableScenes } from './sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    const { manifest } = getContext(this).data;
    for (const [key, entry] of Object.entries(manifest.images)) {
      if (entry.file === null) continue;
      // An animation: its frames side by side in one file, each width × height.
      if (entry.frames !== undefined) this.load.spritesheet(key, entry.file, { frameWidth: entry.width, frameHeight: entry.height });
      else this.load.image(key, entry.file);
    }
  }

  create(): void {
    const { data, params } = getContext(this);
    for (const [key, entry] of Object.entries(data.manifest.images)) {
      if (entry.file !== null || isTerrainTextureKey(key)) continue;
      const draw = placeholderFor(key);
      if (!draw) throw new Error(`Manifest image "${key}" has no file and no placeholder drawer.`);
      draw(this, key, entry.width, entry.height, data.palette, data);
    }
    buildTerrainTiles(this, data);

    let first: string = SceneKey.Title;
    if (params.scene !== null) {
      if (startableScenes.includes(params.scene)) first = params.scene;
      else console.warn(`?scene=${params.scene} is unknown. Available: ${startableScenes.join(', ')}`);
    }

    this.scene.start(first);
    if (params.debug) this.scene.launch(SceneKey.DebugOverlay);
  }
}
