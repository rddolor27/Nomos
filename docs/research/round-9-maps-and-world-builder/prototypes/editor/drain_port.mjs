// A port of tools/worldgen/drainage.py's flood (priority-flood with keyed tie-breaks) on typed
// arrays, checked against country.json's Python output and timed against it.
// Usage: python country_stages.py && node drain_port.mjs [--warm=20] [--samples=50]

import { readFileSync } from 'node:fs';
import { draw } from './map.mjs';

const arg = (name, fallback) => Number((process.argv.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=')[1]);
const ELEVATION = 2, FLAT = 0x107;

function neighbourTable(w, h) {
  const steps = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
  const start = new Int32Array(w * h + 1), list = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      start[y * w + x] = list.length;
      for (const [dx, dy] of steps) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) list.push((y + dy) * w + x + dx);
    }
  }
  start[w * h] = list.length;
  return { start, list: Int32Array.from(list) };
}

// Min-heap on (level, tie, cell), the same total order as Python's heapq on those tuples.
function flood(seed, w, h, elevation, sinks, nb, tie) {
  const n = w * h;
  const filled = Int32Array.from(elevation), receiver = new Int32Array(n).fill(-1), done = new Uint8Array(n), order = new Int32Array(n);
  const hl = new Int32Array(n), ht = new Uint32Array(n), hc = new Int32Array(n);
  let size = 0, count = 0;
  const less = (a, b) => hl[a] < hl[b] || (hl[a] === hl[b] && (ht[a] < ht[b] || (ht[a] === ht[b] && hc[a] < hc[b])));
  const swap = (a, b) => {
    let t = hl[a]; hl[a] = hl[b]; hl[b] = t;
    t = ht[a]; ht[a] = ht[b]; ht[b] = t;
    t = hc[a]; hc[a] = hc[b]; hc[b] = t;
  };
  const push = (level, c) => {
    let i = size++;
    hl[i] = level; ht[i] = tie[c]; hc[i] = c;
    while (i > 0) { const p = (i - 1) >> 1; if (!less(i, p)) break; swap(i, p); i = p; }
  };
  const pop = () => {
    const c = hc[0], level = hl[0];
    size--;
    if (size > 0) {
      hl[0] = hl[size]; ht[0] = ht[size]; hc[0] = hc[size];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < size && less(l, m)) m = l;
        if (r < size && less(r, m)) m = r;
        if (m === i) break;
        swap(i, m); i = m;
      }
    }
    popped.level = level;
    return c;
  };
  const popped = { level: 0 };
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i / w) | 0;
    if (sinks[i] || x === 0 || x === w - 1 || y === 0 || y === h - 1) { push(elevation[i], i); done[i] = 1; }
  }
  while (size) {
    const c = pop(), level = popped.level;
    order[count++] = c;
    for (let k = nb.start[c]; k < nb.start[c + 1]; k++) {
      const m = nb.list[k];
      if (!done[m]) {
        done[m] = 1;
        filled[m] = Math.max(elevation[m], level);
        receiver[m] = c;
        push(filled[m], m);
      }
    }
  }
  return { filled, receiver, order };
}

const data = JSON.parse(readFileSync(new URL('./country.json', import.meta.url), 'utf8'));
const d = data.flood, w = d.width, h = d.height;
const elevation = Int32Array.from(d.elevation), ocean = Uint8Array.from(d.ocean);
const nb = neighbourTable(w, h);
const tie = new Uint32Array(w * h);
for (let i = 0; i < w * h; i++) tie[i] = draw(d.seed, ELEVATION, FLAT, i);

const out = flood(d.seed, w, h, elevation, ocean, nb, tie);
let bad = 0;
for (let i = 0; i < w * h; i++) bad += (out.filled[i] !== d.filled[i]) + (out.receiver[i] !== d.receiver[i]) + (out.order[i] !== d.order[i]);

const warm = arg('warm', 20), samples = arg('samples', 50), ms = [];
for (let i = 0; i < warm + samples; i++) {
  const t = performance.now();
  flood(d.seed, w, h, elevation, ocean, nb, tie);
  if (i >= warm) ms.push(performance.now() - t);
}
const tieMs = [];
for (let i = 0; i < 20; i++) {
  const t = performance.now();
  for (let c = 0; c < w * h; c++) tie[c] = draw(d.seed, ELEVATION, FLAT, c);
  tieMs.push(performance.now() - t);
}
ms.sort((a, b) => a - b);
tieMs.sort((a, b) => a - b);
const med = ms[ms.length >> 1];
console.log(`node ${process.version}: flood ${med.toFixed(3)} ms [${ms[0].toFixed(3)}–${ms[ms.length - 1].toFixed(3)}] over ${samples} samples after ${warm} warm-up, keyed ties ${tieMs[10].toFixed(3)} ms more`);
console.log(`python ${data.python}: flood ${data.flood.floodMs.median.toFixed(2)} ms [${data.flood.floodMs.min.toFixed(2)}–${data.flood.floodMs.max.toFixed(2)}], mismatches ${bad}`);
console.log(`ratio python / node, flood including ties: ${(data.flood.floodMs.median / (med + tieMs[10])).toFixed(0)}x`);
