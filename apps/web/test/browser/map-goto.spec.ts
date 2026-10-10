import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the map view is plain DOM over the renderer, so one engine proves it');
// Paused from the start, as under reduced motion, so the page draws only when the camera moves. A running
// town redraws every frame, which SwiftShader's software GL makes slow enough under parallel workers to hold a check's
// reads past its 5 s.
test.use({ baseURL: WEB, reducedMotion: 'reduce' });

// The map's world comes from the seed alone, and the phone tier keeps the town light, so it never slows the map.
const TOWN = '/?seed=42&tier=phone';
// At DPR 1 a settlement opens at 64 CSS px a cell, and its label hangs from its cell's bottom edge, half a cell below
// the cell's centre.
const HALF_CELL_CSS = 32;

async function openMap(page: Page): Promise<void> {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.__map?.frameMs ?? 0)).toBeGreaterThan(0);
}

function goToList(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Go to a settlement' });
}

function view(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__map?.view);
}

// Where a settlement's label sits, in CSS px from the view's centre.
async function offCentre(page: Page, name: string): Promise<{ x: number; y: number }> {
  const map = await page.locator('#map').boundingBox();
  const label = await page.locator('#map .map-label').filter({ hasText: new RegExp(`^${name}$`) }).boundingBox();
  if (!map || !label) throw new Error(`no label shows ${name}`);
  return { x: label.x + label.width / 2 - (map.x + map.width / 2), y: label.y - (map.y + map.height / 2) };
}

// A jump within the Region view lands on the next frame, so the label's place is polled.
async function expectCentred(page: Page, name: string): Promise<void> {
  await expect.poll(() => view(page)).toBe('region');
  await expect
    .poll(async () => {
      const { x, y } = await offCentre(page, name);
      return Math.abs(x) <= 1 && Math.abs(y - HALF_CELL_CSS) <= 1;
    }, { message: `${name}, centred at the close step` })
    .toBe(true);
}

// The first settlement labelled in view, besides the one named, whose cell centre, half a cell above its label, lies on
// open map rather than under the bar or the legend, which keep their pointers. Hit testing skips the labels.
async function settlementOnOpenMap(page: Page, besides: string): Promise<{ name: string; x: number; y: number }> {
  return page.evaluate(
    ([named, half]) => {
      for (const span of document.querySelectorAll<HTMLElement>('#map .map-label:not(.map-country)')) {
        const box = span.getBoundingClientRect();
        const [x, y] = [box.x + box.width / 2, box.y - half];
        const open = span.style.visibility === 'visible' && span.textContent !== named;
        if (open && document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { name: span.textContent ?? '', x, y };
      }
      throw new Error(`no settlement besides ${named} lies on open map`);
    },
    [besides, HALF_CELL_CSS] as const,
  );
}

// After every jump the list shows its placeholder, so it never names a place the view has left.
async function expectPlaceholder(page: Page): Promise<void> {
  await expect(goToList(page)).toHaveValue('');
  await expect(goToList(page).locator('option:checked')).toHaveText('Go to…');
}

test('lists each country with its capital first, and jumps to the settlement chosen', async ({ page }) => {
  await openMap(page);
  const [country, capital] = /^(.+): capital (.+), \d+ settlements?$/.exec(
    (await page.locator('#map .map-legend li').nth(1).textContent()) ?? '',
  )?.slice(1) ?? ['', ''];
  const group = goToList(page).locator('optgroup').nth(1);
  await expect(group).toHaveAttribute('label', country);
  await expect(group.locator('option').first()).toHaveText(capital);

  await goToList(page).selectOption({ label: capital });
  await expectCentred(page, capital);
  await expectPlaceholder(page);

  // A later click on another settlement jumps on, and the list still names no place.
  const other = await settlementOnOpenMap(page, capital);
  await page.mouse.click(other.x, other.y);
  await expectCentred(page, other.name);
  await expectPlaceholder(page);
});

test("jumps from the list's keys too", async ({ page }) => {
  await openMap(page);
  const first = (await goToList(page).locator('optgroup').first().locator('option').first().textContent()) ?? '';
  await goToList(page).focus();
  await goToList(page).press('ArrowDown');
  await expectCentred(page, first);
  await expectPlaceholder(page);
});

test('jumps to the settlement clicked on the map', async ({ page }) => {
  await openMap(page);
  // Labels come in priority order, so the first settlement labelled in the Country view is a capital. Its label hangs
  // below its cell, 8 CSS px tall here.
  const label = page.locator('#map .map-label:not(.map-country)').filter({ visible: true }).first();
  const name = (await label.textContent()) ?? '';
  const box = await label.boundingBox();
  if (!box) throw new Error('no settlement is labelled in the Country view');
  await page.mouse.click(box.x + box.width / 2, box.y - 4);
  await expectCentred(page, name);
});

test("zooms with the bar's buttons into the Region view and back out", async ({ page }) => {
  await openMap(page);
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  await zoomIn.click();
  await zoomIn.click();
  await expect.poll(() => view(page)).toBe('region');
  // Back at 16 px a cell the Region view holds, by its 15% hysteresis, so the Country view takes a second step.
  await zoomOut.click();
  await zoomOut.click();
  await expect.poll(() => view(page)).toBe('country');
});
