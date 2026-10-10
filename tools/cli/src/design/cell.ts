import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DAYS_PER_MONTH,
  FLOW_LOG_SCHEMA,
  LEDGER_FIELDS,
  LEDGER_PRICE,
  LEDGER_WAGE,
  STATS,
  STAT_NAMES,
  TIER_AGENTS,
  TIER_MEMORY_BYTES,
  createStandInHomes,
  createWorld,
  economyDay,
  foldToLedger,
  layoutWorld,
  spawnFromLedger,
  startEconomy,
  type EconomyParams,
  type World,
} from '@nomos/sim-core';
import { PRESETS } from '../economy/presets.ts';
import type { Cell } from './grid.ts';

// R* comes from this seed's hand-built city (M2.2 Ruling 12).
const SOURCE_SEED = 42;
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

// R*: the preset's hand-built city, run to the first month end on or after its burn-in, and folded into a ledger record.
export function settledRecord(preset: EconomyParams): Float64Array {
  const world = createWorld(SOURCE_SEED, 'phone', undefined, preset.households);
  startEconomy(world, preset);
  const days = Math.ceil(preset.burnInDays / DAYS_PER_MONTH) * DAYS_PER_MONTH;
  for (let day = 0; day < days; day++) economyDay(world, preset, day);
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

// Every field is a count or a total but price and wage, which are means (M2.2 Ruling 4).
function scaledRecord(record: Float64Array, factor: number): Float64Array {
  return record.map((value, field) => (field === LEDGER_PRICE || field === LEDGER_WAGE ? value : value * factor));
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
  const scaled = scaledRecord(record, cell.size / PRESETS[cell.preset].households);
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
