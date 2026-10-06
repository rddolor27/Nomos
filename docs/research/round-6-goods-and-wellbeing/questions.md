# Round 6 · Goods and wellbeing: questions and status

The owner asked to add resources, a happiness factor, food with qualities that expires, and wealth, a little closer to real life, and to study Norland's mechanics as prior art. The round follows `/research-round`: one researcher per question writes notes, then a report, a fact-check, a summary and plan tasks tagged (R6).

| # | Question | Notes | Status |
|---|---|---|---|
| 1 | Which raw resources and production chains should Nomos model, and how? | `notes/resources-production.md` | Done |
| 2 | How should food quality and expiry work? | `notes/food-quality-spoilage.md` | Done |
| 3 | What drives happiness, and what does happiness drive? | `notes/happiness-wellbeing.md` | Done |
| 4 | How should wealth work beyond the cash wallet? | `notes/wealth-assets.md` | Done |
| 5 | Do goods, food lots, happiness and wealth fit the tick, memory and ledger budgets? | `notes/integration-cost.md` | Done |
| 6 | What do Norland's mechanics teach, and what should Nomos borrow, adapt or avoid? | `notes/norland-prior-art.md` | Done |

## Still to do

1. ~~Write `report.md` from the notes~~ Done.
2. ~~Fact-check the report against the notes~~ Done. The fact-checker re-ran the prototypes and fixed 26 lines. It also found errors in the notes themselves, which the report works around: food's "26 points" (28 per its table) and a missing 100%-supply row; resources' missing run-2 rows, "14.5–18.3%" housing (12.9–18.3% per ICP), "17–20 ms" (17–21) and Q24 errors that assume a 360-day year; happiness's "63–75 ns" (63–73); and Norland's "10% from April 2026" against Patches 50–53, dated 11 May 2026.
3. ~~Write `summary.md` and add the round to `docs/README.md`~~ Done: the summary is the shared doc's new "Goods & wellbeing" tab, exported.
4. ~~Add plan tasks and exit checks tagged (R6)~~ Done with the owner's approval: 97 tasks went into the shared doc's Implementation plan tab and were exported to `docs/plan/implementation-plan.md`.

The round is complete. The open owner decisions (ticks per day, days per year, late spoilage under sliced day work, age structure, time compression) are listed in `summary.md`.

## Hand-offs already found

- From question 2 to question 5: the cost prototype's 96-number settlement food stock exceeds the 30–80-number ledger budget; its 0.1% daily grain loss compounds to 30.8% a year, about ten times real storage loss; and it applies daily produce loss on top of hard expiry, which double-counts.
- From question 1: eight goods (grain, fresh food, timber, stone, metal, fuel, wares, services), with housing a stock built from timber and stone. Daily goods and trade at 10k settlements cost about 17–21 ms a day against a 12 ms budget, so goods and trade run weekly, and the 0.3 MB save target needs to rise to about 0.5 MB. Hand-offs: decay per good to question 2, unmet demand per good to question 3, dwellings and ownership of land, forests and mines to question 4, and country-tier costs to question 5.
- From question 3: happiness follows a per-agent target (set point plus drivers: log income relative to neighbours, unemployment, crime victimisation and fear, social support, inflation) with a 7-day lag, and only one-off events fade. It drives job search (up to ×2), a small migration push in country mode and a display-only approval figure, never crime, and it shows only in a settlement meter, an opt-in lens and the inspector, never on bodies. Hand-offs: the food-insecurity penalty to question 2 (no sourced ladder effect yet), income and wealth inputs to question 4, and a target-plus-fading-events `happinessDay` to question 5.
- From question 5: the agent side fits if needs are stored as the tick they hit zero with meals on a timing wheel (1.7% of the 100k sub-budget) and day-boundary work runs in 1,024-entity chunks across ticks (worst tick about 0.27 ms on the reference machine at 100k). Memory is 89–101 B per agent, about 157 B with round 5's fields. The settlement-ledger extension fits only as one stock per category at 1k settlements and needs the WASM port at 10k. Open decisions: ticks per day, and whether spoilage may apply up to 138 ticks late when day work is chunked. `TypedArray.sort` on shared memory allocates; use a histogram for top shares.
- From question 6: Norland (all 207 official Steam posts read) builds mood from short-lived thoughts, eats food best-first with quality acting only through mood, added spoilage late as a storage cap, and imports crime once its desperation driver faded. It never shows the gap between crime seen and crime recorded, which is Nomos's lesson. Borrow integer thought slots, day-boundary spoilage, hunger-driven food theft, a "case unresolved" thought for victims and wealth thoughts relative to prices. Avoid class clothing, marked criminals, punishment as spectacle, xenophobia mechanics and an event director that breaks paired-seed comparisons. At 100–200 agents a city, its per-agent depth does not scale to Nomos.
- From question 4: wealth cannot emerge during play, so a run starts from a calibrated distribution and the mechanics maintain it. Targets: wealth Gini 0.83 in the US (2022) and 0.685 in the euro area (2023), about 2.1× the income Gini across 21 countries. The top tail needs persistent, heterogeneous returns re-drawn within a life; unsecured credit needs a bankruptcy discharge; houses are a fixed stock with a market price. Corrections: round 2's Danish wealth-tax elasticities (8.9, 11.3) are not in the paper, which gives about 0.5; the plan's top-5% share measures crime, so wealth needs its own; and the M1 wallet bars conflict with the "wealth never shows" rule outside lab cards. Hand-offs: food grade from spending per adult, not wealth band; no wealth driver for happiness by default; home values from a house registry.
