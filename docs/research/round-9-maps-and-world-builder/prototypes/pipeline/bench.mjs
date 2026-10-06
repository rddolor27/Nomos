// node bench.mjs: median [min-max] of the keyed draw and of fbm over country-sized grids.
import os from 'node:os';
import { draw3, fbm } from './port.mjs';

const WARMUP = 5;
const SAMPLES = 15;

function measure(run) {
  for (let i = 0; i < WARMUP; i++) run();
  const times = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    run();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { median: times[SAMPLES >> 1], min: times[0], max: times[SAMPLES - 1] };
}

let sink = 0;
const DRAWS = 1_000_000;
const drawTimes = measure(() => {
  for (let i = 0; i < DRAWS; i++) sink ^= draw3(0x5eed0001, 2, i & 7, i, i >> 3);
});

function grid(width, height, cell, octaves) {
  return measure(() => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) sink ^= fbm(0x5eed0001, 2, x, y, cell, octaves);
  });
}

const fmt = (t, scale = 1, unit = 'ms') =>
  `${(t.median * scale).toFixed(3)} [${(t.min * scale).toFixed(3)}-${(t.max * scale).toFixed(3)}] ${unit}`;

console.log(`node ${process.version} V8 ${process.versions.v8} | ${os.cpus()[0].model.trim()} | ${os.type()} ${os.release()}`);
console.log(`warm-up ${WARMUP}, samples ${SAMPLES}`);
console.log(`draw (3 keys): ${fmt(drawTimes, 1e6 / DRAWS, 'ns per draw')}`);
for (const [w, h, cell, oct] of [[96, 64, 24, 5], [192, 128, 48, 5], [384, 256, 96, 5]]) {
  const t = grid(w, h, cell, oct);
  console.log(`fbm ${oct} octaves over ${w}x${h}: ${fmt(t)} per grid, ${(t.median * 1e6 / (w * h)).toFixed(0)} ns per cell`);
}
console.log(`sink ${sink}`);
