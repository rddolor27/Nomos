import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

const MAP_CHUNK = /\/(map-view|map-worker)-[^/]+\.js$|\/atlas\/map\.(json|webp)$/;

async function playing(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__app?.paused === false);
}

test('opens the map on demand, pauses the town, and resumes it on close', async ({ page }) => {
  test.setTimeout(60_000);
  const fetched: string[] = [];
  page.on('request', (request) => {
    if (MAP_CHUNK.test(request.url())) fetched.push(request.url());
  });
  await page.goto('/?seed=42&tier=phone');
  await page.getByRole('button', { name: 'Map', exact: true }).waitFor();
  expect(fetched).toEqual([]);
  expect(await playing(page)).toBe(true);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const map = page.locator('#map');
  await expect(map).toBeVisible();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
  expect(await playing(page)).toBe(false);
  expect(fetched.some((url) => url.includes('map-view-'))).toBe(true);
  await expect(page.locator('#view')).toHaveAttribute('inert', '');
  await map.press('Escape');
  await expect(map).toBeHidden();
  expect(await playing(page)).toBe(true);
  await expect(page.locator('#view')).not.toHaveAttribute('inert', '');
});

test('keeps the town paused on close when it was paused before', async ({ page }) => {
  await page.goto('/?seed=42&tier=phone');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Close map' }).click();
  expect(await playing(page)).toBe(false);
});
