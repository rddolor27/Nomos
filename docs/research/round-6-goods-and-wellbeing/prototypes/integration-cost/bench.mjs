// One measurement run:
//   node --expose-gc bench.mjs N=100000 tick=all|stagger|wheel order=contig|scatter day=separate|fused|sliced tpd=1440 [quick]
// Food-lot layout comes from NOMOS_LAYOUT=packed|soa. Prints one "RESULT {json}" line.
import os from 'node:os';
import v8 from 'node:v8';
import { PerformanceObserver, constants } from 'node:perf_hooks';
import { makeSim, bindAll, stepNeeds, dayBoundary, dayBoundaryFused, daySlice, runDay, advance } from './sim.mjs';
import { processShops } from './shop.mjs';
import { eatAll, moodTick } from './needs.mjs';
import { spoilDay, spoilDayPlain, lotWord, LAYOUT } from './food.mjs';
import { topShareHist, topShareSort, dayBegin } from './daily.mjs';
import { moneyTotal, memoryReport, MAX_LOTS } from './world.mjs';
import { fnv, LOG2_FRAC } from './det.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => (a.includes('=') ? a.split('=') : [a, true])));
const N = +(args.N ?? 10000), mode = args.tick ?? 'all', order = args.order ?? 'contig', tpd = +(args.tpd ?? 1440), dayMode = args.day ?? 'separate';
const quick = !!args.quick;
const SAMPLES = quick ? 5 : 9, WARM_MS = quick ? 100 : 250, MIN_SAMPLE_MS = quick ? 10 : 25;
const now = () => performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (arr) => { const s = Array.from(arr).sort((x, y) => x - y); return { med: s[s.length >> 1], min: s[0], max: s[s.length - 1], n: s.length }; };
const pct = (arr, p) => { const s = Array.from(arr).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

async function cpuBusy(ms) {
  const sum = (c) => c.reduce((a, x) => { const t = x.times; a.busy += t.user + t.nice + t.sys + t.irq; a.all += t.user + t.nice + t.sys + t.irq + t.idle; return a; }, { busy: 0, all: 0 });
  const a = sum(os.cpus()); await sleep(ms); const b = sum(os.cpus());
  const frac = (b.busy - a.busy) / (b.all - a.all);
  return { busyFrac: +frac.toFixed(3), busyLogicalCpus: +(frac * os.cpus().length).toFixed(2), loadavg: os.loadavg() };
}

function timerOverhead() {
  let acc = 0; const n = 200000;
  for (let i = 0; i < n; i++) { const a = now(); const b = now(); acc += b - a; }
  return acc / n;
}

let gcEntries = [];
new PerformanceObserver((l) => { for (const e of l.getEntries()) gcEntries.push(e); }).observe({ entryTypes: ['gc'] });
const kindName = (k) => (k === constants.NODE_PERFORMANCE_GC_MINOR ? 'minor' : k === constants.NODE_PERFORMANCE_GC_MAJOR ? 'major' : k === constants.NODE_PERFORMANCE_GC_INCREMENTAL ? 'incremental' : 'weakcb');
async function gcWindow(label, units, body) {
  globalThis.gc?.(); await sleep(30); gcEntries = [];
  const h0 = v8.getHeapStatistics().used_heap_size;
  body();
  const h1 = v8.getHeapStatistics().used_heap_size;
  await sleep(60);
  const r = { label, units, count: gcEntries.length, minor: 0, major: 0, incremental: 0, weakcb: 0, totalMs: 0, maxMs: 0, heapGrowthBytes: h1 - h0, heapGrowthPerUnit: (h1 - h0) / units };
  for (const e of gcEntries) { r[kindName(e.detail?.kind ?? e.kind)]++; r.totalMs += e.duration; r.maxMs = Math.max(r.maxMs, e.duration); }
  return r;
}

function stateHash(w) {
  let h = 0x811c9dc5;
  for (const k of ['needs', 'needZ', 'happy', 'cash', 'incomeDay', 'hhCash', 'deposits', 'durables', 'netWorth', 'wealthBand', 'lotCount', 'portions', 'committedI', 'committedF', 'acct', 'firmRes', 'mealQSum', 'meals', 'missed', 'flags']) if (w[k]) h = fnv(h, w[k]);
  const words = new Uint32Array(w.H * MAX_LOTS);
  for (let x = 0; x < w.H; x++) for (let k = 0; k < MAX_LOTS; k++) words[x * MAX_LOTS + k] = lotWord(x, k);
  return fnv(h, words).toString(16).padStart(8, '0');
}

const out = {
  env: { node: process.version, v8: process.versions.v8, platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0].model.trim(), logicalCpus: os.cpus().length, execArgv: process.execArgv },
  config: { N, mode, order, tpd, dayMode, layout: LAYOUT, samples: SAMPLES, warmupMs: WARM_MS, minSampleMs: MIN_SAMPLE_MS },
};
out.cpuBefore = await cpuBusy(1000);

const tb0 = now();
const w = makeSim({ N, seed: 42, order, tpd, mode, dayMode });
out.buildMs = now() - tb0;
Object.assign(out.config, { H: w.H, firms: w.F, shopCap: w.shopCap, slicesPerDay: w.sliceCount });
const mem8 = () => new Uint8Array(w.arena.memory.buffer);

// One tick with the day work timed apart from the needs/eating and shopping work.
const tickParts = new Float64Array(4); // needs+eat, shop, day work in this tick, 1 if a day finished
function timedTick() {
  const t = ++w.t;
  tickParts[2] = 0; tickParts[3] = 0;
  if (t % w.tpd === 0) {
    w.day++;
    const a = now(); runDay(w); tickParts[2] = now() - a;
    if (w.dayModeId !== 2) tickParts[3] = 1;
  }
  if (w.slice < w.sliceCount) {
    const a = now(); daySlice(w, w.slice++); tickParts[2] += now() - a;
    if (w.slice === w.sliceCount) tickParts[3] = 2;
  }
  const a = now(); stepNeeds(w.modeId, t); const b = now(); const n = processShops(t, w.day, w.shopCap); const c = now();
  tickParts[0] = b - a; tickParts[1] = c - b;
  return n;
}

// --- the first five days as they happen in play (day-boundary code still cold in the JIT)
{
  const early = [], earlyMaxSlice = [];
  let dayWork = 0, maxSlice = 0;
  for (let d = 0; d < 5;) {
    timedTick();
    if (tickParts[2] > 0) { dayWork += tickParts[2]; if (tickParts[2] > maxSlice) maxSlice = tickParts[2]; }
    if (tickParts[3] > 0) { early.push(dayWork); earlyMaxSlice.push(maxSlice); dayWork = 0; maxSlice = 0; d++; }
  }
  out.dayEarly = { totals: early, maxTickShare: earlyMaxSlice };
}

// --- warm all day variants on a whole-arena snapshot, then restore (one memory makes this a memcpy)
{
  const a0 = now(); const snap = mem8().slice(); const tSnap = now() - a0;
  for (let k = 0; k < 40; k++) { w.day++; dayBoundary(w, null); }
  mem8().set(snap); w.day -= 40;
  for (let k = 0; k < 40; k++) { w.day++; dayBoundaryFused(w); }
  mem8().set(snap); w.day -= 40;
  for (let k = 0; k < 40; k++) { w.day++; for (let s = 0; s < w.sliceCount; s++) daySlice(w, s); }
  const a1 = now(); mem8().set(snap); const tRestore = now() - a1; w.day -= 40;
  out.snapshot = { bytes: snap.byteLength, copyMs: tSnap, restoreMs: tRestore };
  const t0 = now();
  while (now() - t0 < WARM_MS) advance(w);
}

// --- in-sim samples: per-tick needs+eat and shopping, and day work of the run's own variant
const ovh = timerOverhead();
let K;
{
  let acc = 0; const n0 = 300;
  for (let j = 0; j < n0; j++) { timedTick(); acc += tickParts[0] + tickParts[1]; }
  K = Math.max(50, Math.ceil(MIN_SAMPLE_MS / Math.max(acc / n0, 1e-4)));
}
const tickTimes = new Float64Array(SAMPLES * K);
const needsS = [], shopS = [], bundleS = [], dayS = [], sliceMax = [], sliceAll = [];
let ti = 0, shops = 0, ticksMeasured = 0, eatenSum = 0, daysSeen = 0, dayWork = 0, maxSl = 0;
for (let s = 0; s < SAMPLES || dayS.length < SAMPLES; s++) {
  let accN = 0, accS = 0;
  for (let j = 0; j < K; j++) {
    const n = timedTick();
    if (tickParts[2] > 0) { dayWork += tickParts[2]; if (tickParts[2] > maxSl) maxSl = tickParts[2]; if (w.dayModeId === 2) sliceAll.push(tickParts[2]); }
    if (tickParts[3] > 0) {
      dayS.push(dayWork); sliceMax.push(maxSl); dayWork = 0; maxSl = 0;
      let e = 0; for (let c = 0; c < 8; c++) e += w.committedI[96 + 8 + c];
      eatenSum += e; daysSeen++;
    }
    if (s < SAMPLES) { accN += tickParts[0]; accS += tickParts[1]; shops += n; ticksMeasured++; if (ti < tickTimes.length) tickTimes[ti++] = tickParts[0] + tickParts[1]; }
  }
  if (s < SAMPLES) { needsS.push(accN / K - ovh); shopS.push(accS / K - ovh); bundleS.push((accN + accS) / K - 2 * ovh); }
}
out.timerOverheadMs = ovh;
out.ticksPerSample = K;
out.perTick = { needsEat: stats(needsS), shop: stats(shopS), bundle: stats(bundleS), p99: pct(tickTimes.subarray(0, ti), 0.99), max: stats(tickTimes.subarray(0, ti)).max, shopsPerTick: shops / ticksMeasured, mealsPerAgentDay: daysSeen ? eatenSum / daysSeen / N : null };
out.dayInSim = { total: stats(dayS), maxTickShare: stats(sliceMax), slices: w.dayModeId === 2 ? stats(sliceAll) : null };
out.cpuAfterTicks = await cpuBusy(500);

// --- probes on one identical day-boundary state: separate (by component), fused, sliced
{
  const snap = mem8().slice(); const day0 = w.day;
  const restore = () => { mem8().set(snap); w.day = day0 + 1; };
  const parts = [[], [], [], [], [], []], sep = [], fus = [], sl = [], slMax = [];
  const dt = new Float64Array(6);
  for (let s = 0; s < SAMPLES + 2; s++) {
    restore(); let a = now(); dayBoundary(w, dt); sep.push(now() - a); for (let k = 0; k < 6; k++) parts[k].push(dt[k]);
    restore(); a = now(); dayBoundaryFused(w); fus.push(now() - a);
    restore(); let tot = 0, mx = 0;
    for (let k = 0; k < w.sliceCount; k++) { a = now(); daySlice(w, k); const d = now() - a; tot += d; if (d > mx) mx = d; }
    sl.push(tot); slMax.push(mx);
  }
  const names = ['spoilFold', 'resources', 'payroll', 'wealthHouseholds', 'happiness', 'commit'];
  out.dayProbe = { separate: stats(sep), separateParts: Object.fromEntries(names.map((n, k) => [n, stats(parts[k])])), fused: stats(fus), slicedTotal: stats(sl), slicedMaxSlice: stats(slMax) };

  // spoilage with and without the fused ledger fold and food valuation
  const run = (fused) => {
    const r = []; const t0 = now();
    while (now() - t0 < WARM_MS) { restore(); dayBegin(); fused ? spoilDay(w.day, 0, w.H) : spoilDayPlain(w.day); }
    for (let s = 0; s < SAMPLES + 2; s++) { restore(); dayBegin(); const a = now(); fused ? spoilDay(w.day, 0, w.H) : spoilDayPlain(w.day); r.push(now() - a); }
    return stats(r);
  };
  out.spoil = { fused: run(true), plain: run(false) };

  // dinner rush: every agent attempts one meal in the same tick
  const res = []; let ok = 0; const t0 = now();
  while (now() - t0 < WARM_MS) { restore(); eatAll(); }
  for (let s = 0; s < SAMPLES + 2; s++) { restore(); const a = now(); ok = eatAll(); res.push((now() - a) * 1e6 / N); }
  out.dinnerRush = { nsPerAgent: stats(res), successShare: ok / N };
  restore(); w.day = day0;
}

const kernel = (fn) => {
  let calls = 0; const t0 = now();
  while (calls < 5 || now() - t0 < WARM_MS) { fn(); calls++; }
  const reps = Math.max(1, Math.ceil(MIN_SAMPLE_MS / ((now() - t0) / calls)));
  const r = [];
  for (let s = 0; s < SAMPLES; s++) { const a = now(); for (let k = 0; k < reps; k++) fn(); r.push((now() - a) / reps); }
  return { ...stats(r), reps };
};
if (w.needs) { const saved = w.happy.slice(); out.moodTick = kernel(moodTick); w.happy.set(saved); }
out.topShare = { hist: kernel(topShareHist), sort: kernel(topShareSort), histQ16: topShareHist(), sortQ16: topShareSort() };

// --- allocation: GC events and heap growth, no timing calls inside the windows
out.gc = [];
{
  while (!advance(w)) { /* run to the next day boundary */ }
  for (let j = 0; j < w.sliceCount + 1; j++) advance(w);
  const quiet = Math.min(1000, tpd - w.sliceCount - 3);
  out.gc.push(await gcWindow('ticks-only', quiet, () => { for (let j = 0; j < quiet; j++) advance(w); }));
  const full = Math.max(1000, 2 * tpd + 10);
  out.gc.push(await gcWindow('ticks+day-work', full, () => { for (let j = 0; j < full; j++) advance(w); }));
  const snap = mem8().slice(); const day0 = w.day;
  out.gc.push(await gcWindow('day-separate-only', 20, () => { for (let j = 0; j < 20; j++) { w.day++; dayBoundary(w, null); } }));
  mem8().set(snap); w.day = day0;
  out.gc.push(await gcWindow('day-fused-only', 20, () => { for (let j = 0; j < 20; j++) { w.day++; dayBoundaryFused(w); } }));
  mem8().set(snap); w.day = day0;
  out.gc.push(await gcWindow('day-sliced-only', 20, () => { for (let j = 0; j < 20; j++) { w.day++; for (let s = 0; s < w.sliceCount; s++) daySlice(w, s); } }));
  mem8().set(snap); w.day = day0;
  out.gc.push(await gcWindow('topShareSort', 20, () => { for (let j = 0; j < 20; j++) topShareSort(); }));
}
out.ledgerExactAfterRun = moneyTotal(w) === 0;
out.memory = memoryReport(w);
out.process = process.memoryUsage();
out.lutMaxErrQ16 = (() => { let m = 0; for (let k = 0; k < 256; k++) m = Math.max(m, Math.abs(LOG2_FRAC[k] - Math.log2(1 + k / 256) * 65536)); return m; })();

// --- determinism: two fresh worlds, fixed tick count; the hash is also compared across layouts
{
  const hashes = [];
  for (let r = 0; r < 2; r++) {
    const d = makeSim({ N, seed: 42, order, tpd, mode, dayMode });
    for (let j = 0; j < 3 * tpd + 200; j++) advance(d);
    hashes.push(stateHash(d));
    out.ledgerExactDeterminismRun = moneyTotal(d) === 0;
  }
  out.determinism = { hashes, repeatIdentical: hashes[0] === hashes[1], ticks: 3 * tpd + 200 };
  bindAll(w);
}
out.cpuEnd = await cpuBusy(500);
console.log('RESULT ' + JSON.stringify(out));
process.exit(0);
