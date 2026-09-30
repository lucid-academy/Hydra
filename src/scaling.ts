// Pixel art is scaled by whole numbers (2×, 3×…) so every pixel stays the same size.
// Only when the screen is smaller than the game itself (e.g. a phone held upright)
// do we shrink by a fraction, because the alternative is cutting the picture off.

export function computeZoom(viewWidth: number, viewHeight: number, gameWidth: number, gameHeight: number): number {
  const fit = Math.min(viewWidth / gameWidth, viewHeight / gameHeight);
  if (fit >= 1) return Math.floor(fit);
  return fit > 0 ? fit : 1;
}
