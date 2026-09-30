// Converts heads.json, enemies.json and balance.json into the rules the battle simulation uses
// (seconds become ticks, speeds per second become pixels per tick).

import type { BattleRules } from '../sim/battle';
import type { GameData } from './index';

export function battleRulesFrom(data: GameData): BattleRules {
  const { balance, heads, enemies } = data;
  const tps = balance.battle.ticksPerSecond;
  const ticks = (seconds: number) => Math.max(1, Math.round(seconds * tps));

  return {
    ticksPerSecond: tps,
    arenaWidth: balance.battle.arenaWidth,
    arenaHeight: balance.battle.arenaHeight,
    body: { radius: balance.battle.bodyRadius, speed: balance.battle.bodySpeed / tps },
    neck: { length: heads.neck.length, restDistance: heads.neck.restDistance, headSpeed: heads.neck.headSpeed / tps },
    maxHeads: heads.maxHeads,
    regrowTicks: ticks(heads.regrowSeconds),
    headClasses: Object.fromEntries(
      Object.entries(heads.classes).map(([id, c]) => [
        id,
        {
          maxHp: c.maxHp,
          attack: { damage: c.attack.damage, cooldownTicks: ticks(c.attack.cooldownSeconds), range: c.attack.range, tags: c.attack.tags },
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
          speed: e.speed / tps,
          radius: e.radius,
          attack: { damage: e.attack.damage, cooldownTicks: ticks(e.attack.cooldownSeconds), range: e.attack.range, tags: [] },
          bonusDamageVsHeads: e.bonusDamageVsHeads ?? 1,
          cauterizeTicks: e.cauterizeSeconds !== undefined ? ticks(e.cauterizeSeconds) : null,
          behavior: e.behavior,
        },
      ]),
    ),
  };
}
