import { describe, expect, it } from 'vitest';
import { economyDay } from '../src/economy/economy.ts';
import { mser5 } from '../src/economy/mser5.ts';
import { LENGNICK } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import { STAT_PRICE_MEAN, STAT_UNEMPLOYED } from '../src/economy/stats.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES } from '../src/memory/tiers.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createStandInHomes, type Homes } from '../src/spawn/homes.ts';
import { LEDGER_FIELDS } from '../src/spawn/record.ts';
import { spawnFromLedger } from '../src/spawn/spawn.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { standInGround } from '../src/world/ground.ts';
import { createWorld, layoutWorld, type World } from '../src/world/world.ts';

const LONG = process.env.ECONOMY_LONG === '1';
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const RUN_DAYS = 20_000;
// R*, the record the spawned arm starts from: seed 42's hand-built city after 471 months, deep in its stationary state
// (M2.2 Ruling 12).
const SOURCE_SEED = 42;
const SOURCE_DAYS = 471 * DAYS_PER_MONTH;
// 334 homes of 6 beds hold 2,004 people, twice the city's 1,000.
const HOME_COUNT = 334;
const BLOCK_DAYS = 1_000;
const NOT_FOUND = -1;

// One seed's daily mean posted price in cents, and its unemployed share of the people.
interface Run {
  readonly price: Float64Array;
  readonly unemployment: Float64Array;
}

// An arm's seeds averaged day by day, for the block means, and each seed's own burn-in in days.
interface Arm {
  readonly price: Float64Array;
  readonly unemployment: Float64Array;
  readonly burnInDays: readonly number[];
}

function handBuiltWorld(seed: number): World {
  const world = createWorld(seed, 'phone', undefined, LENGNICK.households);
  startEconomy(world, LENGNICK);
  return world;
}

// Laid out as createWorld lays out a phone world, then spawned in place of populate and startEconomy.
function spawnedWorld(seed: number, record: Float64Array, homes: Homes): World {
  const world = layoutWorld(seed, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone);
  spawnFromLedger(world, record, homes, LENGNICK, 0, 0);
  return world;
}

function sourceRecord(): Float64Array {
  const world = handBuiltWorld(SOURCE_SEED);
  for (let day = 0; day < SOURCE_DAYS; day++) economyDay(world, LENGNICK, day);
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

// economyDay checks the money invariants every day while world.checks is on, and throws on the first that fails.
function runDays(world: World): Run {
  const stats = world.economyScratch.stats;
  const people = world.agents.count[0];
  const price = new Float64Array(RUN_DAYS);
  const unemployment = new Float64Array(RUN_DAYS);
  for (let day = 0; day < RUN_DAYS; day++) {
    economyDay(world, LENGNICK, day);
    price[day] = stats[STAT_PRICE_MEAN];
    unemployment[day] = stats[STAT_UNEMPLOYED] / people;
  }
  return { price, unemployment };
}

// A truncation that is not found counts as the whole run.
function truncationDays(series: Float64Array): number {
  const days = mser5(series, RUN_DAYS);
  return days === NOT_FOUND ? RUN_DAYS : days;
}

// M2.1 Ruling 9, per seed: the larger of the price and unemployment truncations.
function seedBurnInDays(run: Run): number {
  return Math.max(truncationDays(run.price), truncationDays(run.unemployment));
}

function median(values: readonly number[]): number {
  const sorted = Float64Array.from(values).sort();
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function measureArm(startWorld: (seed: number) => World): Arm {
  const price = new Float64Array(RUN_DAYS);
  const unemployment = new Float64Array(RUN_DAYS);
  const burnInDays: number[] = [];
  for (const seed of SEEDS) {
    const run = runDays(startWorld(seed));
    burnInDays.push(seedBurnInDays(run));
    for (let day = 0; day < RUN_DAYS; day++) {
      price[day] += run.price[day] / SEEDS.length;
      unemployment[day] += run.unemployment[day] / SEEDS.length;
    }
  }
  return { price, unemployment, burnInDays };
}

function blockMeans(series: Float64Array): number[] {
  const means: number[] = [];
  for (let first = 0; first < RUN_DAYS; first += BLOCK_DAYS) {
    let total = 0;
    for (let day = first; day < first + BLOCK_DAYS; day++) total += series[day];
    means.push(total / BLOCK_DAYS);
  }
  return means;
}

function blockRows(hand: Arm, spawn: Arm): string[] {
  const price = [blockMeans(hand.price), blockMeans(spawn.price)];
  const unemployment = [blockMeans(hand.unemployment), blockMeans(spawn.unemployment)];
  const rows: string[] = [];
  for (let block = 0; block < price[0].length; block++) {
    const days = `${block * BLOCK_DAYS}-${(block + 1) * BLOCK_DAYS - 1}`;
    const cents = `${price[0][block].toFixed(1)} / ${price[1][block].toFixed(1)}`;
    const share = `${(100 * unemployment[0][block]).toFixed(2)} / ${(100 * unemployment[1][block]).toFixed(2)}`;
    rows.push(`  days ${days.padEnd(13)} price ${cents.padEnd(19)} unemployment % ${share}`);
  }
  return rows;
}

function report(source: Float64Array, hand: Arm, spawn: Arm): string {
  return [
    `R* (${LEDGER_FIELDS} ledger fields): ${source.join(' ')}`,
    `median burn-in days, seeds 1-${SEEDS.length}: hand-built ${median(hand.burnInDays)}, spawned ${median(spawn.burnInDays)}`,
    `per-seed burn-in days, ${RUN_DAYS} for a truncation not found`,
    `  hand-built: ${hand.burnInDays.join(' ')}`,
    `  spawned:    ${spawn.burnInDays.join(' ')}`,
    `${BLOCK_DAYS}-day block means of the seeds' mean, hand-built / spawned`,
    ...blockRows(hand, spawn),
  ].join('\n');
}

describe.runIf(LONG)('the spawn burn-in comparison (ECONOMY_LONG=1)', () => {
  // M2.2 Ruling 12, steadied by the coordinator on 10 October 2026: the spawned city burns in no slower than M2.1's
  // hand-built start when the median of 40 paired seeds' burn-ins is no longer. One burn-in of the 20-seed mean series
  // swung from 4,430 to 8,635 days with the seed set. On a fail, report the numbers; the seeds are never re-rolled and
  // the spreads never retuned without a plan edit. Vitest hides a passing test's log when an AI agent runs it, so add
  // --silent=false to read the numbers.
  it('burns a spawned city in no slower than the hand-built start', { timeout: 1_800_000 }, () => {
    const source = sourceRecord();
    const homes = createStandInHomes(standInGround(), HOME_COUNT);
    const hand = measureArm(handBuiltWorld);
    const spawn = measureArm((seed) => spawnedWorld(seed, source, homes));

    console.log(report(source, hand, spawn));

    // Without this, two arms that never burn in would both median at RUN_DAYS and pass.
    expect(median(hand.burnInDays), 'the hand-built start burns in within the run').toBeLessThan(RUN_DAYS);
    expect(median(spawn.burnInDays), 'the median spawned burn-in is no longer').toBeLessThanOrEqual(
      median(hand.burnInDays),
    );
  });
});
