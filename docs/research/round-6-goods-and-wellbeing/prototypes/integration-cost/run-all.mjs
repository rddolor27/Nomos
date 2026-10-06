// Runs the calibration, the settlement-extension benchmark and the bench matrix, one process each,
// and writes results/<name>.json. Usage: node run-all.mjs [quick] [only=<substring>]
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const resDir = new URL('./results/', import.meta.url);
mkdirSync(resDir, { recursive: true });
const quick = process.argv.includes('quick');
const only = process.argv.find((a) => a.startsWith('only='))?.slice(5);

function run(name, script, args = [], env = {}) {
  if (only && !name.includes(only)) return;
  const t0 = Date.now();
  const out = execFileSync(process.execPath, ['--expose-gc', script, ...args, ...(quick ? ['quick'] : [])], { cwd: here, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 256e6 });
  const line = out.split('\n').find((l) => l.startsWith('RESULT '));
  writeFileSync(new URL(`${name}.json`, resDir), JSON.stringify(JSON.parse(line.slice(7)), null, 1));
  console.log(`${new Date().toISOString()} ${name} done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

const bench = (name, o) => run(name, 'bench.mjs', [`N=${o.N}`, `tick=${o.tick}`, `order=${o.order ?? 'contig'}`, `day=${o.day ?? 'separate'}`, `tpd=${o.tpd ?? 1440}`], { NOMOS_LAYOUT: o.layout ?? 'packed' });
const k = (N) => `${N / 1000}k`;

run('calibrate-start', 'calibrate.mjs');
run('settle-ext', 'settle-ext.mjs');
for (const N of [10000, 25000, 100000]) for (const tick of ['all', 'stagger', 'wheel']) bench(`bench-${k(N)}-${tick}`, { N, tick });
for (const N of [10000, 25000, 100000]) bench(`bench-${k(N)}-wheel-sliced`, { N, tick: 'wheel', day: 'sliced' });
for (const N of [10000, 25000, 100000]) bench(`bench-${k(N)}-wheel-fused`, { N, tick: 'wheel', day: 'fused' });
for (const N of [10000, 25000, 100000]) for (const tick of ['all', 'wheel']) bench(`bench-${k(N)}-${tick}-scatter`, { N, tick, order: 'scatter' });
for (const N of [10000, 25000, 100000]) bench(`bench-${k(N)}-all-soa`, { N, tick: 'all', layout: 'soa' });
bench('bench-100k-wheel-tpd240', { N: 100000, tick: 'wheel', tpd: 240 });
bench('bench-100k-wheel-tpd14400', { N: 100000, tick: 'wheel', tpd: 14400 });
run('calibrate-end', 'calibrate.mjs');
