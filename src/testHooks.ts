// A tiny window.__hydra object for automated screenshots and smoke tests:
// which scenes have finished drawing, and where on screen the map's clickable hexes are.

export interface ScreenPoint {
  x: number;
  y: number;
  /** Movement points needed to get there. */
  cost: number;
  /** There is an encounter on this hex: walking there starts a battle. */
  encounter: boolean;
  /** Kind of object on this hex (shrine, muck...), or null. */
  object: string | null;
  /** How many hexes not seen yet would be within sight from there. */
  unexploredNear: number;
}

declare global {
  interface Window {
    __hydra?: {
      readyScenes: string[];
      /** Screen positions (in game pixels, 640×360) of hexes the hydra can reach now. */
      reachableOnScreen?: () => ScreenPoint[];
      /** Short summary of the current battle; positions in game pixels (640×360). */
      battleSummary?: () => {
        tick: number;
        outcome: string | null;
        paused: boolean;
        enemies: Array<{ id: number; typeId: string; x: number; y: number }>;
        heads: Array<{ id: string; classId: string; x: number; y: number }>;
        /** Ids of the heads the player has picked. */
        selected: string[];
        /** Middle of each head card on screen. */
        cards: Array<{ id: string; x: number; y: number }>;
        /** Enemy each head was ordered to attack (null = none). */
        orders: Record<string, number | null>;
        clouds: number;
        combos: string[];
      };
      /** Short summary of the current run. */
      runSummary?: () => {
        turn: number;
        muck: number;
        moisture: number;
        bones: number;
        alert: number;
        inBattle: boolean;
        /** Standing at a shrine, waiting for Accept or Refuse. */
        atShrine: boolean;
        blessings: number;
        explored: number;
      };
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
