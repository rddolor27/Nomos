import { planConsumption } from '../consumption/plan.ts';
import { CITY } from '../economy/city.ts';
import { openYearEmployers } from '../economy/scratch.ts';
import { firmAccount, retire, walletAccount } from '../money/ledger.ts';
import { dayOf, dayOfMonth, monthOf } from '../time/calendar.ts';
import { NO_PLACE, TICK, type World } from '../world/world.ts';
import { stepAwayTown } from './away.ts';
import { foldToLedger } from './fold.ts';
import type { Homes } from './homes.ts';
import { LEDGER_FIELDS, populationAt } from './record.ts';
import { firstRecord, seatTown } from './town.ts';

// Spends the pending request at a day boundary, before the day's window opens (M2.2c Ruling 2). The live town folds into
// its ledger row and hands its money back to MINT, and the requested town spawns on the request's ground from its own row,
// keyed (place, day). A request for the live town, or none, switches nothing. A throw midway leaves the world half-written,
// as it does in spawnFromLedger, and the caller drops it; requestTown screens what could throw.
export function switchTown(world: World): void {
  const request = world.request;
  const place = request.place;
  request.place = NO_PLACE;
  if (place === NO_PLACE || place === world.focus[0]) return;
  leaveTown(world);
  world.ground = request.ground;
  enterTown(world, place, request.homes, dayOf(world.globals[TICK]));
}

function leaveTown(world: World): void {
  foldToLedger(world, world.recordRow);
  writeRow(world.townRecords, world.focus[0], world.recordRow);
  emptyTown(world);
}

// Back to the layout's fresh state, so the next spawn finds what it finds in a new world. MINT takes back every cent of the
// wallets and the firms, since a row's cash sits outside the ledger until it spawns again. The two fills clear the agent
// columns and the firms, scratch, households and goods; the stand-in cultures layoutWorld wrote sit between them and stay.
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

// Spawns `place` from its row, which a first visit makes first. The month's consumption plans come from a month's first
// day, so a town that spawns on any other day makes them at once.
function enterTown(world: World, place: number, homes: Homes, day: number): void {
  const row = world.recordRow;
  if (populationAt(world.townRecords, place * LEDGER_FIELDS) === 0) openTown(world, place, homes, day);
  readRow(world.townRecords, place, row);
  seatTown(world, row, homes, place, day);
  if (dayOfMonth(day) !== 0) planConsumption(world, CITY);
  world.focus[0] = place;
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
