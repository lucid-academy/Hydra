// Battle simulation types. Positions are arena pixels, time is counted in ticks (fixed steps).

export interface Vec {
  x: number;
  y: number;
}

export interface AttackRules {
  damage: number;
  cooldownTicks: number;
  range: number;
  tags: readonly string[];
}

export interface HeadClassRules {
  maxHp: number;
  attack: AttackRules;
}

export type EnemyBehavior = 'fighter' | 'headhunter' | 'torchbearer';

export interface EnemyTypeRules {
  maxHp: number;
  armor: number;
  /** Pixels per tick. */
  speed: number;
  radius: number;
  attack: AttackRules;
  bonusDamageVsHeads: number;
  cauterizeTicks: number | null;
  behavior: EnemyBehavior;
}

export interface BattleRules {
  ticksPerSecond: number;
  arenaWidth: number;
  arenaHeight: number;
  body: { radius: number; speed: number };
  neck: { length: number; restDistance: number; headSpeed: number };
  maxHeads: number;
  regrowTicks: number;
  headClasses: Readonly<Record<string, HeadClassRules>>;
  hatchlingClassPool: readonly string[];
  headNames: readonly string[];
  enemyTypes: Readonly<Record<string, EnemyTypeRules>>;
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
  pos: Vec;
  /** Direction (radians) where the neck leaves the body. */
  anchorAngle: number;
  cooldown: number;
  /** Enemy this head was ordered to attack; null = pick targets automatically. */
  orderTargetId: number | null;
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

export interface Enemy {
  id: number;
  typeId: string;
  pos: Vec;
  hp: number;
  maxHp: number;
  cooldown: number;
  /** Torchbearer currently burning this stump. */
  cauterizingStumpId: number | null;
}

export type BattleOutcome = 'won' | 'lost';

export type BattleEvent =
  | { type: 'hit'; tick: number; attacker: 'head' | 'enemy'; targetKind: 'head' | 'enemy' | 'body'; targetId: number | string; damage: number; at: Vec }
  | { type: 'enemyKilled'; tick: number; enemyId: number; at: Vec }
  | { type: 'severed'; tick: number; headId: string; name: string; stumpId: number }
  | { type: 'regrown'; tick: number; stumpId: number; headIds: string[] }
  | { type: 'cauterized'; tick: number; stumpId: number }
  | { type: 'ended'; tick: number; outcome: BattleOutcome };

export interface BattleState {
  tick: number;
  rngState: number;
  body: { pos: Vec; hp: number; maxHp: number; moveTarget: Vec | null };
  heads: BattleHead[];
  stumps: Stump[];
  enemies: Enemy[];
  /** Heads that grew during this battle get ids from this counter. */
  nextId: number;
  outcome: BattleOutcome | null;
  /** Events of the most recent tick only. */
  events: BattleEvent[];
}

export type BattleCommand =
  | { type: 'moveBody'; to: Vec }
  | { type: 'attack'; headId: string; enemyId: number }
  | { type: 'clearOrder'; headId: string };
