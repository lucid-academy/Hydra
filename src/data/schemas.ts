// Shapes of the data files in src/data/. If a JSON file doesn't match,
// the game stops at startup with a readable message instead of failing silently.
// `.strict()` means unknown fields are errors too, so typos in field names get caught.

import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a color like "#1a2b3c"');

/**
 * A strict object that may also hold a `"//"` note. JSON has no comments,
 * so `"//": "TODO(design): ..."` is how data files carry them.
 */
function section<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, '//': z.string().optional() }).strict();
}

const share = z.number().min(0).max(1);

const terrainRulesSchema = section({
  // null = impassable
  moveCost: z.number().int().positive().nullable(),
  blocksSight: z.boolean(),
});

export const balanceSchema = section({
  map: section({
    movementPointsPerTurn: z.number().int().positive(),
    sightRangeHexes: z.number().int().positive(),
    undergroundRadius: z.number().int().min(3),
  }),
  terrain: section({
    water: terrainRulesSchema,
    mud: terrainRulesSchema,
    rock: terrainRulesSchema,
  }),
  undergroundGenerator: section({
    rockShare: share,
    waterShare: share,
    smoothingPasses: z.number().int().min(0),
    minPassableShare: share,
    encounterCount: z.number().int().min(0),
    encounterMinDistanceFromLair: z.number().int().min(1),
    muckDepositCount: z.number().int().min(0),
  }),
  resources: section({
    muckPerDeposit: z.number().int().positive(),
  }),
  alert: section({
    min: z.number(),
    max: z.number(),
    perHexDiscovered: z.number().min(0),
    perBattle: z.number().min(0),
  }),
  battle: section({
    ticksPerSecond: z.number().int().positive(),
    arenaWidth: z.number().int().positive(),
    arenaHeight: z.number().int().positive(),
    bodyMaxHp: z.number().positive(),
    bodyRadius: z.number().positive(),
    bodySpeed: z.number().positive(),
  }),
  healing: section({
    bodyHpPerTurn: z.number().min(0),
    headHpPerTurn: z.number().min(0),
  }),
});

const attackSchema = section({
  damage: z.number().min(0),
  cooldownSeconds: z.number().positive(),
  range: z.number().positive(),
});

export const headsSchema = section({
  maxHeads: z.number().int().min(1),
  regrowSeconds: z.number().positive(),
  neck: section({
    length: z.number().positive(),
    restDistance: z.number().positive(),
    headSpeed: z.number().positive(),
  }),
  startingHeads: z.array(z.string()).min(1),
  hatchlingClassPool: z.array(z.string()).min(1),
  classes: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      color: hexColor,
      maxHp: z.number().positive(),
      attack: attackSchema.extend({
        tags: z.array(z.string()),
        // Status (from combos.json) put on the enemy this attack hits.
        appliesStatus: z.string().min(1).optional(),
        // The attack leaves a Mist cloud where it lands.
        createsMistCloud: z.boolean().optional(),
      }),
    }),
  ),
  names: z.array(z.string().min(1)).min(9),
}).superRefine((data, ctx) => {
  // Class names used in lists must exist in "classes".
  for (const listName of ['startingHeads', 'hatchlingClassPool'] as const) {
    data[listName].forEach((id, i) => {
      if (!(id in data.classes)) {
        ctx.addIssue({ code: 'custom', path: [listName, i], message: `unknown head class "${id}"; known: ${Object.keys(data.classes).join(', ')}` });
      }
    });
  }
});

export const ENEMY_BEHAVIORS = ['fighter', 'headhunter', 'torchbearer'] as const;

export const enemiesSchema = section({
  types: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      maxHp: z.number().positive(),
      armor: z.number().min(0),
      speed: z.number().positive(),
      radius: z.number().positive(),
      attack: attackSchema,
      bonusDamageVsHeads: z.number().positive().optional(),
      cauterizeSeconds: z.number().positive().optional(),
      behavior: z.enum(ENEMY_BEHAVIORS),
    }),
  ),
  encounterGroups: z
    .array(
      section({
        id: z.string().min(1),
        weight: z.number().positive(),
        members: z.array(z.string()).min(1),
      }),
    )
    .min(1),
}).superRefine((data, ctx) => {
  data.encounterGroups.forEach((group, g) => {
    group.members.forEach((id, m) => {
      if (!(id in data.types)) {
        ctx.addIssue({ code: 'custom', path: ['encounterGroups', g, 'members', m], message: `unknown enemy type "${id}"; known: ${Object.keys(data.types).join(', ')}` });
      }
    });
  });
  for (const [id, type] of Object.entries(data.types)) {
    if (type.behavior === 'torchbearer' && type.cauterizeSeconds === undefined) {
      ctx.addIssue({ code: 'custom', path: ['types', id, 'cauterizeSeconds'], message: 'torchbearer behavior needs cauterizeSeconds' });
    }
  }
});

export const COMBO_TRIGGERS = ['headHitsEnemy', 'enemyInMist'] as const;

const comboEffectSchema = z.discriminatedUnion('type', [
  // Extra damage that ignores armor.
  section({ type: z.literal('damage'), amount: z.number().positive() }),
  // The enemy's armor is gone for the rest of the battle.
  section({ type: z.literal('breakArmor') }),
  section({ type: z.literal('removeStatus'), status: z.string().min(1) }),
  // The Mist cloud the enemy stands in hurts everyone inside it for a while.
  section({ type: z.literal('acidifyMist'), damagePerSecond: z.number().positive(), seconds: z.number().positive() }),
  // The enemy can't cauterize stumps for a while.
  section({ type: z.literal('putOutTorch'), seconds: z.number().positive() }),
]);

export const combosSchema = section({
  statuses: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      color: hexColor,
      durationSeconds: z.number().positive(),
      // Added to the enemy's armor while the status lasts (negative = weaker armor).
      armorChange: z.number(),
      damagePerSecond: z.number().min(0),
      // 1 = normal speed, 0.5 = half speed.
      speedMultiplier: z.number().positive(),
    }),
  ),
  mistCloud: section({
    radius: z.number().positive(),
    durationSeconds: z.number().positive(),
    appliesStatus: z.string().min(1).optional(),
  }),
  combos: z.array(
    section({
      id: z.string().min(1),
      displayName: z.string().min(1),
      // What sets the combo off: a head's attack landing, or an enemy standing in a Mist cloud.
      when: z.enum(COMBO_TRIGGERS),
      // All listed conditions must hold. Leave one out to not care about it.
      conditions: section({
        attackTag: z.string().min(1).optional(),
        enemyHasStatus: z.string().min(1).optional(),
        enemyInMist: z.boolean().optional(),
        enemyCarriesFire: z.boolean().optional(),
        // false = only while the enemy's armor is still whole (so an armor-breaking combo lands once per enemy).
        enemyArmorBroken: z.boolean().optional(),
      }),
      effects: z.array(comboEffectSchema).min(1),
    }),
  ),
}).superRefine((data, ctx) => {
  const known = Object.keys(data.statuses);
  const check = (id: string | undefined, path: Array<string | number>) => {
    if (id !== undefined && !known.includes(id)) ctx.addIssue({ code: 'custom', path, message: `unknown status "${id}"; known: ${known.join(', ')}` });
  };
  check(data.mistCloud.appliesStatus, ['mistCloud', 'appliesStatus']);
  const ids = new Set<string>();
  data.combos.forEach((combo, c) => {
    if (ids.has(combo.id)) ctx.addIssue({ code: 'custom', path: ['combos', c, 'id'], message: `combo id "${combo.id}" is used twice` });
    ids.add(combo.id);
    check(combo.conditions.enemyHasStatus, ['combos', c, 'conditions', 'enemyHasStatus']);
    if (combo.when === 'enemyInMist' && combo.conditions.attackTag !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['combos', c, 'conditions', 'attackTag'], message: 'attackTag only works with "when": "headHitsEnemy"' });
    }
    combo.effects.forEach((effect, e) => {
      if (effect.type === 'removeStatus') check(effect.status, ['combos', c, 'effects', e, 'status']);
    });
  });
});

export const paletteSchema = z
  .object({
    underground: z
      .object({
        black: hexColor,
        deepTeal: hexColor,
        swampGreen: hexColor,
        bioluminescence: hexColor,
      })
      .strict(),
    order: z
      .object({
        gold: hexColor,
        orange: hexColor,
        bannerRed: hexColor,
        fire: hexColor,
      })
      .strict(),
    mist: hexColor,
  })
  .strict();

export const textSchema = z
  .object({
    title: z
      .object({
        gameTitle: z.string().min(1),
        subtitle: z.string(),
        pressToStart: z.string().min(1),
      })
      .strict(),
    hud: section({
      turn: z.string().min(1),
      moves: z.string().min(1),
      muck: z.string().min(1),
      alert: z.string().min(1),
      endTurn: z.string().min(1),
    }),
    battle: section({
      paused: z.string().min(1),
      pauseButton: z.string().min(1),
      resumeButton: z.string().min(1),
      speed: z.string().min(1),
      body: z.string().min(1),
      hintSelectHead: z.string(),
      severed: z.string().min(1),
      regrown: z.string().min(1),
      cauterized: z.string().min(1),
      victoryTitle: z.string().min(1),
      defeatTitle: z.string().min(1),
      continueButton: z.string().min(1),
    }),
    gameOver: section({
      title: z.string().min(1),
      body: z.string(),
      newRunButton: z.string().min(1),
    }),
  })
  .strict();

const manifestEntrySchema = z
  .object({
    // Path to the image file inside public/, or null to use the placeholder drawn in code.
    file: z.string().min(1).nullable(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

export const manifestSchema = z
  .object({
    images: z.record(z.string(), manifestEntrySchema),
  })
  .strict();

export type Balance = z.infer<typeof balanceSchema>;
export type HeadsData = z.infer<typeof headsSchema>;
export type EnemiesData = z.infer<typeof enemiesSchema>;
export type CombosData = z.infer<typeof combosSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type GameText = z.infer<typeof textSchema>;
export type AssetManifest = z.infer<typeof manifestSchema>;
