import { describe, expect, it } from 'vitest';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import { STAT_FIRINGS, STAT_HIRES, STAT_SWITCHES } from '../src/economy/stats.ts';
import { fireOnNotice } from '../src/labour/notice.ts';
import { updateReservationWages } from '../src/labour/reservation.ts';
import { sampledFirm, searchJobs } from '../src/labour/search.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { firmAccount, issue } from '../src/money/ledger.ts';
import { PPM } from '../src/money/ppm.ts';
import { draw3, draw4 } from '../src/random/draw.ts';
import { LABOUR_DRAW } from '../src/random/streams.ts';
import { payWages } from '../src/wages/payroll.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld, type World } from '../src/world/world.ts';

const NO_FIRM = -1;

function labourWorld(households: number, firms: number, wageCents = 100): World {
  const world = createWorld(42, 'phone', undefined, households);
  world.firms.count[0] = firms;
  world.firms.wage.fill(wageCents, 0, firms);
  return world;
}

// Nobody employed and no vacancy open, so a loop over months can reuse one world.
function clearJobs(world: World): void {
  world.agents.employer.fill(NO_FIRM);
  world.firms.employees.fill(0);
  world.firms.vacancy.fill(0);
  world.firms.notice.fill(0);
  world.economyScratch.stats.fill(0);
}

function employ(world: World, household: number, firm: number): void {
  world.agents.employer[household] = firm;
  world.firms.employees[firm]++;
}

function headcounts(world: World): number[] {
  const counts = new Array<number>(world.firms.count[0]).fill(0);
  for (let h = 0; h < world.agents.count[0]; h++) {
    const firm = world.agents.employer[h];
    if (firm >= 0) counts[firm]++;
  }
  return counts;
}

// Every firm's employees column against the households that name it, which is the sum rule firm by firm.
function expectCounted(world: World, label: string): void {
  expect(Array.from(world.firms.employees.subarray(0, world.firms.count[0])), label).toEqual(headcounts(world));
}

function reservationWagesOf(world: World, households: number): number[] {
  return Array.from(world.agents.reservationWage.subarray(0, households));
}

describe('updateReservationWages', () => {
  it('raises a reservation wage to the pay received, and lowers it only for the unemployed', () => {
    const world = labourWorld(4, 1);
    [100, 150, 200].forEach((wage, h) => {
      employ(world, h, 0);
      world.agents.reservationWage[h] = wage;
    });
    world.agents.reservationWage[3] = 100;
    world.economyScratch.pay[0] = 150;

    updateReservationWages(world, LENGNICK);

    // Pay of 150 lifts 100, meets 150 and sits under 200, which an employed household keeps. The unemployed one falls 10%.
    expect(reservationWagesOf(world, 4)).toEqual([150, 150, 200, 90]);
  });

  it('cuts an unemployed reservation wage by 10% a month, rounded down', () => {
    const world = labourWorld(1, 1);
    world.agents.reservationWage[0] = 142_800;
    const months: number[] = [];
    for (let month = 0; month < 3; month++) {
      updateReservationWages(world, LENGNICK);
      months.push(world.agents.reservationWage[0]);
    }
    // 142,800 - 14,280, then - 12,852, then - 11,566 (11,566.8 rounded down).
    expect(months).toEqual([128_520, 115_668, 104_102]);
  });

  it('leaves a reservation wage as it is when the cut would be under a cent', () => {
    const world = labourWorld(3, 1);
    [10, 9, 0].forEach((wage, h) => {
      world.agents.reservationWage[h] = wage;
    });
    updateReservationWages(world, LENGNICK);
    expect(reservationWagesOf(world, 3)).toEqual([9, 9, 0]);
    expect(Object.is(world.agents.reservationWage[2], 0)).toBe(true);
  });

  it('cuts by the parameter', () => {
    const world = labourWorld(1, 1);
    world.agents.reservationWage[0] = 100;
    updateReservationWages(world, { ...LENGNICK, reservationCutPpm: 250_000 });
    expect(world.agents.reservationWage[0]).toBe(75);
  });
});

// Firm 0 has five workers (households 0-4) and a notice, firm 1 four workers (5-8) and none, firm 2 a notice and nobody.
function seatNoticeWorld(world: World): void {
  clearJobs(world);
  for (let h = 0; h < 5; h++) employ(world, h, 0);
  for (let h = 5; h < 9; h++) employ(world, h, 1);
  world.firms.notice[0] = 1;
  world.firms.notice[2] = 1;
}

function laidOff(world: World, households: number): number[] {
  return Array.from({ length: households }, (_, h) => h).filter((h) => world.agents.employer[h] === NO_FIRM);
}

describe('fireOnNotice', () => {
  it('lays off one worker of a firm with a notice, and clears every notice', () => {
    const world = labourWorld(12, 3);
    seatNoticeWorld(world);
    // A tally left over from an earlier call must not matter.
    world.economyScratch.firmTally.fill(7);

    fireOnNotice(world, 0);

    const gone = laidOff(world, 9);
    expect(gone).toHaveLength(1);
    expect(gone[0]).toBeLessThan(5);
    expect(Array.from(world.firms.employees.subarray(0, 3))).toEqual([4, 4, 0]);
    expect(Array.from(world.firms.notice.subarray(0, 3))).toEqual([0, 0, 0]);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(1);
    expectCounted(world, 'after the notice');
  });

  it('lays off one worker from each firm that has a notice, and only from those', () => {
    const world = labourWorld(100, 20);
    clearJobs(world);
    for (let h = 0; h < 100; h++) employ(world, h, h % 20);
    for (let f = 0; f < 20; f += 2) world.firms.notice[f] = 1;

    fireOnNotice(world, 3);

    expect(Array.from(world.firms.employees.subarray(0, 20))).toEqual(Array.from({ length: 20 }, (_, f) => (f % 2 === 0 ? 4 : 5)));
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(10);
    expectCounted(world, 'after ten notices');
  });

  it('lays off the only worker of a small firm', () => {
    const world = labourWorld(2, 1);
    clearJobs(world);
    employ(world, 1, 0);
    world.firms.notice[0] = 1;
    fireOnNotice(world, 0);
    expect(world.agents.employer[1]).toBe(NO_FIRM);
    expect(world.firms.employees[0]).toBe(0);
  });

  it('picks the same worker for the same keys, and each worker about equally often across months', () => {
    const world = labourWorld(12, 3);
    const picks = new Array<number>(5).fill(0);
    for (let month = 0; month < 500; month++) {
      seatNoticeWorld(world);
      fireOnNotice(world, month);
      const first = laidOff(world, 9);
      seatNoticeWorld(world);
      fireOnNotice(world, month);
      expect(laidOff(world, 9), `month ${month}`).toEqual(first);
      picks[first[0]]++;
    }
    // 100 expected from each of five, with an SD of 8.9, so within 45 either side.
    for (const count of picks) {
      expect(count).toBeGreaterThan(55);
      expect(count).toBeLessThan(145);
    }
  });
});

describe('searchJobs', () => {
  const FIRMS = 6;

  it('hires an unemployed household at the first sampled vacancy that pays its reservation wage', () => {
    const world = labourWorld(1, FIRMS);
    // Firm f pays 80 + 10 f and the household wants 100. Firms 1, 2, 4 and 5 are hiring, and 2, 4 and 5 pay enough.
    for (let f = 0; f < FIRMS; f++) world.firms.wage[f] = 80 + 10 * f;
    const hiring = [1, 2, 4, 5];
    const qualifies = (f: number): boolean => hiring.includes(f) && world.firms.wage[f] >= 100;
    let hired = 0;
    for (const searches of [1, 5]) {
      for (let month = 0; month < 300; month++) {
        clearJobs(world);
        world.agents.reservationWage[0] = 100;
        for (const f of hiring) world.firms.vacancy[f] = 1;

        searchJobs(world, { ...LENGNICK, jobSearches: searches }, month);

        const sampled = Array.from({ length: searches }, (_, k) => sampledFirm(42, month, 0, k, FIRMS));
        const expected = sampled.find(qualifies) ?? NO_FIRM;
        const label = `searches ${searches}, month ${month}`;
        expect(world.agents.employer[0], label).toBe(expected);
        expect(world.economyScratch.stats[STAT_HIRES], label).toBe(expected === NO_FIRM ? 0 : 1);
        expect(Array.from(world.firms.vacancy.subarray(0, FIRMS)), label).toEqual(
          Array.from({ length: FIRMS }, (_, f) => (hiring.includes(f) && f !== expected ? 1 : 0)),
        );
        expectCounted(world, label);
        if (expected !== NO_FIRM) hired++;
      }
    }
    // Both the hit and the miss happen, so the loop is not passing on a constant.
    expect(hired).toBeGreaterThan(200);
    expect(hired).toBeLessThan(600);
  });

  it('accepts a wage equal to its reservation wage, and refuses one cent less', () => {
    const world = labourWorld(1, FIRMS);
    world.firms.vacancy.fill(1, 0, FIRMS);
    world.agents.reservationWage[0] = 101;
    searchJobs(world, LENGNICK, 0);
    expect(world.agents.employer[0]).toBe(NO_FIRM);
    expect(world.economyScratch.stats[STAT_HIRES]).toBe(0);

    world.agents.reservationWage[0] = 100;
    searchJobs(world, LENGNICK, 0);
    expect(world.agents.employer[0]).toBe(sampledFirm(42, 0, 0, 0, FIRMS));
    expect(world.economyScratch.stats[STAT_HIRES]).toBe(1);
  });

  it('fills each vacancy once, however many households ask', () => {
    const world = labourWorld(60, 3);
    world.firms.vacancy.fill(1, 0, 3);

    searchJobs(world, LENGNICK, 0);

    expect(Array.from(world.firms.employees.subarray(0, 3))).toEqual([1, 1, 1]);
    expect(Array.from(world.firms.vacancy.subarray(0, 3))).toEqual([0, 0, 0]);
    expect(world.economyScratch.stats[STAT_HIRES]).toBe(3);
    expectCounted(world, 'after the search');
  });

  it('serves households in a different order each month, never by index', () => {
    const world = labourWorld(20, 1);
    const wins = new Array<number>(20).fill(0);
    for (let month = 0; month < 400; month++) {
      clearJobs(world);
      world.firms.vacancy[0] = 1;
      searchJobs(world, LENGNICK, month);
      wins[world.agents.employer.indexOf(0)]++;
    }
    // 20 expected for each of 20 households, with an SD of 4.4. By index, household 0 would win all 400.
    expect(wins[0]).toBeLessThan(45);
    expect(Math.min(...wins)).toBeGreaterThan(0);
  });

  it('moves an employed household only to a strictly higher wage', () => {
    const world = labourWorld(1, 4);
    // Firm 0 pays 100 and the household wants 150, so it looks every month. The others pay 90, 100 and 120.
    [100, 90, 100, 120].forEach((wage, f) => {
      world.firms.wage[f] = wage;
    });
    const neverByChance = { ...LENGNICK, onJobSearchPpm: 0 };
    let moved = 0;
    for (let month = 0; month < 100; month++) {
      clearJobs(world);
      employ(world, 0, 0);
      world.agents.reservationWage[0] = 150;
      world.firms.vacancy.fill(1, 0, 4);

      searchJobs(world, neverByChance, month);

      const goesTo = sampledFirm(42, month, 0, 0, 4) === 3 ? 3 : 0;
      const label = `month ${month}`;
      expect(world.agents.employer[0], label).toBe(goesTo);
      expect(Array.from(world.firms.employees.subarray(0, 4)), label).toEqual(goesTo === 3 ? [0, 0, 0, 1] : [1, 0, 0, 0]);
      expect(world.firms.vacancy[3], label).toBe(goesTo === 3 ? 0 : 1);
      expect(world.economyScratch.stats[STAT_SWITCHES], label).toBe(goesTo === 3 ? 1 : 0);
      expect(world.economyScratch.stats[STAT_HIRES], label).toBe(0);
      if (goesTo === 3) moved++;
    }
    expect(moved).toBeGreaterThan(5);
    expect(moved).toBeLessThan(60);
  });

  it('does not look for a job while paid its reservation wage, unless the chance says so', () => {
    const world = labourWorld(1, 4);
    [100, 120, 120, 120].forEach((wage, f) => {
      world.firms.wage[f] = wage;
    });
    const movedAt = (onJobSearchPpm: number, month: number): boolean => {
      clearJobs(world);
      employ(world, 0, 0);
      world.agents.reservationWage[0] = 100;
      world.firms.vacancy.fill(1, 0, 4);
      searchJobs(world, { ...LENGNICK, onJobSearchPpm }, month);
      return world.agents.employer[0] !== 0;
    };
    let movedWhenAlwaysLooking = 0;
    for (let month = 0; month < 60; month++) {
      expect(movedAt(0, month), `month ${month} at chance 0`).toBe(false);
      // At a chance of 1 it looks every month, and moves whenever the one firm it samples is not its own.
      const moved = movedAt(PPM, month);
      expect(moved, `month ${month} at chance 1`).toBe(sampledFirm(42, month, 0, 0, 4) !== 0);
      if (moved) movedWhenAlwaysLooking++;
    }
    expect(movedWhenAlwaysLooking).toBeGreaterThan(30);
  });

  it('looks on the job with the chance π, a tenth by default', () => {
    // 2,000 workers paid exactly their reservation wage at firm 0, and 999 other firms each with a vacancy at a higher wage.
    const switchesAt = (params: EconomyParams): number => {
      const world = labourWorld(2_000, 1_000, 100);
      world.firms.wage.fill(120, 1, 1_000);
      world.firms.vacancy.fill(1, 1, 1_000);
      for (let h = 0; h < 2_000; h++) {
        employ(world, h, 0);
        world.agents.reservationWage[h] = 100;
      }
      searchJobs(world, params, 0);
      expectCounted(world, `chance ${params.onJobSearchPpm}`);
      return world.economyScratch.stats[STAT_SWITCHES];
    };

    expect(switchesAt({ ...LENGNICK, onJobSearchPpm: 0 })).toBe(0);
    // About 200 look, and the 999 vacancies take 999 x (1 - e^-0.2) = 181 of them, with an SD near 14.
    const tenth = switchesAt(LENGNICK);
    expect(tenth).toBeGreaterThan(130);
    expect(tenth).toBeLessThan(235);
    // All 2,000 look, and 999 x (1 - e^-2) = 864 vacancies are hit, with an SD near 11.
    const all = switchesAt({ ...LENGNICK, onJobSearchPpm: PPM });
    expect(all).toBeGreaterThan(800);
    expect(all).toBeLessThan(930);
  });
});

describe('sampledFirm', () => {
  const firmsAt = (month: number, sample: number): number[] =>
    Array.from({ length: 300 }, (_, h) => sampledFirm(42, month, h, sample, 100));

  it('is a firm row, drawn from the month, the household and the sample', () => {
    const draws = firmsAt(7, 0);
    expect(draws.every((f) => f >= 0 && f < 100)).toBe(true);
    expect(new Set(draws).size).toBeGreaterThan(60);
    expect(firmsAt(7, 0)).toEqual(draws);
    expect(firmsAt(8, 0)).not.toEqual(draws);
    expect(firmsAt(7, 1)).not.toEqual(draws);
  });

  it('keys the draw on (month, household, sample, purpose 1) of LABOUR_DRAW, which a replay depends on', () => {
    for (const [month, household, sample] of [[7, 3, 2], [0, 0, 0], [251, 9_999, 4]]) {
      expect(sampledFirm(42, month, household, sample, 1_000)).toBe(draw4(42, LABOUR_DRAW, month, household, sample, 1) % 1_000);
    }
  });
});

const MONTH_HOUSEHOLDS = 200;
const MONTH_FIRMS = 20;

// A month's labour calls in the order the economy day runs them, with a keyed vacancy, notice and wage for each firm.
function runMonths(world: World, months: number, afterEach: (month: number, call: string) => void): void {
  for (let month = 0; month < months; month++) {
    for (let f = 0; f < MONTH_FIRMS; f++) {
      world.firms.vacancy[f] = draw3(5, 1, month, f, 0) % 3 === 0 ? 1 : 0;
      world.firms.notice[f] = draw3(5, 2, month, f, 0) % 5 === 0 ? 1 : 0;
      world.firms.wage[f] = 80 + (draw3(5, 3, month, f, 0) % 50);
    }
    searchJobs(world, LENGNICK, month);
    afterEach(month, 'searchJobs');
    payWages(world);
    afterEach(month, 'payWages');
    updateReservationWages(world, LENGNICK);
    afterEach(month, 'updateReservationWages');
    fireOnNotice(world, month);
    afterEach(month, 'fireOnNotice');
  }
}

function fundedMonthWorld(): World {
  const world = labourWorld(MONTH_HOUSEHOLDS, MONTH_FIRMS);
  for (let f = 0; f < MONTH_FIRMS; f++) issue(world.cash, firmAccount(world.cash, f), 20_000_000);
  return world;
}

describe('a month of labour calls', () => {
  it("keeps every firm's employees equal to the households that name it, and the cash balanced, after every call", () => {
    const world = fundedMonthWorld();
    runMonths(world, 30, (month, call) => {
      expectCounted(world, `month ${month} ${call}`);
      expect(checkCash(world.cash), `month ${month} ${call}`).toBe(OK);
    });
    const stats = world.economyScratch.stats;
    expect(stats[STAT_HIRES]).toBeGreaterThan(50);
    expect(stats[STAT_SWITCHES]).toBeGreaterThan(0);
    expect(stats[STAT_FIRINGS]).toBeGreaterThan(50);
  });

  it('replays to one state hash', () => {
    const hashes = [0, 1].map(() => {
      const world = fundedMonthWorld();
      runMonths(world, 30, () => undefined);
      return stateHash(world);
    });
    expect(hashes[1]).toBe(hashes[0]);
  });
});
