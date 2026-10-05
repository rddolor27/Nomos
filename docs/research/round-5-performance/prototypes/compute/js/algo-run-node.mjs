import { writeFileSync, readFileSync } from 'node:fs';
import { runAlgoSuite } from './algo-suite.mjs';
const isBun = typeof Bun !== 'undefined';
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
const res = await runAlgoSuite({ log: console.log, loadavg, quick: process.argv.includes('quick') });
res.engine = isBun ? `bun ${Bun.version}` : `node ${process.version} V8 ${process.versions.v8}`;
writeFileSync(new URL(`../results/algo-${isBun ? 'bun' : 'node'}.json`, import.meta.url), JSON.stringify(res, null, 1));
