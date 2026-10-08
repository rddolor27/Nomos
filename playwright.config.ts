import { defineConfig } from 'playwright/test';

// IPv4, as the harness listens there: Firefox sometimes fails to reach a ::1-only server through localhost.
const HARNESS = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: '.',
  testMatch: '**/test/browser/**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  use: { baseURL: HARNESS },
  projects: [
    {
      name: 'chromium',
      // CI runners have no GPU, so WebGL2 runs on SwiftShader, which recent Chromium enables only on request.
      use: {
        browserName: 'chromium',
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'pnpm --filter @nomos/render-gl harness',
    url: HARNESS,
    reuseExistingServer: !process.env.CI,
  },
});
