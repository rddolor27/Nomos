import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise, type ICruiseResult, type IViolation } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';
import { describe, expect, it } from 'vitest';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const WALL = fileURLToPath(new URL('./fixtures/wall/', import.meta.url));

// The CLI's own steps: the config file's options, plus the tsconfig it names. The fixture mirrors the repo's folders,
// so the config's path rules apply to it from its own root.
async function cruiseFrom(baseDir: string): Promise<ICruiseResult> {
  const options = await extractDepcruiseOptions(join(REPO, '.dependency-cruiser.cjs'));
  const tsConfig = extractTSConfig(join(REPO, options.tsConfig?.fileName ?? 'tsconfig.json'));
  const { output } = await cruise(['packages'], { ...options, baseDir }, undefined, { tsConfig });
  return output as ICruiseResult;
}

function violationsOf(result: ICruiseResult, rule: string): IViolation[] {
  return result.summary.violations.filter((violation) => violation.rule.name === rule);
}

function sourcesOf(violations: IViolation[]): string[] {
  return violations.map((violation) => violation.from).sort();
}

function viaOf(violations: IViolation[], source: string): string[] {
  return violations.find((violation) => violation.from === source)?.via?.map((step) => step.name) ?? [];
}

describe('the culture wall in dependency-cruiser', { timeout: 30_000 }, () => {
  it('catches direct and transitive reach', async () => {
    const wall = violationsOf(await cruiseFrom(WALL), 'culture-wall');
    expect(sourcesOf(wall)).toEqual([
      'packages/sim-core/src/crime/direct.ts',
      'packages/sim-core/src/housing/barrel.ts',
      'packages/sim-core/src/labour/value.ts',
      'packages/sim-core/src/police/inline-type.ts',
      'packages/sim-core/src/wages/offer.ts',
    ]);
    expect(viaOf(wall, 'packages/sim-core/src/wages/offer.ts')).toContain('packages/sim-core/src/util/helpers.ts');
    // The real barrel reaches sim-culture the same way, through consumption/stand-in.ts.
    expect(viaOf(wall, 'packages/sim-core/src/housing/barrel.ts')).toContain('packages/sim-core/src/index.ts');
  });

  it('keeps sim-culture on the kernels', async () => {
    const result = await cruiseFrom(WALL);
    expect(sourcesOf(violationsOf(result, 'culture-imports-kernels-only'))).toEqual([
      'packages/sim-culture/src/stray.ts',
    ]);
    expect(sourcesOf(violationsOf(result, 'kernels-stay-below-culture'))).toEqual(['packages/sim-core/src/kernels.ts']);
    const cycles = violationsOf(result, 'no-cycles');
    expect(sourcesOf(cycles)).toEqual(['packages/sim-core/src/a.ts']);
    expect(cycles[0].cycle?.map((step) => step.name)).toContain('packages/sim-core/src/b.ts');
  });

  it('passes the real tree', async () => {
    const result = await cruiseFrom(REPO);
    expect(result.summary.violations).toEqual([]);
    const resolvedBy = (source: string): string[] =>
      result.modules.find((module) => module.source === source)?.dependencies.map((edge) => edge.resolved) ?? [];
    // Workspace names must resolve through pnpm's symlinks and exports to src, or the wall would see nothing.
    expect(resolvedBy('packages/sim-core/src/consumption/stand-in.ts')).toContain('packages/sim-culture/src/index.ts');
    expect(resolvedBy('packages/sim-core/src/index.ts')).toContain('packages/sim-core/src/consumption/stand-in.ts');
  });
});
