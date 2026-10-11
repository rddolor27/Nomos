import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import { CITY_RECORD } from '../src/economy/city-record.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES } from '../src/memory/tiers.ts';
import { PPM } from '../src/money/ppm.ts';
import * as streams from '../src/random/streams.ts';
import { AWAY_DRAW, layerOf } from '../src/random/streams.ts';
import { AWAY_FIELDS, stepAwayTown, stepAwayTowns } from '../src/spawn/away.ts';
import { AWAY_LEVEL_PPM, AWAY_NOISE_PPM, AWAY_SHARE_PPM } from '../src/spawn/away-rates.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createStandInTownHomes } from '../src/spawn/homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  checkRecord,
  populationOf,
  townRecord,
} from '../src/spawn/record.ts';
import { spawnFromLedger } from '../src/spawn/spawn.ts';
import { layoutWorld } from '../src/world/world.ts';

const SEED = 42;
const HIGHCOURT_BEDS = 2_688;
const HIGHCOURT_LARGEST_HOME = 24;
const EMPTY = new Array<number>(LEDGER_FIELDS).fill(0);
// checkRecord reads only the world's room for agents and firms.
const room = layoutWorld(1, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone);

function rowOf(people: number, largestHome = 6): Float64Array {
  const row = new Float64Array(LEDGER_FIELDS);
  townRecord(people, largestHome, row);
  return row;
}

function highcourt(): Float64Array {
  return rowOf(HIGHCOURT_BEDS, HIGHCOURT_LARGEST_HOME);
}

function tableOf(...rows: ArrayLike<number>[]): Float64Array {
  const table = new Float64Array(rows.length * LEDGER_FIELDS);
  rows.forEach((row, town) => table.set(row, town * LEDGER_FIELDS));
  return table;
}

function rowAt(table: Float64Array, town: number): number[] {
  return Array.from(table.subarray(town * LEDGER_FIELDS, (town + 1) * LEDGER_FIELDS));
}

function scratch(): Float64Array {
  return new Float64Array(LEDGER_FIELDS);
}

function cashOf(row: ArrayLike<number>): number {
  return row[LEDGER_HOUSEHOLD_CASH] + row[LEDGER_FIRM_CASH];
}

// The level an away town of 1,000 people drifts to: the live town's mean, the first record's field times its fitted level.
function liveMean(field: number): number {
  return (CITY_RECORD[field] * AWAY_LEVEL_PPM[AWAY_FIELDS.indexOf(field)]) / PPM;
}

// A -0 in a row would change the state hash that later carries the table.
function hasNegativeZero(table: Float64Array): boolean {
  return Array.from(table.keys()).some((field) => Object.is(table[field], -0));
}

// A table of one row, after months 1 to `months`.
function stepped(row: ArrayLike<number>, months: number, seed = SEED): Float64Array {
  const table = tableOf(row);
  const anchor = scratch();
  for (let month = 1; month <= months; month++) stepAwayTown(table, 0, seed, month, anchor);
  return table;
}

// Highcourt at `town` of three, after one step.
function steppedOnce(seed: number, month: number, town: number): number[] {
  const table = tableOf(highcourt(), highcourt(), highcourt());
  stepAwayTown(table, town, seed, month, scratch());
  return rowAt(table, town);
}

describe('the away stream', () => {
  it('is the first ledger stream, and no other stream shares it', () => {
    expect(AWAY_DRAW).toBe(0x201);
    expect(layerOf(AWAY_DRAW)).toBe('ledger');
    expect(Object.values(streams).filter((stream) => stream === AWAY_DRAW)).toHaveLength(1);
  });
});

describe('stepAwayTown', () => {
  it("keeps Highcourt's people, households, firms and cash total exact for 120 months, within checkRecord", () => {
    const first = highcourt();
    const table = tableOf(first);
    const anchor = scratch();
    const unmoved = [...Array(LEDGER_HOUSEHOLDS + 6).keys(), LEDGER_FIRMS, LEDGER_STOCK, LEDGER_FIRM_CASH];
    const wrong: string[] = [];
    const employed = new Set<number>();
    for (let month = 1; month <= 120; month++) {
      stepAwayTown(table, 0, SEED, month, anchor);
      employed.add(table[LEDGER_EMPLOYED]);
      for (const field of unmoved) if (table[field] !== first[field]) wrong.push(`month ${month} field ${field}`);
      if (cashOf(table) !== cashOf(first)) wrong.push(`month ${month} cash`);
      if (table[LEDGER_EMPLOYED] + table[LEDGER_UNEMPLOYED] !== HIGHCOURT_BEDS) wrong.push(`month ${month} people`);
      if (hasNegativeZero(table)) wrong.push(`month ${month} negative zero`);
      expect(() => checkRecord(table, room), `month ${month}`).not.toThrow();
    }

    expect(wrong).toEqual([]);
    expect(populationOf(table)).toBe(HIGHCOURT_BEDS);
    expect(employed.size).toBeGreaterThan(30);
  });

  it("returns stock and the firms' cash to the first record's, and gives the households the rest of the total", () => {
    const first = highcourt();
    const row = Float64Array.from(first);
    row[LEDGER_STOCK] *= 2;
    row[LEDGER_FIRM_CASH] -= 1_000_000;
    row[LEDGER_HOUSEHOLD_CASH] += 1_000_000;
    const after = rowAt(stepped(row, 1), 0);
    const fields = [LEDGER_STOCK, LEDGER_FIRM_CASH, LEDGER_HOUSEHOLD_CASH];

    expect(fields.map((field) => after[field])).toEqual(fields.map((field) => first[field]));
  });

  it('gives a row that spawns and folds back to itself', () => {
    const row = rowAt(stepped(CITY_RECORD, 12), 0);
    const world = layoutWorld(SEED, 'phone', 1_024, 1 << 20);
    spawnFromLedger(world, Float64Array.from(row), createStandInTownHomes(world.ground, 1_000), CITY, 0, 0);
    const folded = scratch();
    foldToLedger(world, folded);

    expect(row).not.toEqual(Array.from(CITY_RECORD));
    expect(Array.from(folded)).toEqual(row);
  });

  it('is a function of its row and keys alone: neighbours, the scratch row and call order change nothing', () => {
    const alone = tableOf(EMPTY, highcourt());
    const beside = tableOf(rowOf(300), highcourt(), rowOf(69));
    stepAwayTown(alone, 1, SEED, 7, scratch());
    stepAwayTown(beside, 2, SEED, 7, scratch());
    stepAwayTown(beside, 1, SEED, 7, scratch().fill(123_456));
    stepAwayTown(beside, 0, SEED, 7, scratch());

    expect(rowAt(beside, 1)).toEqual(rowAt(alone, 1));
    expect(rowAt(alone, 1)).not.toEqual(Array.from(highcourt()));
  });

  it('draws apart by seed, by month and by town', () => {
    const steps = [steppedOnce(SEED, 7, 1), steppedOnce(SEED + 1, 7, 1), steppedOnce(SEED, 8, 1), steppedOnce(SEED, 7, 2)];

    expect(new Set(steps.map((step) => step.join())).size).toBe(4);
  });

  it("pulls a row at three times its record's unemployment back toward the live mean within 12 months", () => {
    const row = Float64Array.from(CITY_RECORD);
    row[LEDGER_UNEMPLOYED] *= 3;
    row[LEDGER_EMPLOYED] = 1_000 - row[LEDGER_UNEMPLOYED];
    const gap = (employed: number): number => Math.abs(employed - liveMean(LEDGER_EMPLOYED));

    for (const seed of [SEED, SEED + 1]) {
      expect(gap(stepped(row, 12, seed)[LEDGER_EMPLOYED]), `seed ${seed}`).toBeLessThan(gap(row[LEDGER_EMPLOYED]));
    }
  });

  it("closes a price's gap to the live mean by the fitted share on average, though that is under a cent a month", () => {
    const gap = 20;
    const months = 20_000;
    const share = AWAY_SHARE_PPM[AWAY_FIELDS.indexOf(LEDGER_PRICE)] / PPM;
    const mean = liveMean(LEDGER_PRICE);
    const start = Math.round(mean) + gap;
    const row = scratch();
    const anchor = scratch();
    let total = 0;
    for (let month = 1; month <= months; month++) {
      row.set(CITY_RECORD);
      row[LEDGER_PRICE] = start;
      stepAwayTown(row, 0, SEED, month, anchor);
      total += row[LEDGER_PRICE];
    }

    expect(Math.abs(total / months - (mean + (start - mean) * (1 - share)))).toBeLessThan(0.12);
  });

  it('holds the fitted spread about the live mean, not the first record, at 1,000 people for 20,000 months', () => {
    const months = 20_000;
    const table = tableOf(CITY_RECORD);
    const anchor = scratch();
    const series = Array.from(AWAY_FIELDS, () => new Float64Array(months));
    for (let month = 1; month <= months; month++) {
      stepAwayTown(table, 0, SEED, month, anchor);
      for (let drift = 0; drift < AWAY_FIELDS.length; drift++) series[drift][month - 1] = table[AWAY_FIELDS[drift]];
    }

    for (let drift = 0; drift < AWAY_FIELDS.length; drift++) {
      const record = CITY_RECORD[AWAY_FIELDS[drift]];
      const share = AWAY_SHARE_PPM[drift] / PPM;
      const wanted = ((AWAY_NOISE_PPM[drift] / PPM) * record) / Math.sqrt(1 - (1 - share) * (1 - share));
      const mean = series[drift].reduce((sum, x) => sum + x, 0) / months;
      const spread = Math.sqrt(series[drift].reduce((sum, x) => sum + (x - mean) * (x - mean), 0) / months);

      expect(share, `share ${drift}`).toBeGreaterThanOrEqual(0.01);
      expect(Math.abs(spread / wanted - 1), `spread ${drift}`).toBeLessThan(0.2);
      expect(Math.abs(mean - liveMean(AWAY_FIELDS[drift])), `mean ${drift}`).toBeLessThan(wanted / 2);
    }
  });

  it('replays: Highcourt after 12 months on seed 42 is these 14 fields', () => {
    expect(rowAt(stepped(highcourt(), 12), 0)).toEqual([
      229, 272, 194, 165, 77, 48, 2_472, 216, 268, 798_803_642, 34_476_357, 3_360, 142_931, 117_290,
    ]);
  });

  it('leaves a row with no people untouched, and the scratch row as it was', () => {
    const table = new Float64Array(LEDGER_FIELDS);
    const anchor = scratch().fill(5);
    stepAwayTown(table, 0, SEED, 3, anchor);

    expect(Array.from(table)).toEqual(EMPTY);
    expect(Array.from(anchor)).toEqual(new Array<number>(LEDGER_FIELDS).fill(5));
  });

  it('keeps a town of 7 people and 7 firms within bounds for 1,000 months, and still moves it', () => {
    const first = rowOf(7);
    const table = tableOf(first);
    const anchor = scratch();
    const employed = new Set<number>();
    const negative: number[] = [];
    for (let month = 1; month <= 1_000; month++) {
      stepAwayTown(table, 0, SEED, month, anchor);
      employed.add(table[LEDGER_EMPLOYED]);
      if (hasNegativeZero(table)) negative.push(month);
      expect(() => checkRecord(table, room), `month ${month}`).not.toThrow();
    }

    expect([table[LEDGER_FIRMS], populationOf(table), cashOf(table)]).toEqual([7, 7, cashOf(first)]);
    expect(negative).toEqual([]);
    // Noise this wide for 7 people meets the cap of everyone employed.
    expect([employed.size > 2, employed.has(7)]).toEqual([true, true]);
  });
});

describe('stepAwayTowns', () => {
  it('steps every row with people but the live one, each as it steps alone', () => {
    const rows = [highcourt(), EMPTY, CITY_RECORD, rowOf(69)];
    const table = tableOf(...rows);
    stepAwayTowns(table, 2, SEED, 5, scratch());

    expect(rowAt(table, 1)).toEqual(EMPTY);
    expect(rowAt(table, 2)).toEqual(Array.from(CITY_RECORD));
    for (const town of [0, 3]) {
      const alone = tableOf(...rows);
      stepAwayTown(alone, town, SEED, 5, scratch());
      expect(rowAt(table, town), `town ${town}`).toEqual(rowAt(alone, town));
      expect(rowAt(table, town), `town ${town}`).not.toEqual(Array.from(rows[town]));
    }
  });

  it('steps every row when no town is live', () => {
    const table = tableOf(rowOf(300), rowOf(300));
    stepAwayTowns(table, -1, SEED, 5, scratch());

    expect(rowAt(table, 0)).not.toEqual(Array.from(rowOf(300)));
    expect(rowAt(table, 1)).not.toEqual(Array.from(rowOf(300)));
  });
});
