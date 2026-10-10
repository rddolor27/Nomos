import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { bandMiss, inBand, judgeTarget, median } from './judge.ts';
import { SUMMARY_COLUMNS, summarize, type SummaryColumns, type SummaryMeta, type TargetValues } from './summarize.ts';
import { TARGETS, type BandTarget, type Target, type TargetId } from './targets.ts';

// summarize reads the columns that flow-log schema 2 names, so a folder of another schema is refused. Schema 2 keeps the
// names it reads and counts goods alone in its unit columns (M2.4).
const SCHEMA = 2;
const BYTES_PER_VALUE = 8;
const BEST_POINTS = 10;
// A cell's folder: point, size, police index, shock index and seed (the design runner's naming).
const CELL_NAME = /^p(\d+)-n(\d+)-x(\d+)-k(\d+)-s(\d+)$/;
const HEADER = ['target', 'tier', 'band', 'median', 'range', 'mean', '90% interval', 'verdict'];

interface CellMeta extends SummaryMeta {
  readonly schema: number;
  readonly params: SummaryMeta['params'] & Readonly<Record<string, number>>;
}

interface Cell {
  readonly name: string;
  readonly group: string;
  readonly order: readonly number[];
  readonly seed: number;
}

// A group is a point at one size, police share and shock; its values hold one number per seed for each target.
interface Group {
  readonly key: string;
  readonly order: readonly number[];
  readonly seeds: number[];
  readonly values: Record<TargetId, number[]>;
  readonly params: Readonly<Record<string, number>>;
}

function bandTargets(tier: number): BandTarget[] {
  const found: BandTarget[] = [];
  for (const target of TARGETS) {
    if (target.rule === 'band' && target.tier === tier) found.push(target);
  }
  return found;
}

const TIER_ONE = bandTargets(1);
const TIER_TWO = bandTargets(2);

function parseCellName(name: string): Cell | undefined {
  const match = CELL_NAME.exec(name);
  if (match === null) return undefined;
  const [point, size, police, shock, seed] = match.slice(1).map(Number);
  return { name, group: name.slice(0, name.lastIndexOf('-s')), order: [point, size, police, shock], seed };
}

function compareOrder(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function listCells(dir: string): Cell[] {
  const cells = readdirSync(dir).map(parseCellName).filter((cell) => cell !== undefined);
  if (cells.length === 0) throw new Error(`no design cells in ${dir}`);
  return cells.sort((a, b) => compareOrder(a.order, b.order) || a.seed - b.seed);
}

function readColumn(folder: string, column: string, rows: number): Float64Array {
  const path = join(folder, `${column}.f64`);
  const bytes = readFileSync(path);
  if (bytes.byteLength !== rows * BYTES_PER_VALUE) {
    throw new Error(`${path} holds ${bytes.byteLength / BYTES_PER_VALUE} rows, not ${rows}`);
  }
  return new Float64Array(new Uint8Array(bytes).buffer);
}

function summarizeCell(dir: string, cell: Cell): { values: TargetValues; params: CellMeta['params'] } {
  const folder = join(dir, cell.name);
  const meta = JSON.parse(readFileSync(join(folder, 'meta.json'), 'utf8')) as CellMeta;
  if (meta.schema !== SCHEMA) {
    throw new Error(`${cell.name}: flow-log schema ${meta.schema}, but this build reads schema ${SCHEMA}`);
  }
  const columns = Object.fromEntries(
    SUMMARY_COLUMNS.map((column) => [column, readColumn(folder, column, meta.days)]),
  ) as SummaryColumns;
  return { values: summarize(columns, meta), params: meta.params };
}

function emptyValues(): Record<TargetId, number[]> {
  const values: Partial<Record<TargetId, number[]>> = {};
  for (const target of TARGETS) values[target.id] = [];
  return values as Record<TargetId, number[]>;
}

// Cells come sorted, so the groups are made in point order.
function loadGroups(dir: string): Group[] {
  const groups = new Map<string, Group>();
  for (const cell of listCells(dir)) {
    const { values, params } = summarizeCell(dir, cell);
    const group = groups.get(cell.group) ?? { key: cell.group, order: cell.order, seeds: [], values: emptyValues(), params };
    groups.set(cell.group, group);
    group.seeds.push(cell.seed);
    for (const target of TARGETS) group.values[target.id].push(values[target.id]);
  }
  return [...groups.values()];
}

function fmt(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toPrecision(4))) : String(value);
}

function bandText(target: Target): string {
  switch (target.rule) {
    case 'band':
      return `${fmt(target.low)} to ${fmt(target.high)}`;
    case 'every seed':
      return 'every seed';
    case 'reported':
      return '-';
  }
}

function targetRow(target: Target, values: readonly number[]): string[] {
  const judgement = judgeTarget(target, values);
  const [lower, upper] = judgement.interval;
  return [
    target.id,
    target.tier === 'reported' ? '-' : String(target.tier),
    bandText(target),
    fmt(judgement.median),
    `${fmt(judgement.min)} to ${fmt(judgement.max)}`,
    judgement.verdict === 'medians only' ? '-' : fmt(judgement.mean),
    Number.isNaN(lower) ? '-' : `${fmt(lower)} to ${fmt(upper)}`,
    judgement.verdict,
  ];
}

function alignColumns(rows: readonly (readonly string[])[]): string[] {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd());
}

function groupTable(group: Group): string[] {
  const rows = TARGETS.map((target) => targetRow(target, group.values[target.id]));
  return [`${group.key}: ${group.seeds.length} seeds`, ...alignColumns([HEADER, ...rows])];
}

function medianInBand(group: Group, target: BandTarget): boolean {
  return inBand(median(group.values[target.id]), target.low, target.high);
}

// Ruling 12: a point passes when every tier-1 median is in its band.
function passesTierOne(group: Group): boolean {
  return TIER_ONE.every((target) => medianInBand(group, target));
}

// The sum, over tier-2 targets, of each median's distance outside its band over the band's width.
function tierTwoScore(group: Group): number {
  let score = 0;
  for (const target of TIER_TWO) score += bandMiss(median(group.values[target.id]), target.low, target.high);
  return score;
}

// The params that differ between groups are the point's own; the rest come from the preset.
function sweptParams(groups: readonly Group[]): string[] {
  const first = groups[0].params;
  return Object.keys(first).filter((name) => groups.some((group) => group.params[name] !== first[name]));
}

function tierOneCounts(groups: readonly Group[]): string[] {
  const counts = TIER_ONE.map((target) => groups.filter((group) => medianInBand(group, target)).length);
  const unmet = TIER_ONE.filter((_, i) => counts[i] === 0).map((target) => target.id);
  return [
    ...TIER_ONE.map((target, i) => `  ${target.id}: ${counts[i]} of ${groups.length} points in band`),
    `tier-1 targets no point meets: ${unmet.length === 0 ? 'none' : unmet.join(', ')}`,
  ];
}

// The sort is stable and the groups come in point order, so ties go to the lower point.
function rankedLines(passing: readonly Group[], swept: readonly string[]): string[] {
  if (passing.length === 0) return ['no point passes tier 1'];
  const ranked = passing
    .map((group) => ({ group, score: tierTwoScore(group) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, BEST_POINTS);
  const params = (group: Group): string => swept.map((name) => `${name}=${group.params[name]}`).join(' ');
  return [
    'passing points by tier-2 score, lowest first:',
    ...ranked.map(({ group, score }, i) => `${i + 1}. ${group.key}  score ${fmt(score)}  ${params(group)}`.trimEnd()),
  ];
}

function filterReport(groups: readonly Group[]): string[] {
  const passing = groups.filter(passesTierOne);
  const share = ((100 * passing.length) / groups.length).toFixed(1);
  return [
    `tier 1 on each point's median over its seeds: ${passing.length} of ${groups.length} points (${share}%) pass`,
    ...tierOneCounts(groups),
    ...rankedLines(passing, sweptParams(groups)),
  ];
}

export function runTargets(args: readonly string[]): void {
  const { positionals, values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: { filter: { type: 'boolean', default: false } },
  });
  if (positionals.length !== 1) throw new RangeError('targets takes one run folder: targets <dir> [--filter]');
  const groups = loadGroups(positionals[0]);
  const text = values.filter ? filterReport(groups).join('\n') : groups.map((group) => groupTable(group).join('\n')).join('\n\n');
  process.stdout.write(`${text}\n`);
}
