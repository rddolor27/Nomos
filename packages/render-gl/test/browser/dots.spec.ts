import { JOB_ITEMS } from '@nomos/sim-protocol';
import { expect, test } from 'playwright/test';

const MERCHANT_JOB = JOB_ITEMS.indexOf('merchant') + 1;
const POLICE_JOB = JOB_ITEMS.indexOf('police') + 1;
const CITIZEN = '#f7c948';

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

test('codes roles by shape and colour', async ({ page }) => {
  const seen = await page.evaluate(
    async ({ jobs, offsets }) => {
      const harness = window.harness;
      await harness.boot({ css: [768, 448] });
      const map = harness.map;
      if (!map) throw new Error('boot set no map');
      const grass = map.kinds.findIndex((kind) => kind.name === 'grass');
      const ringed = (tx: number, ty: number): boolean => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) if (map.terrain[(ty + dy) * map.width + tx + dx] !== grass) return false;
        }
        return true;
      };
      const tiles: [number, number][] = [];
      for (let ty = 1; ty < map.height - 1 && tiles.length < jobs.length; ty++) {
        for (let tx = 1; tx < map.width - 1 && tiles.length < jobs.length; tx += 2) {
          if (ringed(tx, ty)) tiles.push([tx, ty]);
        }
      }
      harness.place(tiles.map(([tx, ty], i) => ({ x: tx * 16 + 8, y: ty * 16 + 8, job: jobs[i] })));
      harness.view({ x: 0, y: 0, zoom: 1 });
      harness.draw();
      return tiles.map(([tx, ty]) => offsets.map(([dx, dy]) => harness.pixel(tx * 16 + 8 + dx, ty * 16 + 8 + dy)));
    },
    { jobs: [0, MERCHANT_JOB, POLICE_JOB], offsets: [[0, 0], [2, 1], [2, 2], [3, 3]] },
  );
  // Rows: citizen, merchant, police. Columns: offsets (0, 0), (2, 1), (2, 2) and (3, 3) from the dot's centre.
  const [F1, F2, F3, E, G] = [CITIZEN, '#2a9d8f', '#283a7c', '#020202', '#4caa3c'];
  expect(seen).toEqual([
    [F1, F1, E, G],
    [F2, F2, F2, E],
    [F3, E, E, G],
  ]);
});

test('rims dots on dark ground', async ({ page }) => {
  const [centre, edge] = await page.evaluate(async () => {
    const harness = window.harness;
    await harness.boot();
    harness.view({ x: -64, y: -64, zoom: 1 });
    harness.place([{ x: -30, y: -30, job: 0 }]);
    harness.draw();
    return [harness.pixel(34, 34), harness.pixel(36, 36)];
  });
  expect(centre).toBe(CITIZEN);
  expect(edge).toBe('#f6f0de');
});

test('returns each buffer as it is pushed', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const harness = window.harness;
    await harness.boot({ agents: 100 });
    const pushed: ArrayBuffer[] = [];
    for (let frame = 0; frame < 10; frame++) pushed.push(harness.push(frame));
    const released = harness.released;
    return {
      count: released.length,
      same: released.every((buffer, i) => buffer === pushed[i]),
      attached: released.every((buffer) => buffer.byteLength === 100 * 12),
    };
  });
  expect(result).toEqual({ count: 10, same: true, attached: true });
});

test('draws the map alone for 0 agents and grows for 20,000', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const harness = window.harness;
    const backend = await harness.boot({ agents: 20_000 });
    const renderer = harness.renderer;
    if (!renderer) throw new Error('boot made no renderer');
    const mapAlone = harness.draw().counts;
    harness.push(0, { agents: 0 });
    const none = { counts: harness.draw().counts, drawn: renderer.drawnAgents };
    harness.push(1);
    const all = { counts: harness.draw().counts, drawn: renderer.drawnAgents };
    return { backend, mapAlone, none, all };
  });
  expect(result.none).toEqual({ counts: result.mapAlone, drawn: 0 });
  expect(result.all.counts[CITIZEN]).toBeGreaterThan(0);
  // Canvas2D will draw only the agents in view, at most 5,000 (task 7).
  if (result.backend === 'webgl2') expect(result.all.drawn).toBe(20_000);
  else expect(result.all.drawn).toBeLessThanOrEqual(5_000);
});

test('ignores agents off the canvas', async ({ page }) => {
  const [mapAlone, after] = await page.evaluate(
    async ({ jobs }) => {
      const harness = window.harness;
      await harness.boot();
      const mapAlone = harness.draw().counts;
      const far = 1_000_000;
      harness.place([
        { x: far, y: far, job: jobs[0] },
        { x: -far, y: -far, job: jobs[1] },
        { x: far, y: -far, job: jobs[2] },
        { x: -far, y: far, job: jobs[0] },
      ]);
      return [mapAlone, harness.draw().counts];
    },
    { jobs: [0, MERCHANT_JOB, POLICE_JOB] },
  );
  expect(after).toEqual(mapAlone);
});

test('draws no true-only cue', async ({ page }) => {
  const [plain, marked] = await page.evaluate(async () => {
    const harness = window.harness;
    await harness.boot({ agents: 10_000 });
    harness.push(0);
    const plain = harness.draw().counts;
    harness.push(0, { trueOnly: true });
    return [plain, harness.draw().counts];
  });
  expect(plain[CITIZEN]).toBeGreaterThan(0);
  expect(marked).toEqual(plain);
});
