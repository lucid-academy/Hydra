// All data files, validated once at startup. Import game data from here, not from the JSON files directly.

import balanceJson from './balance.json';
import paletteJson from './palette.json';
import textJson from './text.json';
import headsJson from './heads.json';
import enemiesJson from './enemies.json';
import combosJson from './combos.json';
import biomesJson from './biomes.json';
import manifestJson from '../assets/manifest.json';
import { balanceSchema, biomesSchema, combosSchema, enemiesSchema, headsSchema, manifestSchema, paletteSchema, textSchema } from './schemas';
import type { AssetManifest, Balance, BiomesData, CombosData, EnemiesData, GameText, HeadsData, Palette } from './schemas';
import { DataError, validateData } from './validate';

export interface GameData {
  balance: Balance;
  palette: Palette;
  text: GameText;
  manifest: AssetManifest;
  heads: HeadsData;
  enemies: EnemiesData;
  combos: CombosData;
  biomes: BiomesData;
}

export function loadGameData(): GameData {
  const data: GameData = {
    balance: validateData('src/data/balance.json', balanceSchema, balanceJson),
    palette: validateData('src/data/palette.json', paletteSchema, paletteJson),
    text: validateData('src/data/text.json', textSchema, textJson),
    manifest: validateData('src/assets/manifest.json', manifestSchema, manifestJson),
    heads: validateData('src/data/heads.json', headsSchema, headsJson),
    enemies: validateData('src/data/enemies.json', enemiesSchema, enemiesJson),
    combos: validateData('src/data/combos.json', combosSchema, combosJson),
    biomes: validateData('src/data/biomes.json', biomesSchema, biomesJson),
  };
  checkCrossReferences(data);
  return data;
}

/** Names that one data file borrows from another must exist there. */
export function checkCrossReferences(data: Pick<GameData, 'heads' | 'combos'> & Partial<Pick<GameData, 'balance' | 'enemies' | 'biomes' | 'manifest'>>): void {
  const statuses = Object.keys(data.combos.statuses);
  const problems: string[] = [];
  for (const [id, cls] of Object.entries(data.heads.classes)) {
    const status = cls.attack.appliesStatus;
    if (status !== undefined && !statuses.includes(status)) {
      problems.push(`  - src/data/heads.json, classes.${id}.attack.appliesStatus: unknown status "${status}"; known (from combos.json): ${statuses.join(', ')}`);
    }
  }
  const tags = new Set(Object.values(data.heads.classes).flatMap((cls) => cls.attack.tags));
  data.combos.combos.forEach((combo, c) => {
    const tag = combo.conditions.attackTag;
    if (tag !== undefined && !tags.has(tag)) {
      problems.push(`  - src/data/combos.json, combos.${c}.conditions.attackTag: no head attack has the tag "${tag}"; known (from heads.json): ${[...tags].join(', ')}`);
    }
  });
  if (data.balance && data.enemies) {
    // Every tier of encounters needs at least one group of enemies.
    const tiers = data.balance.undergroundGenerator.encounters.tierStartsAtDistance.length;
    for (let tier = 1; tier <= tiers; tier++) {
      if (!data.enemies.encounterGroups.some((g) => g.tier === tier)) {
        problems.push(`  - src/data/enemies.json, encounterGroups: no group has tier ${tier}, but balance.json undergroundGenerator.encounters has ${tiers} tiers`);
      }
    }
    for (const group of data.enemies.encounterGroups) {
      if (group.tier > tiers) problems.push(`  - src/data/enemies.json, encounterGroups ${group.id}: tier ${group.tier} is never used (balance.json has ${tiers} tiers)`);
    }
  }
  if (data.biomes && data.manifest) {
    // Every biome needs its map images (with "file": null the game draws a placeholder from the biome's colours).
    for (const [id, biome] of Object.entries(data.biomes.biomes)) {
      const keys = [`map_rock_${id}`, ...Object.keys(biome.ground).map((g) => `map_ground_${id}_${g}`), ...biome.decorations.map((k) => `map_deco_${k}`)];
      const missing = keys.filter((key) => !(key in data.manifest!.images));
      if (missing.length > 0) problems.push(`  - src/assets/manifest.json: biome ${id} needs these images (use "file": null for a placeholder): ${missing.join(', ')}`);
    }
  }
  if (problems.length > 0) throw new DataError(`Data files don't match each other:\n${problems.join('\n')}`);
}
