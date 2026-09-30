// Statuses on enemies, Mist clouds on the board, and combos.
// Combos are described in data (combos.json): a trigger, conditions and effects. A new combo is a new entry there.

import { hexDistance } from '../hex';
import type { Hex } from '../hex';
import type { BattleRules, BattleState, ComboEffect, ComboTrigger, Enemy, HitSource, MistCloud } from './types';

/** Deals damage as given (armor is not applied here) and removes the enemy if it dies. */
export function hurtEnemy(state: BattleState, enemy: Enemy, damage: number, attacker: HitSource, attackerId: string | number | null = null): void {
  if (!state.enemies.includes(enemy)) return;
  enemy.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker, attackerId, targetKind: 'enemy', targetId: enemy.id, damage, at: enemy.hex });
  if (enemy.hp <= 0) {
    state.enemies = state.enemies.filter((e) => e !== enemy);
    state.events.push({ type: 'enemyKilled', tick: state.tick, enemyId: enemy.id, at: enemy.hex });
  }
}

export function enemyArmor(enemy: Enemy, rules: BattleRules): number {
  if (enemy.armorBroken) return 0;
  let armor = rules.enemyTypes[enemy.typeId]!.armor;
  for (const status of enemy.statuses) armor += rules.statuses[status.id]!.armorChange;
  return Math.max(0, armor);
}

/** Ticks one step takes this enemy now: statuses that slow it down make steps longer. */
export function enemyStepTicks(enemy: Enemy, rules: BattleRules): number {
  let speed = 1;
  for (const status of enemy.statuses) speed *= rules.statuses[status.id]!.speedMultiplier;
  return Math.max(1, Math.round(rules.enemyTypes[enemy.typeId]!.stepTicks / speed));
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

export function cloudsOver(state: BattleState, h: Hex): MistCloud[] {
  return state.clouds.filter((cloud) => hexDistance(cloud.center, h) <= cloud.radius);
}

export function isInMist(state: BattleState, h: Hex): boolean {
  return cloudsOver(state, h).length > 0;
}

export function isAcid(state: BattleState, cloud: MistCloud): boolean {
  return state.tick < cloud.acidUntilTick;
}

/** New Mist cloud centred on `at`. Breathing again on the same hex just makes that cloud last longer. */
export function createMistCloud(state: BattleState, at: Hex, rules: BattleRules): void {
  const untilTick = state.tick + rules.mistCloud.durationTicks;
  const existing = state.clouds.find((cloud) => cloud.center.q === at.q && cloud.center.r === at.r);
  if (existing) {
    existing.untilTick = untilTick;
    return;
  }
  state.clouds.push({
    id: state.nextId++,
    center: at,
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
      if (hexDistance(cloud.center, enemy.hex) > cloud.radius) continue;
      if (rules.mistCloud.appliesStatus !== null) applyStatus(state, enemy, rules.mistCloud.appliesStatus, rules);
      if (acidDue) hurtEnemy(state, enemy, cloud.acidDamagePerSecond, 'mist');
    }
  }
  for (const enemy of [...state.enemies]) {
    if (isInMist(state, enemy.hex)) triggerCombos(state, 'enemyInMist', enemy, null, rules);
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
    if (c.enemyInMist !== null && isInMist(state, enemy.hex) !== c.enemyInMist) continue;
    if (c.enemyCarriesFire !== null && (rules.enemyTypes[enemy.typeId]!.cauterizeTicks !== null) !== c.enemyCarriesFire) continue;
    if (c.enemyArmorBroken !== null && enemy.armorBroken !== c.enemyArmorBroken) continue;

    const at = enemy.hex;
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
      for (const cloud of cloudsOver(state, enemy.hex)) {
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
