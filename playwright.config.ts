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
// Build output and scratch copies of the repo under dist/ hold specs too, which must never run.
const BUILT = '**/dist/**';

export default defineConfig({
  testDir: '.',
  testMatch: '**/test/browser/**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: HARNESS },
  projects: [
    // Chromium only (Chrome and Brave) while Nomos is a proof of concept; Firefox and WebKit return before launch
    // (owner, 10 October 2026).
    { name: 'chromium', testIgnore: [FRAME_BUDGET, BUILT], use: CHROMIUM },
    // Timed after every other project, and one file at a time, so no other browser contends for the CPU while it measures.
    { name: 'perf', testMatch: FRAME_BUDGET, testIgnore: BUILT, dependencies: ['chromium'], workers: 1, use: CHROMIUM },
  ],
  webServer: [
    {
      command: 'pnpm --filter @nomos/render-gl harness',
      url: HARNESS,
      reuseExistingServer: !process.env.CI,
    },
    {
      // The app's specs set baseURL to WEB. Reused outside CI as the harness is, so concurrent runs share one preview;
      // a preview started by hand serves whatever it last built.
      command: 'pnpm --filter @nomos/web build && pnpm --filter @nomos/web preview',
      url: WEB,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
