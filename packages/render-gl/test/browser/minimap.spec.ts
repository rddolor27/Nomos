import { expect, test } from 'playwright/test';

let errors: string[] = [];

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

test('draws each tile in its zone colour', async ({ page }) => {
  const { backend, wrong } = await page.evaluate(async () => {
    const harness = window.harness;
    const backend = await harness.boot({ css: [1536, 896] });
    const map = harness.map;
    if (!map) throw new Error('boot set no map');
    // At zoom 2 the frame holds 48 x 28 tiles, so the view steps across the town a frame at a time.
    const [across, down] = [48, 28];
    const wrong: string[] = [];
    const checkFrame = (left: number, top: number): void => {
      harness.view({ x: left * 16, y: top * 16, zoom: 2 });
      harness.draw();
      for (let ty = top; ty < Math.min(top + down, map.height); ty++) {
        for (let tx = left; tx < Math.min(left + across, map.width); tx++) {
          const want = `#${map.kinds[map.terrain[ty * map.width + tx]].rgb.toString(16).padStart(6, '0')}`;
          const got = harness.pixel(((tx - left) * 16 + 8) * 2, ((ty - top) * 16 + 8) * 2);
          if (got !== want) wrong.push(`tile ${tx},${ty} is ${got}, not ${want}`);
        }
      }
    };
    for (let top = 0; top < map.height; top += down) {
      for (let left = 0; left < map.width; left += across) checkFrame(left, top);
    }
    return { backend, wrong };
  });
  test.info().annotations.push({ type: 'backend', description: backend });
  expect(wrong).toEqual([]);
});

test('fills outside the map with the background', async ({ page }) => {
  const colour = await page.evaluate(async () => {
    const harness = window.harness;
    await harness.boot();
    harness.view({ x: -64, y: -64, zoom: 1 });
    harness.draw();
    return harness.pixel(10, 10);
  });
  expect(colour).toBe('#464c5e');
});

test('sizes the frame from resize', async ({ page }) => {
  const stats = await page.evaluate(async () => {
    const harness = window.harness;
    await harness.boot();
    harness.renderer?.resize(640, 360, 2);
    return harness.draw();
  });
  expect([stats.width, stats.height]).toEqual([640, 360]);
});
