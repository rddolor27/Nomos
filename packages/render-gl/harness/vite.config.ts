import { readFile } from 'node:fs/promises';
import { MAP_CONTENT_TYPE } from '@nomos/sim-protocol';
import { defineConfig, type Plugin } from 'vite';

const MAPS = new URL('../../../assets/maps/', import.meta.url);
const MAP_NAME = /^[a-z0-9-]+\.nmap$/;

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

// Builders edit the packages the harness imports while tests run, and HMR would reload a page mid-test. The host is
// IPv4 because Vite's default listens on ::1 alone, which Firefox sometimes fails to reach through localhost.
export default defineConfig({ plugins: [serveMaps()], server: { hmr: false, host: '127.0.0.1' } });
