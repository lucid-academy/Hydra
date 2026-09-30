// A tiny window.__hydra object so automated screenshots know when a scene has finished drawing.

declare global {
  interface Window {
    __hydra?: { readyScenes: string[] };
  }
}

export function markReady(sceneKey: string): void {
  window.__hydra ??= { readyScenes: [] };
  window.__hydra.readyScenes.push(sceneKey);
}
