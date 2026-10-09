import { readFileSync } from 'node:fs';
import { SUBPIXELS, TILE_PX, createWorld, nearestAgent } from '@nomos/sim-core';
import { personName } from '@nomos/sim-culture';
import { parseMap } from '@nomos/sim-protocol';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

const TOWN = '/?seed=42&tier=phone';
const TILE_Q8 = TILE_PX * SUBPIXELS;
const NO_BLOB = 'No blob here';
// Keeps a click off the view's edges and the HUD laid over its top.
const MARGIN_CSS_PX = 8;

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
  const view = await viewOf(page);
  // The bottom-left corner lies off the centred town at this zoom.
  const [clientX, clientY] = [MARGIN_CSS_PX, Math.floor(view.height) - MARGIN_CSS_PX];
  expect(answerAt(view, clientX * view.dpr, clientY * view.dpr)).toBe(NO_BLOB);
  await page.mouse.click(clientX, clientY);
  await expect(page.locator('#inspector')).toHaveText(NO_BLOB);
});

test('ignores a right-button click', async ({ page }) => {
  await openPaused(page);
  const [clientX, clientY] = blobPoint(await viewOf(page));
  await page.mouse.click(clientX, clientY, { button: 'right' });
  await page.waitForTimeout(500);
  await expect(page.locator('#inspector')).toHaveCount(0);
});

test('shows the blob at the centre on Enter', async ({ page }) => {
  await openPaused(page);
  const view = await viewOf(page);
  await page.locator('#view').press('Enter');
  await expect(page.locator('#inspector')).toHaveText(answerAt(view, view.canvas[0] / 2, view.canvas[1] / 2));
});

test.describe('on a 2x screen', () => {
  test.use({ deviceScaleFactor: 2 });

  test('finds the blob under a click after a zoom step', async ({ page }) => {
    await openPaused(page);
    const before = (await viewOf(page)).camera.zoom;
    await page.locator('#view').press('+');
    await expect.poll(async () => (await viewOf(page)).camera.zoom).toBe(before + 1);
    const view = await viewOf(page);
    const [clientX, clientY] = blobPoint(view);
    await page.mouse.click(clientX, clientY);
    await expect(page.locator('#inspector')).toHaveText(answerAt(view, clientX * view.dpr, clientY * view.dpr));
  });
});
