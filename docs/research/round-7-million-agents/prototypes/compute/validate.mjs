// Correctness checks before timing: stable sort by (cell, index), cell starts, money conservation,
// the action mix, and identical state hashes for 1..12 workers and both barrier modes.
// Usage: node validate.mjs [N=30000] [ticks=400]
import { Worker } from 'node:worker_threads';
import { makeLayout, makeArena, makeViews, buildWorld, hashState, moneyTotal, CHUNK } from './world.mjs';
import * as K from './kernels.mjs';
import * as MT from './mt.mjs';

const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const N = Number(arg('N', '30000')), T = Number(arg('ticks', '400'));
const SEED = 20261005;

async function spawnHelpers(buffer, L, n) {
  const hs = [];
  for (let w = 1; w <= n; w++) {
    const wk = new Worker(new URL('./helper.mjs', import.meta.url), { workerData: { buffer, L, w, seed: SEED } });
    let exitRes; const exit = new Promise((r) => (exitRes = r));
    const ready = new Promise((res, rej) => { wk.on('message', (m) => { if (m.type === 'ready') res(); else if (m.type === 'exit') exitRes(m); }); wk.on('error', rej); });
    hs.push({ wk, ready, exit });
  }
  await Promise.all(hs.map((h) => h.ready));
  return hs;
}

const L = makeLayout(N);
const mem = makeArena(L), buf = mem.buffer, V = makeViews(buf, L);
const { households } = buildWorld(V, L, SEED);
const init = new Uint8Array(L.bytes); init.set(new Uint8Array(buf, 0, L.bytes));
K.bind(V, L, SEED); MT.bindMT(V, L);
const money0 = moneyTotal(V, households);
console.log(`N=${N} W=${L.W} cells=${L.NC} chunks=${L.nChunks} households=${households}`);

// households never straddle a chunk
let straddle = 0;
for (let i = 1; i < N; i++) if (V.hhOf[i] === V.hhOf[i - 1] && (i % CHUNK) === 0) straddle++;
console.log('households straddling a chunk:', straddle);

const LEAN = process.argv.includes('lean');
const results = [];
for (const spin of [0, 20000]) for (const nw of [1, 2, 3, 4, 6, 8, 12]) {
  new Uint8Array(buf, 0, L.bytes).set(init);
  const hs = await spawnHelpers(buf, L, nw - 1);
  V.ctrl[MT.NWK] = nw; V.ctrl[MT.SPIN] = spin;
  for (let t = 1; t <= T; t++) { if (LEAN) MT.tickLean(t, nw, null, null, 4); else MT.tick(t, nw, null, null); }
  // checks
  let sortOk = true;
  for (let k = 1; k < N; k++) {
    const a = V.sorted[k - 1], b = V.sorted[k];
    if (V.cell[a] > V.cell[b] || (V.cell[a] === V.cell[b] && a >= b)) { sortOk = false; break; }
  }
  let startOk = V.cellStart[L.NC] === N;
  for (let c = 0; c < L.NC && startOk; c++) if (V.cellStart[c + 1] - V.cellStart[c] !== V.agg[c << 2]) startOk = false;
  const acts = new Array(6).fill(0);
  for (let i = 0; i < N; i++) acts[V.act[i]]++;
  let moving = 0;
  for (let i = 0; i < N; i++) { const tile = (V.py[i] >> 8) * L.W + (V.px[i] >> 8); if (V.flow[V.dest[i] * L.NT + tile] !== 0) moving++; }
  let listOk = true;
  if (LEAN) for (let i = 0; i < N; i++) {
    if (V.dirC[i] === 0) continue;
    const c = (i / CHUNK) | 0, k = V.mPos[i];
    if (k < 0 || k >= V.mCount[c] || V.movers[c * CHUNK + k] !== i) { listOk = false; break; }
  }
  const hash = hashState(buf, L), money = moneyTotal(V, households);
  results.push({ nw, spin, hash });
  console.log(`nw=${nw} spin=${spin} hash=${hash} sortOk=${sortOk} cellStartOk=${startOk} listOk=${listOk} money=${money === money0} ` +
    `acts[rest,eat,work,shop,social,wander]=${acts.join(',')} moving=${(100 * moving / N).toFixed(1)}% totals[meals,decisions,social,buys]=${Array.from(V.totals.subarray(0, 4)).join(',')}`);
  if (hs.length) { MT.exitHelpers(); await Promise.all(hs.map((h) => h.exit)); await Promise.all(hs.map((h) => h.wk.terminate())); }
}
const distinct = new Set(results.map((r) => r.hash));
console.log(`distinct hashes over ${results.length} runs: ${distinct.size}`);
process.exit(distinct.size === 1 ? 0 : 1);
