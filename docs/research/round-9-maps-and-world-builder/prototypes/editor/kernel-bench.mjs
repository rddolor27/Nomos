// A subset of bench.mjs with no Node APIs, so the same code runs in Node and in a browser page
// (browser.mjs strips the imports and exports). The recommended setup: cell-diff undo,
// plan-then-apply tidy once per edit. upload(m) replaces the staging copy when a GL path exists.

import { CHUNK, GRASS, MEADOW, PATH, PAVING, WATER, createMap, draw, flushDirty, synthesize } from './map.mjs';
import { beginEdit, brushEvent, commit, createEditor, finishEdit, floodFill, placePrefab, rectFill, recordBytes, redo, replaceAll, undo } from './tools.mjs';

export function runKernelBench({ warm = 10, samples = 30, upload = null } = {}) {
  const W = 1024, H = 1024, SEED = 0x5eed0009;
  const now = () => performance.now();
  const m = createMap(W, H);
  synthesize(m, SEED);
  m.sync = true;
  const ed = createEditor(m, 'diff', true);
  const staging = new Uint16Array(CHUNK * CHUNK);
  const flush = upload || ((map) => flushDirty(map, staging));

  const quant = (xs) => {
    const s = Float64Array.from(xs).sort();
    const at = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
    return { median: at(0.5), min: s[0], max: s[s.length - 1], p99: at(0.99) };
  };
  const dirs = [];
  for (let d = 0; d < 16; d++) dirs.push([Math.cos((d * Math.PI) / 8), Math.sin((d * Math.PI) / 8)]);
  const path = (sample, events, length, startOn) => {
    const pts = new Int32Array((events + 1) * 2);
    let x, y, tries = 0;
    do {
      x = 24 + (draw(SEED, 20, sample, 0, tries) % (W - 48));
      y = 24 + (draw(SEED, 20, sample, 1, tries) % (H - 48));
      tries++;
    } while ((m.kind[y * W + x] === WATER) !== startOn && tries < 1000);
    let dir = draw(SEED, 20, sample, 2) % 16;
    pts[0] = x; pts[1] = y;
    for (let e = 1; e <= events; e++) {
      const turn = draw(SEED, 21, sample, e) % 7;
      dir = (dir + (turn === 0 ? 15 : turn === 1 ? 1 : 0)) % 16;
      x = Math.min(W - 2, Math.max(1, x + (dirs[dir][0] * length) / events));
      y = Math.min(H - 2, Math.max(1, y + (dirs[dir][1] * length) / events));
      pts[e * 2] = Math.floor(x); pts[e * 2 + 1] = Math.floor(y);
    }
    return pts;
  };
  let lake = { size: 0, x: 0, y: 0 };
  {
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H);
    for (let p = 0; p < 400; p++) {
      const s = draw(SEED, 34, p) % (W * H);
      if (seen[s] || m.kind[s] !== WATER) continue;
      let top = 0, size = 0;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top], x = i % W, y = (i / W) | 0;
        size++;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
          if (j >= 0 && !seen[j] && m.kind[j] === WATER) { seen[j] = 1; stack[top++] = j; }
        }
      }
      if (size > lake.size) lake = { size, x: s % W, y: (s / W) | 0 };
    }
  }
  const prefabKind = new Uint8Array(16 * 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) prefabKind[y * 16 + x] = x === 0 || y === 0 || x === 15 || y === 11 ? PATH : PAVING;
  const prefab = { w: 16, h: 12, kind: prefabKind, buildings: [{ frame: 1, tx: 2, ty: 2, fw: 4, fh: 3 }, { frame: 2, tx: 8, ty: 2, fw: 5, fh: 3 }, { frame: 3, tx: 2, ty: 7, fw: 3, fh: 3 }, { frame: 4, tx: 8, ty: 7, fw: 5, fh: 3 }] };

  const scenarios = [
    ['brush r2 water', (s, step) => { const p = path(s, 120, 60, false); for (let e = 0; e < 120; e++) step(() => brushEvent(ed, p[e * 2], p[e * 2 + 1], p[e * 2 + 2], p[e * 2 + 3], 2, WATER)); }],
    ['brush r8 water', (s, step) => { const p = path(s, 180, 180, false); for (let e = 0; e < 180; e++) step(() => brushEvent(ed, p[e * 2], p[e * 2 + 1], p[e * 2 + 2], p[e * 2 + 3], 8, WATER)); }],
    ['brush r16 water', (s, step) => { const p = path(s, 120, 240, false); for (let e = 0; e < 120; e++) step(() => brushEvent(ed, p[e * 2], p[e * 2 + 1], p[e * 2 + 2], p[e * 2 + 3], 16, WATER)); }],
    ['rect 128 water', (s, step) => { const x = draw(SEED, 30, s, 0) % (W - 128), y = draw(SEED, 30, s, 1) % (H - 128); step(() => rectFill(ed, x, y, 128, 128, WATER)); }],
    ['fill largest lake', (s, step) => step(() => floodFill(ed, lake.x, lake.y, GRASS))],
    ['replace all meadow', (s, step) => step(() => replaceAll(ed, MEADOW, GRASS))],
    ['prefab 16x12', (s, step) => { const x = 1 + (draw(SEED, 32, s, 0) % (W - 20)), y = 1 + (draw(SEED, 32, s, 1) % (H - 16)); step(() => placePrefab(ed, prefab, x, y)); }],
  ];

  const results = [];
  for (const [name, run] of scenarios) {
    const strokes = [], events = [], flushes = [], undos = [], redos = [], kb = [], chunks = [];
    const once = (sample, keep) => {
      let total = 0, chunkSum = 0;
      beginEdit(ed);
      run(sample, (fn) => {
        const t = now(); fn(); const d = now() - t; total += d; if (keep) events.push(d);
        const tf = now(); const f = flush(m); if (keep) flushes.push(now() - tf); chunkSum += f.chunks;
      });
      const t = now(); finishEdit(ed); total += now() - t;
      chunkSum += flush(m).chunks;
      const rec = commit(ed);
      const tu = now(); undo(ed); flush(m); const u = now() - tu;
      const tr = now(); redo(ed); flush(m); const r = now() - tr;
      undo(ed); flush(m);
      ed.undoStack.length = 0; ed.redoStack.length = 0;
      if (keep) { strokes.push(total); undos.push(u); redos.push(r); kb.push(recordBytes(ed, rec) / 1024); chunks.push(chunkSum); }
    };
    for (let i = 0; i < warm; i++) once(100000 + i, false);
    for (let i = 0; i < samples; i++) once(i, true);
    results.push({ scenario: name, strokeMs: quant(strokes), eventMs: quant(events), flushMs: quant(flushes), undoWithFlushMs: quant(undos), redoWithFlushMs: quant(redos), recordKB: quant(kb), chunksUploaded: quant(chunks) });
  }
  return { lakeCells: lake.size, results };
}
