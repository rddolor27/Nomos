import { readFileSync } from 'node:fs';
import {
  CELL_DX,
  CELL_DY,
  NO_HUB,
  NO_PATH,
  RUN_BYTES,
  SITE_PLAZA,
  TOO_FAR,
  buildFields,
  cellStepOf,
  createHomes,
  createShops,
  createTown,
  nearestHub,
  planLeg,
  sitesOf,
  tileOf,
  type Ground,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, leisureOf, parseMap, premisesOf, type MapV1 } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;

interface Walked {
  end: number;
  cost: number;
  legal: boolean;
}

function isOpen(ground: Ground, x: number, y: number): boolean {
  return x >= 0 && x < ground.width && y >= 0 && y < ground.height && ground.walk[y * ground.width + x] !== 0;
}

// Whether step k from the cell is onto an open cell and, on a diagonal, between two.
function canStep(ground: Ground, cell: number, k: number): boolean {
  const x = cell % ground.width;
  const y = (cell - x) / ground.width;
  if (!isOpen(ground, x + CELL_DX[k], y + CELL_DY[k])) return false;
  return CELL_DX[k] === 0 || CELL_DY[k] === 0 || (isOpen(ground, x + CELL_DX[k], y) && isOpen(ground, x, y + CELL_DY[k]));
}

function countRuns(runs: Uint8Array): number {
  let count = 0;
  while (count < RUN_BYTES / 2 && runs[2 * count + 1] !== 0) count++;
  return count;
}

// Walks the runs cell by cell from `from`, forward or backward, as the field's metric counts them: a diagonal costs 2.
function walkRuns(ground: Ground, runs: Uint8Array, from: number, backward = false): Walked {
  const walked: Walked = { end: from, cost: 0, legal: true };
  const count = countRuns(runs);
  for (let i = 0; i < count; i++) {
    const r = backward ? count - 1 - i : i;
    const k = backward ? ((runs[2 * r] >> 5) + 4) & 7 : runs[2 * r] >> 5;
    for (let n = 0; n < runs[2 * r + 1]; n++) {
      if (!canStep(ground, walked.end, k)) walked.legal = false;
      walked.end += cellStepOf(k, ground.width);
      walked.cost += CELL_DX[k] !== 0 && CELL_DY[k] !== 0 ? 2 : 1;
    }
  }
  return walked;
}

function manhattan(width: number, a: number, b: number): number {
  const ax = a % width;
  const bx = b % width;
  return Math.abs(ax - bx) + Math.abs((a - ax) / width - (b - bx) / width);
}

function percentile(values: number[], share: number): number {
  const ordered = Float64Array.from(values).sort();
  return ordered[Math.floor(ordered.length * share)];
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// A town's world, built as the worker will build it: the premises, then the leisure sites, whose fields hold the legs.
function highcourt(): { town: MapV1; world: World; homes: number[]; sites: number } {
  const town = parseMap(new Uint8Array(readFileSync(townFile)).buffer);
  const entities = town.entities.filter((entity) => entity.kind === ENTITY_HOME);
  const world = createTown(SEED, 'phone', town, createHomes(entities), createShops([...premisesOf(town), ...leisureOf(town)]));
  world.checks = false;
  const homes = entities.map((entity) => entity.doorY * town.width + entity.doorX);
  return { town, world, homes, sites: sitesOf(world.errands) };
}

function legBetween(world: World, sites: number, from: number, to: number, runs: Uint8Array, via = NO_HUB): number {
  const { ground, errands, fields } = world;
  return planLeg(fields, ground.width, ground.height, errands.siteX, errands.siteY, sites, from, to, via, runs, 0);
}

// Twelve partners for each home from a fixed scatter of them, 4,632 pairs in all.
function pairsOf(homes: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < homes.length; i++) {
    for (let j = 0; j < 12; j++) {
      const b = homes[(i * 31 + j * 53 + 7) % homes.length];
      if (b !== homes[i]) pairs.push([homes[i], b]);
    }
  }
  return pairs;
}

// The walk of a leg between two homes forced through the door of the hub that suits them, so out to it and back.
function throughHub(world: World, sites: number, a: number, b: number, runs: Uint8Array): Walked {
  const { ground, errands } = world;
  const [ax, bx] = [a % ground.width, b % ground.width];
  const hub = nearestHub(errands.siteX, errands.siteY, sites, ax, (a - ax) / ground.width, bx, (b - bx) / ground.width, 0);
  legBetween(world, sites, a, b, runs, hub);
  return walkRuns(ground, runs, a);
}

describe("Highcourt's legs", () => {
  it('lead from every home to the plaza and back, and each blob knows its home tile', () => {
    const { world, homes, sites } = highcourt();
    const { ground, errands, agents } = world;
    const plaza = errands.siteY[22] * ground.width + errands.siteX[22];
    const runs = new Uint8Array(RUN_BYTES);
    const problems: string[] = [];
    const detours: number[] = [];

    for (const home of homes) {
      const there = legBetween(world, sites, home, plaza, runs);
      const out = walkRuns(ground, runs, home);
      const back = legBetween(world, sites, plaza, home, runs);
      const returned = walkRuns(ground, runs, plaza);
      const sound = there >= 0 && out.legal && out.end === plaza && back >= 0 && returned.legal && returned.end === home;
      if (!sound) problems.push(`home ${home}: ${there} runs there, ${back} back`);
      else detours.push(out.cost / manhattan(ground.width, home, plaza));
    }

    console.info(
      `Highcourt, ${sites} sites: a home to the plaza is ${mean(detours).toFixed(3)} times its Manhattan length on average and ` +
        `${percentile(detours, 0.9).toFixed(3)} at the 90th percentile (${detours.length} homes)`,
    );
    expect(problems).toEqual([]);
    expect([sites, errands.siteKind[22]]).toEqual([29, SITE_PLAZA]);
    expect(mean(detours)).toBeLessThan(1.1);
    // Each blob starts in its home door's tile.
    const tiles = Array.from({ length: agents.count[0] }, (_, p) => tileOf(agents.y[p]) * ground.width + tileOf(agents.x[p]));
    expect(Array.from(errands.homeCell.subarray(0, agents.count[0]))).toEqual(tiles);
    expect(tiles.every((tile) => homes.includes(tile))).toBe(true);
  });

  it("meet between two homes, each ending at the other's door, and print the detours over their Manhattan length", () => {
    const { world, homes, sites } = highcourt();
    const runs = new Uint8Array(RUN_BYTES);
    const pairs = pairsOf(homes);
    const problems: string[] = [];
    const detours: number[] = [];

    for (const [a, b] of pairs) {
      const count = legBetween(world, sites, a, b, runs);
      const walked = walkRuns(world.ground, runs, a);
      const distance = manhattan(world.ground.width, a, b);
      if (count < 0 || !walked.legal || walked.end !== b || walked.cost < distance) problems.push(`homes ${a} to ${b}: ${count} runs`);
      else detours.push(walked.cost / distance);
    }

    console.info(
      `Highcourt, ${pairs.length} legs between homes: ${mean(detours).toFixed(3)} times the Manhattan length on average, ` +
        `${percentile(detours, 0.9).toFixed(3)} at the 90th percentile, ${Math.max(...detours).toFixed(1)} at most`,
    );
    expect(problems).toEqual([]);
    expect(mean(detours)).toBeLessThan(1.4);
  });

  it('switch to the second way where the two meet, which is never longer than passing the hub and often shorter', () => {
    const { world, homes, sites } = highcourt();
    const runs = new Uint8Array(RUN_BYTES);
    const problems: string[] = [];
    let shorter = 0;
    let longer = 0;

    pairsOf(homes).forEach(([a, b], n) => {
      if (n % 12 !== 0) return;
      const meeting = walkRuns(world.ground, (legBetween(world, sites, a, b, runs), runs), a);
      const through = throughHub(world, sites, a, b, runs);
      if (through.end !== b || !through.legal) problems.push(`homes ${a} to ${b} through the hub: ends at ${through.end}`);
      shorter += meeting.cost < through.cost ? 1 : 0;
      longer += meeting.cost > through.cost ? 1 : 0;
    });

    expect(problems).toEqual([]);
    expect(longer).toBe(0);
    expect(shorter).toBeGreaterThan(0);
  });
});

// '#' is a wall and any other character is open ground.
function groundOf(rows: string[]): Ground {
  const width = rows[0].length;
  const walk = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) walk[y * width + x] = row[x] === '#' ? 0 : 1;
  });
  return { width, height: rows.length, walk };
}

// Fields for the sites at the given tiles, and the leg between two cells of the ground.
function planOn(ground: Ground, sites: [number, number][], from: number, to: number, via = NO_HUB): { count: number; runs: Uint8Array } {
  const cells = ground.width * ground.height;
  const fields = new Uint8Array(sites.length * cells);
  buildFields(ground, Int32Array.from(sites, ([x, y]) => y * ground.width + x), fields);
  const runs = new Uint8Array(RUN_BYTES).fill(0xaa);
  const count = planLeg(fields, ground.width, ground.height, Int32Array.from(sites, ([x]) => x), Int32Array.from(sites, ([, y]) => y), sites.length, from, to, via, runs, 0);
  return { count, runs };
}

describe('a leg', () => {
  it('gives a home walled in no way, and a walk of the open ground its runs, with a leg of over 32 runs refused', () => {
    // A pocket at (1, 1) and (2, 1) shut in by walls, on open ground with a site at (8, 4) and another at (2, 7).
    const ground = groundOf(['##########', '#..#......', '####......', '..........', '..........', '..........', '..........', '..........']);
    const sites: [number, number][] = [[8, 4], [2, 7]];
    const pocket = 1 * 10 + 1;
    const open = 6 * 10 + 5;
    const none = new Array<number>(RUN_BYTES).fill(0);

    expect(planOn(ground, sites, pocket, open)).toEqual({ count: NO_PATH, runs: Uint8Array.from(none) });
    expect(planOn(ground, sites, open, pocket)).toEqual({ count: NO_PATH, runs: Uint8Array.from(none) });
    expect(planOn(ground, sites, pocket, open, 0)).toEqual({ count: NO_PATH, runs: Uint8Array.from(none) });
    // To a site, the leg is the site's own way: from (5, 6) two cells up and to the right, and one more right, to the door at (8, 4).
    const toSite = planOn(ground, sites, open, 4 * 10 + 8);
    expect([toSite.count, Array.from(toSite.runs.subarray(0, 6))]).toEqual([2, [160, 2, 192, 1, 0, 0]]);
    // To the cell above, the ways of (5, 6) and (5, 5) to that door meet at (6, 5): one step up and to the right, and one left.
    const beside = planOn(ground, sites, open, 5 * 10 + 5);
    expect([beside.count, Array.from(beside.runs.subarray(0, 6))]).toEqual([2, [160, 1, 64, 1, 0, 0]]);
    expect(planOn(ground, sites, open, open).count).toBe(0);

    // A corridor one cell wide that steps right and down 20 times: 40 runs from end to end, with its one site half way. Each half
    // is 20 runs, and the two joined are too many.
    const steps = 20;
    const size = steps + 2;
    const rows = new Array<string>(size).fill('#'.repeat(size)).map((row) => row.split(''));
    for (let i = 0; i < steps; i++) {
      rows[i][i] = '.';
      rows[i][i + 1] = '.';
    }
    rows[steps][steps] = '.';
    const corridor = groundOf(rows.map((row) => row.join('')));
    const middle: [number, number] = [steps / 2, steps / 2];
    const joined = planOn(corridor, [middle], 0, steps * size + steps);
    expect(joined).toEqual({ count: TOO_FAR, runs: Uint8Array.from(none) });
    expect(planOn(corridor, [middle], 0, middle[1] * size + middle[0]).count).toBe(steps);
  });
});
