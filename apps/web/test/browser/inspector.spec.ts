import { readFileSync } from 'node:fs';
import { SUBPIXELS, TILE_PX, createWorld, nearestAgent } from '@nomos/sim-core';
import { personName } from '@nomos/sim-culture';
import { parseMap } from '@nomos/sim-protocol';
import type { Page } from 'playwright/test';
import { expect, test } from '../../../../packages/render-gl/test/browser/scale.ts';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

const TOWN = '/?seed=42&tier=phone';
const TILE_Q8 = TILE_PX * SUBPIXELS;
const NO_BLOB = 'No blob here';
// Keeps a click off the view's edges and the HUD laid over its top.
const MARGIN_CSS_PX = 8;
// Time enough for a wrongly sent inspect to load the panel and show its answer.
const QUIET_MS = 500;

type Button = 'left' | 'right';
const CHORDS: [string, Button, Button][] = [
  ['right released first', 'right', 'left'],
  ['left released first', 'left', 'right'],
];

// The world the page builds for this URL, held at tick 0 by reduced motion.
const town = new Uint8Array(readFileSync(new URL('../../../../assets/maps/town.nmap', import.meta.url)));
const world = createWorld(42, 'phone', parseMap(town.buffer));

interface View {
  width: number;
  height: number;
  hudBottom: number;
  dpr: number;
  camera: { x: number; y: number; zoom: number };
  canvas: [number, number];
}

async function openPaused(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(TOWN);
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
}

// The view sits at the page's top-left, so a whole client pixel times the ratio is the page's device pixel.
async function viewOf(page: Page): Promise<View> {
  return page.evaluate(() => {
    const view = document.querySelector('#view')?.getBoundingClientRect();
    const hud = document.querySelector('#hud')?.getBoundingClientRect();
    const app = window.__app;
    if (!view || !hud || !app || view.left !== 0 || view.top !== 0) throw new Error('the page has no view at 0, 0');
    const { x, y, zoom } = app.camera;
    return {
      width: view.width,
      height: view.height,
      hudBottom: hud.bottom,
      dpr: devicePixelRatio,
      camera: { x, y, zoom },
      canvas: [app.renderer.canvas.width, app.renderer.canvas.height],
    };
  });
}

// What the worker answers for a device pixel: the page's worldAt, rounded to Q8 as the worker rounds it.
function answerAt(view: View, deviceX: number, deviceY: number): string {
  const x = view.camera.x + deviceX / view.camera.zoom;
  const y = view.camera.y + deviceY / view.camera.zoom;
  const agent = nearestAgent(world.agents, Math.round(x * SUBPIXELS), Math.round(y * SUBPIXELS), TILE_Q8);
  return agent < 0 ? NO_BLOB : `${personName(world.agents.nameKey[agent])}, wallet 1,000.00`;
}

function inView(view: View, clientX: number, clientY: number): boolean {
  const xInside = clientX >= MARGIN_CSS_PX && clientX <= view.width - MARGIN_CSS_PX;
  return xInside && clientY >= view.hudBottom + MARGIN_CSS_PX && clientY <= view.height - MARGIN_CSS_PX;
}

// The first client pixel, on a grid a tile apart, clear of the HUD and the view's edges with no blob within a tile of it.
// Highcourt fills the view, so such a spot lies over a house or water, not off the town.
function emptyPoint(view: View): [number, number] {
  for (let clientY = Math.ceil(view.hudBottom) + MARGIN_CSS_PX; clientY <= view.height - MARGIN_CSS_PX; clientY += TILE_PX) {
    for (let clientX = MARGIN_CSS_PX; clientX <= view.width - MARGIN_CSS_PX; clientX += TILE_PX) {
      if (answerAt(view, clientX * view.dpr, clientY * view.dpr) === NO_BLOB) return [clientX, clientY];
    }
  }
  throw new Error('a blob lies within a tile of every spot in view');
}

// The whole client pixel nearest the first blob drawn clear of the HUD and the view's edges.
function blobPoint(view: View): [number, number] {
  const { x, y, count } = world.agents;
  for (let i = 0; i < count[0]; i++) {
    const clientX = Math.round(((x[i] / SUBPIXELS - view.camera.x) * view.camera.zoom) / view.dpr);
    const clientY = Math.round(((y[i] / SUBPIXELS - view.camera.y) * view.camera.zoom) / view.dpr);
    if (inView(view, clientX, clientY)) return [clientX, clientY];
  }
  throw new Error('no blob is drawn clear of the HUD');
}

async function expectNoInspector(page: Page): Promise<void> {
  await page.waitForTimeout(QUIET_MS);
  await expect(page.locator('#inspector')).toHaveCount(0);
}

async function pressOver(page: Page, clientX: number, clientY: number): Promise<void> {
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
}

test('shows the name and wallet of the blob under a click', async ({ page }) => {
  await openPaused(page);
  const view = await viewOf(page);
  const [clientX, clientY] = blobPoint(view);
  const answer = answerAt(view, clientX * view.dpr, clientY * view.dpr);
  expect(answer).not.toBe(NO_BLOB);
  await page.mouse.click(clientX, clientY);
  await expect(page.locator('#inspector')).toHaveText(answer);
  await expect(page.locator('#inspector')).toHaveAttribute('aria-live', 'polite');
});

test('says so when no blob is within a tile', async ({ page }) => {
  await openPaused(page);
  const [clientX, clientY] = emptyPoint(await viewOf(page));
  await page.mouse.click(clientX, clientY);
  await expect(page.locator('#inspector')).toHaveText(NO_BLOB);
});

test('ignores a right-button click', async ({ page }) => {
  await openPaused(page);
  const [clientX, clientY] = blobPoint(await viewOf(page));
  await page.mouse.click(clientX, clientY, { button: 'right' });
  await expectNoInspector(page);
});

test('inspects where a press that moved 3 px is released', async ({ page }) => {
  await openPaused(page);
  const [clientX, clientY] = blobPoint(await viewOf(page));
  await pressOver(page, clientX, clientY);
  await page.mouse.move(clientX + 3, clientY);
  await page.mouse.up();
  // The press panned the view with it, so the release point lies over the blob the press went down on.
  const view = await viewOf(page);
  const answer = answerAt(view, (clientX + 3) * view.dpr, clientY * view.dpr);
  expect(answer).not.toBe(NO_BLOB);
  await expect(page.locator('#inspector')).toHaveText(answer);
});

test('never inspects after a 6 px drag', async ({ page }) => {
  await openPaused(page);
  const [clientX, clientY] = blobPoint(await viewOf(page));
  await pressOver(page, clientX, clientY);
  await page.mouse.move(clientX + 6, clientY);
  await page.mouse.up();
  await expectNoInspector(page);
});

for (const [order, first, second] of CHORDS) {
  test(`never inspects a press chorded with the right button, ${order}`, async ({ page }) => {
    await openPaused(page);
    const [clientX, clientY] = blobPoint(await viewOf(page));
    await pressOver(page, clientX, clientY);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: first });
    await page.mouse.up({ button: second });
    await expectNoInspector(page);
  });
}

test('shows the blob at the centre on Enter', async ({ page }) => {
  await openPaused(page);
  const view = await viewOf(page);
  await page.locator('#view').press('Enter');
  await expect(page.locator('#inspector')).toHaveText(answerAt(view, view.canvas[0] / 2, view.canvas[1] / 2));
});

// openAtScale launches the browser at 2x: a context's deviceScaleFactor alone is no real 2x in Chromium or Firefox.
test.describe('on a 2x screen', () => {
  test('finds the blob under a click after a zoom step', async ({ openAtScale }) => {
    const page = await openAtScale(2);
    await openPaused(page);
    const fitted = await viewOf(page);
    expect(fitted.dpr).toBe(2);
    expect(fitted.canvas).toEqual([2 * fitted.width, 2 * fitted.height]);
    await page.locator('#view').press('+');
    await expect.poll(async () => (await viewOf(page)).camera.zoom).toBe(fitted.camera.zoom + 1);
    const view = await viewOf(page);
    const [clientX, clientY] = blobPoint(view);
    await page.mouse.click(clientX, clientY);
    await expect(page.locator('#inspector')).toHaveText(answerAt(view, clientX * view.dpr, clientY * view.dpr));
  });
});

test.describe('with a touch screen', () => {
  test.use({ hasTouch: true });

  test('never inspects when a second pointer joins the press', async ({ page }) => {
    await openPaused(page);
    const [clientX, clientY] = blobPoint(await viewOf(page));
    await pressOver(page, clientX, clientY);
    await page.touchscreen.tap(clientX, clientY);
    await page.mouse.up();
    await expectNoInspector(page);
  });
});
