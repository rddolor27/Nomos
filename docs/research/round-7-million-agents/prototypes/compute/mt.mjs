// Coordinator (worker 0) plus nw-1 helper threads over one shared arena. Every helper takes part in every
// phase, so a helper can be at most one epoch behind and never reads a stale job.
import * as K from './kernels.mjs';

export const EPOCH = 0, JOB = 1, DONE = 2, CLAIM = 3, TICK = 4, NWK = 5, SPIN = 6;
export const J_NOOP = 0, J_MOVE = 1, J_TOTALS = 2, J_OFFSETS = 3, J_SCATTER = 4, J_DECIDE = 5, J_SNAP = 6, J_EXIT = 9;
export const J_MOVE_LEAN = 10, J_HIST = 11, J_DECIDE_LEAN = 12;

let ctrl, nChunks = 0, nCB = 0;
export function bindMT(V, L) { ctrl = V.ctrl; nChunks = L.nChunks; nCB = L.nCB; }

function doWork(job, w, nw, t) {
  if (job === J_MOVE) K.phaseMove(w, nw, t);
  else if (job === J_TOTALS) { for (;;) { const b = Atomics.add(ctrl, CLAIM, 1); if (b >= nCB) break; K.phaseCellTotals(b, nw); } }
  else if (job === J_OFFSETS) { for (;;) { const b = Atomics.add(ctrl, CLAIM, 1); if (b >= nCB) break; K.phaseOffsets(b, nw); } }
  else if (job === J_SCATTER) K.phaseScatter(w, nw);
  else if (job === J_DECIDE) { K.setLean(0); for (;;) { const c = Atomics.add(ctrl, CLAIM, 1); if (c >= nChunks) break; K.phaseDecide(c, t); } }
  else if (job === J_SNAP) { for (;;) { const c = Atomics.add(ctrl, CLAIM, 1); if (c >= nChunks) break; K.phaseSnapshot(c); } }
  else if (job === J_MOVE_LEAN) { for (;;) { const c = Atomics.add(ctrl, CLAIM, 1); if (c >= nChunks) break; K.phaseMoveLean(c); } }
  else if (job === J_HIST) K.phaseHist(w, nw, t);
  else if (job === J_DECIDE_LEAN) { K.setLean(1); for (;;) { const c = Atomics.add(ctrl, CLAIM, 1); if (c >= nChunks) break; K.phaseDecide(c, t); } }
}

function waitChange(idx, old, spin) {
  for (let k = 0; k < spin; k++) if (Atomics.load(ctrl, idx) !== old) return;
  while (Atomics.load(ctrl, idx) === old) Atomics.wait(ctrl, idx, old, 2000);
}

// The starting epoch is read before signalling ready, so the first phase cannot be missed.
export function helperLoop(w, onReady) {
  let seen = Atomics.load(ctrl, EPOCH);
  onReady();
  for (;;) {
    waitChange(EPOCH, seen, ctrl[SPIN]);
    seen = Atomics.load(ctrl, EPOCH);
    const job = ctrl[JOB];
    if (job === J_EXIT) return;
    const nw = ctrl[NWK];
    doWork(job, w, nw, ctrl[TICK]);
    if (Atomics.add(ctrl, DONE, 1) + 1 === nw - 1) Atomics.notify(ctrl, DONE);
  }
}

export function phase(job, nw, t) {
  ctrl[JOB] = job; ctrl[TICK] = t;
  Atomics.store(ctrl, CLAIM, 0);
  Atomics.store(ctrl, DONE, 0);
  if (nw > 1) { Atomics.add(ctrl, EPOCH, 1); Atomics.notify(ctrl, EPOCH); }
  doWork(job, 0, nw, t);
  if (nw > 1) {
    const need = nw - 1, spin = ctrl[SPIN];
    for (let k = 0; k < spin; k++) if (Atomics.load(ctrl, DONE) >= need) return;
    let d = Atomics.load(ctrl, DONE);
    while (d < need) { Atomics.wait(ctrl, DONE, d, 2000); d = Atomics.load(ctrl, DONE); }
  }
}

export function exitHelpers() { ctrl[JOB] = J_EXIT; Atomics.add(ctrl, EPOCH, 1); Atomics.notify(ctrl, EPOCH); }

// One tick; tm (Float64Array(6)) accumulates phase times when given. Timing lives in the harness only.
export function tick(t, nw, tm, now) {
  if (tm === null) {
    phase(J_MOVE, nw, t); phase(J_TOTALS, nw, t); K.blockScan(); phase(J_OFFSETS, nw, t);
    phase(J_SCATTER, nw, t); phase(J_DECIDE, nw, t); phase(J_SNAP, nw, t); K.reduceChunks();
    return;
  }
  const a = now();
  phase(J_MOVE, nw, t);
  const b = now();
  phase(J_TOTALS, nw, t); K.blockScan(); phase(J_OFFSETS, nw, t);
  const c = now();
  phase(J_SCATTER, nw, t);
  const d = now();
  phase(J_DECIDE, nw, t);
  const e = now();
  phase(J_SNAP, nw, t);
  const f = now();
  K.reduceChunks();
  const g = now();
  tm[0] += b - a; tm[1] += c - b; tm[2] += d - c; tm[3] += e - d; tm[4] += f - e; tm[5] += g - f;
}

// Lean tick: movers only (snapshot fused), aggregates and the sort rebuilt every rebuildK ticks on a fixed
// phase, activity-based decisions. tm slots: move, rebuild (amortised), decide, reduce.
export function tickLean(t, nw, tm, now, rebuildK) {
  if (tm === null) {
    phase(J_MOVE_LEAN, nw, t);
    if (t % rebuildK === 0) { phase(J_HIST, nw, t); phase(J_TOTALS, nw, t); K.blockScan(); phase(J_OFFSETS, nw, t); phase(J_SCATTER, nw, t); }
    phase(J_DECIDE_LEAN, nw, t); K.reduceChunks();
    return;
  }
  const a = now();
  phase(J_MOVE_LEAN, nw, t);
  const b = now();
  if (t % rebuildK === 0) { phase(J_HIST, nw, t); phase(J_TOTALS, nw, t); K.blockScan(); phase(J_OFFSETS, nw, t); phase(J_SCATTER, nw, t); }
  const c = now();
  phase(J_DECIDE_LEAN, nw, t);
  const d = now();
  K.reduceChunks();
  const e = now();
  tm[0] += b - a; tm[1] += c - b; tm[2] += d - c; tm[3] += e - d;
}
