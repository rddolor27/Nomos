# M2.2 Spawn and fold

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - `spawnFromLedger(record, seed, time)` as the city's initializer, with exact role counts, a keyed shuffle, homes by capacity from round 9's binary map rather than LDtk, jobs by firm size, cash apportioned exactly with 12-bit lognormal weights, and prices drawn around the record's index; and `foldToLedger(state)`, returning exact sums by compartment and account (R4, R9);
  - spawning household by household, so members stay adjacent in agent index (R6).
- **Needs:** M2.1's hand-built start for comparison, M0.2's exact apportionment and keyed stochastic rounding, and M0.4's binary map.
- **Exit checks:**
  - spawn then fold returns the record exactly, in people and cents, for 1,000 random records, and the same (seed, record, time) gives a byte-identical city in Node, Bun and Deno (R4);
  - 100,000 agents spawn in ≤ 10 ms in Node, excluding map lookups, and a spawned city's MSER-5 burn-in is no longer than the hand-built start's (R4, R9).
