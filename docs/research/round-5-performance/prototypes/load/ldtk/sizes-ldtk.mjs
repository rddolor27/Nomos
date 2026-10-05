import fs from 'node:fs'; import { sz } from '../sizes.mjs';
const rows = [];
for (const f of process.argv.slice(2)) { const s = sz(fs.readFileSync(f)); rows.push([f.split('/').slice(-2).join('/'), s.raw, s.gz, s.br]); }
for (const r of rows) console.log(r[0].padEnd(60), String(r[1]).padStart(9), String(r[2]).padStart(8), String(r[3]).padStart(8));
