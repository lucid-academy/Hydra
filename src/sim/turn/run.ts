// State of one run on the strategic map, and the commands that change it.
// Commands mutate the state and return events, which the scenes use to animate and show messages.

import { hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { generateUnderground, hexesSeenFrom, updateVisibility } from '../map';
import type { HexMap, TerrainTable, Visibility } from '../map';

export interface RunRules {
  movementPointsPerTurn: number;
  sightRangeHexes: number;
  terrain: TerrainTable;
  alertMin: number;
  alertMax: number;
  alertPerHexDiscovered: number;
  alertPerBattle: number;
  generator: Parameters<typeof generateUnderground>[1];
}

export interface RunState {
  readonly seed: number;
  turn: number;
  map: HexMap;
  hydra: { position: Hex; movementLeft: number };
  visibility: Visibility;
  /** 0–100. Stored with fractions; show it rounded down. */
  alert: number;
  resources: { muck: number };
  /** Hex of the encounter the hydra stepped on, until the battle is resolved. */
  pendingBattle: Hex | null;
}

export type RunEvent =
  | { type: 'moved'; path: Hex[] }
  | { type: 'discovered'; count: number }
  | { type: 'collected'; resource: 'muck'; amount: number; at: Hex }
  | { type: 'battleStarted'; at: Hex }
  | { type: 'battleWon'; at: Hex }
  | { type: 'turnEnded'; turn: number };

export function createRun(seed: number, rules: RunRules): RunState {
  const map = generateUnderground(seed, rules.generator, rules.terrain);
  const state: RunState = {
    seed,
    turn: 1,
    map,
    hydra: { position: map.lair, movementLeft: rules.movementPointsPerTurn },
    visibility: new Map(),
    alert: rules.alertMin,
    resources: { muck: 0 },
    pendingBattle: null,
  };
  // Seeing the lair's surroundings at the start doesn't count as exploring.
  updateVisibility(state.visibility, hexesSeenFrom(map, map.lair, rules.sightRangeHexes, rules.terrain));
  return state;
}

export interface Reachable {
  cost: number;
  /** Steps from the hydra's position (excluded) to the target (included). */
  path: Hex[];
}

/**
 * Hexes the hydra can reach this turn, with the cheapest path to each.
 * Only known (explored) hexes can be crossed. Encounters can be entered but not crossed.
 */
export function reachableHexes(state: RunState, rules: RunRules): Map<string, Reachable> {
  const start = state.hydra.position;
  const best = new Map<string, Reachable>([[hexKey(start), { cost: 0, path: [] }]]);
  const frontier: Hex[] = [start];
  while (frontier.length > 0) {
    // The map is small, so a simple "take the cheapest" beats a priority queue for readability.
    frontier.sort((a, b) => best.get(hexKey(a))!.cost - best.get(hexKey(b))!.cost);
    const current = frontier.shift()!;
    const here = best.get(hexKey(current))!;
    const tile = state.map.tiles.get(hexKey(current))!;
    if (!hexEquals(current, start) && tile.object?.kind === 'encounter') continue;
    for (const next of hexNeighbors(current)) {
      const key = hexKey(next);
      const nextTile = state.map.tiles.get(key);
      if (!nextTile || !state.visibility.has(key)) continue;
      const stepCost = rules.terrain[nextTile.terrain].moveCost;
      if (stepCost === null) continue;
      const cost = here.cost + stepCost;
      if (cost > state.hydra.movementLeft) continue;
      const known = best.get(key);
      if (known && known.cost <= cost) continue;
      best.set(key, { cost, path: [...here.path, next] });
      frontier.push(next);
    }
  }
  best.delete(hexKey(start));
  return best;
}

/** Moves the hydra step by step, revealing the map as it goes. Does nothing if the target is out of reach. */
export function moveHydra(state: RunState, target: Hex, rules: RunRules): RunEvent[] {
  if (state.pendingBattle) return [];
  const route = reachableHexes(state, rules).get(hexKey(target));
  if (!route) return [];

  const events: RunEvent[] = [];
  const walked: Hex[] = [];
  let discovered = 0;
  for (const step of route.path) {
    const tile = state.map.tiles.get(hexKey(step))!;
    state.hydra.movementLeft -= rules.terrain[tile.terrain].moveCost!;
    state.hydra.position = step;
    walked.push(step);
    discovered += updateVisibility(state.visibility, hexesSeenFrom(state.map, step, rules.sightRangeHexes, rules.terrain));

    if (tile.object?.kind === 'muck') {
      state.resources.muck += tile.object.amount;
      events.push({ type: 'collected', resource: 'muck', amount: tile.object.amount, at: step });
      tile.object = null;
    }
    if (tile.object?.kind === 'encounter') {
      state.pendingBattle = step;
      break;
    }
  }

  events.unshift({ type: 'moved', path: walked });
  if (discovered > 0) {
    raiseAlert(state, discovered * rules.alertPerHexDiscovered, rules);
    events.push({ type: 'discovered', count: discovered });
  }
  if (state.pendingBattle) events.push({ type: 'battleStarted', at: state.pendingBattle });
  return events;
}

/** Temporary until battles exist (M1 part B): the pending battle counts as won. */
export function winPendingBattle(state: RunState, rules: RunRules): RunEvent[] {
  const at = state.pendingBattle;
  if (!at) return [];
  state.map.tiles.get(hexKey(at))!.object = null;
  state.pendingBattle = null;
  raiseAlert(state, rules.alertPerBattle, rules);
  return [{ type: 'battleWon', at }];
}

export function endTurn(state: RunState, rules: RunRules): RunEvent[] {
  if (state.pendingBattle) return [];
  state.turn += 1;
  state.hydra.movementLeft = rules.movementPointsPerTurn;
  return [{ type: 'turnEnded', turn: state.turn }];
}

function raiseAlert(state: RunState, amount: number, rules: RunRules): void {
  state.alert = Math.min(rules.alertMax, Math.max(rules.alertMin, state.alert + amount));
}
