import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { withinDistance } from '../src/text/edit.ts';
import { foldName, nameTokens } from '../src/text/fold.ts';
import { franchiseHits } from '../src/filters/franchise.ts';
import { formatFindings, scanPaths, scanRepo } from '../src/lints/scan.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// The franchise name is assembled here so that this file passes the lint it tests.
const COMPOSED = 'Po' + 'kémon';
const DECOMPOSED = 'Pok' + 'é' + 'mon';
const UNACCENTED = 'po' + 'kemon';

describe('foldName', () => {
  it('drops accents and case, composed or decomposed', () => {
    expect(foldName('Côte d’Ivoire')).toBe('cote d’ivoire');
    expect(foldName('ÅNGSTRÖM')).toBe('angstrom');
    expect(foldName('é')).toBe('e');
    expect(foldName('é')).toBe('e');
  });
});

describe('nameTokens', () => {
  it('splits a name into folded words of three letters or more', () => {
    expect(nameTokens('Côte d’Ivoire')).toEqual(['cote', 'ivoire']);
    expect(nameTokens('St. Vincent & Grenadines (Isla)')).toEqual(['vincent', 'grenadines', 'isla']);
  });

  it('drops a word with a letter outside a to z whole, not in pieces', () => {
    expect(nameTokens('Østfold Ål 2')).toEqual([]);
  });
});

describe('franchiseHits', () => {
  it.each([
    ['composed', COMPOSED],
    ['decomposed', DECOMPOSED],
    ['in capitals', COMPOSED.toUpperCase()],
    ['decomposed in capitals', DECOMPOSED.toUpperCase()],
    ['unaccented', UNACCENTED],
    ['as the accented prefix', 'Po' + 'ké-ball'],
    ['as the decomposed prefix', 'Pok' + 'é' + ' ball'],
    ['in a path', `assets/${UNACCENTED}/x.png`],
    ['in a package name', `@nomos/${UNACCENTED}-ui`],
    ['inside a sentence', `the ${COMPOSED} league`],
  ])('catches the name %s', (_form, text) => {
    expect(franchiseHits(text).length).toBeGreaterThan(0);
  });

  it.each(['spoke', 'bespoke', 'poke', 'poker', 'spoken', 'spokesperson', 'Poke the fire', 'nothing to see'])(
    'allows the ordinary words in %j',
    (text) => {
      expect(franchiseHits(text)).toEqual([]);
    },
  );
});

describe('withinDistance', () => {
  it('measures edit distance', () => {
    expect(withinDistance('kitten', 'sitting', 3)).toBe(true);
    expect(withinDistance('kitten', 'sitting', 2)).toBe(false);
  });

  it('handles equal, empty and very different lengths', () => {
    expect(withinDistance('abc', 'abc', 0)).toBe(true);
    expect(withinDistance('abc', 'abd', 0)).toBe(false);
    expect(withinDistance('', 'ab', 2)).toBe(true);
    expect(withinDistance('', 'abc', 2)).toBe(false);
    expect(withinDistance('a', 'abcd', 2)).toBe(false);
  });

  it('counts an insertion, a deletion and a substitution as one edit each', () => {
    expect(withinDistance('france', 'franse', 1)).toBe(true);
    expect(withinDistance('japan', 'japn', 1)).toBe(true);
    expect(withinDistance('japn', 'japan', 1)).toBe(true);
    expect(withinDistance('hindu', 'hindo', 1)).toBe(true);
    expect(withinDistance('japan', 'jxpxn', 1)).toBe(false);
    expect(withinDistance('japan', 'jxpxn', 2)).toBe(true);
  });
});

const dirs: string[] = [];

function makeTree(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), 'nomos-names-'));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('scanPaths', () => {
  it('reports the line of a hit in code or a comment', () => {
    const path = 'packages/a/src/x.ts';
    const root = makeTree({ [path]: `const a = 1;\n  // ${COMPOSED} data\n` });
    expect(scanPaths(root, [path])).toEqual([{ path, line: 2, text: `// ${COMPOSED} data` }]);
  });

  it('reports a path that holds the name, markdown paths included', () => {
    const paths = [`assets/${UNACCENTED}/x.png`, `docs/${COMPOSED}.md`];
    const root = makeTree({});
    expect(scanPaths(root, paths)).toEqual(paths.map((path) => ({ path, line: 0, text: path })));
  });

  it('reads only the code folders and the root package.json', () => {
    const root = makeTree({
      'package.json': `{\n  "name": "${UNACCENTED}"\n}\n`,
      'docs/data.json': UNACCENTED,
      'assets/names.json': UNACCENTED,
      'scripts/run.ts': UNACCENTED,
      'apps/web/src/a.ts': UNACCENTED,
      'tools/x/b.py': UNACCENTED,
    });
    const paths = ['package.json', 'docs/data.json', 'assets/names.json', 'scripts/run.ts', 'apps/web/src/a.ts', 'tools/x/b.py'];
    expect(scanPaths(root, paths).map((f) => f.path)).toEqual(['package.json', 'apps/web/src/a.ts', 'tools/x/b.py']);
  });

  it('skips markdown and binary files', () => {
    const root = makeTree({
      'tools/x/README.md': COMPOSED,
      'tools/x/blob.bin': Buffer.concat([Buffer.from([0]), Buffer.from(UNACCENTED)]),
    });
    expect(scanPaths(root, ['tools/x/README.md', 'tools/x/blob.bin'])).toEqual([]);
  });

  it('skips listed paths that are gone or are folders', () => {
    const root = makeTree({ 'tools/sub/keep.txt': 'fine' });
    expect(scanPaths(root, ['apps/web/gone.ts', 'tools/sub'])).toEqual([]);
  });

  it('cuts a long line to a readable quote', () => {
    const path = 'tools/x/minified.js';
    const root = makeTree({ [path]: `${'a'.repeat(500)}${UNACCENTED}` });
    const [finding] = scanPaths(root, [path]);
    expect(finding.line).toBe(1);
    expect(finding.text.length).toBeLessThanOrEqual(160);
  });
});

describe('scanRepo', () => {
  it('scans the repo clean', () => {
    expect(scanRepo(ROOT)).toEqual([]);
  });
});

describe('formatFindings', () => {
  const found = { path: 'packages/a/src/x.ts', line: 3, text: 'const a = 1;' };

  it('prints one line per finding, then the count', () => {
    const asset = { path: 'assets/x/y.png', line: 0, text: 'assets/x/y.png' };
    expect(formatFindings([found, asset])).toEqual([
      'packages/a/src/x.ts:3: const a = 1;',
      'assets/x/y.png:0: assets/x/y.png',
      '2 findings',
    ]);
  });

  it('counts none and one', () => {
    expect(formatFindings([])).toEqual(['0 findings']);
    expect(formatFindings([found]).at(-1)).toBe('1 finding');
  });
});

describe('the names command', () => {
  it('reports 0 findings on the repo, from any folder', () => {
    const out = execFileSync(process.execPath, [join(ROOT, 'tools/names/src/cli.ts')], {
      cwd: tmpdir(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(out).toBe('0 findings\n');
  });
});
