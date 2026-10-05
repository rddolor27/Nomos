import { helperLoop } from '../js/mt-core.mjs';
onmessage = (e) => { const { S, w } = e.data; helperLoop(S, w, () => postMessage('ready')); postMessage('exit'); };
