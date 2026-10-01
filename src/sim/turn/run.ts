// State of one run on the strategic map, and the commands that change it.
// Commands mutate the state and return events, which the scenes use to animate and show messages.

import type { BattleResult, BattleSetup, HeadRecord } from '../battle';
import { hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { generateUnderground, hexesSeenFrom, updateVisibility } from '../map';
import type { HexMap, MapObject, TerrainTable, Visibility } from '../map';
import { Rng } from '../rng';

/** What a blessing of the Great Serpent changes (shrines.json). Missing = no change. */
export interface BlessingEffects {
  /** Movement points per turn. */
  movement?: number;
  /** Sight range in hexes. */
  sight?: number;
  bodyMaxHp?: number;
  /** Body HP healed at the end of every turn. */
  regeneration?: number;
  /** Paid at once: */
  alert?: number;
  muck?: number;
  moisture?: number;
}

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
  /** Classes a new head can have, when a healed scar grows heads in the lair. */
  hatchlingClasses: ReadonlyArray<{ classId: string; maxHp: number }>;
  maxHeads: number;
  headNames: readonly string[];
  healing: { bodyHpPerTurn: number; headHpPerTurn: number };
  /** Bones taken from every human of a group beaten in battle. */
  bonesPerEnemy: number;
  /** Enemy type ids for each encounter group id. */
  encounterGroupMembers: Readonly<Record<string, readonly string[]>>;
  /** What each blessing (by id) does. */
  blessings: Readonly<Record<string, BlessingEffects>>;
}

export interface Hydra {
  position: Hex;
  movementLeft: number;
  /** Movement points at the start of each turn (blessings can change it). */
  movementPerTurn: number;
  /** How far the hydra sees, in hexes. */
  sightRange: number;
  bodyHp: number;
  bodyMaxHp: number;
  /** Body HP healed at the end of every turn. */
  regeneration: number;
  heads: HeadRecord[];
  /** Stumps burnt shut. Resting in the lair heals them, and they grow heads again. */
  scars: number;
  /** Blessings accepted so far (ids from shrines.json). */
  blessings: string[];
}

export interface Resources {
  muck: number;
  moisture: number;
  bones: number;
}

export interface RunState {
  readonly seed: number;
  turn: number;
  map: HexMap;
  hydra: Hydra;
  visibility: Visibility;
  /** 0–100. Stored with fractions; show it rounded down. */
  alert: number;
  resources: Resources;
  /** The encounter the hydra stepped on, until its battle is resolved. */
  pendingBattle: { at: Hex; groupId: string } | null;
  /** The shrine the hydra stands at, until its blessing is accepted or refused. */
  pendingShrine: Hex | null;
  battlesFought: number;
  /** Next free number for ids of heads grown in battles. */
  nextId: number;
  /** Random numbers for things that happen on the map (e.g. which heads grow from a healed scar). */
  rngState: number;
  /** The hydra died: this run is over. */
  over: boolean;
}

export type RunEvent =
  | { type: 'moved'; path: Hex[] }
  | { type: 'discovered'; count: number }
  | { type: 'collected'; resource: 'muck' | 'moisture'; amount: number; at: Hex }
  | { type: 'battleStarted'; at: Hex }
  | { type: 'battleWon'; at: Hex; bones: number }
  | { type: 'shrineReached'; at: Hex; blessingId: string }
  | { type: 'blessingAccepted'; blessingId: string }
  | { type: 'blessingRefused'; blessingId: string }
  | { type: 'rested'; healedScars: number; newHeadIds: string[] }
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
      movementPerTurn: rules.movementPointsPerTurn,
      sightRange: rules.sightRangeHexes,
      bodyHp: rules.bodyMaxHp,
      bodyMaxHp: rules.bodyMaxHp,
      regeneration: rules.healing.bodyHpPerTurn,
      heads,
      scars: 0,
      blessings: [],
    },
    visibility: new Map(),
    alert: rules.alertMin,
    resources: { muck: 0, moisture: 0, bones: 0 },
    pendingBattle: null,
    pendingShrine: null,
    battlesFought: 0,
    nextId: heads.length + 1,
    rngState: rng.getState(),
    over: false,
  };
  // Seeing the lair's surroundings at the start doesn't count as exploring.
  updateVisibility(state.visibility, hexesSeenFrom(map, map.lair, state.hydra.sightRange, rules.terrain));
  return state;
}

/** The hydra is busy: a battle or a shrine waits for an answer, or it is dead. Nothing else can happen until then. */
function isWaiting(state: RunState): boolean {
  return state.over || state.pendingBattle !== null || state.pendingShrine !== null;
}

/** Objects the hydra stops at when it walks onto them, and can't walk through. */
function stopsTheHydra(object: MapObject | null): boolean {
  return object?.kind === 'encounter' || (object?.kind === 'shrine' && !object.used);
}

export interface Reachable {
  cost: number;
  /** Steps from the hydra's position (excluded) to the target (included). */
  path: Hex[];
}

/**
 * Hexes the hydra can reach this turn, with the cheapest path to each.
 * Only known (explored) hexes can be crossed. Encounters and unused shrines can be entered but not crossed.
 */
export function reachableHexes(state: RunState, rules: RunRules): Map<string, Reachable> {
  const start = state.hydra.position;
  const best = new Map<string, Reachable>([[hexKey(start), { cost: 0, path: [] }]]);
  if (isWaiting(state)) return new Map();
  const frontier: Hex[] = [start];
  while (frontier.length > 0) {
    // A simple "take the cheapest" is enough here and easier to read than a priority queue.
    frontier.sort((a, b) => best.get(hexKey(a))!.cost - best.get(hexKey(b))!.cost);
    const current = frontier.shift()!;
    const here = best.get(hexKey(current))!;
    const tile = state.map.tiles.get(hexKey(current))!;
    if (!hexEquals(current, start) && stopsTheHydra(tile.object)) continue;
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
    discovered += updateVisibility(state.visibility, hexesSeenFrom(state.map, step, state.hydra.sightRange, rules.terrain));

    const object = tile.object;
    if (object?.kind === 'muck' || object?.kind === 'moisture') {
      state.resources[object.kind] += object.amount;
      events.push({ type: 'collected', resource: object.kind, amount: object.amount, at: step });
      tile.object = null;
    }
    if (object?.kind === 'encounter') {
      state.pendingBattle = { at: step, groupId: object.groupId };
      break;
    }
    if (object?.kind === 'shrine' && !object.used) {
      state.pendingShrine = step;
      events.push({ type: 'shrineReached', at: step, blessingId: object.blessingId });
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

// ---------------------------------------------------------------- shrines

function pendingShrineObject(state: RunState): Extract<MapObject, { kind: 'shrine' }> | null {
  if (!state.pendingShrine) return null;
  const object = state.map.tiles.get(hexKey(state.pendingShrine))?.object;
  return object?.kind === 'shrine' ? object : null;
}

/** Takes the blessing of the shrine the hydra stands at: its effects apply now, and the shrine has nothing more to give. */
export function acceptBlessing(state: RunState, rules: RunRules): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  const effects = rules.blessings[shrine.blessingId];
  if (!effects) throw new Error(`Unknown blessing "${shrine.blessingId}"`);
  applyBlessing(state, effects, rules);
  shrine.used = true;
  state.hydra.blessings.push(shrine.blessingId);
  state.pendingShrine = null;
  return [{ type: 'blessingAccepted', blessingId: shrine.blessingId }];
}

/** Walks away from the shrine; it keeps its blessing for later. */
export function refuseBlessing(state: RunState): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  state.pendingShrine = null;
  return [{ type: 'blessingRefused', blessingId: shrine.blessingId }];
}

function applyBlessing(state: RunState, effects: BlessingEffects, rules: RunRules): void {
  const { hydra } = state;
  if (effects.movement) {
    const before = hydra.movementPerTurn;
    hydra.movementPerTurn = Math.max(1, hydra.movementPerTurn + effects.movement);
    // Felt at once: this turn's movement changes by the same amount.
    hydra.movementLeft = Math.max(0, hydra.movementLeft + (hydra.movementPerTurn - before));
  }
  if (effects.sight) {
    hydra.sightRange = Math.max(1, hydra.sightRange + effects.sight);
    updateVisibility(state.visibility, hexesSeenFrom(state.map, hydra.position, hydra.sightRange, rules.terrain));
  }
  if (effects.bodyMaxHp) {
    const before = hydra.bodyMaxHp;
    hydra.bodyMaxHp = Math.max(20, hydra.bodyMaxHp + effects.bodyMaxHp);
    hydra.bodyHp = Math.max(1, Math.min(hydra.bodyMaxHp, hydra.bodyHp + (hydra.bodyMaxHp - before)));
  }
  if (effects.regeneration) hydra.regeneration = Math.max(0, hydra.regeneration + effects.regeneration);
  if (effects.alert) raiseAlert(state, effects.alert, rules);
  if (effects.muck) state.resources.muck = Math.max(0, state.resources.muck + effects.muck);
  if (effects.moisture) state.resources.moisture = Math.max(0, state.resources.moisture + effects.moisture);
}

// ---------------------------------------------------------------- battles

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

/** Applies a finished battle: new head line-up, body HP, scars; if won, the encounter is cleared and its people give Bones. */
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
  const bones = (rules.encounterGroupMembers[pending.groupId]?.length ?? 0) * rules.bonesPerEnemy;
  state.resources.bones += bones;
  return [{ type: 'battleWon', at: pending.at, bones }];
}

// ---------------------------------------------------------------- turns and the lair

/**
 * Ends the turn: movement comes back, the body and heads heal a little.
 * Ending it in the lair is resting: everything heals fully, and burnt stumps heal and grow heads again.
 */
export function endTurn(state: RunState, rules: RunRules): RunEvent[] {
  if (isWaiting(state)) return [];
  const { hydra } = state;
  const events: RunEvent[] = [];
  state.turn += 1;
  hydra.movementLeft = hydra.movementPerTurn;
  hydra.bodyHp = Math.min(hydra.bodyMaxHp, hydra.bodyHp + hydra.regeneration);
  for (const head of hydra.heads) head.hp = Math.min(head.maxHp, head.hp + rules.healing.headHpPerTurn);

  if (hexEquals(hydra.position, state.map.lair)) {
    hydra.bodyHp = hydra.bodyMaxHp;
    for (const head of hydra.heads) head.hp = head.maxHp;
    const healedScars = hydra.scars;
    hydra.scars = 0;
    const newHeadIds = growHeads(state, rules, healedScars * 2);
    events.push({ type: 'rested', healedScars, newHeadIds });
  }
  events.push({ type: 'turnEnded', turn: state.turn });
  return events;
}

/** New hatchling heads (random class and name), as many as fit under the head limit. */
function growHeads(state: RunState, rules: RunRules, count: number): string[] {
  const rng = Rng.fromState(state.rngState);
  const ids: string[] = [];
  for (let i = 0; i < count && state.hydra.heads.length < rules.maxHeads; i++) {
    const cls = rng.pick(rules.hatchlingClasses);
    const taken = new Set(state.hydra.heads.map((h) => h.name));
    const free = rules.headNames.filter((name) => !taken.has(name));
    const head = { id: `h${state.nextId++}`, name: rng.pick(free.length > 0 ? free : rules.headNames), classId: cls.classId, level: 1, hp: cls.maxHp, maxHp: cls.maxHp };
    state.hydra.heads.push(head);
    ids.push(head.id);
  }
  state.rngState = rng.getState();
  return ids;
}

function raiseAlert(state: RunState, amount: number, rules: RunRules): void {
  state.alert = Math.min(rules.alertMax, Math.max(rules.alertMin, state.alert + amount));
}
