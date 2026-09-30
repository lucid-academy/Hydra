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

## Battle arenas: battle_arena_water, battle_arena_mud

| | |
|---|---|
| Size | 640×300 px each |
| Frames | 1 (static) |
| Anchor | top-left (0, 0) |
| Background | opaque, fills the whole arena |
| Used in | battle screen, below the 16 px top bar and above the head cards |

The floor of the fight, seen **straight from above**. Which one is used depends on the terrain of the map hex where the battle started.

- **battle_arena_water:** a flooded cave: murky deep teal water, lighter teal ripple lines, a few glowing yellow-green spores.
- **battle_arena_mud:** dark olive swamp mud, lighter clumps, a few glowing yellow-green spores.

Keep the floor **quiet and low-contrast**: heads, necks, soldiers and HP bars are drawn on top and must stay readable. The outer ~6 px can be darker, like cave walls closing in. No objects that look like obstacles: the whole arena is walkable. The hydra starts on the left (around x 180, y 150), the Order on the right (around x 420).

Prompt sketch: *"Pixel art, 640x300, top-down view, hard pixels, no anti-aliasing. Floor of a [flooded cave, murky deep teal water with faint ripples / dark olive swamp mud with small clumps], scattered tiny yellow-green bioluminescent spores, darker edges. Low contrast, empty, no objects. Dark fantasy underground swamp."*

## battle_body

| | |
|---|---|
| Size | 44×32 px |
| Frames | 1 (static for now) |
| Anchor | centre (22, 16) |
| Background | transparent |
| Used in | battle screen, the hydra's Body |

The hydra's torso **seen from above**, without heads or necks (the game draws the necks itself, starting at the body's edge, and the heads are separate sprites). A squat, dark green oval mass with a paler ridge of scales along the back and a dark outline. It faces right, but necks can leave it in any direction, so keep the outline roughly oval with no head-shaped bumps.

## battle_head

| | |
|---|---|
| Size | 12×12 px |
| Frames | 1 (static for now) |
| Anchor | centre (6, 6); the game rotates the sprite around it |
| Background | transparent |
| Used in | battle screen, one per head |

One hydra head seen from above, **facing right** (snout at the right edge), two small glowing yellow eyes. Draw it in **pale grey / white with a dark outline**: the game tints it with the colour of the head's class (from `src/data/heads.json`), so a coloured drawing would come out muddy. One sprite serves all classes.

## Order soldiers: battle_enemy_manAtArms, battle_enemy_headhunter, battle_enemy_torchbearer

| | |
|---|---|
| Size | 14×18 px each |
| Frames | 1 (static for now) |
| Anchor | centre (7, 9) |
| Background | transparent |
| Used in | battle screen |

People of the Order of the Eternal Flame **seen from above**: helmet in the middle, shoulders, tabard. They are not rotated by the game, so draw them upright. Each must be recognisable at a glance at this size, mainly by colour and by what they carry (held on the left side of the sprite):

- **battle_enemy_manAtArms:** banner-red tabard, steel helmet, a sword.
- **battle_enemy_headhunter:** dark blood-red, heavier build, a big axe.
- **battle_enemy_torchbearer:** a lay brother in a brown habit carrying a burning torch: the only warm, bright flame on the screen.

A new enemy type needs a graphic with the key `battle_enemy_<type id from enemies.json>`; without one, the game shows the Man-at-Arms.

## battle_stump, battle_scar

| | |
|---|---|
| Size | 8×8 px each |
| Frames | 1 |
| Anchor | centre (4, 4) |
| Background | transparent |
| Used in | battle screen, at the body's edge where a head was severed |

- **battle_stump:** a fresh neck stump seen from above: a raw dark red disc with a darker rim. Two new heads will grow from it.
- **battle_scar:** the same stump burnt shut: charred black-brown, no red. Nothing grows from it.

## battle_mist_cloud

| | |
|---|---|
| Size | 64×64 px |
| Frames | 1 (static for now) |
| Anchor | centre (32, 32) |
| Background | transparent |
| Used in | battle screen, where a Mist Breather's breath lands |

A round puff of mist **seen from above**: solid in the middle, breaking up into scattered pixels towards the edge (dithering, not a smooth gradient), transparent corners. Draw it in **white / very pale grey**: the game tints it pale greenish grey for plain Mist and yellow-green when it turns into Acid Fog, and draws it half see-through over heads and soldiers. The game also scales it to the cloud radius from `src/data/combos.json` (now 26 px, so the sprite is shown at about 52×52).
