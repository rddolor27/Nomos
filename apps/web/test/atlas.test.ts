import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterEach, expect, test, vi } from 'vitest';
import { atlasPages } from '../vite/atlas.ts';

const PAGES = ['atlas.json', 'atlas.png', 'atlas.webp', 'map.json', 'map.png', 'map.webp'];

let root = '';

// A page with no script, so the build is little more than its atlas step, into the default outDir, dist.
function buildPage(): Promise<unknown> {
  root = mkdtempSync(join(tmpdir(), 'nomos-atlas-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>atlas</title>');
  return build({ root, configFile: false, logLevel: 'silent', plugins: [atlasPages()] });
}

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

// The atlas script takes about 8 s, nearly all of it the lossless WebP encode.
test('writes both atlas pages into the outDir the build has just emptied', { timeout: 60_000 }, async () => {
  await buildPage();

  expect(readdirSync(join(root, 'dist', 'atlas')).sort()).toEqual(PAGES);
});

test('fails the build when Python cannot be found', async () => {
  vi.stubEnv('PATH', '');

  await expect(buildPage()).rejects.toThrow(/Python 3 and Pillow/);
});
