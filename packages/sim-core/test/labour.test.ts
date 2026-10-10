import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import {
  STAT_FIRINGS,
  STAT_HIRES,
  STAT_JOB_VISITS,
  STAT_LONG_SPELLS,
  STAT_SPELL_MONTHS,
  STAT_SWITCHES,
  recordMonth,
} from '../src/economy/stats.ts';
import { layOff, layOffExiting } from '../src/labour/layoffs.ts';
import { fireOnNotice } from '../src/labour/notice.ts';
import { updateReservationWages } from '../src/labour/reservation.ts';
import { isSlowSearcher, sampledFirm, searchJobs } from '../src/labour/search.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { firmAccount, issue } from '../src/money/ledger.ts';
import { PPM } from '../src/money/ppm.ts';
import { draw2, draw3, draw4 } from '../src/random/draw.ts';
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

// Pearson's test of independence on a rows x cols table, with expected counts from its margins.
function chiSquaredIndependence(table: Uint32Array, rows: number, cols: number, total: number): number {
  const rowSums = new Float64Array(rows);
  const colSums = new Float64Array(cols);
  for (let i = 0; i < table.length; i++) {
    rowSums[Math.floor(i / cols)] += table[i];
    colSums[i % cols] += table[i];
  }
  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    const expected = (rowSums[Math.floor(i / cols)] * colSums[i % cols]) / total;
    const diff = table[i] - expected;
    sum += (diff * diff) / expected;
  }
  return sum;
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
        // A visit counts for each firm looked at, the one that hires included, and the search stops there.
        expect(world.economyScratch.stats[STAT_JOB_VISITS], label).toBe(expected === NO_FIRM ? searches : sampled.indexOf(expected) + 1);
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

  it('makes every searcher look at all its sampled firms when none will hire it', () => {
    const world = labourWorld(3, FIRMS);
    searchJobs(world, LENGNICK, 0);
    expect(world.economyScratch.stats[STAT_JOB_VISITS]).toBe(3 * LENGNICK.jobSearches);
    expect(world.economyScratch.stats[STAT_HIRES]).toBe(0);
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
      expect(world.economyScratch.stats[STAT_JOB_VISITS], label).toBe(0);
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

  it('zeroes the spell count of each person it hires, and leaves one it does not hire as it was', () => {
    const world = labourWorld(2, FIRMS);
    world.firms.vacancy.fill(1, 0, FIRMS);
    // Every firm pays 100, so only the first person, who wants no more, is hired.
    world.agents.reservationWage[0] = 100;
    world.agents.reservationWage[1] = 101;
    world.economyScratch.spellMonths.set([7, 7]);

    searchJobs(world, LENGNICK, 0);

    expect([world.agents.employer[0] !== NO_FIRM, world.agents.employer[1]]).toEqual([true, NO_FIRM]);
    expect(Array.from(world.economyScratch.spellMonths.subarray(0, 2))).toEqual([0, 7]);
  });

  it('starts a new spell for someone hired and laid off within the same month', () => {
    const world = labourWorld(1, FIRMS);
    world.firms.vacancy.fill(1, 0, FIRMS);
    world.economyScratch.spellMonths[0] = 9;

    searchJobs(world, LENGNICK, 0);
    layOff(world, 1, 0);
    recordMonth(world);

    // The month end opens a spell with no whole month behind it, where the old count would have made it the tenth.
    const { spellMonths, stats } = world.economyScratch;
    expect([spellMonths[0], stats[STAT_SPELL_MONTHS], stats[STAT_LONG_SPELLS]]).toEqual([1, 0, 0]);
  });
});

// The unemployed searcher's visits when nobody is hiring: all of them, whatever its reach.
function visitsOf(world: World, person: number, params: EconomyParams, month = 0): number {
  world.agents.employer[person] = NO_FIRM;
  world.firms.employees[0]--;
  world.economyScratch.stats.fill(0);
  searchJobs(world, params, month);
  const visits = world.economyScratch.stats[STAT_JOB_VISITS];
  employ(world, person, 0);
  return visits;
}

// People 0 to people - 1 all work at firm 0, so a person who loses the job is the only unemployed searcher.
function workingWorld(people: number): World {
  const world = labourWorld(people, 6);
  clearJobs(world);
  for (let h = 0; h < people; h++) employ(world, h, 0);
  return world;
}

describe('the slow searchers', () => {
  const PEOPLE = 300;
  const SLOW: EconomyParams = { ...LENGNICK, slowSearcherPpm: 300_000, slowJobSearches: 1 };
  const slowByDraw = (person: number, share: number): boolean => draw2(42, LABOUR_DRAW, person, 4) % PPM < share;

  it('visit at most slowJobSearches firms while everyone else visits jobSearches', () => {
    const world = workingWorld(PEOPLE);
    let slow = 0;
    for (let person = 0; person < PEOPLE; person++) {
      const visits = visitsOf(world, person, SLOW);
      expect(visits, `person ${person}`).toBe(slowByDraw(person, SLOW.slowSearcherPpm) ? SLOW.slowJobSearches : SLOW.jobSearches);
      if (visits === SLOW.slowJobSearches) slow++;
    }
    // A share of 300,000 ppm is 90 of 300, with an SD of 8.
    expect(slow).toBeGreaterThan(60);
    expect(slow).toBeLessThan(120);
  });

  it('are nobody at a share of 0 and everybody at a share of 1,000,000', () => {
    const world = workingWorld(50);
    for (let person = 0; person < 50; person++) {
      expect(visitsOf(world, person, { ...SLOW, slowSearcherPpm: 0 }), `person ${person}`).toBe(SLOW.jobSearches);
      expect(visitsOf(world, person, { ...SLOW, slowSearcherPpm: PPM }), `person ${person}`).toBe(SLOW.slowJobSearches);
    }
  });

  it('keep their reach for life, month after month', () => {
    const world = workingWorld(100);
    const reach = (month: number): number[] => Array.from({ length: 100 }, (_, person) => visitsOf(world, person, SLOW, month));
    const first = reach(0);
    expect(first).toContain(SLOW.slowJobSearches);
    for (const month of [1, 2, 17, 400]) expect(reach(month), `month ${month}`).toEqual(first);
  });

  it('are drawn from the person and purpose 4 of LABOUR_DRAW alone, which a replay depends on', () => {
    for (const seed of [1, 42, 0xffff_ffff]) {
      for (const person of [0, 1, 7, 9_999]) {
        expect(isSlowSearcher(seed, person, 300_000), `seed ${seed}, person ${person}`).toBe(
          draw2(seed, LABOUR_DRAW, person, 4) % PPM < 300_000,
        );
      }
    }
    expect(isSlowSearcher(42, 3, 0)).toBe(false);
    expect(isSlowSearcher(42, 3, PPM)).toBe(true);
  });

  it("do not depend on a look, a culture, a home, a wallet or a reservation wage", () => {
    const world = workingWorld(PEOPLE);
    const { agents, households, cash } = world;
    const reach = (): number[] => Array.from({ length: PEOPLE }, (_, person) => visitsOf(world, person, SLOW));
    const before = reach();
    for (let person = 0; person < PEOPLE; person++) {
      agents.look[person] = (person * 37 + 11) % 96;
      agents.culture[person] = (person * 5 + 1) % 4;
      agents.birthCulture[person] = (person * 3 + 2) % 4;
      agents.customs[person] = 0x3210 + person;
      agents.homeRegion[person] = person % 17;
      households.size[person] = 1 + (person % 5);
      cash.balance[cash.firstWallet + person] = 1_000 * person * person;
      agents.reservationWage[person] = 50 + person;
    }
    expect(reach()).toEqual(before);
  });

  it('are spread evenly over looks and cultures, and are not shared by neighbouring people', () => {
    const people = 10_000;
    const { agents } = createWorld(42, 'phone', undefined, people);
    const hues = 6;
    const cultures = 4;
    const byHue = new Uint32Array(hues * 2);
    const byCulture = new Uint32Array(cultures * 2);
    const pairs = new Uint32Array(4);
    for (let person = 0; person < people; person++) {
      const slow = isSlowSearcher(42, person, 300_000) ? 1 : 0;
      byHue[(agents.look[person] % hues) * 2 + slow]++;
      byCulture[agents.culture[person] * 2 + slow]++;
      if (person % 2 === 0) pairs[slow * 2 + (isSlowSearcher(42, person + 1, 300_000) ? 1 : 0)]++;
    }
    // Pearson's test of independence at p = 0.001: 5, 3 and 1 degrees of freedom.
    expect(chiSquaredIndependence(byHue, hues, 2, people)).toBeLessThan(20.52);
    expect(chiSquaredIndependence(byCulture, cultures, 2, people)).toBeLessThan(16.27);
    expect(chiSquaredIndependence(pairs, 2, 2, people / 2)).toBeLessThan(10.83);
    const slowShare = (byHue[1] + byHue[3] + byHue[5] + byHue[7] + byHue[9] + byHue[11]) / people;
    expect(slowShare).toBeGreaterThan(0.28);
    expect(slowShare).toBeLessThan(0.32);
  });

  it('are named in no code that draws a look, reads a culture or renders a body', () => {
    const roots = [
      '../../sim-culture/src',
      '../src/consumption',
      '../src/agents',
      '../../sim-protocol/src/snapshot',
      '../../render-gl/src',
    ];
    const trait = /slowSearcher|isSlowSearcher|slowJobSearches|SLOW_SEARCHER|LABOUR_DRAW/;
    let scanned = 0;
    for (const root of roots) {
      const dir = fileURLToPath(new URL(root, import.meta.url));
      for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
        if (!file.endsWith('.ts')) continue;
        expect(readFileSync(`${dir}/${file}`, 'utf8'), `${root}/${file}`).not.toMatch(trait);
        scanned++;
      }
    }
    expect(scanned).toBeGreaterThan(20);
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

describe('layOff', () => {
  const PEOPLE = 200;
  const FIRMS = 20;

  function crowdedWorld(): World {
    const world = labourWorld(PEOPLE, FIRMS);
    clearJobs(world);
    for (let h = 0; h < PEOPLE; h++) employ(world, h, h % FIRMS);
    return world;
  }

  it('lays off exactly count employed people, counts them as firings and keeps every headcount', () => {
    const world = crowdedWorld();
    layOff(world, 50, 1_000);
    expect(laidOff(world, PEOPLE)).toHaveLength(50);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(50);
    expect(Array.from(world.firms.employees.subarray(0, FIRMS)).reduce((sum, staff) => sum + staff, 0)).toBe(PEOPLE - 50);
    expectCounted(world, 'after the shock');
  });

  it('adds to the firings already counted that day', () => {
    const world = crowdedWorld();
    world.economyScratch.stats[STAT_FIRINGS] = 4;
    layOff(world, 10, 3);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(14);
  });

  it('picks the same people for the same seed and day, and others on another day', () => {
    const [first, again, other] = [1_000, 1_000, 1_001].map((day) => {
      const world = crowdedWorld();
      layOff(world, 50, day);
      return laidOff(world, PEOPLE);
    });
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it('lays off every employed person when count is larger, and leaves the unemployed alone', () => {
    const world = crowdedWorld();
    for (let h = 0; h < 20; h++) {
      world.agents.employer[h] = NO_FIRM;
      world.firms.employees[h % FIRMS]--;
    }
    layOff(world, 1_000, 7);
    expect(laidOff(world, PEOPLE)).toHaveLength(PEOPLE);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(PEOPLE - 20);
    expect(Array.from(world.firms.employees.subarray(0, FIRMS))).toEqual(new Array(FIRMS).fill(0));
  });

  it('lays nobody off for a count of 0', () => {
    const world = crowdedWorld();
    layOff(world, 0, 7);
    expect(laidOff(world, PEOPLE)).toEqual([]);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(0);
  });

  it('picks in a keyed order, so each person goes about equally often and not the first in the index', () => {
    const world = crowdedWorld();
    const picks = new Array<number>(PEOPLE).fill(0);
    for (let day = 0; day < 400; day++) {
      clearJobs(world);
      for (let h = 0; h < PEOPLE; h++) employ(world, h, h % FIRMS);
      layOff(world, 20, day);
      for (const person of laidOff(world, PEOPLE)) picks[person]++;
    }
    // 40 expected for each person, with an SD of 6.
    expect(Math.min(...picks)).toBeGreaterThan(10);
    expect(Math.max(...picks)).toBeLessThan(75);
  });
});

describe('layOffExiting', () => {
  function crowdedWorld(): World {
    const world = labourWorld(40, 4);
    clearJobs(world);
    for (let h = 0; h < 40; h++) employ(world, h, h % 4);
    return world;
  }

  it('lays off everyone at a firm marked as exiting, counts them, and empties those firms', () => {
    const world = crowdedWorld();
    world.economyScratch.exiting[1] = 1;
    world.economyScratch.exiting[3] = 1;
    layOffExiting(world);
    expect(laidOff(world, 40)).toEqual(Array.from({ length: 20 }, (_, i) => 1 + 2 * i));
    expect(Array.from(world.firms.employees.subarray(0, 4))).toEqual([10, 0, 10, 0]);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(20);
    expectCounted(world, 'after the exits');
  });

  it('reads only the firms the store counts', () => {
    const world = crowdedWorld();
    world.economyScratch.exiting[4] = 1;
    layOffExiting(world);
    expect(laidOff(world, 40)).toEqual([]);
  });

  it('changes nothing when no firm is marked', () => {
    const world = crowdedWorld();
    const before = stateHash(world);
    layOffExiting(world);
    expect(stateHash(world)).toBe(before);
    expect(world.economyScratch.stats[STAT_FIRINGS]).toBe(0);
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
