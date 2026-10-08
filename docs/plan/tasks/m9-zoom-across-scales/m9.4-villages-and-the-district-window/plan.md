# M9.4 Villages and the district window: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The district window (R4).** When a focused settlement has more people than the device tier's agent cap:
  - agents run only in the districts in view;
  - other districts run at the district tier, with a 16×16 crime lattice from M4's model in mean-field form;
  - districts switch with the same spawn-fold identity, hysteresis and dwell as M9.1, one level down;
  - the crime field crosses the boundary through M4.3's export and import.
- **Village agent rules (R4):**
  - one general shop;
  - own-farm work as the default for the unemployed;
  - kin credit that nets to zero within the village;
  - a market day with itinerant merchants, on M7.3's market schedule.

  Villages use less money per head than cities at equal real consumption, because own production stays outside the cent ledger.

## Packages and files

- `packages/sim-country/src/focus/district-window.ts`: which districts run agents, and switching.
- `packages/sim-core/src/crime/lattice.ts`: the 16×16 district-tier lattice.
- `packages/sim-core/src/villages/`: `shop.ts`, `own-farm.ts`, `kin-credit.ts` and `market-day.ts`.
- A village preset in `packages/sim-core/src/economy/presets/village.ts`, beside M2.3's presets.

## Interfaces and data

- **District tier state per district:** people by state, accounts, and the 16×16 lattice in Q16, the same shape as a settlement record at a smaller scale.
- **Kin credit:** claims-ledger records between households in one kin group. The group's net is asserted zero every day.

## Method and sources

- **The district tier, the lattice and crime fields across levels:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), parts 3.1 and 4.
- **Village economies:** [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 6: agriculture and self-provisioning, informal credit and kinship, and market days.

## Tests for the exit checks

- `villages use less money`: on a village preset, money stock and transactions per head are well below the city's at equal real consumption. The step plan sets "well below" as a number from round 4's village notes.
- `kin credit nets to zero`: every kin group's claims net to zero every day.
- `district window is an identity`: switching a district between agents and the district tier folds back exactly, as in M9.1.

## Risks and unknowns

- **"Well below" needs a number.** Take it from round 4's village notes, or propose one and mark it for owner sign-off.
- **The lattice crime model** must stay consistent with agent-level crime at the boundary. Check the exported and imported fields' top-5% share, as M4.3 does.

## Open questions

- **Owner:** What number makes "well below" testable? R4 gives none, though its snippet-only sources put own production at 20–43% of rural food value. Suggested: village money stock and transactions per head at most 80% of the city's, as a design value. Needed before: the step plan.
- **Owner:** Does M8.5's "Open in City mode" then use the district window for places above the cap? It would lift M8.5's limit on capitals. Suggested: yes, through the same window code. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** village rules on the village preset first, since they need no window, then the district tier, then switching the districts in view.
- **Reuse:** M7.1's store layout for district rows, M7.2's hazards if M2.3 logs per district (as R4 planned), M9.1's switch tests and M4.3's export and import.
- **Keep it simple:** step district rows with M7's country day step and hazards, rather than a second aggregate model.
- **Pitfalls:** agents walking into a folded district cross as boundary flows at entry tiles, as in M9.2. Own production never creates cents (R4). Kin credit lives in the claims ledger and nets to zero each day.
- **Hard and easy parts:** agents crossing between live and folded districts need the most care; the general shop and the market day are mechanical.
