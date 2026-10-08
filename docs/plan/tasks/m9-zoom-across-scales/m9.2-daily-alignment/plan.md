# M9.2 Daily alignment: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Daily alignment (R4).** While a settlement is focused, its agents' interior totals are aligned each day to the canonical ledger's emulated flows.
  - Alignment selects agents by sorting on keyed scores. A partial selection is faster than a full sort.
  - Each day's shortfall carries to the next.
  - Boundary flows execute exactly: arrivals are released and departures removed at entry tiles.
- **The divergence meter (R4):**
  - daily z-scores per flow, comparing the agents' fold-up with the ledger's shadow;
  - shown in the developer panel;
  - logged for M7.2's emulator refits.

## Packages and files

- `packages/sim-country/src/focus/align.ts`: selection, shortfall carry and boundary flows.
- `packages/sim-country/src/focus/divergence.ts`: per-flow daily z-scores.
- `apps/web/src/dev/divergence.ts`: the panel.
- `tools/emulator/`: reads the divergence logs for refits.

## Interfaces and data

- **Alignment target:** per flow per day, the ledger's expected count. The selection picks that many agents by keyed score, and the shortfall goes to tomorrow's target.
- **Divergence record:** `{ day, flow, agents, ledger, z }`, in M2.3's columnar log format.

## Method and sources

- **Alignment by sorting, shortfall carry and the divergence meter:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 3.4, "While focused", and the divergence meter.
- **Alignment in microsimulation (LIAM2):** the same notes, part 6, as the closest precedent.

## Tests for the exit checks

- `divergence within bounds`: on presets, daily |z| < 2 on at least 95% of flow-days.
- `no switch storms`: a camera oscillating across the threshold causes at most one switch per dwell period.
- `alignment is deterministic`: the same seed and focus log give the same selections in Node and Chromium.
- `boundary flows exact`: arrivals and departures at entry tiles equal the ledger's migration and commuting flows for the day.

## Risks and unknowns

- **Owner decision first:** the proposed bar of |z| < 2 on at least 95% of flow-days.
- **Large nudges are a warning.** If alignment moves many agents daily, the emulator disagrees with the agents. That is M9.6's verify-first question, and the meter's log is the evidence.

## Open questions

- **Owner:** Is the bar of |z| < 2 on at least 95% of flow-days accepted, and over how many flow-days? If z is independent and standard normal, a perfect emulator fails 22% of runs over 1,000 flow-days and 1.6% over 10,000 (computed). Suggested: accept it, judged over at least 10,000 flow-days. Needed before: the step plan.
- **Owner:** Does z compare the ledger with the agents' own counts before alignment, or with the aligned counts? Aligned counts match their targets by construction, apart from the carried shortfall, so only pre-alignment counts measure the nudges M9.6 needs (inference). Suggested: log both, and judge the bar on pre-alignment counts. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the divergence log on one flow first, then alignment for the interior flows, then boundary flows at entry tiles, then the panel.
- **Reuse:** M9.1's switch and micro-ledger, M2.3's columnar log, M7.2's fitter, and the keyed draw for selection scores.
- **Keep it simple:** align every interior flow by sorting, and skip R4's alternative of a steered propensity multiplier.
- **Pitfalls:** z from small daily counts misleads, so use the ledger's own variance; pooling village flows weekly would need the owner's leave, since the bar is daily. Score ties break by agent index, so Node and Chromium select alike. Selection uses a preallocated heap, as M0.2's apportionment does, since the sim lint bans `sort`, and nothing allocates per tick.
- **Hard and easy parts:** boundary flows at entry tiles need the most care; the z log and the panel are mechanical.
