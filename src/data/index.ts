// All data files, validated once at startup. Import game data from here, not from the JSON files directly.

import balanceJson from './balance.json';
import paletteJson from './palette.json';
import textJson from './text.json';
import headsJson from './heads.json';
import enemiesJson from './enemies.json';
import combosJson from './combos.json';
import manifestJson from '../assets/manifest.json';
import { balanceSchema, combosSchema, enemiesSchema, headsSchema, manifestSchema, paletteSchema, textSchema } from './schemas';
import type { AssetManifest, Balance, CombosData, EnemiesData, GameText, HeadsData, Palette } from './schemas';
import { DataError, validateData } from './validate';

export interface GameData {
  balance: Balance;
  palette: Palette;
  text: GameText;
  manifest: AssetManifest;
  heads: HeadsData;
  enemies: EnemiesData;
  combos: CombosData;
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
  };
  checkCrossReferences(data);
  return data;
}

/** Names that one data file borrows from another must exist there. */
export function checkCrossReferences(data: Pick<GameData, 'heads' | 'combos'>): void {
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
  if (problems.length > 0) throw new DataError(`Data files don't match each other:\n${problems.join('\n')}`);
}
