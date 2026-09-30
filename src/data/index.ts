// All data files, validated once at startup. Import game data from here, not from the JSON files directly.

import balanceJson from './balance.json';
import paletteJson from './palette.json';
import textJson from './text.json';
import headsJson from './heads.json';
import enemiesJson from './enemies.json';
import manifestJson from '../assets/manifest.json';
import { balanceSchema, enemiesSchema, headsSchema, manifestSchema, paletteSchema, textSchema } from './schemas';
import type { AssetManifest, Balance, EnemiesData, GameText, HeadsData, Palette } from './schemas';
import { validateData } from './validate';

export interface GameData {
  balance: Balance;
  palette: Palette;
  text: GameText;
  manifest: AssetManifest;
  heads: HeadsData;
  enemies: EnemiesData;
}

export function loadGameData(): GameData {
  return {
    balance: validateData('src/data/balance.json', balanceSchema, balanceJson),
    palette: validateData('src/data/palette.json', paletteSchema, paletteJson),
    text: validateData('src/data/text.json', textSchema, textJson),
    manifest: validateData('src/assets/manifest.json', manifestSchema, manifestJson),
    heads: validateData('src/data/heads.json', headsSchema, headsJson),
    enemies: validateData('src/data/enemies.json', enemiesSchema, enemiesJson),
  };
}
