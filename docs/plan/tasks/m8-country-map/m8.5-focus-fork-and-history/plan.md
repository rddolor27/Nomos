# M8.5 Focus, fork and history: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Focus state and breadcrumb (R4):**
  - the breadcrumb reads Country › Region › Settlement › District;
  - charts are re-keyed by focus, with shared colour scales across levels;
  - every ledger-driven panel is labelled "estimated", because ledgers are emulated, not counted.
- **"Open in City mode" (R4):**
  - starts a detached City-mode run, seeded from the settlement's ledger through M2.2's spawn;
  - labelled as a what-if, like M5.1's branches;
  - the country run continues, and the city run never writes back to the country.
- **Multi-resolution history (R4):**
  - weekly for the last year, and monthly before that;
  - quantised to `Uint16` with delta coding;
  - stored in M6.7's history section of the save.
- **The render filter applies at every zoom.** The recorded view never shows a true-only cue, including on the map.

## Packages and files

- `apps/web/src/focus/`: the breadcrumb, focus state and chart re-keying.
- `packages/sim-worker/src/open-city.ts`: a detached city run from a ledger. It reuses M5.1's branch machinery with a "detached" flag.
- `packages/sim-country/src/history.ts`: weekly and monthly buffers, `Uint16` quantisation and delta coding.
- `packages/render-gl/test/render-filter.test.ts`: extended to map views.

## Interfaces and data

- **Focus:** `{ level: 'country' | 'region' | 'settlement' | 'district', id }`. It is logged as an input at the day boundary when it writes canonical state (R4).
- **History series:** per metric, `{ scale, offset, weekly: Uint16Array(16) /* one 112-day year at 7 days */, monthly: Uint16Array }`, delta-coded before compression.
- **Detached city:** `{ seed, record: SettlementRecord, day, label: 'what-if' }`.

## Method and sources

- **Focus, the breadcrumb, "estimated" labels, detached cities and history:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 3 on the determinism decision and zoom-in, and part 5 on saves.
- **Save sizes for history:** the [R4 report](../../../../research/round-4-multi-scale/report.md). History alone came to about 1.9 MB on synthetic data.

## Tests for the exit checks

- `recorded view never shows a true cue`: M0.4's render-filter test, extended to the country, region and settlement views.
- `a fork's fold equals the source ledger`: "Open in City mode", then fold at the first tick, gives back the source ledger exactly, in people and cents.
- `ten years of history under about 3 MB`: a save with ten years of history stays under about 3 MB gzip.
- `estimated labels`: every panel fed by ledgers carries the label, checked by a component test.

## Risks and unknowns

- **History quantisation loses precision.** Store scale and offset per series per year, and check that charts redraw within one quantum of the full-resolution values.
- **Detached cities double memory** like M5.1's branches. Measure on the desktop tier.
