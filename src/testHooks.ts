// A tiny window.__hydra object for automated screenshots and smoke tests:
// which scenes have finished drawing, and where on screen the map's clickable hexes are.

export interface ScreenPoint {
  x: number;
  y: number;
  cost: number;
}

declare global {
  interface Window {
    __hydra?: {
      readyScenes: string[];
      /** Screen positions (in game pixels, 640×360) of hexes the hydra can reach now. */
      reachableOnScreen?: () => ScreenPoint[];
      /** Short summary of the current run. */
      /** Short summary of the current battle; positions in game pixels (640×360). */
      battleSummary?: () => { tick: number; outcome: string | null; enemies: Array<{ x: number; y: number }>; heads: number };
      runSummary?: () => { turn: number; muck: number; alert: number; inBattle: boolean; explored: number };
    };
  }
}

function hooks(): NonNullable<Window['__hydra']> {
  window.__hydra ??= { readyScenes: [] };
  return window.__hydra;
}

export function markReady(sceneKey: string): void {
  hooks().readyScenes.push(sceneKey);
}

export function exposeReachable(probe: () => ScreenPoint[]): void {
  hooks().reachableOnScreen = probe;
}

export function exposeRunSummary(summary: NonNullable<Window['__hydra']>['runSummary']): void {
  hooks().runSummary = summary;
}

export function exposeBattleSummary(summary: NonNullable<Window['__hydra']>['battleSummary']): void {
  hooks().battleSummary = summary;
}
