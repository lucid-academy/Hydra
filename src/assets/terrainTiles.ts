// Turns ground and rock textures into hex tiles when the game starts (the pixel work is in terrain.ts).
// A tile gets cut variants only if its texture has a file and the tile itself has none; otherwise the game
// keeps drawing the tile's own image or its placeholder.

import type * as Phaser from 'phaser';
import type { GameData } from '../data';
import { TILE } from './battleArt';
import { MAP_ROCK_LIFT, MAP_TILE } from './mapArt';
import { cutTile, GROUND_SHADING, groundTextureKey, ROCK_SHADING, rockTextureKey, seedOf, TERRAIN_VARIANTS, variantKey } from './terrain';
import type { Pixels, TileShading, TileShape } from './terrain';

const MAP_GROUND: TileShape = { width: MAP_TILE.width, faceHeight: MAP_TILE.faceHeight, wallDepth: MAP_TILE.wallHeight };
const MAP_ROCK: TileShape = { width: MAP_TILE.width, faceHeight: MAP_TILE.faceHeight, wallDepth: MAP_ROCK_LIFT + MAP_TILE.wallHeight };
const BATTLE_GROUND: TileShape = { width: TILE.width, faceHeight: TILE.faceHeight, wallDepth: TILE.wallHeight };

/** The battle tile key for a hex of the given terrain. Cut variants exist per terrain; images and placeholders per ground/water. */
export const battleTileKey = (biome: string, terrain: string, cut: boolean): string =>
  cut ? `battle_tile_${biome}_${terrain}` : `battle_tile_${biome}_${terrain === 'water' ? 'water' : 'ground'}`;

export function buildTerrainTiles(scene: Phaser.Scene, data: GameData): void {
  const hasFile = (key: string): boolean => (data.manifest.images[key]?.file ?? null) !== null;
  const read = memo((key: string) => readPixels(scene, key));
  for (const [biome, def] of Object.entries(data.biomes.biomes)) {
    const rock = hasFile(rockTextureKey(biome)) ? read(rockTextureKey(biome)) : null;
    for (const terrain of Object.keys(def.ground)) {
      if (!hasFile(groundTextureKey(biome, terrain))) continue;
      const ground = read(groundTextureKey(biome, terrain));
      const walls = rock ?? ground;
      if (!hasFile(`map_ground_${biome}_${terrain}`)) addVariants(scene, `map_ground_${biome}_${terrain}`, ground, walls, MAP_GROUND, GROUND_SHADING);
      if (!hasFile(battleTileKey(biome, terrain, false))) addVariants(scene, battleTileKey(biome, terrain, true), ground, walls, BATTLE_GROUND, GROUND_SHADING);
    }
    if (rock && !hasFile(`map_rock_${biome}`)) addVariants(scene, `map_rock_${biome}`, rock, rock, MAP_ROCK, ROCK_SHADING);
  }
}

/** The image to draw for a tile: one of its cut variants if the game made them, else the tile's own image or placeholder. */
export function tileVariant(textures: Phaser.Textures.TextureManager, tileKey: string, seed: number): string {
  return textures.exists(variantKey(tileKey, 0)) ? variantKey(tileKey, (seed >>> 0) % TERRAIN_VARIANTS) : tileKey;
}

function addVariants(scene: Phaser.Scene, tileKey: string, face: Pixels, walls: Pixels, shape: TileShape, shading: TileShading): void {
  for (let i = 0; i < TERRAIN_VARIANTS; i++) {
    const tile = cutTile(face, walls, shape, shading, seedOf(variantKey(tileKey, i)));
    const canvas = document.createElement('canvas');
    canvas.width = tile.width;
    canvas.height = tile.height;
    canvas.getContext('2d')!.putImageData(new ImageData(tile.data, tile.width, tile.height), 0, 0);
    scene.textures.addCanvas(variantKey(tileKey, i), canvas);
  }
}

function readPixels(scene: Phaser.Scene, key: string): Pixels {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

function memo<T>(make: (key: string) => T): (key: string) => T {
  const cache = new Map<string, T>();
  return (key) => {
    if (!cache.has(key)) cache.set(key, make(key));
    return cache.get(key)!;
  };
}
