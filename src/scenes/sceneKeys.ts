export const SceneKey = {
  Boot: 'boot',
  Title: 'title',
  Map: 'map',
  Battle: 'battle',
  Hud: 'hud',
  DebugOverlay: 'debug-overlay',
} as const;

/** Scenes that `?scene=` may start directly. */
export const startableScenes: readonly string[] = [SceneKey.Title, SceneKey.Map, SceneKey.Battle];
