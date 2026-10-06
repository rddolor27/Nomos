import { probe } from '../probe-core.mjs';

const rows = [];
for (let i = 0; i < 7; i++) rows.push(probe());
postMessage(rows);
