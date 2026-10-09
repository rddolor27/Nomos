import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { expect, test } from 'playwright/test';
import type { Goldens, WorldCounts } from '../engines/checks.ts';
import type { PlaceGoldens } from '../engines/places.ts';

declare const nomosWorldgen: typeof import('../engines/checks.ts');
declare const nomosPlaces: typeof import('../engines/places.ts');

const CHECKS = fileURLToPath(new URL('../engines/checks.ts', import.meta.url));
const PLACES = fileURLToPath(new URL('../engines/places.ts', import.meta.url));
function readFixture(name: string): Goldens {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
}

const goldens = readFixture('goldens-v1.json');
const frozen = readFixture('frozen-v1.json');
const SIZES: [string, WorldCounts][] = [
  ['standard', { standard: 100, large: 0 }],
  ['large', { standard: 0, large: 100 }],
];

for (const [size, counts] of SIZES) {
  test(`matches the Python goldens on every ${size} world`, async ({ page, browser, browserName }) => {
    // 100 worlds, each generated about twice over by the mirror's checks (unsourced estimate of the cost).
    test.setTimeout(300_000);
    const bundle = await build({
      entryPoints: [CHECKS],
      bundle: true,
      write: false,
      format: 'iife',
      globalName: 'nomosWorldgen',
    });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const report = await page.evaluate(
      ([fixture, fixed, limit]) => nomosWorldgen.checkStages(fixture, fixed, limit),
      [goldens, frozen, counts] as const,
    );
    test.info().annotations.push({ type: 'engine', description: `${browserName} ${browser.version()}` });
    expect(report.failures).toEqual([]);
  });
}

// The place port's share: every place of the first ENGINE_WORLDS worlds, stage for stage (M3.1, Task 1).
test("builds the first worlds' places as place.py does", async ({ page, browser, browserName }) => {
  test.setTimeout(60_000);
  const placeGoldens: PlaceGoldens = JSON.parse(
    readFileSync(new URL('../fixtures/place-goldens-v1.json', import.meta.url), 'utf8'),
  );
  const bundle = await build({ entryPoints: [PLACES], bundle: true, write: false, format: 'iife', globalName: 'nomosPlaces' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const report = await page.evaluate(
    (fixture) => nomosPlaces.checkPlaces(fixture, nomosPlaces.ENGINE_WORLDS),
    placeGoldens,
  );
  test.info().annotations.push({ type: 'engine', description: `${browserName} ${browser.version()}` });
  expect(report.failures).toEqual([]);
  expect(report.places).toBeGreaterThan(0);
});
