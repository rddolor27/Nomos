# M0.6 Gates and guards

Part of [M0 Pipeline](../milestone.md).

- **Builds:**
  - the compute and load CI gates (budget, allocation, the full hot-path lint, determinism, ledger and size, size-limit, startup), recording `/proc/loadavg` beside every timing, with the day-slice row (R5, R6);
  - `sim-culture` as its own package (preference rows, festival calendar, naming rules, region ids, and the culture splits of migration flows and spawned households), walled off from crime, police, labour, wage, wealth, ability, housing and migration code by a dependency-cruiser `reachable` rule and an ESLint profile (R8);
  - culture-level draws keyed by a stable culture uid, never its index; no guarded decision's draw keyed on culture, no loop order that matters set by culture, and no indexing by culture except custom tables; and the relabel test (R8);
  - the name lint with its real-world fixture, the text lints, the `Math` ban extended to generator and map code, and the lint on bare `/` and `%` in generator code (R2, R3, R4, R8, R9);
  - the kernel vectors in Bun, Chromium, Firefox and WebKit (R9).
- **Exit checks:**
  - the compute gates, size-limit and the startup benchmark run on every push to `main`, and the M0 pipeline passes all of them; the worst day slice stays within 0.35 ms RM at every tier, with the zero-scavenge window covering a full day of slices (R5, R6);
  - seed 42 gives identical replay hashes in Chromium, Firefox and WebKit (R1, R2);
  - the lint profile and dependency-cruiser catch planted direct, property, destructuring, bracket and transitive violations and pass the consumption package (a stand-in until M2.6 builds the real one), and the relabel test gives identical hashes for 3 seeds × 1 simulated year (R8);
  - the name lint rejects "pokemon" and "poké" (R3);
  - the kernel vectors match in Node, Bun, Chromium, Firefox and WebKit (R9).
