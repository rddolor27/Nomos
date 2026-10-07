# M0.1 Workspace and kernels

Part of [M0 Pipeline](../milestone.md).

Plan: [plan.md](plan.md).

- **Builds:**
  - the pnpm workspace with `@nomos/sim-core` (R1);
  - CI on every push to `main`;
  - the lint ban on transcendental `Math`, `**` and `BigInt` in `sim-core` (R2, R5);
  - the keyed draw, with a murmur3-style finaliser after every input and fixed-arity hot-path variants (R2, R4, R8, R9);
  - integer value noise (R9);
  - the calendar with its day-length table (Calendar).
- **Verify first:** draw independence across neighbouring seeds once the seed is hashed first, which decides whether two worlds are truly different. The prototype's seed ^ entity shuffled draws between seeds that differ in low bits.
- **Exit checks:**
  - the same (seed, entity, tick, stream) gives the same draw in any visiting order, and a 16-bucket χ² test over a million entities passes, also across stream pairs (R4, R8);
  - draw, below, fade, value and fbm match the Python vectors in Node; the other engines follow in M0.6 (R9);
  - every date round-trips through its tick count, a season is 28 days and 4 weeks, a year is 112 days, and every season starts on a workday (Calendar);
  - the lint profile rejects planted transcendental, `**` and `BigInt` code in `sim-core` (R2, R5).
