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
