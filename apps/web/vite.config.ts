import { defineConfig } from 'vite';
import { earlyBoot } from './vite/early-boot.ts';
import { headersFile } from './vite/headers.ts';

const MAP_FILE = /\.nmap$/;

export default defineConfig({
  plugins: [earlyBoot(), headersFile()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    // The boot script fetches the map by its URL, so even a tiny map must never be inlined as a data URL.
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        assetFileNames: ({ names }) =>
          names.some((name) => MAP_FILE.test(name)) ? 'assets/maps/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]',
        // Its own chunk, so size-limit can gate the renderer apart from the HUD. [\\/] matches Windows paths too. The map
        // and place scenes stay out, so they join the map view's and the town view's lazy chunks and the renderer chunk
        // keeps its bytes (M8.3, M3.1).
        codeSplitting: { groups: [{ name: 'render-gl', test: /[\\/]packages[\\/]render-gl[\\/](?!src[\\/](?:map|place))/ }] },
      },
    },
  },
});
