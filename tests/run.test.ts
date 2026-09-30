import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { hex, hexDistance, hexKey, hexesInRange } from '../src/sim/hex';
import type { HexMap, TerrainTable, Tile } from '../src/sim/map';
import { hexesSeenFrom, updateVisibility } from '../src/sim/map';
import { createRun, endTurn, moveHydra, reachableHexes, winPendingBattle } from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';

const rules = runRulesFrom(loadGameData().balance);
const terrain: TerrainTable = {
  water: { moveCost: 1, blocksSight: false },
  mud: { moveCost: 1, blocksSight: false },
  rock: { moveCost: null, blocksSight: true },
};

/** A hand-made all-mud map, so tests don't depend on the generator. */
function flatMap(radius: number, edit: (tiles: Map<string, Tile>) => void = () => {}): HexMap {
  const tiles = new Map<string, Tile>();
  for (const h of hexesInRange(hex(0, 0), radius)) tiles.set(hexKey(h), { hex: h, terrain: 'mud', object: null });
  tiles.get('0,0')!.object = { kind: 'lair' };
  edit(tiles);
  return { radius, tiles, lair: hex(0, 0) };
}

function runOn(map: HexMap, movement = 5): RunState {
  const state = createRun(1, { ...rules, terrain, movementPointsPerTurn: movement });
  state.map = map;
  state.hydra = { position: map.lair, movementLeft: movement };
  state.visibility = new Map();
  // Tests know the whole map, so every hex can be targeted.
  for (const key of map.tiles.keys()) state.visibility.set(key, 'remembered');
  updateVisibility(state.visibility, hexesSeenFrom(map, map.lair, 2, terrain));
  return state;
}

const testRules = { ...rules, terrain, movementPointsPerTurn: 5, sightRangeHexes: 2 };

describe('visibility', () => {
  it('rock blocks sight behind it', () => {
    const map = flatMap(4, (tiles) => {
      tiles.get('1,0')!.terrain = 'rock';
    });
    const seen = hexesSeenFrom(map, hex(0, 0), 2, terrain);
    expect(seen.has('1,0')).toBe(true);
    expect(seen.has('2,0')).toBe(false);
    expect(seen.has('0,2')).toBe(true);
  });

  it('visible hexes become remembered when out of sight, and discoveries are counted once', () => {
    const vis = new Map();
    expect(updateVisibility(vis, new Set(['a', 'b']))).toBe(2);
    expect(updateVisibility(vis, new Set(['b', 'c']))).toBe(1);
    expect(vis.get('a')).toBe('remembered');
    expect(vis.get('b')).toBe('visible');
  });
});

describe('movement', () => {
  it('reaches exactly the hexes within movement points', () => {
    const state = runOn(flatMap(8), 5);
    const reach = reachableHexes(state, testRules);
    for (const h of hexesInRange(hex(0, 0), 8)) {
      if (hexKey(h) === '0,0') continue;
      expect(reach.has(hexKey(h)), hexKey(h)).toBe(hexDistance(h, hex(0, 0)) <= 5);
    }
  });

  it('cannot cross unexplored hexes or rock', () => {
    const state = runOn(flatMap(4, (tiles) => {
      tiles.get('1,0')!.terrain = 'rock';
    }));
    state.visibility.delete('0,1');
    const reach = reachableHexes(state, testRules);
    expect(reach.has('1,0')).toBe(false);
    expect(reach.has('0,1')).toBe(false);
  });

  it('spends movement, reveals the map and raises Alert for new hexes', () => {
    const state = runOn(flatMap(8), 5);
    state.visibility = new Map();
    for (const h of hexesInRange(hex(0, 0), 3)) state.visibility.set(hexKey(h), 'remembered');
    const events = moveHydra(state, hex(3, 0), testRules);
    expect(hexKey(state.hydra.position)).toBe('3,0');
    expect(state.hydra.movementLeft).toBe(2);
    expect(events.some((e) => e.type === 'discovered')).toBe(true);
    expect(state.alert).toBeGreaterThan(0);
    expect(state.visibility.get('5,0')).toBe('visible');
  });

  it('collects muck on the way', () => {
    const state = runOn(flatMap(4, (tiles) => {
      tiles.get('1,0')!.object = { kind: 'muck', amount: 10 };
    }));
    moveHydra(state, hex(2, 0), testRules);
    expect(state.resources.muck).toBe(10);
    expect(state.map.tiles.get('1,0')!.object).toBeNull();
  });

  it('stops on an encounter and blocks moving until the battle is resolved', () => {
    const state = runOn(flatMap(4, (tiles) => {
      tiles.get('2,0')!.object = { kind: 'encounter' };
    }));
    expect(reachableHexes(state, testRules).has('3,0')).toBe(true); // around it, not through
    const events = moveHydra(state, hex(2, 0), testRules);
    expect(events.some((e) => e.type === 'battleStarted')).toBe(true);
    expect(moveHydra(state, hex(0, 0), testRules)).toEqual([]);
    expect(endTurn(state, testRules)).toEqual([]);

    const alertBefore = state.alert;
    winPendingBattle(state, testRules);
    expect(state.pendingBattle).toBeNull();
    expect(state.map.tiles.get('2,0')!.object).toBeNull();
    expect(state.alert).toBe(alertBefore + testRules.alertPerBattle);
  });

  it('End Turn restores movement', () => {
    const state = runOn(flatMap(4));
    moveHydra(state, hex(2, 0), testRules);
    endTurn(state, testRules);
    expect(state.turn).toBe(2);
    expect(state.hydra.movementLeft).toBe(5);
  });
});

describe('createRun', () => {
  it('starts at the lair with the start area visible and Alert at minimum', () => {
    const state = createRun(123, rules);
    expect(hexKey(state.hydra.position)).toBe(hexKey(state.map.lair));
    expect(state.visibility.get(hexKey(state.map.lair))).toBe('visible');
    expect(state.alert).toBe(rules.alertMin);
    expect(state.hydra.movementLeft).toBe(rules.movementPointsPerTurn);
  });
});
