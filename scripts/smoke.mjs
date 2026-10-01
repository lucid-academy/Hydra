// Smoke test of the whole game loop, clicked through like a player would (mouse only, no shortcuts into the code):
//   title → map → walk to an encounter → battle with orders → victory → back on the map (twice; a battle lost
//   on the way goes through Game Over and a new hydra), then a battle that is surely lost → Game Over → a new hydra.
// Opens the built game (dist/) in a headless browser. Run `npm run build` first.
// Exits with an error on any browser console error, or when a step doesn't happen in time.
//
// Usage: npm run smoke            (desktop window)
//        npm run smoke -- phone   (phone held sideways)

import { chromium } from '@playwright/test';
import { preview } from 'vite';

const PHONE = process.argv.includes('phone');
const VIEWPORT = PHONE ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const LABEL = PHONE ? 'phone' : 'desktop';
/** Battles are fast-forwarded, so the test doesn't take minutes. */
const SPEED = 4;
const BATTLES_TO_WIN = 2;
const MAX_MAP_STEPS = 300;

// Where things are on the 640×360 game screen. Update these if the layout changes.
const GAME_WIDTH = 640;
const TITLE_TAP = { x: 320, y: 200 };
const END_TURN_BUTTON = { x: 590, y: 340 };
const RESUME_BUTTON = { x: 602, y: 328 };
const CONTINUE_BUTTON = { x: 320, y: 148 };
const NEW_HYDRA_BUTTON = { x: 320, y: 212 };
const ACCEPT_BLESSING_BUTTON = { x: 258, y: 248 };
const FIRST_HEAD_CARD = { x: 32, y: 338 };
const ALL_HEADS_BUTTON = { x: 600, y: 8 };
const HEAD_CARD_STEP = 62;
/** Map hexes under the top bar, the minimap or the End Turn button can't be tapped. */
const MAP_TAP_AREA = { left: 10, right: 630, top: 24, bottom: 320 };
const MINIMAP = { right: 104, top: 266 };

const log = (...parts) => console.log(`[${LABEL}]`, ...parts);

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://localhost:4174/';
// Software WebGL, because the server has no graphics card.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

async function openPage(query) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(new URL(query, baseUrl).href);
  return page;
}

/** Taps a point given in game pixels (640×360), wherever the canvas sits in the window. */
async function tap(page, point) {
  const canvas = await page.locator('canvas').boundingBox();
  const scale = canvas.width / GAME_WIDTH;
  await page.mouse.click(canvas.x + point.x * scale, canvas.y + point.y * scale);
}

const timesReady = (page, scene) => page.evaluate((s) => window.__hydra.readyScenes.filter((x) => x === s).length, scene);

async function waitForScene(page, scene, timesBefore = 0) {
  await page.waitForFunction(([s, n]) => (window.__hydra?.readyScenes.filter((x) => x === s).length ?? 0) > n, [scene, timesBefore], { timeout: 15_000 });
  await page.waitForTimeout(400); // let it draw
}

/** One step on the map: into an encounter if one is in reach, otherwise towards unexplored ground. */
async function mapStep(page, step) {
  const points = (await page.evaluate(() => window.__hydra.reachableOnScreen())).filter(
    (p) =>
      p.x > MAP_TAP_AREA.left &&
      p.x < MAP_TAP_AREA.right &&
      p.y > MAP_TAP_AREA.top &&
      p.y < MAP_TAP_AREA.bottom &&
      !(p.x < MINIMAP.right && p.y > MINIMAP.top),
  );
  if (points.length === 0) {
    await tap(page, END_TURN_BUTTON);
    await page.waitForTimeout(250);
    return;
  }
  const mostNew = Math.max(...points.map((p) => p.unexploredNear));
  const target =
    points.find((p) => p.encounter) ??
    (mostNew > 0 ? points.find((p) => p.unexploredNear === mostNew) : points[(step * 7) % points.length]);
  await tap(page, target);
  await page.waitForTimeout(900); // walking + camera pan
}

/**
 * Plays the battle on screen: orders every head onto one enemy (all at once with "All heads", or card by card),
 * starts it, waits for the end, presses Continue.
 */
async function playBattle(page, allAtOnce) {
  const start = await page.evaluate(() => window.__hydra.battleSummary());
  if (!start.paused) throw new Error('A battle should start paused');
  const target = start.enemies[0];
  if (allAtOnce) {
    await tap(page, ALL_HEADS_BUTTON);
    await tap(page, target);
  } else {
    for (let i = 0; i < start.heads.length; i++) {
      await tap(page, { x: FIRST_HEAD_CARD.x + i * HEAD_CARD_STEP, y: FIRST_HEAD_CARD.y });
      await tap(page, target);
    }
  }
  const orders = await page.evaluate(() => window.__hydra.battleSummary().orders);
  if (Object.values(orders).some((id) => id !== target.id)) throw new Error(`Not every head got the order: ${JSON.stringify(orders)}`);
  await tap(page, RESUME_BUTTON);
  await page.waitForFunction(() => window.__hydra.battleSummary().outcome !== null, null, { timeout: 240_000 });
  const end = await page.evaluate(() => window.__hydra.battleSummary());
  log(`battle vs ${start.enemies.length} enemies: ${end.outcome} after ${Math.round(end.tick / 20)} s of game time, heads ${start.heads.length} → ${end.heads.length}, combos: ${end.combos.join(', ') || 'none'}`);
  await page.waitForTimeout(300);
  const mapsBefore = await timesReady(page, 'map');
  await tap(page, CONTINUE_BUTTON);
  await waitForScene(page, 'map', mapsBefore);
  return end;
}

try {
  // Part 1: from the title screen, explore until two battles are won.
  let page = await openPage(`?seed=7&speed=${SPEED}`);
  await waitForScene(page, 'title');
  await tap(page, TITLE_TAP);
  await waitForScene(page, 'map');

  let won = 0;
  let fought = 0;
  for (let step = 0; step < MAX_MAP_STEPS && won < BATTLES_TO_WIN; step++) {
    const { inBattle, atShrine, blessings } = await page.evaluate(() => window.__hydra.runSummary());
    if (atShrine) {
      // A shrine of the Great Serpent: take the blessing.
      await page.waitForTimeout(300);
      await tap(page, ACCEPT_BLESSING_BUTTON);
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => window.__hydra.runSummary());
      if (after.atShrine || after.blessings !== blessings + 1) throw new Error(`Accepting the blessing did not work: ${JSON.stringify(after)}`);
      log('took a blessing at a shrine');
      continue;
    }
    if (!inBattle) {
      await mapStep(page, step);
      continue;
    }
    await waitForScene(page, 'battle', fought);
    const end = await playBattle(page, fought === 0);
    fought++;
    const after = await page.evaluate(() => window.__hydra.runSummary());
    if (after.inBattle) throw new Error('Still in battle after pressing Continue');
    if (end.outcome === 'won') {
      won++;
      continue;
    }
    // Losing a fight is part of the game: Game Over, then a new hydra on a new map.
    if (fought - won > 3) throw new Error('Lost too many battles in a row');
    const mapsBefore = await timesReady(page, 'map');
    await tap(page, NEW_HYDRA_BUTTON);
    await waitForScene(page, 'map', mapsBefore);
    log('lost a battle: Game Over → a new hydra');
  }
  if (won < BATTLES_TO_WIN) throw new Error(`Found only ${won} of ${BATTLES_TO_WIN} battles in ${MAX_MAP_STEPS} map steps`);
  log('map after two battles:', JSON.stringify(await page.evaluate(() => window.__hydra.runSummary())));
  await page.close();

  // Part 2: a battle the hydra can't win (1 body HP), then Game Over and a new run.
  page = await openPage(`?seed=7&scene=battle&group=patrol&hp=1&speed=${SPEED}`);
  await waitForScene(page, 'battle');
  await tap(page, RESUME_BUTTON);
  await page.waitForFunction(() => window.__hydra.battleSummary().outcome !== null, null, { timeout: 240_000 });
  const lost = await page.evaluate(() => window.__hydra.battleSummary());
  if (lost.outcome !== 'lost') throw new Error(`Expected to lose with 1 body HP, but the outcome was "${lost.outcome}"`);
  await page.waitForTimeout(300);
  await tap(page, CONTINUE_BUTTON);
  await waitForScene(page, 'map');
  if ((await page.evaluate(() => window.__hydra.reachableOnScreen())).length !== 0) throw new Error('A dead hydra should not be able to move');
  const mapsBefore = await timesReady(page, 'map');
  await tap(page, NEW_HYDRA_BUTTON);
  await waitForScene(page, 'map', mapsBefore);
  const fresh = await page.evaluate(() => ({ ...window.__hydra.runSummary(), reachable: window.__hydra.reachableOnScreen().length }));
  if (fresh.turn !== 1 || fresh.reachable === 0) throw new Error(`The new run looks wrong: ${JSON.stringify(fresh)}`);
  log('defeat → Game Over → new hydra: ok');
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (errors.length > 0) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
log('smoke test passed');
