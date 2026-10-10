import { FEED_DAYS, type EconomyMessage } from '@nomos/sim-protocol';
import type { App } from '../app/app.ts';
import { DayChart, dataTable, el, setRows, type DaySpec } from './charts.ts';
import { shopName } from './shop-name.ts';
import './economy.css';

export interface Measure extends DaySpec {
  // The message's series, and what its values divide by to reach the unit on screen.
  field: 'meanPriceCents' | 'meanWageCents' | 'unemploymentPpm';
  divisor: number;
}

const CENTS_PER_UNIT = 100;
const PPM_PER_PERCENT = 10_000;
const NO_DAYS = 'No economy figures yet. They appear when the first day ends.';

export const MEASURES: readonly Measure[] = [
  {
    field: 'meanPriceCents',
    divisor: CENTS_PER_UNIT,
    title: 'Mean price per unit',
    axis: 'Price per unit',
    colour: 0,
    range: 'level',
  },
  {
    field: 'meanWageCents',
    divisor: CENTS_PER_UNIT,
    title: 'Mean wage a month',
    axis: 'Wage a month',
    colour: 1,
    range: 'level',
  },
  {
    field: 'unemploymentPpm',
    divisor: PPM_PER_PERCENT,
    title: 'Unemployment (%)',
    axis: 'Unemployment (%)',
    colour: 3,
    range: 'zero',
  },
];

const COUNT = new Intl.NumberFormat('en');
const FIGURE = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Writes the held days of one series into `values`, in the unit on screen, and returns its data table, newest first, so
// the day that just ended heads it.
export function fillSeries(message: EconomyMessage, measure: Measure, values: Float64Array): string[][] {
  const { day, days } = message;
  const source = message[measure.field];
  for (let i = 0; i < days; i++) values[i] = source[i] / measure.divisor;
  const rows: string[][] = [];
  for (let row = 0; row < days; row++) rows.push([COUNT.format(day - row), FIGURE.format(values[days - 1 - row])]);
  return rows;
}

// The feed holds its trades oldest first. A trade names the shop and never the buyer (M2.2b ruling 4).
export function tradeRows(message: EconomyMessage): string[][] {
  const rows: string[][] = [];
  for (let trade = message.trades - 1; trade >= 0; trade--) {
    rows.push([
      shopName(message.tradeShop[trade]),
      COUNT.format(message.tradeUnits[trade]),
      FIGURE.format(message.tradeCents[trade] / CENTS_PER_UNIT),
    ]);
  }
  return rows;
}

class TradeList {
  private readonly table: HTMLTableElement;
  private readonly tbody: HTMLTableSectionElement;
  private readonly none: HTMLElement;

  constructor(root: HTMLElement) {
    this.tbody = el('tbody');
    this.table = dataTable('', ['Shop', 'Units', 'Amount'], this.tbody);
    this.none = el('p');
    root.append(this.table, this.none);
  }

  show(message: EconomyMessage): void {
    const rows = tradeRows(message);
    const day = COUNT.format(message.day);
    this.table.caption?.replaceChildren(`Last trades of day ${day}`);
    this.none.textContent = `Nobody shopped on day ${day}.`;
    // A table with no row would leave its headings with nothing to describe.
    this.table.hidden = rows.length === 0;
    this.none.hidden = rows.length > 0;
    setRows(this.tbody, rows);
  }
}

interface Body {
  charts: DayChart[];
  trades: TradeList;
}

// Three charts by day, each with its data table, and the day's last trades. The arrays below are made once and refilled
// for each message. Only the charts wait for the first message to be built, since they measure a column that is on show.
// The app keeps the latest message, so a panel that mounts late draws at once.
export class EconomyPanel {
  private readonly root: HTMLElement;
  private readonly note: HTMLElement;
  private readonly days = new Float64Array(FEED_DAYS);
  private readonly values = MEASURES.map(() => new Float64Array(FEED_DAYS));
  private body: Body | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.note = el('p', NO_DAYS);
    root.append(this.note);
  }

  private build(): Body {
    this.note.remove();
    const charts = MEASURES.map((measure, index) => new DayChart(this.root, measure, this.days, this.values[index]));
    return { charts, trades: new TradeList(this.root) };
  }

  show(message: EconomyMessage): void {
    const { day, days } = message;
    if (days === 0) return;
    const body = (this.body ??= this.build());
    for (let i = 0; i < days; i++) this.days[i] = day - days + 1 + i;
    for (let index = 0; index < MEASURES.length; index++) {
      body.charts[index].show(days, fillSeries(message, MEASURES[index], this.values[index]));
    }
    body.trades.show(message);
  }
}

export function mountEconomy(root: HTMLElement, app: App): void {
  const panel = new EconomyPanel(root);
  app.onEconomy((message) => panel.show(message));
}
