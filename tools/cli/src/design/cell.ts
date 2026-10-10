import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FLOW_LOG_SCHEMA,
  LEDGER_FIELDS,
  STATS,
  STAT_NAMES,
  TIER_AGENTS,
  TIER_MEMORY_BYTES,
  createStandInHomes,
  createWorld,
  economyDay,
  layoutWorld,
  scaleRecord,
  spawnFromLedger,
  startEconomy,
  type World,
} from '@nomos/sim-core';
import type { Cell } from './grid.ts';

// A stand-in home sleeps 6, so a home to every 3 people holds the city twice over, as in M2.2.
const PEOPLE_PER_HOME = 3;
// The flow log has one district until M3.1 brings districts.
const DISTRICTS = 1;
const COLUMNS = ['day', 'district', ...STAT_NAMES];

export interface RunContext {
  readonly out: string;
  readonly commit: string;
  readonly record: Float64Array | undefined;
}

export interface CellRun {
  readonly columns: readonly Float64Array[];
  readonly milliseconds: number;
}

export interface CellResult {
  readonly name: string;
  readonly days: number;
  readonly milliseconds: number;
}

function startedWorld(cell: Cell, record: Float64Array | undefined): World {
  if (cell.start === 'hand') {
    const world = createWorld(cell.seed, cell.tier, undefined, cell.size);
    startEconomy(world, cell.params);
    return world;
  }
  if (record === undefined) throw new RangeError(`${cell.name} starts from a spawn, which needs R*`);
  const world = layoutWorld(cell.seed, cell.tier, TIER_AGENTS[cell.tier], TIER_MEMORY_BYTES[cell.tier]);
  const homes = createStandInHomes(world.ground, Math.ceil(cell.size / PEOPLE_PER_HOME));
  const scaled = new Float64Array(LEDGER_FIELDS);
  scaleRecord(record, cell.size, scaled);
  spawnFromLedger(world, scaled, homes, cell.params, 0, 0);
  return world;
}

// world.checks stays on, since the CLI counts as development: a broken money invariant throws on the day it breaks.
export function runCell(cell: Cell, record: Float64Array | undefined): CellRun {
  const world = startedWorld(cell, record);
  const stats = world.economyScratch.stats;
  const columns = STAT_NAMES.map(() => new Float64Array(cell.days));
  const start = performance.now();
  for (let day = 0; day < cell.days; day++) {
    economyDay(world, cell.params, day, day === cell.shock.day ? cell.layoffs : 0);
    for (let slot = 0; slot < STATS; slot++) columns[slot][day] = stats[slot];
  }
  return { columns, milliseconds: performance.now() - start };
}

// Typed arrays hold the machine's byte order, which is little-endian on every platform Node 24 runs on, as the format says.
function writeColumn(folder: string, name: string, values: Float64Array): void {
  writeFileSync(join(folder, `${name}.f64`), values);
}

function metaOf(cell: Cell, commit: string) {
  return {
    schema: FLOW_LOG_SCHEMA,
    commit,
    cell: cell.name,
    preset: cell.preset,
    start: cell.start,
    seed: cell.seed,
    size: cell.size,
    tier: cell.tier,
    policeShare: cell.policeShare,
    shock: cell.shock,
    layoffs: cell.layoffs,
    point: cell.point,
    params: cell.params,
    days: cell.days,
    warmUpDays: cell.warmUpDays,
    districts: DISTRICTS,
    columns: COLUMNS,
  };
}

// meta.json goes last, so a folder that a crash cut short has none and targets refuses it.
export function writeCell(out: string, cell: Cell, run: CellRun, commit: string): void {
  const folder = join(out, cell.name);
  mkdirSync(folder, { recursive: true });
  writeColumn(folder, 'day', Float64Array.from({ length: cell.days }, (_, day) => day));
  writeColumn(folder, 'district', new Float64Array(cell.days));
  for (let slot = 0; slot < STATS; slot++) writeColumn(folder, STAT_NAMES[slot], run.columns[slot]);
  writeFileSync(join(folder, 'meta.json'), `${JSON.stringify(metaOf(cell, commit), null, 2)}\n`);
}
