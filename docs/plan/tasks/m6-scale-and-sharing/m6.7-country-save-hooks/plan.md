# M6.7 Country save hooks: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **This runs after M7 closes,** because it saves M7's settlement and route ledgers. Round 4 placed it in M6 when country mode followed launch.
- **Country sections in the save format (R4):**
  - settlement and route ledgers;
  - regions and markets;
  - per-settlement edit diffs;
  - the notables cache;
  - multi-resolution history: daily for the recent past, weekly and yearly further back;
  - generator versions.

  Each section is a set of typed-array columns, gzipped with `CompressionStream` into OPFS, or into IndexedDB where OPFS is missing. Writes are atomic, as in M6.3.
- **The settlement culture block (R8):** stored as the top-3 cultures' sparse counts per settlement, with dense counts only where a settlement has more. It is budgeted at 50–118 KB gzip for 10,000 settlements, and measured before the format freezes.
- **Share links for country mode:** `mode=country`, the world seed, generator versions and the focus log, extending M6.3's link format.
- **M8 and M9 fill sections later:** history, notables and edit diffs. M6.7 defines the sections and their versions, with empty or minimal content where the data doesn't exist yet.

## Packages and files

- `packages/sim-protocol/src/save/country.ts`: the section registry, column layouts and versions.
- `apps/web/src/saves/country.ts`: write and read through OPFS or IndexedDB, with atomic swap.
- `packages/sim-culture/src/save-block.ts`: top-3 sparse encoding of settlement culture counts.
- `tools/bench/save-size.ts`: the save-size gate.

## Interfaces and data

- **Save container:** a header (magic word, version and section table), then one gzipped block per section.
- **Culture block per settlement:** `count` (`Uint8`, 1–3 entries, or dense), then `(cultureUid: Uint8, people: Uint32)` pairs.
- **Focus log:** a list of `(tick, settlement)` focus changes, logged as inputs at day boundaries (R4).

## Method and sources

- **Save sections, history resolutions and focus logs:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), parts 3 and 5, and the [R4 report](../../../../research/round-4-multi-scale/report.md).
- **Block sizes with goods, food, happiness and wealth:** the [R6 report](../../../../research/round-6-goods-and-wellbeing/report.md) and [R6 integration notes](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md).
- **The culture block's budget:** the [R8 summary](../../../../research/round-8-cultures/summary.md), "Budgets": +50–118 KB gzip at 10,000 settlements.

## Tests for the exit checks

- `country save under about 0.5 MB`: a save of 10,000 settlement ledgers with goods, food, happiness and wealth blocks stays under about 0.5 MB gzip. This replaces round 4's 0.3 MB.
- `share URL with a focus log restores the canonical hash`: open a country link with a focus log in Chromium, and the canonical state hash after replay matches the original's.
- `sections round-trip`: every section writes and reads back byte-identical.
- `culture block size`: measured at 10,000 settlements and reported before the format freezes.

## Risks and unknowns

- **Owner decision first:** whether the culture block must fit under the 0.5 MB save cap, or the cap rises to round 8's projected 0.55–0.62 MB.
- **History resolution decides most of the size.** Set it by measurement, not by guess.
- **OPFS support** varies by browser, so keep the IndexedDB path tested in WebKit.

## Open questions

- **Owner:** Must the culture block fit the 0.5 MB save cap, or does the cap rise to round 8's 0.55–0.62 MB? Round 8 measured +50 KB gzip (top-3 sparse) to +118 KB (dense, mixed counts) at 10,000 settlements, on different synthetic countries. Suggested: measure the whole save first, and raise the cap to 0.6 MB only if it overruns. Needed before: the step plan.
- **Measure:** How many bytes does each history resolution add at 10,000 settlements? History decides most of the save's size. Suggested: measure daily, weekly and yearly layers on M7's ledgers, then fix the recent window. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the container header and section table first, then the ledger sections with round-trip tests. The culture block and size gate follow, and the country link and focus log come last.
- **Reuse:** M6.3's save path and link format, M7's ledger columns, and M0.6's byte gate pattern for `save-size.ts`.
- **Keep it simple:** reserve section ids and versions for history, notables and edit diffs, and define their layouts when M8 and M9 fill them. If M6.3 settles on IndexedDB alone, reuse that one path rather than adding OPFS.
- **Pitfalls:** focus changes are tier switches, which only the day boundary may write, so log them by day and settlement (Calendar).
- **Hard and easy parts:** sizing the history needs the most care; the section registry is mechanical.
