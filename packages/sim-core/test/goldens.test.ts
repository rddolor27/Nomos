import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkGoldens,
  checkKernels,
  economyHash,
  spawnHash,
  townHash,
  type Goldens,
  type KernelFixture,
} from './engines/checks.ts';

const kernels: KernelFixture = JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'));
const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens.json', import.meta.url), 'utf8'));
const CLI = fileURLToPath(new URL('../../../tools/cli/src/main.ts', import.meta.url));

describe('the engine checks', { timeout: 30_000 }, () => {
  it('matches the goldens in Node', () => {
    expect(goldens.spawn.hashes).toHaveLength(20);
    expect(checkGoldens(goldens)).toEqual({ cases: 5 + 20, failures: [] });
  });

  it('reports a wrong economy hash, and a run that depends on its seed and its months', () => {
    const { seed, tier, months } = goldens.economy;
    const wrong = {
      ...goldens,
      hashes: {},
      spawn: { ...goldens.spawn, hashes: [] },
      economy: { ...goldens.economy, hash: '00000000' },
    };
    const { failures } = checkGoldens(wrong);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('economy');
    expect(new Set([goldens.economy.hash, economyHash(seed + 1, tier, months), economyHash(seed, tier, months + 1)]).size).toBe(3);
  });

  it('reports a wrong town hash, and a town that depends on its seed and its crowd', () => {
    const { seed, tier, people, ticks } = goldens.town;
    const wrong = {
      ...goldens,
      hashes: {},
      spawn: { ...goldens.spawn, hashes: [] },
      town: { ...goldens.town, hash: '00000000' },
    };
    const { failures } = checkGoldens(wrong);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('town');
    expect(new Set([goldens.town.hash, townHash(seed + 1, tier, people, ticks), townHash(seed, tier, people + 1, ticks)]).size).toBe(3);
  });

  it('reports a wrong spawn hash, and spawns that depend on their record', () => {
    const { seed, hashes } = goldens.spawn;
    const wrongHashes = hashes.map((hash, index) => (index === 3 ? '00000000' : hash));
    const wrong = { ...goldens, hashes: {}, spawn: { seed, hashes: wrongHashes } };
    const { failures } = checkGoldens(wrong);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('spawn');
    expect(failures[0]).toContain('"index":3');
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(spawnHash(seed + 1, 0)).not.toBe(hashes[0]);
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
