// Owns the current run and passes commands from the scenes to sim/.
// Scenes listen for 'changed' to redraw, and for 'events' to animate what just happened.

import * as Phaser from 'phaser';
import { runRulesFrom } from '../data/runRules';
import type { Hex } from '../sim/hex';
import { createRun, endTurn, moveHydra, reachableHexes, winPendingBattle } from '../sim/turn';
import type { Reachable, RunEvent, RunRules, RunState } from '../sim/turn';
import { getContext } from './context';

const REGISTRY_KEY = 'run';

export class RunController extends Phaser.Events.EventEmitter {
  readonly rules: RunRules;
  readonly state: RunState;

  constructor(seed: number, rules: RunRules) {
    super();
    this.rules = rules;
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

  winBattle(): void {
    this.publish(winPendingBattle(this.state, this.rules));
  }

  private publish(events: RunEvent[]): void {
    if (events.length === 0) return;
    this.emit('events', events);
    this.emit('changed');
  }
}

/** Starts a new run with the seed from the game context and stores it for all scenes. */
export function startNewRun(scene: Phaser.Scene): RunController {
  const { data, seed } = getContext(scene);
  const run = new RunController(seed, runRulesFrom(data.balance));
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
