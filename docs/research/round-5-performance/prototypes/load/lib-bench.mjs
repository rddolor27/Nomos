import { chromium } from 'playwright-core';
export const HEADLESS_SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
// Chrome DevTools presets (devtools-frontend NetworkManager.ts): Fast 4G / Slow 4G
export const NET = {
  none: null,
  fast4g: { offline: false, latency: 60 * 2.75, downloadThroughput: (9 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (1.5 * 1000 * 1000) / 8 * 0.9 },
  slow4g: { offline: false, latency: 150 * 3.75, downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (750 * 1000) / 8 * 0.9 },
};
export const FULL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export async function launch(extraArgs = [], exe = HEADLESS_SHELL) {
  return chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--lang=en-US', ...extraArgs] });
}
export const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export const r1 = (x) => Math.round(x * 10) / 10; export const r2 = (x) => Math.round(x * 100) / 100;
