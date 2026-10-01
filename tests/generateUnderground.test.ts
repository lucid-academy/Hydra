import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { hexDistance, hexKey, hexNeighbors, hexesInRange } from '../src/sim/hex';
import { encounterTier, floodFill, generateUnderground } from '../src/sim/map';
import type { HexMap, Tile } from '../src/sim/map';

const data = loadGameData();
const rules = runRulesFrom(data);
const settings = rules.generator;
const SEEDS = 1000;

function describeMap(map: HexMap): string {
  return [...map.tiles.values()].map((t) => `${hexKey(t.hex)}:${t.biome}:${t.terrain}:${t.object?.kind ?? '-'}`).join('|');
}

function objectsOf(map: HexMap, kind: string): Tile[] {
  return [...map.tiles.values()].filter((t) => t.object?.kind === kind);
}

describe('generateUnderground', () => {
  it('is deterministic: the same seed gives the same map', () => {
    for (const seed of [1, 42, 123456]) {
      expect(describeMap(generateUnderground(seed, settings, rules.terrain))).toBe(describeMap(generateUnderground(seed, settings, rules.terrain)));
    }
  });

  it('different seeds give different maps', () => {
    expect(describeMap(generateUnderground(1, settings, rules.terrain))).not.toBe(describeMap(generateUnderground(2, settings, rules.terrain)));
  });

  it('gives each tier of encounters the right distance from the lair', () => {
    const starts = [0, 7, 11];
    expect(encounterTier(0, starts)).toBe(1);
    expect(encounterTier(6, starts)).toBe(1);
    expect(encounterTier(7, starts)).toBe(2);
    expect(encounterTier(20, starts)).toBe(3);
  });

  it(`follows the map rules of GAME_DESIGN.md section 9 on ${SEEDS} seeds`, () => {
    const expectedHexes = hexesInRange({ q: 0, r: 0 }, settings.radius).length;
    const biomeIds = [settings.lairBiome.id, ...settings.outerBiomes.map((b) => b.id)];
    let innerEncounters = 0;
    let outerEncounters = 0;
    let innerHexes = 0;
    let outerHexes = 0;

    for (let seed = 0; seed < SEEDS; seed++) {
      const map = generateUnderground(seed, settings, rules.terrain);
      const where = `seed ${seed}`;
      const fromLair = (t: Tile) => hexDistance(t.hex, map.lair);

      expect(map.tiles.size, where).toBe(expectedHexes);
      expect(hexKey(map.lair), where).toBe('0,0'); // the lair in the middle
      expect(map.tiles.get(hexKey(map.lair))?.object?.kind, where).toBe('lair');

      // Every hex belongs to a known biome; the lair stands in its own swamp, and every biome is really there.
      const unknownBiomes = [...map.tiles.values()].filter((t) => !biomeIds.includes(t.biome));
      expect(unknownBiomes, where).toEqual([]);
      expect(map.tiles.get(hexKey(map.lair))!.biome, where).toBe(settings.lairBiome.id);
      const biomeSize = (id: string) => [...map.tiles.values()].filter((t) => t.biome === id).length;
      expect(biomeSize(settings.lairBiome.id), where).toBeGreaterThanOrEqual(hexesInRange({ q: 0, r: 0 }, settings.lairBiomeRadius - 1).length);
      for (const b of settings.outerBiomes) expect(biomeSize(b.id), `${where} ${b.id}`).toBeGreaterThan(40);

      // Every open hex, and so every object, can be reached from the lair.
      const reachable = floodFill(map.tiles, map.lair, rules.terrain);
      const open = [...map.tiles.values()].filter((t) => rules.terrain[t.terrain].moveCost !== null);
      expect(reachable.size, where).toBe(open.length);
      expect(open.length, where).toBeGreaterThanOrEqual(expectedHexes * settings.minPassableShare);
      const unreachableObjects = [...map.tiles.values()].filter((t) => t.object && !reachable.has(hexKey(t.hex)));
      expect(unreachableObjects, where).toEqual([]);

      expect(objectsOf(map, 'lair'), where).toHaveLength(1);
      expect(objectsOf(map, 'muck'), where).toHaveLength(settings.muck.count);
      expect(objectsOf(map, 'moisture'), where).toHaveLength(settings.moisture.count);

      // Shrines and at least two passages to the surface: far enough from the lair and from each other.
      for (const [kind, rule] of [['shrine', settings.shrines], ['passage', settings.passages]] as const) {
        const placed = objectsOf(map, kind);
        expect(placed, `${where} ${kind}`).toHaveLength(rule.count);
        for (const t of placed) expect(fromLair(t), where).toBeGreaterThanOrEqual(rule.minDistanceFromLair);
        for (const a of placed) for (const b of placed) if (a !== b) expect(hexDistance(a.hex, b.hex), where).toBeGreaterThanOrEqual(rule.minDistanceApart);
      }
      expect(objectsOf(map, 'passage').length, where).toBeGreaterThanOrEqual(2);

      // Moisture comes from water: on it or next to it.
      for (const t of objectsOf(map, 'moisture')) {
        const wet = t.terrain === 'water' || hexNeighbors(t.hex).some((n) => map.tiles.get(hexKey(n))?.terrain === 'water');
        expect(wet, where).toBe(true);
      }

      // Encounters: not too close to the lair, and the further out, the stronger the group.
      const encounters = objectsOf(map, 'encounter');
      expect(encounters, where).toHaveLength(settings.encounters.count);
      for (const t of encounters) {
        const object = t.object as { kind: 'encounter'; groupId: string; tier: number };
        expect(fromLair(t), where).toBeGreaterThanOrEqual(settings.encounters.minDistanceFromLair);
        expect(object.tier, where).toBe(encounterTier(fromLair(t), settings.encounters.tierStartsAtDistance));
        expect(settings.encounters.groupsByTier[object.tier]!.map((g) => g.id), where).toContain(object.groupId);
      }
      const middle = settings.radius / 2;
      for (const key of reachable) {
        if (fromLair(map.tiles.get(key)!) <= middle) innerHexes++;
        else outerHexes++;
      }
      innerEncounters += encounters.filter((t) => fromLair(t) <= middle).length;
      outerEncounters += encounters.filter((t) => fromLair(t) > middle).length;
    }

    // Encounters are denser far from the lair than near it.
    expect(outerEncounters / outerHexes).toBeGreaterThan(innerEncounters / innerHexes);
  }, 120_000);
});
