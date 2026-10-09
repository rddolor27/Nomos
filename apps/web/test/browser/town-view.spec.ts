import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

// The map's world comes from the seed alone, and the phone tier keeps the town light (M3.1's plan, Task 7).
const TOWN = '/?seed=42&tier=phone';
const TOWN_VIEW_LOAD = /\/place-view-[^/]+\.js$|\/atlas\/atlas\.(json|webp)$/;
// A drawn place shows dozens of colours; a blank or flat canvas, one or two.
const MANY_COLOURS = 40;

// Large worlds take seconds to make, and SwiftShader draws every frame in software.
test.describe.configure({ timeout: 120_000 });

let errors: string[] = [];

test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

async function openMap(page: Page): Promise<void> {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 60_000 });
}

function goToList(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Go to a settlement' });
}

// The first country's capital, picked from the list, which centres the view on it and puts it in focus.
async function goToCapital(page: Page): Promise<string> {
  const capital = (await goToList(page).locator('optgroup').first().locator('option').first().textContent()) ?? '';
  await goToList(page).selectOption({ label: capital });
  await expect(page.getByRole('button', { name: `Enter ${capital}` })).toBeVisible();
  return capital;
}

async function placeShown(page: Page): Promise<void> {
  await expect(page.locator('#place')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__place?.ready), { timeout: 30_000 }).toBe(true);
}

function walker(page: Page): Promise<[number, number]> {
  return page.evaluate(() => [window.__place?.walkerX ?? -1, window.__place?.walkerY ?? -1]);
}

function mapCamera(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify(window.__map?.camera));
}

// Node has no PNG reader, so the page decodes the screenshot.
async function coloursIn(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2D context to read the screenshot with');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const seen = new Set<number>();
    for (let at = 0; at < data.length; at += 4) seen.add((data[at] << 16) | (data[at + 1] << 8) | data[at + 2]);
    return seen.size;
  }, png.toString('base64'));
}

// Each engine draws the place through its own WebGL2, so this one runs in all three.
test('enters a settlement from the map, draws it with its walkers walking, and returns to the map as it was', async ({ page }) => {
  const loaded: string[] = [];
  page.on('request', (request) => {
    if (TOWN_VIEW_LOAD.test(request.url())) loaded.push(new URL(request.url()).pathname);
  });
  await openMap(page);
  const capital = await goToCapital(page);
  const before = await mapCamera(page);
  expect(loaded, 'the town view, its pass and the atlas, before any entry').toEqual([]);

  const enter = page.getByRole('button', { name: `Enter ${capital}` });
  await enter.click();
  await placeShown(page);
  await expect(page.getByRole('button', { name: 'Back to map' })).toBeFocused();
  await expect(page.locator('#map')).toHaveJSProperty('inert', true);
  expect(loaded.map((path) => path.replace(/-[\w-]{8}\.js$/, '.js')).sort()).toEqual([
    '/assets/place-view.js',
    '/atlas/atlas.json',
    '/atlas/atlas.webp',
  ]);
  await expect(page.locator('#place h2')).toHaveText(capital);
  await expect(page.locator('#place-status')).toHaveText(
    new RegExp(`^${capital}, a capital of [\\d,]+ people in .+: [\\d,]+ people are out, [\\d,]+ of them walking\\.$`),
  );
  await expect(page.getByRole('img', { name: new RegExp(`^${capital}: .*homes.* and [\\d,]+ people$`) })).toBeVisible();
  expect(await coloursIn(page, await page.locator('#place canvas').screenshot())).toBeGreaterThan(MANY_COLOURS);
  const first = await walker(page);
  await expect.poll(() => walker(page), { message: 'the first walker, a second on' }).not.toEqual(first);

  await page.keyboard.press('Escape');
  await expect(page.locator('#place')).toBeHidden();
  await expect(enter).toBeFocused();
  await expect(page.locator('#map')).toHaveJSProperty('inert', false);
  expect(await mapCamera(page)).toBe(before);
});

test.describe('in one engine', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'entering and leaving are plain DOM over the renderers');

  test('opens the place nearest the cursor past the closest step, and goes back past the smallest scale', async ({ page }) => {
    await openMap(page);
    const capital = await goToCapital(page);
    const box = await page.locator('#map canvas').boundingBox();
    if (!box) throw new Error('the map canvas is not on screen');
    // The jump lands at 64 CSS px a cell; the ladder stops at 128, two notches on, and the third opens the capital.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let notch = 0; notch < 3; notch++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(300);
    }
    await placeShown(page);
    await expect(page.locator('#place h2')).toHaveText(capital);
    // It opens at 2 CSS px per art px; the smallest scale is 1, and one notch past it leaves.
    expect(await page.evaluate(() => window.__place?.scale)).toBe(2);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => page.evaluate(() => window.__place?.scale)).toBe(1);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 100);
    await expect(page.locator('#place')).toBeHidden();
    await expect(page.locator('#map')).toBeFocused();
  });

  test('opens the settlement in focus on a tap, and Back to map returns', async ({ page }) => {
    await openMap(page);
    await goToCapital(page);
    const box = await page.locator('#map canvas').boundingBox();
    if (!box) throw new Error('the map canvas is not on screen');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await placeShown(page);
    await page.getByRole('button', { name: 'Back to map' }).click();
    await expect(page.locator('#place')).toBeHidden();
    await expect(page.locator('#map')).toBeFocused();
  });

  test("enters a wonder's vista: a tap centres it, and a second tap opens it", async ({ page }) => {
    await openMap(page);
    await goToCapital(page);
    // The first wonder, jumped to by the Fit view and a tap on its cell.
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(300);
    const box = await page.locator('#map canvas').boundingBox();
    const spot = await page.evaluate(() => {
      const { map, camera } = window.__map ?? {};
      if (!map || !camera) throw new Error('the map has no world yet');
      const cell = map.wonders.cell[0];
      const x = ((cell % map.width) + 0.5 - camera.x) * camera.cellPx;
      const y = (Math.floor(cell / map.width) + 0.5 - camera.y) * camera.cellPx;
      return [x / devicePixelRatio, y / devicePixelRatio];
    });
    if (!box) throw new Error('the map canvas is not on screen');
    await page.mouse.click(box.x + spot[0], box.y + spot[1]);
    const enter = page.getByRole('button', { name: /^Enter / });
    await expect(enter).toBeVisible();
    const name = ((await enter.textContent()) ?? '').replace(/^Enter /, '');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await placeShown(page);
    await expect(page.locator('#place h2')).toHaveText(name);
    await expect(page.locator('#place-status')).toHaveText(new RegExp(`^${name}, a wonder in .+: [\\d,]+ (person is|people are) out`));
  });

  test('holds the walkers still under Pause dots, which the map shares', async ({ page }) => {
    await openMap(page);
    const capital = await goToCapital(page);
    await page.getByRole('button', { name: `Enter ${capital}` }).click();
    await placeShown(page);
    const pause = page.locator('#place').getByRole('button', { name: 'Pause dots' });
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    const held = await walker(page);
    await page.waitForTimeout(1000);
    expect(await walker(page)).toEqual(held);
    await page.keyboard.press('Escape');
    await expect(page.locator('#map').getByRole('button', { name: 'Pause dots' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps the walkers where place.py put them under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openMap(page);
    const capital = await goToCapital(page);
    await page.getByRole('button', { name: `Enter ${capital}` }).click();
    await placeShown(page);
    const still = await walker(page);
    await page.waitForTimeout(1000);
    expect(await walker(page)).toEqual(still);
  });

  test('tries the art again after it failed to load, on the next entry and on Try again', async ({ page }) => {
    // As vite preview answers a missing file: with its index page, and 200.
    const missing = (route: Route): Promise<void> =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Nomos</title>' });
    let asked = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/atlas/atlas.json')) asked++;
    });
    await page.route('**/atlas/atlas.json', missing);
    await openMap(page);
    const capital = await goToCapital(page);
    const enter = page.getByRole('button', { name: `Enter ${capital}` });
    const status = page.locator('#place-status');
    const again = page.getByRole('button', { name: 'Try again' });
    await enter.click();
    await expect(status).toHaveText(`${capital} could not be drawn, as its art did not load.`);
    await expect(again).toBeVisible();

    await page.keyboard.press('Escape');
    await enter.click();
    await expect.poll(() => asked, { message: 'atlas.json, asked for again on the second entry' }).toBe(2);
    await expect(status).toHaveText(`${capital} could not be drawn, as its art did not load.`);

    await page.unroute('**/atlas/atlas.json', missing);
    await again.click();
    await placeShown(page);
    await expect(again).toBeHidden();
    await expect(status).toHaveText(new RegExp(`^${capital}, a capital of`));
  });

  test('passes axe in the town view and on the map with Enter showing', async ({ page }) => {
    await openMap(page);
    const capital = await goToCapital(page);
    const onMap = await new AxeBuilder({ page }).include('#map').analyze();
    await page.getByRole('button', { name: `Enter ${capital}` }).click();
    await placeShown(page);
    const inTown = await new AxeBuilder({ page }).include('#place').analyze();
    const found = [...onMap.violations, ...inTown.violations].map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target.join(' ')),
    }));
    expect(found).toEqual([]);
  });
});
