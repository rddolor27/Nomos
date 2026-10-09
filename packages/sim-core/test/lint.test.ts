import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../', import.meta.url)) });
// Profiles run their own copies of the core rules, such as hot/no-restricted-syntax.
const PROFILE_RULE = /no-restricted-(syntax|properties)$/;

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId ?? '');
}

async function profileMessageCount(code: string, filePath: string): Promise<number> {
  return (await ruleIds(code, filePath)).filter((id) => PROFILE_RULE.test(id)).length;
}

async function hotMessageCount(code: string, filePath: string): Promise<number> {
  return (await ruleIds(code, filePath)).filter((id) => id.startsWith('hot/')).length;
}

async function genMessages(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId?.startsWith('gen/')).map((message) => message.message);
}

async function layoutMessages(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId?.startsWith('layout/')).map((message) => message.message);
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
      expect(await profileMessageCount(code, 'packages/sim-core/src/memory/planted.ts'), code).toBeGreaterThan(0);
    }
  });

  it('allows the same maths in build scripts', async () => {
    expect(await profileMessageCount('export const x = Math.cos(1)', 'packages/sim-core/scripts/planted.ts')).toBe(0);
  });

  it('rejects reading the look column outside the store', async () => {
    for (const code of ['s.look[0]', 'const { look } = s', "s['look'][0]"]) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/memory/planted.ts'), code).toBeGreaterThan(0);
      expect(await profileMessageCount(code, 'packages/sim-core/src/agents/store.ts'), code).toBe(0);
    }
    for (const code of ['2 ** 3', 'BigInt(1)']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/agents/store.ts'), code).toBeGreaterThan(0);
    }
  });

  it('rejects multiplying by a raw rate outside money.ts', async () => {
    for (const code of ['c * ratePpm', 'c * l.ratePpm[0]', 'c * ratePpm[i]', 'c *= dailyRate']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/memory/planted.ts'), code).toBeGreaterThan(0);
    }
    for (const code of ['units * price', 'mulPpm(a, b) * 2']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/memory/planted.ts'), code).toBe(0);
    }
    expect(await profileMessageCount('c * ratePpm', 'packages/sim-core/src/money/ppm.ts')).toBe(0);
  });

  it('allows BigInt only in the apportionment module', async () => {
    const bigint = 'export const z = BigInt(1) + 2n';
    expect(await profileMessageCount(bigint, 'packages/sim-core/src/maths/apportion.ts')).toBe(0);
    for (const filePath of ['src/maths/split.ts', 'src/maths/apportion-big.ts', 'src/maths/apportion/inner.ts']) {
      expect(await profileMessageCount(bigint, `packages/sim-core/${filePath}`), filePath).toBeGreaterThan(0);
    }
    for (const code of ['Math.exp(1)', 'c * ratePpm', 's.look[0]']) {
      expect(await profileMessageCount(code, 'packages/sim-core/src/maths/apportion.ts'), code).toBeGreaterThan(0);
    }
  });

  it('applies the sim profile to sim-protocol and sim-worker', async () => {
    for (const filePath of ['packages/sim-protocol/src/messages/planted.ts', 'packages/sim-worker/src/loop/planted.ts']) {
      for (const code of ['Math.sin(1)', '2 ** 3', 'BigInt(1)', 'c * ratePpm']) {
        expect(await profileMessageCount(code, filePath), `${filePath}: ${code}`).toBeGreaterThan(0);
      }
    }
    expect(await profileMessageCount('s.look[0]', 'packages/sim-protocol/src/messages/planted.ts')).toBe(0);
  });

  it('bans transcendental maths in every sim package', async () => {
    const files = [
      'packages/sim-culture/src/festivals/planted.ts',
      'packages/sim-protocol/src/map/map.ts',
      'packages/sim-core/src/random/draw.ts',
      'packages/sim-core/src/random/noise.ts',
    ];
    for (const filePath of files) {
      for (const code of ['export const a = Math.sin(1)', 'BigInt(1)']) {
        expect(await profileMessageCount(code, filePath), `${filePath}: ${code}`).toBeGreaterThan(0);
      }
    }
    expect(await profileMessageCount('s.look[0]', 'packages/sim-culture/src/festivals/planted.ts')).toBeGreaterThan(0);
    expect(await profileMessageCount('s.look[0]', 'packages/sim-protocol/src/map/map.ts')).toBe(0);
  });

  it('rejects sorting in sim code', async () => {
    const simFiles = [
      'packages/sim-core/src/memory/planted.ts',
      'packages/sim-worker/src/loop/planted.ts',
      'packages/sim-core/src/agents/store.ts',
      'packages/sim-core/src/money/ppm.ts',
      'packages/sim-core/src/maths/apportion.ts',
    ];
    for (const code of ['v.sort()', 'v.toSorted()']) {
      for (const filePath of simFiles) {
        expect(await profileMessageCount(code, filePath), `${filePath}: ${code}`).toBeGreaterThan(0);
      }
      expect(await profileMessageCount(code, 'packages/sim-core/scripts/planted.ts'), code).toBe(0);
    }
  });
});

const HOT_FILE = 'packages/sim-core/src/movement/wander.ts';
const HOT_PLANTS = [
  'g([1])',
  'g({ a: 1 })',
  'g(() => 1)',
  'function inner() {}',
  'g(new Int32Array(4))',
  'g(Math.max(...a))',
  'g(`${a[0]}`)',
  'for (const v of a) g(v)',
  'for (const k in a) g(k)',
  'a.forEach(g)',
  'g(a.map(g))',
  'g(a.slice(1))',
  'g(a.subarray(1))',
  'g(BigInt(1))',
  'g(Math.random())',
  'g(Math.exp(1))',
  'g(Date.now())',
  'g(performance.now())',
  'g(draw(1, 2, 3))',
  "g('x' + a[0])",
  'g(String(a[0]))',
  'g(a[0].toString())',
  'g(a[0].toFixed(2))',
];
// Shapes a statement in tick cannot show: a signature, a name that only starts with a cold word, and functions not
// declared with function.
const HOT_FILE_PLANTS = [
  'export function tick(...a: number[]): void {}\n',
  'export function createdToday(a: Int32Array): void {\n  g([1]);\n}\n',
  'export function failures(a: Int32Array): void {\n  g([1]);\n}\n',
  'export function checkpointDue(a: Int32Array): void {\n  g([1]);\n}\n',
  'export const sys = { tick(a) { return [a]; } };\n',
  'export default (a) => [a];\n',
  'sys.tick = function (a) { return [a]; };\n',
];

function inTick(statement: string): string {
  return `export function tick(a: Int32Array): void {\n  ${statement};\n}\n`;
}

describe('the hot-path lint', { timeout: 30_000 }, () => {
  it('rejects every allocation and clock in a hot function', async () => {
    for (const plant of HOT_PLANTS) {
      expect(await profileMessageCount(inTick(plant), HOT_FILE), plant).toBeGreaterThan(0);
    }
  });

  it('rejects the shapes a statement cannot show', async () => {
    for (const code of HOT_FILE_PLANTS) {
      expect(await hotMessageCount(code, HOT_FILE), code).toBeGreaterThan(0);
    }
  });

  it('allows creation, errors and constants', async () => {
    const allowed = [
      'export function createThing(): Int32Array {\n  return new Int32Array(4);\n}\n',
      inTick('throw new RangeError(`bad ${a.length}`)'),
      inTick("throw new RangeError('bad ' + a.length)"),
      inTick('throw new RangeError(String(a.length))'),
      'export const TABLE = [1, 2, 3];\n',
      inTick('a[0] = a[1] + 2'),
    ];
    for (const code of allowed) {
      expect(await profileMessageCount(code, HOT_FILE), code).toBe(0);
    }
  });

  it('sees every hot function', async () => {
    expect(await profileMessageCount('export const tick = (a) => a[0];\n', HOT_FILE)).toBeGreaterThan(0);
  });

  it('leaves other files alone', async () => {
    for (const plant of HOT_PLANTS) {
      expect(await hotMessageCount(inTick(plant), 'packages/sim-core/src/step/warm.ts'), plant).toBe(0);
    }
    for (const code of HOT_FILE_PLANTS) {
      expect(await hotMessageCount(code, 'packages/sim-core/src/step/warm.ts'), code).toBe(0);
    }
  });
});

const GENERATOR_FILES = [
  'packages/sim-core/src/random/draw.ts',
  'packages/sim-core/src/random/noise.ts',
  'packages/sim-protocol/src/map/map.ts',
];
const BARE_DIVISIONS = ['a / b', 'a /= 2'];
const BARE_REMAINDERS = ['a % b', '(a | 0) % b', 'a %= 3'];

describe('the generator lint', { timeout: 30_000 }, () => {
  it('bans bare division in generator code', async () => {
    for (const filePath of GENERATOR_FILES) {
      for (const code of BARE_DIVISIONS) {
        expect(await genMessages(code, filePath), `${filePath}: ${code}`).toEqual([expect.stringContaining('floorDiv')]);
      }
      for (const code of BARE_REMAINDERS) {
        expect(await genMessages(code, filePath), `${filePath}: ${code}`).toEqual([expect.stringContaining('floorMod')]);
      }
      expect(await genMessages('(h >>> 0) % n', filePath), filePath).toEqual([]);
    }
  });

  it('spares the helpers and other code', async () => {
    const files = [
      'packages/sim-core/src/maths/int.ts',
      'packages/sim-core/src/money/ledger.ts',
      'packages/sim-core/src/memory/planted.ts',
    ];
    for (const filePath of files) {
      for (const code of [...BARE_DIVISIONS, ...BARE_REMAINDERS]) {
        expect(await genMessages(code, filePath), `${filePath}: ${code}`).toEqual([]);
      }
      for (const code of ['a / b', 'a % b']) {
        expect(await profileMessageCount(code, filePath), `${filePath}: ${code}`).toBe(0);
      }
    }
  });
});

// Each package's exports, and what package scripts, CI and tests run or bundle by path (interfaces.md, Layout).
const ENTRIES = [
  ...['sim-core', 'sim-protocol', 'sim-worker', 'sim-culture', 'render-gl'].map((pkg) => `packages/${pkg}/src/index.ts`),
  'packages/sim-core/src/kernels.ts',
  'packages/sim-worker/src/worker.ts',
  'apps/web/src/main.ts',
  'tools/cli/src/main.ts',
  ...['alloc', 'assert-startup', 'browser-entry', 'budget', 'calibrate', 'chunks'].map((name) => `tools/bench/src/${name}.ts`),
  'tools/names/src/cli.ts',
];

describe('the layout lint', { timeout: 30_000 }, () => {
  it('reports any file at src/ that is no entry', async () => {
    const strays = [
      'packages/sim-core/src/planted.ts',
      'packages/render-gl/src/planted.ts',
      'apps/web/src/planted.ts',
      'tools/bench/src/planted.ts',
      'tools/names/src/planted.ts',
    ];
    for (const filePath of strays) {
      expect(await layoutMessages('export const a = 1;\n', filePath), filePath).toEqual([
        expect.stringContaining('concern folder'),
      ]);
    }
  });

  it('spares concern folders and entries', async () => {
    for (const filePath of ['packages/sim-core/src/money/planted.ts', 'apps/web/src/panels/planted.ts', ...ENTRIES]) {
      expect(await layoutMessages('export const a = 1;\n', filePath), filePath).toEqual([]);
    }
  });
});
