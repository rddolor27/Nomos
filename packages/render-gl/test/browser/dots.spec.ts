import { jobId } from '@nomos/sim-protocol';
import { expect, test, type Page } from 'playwright/test';

const MERCHANT_JOB = jobId('merchant');
const POLICE_JOB = jobId('police');
const CITIZEN = '#f7c948';
const ROW = 100;

interface Push {
  x: number;
  y?: number;
  agents?: number;
}

interface Track {
  backend: string;
  centres: number[][];
}

// After the pushes, the centre of agent 0's fill at each alpha, drawn by the engine's own backend, then by Canvas2D.
// Agent 0 is the only citizen in view: any others stand far off the canvas.
function track(page: Page, pushes: Push[], alphas: number[]): Promise<Track[]> {
  return page.evaluate(
    async ({ pushes, alphas, row, citizen }) => {
      const harness = window.harness;
      const centreAt = (alpha: number): number[] => {
        const { width } = harness.draw(alpha);
        const rgba = harness.rgba();
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i < rgba.length; i += 4) {
          if (rgba[i] !== citizen[0] || rgba[i + 1] !== citizen[1] || rgba[i + 2] !== citizen[2]) continue;
          xs.push((i / 4) % width);
          ys.push(Math.floor(i / 4 / width));
        }
        return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      };
      const far = { x: 1_000_000, y: 1_000_000, job: 0 };
      const tracks = [];
      for (const choice of ['auto', 'canvas2d'] as const) {
        const backend = await harness.boot({ backend: choice });
        harness.view({ x: 0, y: 0, zoom: 1 });
        for (const { x, y = row, agents = 1 } of pushes) {
          harness.place([{ x, y, job: 0 }, ...Array.from({ length: agents - 1 }, () => far)]);
        }
        tracks.push({ backend, centres: alphas.map(centreAt) });
      }
      return tracks;
    },
    { pushes, alphas, row: ROW, citizen: [0xf7, 0xc9, 0x48] },
  );
}

function expectCentres(tracks: Track[], centres: number[][]): void {
  expect(tracks.map((run) => run.backend)).toContain('canvas2d');
  for (const run of tracks) expect(run.centres, run.backend).toEqual(centres);
}

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

test('interpolates between snapshots', async ({ page }) => {
  const tracks = await track(page, [{ x: 100 }, { x: 104 }], [0, 0.5, 1]);
  expectCentres(tracks, [[100, ROW], [102, ROW], [104, ROW]]);
});

test('shows a jump of over 16 px at its new spot', async ({ page }) => {
  const tracks = await track(page, [{ x: 100 }, { x: 120 }], [0, 0.5]);
  expectCentres(tracks, [[120, ROW], [120, ROW]]);
});

test('keeps the previous snapshot when the buffers grow', async ({ page }) => {
  const slide = await track(page, [{ x: 100, agents: 1_000 }, { x: 104, agents: 20_000 }], [0.5]);
  const jump = await track(page, [{ x: 100, agents: 1_000 }, { x: 120, agents: 20_000 }], [0.5]);
  expectCentres(slide, [[102, ROW]]);
  expectCentres(jump, [[120, ROW]]);
});

// Within 16 px of (0, 0), where an empty previous snapshot would slide the dot in from the corner instead.
test('draws the first snapshot where its agents stand', async ({ page }) => {
  const tracks = await track(page, [{ x: 12, y: 12 }], [0, 0.5]);
  expectCentres(tracks, [[12, 12], [12, 12]]);
});
