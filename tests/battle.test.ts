import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex, hexDistance, hexKey } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import {
  anchorHex,
  applyCommand,
  applyStatus,
  battleResult,
  bodyDistance,
  boardHexes,
  canBodyStandAt,
  createBattle,
  createMistCloud,
  distanceField,
  enemyArmor,
  enemyStepTicks,
  hasStatus,
  headHex,
  isOnBoard,
  rimHexes,
  stepBattle,
} from '../src/sim/battle';
import type { BattleRules, BattleState, Enemy, HeadRecord } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);
const MIDDLE = hex(0, 0);

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses = ['biter', 'acidSpitter', 'mistBreather'], seed = 1, bodyHp = 150): BattleState {
  return createBattle({ seed, heads: heads(...headClasses), bodyHp, bodyMaxHp: 150, enemies, firstFreeId: 100 }, rules);
}

function runUntilEnd(state: BattleState, r: BattleRules = rules, maxTicks = 20 * 600): BattleState {
  while (!state.outcome && state.tick < maxTicks) stepBattle(state, r);
  return state;
}

/** Puts an enemy on a hex, standing still (not half-way through a step). */
function place(enemy: Enemy, at: Hex): void {
  enemy.hex = at;
  enemy.stepFrom = at;
  enemy.stepEndTick = 0;
}

/** An enemy that stays where it is and never acts (as if forever on its way), with plenty of HP. */
function freeze(enemy: Enemy, at: Hex): void {
  place(enemy, at);
  enemy.stepEndTick = Number.MAX_SAFE_INTEGER;
  enemy.hp = enemy.maxHp = 99999;
}

function combosIn(s: BattleState, ticks: number, r: BattleRules = rules): string[] {
  const seen: string[] = [];
  for (let t = 0; t < ticks; t++) {
    stepBattle(s, r);
    for (const e of s.events) if (e.type === 'combo') seen.push(e.comboId);
  }
  return seen;
}

describe('the battle board', () => {
  it('is a rectangle of hexes with a middle hex, and every other row one hex shorter', () => {
    const all = boardHexes(rules);
    const rows = new Map<number, number>();
    for (const h of all) rows.set(h.r, (rows.get(h.r) ?? 0) + 1);
    expect(rows.size).toBe(rules.boardRows);
    expect(rows.get(0)).toBe(rules.boardColumns);
    expect(rows.get(1)).toBe(rules.boardColumns - 1);
    expect(all.every((h) => isOnBoard(h, rules))).toBe(true);
    expect(new Set(all.map(hexKey)).size).toBe(all.length);
    expect(canBodyStandAt(MIDDLE, rules)).toBe(true);
  });

  it('knows which hexes are on its edge', () => {
    const rim = rimHexes(rules);
    expect(rim.length).toBeGreaterThan(0);
    expect(rim.some((h) => h.r === 0)).toBe(true);
    expect(rim.every((h) => bodyDistance(MIDDLE, h) >= 2)).toBe(true);
  });

  it('puts each neck on the outer body hex it points at, and settles exact ties the same way every time', () => {
    expect(anchorHex(MIDDLE, 0)).toEqual(hex(1, 0));
    expect(anchorHex(MIDDLE, Math.PI)).toEqual(hex(-1, 0));
    expect(anchorHex(MIDDLE, -Math.PI / 3)).toEqual(hex(1, -1));
    expect(anchorHex(MIDDLE, Math.PI / 2)).toEqual(anchorHex(MIDDLE, Math.PI / 2 + 1e-15));
  });

  it('measures the way around obstacles', () => {
    const blocked = new Set([hexKey(hex(1, 0)), hexKey(hex(1, -1)), hexKey(hex(0, 1))]);
    const field = distanceField([hex(2, 0)], (h) => hexDistance(h, MIDDLE) <= 4 && !blocked.has(hexKey(h)));
    expect(field.get(hexKey(hex(2, 0)))).toBe(0);
    expect(field.get(hexKey(hex(0, 0)))).toBeGreaterThan(2);
  });
});

describe('battle simulation', () => {
  it('is deterministic: same seed and commands give the same battle', () => {
    const play = () => {
      const s = battle(['manAtArms', 'torchbearer', 'headhunter', 'manAtArms'], undefined, 7);
      for (let t = 0; t < 600 && !s.outcome; t++) {
        if (t === 20) applyCommand(s, { type: 'moveBody', to: hex(1, 0) }, rules);
        if (t === 60) applyCommand(s, { type: 'attack', headId: 'h1', enemyId: 2 }, rules);
        stepBattle(s, rules);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });

  it('starts with the body in the middle and the Order spread around it on the edge of the board', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = battle(['manAtArms', 'manAtArms', 'headhunter', 'torchbearer'], undefined, seed);
      expect(s.body.center).toEqual(MIDDLE);
      const rim = new Set(rimHexes(rules).map(hexKey));
      expect(s.enemies.every((e) => rim.has(hexKey(e.hex)))).toBe(true);
      expect(new Set(s.enemies.map((e) => hexKey(e.hex))).size).toBe(4);
      // Surrounded: enemies both left and right of the body, and both above and below it.
      expect(s.enemies.some((e) => e.hex.q + e.hex.r / 2 < 0)).toBe(true);
      expect(s.enemies.some((e) => e.hex.q + e.hex.r / 2 > 0)).toBe(true);
      expect(s.enemies.some((e) => e.hex.r < 0)).toBe(true);
      expect(s.enemies.some((e) => e.hex.r > 0)).toBe(true);
    }
  });

  it('necks leave the body evenly all around', () => {
    const s = battle(['manAtArms'], ['biter', 'biter', 'biter']);
    const sides = s.heads.map((h) => hexKey(anchorHex(s.body.center, h.anchorAngle)));
    expect(new Set(sides).size).toBe(3);
  });

  it('humans walk up to the body, never onto it and never two on one hex', () => {
    const s = battle(['manAtArms', 'manAtArms', 'manAtArms', 'headhunter', 'torchbearer', 'manAtArms'], ['mistBreather'], 3, 99999);
    for (const e of s.enemies) e.hp = e.maxHp = 99999;
    for (let t = 0; t < 20 * 30; t++) {
      stepBattle(s, rules);
      const taken = s.enemies.map((e) => hexKey(e.hex));
      expect(new Set(taken).size).toBe(taken.length);
      for (const e of s.enemies) {
        expect(isOnBoard(e.hex, rules)).toBe(true);
        expect(bodyDistance(s.body.center, e.hex)).toBeGreaterThan(0);
        expect(hexDistance(e.stepFrom, e.hex)).toBeLessThanOrEqual(1);
      }
    }
    // After half a minute, the fighters stand right next to the body.
    const fighters = s.enemies.filter((e) => e.typeId === 'manAtArms');
    expect(fighters.every((e) => bodyDistance(s.body.center, e.hex) === 1)).toBe(true);
  });

  it('a step takes time: an enemy on its way can neither attack nor take another step', () => {
    const s = battle(['manAtArms'], ['mistBreather']);
    const e = s.enemies[0]!;
    place(e, hex(4, 0));
    stepBattle(s, rules);
    expect(e.hex).not.toEqual(hex(4, 0));
    const firstStep = e.hex;
    for (let t = 1; t < rules.enemyTypes.manAtArms!.stepTicks; t++) {
      stepBattle(s, rules);
      expect(e.hex).toEqual(firstStep);
    }
  });

  it('is won when all enemies are dead', () => {
    const s = runUntilEnd(battle(['manAtArms'], ['biter', 'biter', 'biter']));
    expect(s.outcome).toBe('won');
    expect(s.enemies).toHaveLength(0);
  });

  it('is lost when the body dies', () => {
    const s = runUntilEnd(battle(['manAtArms', 'manAtArms', 'headhunter'], ['mistBreather'], 1, 5));
    expect(s.outcome).toBe('lost');
    expect(s.body.hp).toBeLessThanOrEqual(0);
  });

  it('every battle against every group ends, with or without orders', () => {
    for (const group of data.enemies.encounterGroups) {
      for (let seed = 1; seed <= 25; seed++) {
        const s = runUntilEnd(battle([...group.members], undefined, seed));
        expect(s.outcome, `${group.id}, seed ${seed}`).not.toBeNull();
      }
    }
  });
});

describe('heads', () => {
  it('reach only as far as their attack range from the body', () => {
    const s = battle(['manAtArms'], ['biter']);
    const e = s.enemies[0]!;
    const range = rules.headClasses.biter!.attack.range;
    freeze(e, hex(range + 2, 0)); // one hex too far
    stepBattle(s, rules);
    expect(bodyDistance(s.body.center, e.hex)).toBe(range + 1);
    expect(s.heads[0]!.targetId).toBeNull();
    freeze(e, hex(range + 1, 0));
    stepBattle(s, rules);
    expect(s.heads[0]!.targetId).toBe(e.id);
  });

  it('a biting head is out at its enemy; a spitting head stays at the body', () => {
    const s = battle(['manAtArms'], ['biter', 'acidSpitter']);
    const e = s.enemies[0]!;
    freeze(e, hex(3, 0));
    stepBattle(s, rules);
    const [biter, spitter] = s.heads;
    expect(biter!.targetId).toBe(e.id);
    expect(spitter!.targetId).toBe(e.id);
    expect(headHex(s, biter!, rules)).toEqual(e.hex);
    expect(bodyDistance(s.body.center, headHex(s, spitter!, rules))).toBe(0);
  });

  it('left alone each takes the enemy on its own side; an order makes them gang up', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['biter', 'biter']);
    const [east, west] = s.heads;
    east!.anchorAngle = 0;
    west!.anchorAngle = Math.PI;
    const [eastEnemy, westEnemy] = s.enemies;
    freeze(eastEnemy!, hex(2, 0));
    freeze(westEnemy!, hex(-2, 0));
    stepBattle(s, rules);
    expect(east!.targetId).toBe(eastEnemy!.id);
    expect(west!.targetId).toBe(westEnemy!.id);

    applyCommand(s, { type: 'attack', headId: west!.id, enemyId: eastEnemy!.id }, rules);
    stepBattle(s, rules);
    expect(west!.targetId).toBe(eastEnemy!.id);
    expect(east!.targetId).toBe(eastEnemy!.id);
  });

  it('an order waits until its enemy is in reach, and the head fights someone else meanwhile', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['biter']);
    const [near, far] = s.enemies;
    freeze(near!, hex(2, 0));
    freeze(far!, hex(-5, 0));
    applyCommand(s, { type: 'attack', headId: 'h1', enemyId: far!.id }, rules);
    stepBattle(s, rules);
    expect(s.heads[0]!.targetId).toBe(near!.id);
    expect(s.heads[0]!.orderTargetId).toBe(far!.id);
    freeze(far!, hex(-2, 0));
    stepBattle(s, rules);
    expect(s.heads[0]!.targetId).toBe(far!.id);
  });
});

describe('humans', () => {
  it('hit a head next to them before the body', () => {
    const s = battle(['manAtArms'], ['acidSpitter']);
    s.heads[0]!.anchorAngle = 0; // resting on the east side of the body
    const e = s.enemies[0]!;
    place(e, hex(2, 0)); // right next to it
    e.cooldown = 0;
    const hp = s.heads[0]!.hp;
    stepBattle(s, rules);
    expect(s.heads[0]!.hp).toBeLessThan(hp);
    expect(s.body.hp).toBe(150);
  });

  it('hit the body where no head is', () => {
    const s = battle(['manAtArms'], ['acidSpitter']);
    s.heads[0]!.anchorAngle = 0;
    const e = s.enemies[0]!;
    place(e, hex(-2, 0)); // west side, far from the head
    e.cooldown = 0;
    stepBattle(s, rules);
    expect(s.body.hp).toBeLessThan(150);
  });

  it('Headhunters walk around the body to get at the heads', () => {
    const s = battle(['headhunter'], ['acidSpitter']);
    s.heads[0]!.anchorAngle = 0;
    s.heads[0]!.hp = s.heads[0]!.maxHp = 99999;
    const e = s.enemies[0]!;
    place(e, hex(-2, 0));
    for (let t = 0; t < 20 * 20; t++) stepBattle(s, rules);
    expect(hexDistance(e.hex, anchorHex(s.body.center, 0))).toBe(1);
    expect(s.body.hp).toBe(150);
  });
});

describe('the body', () => {
  it('walks to the ordered spot one step at a time', () => {
    const s = battle(['manAtArms'], ['acidSpitter']);
    freeze(s.enemies[0]!, hex(-5, 4));
    applyCommand(s, { type: 'moveBody', to: hex(3, 0) }, rules);
    for (let t = 0; t < rules.bodyStepTicks * 4; t++) stepBattle(s, rules);
    expect(s.body.center).toEqual(hex(3, 0));
  });

  it('does not walk into anyone, and stays whole on the board', () => {
    const s = battle(['manAtArms'], ['acidSpitter']);
    freeze(s.enemies[0]!, hex(2, 0)); // standing where the body's east side would step
    applyCommand(s, { type: 'moveBody', to: hex(1, 0) }, rules);
    for (let t = 0; t < rules.bodyStepTicks * 3; t++) stepBattle(s, rules);
    expect(s.body.center).toEqual(MIDDLE);

    applyCommand(s, { type: 'moveBody', to: hex(0, -4) }, rules); // the top edge: the body would hang over it
    expect(canBodyStandAt(s.body.moveTarget!, rules)).toBe(true);
  });
});

describe('severing, regrowth and cauterizing', () => {
  /** The only head is about to be cut off by an enemy standing right at it. */
  function aboutToSever(enemy: string): BattleState {
    // A Biter, not a Mist Breather: its mist would put a Torchbearer's torch out (Smother).
    const s = battle([enemy], ['biter']);
    const head = s.heads[0]!;
    head.anchorAngle = 0;
    head.hp = 1;
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    e.cooldown = 0;
    e.hp = e.maxHp = 99999;
    return s;
  }

  it('a head at 0 HP is severed, and two new heads grow from the stump after regrowSeconds', () => {
    const s = aboutToSever('manAtArms');
    stepBattle(s, rules);
    expect(s.heads).toHaveLength(0);
    expect(s.stumps).toHaveLength(1);
    expect(s.events.some((e) => e.type === 'severed')).toBe(true);

    freeze(s.enemies[0]!, hex(-5, 4)); // out of the way, so it doesn't kill the body meanwhile
    for (let t = 0; t < rules.regrowTicks; t++) stepBattle(s, rules);
    expect(s.stumps).toHaveLength(0);
    expect(s.heads).toHaveLength(2);
    const [a, b] = s.heads;
    expect(a!.level).toBe(1);
    expect(a!.twinGroup).toBe(b!.twinGroup);
    expect(a!.name).not.toBe(b!.name);
    expect(new Set(s.heads.map((h) => h.id)).size).toBe(2);
  });

  it('a Torchbearer walks up to a stump and burns it shut; it never regrows', () => {
    const s = aboutToSever('torchbearer');
    stepBattle(s, rules);
    expect(s.stumps).toHaveLength(1);
    // Start it on the far side: it has to walk around the body to the stump.
    place(s.enemies[0]!, hex(-2, 0));
    const cauterizeTicks = rules.enemyTypes.torchbearer!.cauterizeTicks!;
    expect(cauterizeTicks).toBeLessThan(rules.regrowTicks);
    for (let t = 0; t < rules.regrowTicks + 5 && !s.stumps[0]!.cauterized; t++) stepBattle(s, rules);
    expect(s.stumps[0]!.cauterized).toBe(true);
    expect(hexDistance(s.enemies[0]!.hex, anchorHex(s.body.center, 0))).toBe(1);
    for (let t = 0; t < rules.regrowTicks; t++) stepBattle(s, rules);
    expect(s.heads).toHaveLength(0);
  });

  it('never grows past the head limit', () => {
    const r = { ...rules, maxHeads: 3 };
    const s = createBattle({ seed: 3, heads: heads('biter', 'biter', 'biter'), bodyHp: 150, bodyMaxHp: 150, enemies: ['manAtArms'], firstFreeId: 10 }, r);
    s.heads[0]!.hp = 1;
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    e.hp = e.maxHp = 99999;
    e.cooldown = 0;
    s.heads[0]!.anchorAngle = 0;
    stepBattle(s, r);
    expect(s.heads).toHaveLength(2);
    for (let t = 0; t < r.regrowTicks + 1 && !s.outcome; t++) stepBattle(s, r);
    expect(s.heads.length).toBeLessThanOrEqual(3);
  });

  it('battleResult regrows stumps still waiting and counts scars', () => {
    const s = aboutToSever('manAtArms');
    stepBattle(s, rules);
    s.enemies = [];
    stepBattle(s, rules); // no enemies left: the battle is won
    expect(s.outcome).toBe('won');
    const result = battleResult(s, rules);
    expect(result.heads).toHaveLength(2);
    expect(result.newScars).toBe(0);
    expect(result.nextId).toBeGreaterThan(100);
  });
});

describe('statuses, mist clouds and combos', () => {
  /** One head of the given class and one enemy that stands right next to the body and never fights back. */
  function duel(headClass: string, enemyType: string): BattleState {
    const s = battle([enemyType], [headClass]);
    freeze(s.enemies[0]!, hex(2, 0));
    return s;
  }

  it('the Acid Spitter leaves Corroded, which lowers armor, hurts every second and wears off', () => {
    const s = duel('acidSpitter', 'manAtArms');
    const enemy = s.enemies[0]!;
    // Expected values come from the data files, so changing numbers there doesn't break this test.
    const armor = rules.enemyTypes.manAtArms!.armor;
    const corroded = rules.statuses.corroded!;
    expect(corroded.armorChange).toBeLessThan(0);
    expect(corroded.damagePerSecond).toBeGreaterThan(0);
    expect(enemyArmor(enemy, rules)).toBe(armor);
    stepBattle(s, rules); // the first spit lands at once
    expect(hasStatus(enemy, 'corroded')).toBe(true);
    expect(enemyArmor(enemy, rules)).toBe(Math.max(0, armor + corroded.armorChange));

    // No more spitting: the status ticks for damage, then runs out.
    s.heads = [];
    const hpBefore = enemy.hp;
    let statusHits = 0;
    for (let t = 0; t < corroded.durationTicks + 1; t++) {
      stepBattle(s, rules);
      statusHits += s.events.filter((e) => e.type === 'hit' && e.attacker === 'status').length;
    }
    expect(statusHits).toBeGreaterThan(0);
    expect(enemy.hp).toBe(hpBefore - statusHits * corroded.damagePerSecond);
    expect(hasStatus(enemy, 'corroded')).toBe(false);
    expect(enemyArmor(enemy, rules)).toBe(armor);
  });

  it('Corrode & Crush: a bite on a Corroded enemy hits harder and breaks its armor, once', () => {
    const s = duel('biter', 'manAtArms');
    const enemy = s.enemies[0]!;
    const bite = rules.headClasses.biter!.attack;
    const oneBite = bite.cooldownTicks + 1;
    expect(combosIn(s, oneBite)).toEqual([]); // plain bites are no combo

    applyStatus(s, enemy, 'corroded', rules);
    const hpBefore = enemy.hp;
    expect(combosIn(s, oneBite)).toEqual(['corrodeAndCrush']);
    expect(hpBefore - enemy.hp).toBeGreaterThan(bite.damage);
    expect(enemy.armorBroken).toBe(true);
    expect(hasStatus(enemy, 'corroded')).toBe(false);
    expect(enemyArmor(enemy, rules)).toBe(0);

    // Armor can only break once: more acid on the same enemy doesn't set the combo off again.
    applyStatus(s, enemy, 'corroded', rules);
    expect(combosIn(s, oneBite)).toEqual([]);
  });

  it('the Mist Breather leaves a cloud over the hex it hits and the ones around it; people in it are soaked and slower', () => {
    const s = duel('mistBreather', 'manAtArms');
    const enemy = s.enemies[0]!;
    stepBattle(s, rules);
    expect(s.clouds).toHaveLength(1);
    expect(s.clouds[0]!.center).toEqual(enemy.hex);
    stepBattle(s, rules);
    expect(hasStatus(enemy, 'soaked')).toBe(true);
    expect(enemyStepTicks(enemy, rules)).toBeGreaterThan(rules.enemyTypes.manAtArms!.stepTicks);

    // Breathing on the same hex keeps one cloud going instead of stacking new ones.
    for (let t = 0; t < 200; t++) stepBattle(s, rules);
    expect(s.clouds).toHaveLength(1);

    // Without the breather the cloud fades, and the soaking wears off.
    s.heads = [];
    for (let t = 0; t < rules.mistCloud.durationTicks + rules.statuses.soaked!.durationTicks + 1; t++) stepBattle(s, rules);
    expect(s.clouds).toHaveLength(0);
    expect(hasStatus(enemy, 'soaked')).toBe(false);
  });

  it('Acid Fog: acid spat at an enemy in mist turns the cloud acid, and it hurts everyone inside', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['acidSpitter']);
    const [target, bystander] = s.enemies;
    freeze(target!, hex(3, 0));
    freeze(bystander!, hex(4, 0)); // next to the target: inside the same cloud
    createMistCloud(s, target!.hex, rules);
    applyCommand(s, { type: 'attack', headId: 'h1', enemyId: target!.id }, rules);

    const hpBefore = bystander!.hp;
    const seen = combosIn(s, 100);
    expect(seen).toEqual(['acidFog']); // announced once, although the spitter keeps spitting
    expect(bystander!.hp).toBeLessThan(hpBefore);
  });

  it('Smother: a Torchbearer in mist cannot cauterize, so the stump regrows', () => {
    const s = battle(['torchbearer'], ['mistBreather']);
    const enemy = s.enemies[0]!;
    enemy.hp = enemy.maxHp = 99999;
    s.heads = [];
    s.stumps.push({ id: 900, anchorAngle: 0, regrowAtTick: rules.regrowTicks, cauterizeProgress: 0, cauterized: false });
    place(enemy, hex(2, 0)); // right at the stump

    const seen: string[] = [];
    for (let t = 0; t < rules.regrowTicks + 1; t++) {
      createMistCloud(s, enemy.hex, rules); // keep the mist there, as a Mist Breather would
      stepBattle(s, rules);
      for (const e of s.events) if (e.type === 'combo') seen.push(e.comboId);
    }
    expect(seen).toEqual(['smother']);
    expect(s.stumps).toHaveLength(0);
    expect(s.heads).toHaveLength(2);
  });

  it('the torch lights again a few seconds after the mist is gone', () => {
    const s = battle(['torchbearer'], ['mistBreather']);
    const enemy = s.enemies[0]!;
    enemy.hp = enemy.maxHp = 99999;
    s.heads = [];
    s.stumps.push({ id: 900, anchorAngle: 0, regrowAtTick: 99999, cauterizeProgress: 0, cauterized: false });
    place(enemy, hex(2, 0));
    createMistCloud(s, enemy.hex, rules);
    stepBattle(s, rules);
    expect(s.tick).toBeLessThan(enemy.torchOutUntilTick);
    for (let t = 0; t < 20 * 30 && !s.stumps[0]!.cauterized; t++) stepBattle(s, rules);
    expect(s.stumps[0]!.cauterized).toBe(true);
    expect(s.tick).toBeGreaterThan(rules.mistCloud.durationTicks);
  });

  it('the three M1 combos are in combos.json', () => {
    expect(rules.combos.map((c) => c.id)).toEqual(expect.arrayContaining(['corrodeAndCrush', 'acidFog', 'smother']));
  });
});
