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
