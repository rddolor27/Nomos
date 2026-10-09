import { draw3 } from './draw.ts';
import { floorDiv, floorMod } from '../maths/int.ts';

// Ported from tools/worldgen/noise.py. Fractions are Q15 (ONE is 1.0), so every product fits a signed
// 32-bit int and >> floors exactly as Python's does.
export const ONE = 1 << 15;

function mulQ15(a: number, bQ15: number): number {
  return (a * bQ15) >> 15;
}

function lerp(a: number, b: number, tQ15: number): number {
  return a + mulQ15(b - a, tQ15);
}

// Smoothstep 3t^2 - 2t^3 for t in 0..ONE.
export function fade(t: number): number {
  return mulQ15(mulQ15(t, t), 3 * ONE - 2 * t);
}

// The draw is unsigned, so >>> keeps its top 16 bits as 0..65535.
function latticeValue(seed: number, stream: number, octave: number, ix: number, iy: number): number {
  return draw3(seed, stream, octave, ix, iy) >>> 16;
}

export function value(seed: number, stream: number, x: number, y: number, cell: number, octave = 0): number {
  const ix = floorDiv(x, cell);
  const iy = floorDiv(y, cell);
  const tx = fade(floorDiv(floorMod(x, cell) * ONE, cell));
  const ty = fade(floorDiv(floorMod(y, cell) * ONE, cell));
  const a = latticeValue(seed, stream, octave, ix, iy);
  const b = latticeValue(seed, stream, octave, ix + 1, iy);
  const c = latticeValue(seed, stream, octave, ix, iy + 1);
  const d = latticeValue(seed, stream, octave, ix + 1, iy + 1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

// Each octave halves the cell (never below 1) and the weight, and has its own lattice.
export function fbm(seed: number, stream: number, x: number, y: number, cell: number, octaves = 5): number {
  let total = 0;
  let weight = 0;
  let amp = 1 << octaves;
  for (let octave = 0; octave < octaves; octave++) {
    total += value(seed, stream, x, y, Math.max(1, cell >> octave), octave) * amp;
    weight += amp;
    amp >>= 1;
  }
  return floorDiv(total, weight);
}
