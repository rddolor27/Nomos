import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

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

// Okabe-Ito sky blue, orange and yellow and Tol Bright grey (round 3's colour-blind-safe palettes), each at least 3:1
// against the page's #464C5E, which the role colours' navy (1.2:1) and teal (2.6:1) are not. A fifth series repeats
// the first.
const SERIES_COLOURS = ['#56B4E9', '#E69F00', '#BBBBBB', '#F0E442'];
const TEXT = '#F6F0DE';
const GRID = 'rgba(246, 240, 222, 0.12)';
// Whole ticks only, so the x axis never labels a tick 7.5.
const TICK_INCREMENTS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000];

const NUMBER = new Intl.NumberFormat('en', { maximumFractionDigits: 3 });
const MILLISECONDS = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AXIS: uPlot.Axis = {
  stroke: TEXT,
  grid: { stroke: GRID },
  ticks: { stroke: GRID },
  values: (_, splits) => splits.map((split) => NUMBER.format(split)),
};

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

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', ...children: Node[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  element.append(...children);
  return element;
}

function createView(root: HTMLElement, plot: Plot): View {
  const host = el('div');
  const tbody = el('tbody');
  const headings = ['Tick', ...plot.labels].map((label) => Object.assign(el('th', label), { scope: 'col' }));
  const table = el('table', '', el('caption', plot.caption), el('thead', '', el('tr', '', ...headings)), tbody);
  const details = el('details', '', el('summary', 'Data table'), table);
  root.append(el('figure', '', el('figcaption', plot.caption), host, details));

  const chart = new uPlot(
    {
      width: host.clientWidth,
      height: CHART_HEIGHT,
      scales: { x: { time: false } },
      axes: [{ ...AXIS, incrs: TICK_INCREMENTS }, AXIS],
      series: seriesOptions(plot.labels),
    },
    chartData(plot),
    host,
  );
  // The data table carries the same labels, so assistive tech skips uPlot's legend, a second table in the figure.
  chart.root.querySelector('.u-legend')?.setAttribute('aria-hidden', 'true');
  new ResizeObserver(() => {
    if (host.clientWidth !== chart.width) chart.setSize({ width: host.clientWidth, height: CHART_HEIGHT });
  }).observe(host);
  return { plot, chart, tbody };
}

function render({ plot, chart, tbody }: View): void {
  chart.setData(chartData(plot));
  tbody.replaceChildren(...tableCells(plot).map((cells) => el('tr', '', ...cells.map((text) => el('td', text)))));
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
    views ??= plots.map((plot) => createView(root, plot));
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
