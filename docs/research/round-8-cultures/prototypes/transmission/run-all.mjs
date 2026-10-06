// Runs the round 8 transmission benchmark matrix sequentially and writes results/summary.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, cpuBusy, machine } from './lib.mjs';

const runs = [];
const town = (args) => runs.push(['town.mjs', args]);
const ledger = (args) => runs.push(['ledger.mjs', args]);

for (const N of [10000, 100000]) for (const P of [1, 30, 365]) town([`--N=${N}`, `--P=${P}`, '--seed=1']);
for (const N of [10000, 100000]) town([`--N=${N}`, '--P=30', '--contact=friends', '--seed=1']);
for (const N of [10000, 100000]) for (const s of [2, 3]) town([`--N=${N}`, '--P=30', `--seed=${s}`]);
for (const v of ['neutral', 'conform', 'consub', 'enclave']) town(['--N=10000', '--P=30', `--variant=${v}`, '--seed=1']);
for (const m of [0.0025, 0.01]) town(['--N=10000', '--P=30', `--mIn=${m}`, `--mOut=${m}`, '--seed=1', `--tag=m${m}`]);
town(['--N=100000', '--P=30', '--variant=conform', '--seed=1']);
for (const v of ['migrationOnly', 'acculturate', 'strong']) ledger(['--S=1000', `--variant=${v}`]);
for (const v of ['migrationOnly', 'acculturate']) ledger(['--S=1000', `--variant=${v}`, '--longShare=0']);
ledger(['--S=10000', '--variant=acculturate', '--years=30']);

const busy0 = await cpuBusy(2000);
const log = [];
for (const [script, args] of runs) {
  const t0 = Date.now();
  const out = execFileSync(process.execPath, [join(HERE, script), ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = out.trim().split('\n')[0];
  log.push({ script, args, wallSeconds: (Date.now() - t0) / 1000, line });
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
}
const busy1 = await cpuBusy(2000);
writeFileSync(join(HERE, 'results', 'summary.json'), JSON.stringify({ machine: machine(), cpuBusyStart: busy0, cpuBusyEnd: busy1, runs: log }, null, 1));
