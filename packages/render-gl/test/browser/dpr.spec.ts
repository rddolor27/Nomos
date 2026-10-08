import { DPRS, expect, test } from './scale.ts';

const CSS: [number, number] = [320, 180];

for (const dpr of DPRS) {
  test(`sizes the canvas in device pixels at DPR ${dpr}`, async ({ openAtScale }) => {
    const page = await openAtScale(dpr);
    const result = await page.evaluate(async (css) => {
      const harness = window.harness;
      const sizes = [];
      for (const forceFallback of [false, true]) {
        await harness.boot({ css, forceFallback });
        const canvas = harness.renderer?.canvas;
        sizes.push({ reported: harness.deviceSize, canvas: [canvas?.width, canvas?.height] });
      }
      return { native: 'devicePixelContentBoxSize' in ResizeObserverEntry.prototype, sizes };
    }, CSS);
    test.info().annotations.push({ type: 'measured by', description: result.native ? 'device-pixel-content-box' : 'rounding' });
    const device = [CSS[0] * dpr, CSS[1] * dpr];
    const want = { reported: [...device, dpr], canvas: device };
    expect(result.sizes).toEqual([want, want]);
  });
}

// resize sets the CSS size to device / dpr, so even a size rounded from 481.5 device pixels shows unscaled.
test('never rescales the canvas', async ({ openAtScale }) => {
  const dpr = 1.5;
  const page = await openAtScale(dpr);
  const gaps = await page.evaluate(async (ratio) => {
    const harness = window.harness;
    const out: number[] = [];
    for (const forceFallback of [false, true]) {
      await harness.boot({ css: [321, 181], forceFallback });
      const canvas = harness.renderer?.canvas;
      if (!canvas) throw new Error('boot made no renderer');
      const shown = canvas.getBoundingClientRect();
      out.push(shown.width * ratio - canvas.width, shown.height * ratio - canvas.height);
    }
    return out;
  }, dpr);
  const widest = Math.max(...gaps.map(Math.abs));
  test.info().annotations.push({ type: 'widest gap', description: `${widest} device px` });
  expect(widest).toBeLessThanOrEqual(0.01);
});

test('skips a zero-size canvas', async ({ openAtScale }) => {
  const page = await openAtScale(1);
  const results = await page.evaluate(async () => {
    const harness = window.harness;
    const out = [];
    for (const backend of ['auto', 'canvas2d'] as const) {
      await harness.boot({ agents: 100, backend });
      const renderer = harness.renderer;
      if (!renderer) throw new Error('boot made no renderer');
      harness.push(0);
      const before = harness.draw().counts;
      const collapsed = await harness.layout([0, 0]);
      let threw = false;
      try {
        renderer.draw({ x: 0, y: 0, zoom: 1 }, 1);
      } catch {
        threw = true;
      }
      const canvas = [renderer.canvas.width, renderer.canvas.height];
      await harness.layout([320, 180]);
      out.push({ backend: renderer.backend, collapsed, canvas, threw, before, after: harness.draw().counts });
    }
    return out;
  });
  expect(results[1].backend).toBe('canvas2d');
  for (const result of results) {
    expect(result, result.backend).toMatchObject({ collapsed: [0, 0, 1], canvas: [0, 0], threw: false, after: result.before });
  }
});
