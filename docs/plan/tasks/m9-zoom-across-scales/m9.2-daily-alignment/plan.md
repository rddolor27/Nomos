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
