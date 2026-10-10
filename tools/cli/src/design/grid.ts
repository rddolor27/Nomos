import { TIER_AGENTS, checkParams, draw3, keyedShuffle, type EconomyParams, type Tier } from '@nomos/sim-core';
import { PRESETS, isPreset, type PresetName } from '../economy/presets.ts';

export type Start = 'hand' | 'spawn';

export interface Shock {
  readonly day: number;
  readonly unemploymentPoints: number;
}

// The knobs are the params a Latin hypercube varies, and points[i][j] is point i's value of knobs[j]. Without an lhs there
// is one point with no knobs.
export interface Grid {
  readonly preset: PresetName;
  readonly start: Start;
  readonly days: number;
  readonly warmUpDays: number;
  readonly seeds: readonly number[];
  readonly sizes: readonly number[];
  readonly policeShares: readonly number[];
  readonly shocks: readonly Shock[];
  readonly params: Readonly<Record<string, number>>;
  readonly knobs: readonly string[];
  readonly points: readonly (readonly number[])[];
}

// Plain data, since a cell crosses to its worker by structured clone.
export interface Cell {
  readonly name: string;
  readonly preset: PresetName;
  readonly start: Start;
  readonly point: number;
  readonly seed: number;
  readonly size: number;
  readonly tier: Tier;
  readonly policeShare: number;
  readonly shock: Shock;
  readonly layoffs: number;
  readonly params: EconomyParams;
  readonly days: number;
  readonly warmUpDays: number;
}

type Json = Readonly<Record<string, unknown>>;
type Range = readonly [number, number];

const GRID_FIELDS = ['preset', 'start', 'days', 'warmUpDays', 'seeds', 'sizes', 'policeShares', 'shocks', 'params', 'lhs'];
const SHOCK_FIELDS = ['day', 'unemploymentPoints'];
const LHS_FIELDS = ['points', 'seed', 'ranges'];
// The runner sets these from the size, so a grid may not.
const SIZE_FIELDS = ['households', 'firms'];

const MAX_SEED = 0xffff_ffff;
const MAX_INT32 = 0x7fff_ffff;
const MAX_DAYS = 1_000_000;
const MAX_LHS_POINTS = 10_000;
// R* is a 1,000-person city, so a size scales it by a whole number (M2.3 Ruling 16).
const SIZE_STEP = 1_000;
const MAX_SIZE = 100_000;
// One firm to 10 agent slots, as in Lengnick and TIER_FIRMS.
const PEOPLE_PER_FIRM = 10;
const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];
const NO_KNOBS = { knobs: [], points: [[]] };
// The hypercube's own stream, past every sim stream (the ledger layer starts at 0x200), so its draws can never be the sim's.
const DESIGN_DRAW = 0x300;
const TWO_TO_32 = 4_294_967_296;

function reject(path: string, rule: string, got: unknown): never {
  throw new RangeError(`${path} must be ${rule}, not ${JSON.stringify(got) ?? 'missing'}`);
}

function object(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) reject(path, 'an object', value);
  return value as Json;
}

function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) reject(path, 'a non-empty list', value);
  return value;
}

function whole(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    reject(path, `a whole number from ${min} to ${max}`, value);
  }
  return value;
}

function between(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !(value >= min && value <= max)) reject(path, `a number from ${min} to ${max}`, value);
  return value;
}

function atLeast(value: unknown, path: string, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) reject(path, `a number of ${min} or more`, value);
  return value;
}

function listOf<T>(value: unknown, path: string, read: (item: unknown, itemPath: string) => T): T[] {
  return list(value, path).map((item, i) => read(item, `${path}[${i}]`));
}

function distinct(items: readonly number[], path: string): readonly number[] {
  for (let i = 0; i < items.length; i++) {
    if (items.indexOf(items[i]) !== i) reject(`${path}[${i}]`, 'different from an earlier one', items[i]);
  }
  return items;
}

function onlyFields(fields: Json, allowed: readonly string[], path: string): void {
  for (const field of Object.keys(fields)) {
    if (!allowed.includes(field)) throw new RangeError(`${path}.${field} is no field of ${path}; they are ${allowed.join(', ')}`);
  }
}

function presetOf(value: unknown): PresetName {
  if (!isPreset(value)) reject('grid.preset', `one of ${Object.keys(PRESETS).join(', ')}`, value);
  return value;
}

function startOf(value: unknown): Start {
  if (value !== 'hand' && value !== 'spawn') reject('grid.start', 'hand or spawn', value);
  return value;
}

function seedOf(value: unknown, path: string): number {
  return whole(value, path, 0, MAX_SEED);
}

function sizeOf(value: unknown, path: string): number {
  const size = whole(value, path, SIZE_STEP, MAX_SIZE);
  if (size % SIZE_STEP !== 0) reject(path, `a multiple of ${SIZE_STEP}`, size);
  return size;
}

function shockOf(value: unknown, path: string, days: number): Shock {
  const shock = object(value, path);
  onlyFields(shock, SHOCK_FIELDS, path);
  return {
    day: whole(shock.day, `${path}.day`, 0, days - 1),
    unemploymentPoints: between(shock.unemploymentPoints, `${path}.unemploymentPoints`, 0, 100),
  };
}

function warmUpOf(value: unknown, days: number, preset: EconomyParams): number {
  if (value !== undefined) return whole(value, 'grid.warmUpDays', 0, days - 1);
  if (preset.burnInDays >= days) {
    throw new RangeError(`grid.warmUpDays defaults to the preset's burnInDays, ${preset.burnInDays}, which is not below days ${days}; set it`);
  }
  return preset.burnInDays;
}

function requireParam(name: string, path: string, preset: EconomyParams): void {
  if (!Object.hasOwn(preset, name)) throw new RangeError(`${path} is no param of the preset`);
  if (SIZE_FIELDS.includes(name)) throw new RangeError(`${path} is set by the size, so a grid may not`);
}

function paramsOf(value: unknown, preset: EconomyParams): Record<string, number> {
  const params: Record<string, number> = {};
  if (value === undefined) return params;
  const given = object(value, 'grid.params');
  for (const name of Object.keys(given)) {
    const path = `grid.params.${name}`;
    requireParam(name, path, preset);
    if (typeof given[name] !== 'number') reject(path, 'a number', given[name]);
    params[name] = given[name];
  }
  return params;
}

function rangeOf(knob: string, value: unknown, preset: EconomyParams, params: Json): Range {
  const path = `grid.lhs.ranges.${knob}`;
  requireParam(knob, path, preset);
  if (Object.hasOwn(params, knob)) throw new RangeError(`${path} is also set in grid.params`);
  if (!Array.isArray(value) || value.length !== 2) reject(path, 'a [low, high] pair', value);
  const low = whole(value[0], `${path}[0]`, 0, MAX_INT32);
  const high = whole(value[1], `${path}[1]`, 0, MAX_INT32);
  if (high < low) reject(path, 'a range with low at most high', value);
  return [low, high];
}

// Knob j takes its n strata in a keyed order, and point i takes the stratum perm[i] with a keyed place inside it, so a knob's
// points depend on the lhs seed, n and j alone: adding a knob after it moves nothing.
function latinHypercube(n: number, seed: number, ranges: readonly Range[]): number[][] {
  const points: number[][] = [];
  for (let i = 0; i < n; i++) points.push([]);
  const perm = new Int32Array(n);
  for (let j = 0; j < ranges.length; j++) {
    const [low, high] = ranges[j];
    keyedShuffle(perm, n, seed, DESIGN_DRAW, j, 0);
    for (let i = 0; i < n; i++) {
      const u = draw3(seed, DESIGN_DRAW, j, i, 1) / TWO_TO_32;
      points[i].push(low + Math.floor(((perm[i] + u) * (high - low + 1)) / n));
    }
  }
  return points;
}

function hypercubeOf(value: unknown, start: Start, preset: EconomyParams, params: Json) {
  if (value === undefined) return NO_KNOBS;
  if (start === 'spawn') {
    throw new RangeError('grid.lhs is no use with start "spawn": a point changes the params, and a spawned city is the preset\'s own');
  }
  const lhs = object(value, 'grid.lhs');
  onlyFields(lhs, LHS_FIELDS, 'grid.lhs');
  const points = whole(lhs.points, 'grid.lhs.points', 1, MAX_LHS_POINTS);
  const seed = whole(lhs.seed, 'grid.lhs.seed', 0, MAX_SEED);
  const ranges = object(lhs.ranges, 'grid.lhs.ranges');
  const knobs = Object.keys(ranges);
  if (knobs.length === 0) reject('grid.lhs.ranges', 'a range for at least one param', ranges);
  return { knobs, points: latinHypercube(points, seed, knobs.map((knob) => rangeOf(knob, ranges[knob], preset, params))) };
}

function tierFor(size: number): Tier {
  return TIERS.find((tier) => TIER_AGENTS[tier] >= size) ?? 'desktop';
}

function cellParams(grid: Grid, size: number, point: number): EconomyParams {
  const knobs = Object.fromEntries(grid.knobs.map((knob, j) => [knob, grid.points[point][j]]));
  return { ...PRESETS[grid.preset], ...grid.params, ...knobs, households: size, firms: size / PEOPLE_PER_FIRM };
}

// A throw midway names the point and size, since the params of a cell are the preset's, the grid's and a point's together.
function checkCells(grid: Grid): void {
  for (let point = 0; point < grid.points.length; point++) {
    for (const size of grid.sizes) {
      try {
        checkParams(cellParams(grid, size, point), tierFor(size));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new RangeError(`grid point ${point} at size ${size}: ${reason}`, { cause: error });
      }
    }
  }
}

export function parseGrid(raw: unknown): Grid {
  const root = object(raw, 'grid');
  onlyFields(root, GRID_FIELDS, 'grid');
  const preset = presetOf(root.preset);
  const start = startOf(root.start);
  const days = whole(root.days, 'grid.days', 1, MAX_DAYS);
  const params = paramsOf(root.params, PRESETS[preset]);
  const grid: Grid = {
    preset,
    start,
    days,
    warmUpDays: warmUpOf(root.warmUpDays, days, PRESETS[preset]),
    seeds: distinct(listOf(root.seeds, 'grid.seeds', seedOf), 'grid.seeds'),
    sizes: distinct(listOf(root.sizes, 'grid.sizes', sizeOf), 'grid.sizes'),
    policeShares: listOf(root.policeShares, 'grid.policeShares', (share, path) => atLeast(share, path, 0)),
    shocks: listOf(root.shocks, 'grid.shocks', (shock, path) => shockOf(shock, path, days)),
    params,
    ...hypercubeOf(root.lhs, start, PRESETS[preset], params),
  };
  checkCells(grid);
  return grid;
}

function cellsAt(grid: Grid, point: number, size: number): Cell[] {
  const params = cellParams(grid, size, point);
  const tier = tierFor(size);
  const cells: Cell[] = [];
  for (let x = 0; x < grid.policeShares.length; x++) {
    for (let k = 0; k < grid.shocks.length; k++) {
      for (const seed of grid.seeds) {
        cells.push({
          name: `p${String(point).padStart(3, '0')}-n${size}-x${x}-k${k}-s${seed}`,
          preset: grid.preset,
          start: grid.start,
          point,
          seed,
          size,
          tier,
          policeShare: grid.policeShares[x],
          shock: grid.shocks[k],
          layoffs: Math.floor((grid.shocks[k].unemploymentPoints * size) / 100),
          params,
          days: grid.days,
          warmUpDays: grid.warmUpDays,
        });
      }
    }
  }
  return cells;
}

// Point, size, police share, shock, then seed: the order of a cell's name.
export function listCells(grid: Grid): Cell[] {
  const cells: Cell[] = [];
  for (let point = 0; point < grid.points.length; point++) {
    for (const size of grid.sizes) cells.push(...cellsAt(grid, point, size));
  }
  return cells;
}
