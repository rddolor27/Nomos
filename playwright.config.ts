import { defineConfig } from 'playwright/test';

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
  use: { baseURL: HARNESS },
  projects: [
    { name: 'chromium', testIgnore: FRAME_BUDGET, use: CHROMIUM },
    { name: 'firefox', testIgnore: FRAME_BUDGET, use: { browserName: 'firefox' } },
    { name: 'webkit', testIgnore: FRAME_BUDGET, use: { browserName: 'webkit' } },
    // Timed after every other project, so no other browser contends for the CPU while it measures.
    { name: 'perf', testMatch: FRAME_BUDGET, dependencies: ['chromium', 'firefox', 'webkit'], use: CHROMIUM },
  ],
  webServer: {
    command: 'pnpm --filter @nomos/render-gl harness',
    url: HARNESS,
    reuseExistingServer: !process.env.CI,
  },
});
