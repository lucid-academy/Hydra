// Real-time battle on a hex board, simulated in fixed ticks (20 per second by default). Pausing = not calling stepBattle().
// Same seed + same commands at the same ticks = same battle.
//
// The body covers seven hexes in the middle of the board. Humans walk from hex to hex, surround it and hit
// whatever is next to them: a head if one is there, otherwise the body. Heads don't stand on hexes: they grow
// out of the body and reach a number of hexes from it. A biting head goes out to its enemy and can be hit back there.

import { HEX_DIRECTIONS, hex, hexAdd, hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import { anchorHex, angleDifference, bodyDistance, bodyHexes, boardHexes, canBodyStandAt, distanceField, hexAngle, isOnBoard, rimHexes } from './board';
import { applyStatus, canCauterize, createMistCloud, enemyArmor, enemyStepTicks, hurtEnemy, triggerCombos, updateEffects } from './effects';
import type { BattleCommand, BattleHead, BattleOutcome, BattleRules, BattleState, Enemy, HeadAttackRules, HeadRecord, Stump } from './types';

/**
 * Where the first neck leaves the body; the others follow evenly around it. It points north-east, at a hex,
 * nudged a little so that no neck ever points exactly between two hexes.
 */
const FIRST_NECK_ANGLE = -Math.PI / 3 + 0.05;
/** Angle between the two heads that grow from one stump. */
const TWIN_SPREAD = 0.2;
/** The body starts in the middle of the board. */
const BOARD_MIDDLE = hex(0, 0);

export interface BattleSetup {
  seed: number;
  heads: readonly HeadRecord[];
  bodyHp: number;
  bodyMaxHp: number;
  /** Enemy type ids, one per enemy. */
  enemies: readonly string[];
  /** First free number for ids of heads grown in this battle (so ids stay unique over the whole run). */
  firstFreeId: number;
}

export function createBattle(setup: BattleSetup, rules: BattleRules): BattleState {
  const rng = new Rng(setup.seed);
  const heads: BattleHead[] = setup.heads.map((record, i) => ({
    ...record,
    anchorAngle: FIRST_NECK_ANGLE + (i / setup.heads.length) * Math.PI * 2,
    cooldown: 0,
    orderTargetId: null,
    targetId: null,
    twinGroup: null,
  }));

  // The Order starts on the edge of the board, spread evenly around the hydra, with a little randomness.
  const freeRim = rimHexes(rules);
  const ringStart = rng.next() * Math.PI * 2;
  const enemies: Enemy[] = setup.enemies.map((typeId, i) => {
    const type = rules.enemyTypes[typeId];
    if (!type) throw new Error(`Unknown enemy type "${typeId}"`);
    const angle = ringStart + (i / setup.enemies.length) * Math.PI * 2 + (rng.next() - 0.5) * 0.5;
    const start = minBy(freeRim, (h) => angleDifference(hexAngle(BOARD_MIDDLE, h), angle));
    if (!start) throw new Error('No room left on the edge of the battle board for more enemies');
    freeRim.splice(freeRim.indexOf(start), 1);
    return {
      id: i + 1,
      typeId,
      hex: start,
      stepFrom: start,
      stepStartTick: 0,
      stepEndTick: 0,
      hp: type.maxHp,
      maxHp: type.maxHp,
      cooldown: rng.int(0, type.attack.cooldownTicks),
      cauterizingStumpId: null,
      statuses: [],
      armorBroken: false,
      torchOutUntilTick: 0,
    };
  });

  return {
    tick: 0,
    rngState: rng.getState(),
    body: {
      center: BOARD_MIDDLE,
      hp: setup.bodyHp,
      maxHp: setup.bodyMaxHp,
      moveTarget: null,
      stepFrom: BOARD_MIDDLE,
      stepStartTick: 0,
      stepEndTick: 0,
    },
    heads,
    stumps: [],
    enemies,
    clouds: [],
    nextId: Math.max(setup.firstFreeId, setup.enemies.length + 1),
    outcome: null,
    events: [],
  };
}

export function applyCommand(state: BattleState, command: BattleCommand, rules: BattleRules): void {
  if (state.outcome) return;
  switch (command.type) {
    case 'moveBody':
      state.body.moveTarget = nearestBodySpot(command.to, rules);
      break;
    case 'attack': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (head && state.enemies.some((e) => e.id === command.enemyId)) head.orderTargetId = command.enemyId;
      break;
    }
    case 'clearOrder': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (head) head.orderTargetId = null;
      break;
    }
  }
}

/** The body can't hang over the edge: a spot near the edge becomes the nearest spot where all seven hexes fit. */
export function nearestBodySpot(to: Hex, rules: BattleRules): Hex {
  if (canBodyStandAt(to, rules)) return to;
  return minBy(boardHexes(rules).filter((h) => canBodyStandAt(h, rules)), (h) => hexDistance(h, to)) ?? BOARD_MIDDLE;
}

export function stepBattle(state: BattleState, rules: BattleRules): void {
  if (state.outcome) return;
  const rng = Rng.fromState(state.rngState);
  state.tick += 1;
  state.events = [];

  moveBody(state, rules);
  for (const head of state.heads) updateHead(state, head, rules);
  updateEffects(state, rules);
  for (const enemy of [...state.enemies]) updateEnemy(state, enemy, rules);
  regrowStumps(state, rules, rng, false);

  state.rngState = rng.getState();
  checkOutcome(state);
}

// ---------------------------------------------------------------- body & heads

/** One step at a time towards the ordered spot, and only when all the hexes it steps onto are free. */
function moveBody(state: BattleState, rules: BattleRules): void {
  const { body } = state;
  const target = body.moveTarget;
  if (!target || state.tick < body.stepEndTick) return;
  if (hexEquals(body.center, target)) {
    body.moveTarget = null;
    return;
  }
  const taken = new Set(state.enemies.map((e) => hexKey(e.hex)));
  const closer = hexDistance(body.center, target) - 1;
  const next = HEX_DIRECTIONS.map((d) => hexAdd(body.center, d)).find(
    (c) => hexDistance(c, target) === closer && canBodyStandAt(c, rules) && bodyHexes(c).every((h) => !taken.has(hexKey(h))),
  );
  if (!next) return; // blocked: wait until the way is clear
  body.stepFrom = body.center;
  body.center = next;
  body.stepStartTick = state.tick;
  body.stepEndTick = state.tick + rules.bodyStepTicks;
}

/** The hex a head is at: its enemy's hex while it bites (melee), otherwise its own side of the body. */
export function headHex(state: BattleState, head: BattleHead, rules: BattleRules): Hex {
  if (rules.headClasses[head.classId]!.attack.melee && head.targetId !== null) {
    const target = state.enemies.find((e) => e.id === head.targetId);
    if (target) return target.hex;
  }
  return anchorHex(state.body.center, head.anchorAngle);
}

/** Is the enemy close enough to the body for this head's neck (or spit, or breath) to reach? */
export function canHeadReach(state: BattleState, head: BattleHead, enemy: Enemy, rules: BattleRules): boolean {
  return bodyDistance(state.body.center, enemy.hex) <= rules.headClasses[head.classId]!.attack.range;
}

function updateHead(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const { attack } = rules.headClasses[head.classId]!;
  if (head.cooldown > 0) head.cooldown -= 1;
  const target = pickHeadTarget(state, head, rules);
  head.targetId = target?.id ?? null;
  if (target && head.cooldown <= 0) {
    head.cooldown = attack.cooldownTicks;
    headAttackLands(state, head, target, attack, rules);
    if (!state.enemies.includes(target)) head.targetId = null;
  }
}

function pickHeadTarget(state: BattleState, head: BattleHead, rules: BattleRules): Enemy | null {
  if (head.orderTargetId !== null) {
    const ordered = state.enemies.find((e) => e.id === head.orderTargetId);
    if (!ordered) head.orderTargetId = null;
    // An order waits until its enemy comes within reach; meanwhile the head fights whoever else it can.
    else if (canHeadReach(state, head, ordered, rules)) return ordered;
  }
  // By itself: of the enemies in reach, the one nearest to this head's side of the body (keeping the current one on a tie).
  // So heads left alone spread out over the enemies; ganging up on one (and setting off combos) takes an order.
  const side = anchorHex(state.body.center, head.anchorAngle);
  const inReach = state.enemies.filter((e) => canHeadReach(state, head, e, rules));
  const best = minBy(inReach, (e) => hexDistance(side, e.hex));
  const current = inReach.find((e) => e.id === head.targetId);
  if (current && best && hexDistance(side, current.hex) <= hexDistance(side, best.hex)) return current;
  return best;
}

/** A head's attack hits: damage, then combos with what is already on the target, then what this attack leaves behind. */
function headAttackLands(state: BattleState, head: BattleHead, target: Enemy, attack: HeadAttackRules, rules: BattleRules): void {
  const at = target.hex;
  hurtEnemy(state, target, Math.max(1, attack.damage - enemyArmor(target, rules)), 'head', head.id);
  triggerCombos(state, 'headHitsEnemy', target, attack.tags, rules);
  if (attack.appliesStatus !== null && state.enemies.includes(target)) applyStatus(state, target, attack.appliesStatus, rules);
  if (attack.createsMistCloud) createMistCloud(state, at, rules);
}

// ---------------------------------------------------------------- enemies

function updateEnemy(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  if (!state.enemies.includes(enemy)) return; // killed earlier this tick
  const type = rules.enemyTypes[enemy.typeId]!;
  if (enemy.cooldown > 0) enemy.cooldown -= 1;
  if (state.tick < enemy.stepEndTick) return; // still on the way to its next hex

  if (type.behavior === 'torchbearer' && type.cauterizeTicks !== null && canCauterize(state, enemy, rules) && tendStump(state, enemy, type.cauterizeTicks, rules)) return;
  enemy.cauterizingStumpId = null;

  const target = pickEnemyTarget(state, enemy, rules);
  if (target) {
    if (enemy.cooldown <= 0) {
      enemy.cooldown = type.attack.cooldownTicks;
      if (target === 'body') damageBody(state, type.attack.damage, enemy.id);
      else damageHead(state, target, type.attack.damage * type.bonusDamageVsHeads, enemy.id, rules);
    }
    return;
  }
  walk(state, enemy, attackSpots(state, enemy, rules), rules);
}

/**
 * Who this enemy can hit from where it stands: a head first (it is in the way; the one biting this enemy before others,
 * then the weakest), otherwise the body. Headhunters leave the body alone while there are heads to take.
 */
function pickEnemyTarget(state: BattleState, enemy: Enemy, rules: BattleRules): BattleHead | 'body' | null {
  const type = rules.enemyTypes[enemy.typeId]!;
  const inReach = state.heads.filter((h) => hexDistance(enemy.hex, headHex(state, h, rules)) <= type.attack.range);
  const biter = inReach.find((h) => h.targetId === enemy.id && rules.headClasses[h.classId]!.attack.melee);
  const head = biter ?? minBy(inReach, (h) => h.hp);
  if (head) return head;
  const bodyInReach = bodyDistance(state.body.center, enemy.hex) <= type.attack.range;
  if (bodyInReach && (type.behavior !== 'headhunter' || state.heads.length === 0)) return 'body';
  return null;
}

/** Free hexes from which this enemy could attack: near a head for Headhunters, near the body for everyone else. */
function attackSpots(state: BattleState, enemy: Enemy, rules: BattleRules): Hex[] {
  const type = rules.enemyTypes[enemy.typeId]!;
  const range = type.attack.range;
  const free = freeHexes(state, enemy, rules);
  if (type.behavior === 'headhunter' && state.heads.length > 0) {
    const headSpots = state.heads.map((h) => headHex(state, h, rules));
    return free.filter((h) => headSpots.some((s) => hexDistance(h, s) <= range));
  }
  return free.filter((h) => bodyDistance(state.body.center, h) <= range);
}

/** Board hexes this enemy could stand on: not under the body, not taken by another enemy (its own hex counts as free). */
function freeHexes(state: BattleState, enemy: Enemy, rules: BattleRules): Hex[] {
  const taken = new Set(state.enemies.filter((e) => e !== enemy).map((e) => hexKey(e.hex)));
  return boardHexes(rules).filter((h) => bodyDistance(state.body.center, h) > 0 && !taken.has(hexKey(h)));
}

/** Takes one step along the shortest way to the nearest goal, walking around the body. Waits if another enemy is in the way. */
function walk(state: BattleState, enemy: Enemy, goals: readonly Hex[], rules: BattleRules): void {
  if (goals.length === 0) return;
  const center = state.body.center;
  const field = distanceField(goals, (h) => isOnBoard(h, rules) && bodyDistance(center, h) > 0);
  const here = field.get(hexKey(enemy.hex));
  if (here === undefined || here === 0) return;
  const taken = new Set(state.enemies.filter((e) => e !== enemy).map((e) => hexKey(e.hex)));
  let next: Hex | null = null;
  let nextSteps = here;
  for (const neighbor of hexNeighbors(enemy.hex)) {
    const steps = field.get(hexKey(neighbor));
    if (steps === undefined || steps >= nextSteps || taken.has(hexKey(neighbor))) continue;
    next = neighbor;
    nextSteps = steps;
  }
  if (!next) return;
  enemy.stepFrom = enemy.hex;
  enemy.hex = next;
  enemy.stepStartTick = state.tick;
  enemy.stepEndTick = state.tick + enemyStepTicks(enemy, rules);
}

/** Returns true if the Torchbearer spent this tick on a stump (walking to it or burning it). */
function tendStump(state: BattleState, enemy: Enemy, cauterizeTicks: number, rules: BattleRules): boolean {
  const center = state.body.center;
  const open = state.stumps.filter((s) => !s.cauterized);
  const stump = open.find((s) => s.id === enemy.cauterizingStumpId) ?? minBy(open, (s) => hexDistance(enemy.hex, anchorHex(center, s.anchorAngle)));
  if (!stump) return false;

  const spot = anchorHex(center, stump.anchorAngle);
  if (hexDistance(enemy.hex, spot) > 1) {
    enemy.cauterizingStumpId = null;
    const nextToStump = freeHexes(state, enemy, rules).filter((h) => hexDistance(h, spot) === 1);
    if (nextToStump.length === 0) return false; // no room at the stump: fight instead
    walk(state, enemy, nextToStump, rules);
    return true;
  }
  enemy.cauterizingStumpId = stump.id;
  stump.cauterizeProgress += 1;
  if (stump.cauterizeProgress >= cauterizeTicks) {
    stump.cauterized = true;
    enemy.cauterizingStumpId = null;
    state.events.push({ type: 'cauterized', tick: state.tick, stumpId: stump.id });
  }
  return true;
}

function damageHead(state: BattleState, head: BattleHead, damage: number, attackerId: number, rules: BattleRules): void {
  head.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', attackerId, targetKind: 'head', targetId: head.id, damage, at: headHex(state, head, rules) });
  if (head.hp > 0) return;
  // Severed: the head is gone, a stump stays where its neck was.
  state.heads = state.heads.filter((h) => h !== head);
  const stump: Stump = {
    id: state.nextId++,
    anchorAngle: head.anchorAngle,
    regrowAtTick: state.tick + rules.regrowTicks,
    cauterizeProgress: 0,
    cauterized: false,
  };
  state.stumps.push(stump);
  state.events.push({ type: 'severed', tick: state.tick, headId: head.id, name: head.name, stumpId: stump.id });
}

function damageBody(state: BattleState, damage: number, attackerId: number): void {
  state.body.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', attackerId, targetKind: 'body', targetId: 'body', damage, at: state.body.center });
}

// ---------------------------------------------------------------- regrowth & end

/** Grows two heads from each due stump (or from every open stump when `all` is true). */
function regrowStumps(state: BattleState, rules: BattleRules, rng: Rng, all: boolean): void {
  const due = state.stumps.filter((s) => !s.cauterized && (all || state.tick >= s.regrowAtTick));
  for (const stump of due) {
    state.stumps = state.stumps.filter((s) => s !== stump);
    const count = Math.min(2, rules.maxHeads - state.heads.length);
    const headIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const head = hatchling(state, rules, rng, stump.anchorAngle + (i === 0 ? -TWIN_SPREAD : TWIN_SPREAD), stump.id);
      state.heads.push(head);
      headIds.push(head.id);
    }
    for (const enemy of state.enemies) if (enemy.cauterizingStumpId === stump.id) enemy.cauterizingStumpId = null;
    state.events.push({ type: 'regrown', tick: state.tick, stumpId: stump.id, headIds });
  }
}

function hatchling(state: BattleState, rules: BattleRules, rng: Rng, anchorAngle: number, twinGroup: number): BattleHead {
  const classId = rng.pick(rules.hatchlingClassPool);
  const cls = rules.headClasses[classId]!;
  const taken = new Set(state.heads.map((h) => h.name));
  const freeNames = rules.headNames.filter((name) => !taken.has(name));
  return {
    id: `h${state.nextId++}`,
    name: rng.pick(freeNames.length > 0 ? freeNames : rules.headNames),
    classId,
    level: 1,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    anchorAngle,
    cooldown: 0,
    orderTargetId: null,
    targetId: null,
    twinGroup,
  };
}

function checkOutcome(state: BattleState): void {
  let outcome: BattleOutcome | null = null;
  if (state.body.hp <= 0) outcome = 'lost';
  else if (state.enemies.length === 0) outcome = 'won';
  if (!outcome) return;
  state.outcome = outcome;
  state.events.push({ type: 'ended', tick: state.tick, outcome });
}

export interface BattleResult {
  outcome: BattleOutcome;
  bodyHp: number;
  heads: HeadRecord[];
  /** Stumps burnt shut in this battle; they stay as scars. */
  newScars: number;
  nextId: number;
}

/** What goes back to the map. Stumps still waiting to regrow do so right away. */
export function battleResult(state: BattleState, rules: BattleRules): BattleResult {
  if (!state.outcome) throw new Error('battleResult() called before the battle ended');
  const rng = Rng.fromState(state.rngState);
  const newScars = state.stumps.filter((s) => s.cauterized).length;
  regrowStumps(state, rules, rng, true);
  state.rngState = rng.getState();
  return {
    outcome: state.outcome,
    bodyHp: Math.max(0, state.body.hp),
    heads: state.heads.map(({ id, name, classId, level, hp, maxHp }) => ({ id, name, classId, level, hp, maxHp })),
    newScars,
    nextId: state.nextId,
  };
}

// ---------------------------------------------------------------- helpers

/** The item with the smallest score; on a tie, the earlier one. Null for an empty list. */
function minBy<T>(items: readonly T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}
