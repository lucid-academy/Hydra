// Shared, read-only information every scene can reach: validated data, the run seed and URL params.

import type * as Phaser from 'phaser';
import type { GameData } from '../data';
import type { UrlParams } from '../urlParams';

export interface GameContext {
  data: GameData;
  seed: number;
  params: UrlParams;
}

const REGISTRY_KEY = 'context';

export function setContext(game: Phaser.Game, context: GameContext): void {
  game.registry.set(REGISTRY_KEY, context);
}

export function getContext(scene: Phaser.Scene): GameContext {
  const context = scene.registry.get(REGISTRY_KEY) as GameContext | undefined;
  if (!context) throw new Error('Game context missing: was setContext() called in main.ts?');
  return context;
}

/** Converts "#rrggbb" from the palette into the number Phaser expects. */
export function color(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}
