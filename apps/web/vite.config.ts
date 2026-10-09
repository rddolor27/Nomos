import { defineConfig } from 'vite';
import { atlasPages } from './vite/atlas.ts';
import { earlyBoot } from './vite/early-boot.ts';
import { headersFile } from './vite/headers.ts';

const MAP_FILE = /\.nmap$/;

export default defineConfig({
  plugins: [earlyBoot(), headersFile(), atlasPages()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    // The boot script fetches the map by its URL, so even a tiny map must never be inlined as a data URL.
    assetsInlineLimit: 0,
    rolldownOptions: {
      // The atlas pages take nearly all of every build by design, so the slow-plugin warning would fire on each one.
      checks: { bundlerTimings: false },
      output: {
        assetFileNames: ({ names }) =>
          names.some((name) => MAP_FILE.test(name)) ? 'assets/maps/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]',
        // Its own chunk, so size-limit can gate the renderer apart from the HUD. [\\/] matches Windows paths too. The map
        // and place scenes and the Town skin stay out, so they join their views' lazy chunks and the renderer chunk keeps
        // its bytes (M8.3, M3.1, the Town skin).
        codeSplitting: {
          groups: [{ name: 'render-gl', test: /[\\/]packages[\\/]render-gl[\\/](?!src[\\/](?:map|place|town))/ }],
        },
      },
    },
  },
});
