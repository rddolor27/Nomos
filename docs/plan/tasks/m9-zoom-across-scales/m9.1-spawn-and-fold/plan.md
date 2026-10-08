# M9.1 Spawn and fold on zoom: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Camera focus becomes switch requests (R4):**
  - with hysteresis: enter below z(1 − f), leave above z(1 + f);
  - with a minimum dwell of one simulated day;
  - logged as inputs and applied at day boundaries, like player commands.
- **Spawn on focus, through M2.2's spawner,** keyed by (seed, settlement, entry tick, purpose).
  - Agents start indoors or at their scheduled places, so nothing pops in on screen.
  - Notables and the cached hotspot field load from the LRU. A first visit uses a per-map template scaled to the ledger.
- **Two ledgers (R4):**
  - the canonical ledger, which agents never touch;
  - an apportioned micro-ledger, which changes across the boundary only through mirrored flows;
  - a reconciliation band between households and firms.
- **Fold on leave:**
  - drop the micro-ledger;
  - cache in an LRU the notables (officers, owners, anyone with a record, anyone followed or named), the 2 KB hotspot field and the price list.
- **Exact blocks across the switch:**
  - **wealth (R6):** each notable's balance sheet (home id, shares and debts) stays in the cache, so a revisited owner still owns the same home and firm;
  - **food (R6):** pantry and shop lots fold into M7.4's ring and cohorts exactly in portions. Spawned lots use largest remainder, keyed expiry offsets inside wide slots, and a category mix drawn from demand shares;
  - **wellbeing (R6):** set points are drawn so spawned LS bands match the ledger, and fold returns exact band counts and summed LS;
  - **culture (R8):** customs spawn and fold exactly from M7.6's block, and notables keep their customs across visits.

## Packages and files

- `packages/sim-country/src/focus/`:
  - `switch.ts`: hysteresis, dwell and logged inputs;
  - `micro-ledger.ts`: mirrored flows and the reconciliation band;
  - `notables.ts`: the LRU, with balance sheets and customs.
- `packages/sim-core/src/spawn/`, extended for country records: food lots, LS set points, customs and notables.
- `packages/sim-worker`: switch handling at the day boundary, so the country and the focused city run together in one worker.

## Interfaces and data

- **Switch request:** `{ tick, settlement, enter: boolean }`, in the input log.
- **Notable entry:** `{ uid, role, home, shares, debts, customs, record, lastSeenDay }`.
- **Micro-ledger:** M0.2's account ranges for the settlement, apportioned at spawn. Mirrored flows are logged in pairs, one on each ledger.

## Method and sources

- **Zoom-in, zoom-out, two ledgers, mirrored flows, hysteresis and notables:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), parts 3.2–3.8.
- **Spawn and fold for goods, food, LS and wealth:** the [R6 report](../../../../research/round-6-goods-and-wellbeing/report.md) and [R6 integration notes](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md).
- **Culture spawn and fold:** M2.6 and M7.6, and the [R8 report](../../../../research/round-8-cultures/report.md).

## Tests for the exit checks

- `every switch is a spawn-fold identity`: over 1,000 random switches, fold after spawn returns the ledger exactly in people, cents, portions, LS band counts and culture counts.
- `both ledgers sum to zero every day`: with switches on.
- `micro equals canonical at every tick`: the micro-ledger total equals the canonical total.
- `notables persist`: a revisited owner owns the same home and firm, and a notable keeps their customs and record.

## Risks and unknowns

- **Two ledgers double the bookkeeping.** The reconciliation band's width is a design value; log every reconciliation.
- **LRU size** decides how many notables survive long absences. Set it per tier by memory, and log evictions.

## Open questions

- **Owner:** What happens when the focused settlement is above the device cap before M9.4's district window lands? `tools/worldgen` capitals hold 150,000–500,000 people (R9), above even the desktop cap of 100,000. Suggested: M9.1 spawns only settlements within the tier's cap, and larger ones stay on the map view until M9.4. Needed before: the step plan.
- **Measure:** What zoom threshold z and hysteresis factor f? R4 gives the rule but no values. Suggested: z at the Region-to-City step, and f between 0.1 and 0.2, both design values tuned with M9.2's oscillating-camera test. Needed before: building.
- **Measure:** How wide is the households–firms reconciliation band? Too narrow a band reconciles every day, and too wide a band lets the split drift. Suggested: a design value, logged per use and judged by how often it fires. Needed before: building.
- **Measure:** How many settlements does the notables cache keep? At R4's ~32 B per notable and 1–5% of people, a 10,000-person city costs about 5–18 KB with its 2 KB field (computed). Suggested: cap it by bytes within M8.5's ~3 MB save, not by city count. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the spawn-fold identity on a small village with no food, LS or culture blocks, then each block, the micro-ledger and hysteresis switching.
- **Reuse:** M2.2's spawner and fold, M7's blocks, M2.5's balance sheets, and M0.2's ledger and its BigInt-exempt module.
- **Keep it simple:** one spawn path serves zoom, M8.5's fork and M9.5's strips.
- **Pitfalls:** apportioning cents can pass 2^53 when holdings × weight is large, and R4 switches to BigInt there. Keep that at the day boundary in M0.2's exempt module. Spawn draws keep their own salt, so a zoom never shifts country draws (R4 architecture notes, part 3.7).
- **Hard and easy parts:** exact food lots and LS set points need the most care; the cache and the switch log are mechanical.
