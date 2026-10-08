import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { uncoveredChunks } from '../src/chunks.ts';

const WEB = fileURLToPath(new URL('../../../apps/web', import.meta.url));
const CLI = fileURLToPath(new URL('../src/chunks.ts', import.meta.url));
const WASM_ADVICE = 'add a size-limit entry: WASM core ≤ 64 kB gzip (R5)';
// The real build is a product of pnpm --filter @nomos/web build, so a fresh checkout has none to check.
const BUILT = existsSync(join(WEB, 'dist', 'assets'));

const dirs: string[] = [];

function makeWeb(sizeLimit: unknown, built: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'nomos-chunks-'));
  dirs.push(root);
  const files: Record<string, string> = { '.size-limit.json': JSON.stringify(sizeLimit) };
  for (const file of built) files[`dist/${file}`] = '';
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('uncoveredChunks', () => {
  it('finds an ungated chunk', () => {
    const web = makeWeb([{ name: 'Initial JS', path: ['dist/assets/index-*.js'], limit: '35 kB' }], [
      'assets/index-a1.js',
      'assets/inspector-x.js',
      'sim-y.wasm',
    ]);
    expect(uncoveredChunks(web)).toEqual(['dist/assets/inspector-x.js', `dist/sim-y.wasm: ${WASM_ADVICE}`]);
  });

  it('counts scripts, styles, maps, atlases and modules, and nothing else', () => {
    const web = makeWeb([{ name: 'Other', path: ['dist/nothing-*.js'], limit: '1 kB' }], [
      'a.js',
      'b.css',
      'assets/maps/town-1.nmap',
      'atlas/atlas.webp',
      'atlas/atlas.png',
      'atlas/atlas.json',
      'index.html',
      '_headers',
    ]);
    expect(uncoveredChunks(web)).toEqual([
      'dist/a.js',
      'dist/assets/maps/town-1.nmap',
      'dist/atlas/atlas.webp',
      'dist/b.css',
    ]);
  });

  it('reads a single path or several, from any entry', () => {
    const web = makeWeb(
      [
        { name: 'One', path: 'dist/a.js', limit: '1 kB' },
        { name: 'Two', path: ['dist/b.css', 'dist/assets/maps/town-*.nmap'], limit: '1 kB' },
      ],
      ['a.js', 'b.css', 'assets/maps/town-1.nmap'],
    );
    expect(uncoveredChunks(web)).toEqual([]);
  });

  it('matches a glob by whole path segments', () => {
    const web = makeWeb([{ name: 'Initial JS', path: ['dist/assets/index-*.js'], limit: '1 kB' }], [
      'assets/index-a1.js',
      'assets/sub/index-b2.js',
    ]);
    expect(uncoveredChunks(web)).toEqual(['dist/assets/sub/index-b2.js']);
  });

  it('refuses a build that holds no chunk, which would pass for nothing', () => {
    const web = makeWeb([{ name: 'Initial JS', path: ['dist/assets/index-*.js'], limit: '1 kB' }], ['index.html']);
    expect(() => uncoveredChunks(web)).toThrow(/no built chunk/);
  });

  it.skipIf(!BUILT)('covers the real build', () => {
    expect(uncoveredChunks(WEB)).toEqual([]);
  });
});

describe('the chunks command', () => {
  it.skipIf(!BUILT)('reports 0 ungated chunks on the real build, from any folder', () => {
    const out = execFileSync(process.execPath, [CLI], { cwd: tmpdir(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toBe('0 ungated chunks\n');
  });
});
