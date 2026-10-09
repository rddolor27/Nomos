import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../', import.meta.url)) });

const GUARDED_FOLDERS = ['crime', 'police', 'labour', 'wages', 'wealth', 'ability', 'housing', 'migration'];
const IMPORT = "import { festivalToday } from '@nomos/sim-culture'";
const PLANTED_READS = [
  "import type { festivalToday } from '@nomos/sim-culture'",
  "export * from '@nomos/sim-culture'",
  "import '../../../sim-culture/src/index.ts'",
  "await import('@nomos/sim-culture')",
  "type Festivals = typeof import('@nomos/sim-culture')",
  's.culture[i]',
  'w.agents.customs[0]',
  's?.homeRegion',
  'const { birthCulture } = s',
  'const { culture: c } = s',
  'const { agents: { culture } } = w',
  "s['culture']",
  's[`customs`]',
  "const { ['homeRegion']: h } = s",
  "Reflect.get(s, 'nameKey')",
  'customOf(x, 0)',
  'CUSTOM_FOOD',
  'draw2(seed, CULTURE, i, 0)',
];

async function cultureMessages(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId?.startsWith('culture/')).map((message) => message.message);
}

// A fresh install's first ESLint load took 6.4 s, past Vitest's 5 s default, and CI always starts fresh.
describe('the culture wall', { timeout: 30_000 }, () => {
  it('catches every planted read', async () => {
    for (const code of [IMPORT, ...PLANTED_READS]) {
      const messages = await cultureMessages(code, 'packages/sim-core/src/crime/planted.ts');
      expect(messages.length, code).toBeGreaterThan(0);
      expect(messages.every((message) => message.includes('R8')), code).toBe(true);
    }
  });

  it('guards all eight folders, nested folders and every sim package', async () => {
    const files = [
      ...GUARDED_FOLDERS.map((folder) => `packages/sim-core/src/${folder}/planted.ts`),
      'packages/sim-core/src/wages/deep/inner.ts',
      'packages/sim-country/src/crime/planted.ts',
      'packages/sim-protocol/src/migration/planted.ts',
    ];
    for (const filePath of files) {
      expect(await cultureMessages(IMPORT, filePath), filePath).not.toEqual([]);
      expect(await cultureMessages('s.culture[i]', filePath), filePath).not.toEqual([]);
    }
  });

  it('stacks on the sim profile instead of replacing it', async () => {
    const [result] = await eslint.lintText("Math.sin(s.culture[i]); 2 ** 3; s['customs']", {
      filePath: 'packages/sim-core/src/crime/planted.ts',
    });
    const ruleIds = result.messages.map((message) => message.ruleId);
    for (const ruleId of ['no-restricted-properties', 'no-restricted-syntax']) {
      expect(ruleIds, ruleId).toContain(ruleId);
      expect(ruleIds, `culture/${ruleId}`).toContain(`culture/${ruleId}`);
    }
  });

  it('lets consumption read culture', async () => {
    for (const code of [IMPORT, ...PLANTED_READS]) {
      expect(await cultureMessages(code, 'packages/sim-core/src/consumption/planted.ts'), code).toEqual([]);
    }
    const [standIn] = await eslint.lintFiles(['packages/sim-core/src/consumption/stand-in.ts']);
    expect(standIn.messages.filter((message) => message.ruleId?.startsWith('culture/'))).toEqual([]);
  });

  it('flags only the culture names, whole', async () => {
    const innocent = ['s.population', "'cultivate'", 's.customsDuty', "'culture-free'", 'const { population } = s'];
    for (const code of innocent) {
      expect(await cultureMessages(code, 'packages/sim-core/src/crime/planted.ts'), code).toEqual([]);
    }
  });

  it('leaves other folders, other files and tests alone', async () => {
    const files = [
      'packages/sim-core/src/agents/store.ts',
      'packages/sim-core/src/crimes/planted.ts',
      'packages/sim-culture/src/planted.ts',
      'packages/sim-core/test/crime/planted.ts',
      'packages/sim-core/scripts/crime/planted.ts',
    ];
    for (const filePath of files) {
      expect(await cultureMessages(IMPORT, filePath), filePath).toEqual([]);
      expect(await cultureMessages('s.customs[i]', filePath), filePath).toEqual([]);
    }
  });
});
