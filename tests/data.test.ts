import { describe, expect, it } from 'vitest';
import { checkCrossReferences, loadGameData } from '../src/data';
import { balanceSchema, combosSchema } from '../src/data/schemas';
import { DataError, validateData } from '../src/data/validate';
import { placeholderFor } from '../src/assets/placeholders';
import { isTerrainTextureKey } from '../src/assets/terrain';

describe('data files', () => {
  it('all current data files are valid', () => {
    expect(() => loadGameData()).not.toThrow();
  });

  it('every manifest image without a file has a placeholder', () => {
    const { manifest } = loadGameData();
    for (const [key, entry] of Object.entries(manifest.images)) {
      // Terrain textures are raw material for tiles: without one, the tiles keep their own placeholders.
      if (entry.file === null && !isTerrainTextureKey(key)) expect(placeholderFor(key), key).toBeDefined();
    }
  });
});

describe('map graphics', () => {
  it('every biome has its ground, rock and decoration images in the manifest', () => {
    const { manifest, biomes } = loadGameData();
    const missing: string[] = [];
    for (const [id, biome] of Object.entries(biomes.biomes)) {
      const keys = [
        `map_rock_${id}`,
        ...Object.keys(biome.ground).map((ground) => `map_ground_${id}_${ground}`),
        ...biome.decorations.map((kind) => `map_deco_${kind}`),
        `battle_tile_${id}_ground`,
        `battle_tile_${id}_water`,
      ];
      for (const key of keys) if (!(key in manifest.images)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });
});

describe('validateData', () => {
  const good = loadGameData().balance;

  it('names the file and the field when a value has the wrong type', () => {
    const bad = { ...good, map: { ...good.map, movementPointsPerTurn: 'three' } };
    expect(() => validateData('balance.json', balanceSchema, bad)).toThrow(DataError);
    expect(() => validateData('balance.json', balanceSchema, bad)).toThrow(/balance\.json[\s\S]*map\.movementPointsPerTurn/);
  });

  it('accepts the real file and catches a misspelled field name', () => {
    expect(() => validateData('balance.json', balanceSchema, good)).not.toThrow();
    const typo = { ...good, map: { ...good.map, sightRangeHexs: 2 } };
    expect(() => validateData('balance.json', balanceSchema, typo)).toThrow(/Unrecognized key: "sightRangeHexs"/);
  });

  it('allows "//" notes in data files', () => {
    expect(() => validateData('balance.json', balanceSchema, { ...good, '//': 'TODO(design): note' })).not.toThrow();
  });
});

describe('combos.json', () => {
  const data = loadGameData();

  it('catches a combo that names a status which does not exist', () => {
    const bad = structuredClone(data.combos);
    bad.combos[0]!.conditions.enemyHasStatus = 'corrodedd';
    expect(() => validateData('combos.json', combosSchema, bad)).toThrow(/combos\.0\.conditions\.enemyHasStatus: unknown status "corrodedd"/);
  });

  it('catches an effect type that does not exist', () => {
    const bad = structuredClone(data.combos) as unknown as { combos: Array<{ effects: unknown[] }> };
    bad.combos[0]!.effects = [{ type: 'explode' }];
    expect(() => validateData('combos.json', combosSchema, bad)).toThrow(DataError);
  });

  it('catches a head attack with a status that combos.json does not know', () => {
    const heads = structuredClone(data.heads);
    heads.classes.acidSpitter!.attack.appliesStatus = 'melted';
    expect(() => checkCrossReferences({ heads, combos: data.combos })).toThrow(/heads\.json[\s\S]*unknown status "melted"/);
  });

  it('catches a combo waiting for an attack tag no head has', () => {
    const combos = structuredClone(data.combos);
    combos.combos[0]!.conditions.attackTag = 'bight';
    expect(() => checkCrossReferences({ heads: data.heads, combos })).toThrow(/combos\.json[\s\S]*"bight"/);
  });
});
