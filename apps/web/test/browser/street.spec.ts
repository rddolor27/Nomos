import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { SITE_PLAZA, TILE_PX } from '@nomos/sim-core';
import { EMOTE_SPEECH, leisureOf, packVisual, parseMap } from '@nomos/sim-protocol';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

// Highcourt, the town with streets: a start with no ?tier= seats one blob to a bed of its map's homes. It opens at 07:00 of day 0, and
// a tick is a minute of the day.
const HIGHCOURT = '/?seed=42';
// 15:00, not 14:00: M3.2 Task 8's fetch chains keep blobs home until their purchases are in, so plaza chats come later.
const THREE_PM = 15 * 60;
const PHONE = { width: 390, height: 844 };
// On a desktop the card is 300 px wide and 60% of the view's height at most.
const MAX_CARD_WIDTH = 300;
const MAX_CARD_SHARE = 0.6;
// A chat lasts 20 ticks at the least, and a snapshot comes every 4 ticks at 4x, so a pause sent on the first snapshot of a chat lands
// with at least 12 ticks of it left even a turn or two late. At 16x a snapshot comes every 16 ticks, and the pause could miss the chat.
const SPEED = '4×';
// The sim pairs blobs within a tile and a half.
const REACH_PX = 1.5 * TILE_PX;
const APART_PX = 2;
// Day 0 to 15:00 is 480 ticks, 12 s at 4x.
const PLAY_MS = 60_000;

interface Speaker {
  agent: number;
  x: number;
  y: number;
}

interface Watch {
  // The plaza's ground in world pixels.
  plaza: { left: number; top: number; right: number; bottom: number };
  // The emote bits of a snapshot's visual word, and what they hold over a blob in a chat.
  emoteMask: number;
  speech: number;
  // The bit a blob indoors has in its visual word, which no click can find.
  indoors: number;
  // How far a blob must stand from every other out of doors for a click on it to find it.
  apart: number;
  // How far a pair may stand apart.
  reach: number;
  // The tick by which a pair must have chatted.
  deadline: number;
}

interface Chat {
  tick: number;
  pair: [Speaker, Speaker];
}

declare global {
  interface Window {
    __chat?: { found: Chat | null; over: boolean };
  }
}

// Runs in the page before its own scripts, so it is the first listener on the sim worker: the app hands each snapshot's buffer
// straight back to the worker, which leaves a later listener an empty one. It looks in every snapshot for a pair in speech, one of
// them on the plaza, and when it finds one, or the deadline comes, it presses Pause on that same message, so the world stands at the
// tick of the snapshot with the chat still on. Blobs on a shared lane stand on one spot, and a click on it finds the lowest of them,
// so it takes a pair that each have the spot to themselves, among the blobs out of doors.
function watchForPlazaChat(watch: Watch): void {
  const state: NonNullable<Window['__chat']> = { found: null, over: false };
  window.__chat = state;
  const { left, top, right, bottom } = watch.plaza;

  const read = (buffer: ArrayBuffer, count: number): { floats: Float32Array; words: Uint32Array } => ({
    floats: new Float32Array(buffer, 0, count * 3),
    words: new Uint32Array(buffer, 0, count * 3),
  });
  const speakersIn = (floats: Float32Array, words: Uint32Array, count: number): Speaker[] => {
    const speakers: Speaker[] = [];
    for (let agent = 0; agent < count; agent++) {
      if ((words[agent * 3 + 2] & watch.emoteMask) === watch.speech) speakers.push({ agent, x: floats[agent * 3], y: floats[agent * 3 + 1] });
    }
    return speakers;
  };
  const aloneAt = ({ agent, x, y }: Speaker, floats: Float32Array, words: Uint32Array, count: number): boolean => {
    for (let other = 0; other < count; other++) {
      const outdoors = (words[other * 3 + 2] & watch.indoors) === 0;
      if (outdoors && other !== agent && Math.hypot(floats[other * 3] - x, floats[other * 3 + 1] - y) < watch.apart) return false;
    }
    return true;
  };
  const onPlaza = ({ x, y }: Speaker): boolean => x >= left && x < right && y >= top && y < bottom;
  const pairOnPlaza = (floats: Float32Array, words: Uint32Array, count: number): [Speaker, Speaker] | null => {
    const speakers = speakersIn(floats, words, count);
    for (const first of speakers.filter(onPlaza)) {
      const partner = speakers.find((other) => other !== first && Math.hypot(other.x - first.x, other.y - first.y) <= watch.reach);
      if (partner && aloneAt(first, floats, words, count) && aloneAt(partner, floats, words, count)) return [first, partner];
    }
    return null;
  };
  const stop = (): void => {
    state.over = true;
    document.querySelector<HTMLButtonElement>('#play')?.click();
  };

  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      this.addEventListener('message', ({ data }: MessageEvent<{ type: string; tick: number; count: number; buffer: ArrayBuffer }>) => {
        if (state.over || data.type !== 'snapshot') return;
        const { floats, words } = read(data.buffer, data.count);
        const pair = pairOnPlaza(floats, words, data.count);
        if (pair) state.found = { tick: data.tick, pair };
        if (pair || data.tick >= watch.deadline) stop();
      });
    }
  };
}

const map = parseMap(new Uint8Array(readFileSync(new URL('../../../../assets/maps/town.nmap', import.meta.url))).buffer);
const plaza = leisureOf(map).find((site) => site.kind === SITE_PLAZA);

function watchOf(): Watch {
  if (!plaza) throw new Error("Highcourt's map has no plaza");
  return {
    plaza: { left: plaza.x * TILE_PX, top: plaza.y * TILE_PX, right: (plaza.x + plaza.w) * TILE_PX, bottom: (plaza.y + plaza.h) * TILE_PX },
    // packVisual masks the emote to its field, so -1 sets every bit the field has.
    emoteMask: packVisual(0, 0, -1, 0, 0, 0),
    speech: packVisual(0, 0, EMOTE_SPEECH, 0, 0, 0),
    indoors: packVisual(0, 0, 0, 0, 0, 0, 1),
    apart: APART_PX,
    reach: REACH_PX,
    deadline: THREE_PM,
  };
}

// Plays Highcourt from its 07:00 until a pair chats on the plaza, and leaves the world paused on that snapshot.
async function playToPlazaChat(page: Page): Promise<Chat> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(watchForPlazaChat, watchOf());
  await page.goto(HIGHCOURT);
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
  await page.getByRole('group', { name: 'Speed' }).getByRole('button', { name: SPEED, exact: true }).click();
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__chat?.over === true, undefined, { timeout: PLAY_MS });
  const chat = await page.evaluate(() => window.__chat?.found ?? null);
  if (!chat) throw new Error('no pair chatted on the plaza before 15:00');
  return chat;
}

// The client pixel a blob is drawn at, from the camera the page holds.
function clientPoint(page: Page, { x, y }: Speaker): Promise<[number, number]> {
  return page.evaluate(
    ([worldX, worldY]): [number, number] => {
      const view = document.querySelector('#view')?.getBoundingClientRect();
      const app = window.__app;
      if (!view || !app) throw new Error('the page has no view');
      const { camera } = app;
      return [view.left + ((worldX - camera.x) * camera.zoom) / devicePixelRatio, view.top + ((worldY - camera.y) * camera.zoom) / devicePixelRatio];
    },
    [x, y],
  );
}

// A card's value for a label, found by the label.
function rowValue(card: Locator, label: string): Locator {
  return card.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');
}

// The four needs read as a name and a percent each, and each bar is as full as its percent says.
async function expectNeedBars(card: Locator): Promise<void> {
  const needs = await card.locator('.need').evaluateAll((nodes) =>
    nodes.map((node) => ({ text: node.textContent ?? '', width: node.querySelector<HTMLElement>('.need-level')?.style.width ?? '' })),
  );
  expect(needs.map(({ text }) => text.replace(/ \d+%$/, ''))).toEqual(['Hunger', 'Rest', 'Fun', 'Company']);
  for (const { text, width } of needs) expect(width).toBe(text.slice(text.lastIndexOf(' ') + 1));
}

async function openCardOn(page: Page, speaker: Speaker): Promise<Locator> {
  const [clientX, clientY] = await clientPoint(page, speaker);
  await page.mouse.click(clientX, clientY);
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  return card;
}

// Serious and critical violations block, as in the HUD's check.
async function blockingViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).include('#blob-modal').analyze();
  return results.violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

test('opens a card on a chatter on the plaza by 15:00 that names its partner, and passes axe on a desktop and a phone', async ({ page }) => {
  test.setTimeout(PLAY_MS + 60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const chat = await playToPlazaChat(page);
  expect(chat.tick, 'the first pair to chat on the plaza came after 15:00').toBeLessThan(THREE_PM);

  // Each of the pair names the other: the card of the first says who it chats with, and the card of that blob says the first.
  const [first, second] = chat.pair;
  const card = await openCardOn(page, first);
  await expect(rowValue(card, 'Doing')).toHaveText(/^Chatting with .+$/);
  const firstName = (await card.locator('h2').textContent()) ?? '';
  const partner = ((await rowValue(card, 'Doing').textContent()) ?? '').replace('Chatting with ', '');
  expect(partner).not.toBe(firstName);
  await expect(rowValue(card, 'Feeling')).toHaveText(/^(Hungry|Tired|Bored|Lonely|Content)$/);
  await expect(rowValue(card, 'Needs')).toHaveText(/^Hunger \d+%\s*Rest \d+%\s*Fun \d+%\s*Company \d+%$/);
  await expect(rowValue(card, 'Personality')).toHaveText(/^[A-Z]/);
  await expectNeedBars(card);

  await openCardOn(page, second);
  await expect(card.locator('h2')).toHaveText(partner);
  await expect(rowValue(card, 'Doing')).toHaveText(`Chatting with ${firstName}`);
  // On a desktop the card is 300 px wide and 60% of the view's height at most.
  const desktop = await card.boundingBox();
  const view = await page.locator('#view').boundingBox();
  if (!desktop || !view) throw new Error('the card or the view has no box');
  expect(desktop.width).toBeLessThanOrEqual(MAX_CARD_WIDTH);
  expect(desktop.height).toBeLessThanOrEqual(view.height * MAX_CARD_SHARE + 1);
  expect(await blockingViolations(page)).toEqual([]);

  // On a phone the card is a bottom sheet as wide as the screen and 60% of its height at most. The picture, the name, what the blob
  // is doing and how it feels show with no scroll, and More opens the rest into view.
  await page.setViewportSize(PHONE);
  await expect.poll(async () => (await card.boundingBox())?.width).toBe(PHONE.width);
  const box = await card.boundingBox();
  if (!box) throw new Error('the card has no box');
  expect(box.y + box.height).toBeCloseTo(PHONE.height, 0);
  expect(box.height).toBeLessThanOrEqual(PHONE.height * 0.6 + 1);
  expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  for (const shown of [card.locator('canvas'), card.locator('h2'), rowValue(card, 'Doing'), rowValue(card, 'Feeling')]) {
    await expect(shown).toBeInViewport({ ratio: 1 });
  }
  await card.locator('summary').click();
  await expect(rowValue(card, 'Look')).toBeInViewport({ ratio: 1 });
  expect(await blockingViolations(page)).toEqual([]);

  expect(errors).toEqual([]);
});
