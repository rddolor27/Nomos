import { SUPPLIERS, addAgent } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { BREAD, CLOTH, FUEL, goodOfLink, isFood, openingPriceOf, outputPerWorkerDay, splitByGood } from '../goods/goods.ts';
import { assignGoods, ringSlot } from '../goods/store.ts';
import { MAX_HOUSEHOLD } from '../households/store.ts';
import { apportionByStride } from '../maths/apportion.ts';
import { CASH_WEIGHTS, FIRM_SIZE_WEIGHTS, PRICE_WEIGHTS } from '../maths/tables.ts';
import { firmAccount, issue, walletAccount } from '../money/ledger.ts';
import { draw2, draw3, draw4 } from '../random/draw.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { SPAWN_DRAW } from '../random/streams.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import { pointInTileQ8 } from '../world/ground.ts';
import { GOODS, STAND_IN_CULTURES, type World } from '../world/world.ts';
import { seatHouseholds, type Homes } from './homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_WAGE,
  checkRecord,
} from './record.ts';

// Purposes on SPAWN_DRAW after homes.ts's HOME_ORDER (0), one to a use. A draw keys (key, index, purpose) and an
// apportionByStride word (key, purpose), where key is the place and day (M2.2 Ruling 6).
const HOUSEHOLD_ORDER = 1;
const PERSON = 2;
const FIRM_SIZE = 3;
const FIRM_SIZE_SPLIT = 4;
const JOB_ORDER = 5;
const PRICE = 6;
const PRICE_SPLIT = 7;
const STOCK_SPLIT = 8;
const FIRM_CASH_SPLIT = 9;
const LINK = 10;
const CASH = 11;
const CASH_SPLIT = 12;
// After town.ts's 13: a goods world's stride word for splitting one good's jobs over its firms, keyed (key, good, purpose).
const GOOD_SIZE_SPLIT = 14;
// The weight tables hold 256 entries, so a draw's low byte picks one.
const TABLE_INDEX = 255;
const TWO_TO_MINUS_32 = 1 / 4_294_967_296;

// Builds the record's city in an empty, laid-out world, with MINT issuing every cent (M2.2 Rulings 5 and 7). Demand,
// plans and counters stay zero, as after startEconomy, so the economy day runs from a month's day 0. A throw midway
// leaves the world half-written, and the caller drops it, as with layoutWorld. With goods on (M2.4), the firms hold the
// seven goods in exact shares: the record's price and stock go to the goods firms alone, as foldToLedger reads them, and
// each food firm starts fresh, with a day of output made the day before.
export function spawnFromLedger(
  world: World,
  record: Float64Array,
  homes: Homes,
  params: EconomyParams,
  settlement: number,
  day: number,
): void {
  checkRecord(record, world);
  requireEmpty(world);
  world.globals[GOODS] = params.goods;
  const key = draw2(world.seed, SPAWN_DRAW, settlement, day);
  const households = world.households;
  listHouseholds(world, record, key);
  seatHouseholds(households.size, households.count[0], households.home, homes, world.seed, key);
  spawnPeople(world, homes, key);
  if (params.goods === 1) {
    hireByGood(world, record, key);
    postPricesByGood(world, record, key);
    stockByGood(world, record, params, key, day);
    linkByGood(world, key);
  } else {
    hire(world, record, key);
    postPrices(world, record, key);
    stockFirms(world, record, params, key);
    linkSuppliers(world, record, key);
  }
  fundFirms(world, record, key);
  fundHouseholds(world, record, key);
}

function requireEmpty(world: World): void {
  if (world.agents.count[0] > 0 || world.households.count[0] > 0 || world.firms.count[0] > 0) {
    throw new RangeError('spawn fills an empty world, and this one holds agents, households or firms');
  }
}

// The record's households, listed smallest first, in a keyed order.
function listHouseholds(world: World, record: Float64Array, key: number): void {
  const { count, size } = world.households;
  const order = world.economyScratch.order;
  let households = 0;
  for (let s = 1; s <= MAX_HOUSEHOLD; s++) households += record[LEDGER_HOUSEHOLDS + s - 1];
  keyedShuffle(order, households, world.seed, SPAWN_DRAW, key, HOUSEHOLD_ORDER);
  for (let h = 0; h < households; h++) size[h] = listedSize(record, order[h]);
  count[0] = households;
}

function listedSize(record: Float64Array, listed: number): number {
  let size = 1;
  let end = record[LEDGER_HOUSEHOLDS];
  while (listed >= end) {
    size++;
    end += record[LEDGER_HOUSEHOLDS + size - 1];
  }
  return size;
}

// Household by household, so members sit at adjacent indices, each idle in its home's door tile, which hides the
// pop-in (R4 3.3).
function spawnPeople(world: World, homes: Homes, key: number): void {
  const { agents, households, seed } = world;
  let p = 0;
  for (let h = 0; h < households.count[0]; h++) {
    const home = households.home[h];
    for (let m = 0; m < households.size[h]; m++, p++) {
      const id = draw3(seed, SPAWN_DRAW, key, p, PERSON);
      addAgent(agents, seed, id, STAND_IN_CULTURES, 0);
      agents.x[p] = pointInTileQ8(homes.doorX[home], id);
      agents.y[p] = pointInTileQ8(homes.doorY[home], id >>> 12);
    }
  }
}

// n weights from the table, keyed on the firm or person at index first + i, which a good's run of firm rows needs.
function drawWeights(
  table: Uint16Array,
  n: number,
  weights: Float64Array,
  seed: number,
  key: number,
  purpose: number,
  first = 0,
): void {
  for (let i = 0; i < n; i++) weights[i] = table[draw3(seed, SPAWN_DRAW, key, first + i, purpose) & TABLE_INDEX];
}

// Firm sizes split the employed by the lognormal table, then the first employed of a keyed order of everyone take the
// jobs, firm by firm. Each hired place in the order then holds its blob's firm, for linkSuppliers.
function hire(world: World, record: Float64Array, key: number): void {
  const { agents, firms, seed } = world;
  const { order, weights, shares } = world.economyScratch;
  const firmCount = record[LEDGER_FIRMS];
  firms.count[0] = firmCount;
  drawWeights(FIRM_SIZE_WEIGHTS, firmCount, weights, seed, key, FIRM_SIZE);
  apportionByStride(record[LEDGER_EMPLOYED], weights, firmCount, shares, draw2(seed, SPAWN_DRAW, key, FIRM_SIZE_SPLIT));
  keyedShuffle(order, agents.count[0], seed, SPAWN_DRAW, key, JOB_ORDER);
  let hired = 0;
  for (let f = 0; f < firmCount; f++) {
    firms.employees[f] = shares[f];
    for (let w = 0; w < shares[f]; w++, hired++) {
      agents.employer[order[hired]] = f;
      order[hired] = f;
    }
  }
}

// Prices spread around the record's mean and sum to exactly F x price, so the fold's mean is the record's.
function postPrices(world: World, record: Float64Array, key: number): void {
  const { firms, seed } = world;
  const weights = world.economyScratch.weights;
  const firmCount = firms.count[0];
  drawWeights(PRICE_WEIGHTS, firmCount, weights, seed, key, PRICE);
  const word = draw2(seed, SPAWN_DRAW, key, PRICE_SPLIT);
  apportionByStride(firmCount * record[LEDGER_PRICE], weights, firmCount, firms.price, word);
  for (let f = 0; f < firmCount; f++) firms.wage[f] = record[LEDGER_WAGE];
}

// Stock and cash follow workers + 1, as a stationary firm's do, and last month's demand is a month of output, as in
// startEconomy.
function stockFirms(world: World, record: Float64Array, params: EconomyParams, key: number): void {
  const { firms, seed } = world;
  const { weights, shares } = world.economyScratch;
  const firmCount = firms.count[0];
  for (let f = 0; f < firmCount; f++) {
    weights[f] = firms.employees[f] + 1;
    firms.lastDemand[f] = DAYS_PER_MONTH * params.unitsPerWorkerDay * firms.employees[f];
  }
  apportionByStride(record[LEDGER_STOCK], weights, firmCount, shares, draw2(seed, SPAWN_DRAW, key, STOCK_SPLIT));
  for (let f = 0; f < firmCount; f++) firms.stock[f] = shares[f];
}

function fundFirms(world: World, record: Float64Array, key: number): void {
  const { firms, cash, seed } = world;
  const { weights, shares } = world.economyScratch;
  const firmCount = firms.count[0];
  for (let f = 0; f < firmCount; f++) weights[f] = firms.employees[f] + 1;
  apportionByStride(record[LEDGER_FIRM_CASH], weights, firmCount, shares, draw2(seed, SPAWN_DRAW, key, FIRM_CASH_SPLIT));
  for (let f = 0; f < firmCount; f++) issue(cash, firmAccount(cash, f), shares[f]);
}

// Seven distinct firms to a blob, firm f with odds (workers + 1) / (employed + F), since a stationary firm's links follow
// its size. A draw u below employed takes the u-th hired blob's firm, and any other u takes firm u - employed. A repeat
// steps on to the next firm, as in startEconomy.
function linkSuppliers(world: World, record: Float64Array, key: number): void {
  const { agents, seed } = world;
  const suppliers = agents.suppliers;
  // The bench's spawn row: hire left the u-th hired blob's firm at order[u], one read where employer[order[u]] took two.
  const firmOfHired = world.economyScratch.order;
  const employed = record[LEDGER_EMPLOYED];
  const firmCount = record[LEDGER_FIRMS];
  for (let p = 0; p < agents.count[0]; p++) {
    const first = p * SUPPLIERS;
    // The bench's spawn row: drawing all seven before any step lets their memory reads overlap, a third faster, and
    // gives the same links as stepping each in turn.
    for (let k = 0; k < SUPPLIERS; k++) {
      const u = scaleDraw(draw4(seed, SPAWN_DRAW, key, p, k, LINK), employed + firmCount);
      suppliers[first + k] = u < employed ? firmOfHired[u] : u - employed;
    }
    for (let k = 1; k < SUPPLIERS; k++) stepPastRepeats(suppliers, first, k, firmCount);
  }
}

// A 32-bit draw scaled to a whole number below n, a multiply where % takes an integer division (the bench's spawn row).
// For n below 2^21 the product stays under 2^53, and the scale is a power of two, so both steps are exact everywhere.
function scaleDraw(draw: number, n: number): number {
  return Math.floor(draw * n * TWO_TO_MINUS_32);
}

function stepPastRepeats(suppliers: Int32Array, first: number, k: number, firmCount: number): void {
  let firm = suppliers[first + k];
  while (linkedBefore(suppliers, first, k, firm)) firm = (firm + 1) % firmCount;
  suppliers[first + k] = firm;
}

function linkedBefore(suppliers: Int32Array, first: number, links: number, firm: number): boolean {
  for (let k = 0; k < links; k++) if (suppliers[first + k] === firm) return true;
  return false;
}

// A goods world's firms (M2.4). The rows run good by good in table order, the foods first, then cloth, tools and fuel,
// so the goods firms the record counts are the rows from the first cloth row on.
// The employed are split over the goods as the rows are, then over each good's rows by the size table. Hired places in
// the keyed order run firm by firm in row order, so a good's places are a run, as its rows are.
function hireByGood(world: World, record: Float64Array, key: number): void {
  const { agents, firms, goods, seed } = world;
  const firmCount = record[LEDGER_FIRMS];
  firms.count[0] = firmCount;
  assignGoods(goods, firmCount);
  splitByGood(record[LEDGER_EMPLOYED], 0, goods.jobs);
  keyedShuffle(world.economyScratch.order, agents.count[0], seed, SPAWN_DRAW, key, JOB_ORDER);
  let hired = 0;
  for (let good = BREAD; good <= FUEL; good++) hired = hireGood(world, key, good, hired);
}

// Hires one good's jobs into its rows from the first hired place not yet taken, and returns the next.
function hireGood(world: World, key: number, good: number, hired: number): number {
  const { agents, firms, goods, seed } = world;
  const { order, weights, shares } = world.economyScratch;
  const first = goods.firstRow[good];
  const rows = goods.rowCount[good];
  drawWeights(FIRM_SIZE_WEIGHTS, rows, weights, seed, key, FIRM_SIZE, first);
  apportionByStride(goods.jobs[good], weights, rows, shares, draw3(seed, SPAWN_DRAW, key, good, GOOD_SIZE_SPLIT));
  let next = hired;
  for (let i = 0; i < rows; i++) {
    firms.employees[first + i] = shares[i];
    for (let w = 0; w < shares[i]; w++, next++) {
      agents.employer[order[next]] = first + i;
      order[next] = first + i;
    }
  }
  return next;
}

// The goods firms' prices spread around the record's mean and sum to exactly their count x price, so the fold's mean is
// the record's. A food firm opens at the record's price over 6, floored.
function postPricesByGood(world: World, record: Float64Array, key: number): void {
  const { firms, goods, seed } = world;
  const { weights, shares } = world.economyScratch;
  const firmCount = firms.count[0];
  const firstGoodsRow = goods.firstRow[CLOTH];
  const goodsRows = firmCount - firstGoodsRow;
  drawWeights(PRICE_WEIGHTS, goodsRows, weights, seed, key, PRICE, firstGoodsRow);
  apportionByStride(goodsRows * record[LEDGER_PRICE], weights, goodsRows, shares, draw2(seed, SPAWN_DRAW, key, PRICE_SPLIT));
  for (let f = 0; f < firstGoodsRow; f++) firms.price[f] = openingPriceOf(goods.good[f], record[LEDGER_PRICE]);
  for (let i = 0; i < goodsRows; i++) firms.price[firstGoodsRow + i] = shares[i];
  for (let f = 0; f < firmCount; f++) firms.wage[f] = record[LEDGER_WAGE];
}

// The record's stock follows workers + 1 over the goods firms alone. A food firm starts fresh: a day of output, made the
// day before, in its ring.
function stockByGood(world: World, record: Float64Array, params: EconomyParams, key: number, day: number): void {
  const { firms, goods, seed } = world;
  const { weights, shares } = world.economyScratch;
  const firmCount = firms.count[0];
  const firstGoodsRow = goods.firstRow[CLOTH];
  const goodsRows = firmCount - firstGoodsRow;
  for (let f = 0; f < firmCount; f++) openOutput(world, params, day, f);
  for (let i = 0; i < goodsRows; i++) weights[i] = firms.employees[firstGoodsRow + i] + 1;
  apportionByStride(record[LEDGER_STOCK], weights, goodsRows, shares, draw2(seed, SPAWN_DRAW, key, STOCK_SPLIT));
  for (let i = 0; i < goodsRows; i++) firms.stock[firstGoodsRow + i] = shares[i];
}

// Last month's demand is a month of the firm's output, as in startEconomy.
function openOutput(world: World, params: EconomyParams, day: number, f: number): void {
  const { firms, goods } = world;
  const good = goods.good[f];
  const dayOutput = outputPerWorkerDay(good, params.unitsPerWorkerDay) * firms.employees[f];
  firms.lastDemand[f] = DAYS_PER_MONTH * dayOutput;
  if (!isFood(good)) return;
  firms.stock[f] = dayOutput;
  goods.ring[ringSlot(f, day - 1)] = dayOutput;
}

// Link k is a firm of good k + 1, with odds (workers + 1) / (jobs + rows) among the rows of that good, drawn as
// linkSuppliers does among all the firms. The links of one household are different goods, so none repeats.
function linkByGood(world: World, key: number): void {
  const { agents, goods, seed } = world;
  const suppliers = agents.suppliers;
  const firmOfHired = world.economyScratch.order;
  for (let p = 0; p < agents.count[0]; p++) {
    let hiredBefore = 0;
    for (let k = 0; k < SUPPLIERS; k++) {
      const good = goodOfLink(k);
      const jobs = goods.jobs[good];
      const u = scaleDraw(draw4(seed, SPAWN_DRAW, key, p, k, LINK), jobs + goods.rowCount[good]);
      suppliers[p * SUPPLIERS + k] = u < jobs ? firmOfHired[hiredBefore + u] : goods.firstRow[good] + u - jobs;
      hiredBefore += jobs;
    }
  }
}

function fundHouseholds(world: World, record: Float64Array, key: number): void {
  const { agents, cash, seed } = world;
  const { weights, shares } = world.economyScratch;
  const people = agents.count[0];
  drawWeights(CASH_WEIGHTS, people, weights, seed, key, CASH);
  apportionByStride(record[LEDGER_HOUSEHOLD_CASH], weights, people, shares, draw2(seed, SPAWN_DRAW, key, CASH_SPLIT));
  for (let p = 0; p < people; p++) {
    issue(cash, walletAccount(cash, p), shares[p]);
    agents.reservationWage[p] = record[LEDGER_WAGE];
  }
}
