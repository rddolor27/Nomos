// Pretty-prints a bench RESULT line from stdin, or a results JSON file given as an argument.
import { readFileSync } from 'node:fs';
const print = (r) => {
  const f = (x) => (x && x.med !== undefined ? `${x.med.toFixed(4)} [${x.min.toFixed(4)}-${x.max.toFixed(4)}]` : JSON.stringify(x));
  console.log('config', JSON.stringify(r.config), 'build', r.buildMs.toFixed(1), 'ms; K', r.ticksPerSample, 'timer ovh', (r.timerOverheadMs * 1e6).toFixed(0), 'ns');
  console.log('perTick:', Object.entries(r.perTick).map(([k, v]) => `${k}=${f(v)}`).join('; '));
  console.log('day in sim:', Object.entries(r.dayInSim).map(([k, v]) => `${k}=${f(v)}`).join('; '));
  console.log('day early (cold JIT):', r.dayEarly.totals.map((x) => x.toFixed(3)).join(', '), '| max per tick', r.dayEarly.maxTickShare.map((x) => x.toFixed(3)).join(', '));
  console.log('probe:', `separate=${f(r.dayProbe.separate)}; fused=${f(r.dayProbe.fused)}; sliced total=${f(r.dayProbe.slicedTotal)} max slice=${f(r.dayProbe.slicedMaxSlice)}`);
  console.log('  parts:', Object.entries(r.dayProbe.separateParts).map(([k, v]) => `${k}=${f(v)}`).join('; '));
  console.log('snapshot', r.snapshot.bytes, 'B copy', r.snapshot.copyMs.toFixed(3), 'restore', r.snapshot.restoreMs.toFixed(3), 'ms');
  console.log('rush ns/agent', f(r.dinnerRush.nsPerAgent), 'ok', r.dinnerRush.successShare, '| spoil fused', f(r.spoil.fused), 'plain', f(r.spoil.plain));
  console.log('mood', f(r.moodTick), '| top hist', f(r.topShare.hist), 'sort', f(r.topShare.sort), 'Q16', r.topShare.histQ16, r.topShare.sortQ16);
  for (const g of r.gc) console.log('gc', g.label, 'units', g.units, 'n', g.count, `(minor ${g.minor}, major ${g.major})`, 'heap/unit', g.heapGrowthPerUnit.toFixed(0), 'B');
  console.log('ledger exact', r.ledgerExactAfterRun, r.ledgerExactDeterminismRun, 'det', JSON.stringify(r.determinism), 'lutErr', r.lutMaxErrQ16.toFixed(2));
  console.log('mem used', r.memory.usedBytes, 'reserved', r.memory.reservedBytes, JSON.stringify(Object.fromEntries(Object.entries(r.memory.groups).map(([k, v]) => [k, v.bytes]))));
  console.log('cpu before', JSON.stringify(r.cpuBefore), 'after ticks', JSON.stringify(r.cpuAfterTicks));
};
if (process.argv[2]) print(JSON.parse(readFileSync(process.argv[2], 'utf8')));
else {
  let s = '';
  process.stdin.on('data', (d) => (s += d)).on('end', () => {
    const line = s.trim().split('\n').find((l) => l.startsWith('RESULT '));
    if (!line) console.log(s); else print(JSON.parse(line.slice(7)));
  });
}
