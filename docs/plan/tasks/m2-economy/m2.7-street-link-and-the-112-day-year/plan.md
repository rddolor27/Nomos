# M2.7 Street link and the 112-day year: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **One glyph per economy event, everywhere.** Each event kind maps to exactly one glyph. Bubble, log line, chart marker and legend all use it:
  - wages: a coin with "+";
  - a purchase: the coin;
  - bankruptcy: an empty purse, and a closing shutter on the stall;
  - stock: pips on stalls.

  The coin, its bubble and a closed market stall exist. Draw the wage coin, the purse and the stock pips in `tools/sprites` under the art rules, then wire them in ([R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md)).
- **One table drives every surface.** An `ECONOMY_GLYPHS` table maps event kind to frame name. The bubble pass (M1.3), the event log, uPlot markers and the chart legend all read it, so a mismatch cannot be written.
- **Price-chart ticks come from the same event stream** as purchase bubbles. A tick and its bubble share an event id and a sim tick, so they coincide in a replay.
- **Follow the money (R1, R3):**
  - an overlay animates coins along the path between counterparties for the selected agent's transfers;
  - it reads ledger transfer events and never the sim's state directly;
  - the inspector that hosts it is M3's task, so M2.7 ships the overlay and a minimal developer panel, and M3 mounts it in the inspector;
  - it shows amounts only in the follow view, never as marks on bodies, clothes or houses.
- **Recalibrate to the 112-day year (Calendar):**
  - daily wage = annual income ÷ 80 workdays (5 a week × 4 weeks × 4 seasons);
  - item prices keep food, housing and the rest at their calibrated shares of income;
  - interest, debt limits and loan terms are stated per in-game year;
  - every annual rate converts to a daily one through exact build-time tables, never by dividing by 112 for rates that aren't small.

## Packages and files

- `tools/sprites/icons.py`: the wage coin, the purse and the stock pips, added to the icons sheet and manifest. Rows go in `assets/LICENSES.md`.
- `packages/sim-protocol/src/events.ts`: the economy event kinds, and `ECONOMY_GLYPHS`.
- `packages/render-gl/src/follow-money.ts`: the coin-path overlay.
- `apps/web`: event-log lines, chart markers and the legend, all from `ECONOMY_GLYPHS`; and the developer panel.
- `packages/sim-core/scripts/rates.ts`: the annual-to-daily conversion tables for interest and hazards, built at build time.
- The presets from M2.3 and M2.5, re-tuned on the 112-day year.

## Interfaces and data

- **Event record:** `{ id, tick, kind, from, to, cents }`, in M1.3's pooled event buffer. `kind` comes from a closed enum.
- **`ECONOMY_GLYPHS`:** `Record<EconomyEventKind, FrameName>`. A test enumerates the enum to prove the table is total and one-to-one.
- **Rate tables:** for each annual rate in ppm, the daily rate in ppm, as integer tables. They come from p\_day = 1 − (1 − p)^(1/112), computed in the build script.

## Method and sources

- **Glyph vocabulary, bubbles and legends:** [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md), and the [R3 summary](../../../../research/round-3-2d-look/summary.md).
- **Follow-the-money tracing as a fix for illegible dynamics:** [R1 findings](../../../../research/round-1-baseline/findings-and-plan.md), the risk table.
- **Rescaling rules, the daily wage and exact hazard conversion:** [calendar.md](../../../calendar.md), "Rescaling rules".
- **Calibrated bands:** M2.3's targets and M2.5's wealth presets.

## Tests for the exit checks

- `one glyph per event`:
  - every `EconomyEventKind` has exactly one glyph, and no glyph serves two kinds;
  - over a replayed run, bubble, log line, chart marker and legend entry show the same frame name for each event id.
- `price ticks coincide with purchase bubbles`: replay seed 42 for 3 days. Every price-chart tick has a purchase bubble with the same event id and tick, and vice versa, apart from bubbles the bubble cap sent to the ticker, which still carry the id.
- `shares and Gini hold on the 112-day year`:
  - over 50 paired seeds, food and saving shares and the wealth Gini stay within their calibrated bands;
  - the housing share joins this check when M3's rents and mortgages exist.
- `daily wage`: annual income ÷ 80 workdays, in integer cents, with leftover cents apportioned exactly across the year.

## Risks and unknowns

- **Verify first:** round 6's calibrated targets on the 112-day year, including the 1.5–3% monthly carrying cost and the ≤ 7% pest loss a season. They decide daily wages, prices and storage rates; the storage rates apply only in M3 and M7.
- **The inspector arrives in M3.** Until then, follow-the-money lives in a developer panel; keep its API small so M3 only mounts it.
- **The bubble cap hides some purchase bubbles.** The coincidence check therefore matches on event ids, which survive in the ticker, not on visible bubbles.
