import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkGoldens, checkKernels, type Goldens, type KernelFixture } from './engines/checks.ts';

const kernels: KernelFixture = JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'));
const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens.json', import.meta.url), 'utf8'));
const CLI = fileURLToPath(new URL('../../../tools/cli/src/main.ts', import.meta.url));

describe('the engine checks', { timeout: 30_000 }, () => {
  it('matches the goldens in Node', () => {
    expect(checkGoldens(goldens)).toEqual({ cases: 3, failures: [] });
  });

  it('agrees with the CLI', () => {
    const printed = execFileSync(process.execPath, [CLI, '--seed', '42', '--tier', 'phone', '--ticks', '1000'], {
      encoding: 'utf8',
    });
    expect(printed.trim()).toBe(`seed=42 tier=phone tick=${goldens.ticks} hash=${goldens.hashes['42/phone']}`);
  });

  it('reports a wrong vector', () => {
    expect(checkKernels(kernels).failures).toEqual([]);
    const wrong = structuredClone(kernels);
    wrong.fbm[0].out += 1;
    const { failures } = checkKernels(wrong);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('fbm');
  });
});
