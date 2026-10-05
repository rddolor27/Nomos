import { Worker } from 'node:worker_threads';
import { writeFileSync, readFileSync } from 'node:fs';
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
import { runMT } from './mt-core.mjs';
const isBun = typeof Bun !== 'undefined';
const engine = isBun ? `bun ${Bun.version}` : `node ${process.version} V8 ${process.versions.v8}`;
console.log(engine);
const quick = process.argv.includes('quick');
const spawnHelper = (S, w) => new Promise((resolve) => {
  const wk = new Worker(new URL('./mt-helper-node.mjs', import.meta.url), { workerData: { S, w } });
  let doneRes; const done = new Promise((r) => (doneRes = r));
  wk.on('message', (m) => { if (m === 'ready') resolve({ wk, done }); if (m === 'exit') { wk.terminate(); doneRes(); } });
  wk.on('error', (e) => { console.error('worker error', e); });
});
const res = await runMT({ log: console.log, loadavg, spawnHelper, sizes: quick ? [10000] : [10000, 25000, 100000], ticks: quick ? 10 : 40, runs: quick ? 3 : 6 });
res.engine = engine;
writeFileSync(new URL(`../results/mt-${isBun ? 'bun' : 'node'}${quick ? '-quick' : ''}.json`, import.meta.url), JSON.stringify(res, null, 1));
process.exit(0);
