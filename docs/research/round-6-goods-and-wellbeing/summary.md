# Goods and wellbeing

Oct 5, 2026 · @Rd

Nomos can model resources, food that spoils, happiness and wealth close to real life and still fit its budgets. It needs eight goods, dated food lots, a happiness target per person and a calibrated wealth start, plus two engineering rules: needs on the timing wheel and day work in slices. Round 6 answered six questions, including what the game Norland teaches; the resulting tasks are in Implementation plan, tagged (R6).

## Resources: eight goods and four natural stocks

Model grain, fresh food, timber, stone, metal, fuel, wares and services, with dwellings built from timber and stone. Household budgets justify the set: food falls from 45.3% of consumption in low-income countries to 8.7% in high-income ones, about 7.8 points per doubling of income ([ICP 2021](https://api.worldbank.org/v2/sources/90/country/LIB;LMB;UMB;HIB;USA/series/1101000/classification/AICZS/time/YR2021/data?format=json)). Farming employs 60.7% of workers at low income and 3.1% at high income ([World Bank](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/SL.AGR.EMPL.ZS?format=json)), so development presets move labour by productivity.

| Stock | Rule | Real anchor |
| --- | --- | --- |
| Grain fields | One 30–45-day harvest a year; weather SD 13–22% | [Ray et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4354156/) |
| Soil fertility | A floor at 0.35–0.45 of manured yield, never zero | Broadbalk unmanured wheat, 170 years ([Rothamsted](https://www.era.rothamsted.ac.uk/dataset/rbk1/03-OAWWYields)) |
| Fish | Logistic regrowth; collapses above 0.75 of the growth rate | Recovers in about 8.5 years (measured) |
| Forest | Logistic regrowth, r 0.06–0.09 a year | Recovers in about 85 years (measured) |
| Ore | Costlier to mine as it depletes | Copper reserves last 43 years at current output ([USGS](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf)) |

Daily goods and trade would cost 17–21 ms a day at 10,000 settlements against a 12 ms budget, so both run weekly. The save target rises from 0.3 MB to about 0.5 MB.

## Food: dated lots and real shelf lives

Food comes in six categories with real shelf lives per storage type, and every batch carries its use-by day. Batches are eaten first-expiry-first and removed only at the day boundary, so spoilage emerges rather than being imposed. A flat daily loss rate misstated waste by up to 28 points against dated lots in testing.

| Category | Ambient (fresh-until / use-by, days) | Cool | Frozen |
| --- | --- | --- | --- |
| Grain | 180 / 365 | 180 / 365 | 180 / 365 |
| Bread | 2 / 4 | 7 / 14 | 60 / 90 |
| Produce | 4 / 7 | 7 / 14 | 240 / 365 |
| Dairy | 0 / 0 | 7 / 14 | 90 / 120 |
| Fresh protein | 0 / 0 | 1 / 3 | 90 / 240 |
| Preserved | 180 / 365 | 180 / 365 | 180 / 365 |

Shelf lives come from USDA FoodKeeper ([copy used](https://github.com/jelera/food-shelflife-db/blob/a7bf41f2a07823039e9169b538f0c42a29336eb7/lib/seeds/ingredients.csv)) and the [FDA chart](https://www.fda.gov/media/74435/download); "0 / 0" means eat it today.

- **Calibration:** 13.3% of food is lost before retail worldwide ([FAO](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses/en)), and UK households let about 4.3% of purchases spoil (computed from [WRAP](https://www.wrap.ngo/sites/default/files/2025-06/WRAP-UK-Food-Waste-and-Food-Surplus-Key-Facts-July-2025-v5.pdf)). Nomos targets 3–6% for households with cool storage and 0.5–3% for shops.
- **Quality:** price steps to 75% when stale and 50% on the last day. Grade (staple, standard, fine) comes from spending per adult, never from wealth, and food stays out of net worth.
- **Insecurity:** an 8-item tally modelled on FAO's survey counts hungry households; the default town targets 5–15%.
- **Ledger:** a settlement holds its food in 12 numbers, about 89 ns a day in reference-machine terms.

## Happiness: a target that conditions hold

Each person's life satisfaction, on the 0–10 ladder, moves toward a target with a 7-day lag. Persistent conditions stay in the target while they last, and only one-off events fade. One global drift back to a baseline would erase unemployment and income effects that the evidence says persist.

| Driver | Effect on the 0–10 ladder | Fades? |
| --- | --- | --- |
| Income relative to the settlement median | +0.3 per doubling ([Kahneman & Deaton](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/); [Luttmer](https://users.nber.org/~luttmer/relative.pdf)) | No |
| Unemployed | −0.7 ([WHR 2017](https://files.worldhappiness.report/WHR17.pdf); [Clark et al.](https://docs.iza.org/dp2526.pdf)) | No |
| Violent / property crime victim | −0.9 / −0.2 ([Mahuteau & Zhu](https://docs.iza.org/dp9253.pdf)) | Half-life 0.35 years |
| Fear of crime nearby | Up to −0.3 (inference) | While it lasts |
| No friend or household contact for 7 days | −0.45 (inference) | While it lasts |
| Missed meals | −0.15 a day, floor −0.7 (unsourced estimate) | While it lasts |
| Income inequality (Gini) | None; two meta-analyses find no effect | — |

- **What it drives:** job search (up to twice as likely), a small migration push between settlements and an approval readout. It never drives crime: no causal evidence was found, and it would double-count unemployment.
- **How it shows:** a settlement meter, an opt-in district lens and the inspector's driver list. Never faces or bodies, because happiness tracks income and jobs.
- **Predicted sizes:** doubling one person's income adds +0.60 at first and +0.35 for good; doubling everyone's adds +0.30, then +0.05, because people compare with neighbours.

## Wealth: start calibrated, keep it invisible

A realistic wealth distribution takes 70–200 simulated years to form, so a run starts from a euro-like or US-like preset and the mechanics keep it there. Earnings and saving alone reach a Gini of only about 0.5 in the prototype.

| Measure | Euro-like | US-like |
| --- | --- | --- |
| Wealth Gini | 0.62–0.74 | 0.78–0.86 |
| Top-10% share | 45–58% | 67–76% |
| Top-1% share | 15–28% | 30–37% |
| Net worth below zero | 1–6% | 6–10% |
| Homeownership | 50–75% | 60–70% |

Bands are inferred from the [US SCF 2022](https://www.federalreserve.gov/econres/scfindex.htm) (Gini 0.830) and the [euro-area HFCS 2023](https://www.ecb.europa.eu/home/pdf/research/hfcn/HFCS_Statistical_Tables_Wave_2023_June_2026.zip) (Gini 0.685).

- **Balance sheet:** deposits, one home from the map's fixed stock, property titles, shares in named firms and durables. Mortgages and unsecured debt sit in a claims ledger that must balance every day.
- **Mechanism:** the top tail needs persistent but re-drawn investment returns ([Fagereng et al.](https://www.nber.org/system/files/working_papers/w22822/w22822.pdf)), and unsecured debt needs a bankruptcy discharge, or 40% of households sink into negative net worth.
- **Sliders, before avoidance:** a 3% wealth tax above 4× mean net worth cuts the Gini by 0.05–0.07 in 10 years. The plan's 3% default is above Denmark's historical top rate of 2.2%.
- **Corrections:** round 2's Danish elasticities of 8.9 and 11.3 are not in the paper, which gives about 0.5 ([NBER w24371](https://www.nber.org/system/files/working_papers/w24371/w24371.pdf)). Wallet bars stay on lab cards, and the crime top-5% share is not a wealth measure.

## Budgets: what fits

Agents fit if each need is stored as the tick it runs out, with meals on the timing wheel, and day work runs in 1,024-entity slices. At country scale, 1,000 settlements fit in JavaScript, and 10,000 need weekly goods plus the planned WASM port.

| Item, reference-machine terms | 10k agents | 25k agents | 100k agents |
| --- | --- | --- | --- |
| Lazy needs and meals, share of the sub-budget | 0.2% | 0.2% | 1.7% |
| Needs decayed every tick instead | 15% | 15% | 130%, fails |
| Worst day slice per tick | 0.13 ms | 0.13 ms | 0.27 ms |
| Day boundary in one pass, share of tick slack | 95% | 103% | 416% |

- **Memory:** about 170 B per agent against the 256 B cap, with zero garbage collections and identical state hashes in every run.
- **Country day:** 1.11–1.15 ms of 1.5 ms at 1,000 settlements; 12.1–12.5 ms of 12 ms at 10,000 in JavaScript, before the wealth block.
- **Trap found:** sorting a shared-memory typed array allocates; a histogram gives the top-10% share instead.
- **Caveat:** every timing is desktop Node 24.18 on a Ryzen 5 3600 scaled ×1.9 to the reference machine. None is a phone, browser or WASM timing.

## What Norland teaches

Norland confirms the direction: wellbeing as a bounded sum of short-lived effects, with every effect visible to the player. Its per-agent depth caps a city at about 100–200 residents, so Nomos borrows its rules, not its depth. All 207 official posts were read ([Steam news](https://store.steampowered.com/news/app/1857090/view/1821288646577688)); its numbers are game balance, not evidence.

- **Borrow:** hidden meters never gate behaviour, low needs bias choices instead of blocking them, and a panel names the strongest effects.
- **Adapt:** day-boundary spoilage, hunger-driven food theft, a "case unresolved" thought for victims, wealth measured against prices, and a parity price band.
- **Avoid:** class clothing colours, marked criminals, punishment as spectacle, xenophobia mechanics, and an event director that breaks paired-seed comparisons.
- **The gap it never shows:** players see nearly all crime while the town records only arrests in the act. Showing that gap is Nomos's core lesson.

## Decisions for the owner

Five choices shape the build and are left open.

| Decision | Why it matters |
| --- | --- |
| Ticks per sim day | Sets how late sliced day work lands, shopping per tick, and whether need rates must be fractional |
| Days per sim year: 365, or 252 with 21-day months | Sets every half-life, grain's use-by margin and the monthly wealth schedule |
| Spoilage under sliced day work | Food can stay edible up to 138 ticks late at 100k agents; options include running spoilage slices first |
| Age structure | Without it, homeownership misses by 10–27 points and median wealth over income by 3× |
| Time compression for teaching | A 2.6-year income habit or a 70-year wealth tail outlasts a play session |

The fact-checked report, with every source, conflict resolution and verify-first item, is `docs/research/round-6-goods-and-wellbeing/report.md` in the repo. Its notes and prototypes sit beside it.
