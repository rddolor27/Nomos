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
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
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

// An arm's seeds averaged day by day, MSER-5's truncation of each average in days, and of each seed's own price.
interface Arm {
  readonly price: Float64Array;
  readonly unemployment: Float64Array;
  readonly priceDays: number;
  readonly unemploymentDays: number;
  readonly seedPriceDays: readonly number[];
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

function measureArm(startWorld: (seed: number) => World): Arm {
  const price = new Float64Array(RUN_DAYS);
  const unemployment = new Float64Array(RUN_DAYS);
  const seedPriceDays: number[] = [];
  for (const seed of SEEDS) {
    const run = runDays(startWorld(seed));
    seedPriceDays.push(mser5(run.price, RUN_DAYS));
    for (let day = 0; day < RUN_DAYS; day++) {
      price[day] += run.price[day] / SEEDS.length;
      unemployment[day] += run.unemployment[day] / SEEDS.length;
    }
  }
  return {
    price,
    unemployment,
    priceDays: mser5(price, RUN_DAYS),
    unemploymentDays: mser5(unemployment, RUN_DAYS),
    seedPriceDays,
  };
}

// M2.1 Ruling 9: the larger truncation of the two mean series, found only if both are.
function burnInDays(arm: Arm): number {
  if (arm.priceDays === NOT_FOUND || arm.unemploymentDays === NOT_FOUND) return NOT_FOUND;
  return Math.max(arm.priceDays, arm.unemploymentDays);
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
    `burn-in days, hand-built against spawned: ${burnInDays(hand)} against ${burnInDays(spawn)}`,
    `  mean price: ${hand.priceDays} against ${spawn.priceDays}`,
    `  unemployment share: ${hand.unemploymentDays} against ${spawn.unemploymentDays}`,
    `per-seed price truncation, seeds 1-${SEEDS.length}, -1 for none found`,
    `  hand-built: ${hand.seedPriceDays.join(' ')}`,
    `  spawned:    ${spawn.seedPriceDays.join(' ')}`,
    `${BLOCK_DAYS}-day block means of the seeds' mean, hand-built / spawned`,
    ...blockRows(hand, spawn),
  ].join('\n');
}

describe.runIf(LONG)('the spawn burn-in comparison (ECONOMY_LONG=1)', () => {
  // M2.2 Ruling 12: the spawned city burns in no slower than M2.1's hand-built start. On a fail, report the numbers; the
  // seeds are never re-rolled and the spreads never retuned without a plan edit. Vitest hides a passing test's log when
  // an AI agent runs it, so add --silent=false to read the numbers.
  it('burns a spawned city in no slower than the hand-built start', { timeout: 900_000 }, () => {
    const source = sourceRecord();
    const homes = createStandInHomes(standInGround(), HOME_COUNT);
    const hand = measureArm(handBuiltWorld);
    const spawn = measureArm((seed) => spawnedWorld(seed, source, homes));

    console.log(report(source, hand, spawn));

    expect(burnInDays(hand), 'the hand-built burn-in is found').not.toBe(NOT_FOUND);
    expect(burnInDays(spawn), 'the spawned burn-in is found').not.toBe(NOT_FOUND);
    expect(burnInDays(spawn), 'the spawned burn-in is no longer').toBeLessThanOrEqual(burnInDays(hand));
  });
});
