// A port of tools/worldgen/noise.py's value noise and fbm, checked against noise.json and timed.
// Usage: python noise_ratio.py && node noise_port.mjs

import { readFileSync } from 'node:fs';
import { mix } from './map.mjs';

const ONE = 1 << 15;
const fade = (t) => (Math.imul((Math.imul(t, t) >> 15), 3 * ONE - 2 * t)) >> 15;

function draw4(seed, stream, octave, ix, iy) {
  let h = mix(mix(seed ^ 0x9e3779b9) ^ stream);
  h = mix(h ^ octave);
  h = mix(h ^ (ix >>> 0));
  return mix(h ^ (iy >>> 0));
}

function value(seed, stream, x, y, cell, octave) {
  const ix = Math.floor(x / cell), fx = x - ix * cell, iy = Math.floor(y / cell), fy = y - iy * cell;
  const tx = fade(Math.floor((fx * ONE) / cell)), ty = fade(Math.floor((fy * ONE) / cell));
  const a = draw4(seed, stream, octave, ix, iy) >>> 16, b = draw4(seed, stream, octave, ix + 1, iy) >>> 16;
  const c = draw4(seed, stream, octave, ix, iy + 1) >>> 16, d = draw4(seed, stream, octave, ix + 1, iy + 1) >>> 16;
  const top = a + (((b - a) * tx) >> 15), bottom = c + (((d - c) * tx) >> 15);
  return top + (((bottom - top) * ty) >> 15);
}

function fbm(seed, stream, x, y, cell, octaves) {
  let total = 0, weight = 0, amp = 1 << octaves;
  for (let o = 0; o < octaves; o++) {
    total += value(seed, stream, x, y, Math.max(1, cell >> o), o) * amp;
    weight += amp;
    amp >>= 1;
  }
  return Math.floor(total / weight);
}

const d = JSON.parse(readFileSync(new URL('./noise.json', import.meta.url), 'utf8'));
const out = new Int32Array(d.w * d.h);
const run = () => { for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) out[y * d.w + x] = fbm(d.seed, d.stream, x * 16, y * 16, d.cell, d.octaves); };
run();
let bad = 0;
for (let i = 0; i < out.length; i++) bad += out[i] !== d.values[i];
const ms = [];
for (let i = 0; i < 70; i++) { const t = performance.now(); run(); if (i >= 20) ms.push(performance.now() - t); }
ms.sort((a, b) => a - b);
const med = ms[ms.length >> 1];
console.log(`node ${process.version}: fbm ${med.toFixed(3)} ms [${ms[0].toFixed(3)}–${ms[ms.length - 1].toFixed(3)}] over 50 samples after 20 warm-up, mismatches ${bad}`);
console.log(`python ${d.python}: fbm ${d.ms.median.toFixed(2)} ms; ratio ${(d.ms.median / med).toFixed(0)}x`);
