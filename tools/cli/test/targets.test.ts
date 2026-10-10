import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bandMiss, inBand, judge, judgeEverySeed, median, tQuantile95 } from '../src/targets/judge.ts';
import { runTargets } from '../src/targets/run.ts';
import {
  SUMMARY_COLUMNS,
  summarize,
  type SummaryColumn,
  type SummaryColumns,
  type SummaryMeta,
  type TargetValues,
} from '../src/targets/summarize.ts';
import { TARGETS, type TargetId } from '../src/targets/targets.ts';

const MONTH = 21;
const PEOPLE = 1000;
const FIRMS = 100;
const OPENING_PRICE = 3200;
// Twelve whole months and five days of a thirteenth. Months 0 to 5 are the warm-up, so the window is months 6 to 11, and
// the only year end inside it is day 223. Day 111, the year end before it, sits in the warm-up.
const WARM_UP_DAYS = 6 * MONTH;
const DAYS = 12 * MONTH + 5;
const YEAR_END = 223;
const GARBAGE = 1e9;
const MID_MONTH_NOISE = 7_000_000;

const META: SummaryMeta = {
  size: PEOPLE,
  days: DAYS,
  warmUpDays: WARM_UP_DAYS,
  params: { firms: FIRMS, openingPrice: OPENING_PRICE },
};

// Each array runs over the window's months, 6 to 11. Month totals sit on the first or last day of the month, as the
// flow log writes them, and sales and output are spread over its days. Levels, sales_units and produced have seven
// entries, the first being month 5, which month 6 starts from and compares its output with; levels are read only on a
// month's last day.
type Plan = Record<Exclude<SummaryColumn, 'stayers' | 'stayer_cuts'>, number[]>;

const ON_FIRST_DAY = ['price_changes', 'price_change_ppm', 'hires', 'switches', 'job_visits', 'above_markup'] as const;
const ON_LAST_DAY = ['firings', 'wage_bill', 'exits', 'spell_months', 'long_spells'] as const;
const LEVELS = ['unemployed', 'vacancies', 'price_mean', 'wage_mean', 'stock', 'size_squares', 'size_cubes'] as const;

const UNEMPLOYED = [50, 60, 70, 80, 60, 50, 40];
// Wages fall by 0.05 minus the unemployment rate, vacancy rates are 0.10 minus it, and output grows by ten times the fall
// in it, so each correlation is exactly -1 when it pairs the right months. Sales stay flat, so Okun is -1 only if it
// reads the units produced.
const WAGE_MEAN = chain(100_000, (previous, i) => previous * (1.05 - UNEMPLOYED[i] / PEOPLE));
const PRODUCED = chain(210_000, (previous, i) => previous * (1 - (10 * (UNEMPLOYED[i] - UNEMPLOYED[i - 1])) / PEOPLE));
const SALES_UNITS = UNEMPLOYED.map(() => 210_000);
const STOCK_PER_SALES = [1, 1, 1.2, 0.8, 1, 1, 1];
// One firm in a hundred is big in some months and two in others; the rest hold 5. Skew then depends only on that share.
const BIG_FIRMS = [1, 1, 2, 1, 2, 1, 2];
const SMALL_SIZE = 5;

function chain(first: number, next: (previous: number, index: number) => number): number[] {
  const values = [first];
  for (let i = 1; i < UNEMPLOYED.length; i++) values.push(next(values[i - 1], i));
  return values;
}

function sizeSums(power: number): number[] {
  return UNEMPLOYED.map((unemployed, i) => {
    const big = (PEOPLE - unemployed - (FIRMS - BIG_FIRMS[i]) * SMALL_SIZE) / BIG_FIRMS[i];
    return (FIRMS - BIG_FIRMS[i]) * SMALL_SIZE ** power + BIG_FIRMS[i] * big ** power;
  });
}

const BASE: Plan = {
  price_changes: [8, 10, 12, 10, 9, 11],
  price_change_ppm: [160_000, 200_000, 240_000, 200_000, 180_000, 220_000],
  hires: [12.5, 15, 17.5, 20, 15, 12.5],
  switches: [11, 14, 16, 18, 14, 11.5],
  job_visits: [100, 120, 140, 160, 120, 100],
  above_markup: [6, 9, 12, 9, 6, 12],
  firings: [8, 9, 10, 9, 8, 6],
  wage_bill: [1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000],
  exits: [1, 2, 1, 2, 1, 2],
  spell_months: [330, 385, 440, 330, 275, 220],
  long_spells: [18, 21, 24, 18, 15, 12],
  sales_cents: [1_302_000, 1_386_000, 1_470_000, 1_386_000, 1_386_000, 1_386_000],
  sales_units: SALES_UNITS,
  produced: PRODUCED,
  unemployed: UNEMPLOYED,
  vacancies: UNEMPLOYED.map((n) => {
    const rate = 0.1 - n / PEOPLE;
    return (rate * (PEOPLE - n)) / (1 - rate);
  }),
  price_mean: [3200, 3200, 3300, 3100, 3200, 3400, 3000],
  wage_mean: WAGE_MEAN,
  stock: SALES_UNITS.map((units, i) => STOCK_PER_SALES[i] * units),
  size_squares: sizeSums(2),
  size_cubes: sizeSums(3),
};

function zeroColumns(): Record<SummaryColumn, Float64Array> {
  return Object.fromEntries(SUMMARY_COLUMNS.map((name) => [name, new Float64Array(DAYS)])) as Record<SummaryColumn, Float64Array>;
}

function build(plan: Plan): SummaryColumns {
  const columns = zeroColumns();
  for (let j = 0; j < 6; j++) {
    const first = (6 + j) * MONTH;
    for (const name of ON_FIRST_DAY) columns[name][first] = plan[name][j];
    for (const name of ON_LAST_DAY) columns[name][first + MONTH - 1] = plan[name][j];
    columns.sales_cents.fill(plan.sales_cents[j] / MONTH, first, first + MONTH);
  }
  for (let i = 0; i < 7; i++) {
    const first = (5 + i) * MONTH;
    columns.sales_units.fill(plan.sales_units[i] / MONTH, first, first + MONTH);
    columns.produced.fill(plan.produced[i] / MONTH, first, first + MONTH);
    for (const name of LEVELS) {
      columns[name].fill(MID_MONTH_NOISE, first, first + MONTH - 1);
      columns[name][first + MONTH - 1] = plan[name][i];
    }
  }
  columns.stayers[YEAR_END] = 500;
  columns.stayer_cuts[YEAR_END] = 10;
  return columns;
}

// Junk in everything the window must not read: months 0 to 4, month 5 but for the last-day levels and its sales, which
// month 6 compares with, and the partial month after the window.
function polluted(columns: SummaryColumns): SummaryColumns {
  const copy = Object.fromEntries(SUMMARY_COLUMNS.map((name) => [name, Float64Array.from(columns[name])])) as Record<
    SummaryColumn,
    Float64Array
  >;
  for (const name of SUMMARY_COLUMNS) {
    copy[name].fill(GARBAGE, 0, 5 * MONTH);
    copy[name].fill(GARBAGE, 12 * MONTH);
  }
  for (const name of [...ON_FIRST_DAY, ...ON_LAST_DAY, 'sales_cents', 'stayers', 'stayer_cuts'] as const) {
    copy[name].fill(GARBAGE, 5 * MONTH, WARM_UP_DAYS);
  }
  copy.stayers[111] = GARBAGE;
  copy.stayer_cuts[111] = GARBAGE;
  return copy;
}

const SKEW_ONE_IN_100 = 0.98 / Math.sqrt(0.01 * 0.99);
const SKEW_TWO_IN_100 = 0.96 / Math.sqrt(0.02 * 0.98);

// Sums are worked out in the comments: 60 price changes in 600 firm-months, 370 unemployed at the months' starts and
// 5,630 employed, 360 unemployed at their ends.
const EXPECTED: TargetValues = {
  price_change_share: 60 / 600,
  stayer_cut_share: 10 / 500,
  job_finding: 92.5 / 370,
  unemployment_mean: 0.06,
  markup: 8_316_000 / 6_000_000,
  stock_months: 1,
  price_ratio: 1,
  hires_rate: (92.5 + 84.5) / 5630,
  layoff_rate: 50 / 5630,
  job_to_job: 84.5 / 5630,
  exit_rate: 9 / 600,
  long_spell_share: 108 / 360,
  mean_spell_months: 1980 / 360,
  unemployment_sd: Math.sqrt(0.0002),
  phillips: -1,
  okun: -1,
  beveridge: -1,
  size_skew: (SKEW_ONE_IN_100 + SKEW_TWO_IN_100) / 2,
  no_crisis: 1,
  price_change_size: 20_000,
  above_markup_share: 54 / 600,
  visit_success: 92.5 / 740,
};

function expectValues(actual: TargetValues, expected: TargetValues): void {
  for (const target of TARGETS) {
    expect(actual[target.id], target.id).toBeCloseTo(expected[target.id], 10);
  }
}

describe('the target table', () => {
  it('holds six tier-1, seven tier-2 and six tier-3 targets, and three reported measures', () => {
    const inTier = (tier: number | string): number => TARGETS.filter((target) => target.tier === tier).length;
    expect([1, 2, 3, 'reported'].map(inTier)).toEqual([6, 7, 6, 3]);
  });

  it('keeps the pay-cut target out of the tier-1 filter, since closed money makes cuts balance raises', () => {
    expect(TARGETS.find((target) => target.id === 'stayer_cut_share')?.tier).toBe(2);
  });

  it('names every target once, with low below high on a band', () => {
    const ids = TARGETS.map((target) => target.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const target of TARGETS) {
      if (target.rule === 'band') expect(target.low, target.id).toBeLessThan(target.high);
    }
  });

  it('reads 23 columns, each named once', () => {
    expect(SUMMARY_COLUMNS).toHaveLength(23);
    expect(new Set(SUMMARY_COLUMNS).size).toBe(23);
  });
});

describe('summarize', () => {
  it('returns every target\'s known value for a built run', () => {
    const values = summarize(build(BASE), META);
    expect(Object.keys(values).sort()).toEqual(TARGETS.map((target) => target.id).sort());
    expectValues(values, EXPECTED);
  });

  it('measures Okun on the units produced, whatever the units sold do', () => {
    const jaggedSales = { ...BASE, sales_units: [210_000, 90_000, 400_000, 100_000, 300_000, 50_000, 250_000] };
    expect(summarize(build(jaggedSales), META).okun).toBeCloseTo(-1, 10);
    // With output flat there is nothing to correlate, and NaN is in no band.
    expect(summarize(build({ ...BASE, produced: SALES_UNITS }), META).okun).toBeNaN();
  });

  it('reads nothing from the warm-up, the partial month after the window, or a year end outside it', () => {
    expectValues(summarize(polluted(build(BASE)), META), EXPECTED);
  });

  it('starts the window at the first month on or after warmUpDays and ends it at the last whole month', () => {
    const columns = build(BASE);
    expect(summarize(columns, { ...META, warmUpDays: WARM_UP_DAYS + 1 }).price_change_share).toBeCloseTo(52 / 500, 12);
    expect(summarize(columns, { ...META, days: DAYS - 6 }).price_change_share).toBeCloseTo(49 / 500, 12);
    expect(summarize(columns, { ...META, days: 12 * MONTH }).price_change_share).toBeCloseTo(60 / 600, 12);
  });

  it('counts only the year ends inside the window', () => {
    const columns = build(BASE);
    expect(summarize(columns, META).stayer_cut_share).toBeCloseTo(10 / 500, 12);
    expect(summarize(columns, { ...META, days: 230 }).stayer_cut_share).toBeNaN();
    expect(summarize(columns, { ...META, warmUpDays: 11 * MONTH }).stayer_cut_share).toBeNaN();
  });

  it('never starts the window in month 0, which has no month before it', () => {
    const columns = build(BASE);
    expect(summarize(columns, { ...META, warmUpDays: 0 })).toEqual(summarize(columns, { ...META, warmUpDays: MONTH }));
  });

  it('gives NaN, never a number, where a window has nothing to divide by', () => {
    const empty = summarize(build(BASE), { ...META, days: WARM_UP_DAYS });
    expect(empty.price_change_share).toBeNaN();
    expect(empty.unemployment_mean).toBeNaN();
    expect(empty.no_crisis).toBe(0);
  });

  it('judges a crisis by unemployment above 0.90 on average or a standard deviation above 0.10', () => {
    const crisisMean = { ...BASE, unemployed: [950, 950, 950, 950, 950, 950, 950] };
    expect(summarize(build(crisisMean), META).no_crisis).toBe(0);
    const swings = { ...BASE, unemployed: [0, 0, 500, 0, 500, 0, 500] };
    const values = summarize(build(swings), META);
    expect(values.unemployment_mean).toBeCloseTo(0.25, 12);
    expect(values.unemployment_sd).toBeGreaterThan(0.1);
    expect(values.no_crisis).toBe(0);
  });
});

describe('tQuantile95 and judge', () => {
  it('matches the exact t quantile at 19 and 49 degrees of freedom', () => {
    expect(Math.abs(tQuantile95(19) - 1.7291)).toBeLessThan(0.0005);
    expect(Math.abs(tQuantile95(49) - 1.6766)).toBeLessThan(0.0005);
  });

  it('reports a sample\'s mean, 90% interval, median and range', () => {
    const values = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.1 : 0.11));
    const judgement = judge(values, 0.09, 0.12);
    const half = (1.729133 * 0.005 * Math.sqrt(20 / 19)) / Math.sqrt(20);
    expect(judgement.n).toBe(20);
    expect(judgement.mean).toBeCloseTo(0.105, 12);
    expect(judgement.interval[0]).toBeCloseTo(0.105 - half, 6);
    expect(judgement.interval[1]).toBeCloseTo(0.105 + half, 6);
    expect(judgement.median).toBeCloseTo(0.105, 12);
    expect([judgement.min, judgement.max]).toEqual([0.1, 0.11]);
    expect(judgement.verdict).toBe('holds');
  });

  it('holds when the interval lies inside the band, edges included', () => {
    expect(judge(Array(20).fill(0.125), 0.0625, 0.125).verdict).toBe('holds');
    expect(judge(Array(20).fill(0.0625), 0.0625, 0.125).verdict).toBe('holds');
  });

  it('fails when the interval lies wholly outside the band, on either side', () => {
    expect(judge(Array(20).fill(0.2), 0.09, 0.12).verdict).toBe('fails');
    expect(judge(Array(20).fill(0.01), 0.09, 0.12).verdict).toBe('fails');
  });

  it('is inconclusive when the interval crosses an edge, whether or not the mean is inside', () => {
    const mean = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.08 : 0.15));
    expect(judge(mean, 0.09, 0.12).verdict).toBe('inconclusive');
    const outside = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0 : 0.3));
    expect(judge(outside, 0.09, 0.12).verdict).toBe('inconclusive');
  });

  it('reports medians only under 20 values, however well they sit in the band', () => {
    const judgement = judge(Array(19).fill(0.1), 0.09, 0.12);
    expect(judgement.verdict).toBe('medians only');
    expect(judgement.median).toBe(0.1);
    expect(judgement.interval[0]).toBeNaN();
    expect(judge([0.1, 0.3, 0.2], 0.09, 0.12).median).toBe(0.2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('fails a sample holding an undefined value, and leaves it without a median', () => {
    const values = [...Array(19).fill(0.1), NaN];
    expect(judge(values, 0.09, 0.12).verdict).toBe('fails');
    expect(median(values)).toBeNaN();
  });

  it('judges every-seed targets true or false on any number of seeds', () => {
    expect(judgeEverySeed([1, 1, 1]).verdict).toBe('holds');
    expect(judgeEverySeed([1, 0, 1]).verdict).toBe('fails');
  });

  it("counts a value in its band, edges included, and scores a miss by its distance over the band's width", () => {
    expect([inBand(0.09, 0.09, 0.12), inBand(0.12, 0.09, 0.12), inBand(0.121, 0.09, 0.12), inBand(NaN, 0.09, 0.12)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(bandMiss(0.0125, 0.0145, 0.0165)).toBeCloseTo(1, 10);
    expect(bandMiss(3.6, 4.6, 6.9)).toBeCloseTo(1 / 2.3, 10);
    expect(bandMiss(7.9, 4.6, 6.9)).toBeCloseTo(1 / 2.3, 10);
    expect(bandMiss(5, 4.6, 6.9)).toBe(0);
    expect(bandMiss(NaN, 4.6, 6.9)).toBe(Infinity);
  });
});

const folders: string[] = [];

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

interface CellSpec {
  readonly point: number;
  readonly seed: number;
  readonly plan: Plan;
  readonly params?: Record<string, number>;
  readonly schema?: number;
}

function writeRun(cells: readonly CellSpec[]): string {
  const root = mkdtempSync(join(tmpdir(), 'nomos-targets-'));
  folders.push(root);
  for (const { point, seed, plan, params = {}, schema = 2 } of cells) {
    const folder = join(root, `p${String(point).padStart(3, '0')}-n${PEOPLE}-x0-k0-s${seed}`);
    mkdirSync(folder);
    const meta = { schema, ...META, params: { ...META.params, ...params } };
    writeFileSync(join(folder, 'meta.json'), JSON.stringify(meta));
    const columns = build(plan);
    for (const name of SUMMARY_COLUMNS) writeFileSync(join(folder, `${name}.f64`), new Uint8Array(columns[name].buffer));
  }
  return root;
}

function printed(...args: string[]): string {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    runTargets(args);
  } finally {
    write.mockRestore();
  }
  return chunks.join('');
}

function rowOf(text: string, id: TargetId): string[] {
  const row = text.split('\n').find((line) => line.startsWith(`${id} `));
  if (row === undefined) throw new Error(`no row for ${id} in\n${text}`);
  return row.trim().split(/\s{2,}/);
}

const six = (value: number): number[] => Array(6).fill(value);
const cellsOf = (point: number, plans: readonly Plan[]): CellSpec[] =>
  plans.map((plan, i) => ({ point, seed: i + 1, plan, params: { priceChancePpm: 100_000 * (point + 1) } }));
const seedsOf = (point: number, plan: Plan, count: number): CellSpec[] => cellsOf(point, Array(count).fill(plan));
const withPriceChanges = (plan: Plan, times: number): Plan => ({ ...plan, price_changes: plan.price_changes.map((n) => n * times) });

describe('the targets command', () => {
  it('prints a table per group with each target\'s verdict over 20 seeds', () => {
    const lowHires = [10, 12, 14, 16, 12, 10];
    const cells = Array.from({ length: 20 }, (_, i) => ({
      point: 0,
      seed: i + 1,
      plan: { ...BASE, hires: lowHires, exits: six(i % 2 === 0 ? 1.2 : 1.9) },
    }));
    const text = printed(writeRun(cells));
    expect(text).toContain('p000-n1000-x0-k0: 20 seeds');
    const verdict = (id: TargetId): string => rowOf(text, id).at(-1) ?? '';
    expect(verdict('price_change_share')).toBe('holds');
    expect(verdict('job_finding')).toBe('fails');
    expect(verdict('exit_rate')).toBe('inconclusive');
    expect(verdict('phillips')).toBe('fails');
    expect(verdict('size_skew')).toBe('holds');
    expect(verdict('no_crisis')).toBe('holds');
    expect(['price_change_size', 'above_markup_share', 'visit_success'].map((id) => verdict(id as TargetId))).toEqual([
      'reported',
      'reported',
      'reported',
    ]);
    expect(rowOf(text, 'job_finding')).toEqual(['job_finding', '1', '0.208 to 0.312', '0.2', '0.2 to 0.2', '0.2', '0.2 to 0.2', 'fails']);
  });

  it('reports medians only for a group of fewer than 20 seeds', () => {
    const text = printed(writeRun(seedsOf(0, BASE, 5)));
    expect(rowOf(text, 'price_change_share')).toEqual([
      'price_change_share',
      '1',
      '0.09 to 0.12',
      '0.1',
      '0.1 to 0.1',
      '-',
      '-',
      'medians only',
    ]);
    expect(rowOf(text, 'no_crisis').at(-1)).toBe('holds');
  });

  it('prints one table per group in numeric point order, past three digits too', () => {
    const text = printed(writeRun([...seedsOf(1000, BASE, 2), ...seedsOf(999, BASE, 2), ...seedsOf(2, BASE, 2)]));
    const at = ['p002', 'p999', 'p1000'].map((point) => text.indexOf(`${point}-n1000-x0-k0: 2 seeds`));
    expect(at.every((index) => index >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('with --filter, passes the points whose tier-1 medians sit in their bands, and ranks them by tier-2 score', () => {
    // exit_rate 0.0125 misses its band by 0.002, which is 1.0 of its width. A mean spell of 3.6 months misses its band by
    // 1.0, which is 0.43 of its width, so only distances over width rank the short spells ahead.
    const shortExits = { ...BASE, exits: six(1.25) };
    const shortSpells = { ...BASE, spell_months: [216, 252, 288, 216, 180, 144] };
    const text = printed(
      writeRun([
        ...cellsOf(0, [withPriceChanges(BASE, 10), BASE, BASE]),
        ...cellsOf(1, [shortExits, shortExits, withPriceChanges(shortExits, 10)]),
        ...seedsOf(2, withPriceChanges(BASE, 3), 3),
        ...seedsOf(3, shortSpells, 3),
        ...seedsOf(4, shortSpells, 3),
      ]),
      '--filter',
    );
    expect(text).toContain('4 of 5 points (80.0%)');
    expect(text).toContain('tier-1 targets no point meets: none');
    const order = ['p000', 'p003', 'p004', 'p001'].map((point) => text.indexOf(`${point}-n1000-x0-k0 `));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(text).not.toContain('p002');
    expect(text).toMatch(/p003-n1000-x0-k0 +score 0\.\d+ +priceChancePpm=400000/);
    expect(text).not.toContain('verdict');
  });

  it('with --filter, names the tier-1 targets that no point meets', () => {
    const farPrices = { ...BASE, price_mean: six(100_000).concat(100_000) };
    const text = printed(writeRun([...seedsOf(0, farPrices, 3), ...seedsOf(1, farPrices, 3)]), '--filter');
    expect(text).toContain('0 of 2 points (0.0%)');
    expect(text).toContain('tier-1 targets no point meets: price_ratio');
    expect(text).toContain('no point passes tier 1');
  });

  it('refuses a missing folder argument, an empty folder and a schema it does not read', () => {
    expect(() => runTargets([])).toThrow('targets takes one run folder');
    expect(() => printed(writeRun([]))).toThrow('no design cells');
    expect(() => printed(writeRun([{ point: 0, seed: 1, plan: BASE, schema: 1 }]))).toThrow('schema 1');
  });

  it('refuses a column file that holds fewer rows than the run has days', () => {
    const root = writeRun([{ point: 0, seed: 1, plan: BASE }]);
    writeFileSync(join(root, 'p000-n1000-x0-k0-s1', 'hires.f64'), new Uint8Array(8 * (DAYS - 1)));
    expect(() => printed(root)).toThrow(/hires\.f64 holds 256 rows, not 257/);
  });

  it('ignores entries in the folder that are not cells', () => {
    const root = writeRun(seedsOf(0, BASE, 2));
    writeFileSync(join(root, 'grid.json'), '{}');
    mkdirSync(join(root, 'notes'));
    expect(printed(root)).toContain('p000-n1000-x0-k0: 2 seeds');
  });
});
