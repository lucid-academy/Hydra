import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { balanceSchema } from '../src/data/schemas';
import { DataError, validateData } from '../src/data/validate';
import { placeholderDrawers } from '../src/assets/placeholders';

describe('data files', () => {
  it('all current data files are valid', () => {
    expect(() => loadGameData()).not.toThrow();
  });

  it('every manifest image without a file has a placeholder', () => {
    const { manifest } = loadGameData();
    for (const [key, entry] of Object.entries(manifest.images)) {
      if (entry.file === null) expect(placeholderDrawers[key], key).toBeDefined();
    }
  });
});

describe('validateData', () => {
  const good = { map: { movementPointsPerTurn: 3, sightRangeHexes: 2 }, alert: { min: 0, max: 100 }, battle: { ticksPerSecond: 20 } };

  it('names the file and the field when a value has the wrong type', () => {
    const bad = { ...good, map: { ...good.map, movementPointsPerTurn: 'three' } };
    expect(() => validateData('balance.json', balanceSchema, bad)).toThrow(DataError);
    expect(() => validateData('balance.json', balanceSchema, bad)).toThrow(/balance\.json[\s\S]*map\.movementPointsPerTurn/);
  });

  it('catches a misspelled field name', () => {
    const typo = { ...good, map: { ...good.map, sightRangeHexs: 2 } };
    expect(() => validateData('balance.json', balanceSchema, typo)).toThrow(/sightRangeHex/);
  });
});
