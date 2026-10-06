// Wires the systems to one world and defines the per-tick bundle and three day-boundary variants:
//   separate - four passes at the boundary tick;
//   fused    - one agent sweep and one household sweep at the boundary tick;
//   sliced   - the fused sweeps in fixed 1,024-entity chunks, one chunk per tick after the boundary,
//              agents first, then households; the ledger commits when the last chunk finishes.
import { createWorld, initLots } from './world.mjs';
import { bindFood, addLot, spoilDay, LAYOUT } from './food.mjs';
import { bindShopQ } from './shopq.mjs';
import { bindNeeds, initNeeds, tickAll, tickStagger, tickWheel } from './needs.mjs';
import { bindShop, processShops } from './shop.mjs';
import { bindDaily, dayBegin, wealthAgents, wealthHouseholds, happinessAgents, agentDayFused, householdDayFused, resourceDay, dayEnd } from './daily.mjs';

export const MODES = { all: 0, stagger: 1, wheel: 2 };
export const DAY_MODES = { separate: 0, fused: 1, sliced: 2 };
export const CHUNK = 1024;

export function bindAll(w) { bindFood(w); bindShopQ(w); bindNeeds(w); bindShop(w); bindDaily(w); }

export function makeSim(opts) {
  const w = createWorld({ ...opts, lotLayout: LAYOUT });
  bindAll(w);
  initLots(w, addLot, 1);
  initNeeds(w, 0);
  w.modeId = MODES[w.mode];
  w.dayModeId = DAY_MODES[opts.dayMode ?? 'separate'];
  w.agentChunks = Math.ceil(w.N / CHUNK); w.sliceCount = w.agentChunks + Math.ceil(w.H / CHUNK); w.slice = w.sliceCount;
  w.shopCap = Math.max(4, Math.ceil(4 * w.H / w.tpd));
  w.t = 0; w.day = 1;
  dayBoundary(w, null);
  return w;
}

export function stepNeeds(modeId, t) {
  if (modeId === 0) tickAll();
  else if (modeId === 1) tickStagger(t);
  else tickWheel(t);
}

// times (optional Float64Array(6)): spoil+stock fold, resources, payroll, household wealth, happiness, commit.
export function dayBoundary(w, times) {
  const day = w.day, t = w.t;
  let a = times ? performance.now() : 0, b = 0;
  dayBegin(); spoilDay(day, 0, w.H);
  if (times) { b = performance.now(); times[0] = b - a; a = b; }
  resourceDay();
  if (times) { b = performance.now(); times[1] = b - a; a = b; }
  wealthAgents(0, w.N);
  if (times) { b = performance.now(); times[2] = b - a; a = b; }
  wealthHouseholds(0, w.H);
  if (times) { b = performance.now(); times[3] = b - a; a = b; }
  happinessAgents(0, w.N, t);
  if (times) { b = performance.now(); times[4] = b - a; a = b; }
  dayEnd();
  if (times) { b = performance.now(); times[5] = b - a; }
}

export function dayBoundaryFused(w) {
  dayBegin(); resourceDay();
  agentDayFused(0, w.N, w.t);
  householdDayFused(w.day, 0, w.H);
  dayEnd();
}

export function daySlice(w, k) {
  if (k === 0) { dayBegin(); resourceDay(); }
  if (k < w.agentChunks) { const i0 = k * CHUNK; agentDayFused(i0, Math.min(w.N, i0 + CHUNK), w.t); }
  else { const h0 = (k - w.agentChunks) * CHUNK; householdDayFused(w.day, h0, Math.min(w.H, h0 + CHUNK)); }
  if (k === w.sliceCount - 1) dayEnd();
}

export function runDay(w) {
  if (w.dayModeId === 0) dayBoundary(w, null);
  else if (w.dayModeId === 1) dayBoundaryFused(w);
  else w.slice = 0;
}

// One tick without timing; returns true when a day boundary started.
export function advance(w) {
  const t = ++w.t;
  let boundary = false;
  if (t % w.tpd === 0) { w.day++; runDay(w); boundary = true; }
  if (w.slice < w.sliceCount) daySlice(w, w.slice++);
  stepNeeds(w.modeId, t);
  processShops(t, w.day, w.shopCap);
  return boundary;
}
