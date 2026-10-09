import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { MAP_CONTENT_TYPE } from '@nomos/sim-protocol';
import { defineConfig, type Plugin } from 'vite';

const ROOT = new URL('../../../', import.meta.url);
const MAPS = new URL('assets/maps/', ROOT);
const MAP_NAME = /^[a-z0-9-]+\.nmap$/;
// Outside apps/web/dist, which every app build empties.
const ATLAS = new URL('dist/render-gl-harness/atlas/', ROOT);
const ATLAS_TYPES: Record<string, string> = { 'atlas.json': 'application/json', 'atlas.webp': 'image/webp' };

// Serves /maps/<name>.nmap from assets/maps with the compressible content type production will use (R5).
function serveMaps(): Plugin {
  return {
    name: 'nomos-maps',
    configureServer(server) {
      server.middlewares.use('/maps/', (req, res, next) => {
        const name = (req.url ?? '').slice(1).split('?')[0];
        if (!MAP_NAME.test(name)) return next();
        readFile(new URL(name, MAPS)).then(
          (body) => {
            res.setHeader('Content-Type', MAP_CONTENT_TYPE);
            res.end(body);
          },
          // Vite would answer a missing file with index.html and 200, which reads as a broken map, not a missing one.
          () => {
            res.statusCode = 404;
            res.end();
          },
        );
      });
    },
  };
}

function buildAtlas(): Promise<unknown> {
  const script = fileURLToPath(new URL('tools/atlas/build_atlas.py', ROOT));
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  return promisify(execFile)('python', [script, '--out', fileURLToPath(ATLAS)], { env });
}

// Serves /atlas/atlas.json and /atlas/atlas.webp, the town atlas tools/atlas builds, which the place pass draws from
// (M3.1). The build takes seconds, so it runs once a server, on the first request, and only the place specs wait for it.
function serveAtlas(): Plugin {
  let built: Promise<unknown> | null = null;
  return {
    name: 'nomos-atlas',
    configureServer(server) {
      server.middlewares.use('/atlas/', (req, res, next) => {
        const name = (req.url ?? '').slice(1).split('?')[0];
        if (!(name in ATLAS_TYPES)) return next();
        built ??= buildAtlas();
        built
          .then(() => readFile(new URL(name, ATLAS)))
          .then(
            (body) => {
              res.setHeader('Content-Type', ATLAS_TYPES[name]);
              res.end(body);
            },
            (error: unknown) => {
              res.statusCode = 500;
              res.end(String(error));
            },
          );
      });
    },
  };
}

// Builders edit the packages the harness imports while tests run, and HMR would reload a page mid-test. The host is
// IPv4 because Vite's default listens on ::1 alone, which Firefox sometimes fails to reach through localhost.
export default defineConfig({ plugins: [serveMaps(), serveAtlas()], server: { hmr: false, host: '127.0.0.1' } });
