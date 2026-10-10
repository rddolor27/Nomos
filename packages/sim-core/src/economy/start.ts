import { SUPPLIERS } from '../agents/store.ts';
import { goodOfLink, isFood, openingPriceOf, outputPerWorkerDay } from '../goods/goods.ts';
import { assignGoods, ringSlot } from '../goods/store.ts';
import { NO_HOME } from '../households/store.ts';
import { issue, retire, walletAccount } from '../money/ledger.ts';
import { draw4, drawBelow4 } from '../random/draw.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { START_DRAW } from '../random/streams.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import { GOODS, type World } from '../world/world.ts';
import { checkParams, type EconomyParams } from './params.ts';

// The start is month 0. Purposes of START_DRAW's keys (month, household, purpose) and (month, household, link, purpose).
const START_MONTH = 0;
const JOBS = 0;
const LINKS = 1;
// A goods world opens its food as the day before the start's output, so it sells from the first day.
const DAY_BEFORE_START = -1;

// Ruling 8, the replication's start (R2 Key Question 6), on a fresh world of exactly the preset's households. With goods on
// (M2.4), the firm rows hold the seven goods in exact shares, and link k of every household is a firm of good k + 1.
export function startEconomy(world: World, params: EconomyParams): void {
  checkParams(params, world.tier);
  const blobs = world.agents.count[0];
  if (blobs !== params.households) {
    throw new RangeError(`the economy starts with ${params.households} households, one a blob, not ${blobs} blobs`);
  }
  world.firms.count[0] = params.firms;
  world.globals[GOODS] = params.goods;
  if (params.goods === 1) assignGoods(world.goods, params.firms);
  openHouseholds(world, params);
  hireEveryone(world, params);
  openFirms(world, params);
  linkSuppliers(world, params);
  fundHouseholds(world, params);
}

// A blob is still a whole household of the economy (M2.2 Ruling 1), so each row holds one person and no home.
function openHouseholds(world: World, params: EconomyParams): void {
  const { count, size, home } = world.households;
  count[0] = params.households;
  for (let h = 0; h < params.households; h++) {
    size[h] = 1;
    home[h] = NO_HOME;
  }
}

// Household order[i] works at firm i mod F, so every firm holds floor(H / F) workers or one more.
function hireEveryone(world: World, params: EconomyParams): void {
  const { agents, firms } = world;
  const order = world.economyScratch.order;
  keyedShuffle(order, params.households, world.seed, START_DRAW, START_MONTH, JOBS);
  for (let i = 0; i < params.households; i++) {
    const household = order[i];
    const firm = i % params.firms;
    agents.employer[household] = firm;
    agents.reservationWage[household] = params.openingWage;
    firms.employees[firm]++;
  }
}

// A day's output in stock and a month's output as last month's demand; firms hold no cash. A food firm's day of output
// sits in the day before the start's slot.
function openFirms(world: World, params: EconomyParams): void {
  const { firms, goods } = world;
  for (let f = 0; f < params.firms; f++) {
    const good = goods.good[f];
    const dayOutput = outputPerWorkerDay(good, params.unitsPerWorkerDay) * firms.employees[f];
    firms.price[f] = openingPriceOf(good, params.openingPrice);
    firms.wage[f] = params.openingWage;
    firms.stock[f] = dayOutput;
    firms.lastDemand[f] = DAYS_PER_MONTH * dayOutput;
    if (isFood(good)) goods.ring[ringSlot(f, DAY_BEFORE_START)] = dayOutput;
  }
}

// Seven uniform draws, each stepping on past a firm already linked, so a household never holds a firm twice. With goods on,
// link k draws among the rows of good k + 1, so no step is needed.
function linkSuppliers(world: World, params: EconomyParams): void {
  if (params.goods === 1) {
    linkByGood(world, params);
    return;
  }
  const suppliers = world.agents.suppliers;
  for (let h = 0; h < params.households; h++) {
    const first = h * SUPPLIERS;
    for (let k = 0; k < SUPPLIERS; k++) {
      let firm = draw4(world.seed, START_DRAW, START_MONTH, h, k, LINKS) % params.firms;
      while (linkedBefore(suppliers, first, k, firm)) firm = (firm + 1) % params.firms;
      suppliers[first + k] = firm;
    }
  }
}

function linkByGood(world: World, params: EconomyParams): void {
  const suppliers = world.agents.suppliers;
  const { firstRow, rowCount } = world.goods;
  for (let h = 0; h < params.households; h++) {
    for (let k = 0; k < SUPPLIERS; k++) {
      const good = goodOfLink(k);
      suppliers[h * SUPPLIERS + k] = firstRow[good] + drawBelow4(world.seed, START_DRAW, START_MONTH, h, k, LINKS, rowCount[good]);
    }
  }
}

function linkedBefore(suppliers: Int32Array, first: number, links: number, firm: number): boolean {
  for (let k = 0; k < links; k++) if (suppliers[first + k] === firm) return true;
  return false;
}

// populate gave every blob OPENING_CENTS; MINT tops each wallet up to the opening cash, or takes the excess back.
function fundHouseholds(world: World, params: EconomyParams): void {
  const cash = world.cash;
  for (let h = 0; h < params.households; h++) {
    const wallet = walletAccount(cash, h);
    const change = params.openingCash - cash.balance[wallet];
    if (change > 0) issue(cash, wallet, change);
    else if (change < 0) retire(cash, wallet, -change);
  }
}
