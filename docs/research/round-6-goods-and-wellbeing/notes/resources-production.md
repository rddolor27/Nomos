# Resources and production chains: which goods, how they regrow, how to price and trade them (round 6, question 1)

Researched 5 Oct 2026. This note covers raw resources and production only. Food quality and spoilage, happiness, wealth and the integrated cost prototype belong to the other four round-6 questions; hand-offs are flagged where they meet.

Read this first.

- **Labels.** "opened" means I read the page, data file, PDF or code myself. "search summary" means I saw it only in a search result. "measured here" means my own prototype run. "computed" means arithmetic on opened or measured numbers. "inference" means my reasoning. "unsourced" marks background figures I could not source.
- **Access.** Most hosts were reachable this round: the World Bank API, FAO, USGS, USDA ERS, Rothamsted e-RA, PMC, fishbase.de and GitHub clones. Failures: nature.com (login redirect; PMC used instead), umass.edu (Cloudflare), personal.sron.nl (DNS), bts.gov (403), anno1800.fandom.com (402), the GitHub REST API (rate limit; `git clone` used instead). The Victoria 3 wiki "Needs" page fetch was declined at the permission prompt, so it was not opened.
- **Machine for timings.** AMD Ryzen 5 3600 desktop (6 cores, 12 threads), Windows 10 Pro, Node 24.18.0 (V8 13.6.233.17). This is neither the reference machine (RM) nor a phone. `/proc/loadavg` under Git Bash is synthetic on Windows, so I also logged Windows CPU load.
- **Scale to the RM (computed).** I ran round 5's JS settlement kernel here. It took 0.357 ms (1k settlements) and 3.51 ms (10k) per day for the cohort step, against 0.661 and 6.49 ms on the RM in round 5 ([round 5 results](../../round-5-performance/prototypes/compute/results/kernels-node-lowload.json)). Flows gave the same ratio (0.107 vs 0.200 ms; 1.27 vs 2.37 ms). So RM ≈ 1.85 × this desktop. The Node versions differ (24 here, 22 on the RM), so treat 1.85 as approximate.
- **Prototype.** [goods_kernel.mjs](../prototypes/resources/goods_kernel.mjs), with logs in [results/bench-node.txt](../prototypes/resources/results/bench-node.txt) (run 2; run 1 is transcribed from the console) and [results/save-size.txt](../prototypes/resources/results/save-size.txt). Its production parameters are illustrative, not calibrated.

**Hand-offs**

- **Food quality and spoilage:** the decay rates per good, the fresh-food shelf life, and grain storage loss. My kernel only has a placeholder daily decay per good.
- **Happiness:** my kernel records unmet demand per good and settlement (`unmet[s, g]`), the natural input to needs.
- **Wealth:** dwellings as a stock built from timber and stone, and ownership of land, forests and mines. Art rule 5 forbids showing housing quality.
- **Cost prototype (`prototypes/integration-cost/`):** town-scale costs of shops, needs and inventory. My measurements cover the country-scale goods layer and its save size.

---

## a) Minimal resource set and chains

### Takeaway

- Food is 45.3% of household consumption in low-income countries and 8.7% in high-income ones (ICP 2021). Bread and cereals alone fall from 15.3% to 1.3%.
- Across 102 countries, the food share falls 7.8 points per doubling of GDP per capita (R² 0.65). The four ICP income groups give 7.9 points, an independent match.
- Agriculture employs 60.7% of workers in low-income countries and 3.1% in high-income ones; services rise from 29.3% to 74.3% (ILO modelled, 2023).
- Cereal output per farm worker differs 69-fold: 0.69 t a year in low-income countries against 47 t in high-income ones. Productivity, not taste, drives the shift out of farming.
- Recommended eight goods: grain, fresh food, timber, stone, metal, fuel, wares and services. Housing is a stock built from timber and stone, not a ninth good.

### Cited Findings

**Household spending (Engel's law)**

- ICP 2021, share of actual individual consumption by income group (low / lower-middle / upper-middle / high / US) — [World Bank API, source 90, classification AICZS](https://api.worldbank.org/v2/sources/90/country/LIB;LMB;UMB;HIB;USA/series/1101000/classification/AICZS/time/YR2021/data?format=json) (opened):
  - food and non-alcoholic drinks 45.3 / 33.2 / 18.6 / 8.7 / 6.2%;
  - bread and cereals 15.3 / 8.0 / 2.8 / 1.3 / 1.0%; meat 6.1 / 4.2 / 5.2 / 1.6 / 1.2%; fish 2.2 / 2.7 / 1.1 / 0.5 / 0.1%; milk, cheese and eggs 2.3 / 4.5 / 1.9 / 0.9 / 0.6%; vegetables 8.0 / 4.4 / 2.2 / 0.9 / 0.6%;
  - housing, water, electricity, gas and other fuels 14.5 / 12.9 / 15.8 / 18.3 / 16.4%;
  - clothing and footwear 4.6 / 4.6 / 4.2 / 3.0 / 2.8%; furnishings and household equipment 4.8 / 3.2 / 4.4 / 4.2 / 4.1%;
  - transport 7.9 / 10.9 / 10.0 / 8.8 / 8.9%;
  - health 4.0 / 6.4 / 9.7 / 16.7 / 20.3%; education 4.4 / 7.4 / 10.0 / 7.7 / 7.8%; recreation 1.7 / 2.1 / 3.9 / 8.0 / 9.1%; restaurants and hotels 3.2 / 3.9 / 5.2 / 5.5 / 6.0%; miscellaneous goods and services 4.7 / 9.6 / 13.0 / 14.6 / 14.7%.
  - "Actual" consumption includes health and education that governments provide in kind.
- Services-like categories (health, education, recreation, restaurants, communication, miscellaneous) sum to 20.3% of consumption at low income and 54.6% at high income. Food, drink, tobacco, clothing and furnishings sum to 57.3% and 18.3% — computed from the ICP rows above.
- Food eaten at home as a share of consumer spending, USDA ERS data via Our World in Data, 104 countries, latest 2022–2023: Nigeria 59.3%, Bangladesh 52.8%, Kenya 42.1%, India 29.9%, China 21.2%, Brazil 16.2%, Germany 11.6%, UK 8.7%, US 6.8% — [OWID CSV export](https://ourworldindata.org/grapher/share-of-consumer-expenditure-spent-on-food) (opened). It excludes food away from home, alcohol and tobacco.
- Engel fit, my calculation on the 102 countries that match World Bank GDP per capita (PPP, 2023): food share = 138.1 − 11.19 × ln(GDP per capita), R² = 0.65, so −7.8 points per doubling. Predicted shares: 51% at $2,400, 36% at $8,900, 27% at $21,000, 15% at $58,600 — computed from the OWID CSV and [World Bank NY.GDP.PCAP.PP.KD](https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.PP.KD?format=json&date=2023) (opened).
- The ICP group shares (45.3% at $2,365 down to 8.7% at $57,813 per head) imply −7.9 points per doubling — computed.
- Income elasticity of food demand, 144 countries (ICP 2005): 0.78 in low-income countries and 0.50 in high-income ones. For cereals and fats it is above 0.5 in low-income countries and below 0.1 in high-income ones — [USDA ERS Amber Waves, Sept 2011](https://www.ers.usda.gov/amber-waves/2011/september/low-income-countries) (opened).

**Employment and output by sector**

- Employment shares, ILO modelled estimates, 2023 (agriculture / industry / services) — [World Bank SL.AGR, SL.IND, SL.SRV](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/SL.AGR.EMPL.ZS?format=json) (opened):
  - low income 60.7 / 10.0 / 29.3%;
  - lower-middle 41.1 / 21.9 / 37.0%;
  - upper-middle 20.9 / 27.5 / 51.6%;
  - high income 3.1 / 22.6 / 74.3%;
  - world 26.6 / 23.5 / 49.9%.
  - The world agriculture share fell from 39.3% (2000) to 26.6% (2023).
- Value added, 2023 (agriculture / manufacturing, % of GDP): low income 28.4 / 9.1; lower-middle 18.7 / 16.9; upper-middle 7.0 / 21.6; high income 1.3 / 12.3. GDP per head (PPP, 2021 $): $2,365 / $8,576 / $20,194 / $57,813 — [World Bank NV.AGR.TOTL.ZS, NV.IND.MANF.ZS, NY.GDP.PCAP.PP.KD](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/NV.AGR.TOTL.ZS?format=json) (opened).
- Agricultural value added per worker, 2023 (constant 2015 $): $736 / $2,222 / $6,671 / $27,403 — [World Bank NV.AGR.EMPL.KD](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/NV.AGR.EMPL.KD?format=json) (opened).
- Cereal output per agricultural worker, 2023: 0.69 / 1.50 / 4.37 / 47.3 t a year. People fed per farm worker: 4.9 / 6.3 / 10.2 / 65 — computed from World Bank cereal production, labour force, unemployment and the agriculture share (all opened). "Agricultural worker" includes livestock, forestry and fishing, so cereal per worker understates output per grain farmer.
- Agriculture's employment share falls 10.9 points per doubling of GDP per head across 216 economies (R² 0.74) — computed from the same World Bank series.
- Fisheries and aquaculture employed 61.8 million people in 2022 — [FAO SOFIA 2024 executive summary](https://openknowledge.fao.org/server/api/core/bitstreams/1273bc36-339b-43d2-8163-af4d805f2ad2/content/sofia/2024/executive-summary.html) (opened). That is 1.8% of 3.41 billion employed — computed with World Bank labour data.
- Wood fuel was 49.4% of about 4 billion m³ of roundwood in 2022 (60% in 1961), 90% in Africa and 60% in Asia. About 2.3 billion people (29%) cooked or heated with woody biomass in 2021 — [FAO, State of the World's Forests 2024, §2.3](https://openknowledge.fao.org/3/cd1211en/online/src/html/wood-production-record-levels.html) (opened).

**Legibility**

- ColorBrewer's qualitative palettes stop at 8 classes (Accent, Dark2, Pastel2, Set2), 9 (Set1, Pastel1) or 12 (Paired, Set3) — [axismaps/colorbrewer `colorbrewer_schemes.js`](https://github.com/axismaps/colorbrewer/blob/master/colorbrewer_schemes.js) (opened).
- Widelands defines 131 ware types across its tribes — counted from the `data/tribes/wares/` tree of a [widelands/widelands](https://github.com/widelands/widelands) clone (opened; GPL-2.0, study only). Victoria 3 lists more than 60 goods in four categories — [Victoria 3 wiki, Goods](https://vic3.paradoxwikis.com/Goods) (opened).

### Inferences

**Recommended goods (eight)**

| # | Good | What it stands for | Why it earns a slot |
|---|---|---|---|
| 1 | Grain | Cereals, the storable staple | The largest Engel signal (15.3% → 1.3% of consumption); one harvest a year makes lean-season prices and famine risk legible. |
| 2 | Fresh food | Vegetables, fruit, meat, dairy, fish | Meat, fish, dairy and vegetables alone are 18.6% of consumption at low income and 3.9% at high; perishable (hand-off to food quality); gives coasts and pastures a role. |
| 3 | Timber | Logs and sawn wood | Feeds housing, fuel and wares; forests cover 32% of land and regrow slowly, so over-logging shows for decades. |
| 4 | Stone | Stone, clay and brick | Lets housing and civic buildings be built without stripping forests; unlimited but heavy, so it stays local. |
| 5 | Metal | Ore and metal | A finite deposit with falling grade; the high-value, long-distance trade good on the country map. |
| 6 | Fuel | Firewood, charcoal, coal | A universal need for cooking and heating; 49% of world wood is fuel, which ties energy demand to deforestation. |
| 7 | Wares | Clothing, furnishings, tools | Clothing plus furnishings are 7–9% of consumption in every income group; the main manufactured output and an input to farms and mines. |
| 8 | Services | Health, education, retail, leisure, repairs | 20% of consumption at low income and 55% at high; non-storable and non-tradable, like Victoria 3's local goods. |

- **Housing** (14.5–18.3% of consumption with utilities) should be a dwelling stock built from timber, stone and labour. Rent is a service flow. Its quality never renders on screen, by art rule 5. Hand-off to the wealth question.
- **Not separate goods:** fish and livestock fold into fresh food; textiles into wares; electricity and transport into fuel and services. A ninth or tenth good mostly adds trade cost, because country trade scales with tradable goods × edges (measured in d).
- **Final versus intermediate:** households buy grain, fresh food, fuel, wares and services directly. Timber, stone and metal are mostly intermediate, but households can buy small amounts of timber and fuel.
- **Development preset.** Productivity per worker by sector should be a preset table. Engel's law then makes labour leave farming as productivity rises, with no scripted shift. Test against the ICP food shares (45 / 33 / 19 / 9%) and the 7.8-point slope per doubling.
- **Legibility budget.** Eight goods fit an 8-class qualitative palette, but colour alone will not pass the plan's ΔE ≥ 20 test under three colour-vision types. Every goods map mode needs an icon as well.
- **Jobs as removable items.** Sector is better shown by the workplace building than by eight outfits. At most four or five job items (field hat, hard hat, workshop apron, merchant apron) keep the 16×24 blob readable. No job item may be black, by art rule 7, so no sooty miners.

### Gaps

- ICP 2021 does not split household energy out of "housing, water, electricity, gas and other fuels", so the fuel budget share is unknown.
- Engel curves across income quintiles within one country were not retrieved; round 2 noted the same gap for US CE data.
- I found no study of how many goods players can track. Only palette limits are sourced.
- Mining and quarrying employment shares were not retrieved.

---

## b) Extraction, regeneration and depletion

### Takeaway

- **Crops:** only 12% of cropland is multi-cropped (34% of rice area); the rest gives at most one harvest a year. Cereal yields run 1.40 / 3.25 / 4.95 / 5.39 t/ha from low to high income. Weather moves yields by an SD of 13% (rice), 17% (wheat) and 22% (maize).
- **Soil:** unmanured wheat at Broadbalk has held about 1 t/ha for 170 years. With old varieties it gave 0.31–0.46 of the manured yield, so fertility needs a floor, not decay to zero.
- **Fish:** use Schaefer logistic growth with CMSY's depensation below K/4. Growth rates r run 0.015–1.5 a year by resilience class, with MSY = rK/4 at B = K/2. My integer daily model hit MSY to four decimals and collapsed when harvest exceeded 0.75 r.
- **Forests:** r ≈ 0.06–0.09 a year. Recovery from 10% to 90% of capacity took 85 years at r = 0.06, against 8.5 years for a fishery at r = 0.6 (measured here).
- **Ore:** copper reserves last 43 years at current output and known plus undiscovered resources 217 years. Model depletion as a rising cost per unit (falling grade), not a hard stop.

### Cited Findings

**Crops, harvests and weather**

- Cereal yield, 2023: low income 1.40 t/ha, lower-middle 3.25, upper-middle 4.95, high income 5.39, world 4.23 — [World Bank AG.YLD.CREL.KG](https://api.worldbank.org/v2/country/LIC;LMC;UMC;HIC;WLD/indicator/AG.YLD.CREL.KG?format=json&date=2015:2024) (opened). The 2024 aggregates were incomplete, so I used 2023.
- Cereal area per agricultural worker, 2023: 0.49 / 0.46 / 0.88 / 8.76 ha — computed from World Bank cereal area and agricultural employment.
- Multiple cropping covers 134.4 Mha, 12% of global cropland: 5% of rainfed and 40% of irrigated cropland. Double cropping is 130.4 Mha; triple only 4.1 Mha. 34%, 13% and 10% of rice, wheat and maize area are multi-cropped — [Waha et al. 2020, Global Environmental Change (PIK copy)](https://publications.pik-potsdam.de/rest/items/item_24561_1/component/file_24562/content) (opened).
- US harvest windows: winter wheat begins about 24 June and ends about 7 August (most active 6–22 July); corn for grain runs 1 September to 1 December — [USDA NASS, Field Crops Usual Planting and Harvesting Dates](https://www.nass.usda.gov/Publications/Todays_Reports/reports/fcdate10.pdf) (search summary).
- Climate explains 32–39% of year-to-year yield variability where significant, over about 13,500 political units, 1979–2008. Detrended yield SD is about 0.9 t/ha/yr for maize (about 22% of mean), 0.5 for rice (13%) and 0.4 for wheat (17%) — [Ray et al. 2015, Nature Communications (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4354156/) (opened).
- Food price seasonality at 193 African markets for 13 foods: the seasonal gap averages 33.1% for maize and 16.6% for rice, and 60.8% for tomatoes. That is 2.5–3 times the gap in international reference markets — [Gilbert, Christiaensen & Kaminski, World Bank WP 7539](https://documents1.worldbank.org/curated/en/498741467998767669/pdf/Price-seasonality-in-Africa-measurement-and-extent.pdf) (opened).

**Soil fertility (Broadbalk, Rothamsted, wheat since 1843)**

- Mean grain yields, t/ha at 85% dry matter — [e-RA dataset 03-OAWWYields, 03-Yields-2022.xlsx](https://www.era.rothamsted.ac.uk/dataset/rbk1/03-OAWWYields) (opened):

  | Period | Unmanured (Nil) | Farmyard manure 35 t/ha | PKMg + 144 kg N | Best rotational wheat |
  |---|---|---|---|---|
  | 1852–61 | 1.12 | 2.41 | 2.52 | — |
  | 1872–81 | 0.72 | 2.05 | 2.23 | — |
  | 1902–11 | 0.80 | 2.62 | 2.76 | — |
  | 1955–64 | 1.58 | 2.97 | 2.85 | — |
  | 1968–78 (short-straw varieties) | 1.63 | 5.61 | 5.23 | 6.17 |
  | 1991–95 | 0.89 | 6.31 | 6.46 | 9.44 |
  | 2019–22 | 0.62 | 6.82 | 5.27 | 11.18 |

- The unmanured to manured ratio was 0.31–0.46 in each decade from 1852 to 1925, and 0.09–0.17 in 2013–22 — computed. Modern varieties widen the gap because they respond to inputs, not because nil soil collapsed.

**Fisheries**

- Schaefer biomass dynamics: B(t+1) = B(t) + r(1 − B/k)B − C. Below B/k = 0.25, surplus production is multiplied by 4B/k to represent reduced recruitment. MSY = rk/4, Fmsy = r/2, Bmsy = k/2 — [Froese et al. 2017, Fish and Fisheries (author PDF)](https://www.fishbase.de/rfroese/CMSY_faf_12190_Rev.pdf) (opened).
- Prior r ranges by FishBase resilience: high 0.6–1.5, medium 0.2–0.8, low 0.05–0.5, very low 0.015–0.1 a year (same paper, Table 2; opened). CMSY and the Bayesian model agreed on r, k and MSY in 76% of 128 assessed stocks (opened).
- 62.3% of marine stocks were within biologically sustainable levels in 2021, down 2.3 points from 2019. Weighted by landings, 76.9% came from sustainable stocks. World production was 223.2 Mt in 2022, 185.4 Mt of it aquatic animals — [FAO SOFIA 2024](https://openknowledge.fao.org/server/api/core/bitstreams/1273bc36-339b-43d2-8163-af4d805f2ad2/content/sofia/2024/executive-summary.html) (opened). That is 23 kg of aquatic animals per person — computed.

**Forests**

- 4.14 billion ha of forest, 32% of land; growing stock 630 billion m³, or 152 m³/ha on average. South America averages 217 m³/ha and Western and Central Africa 197 m³/ha. Planted forests are 8% of forest area — [FAO FRA 2025, key findings](https://openknowledge.fao.org/server/api/core/bitstreams/2dee6e93-1988-4659-aa89-30dd20b43b15/content/cd6709en.html) and [growing stock chapter](https://openknowledge.fao.org/server/api/core/bitstreams/2dee6e93-1988-4659-aa89-30dd20b43b15/content/FRA-2025/growing-stock-biomass-carbon.html) (opened).
- World removals of about 4 billion m³ a year average 0.97 m³ per forest hectare a year — computed from SOFO 2024 and FRA 2025.
- Sitka spruce in Britain: average yield class 14–16 m³/ha/yr, 24 or more on good sites; even-aged rotations of 40–50 years are common — [Forest Research, Sitka spruce](https://www.forestresearch.gov.uk/tools-and-resources/tree-species-database/131584-sitka-spruce-ss-2/) (opened). Yield class is the maximum mean annual increment — [Forest Research](https://www.forestresearch.gov.uk/publications/forest-yield) (search summary).

**Minerals**

- Copper, 2024 estimates: world mine output 23,000 kt; reserves 980,000 kt. Identified resources (2015 assessment) 1.5 billion t of unextracted copper; undiscovered resources about 3.5 billion t — [USGS Mineral Commodity Summaries 2025, copper](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf) (opened).
- Reserves over output give 42.6 years; all resources over output give 217 years — computed.
- Copper ore was mined at more than 2% Cu in the early 1900s and about 0.6% around 2010 — [Mudd et al., via ResearchGate](https://www.researchgate.net/publication/259134862_Modelling_Future_Copper_Ore_Grade_Decline_Based_on_a_Detailed_Assessment_of_Copper_Resources_and_Mining) (search summary).

**My integer checks** — [goods_kernel.mjs](../prototypes/resources/goods_kernel.mjs) (measured here)

- Fishery with K = 10⁸, r = 0.6 a year, daily steps and Q24 rates, 150 years at a constant exploitation rate u:

  | u | Catch a year | Theory uK(1 − u/r) | Ratio | B/K |
  |---|---|---|---|---|
  | 0.1 | 8,332,560 | 8,333,333 | 0.9999 | 0.833 |
  | 0.2 | 13,332,960 | 13,333,333 | 1.0000 | 0.667 |
  | 0.3 | 14,999,760 | 15,000,000 (= MSY) | 1.0000 | 0.500 |
  | 0.4 | 13,333,320 | 13,333,333 | 1.0000 | 0.333 |
  | 0.5 | 0 (collapsed) | 8,333,333 without depensation | — | 0 |

- With depensation, the largest per-capita growth below K/4 is 0.75 r. So any sustained u above 0.75 r collapses the stock (computed); u = 0.5 at r = 0.6 is 0.83 r.
- Recovery with no harvest from 10% to 90% of K: 84.6 years at r = 0.06, 33.8 at 0.15, 8.5 at 0.6 and 5.1 at 1.0. Plain logistic theory without depensation gives ln 81 / r: 73.2, 29.3, 7.3 and 4.4 years.

### Inferences

**Parameters for the sim (all integer)**

| Resource | Stock and rule | Parameter ranges | Basis |
|---|---|---|---|
| Grain fields | A standing crop accrues daily from farm labour; it is harvested over a 30–45-day window once a year (two windows on irrigated rice land) | Yield by preset 1.4 / 3.25 / 4.95 / 5.4 t/ha; area per farm worker 0.5 / 0.5 / 0.9 / 8.8 ha | World Bank 2023; Waha 2020 |
| Weather | One keyed draw per settlement-year from the 4,096-entry inverse-normal table, multiplying the harvest | SD 0.13 (rice-like), 0.17 (wheat-like), 0.22 (maize-like); clamp to 0.2–1.6 | Ray 2015 |
| Soil fertility | Q16 multiplier between a floor and 1.0; continuous cropping drifts it to the floor; manure, fallow or fertiliser raise it | Floor 0.35–0.45 for traditional seed, about 0.1–0.2 for input-hungry modern seed; move 1/8 of the gap a year | Broadbalk ratios; the rate is inference |
| Fishery | Schaefer logistic with depensation below K/4; daily rate in Q24 | r 0.2–0.8 default (medium), 0.6–1.5 for small pelagic-like stocks; MSY = rK/4 | Froese 2017 |
| Forest | Logistic volume; logging capped at standing volume | r 0.06–0.09 for managed conifer, lower for slow natural forest; K 150–600 m³/ha by biome and age | Computed from yield class 14 and K 600–900; FRA 2025 |
| Ore deposit | Finite reserve; output per miner falls with the remaining share | Size the deposit for 40–200 years at the start-up extraction rate | USGS copper R/P 43 years, resources 217 |
| Quarry | Unlimited; output per worker only | — | Inference |

- **Why Q24.** A daily rate of r = 0.015 a year is 2.7 in Q16, a 10% rounding error. In Q24 it is 699, a 0.007% error (computed). Q16 is fine for r ≥ 0.06.
- **Overflow guard.** Compute (K − B)/K as a Q16 fraction first, then multiply. Every intermediate product then stays below 2^53 for stocks up to 10⁹ units (inference, checked in the prototype).
- **Legible timescales.** An overfished sea recovers in about a decade and a clear-cut forest in about a lifetime. Both are watchable within a 50-year run, which makes them good policy stories.
- **Weekly steps work.** Biology is slow, so regrowth can run weekly with r_week = 7 r_day, with no visible difference (inference).
- **Shocks should correlate.** One draw per settlement-year makes neighbours' harvests independent, which is unrealistic. Add a shared regional draw and a smaller local one (inference; no source on the split).

### Gaps

- Livestock yields (meat and milk per animal or per hectare) were not researched; fresh-food output per worker stays a tunable.
- The harvest-window lengths are a search summary for US crops only.
- Ray et al. measure variability at political-unit scale. Single-village variability is surely larger, but I found no figure.
- How fast fertility rebuilds under manure or fallow is unsourced. Broadbalk shows only that residues persist: the plot whose manure stopped in 1871 still out-yields Nil (search summary).
- Natural-forest r by biome, and the copper grade history, were not opened.

---

## c) Prior art: how games and economic ABMs represent goods and production

### Takeaway

- Commercial games carry many goods: Victoria 3 more than 60, Widelands 131 ware types across tribes. Economic ABMs carry one or two: Lengnick one, EURACE one consumption good plus capital vintages, Sugarscape two.
- **Worth copying:**
  - Victoria 3's non-tradable local goods and its ±75% price clamp;
  - Anno-style integer cycle ratios (2 farms : 1 mill : 2 bakeries);
  - Banished's workers per field and seasonal harvest;
  - Widelands' finite per-tile resources with "out of resource" notices;
  - Sugarscape's integer regrowth;
  - EURACE's regional malls and weekly shopping;
  - Lengnick's inventory-band pricing.
- **Worth avoiding:**
  - Dwarf Fortress's material × quality explosion and soil that never depletes;
  - RimWorld's per-item hit points;
  - welfare and logit choices built on `pow`, `exp` and `log` without lookup tables;
  - goods destroyed without a ledger entry.

### Cited Findings

**Games**

- **Victoria 3:**
  - more than 60 goods in staple, luxury, industrial and military groups; base prices such as grain 20, coal 30, steel 50, automobiles 100, fine art 200 — [Victoria 3 wiki, Goods](https://vic3.paradoxwikis.com/Goods) (opened);
  - market price = base × [1 + 0.75 × clamp((BUY − SELL) / min(BUY, SELL), ±1)], so 25–175% of base;
  - local price = MAPI × market price + (1 − MAPI) × state price, with MAPI starting at 75%;
  - market access is at most infrastructure divided by usage;
  - "services, transportation, and electricity always use only the state price" — [Victoria 3 wiki, Market](https://vic3.paradoxwikis.com/Market) (opened; round 4 had these formulas only as a search summary).
- **Anno 1800:** grain farm 60 s per ton, flour mill 30 s, bakery 60 s, so 2 farms : 1 mill : 2 bakeries — [Anno 1800 Empire Builder, flour mill guide](https://www.anno1800empirebuilder.com/ultimate-flour-mill-guide-producing-flour-in-anno-1800/) (opened; fan guide). The mill needs 10 farmers, and electricity doubles its output (same page). The official fandom wiki returned HTTP 402.
- **Banished:**
  - fields measure 4–15 tiles per side; a 15 × 15 field gives the best efficiency at 56.25 tiles per farmer;
  - "in optimal conditions (next to a barn and house) a farmer can serve 80-90 squares and produce 600 food" — [Banished Wiki, Crop Field](https://banished-wiki.com/wiki/Crop_Field) (opened);
  - uneducated workers yield at most 5 food per tile and educated ones 7 — [Steam discussion](https://steamcommunity.com/app/242920/discussions/0/540734424084448476/?ctp=3) (search summary).
- **Widelands** (GPL-2.0, study only), from a clone of [widelands/widelands](https://github.com/widelands/widelands) (opened):
  - the Barbarian bakery consumes 3 water + 3 wheat per cycle and makes 2 bread, about 68 s a cycle;
  - a farm cycle takes 54.4–83.2 s, and fields ripen in 125 s nominal (up to double);
  - fish are a per-tile resource with `max_amount = 20`; each catch "mines" one unit;
  - only an Atlantean fish breeder restores fish, so stocks never regrow on their own;
  - buildings raise "Out of Fish", "Out of Trees" or "No Fields" notices below a productivity threshold.
- **Dwarf Fortress:**
  - quality multiplies value by 1, 1.1, 1.2, 1.333, 1.5 and 2 (masterwork), and 20 for artifacts — [DF wiki, Quality](https://dwarffortresswiki.org/index.php/Quality) (opened);
  - crops take about 25 or 41.7 days; unfertilised tiles give 0–6 plants;
  - "soil productivity is only affected by fertilizing", so fields never deplete — [DF wiki, Farming](https://dwarffortresswiki.org/index.php/Farming) (opened).
- **RimWorld:**
  - items lose hit points per day outdoors (rice 6 HP/day, survival meals 0.25), ×5 in rain, and not at all indoors or on shelves; rot is a separate system — [RimWorld wiki, Deterioration](https://rimworldwiki.com/wiki/Deterioration) (opened);
  - a simple meal turns 0.5 nutrition of any raw food into 0.9 nutrition in 300 ticks and starts to rot after 4 days — [RimWorld wiki, Simple meal](https://rimworldwiki.com/wiki/Simple_meal) (opened).
- **Project Alice** (open Victoria 2) moves prices by supply-to-demand ratios at speed 0.01. It trashes unsold global supply at day end — [round 4 notes, sections 3 and 7](../../round-4-multi-scale/notes/economy-demography.md) (opened in round 4).

**Economic ABMs**

- **Lengnick 2013:** one homogeneous consumption good; firms use labour only, at λ = 3 units per worker-day; prices move inside an inventory band of 0.25–1.0 months of demand — [round 2 notes, KQ1 and KQ6](../../round-2-follow-up/notes/economy-calibration.md) (opened in round 2 via the replication code).
- **EURACE@Unibi** — [Dawid et al. 2011 working paper](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/eurace-unibi-model-2011-v1.pdf) (opened):
  - one consumption good, differentiated only by producer;
  - one capital-good producer selling vintages of rising productivity, combined with labour in a Leontief function;
  - firms stock local malls once a month; households shop weekly, spending a quarter of the monthly budget;
  - choices between firms and vintages are multinomial logits built on `exp` and `log`.
- **Sugarscape**, Mesa `sugarscape_g1mt` (Apache-2.0, commit of 30 Sep 2026) — [projectmesa/mesa](https://github.com/projectmesa/mesa/tree/main/mesa/examples/advanced/sugarscape_g1mt) (opened):
  - sugar and spice regrow by 1 unit per step up to each cell's capacity; capacities on the 50 × 50 map run 0–4;
  - metabolism 1–4, vision 1–4, endowment 25–49 units;
  - welfare is Cobb–Douglas with fractional exponents; trade happens at the geometric mean of the two marginal rates of substitution.
- **Gintis 2006/2007 and Mandel 2012:** Gintis's multi-sector exchange economies use private prices and imitation, with a fixed set of "self-reproducing" resources. Mandel adds capital accumulation: households spend money in proportion to a consumption vector, and firms buy intermediate inputs per production technique — [Mandel 2012, Complexity Economics](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/AgentBasedDynamics.AntoineMandel2012.pdf) (opened). In Gintis's model, 5% of agents copy a more successful agent's prices every ten periods — [search result](https://www.umass.edu/preferen/gintis/General%20Equilibrium.pdf) (search summary).
- **Caiani et al. 2016 and the K+S family:** two sectors, capital goods and consumption goods — [round 2 notes, KQ5](../../round-2-follow-up/notes/economy-calibration.md) (opened in round 2).

### Inferences

| Mechanic | From | Copy? | Why |
|---|---|---|---|
| Non-tradable local goods | Victoria 3 | Yes | Services can be exempt from inter-settlement trade, which saves one goods slot of trade cost. |
| Price clamp at 25–175% of base | Victoria 3 | Yes | It keeps integer prices in range and spikes readable. |
| Market access below 100% blends local and national prices | Victoria 3 | Later (M8) | Useful for isolated villages; the CSR trade band already gives much of it. |
| Integer cycle ratios between buildings | Anno, Widelands | Yes | Players can read "two farms feed one mill"; recipes stay small integers. |
| Workers per field, seasonal harvest | Banished | Yes | Matches the standing-crop rule in b). |
| Finite per-tile resources, "out of" notices | Widelands | Partly | Notices are legible; per-tile stocks cost too much for the country tier, so use one stock per settlement. |
| +1 regrowth up to capacity | Sugarscape | Only for decor | Linear regrowth has no MSY, so overfishing never collapses; use logistic regrowth. |
| Regional malls, weekly shopping | EURACE | Yes | It matches the plan's shops and the weekly market day. |
| Inventory-band price moves | Lengnick, Project Alice | Yes | The plan already has it in M2; reuse it per good. |
| Material × quality multipliers | Dwarf Fortress | No | It multiplies goods states; quality belongs to the food question, for food only. |
| Per-item hit points and rot | RimWorld | No | Per-item state means allocation or huge arrays; use stock-level decay per good. |
| Soil that never depletes | Dwarf Fortress | No | Broadbalk contradicts it. |
| Logit and Cobb–Douglas with `exp`, `log`, `pow` | EURACE, Sugarscape | Only via tables | The sim-core rules ban transcendental `Math`; build-time tables are allowed. |
| Destroying unsold goods | Project Alice | No | It breaks the goods identity; book losses explicitly. |

- The 60–130-good games are deep but unreadable at a glance. Nomos is a society toy with Primer-style legibility, so it sits nearer the ABMs, with eight goods.

### Gaps

- Victoria 3's needs and production-method numbers were not opened (the Needs page fetch was declined).
- Official Anno data (fandom wiki) and Banished food use per citizen were not retrieved.
- Gintis's own paper was blocked; its model details come from Mandel 2012 and a search summary.

---

## d) Representation and prices

### Takeaway

- **Store goods compactly.** Each settlement gets eight Int32 stocks, eight Int32 prices, a standing crop, fertility and weather factors, three natural stocks and workers by sector: about 30 numbers, or about 130 B packed (computed).
- **The local day is cheap.** An 8-good local day (extraction, regrowth, two recipes, consumption, decay, prices) took 152–186 ns per settlement on this desktop (measured here). That is about 0.28–0.34 µs on the RM (computed).
- **Trade dominates.** Daily trade over 8 neighbours cost 215–591 ns per settlement for 3–7 tradable goods; over 24 neighbours with 5 goods, 1.05–1.21 µs. Weekly market days with 4 goods cut it to 55–69 ns (measured here).
- **Recommended cadence.** A weekly goods step plus weekly trade adds about 0.14–0.18 µs RM per settlement-day (computed). 1k settlements then take 0.90–1.22 ms of the 1.5 ms budget. 10k take 9.0–12.2 ms of 12 ms in JS, so the WASM port matters. A daily goods layer would need about 17–20 ms at 10k.
- **Saves grow.** The goods state alone came to 228–244 KB gzip at 10k settlements (measured here), on top of round 4's 0.22 MB.

### Cited Findings

**Prototype** — [goods_kernel.mjs](../prototypes/resources/goods_kernel.mjs) (measured here; Node 24.18.0, V8 13.6.233.17, Ryzen 5 3600, Windows 10 Pro)

- Correctness, over 1,000 settlements × 720 days with 5 tradable goods:
  - every good's stock equals start + production − consumption − decay − transit loss − recipe inputs, exactly;
  - all household and firm cents plus MINT sum to exactly 0;
  - running settlements in reverse order gives the same state hash (`45bf0ee2`), as plan-then-apply trade requires.
- Timing, 15 samples of 60 days after 360 warm-up days, median [min–max] ns per settlement-day. CSR grid graphs: k = 8 gives 7,622 edges at 1k and 78,804 at 10k; k = 24 gives 22,128 and 234,036.
  - Run 1, load 1.10 / 0.67 / 0.92 (MSYS), Windows CPU 7% before and 13% after:

    | Settlements | k | Tradable goods | Trade every | Local | Trade |
    |---|---|---|---|---|---|
    | 1,000 | 8 | 0 | — | 153 [145–191] | — |
    | 1,000 | 8 | 3 | 1 day | 153 [145–161] | 215 [212–243] |
    | 1,000 | 8 | 5 | 1 day | 152 [150–164] | 379 [375–411] |
    | 1,000 | 8 | 7 | 1 day | 153 [150–163] | 486 [478–511] |
    | 1,000 | 24 | 5 | 1 day | 154 [149–161] | 1,053 [1,039–1,085] |
    | 1,000 | 8 | 5 | 4 days | 153 [150–165] | 106 [102–112] |
    | 10,000 | 8 | 0 | — | 156 [150–171] | — |
    | 10,000 | 8 | 3 | 1 day | 173 [158–220] | 243 [227–315] |
    | 10,000 | 8 | 5 | 1 day | 167 [156–190] | 434 [400–465] |
    | 10,000 | 8 | 7 | 1 day | 158 [154–187] | 509 [504–563] |
    | 10,000 | 24 | 5 | 1 day | 178 [171–186] | 1,195 [1,155–1,334] |
    | 10,000 | 8 | 5 | 4 days | 165 [159–292] | 119 [116–176] |
    | 10,000 | 24 | 5 | 4 days | 165 [161–200] | 344 [331–449] |

  - Run 2, load 3.23 / 2.14 / 1.49 (MSYS), Windows CPU 35% before and 69% after, because other agents were running. Times ran about 5–10% higher:

    | Settlements | k | Tradable goods | Trade every | Local | Trade |
    |---|---|---|---|---|---|
    | 1,000 | 8 | 4 | 1 day | 163 [153–198] | 335 [323–402] |
    | 1,000 | 8 | 4 | 7 days | 163 [157–168] | 55 [53–60] |
    | 1,000 | 24 | 4 | 7 days | 163 [157–168] | 146 [138–156] |
    | 10,000 | 8 | 4 | 1 day | 176 [166–193] | 375 [359–411] |
    | 10,000 | 8 | 4 | 7 days | 166 [161–203] | 69 [62–89] |
    | 10,000 | 24 | 4 | 7 days | 178 [162–228] | 192 [174–259] |

- Trade costs about 9–12 ns per edge per tradable good here (computed from the daily k = 8 rows), about 17–22 ns on the RM. Round 5 measured 20–60 ns per edge for one flow type in JS on the RM ([compute notes, §5](../../round-5-performance/notes/compute.md)).
- Memory: the prototype's goods state is 276 B per settlement, with Float64 stocks, natural stocks and money. The k = 8 CSR arrays add 61 B. The trade plan is transient scratch of 4 B per edge per tradable good.
- Save size for 10,000 settlements after 400 days — [results/save-size.txt](../prototypes/resources/results/save-size.txt):
  - Int32 stocks and prices plus five resource numbers: 840,000 B raw, 243,840 B gzip;
  - prices as Uint16 per-mille of base: 680,000 B raw, 227,500 B gzip.

**Price and cost references**

- Lengnick's band rule (reprice when inventory leaves 0.25–1.0 months of demand; prices within 1.025–1.15 × marginal cost) and city shop markups of 1.36–1.50 over wholesale — [round 2 notes, KQ3 and KQ6](../../round-2-follow-up/notes/economy-calibration.md) (opened in round 2).
- US farms received 11.8 cents per food dollar in 2024, and 12.1 in 2023 — [USDA ERS Charts of Note 114074](https://ers.usda.gov/data-products/charts-of-note/114074) (opened). For food at home the farm share is 18.5 cents and for food away from home 7.1 — [ERS chart 114103](https://www.ers.usda.gov/data-products/charts-of-note/114103) (search summary).
- Diocletian's Edict (301 CE) capped wheat at 100 denarii per castrensis modius of 12.936 litres and a baker's wage at 50 denarii a day. Allen's bread equation: bread price per kg = 0.063 + 1.226 × wheat price per litre + 0.014 × skilled daily wage, in grams of silver — [Allen, in Quantifying the Roman Economy](https://www.nuffield.ox.ac.uk/Users/Allen/diocletian-2.pdf) (opened).
- Roman freight costs per kg of wheat per km: sea 0.00067 denarii, downriver 0.0034, upriver 0.0068, wagon 0.035, donkey 0.028. That is a ratio of 1 (sea) : 5 (downriver) / 10 (upriver) : 52 (wagon). Early 18th-century England ran 1 : 5 : 23 — [Scheidel, The shape of the Roman world](https://orbis.stanford.edu/assets/Scheidel_59.pdf) and [ORBIS v1 paper](https://orbis.stanford.edu/orbis2012/ORBIS_v1paper_20120501.pdf) (opened).
- US freight revenue per ton-mile: truck 16.54 cents (2007), Class I rail 4.05 (2014), barge 1.83 (2005) — [BTS National Transportation Statistics, Table 3-21](https://www.bts.gov/archive/publications/national_transportation_statistics/table_03_21) (search summary; years differ).
- Von Thünen's rings place intensive farming and dairy nearest the market, then forest products, then field crops, then ranching — [JASSS, Sasaki & Box 2003](https://jasss.soc.surrey.ac.uk/6/2/9.html) (search summary).

### Inferences

**State layout (country tier, M7)**

- Goods: `stock[s·8 + g]` as Int32 units and `price[s·8 + g]` as Int32 cents per unit.
- Natural stocks: fish biomass, forest volume and ore reserve as integer-valued Float64, like money, because large forests exceed 2^31 units. Capacities K and initial ore come from the map and need not be saved.
- Also per settlement: standing crop (Int32), fertility (Q16), this year's weather factor (Q16), and workers by sector (8 × Int32, extending the ledger's people-by-state).
- Total persistent addition: about 30 numbers and 130 B (16 × 4 B goods, 3 × 4 B crop, fertility and weather, 3 × 8 B natural stocks, 8 × 4 B workers). The ledger grows from 30–80 to about 60–110 numbers and stays inside the 1 KB per-settlement cap.
- Units: grain and fresh food in kg, timber in 0.1 m³, stone in 0.1 t, metal in kg, fuel in 10 MJ-equivalent, wares in "items", services in person-hours. Choose units so daily per-capita demand is a small integer.

**Recipes (M2, M3 and M7)**

- A recipe is a fixed tuple: up to two inputs with counts, one output with a count, and worker-days per batch. Batches = min(worker capacity, ⌊stock₁/n₁⌋, ⌊stock₂/n₂⌋). All integer.
- Starting set (illustrative, to tune): fuel = 1 timber → 3 fuel; wares = 1 metal + 2 timber → 4 wares; dwelling = 40 timber + 60 stone + 200 worker-days → 1 dwelling.
- Grain and fresh food reach households through shops, whose labour and markup stand in for milling and baking. Allen's equation shows bread costs about 1.2 × its wheat plus a little labour. US farms get 12–19 cents per retail food dollar.

**Prices**

- **City (M2/M3):** each firm posts a price per good it sells, Lengnick-style. The plan's wholesale call auction runs once per tradable good (at most seven; services never).
- **Settlement (M7):** a band rule per good. Raise the price about 1.5% when stock falls below 75% of target; lower it 1.5% above 125%. Clamp to 25–175% of base, as Victoria 3 does. Target = demand × cover days.
- **Seasonal staples:** target = demand × days to the next harvest, plus a carrying-cost drift of 1.5–3% a month. The seasonal gap then lands near carry × 11 months: 33% (maize-like) at 3.0%/month and 17% (rice-like) at 1.5%/month (computed). Integrated markets should show 2.5–3 times less (Gilbert et al.).
- A fixed days-of-cover target would swing staple prices between the clamps every year, since stock jumps to a year's supply at harvest (inference from the prototype's design).

**Trade (M7)**

- Keep round 4's margin-driven rule per good on the CSR graph: margin = p_j(1 − loss·d) − p_i − τ_g·m_e·d. Here τ_g is cents per unit-km for good g and m_e the edge's mode factor.
- Mode factors: road 23–52, river 5–10, sea 1 (premodern). Modern truck : rail : barge is about 9 : 2.2 : 1 (search summary).
- **Grain is local by road.** Wheat at 100 denarii per 12.936 L is about 10 denarii per kg, assuming 0.77 kg/L (unsourced density). Its price then doubles after about 290 km by wagon, 1,500 km upriver, 3,000 km downriver and 15,000 km by sea (computed). Metal and wares carry far more value per kg, so they travel much further.
- **What trades:**
  - grain, timber, metal and wares trade on every edge;
  - fuel trades optionally;
  - fresh food trades only on edges under one day's travel (hand-off to food quality);
  - stone trades only on adjacent edges, or never;
  - services never trade, as in Victoria 3; commuting already moves service demand.
- **Cadence.** Run trade on weekly market days, round-robin so 1/7 of settlements trade each day. That matches Skinner's 2–10-day periodic markets (round 4). Plan from a snapshot, then apply in fixed edge order.
- **Why weekly.** Daily trade with 4–5 goods would cost 0.62–0.81 µs RM per settlement-day (computed from 335–437 ns). That alone nearly equals round 5's whole settlement model.
- **Spatial pattern.** Distance cost by good should produce von Thünen-like rings around towns: fresh food and fuel nearby, grain further out, ore and timber where the map puts them. That gives the country map a readable pattern for free (inference).

**Budget arithmetic (computed from measured numbers, × 1.85 to the RM)**

| Configuration | Extra per settlement-day, RM | 1k settlements | 10k settlements |
|---|---|---|---|
| Round 5 baseline (cohorts + 8-neighbour flows, JS) | 0.76–1.04 µs | 0.76–1.04 ms | 7.6–10.4 ms |
| + daily goods step + daily trade, 4 goods | +0.90–1.04 µs | 1.7–2.1 ms (over 1.5) | 17–21 ms (over 12) |
| + weekly goods step + weekly trade, 4 goods, k = 8 | +0.14–0.18 µs | 0.90–1.22 ms (fits) | 9.0–12.2 ms (at the limit in JS) |
| Same with WASM (round 5 measured 1.7–2.5× on the settlement model) | about +0.06–0.11 µs | fits | fits with slack |

- The local goods step could replace round 5's single-food logic rather than sit on top, which would lower these totals (inference).
- The save target in M6 ("10,000 settlement ledgers under about 0.3 MB gzip") cannot hold with goods. Plan for about 0.5 MB, or quantise further. Hand-off to the cost question.
- **Town tier (M3).** A firm's recipe is a few integer operations a day. 1,000 firms should cost tens of microseconds per day boundary, far below the 1.2 ms a tick for other agent systems (inference from the settlement kernel). Household inventories of 8 goods as Int16 add 16 B per agent, or 160 KB at 10k agents (computed). The integrated cost prototype should confirm both.

### Gaps

- No browser (Chromium, Firefox, WebKit) or WASM timing was taken; the 1.85× scale to the RM rests on one kernel and different Node versions.
- No farm share of food spending for low-income countries was found, only the US figure.
- Modern freight cost ratios are search summaries from different years.
- The prototype's production parameters are uncalibrated: at day 720 its unmet demand was 62% for fresh food and 100% for metal. Costs do not depend on these numbers, but behaviour does.

---

## Recommendation for the plan

**Mechanics, with numbers**

1. **Eight goods** — grain, fresh food, timber, stone, metal, fuel, wares and services — plus dwellings as a built stock. Grain, timber, metal and wares trade between settlements; fresh food only on short edges; stone and services stay local.
2. **Four natural stocks per settlement:** soil fertility (floor 0.35–0.45), fish biomass (Schaefer, r 0.2–0.8, depensation below K/4), forest volume (logistic, r 0.06–0.09) and an ore reserve (40–200 years at start-up output, falling grade).
3. **One harvest a year** over 30–45 days (two on irrigated rice land), scaled by fertility and a keyed weather draw. SD 0.13–0.22, clamp 0.2–1.6, with a regional plus a local component.
4. **Integer recipes:** at most two inputs, one output and worker-days per batch.
5. **Prices:**
   - city firms post Lengnick prices per good;
   - settlements use a band rule (±1.5% a step outside 75–125% of target) clamped to 25–175% of base;
   - seasonal staples target days-to-harvest and drift 1.5–3% a month.
6. **Trade** is margin-driven per good on the CSR graph, on weekly round-robin market days. Mode factors are sea 1 : river 5–10 : road 23–52.
7. **Development presets** set productivity per worker. Food shares must land near 45 / 33 / 19 / 9% of consumption, falling about 7.8 points per doubling of income.

**Draft plan tasks**

*M2 Economy*

- [ ] Give every firm one of eight sectors (grain, fresh food, timber, stone, metal, fuel, wares, services) and an integer recipe: up to two inputs, one output and worker-days per batch (R6).
- [ ] Run the wholesale call auction once per tradable good, never for services, and log unmet demand per good for the needs system (R6).
- [ ] Seed household baskets per good from ICP 2021 shares by development preset (food 45 / 33 / 19 / 9% of consumption) with the Stone–Geary recipe (R6).

*M3 City life*

- [ ] Add LDtk workplace entities per sector (farm, pasture or dock, lumber camp, quarry, mine, fuel works, workshop) with worker capacity; services use the clinic, school, shop and market (R6).
- [ ] Add the grain season: crops accrue daily and are harvested over 30–45 days once a year, scaled by Q16 soil fertility and a keyed weather draw with SD 0.13–0.22 (R6).
- [ ] Show production through places only: stock pips on workplaces, and field, forest and dock tiles that empty and regrow. Use at most four or five removable job items, none of them black (R6).

*M5 Society and policy*

- [ ] Add development presets that set productivity per sector from World Bank 2023 bands (0.7 / 1.5 / 4.4 / 47 t of cereal per farm worker a year). Check that the food share falls about 7.8 points per doubling of income (R6).
- [ ] Add resource sliders with predicted sizes: fishing effort (stocks collapse above 0.75 r), logging quota (forest recovery 70–85 years), manure or fertiliser (unfertilised yield floor 0.35–0.45 of manured) (R6).

*M7 Country of ledgers*

- [ ] Extend the settlement store with eight Int32 goods stocks and prices, a standing crop, Q16 fertility and weather factor, fish, forest and ore stocks as integer-valued Float64, and workers by sector: about 30 numbers and 130 B (R6).
- [ ] Step goods weekly, round-robin over seven days. Order: extraction with logistic regrowth (Q24 daily rates, CMSY depensation below K/4), recipes, consumption, decay, then band prices clamped to 25–175% of base (R6).
- [ ] For storable seasonal goods, set the target stock to demand × days until the next harvest and add a carrying-cost drift of 1.5–3% a month (R6).
- [ ] Trade grain, timber, metal and wares on weekly market days along the CSR graph. Use per-good transport cost per unit-km with mode factors (sea 1 : river 5–10 : road 23–52); send fresh food only on edges under a day's travel (R6).
- [ ] Add goods tests to the country CI suite:
  - the goods identity per good, exact every day;
  - the fishery MSY check (catch at u = r/2 within 0.1% of rK/4);
  - the seasonal gap at 17–33% in isolated villages and 2.5–3 times lower in integrated markets;
  - a grain price that doubles at about 290 km by road (R6).
- [ ] Re-budget the country day with the goods layer, which adds about 0.14–0.18 µs RM per settlement-day in JS. Port it to WASM with the settlement model, and raise the 10,000-ledger save target from 0.3 to about 0.5 MB gzip (R6).

*M8 Country map*

- [ ] Add goods map modes: main product per settlement (eight classes, icon plus colour, never colour alone), the price of a chosen good, days of stock, and resource health (fish B/K, forest V/K, ore left) (R6).

**Verify before hard-coding**

| Figure or question | Decides | Milestone |
|---|---|---|
| Household energy share of spending by income level (ICP does not split it) | Fuel demand per capita | M2 |
| Livestock and garden output per worker | Fresh-food productivity | M3 |
| Village-scale yield variance and how weather shocks correlate across a region | Weather draw SD and regional component | M3, M7 |
| How fast fertility rebuilds under manure or fallow | Fertility recovery rate | M5 |
| Farm share of food spending outside the US | The retail chain for low-income presets | M2 |
| Goods-layer timings in Chromium, Firefox and WebKit, and in WASM | Whether 10k settlements fit 12 ms | M7 |
| Whether novices can read eight goods icons on the country map | Goods count and map modes | M8 |
