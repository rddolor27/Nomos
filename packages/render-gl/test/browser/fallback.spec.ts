import { TILE_PX } from '@nomos/sim-protocol';
import { expect, test } from 'playwright/test';

const AGENTS = 4_000;

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

test('recovers a lost context', async ({ page }) => {
  const result = await page.evaluate(async (agents) => {
    const harness = window.harness;
    const backend = await harness.boot({ agents });
    const renderer = harness.renderer;
    if (!renderer) throw new Error('boot made no renderer');
    harness.push(0);
    const before = harness.draw().counts;
    const canvas = renderer.canvas;
    const lose = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!lose) return { backend, skipped: true };
    // Chromium and WebKit mark the context restorable only after the lost event's listeners return, so a restore
    // from the event's own microtasks is refused; wait a task.
    const lost = new Promise((resolve) => {
      canvas.addEventListener('webglcontextlost', () => setTimeout(resolve, 0), { once: true });
    });
    lose.loseContext();
    await lost;
    let threw = false;
    try {
      harness.draw();
    } catch {
      threw = true;
    }
    const restored = new Promise((resolve) => canvas.addEventListener('webglcontextrestored', resolve, { once: true }));
    lose.restoreContext();
    await restored;
    const after = harness.draw().counts;
    return { backend, skipped: false, threw, same: renderer.canvas === canvas, live: renderer.backend, before, after };
  }, AGENTS);
  test.skip(result.skipped === true, `no WebGL2 to lose: the renderer runs on ${result.backend}`);
  expect(result).toMatchObject({ threw: false, same: true, live: 'webgl2', after: result.before });
});

test('falls back when the context stays lost', async ({ page }) => {
  const result = await page.evaluate(async (agents) => {
    const harness = window.harness;
    const backend = await harness.boot({ agents, restoreTimeoutMs: 100 });
    const renderer = harness.renderer;
    if (!renderer) throw new Error('boot made no renderer');
    harness.push(0);
    const before = harness.draw().counts;
    const old = renderer.canvas;
    const lose = old.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!lose) return { backend, skipped: true };
    lose.loseContext();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const now = renderer.canvas;
    return {
      backend,
      skipped: false,
      live: renderer.backend,
      swapped: now !== old,
      sameId: now.id === old.id && now.id !== '',
      sameAria: now.getAttribute('aria-label') === old.getAttribute('aria-label'),
      oldDetached: !old.isConnected,
      before,
      after: harness.draw().counts,
    };
  }, AGENTS);
  test.skip(result.skipped === true, `no WebGL2 to lose: the renderer runs on ${result.backend}`);
  expect(result).toMatchObject({
    live: 'canvas2d', swapped: true, sameId: true, sameAria: true, oldDetached: true, after: result.before,
  });
});

test('falls back when the shaders fail to link', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const context = WebGL2RenderingContext.prototype;
    const reported = context.getProgramParameter;
    // Every program reports a failed link, as on a driver that rejects the shaders.
    context.getProgramParameter = function (this: WebGL2RenderingContext, program: WebGLProgram, name: GLenum) {
      return name === this.LINK_STATUS ? false : reported.call(this, program, name);
    };
    const harness = window.harness;
    const backend = await harness.boot({ agents: 100 });
    harness.push(0);
    const stats = harness.draw();
    const canvases = document.querySelectorAll('canvas');
    return {
      backend,
      drawnBy: stats.backend,
      canvases: canvases.length,
      id: canvases[0]?.id,
      drawnOn: canvases[0] === harness.renderer?.canvas,
      dots: (stats.counts['#f7c948'] ?? 0) > 0,
    };
  });
  expect(result).toEqual({ backend: 'canvas2d', drawnBy: 'canvas2d', canvases: 1, id: 'world', drawnOn: true, dots: true });
});

test('keeps reporting its backend after dispose', async ({ page }) => {
  const backends = await page.evaluate(async () => {
    const harness = window.harness;
    const out = [];
    for (const choice of ['auto', 'canvas2d'] as const) {
      const booted = await harness.boot({ backend: choice });
      harness.renderer?.dispose();
      out.push({ booted, disposed: harness.renderer?.backend });
    }
    return out;
  });
  for (const { booted, disposed } of backends) expect(disposed, booted).toBe(booted);
});

test('matches WebGL2 pixel for pixel', async ({ page }) => {
  const results = await page.evaluate(async (agents) => {
    const harness = window.harness;
    const frames = async (backend: 'auto' | 'canvas2d', zoom: number) => {
      await harness.boot({ agents, backend });
      harness.push(0);
      const width = 320 * devicePixelRatio;
      const height = 180 * devicePixelRatio;
      // The map's centre, snapped to whole device pixels.
      harness.view({
        x: Math.round((384 - width / (2 * zoom)) * zoom) / zoom,
        y: Math.round((224 - height / (2 * zoom)) * zoom) / zoom,
        zoom,
      });
      const stats = harness.draw();
      return { backend: stats.backend, drawn: harness.renderer?.drawnAgents ?? 0, rgba: harness.rgba() };
    };
    const out = [];
    for (let zoom = 1; zoom <= 4; zoom++) {
      const gl = await frames('auto', zoom);
      const c2d = await frames('canvas2d', zoom);
      let differ = 0;
      for (let i = 0; i < gl.rgba.length; i += 4) {
        if (gl.rgba[i] !== c2d.rgba[i] || gl.rgba[i + 1] !== c2d.rgba[i + 1] || gl.rgba[i + 2] !== c2d.rgba[i + 2]) differ++;
      }
      out.push({ zoom, backends: [gl.backend, c2d.backend], drawn: [gl.drawn, c2d.drawn], differ });
    }
    return out;
  }, AGENTS);
  test.info().annotations.push({ type: 'backends', description: results[0].backends.join(' vs ') });
  for (const result of results) {
    expect(result.backends[1]).toBe('canvas2d');
    expect(result.drawn[1]).toBeGreaterThan(0);
    expect(result, `zoom ${result.zoom}`).toMatchObject({ differ: 0 });
  }
});

test('caps Canvas2D at 5,000 agents', async ({ page }) => {
  const result = await page.evaluate(async (tilePx) => {
    const harness = window.harness;
    await harness.boot();
    const map = harness.map;
    if (!map) throw new Error('boot set no map');
    // The whole map in view, so all 10,000 agents are, whatever the town's size.
    const css: [number, number] = [map.width * tilePx, map.height * tilePx];
    const backend = await harness.boot({ css, agents: 10_000, backend: 'canvas2d' });
    harness.push(0);
    harness.view({ x: 0, y: 0, zoom: 1 });
    harness.draw();
    return { backend, drawn: harness.renderer?.drawnAgents };
  }, TILE_PX);
  expect(result).toEqual({ backend: 'canvas2d', drawn: 5_000 });
});
