// Keyboard presses that are handled exactly once.
//
// Phaser hands every key event that is still waiting in its queue to the listeners again each time another
// key event arrives within the same frame. At low frame rates a plain 'keydown' listener can therefore run
// several times for one press, and a toggle (pause, select a head) undoes itself.
// This wrapper remembers which events it has already handled.

import type * as Phaser from 'phaser';

export function onKeyDown(scene: Phaser.Scene, handler: (event: KeyboardEvent) => void): void {
  const handled = new WeakSet<KeyboardEvent>();
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    if (handled.has(event)) return;
    handled.add(event);
    handler(event);
  });
}
