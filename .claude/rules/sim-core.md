---
paths:
  - "packages/sim-core/**"
  - "packages/sim-worker/**"
  - "packages/sim-protocol/**"
---

# Simulation core rules

A run must replay bit for bit from its seed and inputs in every browser. These are correctness rules, not style.

## Determinism

- Take every random number from the keyed generator `draw(seed, entity, tick, stream)`, and hash the seed before mixing in the entity. Never use `Math.random` or sequential streams whose call order can change.
- Use only exactly specified arithmetic: `+ - * /`, `Math.sqrt`, `Math.floor`, `Math.imul` and bit operations. Never use `Math.sin`, `cos`, `exp`, `log`, `pow`, `hypot` or `atan2`, nor `**`. Build lookup tables at build time instead.
- Keep replay-relevant state integer or fixed-point:
  - positions in Q8 or Q16 in `Int32Array`, with power-of-two grid cells;
  - money as integer-valued `Float64Array` cents, which is exact below 2^53;
  - no `BigInt` in hot code (it is 115× slower in JavaScriptCore).
- Plan, then apply. Compute flows between entities from a read-only snapshot, then apply them as integer additions in a fixed order.
- Only the day boundary may write canonical state, including tier switches. Log those writes like player commands.
- Each system has one canonical float implementation. Never mix JS f64 and WASM f32 paths in one replay, and never use relaxed SIMD or FMA.
- Workers use fixed 1,024-agent chunks and reduce in chunk order. Results must be identical for 1–4 workers.

## Hot paths: zero allocation per tick

- Keep state as struct-of-arrays typed arrays in one `WebAssembly.Memory`. Reserve it at start for the device tier and never grow it, because `grow` detaches existing views.
- None of the following may appear inside per-tick functions:
  - object or array literals, closures, `new`, spread or template literals;
  - `for…of` or `for…in` loops, or array callbacks such as `map`, `filter` and `forEach`;
  - `slice` or `subarray`;
  - strings, `Date` or `performance.now`.

  The ESLint `no-restricted-syntax` profile enforces this list.
- Perception uses per-cell aggregates by default. Run exact radius queries only for agents that need them, staggered and capped at 16 neighbours.
- Schedule decisions on the timing wheel. Keep sleeping agents in dense index lists maintained by swap-remove.

## Invariants (asserted every tick in development)

- All accounts plus MINT sum to exactly zero.
- Population changes only by births, deaths and migration.
- Recorded crime never exceeds true crime.

Tick budgets are set in the Performance budget section of `docs/plan/implementation-plan.md`, for example 5.3 ms per tick at 10k agents on the reference machine.
