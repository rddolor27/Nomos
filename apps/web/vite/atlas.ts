import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Plugin, ResolvedConfig } from 'vite';

const SCRIPT = fileURLToPath(new URL('../../../tools/atlas/build_atlas.py', import.meta.url));
const SETUP = 'writing them needs Python 3 and Pillow (pip install -r tools/requirements.txt)';

async function buildAtlas(out: string): Promise<string> {
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  try {
    const { stdout } = await promisify(execFile)('python', [SCRIPT, '--out', out], { env });
    return stdout.trimEnd();
  } catch (error) {
    throw new Error(`no atlas pages in ${out}: ${SETUP}`, { cause: error });
  }
}

// A build empties its outDir, and vite preview then answers atlas/*.json with index.html, so the map and town views
// lose their art. Writing the pages after the bundle keeps every build whole, wherever it goes.
export function atlasPages(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'nomos-atlas',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle() {
      config.logger.info(await buildAtlas(resolve(config.root, config.build.outDir, 'atlas')));
    },
  };
}
