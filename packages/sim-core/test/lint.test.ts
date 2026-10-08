import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../', import.meta.url)) });
const PROFILE_RULES = new Set<string | null>(['no-restricted-properties', 'no-restricted-syntax']);

async function profileMessageCount(code: string, filePath: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => PROFILE_RULES.has(message.ruleId)).length;
}

// A fresh install's first ESLint load took 6.4 s, past Vitest's 5 s default, and CI always starts fresh.
describe('the sim-core lint profile', { timeout: 30_000 }, () => {
  it('rejects transcendental Math, ** and BigInt in sim-core source', async () => {
    const planted = [
      'export const a = Math.sin(1)',
      'Math.pow(2, 3)',
      'Math.random()',
      'Math.log(2)',
      '2 ** 3',
      'let b = 2; b **= 2; export { b }',
      'export const c = 10n',
      'BigInt(1)',
      'new BigInt64Array(1)',
    ];
    for (const code of planted) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/planted.ts'), code).toBeGreaterThan(0);
    }
  });

  it('allows the same maths in build scripts', async () => {
    expect(await profileMessageCount('export const x = Math.cos(1)', 'packages/sim-core/scripts/planted.ts')).toBe(0);
  });

  it('rejects reading the look column outside the store', async () => {
    for (const code of ['s.look[0]', 'const { look } = s', "s['look'][0]"]) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/planted.ts'), code).toBeGreaterThan(0);
      expect(await profileMessageCount(code, 'packages/sim-core/src/store.ts'), code).toBe(0);
    }
    for (const code of ['2 ** 3', 'BigInt(1)']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/store.ts'), code).toBeGreaterThan(0);
    }
  });

  it('rejects multiplying by a raw rate outside money.ts', async () => {
    for (const code of ['c * ratePpm', 'c * l.ratePpm[0]', 'c *= dailyRate']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/planted.ts'), code).toBeGreaterThan(0);
    }
    for (const code of ['units * price', 'mulPpm(a, b) * 2']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/planted.ts'), code).toBe(0);
    }
    expect(await profileMessageCount('c * ratePpm', 'packages/sim-core/src/money.ts')).toBe(0);
  });

  it('allows BigInt only in the apportionment module', async () => {
    const bigint = 'export const z = BigInt(1) + 2n';
    expect(await profileMessageCount(bigint, 'packages/sim-core/src/apportion.ts')).toBe(0);
    for (const filePath of ['src/split.ts', 'src/apportion-big.ts', 'src/apportion/inner.ts']) {
      expect(await profileMessageCount(bigint, `packages/sim-core/${filePath}`), filePath).toBeGreaterThan(0);
    }
    for (const code of ['Math.exp(1)', 'c * ratePpm', 's.look[0]']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/apportion.ts'), code).toBeGreaterThan(0);
    }
  });
});
