import * as Phaser from 'phaser';
import { loadGameData } from './data';
import { DataError } from './data/validate';
import { computeZoom } from './scaling';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { setContext } from './scenes/context';
import { MapScene } from './scenes/MapScene';
import { TitleScene } from './scenes/TitleScene';
import { DebugOverlayScene } from './ui/DebugOverlayScene';
import { HudScene } from './ui/HudScene';
import { parseUrlParams } from './urlParams';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

function showFatalError(message: string): void {
  const box = document.createElement('pre');
  box.textContent = message;
  box.style.cssText = 'color:#ffcf5c;background:#05090a;padding:16px;margin:0;white-space:pre-wrap;font:14px monospace;';
  document.body.replaceChildren(box);
}

function start(): void {
  const data = loadGameData();
  const params = parseUrlParams(window.location.search);
  // A fresh run gets a random seed. Math.random() is fine here: this is outside sim/, and the
  // seed is shown in the debug overlay so any run can be replayed with ?seed=.
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    backgroundColor: data.palette.underground.black,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    banner: false,
    // Order matters: later scenes draw on top and get input first.
    scene: [BootScene, TitleScene, MapScene, HudScene, BattleScene, DebugOverlayScene],
  });
  setContext(game, { data, seed, params });

  const rescale = (): void => {
    game.scale.setZoom(computeZoom(window.innerWidth, window.innerHeight, GAME_WIDTH, GAME_HEIGHT));
  };
  game.events.once(Phaser.Core.Events.READY, rescale);
  window.addEventListener('resize', rescale);
}

try {
  start();
} catch (error) {
  showFatalError(error instanceof DataError ? error.message : `Startup failed:\n${String(error)}`);
  throw error;
}
