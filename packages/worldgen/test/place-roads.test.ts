import { readFileSync } from 'node:fs';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateWorld, placeContexts } from '../src/index.ts';
import { buildSite, siteFor } from '../src/place/build.ts';
import type { PlaceContext } from '../src/place/context.ts';
import { layRoad } from '../src/place/roads.ts';
import { frame, type Cell, type Site } from '../src/place/site.ts';

// M3.1's Part 3, Task 11: roads by role, the ring a walled town keeps for its wall, and the stone bridges wide roads
// cross rivers on. Every place is built once, and each test reads its share of the findings.
const WORLDS = 20;
const FIRST_SEED = 0x5eed0001;
const WALLED = ['capital', 'city', 'town'];
const SCENERY = new URL('../../../assets/sprites/scenery.json', import.meta.url);
const FOOTBRIDGE: { w: number; anchor: [number, number] } = JSON.parse(readFileSync(SCENERY, 'utf8')).frames.prop_footbridge;
const STEPS: readonly Cell[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
// A spoke this long, counted in road tiles from the plaza to the ring line, is lined with trees.
const AVENUE_CELLS = 12;

interface Ring {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Findings {
  settlements: number;
  walledTiers: number;
  rings: number;
  pieces: number;
  avenues: number;
  surface: string[];
  crossings: string[];
  entries: string[];
  bridges: string[];
  trees: string[];
}

const BARE: PlaceContext = {
  seed: 0x5eed,
  name: 'Bare',
  biome: 'grassland',
  temperature: 140,
  moisture: 140,
  tier: 'village',
  population: 600,
  sea: '',
  coast: '',
  river: '',
  roads: '',
  farmland: '',
  landmarks: [],
  wonder: null,
};

function strictlyInside({ x0, y0, x1, y1 }: Ring, x: number, y: number): boolean {
  return x0 < x && x < x1 && y0 < y && y < y1;
}

function surfaceProblems(label: string, site: Site, ring: Ring): string[] {
  const problems: string[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const kind = site.kind[site.at(x, y)];
      const inside = strictlyInside(ring, x, y);
      if ((kind === 'stone' || kind === 'cobble') && !inside) problems.push(`${label}: ${kind} outside the ring at ${x},${y}`);
      if (kind === 'gravel' && inside) problems.push(`${label}: gravel inside the ring at ${x},${y}`);
    }
  }
  return problems;
}

// The ring line's four lines, each tile by tile from its west or north end.
function ringLines({ x0, y0, x1, y1 }: Ring): Cell[][] {
  const lines: Cell[][] = [[], [], [], []];
  for (let x = x0; x <= x1; x++) {
    lines[0].push([x, y0]);
    lines[2].push([x, y1]);
  }
  for (let y = y0; y <= y1; y++) {
    lines[1].push([x1, y]);
    lines[3].push([x0, y]);
  }
  return lines;
}

// Each run of road tiles along a ring line, as its length.
function roadRuns(site: Site, line: readonly Cell[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const [x, y] of line) {
    if (site.road[site.at(x, y)]) {
      run++;
      continue;
    }
    if (run > 0) runs.push(run);
    run = 0;
  }
  if (run > 0) runs.push(run);
  return runs;
}

function crossingProblems(label: string, site: Site, ring: Ring): string[] {
  const problems: string[] = [];
  ringLines(ring).forEach((line, side) => {
    for (const run of roadRuns(site, line)) {
      if (run !== 2) problems.push(`${label}: ${run} road tiles cross the ring's ${'nesw'[side]} line together`);
    }
  });
  return problems;
}

// Whether a 4-neighbour walk over road tiles from (x, y) reaches a tile within 3 steps of the place's centre.
function reachesCentre(site: Site, x: number, y: number): boolean {
  const seen = new Uint8Array(site.w * site.h);
  const queue: Cell[] = [[x, y]];
  seen[site.at(x, y)] = 1;
  for (let head = 0; head < queue.length; head++) {
    const [qx, qy] = queue[head];
    if (Math.abs(qx - site.cx) + Math.abs(qy - site.cy) <= 3) return true;
    for (const [dx, dy] of STEPS) {
      const nx = qx + dx;
      const ny = qy + dy;
      if (!site.inside(nx, ny) || seen[site.at(nx, ny)] || !site.road[site.at(nx, ny)]) continue;
      seen[site.at(nx, ny)] = 1;
      queue.push([nx, ny]);
    }
  }
  return false;
}

function entryProblems(label: string, site: Site): string[] {
  return site.entries
    .filter((entry) => !reachesCentre(site, entry.x, entry.y))
    .map((entry) => `${label}: the ${entry.side} road from ${entry.x},${entry.y} never reaches the centre`);
}

// The tiles each bridge lies over: a footbridge's picture span on the row of its anchor, or a stone bridge piece's
// footprint, which its anchor stands at the bottom middle of.
function bridgedTiles(site: Site): Set<number> {
  const tiles = new Set<number>();
  for (const s of site.ground) {
    if (s.name === 'prop_footbridge') {
      const left = s.x - FOOTBRIDGE.anchor[0];
      for (let x = left; x < left + FOOTBRIDGE.w; x += TILE) tiles.add(site.at(Math.floor(x / TILE), Math.floor(s.y / TILE)));
    } else if (s.name.startsWith('bridge_')) {
      for (const tile of footprint(site, s.category, s.name, s.x, s.y)) tiles.add(tile);
    }
  }
  return tiles;
}

function footprint(site: Site, category: string, name: string, x: number, y: number): number[] {
  const f = frame(category, name);
  const left = (x - (f.footprintW * TILE) / 2) / TILE;
  const top = (y + 1) / TILE - f.footprintH;
  const tiles: number[] = [];
  for (let ty = top; ty < top + f.footprintH; ty++) {
    for (let tx = left; tx < left + f.footprintW; tx++) if (site.inside(tx, ty)) tiles.push(site.at(tx, ty));
  }
  return tiles;
}

function bridgeProblems(label: string, site: Site): string[] {
  const bridged = bridgedTiles(site);
  const problems: string[] = [];
  for (let c = 0; c < site.w * site.h; c++) {
    if (site.kind[c] === 'water' && site.road[c] && !bridged.has(c)) {
      problems.push(`${label}: road on water with no bridge at ${c % site.w},${Math.floor(c / site.w)}`);
    }
  }
  return problems;
}

function stoneBridgePieces(site: Site): number {
  return site.ground.filter((s) => s.name.startsWith('bridge_')).length;
}

// One main road out of the plaza: the road tiles of the plaza's middle column or row, from the plaza's edge to the
// ring line, and the step that takes it out.
function spoke(site: Site, ring: Ring, side: number): { cells: Cell[]; dx: number; dy: number } {
  const [px, py, pw, ph] = site.plaza ?? [0, 0, 0, 0];
  const starts: Cell[] = [
    [site.cx, py - 1],
    [px + pw, site.cy],
    [site.cx, py + ph],
    [px - 1, site.cy],
  ];
  const [dx, dy] = STEPS[side];
  const cells: Cell[] = [];
  for (let [x, y] = starts[side]; strictlyInside(ring, x, y) && site.road[site.at(x, y)]; x += dx, y += dy) cells.push([x, y]);
  return { cells, dx, dy };
}

function treesBeside(site: Site, cells: readonly Cell[], dx: number, dy: number): number {
  let trees = 0;
  for (const [x, y] of cells) {
    for (const k of [-2, 2]) {
      const tx = x + k * Math.abs(dy);
      const ty = y + k * Math.abs(dx);
      if (site.inside(tx, ty) && site.solid[site.at(tx, ty)]?.startsWith('tree_')) trees++;
    }
  }
  return trees;
}

function treeProblems(label: string, site: Site, ring: Ring, found: Findings): string[] {
  const problems: string[] = [];
  for (let side = 0; side < 4; side++) {
    const { cells, dx, dy } = spoke(site, ring, side);
    if (cells.length < AVENUE_CELLS) continue;
    found.avenues++;
    const trees = treesBeside(site, cells, dx, dy);
    if (trees < 2) problems.push(`${label}: the ${'nesw'[side]} main road of ${cells.length} cells has ${trees} trees`);
  }
  return problems;
}

function surveyWalled(label: string, site: Site, found: Findings): void {
  found.walledTiers++;
  if (!site.wall) return;
  found.rings++;
  found.surface.push(...surfaceProblems(label, site, site.wall));
  found.crossings.push(...crossingProblems(label, site, site.wall));
  found.trees.push(...treeProblems(label, site, site.wall, found));
}

function survey(): Findings {
  const found: Findings = {
    settlements: 0,
    walledTiers: 0,
    rings: 0,
    pieces: 0,
    avenues: 0,
    surface: [],
    crossings: [],
    entries: [],
    bridges: [],
    trees: [],
  };
  for (let k = 0; k < WORLDS; k++) {
    const seed = FIRST_SEED + k;
    placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
      if (ctx.wonder) return;
      const site = buildSite(ctx);
      const label = `${seed.toString(16)} place ${i} (${ctx.tier})`;
      found.settlements++;
      found.pieces += stoneBridgePieces(site);
      found.entries.push(...entryProblems(label, site));
      found.bridges.push(...bridgeProblems(label, site));
      if (WALLED.includes(ctx.tier ?? '')) surveyWalled(label, site, found);
    });
  }
  return found;
}

describe('laying a road tile', () => {
  it('keeps the highest-ranked road laid on a tile', () => {
    const site = siteFor(BARE);
    const laid = (x: number, y: number, kinds: readonly string[]): string => {
      for (const kind of kinds) layRoad(site, x, y, kind);
      return site.kind[site.at(x, y)];
    };
    expect(laid(10, 10, ['path', 'cobble', 'stone'])).toBe('stone');
    expect(laid(10, 10, ['path'])).toBe('stone');
    expect(laid(12, 10, ['stone', 'gravel', 'path'])).toBe('stone');
    expect(laid(14, 10, ['path', 'gravel'])).toBe('gravel');
    site.kind[site.at(16, 10)] = 'paving';
    site.road[site.at(16, 10)] = 1;
    expect(laid(16, 10, ['path', 'track', 'gravel', 'cobble', 'stone'])).toBe('paving');
    expect([10, 12, 14, 16].map((x) => site.road[site.at(x, 10)])).toEqual([1, 1, 1, 1]);
    expect(site.road[site.at(11, 10)]).toBe(0);
  });
});

describe(`the roads of every settlement of the first ${WORLDS} standard worlds`, { timeout: 600_000 }, () => {
  let found: Findings;
  beforeAll(() => {
    found = survey();
  }, 900_000);

  it('lays cut stone and cobbles only inside the ring line, and gravel only on or past it', () => {
    expect(found.walledTiers).toBeGreaterThan(100);
    expect(found.rings).toBe(found.walledTiers);
    expect(found.surface.slice(0, 20)).toEqual([]);
  });

  it('crosses the ring line only in pairs of road tiles', () => {
    expect(found.crossings.slice(0, 20)).toEqual([]);
  });

  it('joins every map-edge entry to the centre by road', () => {
    expect(found.settlements).toBeGreaterThan(500);
    expect(found.entries.slice(0, 20)).toEqual([]);
  });

  it('bridges every water tile under a road', () => {
    expect(found.pieces).toBeGreaterThan(0);
    expect(found.bridges.slice(0, 20)).toEqual([]);
  });

  it(`lines every spoke of ${AVENUE_CELLS} or more main-road cells with at least 2 trees`, () => {
    expect(found.avenues).toBeGreaterThan(100);
    expect(found.trees.slice(0, 20)).toEqual([]);
  });
});
