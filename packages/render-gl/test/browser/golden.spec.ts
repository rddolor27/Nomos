import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { TILE_PX } from '@nomos/sim-protocol';
import type { Page } from 'playwright/test';
import { snapCamera } from '../../src/camera.ts';
import type { Camera } from '../../src/types.ts';
import { DPRS, expect, test } from './scale.ts';

const GOLDEN = new URL('../golden/skin-a.json', import.meta.url);
const UPDATE = process.env.UPDATE_GOLDEN === '1';
const ZOOMS = [1, 2, 3, 4];
const AGENTS = 10_000;
const CSS = [320, 180];
// CANVAS2D_AGENT_CAP. The z1-d2 view holds about 6,000 agents, so there Canvas2D must draw exactly the cap instead.
const CANVAS2D_CAP = 5_000;
const CAPPED_VIEW = 'z1-d2';
// A histogram of palette colours tolerates a stray pixel but catches a wrong shape, colour or snap (R3).
const SLACK_PIXELS = 8;
const SLACK_SHARE = 0.005;

type Counts = Record<string, number>;

interface FrameStats {
  backend: string;
  width: number;
  height: number;
  counts: Counts;
}

interface Frame {
  zoom: number;
  choice: 'auto' | 'canvas2d';
  stats: FrameStats;
  drawn: number;
}

function keyOf(zoom: number, dpr: number): string {
  return `z${zoom}-d${dpr}`;
}

function readGoldens(): Record<string, FrameStats> {
  return existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, 'utf8')) : {};
}

// Each ratio's test merges its own cases in, so the three can write the file in turn.
function writeGoldens(cases: Record<string, FrameStats>): void {
  mkdirSync(new URL('.', GOLDEN), { recursive: true });
  writeFileSync(GOLDEN, `${JSON.stringify({ ...readGoldens(), ...cases }, null, 2)}\n`);
}

function withSortedCounts(stats: FrameStats): FrameStats {
  const counts = Object.fromEntries(Object.entries(stats.counts).sort(([a], [b]) => a.localeCompare(b)));
  return { ...stats, counts };
}

// The camera on the map's centre, snapped to whole device pixels.
function centred(
  mapWidth: number,
  mapHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  zoom: number,
): Camera {
  const x = (mapWidth * TILE_PX - deviceWidth / zoom) / 2;
  const y = (mapHeight * TILE_PX - deviceHeight / zoom) / 2;
  return snapCamera({ x, y, zoom });
}

// Replay frame 0 of 10,000 agents at every zoom, drawn by the engine's own backend and by Canvas2D.
async function drawFrames(page: Page, width: number, height: number): Promise<Frame[]> {
  const [mapWidth, mapHeight] = await page.evaluate(async () => {
    await window.harness.boot();
    const map = window.harness.map;
    return [map?.width ?? 0, map?.height ?? 0];
  });
  const cameras = ZOOMS.map((zoom) => centred(mapWidth, mapHeight, width, height, zoom));
  return page.evaluate(
    async ({ cameras, agents }) => {
      const harness = window.harness;
      const frames = [];
      for (const camera of cameras) {
        for (const choice of ['auto', 'canvas2d'] as const) {
          await harness.boot({ agents, backend: choice });
          harness.push(0);
          harness.view(camera);
          const stats = harness.draw();
          frames.push({ zoom: camera.zoom, choice, stats, drawn: harness.renderer?.drawnAgents ?? 0 });
        }
      }
      return frames;
    },
    { cameras, agents: AGENTS },
  );
}

// Colours on one side only, and counts more than max(8, 0.5%) off the golden's.
function mismatches(counts: Counts, golden: Counts): string[] {
  const out: string[] = [];
  for (const colour of new Set([...Object.keys(golden), ...Object.keys(counts)])) {
    const want = golden[colour];
    const got = counts[colour];
    const missing = want === undefined || got === undefined;
    if (missing || Math.abs(got - want) > Math.max(SLACK_PIXELS, want * SLACK_SHARE)) {
      out.push(`${colour}: ${got ?? 'none'}, golden ${want ?? 'none'}`);
    }
  }
  return out;
}

function checkFrame(frame: Frame, key: string, golden: FrameStats | undefined): void {
  const label = `${key} on ${frame.stats.backend}`;
  if (frame.stats.backend === 'canvas2d' && key === CAPPED_VIEW) {
    expect(frame.drawn, label).toBe(CANVAS2D_CAP);
    return;
  }
  if (!golden) throw new Error(`no golden for ${key}: run pnpm --filter @nomos/render-gl golden`);
  expect(mismatches(frame.stats.counts, golden.counts), label).toEqual([]);
}

for (const dpr of DPRS) {
  test(`matches the golden frames at DPR ${dpr}`, async ({ openAtScale, browserName }) => {
    test.skip(UPDATE && browserName !== 'chromium', "the goldens come from Chromium's WebGL2");
    const page = await openAtScale(dpr);
    const [width, height] = [CSS[0] * dpr, CSS[1] * dpr];
    const frames = await drawFrames(page, width, height);
    const own = frames.filter((frame) => frame.choice === 'auto');
    test.info().annotations.push({ type: 'backend', description: own[0].stats.backend });
    if (browserName === 'chromium') expect(own.map((frame) => frame.stats.backend)).toEqual(ZOOMS.map(() => 'webgl2'));
    if (UPDATE) {
      writeGoldens(Object.fromEntries(own.map((frame) => [keyOf(frame.zoom, dpr), withSortedCounts(frame.stats)])));
    }
    const goldens = readGoldens();
    for (const frame of frames) {
      const key = keyOf(frame.zoom, dpr);
      expect([frame.stats.width, frame.stats.height], key).toEqual([width, height]);
      checkFrame(frame, key, goldens[key]);
    }
  });
}
