// CPU scaling benchmark: 100k / 250k / 1M agents, 1/2/4/8 worker threads, fixed 1,024-agent chunks.
// Usage: node bench-cpu.mjs [sizes=100000,250000,1000000] [workers=1,2,4,8] [spins=0,20000] [passes=2]
//        [mode=full|lean] [rebuildK=4] [burn=1440] [warm=40] [samples=9] [tag=run1]
// The burn-in runs once per size (with the most workers; the state is identical for any count), and every
// worker count then starts from that snapshot, so all runs of a size must end in the same state hash.
import { Worker } from 'node:worker_threads';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { writeFileSync, mkdirSync } from 'node:fs';
import { makeLayout, makeArena, makeViews, buildWorld, hashState, moneyTotal } from './world.mjs';
import * as K from './kernels.mjs';
import * as MT from './mt.mjs';
import { envInfo, cpuTimes, busyBetween, sampleBusy, stats } from './env.mjs';

const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const sizes = arg('sizes', '100000,250000,1000000').split(',').map(Number);
const workers = arg('workers', '1,2,4,8').split(',').map(Number);
const spins = arg('spins', '0,20000').split(',').map(Number);
const passes = Number(arg('passes', '2'));
const mode = arg('mode', 'full');
const rebuildK = Number(arg('rebuildK', '4'));
const BURN = Number(arg('burn', '1440'));
const WARM = Number(arg('warm', '40')), S = Number(arg('samples', '9'));
const tag = arg('tag', 'run');
const SEED = 20261005;
const now = () => performance.now();
const LEAN = mode === 'lean';
const tickFn = LEAN ? (t, nw, tm) => MT.tickLean(t, nw, tm, now, rebuildK) : (t, nw, tm) => MT.tick(t, nw, tm, now);
const phaseNames = LEAN ? ['move', 'rebuildAmortised', 'decide', 'reduce'] : ['move', 'cellsAndOffsets', 'scatter', 'decide', 'snapshot', 'reduce'];

const gcMain = [];
new PerformanceObserver((l) => { for (const e of l.getEntries()) gcMain.push([performance.timeOrigin + e.startTime, e.duration]); }).observe({ entryTypes: ['gc'] });

async function spawnHelpers(buffer, L, n) {
  const hs = [];
  for (let w = 1; w <= n; w++) {
    const wk = new Worker(new URL('./helper.mjs', import.meta.url), { workerData: { buffer, L, w, seed: SEED } });
    let exitRes;
    const exit = new Promise((r) => (exitRes = r));
    const ready = new Promise((res, rej) => {
      wk.on('message', (m) => { if (m.type === 'ready') res(); else if (m.type === 'exit') exitRes(m); });
      wk.on('error', rej);
    });
    hs.push({ wk, ready, exit });
  }
  await Promise.all(hs.map((h) => h.ready));
  return hs;
}

async function stopHelpers(hs) {
  if (hs.length === 0) return [];
  MT.exitHelpers();
  const ex = await Promise.all(hs.map((h) => h.exit));
  await Promise.all(hs.map((h) => h.wk.terminate()));
  return ex;
}

function moversShare(V, L) { let m = 0; for (let c = 0; c < L.nChunks; c++) m += V.mCount[c]; return m / L.N; }
function movingNow(V, L) { let m = 0; for (let i = 0; i < L.N; i++) if (V.dirC[i] !== 0) m++; return m / L.N; }

const out = { env: envInfo(), seed: SEED, mode, rebuildK: LEAN ? rebuildK : null, burn: BURN, warm: WARM, samples: S, startedAt: new Date().toISOString(), barrier: {}, runs: [], world: {} };
console.log(JSON.stringify(out.env), `mode=${mode} burn=${BURN}`);
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });

for (const N of sizes) {
  const L = makeLayout(N);
  const mem = makeArena(L), buf = mem.buffer, V = makeViews(buf, L);
  const tb = now();
  const { households } = buildWorld(V, L, SEED);
  const buildMs = now() - tb;
  K.bind(V, L, SEED); MT.bindMT(V, L);
  const money0 = moneyTotal(V, households);
  const maxW = Math.max(...workers);
  if (BURN > 0) {
    const hs = await spawnHelpers(buf, L, maxW - 1);
    V.ctrl[MT.NWK] = maxW; V.ctrl[MT.SPIN] = 0;
    const tq = now();
    for (let t = 1; t <= BURN; t++) tickFn(t, maxW, null);
    console.log(`burn-in ${BURN} ticks with ${maxW} workers: ${(now() - tq).toFixed(0)} ms`);
    await stopHelpers(hs);
  }
  const init = new Uint8Array(L.bytes);
  init.set(new Uint8Array(buf, 0, L.bytes));
  out.world[N] = { W: L.W, cells: L.NC, chunks: L.nChunks, households, arenaMiB: +(L.bytes / 2 ** 20).toFixed(1), buildMs: +buildMs.toFixed(0),
    movingAfterBurn: +movingNow(V, L).toFixed(3) };
  console.log(`N=${N} map ${L.W}x${L.W} cells ${L.NC} chunks ${L.nChunks} households ${households} arena ${(L.bytes / 2 ** 20).toFixed(1)} MiB build ${buildMs.toFixed(0)} ms moving ${(100 * movingNow(V, L)).toFixed(1)}%`);
  const kT = N >= 1e6 ? 4 : N >= 250000 ? 8 : 16;

  if (N === sizes[0] && !LEAN) {
    for (const spin of spins) for (const nw of workers) {
      if (nw === 1) continue;
      const hs = await spawnHelpers(buf, L, nw - 1);
      V.ctrl[MT.NWK] = nw; V.ctrl[MT.SPIN] = spin;
      for (let k = 0; k < 300; k++) MT.phase(MT.J_NOOP, nw, 0);
      const B = 3000, a = now();
      for (let k = 0; k < B; k++) MT.phase(MT.J_NOOP, nw, 0);
      const us = ((now() - a) / B) * 1000;
      out.barrier[`w${nw}.spin${spin}`] = +us.toFixed(2);
      console.log(`barrier w${nw} spin${spin}: ${us.toFixed(2)} us per empty phase`);
      await stopHelpers(hs);
    }
  }

  const tm = new Float64Array(6), smp = new Float64Array(S), per = new Float64Array(S * kT);
  for (const spin of spins) for (let pass = 0; pass < passes; pass++) {
    const order = pass % 2 === 0 ? workers : workers.slice().reverse();
    for (const nw of order) {
      new Uint8Array(buf, 0, L.bytes).set(init);
      const idle = await sampleBusy(1000);
      const hs = await spawnHelpers(buf, L, nw - 1);
      V.ctrl[MT.NWK] = nw; V.ctrl[MT.SPIN] = spin;
      let t = BURN + 1;
      const tw = now();
      for (let k = 0; k < WARM; k++) tickFn(t++, nw, null);
      const warmMs = now() - tw;
      tm.fill(0);
      const dec0 = V.totals[1], meals0 = V.totals[0];
      let movSum = 0;
      const c0 = cpuTimes(), w0 = performance.timeOrigin + now();
      for (let s = 0; s < S; s++) {
        const a = now();
        for (let k = 0; k < kT; k++) { const ta = now(); tickFn(t++, nw, tm); per[s * kT + k] = now() - ta; }
        smp[s] = (now() - a) / kT;
      }
      const w1 = performance.timeOrigin + now();
      const during = busyBetween(c0, cpuTimes());
      const nt = S * kT;
      const decPerTick = (V.totals[1] - dec0) / nt, mealsPerTick = (V.totals[0] - meals0) / nt;
      movSum = LEAN ? moversShare(V, L) : movingNow(V, L);
      const hash = hashState(buf, L);
      const money = moneyTotal(V, households);
      const ex = await stopHelpers(hs);
      await new Promise((r) => setTimeout(r, 20));
      const gcM = gcMain.filter((g) => g[0] >= w0 && g[0] <= w1);
      let gcH = 0, gcHms = 0;
      for (const e of ex) for (const g of e.gc) if (g[0] >= w0 && g[0] <= w1) { gcH++; gcHms += g[1]; }
      const ph = {};
      phaseNames.forEach((n, k) => { ph[n] = +(tm[k] / nt).toFixed(4); });
      const st = stats(smp, S), pt = stats(per, nt);
      const rec = {
        N, nw, spin, pass, idleBusyCpus: idle, duringBusyCpus: during, warmMs: +warmMs.toFixed(1), lastTick: t - 1,
        tickMs: { med: +st.med.toFixed(4), min: +st.min.toFixed(4), max: +st.max.toFixed(4) },
        singleTickMs: { med: +pt.med.toFixed(4), p95: +pt.p95.toFixed(4), max: +pt.max.toFixed(4) },
        phasesMs: ph, nsPerAgentTick: +((st.med * 1e6) / N).toFixed(2),
        decisionsPerTick: Math.round(decPerTick), mealsPerTick: Math.round(mealsPerTick), movingShare: +movSum.toFixed(3),
        hash, moneyExact: money === money0, gcMain: gcM.length, gcHelpers: gcH, gcHelpersMs: +gcHms.toFixed(2),
      };
      out.runs.push(rec);
      console.log(`N=${N} nw=${nw} spin=${spin} pass=${pass} idle=${idle} busy=${during} tick ${st.med.toFixed(3)} [${st.min.toFixed(3)}-${st.max.toFixed(3)}] ms ` +
        `${phaseNames.map((n) => `${n} ${ph[n]}`).join(' ')} p95 ${pt.p95.toFixed(3)} max ${pt.max.toFixed(3)} ` +
        `dec/tick ${Math.round(decPerTick)} moving ${(100 * movSum).toFixed(1)}% hash ${hash} money ${money === money0} gc ${gcM.length}/${gcH}`);
    }
  }
}

const groups = {};
for (const r of out.runs) (groups[r.N] = groups[r.N] || new Set()).add(r.hash);
out.determinism = Object.fromEntries(Object.entries(groups).map(([n, s]) => [n, { distinctHashes: s.size, hashes: [...s] }]));
out.finishedAt = new Date().toISOString();
console.log('determinism: ' + JSON.stringify(out.determinism));
writeFileSync(new URL(`./results/cpu-${tag}.json`, import.meta.url), JSON.stringify(out, null, 1));
process.exit(0);
