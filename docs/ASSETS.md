# Assets — graphics specification

Every graphic is loaded by a key from `src/assets/manifest.json`. To replace a placeholder:

1. Put the PNG in `public/` (e.g. `public/images/title_background.png`).
2. In the manifest, change `"file": null` to the path relative to `public/`, e.g. `"file": "images/title_background.png"`.
3. Keep the exact pixel size listed below. No code changes needed.

General rules for all graphics (use them in every image-generator prompt):

- Pixel art, hard pixel edges, no anti-aliasing, no blur, no gradients smoother than pixel dithering.
- The game renders at **640×360** and scales up by whole numbers (2×, 3×). Draw at the listed size, not larger.
- Palette (from `src/data/palette.json`): cold underground — near-black `#05090a`, deep teal `#0e3b3f`, swamp green `#2f4a2a`, sickly yellow-green bioluminescence `#c6e04a`; warm Order — gold `#d9a93b`, orange `#e0702a`, banner red `#9e2323`, fire `#ffcf5c`; mist — pale greenish grey `#a9b8a8`, semi-transparent.
- Mood: dark fantasy with deadpan humour. Cold mist against warm firelight.

## title_background

| | |
|---|---|
| Size | 640×360 px |
| Frames | 1 (static) |
| Anchor | top-left (0, 0) |
| Background | opaque, fills the whole screen |
| Used in | title screen |

Composition: night over a swamp. Top ~40% dark sky. On the right a hill with the castle of the Order of the Eternal Flame and a cathedral spire topped by a tiny bright flame; a few warm lit windows. Lower ~40% swamp water, murky green with teal ripples and scattered yellow-green glowing spores. Low bands of pale mist drift over the water from the left. Leave the **top centre** (about x 180–460, y 30–130) calm and dark: the game draws the title "HYDRA" and a subtitle there. Leave the **bottom centre** (about y 300–340) calm too: "Press to start" goes there.

Prompt sketch: *"Pixel art, 640x360, hard pixels, no anti-aliasing. Night over a dark swamp. On a hill to the right, a gothic castle with a cathedral spire topped by a small eternal flame, a few warm orange windows. Murky green swamp water with teal ripples, yellow-green bioluminescent spores, pale greenish mist drifting low from the left. Cold palette of teal, black and swamp green against small warm gold and orange lights. Empty dark area top centre for a title."*

## Hex tiles: hex_water, hex_mud, hex_rock

| | |
|---|---|
| Size | 28×32 px each |
| Frames | 1 |
| Anchor | centre (14, 16) |
| Background | transparent outside the hex |
| Used in | strategic map |

Shape: a **pointy-top hexagon** filling the box exactly: top point at (14, 0), bottom point at (14, 31), straight vertical sides from y=8 to y=23, left side at x=0, right side at x=27. Tiles are placed every 28 px horizontally and every 24 px vertically (odd rows shifted by 14 px), so the slanted edges of neighbours interlock. Keep the outer 1 px of the hex a little darker, so neighbouring tiles read as separate hexes. Seen from above.

- **hex_water:** murky deep teal flooded cave floor, a few lighter teal ripple lines.
- **hex_mud:** dark olive swamp mud, a few small lighter clumps.
- **hex_rock:** near-black solid cave rock, a few grey specks. Impassable, so it should read as a wall/solid mass.

Prompt sketch: *"Pixel art game tile, 28x32 pixels, pointy-top hexagon, top-down view, transparent background outside the hexagon, hard pixels no anti-aliasing. [murky deep teal water with light ripples / dark olive swamp mud / near-black cave rock with grey specks]. Dark fantasy underground swamp palette."*

## hex_shade

28×32 px, same hex shape, **black at ~60% opacity**, nothing else. Drawn over hexes the player has seen before but can't see now. Can stay a code placeholder.

## hex_reachable

28×32 px, same hex shape: a 1–2 px glowing yellow-green (`#c6e04a`) outline with a very faint fill (~12%). Marks hexes the hydra can reach this turn. Can stay a code placeholder.

## Map icons: icon_lair, icon_encounter, icon_muck

| | |
|---|---|
| Size | icon_lair 14×14, icon_encounter 12×12, icon_muck 12×12 px |
| Frames | 1 |
| Anchor | centre |
| Background | transparent |
| Used in | strategic map, drawn in the middle of a hex tile |

- **icon_lair:** the hydra's lair: a dark hole in the swamp ringed with glowing yellow-green.
- **icon_encounter:** a small red banner of the Order of the Eternal Flame on a gold pole, a tiny flame emblem.
- **icon_muck:** a glistening lump of brown swamp muck.

## token_hydra

| | |
|---|---|
| Size | 20×20 px |
| Frames | 1 (static for now) |
| Anchor | centre, drawn 4 px above the hex centre so its base sits in the hex |
| Background | transparent |
| Used in | strategic map, the hydra's piece |

A tiny hydra seen from above-front: a squat dark green body with **three heads** on short necks, eyes glowing yellow-green. Must read clearly at 20 px against teal and olive tiles; a dark outline helps.

## Battle graphics: the slanted view

The battle is a board of hexes seen from a slant (like the board in Into the Breach, but made of hexes), with the hydra's body in the middle. Rules for every battle graphic, on top of the general ones above:

- **Seen from a slant:** the ground is squashed (a hex is 42 px wide and 36 px tall on screen); people and the hydra stand up and are seen from the side and a little from above (three-quarter view).
- **Everyone faces right.** The game mirrors them when they face left.
- Light from the upper left. Transparent background (tiles only have transparency outside the hex).
- The board is 13 hexes across and 9 rows deep. Hex centres are 42 px apart within a row and rows are 27 px apart.
- The numbers that the game relies on (tile sizes, the body's anchor, where feet stand) are also in `src/assets/battleArt.ts`.

## Battle tiles: battle_tile_mud, battle_tile_water

| | |
|---|---|
| Size | 42×46 px each |
| Frames | 1 |
| Anchor | centre of the top face, (21, 18) |
| Background | transparent outside the tile |
| Used in | battle board; one tile per hex |

Two parts, one under the other:

- **Top face (upper 36 px):** a pointy-top hex squashed vertically: top point at (21, 0), straight sides at x=0 and x=41 from y=9 to y=27, bottom point at (21, 35). Keep it quiet and low-contrast (soldiers, heads and HP bars are drawn on top) with a 1 px darker rim, so neighbouring hexes read as separate fields.
- **Wall (lower 10 px):** earth under the two lower edges of the hex, as if the board were a thick slab: darker on the left half, a little lighter on the right, a few darker horizontal layers. Only the front row of the board shows its walls; the next row covers the rest.

- **battle_tile_mud:** dark olive swamp mud with a few lighter clumps.
- **battle_tile_water:** murky teal shallow water with a few light ripples (battles that start on a water hex).

Prompt sketch: *"Pixel art game tile, 42x46 pixels, transparent background. A pointy-top hexagon floor tile seen from a slanted top-down angle (squashed vertically, 42 wide and 36 tall), dark olive swamp mud with subtle lighter clumps and a 1 px darker rim; below its two lower edges a 10 px thick earth side wall, darker on the left, slightly lighter on the right, like a board game slab. Hard pixels, no anti-aliasing, dark fantasy underground swamp palette."*

## battle_body

| | |
|---|---|
| Size | 132×110 px |
| Frames | 1 (static for now) |
| Anchor | middle of its footprint, (66, 66) from the left and top edges |
| Background | transparent |
| Used in | battle, the hydra's Body |

The hydra's torso seen from the side and above, **without heads and necks** (the game draws the necks rising from the upper rim of the mound, and the heads are separate images). A big, squat mound of dark green scaly hide covering seven hexes: its base is an oval about 126 px wide and 84 px tall centred on the anchor, and it rises about 20 px above that, up to the top edge of the image. Paler scales on the back, a dark outline. It has no front or back: necks leave it in every direction and soldiers stand all around it, so no tail and no head-shaped bumps.

Prompt sketch: *"Pixel art, 132x110, transparent background, seen from a slanted top-down angle. The headless, neckless torso of a swamp hydra: a huge squat mound of dark green scaly hide with paler scales on its back, dark outline, light from the upper left. No head, no neck, no tail. Hard pixels, no anti-aliasing, dark fantasy."*

## battle_head

| | |
|---|---|
| Size | 20×14 px |
| Frames | 1 (static for now) |
| Anchor | centre |
| Background | transparent |
| Used in | battle, one per head, at the end of its neck |

One hydra head seen from the side, **snout pointing right**, a glowing eye, a long mouth line. Draw it in **pale grey / white with a dark outline**: the game tints it with the colour of the head's class (from `src/data/heads.json`), so one image serves all classes.

## Order soldiers: battle_enemy_manAtArms, battle_enemy_headhunter, battle_enemy_torchbearer

| | |
|---|---|
| Size | 26×38 px each |
| Frames | 1 (static for now; the game makes them bob, hop and lunge) |
| Anchor | feet, at the bottom middle (13, 37) |
| Background | transparent |
| Used in | battle, one per soldier standing on a hex |

People of the Order of the Eternal Flame, standing, seen from the side and a little from above, **facing right**, holding their gear on the right side (towards the enemy). Each must be recognisable at a glance by colour and gear:

- **battle_enemy_manAtArms:** banner-red tabard with a small gold flame, steel helmet with a visor, a sword held upright.
- **battle_enemy_headhunter:** dark blood-red, broader build, a big axe.
- **battle_enemy_torchbearer:** a lay brother in a brown habit, tonsured head, no helmet, carrying a burning torch: the only bright, warm flame on the board.

A new enemy type needs an image with the key `battle_enemy_<type id from enemies.json>`; without one, the game shows the Man-at-Arms.

Prompt sketch: *"Pixel art character sprite, 26x38 pixels, transparent background, seen from a slanted top-down three-quarter angle, standing, facing right. A man-at-arms of a grim fire-worshipping religious order: banner-red tabard with a small gold flame emblem, steel helmet with visor, sword held upright on the right. Hard pixels, no anti-aliasing, dark outline, dark fantasy with warm colours."*

## battle_stump, battle_scar

| | |
|---|---|
| Size | 10×8 px each |
| Frames | 1 |
| Anchor | centre |
| Background | transparent |
| Used in | battle, on the rim of the body where a head was severed |

- **battle_stump:** a fresh neck stump seen from a slant: a raw dark red oval with a darker rim. Two new heads will grow from it.
- **battle_scar:** the same stump burnt shut: charred black-brown, no red. Nothing grows from it.

## battle_mist_puff

20×11 px, anchor centre. A small puff of mist: solid middle breaking up into scattered pixels at the edge, **white**. The game tints it pale greenish grey (or yellow-green when the Mist turns to Acid Fog) and floats a few of them over each misty hex. Can stay a code placeholder.

## battle_shadow, battle_hex_mark, battle_hex_fill

Helpers that can stay code placeholders:

- **battle_shadow** (22×7): a plain oval, drawn black and half see-through under each soldier's feet.
- **battle_hex_mark** (42×36): the outline of a squashed hex in white, tinted by the game to show a head's reach, targets and where the body is going.
- **battle_hex_fill** (42×36): the same hex filled white, tinted pale for Mist over a hex.
