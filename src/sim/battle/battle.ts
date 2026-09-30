// Real-time battle, simulated in fixed ticks (20 per second by default). Pausing = not calling stepBattle().
// Same seed + same commands at the same ticks = same battle.

import { Rng } from '../rng';
import type {
  BattleCommand,
  BattleHead,
  BattleOutcome,
  BattleRules,
  BattleState,
  Enemy,
  HeadRecord,
  Stump,
  Vec,
} from './types';
import { angleTo, clampToArena, distance, fromAngle, moveTowards, vec } from './vec';

/** Angle between neighbouring heads' necks, in radians. */
const HEAD_SPREAD = 0.42;
/** How close a Torchbearer must stand to a stump to burn it. */
const CAUTERIZE_REACH = 12;

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
  const bodyPos = vec(Math.round(rules.arenaWidth * 0.28), Math.round(rules.arenaHeight / 2));
  const n = setup.heads.length;
  const heads: BattleHead[] = setup.heads.map((record, i) => {
    const anchorAngle = (i - (n - 1) / 2) * HEAD_SPREAD;
    return {
      ...record,
      anchorAngle,
      pos: restPosition(bodyPos, anchorAngle, rules),
      cooldown: 0,
      orderTargetId: null,
      twinGroup: null,
    };
  });

  const enemies: Enemy[] = setup.enemies.map((typeId, i) => {
    const type = rules.enemyTypes[typeId];
    if (!type) throw new Error(`Unknown enemy type "${typeId}"`);
    const slot = (i + 1) / (setup.enemies.length + 1);
    return {
      id: i + 1,
      typeId,
      pos: vec(rules.arenaWidth * 0.66 + rng.int(-20, 20), rules.arenaHeight * slot + rng.int(-10, 10)),
      hp: type.maxHp,
      maxHp: type.maxHp,
      cooldown: rng.int(0, type.attack.cooldownTicks),
      cauterizingStumpId: null,
    };
  });

  return {
    tick: 0,
    rngState: rng.getState(),
    body: { pos: bodyPos, hp: setup.bodyHp, maxHp: setup.bodyMaxHp, moveTarget: null },
    heads,
    stumps: [],
    enemies,
    nextId: Math.max(setup.firstFreeId, setup.enemies.length + 1),
    outcome: null,
    events: [],
  };
}

export function applyCommand(state: BattleState, command: BattleCommand, rules: BattleRules): void {
  if (state.outcome) return;
  switch (command.type) {
    case 'moveBody':
      state.body.moveTarget = clampToArena(command.to, rules.arenaWidth, rules.arenaHeight, rules.body.radius);
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

export function stepBattle(state: BattleState, rules: BattleRules): void {
  if (state.outcome) return;
  const rng = Rng.fromState(state.rngState);
  state.tick += 1;
  state.events = [];

  moveBody(state, rules);
  for (const head of state.heads) updateHead(state, head, rules);
  for (const enemy of [...state.enemies]) updateEnemy(state, enemy, rules);
  separate(state, rules);
  regrowStumps(state, rules, rng, false);

  state.rngState = rng.getState();
  checkOutcome(state);
}

// ---------------------------------------------------------------- body & heads

function moveBody(state: BattleState, rules: BattleRules): void {
  const { body } = state;
  if (!body.moveTarget) return;
  body.pos = moveTowards(body.pos, body.moveTarget, rules.body.speed);
  if (distance(body.pos, body.moveTarget) < 0.5) body.moveTarget = null;
}

export function restPosition(bodyPos: Vec, anchorAngle: number, rules: BattleRules): Vec {
  return fromAngle(bodyPos, anchorAngle, rules.body.radius + rules.neck.restDistance);
}

/** Furthest a head can reach from the body's centre. */
export function neckReach(rules: BattleRules): number {
  return rules.body.radius + rules.neck.length;
}

export function stumpPosition(bodyPos: Vec, stump: Stump, rules: BattleRules): Vec {
  return fromAngle(bodyPos, stump.anchorAngle, rules.body.radius);
}

function updateHead(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const cls = rules.headClasses[head.classId]!;
  if (head.cooldown > 0) head.cooldown -= 1;

  const target = pickHeadTarget(state, head, rules);
  let desired: Vec;
  if (target) {
    const radius = rules.enemyTypes[target.typeId]!.radius;
    // Stop a little inside attack range, but never stretch the neck past its length.
    const standOff = Math.max(0, cls.attack.range * 0.8 + radius);
    const toTarget = distance(state.body.pos, target.pos);
    const wanted = Math.max(0, Math.min(toTarget - standOff, neckReach(rules)));
    desired = fromAngle(state.body.pos, angleTo(state.body.pos, target.pos), Math.max(wanted, rules.body.radius + 4));
  } else {
    desired = restPosition(state.body.pos, head.anchorAngle, rules);
  }
  head.pos = moveTowards(head.pos, desired, rules.neck.headSpeed);

  if (target && head.cooldown <= 0) {
    const radius = rules.enemyTypes[target.typeId]!.radius;
    if (distance(head.pos, target.pos) <= cls.attack.range + radius) {
      head.cooldown = cls.attack.cooldownTicks;
      damageEnemy(state, target, cls.attack.damage, rules);
    }
  }
}

function pickHeadTarget(state: BattleState, head: BattleHead, rules: BattleRules): Enemy | null {
  if (head.orderTargetId !== null) {
    const ordered = state.enemies.find((e) => e.id === head.orderTargetId);
    if (ordered) return ordered;
    head.orderTargetId = null;
  }
  // Automatic: nearest enemy the neck can reach.
  const range = rules.headClasses[head.classId]!.attack.range;
  let best: Enemy | null = null;
  let bestDistance = Infinity;
  for (const enemy of state.enemies) {
    const d = distance(state.body.pos, enemy.pos);
    if (d <= neckReach(rules) + range + rules.enemyTypes[enemy.typeId]!.radius && d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function damageEnemy(state: BattleState, enemy: Enemy, rawDamage: number, rules: BattleRules): void {
  const type = rules.enemyTypes[enemy.typeId]!;
  const damage = Math.max(1, rawDamage - type.armor);
  enemy.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'head', targetKind: 'enemy', targetId: enemy.id, damage, at: { ...enemy.pos } });
  if (enemy.hp <= 0) {
    state.enemies = state.enemies.filter((e) => e !== enemy);
    state.events.push({ type: 'enemyKilled', tick: state.tick, enemyId: enemy.id, at: { ...enemy.pos } });
  }
}

// ---------------------------------------------------------------- enemies

function updateEnemy(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  if (!state.enemies.includes(enemy)) return; // killed earlier this tick
  const type = rules.enemyTypes[enemy.typeId]!;
  if (enemy.cooldown > 0) enemy.cooldown -= 1;

  if (type.behavior === 'torchbearer' && type.cauterizeTicks !== null && tryCauterize(state, enemy, type.cauterizeTicks, rules)) return;
  enemy.cauterizingStumpId = null;

  // Heads in reach are hit first: they are in the way. Headhunters only ever go for heads.
  const reach = type.attack.range + type.radius;
  const headInReach = nearest(state.heads, enemy.pos, (h) => distance(h.pos, enemy.pos) <= reach);
  const bodyInReach = distance(state.body.pos, enemy.pos) <= reach + rules.body.radius;

  if (headInReach || (bodyInReach && type.behavior !== 'headhunter')) {
    if (enemy.cooldown <= 0) {
      enemy.cooldown = type.attack.cooldownTicks;
      if (headInReach) damageHead(state, headInReach, type.attack.damage * type.bonusDamageVsHeads, rules);
      else damageBody(state, type.attack.damage);
    }
    return;
  }

  const chase = type.behavior === 'headhunter' ? nearest(state.heads, enemy.pos)?.pos ?? state.body.pos : state.body.pos;
  enemy.pos = moveTowards(enemy.pos, chase, type.speed);
}

/** Returns true if the Torchbearer spent this tick on a stump (walking to it or burning it). */
function tryCauterize(state: BattleState, enemy: Enemy, cauterizeTicks: number, rules: BattleRules): boolean {
  const open = state.stumps.filter((s) => !s.cauterized);
  const stump =
    open.find((s) => s.id === enemy.cauterizingStumpId) ??
    nearest(open, enemy.pos, undefined, (s) => stumpPosition(state.body.pos, s, rules));
  if (!stump) return false;

  const spot = stumpPosition(state.body.pos, stump, rules);
  if (distance(enemy.pos, spot) > CAUTERIZE_REACH + rules.enemyTypes[enemy.typeId]!.radius) {
    enemy.cauterizingStumpId = null;
    enemy.pos = moveTowards(enemy.pos, spot, rules.enemyTypes[enemy.typeId]!.speed);
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

function damageHead(state: BattleState, head: BattleHead, damage: number, rules: BattleRules): void {
  head.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', targetKind: 'head', targetId: head.id, damage, at: { ...head.pos } });
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

function damageBody(state: BattleState, damage: number): void {
  state.body.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', targetKind: 'body', targetId: 'body', damage, at: { ...state.body.pos } });
}

/** Pushes enemies out of the body and away from each other (simple circles, no physics engine). */
function separate(state: BattleState, rules: BattleRules): void {
  for (const enemy of state.enemies) {
    const r = rules.enemyTypes[enemy.typeId]!.radius;
    const minBody = rules.body.radius + r;
    const d = distance(enemy.pos, state.body.pos);
    if (d < minBody) enemy.pos = fromAngle(state.body.pos, d === 0 ? 0 : angleTo(state.body.pos, enemy.pos), minBody);
  }
  for (let i = 0; i < state.enemies.length; i++) {
    for (let j = i + 1; j < state.enemies.length; j++) {
      const a = state.enemies[i]!;
      const b = state.enemies[j]!;
      const minD = rules.enemyTypes[a.typeId]!.radius + rules.enemyTypes[b.typeId]!.radius;
      const d = distance(a.pos, b.pos);
      if (d >= minD) continue;
      const angle = d === 0 ? (a.id < b.id ? 0 : Math.PI) : angleTo(a.pos, b.pos);
      const push = (minD - d) / 2;
      a.pos = fromAngle(a.pos, angle + Math.PI, push);
      b.pos = fromAngle(b.pos, angle, push);
    }
  }
  for (const enemy of state.enemies) enemy.pos = clampToArena(enemy.pos, rules.arenaWidth, rules.arenaHeight, 4);
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
      const head = hatchling(state, rules, rng, stump.anchorAngle + (i === 0 ? -0.2 : 0.2), stump.id);
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
  const pos = fromAngle(state.body.pos, anchorAngle, rules.body.radius + 2);
  return {
    id: `h${state.nextId++}`,
    name: rng.pick(freeNames.length > 0 ? freeNames : rules.headNames),
    classId,
    level: 1,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    pos,
    anchorAngle,
    cooldown: 0,
    orderTargetId: null,
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

function nearest<T>(items: readonly T[], from: Vec, filter?: (item: T) => boolean, positionOf?: (item: T) => Vec): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const item of items) {
    if (filter && !filter(item)) continue;
    const pos = positionOf ? positionOf(item) : (item as unknown as { pos: Vec }).pos;
    const d = distance(from, pos);
    if (d < bestDistance) {
      best = item;
      bestDistance = d;
    }
  }
  return best;
}
