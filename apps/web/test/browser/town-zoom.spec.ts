import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', "the bar is plain DOM, and the pinch is Chromium's touch input");
test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
const TOUCH_TARGET_CSS_PX = 44;
// Time enough for a wrongly sent inspect to load the panel and show its answer.
const QUIET_MS = 500;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

// Paused from the start, as under reduced motion, so the town redraws only when the camera moves. A running town
// redraws every frame, which SwiftShader's software GL makes slow enough to hold up each key and pointer event here.
async function openPaused(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(TOWN);
  await expect(page.getByRole('button', { name: 'Fit' })).toBeVisible();
}

async function camera(page: Page): Promise<Camera> {
  return page.evaluate(() => {
    const { x, y, zoom } = window.__app?.camera ?? { x: NaN, y: NaN, zoom: NaN };
    return { x, y, zoom };
  });
}

function canvasWidth(page: Page): Promise<number> {
  return page.evaluate(() => window.__app?.renderer.canvas.width ?? NaN);
}

test('fits the town from the Fit button and the Home key, and zooms in whole steps from the bar', async ({ page }) => {
  await openPaused(page);
  const fitted = await camera(page);
  const view = page.locator('#view');
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const fit = page.getByRole('button', { name: 'Fit' });

  await zoomIn.click();
  await zoomIn.click();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  expect((await camera(page)).zoom).toBe(fitted.zoom + 1);
  await view.press('ArrowRight');
  expect(await camera(page)).not.toEqual(fitted);
  await fit.click();
  expect(await camera(page)).toEqual(fitted);

  // Home fits from the view, and from a button in it, as the arrow keys and the plus and minus keys reach the view too.
  await view.press('+');
  await view.press('ArrowDown');
  await view.press('Home');
  expect(await camera(page)).toEqual(fitted);
  await zoomIn.focus();
  await page.keyboard.press('Enter');
  expect((await camera(page)).zoom).toBe(fitted.zoom + 1);
  await page.keyboard.press('Home');
  expect(await camera(page)).toEqual(fitted);
  // Enter on a button presses it, and the view does not read it as "show the blob at the centre".
  await page.waitForTimeout(QUIET_MS);
  await expect(page.locator('#inspector')).toHaveCount(0);
});

test('fits to the view as it is now, as a page opened at that size does', async ({ page, context }) => {
  await openPaused(page);
  const wide = await canvasWidth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  // The view measures its new size on the next frame, and only then can Fit use it.
  await expect.poll(() => canvasWidth(page)).not.toBe(wide);
  await page.getByRole('button', { name: 'Fit' }).click();

  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await openPaused(phone);
  const fresh = await camera(phone);

  await expect.poll(() => camera(page)).toEqual(fresh);
});

test.describe('with a touch screen', () => {
  test.use({ hasTouch: true });

  test('zooms a step as two fingers spread and a step back as they close', async ({ page }) => {
    await openPaused(page);
    const start = (await camera(page)).zoom;
    const box = await page.locator('#view').boundingBox();
    if (!box) throw new Error('the view has no box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', ...points: [number, number][]): Promise<unknown> =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([px, py], id) => ({ x: px, y: py, id })) });

    // Two fingers 200 px apart. Each moves in turn, so the first leaves them 230 apart, short of a quarter more, and
    // the second 260 apart, past it.
    await touch('touchStart', [x - 100, y], [x + 100, y]);
    await touch('touchMove', [x - 130, y], [x + 130, y]);
    await expect.poll(async () => (await camera(page)).zoom).toBe(start + 1);
    // Back to 200 apart is a fifth less than 260.
    await touch('touchMove', [x - 100, y], [x + 100, y]);
    await expect.poll(async () => (await camera(page)).zoom).toBe(start);
    await touch('touchEnd');
  });
});

test('keeps the bar inside the view with 44 px touch targets, and passes axe, on a desktop and a phone', async ({ page }) => {
  await openPaused(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    const view = await page.locator('#view').boundingBox();
    const bar = page.getByRole('group', { name: 'Zoom' });
    const buttons = await bar.getByRole('button').all();
    expect(buttons).toHaveLength(3);
    if (!view) throw new Error('the view has no box');
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (!box) throw new Error('a bar button has no box');
      expect(box.width).toBeGreaterThanOrEqual(TOUCH_TARGET_CSS_PX);
      expect(box.height).toBeGreaterThanOrEqual(TOUCH_TARGET_CSS_PX);
      expect(box.x).toBeGreaterThanOrEqual(view.x);
      expect(box.y + box.height).toBeLessThanOrEqual(view.y + view.height);
    }
    const results = await new AxeBuilder({ page }).include('.town-zoom').analyze();
    expect(results.violations.map(({ id }) => id)).toEqual([]);
  }
});

test('hides the bar from the page while the map covers the town', async ({ page }) => {
  await openPaused(page);
  // Playwright's role queries still find the buttons of an inert subtree, which the map's own specs would then find twice.
  await page.evaluate(() => {
    const view = document.querySelector<HTMLElement>('#view');
    if (view) view.inert = true;
  });

  await expect(page.getByRole('button', { name: 'Fit' })).toBeHidden();
});
