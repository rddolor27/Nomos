// node check-terrain.mjs GOLDEN.json: the JS terrain stage against stages.py's 'shape' fingerprints.
import { readFileSync } from 'node:fs';
import { checkShapes } from './terrain.mjs';

const golden = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { rows, matches } = checkShapes(golden);
for (const r of rows) {
  if (r.got !== r.expected) console.log(`MISMATCH ${r.seed.toString(16)} ${r.width}x${r.height} ${r.template}: ${r.got} vs ${r.expected}`);
}
const warm = [];
for (let pass = 0; pass < 3; pass++) warm.push(...checkShapes(golden).rows.map((r) => r.ms));
warm.sort((a, b) => a - b);
console.log(`${matches} of ${golden.length} match | node ${process.version}`);
console.log(`warm (3 more passes, ${warm.length} samples): median ${warm[warm.length >> 1].toFixed(1)} [${warm[0].toFixed(1)}-${warm[warm.length - 1].toFixed(1)}] ms`);
