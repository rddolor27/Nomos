// Editor kernel benchmark on a 1,024 x 1,024 map in Node.
// Usage: node bench.mjs [--mode=diff|chunk] [--tidy=raster|sync] [--tidyAt=event|stroke]
//                       [--warm=10] [--samples=30] [--equiv=10]
// Writes results-<mode>-<tidy>-<tidyAt>.json beside this file. Desktop Node timings, never phone timings.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { CHUNK, GRASS, MEADOW, PATH, PAVING, WATER, autotileAll, createMap, draw, flushDirty, mapBytes, scratchBytes, synthesize, tidyAll, tidyAllSync } from './map.mjs';
import { beginEdit, brushEvent, commit, createEditor, editorBytes, finishEdit, floodFill, placePrefab, recordBytes, rectFill, redo, replaceAll, undo } from './tools.mjs';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const MODE = arg('mode', 'diff');
const TIDY = arg('tidy', 'raster');
const TIDY_AT = arg('tidyAt', 'event');
const WARM = Number(arg('warm', 10));
const SAMPLES = Number(arg('samples', 30));
const EQUIV = Number(arg('equiv', 10));
const W = 1024, H = 1024, SEED = 0x5eed0009;

const now = () => performance.now();
const cpuLoad = () => {
  try {
    const out = execSync('powershell -NoProfile -Command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\' -SampleInterval 1 -MaxSamples 2).CounterSamples | ForEach-Object { [math]::Round($_.CookedValue, 1) }"', { encoding: 'utf8' });
    return out.trim().split(/\s+/).map(Number);
  } catch {
    return null;
  }
};
const quant = (xs) => {
  const s = Float64Array.from(xs).sort();
  const at = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
  return { median: at(0.5), min: s[0], max: s[s.length - 1], p99: at(0.99), n: s.length };
};
const mem = () => {
  const u = process.memoryUsage();
  return { rssMB: +(u.rss / 2 ** 20).toFixed(1), heapUsedMB: +(u.heapUsed / 2 ** 20).toFixed(1), arrayBuffersMB: +(u.arrayBuffers / 2 ** 20).toFixed(1) };
};

const DIRS = Array.from({ length: 16 }, (_, d) => [Math.cos((d * Math.PI) / 8), Math.sin((d * Math.PI) / 8)]);
function strokePath(sample, events, length, margin, startOn) {
  const pts = new Int32Array((events + 1) * 2);
  let x, y, tries = 0;
  do {
    x = margin + (draw(SEED, 20, sample, 0, tries) % (W - 2 * margin));
    y = margin + (draw(SEED, 20, sample, 1, tries) % (H - 2 * margin));
    tries++;
  } while (startOn !== undefined && (m.kind[y * W + x] === WATER) !== startOn && tries < 1000);
  let dir = draw(SEED, 20, sample, 2) % 16;
  const step = length / events;
  pts[0] = x; pts[1] = y;
  for (let e = 1; e <= events; e++) {
    const turn = draw(SEED, 21, sample, e) % 7;
    dir = (dir + (turn === 0 ? 15 : turn === 1 ? 1 : 0)) % 16;
    x = Math.min(W - 2, Math.max(1, x + DIRS[dir][0] * step));
    y = Math.min(H - 2, Math.max(1, y + DIRS[dir][1] * step));
    pts[e * 2] = Math.floor(x); pts[e * 2 + 1] = Math.floor(y);
  }
  return pts;
}

function makePrefab() {
  const w = 16, h = 12, kind = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) kind[y * w + x] = x === 0 || y === 0 || x === w - 1 || y === h - 1 ? PATH : PAVING;
  const buildings = [
    { frame: 1, tx: 2, ty: 2, fw: 4, fh: 3 }, { frame: 2, tx: 8, ty: 2, fw: 5, fh: 3 },
    { frame: 3, tx: 2, ty: 7, fw: 3, fh: 3 }, { frame: 4, tx: 8, ty: 7, fw: 5, fh: 3 },
  ];
  return { w, h, kind, buildings };
}

const SCENARIOS = [
  { name: 'brush r0 water', tool: 'brush', radius: 0, events: 60, length: 20, k: WATER },
  { name: 'brush r0 land', tool: 'brush', radius: 0, events: 60, length: 20, k: GRASS },
  { name: 'brush r1 land', tool: 'brush', radius: 1, events: 60, length: 20, k: GRASS },
  { name: 'brush r2 water', tool: 'brush', radius: 2, events: 120, length: 60, k: WATER },
  { name: 'brush r2 land', tool: 'brush', radius: 2, events: 120, length: 60, k: GRASS },
  { name: 'brush r8 water', tool: 'brush', radius: 8, events: 180, length: 180, k: WATER },
  { name: 'brush r8 land', tool: 'brush', radius: 8, events: 180, length: 180, k: GRASS },
  { name: 'brush r16 water', tool: 'brush', radius: 16, events: 120, length: 240, k: WATER },
  { name: 'rect 128 water', tool: 'rect', size: 128, k: WATER },
  { name: 'rect 128 paving', tool: 'rect', size: 128, k: PAVING },
  { name: 'flood fill water', tool: 'fill', k: WATER },
  { name: 'fill largest lake', tool: 'fill', k: GRASS, largest: true },
  { name: 'replace all meadow', tool: 'replace', from: MEADOW, k: GRASS },
  { name: 'prefab 16x12', tool: 'prefab' },
  { name: 'paste 64x64', tool: 'paste' },
];

const memBefore = mem();
const m = createMap(W, H);
const tSynth = now();
synthesize(m, SEED);
const synthMs = now() - tSynth;
m.sync = TIDY === 'sync';
const ed = createEditor(m, MODE, TIDY_AT === 'stroke');
const staging = new Uint16Array(CHUNK * CHUNK);
const prefab = makePrefab();
const memAfterMap = mem();
let waterCells = 0;
for (let i = 0; i < W * H; i++) waterCells += m.kind[i] === WATER;

function largestRegion(k, probes) {
  const seen = new Uint8Array(W * H), stack = new Int32Array(W * H);
  let best = { size: 0, x: 0, y: 0 };
  for (let p = 0; p < probes; p++) {
    const s = draw(SEED, 34, p) % (W * H);
    if (seen[s] || m.kind[s] !== k) continue;
    let top = 0, size = 0;
    stack[top++] = s; seen[s] = 1;
    while (top) {
      const i = stack[--top], x = i % W, y = (i / W) | 0;
      size++;
      if (x > 0 && !seen[i - 1] && m.kind[i - 1] === k) { seen[i - 1] = 1; stack[top++] = i - 1; }
      if (x < W - 1 && !seen[i + 1] && m.kind[i + 1] === k) { seen[i + 1] = 1; stack[top++] = i + 1; }
      if (y > 0 && !seen[i - W] && m.kind[i - W] === k) { seen[i - W] = 1; stack[top++] = i - W; }
      if (y < H - 1 && !seen[i + W] && m.kind[i + W] === k) { seen[i + W] = 1; stack[top++] = i + W; }
    }
    if (size > best.size) best = { size, x: s % W, y: (s / W) | 0 };
  }
  return best;
}
const largestWater = largestRegion(WATER, 400);

function runEdit(sc, sample) {
  const events = [], flushes = [];
  let painted = 0, flips = 0, tiles = 0, chunks = 0, maxChunks = 0, uploadBytes = 0, sprites = null;
  beginEdit(ed);
  const timed = (fn) => {
    const t = now();
    const s = fn();
    events.push(now() - t);
    const tf = now();
    const f = flushDirty(m, staging);
    flushes.push(now() - tf);
    chunks += f.chunks; uploadBytes += f.bytes; maxChunks = Math.max(maxChunks, f.chunks);
    if (s) { painted += s.painted; flips += s.flips; tiles += s.tiles; if (s.sprites) sprites = s.sprites; }
  };
  if (sc.tool === 'brush') {
    const pts = strokePath(sample, sc.events, sc.length, 24, sc.k !== WATER);
    for (let e = 0; e < sc.events; e++) timed(() => brushEvent(ed, pts[e * 2], pts[e * 2 + 1], pts[e * 2 + 2], pts[e * 2 + 3], sc.radius, sc.k));
  } else if (sc.tool === 'rect') {
    const x = draw(SEED, 30, sample, 0) % (W - sc.size), y = draw(SEED, 30, sample, 1) % (H - sc.size);
    timed(() => rectFill(ed, x, y, sc.size, sc.size, sc.k));
  } else if (sc.tool === 'fill' && sc.largest) {
    timed(() => floodFill(ed, largestWater.x, largestWater.y, sc.k));
  } else if (sc.tool === 'fill') {
    let x, y, tries = 0;
    do { x = draw(SEED, 31, sample, tries) % W; y = draw(SEED, 31, sample, tries + 1000) % H; tries++; } while (m.kind[y * W + x] !== GRASS);
    timed(() => floodFill(ed, x, y, sc.k));
  } else if (sc.tool === 'replace') {
    timed(() => replaceAll(ed, sc.from, sc.k));
  } else if (sc.tool === 'prefab') {
    const x = 1 + (draw(SEED, 32, sample, 0) % (W - 20)), y = 1 + (draw(SEED, 32, sample, 1) % (H - 16));
    timed(() => placePrefab(ed, prefab, x, y));
  } else {
    const sx = draw(SEED, 33, sample, 0) % (W - 64), sy = draw(SEED, 33, sample, 1) % (H - 64);
    const dx = draw(SEED, 33, sample, 2) % (W - 64), dy = draw(SEED, 33, sample, 3) % (H - 64);
    const t = now();
    const clip = { w: 64, h: 64, kind: new Uint8Array(64 * 64), buildings: [] };
    for (let r = 0; r < 64; r++) clip.kind.set(m.kind.subarray((sy + r) * W + sx, (sy + r) * W + sx + 64), r * 64);
    const copyMs = now() - t;
    timed(() => placePrefab(ed, clip, dx, dy));
    events[0] += copyMs;
  }
  const tfin = now();
  const fin = finishEdit(ed);
  const finishMs = now() - tfin;
  const ff = flushDirty(m, staging);
  chunks += ff.chunks; uploadBytes += ff.bytes; flips += fin.flips; tiles += fin.tiles;
  const tc = now();
  const rec = commit(ed, sprites);
  const commitMs = now() - tc;
  const bytes = recordBytes(ed, rec);
  const tu = now();
  undo(ed);
  const undoMs = now() - tu;
  const tuf = now();
  const uf = flushDirty(m, staging);
  const undoFlushMs = now() - tuf;
  const tr = now();
  redo(ed);
  const redoMs = now() - tr;
  flushDirty(m, staging);
  undo(ed);
  flushDirty(m, staging);
  ed.undoStack.length = 0;
  ed.redoStack.length = 0;
  return { events, flushes, finishMs, painted, flips, reverted: ed.reverted, tiles, chunks, maxChunks, uploadBytes, commitMs, bytes, undoMs, undoFlushMs, undoChunks: uf.chunks, redoMs };
}

function summarise(sc, runs) {
  const pick = (f) => quant(runs.map(f));
  const allEvents = runs.flatMap((r) => r.events), allFlush = runs.flatMap((r) => r.flushes);
  return {
    scenario: sc.name,
    strokeMs: pick((r) => r.events.reduce((a, b) => a + b, 0) + r.finishMs),
    eventMs: quant(allEvents),
    finishMs: pick((r) => r.finishMs),
    flushMs: quant(allFlush),
    commitMs: pick((r) => r.commitMs),
    undoMs: pick((r) => r.undoMs),
    undoFlushMs: pick((r) => r.undoFlushMs),
    redoMs: pick((r) => r.redoMs),
    recordKB: pick((r) => r.bytes / 1024),
    painted: pick((r) => r.painted),
    tidyFlips: pick((r) => r.flips),
    revertedPainted: pick((r) => r.reverted),
    tileUpdates: pick((r) => r.tiles),
    chunksUploaded: pick((r) => r.chunks),
    maxChunksPerEvent: pick((r) => r.maxChunks),
    uploadKB: pick((r) => r.uploadBytes / 1024),
    undoChunks: pick((r) => r.undoChunks),
  };
}

const loadBefore = cpuLoad();
const results = [];
for (const sc of SCENARIOS) {
  for (let i = 0; i < WARM; i++) runEdit(sc, 100000 + i);
  const runs = [];
  for (let i = 0; i < SAMPLES; i++) runs.push(runEdit(sc, i));
  results.push(summarise(sc, runs));
}

function equivalence(sc, sample) {
  const k0 = m.kind.slice(), s0 = m.sea.slice(), t0 = m.tile.slice();
  const pts = strokePath(sample, sc.events, sc.length, 24, sc.k !== WATER);
  beginEdit(ed);
  for (let e = 0; e < sc.events; e++) brushEvent(ed, pts[e * 2], pts[e * 2 + 1], pts[e * 2 + 2], pts[e * 2 + 3], sc.radius, sc.k);
  finishEdit(ed);
  const kA = m.kind.slice(), tA = m.tile.slice();
  m.kind.set(k0); m.sea.set(s0); m.tile.set(t0);
  beginEdit(ed);
  for (let e = 0; e < sc.events; e++) brushEvent(ed, pts[e * 2], pts[e * 2 + 1], pts[e * 2 + 2], pts[e * 2 + 3], sc.radius, sc.k, true);
  const tt = now();
  if (m.sync) tidyAllSync(m); else tidyAll(m);
  autotileAll(m);
  const rebuildMs = now() - tt;
  let kindDiff = 0, tileDiff = 0;
  for (let i = 0; i < W * H; i++) { kindDiff += m.kind[i] !== kA[i]; tileDiff += m.tile[i] !== tA[i]; }
  m.kind.set(k0); m.sea.set(s0); m.tile.set(t0);
  m.dirtyCount = 0; m.dirty.fill(0);
  return { kindDiff, tileDiff, rebuildMs };
}
const equiv = [];
for (const sc of SCENARIOS.filter((s) => s.tool === 'brush')) {
  const rows = [];
  for (let i = 0; i < EQUIV; i++) rows.push(equivalence(sc, 5000 + i));
  equiv.push({ scenario: sc.name, strokes: EQUIV, strokesWithKindDiff: rows.filter((r) => r.kindDiff).length, maxKindDiff: Math.max(...rows.map((r) => r.kindDiff)), maxTileDiff: Math.max(...rows.map((r) => r.tileDiff)), wholeMapRebuildMs: quant(rows.map((r) => r.rebuildMs)) });
}

const baseline = { autotileAllMs: [], tidyScanMs: [] };
for (let i = 0; i < 7; i++) {
  let t = now(); autotileAll(m); baseline.autotileAllMs.push(now() - t);
  t = now(); tidyAll(m); baseline.tidyScanMs.push(now() - t);
}

const medium = SCENARIOS.find((s) => s.name === 'brush r2 water');
const hist = { strokes: 100 };
let histBytes = 0;
const tHist = now();
for (let i = 0; i < hist.strokes; i++) {
  const pts = strokePath(9000 + i, medium.events, medium.length, 24, i % 2 === 1);
  beginEdit(ed);
  for (let e = 0; e < medium.events; e++) brushEvent(ed, pts[e * 2], pts[e * 2 + 1], pts[e * 2 + 2], pts[e * 2 + 3], medium.radius, i % 2 ? GRASS : WATER);
  finishEdit(ed);
  histBytes += recordBytes(ed, commit(ed));
  flushDirty(m, staging);
}
hist.applyMs = now() - tHist;
hist.historyMB = +(histBytes / 2 ** 20).toFixed(2);
hist.memWithHistory = mem();
let t = now();
while (undo(ed)) flushDirty(m, staging);
hist.undoAllMs = now() - t;
t = now();
while (redo(ed)) flushDirty(m, staging);
hist.redoAllMs = now() - t;
while (undo(ed)) flushDirty(m, staging);
const loadAfter = cpuLoad();

const out = {
  machine: { node: process.version, v8: process.versions.v8, cpu: os.cpus()[0].model.trim(), threads: os.cpus().length, os: `${os.type()} ${os.release()}`, when: new Date().toISOString(), cpuLoadBeforePct: loadBefore, cpuLoadAfterPct: loadAfter },
  config: { mode: MODE, tidy: TIDY, tidyAt: TIDY_AT, warm: WARM, samples: SAMPLES, equivStrokes: EQUIV, map: `${W}x${H}`, chunk: CHUNK, seed: SEED.toString(16) },
  map: { synthMs, waterShare: +(waterCells / (W * H)).toFixed(3), largestLakeCells: largestWater.size, mapMB: +(mapBytes(m) / 2 ** 20).toFixed(2), mapScratchMB: +(scratchBytes(m) / 2 ** 20).toFixed(2), editorScratchMB: +(editorBytes(ed) / 2 ** 20).toFixed(2), memBefore, memAfterMap },
  baseline: { autotileAllMs: quant(baseline.autotileAllMs), tidyScanMs: quant(baseline.tidyScanMs) },
  results, equiv, history: hist,
};
writeFileSync(new URL(`./results-${MODE}-${TIDY}-${TIDY_AT}.json`, import.meta.url), JSON.stringify(out, null, 1));

const f = (q, d = 3) => `${q.median.toFixed(d)} [${q.min.toFixed(d)}–${q.max.toFixed(d)}]`;
console.log(`mode ${MODE}, tidy ${TIDY} at ${TIDY_AT}, warm ${WARM}, samples ${SAMPLES}, node ${process.version}, load ${loadBefore} -> ${loadAfter} %`);
console.log(`synth ${synthMs.toFixed(0)} ms, water ${out.map.waterShare}, autotileAll ${f(out.baseline.autotileAllMs, 1)} ms, tidy scan ${f(out.baseline.tidyScanMs, 1)} ms`);
for (const r of results) {
  console.log(`${r.scenario.padEnd(18)} stroke ${f(r.strokeMs)} | finish ${f(r.finishMs)} | event med ${r.eventMs.median.toFixed(4)} p99 ${r.eventMs.p99.toFixed(4)} max ${r.eventMs.max.toFixed(3)} | flush ${r.flushMs.median.toFixed(4)} max ${r.flushMs.max.toFixed(3)} | commit ${f(r.commitMs)} | undo ${f(r.undoMs)} | redo ${f(r.redoMs)} | rec ${f(r.recordKB, 1)} KB | painted ${r.painted.median} flips ${r.tidyFlips.median} reverted ${r.revertedPainted.median} | chunks/ev max ${r.maxChunksPerEvent.median} upload ${f(r.uploadKB, 1)} KB`);
}
for (const e of equiv) console.log(`equiv ${e.scenario}: ${e.strokesWithKindDiff}/${e.strokes} strokes differ, max kind diff ${e.maxKindDiff}, max tile diff ${e.maxTileDiff}, rebuild ${f(e.wholeMapRebuildMs, 1)} ms`);
console.log(`history: ${hist.strokes} medium strokes ${hist.historyMB} MB, apply ${hist.applyMs.toFixed(0)} ms, undo all ${hist.undoAllMs.toFixed(1)} ms, redo all ${hist.redoAllMs.toFixed(1)} ms`);
console.log('memory', JSON.stringify({ before: memBefore, afterMap: memAfterMap, withHistory: hist.memWithHistory }));
