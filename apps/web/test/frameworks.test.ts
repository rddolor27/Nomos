import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: ROOT });
const BANNED_PACKAGE = /^(react|react-dom|pixi\.js|phaser|@pixi\/.+)$/;
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const IN_PAGE = 'apps/web/src/planted.ts';
const IN_RENDERER = 'packages/render-gl/src/planted.ts';
// Each is banned wherever the page or the renderer could import it, by subpath too.
const BANNED_IMPORTS: [code: string, filePath: string][] = [
  ["import React from 'react'", IN_PAGE],
  ["import 'pixi.js'", IN_RENDERER],
  ["import { createRoot } from 'react-dom/client'", IN_PAGE],
  ["import { jsx } from 'react/jsx-runtime'", IN_RENDERER],
  ["import { Application } from '@pixi/core'", IN_RENDERER],
  ["import Phaser from 'phaser'", IN_PAGE],
  ["export * from 'react'", IN_PAGE],
];
// The rules allow Preact and Solid for richer UI, and the page's own libraries.
const ALLOWED_IMPORTS = ["import { signal } from 'preact'", "import { render } from 'solid-js/web'", "import 'uplot'"];

type Manifest = Record<string, Record<string, string> | undefined>;

async function restrictedImports(code: string, filePath: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === 'no-restricted-imports').length;
}

// The root and every apps/*, packages/* and tools/* manifest; docs/ prototypes are not workspace packages.
function workspaceManifests(): string[] {
  const manifests = ['apps', 'packages', 'tools'].flatMap((group) =>
    readdirSync(join(ROOT, group)).map((dir) => join(ROOT, group, dir, 'package.json')),
  );
  return [join(ROOT, 'package.json'), ...manifests.filter((path) => existsSync(path))];
}

function listedFrameworks(label: string, manifest: Manifest): string[] {
  const names = DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {}));
  return names.filter((name) => BANNED_PACKAGE.test(name)).map((name) => `${label}: ${name}`);
}

// ESLint's first load on a fresh CI install can pass Vitest's 5 s default, as in packages/sim-core/test/lint.test.ts.
describe('the framework ban', { timeout: 30_000 }, () => {
  it('keeps React, PixiJS and Phaser out', async () => {
    for (const [code, filePath] of BANNED_IMPORTS) {
      expect(await restrictedImports(code, filePath), `${filePath}: ${code}`).toBe(1);
    }
    for (const code of ALLOWED_IMPORTS) {
      expect(await restrictedImports(code, IN_PAGE), code).toBe(0);
    }

    const planted: Manifest = {
      dependencies: { react: '^19.0.0', uplot: '1.6.32' },
      devDependencies: { '@pixi/core': '^7.0.0' },
    };
    expect(listedFrameworks('planted', planted)).toEqual(['planted: react', 'planted: @pixi/core']);

    const manifests = workspaceManifests();
    expect(manifests.map((path) => relative(ROOT, path))).toContain(join('apps', 'web', 'package.json'));
    const listed = manifests.flatMap((path) => {
      const manifest: Manifest = JSON.parse(readFileSync(path, 'utf8'));
      return listedFrameworks(relative(ROOT, path), manifest);
    });
    expect(listed).toEqual([]);
  });
});
