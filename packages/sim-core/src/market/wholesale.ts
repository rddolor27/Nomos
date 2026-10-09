import { take, type Arena } from '../memory/arena.ts';
import { draw3 } from '../random/draw.ts';

const BID_SIDE = 0;
const ASK_SIDE = 1;

// One side's orders as a binary heap of order indices, best first. Equal limits go to the lower rank, so no trader
// wins a tie by its place in the book.
class OrderHeap {
  private readonly order: Int32Array;
  private readonly limit: Float64Array;
  private readonly rank: Uint32Array;
  private readonly highestFirst: boolean;
  private size = 0;

  constructor(order: Int32Array, limit: Float64Array, rank: Uint32Array, highestFirst: boolean) {
    this.order = order;
    this.limit = limit;
    this.rank = rank;
    this.highestFirst = highestFirst;
  }

  get length(): number {
    return this.size;
  }

  get best(): number {
    return this.order[0];
  }

  build(count: number): void {
    for (let i = 0; i < count; i++) this.order[i] = i;
    this.size = count;
    for (let i = (count >> 1) - 1; i >= 0; i--) this.siftDown(i);
  }

  removeBest(): void {
    this.size--;
    this.order[0] = this.order[this.size];
    this.siftDown(0);
  }

  private before(a: number, b: number): boolean {
    if (this.limit[a] === this.limit[b]) return this.rank[a] < this.rank[b];
    return this.highestFirst ? this.limit[a] > this.limit[b] : this.limit[a] < this.limit[b];
  }

  private siftDown(from: number): void {
    const order = this.order;
    let parent = from;
    let left = 2 * parent + 1;
    while (left < this.size) {
      let first = parent;
      if (this.before(order[left], order[first])) first = left;
      if (left + 1 < this.size && this.before(order[left + 1], order[first])) first = left + 1;
      if (first === parent) return;
      const moved = order[parent];
      order[parent] = order[first];
      order[first] = moved;
      parent = first;
      left = 2 * parent + 1;
    }
  }
}

function startOrders(
  rank: Uint32Array,
  filled: Int32Array,
  count: number,
  seed: number,
  stream: number,
  key: number,
  side: number,
): void {
  for (let i = 0; i < count; i++) {
    rank[i] = draw3(seed, stream, key, side, i);
    filled[i] = 0;
  }
}

// A uniform-price call auction (R1) for the wholesale trade. The book is scratch in the arena, outside the hash: a read
// always follows this round's writes by reset, bid, ask and clear, so stale slots are never seen.
export class CallAuction {
  readonly capacity: number;
  readonly bidTrader: Int32Array;
  readonly bidUnits: Int32Array;
  readonly bidLimit: Float64Array;
  readonly bidFilled: Int32Array;
  readonly askTrader: Int32Array;
  readonly askUnits: Int32Array;
  readonly askLimit: Float64Array;
  readonly askFilled: Int32Array;
  private readonly bidRank: Uint32Array;
  private readonly askRank: Uint32Array;
  private readonly bidHeap: OrderHeap;
  private readonly askHeap: OrderHeap;
  private bidOrders = 0;
  private askOrders = 0;

  constructor(arena: Arena, capacity: number) {
    this.capacity = capacity;
    this.bidTrader = take(arena, Int32Array, capacity, false);
    this.bidUnits = take(arena, Int32Array, capacity, false);
    this.bidLimit = take(arena, Float64Array, capacity, false);
    this.bidFilled = take(arena, Int32Array, capacity, false);
    this.askTrader = take(arena, Int32Array, capacity, false);
    this.askUnits = take(arena, Int32Array, capacity, false);
    this.askLimit = take(arena, Float64Array, capacity, false);
    this.askFilled = take(arena, Int32Array, capacity, false);
    this.bidRank = take(arena, Uint32Array, capacity, false);
    this.askRank = take(arena, Uint32Array, capacity, false);
    this.bidHeap = new OrderHeap(take(arena, Int32Array, capacity, false), this.bidLimit, this.bidRank, true);
    this.askHeap = new OrderHeap(take(arena, Int32Array, capacity, false), this.askLimit, this.askRank, false);
  }

  get bidCount(): number {
    return this.bidOrders;
  }

  get askCount(): number {
    return this.askOrders;
  }

  reset(): void {
    this.bidOrders = 0;
    this.askOrders = 0;
  }

  // A bid that cash cannot back for one unit, and an ask with no stock, leave no order.
  bid(trader: number, units: number, limitCents: number, cashCents: number): void {
    if (this.bidOrders === this.capacity) throw new RangeError(`a call auction holds ${this.capacity} bids`);
    // Exact: whole cash below 2^53 over a whole limit never rounds up to the next whole number.
    const kept = Math.min(units, Math.floor(cashCents / limitCents));
    if (kept < 1) return;
    const i = this.bidOrders++;
    this.bidTrader[i] = trader;
    this.bidUnits[i] = kept;
    this.bidLimit[i] = limitCents;
  }

  ask(trader: number, units: number, limitCents: number): void {
    if (this.askOrders === this.capacity) throw new RangeError(`a call auction holds ${this.capacity} asks`);
    if (units < 1) return;
    const i = this.askOrders++;
    this.askTrader[i] = trader;
    this.askUnits[i] = units;
    this.askLimit[i] = limitCents;
  }

  // Settle every fill at the returned price, which is 0 when nothing matched. The marginal pair's midpoint sits between
  // every matched ask and every matched bid, so no buyer pays above its limit and no seller gets below its ask (R1).
  clear(seed: number, stream: number, key: number): number {
    startOrders(this.bidRank, this.bidFilled, this.bidOrders, seed, stream, key, BID_SIDE);
    startOrders(this.askRank, this.askFilled, this.askOrders, seed, stream, key, ASK_SIDE);
    this.bidHeap.build(this.bidOrders);
    this.askHeap.build(this.askOrders);
    let lastBid = 0;
    let lastAsk = 0;
    while (this.bidHeap.length > 0 && this.askHeap.length > 0) {
      const b = this.bidHeap.best;
      const a = this.askHeap.best;
      if (this.bidLimit[b] < this.askLimit[a]) break;
      const units = Math.min(this.bidUnits[b] - this.bidFilled[b], this.askUnits[a] - this.askFilled[a]);
      this.bidFilled[b] += units;
      this.askFilled[a] += units;
      lastBid = this.bidLimit[b];
      lastAsk = this.askLimit[a];
      if (this.bidFilled[b] === this.bidUnits[b]) this.bidHeap.removeBest();
      if (this.askFilled[a] === this.askUnits[a]) this.askHeap.removeBest();
    }
    return Math.floor((lastBid + lastAsk) / 2);
  }
}
