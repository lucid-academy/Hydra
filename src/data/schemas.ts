// Shapes of the data files in src/data/. If a JSON file doesn't match,
// the game stops at startup with a readable message instead of failing silently.
// `.strict()` means unknown fields are errors too, so typos in field names get caught.

import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a color like "#1a2b3c"');

export const balanceSchema = z
  .object({
    map: z
      .object({
        movementPointsPerTurn: z.number().int().positive(),
        sightRangeHexes: z.number().int().positive(),
      })
      .strict(),
    alert: z
      .object({
        min: z.number(),
        max: z.number(),
      })
      .strict(),
    battle: z
      .object({
        ticksPerSecond: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();

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
        notReadyYet: z.string().min(1),
      })
      .strict(),
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
