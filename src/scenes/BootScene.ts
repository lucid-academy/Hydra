// Loads every image listed in the manifest (or draws its placeholder), then starts the first scene.

import * as Phaser from 'phaser';
import { placeholderFor } from '../assets/placeholders';
import { getContext } from './context';
import { SceneKey, startableScenes } from './sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    const { manifest } = getContext(this).data;
    for (const [key, entry] of Object.entries(manifest.images)) {
      if (entry.file !== null) this.load.image(key, entry.file);
    }
  }

  create(): void {
    const { data, params } = getContext(this);
    for (const [key, entry] of Object.entries(data.manifest.images)) {
      if (entry.file !== null) continue;
      const draw = placeholderFor(key);
      if (!draw) throw new Error(`Manifest image "${key}" has no file and no placeholder drawer.`);
      draw(this, key, entry.width, entry.height, data.palette, data);
    }

    let first: string = SceneKey.Title;
    if (params.scene !== null) {
      if (startableScenes.includes(params.scene)) first = params.scene;
      else console.warn(`?scene=${params.scene} is unknown. Available: ${startableScenes.join(', ')}`);
    }

    this.scene.start(first);
    if (params.debug) this.scene.launch(SceneKey.DebugOverlay);
  }
}
