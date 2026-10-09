import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../', import.meta.url)) });
const PLANTED = 'packages/worldgen/src/terrain/planted.ts';

async function ruleIds(code: string, filePath = PLANTED): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId ?? '');
}

// A fresh install's first ESLint load can pass Vitest's 5 s default.
describe('the world generator lint', { timeout: 30_000 }, () => {
  it('rejects float maths, rounding, bare division and orderless sorts', async () => {
    const planted = [
      'export const a = Math.sin(1);',
      'export const b = Math.random();',
      'export const c = Math.sqrt(2);',
      'export const d = Math.round(2.5);',
      'export const e = Math.trunc(-2.5);',
      'export const f = 2 ** 3;',
      'export const g = BigInt(1);',
      'export const h = (n: number) => n / 2;',
      'export const i = (n: number) => n % 3;',
      'export const j = [3, 1].sort();',
    ];
    for (const code of planted) expect(await ruleIds(code), code).not.toEqual([]);
  });

  it('allows the integer helpers, unsigned remainders and ordered sorts', async () => {
    const allowed = [
      "import { floorDiv } from '@nomos/sim-core/kernels';\nexport const a = (n: number) => floorDiv(n, 2);\n",
      'export const b = (d: number) => (d >>> 0) % 7;\n',
      'export const c = [3, 1].sort((p, q) => p - q);\n',
      'export const d = Math.max(1, Math.abs(-2));\n',
    ];
    for (const code of allowed) expect(await ruleIds(code), code).toEqual([]);
  });

  it('leaves tests and scripts free', async () => {
    expect(await ruleIds('export const a = Math.sqrt(2) / 2;\n', 'packages/worldgen/test/planted.test.ts')).toEqual([]);
  });
});
