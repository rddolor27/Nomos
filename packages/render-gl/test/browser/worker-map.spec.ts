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

test('spawns every agent on a walkable tile', async ({ page }) => {
  const spawn = await page.evaluate(() => window.workerHarness.spawn(42));
  expect(spawn).toEqual({ agents: 10_000, tick: 0, count: 10_000, offWalk: 0 });
  expect(errors).toEqual([]);
});

test('serves the map with its content type', async ({ page }) => {
  const { got, want } = await page.evaluate(() => window.workerHarness.mapContentType());
  expect(got).toBe(want);
  expect(errors).toEqual([]);
});

test('fails loudly on a bad map', async ({ page }) => {
  const message = await page.evaluate(() => window.workerHarness.failOn('<!doctype html>'));
  expect(message).toContain('MapError');
  expect(errors.filter((error) => !error.includes('MapError'))).toEqual([]);
});
