import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { applyCommand, battleResult, createBattle, distance, neckReach, stepBattle } from '../src/sim/battle';
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
    const s = battle([enemy], ['mistBreather']);
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
