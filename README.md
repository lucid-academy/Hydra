# Hydra

Browser roguelite: you are a hydra from an underground swamp, fighting the Order of the Eternal Flame.

Play: https://lucid-academy.github.io/Hydra/

- Design: [GAME_DESIGN.md](GAME_DESIGN.md)
- Working rules: [CLAUDE.md](CLAUDE.md)
- Graphics spec: [docs/ASSETS.md](docs/ASSETS.md)

## Commands

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production build into dist/
npm run shots      # screenshots of the built game into docs/screens/
```

URL parameters: `?seed=123` (replay a run), `?scene=title` (start in a scene), `?debug=1` (debug overlay).
