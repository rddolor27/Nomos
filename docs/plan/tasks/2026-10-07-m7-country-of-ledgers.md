# M7 Country of ledgers: sub-milestones

M7 holds 29 build tasks and 14 exit checks in the [implementation plan](../implementation-plan.md#m7-country-of-ledgers), so it runs as seven sub-milestones. Each one ends with a headless country that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the later estimates can be rescaled to the measured pace. The plan's own M7 effort line, 19–28 days with 5–8 of them for the emulator, comes from round 4. The Calendar plan adds 0.5 days and the Military plan 1–2. Rounds 5, 6 and 8 add work nobody estimated, mostly round 6's goods and wellbeing blocks. With those, the sub-milestones below come to 37–59 days.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M7.1 Ledgers and national accounts | Integer settlement ledgers on a test country, with one treasury and one issuer | 7–11 days | | | |
| M7.2 Emulator | Ledger hazards fitted from the city model and docked against it | 5–8 days | | | |
| M7.3 Flows and villages | Trade, migration and commuting between settlements, village rules and the country CI suite | 8–11 days | | | |
| M7.4 Goods and food | Eight goods stepped weekly, dated food, harvest stores and trade priced by distance | 6–10 days | | | |
| M7.5 Happiness, wealth and WASM | Happiness and wealth blocks, and a WASM settlement model inside the 12 ms budget | 5–9 days | | | |
| M7.6 Cultures | Culture counts per settlement, kept exact through births, switching and migration | 4–6 days | | | |
| M7.7 Spin-up and patrols | A 50–100-year spin-up, skip-ahead, garrisons and road patrols | 2–4 days | | | |
| **Total** | | **37–59 days** | | | |

Three decisions apply throughout:
- **The ledger owns history.** Agents never write it (shadow-canonical), so one seed yields the same country wherever anyone looks.
- **A year is 112 days.** Annual rates, hazards and test horizons run per 112-day year, and daily hazards come from 1 − (1 − p)^(1/112) in build-time integer tables (Calendar).
- **Settlement counts are provisional.** Round 9's standard 96×64 world lists only 40–61 places, and M8 re-baselines M7's counts to listed places plus a region tier (R9). Until then, the 1,000- and 10,000-settlement budgets run on M7.1's terrain-free generator.

## M7.1 Ledgers and national accounts

Needs only M0, so it could start as soon as M0 lands.

- **Builds:**
  - the settlement store as typed arrays: people by state (employed, unemployed, merchants and owners, police, jailed), optionally in three age and three wealth bands, integer-cent accounts by sector, price and wage indices, inventory, vacancies, firm counts, and true and recorded crime over a 21-day window with arrests, a top-5% concentration share and the police mode (R4);
  - daily flows as integer stochastic draws: stochastic rounding below a mean of 8, otherwise a 4,096-entry inverse-normal table plus `sqrt`, with price revisions as the share of firms repricing (R4);
  - the national layer on Godley–Lavoie Model REG: one treasury, a central bank as the only issuer, a uniform national tax, services and police paid per settlement, Hamilton apportionment, an optional equalisation grant, and local police with an optional national force (R4);
  - a terrain-free generator for tests: Zipf sizes, hexagonal or Poisson-disc spacing by level, Gibrat growth with a reflecting floor, and a Delaunay → spanning tree → spanner route graph (R4).
- **Owner decision first:** whether people by state carry the optional three age and three wealth bands; M7.3's rural youth migration hazard and the Calendar's age-based hazards would read an age split.
- **Exit checks:**
  - integer-cent model SIM reaches exactly Y = 10,000 = G/θ (R4).

## M7.2 Emulator

Needs the daily flow logs from M2's design runner, M4's crime logs and M5's city-size sweeps. Round 4 names the emulator the largest risk and says to build its docking test first.

- **Builds:**
  - the emulator, fitted from the M2, M4 and M5 logs, with each hazard a binned lookup table or a fixed-point GLM, and ledger trajectories docked against agent fold-ups on held-out runs (R4).
- **Verify first:** the size of the alignment nudges with the real emulator decides whether shadow-canonical stays the default or pinned live cities are needed; the docking test gives a first reading here, and M9's divergence meter the final one.
- **Exit checks:**
  - for each logged flow, the ledger's mean, variance and lag-1 autocorrelation fall inside the 5–95% seed band of agent fold-ups on held-out runs (R4).

## M7.3 Flows and villages

- **Builds:**
  - flows between settlements, planned then applied: margin-driven trade per good with losses and stock in transit, monthly migration by expected wage over a gravity or radiation kernel, commuting as cross-settlement wages within about 50–100 km, and movers carrying their cents (R4);
  - flows kept on sparse CSR graphs with at most 24 neighbours per settlement, settlements updated round-robin across a day's ticks, and dense matrices only between regions (R5);
  - village rules: own production outside the cent ledger, a market every 2–10 days by density, seasonal harvests into stores, a rural youth migration hazard, and the region tier for unlisted hamlets (R4);
  - the country CI suite: daily identities, the integer-cent SIM known answer, the five scaling tests, Zipf and spacing, the trade band and gravity, migration and commuting decay, crime ratios, police staffing and response times (R4).
- **Verify first:** FBI tables 16 and 70–74, BJS reporting by location, and Bettencourt 2007 with intervals, which set country mode's crime, police and scaling bands.
- **Exit checks:**
  - 10,000 settlements advance one simulated day within the 12 ms country budget on the reference machine and 1,000 within 1.5 ms, and every identity holds exactly every day over 20 seeds × 50 simulated years (R4);
  - on at least 30 settlements spanning three orders of magnitude, the GDP-like exponent's interval overlaps 1.08–1.15 and rejects 1, while homicide-like and household exponents do not reject 1 (R4);
  - Zipf's ζ stays within 0.9–1.2 for 50 years, trade distance elasticity is −0.9 ± 0.2, commuting decays at about −2, and migration between settlements runs at 3.6–5.5% a year (R4);
  - urban-to-rural property victimisation is 3.4 ± 30%, officers per 1,000 peak in towns under 10,000, and an export shock to one region is partly offset by its net fiscal inflow within the year (R4).

## M7.4 Goods and food

Needs M2's eight sectors and recipes, and M2's re-read of round 6's carrying cost and pest loss on the 112-day year.

- **Builds:**
  - the store extended with eight Int32 goods stocks and prices, a standing crop, Q16 fertility and weather, fish, forest and ore stocks as integer-valued Float64, and workers by sector, about 30 numbers in 130 B (R6);
  - the 12-number food block (a 6-slot perishable ring by days left {1, 2, 3, 4–6, 7–10, 11+}, two dated staple cohorts, eaten and spoiled), aged daily, with a second ring for weekly-market villages (R6); stored harvests kept as dated cohorts, never a single daily loss rate, which lost 19–29% of a year's harvest in testing against 0% for dated cohorts (R6);
  - goods stepped weekly, round-robin over seven days: extraction with logistic regrowth (Q24 rates, depensation below K/4), recipes, consumption, decay, then band prices clamped to 25–175% of base (R6);
  - storable seasonal goods stocked to demand × days to the next harvest, plus a carrying-cost drift of 1.5–3% a month (R6);
  - weekly market-day trade in grain, timber, metal and wares by margin per good (sea 1 : river 5–10 : road 23–52), with fresh food sent only under a day's travel and stone only to neighbours (R6);
  - settlement prices bounded by import and export parity plus transport cost, arbitrage flows when local prices leave the band, and market saturation as decaying demand memory, adapted from Norland's caravan ceiling (R6);
  - pre-retail food loss by group (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%), scaled by a cold-chain factor of 0.75–1.73 (R6).
- **Exit checks:**
  - the goods identity holds exactly per good every day, with spoilage as its own term, and harvest stores lose only pest loss (≤ 7% a season) (R6);
  - the fishery catch at u = r/2 lands within 0.1% of rK/4, and the ledger ring's waste stays within 1 point of an exact per-day ring on presets (R6);
  - seasonal price gaps run 17–33% in isolated villages and 2.5–3 times lower in integrated markets, and grain's price doubles at about 290 km by road (R6).

## M7.5 Happiness, wealth and WASM

Needs M5's sweep logs, and M6.2's Rust and WASM SIMD build. The port here also covers the settlement-model half of M6.2's WASM task (R5).

- **Builds:**
  - the happiness block (employed and unemployed mean LS, income habit, base level, and 5 band counts cut at 4.0, 5.5, 7.0 and 8.5), rebuilt daily from the band table by largest remainder (R6);
  - the wealth block (net-worth totals for the bottom 50%, next 40%, top 10% and top 1%, counts with net worth ≤ 0 and owners, debt totals, the price index, σ and α), kept separate from the crime top-5% share (R6);
  - +150 LS per doubling of settlement median income over the national median, and out-migration raised by up to 10% per point of mean LS below the national mean (R6);
  - wealth group-transition hazards fitted from the M5 sweep logs, with spawn and fold reproducing group totals exactly in cents (R6);
  - aggregate band shifts from one keyed draw per settlement-day plus one hash round per rounding decision, or from deterministic remainders, never a full keyed draw per cell (R6);
  - the goods-and-wellbeing extension held to ≤ 0.7 µs RM per settlement-day at 1,000 settlements, and ported to WASM with the settlement model before the 10,000-settlement tier (R6).
- **Exit checks:**
  - total migration stays at 3.6–5.5% a year with the LS push on, and 10,000 settlements meet the 12 ms budget with every block in (R6).

## M7.6 Cultures

Needs M2's culture β shifts and the M3–M5 agent runs.

- **Builds:**
  - the settlement culture block: counts by primary culture plus mixed counts (2K Int32, 64 B at 8 cultures) and a region id, stepped yearly on each settlement's stride day: births by homogamy and conformist learning, then mixing and switching hazards (R8);
  - every migration flow split by culture exactly, outflow by culture first and then by destination, with about 20% long-distance movers weighted by pop^1.5, spread over the month with sparse loops, while migration itself never reads culture (R8);
  - settlement demand shifts derived as Σ share × Δβ, recomputed only when counts change (R8);
  - culture hazards fitted from M3–M5 agent runs and docked on held-out runs, as M7.2 does for other flows (R8).
- **Exit checks:**
  - people by culture sum exactly to population every day, spawn and fold are exact per culture, and minority move rates stay within 5% of their population share over 30 years (R8);
  - over 100 years, regional G\_ST stays at 0.3 or more with acculturation, at least 90% of settlements keep their dominant culture, and the capital's effective number of cultures exceeds the village median (R8);
  - culture is independent of settlement wealth bands within the audit's bands (R8).

## M7.7 Spin-up and patrols

Needs M5's defence budget. No plan task builds the route ledgers (traffic, bandit pressure, patrols, true and recorded incidents) that patrols need and M8 draws. They land here, adding about a day.

- **Builds:**
  - the 50–100-year spin-up (5,600–11,200 days) and country skip-ahead in 112-day years (Calendar);
  - garrison posts on settlement ledgers, and a patrol intensity on each route ledger from nearby garrisons and the defence budget: raids fall as patrols rise, true and recorded raids stay apart, and records follow reports and sightings (Military).
- **Owner decision first:** with no neighbouring country, what counts as a border for garrison towns: the map edge, mountain passes or region lines (Military).
- **Exit checks:**
  - on paired seeds, more patrols cut true raids, and recorded raids rise or fall with sightings (Military).
