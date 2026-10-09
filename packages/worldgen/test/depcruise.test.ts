import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise, type ICruiseResult } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';
import { describe, expect, it } from 'vitest';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const PLANTED = fileURLToPath(new URL('./fixtures/deps/', import.meta.url));

// The CLI's own steps, as sim-core's depcruise test takes them. The fixture mirrors the repo's folders.
async function cruiseFrom(baseDir: string): Promise<ICruiseResult> {
  const options = await extractDepcruiseOptions(join(REPO, '.dependency-cruiser.cjs'));
  const tsConfig = extractTSConfig(join(REPO, options.tsConfig?.fileName ?? 'tsconfig.json'));
  const { output } = await cruise(['packages', 'apps'], { ...options, baseDir }, undefined, { tsConfig });
  return output as ICruiseResult;
}

// reachable: true reports one violation per generator module the page module reaches, so a source can repeat.
function sources(result: ICruiseResult, rule: string): string[] {
  const from = result.summary.violations.filter((violation) => violation.rule.name === rule).map((violation) => violation.from);
  return [...new Set(from)].sort();
}

describe('the world generator in dependency-cruiser', { timeout: 30_000 }, () => {
  it('keeps the generator on the kernels and the world-map codes', async () => {
    const result = await cruiseFrom(PLANTED);
    expect(sources(result, 'worldgen-imports-kernels-only')).toEqual(['packages/worldgen/src/terrain/stray.ts']);
  });

  it('keeps the generator out of every page module but the map worker', async () => {
    const result = await cruiseFrom(PLANTED);
    expect(sources(result, 'worldgen-only-in-the-map-worker')).toEqual(['apps/web/src/panels/stray.ts']);
  });
});
