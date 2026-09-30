// Test and debug parameters read from the page URL:
//   ?seed=123     replay the same run
//   ?scene=title  jump straight to a scene
//   ?debug=1      show the debug overlay
//   ?group=patrol with ?scene=battle: which enemy group to fight

import { seedFromString } from './sim/rng';

export interface UrlParams {
  /** Seed from the URL, or null if none was given. */
  seed: number | null;
  /** Scene key to start in, or null for the normal flow. */
  scene: string | null;
  debug: boolean;
  /** Enemy group for a test battle, or null for the default. */
  group: string | null;
}

export function parseUrlParams(search: string): UrlParams {
  const params = new URLSearchParams(search);
  const seedText = params.get('seed');
  const scene = params.get('scene');
  const debug = params.get('debug');
  const group = params.get('group');
  return {
    seed: seedText !== null && seedText.trim() !== '' ? seedFromString(seedText) : null,
    scene: scene !== null && scene.trim() !== '' ? scene.trim() : null,
    debug: debug === '1' || debug === 'true',
    group: group !== null && group.trim() !== '' ? group.trim() : null,
  };
}
