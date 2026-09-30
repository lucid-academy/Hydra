import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { hexDistance, hexKey, hexesInRange } from '../src/sim/hex';
import { floodFill, generateUnderground } from '../src/sim/map';
import type { HexMap } from '../src/sim/map';

const rules = runRulesFrom(loadGameData());
const settings = rules.generator;
const SEEDS = 1000;

function describeMap(map: HexMap): string {
  return [...map.tiles.values()].map((t) => `${hexKey(t.hex)}:${t.terrain}:${t.object?.kind ?? '-'}`).join('|');
}

describe('generateUnderground', () => {
  it('is deterministic: the same seed gives the same map', () => {
    for (const seed of [1, 42, 123456]) {
      expect(describeMap(generateUnderground(seed, settings, rules.terrain))).toBe(
        describeMap(generateUnderground(seed, settings, rules.terrain)),
      );
    }
  });

  it('different seeds give different maps', () => {
    expect(describeMap(generateUnderground(1, settings, rules.terrain))).not.toBe(
      describeMap(generateUnderground(2, settings, rules.terrain)),
    );
  });

  it(`follows the map rules on ${SEEDS} seeds`, () => {
    const expectedHexes = hexesInRange({ q: 0, r: 0 }, settings.radius).length;
    for (let seed = 0; seed < SEEDS; seed++) {
      const map = generateUnderground(seed, settings, rules.terrain);
      const where = `seed ${seed}`;

      expect(map.tiles.size, where).toBe(expectedHexes);
      expect(hexKey(map.lair), where).toBe('0,0'); // lair in the centre
      expect(map.tiles.get(hexKey(map.lair))?.object?.kind, where).toBe('lair');

      // Every open hex, and so every object, is reachable from the lair.
      const reachable = floodFill(map.tiles, map.lair, rules.terrain);
      const open = [...map.tiles.values()].filter((t) => rules.terrain[t.terrain].moveCost !== null);
      expect(reachable.size, where).toBe(open.length);
      expect(open.length, where).toBeGreaterThanOrEqual(expectedHexes * settings.minPassableShare);

      const objects = [...map.tiles.values()].filter((t) => t.object !== null);
      for (const t of objects) {
        expect(reachable.has(hexKey(t.hex)), `${where} ${hexKey(t.hex)}`).toBe(true);
      }

      // Counts (one object per tile is guaranteed by the data structure).
      const count = (kind: string) => objects.filter((t) => t.object!.kind === kind).length;
      expect(count('lair'), where).toBe(1);
      expect(count('encounter'), where).toBe(settings.encounterCount);
      expect(count('muck'), where).toBe(settings.muckDepositCount);

      for (const t of objects.filter((o) => o.object!.kind === 'encounter')) {
        expect(hexDistance(t.hex, map.lair), where).toBeGreaterThanOrEqual(settings.encounterMinDistanceFromLair);
      }
    }
  });
});
