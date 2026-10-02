// Owns the current run and passes commands from the scenes to sim/.
// Scenes listen for 'changed' to redraw, and for 'events' to animate what just happened.

import * as Phaser from 'phaser';
import { battleRulesFrom } from '../data/battleRules';
import { runRulesFrom } from '../data/runRules';
import type { BattleResult, BattleRules, BattleSetup } from '../sim/battle';
import type { Hex } from '../sim/hex';
import { hex, hexDistance, hexKey, hexNeighbors } from '../sim/hex';
import { hexesSeenFrom, updateVisibility } from '../sim/map';
import { acceptBlessing, createRun, endTurn, finishBattle, moveHydra, pendingBattleSetup, reachableHexes, refuseBlessing } from '../sim/turn';
import type { Reachable, RunEvent, RunRules, RunState } from '../sim/turn';
import { getContext } from './context';

const REGISTRY_KEY = 'run';

export class RunController extends Phaser.Events.EventEmitter {
  readonly rules: RunRules;
  readonly battleRules: BattleRules;
  readonly state: RunState;
  /** Biomes the player has already been shown the name of (only for the screen; not part of the game state). */
  readonly knownBiomes = new Set<string>();
  /** Events of the last command, for a scene that starts right after it (e.g. the map after a battle). */
  lastEvents: RunEvent[] = [];

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

  acceptBlessing(): void {
    this.publish(acceptBlessing(this.state, this.rules));
  }

  refuseBlessing(): void {
    this.publish(refuseBlessing(this.state));
  }

  /** For `?scene=battle`: a battle against the given group without walking to it, optionally with a wounded body. */
  startTestBattle(groupId: string, bodyHp: number | null = null): void {
    this.state.pendingBattle = { at: hex(0, 0), groupId };
    if (bodyHp !== null) this.state.hydra.bodyHp = Math.min(this.state.hydra.bodyMaxHp, bodyHp);
  }

  /**
   * For `?near=shrine` and the like: moves the hydra next to the nearest object of that kind and shows the area around it.
   * Testing only; it skips the walk (and the Alert it would cost).
   */
  placeNear(kind: string): void {
    const { map, hydra } = this.state;
    const objects = [...map.tiles.values()].filter((t) => t.object?.kind === kind).sort((a, b) => hexDistance(a.hex, map.lair) - hexDistance(b.hex, map.lair));
    for (const target of objects) {
      const spot = hexNeighbors(target.hex)
        .map((h) => map.tiles.get(hexKey(h)))
        .find((t) => t && t.object === null && this.rules.terrain[t.terrain].moveCost !== null);
      if (!spot) continue;
      hydra.position = spot.hex;
      updateVisibility(this.state.visibility, hexesSeenFrom(map, spot.hex, hydra.sightRange, this.rules.terrain));
      return;
    }
  }

  /** For `?reveal=1`: every hex becomes known (seen before), to look at the whole map. Testing only. */
  revealAll(): void {
    for (const key of this.state.map.tiles.keys()) if (!this.state.visibility.has(key)) this.state.visibility.set(key, 'remembered');
  }

  private publish(events: RunEvent[]): void {
    if (events.length === 0) return;
    this.lastEvents = events;
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
