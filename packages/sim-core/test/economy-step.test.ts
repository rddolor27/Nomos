import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import { ECONOMY_TICKS, economyDay } from '../src/economy/economy.ts';
import { STAT_SALES_UNITS } from '../src/economy/stats.ts';
import { createTown } from '../src/spawn/town.ts';
import { DAYS_PER_MONTH, TICKS_PER_DAY } from '../src/time/calendar.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { standInGround } from '../src/world/ground.ts';
import { currentTick, type World } from '../src/world/world.ts';
import { run } from './run.ts';

const SEED = 42;
const PEOPLE = 1_000;
// Five ticks in, on a month's first day: the wages, the firms and both searches have run and the consumption plans are next.
const FIFTH_TICK = 5;
const CHECKPOINT_END_TICK = 3_000;

function town(): World {
  return createTown(SEED, 'phone', standInGround(), PEOPLE);
}

function columnsOf(store: object, count: number, skip: readonly string[]): Record<string, number[]> {
  const columns: Record<string, number[]> = {};
  for (const [name, column] of Object.entries(store)) {
    if (ArrayBuffer.isView(column) && !skip.includes(name)) columns[name] = Array.from((column as Float64Array).subarray(0, count));
  }
  return columns;
}

// The books the economy writes: each person's employer, every balance, every firm column and the day's stats row.
function booksOf(world: World): Record<string, number[]> {
  const { agents, cash, firms, economyScratch } = world;
  return {
    employer: Array.from(agents.employer.subarray(0, agents.count[0])),
    balance: Array.from(cash.balance.subarray(0, cash.accounts)),
    stats: Array.from(economyScratch.stats),
    ...columnsOf(firms, firms.count[0], ['count']),
  };
}

describe('the economy in the step', () => {
  it('equals economyDay on a twin after 21 days, in employers, wallets, firms and stats', () => {
    const ticked = run(town(), DAYS_PER_MONTH * TICKS_PER_DAY);
    const twin = town();
    for (let day = 0; day < DAYS_PER_MONTH; day++) economyDay(twin, CITY, day);

    expect(booksOf(ticked)).toEqual(booksOf(twin));
    expect(booksOf(twin)).not.toEqual(booksOf(town()));
  });

  it('runs one system a tick, shopping on the 7th, and nothing after the 18th', () => {
    const world = town();
    expect(ECONOMY_TICKS).toBe(18);

    run(world, 6);
    expect(world.economyScratch.stats[STAT_SALES_UNITS]).toBe(0);
    run(world, 7);
    expect(world.economyScratch.stats[STAT_SALES_UNITS]).toBeGreaterThan(0);

    run(world, ECONOMY_TICKS);
    const afterWindow = booksOf(world);
    run(world, TICKS_PER_DAY - 1);
    expect(booksOf(world)).toEqual(afterWindow);
  });

  it('reaches the same hash at tick 3,000 from a checkpoint taken on a day\'s 5th tick', () => {
    const whole = run(town(), CHECKPOINT_END_TICK);
    const early = run(town(), FIFTH_TICK);
    const restored = restoreWorld(SEED, 'phone', checkpoint(early), standInGround());

    expect(currentTick(restored)).toBe(FIFTH_TICK);
    expect(stateHash(run(restored, CHECKPOINT_END_TICK))).toBe(stateHash(whole));
    expect(stateHash(whole)).not.toBe(stateHash(early));
  });
});
