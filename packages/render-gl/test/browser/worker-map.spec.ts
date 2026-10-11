import { expect, test } from 'playwright/test';

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/worker.html');
  await page.waitForFunction(() => window.workerHarness !== undefined);
});

test('opens the town at 07:00 with every agent on a walkable tile', async ({ page }) => {
  const spawn = await page.evaluate(() => window.workerHarness.spawn(42));
  // The first snapshot is the morning, 07:00 (tick 420), where the worker's opening run stops. A stall's keeper stands at its
  // counter, on the stall's own footprint one tile behind the door (M2.7 Ruling 7), the one place a blob is off the walk grid,
  // and Highcourt's first keeper gets there at 07:30, so none is off it yet.
  expect(spawn).toEqual({ agents: 1_720, tick: 420, count: 1_720, offWalk: 0 });
  expect(errors).toEqual([]);
});

test('serves the map with its content type', async ({ page }) => {
  const { got, want } = await page.evaluate(() => window.workerHarness.mapContentType());
  expect(got).toBe(want);
  expect(errors).toEqual([]);
});

// Chromium names the MapError in the error event's message, but Firefox gives only "Error:" and the error's own text.
const BAD_MAP_TEXT = 'not a Nomos map';

test('fails loudly on a bad map', async ({ page }) => {
  const message = await page.evaluate(() => window.workerHarness.failOn('<!doctype html>'));
  expect(message).toContain(BAD_MAP_TEXT);
  expect(errors.filter((error) => !error.includes(BAD_MAP_TEXT))).toEqual([]);
});
