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
  /** Status put on the enemy this attack hits. */
  appliesStatus: string | null;
  /** The attack leaves a Mist cloud where it lands. */
  createsMistCloud: boolean;
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
  statuses: Readonly<Record<string, StatusRules>>;
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

/** A status currently on an enemy. */
export interface ActiveStatus {
  id: string;
  untilTick: number;
  /** Next tick when the status deals its per-second damage. */
  nextDamageTick: number;
}

/** A Mist cloud lying on the arena. */
export interface MistCloud {
  id: number;
  pos: Vec;
  radius: number;
  untilTick: number;
  /** While the tick is below this, the cloud is acid and hurts enemies inside (Acid Fog). */
  acidUntilTick: number;
  acidDamagePerSecond: number;
  nextAcidTick: number;
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
  statuses: ActiveStatus[];
  /** Armor destroyed for the rest of the battle (Corrode & Crush). */
  armorBroken: boolean;
  /** While the tick is below this, the torch is out and can't cauterize (Smother). */
  torchOutUntilTick: number;
}

export type BattleOutcome = 'won' | 'lost';

/** What dealt the damage: a head, a human, a status (e.g. Corroded), an acid Mist cloud or a combo. */
export type HitSource = 'head' | 'enemy' | 'status' | 'mist' | 'combo';

export type BattleEvent =
  | { type: 'hit'; tick: number; attacker: HitSource; targetKind: 'head' | 'enemy' | 'body'; targetId: number | string; damage: number; at: Vec }
  | { type: 'enemyKilled'; tick: number; enemyId: number; at: Vec }
  | { type: 'severed'; tick: number; headId: string; name: string; stumpId: number }
  | { type: 'regrown'; tick: number; stumpId: number; headIds: string[] }
  | { type: 'cauterized'; tick: number; stumpId: number }
  | { type: 'combo'; tick: number; comboId: string; enemyId: number; at: Vec }
  | { type: 'ended'; tick: number; outcome: BattleOutcome };

export interface BattleState {
  tick: number;
  rngState: number;
  body: { pos: Vec; hp: number; maxHp: number; moveTarget: Vec | null };
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
  | { type: 'moveBody'; to: Vec }
  | { type: 'attack'; headId: string; enemyId: number }
  | { type: 'clearOrder'; headId: string };
