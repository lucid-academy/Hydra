// Picks the values the strategic-map simulation needs out of the data files.

import type { RunRules } from '../sim/turn';
import type { GameData } from './index';
import type { Balance } from './schemas';

export function runRulesFrom(data: GameData): RunRules {
  const { balance, heads, enemies } = data;
  const { map, terrain, undergroundGenerator: gen, resources, alert } = balance;
  const terrainRule = (t: Balance['terrain']['water']) => ({ moveCost: t.moveCost, blocksSight: t.blocksSight });
  return {
    movementPointsPerTurn: map.movementPointsPerTurn,
    sightRangeHexes: map.sightRangeHexes,
    terrain: { water: terrainRule(terrain.water), mud: terrainRule(terrain.mud), rock: terrainRule(terrain.rock) },
    alertMin: alert.min,
    alertMax: alert.max,
    alertPerHexDiscovered: alert.perHexDiscovered,
    alertPerBattle: alert.perBattle,
    generator: {
      radius: map.undergroundRadius,
      rockShare: gen.rockShare,
      waterShare: gen.waterShare,
      smoothingPasses: gen.smoothingPasses,
      minPassableShare: gen.minPassableShare,
      encounterCount: gen.encounterCount,
      encounterMinDistanceFromLair: gen.encounterMinDistanceFromLair,
      muckDepositCount: gen.muckDepositCount,
      muckPerDeposit: resources.muckPerDeposit,
      encounterGroups: enemies.encounterGroups.map((g) => ({ id: g.id, weight: g.weight })),
    },
    bodyMaxHp: balance.battle.bodyMaxHp,
    startingHeads: heads.startingHeads.map((classId) => ({ classId, maxHp: heads.classes[classId]!.maxHp })),
    headNames: heads.names,
    healing: { bodyHpPerTurn: balance.healing.bodyHpPerTurn, headHpPerTurn: balance.healing.headHpPerTurn },
    encounterGroupMembers: Object.fromEntries(enemies.encounterGroups.map((g) => [g.id, g.members])),
  };
}
