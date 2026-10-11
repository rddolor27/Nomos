import { SUPPLIERS } from '../agents/store.ts';
import { planConsumption } from '../consumption/plan.ts';
import { CITY } from '../economy/city.ts';
import { openYearEmployers } from '../economy/scratch.ts';
import { floorDiv } from '../maths/int.ts';
import { firmAccount, retire, walletAccount } from '../money/ledger.ts';
import { DAYS_PER_MONTH, dayOf, dayOfMonth, monthOf } from '../time/calendar.ts';
import { FOCUS_PENDING, NO_PLACE, TICK, type World } from '../world/world.ts';
import { stepAwayTown } from './away.ts';
import { foldToLedger } from './fold.ts';
import { bedCount, type Homes } from './homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_WAGE,
  firstFirmCash,
  populationAt,
  populationOf,
} from './record.ts';
import { firstRecord, seatTown } from './town.ts';

// Whether `homes` can seat the town `place` spawns. A row nobody has visited needs the beds a household has suppliers (the
// least a town spawns with), and a visited row a bed for each of its people, which a crowd folded in bigger homes, such as a
// ?tier= start's stand-in town, can outnumber (M2.2c review).
export function homesSeat(world: World, place: number, homes: Homes): boolean {
  return bedCount(homes) >= Math.max(SUPPLIERS, populationAt(world.townRecords, place * LEDGER_FIELDS));
}

// Spends the pending request at a day boundary, before the day's window opens (M2.2c Ruling 2), for `place`, the town the
// boundary's last logged focus names. The live town folds into its ledger row and hands its money back to MINT, and the
// requested town spawns on the request's ground from its own row, keyed (place, day). A focus on the live town switches
// nothing. The request is spent either way. Both checks come before the fold, so a throw leaves the live town and every row as
// they were: nothing after them throws on a row this module wrote. A world restored from a checkpoint holds the pending place
// and its log entry but not the ground and homes, so a place with none attached throws.
export function switchTown(world: World, place: number): void {
  const request = world.request;
  const attachedFor = request.place;
  request.place = NO_PLACE;
  world.focus[FOCUS_PENDING] = NO_PLACE;
  if (place === NO_PLACE || place === world.focus[0]) return;
  if (attachedFor !== place) throw new RangeError(`no ground and homes are attached for place ${place}`);
  requireSeats(world, place, request.homes);
  leaveTown(world);
  world.ground = request.ground;
  enterTown(world, place, request.homes, dayOf(world.globals[TICK]));
}

function requireSeats(world: World, place: number, homes: Homes): void {
  if (homesSeat(world, place, homes)) return;
  const people = populationAt(world.townRecords, place * LEDGER_FIELDS);
  throw new RangeError(`place ${place} holds ${people} people, and its homes have ${bedCount(homes)} beds`);
}

function leaveTown(world: World): void {
  foldToLedger(world, world.recordRow);
  writeRow(world.townRecords, world.focus[0], world.recordRow);
  emptyTown(world);
}

// Back to the layout's fresh state, so the next spawn finds what it finds in a new world. MINT takes back every cent of the
// wallets and the firms, since a row's cash sits outside the ledger until it spawns again. The first fill clears every agent
// column, culture and look included. Nothing in spawn/ reads them, and addAgent rewrites each blob's row as it spawns, so the
// zeroes never show. The second fill clears the firms, scratch, households and goods; the cultureUid table between them stays.
function emptyTown(world: World): void {
  retireCash(world);
  world.agentBytes.fill(0);
  world.economyBytes.fill(0);
  openYearEmployers(world.economyScratch);
}

function retireCash(world: World): void {
  const { agents, firms, cash } = world;
  for (let p = 0; p < agents.count[0]; p++) {
    const account = walletAccount(cash, p);
    retire(cash, account, cash.balance[account]);
  }
  for (let f = 0; f < firms.count[0]; f++) {
    const account = firmAccount(cash, f);
    retire(cash, account, cash.balance[account]);
  }
}

// Spawns `place` from its row, which a first visit makes first. A month's first-day systems make its consumption plans and
// start its firms' demand counters, so a town that spawns on any other day has the month so far filled in at once.
function enterTown(world: World, place: number, homes: Homes, day: number): void {
  const row = world.recordRow;
  if (populationAt(world.townRecords, place * LEDGER_FIELDS) === 0) openTown(world, place, homes, day);
  readRow(world.townRecords, place, row);
  const dayInMonth = dayOfMonth(day);
  if (dayInMonth !== 0) fundPayroll(row, dayInMonth);
  seatTown(world, row, homes, place, day);
  if (dayInMonth !== 0) startMidMonth(world, dayInMonth);
  world.focus[0] = place;
}

// The payroll due on a month's last day waits on the month's sales, and a town entering on day k has lost the first k days of
// them: a first record and a summary month leave its firms the cash a month starts with. So its firms hold at least that plus
// k/21 of the wage bill, moved from the households as resetCashSplit moves cash at a month start. A row folded earlier this
// month, whose firms already hold more, keeps its cash.
function fundPayroll(row: Float64Array, dayInMonth: number): void {
  const total = row[LEDGER_HOUSEHOLD_CASH] + row[LEDGER_FIRM_CASH];
  const monthSoFar = floorDiv(row[LEDGER_EMPLOYED] * row[LEDGER_WAGE] * dayInMonth, DAYS_PER_MONTH);
  const firms = Math.max(row[LEDGER_FIRM_CASH], Math.min(total, firstFirmCash(populationOf(row)) + monthSoFar));
  row[LEDGER_FIRM_CASH] = firms;
  row[LEDGER_HOUSEHOLD_CASH] = total - firms;
}

// The plans cover the whole month, and the demand counters start at the share of a month's demand that the first k days would
// have asked. Left at 0, the month's close would hand the next decisions a demand short by k/21, and the firms would read
// their stock as long, give notice and lay people off.
function startMidMonth(world: World, dayInMonth: number): void {
  planConsumption(world, CITY);
  const firms = world.firms;
  for (let f = 0; f < firms.count[0]; f++) firms.demand[f] = floorDiv(firms.lastDemand[f] * dayInMonth, DAYS_PER_MONTH);
}

// A first visit: the town's first record, advanced through every month that began before today, as the summary month would
// have left a town away since day 0 (Ruling 8). A month that begins today steps the towns away after the switch, not this one.
function openTown(world: World, place: number, homes: Homes, day: number): void {
  const row = world.recordRow;
  firstRecord(world, homes, row);
  writeRow(world.townRecords, place, row);
  const months = Math.max(0, monthOf(day - 1));
  for (let month = 1; month <= months; month++) stepAwayTown(world.townRecords, place, world.seed, month, row);
}

function readRow(rows: Float64Array, town: number, out: Float64Array): void {
  const first = town * LEDGER_FIELDS;
  for (let field = 0; field < LEDGER_FIELDS; field++) out[field] = rows[first + field];
}

function writeRow(rows: Float64Array, town: number, row: Float64Array): void {
  const first = town * LEDGER_FIELDS;
  for (let field = 0; field < LEDGER_FIELDS; field++) rows[first + field] = row[field];
}
