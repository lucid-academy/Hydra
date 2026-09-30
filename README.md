# Hydra

Browser roguelite: you are a hydra from an underground swamp, fighting the Order of the Eternal Flame.

Play: https://lucid-academy.github.io/hydra/

- Design: [GAME_DESIGN.md](GAME_DESIGN.md)
- Working rules: [CLAUDE.md](CLAUDE.md)
- Graphics spec: [docs/ASSETS.md](docs/ASSETS.md)
- Balance report: [docs/BALANCE.md](docs/BALANCE.md)

## Commands

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production build into dist/
npm run shots      # screenshots of the built game into docs/screens/
npm run smoke      # plays the built game like a player: map, battles, defeat (add "-- phone" for a phone-sized screen)
npm run balance    # many automatic battles per enemy group; results go to docs/BALANCE.md
```

URL parameters: `?seed=123` (replay a run), `?scene=title` (start in a scene: `title`, `map`, `battle`), `?debug=1` (debug overlay), `?scene=battle&group=patrol` (test battle against an enemy group from `src/data/enemies.json`), `&hp=5` (start that test battle with 5 body HP), `?speed=4` (battles run 4× faster).
