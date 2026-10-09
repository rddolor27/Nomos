import { defineConfig } from 'playwright/test';
import { WEB } from './apps/web/test/browser/web.ts';

// IPv4, as the harness listens there: Firefox sometimes fails to reach a ::1-only server through localhost.
const HARNESS = 'http://127.0.0.1:5174';

// CI runners have no GPU, so WebGL2 runs on SwiftShader, which recent Chromium enables only on request.
const CHROMIUM = {
  browserName: 'chromium' as const,
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
};
const FRAME_BUDGET = '**/test/browser/perf.spec.ts';

export default defineConfig({
  testDir: '.',
  testMatch: '**/test/browser/**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: HARNESS },
  projects: [
    { name: 'chromium', testIgnore: FRAME_BUDGET, use: CHROMIUM },
    { name: 'firefox', testIgnore: FRAME_BUDGET, use: { browserName: 'firefox' } },
    { name: 'webkit', testIgnore: FRAME_BUDGET, use: { browserName: 'webkit' } },
    // Timed after every other project, and one file at a time, so no other browser contends for the CPU while it measures.
    { name: 'perf', testMatch: FRAME_BUDGET, dependencies: ['chromium', 'firefox', 'webkit'], workers: 1, use: CHROMIUM },
  ],
  webServer: [
    {
      command: 'pnpm --filter @nomos/render-gl harness',
      url: HARNESS,
      reuseExistingServer: !process.env.CI,
    },
    {
      // The app's specs set baseURL to WEB. Reused outside CI as the harness is, so concurrent runs share one preview;
      // a preview started by hand serves whatever it last built. The map's atlas page goes in after the build, which
      // empties dist/, so the map's frame timing draws its tiles.
      command:
        'pnpm --filter @nomos/web build && python tools/atlas/build_atlas.py --out apps/web/dist/atlas && pnpm --filter @nomos/web preview',
      url: WEB,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
