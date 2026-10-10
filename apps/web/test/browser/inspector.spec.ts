import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {
  ACTION_WALK,
  SUBPIXELS,
  TIER_AGENTS,
  TILE_PX,
  createTown,
  firstMemberOf,
  householdOf,
  nearestAgent,
} from '@nomos/sim-core';
import { personName } from '@nomos/sim-culture';
import { parseMap } from '@nomos/sim-protocol';
import type { Locator, Page } from 'playwright/test';
import { expect, test } from '../../../../packages/render-gl/test/browser/scale.ts';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

const TOWN = '/?seed=42&tier=phone';
const TILE_Q8 = TILE_PX * SUBPIXELS;
const NO_BLOB = 'No blob here';
const PHONE = { width: 390, height: 844 };
// Keeps a click off the view's edges and the HUD laid over its top.
const MARGIN_CSS_PX = 8;
// Time enough for a wrongly sent inspect to load the panel and show its answer.
const QUIET_MS = 500;

type Button = 'left' | 'right';
const CHORDS: [string, Button, Button][] = [
  ['right released first', 'right', 'left'],
  ['left released first', 'left', 'right'],
];

// The world the page builds for this URL: a town of the phone tier's whole crowd, held at tick 0 by reduced motion.
const town = new Uint8Array(readFileSync(new URL('../../../../assets/maps/town.nmap', import.meta.url)));
const world = createTown(42, 'phone', parseMap(town.buffer), TIER_AGENTS.phone);

// The look's parts as looks.py names them, written out here so the page's own table is checked against another.
const HUES = ['sun', 'lilac', 'rose', 'ice', 'mint', 'silver'];
const EYES = ['round', 'dot', 'tall', 'wide'];
const PATTERNS = ['plain', 'speckle', 'spots', 'patch'];

interface View {
  width: number;
  height: number;
  hudBottom: number;
  dpr: number;
  camera: { x: number; y: number; zoom: number };
  canvas: [number, number];
}

// What the card shows of a blob: its name and its rows, in order.
interface Card {
  name: string;
  rows: [string, string][];
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

// Intl here, so the page's own digit grouping is checked against an independent formatter.
function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lookText(look: number): string {
  const hue = HUES[look % 6];
  const eyes = EYES[Math.floor(look / 6) % 4];
  return `${hue[0].toUpperCase()}${hue.slice(1)} body, ${eyes} eyes, ${PATTERNS[Math.floor(look / 24)]} pattern`;
}

// The names of the others in the blob's household, in household order.
function housemates(agent: number): string[] {
  const { agents, households } = world;
  const household = householdOf(households, agent);
  const first = firstMemberOf(households, household);
  const others: string[] = [];
  for (let member = first; member < first + households.size[household]; member++) {
    if (member !== agent) others.push(personName(agents.nameKey[member]));
  }
  return others;
}

// The card the page shows for a blob, read from the twin.
function cardOf(agent: number): Card {
  const { agents, blob, firms, households } = world;
  blob.at(agent);
  const employer = blob.employer;
  const others = housemates(agent);
  return {
    name: personName(blob.nameKey),
    rows: [
      ['Job', employer < 0 ? 'Out of work' : `Works at Shop ${employer + 1}`],
      ['Pay', employer < 0 ? 'None' : `${money(firms.wage[employer])} a month`],
      ['Wallet', money(blob.cash)],
      ['Home', `House ${households.home[householdOf(households, agent)] + 1}`],
      ['Lives with', others.length === 0 ? 'No one' : others.join(', ')],
      ['Doing', agents.action[agent] === ACTION_WALK ? 'Walking' : 'Idle'],
      ['Look', lookText(agents.look[agent])],
    ],
  };
}

// What the worker answers for a device pixel: the page's worldAt, rounded to Q8 as the worker rounds it. null is no blob.
function answerAt(view: View, deviceX: number, deviceY: number): Card | null {
  const x = view.camera.x + deviceX / view.camera.zoom;
  const y = view.camera.y + deviceY / view.camera.zoom;
  const agent = nearestAgent(world.agents, Math.round(x * SUBPIXELS), Math.round(y * SUBPIXELS), TILE_Q8);
  return agent < 0 ? null : cardOf(agent);
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
      if (answerAt(view, clientX * view.dpr, clientY * view.dpr) === null) return [clientX, clientY];
    }
  }
  throw new Error('a blob lies within a tile of every spot in view');
}

// The whole client pixel nearest the first blob drawn clear of the HUD and the view's edges, and past the first `skip` such
// blobs. With the card open, `corner` keeps to the view's top-left quarter, which the card never covers.
function blobPoint(view: View, skip = 0, corner = false): [number, number] {
  const { x, y, count } = world.agents;
  let seen = 0;
  for (let i = 0; i < count[0]; i++) {
    const clientX = Math.round(((x[i] / SUBPIXELS - view.camera.x) * view.camera.zoom) / view.dpr);
    const clientY = Math.round(((y[i] / SUBPIXELS - view.camera.y) * view.camera.zoom) / view.dpr);
    const inCorner = clientX < view.width / 2 && clientY < view.height / 2;
    if (inView(view, clientX, clientY) && (inCorner || !corner) && seen++ === skip) return [clientX, clientY];
  }
  throw new Error('no blob is drawn clear of the HUD');
}

// Two blobs in the view's top-left quarter, which show different cards, with the client pixels that find them.
function twoBlobs(view: View): [[number, number, Card], [number, number, Card]] {
  const found: [number, number, Card][] = [];
  for (let skip = 0; found.length < 2; skip++) {
    const [clientX, clientY] = blobPoint(view, skip, true);
    const card = answerAt(view, clientX * view.dpr, clientY * view.dpr);
    if (card && (found.length === 0 || card.name !== found[0][2].name)) found.push([clientX, clientY, card]);
  }
  return [found[0], found[1]];
}

// The card's dialog, found by the blob's name, which labels it.
function dialogOf(page: Page, name: string): Locator {
  return page.getByRole('dialog', { name, exact: true });
}

async function expectCard(page: Page, card: Card): Promise<Locator> {
  const dialog = dialogOf(page, card.name);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('dt, dd')).toHaveText(card.rows.flat());
  return dialog;
}

// A blob found opens its card, and no blob says so in the short line.
async function expectAnswer(page: Page, answer: Card | null): Promise<void> {
  if (answer) {
    await expectCard(page, answer);
    await expect(page.locator('#inspector')).toHaveText('');
  } else {
    await expect(page.locator('#inspector')).toHaveText(NO_BLOB);
  }
}

async function expectNoInspector(page: Page): Promise<void> {
  await page.waitForTimeout(QUIET_MS);
  await expect(page.locator('#inspector')).toHaveCount(0);
}

async function pressOver(page: Page, clientX: number, clientY: number): Promise<void> {
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
}

// Opens the card of the first blob in view, and returns what it shows.
async function openCard(page: Page): Promise<Card> {
  const view = await viewOf(page);
  const [clientX, clientY] = blobPoint(view);
  const card = answerAt(view, clientX * view.dpr, clientY * view.dpr);
  if (!card) throw new Error('the first blob in view is not found under its own point');
  await page.mouse.click(clientX, clientY);
  await expectCard(page, card);
  return card;
}

test('opens a card with the name, work, wallet, home, doing and look of the blob under a click', async ({ page }) => {
  await openPaused(page);
  const card = await openCard(page);
  const dialog = dialogOf(page, card.name);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.locator('h2')).toHaveText(card.name);
  // The focus moves into the card, on its one control.
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await expect(page.locator('#inspector')).toHaveText('');
});

test("sits in the view's bottom-right corner, clear of the zoom buttons", async ({ page }) => {
  await openPaused(page);
  const card = await openCard(page);
  const view = await viewOf(page);
  const box = await dialogOf(page, card.name).boundingBox();
  const zoom = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
  if (!box || !zoom) throw new Error('the card or the zoom buttons have no box');
  expect(box.x + box.width).toBeCloseTo(view.width - MARGIN_CSS_PX, 0);
  expect(box.y + box.height).toBeCloseTo(view.height - MARGIN_CSS_PX, 0);
  expect(box.x).toBeGreaterThan(zoom.x + zoom.width);
});

test('closes on Escape, and on its Close button, and gives the view the focus back', async ({ page }) => {
  await openPaused(page);
  const card = await openCard(page);
  await page.keyboard.press('Escape');
  await expect(dialogOf(page, card.name)).toBeHidden();
  await expect(page.locator('#view')).toBeFocused();

  await openCard(page);
  await dialogOf(page, card.name).getByRole('button', { name: 'Close' }).click();
  await expect(dialogOf(page, card.name)).toBeHidden();
  await expect(page.locator('#view')).toBeFocused();
});

test('keeps the focus in the card on Tab, and closes on Escape from the view too', async ({ page }) => {
  await openPaused(page);
  const card = await openCard(page);
  const close = dialogOf(page, card.name).getByRole('button', { name: 'Close' });
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();

  // A click on the town takes the focus to the view, and Escape there closes the card as well.
  const [emptyX, emptyY] = emptyPoint(await viewOf(page));
  await page.mouse.click(emptyX, emptyY);
  await expect(page.locator('#view')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialogOf(page, card.name)).toBeHidden();
});

test('fills the card again for another blob, in the one dialog', async ({ page }) => {
  await openPaused(page);
  const [[firstX, firstY, first], [secondX, secondY, second]] = twoBlobs(await viewOf(page));
  await page.mouse.click(firstX, firstY);
  await expectCard(page, first);
  await page.mouse.click(secondX, secondY);
  await expectCard(page, second);
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('says so when no blob is within a tile, and leaves an open card as it was', async ({ page }) => {
  await openPaused(page);
  const [emptyX, emptyY] = emptyPoint(await viewOf(page));
  await page.mouse.click(emptyX, emptyY);
  await expect(page.locator('#inspector')).toHaveText(NO_BLOB);
  await expect(page.getByRole('dialog')).toBeHidden();

  const card = await openCard(page);
  await expect(page.locator('#inspector')).toHaveText('');
  await page.mouse.click(emptyX, emptyY);
  await expect(page.locator('#inspector')).toHaveText(NO_BLOB);
  await expectCard(page, card);
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
  expect(answer).not.toBeNull();
  await expectAnswer(page, answer);
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
  await expectAnswer(page, answerAt(view, view.canvas[0] / 2, view.canvas[1] / 2));
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
    await expectAnswer(page, answerAt(view, clientX * view.dpr, clientY * view.dpr));
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

// Serious and critical violations block, as in the HUD's check.
async function blockingViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).include('#blob-modal').analyze();
  return results.violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

test('passes axe on the card at a desktop size', async ({ page }) => {
  await openPaused(page);
  await openCard(page);
  expect(await blockingViolations(page)).toEqual([]);
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE });

  test('sits as a bottom sheet that leaves the town visible, and passes axe', async ({ page }) => {
    await openPaused(page);
    const card = await openCard(page);
    const box = await dialogOf(page, card.name).boundingBox();
    if (!box) throw new Error('the card has no box');
    expect([box.x, box.width]).toEqual([0, PHONE.width]);
    expect(box.y + box.height).toBeCloseTo(PHONE.height, 0);
    // The sheet takes the screen's lower half at most, so the town stays in view above it.
    expect(box.y).toBeGreaterThanOrEqual(PHONE.height / 2);
    expect(await blockingViolations(page)).toEqual([]);
  });
});
