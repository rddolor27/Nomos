// "Try large, back off": reserve one shared WebAssembly.Memory for the highest tier that fits.
// Emulate engines with lower caps:  node --wasm-max-mem-pages=16384 reserve.mjs   (1 GiB cap)
import { MiB, PAGE, machine, procMem, mib, save } from './lib.mjs';

const BYTES_PER_AGENT = 256 + 24 + 32;
const FIXED = 48 * MiB;
const TIERS = [
  { name: '1M', agents: 1_000_000 },
  { name: '250k', agents: 250_000 },
  { name: '100k', agents: 100_000 },
  { name: '25k', agents: 25_000 },
  { name: '10k', agents: 10_000 },
];

const pagesFor = (agents) => Math.ceil((agents * BYTES_PER_AGENT * 1.25 + FIXED) / PAGE);

export function reserve(tiers = TIERS, maxTier = 0) {
  const attempts = [];
  for (let i = maxTier; i < tiers.length; i++) {
    const pages = pagesFor(tiers[i].agents);
    const t = performance.now();
    try {
      const mem = new WebAssembly.Memory({ initial: pages, maximum: pages, shared: true });
      attempts.push({ tier: tiers[i].name, mib: (pages * PAGE) / MiB, ok: true, ms: +(performance.now() - t).toFixed(3) });
      return { tier: tiers[i], mem, attempts };
    } catch (e) {
      attempts.push({ tier: tiers[i].name, mib: (pages * PAGE) / MiB, ok: false, ms: +(performance.now() - t).toFixed(3), error: `${e.name}: ${e.message}` });
    }
  }
  return { tier: null, mem: null, attempts };
}

const before = procMem();
const r = reserve();
const after = procMem();
const out = {
  machine: machine(), execArgv: process.execArgv, bytesPerAgent: BYTES_PER_AGENT, fixedMiB: FIXED / MiB,
  tiers: TIERS.map((t) => ({ ...t, reservationMiB: (pagesFor(t.agents) * PAGE) / MiB })),
  chosen: r.tier && r.tier.name, attempts: r.attempts,
  commitDeltaMiB: mib(after.commit - before.commit), workingSetDeltaMiB: mib(after.workingSet - before.workingSet),
};
console.log(JSON.stringify(out, null, 1));
const flag = process.execArgv.find((a) => a.startsWith('--wasm-max-mem-pages'));
save(`reserve-${flag ? flag.split('=')[1] : 'default'}.json`, out);
