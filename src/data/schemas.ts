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
  }),
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
    battlePlaceholder: section({
      message: z.string().min(1),
      winButton: z.string().min(1),
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
export type Palette = z.infer<typeof paletteSchema>;
export type GameText = z.infer<typeof textSchema>;
export type AssetManifest = z.infer<typeof manifestSchema>;
