import { workerData, parentPort } from 'node:worker_threads';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { makeViews } from './world.mjs';
import * as K from './kernels.mjs';
import { bindMT, helperLoop } from './mt.mjs';

const { buffer, L, w, seed } = workerData;
const V = makeViews(buffer, L);
K.bind(V, L, seed);
bindMT(V, L);
const gc = [];
const obs = new PerformanceObserver((list) => { for (const e of list.getEntries()) gc.push([performance.timeOrigin + e.startTime, e.duration, e.detail ? e.detail.kind : 0]); });
obs.observe({ entryTypes: ['gc'] });
helperLoop(w, () => parentPort.postMessage({ type: 'ready', w }));
setTimeout(() => { obs.disconnect(); parentPort.postMessage({ type: 'exit', w, gc }); }, 50);
