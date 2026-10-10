# M2.2 Spawn and fold

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - `spawnFromLedger(record, seed, time)` as the city's initializer, with exact role counts, a keyed shuffle, homes by capacity from round 9's binary map rather than LDtk, jobs by firm size, cash apportioned exactly with 12-bit lognormal weights, and prices drawn around the record's index; and `foldToLedger(state)`, returning exact sums by compartment and account (R4, R9). They are built as `spawnFromLedger(world, record, homes, params, settlement, day)` and `foldToLedger(world, out)`;
  - spawning household by household, so members stay adjacent in agent index (R6).
- **Needs:** M2.1's hand-built start for comparison, M0.2's exact apportionment and keyed stochastic rounding, and M0.4's binary map.
- **Exit checks:**
  - spawn then fold returns the record exactly, in people and cents, for 1,000 random records, and the same (seed, record, time) gives a byte-identical city in Node, Bun, Chromium, Firefox and WebKit, which replace Deno (R4; [Ruling 10](plan.md#rulings));
    - met by `spawn.test.ts`'s identity test (9a6002b), and by 20 spawn goldens (eecfce4) that Node 24.18.0, Chromium, Firefox and WebKit replay. Bun isn't installed here, so only CI's `bun` job runs it;
  - 100,000 agents spawn within the budget gate's 35 ms desktop row in Node, excluding map lookups, and a spawned city's MSER-5 burn-in is no longer than the hand-built start's, by the median over 40 paired seeds (R4, R9; [Rulings 11 and 12](plan.md#rulings));
    - speed, met: the fastest of 9 spawns took 31.2 ms (measured here: Node 24.18.0 on Windows, load not recorded). The shared doc's ≤ 10 ms needs the owner;
    - burn-in, met by `spawn-burn-in.test.ts` (9528a4a) under `ECONOMY_LONG=1`. Each seed counts the larger of its price and unemployment truncations, with −1 as 20,000. Seeds 1–40 gave a median of 5,240 days spawned against 6,395 hand-built, and seeds 41–80 gave 4,095 against 6,680 (measured here).
