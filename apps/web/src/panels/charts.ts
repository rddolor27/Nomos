import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './charts.css';

export interface Charts {
  push(tick: number, systemMs: Record<string, number>, frameMs: number): void;
}

interface Sample {
  tick: number;
  values: (number | null)[];
}

// One chart's data: its caption, a label per series and the last SAMPLES samples, which the chart and its table share.
export interface Plot {
  caption: string;
  labels: string[];
  samples: Sample[];
}

interface View {
  plot: Plot;
  chart: uPlot;
  tbody: HTMLTableSectionElement;
}

const SAMPLES = 20;
const REFRESH_MS = 1000;
const CHART_HEIGHT = 200;
const MISSING = '–';
const SYSTEMS_CAPTION = 'Tick time by system (ms)';
const FRAME_CAPTION = 'Frame time (ms)';

// Okabe-Ito sky blue, orange, yellow, bluish green, vermillion and reddish purple and Tol Bright grey (round 3's
// colour-blind-safe palettes), each at least 3:1 against the page's --ui-bg, which the role colours' navy is not. An
// eighth series repeats the first.
const SERIES_COLOURS = ['#56B4E9', '#E69F00', '#BBBBBB', '#F0E442', '#009E73', '#D55E00', '#CC79A7'];
// Whole ticks only, so the x axis never labels a tick 7.5.
const TICK_INCREMENTS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000];
// Whole days, and the economy's 21-day month, which is when its series step, so a step lands on a tick.
const DAY_INCREMENTS = [1, 7, 21, 42, 84];
// The default 50 px would label every other month in the side column's 320 px.
const DAY_TICK_SPACE_PX = 36;
const LEVEL_MIN_PAD = 0.005;
const RANGE_PAD = 0.1;

const NUMBER = new Intl.NumberFormat('en', { maximumFractionDigits: 3 });
const MILLISECONDS = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The axes take the page's text and a recessive grid from index.html's tokens, read once as the charts mount.
function baseAxis(root: HTMLElement): uPlot.Axis {
  const tokens = getComputedStyle(root);
  const grid = { stroke: tokens.getPropertyValue('--ui-raised').trim() };
  return {
    stroke: tokens.getPropertyValue('--ui-text').trim(),
    grid,
    ticks: grid,
    values: (_, splits) => splits.map((split) => NUMBER.format(split)),
  };
}

function chartAxes(root: HTMLElement): uPlot.Axis[] {
  const axis = baseAxis(root);
  return [{ ...axis, label: 'Tick', incrs: TICK_INCREMENTS }, { ...axis, label: 'Time (ms)' }];
}

function dayAxes(root: HTMLElement, label: string): uPlot.Axis[] {
  const axis = baseAxis(root);
  return [{ ...axis, label: 'Day', incrs: DAY_INCREMENTS, space: DAY_TICK_SPACE_PX }, { ...axis, label }];
}

function formatted(format: Intl.NumberFormat, value: number | null): string {
  return value === null ? MISSING : format.format(value);
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function addSample(plot: Plot, tick: number, values: number[]): void {
  plot.samples.push({ tick, values: values.map(finiteOrNull) });
  if (plot.samples.length > SAMPLES) plot.samples.shift();
}

export function chartData({ labels, samples }: Plot): uPlot.AlignedData {
  const series = labels.map((_, index) => samples.map((sample) => sample.values[index]));
  return [samples.map((sample) => sample.tick), ...series];
}

export function tableCells({ samples }: Plot): string[][] {
  return samples.map(({ tick, values }) => [
    formatted(NUMBER, tick),
    ...values.map((ms) => formatted(MILLISECONDS, ms)),
  ]);
}

export function seriesOptions(labels: string[]): uPlot.Series[] {
  const tick: uPlot.Series = { label: 'Tick', value: (_, value) => formatted(NUMBER, value) };
  const systems = labels.map(
    (label, index): uPlot.Series => ({
      label,
      stroke: SERIES_COLOURS[index % SERIES_COLOURS.length],
      width: 2,
      points: { show: false },
      value: (_, ms) => formatted(MILLISECONDS, ms),
    }),
  );
  return [tick, ...systems];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  ...children: Node[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  element.append(...children);
  return element;
}

export function dataTable(
  caption: string,
  headings: readonly string[],
  tbody: HTMLTableSectionElement,
): HTMLTableElement {
  const columns = headings.map((heading) => Object.assign(el('th', heading), { scope: 'col' }));
  return el('table', '', el('caption', caption), el('thead', '', el('tr', '', ...columns)), tbody);
}

// Rewrites the rows in place, so a refresh makes no node and writes only the cells whose text changed.
export function setRows(tbody: HTMLTableSectionElement, rows: readonly (readonly string[])[]): void {
  while (tbody.rows.length > rows.length) tbody.deleteRow(-1);
  for (let r = 0; r < rows.length; r++) {
    const row = r < tbody.rows.length ? tbody.rows[r] : tbody.insertRow();
    const texts = rows[r];
    for (let c = 0; c < texts.length; c++) {
      const cell = c < row.cells.length ? row.cells[c] : row.insertCell();
      if (cell.textContent !== texts[c]) cell.textContent = texts[c];
    }
  }
}

function fitWidth(chart: uPlot, host: HTMLElement): void {
  new ResizeObserver(() => {
    if (host.clientWidth !== chart.width) chart.setSize({ width: host.clientWidth, height: CHART_HEIGHT });
  }).observe(host);
}

function createView(root: HTMLElement, plot: Plot, axes: uPlot.Axis[]): View {
  const host = el('div');
  const tbody = el('tbody');
  const table = dataTable(plot.caption, ['Tick', ...plot.labels], tbody);
  const details = el('details', '', el('summary', 'Data table'), table);
  root.append(el('figure', '', el('figcaption', plot.caption), host, details));

  const chart = new uPlot(
    {
      width: host.clientWidth,
      height: CHART_HEIGHT,
      scales: { x: { time: false } },
      axes,
      series: seriesOptions(plot.labels),
    },
    chartData(plot),
    host,
  );
  // The data table carries the same labels, so assistive tech skips uPlot's legend, a second table in the figure.
  chart.root.querySelector('.u-legend')?.setAttribute('aria-hidden', 'true');
  fitWidth(chart, host);
  return { plot, chart, tbody };
}

function render({ plot, chart, tbody }: View): void {
  chart.setData(chartData(plot));
  setRows(tbody, tableCells(plot));
}

// A level that barely moves, such as a price that steps a few hundredths of a percent a month, keeps a half percent of
// itself each side, so its step reads as a step and not a cliff; a larger move gets uPlot's own 10% pad.
export function levelRange(_chart: uPlot, min: number | null, max: number | null): uPlot.Range.MinMax {
  if (min === null || max === null) return [null, null];
  const pad = Math.max((max - min) * RANGE_PAD, Math.abs(max) * LEVEL_MIN_PAD);
  return [min - pad, max + pad];
}

// 'level' suits a price or a wage, which a flat axis would hide, and 'zero' a rate, whose floor is 0.
const DAY_RANGES: Record<'level' | 'zero', uPlot.Scale.Range> = { level: levelRange, zero: [0, null] };

export interface DaySpec {
  title: string;
  // The y axis' label, which carries the unit.
  axis: string;
  // A name for each series, which head the data table's columns and, for a chart of several, its legend.
  labels: readonly string[];
  // For each series, an index into the series colours.
  colours: readonly number[];
  range: keyof typeof DAY_RANGES;
}

// One or more measures by day (M2.2b): the title, a line for each, labelled axes and a data table. A single series needs
// no legend, as the title names it, and shows its latest value beside the title; several keep a legend of their names.
// No chart has a cursor, since the table holds every value. The caller owns the arrays, one for each label, and refills
// them in place; the uPlot views are made once here, one for each count of days.
export class DayChart {
  private readonly chart: uPlot;
  private readonly tbody: HTMLTableSectionElement;
  private readonly latest: HTMLElement;
  private readonly views: uPlot.AlignedData[];
  private readonly several: boolean;

  constructor(root: HTMLElement, spec: DaySpec, days: Float64Array, values: readonly Float64Array[]) {
    const host = el('div');
    this.latest = el('span');
    this.tbody = el('tbody');
    this.several = spec.labels.length > 1;
    const table = dataTable(spec.title, ['Day', ...spec.labels], this.tbody);
    const details = el('details', '', el('summary', 'Data table'), table);
    root.append(el('figure', '', el('figcaption', spec.title, this.latest), host, details));

    this.views = Array.from({ length: days.length + 1 }, (_, count) => [
      days.subarray(0, count),
      ...values.map((series) => series.subarray(0, count)),
    ]);
    const lines = spec.labels.map(
      (label, index): uPlot.Series => ({ label, stroke: SERIES_COLOURS[spec.colours[index]], width: 2 }),
    );
    this.chart = new uPlot(
      {
        width: host.clientWidth,
        height: CHART_HEIGHT,
        legend: { show: this.several, live: false },
        cursor: { show: false },
        scales: { x: { time: false }, y: { range: DAY_RANGES[spec.range] } },
        axes: dayAxes(root, spec.axis),
        series: [{}, ...lines],
      },
      this.views[0],
      host,
    );
    // The data table carries the same names, so assistive tech skips the legend, a second table in the figure.
    this.chart.root.querySelector('.u-legend')?.setAttribute('aria-hidden', 'true');
    fitWidth(this.chart, host);
  }

  // Draws the first `count` days of the arrays. The rows are the data table, newest first, and the second cell of the
  // first is the latest value of the first series.
  show(count: number, rows: readonly (readonly string[])[]): void {
    this.chart.setData(this.views[count]);
    setRows(this.tbody, rows);
    if (!this.several) this.latest.textContent = rows[0][1];
  }
}

// Nothing is drawn until the first stats arrive, which name the systems. After that the charts and tables follow once a
// second.
export function mountCharts(root: HTMLElement): Charts {
  let plots: [Plot, Plot] | null = null;
  let views: View[] | null = null;
  let changed = false;

  setInterval(() => {
    if (!plots || !changed) return;
    changed = false;
    views ??= plots.map((plot) => createView(root, plot, chartAxes(root)));
    views.forEach(render);
  }, REFRESH_MS);

  return {
    push(tick, systemMs, frameMs) {
      plots ??= [
        { caption: SYSTEMS_CAPTION, labels: Object.keys(systemMs), samples: [] },
        { caption: FRAME_CAPTION, labels: ['frame'], samples: [] },
      ];
      const [systems, frame] = plots;
      addSample(systems, tick, systems.labels.map((label) => systemMs[label]));
      addSample(frame, tick, [frameMs]);
      changed = true;
    },
  };
}
