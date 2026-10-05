import { workerData, parentPort } from 'node:worker_threads';
import { helperLoop } from './mt-core.mjs';
helperLoop(workerData.S, workerData.w, () => parentPort.postMessage('ready'));
parentPort.postMessage('exit');
