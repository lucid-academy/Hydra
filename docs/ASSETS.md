# Assets — graphics specification

Every graphic is loaded by a key from `src/assets/manifest.json`. To replace a placeholder with a picture from GPT:

1. Save the picture as `art/raw/<key>.png`, e.g. `art/raw/battle_body.png` (any size; prompts are in `docs/ART_PROMPTS.md`).
2. Run `npm run art`. It removes the magenta background, trims and shrinks the picture to the size listed below, saves it to `public/images/<key>.png` and sets `"file"` in the manifest. The originals in `art/raw/` are never changed, so the import can be run again at any time (e.g. once the palette is settled).
3. No code changes needed.

A finished PNG at the exact size can also go straight into `public/images/`, with its path (relative to `public/`) as `"file"` in the manifest.

How `npm run art` treats each kind of image (`scripts/artImport.ts`):

- **Textures** (`texture_*`): no background; the middle square of the picture is squashed to the listed size.
- **Full-screen pictures** (`title_background`): cropped to the screen's shape and shrunk.
- **Everything else** stands on magenta: the background goes, stray specks go, and the figure is fitted into its box keeping its shape. Things that stand (soldiers, the body, decorations, objects, portraits) sit on the bottom edge of the box; others in the middle.
- **Tinted images** (heads, mist, marks) are turned grey, the brightest part white.
- **Shrinking** gives each game pixel the most common colour of the block of pixels it covers, so no blurred colours appear.
- **Animations:** frames as `art/raw/<key>_frame1.png`, `_frame2.png`... (or several figures side by side on one picture when the manifest entry has `"frames"`), cut with one common box and saved as a strip; `"frames"` in the manifest says how many.
- **Palette:** when `art/palette.json` exists (`{"colors": ["#rrggbb", ...]}`), every colour is replaced by the nearest palette colour.

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

## Terrain textures: texture_ground_<biome>_<kind>, texture_rock_<biome>

| | |
|---|---|
| Size | 96×67 px each: a 96×96 square squashed to the camera angle |
| Frames | 1 |
| Anchor | none (never drawn on its own) |
| Background | none: the texture fills the whole image |
| Used in | map ground and rock tiles, battle board tiles |

Real ground is not drawn hex by hex. GPT draws a square texture, straight from above and flat; the import squashes its height to 0.7 (the camera looks at the ground from about 45°), and when the game starts it cuts the tiles out of it: `map_ground_<biome>_<kind>` (30×28), `battle_tile_<biome>_<kind>` (42×46) and, from the rock texture, `map_rock_<biome>` (30×40). Each tile is cut 8 times from different parts of the texture, so neighbouring hexes differ. The game adds a 1 px darker rim to every hex face and builds the walls under its lower edges from the biome's rock texture (or the ground texture if there is no rock yet), darker on the left, lighter on the right. A tile image with its own file in the manifest wins over the texture. The battle board uses the texture of the ground the encounter stood on (water, mud, roots or salt).

Keys, one per kind of ground in each biome (`src/data/biomes.json`): `lairSwamp` (water, mud), `floodedCaves` (water, mud), `rootTangle` (mud, roots), `fungalDeeps` (water, mud), `oldCrypts` (water, mud), `saltMines` (mud, salt), and one rock texture per biome. Prompts: `docs/ART_PROMPTS.md`.

The texture should be even all over (nothing big in the middle, nothing that only works once), low in contrast, with chunky detail 2–6 px big at the game size. It does not have to tile seamlessly: the game never repeats it side by side.

## Map graphics: the underground seen from a slant

The strategic map uses the same slanted view as the battle, in the spirit of Songs of Conquest: the ground is a carpet of squashed hexes in each biome's look, rock is raised into blocks, and decorations, objects and the hydra stand up on their hexes. Rules for every map graphic, on top of the general ones above:

- Hexes are 30 px wide and 24 px tall on screen; hex centres are 30 px apart within a row and rows are 18 px apart.
- Light from the upper left. Transparent background outside the drawn shape.
- Things that stand on a hex have their **feet at the bottom middle** of the image; the game puts the feet 3 px below the hex centre.
- The numbers the game relies on are also in `src/assets/mapArt.ts`.
- Biomes (`src/data/biomes.json`) decide which ground, rock and decoration images a hex uses. A new biome needs its own `map_ground_…` and `map_rock_…` images in the manifest; with `"file": null` the game draws a placeholder from the biome's colours.

## Map ground: map_ground_<biome>_<water|mud|roots|salt>

| | |
|---|---|
| Size | 30×28 px each |
| Frames | 1 |
| Anchor | middle of the hex face, (15, 12) |
| Background | transparent outside the tile |
| Used in | strategic map, one per open hex |

A squashed pointy-top hex seen from a slant: top point (15, 0), straight sides at x=0 and x=29 from y=6 to y=18, bottom point (15, 23). Below its two lower edges, a 4 px earth wall (only seen at the edge of the known map, where it makes the ground look like a thick carpet). Keep the face quiet, with a slightly darker 1 px rim so the grid reads faintly; decorations are drawn on top.

Current keys (biome × ground): `lairSwamp` (water, mud), `floodedCaves` (water, mud), `rootTangle` (mud, roots), `fungalDeeps` (water, mud), `oldCrypts` (water, mud), `saltMines` (mud, salt). For the first four the manifest also lists the other combinations, in case a biome's ground shares change.

- **water:** murky still water in the biome's tint, a few light ripples.
- **mud:** the biome's floor: swamp mud (Lair Swamp), wet stone and silt (Flooded Caves), dark soil (Root Tangle), purplish spongy fungal ground (Fungal Deeps).
- **roots:** dark soil with thick roots crawling across it (2 movement points: it should look slow).
- **salt:** a dry, cracked white crust with crystals catching the light (3 movement points: it should look hard going).
- In **Old Crypts** the "mud" is the floor of old catacombs: worn flagstones, dust, cracks.

Prompt sketch: *"Pixel art game tile, 30x28 pixels, transparent background. A pointy-top hexagon floor tile seen from a slanted top-down angle (squashed, 30 wide and 24 tall) with a 4 px earth edge below its lower sides. [Dark olive swamp mud / murky teal water with faint ripples / dark soil with thick crawling roots / purplish spongy fungal ground]. Low contrast, dark underground cave, hard pixels, no anti-aliasing."*

## Map rock: map_rock_<biome>

| | |
|---|---|
| Size | 30×40 px |
| Frames | 1 |
| Anchor | middle of the hex it stands on, (15, 24); its top face is raised 12 px above that |
| Background | transparent |
| Used in | strategic map, impassable rock |

The hex raised into a rough block of cave rock: the top face (same shape as a ground tile, at the top of the image) with rock walls below it down to the ground, darker on the left. It hides what stands right behind it, like a cave wall. In the biome's rock colour.

## Map decorations: map_deco_<kind>

| | |
|---|---|
| Size | 14×16 px each |
| Frames | 1 |
| Anchor | bottom middle (7, 15) |
| Background | transparent |
| Used in | strategic map, scattered over open hexes (each biome lists its kinds in biomes.json) |

Small things that make each biome feel different. They do nothing in the game.

- **reeds** (the only thing that grows out of water), **bones**, **pebbles**, **stalagmite**, **puddle**, **roots**, **sprout**, **mushroom**,
- **crystal:** pale pink-white salt crystals (Salt Mines),
- **urn:** a clay burial urn, **brokenPillar:** the stump of a stone column with a fallen chunk (Old Crypts),
- **glowMushroom:** a mushroom with a bright cap; the game adds a light in the biome's glow colour around it.

## Map objects

| Key | Size | What |
|---|---|---|
| map_lair | 52×30 | The lair: a dark pool with a glowing yellow-green rim, reeds and old bones around it. Anchor: bottom middle, 9 px below the hex centre. |
| map_shrine | 26×46 | A shrine of the Great Serpent: a stone pillar on a plinth, a serpent coiled round it, a glowing teal gem on top. |
| map_passage | 40×64 | A way up to the surface: rubble on the ground under a shaft of pale light falling from a crack in the cave roof. |
| map_muck | 16×10 | A glistening lump of swamp muck. |
| map_moisture | 16×20 | A spring: a small pool with water trickling down into it from above. |
| map_encounter_1, _2, _3 | 28×36, 36×38, 44×40 | People of the Order waiting there, with a red banner. More of them and a bigger banner the stronger the group: one soldier (tier 1), two (tier 2), three with a torch (tier 3). |
| map_hydra | 26×28 | The hydra on the map: a squat dark green body with three heads on short necks, eyes glowing yellow-green. |

All objects: 1 frame, anchor at the feet (bottom middle) unless noted, transparent background.

## Map helpers: map_glow, map_mark, map_fog_edge

Can stay code placeholders:

- **map_glow** (64×64): a soft round light in white; the game tints it and adds it on top (lair, shrines, springs, glowing fungi, torches).
- **map_mark** (30×24): the outline of a squashed hex in white, tinted by the game to show where the hydra can go this turn.
- **map_fog_edge** (30×28): a ragged pattern of dark pixels laid over known hexes next to the unknown, so the darkness doesn't end in a hard line.

## Battle graphics: the slanted view

The battle is a board of hexes seen from a slant (like the board in Into the Breach, but made of hexes), with the hydra's body in the middle. Rules for every battle graphic, on top of the general ones above:

- **Seen from a slant:** the ground is squashed (a hex is 42 px wide and 36 px tall on screen); people and the hydra stand up and are seen from the side and a little from above (three-quarter view).
- **Everyone faces right.** The game mirrors them when they face left.
- Light from the upper left. Transparent background (tiles only have transparency outside the hex).
- The board is 13 hexes across and 9 rows deep. Hex centres are 42 px apart within a row and rows are 27 px apart.
- The numbers that the game relies on (tile sizes, the body's anchor, where feet stand) are also in `src/assets/battleArt.ts`.

## Battle tiles: battle_tile_<biome>_<ground|water>

| | |
|---|---|
| Size | 42×46 px each |
| Frames | 1 |
| Anchor | centre of the top face, (21, 18) |
| Background | transparent outside the tile |
| Used in | battle board; one tile per hex |

The battle board looks like the place of the encounter: the tiles of its biome, and the `water` tile if the encounter stood in water. Current keys: `lairSwamp`, `floodedCaves`, `rootTangle`, `fungalDeeps`, `oldCrypts`, `saltMines`, each with `_ground` and `_water`. With `"file": null` the game draws a placeholder from the biome's colours in `src/data/biomes.json`.

Two parts, one under the other:

- **Top face (upper 36 px):** a pointy-top hex squashed vertically: top point at (21, 0), straight sides at x=0 and x=41 from y=9 to y=27, bottom point at (21, 35). Keep it quiet and low-contrast (soldiers, heads and HP bars are drawn on top) with a 1 px darker rim, so neighbouring hexes read as separate fields.
- **Wall (lower 10 px):** earth under the two lower edges of the hex, as if the board were a thick slab: darker on the left half, a little lighter on the right, a few darker horizontal layers. Only the front row of the board shows its walls; the next row covers the rest.

The ground should match the biome's map ground (see map_ground_*), only larger: swamp mud, wet stone, dark soil with roots, spongy fungal ground; the water tiles are murky still water in the biome's tint.

Prompt sketch: *"Pixel art game tile, 42x46 pixels, transparent background. A pointy-top hexagon floor tile seen from a slanted top-down angle (squashed vertically, 42 wide and 36 tall), [dark olive swamp mud / wet grey-green stone / dark soil with roots / purplish spongy fungal ground / murky still water], subtle detail and a 1 px darker rim; below its two lower edges a 10 px thick earth side wall, darker on the left, slightly lighter on the right, like a board game slab. Hard pixels, no anti-aliasing, dark fantasy underground."*

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
| Size | 36×18 px (the jaw: 36×9 px) |
| Frames | 1 (static for now) |
| Anchor | centre |
| Background | transparent |
| Used in | battle, one per head, at the end of its neck |

One hydra head seen from the side, **snout pointing right**, a glowing eye, a long mouth line. Draw it in **pale grey / white with a dark outline**: the game tints it with the colour of the head's class (from `src/data/heads.json`), so one image serves all classes.

Real art comes in two parts, so the game can open the mouth: **battle_head** is the head without its lower jaw (36×18, the art sits at the bottom middle of the image) and **battle_head_jaw** is the lower jaw alone (36×9, the art sits at the top right, so the tips of both jaws line up). The game hangs the jaw under the head, both centred on the same point, the jaw's top edge overlapping the head's bottom edge by 3 px (`JAW_OVERLAP` in `src/assets/battleArt.ts`), so the teeth interlock and the mouth is shut. To bite, the jaw turns around its back end (the leftmost drawn pixel of the jaw image, found by the game). GPT draws both parts side by side on one picture (`art/raw/battle_head.png`) and the import splits them. The placeholder head has its jaw drawn in, so its battle_head_jaw stays empty.

The size was 20×14 until the first GPT head (2026-10-03): GPT drew it at about 43×21 pixels of its own, and squeezed to 20 px it turned to noise. At 36 px it keeps its eye, teeth and crest.

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

## portrait_oldMotherToad

| | |
|---|---|
| Size | 128×160 px |
| Frames | 1 |
| Anchor | top-left |
| Background | transparent |
| Used in | dialogues (from M5); not shown in the game yet |

Old Mother Toad, guardian of the lair and mentor: a bust (head and shoulders), seen from the front and turned a little to the side. Portraits are a separate shot and don't follow the game camera.

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
