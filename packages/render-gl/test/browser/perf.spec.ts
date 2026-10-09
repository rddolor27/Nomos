import { loadavg, platform } from 'node:os';
import { expect, test } from 'playwright/test';
import { fitCamera } from '../../src/camera/camera.ts';

const AGENTS = 10_000;
const CSS: [number, number] = [1280, 720];
const FRAMES = 300;
// 10 ticks a second at 60 animation frames a second.
const FRAMES_PER_TICK = 6;
const REPLAY_FRAMES = 10;
// The Performance budget's phone proxy.
const CPU_SLOWDOWN = 4;
const MEDIAN_MS = 1;
const P95_MS = 4;

let errors: string[] = [];

// SwiftShader renders each frame in about 150 ms, so the 300 frames take about 40 s.
test.describe.configure({ timeout: 180_000 });

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

function percentile(sorted: number[], share: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

test('draws 10,000 dots within the frame budget', async ({ page, browser }) => {
  const [mapWidth, mapHeight] = await page.evaluate(
    async ({ css, agents }) => {
      await window.harness.boot({ css, agents });
      const map = window.harness.map;
      return [map?.width ?? 0, map?.height ?? 0];
    },
    { css: CSS, agents: AGENTS },
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  // Main-thread time of the push, every sixth frame, plus the draw; the replay frames are filled before timing starts.
  const times = await page.evaluate(
    ({ camera, agents, frames, perTick, replays }) => {
      const harness = window.harness;
      const renderer = harness.renderer;
      if (!renderer) throw new Error('boot made no renderer');
      const buffers = Array.from({ length: replays }, (_, i) => harness.replayFrame(i));
      const spent = new Float64Array(frames);
      return new Promise<number[]>((resolve) => {
        let n = 0;
        const frame = (): void => {
          const start = performance.now();
          const tick = Math.floor(n / perTick);
          if (n % perTick === 0) renderer.pushSnapshot({ tick, count: agents, buffer: buffers[tick % replays] });
          renderer.draw(camera, (n % perTick) / perTick);
          spent[n] = performance.now() - start;
          n++;
          if (n < frames) requestAnimationFrame(frame);
          else resolve(Array.from(spent));
        };
        requestAnimationFrame(frame);
      });
    },
    {
      camera: fitCamera(mapWidth, mapHeight, CSS[0], CSS[1]),
      agents: AGENTS,
      frames: FRAMES,
      perTick: FRAMES_PER_TICK,
      replays: REPLAY_FRAMES,
    },
  );
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sorted = [...times].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const notes = [
    { type: 'push and draw', description: `median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms at ${CPU_SLOWDOWN}x CPU` },
    { type: 'browser', description: `Chromium ${browser.version()}` },
    { type: 'load average', description: `${loadavg().map((load) => load.toFixed(2)).join(' ')} (${platform()})` },
  ];
  test.info().annotations.push(...notes);
  // CI's dot reporter shows no annotations, so the numbers go to the log as well.
  console.log(notes.map(({ type, description }) => `${type}: ${description}`).join('; '));
  expect(median).toBeLessThanOrEqual(MEDIAN_MS);
  expect(p95).toBeLessThanOrEqual(P95_MS);
});
