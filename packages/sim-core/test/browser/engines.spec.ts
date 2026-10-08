import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { expect, test } from 'playwright/test';
import type { Goldens, KernelFixture } from '../engines/checks.ts';

declare const nomosEngines: typeof import('../engines/checks.ts');

const CHECKS = fileURLToPath(new URL('../engines/checks.ts', import.meta.url));
const kernels: KernelFixture = JSON.parse(readFileSync(new URL('../fixtures/kernels.json', import.meta.url), 'utf8'));
const goldens: Goldens = JSON.parse(readFileSync(new URL('../fixtures/goldens.json', import.meta.url), 'utf8'));

test('matches the kernel vectors and the replay goldens', async ({ page, browser, browserName }) => {
  // The three replays take Firefox 6-9 s here, against a 30 s default that a busy CI runner could near.
  test.slow();
  const bundle = await build({
    entryPoints: [CHECKS],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'nomosEngines',
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const [kernelReport, goldenReport] = await page.evaluate(
    ([kernelFixture, goldenFixture]) => [
      nomosEngines.checkKernels(kernelFixture),
      nomosEngines.checkGoldens(goldenFixture),
    ],
    [kernels, goldens] as const,
  );
  test.info().annotations.push({ type: 'engine', description: `${browserName} ${browser.version()}` });
  expect(kernelReport.failures).toEqual([]);
  expect(goldenReport.failures).toEqual([]);
});
