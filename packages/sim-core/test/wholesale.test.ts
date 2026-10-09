import { describe, expect, it } from 'vitest';
import { CallAuction } from '../src/market/wholesale.ts';
import { reserveArena } from '../src/memory/arena.ts';
import { draw3, draw4, mix } from '../src/random/draw.ts';

const SEED = 42;
const RANK_STREAM = 3;
const BOOK_STREAM = 4;
const BID = 0;
const ASK = 1;
// A book holds min to max orders a side, before bids that cash cannot back drop out.
const SMALL = { min: 0, max: 12 };
const LARGE = { min: 200, max: 300 };
const BOOKS = 1_000;
const LARGE_BOOKS = 10;
const TIED = 6;
const INT32_MAX = 2_147_483_647;

interface Order {
  units: number;
  limit: number;
  cash: number;
}

interface Book {
  bids: Order[];
  asks: Order[];
}

interface BookSize {
  min: number;
  max: number;
}

interface SideView {
  name: string;
  side: number;
  highFirst: boolean;
  limit: Float64Array;
  units: Int32Array;
  filled: Int32Array;
  count: number;
}

function newAuction(capacity: number): CallAuction {
  return new CallAuction(reserveArena(65_536), capacity);
}

// Half the books quote limits in steps of 5, so equal limits are common and ranks decide often.
function keyedOrder(book: number, side: number, index: number): Order {
  const step = book % 2 === 0 ? 5 : 1;
  const limitDraw = draw4(SEED, BOOK_STREAM, book, side, index, 0) % 61;
  return {
    units: 1 + (draw4(SEED, BOOK_STREAM, book, side, index, 1) % 20),
    limit: 70 + step * Math.floor(limitDraw / step),
    cash: draw4(SEED, BOOK_STREAM, book, side, index, 2) % 1_800,
  };
}

function keyedBook(book: number, size: BookSize): Book {
  const [bids, asks] = [BID, ASK].map((side) => {
    const count = size.min + (draw3(SEED, BOOK_STREAM, book, side, size.max) % (size.max - size.min + 1));
    return Array.from({ length: count }, (_, index) => keyedOrder(book, side, index));
  });
  return { bids, asks };
}

function load(auction: CallAuction, book: Book): void {
  auction.reset();
  book.bids.forEach((order, trader) => auction.bid(trader, order.units, order.limit, order.cash));
  book.asks.forEach((order, trader) => auction.ask(trader, order.units, order.limit));
}

function sidesOf(auction: CallAuction): SideView[] {
  return [
    {
      name: 'bid',
      side: BID,
      highFirst: true,
      limit: auction.bidLimit,
      units: auction.bidUnits,
      filled: auction.bidFilled,
      count: auction.bidCount,
    },
    {
      name: 'ask',
      side: ASK,
      highFirst: false,
      limit: auction.askLimit,
      units: auction.askUnits,
      filled: auction.askFilled,
      count: auction.askCount,
    },
  ];
}

function filledOf(filled: Int32Array, count: number): number[] {
  return Array.from(filled.subarray(0, count));
}

function total(filled: Int32Array, count: number): number {
  return filledOf(filled, count).reduce((sum, units) => sum + units, 0);
}

function bidProblems(auction: CallAuction, book: Book, price: number): string[] {
  const found: string[] = [];
  for (let i = 0; i < auction.bidCount; i++) {
    const filled = auction.bidFilled[i];
    if (filled > auction.bidUnits[i]) found.push(`bid ${i} is overfilled`);
    if (filled > 0 && auction.bidLimit[i] < price) found.push(`bid ${i} pays above its limit`);
    if (filled * price > book.bids[auction.bidTrader[i]].cash) found.push(`bid ${i} pays more than its cash`);
  }
  return found;
}

function askProblems(auction: CallAuction, price: number): string[] {
  const found: string[] = [];
  for (let i = 0; i < auction.askCount; i++) {
    const filled = auction.askFilled[i];
    if (filled > auction.askUnits[i]) found.push(`ask ${i} is overfilled`);
    if (filled > 0 && auction.askLimit[i] > price) found.push(`ask ${i} sells below its limit`);
  }
  return found;
}

function crossingProblems(auction: CallAuction): string[] {
  const found: string[] = [];
  for (let b = 0; b < auction.bidCount; b++) {
    for (let a = 0; a < auction.askCount; a++) {
      const open = auction.bidFilled[b] < auction.bidUnits[b] && auction.askFilled[a] < auction.askUnits[a];
      if (open && auction.bidLimit[b] >= auction.askLimit[a]) found.push(`bid ${b} still meets ask ${a}`);
    }
  }
  return found;
}

function unitLimits(side: SideView): number[] {
  const all: number[] = [];
  for (let i = 0; i < side.count; i++) {
    for (let unit = 0; unit < side.units[i]; unit++) all.push(side.limit[i]);
  }
  return all;
}

// Expanded to one entry per unit, the best bid pairs with the best ask until a bid falls below its ask: the last pair
// is the marginal one, whatever order the orders came in.
function marginalClearing(auction: CallAuction): { volume: number; price: number } {
  const [bidSide, askSide] = sidesOf(auction);
  const bids = unitLimits(bidSide).sort((x, y) => y - x);
  const asks = unitLimits(askSide).sort((x, y) => x - y);
  let volume = 0;
  while (volume < bids.length && volume < asks.length && bids[volume] >= asks[volume]) volume++;
  return { volume, price: volume === 0 ? 0 : Math.floor((bids[volume - 1] + asks[volume - 1]) / 2) };
}

function volumeProblems(auction: CallAuction, price: number): string[] {
  const found: string[] = [];
  const bought = total(auction.bidFilled, auction.bidCount);
  const sold = total(auction.askFilled, auction.askCount);
  const expected = marginalClearing(auction);
  if (bought !== sold) found.push(`${bought} units bought but ${sold} sold`);
  if (bought !== expected.volume) found.push(`volume ${bought}, expected ${expected.volume}`);
  if (price !== expected.price) found.push(`price ${price}, expected ${expected.price}`);
  return found;
}

// x is ahead of y when it has the better limit, or an equal limit and the lower rank.
function isAhead(side: SideView, key: number, x: number, y: number): boolean {
  if (side.limit[x] !== side.limit[y]) return side.highFirst ? side.limit[x] > side.limit[y] : side.limit[x] < side.limit[y];
  return draw3(SEED, RANK_STREAM, key, side.side, x) < draw3(SEED, RANK_STREAM, key, side.side, y);
}

// Fills run down the queue, so nothing may be partly filled while an order behind it has a fill.
function queueProblems(side: SideView, key: number): string[] {
  const found: string[] = [];
  for (let x = 0; x < side.count; x++) {
    for (let y = 0; y < side.count; y++) {
      if (side.filled[y] > 0 && side.filled[x] < side.units[x] && isAhead(side, key, x, y)) {
        found.push(`${side.name} ${y} filled before ${side.name} ${x}`);
      }
    }
  }
  return found;
}

function problems(auction: CallAuction, book: Book, price: number, key: number): string[] {
  return [
    ...bidProblems(auction, book, price),
    ...askProblems(auction, price),
    ...crossingProblems(auction),
    ...volumeProblems(auction, price),
    ...sidesOf(auction).flatMap((side) => queueProblems(side, key)),
  ];
}

function clearBook(auction: CallAuction, book: number, size: BookSize): { book: Book; price: number } {
  const loaded = keyedBook(book, size);
  load(auction, loaded);
  return { book: loaded, price: auction.clear(SEED, RANK_STREAM, book) };
}

function hasPartialFill(auction: CallAuction): boolean {
  return sidesOf(auction).some((side) =>
    filledOf(side.filled, side.count).some((units, order) => units > 0 && units < side.units[order]),
  );
}

function digestOf(auction: CallAuction, price: number, digest: number): number {
  let h = mix(digest ^ price);
  for (let i = 0; i < auction.bidCount; i++) h = mix(h ^ auction.bidFilled[i]);
  for (let i = 0; i < auction.askCount; i++) h = mix(h ^ auction.askFilled[i]);
  return h;
}

// Indices of the orders with a fill, in the order the book holds them.
function fillers(filled: Int32Array, count: number): number[] {
  return filledOf(filled, count).flatMap((units, index) => (units > 0 ? [index] : []));
}

// The two lowest ranks among the tied orders, by the draw the plan names: draw3(seed, stream, key, side, index).
function lowestRanks(key: number, side: number): number[] {
  const tied = Array.from({ length: TIED }, (_, index) => index);
  const byRank = tied.sort((x, y) => draw3(SEED, RANK_STREAM, key, side, x) - draw3(SEED, RANK_STREAM, key, side, y));
  return byRank.slice(0, 2).sort((x, y) => x - y);
}

// Six one-unit orders at one limit on a side, against a single two-unit order at that limit on the other.
function tieWinners(auction: CallAuction, side: number, key: number): number[] {
  auction.reset();
  for (let i = 0; i < TIED; i++) {
    if (side === BID) auction.bid(i, 1, 100, 1_000);
    else auction.ask(i, 1, 100);
  }
  if (side === BID) auction.ask(0, 2, 100);
  else auction.bid(0, 2, 100, 1_000);
  auction.clear(SEED, RANK_STREAM, key);
  const view = sidesOf(auction)[side];
  return fillers(view.filled, view.count);
}

// Cash within a million cents of 2^53 over a limit of 2^22 to 2^23, so the quotient sits just under 2^31.
function keyedCashCase(index: number): number[] {
  return [
    Number.MAX_SAFE_INTEGER - (draw3(SEED, BOOK_STREAM, index, 0, 7) % 1_000_000),
    4_194_305 + (draw3(SEED, BOOK_STREAM, index, 1, 7) % 4_194_303),
  ];
}

describe('the call auction', () => {
  it('clears the worked example at 115, and again to the same answer', () => {
    const auction = newAuction(4);
    auction.bid(10, 10, 120, 10_000);
    auction.bid(11, 5, 100, 10_000);
    auction.bid(12, 5, 80, 10_000);
    auction.ask(20, 8, 90);
    auction.ask(21, 10, 110);
    for (let again = 0; again < 2; again++) {
      expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(115);
      expect(filledOf(auction.bidFilled, auction.bidCount)).toEqual([10, 0, 0]);
      expect(filledOf(auction.askFilled, auction.askCount)).toEqual([8, 2]);
    }
    expect([auction.bidTrader[0], auction.askTrader[1]]).toEqual([10, 21]);
  });

  it('rounds the midpoint down and matches a bid equal to an ask', () => {
    const auction = newAuction(2);
    auction.bid(0, 1, 101, 1_000);
    auction.ask(0, 1, 100);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(100);
    auction.reset();
    auction.bid(0, 1, 100, 1_000);
    auction.ask(0, 1, 100);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(100);
    expect([auction.bidFilled[0], auction.askFilled[0]]).toEqual([1, 1]);
  });

  it('returns 0 and fills nothing when no bid meets an ask', () => {
    const auction = newAuction(2);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(0);
    auction.bid(0, 5, 99, 1_000);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(0);
    auction.ask(0, 5, 100);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(0);
    expect([auction.bidFilled[0], auction.askFilled[0]]).toEqual([0, 0]);
  });

  it('keeps min(units, floor(cash / limit)) units of a bid, and no order that keeps none', () => {
    const auction = newAuction(4);
    auction.bid(7, 10, 120, 500);
    auction.bid(8, 3, 120, 10_000);
    auction.bid(9, 5, 120, 119);
    auction.ask(1, 0, 100);
    expect(auction.bidCount).toBe(2);
    expect(Array.from(auction.bidTrader.subarray(0, 2))).toEqual([7, 8]);
    expect(Array.from(auction.bidUnits.subarray(0, 2))).toEqual([4, 3]);
    expect(auction.askCount).toBe(0);
  });

  it('floors cash over a limit exactly for cash up to 2^53', () => {
    const auction = newAuction(1);
    const worstLimit = 8_388_607;
    const worstCash = Math.floor(Number.MAX_SAFE_INTEGER / worstLimit) * worstLimit - 1;
    const cases = [[worstCash, worstLimit], ...Array.from({ length: 200 }, (_, index) => keyedCashCase(index))];
    for (const [cash, limit] of cases) {
      auction.reset();
      auction.bid(0, INT32_MAX, limit, cash);
      expect(auction.bidUnits[0], `${cash} / ${limit}`).toBe(Number(BigInt(cash) / BigInt(limit)));
    }
  });

  it('keeps the market invariants over 1,000 keyed random books', () => {
    const auction = newAuction(SMALL.max);
    let traded = 0;
    let partial = 0;
    for (let k = 0; k < BOOKS; k++) {
      const { book, price } = clearBook(auction, k, SMALL);
      expect(problems(auction, book, price, k), `book ${k}`).toEqual([]);
      if (price > 0) traded++;
      if (hasPartialFill(auction)) partial++;
    }
    expect(traded).toBeGreaterThan(700);
    expect(partial).toBeGreaterThan(600);
  });

  it('keeps the same invariants on books of hundreds of orders, where the heaps run deep', () => {
    const auction = newAuction(LARGE.max);
    for (let k = BOOKS; k < BOOKS + LARGE_BOOKS; k++) {
      const { book, price } = clearBook(auction, k, LARGE);
      expect(price, `book ${k}`).toBeGreaterThan(0);
      expect(auction.bidCount, `book ${k}`).toBeGreaterThan(SMALL.max);
      expect(problems(auction, book, price, k), `book ${k}`).toEqual([]);
    }
  });

  it('replays 1,000 books to the same digest', () => {
    const auction = newAuction(SMALL.max);
    let digest = 0;
    for (let k = 0; k < BOOKS; k++) digest = digestOf(auction, clearBook(auction, k, SMALL).price, digest);
    expect(digest).toBe(552_923_653);
  });

  it('fills equal limits by rank, the same for one key and differently for another', () => {
    const auction = newAuction(TIED);
    for (const side of [BID, ASK]) {
      const seen = new Set<string>();
      for (let key = 0; key < 20; key++) {
        const winners = tieWinners(auction, side, key);
        expect(winners, `side ${side}, key ${key}`).toEqual(lowestRanks(key, side));
        expect(tieWinners(auction, side, key)).toEqual(winners);
        seen.add(winners.join());
      }
      expect(seen.size, `side ${side}`).toBeGreaterThan(1);
    }
  });

  it('throws RangeError when a side is full, and reset reopens it', () => {
    const auction = newAuction(2);
    auction.bid(0, 1, 100, 1_000);
    auction.bid(1, 1, 100, 1_000);
    expect(() => auction.bid(2, 1, 100, 1_000)).toThrow(RangeError);
    auction.ask(0, 1, 100);
    auction.ask(1, 1, 100);
    expect(() => auction.ask(2, 1, 100)).toThrow(RangeError);
    expect(auction.clear(SEED, RANK_STREAM, 0)).toBe(100);
    auction.reset();
    expect([auction.bidCount, auction.askCount]).toEqual([0, 0]);
    auction.bid(2, 1, 100, 1_000);
    expect(auction.bidCount).toBe(1);
  });

  it('takes its book from the arena, outside the hash', () => {
    const arena = reserveArena(65_536);
    const auction = new CallAuction(arena, 100);
    expect(auction.capacity).toBe(100);
    expect(arena.top).toBeGreaterThan(0);
    expect(arena.canonical).toEqual([]);
  });
});
