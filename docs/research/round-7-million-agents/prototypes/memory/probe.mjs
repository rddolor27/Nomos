// Stability of the start-up probe on this machine.
// node probe.mjs once  -> one cold probe as JSON (what a page would run at start)
// node probe.mjs       -> 21 cold probes in fresh processes plus 21 warm probes in this process
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { machine, cpuBusy, stats, fmt, save } from './lib.mjs';
import { probe } from './probe-core.mjs';

const cv = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return +((100 * Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)) / m).toFixed(1);
};

if (process.argv[2] === 'once') {
  console.log(JSON.stringify(probe()));
} else {
  const REPS = 21, self = fileURLToPath(import.meta.url);
  const res = { machine: machine(), reps: REPS, busyBefore: await cpuBusy(1000) };
  const cold = [];
  for (let r = 0; r < REPS; r++) cold.push(JSON.parse(execFileSync(process.execPath, [self, 'once'], { encoding: 'utf8' })));
  const warm = [];
  for (let r = 0; r < REPS; r++) warm.push(probe());
  res.busyAfter = await cpuBusy(1000);
  const sum = (rows) => ({
    nsPerAgentSmall: stats(rows.map((r) => r.nsPerAgentSmall)),
    nsPerAgentBig: stats(rows.map((r) => r.nsPerAgentBig)),
    setupMs: stats(rows.map((r) => r.setupMs)),
    totalMs: stats(rows.map((r) => r.totalMs)),
    cvBigPct: cv(rows.map((r) => r.nsPerAgentBig)),
  });
  res.cold = sum(cold); res.warm = sum(warm); res.coldRows = cold; res.warmRows = warm;
  for (const k of ['cold', 'warm']) {
    console.log(k, 'small', fmt(res[k].nsPerAgentSmall, ' ns/agent'), '| big', fmt(res[k].nsPerAgentBig, ' ns/agent'),
      '| setup', res[k].setupMs.median, 'ms | total', fmt(res[k].totalMs, ' ms'), '| CV big', res[k].cvBigPct, '%');
  }
  console.log('busy CPUs before/after', res.busyBefore, res.busyAfter);
  save('probe.json', res);
}
