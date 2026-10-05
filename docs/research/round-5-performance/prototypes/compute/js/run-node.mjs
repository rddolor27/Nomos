// Entry for Node and Bun: node run-node.mjs [quick]
import { readFileSync, writeFileSync } from 'node:fs';
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
import { runKernelSuite } from './suite-kernels.mjs';
const isBun = typeof Bun !== 'undefined';
const engine = isBun ? `bun ${Bun.version} (JavaScriptCore)` : `node ${process.version} (V8 ${process.versions.v8})`;
const quick = process.argv.includes('quick');
const tag = process.argv.find((a) => a.startsWith('tag='))?.slice(4) ?? '';
console.log('engine:', engine);
const res = await runKernelSuite({ scalarBytes: readFileSync(new URL('../wasm/scalar.wasm', import.meta.url)), simdBytes: readFileSync(new URL('../wasm/simd.wasm', import.meta.url)), quick, loadavg });
res.env.engine = engine;
const f = new URL(`../results/kernels-${isBun ? 'bun' : 'node'}${tag}.json`, import.meta.url);
writeFileSync(f, JSON.stringify(res, null, 1));
console.log('saved', f.pathname);
