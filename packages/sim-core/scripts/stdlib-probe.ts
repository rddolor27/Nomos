// Digests @stdlib's results to show they are bit-identical in every engine, which the build-time tables rely on.
// Run it to write the fixture, or with --check to compare with it. The bundle for Firefox (stdlib-firefox.ts) reuses probeStdlib.
import cos from '@stdlib/math-base-special-cos';
import erf from '@stdlib/math-base-special-erf';
import exp from '@stdlib/math-base-special-exp';
import ln from '@stdlib/math-base-special-ln';
import log2 from '@stdlib/math-base-special-log2';
import pow from '@stdlib/math-base-special-pow';
import sin from '@stdlib/math-base-special-sin';
import cdf from '@stdlib/stats-base-dists-normal-cdf';
import quantile from '@stdlib/stats-base-dists-normal-quantile';
import { draw2, mix } from '../src/random/draw.ts';

const SEED = 42;
const STREAM = 0x7f0;
const INPUTS_PER_FUNCTION = 1024;
const TWO_POW_32 = 4294967296;
const SPECIAL_INPUTS = [0, -0, Infinity, -Infinity];
// The bits of a NaN depend on the CPU that made it, so every NaN folds as this one pair of words.
const NAN_LOW_WORD = 0;
const NAN_HIGH_WORD = 0x7ff80000;

interface Probe {
  name: string;
  lo: number;
  hi: number;
  apply: (x: number, unit: number) => number;
}

// The order is part of the fixture: a function's index keys its draws.
const PROBES: Probe[] = [
  { name: 'exp', lo: -40, hi: 40, apply: (x) => exp(x) },
  { name: 'ln', lo: 0, hi: 100, apply: (x) => ln(x) },
  { name: 'log2', lo: 0, hi: 100, apply: (x) => log2(x) },
  { name: 'pow', lo: 0, hi: 100, apply: (x, unit) => pow(x, 16 * unit - 8) },
  { name: 'sin', lo: -1000, hi: 1000, apply: (x) => sin(x) },
  { name: 'cos', lo: -1000, hi: 1000, apply: (x) => cos(x) },
  { name: 'erf', lo: -6, hi: 6, apply: (x) => erf(x) },
  { name: 'normalQuantile', lo: 0, hi: 1, apply: (p) => quantile(p, 0, 1) },
  { name: 'normalCdf', lo: -8, hi: 8, apply: (x) => cdf(x, 0, 1) },
];

const bits = new DataView(new ArrayBuffer(8));

function fold(h: number, y: number): number {
  if (Number.isNaN(y)) return mix(mix(h ^ NAN_LOW_WORD) ^ NAN_HIGH_WORD);
  bits.setFloat64(0, y, true);
  return mix(mix(h ^ bits.getUint32(0, true)) ^ bits.getUint32(4, true));
}

function unit(f: number, key: number): number {
  return draw2(SEED, STREAM, f, key) / TWO_POW_32;
}

export function probeStdlib(): Record<string, string> {
  const digests: Record<string, string> = {};
  for (let f = 0; f < PROBES.length; f++) {
    const { name, lo, hi, apply } = PROBES[f];
    let h = 0;
    for (let i = 0; i < INPUTS_PER_FUNCTION; i++) {
      h = fold(h, apply(lo + (hi - lo) * unit(f, i), unit(f, INPUTS_PER_FUNCTION + i)));
    }
    for (const x of SPECIAL_INPUTS) h = fold(h, apply(x, unit(f, INPUTS_PER_FUNCTION)));
    digests[name] = h.toString(16).padStart(8, '0');
  }
  return digests;
}

export function differences(expected: Record<string, string>, actual: Record<string, string>): string[] {
  const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  return names
    .filter((name) => expected[name] !== actual[name])
    .map((name) => `${name}: expected ${expected[name] ?? 'nothing'}, got ${actual[name] ?? 'nothing'}`);
}

if (import.meta.main) {
  // Imported here, not at the top, so a browser bundle of this file never loads node:fs.
  const { readFileSync, writeFileSync } = await import('node:fs');
  const fixture = new URL('../test/fixtures/stdlib-digests.json', import.meta.url);
  const digests = probeStdlib();
  if (process.argv.includes('--check')) {
    const engine = `${process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`} ${process.platform} ${process.arch}`;
    const differing = differences(JSON.parse(readFileSync(fixture, 'utf8')) as Record<string, string>, digests);
    if (differing.length > 0) {
      console.error(`@stdlib digests differ on ${engine}:\n  ${differing.join('\n  ')}`);
      process.exitCode = 1;
    } else {
      console.log(`@stdlib digests match the fixture on ${engine}`);
    }
  } else {
    writeFileSync(fixture, `${JSON.stringify(digests, null, 2)}\n`);
    for (const [name, digest] of Object.entries(digests)) console.log(`${name.padEnd(16)}${digest}`);
  }
}
