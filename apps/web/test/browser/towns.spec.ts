import AxeBuilder from '@axe-core/playwright';
import { bedCount, createHomes } from '@nomos/sim-core';
import { ENTITY_HOME } from '@nomos/sim-protocol/map';
import { TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { TOWN, buildPlace, generateWorld, placeContexts, placeNames, type PlaceContext } from '@nomos/worldgen';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the HUD and the map are plain DOM, so one engine proves it');
test.use({ baseURL: WEB });
// Large worlds take seconds to make, and SwiftShader draws every frame in software.
test.describe.configure({ timeout: 120_000 });

// Without ?tier=, the desktop tier seats Highcourt's drawn homes, one blob to a bed, as every start does. The map makes the
// seed's large world, so Node can build the same village to count its beds.
const SEED = 42;
const HOME = `/?seed=${SEED}`;
const BLOCKING = new Set(['serious', 'critical']);

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

function bedsOf(context: PlaceContext): number {
  const ground = buildPlace(context).map;
  if (!ground) throw new Error(`${context.name} has no ground`);
  return bedCount(createHomes(ground.entities.filter((entity) => entity.kind === ENTITY_HOME)));
}

// The seed's first village, as the Go to list numbers it, with its name and how many blobs the sim seats in its homes.
function firstVillage(): { place: number; name: string; beds: number } {
  const map = generateWorld(SEED, 'large');
  const place = map.settlements.tier.findIndex((tier) => TIER_NAMES[tier] === 'village');
  const name = placeNames(map)[map.countries.capital.length + place];
  return { place, name, beds: bedsOf(placeContexts(map)[place]) };
}

function agents(count: number): string {
  return `${count.toLocaleString('en-US')} agents`;
}

// Highcourt's first day figures come 2 s into a run at 1x, which the panel then holds.
async function openHighcourt(page: Page): Promise<void> {
  await page.goto(HOME);
  await page.waitForFunction(() => window.__app?.renderer.drawnSkin === 'town', null, { timeout: 60_000 });
  await expect(goodsCaption(page)).toHaveText('Goods on day 0', { timeout: 60_000 });
}

// The goods table's, the panel's one table beside the charts' data tables.
function goodsCaption(page: Page): Locator {
  return page.locator('#economy > table > caption');
}

function goToList(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Go to a settlement' });
}

async function openMap(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 60_000 });
}

// Picks the settlement from the list, which centres the map on it and puts it in focus, and presses its Enter.
async function enterFromMap(page: Page, place: number, name: string): Promise<void> {
  await goToList(page).selectOption({ value: String(place) });
  await page.getByRole('button', { name: `Enter ${name}` }).click();
}

function drawn(page: Page): Promise<{ skin: string | undefined; agents: number | undefined }> {
  return page.evaluate(() => ({ skin: window.__app?.renderer.drawnSkin, agents: window.__app?.renderer.drawnAgents }));
}

// What the page posts to the sim worker, in order, once this has run.
async function recordPosts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const worker = window.__app?.worker;
    if (!worker) throw new Error('the page has no worker');
    const posts: string[] = [];
    const post = worker.postMessage.bind(worker) as (message: { type: string }, transfer: Transferable[]) => void;
    Object.defineProperty(worker, 'postMessage', {
      value: (message: { type: string }, transfer: Transferable[]) => {
        posts.push(message.type);
        post(message, transfer);
      },
    });
    Object.assign(window, { posts });
  });
}

function posted(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { posts: string[] }).posts);
}

test('opens a village live in the Town skin, restarts the economy panel, and goes back to Highcourt and its crowd', async ({ page }) => {
  const village = firstVillage();
  const highcourt = bedsOf(TOWN);
  await openHighcourt(page);
  await expect(page.locator('#hud-agents')).toHaveText(agents(highcourt));
  expect(await drawn(page)).toEqual({ skin: 'town', agents: highcourt });
  await expect(page.locator('#hud-town')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to Highcourt' })).toHaveCount(0);

  // Paused, so the world holds still after the switch and the panel's fresh start can be read.
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Play');
  await openMap(page);
  await enterFromMap(page, village.place, village.name);
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.locator('#hud-agents')).toHaveText(agents(village.beds));
  await expect.poll(() => drawn(page), { message: 'the village, one blob to a bed, in the Town skin' }).toEqual({
    skin: 'town',
    agents: village.beds,
  });
  await expect(page.locator('#town')).toHaveAttribute('aria-label', `${village.name}, with every agent as a blob`);
  await expect(page.locator('#hud-town')).toHaveText(village.name);
  await expect(page.locator('#status')).toHaveText('');
  await expect(page.locator('#economy')).toContainText('No economy figures yet');
  await expect(goodsCaption(page)).toBeHidden();
  await expect(page.locator('#play')).toHaveText('Play');

  // Its first day alone, as the worker's feed starts afresh at the switch, which lands on day 1.
  await page.locator('#play').click();
  await expect(goodsCaption(page)).toHaveText('Goods on day 1', { timeout: 60_000 });
  await expect(page.locator('#economy figure').first().locator('details tbody tr')).toHaveCount(1);

  await page.getByRole('button', { name: 'Back to Highcourt' }).click();
  await expect(page.locator('#hud-agents')).toHaveText(agents(highcourt));
  await expect.poll(() => drawn(page), { message: "Highcourt's crowd, folded and spawned again" }).toEqual({
    skin: 'town',
    agents: highcourt,
  });
  await expect(page.locator('#town')).toHaveAttribute('aria-label', 'Highcourt, with every agent as a blob');
  await expect(page.getByRole('button', { name: 'Back to Highcourt' })).toBeHidden();
  await expect(page.locator('#hud-town')).toBeHidden();
  await expect(page.locator('#view')).toBeFocused();
});

test('closes the map and sends no open for the town already live', async ({ page }) => {
  const highcourt = bedsOf(TOWN);
  await openHighcourt(page);
  await recordPosts(page);
  await openMap(page);
  // The first country's capital is place 0, Highcourt.
  await enterFromMap(page, 0, 'Highcourt');
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeFocused();
  expect(await posted(page)).not.toContain('open');
  await expect(page.locator('#hud-agents')).toHaveText(agents(highcourt));
  await expect(page.locator('#hud-town')).toHaveCount(0);
  expect(await page.evaluate(() => window.__app?.opening)).toBe(false);
});

test('keeps the town when the sim refuses the switch', async ({ page }) => {
  const village = firstVillage();
  const highcourt = bedsOf(TOWN);
  await openHighcourt(page);
  // The worker answers an open for the town it runs with that town, as it does for a place it refuses.
  await page.evaluate(() => {
    const worker = window.__app?.worker;
    if (!worker) throw new Error('the page has no worker');
    const post = worker.postMessage.bind(worker) as (message: unknown, transfer: Transferable[]) => void;
    Object.defineProperty(worker, 'postMessage', {
      value: (message: { type: string }, transfer: Transferable[]) =>
        post(message.type === 'open' ? { ...message, place: 0 } : message, transfer),
    });
  });
  await openMap(page);
  await enterFromMap(page, village.place, village.name);
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.locator('#status')).toHaveText(`${village.name} could not be opened.`);
  await expect(page.locator('#hud-agents')).toHaveText(agents(highcourt));
  await expect(page.locator('#hud-town')).toHaveCount(0);
  await expect(page.locator('#town')).toHaveAttribute('aria-label', 'Highcourt, with every agent as a blob');
  expect(await page.evaluate(() => window.__app?.opening)).toBe(false);
});

test('tells on the map of a town the worker could not build, and stays in the town', async ({ page, context }) => {
  const village = firstVillage();
  const highcourt = bedsOf(TOWN);
  await openHighcourt(page);
  // Without its builder chunk, the map's worker answers the request with a place-error for that place.
  await context.route(/\/place-builder-[\w-]{8}\.js$/, (route) => route.abort());
  await openMap(page);
  await enterFromMap(page, village.place, village.name);
  const failure = new RegExp(`^${village.name} could not be opened: .*(fetch|import|load)`, 'i');
  await expect(page.locator('#map [role="status"]')).toHaveText(failure);
  await expect(page.locator('#map')).toBeVisible();
  await page.getByRole('button', { name: 'Close map' }).click();
  await expect(page.locator('#status')).toHaveText(failure);
  await expect(page.locator('#hud-agents')).toHaveText(agents(highcourt));
});

test('passes axe in a village opened live', async ({ page }) => {
  const village = firstVillage();
  await openHighcourt(page);
  await openMap(page);
  await enterFromMap(page, village.place, village.name);
  await expect(page.locator('#hud-town')).toHaveText(village.name);
  await expect(page.locator('#hud-agents')).toHaveText(agents(village.beds));
  const results = await new AxeBuilder({ page }).include('#hud').include('#view').include('#economy').analyze();
  const blocking = results.violations
    .filter((violation) => BLOCKING.has(violation.impact ?? ''))
    .map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target.join(' ')) }));
  expect(blocking).toEqual([]);
});
