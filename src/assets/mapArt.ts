// Where things are inside the map graphics and on the strategic map (seen from a slant, like the battle board).
// Real art has to follow the same numbers, so they are also listed in docs/ASSETS.md.

/** Ground tile: a squashed hex (the top face) with a thin wall below, seen only at the edge of what is known. */
export const MAP_TILE = { width: 30, faceHeight: 24, wallHeight: 4 };

/** Rock: the same hex raised into a block this many pixels tall. */
export const MAP_ROCK_LIFT = 12;

/** Distance between neighbouring hex centres in a row, and between rows, in screen pixels. */
export const MAP_COLUMN_WIDTH = 30;
export const MAP_ROW_HEIGHT = 18;

/** Things standing on a hex (decorations, objects, the hydra) have their feet this far below the hex centre. */
export const MAP_FEET_BELOW_HEX_CENTER = 3;

/** Decorations a biome can scatter over its ground (biomes.json "decorations"); each has an image map_deco_<kind>. */
export const DECORATION_KINDS = [
  'reeds',
  'bones',
  'pebbles',
  'stalagmite',
  'puddle',
  'roots',
  'sprout',
  'mushroom',
  'glowMushroom',
  'crystal',
  'urn',
  'brokenPillar',
] as const;
export type DecorationKind = (typeof DECORATION_KINDS)[number];

/** Decorations that give off light in the biome's glow colour. */
export const GLOWING_DECORATIONS: readonly DecorationKind[] = ['glowMushroom'];
