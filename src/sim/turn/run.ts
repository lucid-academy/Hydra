// State of one run on the strategic map, and the commands that change it.
// Commands mutate the state and return events, which the scenes use to animate and show messages.

import type { BattleResult, BattleSetup, HeadRecord } from '../battle';
import { hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { generateUnderground, hexesSeenFrom, updateVisibility } from '../map';
import type { HexMap, TerrainTable, Visibility } from '../map';
import { Rng } from '../rng';

export interface RunRules {
  movementPointsPerTurn: number;
  sightRangeHexes: number;
  terrain: TerrainTable;
  alertMin: number;
  alertMax: number;
  alertPerHexDiscovered: number;
  alertPerBattle: number;
  generator: Parameters<typeof generateUnderground>[1];
  bodyMaxHp: number;
  startingHeads: ReadonlyArray<{ classId: string; maxHp: number }>;
  headNames: readonly string[];
  healing: { bodyHpPerTurn: number; headHpPerTurn: number };
  /** Enemy type ids for each encounter group id. */
  encounterGroupMembers: Readonly<Record<string, readonly string[]>>;
}

export interface Hydra {
  position: Hex;
  movementLeft: number;
  bodyHp: number;
  bodyMaxHp: number;
  heads: HeadRecord[];
  /** Stumps burnt shut: they stay for the rest of the run (until the lair can heal them, M2). */
  scars: number;
}

export interface RunState {
  readonly seed: number;
  turn: number;
  map: HexMap;
  hydra: Hydra;
  visibility: Visibility;
  /** 0–100. Stored with fractions; show it rounded down. */
  alert: number;
  resources: { muck: number };
  /** The encounter the hydra stepped on, until its battle is resolved. */
  pendingBattle: { at: Hex; groupId: string } | null;
  battlesFought: number;
  /** Next free number for ids of heads grown in battles. */
  nextId: number;
  /** The hydra died: this run is over. */
  over: boolean;
}

export type RunEvent =
  | { type: 'moved'; path: Hex[] }
  | { type: 'discovered'; count: number }
  | { type: 'collected'; resource: 'muck'; amount: number; at: Hex }
  | { type: 'battleStarted'; at: Hex }
  | { type: 'battleWon'; at: Hex }
  | { type: 'hydraDied' }
  | { type: 'turnEnded'; turn: number };

export function createRun(seed: number, rules: RunRules): RunState {
  const map = generateUnderground(seed, rules.generator, rules.terrain);
  // A separate stream from the map's, so changing starting heads never changes the map.
  const rng = new Rng((seed ^ 0x5eed) >>> 0);
  const names = [...rules.headNames];
  const heads = rules.startingHeads.map((h, i) => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0] ?? `Head ${i + 1}`;
    return { id: `h${i + 1}`, name, classId: h.classId, level: 1, hp: h.maxHp, maxHp: h.maxHp };
  });

  const state: RunState = {
    seed,
    turn: 1,
    map,
    hydra: {
      position: map.lair,
      movementLeft: rules.movementPointsPerTurn,
      bodyHp: rules.bodyMaxHp,
      bodyMaxHp: rules.bodyMaxHp,
      heads,
      scars: 0,
    },
    visibility: new Map(),
    alert: rules.alertMin,
    resources: { muck: 0 },
    pendingBattle: null,
    battlesFought: 0,
    nextId: heads.length + 1,
    over: false,
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
  if (state.over || state.pendingBattle) return new Map();
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
      state.pendingBattle = { at: step, groupId: tile.object.groupId };
      break;
    }
  }

  events.unshift({ type: 'moved', path: walked });
  if (discovered > 0) {
    raiseAlert(state, discovered * rules.alertPerHexDiscovered, rules);
    events.push({ type: 'discovered', count: discovered });
  }
  if (state.pendingBattle) events.push({ type: 'battleStarted', at: state.pendingBattle.at });
  return events;
}

/** Everything the battle simulation needs to start the pending battle. */
export function pendingBattleSetup(state: RunState, rules: RunRules): BattleSetup | null {
  const pending = state.pendingBattle;
  if (!pending) return null;
  const enemies = rules.encounterGroupMembers[pending.groupId];
  if (!enemies) throw new Error(`Unknown encounter group "${pending.groupId}"`);
  return {
    // Every battle of a run gets its own seed, derived from the run seed.
    seed: (Math.imul(state.seed ^ 0x9e3779b9, state.battlesFought + 1) ^ Math.imul(pending.at.q, 73856093) ^ Math.imul(pending.at.r, 19349663)) >>> 0,
    heads: state.hydra.heads.map((h) => ({ ...h })),
    bodyHp: state.hydra.bodyHp,
    bodyMaxHp: state.hydra.bodyMaxHp,
    enemies,
    firstFreeId: state.nextId,
  };
}

/** Applies a finished battle: new head line-up, body HP, scars; the encounter is cleared if won. */
export function finishBattle(state: RunState, result: BattleResult, rules: RunRules): RunEvent[] {
  const pending = state.pendingBattle;
  if (!pending) return [];
  state.pendingBattle = null;
  state.battlesFought += 1;
  state.nextId = result.nextId;
  state.hydra.heads = result.heads.map((h) => ({ ...h }));
  state.hydra.bodyHp = result.bodyHp;
  state.hydra.scars += result.newScars;
  raiseAlert(state, rules.alertPerBattle, rules);

  if (result.outcome === 'lost') {
    state.over = true;
    return [{ type: 'hydraDied' }];
  }
  const tile = state.map.tiles.get(hexKey(pending.at));
  if (tile?.object?.kind === 'encounter') tile.object = null;
  return [{ type: 'battleWon', at: pending.at }];
}

export function endTurn(state: RunState, rules: RunRules): RunEvent[] {
  if (state.pendingBattle || state.over) return [];
  state.turn += 1;
  state.hydra.movementLeft = rules.movementPointsPerTurn;
  state.hydra.bodyHp = Math.min(state.hydra.bodyMaxHp, state.hydra.bodyHp + rules.healing.bodyHpPerTurn);
  for (const head of state.hydra.heads) head.hp = Math.min(head.maxHp, head.hp + rules.healing.headHpPerTurn);
  return [{ type: 'turnEnded', turn: state.turn }];
}

function raiseAlert(state: RunState, amount: number, rules: RunRules): void {
  state.alert = Math.min(rules.alertMax, Math.max(rules.alertMin, state.alert + amount));
}
