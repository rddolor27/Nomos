import { describe, expect, it } from 'vitest';
import { at, heated, survey, type Land } from '../src/features/survey.ts';
import {
  calderaLake,
  canyonView,
  crystalCave,
  dune,
  geyser,
  giantTree,
  glacier,
  hotSprings,
  seaArch,
  stoneArch,
  waterfall,
  wonders,
  type SiteRule,
} from '../src/features/wonders.ts';
import type { FeatureWorld } from '../src/world/draft.ts';

// Choices the 200 golden worlds barely or never see: the goldens fold only each kind's best site, so a threshold or a
// weight that changes a score without changing the winner leaves every fingerprint as it was. Every expected value is
// what tools/worldgen/features.py returns for the same scene.
const SEED = 7;
// The seed whose count draw is 0, so the land alone sets how many wonders a map wants.
const COUNTED_SEED = 8;

// A glyph for each biome code: sea, lake, grassland, farmland, broadleaf forest, conifer forest, marsh, sand, hills,
// mountain, peak and snow.
const GLYPHS = '~L.fdcmshMPn';
const CLIFFS = 2;

type Xy = readonly [number, number];

interface Cell {
  elevation?: number;
  temperature?: number;
  moisture?: number;
  river?: number;
  to?: Xy;
  coast?: number;
}

// What survey would have found at the probed cell, set by hand: the slope, the steps to water, and so on.
interface Patch {
  slope?: number;
  wet?: number;
  forestDepth?: number;
  town?: number;
  water?: number;
  hotspot?: Xy;
  reach?: number;
}

const CELL_ATTRIBUTES = ['elevation', 'temperature', 'moisture', 'river', 'coast'] as const;
const PATCHED_ARRAYS = ['slope', 'wet', 'forestDepth', 'town', 'water'] as const;

// A map of the glyphs' biomes, every cell 100 high, cold, dry and riverless; cells lists what differs, keyed 'x,y'.
function scene(rows: readonly string[], cells: Record<string, Cell> = {}, seed = SEED): FeatureWorld {
  const width = rows[0].length;
  const n = width * rows.length;
  const world: FeatureWorld = {
    seed,
    width,
    height: rows.length,
    elevation: new Int32Array(n).fill(100),
    biome: Uint8Array.from(rows.join(''), (glyph) => GLYPHS.indexOf(glyph)),
    temperature: new Uint8Array(n),
    moisture: new Uint8Array(n),
    river: new Uint8Array(n),
    receiver: new Int32Array(n).fill(-1),
    coast: new Uint8Array(n),
    settlements: [],
    roads: [],
    bridges: [],
  };
  for (const [key, cell] of Object.entries(cells)) {
    const [x, y] = key.split(',').map(Number);
    const i = y * width + x;
    for (const name of CELL_ATTRIBUTES) world[name][i] = cell[name] ?? world[name][i];
    if (cell.to) world.receiver[i] = cell.to[1] * width + cell.to[0];
  }
  return world;
}

function landAt(world: FeatureWorld, [x, y]: Xy, patch: Patch): Land {
  const land = survey(world);
  const cell = y * world.width + x;
  for (const name of PATCHED_ARRAYS) land[name][cell] = patch[name] ?? land[name][cell];
  if (patch.hotspot) land.hotspot = patch.hotspot[1] * world.width + patch.hotspot[0];
  land.hotReach = patch.reach ?? land.hotReach;
  return land;
}

function score(rule: SiteRule, world: FeatureWorld, spot: Xy, patch: Patch = {}): number {
  return rule(world, landAt(world, spot, patch), spot[1] * world.width + spot[0]);
}

const GRASS_5 = ['.....', '.....', '.....', '.....', '.....'];
const MIDDLE: Xy = [2, 2];
// The hotspot is the probed cell itself, on dry, flat ground.
const HOT: Patch = { hotspot: MIDDLE, reach: 2, wet: 0, slope: 0 };

// A row of five grassland cells across the middle of a map five high, the rest as given.
function middleRow(row: string): string[] {
  return ['.....', '.....', row, '.....', '.....'];
}

// A river at (3, 2) running south between banks along its row, at x = 1, 2, 4 and 5.
function canyon(river: Cell, banks: readonly number[]): number {
  const cells: Record<string, Cell> = {
    '1,2': { elevation: banks[0] },
    '2,2': { elevation: banks[1] },
    '4,2': { elevation: banks[2] },
    '5,2': { elevation: banks[3] },
    '3,2': { ...river, river: 1, to: [3, 3] },
  };
  return score(canyonView, scene(Array.from({ length: 5 }, () => '.......'), cells), [3, 2]);
}

// All land, with five kinds of site nine cells apart and nothing else a rule would score: a peak for a glacier, a ring
// of sand for a dune, a river dropping 60 for a waterfall, hills on a slope of 60 for a cave and a damp cell deep in
// forest for a giant tree. Nothing is hot.
function sited(width: number, height: number): { world: FeatureWorld; land: Land } {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));
  grid[4][4] = 'P';
  for (let y = 3; y <= 5; y++) {
    for (let x = 12; x <= 14; x++) grid[y][x] = 's';
  }
  grid[13][4] = 'h';
  const cells: Record<string, Cell> = {
    '13,4': { temperature: 150 },
    '22,4': { elevation: 160, river: 1, to: [22, 5] },
    '13,13': { moisture: 140 },
  };
  const world = scene(grid.map((row) => row.join('')), cells, COUNTED_SEED);
  const land = survey(world);
  land.hotspot = -1;
  land.slope[13 * width + 4] = 60;
  land.forestDepth[13 * width + 13] = 2;
  return { world, land };
}

describe('the wonder site rules at their limits', () => {
  it('scores a waterfall from a drop of 60, with its bonus from the hills line up', () => {
    // A river 160 high into a cell 100 high drops 60: 2 * 60 + 20 * 3. One cell lower drops 59 and counts for nothing.
    // At 380 the bonus of 40 joins in, so a strict comparison there would lose it.
    const fall = (cell: Cell, below = 100) =>
      score(waterfall, scene(GRASS_5, { '2,2': { ...cell, to: [2, 3] }, '2,3': { elevation: below } }), MIDDLE);
    expect(fall({ elevation: 160, river: 3 })).toBe(180);
    expect(fall({ elevation: 159, river: 3 })).toBe(0);
    expect(fall({ elevation: 380, river: 2 }, 300)).toBe(240);
  });

  it('lets a river run into cell 0', () => {
    // A receiver of 0 is the first cell, not the -1 that means none; a test for falsehood would drop it.
    const world = scene(['...', '...', '...'], { '1,1': { elevation: 200, river: 1, to: [0, 0] } });
    expect(score(waterfall, world, [1, 1])).toBe(220);
  });

  it('keeps a canyon to dry cells between 150 and 650 high', () => {
    // The lower bank less the river's height is the cut: 100 on the first two lines, 150 on the rest.
    const level = (height: number) => [height, height, height, height];
    expect(canyon({ elevation: 200, moisture: 149 }, level(300))).toBe(301);
    expect(canyon({ elevation: 200, moisture: 150 }, level(300))).toBe(0);
    expect(canyon({ elevation: 150, moisture: 100 }, level(300))).toBe(500);
    expect(canyon({ elevation: 149, moisture: 100 }, level(300))).toBe(0);
    expect(canyon({ elevation: 650, moisture: 100 }, level(800))).toBe(500);
    expect(canyon({ elevation: 651, moisture: 100 }, level(800))).toBe(0);
  });

  it('scores a canyon from a cut of exactly 50, by three a step', () => {
    // The lower of the two banks is 250 against the river's 200; the higher one does not count.
    expect(canyon({ elevation: 200, moisture: 100 }, [240, 250, 260, 255])).toBe(200);
  });

  it('wants moisture of 140 under a giant tree', () => {
    const tree = (moisture: number) => {
      const world = scene(['...', '...', '...'], { '1,1': { moisture } });
      return score(giantTree, world, [1, 1], { forestDepth: 2, town: 4 });
    };
    expect(tree(139)).toBe(0);
    expect(tree(140)).toBe(120);
  });

  it('counts each open side of a sea arch, and never reads past the edge', () => {
    // Open sea three cells out to the north and east: 200 + 2 * 40.
    const sea = ['...~...', '...~...', '...~...', '....~~~', '.......', '.......', '.......'];
    expect(score(seaArch, scene(sea, { '3,3': { coast: CLIFFS, elevation: 200 } }), [3, 3])).toBe(280);
    // Beside the left edge, two cells west of (1, 3) is off the map, though index arithmetic would land on the ocean
    // at the end of the row above.
    const edge = ['.......', '.......', '.....~~', '~......', '.......', '.......', '.......'];
    expect(score(seaArch, scene(edge, { '1,3': { coast: CLIFFS, elevation: 200 } }), [1, 3])).toBe(0);
  });

  it('takes a stone arch where hills meet sand, and where sand meets a mountain', () => {
    const arch = (row: string, cell: Cell, slope: number) =>
      score(stoneArch, scene(middleRow(row), { '2,2': cell }), MIDDLE, { slope });
    expect(arch('..hs.', { temperature: 130, moisture: 120 }, 10)).toBe(50);
    expect(arch('..hs.', { temperature: 130, moisture: 121 }, 10)).toBe(0);
    expect(arch('..sM.', { temperature: 140, moisture: 100 }, 0)).toBe(70);
  });

  it('wants a dune hot, dry and ringed by six sand cells', () => {
    const hot = (cell: Cell) => score(dune, scene(['ss.', 'sss', 's.s'], { '1,1': cell }), [1, 1]);
    expect(hot({ temperature: 150, moisture: 90 })).toBe(90);
    expect(hot({ temperature: 149, moisture: 90 })).toBe(0);
    expect(hot({ temperature: 150, moisture: 91 })).toBe(0);
  });

  it('adds one to a glacier on a peak as cold as 40', () => {
    const world = scene(['...', '.P.', '...'], { '1,1': { temperature: 40, elevation: 200 } });
    expect(score(glacier, world, [1, 1])).toBe(21);
  });

  it('wants a crystal cave on a slope of 60 or more, away from rivers', () => {
    // Python's draw adds 56 to the slope at cell 4 on this seed.
    const hills = ['...', '.h.', '...'];
    expect(score(crystalCave, scene(hills), [1, 1], { slope: 60 })).toBe(116);
    expect(score(crystalCave, scene(hills), [1, 1], { slope: 59 })).toBe(0);
    expect(score(crystalCave, scene(hills, { '1,1': { river: 1 } }), [1, 1], { slope: 60 })).toBe(0);
  });

  it('puts hot springs on hills or beside them, never on a peak or in water', () => {
    // Hills with no hills about them still count, and so does a cell beside hills. Wet 1 costs 30, and a quarter of
    // the slope adds.
    expect(score(hotSprings, scene(middleRow('..h..')), MIDDLE, { ...HOT, slope: 8 })).toBe(102);
    const beside = scene(middleRow('...h.'));
    expect(score(hotSprings, beside, MIDDLE, { ...HOT, wet: 1, slope: 20 })).toBe(75);
    expect(score(hotSprings, scene(middleRow('..Ph.')), MIDDLE, HOT)).toBe(0);
    expect(score(hotSprings, beside, MIDDLE, { ...HOT, water: 1 })).toBe(0);
  });

  it('puts a geyser on flat ground of slope 40 or less, never on high ground or in water', () => {
    const flat = scene(GRASS_5);
    expect(score(geyser, flat, MIDDLE, { ...HOT, slope: 40 })).toBe(60);
    expect(score(geyser, flat, MIDDLE, { ...HOT, slope: 41 })).toBe(0);
    expect(score(geyser, flat, MIDDLE, { ...HOT, water: 1 })).toBe(0);
    expect(score(geyser, scene(middleRow('..P..')), MIDDLE, HOT)).toBe(0);
    expect(score(geyser, scene(middleRow('..M..')), MIDDLE, HOT)).toBe(0);
  });

  it('gives a caldera lake a quarter of its height and nothing more', () => {
    const hills = scene(middleRow('..h..'), { '2,2': { elevation: 401 } });
    expect(score(calderaLake, hills, MIDDLE, HOT)).toBe(100);
  });
});

describe('how many wonders a map gets', () => {
  it('wants 2 + one for each 900 land cells, and at least 4', () => {
    // Five kinds have a site on each map. On 900 cells that is 2 + 1 + 0 = 3, which the floor lifts to 4, so one site
    // goes unused. On 2700 cells it is 2 + 3 + 0 = 5, and all five are placed.
    const placed = (width: number, height: number) => {
      const { world, land } = sited(width, height);
      return wonders(world, land).map((spot) => [spot.kind, spot.x, spot.y]);
    };
    expect(placed(30, 30)).toEqual([
      [0, 22, 4],
      [1, 13, 13],
      [10, 13, 4],
      [6, 4, 13],
    ]);
    expect(placed(54, 50)).toEqual([
      [0, 22, 4],
      [1, 13, 13],
      [10, 13, 4],
      [6, 4, 13],
      [9, 4, 4],
    ]);
  });
});

describe('the survey helpers at their limits', () => {
  it('counts a hotspot at cell 0 and a cell exactly the reach away, and no cell beyond it', () => {
    // -1 means no hotspot, so cell 0 is a hotspot like any other.
    const world = scene(['...', '...', '...']);
    const patch = { hotspot: [0, 0], reach: 2 } as const;
    const near = (spot: Xy) => heated(world, landAt(world, spot, patch), spot[1] * 3 + spot[0]);
    expect(near([1, 0])).toBe(true);
    expect(near([2, 0])).toBe(true);
    expect(near([2, 1])).toBe(false);
  });

  it('maps a cell to its index, and anything off the map to -1', () => {
    const world = scene(Array.from({ length: 5 }, () => '......'));
    expect([at(world, 0, 0), at(world, 3, 2), at(world, 5, 4)]).toEqual([0, 15, 29]);
    expect([at(world, -1, 0), at(world, 6, 0), at(world, 0, -1), at(world, 0, 5)]).toEqual([-1, -1, -1, -1]);
  });
});
