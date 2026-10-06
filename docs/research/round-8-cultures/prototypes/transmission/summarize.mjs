// Prints and saves a digest of the town runs: trajectories by seed, second-half bands, costs.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, save } from './lib.mjs';

const dir = join(HERE, 'results');
const files = readdirSync(dir).filter((f) => f.startsWith('town-') && f.endsWith('.json'));
const digest = {};
for (const f of files) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const pick = (yr) => r.trajectory.find((t) => t.yr === yr);
  const rows = [0, 25, 50, 75, 100].map(pick).filter(Boolean).map((t) => ({
    yr: t.yr, host: t.hostShare, enc: t.enc, encCustoms: t.encCustoms, hostVariant: t.hostVariantShare,
    foreign0to4: t.foreignCustoms0to4, mixedNoMusic: t.mixedNoMusic, gst: t.gst, dissim: t.dissim,
    g1FoodByYearsIn: t.g1FoodBy5_10_20,
  }));
  digest[f] = {
    cost: {
      horizontalNsPerPersonYear: r.timing.horizontalNsPerPersonYear, yearlyNsPerPersonYear: r.timing.yearlyNsPerPersonYear,
      dayPassUs: r.timing.dayPassUs, verticalNsPerBirth: r.timing.verticalBench?.nsPerBirth, cpuBusy: [r.cpuBusyBefore, r.cpuBusyAfter],
    },
    secondHalf: r.secondHalf, rows, hash: r.stateHash,
  };
  const last = rows[rows.length - 1];
  console.log(`${f}\n  cost horiz ${r.timing.horizontalNsPerPersonYear.median} yearly ${r.timing.yearlyNsPerPersonYear.median} day ${r.timing.dayPassUs.median}us vertical ${r.timing.verticalBench?.nsPerBirth.median}`);
  for (const w of rows) console.log(`  yr${w.yr} host ${w.host} enc ${w.enc} encC ${w.encCustoms} foreign ${w.foreign0to4} gst ${w.gst} dis ${w.dissim} g1 ${w.g1FoodByYearsIn}`);
  console.log(`  2nd half ${JSON.stringify(r.secondHalf)}`);
  void last;
}
save('digest.json', digest);
