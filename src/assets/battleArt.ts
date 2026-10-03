// Where things are inside the battle graphics and on the battle board.
// Real art has to follow the same numbers, so they are also listed in docs/ASSETS.md.

/** A board tile: a squashed hex seen from a slant (the top face) with its earth wall below. */
export const TILE = { width: 42, faceHeight: 36, wallHeight: 10 };

/** Distance between neighbouring hex centres in a row, and between rows, in screen pixels. */
export const HEX_COLUMN_WIDTH = 42;
export const HEX_ROW_HEIGHT = 27;

/** The body image: where the middle of its seven-hex footprint is, from the image's left and top edges. */
export const BODY_FOOT = { x: 66, y: 66 };

/** Soldiers stand with their feet this many pixels below the centre of their hex. */
export const FEET_BELOW_HEX_CENTER = 5;

/** The lower jaw (battle_head_jaw) hangs under the head image, both centred on the same point: its top edge overlaps the head's bottom edge by this many pixels. */
export const JAW_OVERLAP = 1;
