# M9.1 Spawn and fold

Part of [M9 Zoom across scales](../milestone.md).

- **Builds:**
  - camera focus turned into switch requests with hysteresis (enter below z(1 − f), leave above z(1 + f)) and a minimum dwell of one simulated day, logged as inputs (R4);
  - spawn on focus with M2's spawner, keyed by (seed, settlement, entry tick, purpose): agents start indoors or at their scheduled places, with notables and the cached field loaded, or a per-map template scaled to the ledger (R4);
  - two ledgers: the canonical one, which agents never touch, and an apportioned micro-ledger that changes across the boundary only through mirrored flows, with a reconciliation band between households and firms (R4);
  - fold on leave: drop the micro-ledger, and cache in an LRU the notables (officers, owners, anyone with a record, anyone followed or named), the 2 KB hotspot field and the price list (R4);
  - each notable's balance sheet (home ID, shares, debts) in the notables cache, so a revisited owner still owns the same home and firm (R6);
  - pantry and shop lots folded into the ring and cohorts exactly in portions; lots spawned by largest remainder, with keyed expiry offsets inside wide slots and the category mix drawn from demand shares (R6);
  - spawn drawing set points so spawned life-satisfaction bands match the ledger, and fold returning exact band counts and summed life satisfaction (R6);
  - customs spawned and folded exactly from the culture block, with notables keeping their customs across visits (R8).
- **Needs:** M2.2's spawner and fold; M7's settlement ledgers and blocks, including M7.6's culture block; M2.5's balance sheets.
- **Exit checks:**
  - every switch is a spawn-fold identity, both ledgers sum to zero every day, and the micro-ledger total equals the canonical total at every tick (R4).
