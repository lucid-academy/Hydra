// Battle simulation types. The battlefield is a board of hexes (axial coordinates, as on the strategic map)
// with the hydra's body in the middle. Time is counted in ticks (fixed steps).

import type { Hex } from '../hex';

export interface HeadAttackRules {
  damage: number;
  cooldownTicks: number;
  /** How far from the body the head can attack, in hexes (1 = only enemies standing next to the body). */
  range: number;
  /** A head with a melee attack goes out to its target, and can be hit back there. */
  melee: boolean;
  tags: readonly string[];
  /** Status put on the enemy this attack hits. */
  appliesStatus: string | null;
  /** The attack leaves a Mist cloud where it lands. */
  createsMistCloud: boolean;
}

export interface EnemyAttackRules {
  damage: number;
  cooldownTicks: number;
  /** How far the enemy reaches from the hex it stands on, in hexes (1 = the neighbouring hex). */
  range: number;
}

export interface StatusRules {
  durationTicks: number;
  /** Added to the enemy's armor while the status lasts. */
  armorChange: number;
  damagePerSecond: number;
  speedMultiplier: number;
}

export type ComboTrigger = 'headHitsEnemy' | 'enemyInMist';

export type ComboEffect =
  | { type: 'damage'; amount: number }
  | { type: 'breakArmor' }
  | { type: 'removeStatus'; status: string }
  | { type: 'acidifyMist'; damagePerSecond: number; ticks: number }
  | { type: 'putOutTorch'; ticks: number };

export interface ComboRules {
  id: string;
  when: ComboTrigger;
  /** All conditions that are not null must hold. */
  conditions: {
    attackTag: string | null;
    enemyHasStatus: string | null;
    enemyInMist: boolean | null;
    enemyCarriesFire: boolean | null;
    enemyArmorBroken: boolean | null;
  };
  effects: readonly ComboEffect[];
}

export interface HeadClassRules {
  maxHp: number;
  attack: HeadAttackRules;
}

export type EnemyBehavior = 'fighter' | 'headhunter' | 'torchbearer';

export interface EnemyTypeRules {
  maxHp: number;
  armor: number;
  /** Ticks one step from a hex to the next takes. */
  stepTicks: number;
  attack: EnemyAttackRules;
  bonusDamageVsHeads: number;
  cauterizeTicks: number | null;
  behavior: EnemyBehavior;
}

export interface BoardSize {
  /** Hexes across and down, as seen on screen. Both odd, so there is a middle hex for the body. */
  boardColumns: number;
  boardRows: number;
}

export interface BattleRules extends BoardSize {
  ticksPerSecond: number;
  /** Ticks one step of the body takes. */
  bodyStepTicks: number;
  maxHeads: number;
  regrowTicks: number;
  headClasses: Readonly<Record<string, HeadClassRules>>;
  hatchlingClassPool: readonly string[];
  headNames: readonly string[];
  enemyTypes: Readonly<Record<string, EnemyTypeRules>>;
  statuses: Readonly<Record<string, StatusRules>>;
  /** `radius` in hexes: 1 = the hex where the breath lands and its six neighbours. */
  mistCloud: { radius: number; durationTicks: number; appliesStatus: string | null };
  combos: readonly ComboRules[];
}

/** A head as it lives on the strategic map, between battles. */
export interface HeadRecord {
  id: string;
  name: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
}

export interface BattleHead extends HeadRecord {
  /** Direction where the neck leaves the body, in radians: 0 = east, π/2 = south (down the screen). */
  anchorAngle: number;
  cooldown: number;
  /** Enemy this head was ordered to attack; null = pick targets by itself. */
  orderTargetId: number | null;
  /** Enemy this head is fighting right now (ordered or picked by itself); null = nobody in reach. */
  targetId: number | null;
  /** Stump this head grew from, if it is a hatchling from this battle. */
  twinGroup: number | null;
}

export interface Stump {
  id: number;
  anchorAngle: number;
  /** Tick when two new heads grow, unless cauterized first. */
  regrowAtTick: number;
  /** Ticks of cauterizing done so far. */
  cauterizeProgress: number;
  cauterized: boolean;
}

/** A status currently on an enemy. */
export interface ActiveStatus {
  id: string;
  untilTick: number;
  /** Next tick when the status deals its per-second damage. */
  nextDamageTick: number;
}

/** A Mist cloud lying on the board: all hexes within `radius` of `center`. */
export interface MistCloud {
  id: number;
  center: Hex;
  radius: number;
  untilTick: number;
  /** While the tick is below this, the cloud is acid and hurts enemies inside (Acid Fog). */
  acidUntilTick: number;
  acidDamagePerSecond: number;
  nextAcidTick: number;
}

/**
 * Something that walks from hex to hex. It counts as standing on its new hex from the moment it sets off
 * (so nobody else takes the hex), but it can't act until it arrives at `stepEndTick`.
 * `stepFrom` and the two ticks let the screen draw it on its way.
 */
export interface Walker {
  stepFrom: Hex;
  stepStartTick: number;
  stepEndTick: number;
}

export interface Enemy extends Walker {
  id: number;
  typeId: string;
  hex: Hex;
  hp: number;
  maxHp: number;
  cooldown: number;
  /** Torchbearer currently burning this stump. */
  cauterizingStumpId: number | null;
  statuses: ActiveStatus[];
  /** Armor destroyed for the rest of the battle (Corrode & Crush). */
  armorBroken: boolean;
  /** While the tick is below this, the torch is out and can't cauterize (Smother). */
  torchOutUntilTick: number;
}

export interface Body extends Walker {
  /** Middle hex of the body; the body covers it and its six neighbours. */
  center: Hex;
  hp: number;
  maxHp: number;
  /** Where the body was ordered to go (its middle hex), or null. */
  moveTarget: Hex | null;
}

export type BattleOutcome = 'won' | 'lost';

/** What dealt the damage: a head, a human, a status (e.g. Corroded), an acid Mist cloud or a combo. */
export type HitSource = 'head' | 'enemy' | 'status' | 'mist' | 'combo';

export type BattleEvent =
  | {
      type: 'hit';
      tick: number;
      attacker: HitSource;
      /** Head id or enemy id of the attacker, when there is one. */
      attackerId: string | number | null;
      targetKind: 'head' | 'enemy' | 'body';
      targetId: number | string;
      damage: number;
      at: Hex;
    }
  | { type: 'enemyKilled'; tick: number; enemyId: number; at: Hex }
  | { type: 'severed'; tick: number; headId: string; name: string; stumpId: number }
  | { type: 'regrown'; tick: number; stumpId: number; headIds: string[] }
  | { type: 'cauterized'; tick: number; stumpId: number }
  | { type: 'combo'; tick: number; comboId: string; enemyId: number; at: Hex }
  | { type: 'ended'; tick: number; outcome: BattleOutcome };

export interface BattleState {
  tick: number;
  rngState: number;
  body: Body;
  heads: BattleHead[];
  stumps: Stump[];
  enemies: Enemy[];
  clouds: MistCloud[];
  /** Heads that grew during this battle get ids from this counter. */
  nextId: number;
  outcome: BattleOutcome | null;
  /** Events of the most recent tick only. */
  events: BattleEvent[];
}

export type BattleCommand =
  | { type: 'moveBody'; to: Hex }
  | { type: 'attack'; headId: string; enemyId: number }
  | { type: 'clearOrder'; headId: string };
