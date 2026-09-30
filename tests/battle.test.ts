import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { applyCommand, applyStatus, battleResult, createBattle, createMistCloud, distance, enemyArmor, enemySpeed, hasStatus, neckReach, stepBattle } from '../src/sim/battle';
import type { BattleRules, BattleState, HeadRecord } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses = ['biter', 'acidSpitter', 'mistBreather'], seed = 1, bodyHp = 120): BattleState {
  return createBattle({ seed, heads: heads(...headClasses), bodyHp, bodyMaxHp: 120, enemies, firstFreeId: 100 }, rules);
}

function runUntilEnd(state: BattleState, r: BattleRules = rules, maxTicks = 20 * 300): BattleState {
  while (!state.outcome && state.tick < maxTicks) stepBattle(state, r);
  return state;
}

describe('battle simulation', () => {
  it('is deterministic: same seed and commands give the same battle', () => {
    const play = () => {
      const s = battle(['manAtArms', 'torchbearer', 'headhunter'], undefined, 7);
      for (let t = 0; t < 400 && !s.outcome; t++) {
        if (t === 20) applyCommand(s, { type: 'moveBody', to: { x: 250, y: 100 } }, rules);
        if (t === 60) applyCommand(s, { type: 'attack', headId: 'h1', enemyId: 2 }, rules);
        stepBattle(s, rules);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
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

  it('heads never reach further than their necks', () => {
    const s = battle(['manAtArms', 'headhunter']);
    for (let t = 0; t < 600 && !s.outcome; t++) {
      stepBattle(s, rules);
      for (const h of s.heads) expect(distance(h.pos, s.body.pos)).toBeLessThanOrEqual(neckReach(rules) + 0.01);
    }
  });

  it('body walks to the ordered point and stays inside the arena', () => {
    const s = battle(['manAtArms']);
    applyCommand(s, { type: 'moveBody', to: { x: -500, y: 150 } }, rules);
    for (let t = 0; t < 400; t++) stepBattle(s, { ...rules, enemyTypes: rules.enemyTypes });
    expect(s.body.pos.x).toBeGreaterThanOrEqual(rules.body.radius);
  });
});

describe('severing, regrowth and cauterizing', () => {
  /** A battle where the only head is about to be cut off by a Man-at-Arms standing next to it. */
  function aboutToSever(enemy: string): BattleState {
    // A Biter, not a Mist Breather: its mist would put the Torchbearer's torch out (Smother).
    const s = battle([enemy], ['biter']);
    const head = s.heads[0]!;
    head.hp = 1;
    s.enemies[0]!.pos = { x: head.pos.x + 8, y: head.pos.y };
    s.enemies[0]!.cooldown = 0;
    return s;
  }

  it('a head at 0 HP is severed, and two new heads grow from the stump after regrowSeconds', () => {
    const s = aboutToSever('manAtArms');
    stepBattle(s, rules);
    expect(s.heads).toHaveLength(0);
    expect(s.stumps).toHaveLength(1);
    expect(s.events.some((e) => e.type === 'severed')).toBe(true);

    // Keep the enemy away so it doesn't kill the body meanwhile.
    s.enemies[0]!.hp = 99999;
    for (let t = 0; t < rules.regrowTicks; t++) {
      s.enemies[0]!.pos = { x: 600, y: 20 };
      stepBattle(s, rules);
    }
    expect(s.stumps).toHaveLength(0);
    expect(s.heads).toHaveLength(2);
    const [a, b] = s.heads;
    expect(a!.level).toBe(1);
    expect(a!.twinGroup).toBe(b!.twinGroup);
    expect(a!.name).not.toBe(b!.name);
    expect(new Set(s.heads.map((h) => h.id)).size).toBe(2);
  });

  it('a Torchbearer standing at a stump cauterizes it, and it never regrows', () => {
    const s = aboutToSever('torchbearer');
    // Make the torchbearer strong enough to sever the head with its weak attack.
    stepBattle(s, rules);
    expect(s.stumps).toHaveLength(1);
    s.enemies[0]!.hp = 99999;
    const cauterizeTicks = rules.enemyTypes.torchbearer!.cauterizeTicks!;
    for (let t = 0; t < rules.regrowTicks + 5; t++) stepBattle(s, rules);
    expect(cauterizeTicks).toBeLessThan(rules.regrowTicks);
    expect(s.stumps[0]!.cauterized).toBe(true);
    expect(s.heads).toHaveLength(0);
  });

  it('never grows past the head limit', () => {
    const r = { ...rules, maxHeads: 3 };
    const s = createBattle({ seed: 3, heads: heads('biter', 'biter', 'biter'), bodyHp: 120, bodyMaxHp: 120, enemies: ['manAtArms'], firstFreeId: 10 }, r);
    s.heads[0]!.hp = 1;
    s.enemies[0]!.pos = { x: s.heads[0]!.pos.x + 8, y: s.heads[0]!.pos.y };
    s.enemies[0]!.cooldown = 0;
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
  /** One head of the given class with one enemy parked where the head can hit it; the enemy never dies or fights back. */
  function duel(headClass: string, enemyType: string): BattleState {
    const s = battle([enemyType], [headClass]);
    const enemy = s.enemies[0]!;
    enemy.pos = { x: s.body.pos.x + 70, y: s.body.pos.y };
    enemy.hp = enemy.maxHp = 99999;
    return s;
  }
  /** Rules where enemies stand still and never attack, so tests can watch the heads work. */
  const passive: BattleRules = {
    ...rules,
    enemyTypes: Object.fromEntries(
      Object.entries(rules.enemyTypes).map(([id, t]) => [id, { ...t, speed: 0, attack: { ...t.attack, range: 0.001, damage: 0 } }]),
    ),
  };
  function combosIn(s: BattleState, ticks: number, r: BattleRules = passive): string[] {
    const seen: string[] = [];
    for (let t = 0; t < ticks; t++) {
      stepBattle(s, r);
      for (const e of s.events) if (e.type === 'combo') seen.push(e.comboId);
    }
    return seen;
  }

  it('the Acid Spitter leaves Corroded, which lowers armor, hurts every second and wears off', () => {
    const s = duel('acidSpitter', 'manAtArms');
    const enemy = s.enemies[0]!;
    expect(enemyArmor(enemy, passive)).toBe(1);
    for (let t = 0; t < 40 && !hasStatus(enemy, 'corroded'); t++) stepBattle(s, passive);
    expect(hasStatus(enemy, 'corroded')).toBe(true);
    expect(enemyArmor(enemy, passive)).toBe(0);

    // No more spitting: the status ticks for damage, then runs out.
    s.heads = [];
    const hpBefore = enemy.hp;
    let statusHits = 0;
    for (let t = 0; t < passive.statuses.corroded!.durationTicks + 1; t++) {
      stepBattle(s, passive);
      statusHits += s.events.filter((e) => e.type === 'hit' && e.attacker === 'status').length;
    }
    expect(statusHits).toBeGreaterThan(0);
    expect(enemy.hp).toBe(hpBefore - statusHits * passive.statuses.corroded!.damagePerSecond);
    expect(hasStatus(enemy, 'corroded')).toBe(false);
    expect(enemyArmor(enemy, passive)).toBe(1);
  });

  it('Corrode & Crush: a bite on a Corroded enemy hits harder and breaks its armor for good', () => {
    const s = duel('biter', 'manAtArms');
    const enemy = s.enemies[0]!;
    expect(combosIn(s, 60)).toEqual([]); // plain bites are no combo

    applyStatus(s, enemy, 'corroded', passive);
    const hpBefore = enemy.hp;
    const seen = combosIn(s, 30);
    expect(seen).toEqual(['corrodeAndCrush']);
    const bite = passive.headClasses.biter!.attack.damage;
    expect(hpBefore - enemy.hp).toBeGreaterThan(bite);
    expect(enemy.armorBroken).toBe(true);
    expect(hasStatus(enemy, 'corroded')).toBe(false);
    expect(enemyArmor(enemy, passive)).toBe(0);
  });

  it('the Mist Breather leaves a cloud that soaks and slows people inside it', () => {
    const s = duel('mistBreather', 'manAtArms');
    const enemy = s.enemies[0]!;
    for (let t = 0; t < 60 && s.clouds.length === 0; t++) stepBattle(s, passive);
    expect(s.clouds).toHaveLength(1);
    stepBattle(s, passive);
    expect(hasStatus(enemy, 'soaked')).toBe(true);
    expect(enemySpeed(enemy, rules)).toBeLessThan(rules.enemyTypes.manAtArms!.speed);

    // Breathing on the same spot keeps one cloud going instead of stacking new ones.
    for (let t = 0; t < 200; t++) stepBattle(s, passive);
    expect(s.clouds).toHaveLength(1);

    // Without the breather the cloud fades, and the soaking wears off.
    s.heads = [];
    for (let t = 0; t < passive.mistCloud.durationTicks + passive.statuses.soaked!.durationTicks + 1; t++) stepBattle(s, passive);
    expect(s.clouds).toHaveLength(0);
    expect(hasStatus(enemy, 'soaked')).toBe(false);
  });

  it('Acid Fog: acid spat at an enemy in mist turns the cloud acid, and it hurts everyone inside', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['acidSpitter']);
    const [target, bystander] = s.enemies;
    target!.pos = { x: s.body.pos.x + 70, y: s.body.pos.y };
    bystander!.pos = { x: target!.pos.x + 10, y: target!.pos.y + 10 };
    for (const e of s.enemies) e.hp = e.maxHp = 99999;
    createMistCloud(s, target!.pos, passive);
    applyCommand(s, { type: 'attack', headId: 'h1', enemyId: target!.id }, passive);

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
    enemy.pos = { x: s.body.pos.x + rules.body.radius + 8, y: s.body.pos.y };
    createMistCloud(s, enemy.pos, rules);

    const seen: string[] = [];
    for (let t = 0; t < rules.regrowTicks + 1; t++) {
      // Keep the mist there, as a Mist Breather would.
      createMistCloud(s, enemy.pos, rules);
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
    enemy.pos = { x: s.body.pos.x + rules.body.radius + 8, y: s.body.pos.y };
    createMistCloud(s, enemy.pos, rules);
    stepBattle(s, rules);
    expect(s.tick).toBeLessThan(enemy.torchOutUntilTick);
    for (let t = 0; t < 20 * 20 && !s.stumps[0]!.cauterized; t++) stepBattle(s, rules);
    expect(s.stumps[0]!.cauterized).toBe(true);
    expect(s.tick).toBeGreaterThan(rules.mistCloud.durationTicks);
  });

  it('the three M1 combos are in combos.json', () => {
    const ids = rules.combos.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['corrodeAndCrush', 'acidFog', 'smother']));
  });
});
