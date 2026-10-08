import { expect, test as base, type Browser, type LaunchOptions, type Page, type PlaywrightWorkerOptions } from 'playwright/test';

export { expect };

export const DPRS = [1, 1.5, 2] as const;

// A context's deviceScaleFactor alone moves devicePixelRatio but leaves devicePixelContentBoxSize in CSS pixels in
// Chromium and Firefox (measured, Chromium 153 and Firefox 157 on Windows), so their browsers launch at the scale too.
// WebKit has no devicePixelContentBoxSize, so its context alone suffices.
function atScale(engine: PlaywrightWorkerOptions['browserName'], options: LaunchOptions, dpr: number): LaunchOptions {
  if (engine === 'chromium') return { ...options, args: [...(options.args ?? []), `--force-device-scale-factor=${dpr}`] };
  if (engine !== 'firefox') return options;
  return { ...options, firefoxUserPrefs: { ...options.firefoxUserPrefs, 'layout.css.devPixelsPerPx': String(dpr) } };
}

// openAtScale(dpr) opens the harness in a browser of its own at that device pixel ratio; no such page may log an error.
export const test = base.extend<{ openAtScale: (dpr: number) => Promise<Page> }>({
  openAtScale: async ({ playwright, browserName, launchOptions, baseURL }, use) => {
    const browsers: Browser[] = [];
    const errors: string[] = [];
    await use(async (dpr) => {
      const browser = await playwright[browserName].launch(atScale(browserName, launchOptions, dpr));
      browsers.push(browser);
      const page = await browser.newPage({ baseURL, deviceScaleFactor: dpr });
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto('/');
      return page;
    });
    await Promise.all(browsers.map((browser) => browser.close()));
    expect(errors).toEqual([]);
  },
});
