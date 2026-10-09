import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { expect, test } from 'playwright/test';
import type { Goldens, WorldCounts } from '../engines/checks.ts';

declare const nomosWorldgen: typeof import('../engines/checks.ts');

const CHECKS = fileURLToPath(new URL('../engines/checks.ts', import.meta.url));
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
