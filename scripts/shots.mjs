// Screenshots of key screens for review: opens the built game (dist/) in a headless browser
// and saves PNGs to docs/screens/. Run `npm run build` first. Fails on any browser console error.

import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const SHOTS = [
  { name: 'title', query: '?seed=123', viewport: { width: 1280, height: 720 }, scene: 'title' },
  { name: 'title-debug', query: '?seed=123&debug=1', viewport: { width: 1280, height: 720 }, scene: 'title' },
  { name: 'title-phone-landscape', query: '?seed=123', viewport: { width: 844, height: 390 }, scene: 'title' },
];

const OUT_DIR = 'docs/screens';
await mkdir(OUT_DIR, { recursive: true });

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://localhost:4173/';
// Software WebGL, because the server has no graphics card.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const errors = [];
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: shot.viewport });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[${shot.name}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`[${shot.name}] ${err.message}`));

    await page.goto(new URL(shot.query, baseUrl).href);
    await page.waitForFunction((scene) => window.__hydra?.readyScenes.includes(scene), shot.scene, { timeout: 15_000 });
    await page.waitForTimeout(500); // let the first frames render
    await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png` });
    console.log(`saved ${OUT_DIR}/${shot.name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (errors.length > 0) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
