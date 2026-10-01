// Picks the values the strategic-map simulation needs out of the data files.

import type { BiomeSettings } from '../sim/map';
import type { RunRules } from '../sim/turn';
import type { GameData } from './index';
import type { Balance } from './schemas';

export function runRulesFrom(data: GameData): RunRules {
  const { balance, heads, enemies, biomes } = data;
  const { map, terrain, undergroundGenerator: gen, resources, alert } = balance;
  const terrainRule = (t: Balance['terrain']['water']) => ({ moveCost: t.moveCost, blocksSight: t.blocksSight });
  const biome = (id: string): BiomeSettings => {
    const b = biomes.biomes[id]!;
    return { id, ground: b.ground, rockShare: b.rockShare };
  };
  const groupsByTier: Record<number, Array<{ id: string; weight: number }>> = {};
  for (const g of enemies.encounterGroups) (groupsByTier[g.tier] ??= []).push({ id: g.id, weight: g.weight });
  return {
    movementPointsPerTurn: map.movementPointsPerTurn,
    sightRangeHexes: map.sightRangeHexes,
    terrain: { water: terrainRule(terrain.water), mud: terrainRule(terrain.mud), roots: terrainRule(terrain.roots), rock: terrainRule(terrain.rock) },
    alertMin: alert.min,
    alertMax: alert.max,
    alertPerHexDiscovered: alert.perHexDiscovered,
    alertPerBattle: alert.perBattle,
    generator: {
      radius: map.undergroundRadius,
      smoothingPasses: gen.smoothingPasses,
      minPassableShare: gen.minPassableShare,
      lairBiome: biome(biomes.lairBiome),
      lairBiomeRadius: gen.lairBiomeRadius,
      outerBiomes: Object.keys(biomes.biomes)
        .filter((id) => id !== biomes.lairBiome)
        .map(biome),
      shrines: { ...gen.shrines, blessingIds: data.shrines.blessings.map((b) => b.id) },
      passages: gen.passages,
      encounters: { ...gen.encounters, groupsByTier },
      muck: { ...gen.muckDeposits, perDeposit: resources.muckPerDeposit },
      moisture: { ...gen.moistureSources, perSource: resources.moisturePerSource },
    },
    bodyMaxHp: balance.battle.bodyMaxHp,
    startingHeads: heads.startingHeads.map((classId) => ({ classId, maxHp: heads.classes[classId]!.maxHp })),
    hatchlingClasses: heads.hatchlingClassPool.map((classId) => ({ classId, maxHp: heads.classes[classId]!.maxHp })),
    maxHeads: heads.maxHeads,
    bonesPerEnemy: resources.bonesPerEnemy,
    blessings: Object.fromEntries(data.shrines.blessings.map((b) => [b.id, b.effects])),
    headNames: heads.names,
    healing: { bodyHpPerTurn: balance.healing.bodyHpPerTurn, headHpPerTurn: balance.healing.headHpPerTurn },
    encounterGroupMembers: Object.fromEntries(enemies.encounterGroups.map((g) => [g.id, g.members])),
  };
}
