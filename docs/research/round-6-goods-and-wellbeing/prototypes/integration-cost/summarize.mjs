// Reads results/*.json and prints the tables used in the notes (markdown).
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('./results/', import.meta.url);
const R = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));
const cal0 = R['calibrate-start'], cal1 = R['calibrate-end'];
const F = Math.max(cal0.factorNodeMed, cal0.factorNodeMin);
const BUDGET = { 10000: { other: 1.2, slack: 1.25, tick: 5.3 }, 25000: { other: 3.0, slack: 2.95, tick: 13.3 }, 100000: { other: 1.4, slack: 3.0, tick: 16 } };
const ms = (x, d = 3) => `${x.med.toFixed(d)} [${x.min.toFixed(d)}–${x.max.toFixed(d)}]`;
const k = (N) => `${N / 1000}k`;

console.log(`## Calibration\nfactor vs RM Node 22: median ${cal0.factorNodeMed.toFixed(2)}, min ${cal0.factorNodeMin.toFixed(2)}; vs RM Chromium (min) ${cal0.factorChromiumMin.toFixed(2)}; end-of-run repeat: ${cal1.factorNodeMed.toFixed(2)} / ${cal1.factorNodeMin.toFixed(2)} / ${cal1.factorChromiumMin.toFixed(2)}. RM-equivalent factor used: ${F.toFixed(2)}`);
for (const r of cal0.rows) console.log(`- ${k(r.N)} ${r.kernel}: here ${(r.hereMs.med * 1000).toFixed(1)} µs [${(r.hereMs.min * 1000).toFixed(1)}–${(r.hereMs.max * 1000).toFixed(1)}], RM Node ${(r.rmNode22Ms.med * 1000).toFixed(1)} µs, ratio ${r.ratioMed.toFixed(2)} (min ${r.ratioMin.toFixed(2)}), RM Chromium min ratio ${r.ratioChromiumMin.toFixed(2)}`);

console.log('\n## Per tick (needs + eating + shopping), ms here; RM-eq = min x factor');
console.log('| run | needs+eat | shop | bundle | p99 / max | RM-eq (min) | share of "other agent systems" | meals/agent-day | shops/tick | CPU busy before |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const [name, r] of Object.entries(R)) {
  if (!name.startsWith('bench-')) continue;
  const b = r.perTick, N = r.config.N, rm = b.bundle.min * F;
  console.log(`| ${name} | ${ms(b.needsEat, 4)} | ${ms(b.shop, 4)} | ${ms(b.bundle, 4)} | ${b.p99.toFixed(3)} / ${b.max.toFixed(3)} | ${rm.toFixed(3)} | ${(100 * rm / BUDGET[N].other).toFixed(1)}% of ${BUDGET[N].other} | ${b.mealsPerAgentDay?.toFixed(2)} | ${b.shopsPerTick.toFixed(1)} | ${r.cpuBefore.busyLogicalCpus} of ${r.env.logicalCpus} |`);
}

console.log('\n## Day work, ms here');
console.log('| run | in-sim day total | in-sim max per tick | early days (cold JIT) | probe separate | probe fused | probe sliced total | probe max slice | RM-eq max per tick vs slack |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const [name, r] of Object.entries(R)) {
  if (!name.startsWith('bench-')) continue;
  const N = r.config.N, p = r.dayProbe, d = r.dayInSim;
  const perTick = d.maxTickShare.min * F;
  console.log(`| ${name} | ${ms(d.total)} | ${ms(d.maxTickShare)} | ${r.dayEarly.totals.map((x) => x.toFixed(2)).join(', ')} (max/tick ${r.dayEarly.maxTickShare.map((x) => x.toFixed(2)).join(', ')}) | ${ms(p.separate)} | ${ms(p.fused)} | ${ms(p.slicedTotal)} | ${ms(p.slicedMaxSlice)} | ${perTick.toFixed(2)} vs ${BUDGET[N].slack} |`);
}

console.log('\n## Day parts (probe, separate variant), ms here');
console.log('| run | spoil + stock fold | resources | payroll | household wealth | happiness | commit | spoil fused vs plain | top share hist / sort | dinner rush ns/agent |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const [name, r] of Object.entries(R)) {
  if (!name.startsWith('bench-')) continue;
  const p = r.dayProbe.separateParts;
  console.log(`| ${name} | ${ms(p.spoilFold)} | ${ms(p.resources)} | ${ms(p.payroll)} | ${ms(p.wealthHouseholds)} | ${ms(p.happiness)} | ${ms(p.commit, 4)} | ${r.spoil.fused.min.toFixed(3)} / ${r.spoil.plain.min.toFixed(3)} | ${r.topShare.hist.med.toFixed(4)} / ${r.topShare.sort.med.toFixed(3)} (Q16 ${r.topShare.histQ16} vs ${r.topShare.sortQ16}) | ${ms(r.dinnerRush.nsPerAgent, 1)} (ok ${(100 * r.dinnerRush.successShare).toFixed(1)}%) |`);
}

console.log('\n## Optional per-tick mood EMA, ms here');
for (const [name, r] of Object.entries(R)) if (name.startsWith('bench-') && r.moodTick) console.log(`- ${name}: ${ms(r.moodTick, 4)}`);

console.log('\n## Memory');
console.log('| run | agent B/agent | household B/household | household B/agent | firm B/agent | system B | settlement B | sort scratch B | total used | reserved | heapUsed | arrayBuffers |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [name, r] of Object.entries(R)) {
  if (!name.startsWith('bench-')) continue;
  const g = r.memory.groups, N = r.config.N, H = r.config.H;
  console.log(`| ${name} | ${(g.agent.bytes / N).toFixed(1)} | ${(g.household.bytes / H).toFixed(1)} | ${(g.household.bytes / N).toFixed(1)} | ${(g.firm.bytes / N).toFixed(2)} | ${g.system.bytes} | ${g.settlement.bytes} | ${g['scratch-optional'].bytes} | ${r.memory.usedBytes} | ${r.memory.reservedBytes} | ${r.process.heapUsed} | ${r.process.arrayBuffers} |`);
}

console.log('\n## Allocation (GC events and heap growth per unit)');
for (const [name, r] of Object.entries(R)) if (name.startsWith('bench-')) console.log(`- ${name}: ` + r.gc.map((g) => `${g.label} n=${g.count} heap/unit ${g.heapGrowthPerUnit.toFixed(0)} B`).join('; '));

console.log('\n## Determinism and ledger');
for (const [name, r] of Object.entries(R)) if (name.startsWith('bench-')) console.log(`- ${name}: repeat ${r.determinism.repeatIdentical} hash ${r.determinism.hashes[0]} ledger exact ${r.ledgerExactAfterRun}/${r.ledgerExactDeterminismRun} lutErr ${r.lutMaxErrQ16.toFixed(2)}`);

console.log('\n## Settlement extension (L2), per settlement-day');
const se = R['settle-ext'];
console.log('| variant | settlements | numbers / settlement | bytes / settlement | ms per day here | µs per settlement | 365-day hash repeat |');
console.log('|---|---|---|---|---|---|---|');
for (const r of se.rows) console.log(`| ${r.variant} | ${r.S} | ${r.numbersPerSettlement} | ${r.bytesPerSettlement} | ${ms(r.msPerDay)} | ${r.usPerSettlement.med.toFixed(3)} [${r.usPerSettlement.min.toFixed(3)}–${r.usPerSettlement.max.toFixed(3)}] | ${r.year.identical} |`);

console.log('\n## Environment');
const any = R['bench-10k-all'];
console.log(JSON.stringify(any.env), JSON.stringify(se.env));
