# M7.5 Happiness, wealth and WASM

Part of [M7 Country of ledgers](../milestone.md).

Needs M5's sweep logs, and M6.2's Rust and WASM SIMD build. The port here also covers the settlement-model half of M6.2's WASM task (R5).

- **Builds:**
  - the happiness block (employed and unemployed mean LS, income habit, base level, and 5 band counts cut at 4.0, 5.5, 7.0 and 8.5), rebuilt daily from the band table by largest remainder (R6);
  - the wealth block (net-worth totals for the bottom 50%, next 40%, top 10% and top 1%, counts with net worth ≤ 0 and owners, debt totals, the price index, σ and α), kept separate from the crime top-5% share (R6);
  - +150 LS per doubling of settlement median income over the national median, and out-migration raised by up to 10% per point of mean LS below the national mean (R6);
  - wealth group-transition hazards fitted from the M5 sweep logs, with spawn and fold reproducing group totals exactly in cents (R6);
  - aggregate band shifts from one keyed draw per settlement-day plus one hash round per rounding decision, or from deterministic remainders, never a full keyed draw per cell (R6);
  - the goods-and-wellbeing extension held to ≤ 0.7 µs RM per settlement-day at 1,000 settlements, and ported to WASM with the settlement model before the 10,000-settlement tier (R6).
- **Exit checks:**
  - total migration stays at 3.6–5.5% a year with the LS push on, and 10,000 settlements meet the 12 ms budget with every block in (R6).
