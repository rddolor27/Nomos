# Goods that spoil, wealth that lingers, happiness that adapts

Round 6 report: goods and wellbeing. Written 5 October 2026 from the six notes in [`notes/`](notes/) and the questions in [`questions.md`](questions.md). Every figure keeps the evidence label its note gave it.

## Bottom line

The owner asked for resources, food with qualities that expires, happiness and wealth, "a little bit closer to real life". Nomos can have all four inside its budgets. It needs five designs and two engineering rules.

- **Resources: eight goods and four natural stocks.**
  - The goods are grain, fresh food, timber, stone, metal, fuel, wares and services. Dwellings are a stock built from timber and stone.
  - Soil fertility has a floor. Fish grow logistically and collapse when overfished. Forests take a lifetime to regrow, and ore gets costlier as it runs out.
  - One harvest a year, integer recipes, band prices and weekly margin-driven trade complete the layer.
  - Development presets should reproduce Engel's law: food falls from 45.3% to 8.7% of consumption from low to high income ([ICP 2021](https://api.worldbank.org/v2/sources/90/country/LIB;LMB;UMB;HIB;USA/series/1101000/classification/AICZS/time/YR2021/data?format=json), opened).
- **Food: dated lots that expire by the calendar, not by a decay rate.**
  - Six categories each have real shelf lives in days for ambient, cool and frozen storage, taken from USDA FoodKeeper.
  - Lots are eaten first-expiry-first and removed at the day boundary once their use-by day passes.
  - A constant daily loss rate misstated waste by up to 28 points in testing ([aging_compare.mjs](prototypes/food/aging_compare.mjs), measured here).
  - Quality means freshness (fresh, stale, last day), grade (staple, standard, fine), weekly variety and a FIES-style food-insecurity tally.
- **Happiness: a per-agent target that conditions hold and events push briefly.**
  - Life satisfaction on the 0–10 ladder chases a set point plus drivers. The drivers are relative income, an income habit, unemployment (which does not fade), isolation, fear of crime, local unemployment and inflation.
  - Victimisation and job-loss scarring fade, with half-lives of 0.35 and 1 year.
  - It drives job search, a small migration push and an approval readout. It never drives crime and never shows on bodies.
- **Wealth: a small integer balance sheet, spawned from a calibrated distribution.**
  - Households hold deposits, one home from the map's fixed stock, property titles, shares in named firms and durables. Mortgages and unsecured debt sit in a claims ledger.
  - The top tail needs persistent but re-drawn returns, and credit needs a bankruptcy discharge.
  - The tail takes 70–200 simulated years to form, so a run starts from a euro-like or US-like preset and the mechanics only maintain it.
- **Budgets: yes for agents with two rules; the country needs weekly goods and WASM.**
  - Store each need as the tick it reaches zero and schedule meals on the timing wheel. That costs 1.7% of the 100k-agent sub-budget.
  - Run day-boundary work in fixed 1,024-entity slices. The worst tick is then about 0.27 ms in reference-machine terms (RM-eq, computed).
  - Memory comes to about 170 bytes per agent against a 256-byte cap (computed).
  - At country scale, goods and trade must run weekly. The ledger blocks measured so far fit 1,000 settlements in JavaScript, but 10,000 need the planned WASM port. The 0.3 MB save target rises to about 0.5 MB.

Three decisions now sit with the owner: how many ticks make a day, how many days make a year, and whether spoilage may land up to 138 ticks late when day work is sliced. Every timing in this round comes from one desktop running Node; none is a phone timing.

## How to read the numbers

**Labels.** "Opened" means the researcher read the source. "Search summary" or "snippet only" means it was seen only in a search result; the happiness notes add "fetch-tool summary" and "abstract only", which count the same way. "Measured here" and "computed" mean the research team produced the figure. "Inference" is reasoning, and "unsourced estimate" is a number with no source. Numbers from games, Norland included, are design choices, not evidence.

**Where the timings come from.** All timings ran on one AMD Ryzen 5 3600 desktop (6 cores, 12 threads) under Windows 10 Pro. None ran in a browser, in WASM or on a phone.

| Note | What was timed | Engine | Load reported |
|---|---|---|---|
| [resources-production](notes/resources-production.md) | Goods and trade kernel | Node 24.18.0, V8 13.6.233.17 | Run 1: MSYS 1.10 / 0.67 / 0.92, Windows CPU 7–13%. Run 2: 3.23 / 2.14 / 1.49, CPU 35–69% |
| [food-quality-spoilage](notes/food-quality-spoilage.md) | Settlement food ring | Node 24.18.0, V8 13.6.233.17-node.50 | MSYS 1.31 / 0.49 / 0.88 |
| [happiness-wellbeing](notes/happiness-wellbeing.md) | Agent pass and ledger block | Node 24.18.0, V8 13.6.233.17-node.50 | MSYS 0.43–4.46 for agent runs, 0.21 for the ledger block |
| [wealth-assets](notes/wealth-assets.md) | Annual balance-sheet step | Node 24.18.0, V8 13.6.233.17-node.50 | 0.77 / 0.78 / 0.95 before, 0.71 / 0.77 / 0.95 after |
| [integration-cost](notes/integration-cost.md) | Ticks, day work, ledger extension | Node 24.18.0, V8 13.6.233.17-node.50 | No load average on Windows; 0.09–5.27 of 12 CPUs busy |

`os.loadavg()` returns zeros on Windows, and Git Bash's `/proc/loadavg` is an MSYS emulation ([Node docs](https://github.com/nodejs/node/blob/main/doc/api/os.md), opened). Other researchers benchmarked at the same time, so most notes gate on minima.

**Converting to the reference machine.** The resources note measured the RM at about 1.85× slower than this desktop; the integration-cost note measured 1.84–1.91× and uses ×1.9 (computed from round 5's kernels). The food and happiness notes instead used the plan's generic ×0.75 desktop multiplier, which implies only 1.33×. This report restates their figures at ×1.9 and labels the result RM-eq (computed).

## 1. Resources and production

**Answer.** Model eight goods plus dwellings, four natural stocks per settlement, one harvest a year, integer recipes, band prices and weekly trade. Let development presets move labour out of farming, as rising productivity does in real economies.

**Why these eight goods.** Household budgets show the categories that change most with income.

- Food takes 45.3% of consumption in low-income countries and 8.7% in high-income ones. Bread and cereals alone fall from 15.3% to 1.3% ([ICP 2021](https://api.worldbank.org/v2/sources/90/country/LIB;LMB;UMB;HIB;USA/series/1101000/classification/AICZS/time/YR2021/data?format=json), opened).
- Across 102 countries, the food share falls 7.8 points per doubling of GDP per head, with R² 0.65 (computed from [OWID's USDA ERS series](https://ourworldindata.org/grapher/share-of-consumer-expenditure-spent-on-food) and [World Bank GDP](https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.PP.KD?format=json&date=2023)). The ICP income groups give 7.9 points, an independent match (computed).
- Agriculture employs 60.7% of workers at low income and 3.1% at high income ([World Bank, ILO modelled 2023](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/SL.AGR.EMPL.ZS?format=json), opened). Cereal output per farm worker differs 69-fold, from 0.69 t to 47 t a year (computed). Productivity, not taste, drives people out of farming.
- Services-like spending rises from 20.3% to 54.6% of consumption (computed from ICP). Services are non-storable, so they never trade between settlements, as in [Victoria 3](https://vic3.paradoxwikis.com/Market) (opened).
- Housing with utilities takes 12.9–18.3% of consumption across income groups (ICP, opened). It becomes a built stock, with rent as a service flow, and its quality never renders (content rule 5).

Commercial games carry 60 to 131 goods ([Victoria 3 goods](https://vic3.paradoxwikis.com/Goods), opened; Widelands' 131 ware types, counted from a [clone](https://github.com/widelands/widelands), opened, study only). Economic agent models carry one or two. Nomos sits nearer the models for legibility (inference). Eight goods fit ColorBrewer's 8-class qualitative palettes ([colorbrewer_schemes.js](https://github.com/axismaps/colorbrewer/blob/master/colorbrewer_schemes.js), opened). Colour alone cannot pass the plan's ΔE ≥ 20 colour-vision test, so every goods map mode also needs icons (inference). No study of how many goods players can track was found.

**Natural stocks, with real rates.**

| Stock | Rule | Evidence |
|---|---|---|
| Grain fields | Daily standing crop; one 30–45-day harvest a year, two on irrigated rice land | Only 12% of cropland is multi-cropped, 34% of rice area ([Waha et al. 2020](https://publications.pik-potsdam.de/rest/items/item_24561_1/component/file_24562/content), opened); window lengths are US crop dates seen only as a [search summary](https://www.nass.usda.gov/Publications/Todays_Reports/reports/fcdate10.pdf) |
| Weather | One keyed draw per settlement-year; SD 0.13–0.22, clamp 0.2–1.6, regional plus local parts | Yield SD 13% rice, 17% wheat, 22% maize ([Ray et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4354156/), opened); the regional split is unsourced |
| Soil fertility | Q16 multiplier with a floor of 0.35–0.45 | Unmanured Broadbalk wheat held about 1 t/ha for 170 years, at 0.31–0.46 of manured yield with old varieties ([Rothamsted e-RA](https://www.era.rothamsted.ac.uk/dataset/rbk1/03-OAWWYields), opened; ratio computed); the rebuild rate is unsourced |
| Fish | Schaefer logistic, depensation below K/4, r 0.2–0.8 a year by default | [Froese et al. 2017](https://www.fishbase.de/rfroese/CMSY_faf_12190_Rev.pdf) (opened); the integer model hit MSY to four decimals and collapsed above 0.75 r ([goods_kernel.mjs](prototypes/resources/goods_kernel.mjs), measured here) |
| Forest | Logistic volume, r 0.06–0.09 | Recovery from 10% to 90% took 84.6 years at r = 0.06, against 8.5 years for a fishery at r = 0.6 (measured here) |
| Ore | Finite reserve; output per miner falls as it depletes | Copper reserves last 43 years at current output, all resources 217 years ([USGS 2025](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf), opened; computed); the fall in ore grade is a search summary |

Slow rates need Q24: r = 0.015 a year has a 10% daily rounding error in Q16 and 0.007% in Q24 (computed with the kernel's 360-day year). An overfished sea recovers in about a decade and a cleared forest in about a lifetime, so both play out within a 50-year run (inference).

**Prices.** Settlements use a band rule. Prices move about 1.5% when stock leaves 75–125% of target (a design choice), clamped to 25–175% of base as in [Victoria 3](https://vic3.paradoxwikis.com/Market) (opened; round 4 had this formula only as a search summary). Storable staples target demand × days to the next harvest, with a carrying-cost drift of 1.5–3% a month. That yields seasonal gaps near 33% for maize-like and 17% for rice-like crops (computed). African markets show 33.1% and 16.6% ([Gilbert et al.](https://documents1.worldbank.org/curated/en/498741467998767669/pdf/Price-seasonality-in-Africa-measurement-and-extent.pdf), opened). City firms post Lengnick prices per good.

**Trade.** Round 4's margin rule runs per good on the CSR graph. Mode factors are sea 1 : river 5–10 : road 23–52, from Roman and early 18th-century English freight costs ([Scheidel](https://orbis.stanford.edu/assets/Scheidel_59.pdf), opened). Wheat's price doubles after about 290 km by wagon (computed, using an unsourced density of 0.77 kg/L). Grain, timber, metal and wares trade everywhere. Fresh food travels only on edges under a day, stone only to neighbours, and services never. The modern truck : rail : barge ratio of about 9 : 2.2 : 1 is a search summary ([BTS](https://www.bts.gov/archive/publications/national_transportation_statistics/table_03_21)).

**Cost and correctness** ([goods_kernel.mjs](prototypes/resources/goods_kernel.mjs), Node 24.18, MSYS load 1.10 and 3.23 in two runs; measured here):

- Every good's stock identity held exactly over 1,000 settlements × 720 days, cents plus MINT summed to zero, and reversed order gave the same hash.
- A local 8-good day costs 152–186 ns per settlement across both runs. Daily trade over 8 neighbours costs 215–509 ns (run 1 medians) for 3–7 goods, and up to 591 ns in the busier run 2. Weekly trade in 4 goods costs 55–69 ns.
- Weekly goods plus weekly trade add 0.14–0.18 µs RM per settlement-day (computed at ×1.85). A daily goods layer would need 17–21 ms at 10,000 settlements, against a 12 ms budget.
- The goods state alone saved at 228–244 KB gzip for 10,000 settlements ([save-size.txt](prototypes/resources/results/save-size.txt), measured here).

**On screen.** Production shows through places: stock pips on workplaces, and fields, forests and docks that empty and regrow. Use at most four or five removable job items, and none may be black (content rule 7), so there are no sooty miners.

## 2. Food quality and spoilage

**Answer.** Use six food categories, a 6 × 3 shelf-life table and dated lots eaten first-expiry-first. Lots expire only at the day boundary. Only staples in poor storage get a small pest loss. Freshness, grade, variety and food insecurity are the quality dimensions, and spoilage rates emerge rather than being imposed.

**Real shelf lives span four orders of magnitude.** The table comes from FoodKeeper, read from two GitHub copies of the public-domain FSIS dataset that agree with each other ([jelera copy](https://github.com/jelera/food-shelflife-db/blob/a7bf41f2a07823039e9169b538f0c42a29336eb7/lib/seeds/ingredients.csv), opened; the official FSIS files were blocked). Fresh meat keeps 1–2 days chilled (roasts 3–5) and fish 1–2 days. The [FDA chart](https://www.fda.gov/media/74435/download) agrees (opened). The FDA's rule is to chill perishables within 2 hours, or 1 hour above 32 °C ([FDA](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling), opened). Cooling helps meat greatly but produce little: potatoes keep 7–14 days chilled against 30–61 in the pantry. So storage needs a table per category, not one "fridge ×2" multiplier.

| Category | Real items | Ambient (fresh-until / use-by, days) | Cool | Frozen |
|---|---|---|---|---|
| Grain | flour, rice, oats, dried pulses, pasta | 180 / 365 | 180 / 365 | 180 / 365 |
| Bread | bread, buns, flatbread | 2 / 4 | 7 / 14 | 60 / 90 |
| Produce | fruit, vegetables, roots | 4 / 7 | 7 / 14 | 240 / 365 |
| Dairy | milk, yogurt, cheese, eggs | 0 / 0 | 7 / 14 | 90 / 120 |
| Fresh protein | meat, poultry, fish | 0 / 0 | 1 / 3 | 90 / 240 |
| Preserved | jerky, salted, smoked, pickled, canned | 180 / 365 | 180 / 365 | 180 / 365 |

"0 / 0" means "eat it today", the 2-hour rule at day resolution. The gap between the two numbers is the stale window. City homes and shops default to cool; market stalls and village homes to ambient (inference).

**Why lots, not a rate.** The food researcher compared exact first-expiry-first-out (FEFO) lots with age-band aggregates ([aging_compare.mjs](prototypes/food/aging_compare.mjs), measured here).

- A single per-day rate overstated waste by up to 28 points when restocking kept pace: 7-day food restocked weekly wasted 28.3% against 0%.
- It understated waste by about 14 points when restocking was slower: 2-day food restocked weekly wasted 64.1% against 78.0% at 130% supply, and 57.1% against 71.4% at 100%.
- One harvest a year stored with a single 1/L daily loss lost 18.7–28.8% of the harvest. Dated cohorts lost 0% ([ledger_ring.mjs](prototypes/food/ledger_ring.mjs), measured here).

**Losses to calibrate against.**

- Before retail, 13.3% of food was lost globally in 2023: 10.0% in Northern America and Europe and 23.0% in sub-Saharan Africa. By group: fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4% ([FAO SDG 12.3.1a](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses/en), opened).
- Retail, food service and households wasted 19% of food available to consumers in 2022. Households made 60% of it, 79 kg per person ([UNEP Food Waste Index 2024 key messages](https://www.developmentaid.org/api/frontend/cms/file/2022/06/Food-Waste-Index-2024-key-messages.pdf), opened via a mirror).
- Only part of waste is spoilage. UK households waste about 15% of purchases, 73% of it edible, and 39% of that "not used in time". That makes about 4.3% of purchases spoiled before eating (computed from [WRAP 2025](https://www.wrap.ngo/sites/default/files/2025-06/WRAP-UK-Food-Waste-and-Food-Surplus-Key-Facts-July-2025-v5.pdf), opened). UK retail waste is 0.44% of food handled.
- Targets for Nomos, all emergent: households spoil 3–6% of purchased portions with cool storage, and shops 0.5–3% of throughput. Pre-retail loss uses FAO's group rates scaled by a cold-chain factor of 0.75–1.73 (computed as 10.0 / 13.3 and 23.0 / 13.3).

**Quality dimensions.**

- *Freshness* has three stages, derived from expiry and never stored. Posted price is 100% fresh, 75% stale and 50% on the last day. That follows Brazilian fish, which lost 25% of its price after one day and a further 33% after two ([FAO SOFA 2019](https://www.fao.org/3/ca6030en/ca6030en.pdf), opened; path computed). It rests on one anecdote plus design. Sanders' 21% waste cut from dynamic pricing is a search summary only ([INFORMS](https://pubsonline.informs.org/doi/10.1287/mksc.2020.0214)).
- *Grade* (staple, standard, fine) multiplies price by 100, 135 and 180%, a design choice. Demand follows income elasticities: in the US, cereals −0.085 up to dairy 0.354; in Ethiopia, cereals 0.622 and dairy 0.848 ([USDA ERS TB-1929](https://www.ers.usda.gov/sites/default/files/_laserfiche/publications/47579/7637_tb1929.pdf), opened).
- *Variety* counts categories eaten in a week. "Varied" is at least 4 of 6, "monotonous" at most 2. This mirrors FAO's "at least five out of ten" food groups ([MDD-W](https://www.fao.org/3/cb3434en/cb3434en.pdf), opened); the cut-offs are inference.
- *Food safety*: unsafe food causes 866 million illnesses a year ([WHO](https://www.who.int/news-room/fact-sheets/detail/food-safety), opened), about 1 per 10,000 meals (computed). Stale food ×10 and spoiled food eaten when starving at 2% are inferences informed by RimWorld's design.
- *Food insecurity* uses FAO's 8 FIES experiences ([survey module](https://www.fao.org/3/bl404e/bl404e.pdf), opened), tallied per household from sim events over 30 days. Moderate or severe insecurity was 25.8% of the world in 2025 and 8.7% in Northern America and Europe ([FAO SDG 2.1.2](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/212-prevalence-of-moderate-or-severe-food-insecurity-in-the-population-based-on-the-food-insecurity-experience-scale/en), opened). The default town targets 5–15%. The raw-score cut-offs of 4 and 7 simplify FAO's Rasch model and are unsourced.

**Representation.** Each lot is one Uint32: `exp:16 | cat:3 | grade:2 | storage:2 | qty:9`. A pantry holds at most 8 lots and a shop shelf at most 32, sorted by expiry. A storage move converts remaining life by integer proportion, `floor((left+1)(L2+1)/(L1+1)) − 1`, which replays bit for bit. Staples in poor storage lose 0.015–0.04% a day, from APHLIS's 2.7% a season and the sub-Saharan median of about 7% (computed for a 180-day season). The settlement keeps 12 numbers: a 6-slot perishable ring by days left, two dated staple cohorts, and eaten and spoiled counts. The ring matched an exact 32-slot ring within 0.1 point across 12 scenarios ([ledger_ring.mjs](prototypes/food/ledger_ring.mjs), measured here). It costs 46.7 ns per settlement-day (Node 24.18, MSYS load 1.31), about 89 ns RM-eq (computed at ×1.9).

The ring pools perishables, which assumes households substitute one for another. With weekly markets and no substitution, the exact model wasted 22.1% and ran 22.2% short, while the pooled ring showed 0% (measured here). Weekly-market villages therefore get a second ring, +6 numbers.

**Games.** Project Zomboid's two numbers per food, RimWorld's day timers and Banished's food groups are worth copying. Factorio's averaged freshness and constant rot rates are not. These are design precedents only.

**On screen.** Meal grade and stale food are poverty signals. Freshness appears only in the inspector, as a stale tint on stall stock pips and in waste charts. Grade stays out of bubbles except inside the opt-in wealth lens (content rule 5).

## 3. Happiness

**Answer.** Each agent holds life satisfaction (LS) from 0 to 10,000 milli-ladder points, where 1,000 is one ladder step. Each day its target is a set point plus drivers, and LS moves toward the target with a 7-day half-life. Persistent conditions stay in the target while they last, and only one-off events fade. LS drives job search, a small migration push in country mode and an approval readout. It never drives crime, faces or clothes.

**Drivers** (milli-ladder; from the [happiness notes](notes/happiness-wellbeing.md)):

| Driver | Default | Fades? | Basis |
|---|---|---|---|
| Own income vs settlement median, per doubling | +300 | No | A fourfold rise adds 0.64 in the US ([Kahneman & Deaton 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/), opened); neighbours' earnings subtract about as much ([Luttmer 2005](https://users.nber.org/~luttmer/relative.pdf), opened); computed |
| Own income vs subsistence, per doubling | +50 | No | Modelling choice between Easterlin and Stevenson–Wolfers (inference) |
| Own income vs own habit, per doubling | +250 | Half-life 2.6 years | 65% of a raise gone in 4 years ([Di Tella et al. 2010](https://www.nber.org/system/files/working_papers/w13159/w13159.pdf), opened; computed) |
| Unemployed | −700 | No (knob: 30% over 3 years) | Employed about 0.6 higher worldwide ([WHR 2017](https://files.worldhappiness.report/WHR17.pdf), opened); men −0.87 to −0.92 for 4 years ([Clark et al.](https://docs.iza.org/dp2526.pdf), opened) |
| Scarring after re-employment | −200 | Half-life 1 year | Clark et al. (computed fit) |
| No friend or household contact for 7 days | −450 | While it lasts | "Alone yesterday" in Kahneman & Deaton (inference) |
| Food insecure, per missed-meal day in the last 7 (floor −700) | −150 | While it lasts | Unsourced estimate (see conflict b) |
| Violent / property victimisation | −900 / −200 | Half-life 0.35 years | −0.40 and −0.09 in the year, near zero after ([Mahuteau & Zhu 2016](https://docs.iza.org/dp9253.pdf), opened; computed) |
| Fear of crime at the most dangerous cell | up to −300 | While it lasts | Inference; the individual effect is a search summary |
| Settlement unemployment, per point | −20 | No | Three studies (computed) |
| Inflation, per point a year | −7 | No | [Blanchflower et al. 2014](https://bpb-us-e1.wpmucdn.com/sites.dartmouth.edu/dist/5/2216/files/2020/08/BLANCHFLOWER_et_al-2014-Journal_of_Money_Credit_and_Banking.pdf), [Di Tella et al. 2001](https://wrap.warwick.ac.uk/id/eprint/339/1/WRAP_Oswald_aerfeb2000.pdf) (opened; computed) |
| Income inequality (Gini) | 0 | — | Two null meta-analyses |

Set points are drawn once at birth, with mean 6.8–7.0 and SD 1.36, and are never inherited or tied to a group.

**What the evidence says.**

- Unemployment costs 1.7–5 times as much LS per point as inflation (Di Tella; Blanchflower, opened). Unemployment adaptation is disputed. Clark et al. find none for men over 4 years, while [Luhmann et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289759/) find baseline regained in about 3 years (opened). The default follows Clark, with a knob for Luhmann.
- Crime hurts everyone through fear. Society would pay about 80 times the victim's own loss to remove one violent victim ([Cornaglia et al. 2014](https://docs.iza.org/dp8014.pdf), opened). Police effects therefore enter only through true and perceived crime, never through police presence.
- Inequality itself has no reliable effect: r = −0.01 over 24 studies ([Ngamaba et al. 2018](https://d-nb.info/1148950508/34), opened) and an odds ratio of 0.979 per 0.05 of Gini over 168 studies ([Sommet et al. 2026](https://www.nature.com/articles/s41586-025-09797-z), abstract only).
- Wealth adds little but lastingly. A $100,000 lottery prize raises LS by 0.037 SD, about 0.07 points, with no fading over 5–22 years ([Lindqvist et al.](https://www.nber.org/system/files/working_papers/w24667/w24667.pdf), opened). That is smaller than one income doubling, so there is no wealth term by default.
- A single global decay toward the set point would erase unemployment and income effects, which the evidence says persist (inference). That is why only events fade.

**What LS drives.**

- *Job search*: the monthly search probability rises by ×(1 + 0.15 per ladder point below 7), capped at ×2. This is an inference anchored on two opened studies. Pay disclosure raised search intent 4.3 points, and "very likely to search" answers predicted 19.5 points more turnover ([Card et al. 2012](https://eml.berkeley.edu/~saez/card-mas-moretti-saezAER12ucpay.pdf)). Unit satisfaction correlates −0.25 with turnover ([Krekel et al. 2019](https://cep.lse.ac.uk/pubs/download/dp1605.pdf)).
- *Migration*: intentions overstate moves about sevenfold ([IOM GMDAC 2017](https://publications.iom.int/system/files/pdf/gmdac_data_briefing_series_issue_9.pdf), opened). Emigration desire falls from 25% at the ladder's bottom to 12–14% at the top ([Cai et al. 2014](https://link.springer.com/content/pdf/10.1186/2193-9039-3-8.pdf), opened). A settlement's mean LS below the national mean raises out-migration by up to 10% per point (inference).
- *Approval*: one SD of national LS change goes with an 8.5-point incumbent swing ([Ward 2019](https://cep.lse.ac.uk/pubs/download/dp1343.pdf), opened). Nomos shows a readout only, with no elections or protests.
- *Productivity* is real but short-run mood: about 10–12% in the lab ([Oswald et al. 2015](https://www.andrewoswald.com/docs/actualJOLEpublished2015WRAP_Oswald_681096.pdf)) and 24.5% per point in call centres ([Bellet et al.](https://cep.lse.ac.uk/pubs/download/dp1655.pdf), both opened). It stays an optional switch at ±4% per point, capped at ±8% and off by default.
- *Not crime*: no causal estimate was found, an LS link would double-count unemployment, and it would draw "sad people steal".

**Predicted sizes** (computed from the defaults):

- One point less unemployment raises mean LS by 0.027; inflation from 5% to 2% raises it by 0.021.
- Doubling one agent's income gives +0.60 at first and +0.35 for good. Doubling everyone's gives +0.30 at first and +0.05 for good, because comparisons dominate.
- Raising the unemployment benefit from 40% to 60% of the median wage gives the unemployed +0.35 at first and +0.20 in the long run.

**Cost** ([happy-bench.mjs](prototypes/happiness/happy-bench.mjs), measured here). The full model costs 29–36 ns per agent per day with zero garbage collections (Node 24.18, MSYS load 0.43–4.46). That is 0.29–0.36 ms a day at 10,000 agents, or 0.55–0.68 ms RM-eq (computed). The integration-cost prototype measured 30 ns per agent for its placeholder at 100,000, which agrees. The settlement block costs 63–73 ns per settlement-day (MSYS load 0.21). Shuffled agent order gave identical hashes. The model's spread between agents is 1.4–1.5 ladder points, below the 1.9 seen in surveys. Optional AR(1) noise from keyed draws would close the gap (inference).

**On screen.** LS correlates with income and job status, so a resting sad face would put poverty on bodies (content rule 5). Faces and bubbles stay event-driven. LS appears as a settlement meter (mean, plus shares suffering below 4, struggling 4–7 and thriving 7 and above), an opt-in district lens and the inspector's signed driver list.

## 4. Wealth

**Answer.** Give each household a small integer balance sheet and pay firm profits to named shareholders. Make returns persistent but re-drawn every 10–20 years, and let saving rise with income. Hand estates on, and discharge unsecured debt after a fixed spell. Spawn the distribution from a preset, because it takes generations to emerge. Keep wealth invisible outside the opt-in lens.

**Targets.**

- The US SCF 2022 gives a wealth Gini of 0.830. The top 1% hold 35.1%, the top 10% 73.4% and the bottom 50% 2.2%. 7.9% of families have net worth of zero or less (computed from the [SCF summary extract](https://www.federalreserve.gov/econres/files/scfp2022excel.zip), which reproduces the Bulletin's median within $200). SCF 2022 is still the latest survey ([SCF index](https://www.federalreserve.gov/econres/scfindex.htm), opened).
- The euro area's HFCS 2023 gives a Gini of 0.685, a top-10% share of 51.8% and 3.6% with negative net worth ([HFCS tables](https://www.ecb.europa.eu/home/pdf/research/hfcn/HFCS_Statistical_Tables_Wave_2023_June_2026.zip), opened).
- The wealth Gini runs about 2.1 times the disposable-income Gini, from 1.64 to 2.53 across 21 countries (computed against [OECD IDD](https://sdmx.oecd.org/public/rest/data/OECD.WISE.INE,DSD_WISE_IDD@DF_IDD,/.A.INC_DISP_GINI+INC_MRKT_GINI......)).
- WID top shares imply Pareto tails from α = 1.24 (South Africa) to 2.05 (Netherlands), with the US at 1.43 (computed from [OWID's WID copy](https://ourworldindata.org/grapher/wealth-share-richest-1-percent)).

| Preset band (inference from the figures above) | Euro-like | US-like |
|---|---|---|
| Wealth Gini | 0.62–0.74 | 0.78–0.86 |
| Top-10% share | 45–58% | 67–76% |
| Top-1% share | 15–28% | 30–37% |
| Bottom-50% share | 4–8% | 1–3% |
| Net worth < 0 (or ≤ 0) | 1–6% | 6–10% |
| Median wealth ÷ median income | 2–6 | 2.3–3.2 |
| Homeownership | 50–75% | 60–70% |

**Balance sheets.** In the SCF, the bottom half's gross assets are 62% main home and 16% vehicles, with debts at 60% of assets. The top 1% hold 40% business equity and 31% stocks and funds (computed). The Fed's DFA agrees on the shape ([DFA levels](https://www.federalreserve.gov/releases/z1/dataviz/download/dfa-networth-levels.csv), opened). Nomos therefore needs five asset lines (deposits, a home, property titles, firm shares, durables) and two debts (mortgage, unsecured). Food stores are a memo line, as the [SNA 2008](https://unstats.un.org/unsd/nationalaccount/docs/SNA2008.pdf) treats consumer durables (opened; extending it to food is inference).

**The mechanism has four parts:** persistent earnings differences, saving that rises with income, persistent idiosyncratic returns, and finite lives with bequests.

- Saving rises from −2% in the bottom income quintile to 27% in the top and 49% in the top 1% ([Dynan, Skinner & Zeldes](https://www.nber.org/system/files/working_papers/w7906/w7906.pdf), opened).
- Individual returns average 3.7% with an SD of 6.1%. Their persistent part has an SD of 2.8 points and explains 60% of the explained variation ([Fagereng et al.](https://www.nber.org/system/files/working_papers/w22822/w22822.pdf), opened).
- Without return risk, Benhabib, Bisin and Luo's top-1% share falls from 34.1% to 5.7% ([NBER w21721](https://www.nber.org/system/files/working_papers/w21721/w21721.pdf), opened).

The wealth researcher's prototype climbed a ladder of mechanisms ([wealth.mjs](prototypes/wealth/wealth.mjs), computed):

- Earnings alone gave a Gini of 0.42–0.53, near the earnings Gini.
- Lifetime-constant return types plus saving that rises with wealth condensed toward a Gini of 0.90–0.99.
- Re-drawing return types at 5–10% a year stabilised the tail.
- Without a discharge, negative net worth jumped from 0.1% to 40% of households. A 7-year discharge made it move smoothly.
- Pricing houses at a fixed multiple of income let a recycled income tax raise ownership by 46 points within 10 years. That is an artifact, so houses must be a fixed stock with a market price.

The tail is a knife edge. With a 7.41% return, a 1.5% draw-down gives α ≈ 1.2 and a 3% draw-down α ≈ 10 (computed). The draw-down values are tuning numbers (unsourced estimate).

**It converges too slowly to emerge in play.** From an equal start, the Gini was half-way to its long-run value after 20 years and the top-1% share after 70. They reached 90% after 100 and 210 years (computed). Random-growth theory gives a 20.8–26-year average half-life ([Gabaix et al.](https://www.nber.org/system/files/working_papers/w21363/w21363.pdf), opened). The presets matched the Gini, top-10% and bottom-half shares within about 8 points (computed). They missed homeownership by 10–27 points and median wealth over income by a factor of 3, because the prototype has no age structure. The US-like top 1% reached only 23–25% against 35%.

**Accounting.** Keep three kinds of number: exact cents that sum to zero with MINT, integer quantities (homes, titles, shares, lots) and integer price indices. Valuation is index × quantity at the day boundary, so a revaluation never moves a cent. Loans sit in a claims ledger in which total household debt equals total lender assets. Both identities held exactly over 20,000 households × 400 years (computed). This follows SNA 2008's valuation and stock-identity rules (opened).

**Policy sliders** (prototype, paired against a no-policy control on 3 seeds; revenue recycled equally; no avoidance; computed):

| Slider | Gini change after 10 years (euro-like / US-like) |
|---|---|
| Wealth tax 1% above 4× mean net worth (about the top 5–6%) | −0.018 / −0.022, roughly double by 25 years |
| Wealth tax 3% above the same threshold | −0.052 / −0.065 |
| Wealth tax 3% on all net worth (extreme) | −0.163 / −0.175 |
| Estate tax 40% above 4× mean | −0.016 / −0.017 |
| Property tax 1% → 2% | −0.027 / −0.028 |
| Unsecured credit 1× income → 0 | −0.006 / −0.029, mainly cutting negative net worth by 4.2 / 12.6 points |

Real responses would shrink the top-end effects. Denmark's long-run elasticity of wealth to the net-of-tax return is "about 0.5" ([Jakobsen et al., NBER w24371](https://www.nber.org/system/files/working_papers/w24371/w24371.pdf), opened). The plan's 3% default exceeds Denmark's historical top rate of 2.2%.

**Cost.** The prototype's annual step costs 699–731 ns per household-year with about 10 keyed draws (Node 24.18, load 0.77). The integration-cost study's daily wealth pass costs 20 ns per household.

**On screen.** Wealth must not leak. Wallet bars appear only on lab cards. Carried goods are drawn by category, never grade, and durables stay abstract values. Home sprites come from the map, never from occupant wealth. Bubbles are capped per agent per day. An audit over 50 seeds checks that every rendered attribute has |Spearman| < 0.05 with wealth decile outside the lens. That threshold is a proposal, not a sourced standard.

## 5. Fit within the budgets

**Answer.** The agent tiers fit with two rules: lazy needs on the timing wheel, and day work sliced into fixed 1,024-entity chunks. Memory, allocation and determinism are not constraints. At country scale the goods, food and happiness blocks fit 1,000 settlements in JavaScript, but 10,000 need goods and trade weekly plus the WASM port. The save target rises to about 0.5 MB.

**Agent tiers** (integration-cost prototype, Node 24.18, 0.09–5.27 CPUs busy; RM-eq = desktop minimum × 1.9, computed):

| Item | 10k | 25k | 100k | Budget drawn on |
|---|---|---|---|---|
| Lazy needs, meals and shopping, per tick | 0.0023 ms (0.2%) | 0.0061 ms (0.2%) | 0.024 ms (1.7%) | "Other agent systems" 1.2 / 3.0 / 1.4 ms |
| Every agent's needs decayed every tick | 15% | 15% | 130%: fails | Same |
| Per-tick mood pass | 3.6% | 3.6% | 31% | Same |
| Worst day slice, per tick | 0.13 ms | 0.13 ms | 0.27 ms | Same, or slack 1.25 / 2.95 / 3.0 ms |
| One-pass day boundary, not sliced | 1.19 ms (95% of slack) | 3.04 ms (103%) | 12.5 ms (416%) | Slack: fails at 25k and 100k |
| Memory (arena) | 1.07 MB | 2.63 MB | 10.45 MB | 256 B per agent; 64 / 72 / 160 MB |

- Slicing takes 14, 35 and 138 ticks a day at 10k, 25k and 100k. Total day work changed by −0.5% to +4.3%.
- Day code runs cold in play, because a day boundary comes every 144 s at 1× speed. The first 100k boundary costs 13.3–26.8 ms. Pre-warming on a 1,024-agent dummy world roughly halves it.
- Keeping household members adjacent in agent index was worth 15% of day work and 2.3× per meal at 100k.
- All 26 runs showed zero GC events and identical state hashes. Packed and field-array lot layouts gave identical hashes too.
- One trap appeared: `TypedArray.prototype.sort` on shared `WebAssembly.Memory` copies the array, causing 1–4 GC events per 50 sorts ([sort-shared.mjs](prototypes/integration-cost/sort-shared.mjs), measured here; [V8 source](https://github.com/v8/v8/blob/main/src/runtime/runtime-typedarray.cc), opened). A 16-bins-per-octave histogram gives the top-10% share within 0.03 points instead.

**Memory, reconciled** (computed from the notes' field lists, approximate). The cost prototype used 89–101 B per agent. Swapping in the wealth balance sheet (+3 B per agent), the happiness fields (+6 B), a house registry (+6.5 B) and the food tallies (+1 B) gives about 117 B. Round 5's measured 56 B brings it to about 170 B, two-thirds of the 256-byte cap.

**Country day** (computed by this report from the notes' measurements; JS unless stated):

| Item | 1,000 settlements | 10,000 settlements | Source |
|---|---|---|---|
| Round 5 settlement model, RM | 0.76 ms | 8.4 ms | [plan](../../plan/implementation-plan.md) |
| Weekly goods step and trade | +0.14–0.18 ms | +1.4–1.8 ms | Resources, ×1.85 |
| Food block, daily | +0.09 ms | +0.9 ms | 46.7 ns × 1.9 |
| Happiness block, daily | +0.12 ms | +1.4 ms | 63–73 ns × 1.9 |
| Total before the wealth block | 1.11–1.15 ms | 12.1–12.5 ms | Budget 1.5 / 12 ms |

So 1,000 settlements fit in JavaScript, with about 0.35 ms left for the unmeasured wealth block. At 10,000 settlements, JavaScript misses the 12 ms budget before wealth is added. Round 5's WASM speed-up of 1.7–2.5× would bring the total to about 6.2–7.1 ms from its 4.7 ms WASM baseline (computed, assuming the speed-up carries over; inference). The integration-cost note reached the same verdict independently: nothing fits at 10k in JS. Replacing round 5's single-food logic with the goods step, rather than stacking it, would lower these totals (inference).

**Settlement bytes.** The resources block adds about 130 B, the food block about 48 B (12 Int32 numbers), the happiness block about 36 B and the wealth block about 64 B (computed). With round 5's measured 232–360 B, a settlement comes to about 510–640 B, under the 1 KB cap (computed).

**Saves.** Round 4's year-end country saved at 0.22 MB, and the goods state adds 0.23–0.24 MB (measured here). The total of about 0.45–0.46 MB breaks the M6 target of 0.3 MB (computed). Plan for about 0.5 MB, then re-measure, because the food, happiness and wealth blocks were not in the measured save.

**Phones.** No phone was measured. Round 5 offers two proxies that disagree about fourfold on a mid-tier phone: about the RM's speed, or 4× slower. From this desktop, that gives a budget Android at about 2.9× or Lighthouse's mid-tier phone at about 7.6× (computed). The integration-cost note finds the sliced design under 0.6 ms a tick even at ×7.6 for 10k–25k agents (computed). These are estimates, not phone timings.

## 6. Norland prior art

**Answer.** Norland confirms the direction: model wellbeing as a bounded integer sum of short-lived effects, drive behaviour from daily aggregates and make every effect visible. Borrow its rules, not its per-agent deliberation, and avoid its class markers, marked criminals and punishment spectacles. Its numbers are game-balance choices, not evidence.

The Norland researcher read all 207 official Steam posts in full through the Steam News API (`ISteamNews/GetNewsForApp`, app 1857090), plus Wayback snapshots of the community wiki (opened; the wiki is secondary and often stale).

- **Mood is a sum of thoughts.** Mood runs 0–100 as the sum of timed thoughts, and needs act only through the thoughts they emit ([community wiki](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population), opened). Hidden meters lost their hard effects because players could not see them ([Patch #42 Hotfix](https://store.steampowered.com/news/app/1857090/view/1815580768393909), opened). Legibility was retrofitted under criticism.
- **Wellbeing needed a payoff.** Once migration was solved, mood tools became "mostly unnecessary", so energy surges were added ([Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129), opened).
- **Food is eaten best-first.** Quality acts only through mood, scaled by class ([Progress Update, May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936), opened). Spoilage arrived in July 2025 as a warehouse cap and a 5%, later 10%, loss with no stated period ([Patches 50–53](https://store.steampowered.com/news/app/1857090/view/1832065502822072), opened).
- **Crime was imported once its driver faded.** Once migration control removed unemployment, crime "almost disappeared", so vagrants arrived with war refugees ([Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950), opened). A starving peasant who tries to steal food now becomes a bandit (Patches 46–48, opened).
- **True and recorded crime diverge, but the gap is never shown.** Players see crime bubbles and scenes, while the town records only arrests in the act. Showing that gap is Nomos's lesson (inference).
- **Wealth enters mood through fixed coin thresholds**, and class shows in clothing colour. Fixed thresholds break under Nomos's moving prices (inference).
- **Scale is the gap.** Norland's per-agent depth saturates a desktop at about 100–200 residents ([Plans for 2026](https://store.steampowered.com/news/app/1857090/view/1821288646577688), opened). Progression is capped at 110 ([Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772), opened). Nomos needs 91–909 times that (computed).

| Borrow | Adapt | Avoid |
|---|---|---|
| Hidden meters never gate behaviour; low needs bias choices instead of blocking; strongest-effects panel and daily-effect tooltips; witness-only crime thoughts; an offline batch runner | Spoilage by storage type, applied at the day boundary; food theft as a need-driven act; "case unresolved" until the records office clears it; wrongful stops cutting trust; wealth relative to prices or own income; a parity price band; migration with an amenity term | Class clothing and taste; marked or masked criminals; punishment as spectacle; xenophobia mechanics; a state-driven event director, which breaks paired-seed comparisons; CPU-capped city size |

## Conflicts between the notes, resolved

Each item states the decision and why. Items (a)–(f) were flagged when the round was planned; (g)–(p) were found while writing this report.

**(a) The cost prototype's placeholder mechanics give way to the other researchers' designs.** The integration-cost prototype was built before the designs existed, and its own notes call its mechanics placeholders.

- *Food.* Drop its 96-number settlement cube (8 categories × 4 qualities × 3 age bands) and its daily random loss on top of hard expiry. Its 0.10% a day for grain compounds to 30.8% a year, about ten times real storage loss (computed). Adopt the food notes' 12-number block of ring, cohorts and counts. Keep the cube only as an optional focus-mode statistics view. Why: the cube exceeds round 4's ledger, and the rate double-counts expiry and misstates waste.
- *Happiness.* Replace `happinessDay`, which adds drivers as daily increments with a 10%-a-day pull to the set point. That makes steady effects about ten times each increment and fades everything ([happiness notes](notes/happiness-wellbeing.md)). Use the per-agent target plus fading events. Why: unemployment and income effects persist in the evidence.
- *Wealth.* Remove `WB_DRIVE`, the wealth-band happiness term. Derive `homeValue` from the house registry × district price index instead of a free `Float64`. Replace its 8 log2 wealth bands in the ledger with WID-style groups (bottom 50%, next 40%, top 10%, top 1%). Why: the groups compare directly with targets, and a free home value can drift from the housing stock.

**(b) The food-insecurity happiness penalty stays, labelled as an unsourced estimate behind a knob.** The default is −150 milli-ladder per missed-meal day in the last 7, floored at −700. Frongillo et al. found food insecurity's association with well-being larger than other variables', but only abstracts were reachable ([Frongillo 2017](https://pubmed.ncbi.nlm.nih.gov/28250191/), abstract only). The penalty reads the agent's missed-meal counter. The FIES tally stays a metric and never feeds LS directly, so one missed meal is not counted twice.

**(c) Food grade comes from spending, not wealth band, and food stays out of net worth.** Each household picks grade from its daily consumption budget per adult, relative to the price index. That budget already includes consumption out of wealth, so wealth enters through spending. This follows the wealth notes and replaces the cost prototype's `QUAL_PICK` and the food notes' "by wealth band". Food stores are a memo line, outside net worth, wealth groups and tax bases. They are only 0.12–0.24% of median wealth (computed: $230–460 of pantry against $192,700).

**(d) Goods and trade run weekly at country scale, and the save target rises to about 0.5 MB.** Daily goods and trade would cost 17–21 ms at 10,000 settlements against 12 ms (computed). Weekly market days, round-robin over seven days, also match periodic rural markets (round 4). The food ring still ages daily, at about 89 ns RM-eq per settlement, because expiry is the point of the design. Production, recipes, prices and trade run in the weekly turn (inference). The save rises from 0.3 MB to about 0.5 MB, as section 5 computes.

**(e) Sliced day work makes spoilage late; this is an open decision for the owner.** With 1,024-entity slices, lots that expire today stay edible for up to 14, 35 or 138 ticks at 10k, 25k and 100k (inference from the measured slice counts). At 1,440 ticks a day, 138 ticks is about 2.3 sim hours (computed). The schedule is deterministic if fixed. It does, however, read `sim-core.md`'s "only the day boundary may write canonical state" as a fixed multi-tick window. Options:

1. Accept the lateness as specified.
2. Run the household spoilage slices first. That bounds lateness at 4, 10 and 40 ticks, from 4,079, 10,184 and 40,582 households (computed; untested).
3. Let a meal skip a head lot whose expiry has passed, leaving removal to the slice. One compare per meal would stop expired food being eaten (inference; untested).
4. Run one pass at 10k only, which fits with no margin.

The ticks-per-day figure is also unfixed. The prototype assumed 1,440, tested 240 and 14,400, and found integer need rates cut meals 17% at 14,400. At 240 ticks a day, the 100k slices would take 58% of the day (computed).

**(f) Corrections to earlier rounds.**

- Round 2 took wealth-tax elasticities of 8.9 and 11.3 from a snippet ([round 2 notes](../round-2-follow-up/notes/economy-calibration.md)). They do not appear in the Jakobsen et al. working paper the wealth researcher opened. It gives a long-run elasticity of "about 0.5" ([NBER w24371](https://www.nber.org/system/files/working_papers/w24371/w24371.pdf), opened).
- The plan's "top-5% concentration share" measures crime in places, not wealth. The wealth ledger needs its own top-10% and top-1% shares.
- M1's "Primer-style wallet and hunger bars that ride with the sprite" put wealth on screen beside a body. They are allowed only on lab cards, labelled lab-only. Any face driven by income, wealth or LS levels conflicts with content rule 5, since income and wealth ranks correlate at 0.63 (computed from SCF).
- M5's check that "the Gini falls steadily as the wealth tax rises" holds only from a spawned near-stationary state. From an equal start, the rising baseline swamps the slider for decades (inference).
- Confirmations: round 2's snippet-only "SCF wealth Gini about 0.83, top 1% about 35%" is now computed from microdata. Round 4's Victoria 3 market formulas are now opened.
- Round 5's two phone proxies disagree about fourfold (section 5), and should be reconciled with one on-device run.

**(g) Norland's thought-slot mood and the happiness notes' LS model become one model.** The Norland notes propose up to 8 slots per agent (type, value, expiry hour) with mood clamped to 0–100. The happiness notes propose LS as a target plus drivers. Decision: LS is the single wellbeing state, in milli-ladder units. Norland's "thoughts" become the inspector's signed driver list with remaining fade times. Why: the drivers are a small fixed set that fits 12 bytes of day counters, against 32 bytes for 8 slots. Their sizes are calibrated, while Norland's thresholds (unhappy below 25, migration above 30) are game balance.

**(h) Norland's percentage spoilage and best-first eating give way to dated FEFO lots.** The Norland notes suggest a daily integer loss per pantry and storage type, and eating the best food first. Decision: keep the Norland notes' day-boundary timing, but expire dated lots and eat them first-expiry-first. Why: a constant rate misstated waste by up to 28 points, and best-first eating would waste perishables. Percentage loss survives only as pest loss on stored staples.

**(i) Wellbeing never drives crime, and productivity stays small and optional.** The Norland notes suggest wellbeing feed "crime propensity" and cite a +50% productivity surge. Decision: no LS-to-crime link, and productivity at most ±8%, off by default. Why: no causal estimate was found, an LS link double-counts unemployment, and Norland's +50% is a balance number. Food theft enters through unmet food need, as the Norland notes themselves recommend.

**(j) The food notes' lot word and the happiness notes' units win.** The cost prototype packed `expiry 16 | category 4 | quality 3 | quantity 9`. The food notes use `exp:16 | cat:3 | grade:2 | storage:2 | qty:9`, which carries the storage tier for exact conversions. The swap should be safe for replays, since packed and field-array lot layouts gave identical hashes (measured here; this bit layout untested). Happiness is stored as Int16 milli-ladder, not the prototype's Int32 Q16. LS is not bumped per meal: meal outcomes go to the day's accumulators, which the daily pass reads.

**(k) The settlement food block is the food notes' 12 numbers, not per-category rings.** The integration-cost note prefers per-category 8-slot expiry rings, 115 numbers in 492 B, which fold and spawn lots exactly. They cost 0.86–0.88 µs RM-eq, including placeholder happiness, wealth and resource fields, and miss even the 1,000-settlement headroom in JS. The 12-number pooled block costs about 89 ns RM-eq and matched the exact ring within 0.1 point. Decision: 12 numbers canonical, plus 6 for weekly-market villages. The cost is that the pooled ring keeps no category mix. Spawn must draw it from the settlement's demand shares (inference; check on the divergence meter).

**(l) Desktop-to-RM factors differ between notes.** The food and happiness notes used the plan's ×0.75, the others a measured 1.85–1.9×. Decision: use ×1.9. This raises the food ring from 62 to about 89 ns RM-eq and the happiness block from "about 1 ms" to about 1.4 ms at 10,000 settlements (computed). Either change alone tips only the top of the goods range over 12 ms; together they tip 10,000 settlements over 12 ms in JS (computed).

**(m) Grain's 365-day use-by leaves no margin for one harvest a year.** The food table gives grain 180 / 365 days. One harvest a year must then last a full 365-day year, but the harvest test used shelf lives of 400–730 days (measured here). Decision: let the calendar decide. With a 365-day year, raise grain's use-by toward FoodKeeper's 730-day items (white rice, dry pasta). With a 252-day year, 365 days suffices (inference).

**(n) Job search moves from M2 to M3.** The happiness notes put the job-search multiplier in M2, but LS arrives in M3. The task moves with it.

**(o) The monthly wealth step does not fit a 1,024-household slice.** If a monthly step costs what the prototype's annual step does (731 ns per household at 100k), one 1,024-household slice costs about 1.4 ms RM-eq (computed). That is four times the proposed 0.35 ms slice gate. Decision: spread it over the month in chunks of at most about 250 households, or measure a lighter monthly step (computed; inference).

**(p) The sliders' ownership predictions inherit the house-price artifact.** Cutting property tax from 1% to 0% lowers ownership in the prototype (−1.8 points euro-like at 10 years), as does raising it to 2% (−4.0). The wealth tax raises ownership through recycled revenue. Each runs through the fixed price-to-income houses that the wealth notes flag as an artifact. Decision: publish only the Gini and negative-net-worth sizes until M3's house market exists, then recompute ownership.

**Smaller reconciliations.**

- Day work uses fixed 1,024-entity slices, with LS written to a back buffer that is swapped when the last slice ends. This replaces the happiness notes' 1/K-per-tick stagger; both are deterministic.
- Happiness income is the wealth notes' household disposable income per adult, with log income recomputed when income changes (inference).
- Norland's per-house mood overlay becomes a district lens only, since house-level mood would reveal wealth by address.
- Norland's habituation in place of class taste applies only if the meal-mood knob is switched on.
- The food notes' "30–80-number budget" is round 4's ledger size. The binding cap is 1 KB per settlement, which section 5 shows holds.

### Decisions left to the owner

| Decision | Options and what they change |
|---|---|
| Ticks per sim day | 1,440 was assumed. It sets slice lateness, shopping per tick and whether need rates must be fractional (Q8). |
| Days per sim year | 365 or 252 (21-day months). It sets every half-life in sim days, the grain margin in (m) and the monthly wealth schedule. |
| Spoilage under sliced day work | The four options in (e), and whether `sim-core.md` may read the day boundary as a fixed window. |
| Age structure | Without age, ownership misses by 10–27 points and median wealth over income by 3×. Round 4 left three age bands optional. |
| Time compression for teaching | A 2.6-year habit or a 70-year tail may outlast a play session. |
| Knobs with defaults set here | Unemployment adaptation (none), food-insecurity penalty (−150), meal mood (0), productivity (off), wealth term (none). |

## Draft plan tasks

Merged and de-duplicated from the six notes' draft tasks, with the resolutions above applied. Every task is tagged (R6).

### M0 Pipeline

- [ ] Fix the ticks per sim day and days per sim year, and record both in `sim-protocol`; convert every half-life and rate from them at build time (R6).
- [ ] Add a claims ledger beside the cash ledger, one record per loan (lender, borrower, principal in cents, rate in ppm, payment), asserting Σ borrower debt = Σ lender loan assets every day (R6).
- [ ] Add `mulPpm`, an exact floor of cents × ppm through a 10⁶ split with a ±1 correction, and lint-ban raw `cents * rate` in `sim-core` (R6).
- [ ] Reserve integer quantity registries for homes (one per LDtk home), property titles and firm shares; value them as integer price index × quantity at the day boundary, logged as a revaluation line and never posted to MINT (R6).
- [ ] Build at build time with @stdlib, shipped as data: a Q16 log2 table, fade tables for 0.35-, 1- and 2.6-year half-lives, an inverse-normal table for set points, the ledger band-share table and a Gaussian-copula table for wealth ranks (R6).
- [ ] Ban `TypedArray.prototype.sort` on views of shared memory in hot and day-boundary code, add it to the lint profile, and take top shares from a 16-bins-per-octave histogram (R6).
- [ ] Run day work as fixed 1,024-entity slices from the boundary, on the same schedule for every device and worker count, committing the settlement record when the last slice ends, once the owner settles conflict (e) (R6).
- [ ] Warm the day-boundary code at worker start on a 1,024-agent dummy world (about 20–30 ms), so the first in-game day does not run cold (R6).

**Exit checks**

- [ ] The CI budget gate gains a day-slice row: worst slice ≤ 0.35 ms RM at every tier, with the zero-scavenge window covering a full day of slices (R6).
- [ ] The claims and cash identities hold exactly every day, and no revaluation changes the MINT balance (R6).

### M1 Lab mode

- [ ] Add a bet card, "Does money buy happiness?": doubling one agent's income gives +0.60 at first and +0.35 for good; doubling everyone's gives +0.30 and then +0.05 (R6).
- [ ] Add a bet card, "Jobs or prices?": one point of unemployment against one point of inflation, about 4 : 1 in this model (R6).
- [ ] Keep wallet bars to lab cards, labelled lab-only, and never draw them in city or town skins outside the wealth lens (R6).
- [ ] Allow scripted event timing only as logged inputs on lab and scenario cards, never as a state-driven director in the sim core (R6).

### M2 Economy

- [ ] Give every firm one of eight sectors (grain, fresh food, timber, stone, metal, fuel, wares, services) and an integer recipe of at most two inputs, one output and worker-days per batch (R6).
- [ ] Run the wholesale call auction once per tradable good, never for services, and log unmet demand per good for the needs system (R6).
- [ ] Seed household baskets per good from ICP 2021 shares by development preset (food 45 / 33 / 19 / 9% of consumption) with the Stone–Geary rule (R6).
- [ ] Stock shops with dated food lots in six categories (≤ 32 per shelf), sell first-expiry-first, and remove expired lots into per-category waste counters only at the day boundary (R6).
- [ ] Price food as base × grade (100 / 135 / 180%) × freshness (100% fresh, 75% stale, 50% last day) in integer cents, flooring after each multiply; log markdown sales and waste per category (R6).
- [ ] Choose food grade from the household's consumption budget per adult relative to the price index, never from a wealth band; keep food value as a memo line outside net worth and tax bases (R6).
- [ ] Give households a balance sheet: deposits, unsecured debt (limit 0.5–1× annual income at 12–20% a year, discharged after 5–7 years at ≥ 80% of the limit), durables (about 0.35× earnings) and shares in named firms (R6).
- [ ] Pay firm profits as dividends to each firm's shareholders; log returns and check an SD near 6% a year with a persistent part near 3 points, re-drawn every 10–20 years (R6).
- [ ] Use a saving rule rising by income quintile (about 0, 2, 6, 9 and 15–18% of income above subsistence and housing), with 5% a year drawn from liquid wealth and less from illiquid wealth as wealth rises (R6).
- [ ] Define happiness income as household disposable income per adult; feed it into each agent's Q16 log2 income habit, and publish each settlement's median log income from a histogram at the day boundary (R6).
- [ ] Extend `spawnFromLedger` to wealth: keyed rank, a per-preset quantile table, income–wealth rank correlation near 0.6, exact apportionment to group totals, a portfolio split by group, and homes by rank plus noise (R6).
- [ ] Spawn agents household by household, so members stay adjacent in agent index (R6).

**Exit checks**

- [ ] In portions, every day and exactly: produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit; city-preset shops spoil 0.5–3% of throughput (R6).
- [ ] Known answers: an earnings-only economy settles within 0.1 of the earnings Gini; the Yard-Sale model without redistribution drifts toward Gini 1; cash and loan identities hold over 50 seeds × 400 simulated years (R6).
- [ ] Swapping the lot layout (packed against field arrays) leaves state hashes identical (R6).

### M3 City life

- [ ] Add LDtk workplace entities per sector (farm, pasture or dock, lumber camp, quarry, mine, fuel works, workshop) with worker capacity; services use the clinic, school, shop and market (R6).
- [ ] Add the grain season: crops accrue daily and are harvested over 30–45 days once a year as dated lots, scaled by Q16 soil fertility and a keyed weather draw (SD 0.13–0.22, regional plus local) (R6).
- [ ] Show production through places only (stock pips; fields, forests and docks that empty and regrow), with at most four or five removable job items, none black (R6).
- [ ] Store each need as the Int32 tick at which it reaches zero and schedule meals on the timing wheel; never decay every agent's needs every tick, and make rates fractional (Q8) once ticks per day is fixed (R6).
- [ ] Store each pantry as at most 8 Uint32 lots (`exp:16 | cat:3 | grade:2 | storage:2 | qty:9`) sorted by expiry, merging only equal keys, or into the same-category lot with the earlier expiry when full (R6).
- [ ] Build the 6 × 3 shelf-life table from FoodKeeper and the FDA chart; derive freshness, convert storage moves by integer proportion, and give only staples in poor storage a 0.015–0.04% daily pest loss (R6).
- [ ] Track a 6-bit weekly category mask and an 8-item monthly FIES-style tally per household, and add food poisoning at 0.01% per meal, ×10 when stale and 2% for spoiled food eaten when starving (R6).
- [ ] Add life satisfaction to `AgentStore` (Int16 0–10,000, Int16 set point, Int32 income habit, saturating Uint16 event counters; about 12 bytes), updated in one order-independent daily pass into a back buffer (R6).
- [ ] Wire the drivers: income terms, −700 unemployed, −200 scarring, −450 after 7 days without contact, and the food-insecurity penalty as a labelled unsourced knob (default −150 per missed-meal day, floor −700) (R6).
- [ ] Scale on-the-job search by 1 + 0.15 per ladder point below 7, capped at ×2, and check that firm-level LS and quits correlate near r = −0.25 (R6).
- [ ] Optional: a meal-mood knob (default 0) giving a one-day effect for grade and freshness, measured against the agent's own recent average quality, never by class (R6).
- [ ] Let low needs and low LS only lower utility weights, except physiological collapse, and name the driver behind every effect in the click-to-explain panel (R6).
- [ ] Show signed LS drivers with remaining fade times, household food reserves and pantry freshness in the inspector, and add a settlement LS meter (mean plus suffering, struggling and thriving shares) to the HUD (R6).
- [ ] Keep freshness to the inspector, stall stock pips and waste charts; keep grade and stale food out of bubbles outside the wealth lens; draw carried goods by category; fire no bubble from the LS level (R6).
- [ ] Make housing a fixed stock of LDtk homes with owners or renters, rent paid to the owner, mortgages at LTV ≤ 80% and payments ≤ 35% of income above subsistence, a forced sale at a 10% discount on default, and a monthly district price index from recent sales (R6).
- [ ] Draw every home from the map; no tile, roof, size or decoration may depend on the occupant's wealth or the home's price (R6).

**Exit checks**

- [ ] With cool storage, households spoil 3–6% of purchased portions; a no-fridge, weekly-market variant spoils ≥ 15% of perishables; no per-day random loss exists for perishables (R6).
- [ ] In the default town, 5–15% of households score ≥ 4 on the tally (R6).
- [ ] Within a town, LS rises 0.30–0.45 per doubling of income and the employed–unemployed gap is 0.6–1.0 (R6).
- [ ] At 10k and 25k agents, needs, meals, the LS pass and day slices stay within their sub-budgets with zero GC (R6).

### M4 Crime and police

- [ ] Add victimisation to LS (−900 violent, −200 property, half-life 0.35 years) and a fear term of up to −300 from each cell's perceived danger, fed by true and recorded crime and the witness pass, never by police presence alone (R6).
- [ ] Add food theft as an offend option whose gain rises with unmet food need, inside the opportunity-based utility; no agent ever becomes a "criminal" type, and LS never enters the offend utility (R6).
- [ ] Give victims and 1–3 close contacts a "case unresolved" flag until the records office clears the case; log its prevalence, and keep any LS effect as an unsourced knob, default 0 (R6).
- [ ] Let wrongful stops lower trust in police for the person stopped and 3–5 acquaintances (a Norland design number, to calibrate), charted beside arrests (R6).
- [ ] Extend the appearance audit and content lint to forbid punishment spectacles, shame marks, scars from punishment and mood rewards for watching punishment (R6).

**Exit checks**

- [ ] A violent-crime victim's LS averages 0.3–0.45 below baseline in the year of the crime and under 0.1 the year after (R6).
- [ ] At full employment, true theft stays above zero on paired seeds (R6).

### M5 Society and policy

- [ ] Add development presets that set productivity per sector from World Bank 2023 bands (0.7 / 1.5 / 4.4 / 47 t of cereal per farm worker a year) (R6).
- [ ] Add resource sliders with predicted sizes: fishing effort (collapse above 0.75 r), logging quota (recovery 70–85 years) and manure or fertiliser (unfertilised floor 0.35–0.45 of manured) (R6).
- [ ] Add a markdown-and-donation policy predicting about 20% less shop waste, and a home-refrigeration subsidy moving homes from ambient to cool; verify Sanders's 21% first (R6).
- [ ] Add −20 per point of settlement unemployment and −7 per point of inflation to LS, and give each policy slider a predicted LS size (R6).
- [ ] Add an opt-in district wellbeing lens, a government-approval readout from mean LS, and a district panel of the suffering share and strongest drivers; never show mood per house, and add no elections or protests (R6).
- [ ] Optional: a happiness-affects-productivity switch at ±4% per ladder point, capped at ±8%, off by default (R6).
- [ ] Ship euro-like and US-like wealth presets with CI bands, measured from a spawned start (R6).
- [ ] Add wealth-tax (0–3% above 4× mean net worth), estate-tax (0–70%), property-tax (0–2%, default 1%) and credit-access (0–2× income) sliders with the Gini and negative-net-worth sizes from section 4 (R6).
- [ ] State on each wealth slider that Nomos has no avoidance channel, so top-end effects are upper bounds (Denmark's long-run elasticity is about 0.5), and label 3% as above Denmark's historical 2.2% (R6).
- [ ] Log households stuck at the credit limit for at least 5 years as the poverty-trap meter (R6).
- [ ] If a wealth term is enabled, measure liquid wealth in years of settlement median income (+50 per year, capped at +150), never by fixed coin thresholds (R6).
- [ ] Add harvest shocks as logged scenario inputs, announced as forecasts with uncertainty (R6).
- [ ] Extend the appearance audit: no body pixel varies with LS, faces stay event-driven, bubbles are capped per agent per day, and every rendered attribute has |Spearman| < 0.05 with wealth decile outside the lens over 50 seeds (R6).

**Exit checks**

- [ ] The food share falls about 7.8 points per doubling of income across presets (R6).
- [ ] Without policy changes, wealth drift over 50 years stays within 0.03 Gini and 3 points of top-10% share; the wealth-tax Gini check runs from a spawned near-stationary state (R6).

### M6 Scale and sharing

- [ ] Name the class colours, culture conflict and punishment spectacles that games like Norland use, and Nomos excludes, on the "What this toy leaves out" page (R6).

**Exit checks**

- [ ] A save of 10,000 settlement ledgers with goods, food, happiness and wealth blocks stays under about 0.5 MB gzip, replacing the 0.3 MB target (R6).

### M7 Country of ledgers

- [ ] Extend the settlement store with eight Int32 goods stocks and prices, a standing crop, Q16 fertility and weather, fish, forest and ore stocks as integer-valued Float64, and workers by sector (about 30 numbers, 130 B) (R6).
- [ ] Add the 12-number food block (a 6-slot perishable ring by days left {1, 2, 3, 4–6, 7–10, 11+}, two dated staple cohorts, eaten and spoiled), aged daily, with a second ring for weekly-market villages (R6).
- [ ] Never model a stored harvest with a single daily loss rate, which lost 19–29% of a year's harvest in testing against 0% for dated cohorts (R6).
- [ ] Add the happiness block (employed and unemployed mean LS, income habit, base level, 5 band counts cut at 4.0, 5.5, 7.0 and 8.5), rebuilt daily from the band table by largest remainder (R6).
- [ ] Add the wealth block (net-worth totals for the bottom 50%, next 40%, top 10% and top 1%; counts with net worth ≤ 0 and owners; debt totals; the price index; σ and α), kept separate from the crime top-5% share (R6).
- [ ] Step goods weekly, round-robin over seven days: extraction with logistic regrowth (Q24 rates, depensation below K/4), recipes, consumption, decay, then band prices clamped to 25–175% of base (R6).
- [ ] For storable seasonal goods, target stock at demand × days to the next harvest plus a carrying-cost drift of 1.5–3% a month (R6).
- [ ] Trade grain, timber, metal and wares on weekly market days by margin per good (sea 1 : river 5–10 : road 23–52); send fresh food only under a day's travel and stone only to neighbours (R6).
- [ ] Bound settlement prices by import and export parity plus transport cost, add arbitrage flows when local prices leave the band, and model market saturation as decaying demand memory, adapted from Norland's caravan ceiling (R6).
- [ ] Apply pre-retail food loss by group (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%), scaled by a cold-chain factor of 0.75–1.73 (R6).
- [ ] Add +150 per doubling of settlement median income over the national median, and let mean LS below the national mean raise out-migration by up to 10% per point (R6).
- [ ] Fit wealth group-transition hazards from the M5 sweep logs; spawn and fold reproduce group totals exactly in cents (R6).
- [ ] Use one keyed draw per settlement-day plus one hash round per rounding decision, or deterministic remainders, for aggregate band shifts; never a full keyed draw per cell (R6).
- [ ] Budget the goods-and-wellbeing extension at ≤ 0.7 µs RM per settlement-day at 1,000 settlements, and port it to WASM with the settlement model before the 10,000-settlement tier (R6).

**Exit checks**

- [ ] The goods identity holds exactly per good every day, with spoilage as its own term; harvest stores lose only pest loss (≤ 7% a season) (R6).
- [ ] The fishery catch at u = r/2 lands within 0.1% of rK/4, and the ledger ring's waste stays within 1 point of an exact per-day ring on presets (R6).
- [ ] Seasonal price gaps run 17–33% in isolated villages and 2.5–3 times lower in integrated markets; grain's price doubles at about 290 km by road (R6).
- [ ] Total migration stays at 3.6–5.5% a year with the LS push on, and 10,000 settlements meet the 12 ms budget with every block in (R6).

### M8 Country map

- [ ] Add goods map modes: main product per settlement (eight classes, icon plus colour), the price of a chosen good, days of stock, and resource health (fish B/K, forest V/K, ore left) (R6).

### M9 Zoom across scales

- [ ] Fold pantry and shop lots into the ring and cohorts exactly in portions; spawn lots by largest remainder, with keyed expiry offsets inside wide slots and the category mix drawn from demand shares (R6).
- [ ] Make spawn draw set points so spawned LS bands match the ledger, and make fold return exact band counts and summed LS (R6).
- [ ] Add each notable's balance sheet (home ID, shares, debts) to the notables cache, so a revisited owner still owns the same home and firm (R6).

### Ongoing

- [ ] Re-check Norland's "fundamental update", due before the end of 2026, for its trade, upkeep and knowledge reworks (R6).
- [ ] Refresh the US wealth preset when SCF 2025 is released (R6).

## Open questions and verify-first

Every timing in this round is a desktop Node timing: Node 24.18.0 (V8 13.6) on a Ryzen 5 3600 under Windows 10. None is a phone, browser or WASM timing.

| Unverified | Evidence now | Why it matters | Blocks |
|---|---|---|---|
| All timings on other engines and devices | Desktop Node only; Windows has no load average; concurrent benchmarks | Whether 10k settlements fit 12 ms; the slice gate; the LS stagger | M0, M3, M7 |
| Desktop-to-RM factor | 1.85–1.9× from round 5's settlement, movement and grid kernels, on different Node and V8 versions | Every RM-eq figure here | M0, M7 |
| Phone multipliers | Round 5's two proxies differ about 4×; Speedometer scores snippet only | Phone tiers for agents and country | M3, M7 |
| WASM gain for the new blocks | Assumed from round 5's 1.7–2.5× | 10k settlements in budget | M7 |
| Monthly wealth step cost | Inferred from the annual step (731 ns per household) | Slice size and schedule, conflict (o) | M2, M3 |
| Save size with food, happiness and wealth blocks | Not measured; 0.45–0.46 MB covers round 4 plus goods only, and the other blocks add about 148 B raw per settlement | The M6 save target and its exit check | M6, M7 |
| Memory per agent once the balance sheet lands | About 170 B if the 64 B balance sheet replaces all of the prototype's 57 B of household money fields; about 183 B if the purse, food-value total and scratch field stay | Headroom under the 256 B cap | M2, M3 |
| RM-eq method | Food and happiness use medians × 1.9; the integration-cost convention is minima × 1.9 (85.7 against 88.7 ns); no verdict changes | Consistency of the CI gate | M0 |
| Lazy-need reads in decisions; jobs, inventory and social costs | Not measured | The other-agent-systems sub-budget | M3 |
| Household-order fragmentation from births, deaths and moves | Compaction cost not measured | The 15% day-work saving | M3 |
| Shared-memory sort copying | Node only | The lint rule | M0 |
| Histogram accuracy beyond the top 10%, and exact group totals | Only the top-10% share tested (0.03 points) | Wealth group totals in fold and spawn | M5, M7 |
| US harvest windows | USDA NASS, search summary | The 30–45-day harvest | M3 |
| Copper grade decline (> 2% to 0.6% Cu) and natural-forest r | Search summary; not opened | Falling-grade and forest curves | M7 |
| Forest Research yield-class definition | Search summary | Forest r from yield class | M7 |
| Farm share of food spending (18.5 cents at home) and outside the US | Search summary; none found abroad | Retail chain in low-income presets | M2 |
| Modern freight ratios truck : rail : barge | BTS, search summary, years differ | Modern mode factors | M7 |
| Von Thünen rings | JASSS, search summary | Expected map pattern | M8 |
| Banished yields (5 / 7 food per tile) and variety by groups; Gintis's copying rule | Search summaries | Design precedents only | — |
| Broadbalk residue after manure stopped in 1871; fertility rebuild rate | Search summary; rebuild unsourced | The manure slider | M5 |
| Household energy share of spending | Not split by ICP | Fuel demand per head | M2 |
| Livestock and garden output per worker | Not researched | Fresh-food productivity | M3 |
| Village-scale yield variance; regional correlation of weather | No source | The weather draw | M3, M7 |
| Grain density 0.77 kg/L | Unsourced | The 290 km test | M7 |
| Decay rates for timber, fuel and wares | Not researched; placeholder in the kernel | The weekly decay step | M7 |
| Production parameters | Uncalibrated (62% unmet fresh food, 100% metal at day 720) | Goods behaviour | M2, M7 |
| Whether novices read eight goods icons | No study found | Goods count and map modes | M8 |
| FoodKeeper against the official FSIS file | Two GitHub copies only | The shelf-life table | M2, M3 |
| Life of opened pasteurised milk | No day count in FoodKeeper | Dairy cool column | M3 |
| Grain use-by against one harvest a year | Harvest test used 400–730 days | Grain table and calendar, conflict (m) | M3 |
| Sanders's 21% waste cut; Tsiros and Heilman's willingness-to-pay slope; Winkelmann's discount data | Search summary; no slope values; fetch summary | Markdown steps and the donation policy | M2, M5 |
| FIES cut-offs 4 and 7 | Unsourced simplification of a Rasch scale | The food-insecurity metric | M3 |
| "Not used in time" share outside the UK | UK only (39%) | Household spoilage in hot or poor presets | M3 |
| Whether FEFO households reach 3–6% spoilage without random loss | Untested (inference) | Household calibration levers | M3 |
| UNEP per-person split (36 / 17 kg); no newer UNEP edition; SOFI 2025's 28.0% | Search summaries | Context for calibration bands | — |
| Victoria 3 needs | Search summary | Design precedent only | — |
| Pooled against split ring for weekly-market villages | One synthetic mix | Ledger block size | M7, M9 |
| Perishable category mix on spawn | Pooled ring keeps none (inference) | Spawn fidelity | M9 |
| Food insecurity's effect on LS | Frongillo, abstracts only | The −150 penalty | M3 |
| Unemployment adaptation | Clark (none) against Luhmann (3 years) | Whether −700 fades | M3 |
| LS or job-satisfaction elasticity for quits | Not found; 0.15 is inference | The search multiplier | M3 |
| Fear of crime's individual effect; perceived against real crime | Hanslmaier and Ambrey, search summaries | The −300 cap | M4 |
| Individual-level social-support effect | Only country-level WHR coefficients | The −450 isolation term | M3 |
| Meal quality's effect on LS | None; RimWorld relative sizes only | The meal-mood knob | M3 |
| Survey LS spread (SD 1.9) against the model's 1.4–1.5 | Computed gap | Whether to add AR(1) noise | M3 |
| Productivity, quits, migration and voting side studies (Erasmus 13%, Clark 2001, Otrachshenko and Popova, Ward 2021, Flavin and Keane, strain theory) | Search summaries | Supporting links only | — |
| Games' mood mechanics (Songs of Syx, Cities: Skylines, Victoria 3 SoL) | Search or fetch-tool summaries | Design precedents only | — |
| SCF 2025 | Not released | US preset | M5 |
| HFCS portfolio by wealth decile | Not opened | Euro portfolio split | M2 |
| Marginal propensities to consume out of housing and stocks | Not researched; 2–7% draw-downs are tuning | The tail's knife edge | M2 |
| Foreclosure and discharge rates; LTV 80%, 35% payment cap, 5–7-year discharge | No source; design values | Default and credit parameters | M2, M3 |
| Book against market value of firm equity; valuing untraded titles | Design choice; open | Share prices, tax bases, resource titles | M2, M7 |
| House supply effects on prices and ownership | Not modelled | Slider ownership columns, conflict (p) | M3, M5 |
| Debt-stress effect on LS | No effect size | Optional debt term | M5 |
| Leak-audit threshold \|Spearman\| < 0.05 | Proposal | The M5 audit bar | M5 |
| Benhabib–Bisin–Luo stationary weights | Read from a garbled table | The return grid | M2 |
| Round 2's top-10% share falling from 69% to 60% with Social Security wealth; US housing at 33.4% of spending | Snippets, not re-checked | Concentration framing; housing costs | M2, M5 |
| Lincoln Institute's 1.22% property-tax rate | Fetch-tool summary | Property-tax default | M5 |
| Yard-Sale critiques | Search summary | Framing of the known-answer test | M2 |
| Norland details: GameRant's food notes, lords in red, GameMaker engine, Steam specs, 15% patrol share | Search summaries, community wiki, unverified guide | None imported; all game numbers are design | — |
| Norland's fundamental update | Due before end of 2026 | Trade, upkeep and knowledge lessons | Ongoing |
