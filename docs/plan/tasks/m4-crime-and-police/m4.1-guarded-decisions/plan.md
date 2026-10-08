# M4.1 Guarded decisions: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **One shape for every guarded decision:** compute an integer threshold, then make one keyed draw against it. The draw's key never includes culture.

  ```
  threshold = f(place, time, acts, visible cues, ...)   // integer, ppm or 2^32 scale
  yes = draw(seed, stream, agent, tick) < threshold
  ```

  This covers offending, targeting, patrols, stops, arrests, sentencing, reporting, hiring, wages, productivity and spawn wealth rank. M2's hiring, wages, productivity and spawned wealth ranks are the first decisions refactored into it.
- **Every guarded decision registers itself.** A registry lists each decision with a pure function that returns its threshold, its utility where one exists, and its draw key for a given agent and tick. The flip test reads the same functions the systems call, so it cannot drift from them.
- **The flip test:**
  1. At sampled ticks, take the day-boundary snapshot.
  2. Shuffle the culture column with a keyed permutation.
  3. Re-derive everything `sim-culture` computes from the shuffled column.
  4. Hold behaviour fixed: positions, activities and carried goods.
  5. Recompute every registered decision's threshold, utility and draw key.

  All three must be identical before and after the shuffle. The test compares these values, never realised yes/no outcomes, because outcome-only checks missed planted leaks.
- **Planted leaks** live in a test-only module that swaps one registered function. They are never in shipped code paths:
  - an id read;
  - a custom read;
  - a draw keyed on culture;
  - a hiring penalty.

## Packages and files

- `packages/sim-core/src/guarded/registry.ts`: the decision registry, a fixed array built at world creation.
- Each guarded folder (`crime/`, `police/`, `labour/`, `wages/`, `wealth/`, `ability/`, `housing/` and `migration/`) exports its decisions' threshold functions and registers them. Spawn's wealth rank registers from `spawn/`.
- `packages/sim-core/test/flip.test.ts` and `test/fixtures/planted-leaks.ts`.
- `.github/workflows/ci.yml`: the flip test on every push, over one seed-year of sampled ticks.

## Interfaces and data

- **`GuardedDecision`:** `{ id, threshold(world, agent, tick): number, utility?(world, agent, tick): number, drawKey(world, agent, tick): number }`. All return integers and allocate nothing.
- **`flipTest(world, ticks: Int32Array, perm: Uint8Array)`:** returns the count of changed thresholds, utilities and draw keys, plus the first mismatch's decision id, agent and tick.
- **Sampling:** for one seed-year, 1 tick in every 60, so 2,688 ticks, each covering every agent outdoors or eligible. This is a starting value to set in the step plan against CI time.

## Method and sources

- **Thresholds, then one keyed draw; flip test design; why thresholds and not outcomes:**
  - the [R8 report](../../../../research/round-8-cultures/report.md), "Four test layers";
  - [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part d;
  - prototypes [`guard_demo.mjs`](../../../../research/round-8-cultures/prototypes/customs/guard_demo.mjs) and [`guard.mjs`](../../../../research/round-8-cultures/prototypes/transmission/guard.mjs). Clean code changed 0 of 3.69 million thresholds; three planted leaks changed 4,136, 67,044 and 35,417.
- **Causal discrimination testing:** Galhotra, Brun and Meliou (2017), cited in the same notes.

## Tests for the exit checks

- `flip test is clean`: over one seed-year of sampled ticks, zero thresholds, utilities and draw keys change.
- **`flip test catches planted leaks`**, each failing with a non-zero count and naming the decision:
  - id: a stop threshold ×1.25 when culture id = 1 at night;
  - custom: the same, keyed on "my culture's festival is tonight";
  - keyed draw: a draw key that includes culture;
  - hiring: a hiring threshold ×0.8 for one culture.
- `registry is complete`: every exported decision in a guarded folder is registered. A lint rule or a module scan finds no `draw*` call in a guarded folder outside a registered decision.

## Risks and unknowns

- **Refactoring M2's decisions** into threshold-then-draw form may change their random streams. Re-run M2.3's targets after the refactor.
- **CI time:** a full seed-year at 10k agents is 161,280 ticks. Sampling keeps the test to minutes; record the sampling rate beside the result.
- **Data leaks through shared columns** are invisible to lint and dependency-cruiser. This test is the layer that sees them, so it must cover every guarded decision.

## Open questions

- **Owner:** May reshaping M2's hiring, wages, productivity and spawn wealth rank change their draw streams and replay goldens? M2's replay goldens would change once, and M2.3's targets would need a re-run. Suggested: accept one golden reset, re-run M2.3's targets and record the reset in the commit. Needed before: building.
- **Measure:** How long does the seed-year flip test take on a CI runner at 1 tick in 60? A seed-year at 10k agents is 161,280 ticks, about 14 minutes of stepping at the 5.3 ms budget (computed). Suggested: M0.6's 1,024-agent relabel world on every push, moving the 10k seed-year to nightly if it takes over 10 minutes. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the registry and flip harness over M2's four decisions first, then the four planted leaks, then the CI job. Each later M4 decision registers as it is written.
- **Reuse:** M0.6's relabel harness for the keyed permutation and `stateHashExcept`, `sim-culture`'s re-derivation, and M0.1's keyed draw.
- **Keep it simple:** a test-time scan that lists every draw call in guarded folders is simpler than a new lint rule. Keep the shuffle generic over one column, since M5.5 reuses it for region, look and wealth decile.
- **Pitfalls:** a system that computes a threshold inline, instead of calling its registered function, passes the flip silently; only the draw scan catches it. Pass each id to the keyed draw as its own key: an ad-hoc mixer moved an R8 audit ratio from 1.047 to 0.950 (R8 report, measured there).
- **Hard and easy parts:** reshaping M2's decisions without changing what they decide needs the most care. The planted leaks and the counting are mechanical.
