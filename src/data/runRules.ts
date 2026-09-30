// Picks the values the strategic-map simulation needs out of balance.json.

import type { RunRules } from '../sim/turn';
import type { Balance } from './schemas';

export function runRulesFrom(balance: Balance): RunRules {
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
    },
  };
}
