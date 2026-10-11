import { BREAD, FEED_DAYS, FUEL, GOOD_NAMES, type EconomyMessage } from '@nomos/sim-protocol';
import type { App } from '../app/app.ts';
import { DayChart, dataTable, el, setRows, type DaySpec } from './charts.ts';
import { shopName } from './shop-name.ts';
import './economy.css';

export interface Measure extends DaySpec {
  // The message's series for this chart, one for each label, and what their values divide by to reach the unit on screen.
  series(message: EconomyMessage): readonly Float64Array[];
  divisor: number;
  format: Intl.NumberFormat;
}

const CENTS_PER_UNIT = 100;
const PPM_PER_PERCENT = 10_000;
const NO_DAYS = 'No economy figures yet. They appear when the first day ends.';

const COUNT = new Intl.NumberFormat('en');
const FIGURE = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GOODS = GOOD_NAMES.slice(BREAD, FUEL + 1);

export const MEASURES: readonly Measure[] = [
  {
    title: 'Food a day',
    axis: 'Portions a day',
    labels: ['Eaten', 'Spoiled', 'Unmet'],
    colours: [0, 1, 3],
    range: 'zero',
    series: (message) => [message.eaten, message.spoiled, message.unmet],
    divisor: 1,
    format: COUNT,
  },
  {
    title: 'Sales by good',
    axis: 'Units sold a day',
    labels: GOODS,
    colours: [0, 1, 2, 3, 4, 5, 6],
    range: 'zero',
    series: (message) => message.soldUnits,
    divisor: 1,
    format: COUNT,
  },
  {
    title: 'Mean wage a month',
    axis: 'Wage a month',
    labels: ['Mean wage a month'],
    colours: [1],
    range: 'level',
    series: (message) => [message.meanWageCents],
    divisor: CENTS_PER_UNIT,
    format: FIGURE,
  },
  {
    title: 'Unemployment (%)',
    axis: 'Unemployment (%)',
    labels: ['Unemployment (%)'],
    colours: [3],
    range: 'zero',
    series: (message) => [message.unemploymentPpm],
    divisor: PPM_PER_PERCENT,
    format: FIGURE,
  },
];

// Writes the held days of each series into `values`, in the unit on screen, and returns the chart's data table, newest
// first, so the day that just ended heads it.
export function fillSeries(message: EconomyMessage, measure: Measure, values: readonly Float64Array[]): string[][] {
  const { day, days } = message;
  const sources = measure.series(message);
  for (let s = 0; s < sources.length; s++) {
    for (let i = 0; i < days; i++) values[s][i] = sources[s][i] / measure.divisor;
  }
  const rows: string[][] = [];
  for (let row = 0; row < days; row++) {
    const cells = [COUNT.format(day - row)];
    for (let s = 0; s < sources.length; s++) cells.push(measure.format.format(values[s][days - 1 - row]));
    rows.push(cells);
  }
  return rows;
}

// The day that just ended, a row for each good: units sold (portions for a food), in stock and the price paid.
export function goodsRows(message: EconomyMessage): string[][] {
  const newest = message.days - 1;
  const rows: string[][] = [];
  if (newest < 0) return rows;
  for (let g = 0; g < GOODS.length; g++) {
    rows.push([
      GOODS[g],
      COUNT.format(message.soldUnits[g][newest]),
      COUNT.format(message.stockUnits[g][newest]),
      FIGURE.format(message.paidCents[g][newest] / CENTS_PER_UNIT),
    ]);
  }
  return rows;
}

// The feed holds its trades oldest first. A trade names the good and the shop and never the buyer (M2.2b ruling 4).
export function tradeLines(message: EconomyMessage): string[] {
  const lines: string[] = [];
  for (let trade = message.trades - 1; trade >= 0; trade--) {
    const good = message.tradeGood[trade];
    const units = COUNT.format(message.tradeUnits[trade]);
    const amount = FIGURE.format(message.tradeCents[trade] / CENTS_PER_UNIT);
    lines.push(`${units} ${GOOD_NAMES[good].toLowerCase()} at ${shopName(good, message.tradeShop[trade])}, ${amount}`);
  }
  return lines;
}

class GoodsTable {
  private readonly table: HTMLTableElement;
  private readonly tbody: HTMLTableSectionElement;

  constructor(root: HTMLElement) {
    this.tbody = el('tbody');
    this.table = dataTable('', ['Good', 'Sold', 'In stock', 'Price paid'], this.tbody);
    root.append(this.table);
  }

  show(message: EconomyMessage): void {
    this.table.caption?.replaceChildren(`Goods on day ${COUNT.format(message.day)}`);
    setRows(this.tbody, goodsRows(message));
  }
}

class TradeList {
  private readonly title: HTMLElement;
  private readonly list: HTMLUListElement;
  private readonly none: HTMLElement;

  constructor(root: HTMLElement) {
    this.title = el('p');
    this.title.id = 'trades-title';
    this.title.className = 'caption';
    this.list = el('ul');
    this.list.setAttribute('aria-labelledby', this.title.id);
    this.none = el('p');
    root.append(this.title, this.list, this.none);
  }

  show(message: EconomyMessage): void {
    const lines = tradeLines(message);
    const day = COUNT.format(message.day);
    this.title.textContent = `Last trades of day ${day}`;
    this.none.textContent = `Nobody shopped on day ${day}.`;
    // A list with no item would leave its label with nothing to describe.
    this.list.hidden = lines.length === 0;
    this.none.hidden = lines.length > 0;
    while (this.list.children.length > lines.length) this.list.lastElementChild?.remove();
    for (let i = 0; i < lines.length; i++) {
      if (i >= this.list.children.length) this.list.append(el('li'));
      const item = this.list.children[i];
      if (item.textContent !== lines[i]) item.textContent = lines[i];
    }
  }
}

interface Body {
  goods: GoodsTable;
  charts: DayChart[];
  trades: TradeList;
}

// The day's goods, four charts by day, each with its data table, and the day's last trades. The arrays below are made once
// and refilled for each message. Only the body waits for the first message to be built, since the charts measure a column
// that is on show. The app keeps the latest message, so a panel that mounts late draws at once.
export class EconomyPanel {
  private readonly root: HTMLElement;
  private readonly note: HTMLElement;
  private readonly days = new Float64Array(FEED_DAYS);
  private readonly values = MEASURES.map((measure) => measure.labels.map(() => new Float64Array(FEED_DAYS)));
  private body: Body | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.note = el('p', NO_DAYS);
    root.append(this.note);
  }

  private build(): Body {
    this.note.remove();
    const goods = new GoodsTable(this.root);
    const charts = MEASURES.map((measure, index) => new DayChart(this.root, measure, this.days, this.values[index]));
    return { goods, charts, trades: new TradeList(this.root) };
  }

  show(message: EconomyMessage): void {
    const { day, days } = message;
    if (days === 0) return;
    const body = (this.body ??= this.build());
    for (let i = 0; i < days; i++) this.days[i] = day - days + 1 + i;
    body.goods.show(message);
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
