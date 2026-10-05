// Fails CI when the median of a startup metric exceeds its budget, or regresses >15% vs. a baseline JSON from main.
import fs from 'node:fs';
const [resultsFile, budgetsFile, baselineFile] = process.argv.slice(2);
const B = JSON.parse(fs.readFileSync(budgetsFile, 'utf8')); const R = JSON.parse(fs.readFileSync(resultsFile, 'utf8')).find((r) => r.prof === B.profile);
const base = baselineFile && fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).find((r) => r.prof === B.profile) : null;
let fail = 0;
for (const [k, lim] of Object.entries({ ...B.maxMs, ...B.maxKB })) {
  const v = R.summary[k]?.med; if (v == null) continue;
  const b = base?.summary[k]?.med; const reg = b ? (v - b) / b : 0;
  const bad = v > lim || (b && reg > B.maxRegressionVsBaseline && v - b > 20);
  console.log(`${bad ? 'FAIL' : 'ok  '} ${k.padEnd(12)} median ${v} (budget ${lim}${b ? `, baseline ${b}, ${(reg * 100).toFixed(1)}%` : ''})`); if (bad) fail++;
}
process.exit(fail ? 1 : 0);
