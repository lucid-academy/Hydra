// Owns the current run and passes commands from the scenes to sim/.
// Scenes listen for 'changed' to redraw, and for 'events' to animate what just happened.

import * as Phaser from 'phaser';
import { battleRulesFrom } from '../data/battleRules';
import { runRulesFrom } from '../data/runRules';
import type { BattleResult, BattleRules, BattleSetup } from '../sim/battle';
import type { Hex } from '../sim/hex';
import { hex } from '../sim/hex';
import { createRun, endTurn, finishBattle, moveHydra, pendingBattleSetup, reachableHexes } from '../sim/turn';
import type { Reachable, RunEvent, RunRules, RunState } from '../sim/turn';
import { getContext } from './context';

const REGISTRY_KEY = 'run';

export class RunController extends Phaser.Events.EventEmitter {
  readonly rules: RunRules;
  readonly battleRules: BattleRules;
  readonly state: RunState;

  constructor(seed: number, rules: RunRules, battleRules: BattleRules) {
    super();
    this.rules = rules;
    this.battleRules = battleRules;
    this.state = createRun(seed, rules);
  }

  reachable(): Map<string, Reachable> {
    return reachableHexes(this.state, this.rules);
  }

  moveTo(target: Hex): void {
    this.publish(moveHydra(this.state, target, this.rules));
  }

  endTurn(): void {
    this.publish(endTurn(this.state, this.rules));
  }

  battleSetup(): BattleSetup | null {
    return pendingBattleSetup(this.state, this.rules);
  }

  finishBattle(result: BattleResult): void {
    this.publish(finishBattle(this.state, result, this.rules));
  }

  /** For `?scene=battle`: a battle against the given group without walking to it. */
  startTestBattle(groupId: string): void {
    this.state.pendingBattle = { at: hex(0, 0), groupId };
  }

  private publish(events: RunEvent[]): void {
    if (events.length === 0) return;
    this.emit('events', events);
    this.emit('changed');
  }
}

/** Starts a new run with the seed from the game context and stores it for all scenes. */
export function startNewRun(scene: Phaser.Scene, seed = getContext(scene).seed): RunController {
  const { data } = getContext(scene);
  const run = new RunController(seed, runRulesFrom(data), battleRulesFrom(data));
  scene.registry.set(REGISTRY_KEY, run);
  return run;
}

export function getRun(scene: Phaser.Scene): RunController | undefined {
  return scene.registry.get(REGISTRY_KEY) as RunController | undefined;
}

export function requireRun(scene: Phaser.Scene): RunController {
  const run = getRun(scene);
  if (!run) throw new Error('No run in progress: call startNewRun() first.');
  return run;
}
