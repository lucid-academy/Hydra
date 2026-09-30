import * as Phaser from 'phaser';

/**
 * Makes an object ignore camera scrolling, including everything inside it when it is a container.
 * Needed because a container's scroll factor only moves how it is drawn: input still uses each child's own.
 */
export function pinToScreen<T extends Phaser.GameObjects.GameObject>(object: T): T {
  const scrollable = object as unknown as { setScrollFactor?: (x: number, y?: number) => unknown };
  scrollable.setScrollFactor?.(0, 0);
  if (object instanceof Phaser.GameObjects.Container) object.list.forEach((child) => pinToScreen(child));
  return object;
}
