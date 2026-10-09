import { cpus, platform } from 'node:os';
import { readLoadavg } from '@nomos/bench/src/machine/loadavg.ts';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

// At DPR 1, a CSS pixel of drag pans the map one device pixel.
test.use({ baseURL: WEB, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

// The owner accepted 2 ms on 9 October 2026 (M8.3 task.md).
const MAP_FRAME_MS = 2;
// Each view's half of the 240 timed frames.
const FRAMES = 120;
// The map's world comes from the seed alone, and the town pauses under the map and then draws nothing, so the town's
// tier changes no timed frame. The phone tier keeps the town's play before the click from holding SwiftShader's main
// thread; reduced motion would pause it too, but would also stop the crowd the Region frames move.
const TOWN = '/?seed=42&tier=phone';
const ATLAS_PAGE = /\/atlas\/map\.webp$/;
// A press holds the map still for its first 5 CSS px, a tap's slop (map-input.ts), so the timed moves start past it.
const TAP_SLOP_CSS_PX = 5;

interface Summary {
  median: number;
  p95: number;
  largest: number;
}

interface Drawn {
  renderer: string;
  width: number;
  height: number;
}

// The map, or the town view over it.
type Timed = 'map' | 'place';

// Chromium's mouse is pointer 1, which timePan's press holds, so these moves drag the view right. Each move asks for the
// view's frame before asking for its reading, so the reading runs after the view's draw; a frame the view never drew
// reads NaN.
function pan({ x, y, frames, view }: { x: number; y: number; frames: number; view: Timed }): Promise<number[]> {
  const hook = view === 'map' ? window.__map : window.__place;
  const section = document.getElementById(view);
  if (!hook || !section) throw new Error(`the ${view} view is not open`);
  const times: number[] = [];
  return new Promise((resolve) => {
    const step = (): void => {
      hook.frameMs = Number.NaN;
      const clientX = x + times.length + 1;
      section.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX, clientY: y, bubbles: true }));
      requestAnimationFrame(() => {
        times.push(hook.frameMs);
        if (times.length < frames) step();
        else resolve(times);
      });
    };
    step();
  });
}

async function timePan(page: Page, view: Timed = 'map'): Promise<number[]> {
  const box = await page.locator(`#${view}`).boundingBox();
  if (!box) throw new Error(`the ${view} view is not on screen`);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const times = await page.evaluate(pan, { x: x + TAP_SLOP_CSS_PX, y, frames: FRAMES, view });
  await page.mouse.up();
  expect(times.filter(Number.isNaN).length, `pan steps the ${view} view drew no frame for`).toBe(0);
  return times;
}

// The first country's capital, the largest kind of place, entered from the Go to list and its Enter button.
async function enterCapital(page: Page, query: string): Promise<void> {
  await page.goto(query);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 60_000 });
  const list = page.getByRole('combobox', { name: 'Go to a settlement' });
  const capital = (await list.locator('optgroup').first().locator('option').first().textContent()) ?? '';
  await list.selectOption({ label: capital });
  await page.getByRole('button', { name: `Enter ${capital}` }).click();
  await expect.poll(() => page.evaluate(() => window.__place?.ready), { timeout: 30_000 }).toBe(true);
}

// Labels come in priority order, so the first settlement labelled in the Country view is a capital, its label hung
// below its cell. Two wheel steps over that cell reach 32 px a cell, a Region step, among its people and labels, which
// the rightward drag keeps in view.
async function zoomOnCapital(page: Page): Promise<void> {
  const label = page.locator('#map .map-label:not(.map-country)').filter({ visible: true }).first();
  const box = await label.boundingBox();
  if (!box) throw new Error('no settlement is labelled in the Country view');
  await page.mouse.move(box.x + box.width / 2, box.y - 4);
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => page.evaluate(() => window.__map?.view)).toBe('region');
}

// Read after the timing: a canvas the Canvas2D fallback took over gives no WebGL2 context.
function drawnWith(): Drawn | null {
  const canvas = document.querySelector<HTMLCanvasElement>('#map canvas');
  const gl = canvas?.getContext('webgl2');
  if (!canvas || !gl) return null;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return { renderer, width: canvas.width, height: canvas.height };
}

function percentile(sorted: readonly number[], share: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

function summarise(times: readonly number[]): Summary {
  const sorted = [...times].sort((a, b) => a - b);
  return { median: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), largest: sorted[sorted.length - 1] };
}

function inMs({ median, p95, largest }: Summary): string {
  return `median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, largest ${largest.toFixed(2)} ms over ${FRAMES} frames`;
}

test('pans the Country and Region views within 2 ms a frame', async ({ page, browser }) => {
  // SwiftShader draws every frame in software, after the map worker makes a large world.
  test.setTimeout(180_000);
  const atlasPage = page.waitForResponse(ATLAS_PAGE, { timeout: 60_000 });
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  // Vite's preview answers a missing file with its index page, so only the type shows the build made the atlas page.
  const atlasType = (await atlasPage).headers()['content-type'];
  expect(atlasType, 'the atlas page, which the web server builds after the app').toBe('image/webp');
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 60_000 });
  // The ready line once the world is here, with no flat-colours note unless the atlas page failed to load or decode.
  await expect(page.locator('#map [role="status"]')).toHaveText(/^\d countries; the legend lists them\.$/);
  expect(await page.evaluate(() => window.__app?.paused), 'the town, paused under the map').toBe(true);
  expect(await page.evaluate(() => window.__map?.view)).toBe('country');

  const country = summarise(await timePan(page));
  await zoomOnCapital(page);
  const region = summarise(await timePan(page));
  const crowd = await page.evaluate(() => ({ dots: window.__map?.dots ?? 0, drawn: window.__map?.crowdDrawn }));
  expect(crowd.drawn, 'the crowd, drawn in the Region frames').toBe(true);
  const drawn = await page.evaluate(drawnWith);
  if (!drawn) throw new Error('the map drew in Canvas2D, not WebGL2');

  const notes = [
    { type: 'Country view', description: inMs(country) },
    { type: 'Region view', description: `${inMs(region)}, with ${crowd.dots} crowd dots walking` },
    { type: 'canvas', description: `${drawn.width} x ${drawn.height} device px at DPR 1; desktop CPU, unthrottled` },
    { type: 'browser', description: `Chromium ${browser.version()} on ${drawn.renderer}` },
    {
      type: 'load average',
      description: `${readLoadavg() ?? 'none kept on Windows'} (${platform()}, ${cpus().length} logical CPUs)`,
    },
  ];
  test.info().annotations.push(...notes);
  // CI's dot reporter shows no annotations, so the numbers go to the log as well.
  console.log(notes.map(({ type, description }) => `${type}: ${description}`).join('; '));
  expect.soft(country.median, "the Country view's median frame, in ms").toBeLessThanOrEqual(MAP_FRAME_MS);
  expect.soft(region.median, "the Region view's median frame, in ms").toBeLessThanOrEqual(MAP_FRAME_MS);
});

// The town view lives in the map's panel, so the map's 2 ms bar holds for it too (M3.1 Task 7). Its walkers walk while
// the drag pans the capital; ?canvas draws the town, the map and the town view in Canvas2D.
test('pans the town view of a capital within 2 ms a frame, in WebGL2 and in Canvas2D', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await enterCapital(page, TOWN);
  const webgl = summarise(await timePan(page, 'place'));
  const shown = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#place canvas');
    return { backend: window.__place?.backend, walkers: window.__place?.walkers ?? 0, size: `${canvas?.width} x ${canvas?.height}` };
  });
  await enterCapital(page, `${TOWN}&canvas`);
  const canvas = summarise(await timePan(page, 'place'));
  const fallback = await page.evaluate(() => window.__place?.backend);
  expect([shown.backend, fallback]).toEqual(['webgl2', 'canvas2d']);

  const notes = [
    { type: 'Town view, WebGL2', description: `${inMs(webgl)}, with ${shown.walkers} walkers walking` },
    { type: 'Town view, Canvas2D', description: inMs(canvas) },
    { type: 'canvas', description: `${shown.size} device px at DPR 1, at 2 device px per art px; desktop CPU, unthrottled` },
    { type: 'browser', description: `Chromium ${browser.version()}` },
    {
      type: 'load average',
      description: `${readLoadavg() ?? 'none kept on Windows'} (${platform()}, ${cpus().length} logical CPUs)`,
    },
  ];
  test.info().annotations.push(...notes);
  console.log(notes.map(({ type, description }) => `${type}: ${description}`).join('; '));
  expect.soft(webgl.median, "the town view's median WebGL2 frame, in ms").toBeLessThanOrEqual(MAP_FRAME_MS);
  expect.soft(canvas.median, "the town view's median Canvas2D frame, in ms").toBeLessThanOrEqual(MAP_FRAME_MS);
});
