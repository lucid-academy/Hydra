// Converts heads.json, enemies.json and balance.json into the rules the battle simulation uses
// (seconds become ticks; distances are already in hexes), plus statuses and combos from combos.json.

import type { BattleRules, ComboEffect } from '../sim/battle';
import type { GameData } from './index';

export function battleRulesFrom(data: GameData): BattleRules {
  const { balance, heads, enemies, combos } = data;
  const tps = balance.battle.ticksPerSecond;
  const ticks = (seconds: number) => Math.max(1, Math.round(seconds * tps));

  return {
    ticksPerSecond: tps,
    boardColumns: balance.battle.boardColumns,
    boardRows: balance.battle.boardRows,
    bodyStepTicks: ticks(balance.battle.bodyStepSeconds),
    maxHeads: heads.maxHeads,
    regrowTicks: ticks(heads.regrowSeconds),
    headClasses: Object.fromEntries(
      Object.entries(heads.classes).map(([id, c]) => [
        id,
        {
          maxHp: c.maxHp,
          attack: {
            damage: c.attack.damage,
            cooldownTicks: ticks(c.attack.cooldownSeconds),
            range: c.attack.range,
            melee: c.attack.melee ?? false,
            tags: c.attack.tags,
            appliesStatus: c.attack.appliesStatus ?? null,
            createsMistCloud: c.attack.createsMistCloud ?? false,
          },
        },
      ]),
    ),
    hatchlingClassPool: heads.hatchlingClassPool,
    headNames: heads.names,
    enemyTypes: Object.fromEntries(
      Object.entries(enemies.types).map(([id, e]) => [
        id,
        {
          maxHp: e.maxHp,
          armor: e.armor,
          stepTicks: ticks(e.stepSeconds),
          attack: { damage: e.attack.damage, cooldownTicks: ticks(e.attack.cooldownSeconds), range: e.attack.range },
          bonusDamageVsHeads: e.bonusDamageVsHeads ?? 1,
          cauterizeTicks: e.cauterizeSeconds !== undefined ? ticks(e.cauterizeSeconds) : null,
          behavior: e.behavior,
        },
      ]),
    ),
    statuses: Object.fromEntries(
      Object.entries(combos.statuses).map(([id, s]) => [
        id,
        { durationTicks: ticks(s.durationSeconds), armorChange: s.armorChange, damagePerSecond: s.damagePerSecond, speedMultiplier: s.speedMultiplier },
      ]),
    ),
    mistCloud: {
      radius: combos.mistCloud.radius,
      durationTicks: ticks(combos.mistCloud.durationSeconds),
      appliesStatus: combos.mistCloud.appliesStatus ?? null,
    },
    combos: combos.combos.map((combo) => ({
      id: combo.id,
      when: combo.when,
      conditions: {
        attackTag: combo.conditions.attackTag ?? null,
        enemyHasStatus: combo.conditions.enemyHasStatus ?? null,
        enemyInMist: combo.conditions.enemyInMist ?? null,
        enemyCarriesFire: combo.conditions.enemyCarriesFire ?? null,
        enemyArmorBroken: combo.conditions.enemyArmorBroken ?? null,
      },
      effects: combo.effects.map((effect): ComboEffect => {
        switch (effect.type) {
          case 'damage':
            return { type: 'damage', amount: effect.amount };
          case 'breakArmor':
            return { type: 'breakArmor' };
          case 'removeStatus':
            return { type: 'removeStatus', status: effect.status };
          case 'acidifyMist':
            return { type: 'acidifyMist', damagePerSecond: effect.damagePerSecond, ticks: ticks(effect.seconds) };
          case 'putOutTorch':
            return { type: 'putOutTorch', ticks: ticks(effect.seconds) };
        }
      }),
    })),
  };
}
