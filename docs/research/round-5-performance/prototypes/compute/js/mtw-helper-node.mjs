import { workerData, parentPort } from 'node:worker_threads';
import { instantiate, helperLoop } from './mtw-core.mjs';
const { module, memory, L, ctrl, w } = workerData;
const ex = await instantiate(module, memory, (1 << 20) + (w + 1) * (512 << 10));
helperLoop(ex, L, ctrl, w, () => parentPort.postMessage('ready'));
parentPort.postMessage('exit');
