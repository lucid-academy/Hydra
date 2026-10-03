# Prompty do grafik (GPT)

Gotowe prompty do generatora obrazów w GPT. Każdy jest w osobnym bloku, do skopiowania w całości, i każdy zaczyna się od tego samego stałego bloku stylu (test pilnuje, żeby tak zostało).

## Jak z nich korzystać

1. Skopiuj cały blok i wklej do GPT. Jeśli wynik się nie podoba, dopisz poprawkę zwykłymi słowami („remove the shadow", „more contrast", „make the pixels bigger") albo wygeneruj od nowa.
2. Pobierz obrazek (PNG, rozmiar z GPT jest w porządku, skrypt i tak go zmniejszy) i nazwij go dokładnie tak jak w nagłówku, np. `texture_ground_lairSwamp_mud.png`.
3. Wyślij go w wątku projektu Hydra albo wrzuć na GitHubie do folderu `art/raw/`. Oryginałów nikt potem nie zmienia.
4. Skrypt `npm run art` wycina tło, zmniejsza obrazek do rozmiaru gry, wstawia go do gry i zgłasza problemy.

Na co uważać:

- **Tekstury gruntu i skał** wypełniają cały kwadrat, od krawędzi do krawędzi, widziane prosto z góry, bez magenty. Gra sama spłaszcza je do kąta kamery i wycina z nich heksy, więc nie proś GPT o heksy.
- **Wszystko inne** stoi na jednolitym tle magenta `#FF00FF`. Bez cienia na tle, bez podłogi, bez ramki. Jeśli GPT doda cień albo inne tło, poproś o poprawkę.
- **Głowa** to dwa osobne kawałki (głowa i żuchwa), które nie mogą się stykać.
- Rozmiary w promptach to rozmiary w grze. GPT ich nie dotrzyma i nie musi; chodzi o to, żeby rysował prosto i grubymi pikselami, bo drobne szczegóły i tak znikną po zmniejszeniu.

## Stały blok stylu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.
```

## Pierwsza partia: 5 obrazków

Najpierw te pięć: sprawdzimy na nich cały proces, zanim zrobisz resztę.

### 1. `texture_ground_lairSwamp_water.png`: woda w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: murky still water of the swamp around the hydra's lair. Very dark teal-green water (around #12393a), a few small pale ripples, a little green scum and duckweed, a few faint yellow-green glints of floating spores. Even detail spread over the whole square, nothing big in the middle, low contrast, so creatures stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and blobs 2 to 6 pixels big.
```

### 2. `texture_ground_lairSwamp_mud.png`: błoto w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the soft, wet mud floor of an underground swamp. Dark olive mud (around #2c3420) with slightly greener patches (#3f5a2c), small dark puddles, a few pebbles, bits of rotten reed and an old bone fragment here and there. Even detail spread over the whole square, nothing big in the middle, low contrast, so creatures stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: puddles and pebbles 2 to 6 pixels big.
```

### 3. `texture_rock_lairSwamp.png`: skała w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: rough, solid cave rock of an underground swamp: dark brownish grey stone (around #3a3129) with cracks, a few wet glints and dark green moss in the cracks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### 4. `battle_body.png`: tułów hydry

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background.
Subject: the torso of a giant swamp hydra WITHOUT any heads, necks or tail (the game adds the necks and heads). A huge, squat mound of dark green scaly hide, seen in the game's three-quarter view from above: its base is a wide oval about one and a half times as wide as it is deep, and its back rises in a low, heavy dome. Paler, mossy scales on top of the back, darker scales low on the sides, a dark outline. It has no front and no back: necks and enemies surround it on every side, so no face, no legs sticking out, no tail.
Size: in the game it is 132 by 110 pixels, so keep the scales big and the shape bold.
```

### 5. `battle_head.png`: głowa (dwa kawałki: głowa i żuchwa)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch).
Subject: the head of a swamp hydra in side view, snout pointing RIGHT. Reptilian and a little dragon-like: a long mouth with small teeth, a small crest at the back of the skull, a glowing eye. Draw it ONLY in pale grey and white with a dark outline, no other colours (the game colours each head by its class).
- LEFT piece: the head without its lower jaw (skull, upper jaw with teeth, eye, crest), snout pointing right.
- RIGHT piece: the lower jaw alone, at the same size as it would be on the head, also pointing right.
Size: in the game the whole head is only about 20 by 14 pixels, so keep it simple and bold: a clear silhouette and a few big shapes.
```

## Reszta tekstur gruntu (10)

### `texture_ground_floodedCaves_water.png`: Flooded Caves, woda

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: cold, dark water flooding a cave, around #0f3a3d: you can just see smooth stones on the bottom, faint pale-blue light ripples, a few tiny cyan glints (#7fd0e0). Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and stones 2 to 6 pixels big.
```

### `texture_ground_floodedCaves_mud.png`: Flooded Caves, mokry kamień i muł

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the floor of a flooded cave: wet grey-green stone and silt (around #1d3833 and #2d5a4a), smooth water-worn pebbles, shallow puddles that catch a little light. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: pebbles and puddles 2 to 6 pixels big.
```

### `texture_ground_rootTangle_mud.png`: Root Tangle, ziemia

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, crumbly soil deep under the roots of a forest (around #33261a and #4a3a22): thin rootlets, small stones, a few dry leaves fallen through cracks from far above. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: stones and rootlets 2 to 6 pixels big.
```

### `texture_ground_rootTangle_roots.png`: Root Tangle, korzenie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark soil almost hidden under thick, gnarled roots crawling across it in every direction and twisting over each other (roots brown-grey, #6b4a2a highlights, soil #33261a). It must look slow and tiring to walk through. Even detail spread over the whole square, nothing big in the middle.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: roots 2 to 5 pixels thick.
```

### `texture_ground_fungalDeeps_water.png`: Fungal Deeps, woda

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, still water in a cave full of fungi (around #1a2a3a) with a faint violet sheen, floating spores and a few tiny glowing violet specks (#c65bd6). Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and specks 1 to 5 pixels big.
```

### `texture_ground_fungalDeeps_mud.png`: Fungal Deeps, grzybowe podłoże

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: purplish, spongy fungal ground (around #2a2032 and #5a3d66): threads of mycelium, tiny flattened caps and cups, soft lumps, a few faint pink-violet glowing specks. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: lumps and caps 2 to 6 pixels big.
```

### `texture_ground_oldCrypts_water.png`: Old Crypts, zalane płyty

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, stagnant water (around #1c2a2c) that has flooded the floor of old catacombs: under the surface you can just make out the edges of big stone slabs, a little floating dust and a few pale ripples. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: slab edges and ripples 1 to 4 pixels thick.
```

### `texture_ground_oldCrypts_mud.png`: Old Crypts, posadzka katakumb

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the floor of old catacombs: worn grey-brown flagstones of uneven sizes (around #2e2b27 and #4a4540) with cracks, dust in the joints and a few small bone fragments. No grass, no moss. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: flagstones 12 to 30 pixels across, joints 1 pixel.
```

### `texture_ground_saltMines_mud.png`: Salt Mines, ubite podłoże kopalni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the packed floor of an old salt mine: grey-brown earth mixed with salt (around #4a4440 and #8a8078), faint cart ruts, scattered small white salt crystals. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: crystals and stones 1 to 5 pixels big.
```

### `texture_ground_saltMines_salt.png`: Salt Mines, solna skorupa

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: a dry, cracked crust of salt, white with a faint pink tint (#cfc6bc, #f4eee8, shadows #6a625c), broken into plates by dark cracks, with sharp little crystals catching the light. It must look hard and painful to walk on. Even detail spread over the whole square, nothing big in the middle.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: plates 8 to 20 pixels across, cracks 1 pixel.
```

## Reszta tekstur skał (5)

### `texture_rock_floodedCaves.png`: Flooded Caves, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: wet, dark grey-blue cave rock (around #2e3436), smooth and water-worn, glistening with a few pale highlights, thin cracks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### `texture_rock_rootTangle.png`: Root Tangle, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark brown, earthy rock (around #3a2f25) with thin roots growing through its cracks and a few pale lichen spots. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks, roots and patches 2 to 8 pixels big.
```

### `texture_rock_fungalDeeps.png`: Fungal Deeps, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark violet-grey rock (around #2f2836) overgrown with patches of fungus and threads of mycelium, a few tiny violet glowing specks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### `texture_rock_oldCrypts.png`: Old Crypts, mur krypty

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: old crypt masonry: big dark stone blocks (around #3b3732) laid in courses, cracked and chipped, crumbling mortar lines, a little dust. The game uses it for the tops of crypt walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: blocks 16 to 32 pixels long, mortar lines 1 pixel.
```

### `texture_rock_saltMines.png`: Salt Mines, sól kamienna

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: rock salt as seen in a mine wall: grey-pink layers (around #5a524c) with pale streaks and veins of white crystal, a few pick marks. It must read as one solid mass, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: layers and veins 2 to 8 pixels thick.
```

## Portret

### `portrait_oldMotherToad.png`: Old Mother Toad

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a dialogue portrait, a bust (head and shoulders), on the flat magenta background. Portraits are a separate shot: ignore the game camera, show her from the front, turned slightly to the side.
Subject: Old Mother Toad, the ancient guardian of the hydra's lair and its mentor, who has buried eleven generations of hydras. An enormous, very old swamp toad: wrinkled, warty olive-green skin, moss and lichen on her back, heavy half-closed eyes with yellow-green irises, a necklace of small bones and shells. Expression: deadpan, unimpressed, a little tired. A faint yellow-green glow of spores around her.
Size: in the game the portrait is 128 by 160 pixels, so keep the shapes bold and readable.
```
