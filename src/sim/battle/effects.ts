// Statuses on enemies, Mist clouds on the arena, and combos.
// Combos are described in data (combos.json): a trigger, conditions and effects. A new combo is a new entry there.

import type { BattleRules, BattleState, ComboEffect, ComboTrigger, Enemy, HitSource, MistCloud, Vec } from './types';
import { distance } from './vec';

/** Deals damage as given (armor is not applied here) and removes the enemy if it dies. */
export function hurtEnemy(state: BattleState, enemy: Enemy, damage: number, attacker: HitSource): void {
  if (!state.enemies.includes(enemy)) return;
  enemy.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker, targetKind: 'enemy', targetId: enemy.id, damage, at: { ...enemy.pos } });
  if (enemy.hp <= 0) {
    state.enemies = state.enemies.filter((e) => e !== enemy);
    state.events.push({ type: 'enemyKilled', tick: state.tick, enemyId: enemy.id, at: { ...enemy.pos } });
  }
}

export function enemyArmor(enemy: Enemy, rules: BattleRules): number {
  if (enemy.armorBroken) return 0;
  let armor = rules.enemyTypes[enemy.typeId]!.armor;
  for (const status of enemy.statuses) armor += rules.statuses[status.id]!.armorChange;
  return Math.max(0, armor);
}

/** Pixels per tick, after statuses that slow the enemy down. */
export function enemySpeed(enemy: Enemy, rules: BattleRules): number {
  let speed = rules.enemyTypes[enemy.typeId]!.speed;
  for (const status of enemy.statuses) speed *= rules.statuses[status.id]!.speedMultiplier;
  return speed;
}

export function hasStatus(enemy: Enemy, statusId: string): boolean {
  return enemy.statuses.some((s) => s.id === statusId);
}

/** Can this enemy burn stumps shut right now? */
export function canCauterize(state: BattleState, enemy: Enemy, rules: BattleRules): boolean {
  return rules.enemyTypes[enemy.typeId]!.cauterizeTicks !== null && state.tick >= enemy.torchOutUntilTick;
}

/** Puts a status on an enemy, or makes it last longer if it is already there. Returns true if it is new. */
export function applyStatus(state: BattleState, enemy: Enemy, statusId: string, rules: BattleRules): boolean {
  const status = rules.statuses[statusId];
  if (!status) throw new Error(`Unknown status "${statusId}"`);
  const untilTick = state.tick + status.durationTicks;
  const active = enemy.statuses.find((s) => s.id === statusId);
  if (active) {
    active.untilTick = untilTick;
    return false;
  }
  enemy.statuses.push({ id: statusId, untilTick, nextDamageTick: state.tick + rules.ticksPerSecond });
  return true;
}

function cloudsOver(state: BattleState, pos: Vec): MistCloud[] {
  return state.clouds.filter((cloud) => distance(cloud.pos, pos) <= cloud.radius);
}

export function isInMist(state: BattleState, pos: Vec): boolean {
  return cloudsOver(state, pos).length > 0;
}

export function isAcid(state: BattleState, cloud: MistCloud): boolean {
  return state.tick < cloud.acidUntilTick;
}

/** New Mist cloud at `at`. Breathing into a cloud that already covers the spot just makes that one last longer. */
export function createMistCloud(state: BattleState, at: Vec, rules: BattleRules): void {
  const untilTick = state.tick + rules.mistCloud.durationTicks;
  const existing = state.clouds.find((cloud) => distance(cloud.pos, at) <= cloud.radius / 2);
  if (existing) {
    existing.untilTick = untilTick;
    return;
  }
  state.clouds.push({
    id: state.nextId++,
    pos: { ...at },
    radius: rules.mistCloud.radius,
    untilTick,
    acidUntilTick: 0,
    acidDamagePerSecond: 0,
    nextAcidTick: 0,
  });
}

/** One tick of clouds and statuses: clouds fade, soak and burn; statuses wear off and hurt. */
export function updateEffects(state: BattleState, rules: BattleRules): void {
  state.clouds = state.clouds.filter((cloud) => state.tick < cloud.untilTick);
  for (const cloud of state.clouds) {
    const acidDue = isAcid(state, cloud) && state.tick >= cloud.nextAcidTick;
    if (acidDue) cloud.nextAcidTick = state.tick + rules.ticksPerSecond;
    for (const enemy of [...state.enemies]) {
      if (distance(cloud.pos, enemy.pos) > cloud.radius) continue;
      if (rules.mistCloud.appliesStatus !== null) applyStatus(state, enemy, rules.mistCloud.appliesStatus, rules);
      if (acidDue) hurtEnemy(state, enemy, cloud.acidDamagePerSecond, 'mist');
    }
  }
  for (const enemy of [...state.enemies]) {
    if (isInMist(state, enemy.pos)) triggerCombos(state, 'enemyInMist', enemy, null, rules);
  }

  for (const enemy of [...state.enemies]) {
    enemy.statuses = enemy.statuses.filter((s) => state.tick < s.untilTick);
    for (const status of enemy.statuses) {
      const { damagePerSecond } = rules.statuses[status.id]!;
      if (damagePerSecond <= 0 || state.tick < status.nextDamageTick) continue;
      status.nextDamageTick = state.tick + rules.ticksPerSecond;
      hurtEnemy(state, enemy, damagePerSecond, 'status');
    }
  }
}

/**
 * Fires every combo whose trigger and conditions match.
 * `attackTags` are the tags of the attack that just hit (null when the trigger is not an attack).
 * A combo is announced (a 'combo' event) only when it actually changed something,
 * so a Torchbearer standing in mist is smothered once, not twenty times a second.
 */
export function triggerCombos(state: BattleState, when: ComboTrigger, enemy: Enemy, attackTags: readonly string[] | null, rules: BattleRules): void {
  for (const combo of rules.combos) {
    if (!state.enemies.includes(enemy)) return;
    if (combo.when !== when) continue;
    const c = combo.conditions;
    if (c.attackTag !== null && !attackTags?.includes(c.attackTag)) continue;
    if (c.enemyHasStatus !== null && !hasStatus(enemy, c.enemyHasStatus)) continue;
    if (c.enemyInMist !== null && isInMist(state, enemy.pos) !== c.enemyInMist) continue;
    if (c.enemyCarriesFire !== null && (rules.enemyTypes[enemy.typeId]!.cauterizeTicks !== null) !== c.enemyCarriesFire) continue;
    if (c.enemyArmorBroken !== null && enemy.armorBroken !== c.enemyArmorBroken) continue;

    const at = { ...enemy.pos };
    let changed = false;
    for (const effect of combo.effects) changed = applyEffect(state, enemy, effect, rules) || changed;
    if (changed) state.events.push({ type: 'combo', tick: state.tick, comboId: combo.id, enemyId: enemy.id, at });
  }
}

/** Returns true if the effect did something new (not just kept an effect that was already running going). */
function applyEffect(state: BattleState, enemy: Enemy, effect: ComboEffect, rules: BattleRules): boolean {
  switch (effect.type) {
    case 'damage':
      hurtEnemy(state, enemy, effect.amount, 'combo');
      return true;
    case 'breakArmor': {
      const wasBroken = enemy.armorBroken;
      enemy.armorBroken = true;
      return !wasBroken;
    }
    case 'removeStatus':
      enemy.statuses = enemy.statuses.filter((s) => s.id !== effect.status);
      return false;
    case 'acidifyMist': {
      let turned = false;
      for (const cloud of cloudsOver(state, enemy.pos)) {
        if (!isAcid(state, cloud)) {
          turned = true;
          cloud.nextAcidTick = state.tick + rules.ticksPerSecond;
        }
        cloud.acidUntilTick = state.tick + effect.ticks;
        cloud.acidDamagePerSecond = effect.damagePerSecond;
      }
      return turned;
    }
    case 'putOutTorch': {
      const wasOut = state.tick < enemy.torchOutUntilTick;
      enemy.torchOutUntilTick = state.tick + effect.ticks;
      if (!wasOut) enemy.cauterizingStumpId = null;
      return !wasOut;
    }
  }
}
