# Food quality and expiry: real shelf lives, loss and waste, quality, game prior art and an integer design (round 6, question 2)

Researched 5 Oct 2026. The question: how food quality and expiry should work in Nomos, close to real life but legible and cheap.

Read this first.

- **Access.** Most sources opened this round. FAO, UNEP's press pages, FDA, WHO, USDA ERS PDFs, WRAP and most game wikis were reachable. USDA FSIS and foodsafety.gov (the official FoodKeeper files), CDC, PMC, MDPI, the Victoria 3 wiki and the Paradox forum were blocked (HTTP 403 or a JavaScript challenge). Banished's Fandom and wiki.gg pages were also blocked.
- **FoodKeeper data.** The official FSIS JSON and XLS were blocked, so I read two GitHub copies of the same public-domain dataset and checked they agree:
  - [jelera/food-shelflife-db `lib/seeds/ingredients.csv` @ a7bf41f (2019, official column names, 661 records)](https://github.com/jelera/food-shelflife-db/blob/a7bf41f2a07823039e9169b538f0c42a29336eb7/lib/seeds/ingredients.csv);
  - [jimmylee719/food-storage-guide `src/data/base/foodkeeper.json` @ f886a05 (2026-09-23, converted from FSIS "FMA-Data-v128", 661 records)](https://github.com/jimmylee719/food-storage-guide/blob/f886a050640bfc80e2d5f329ef767a456dec379a/src/data/base/foodkeeper.json).
  - Every item I cross-checked had the same values in both. The data catalogue entry is [data.gov FSIS FoodKeeper Data](https://catalog.data.gov/dataset/fsis-foodkeeper-data) (opened; it links to the blocked FSIS files).
- **Labels.** "opened" means I read the page or file myself; for long PDFs I name the sections read. "search summary" means I saw it only in a search result. "computed" means I derived it from opened data. "measured here" means I ran it. "inference" is my reasoning.
- **Prototypes** (throwaway, in `../prototypes/food/`):
  - `foodkeeper_summary.py` summarises FoodKeeper by category. The data file stays outside the repo and is passed as an argument.
  - `aging_compare.mjs` compares exact first-expiry-first-out (FEFO) lots with age-band ("Erlang") aggregates.
  - `ledger_ring.mjs` tests and times a 6-slot settlement food ring and dated harvest cohorts.
- **Time units.** One sim day equals one real day of shelf life. The plan has not fixed a calendar: M2 uses 21-day months, while the round-4 tests used 365-day years. Shelf lives below are in days, whatever the calendar.

---

## a) Real shelf lives by food category, and a small Nomos category set

### Takeaway

- Real shelf lives span four orders of magnitude, with three tiers in practice:
  - **same day** without cooling: fresh meat, fish and dairy, since the FDA says to refrigerate within 2 hours, or 1 hour above 90 °F (32 °C);
  - **days to two weeks** with cooling;
  - **6 months to 5 years** for dry, preserved and canned food.
- In FoodKeeper, fresh meat keeps a median 1–2 days in the fridge, and 3–5 days for roasts and steaks. It keeps 122–365 days frozen. Fish keeps 1–2 days chilled.
- Cooling helps meat, fish and dairy enormously but helps produce little. FoodKeeper's produce medians are 7–14 days chilled against 10–61 days at room temperature for hardy items. Potatoes even keep worse in the fridge (7–14 days) than in the pantry (30–61 days).
- Storage therefore needs a table of days per category and storage tier. A single global "fridge ×2" multiplier does not fit the data.
- **Proposal: six categories,** each with (fresh-until, use-by) days at ambient, cool and frozen storage (table in the Inferences). Fresh protein and dairy are "same day" at ambient; grain and preserved food keep 180 / 365 days anywhere.

### Cited Findings

- **FoodKeeper category medians** (max bound, days; pantry / fridge / freezer) — computed with `foodkeeper_summary.py` from the jelera CSV above:
  - Bakery 6 / 91 / 91;
  - Grains, beans and pasta 182 / 42 / 243;
  - Dairy and eggs 730 (4 shelf-stable items) / 14 / 122;
  - Fresh meat — / 5 / 365; fresh poultry — / 2 / 274; fresh seafood — / 2 / 243;
  - Fresh fruits 6 / 7 / 365; fresh vegetables 14 / 10 / 365;
  - Smoked seafood — / 45 / 365;
  - Shelf-stable foods 365 / 365 / 486.
- **FoodKeeper items** (days; pantry | fridge | freezer) — opened in both copies:
  - Flour, white 182–365 | – | –; flour, whole wheat 91–182; rice, white 730; rice, brown 365; dried beans 365–730; dry pasta 730.
  - Commercial bread 14–18 | 14–21 after opening | 91–152. Homemade bread 3–5 at room temperature (v128 copy).
  - Apples 21 | 28–42 | 243; bananas ripen at room temperature, then 3 days in the fridge; potatoes 30–61 | 7–14 | 304–365; onions 30 | 61.
  - Iceberg or romaine lettuce – | 7–14; leaf lettuce and spinach – | 3–7; carrots – | 14–21; cherry tomatoes 10 | 5.
  - Milk: refrigerate to the "package use-by date" with no day count; freezer 91 days. Ultra-pasteurised milk 1–3 months chilled; shelf-stable milk 6–12 months in the pantry.
  - Eggs in shell – | 21–35; yogurt – | 7–14; hard cheese – | 182 | 182; butter – | 30–61 | 182–274.
  - Ground beef – | 1–2 | 91–122; beef and pork roasts and chops – | 3–5 | 122–365; whole chicken – | 1–2 | 365.
  - Lean fish – | 1–2 | 122–243; fatty fish – | 1–2 | 61–91.
  - Commercial jerky 365 | – | –; hard dry sausage, sliced – | 14–21; hot-smoked fish, vacuum pack – | 14–45 | 182–365; pickles 365.
  - Canned goods, high acid 365–547; canned goods, low acid 730–1825. Both keep only 3–7 days chilled after opening. FoodKeeper notes that cans stay safe past their date if they show no dents, rust or swelling.
- **FDA Refrigerator & Freezer Storage Chart** (March 2018), at 40 °F (4 °C) and 0 °F (−18 °C) — [FDA PDF](https://www.fda.gov/media/74435/download) (opened):
  - steaks, chops and roasts 3–5 days chilled, 4–12 months frozen;
  - hamburger and ground meats 1–2 days, 3–4 months;
  - poultry 1–2 days, 9–12 months;
  - lean fish 1–2 days, 6–8 months; fatty fish 1–2 days, 2–3 months; smoked fish 14 days, 2 months;
  - eggs 3–5 weeks chilled, do not freeze; bacon 7 days, 1 month;
  - the chart says freezing at 0 °F "keeps food safe indefinitely", so frozen times are for quality only.
- **FDA safe food handling:** "Refrigerate or freeze meat, poultry, eggs, seafood, and other perishables within 2 hours of cooking or purchasing", and "within 1 hour if the temperature outside is above 90° F" — [FDA](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling) (opened).
- **Roots in hot climates:** cassava "is the most perishable of roots and tubers and can deteriorate within two or three days after harvesting". Potatoes "require careful handling and proper storage" in warm, humid climates — [FAO, SOFA 2019, ch. 1](https://www.fao.org/3/ca6030en/ca6030en.pdf) (opened, chapters 1–2 read).
- **Proposed Nomos categories, from matched FoodKeeper items** (median of each item's min and max bound, days; range across items) — computed:
  - Grain (9 items): ambient 365 / 365 [91–730]; frozen 243 (1 item).
  - Bread (2 items): ambient 8 / 12 [3–18]; frozen 91 / 152.
  - Produce (15 items): ambient 21 / 21 [10–61] for the 5 hardy items listed at room temperature; cool 7 / 14 [3–61]; frozen 304 / 365.
  - Dairy and eggs (7 items): cool 14 / 14 [3–182]; frozen 122 / 122.
  - Fresh meat (7 items): cool 1 / 2 [1–5]; frozen 122 / 365.
  - Fresh fish (5 items): cool 1 / 2 [1–3]; frozen 182 / 243.
  - Preserved (8 items): ambient 365 / 365 [182–365]; cool, for smoked fish and sliced sausage, 14 / 26 [7–45].
  - Canned (5 items): ambient 730 / 1825 [365–1825].

### Inferences

**Proposed categories and shelf-life table** (sim days, as "fresh-until / use-by"):

| Category (one glyph each) | Real items | Ambient (no cooling) | Cool (fridge, cellar) | Frozen | Basis |
|---|---|---|---|---|---|
| Grain | flour, rice, oats, dried pulses, pasta | 180 / 365 | 180 / 365 | 180 / 365 | FoodKeeper items 91–730 days at room temperature |
| Bread | bread, buns, flatbread | 2 / 4 | 7 / 14 | 60 / 90 | homemade 3–5 days; 14–21 days chilled after opening; 91–152 days frozen |
| Produce | fruit, vegetables, roots | 4 / 7 | 7 / 14 | 240 / 365 | chilled medians 7 / 14; frozen 304 / 365; soft produce 3–7 days |
| Dairy | milk, yogurt, cheese, eggs | 0 / 0 | 7 / 14 | 90 / 120 | FDA 2-hour rule; chilled median 14; frozen median 122 |
| Fresh protein | meat, poultry, fish | 0 / 0 | 1 / 3 | 90 / 240 | FDA 2-hour rule; chilled 1–2 days (roasts 3–5); frozen 61–365 |
| Preserved | jerky, salted, smoked, pickled, canned | 180 / 365 | 180 / 365 | 180 / 365 | jerky and pickles 365; high-acid cans 365–547; low-acid cans 730–1825 |

- **"0 / 0" means "eat it today".** A lot whose use-by day has passed is removed at the next day boundary, so ambient fresh protein and dairy last only the day they are bought. That is the 2-hour rule at day resolution.
- **Two numbers per cell** follow FoodKeeper's own min–max ranges and Project Zomboid's "fresh days / rotten days" (section d). The gap between them is the **stale** window.
- **Storage barely matters for grain and preserved food.** Their risk is pests and damp, so model a small physical loss in poor storage instead (section e).
- **Why six categories, not eight.** Six fit six legible 16×16 glyphs. They also map onto Banished's four groups and the plan's existing "bread" bubble. The cost prototype's 3-bit category field holds eight, so two splits remain available:
  - Fresh protein into meat (cool 1 / 3, frozen 120 / 365) and fish (cool 1 / 2, frozen 90 / 240);
  - Preserved into preserved (180 / 365) and canned (365 / 730).
- **Preserving is a recipe, not a storage tier.** Turning meat into jerky moves 0–3 days of life to 365 days. That is a job for the resources and production researcher (hand-off).
- **Use real day counts even if the calendar is compressed.** A 3-day meat life must stay legible next to a daily meal cycle. If years become 252 days, grain still lasts 365 days, about 1.4 sim years.

### Gaps

- The official FSIS FoodKeeper files could not be opened. The values come from two GitHub copies, which agree with each other and with the FDA chart where they overlap. Verify against FSIS before hard-coding.
- FoodKeeper gives no day count for pasteurised milk ("package use-by date"). Dairy therefore relies on yogurt, buttermilk, eggs and cheese. The widely quoted "about 1 week after opening" figure was not sourced this round.
- No primary source was opened for pre-refrigeration shelf lives (cellars, salting and drying in traditional settings) beyond FoodKeeper's preserved items and FAO's cassava remark.
- The "Bread / homemade" row has odd chilled values (61–91 days), so I did not use it for the cool column.

---

## b) Loss and waste along the chain, and the baseline spoil share for Nomos

### Takeaway

- **Before retail (farm to wholesale):** 13.3% of food was lost globally in 2023 (13.0% in 2015). The rate was 10.0% in Northern America and Europe and 23.0% in sub-Saharan Africa. By food group: fruit and vegetables 25.4%, meat and animal products 14.0%, roots and tubers 12.3%, cereals and pulses 8.4% (FAO, opened).
- **Retail, food service and households:** 1.05 billion tonnes, 19% of food available to consumers, in 2022. Households made 60% of it (79 kg per person a year), food service 28% and retail 12% (UNEP Food Waste Index 2024, opened).
  - As shares of food available to consumers, that is about 11.4% household, 5.3% food service and 2.3% retail (computed).
  - The 2024 edition is still the latest (search summary).
- **Spoilage is only part of waste.** UK households waste about 15% of the food they buy by weight. About 73% of that is edible, and about 39% of the edible part is thrown away because it was "not used in time" (looked or smelled off, or past its date). Spoiled-before-eaten food is therefore about **4.3% of household purchases** (computed from WRAP, opened). UK retail waste is only 0.44% of food handled.
- **Recommended Nomos baseline** in a city with fridges:
  - households 3–6% of purchased portions spoil uneaten;
  - shops 0.5–3% of throughput, with perishables 4–10% and staples under 1%;
  - pre-retail and trade losses 10% (rich) to 23% (poor), only once the country layer models farms and trade.
  - None of these should be imposed. They are calibration targets that emerge from shelf lives, stocking and FEFO.

### Cited Findings

- **FAO Food Loss Index, SDG 12.3.1a** — [FAO SDG data portal](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses/en) (opened; checked in the page text):
  - "The percentage of food lost globally after harvest on farm, transport, storage, wholesale and processing levels is estimated at 13.3 percent in 2023, up slightly from 13.0 percent in 2015";
  - Northern America and Europe 10.0% (9.4% in 2015); sub-Saharan Africa 23.0% (22.1%); Eastern and South-eastern Asia 13.9%; least developed countries 19.9%; small island developing states 19.0%;
  - fruit and vegetables 25.4% (23.2% in 2015); meat and animal products 14.0% (13.9%); roots, tubers and oil-bearing crops 12.3% (12.6%); cereals and pulses 8.4% (8.5%).
- **SOFA 2019** — [FAO PDF](https://www.fao.org/3/ca6030en/ca6030en.pdf) (opened, chapters 1–2):
  - first FLI estimate: 13.8% lost in 2016 "from the farm up to, but excluding, the retail stage"; regional range 5–6% (Australia and New Zealand) to 20–21% (Central and Southern Asia);
  - the 2011 FAO study's "roughly one-third" covered the whole chain and is "not directly comparable" with the FLI;
  - storage losses of cereals: sub-Saharan Africa median about 7%, maximum 22.5% excluding outliers; India under 2%; Eastern and South-eastern Asia 0.3–15%;
  - more than 1,000 APHLIS data points gave the same 2.7% storage loss for more than 30 countries;
  - retail waste of fruit and vegetables: 0–15% in all regions except sub-Saharan Africa (up to 35%); median 3.75% in Northern America and Europe;
  - "10 percent of all food in the United States of America is wasted in-store";
  - consumer waste in Northern America and Europe: animal products 14–37%, fruit and vegetables 9–20%;
  - US consumer waste in 2010 was USD 370 per person, "9 percent of average per capita food expenditure".
- **FAO 2011, *Global food losses and food waste*, Annex 4** (Gustavsson et al.; loss as % of what enters each step) — [FAO PDF](https://www.fao.org/4/mb060e/mb060e.pdf) (opened, Annex 4):

  | Europe incl. Russia | Distribution (retail) | Consumption |
  |---|---|---|
  | Cereals | 2% | 25% |
  | Roots and tubers | 7% | 17% |
  | Fruit and vegetables | 10% | 19% |
  | Meat | 4% | 11% |
  | Fish and seafood | 9% | 11% |
  | Milk | 0.5% | 7% |

  - North America and Oceania consumption waste: cereals 27%, fruit and vegetables 28%, fish 33%, milk 15%, meat 11%.
  - Sub-Saharan Africa consumption waste: 1–5%; its distribution losses run up to 17% for fruit and vegetables and 15% for fish.
- **USDA ERS EIB-121, Table 1** (US 2010; loss = all reasons, including cooking and plate waste) — [ERS PDF](https://ers.usda.gov/sites/default/files/_laserfiche/publications/43833/43680_eib121.pdf) (opened):
  - retail 10% and consumer 21% of the 430 billion lb supply, 31% in total;
  - grain products 12% / 19%; fresh fruit 12% / 25%; fresh vegetables 10% / 24%; processed fruit 6% / 11%; processed vegetables 6% / 18%;
  - fluid milk 12% / 20%; meat 4% / 23%; poultry 4% / 18%; fish and seafood 8% / 31%; eggs 7% / 21%.
  - The fresh and processed rows were scrambled in text extraction. I re-aligned them by checking that each pair sums to its parent row, e.g. 37.6 + 26.7 = 64.3 billion lb of fruit (computed).
- **UNEP Food Waste Index Report 2024, key messages** — [mirror of the UNEP key messages PDF](https://www.developmentaid.org/api/frontend/cms/file/2022/06/Food-Waste-Index-2024-key-messages.pdf) (opened; the UNEP repository copy sits behind a captcha) and [UNEP press release, 27 Mar 2024](https://www.unep.org/news-and-stories/press-release/world-squanders-over-1-billion-meals-day-un-report) (opened):
  - 1.05 billion tonnes in 2022, including inedible parts; 132 kg per person; "one fifth (19 per cent) of food available to consumers";
  - households 631 Mt (60%), food service 290 Mt, retail 131 Mt; 79 kg per person in households;
  - high-, upper-middle- and lower-middle-income countries differ in household waste by "just 7 kg/capita/year";
  - "Hotter countries appear to have more food waste per capita in households, potentially due to … lack of robust cold chain";
  - rural areas generally waste less, possibly because scraps go to pets, animal feed and home compost.
- **UNEP per-person split:** food service about 36 kg and retail about 16 kg per person, computed from the tonnage shares and 79 kg. A search summary gives 36 kg and 17 kg.
- **No newer UNEP edition** than 2024 was found as of October 2026 — search summary.
- **WRAP, *UK Food Waste and Food Surplus — Key Facts*, updated July 2025** — [WRAP PDF](https://www.wrap.ngo/sites/default/files/2025-06/WRAP-UK-Food-Waste-and-Food-Surplus-Key-Facts-July-2025-v5.pdf) (opened):
  - UK food waste is 10.2 Mt: households 58%, on-farm 16%, manufacturing 13%, hospitality and food service 11%, retail 2%;
  - waste as a share of food purchased is about 15% for households and 18% for hospitality and food service; manufacturing 3.8% of food handled; **retail 0.44%**;
  - 73% of post-farm waste is edible; households waste 4.36 Mt of edible food;
  - edible household waste per person is 65 kg a year (about 5 kg a month).
  - Reasons for discarding edible household food in 2022 (Table 8). The columns were scrambled in extraction; I re-aligned them because the rows sum to 4.36 Mt:
    - smelled or looked off 953 kt (22%);
    - past the date on the label 758 kt (17%);
    - personal preference 977 kt (22%);
    - cooked, prepared or served too much 1,094 kt (25%);
    - other 579 kt (13%).
  - By food group: fresh vegetables and salad 28%, meals 12%, bakery 11%, dairy and eggs 9%, fresh fruit 8%, meat and fish 6%.

### Inferences

- **"Not used in time" is the part Nomos should simulate.** It is 953 + 758 = 1,711 kt, 39.2% of edible household waste (computed). Plate waste and personal preference ("served too much", "did not like it") are behaviours, not spoilage. Inedible parts (27%) are not food in the sim.
- **Household spoilage target:** about 15% × 72.7% × 39.2% ≈ 4.3% of purchases (computed; the weight bases differ slightly). With cool storage, use a band of **3–6%** of purchased portions.
- **Shop spoilage target: 0.5–3% of throughput.** UK retail is 0.44%. UNEP's retail share is about 2.3% of food available. FAO 2011 European distribution losses run 0.5% (milk) to 10% (fruit and vegetables). US ERS's 10% includes all retail loss, not only spoilage.
- **The whole chain.** Combining the FAO and UNEP shares, about 1 − (1 − 13.3%)(1 − 19%) ≈ 30% of food produced is lost or wasted (computed). That matches the 2011 study's "one third". Most of it is outside what agents in a town would see.
- **No cold storage multiplies spoilage.** Ambient dairy and fresh protein last only a day. With weekly markets and no substitution between categories, the `ledger_ring.mjs` test wasted 22–32% of perishables (section e, measured here). That matches the sub-Saharan Africa versus Northern America and Europe gap of 23.0% vs 10.0% in direction, though not by construction.
- **Pre-retail loss for the country layer:** apply FAO's group rates (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%). Scale them by a settlement cold-chain factor between 0.75 (10.0 / 13.3, rich) and 1.73 (23.0 / 13.3, poor) (computed).

### Gaps

- The full UNEP 2024 report (country table, sector methods) was behind a captcha. Only the key messages and the press release were read.
- No source split household waste into "not used in time" outside the UK. The 39% may differ in hotter or poorer countries.
- FAO 2011 Annex 4 percentages are "estimated/assumed" by the authors. SOFA 2019 says they are not comparable with the FLI.

---

## c) Quality dimensions: freshness, nutrition, staple versus luxury, variety, and their effects on price, health, satisfaction and food insecurity

### Takeaway

- **Freshness works in three legible stages:** fresh, then stale (cheaper, slightly worse), then spoiled (removed). Prices really do fall with age. In one Brazilian market, unsold fish lost 25% of its price after the first day and a further 33% after two days, ending at about 50% of the original (opened; computed). Dynamic markdowns cut grocery waste by 21% in Sanders' 2023 estimate (search summary).
- **Staple versus luxury follows income elasticities** (USDA ERS, opened):
  - in the US, cereals −0.085, fruit and vegetables 0.210, fish 0.260, meats 0.343 and dairy 0.354;
  - in Ethiopia, cereals 0.622, meats 0.820 and dairy 0.848.
  - Grain and bread are the staple tier, while meat, fish and dairy rise with income.
- **Variety is health:** FAO's MDD-W counts "at least five out of ten" food groups eaten the previous day. Banished uses four food groups for health. A Nomos weekly count of categories eaten (0–6) with "varied ≥ 4" is legible and costs one byte.
- **Food safety:** unsafe food causes about 866 million illnesses and 1.52 million deaths a year (WHO, 2021 data). That is about **1 illness per 10,000 meals** worldwide (computed), a usable base rate for food poisoning.
- **The FIES is the right food-insecurity metric:** 8 yes/no experience questions on a severity scale. Moderate or severe food insecurity was 25.8% of the world in 2025 and 8.7% in Northern America and Europe (FAO, opened). Nomos can tally the same 8 experiences per household from sim events.

### Cited Findings

- **Markdowns in practice:** "unsold fish was found to have a 25 percent price decrease at the end of the first day. Fish that remained unsold after two days saw the price cut by a further 33 percent" (Brazil). Ready-made foods "are often discarded at the end of the day or sold at a lower price" — [FAO, SOFA 2019, ch. 2](https://www.fao.org/3/ca6030en/ca6030en.pdf) (opened).
- **Sanders (2023), *Marketing Science*:** dynamic pricing cuts grocery waste by 21% while raising the chain's gross margin by 3% and consumer surplus by 0.3%. An organic-waste ban, simulated as a tenfold rise in disposal cost, cuts waste by only 4%. Fewer than 25% of US grocers use any dynamic pricing — [INFORMS](https://pubsonline.informs.org/doi/10.1287/mksc.2020.0214); [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2994426); [UCSD news](https://today.ucsd.edu/story/dynamic-pricing-could-cut-greenhouse-gas-emissions-from-landfills-far-more-than-organic-waste-bans) (search summary).
- **Tsiros & Heilman (2005), *Journal of Marketing* 69(2):114–129:** willingness to pay for perishables falls as the expiry date approaches. It varies by category with perceived risk — [Semantic Scholar record](https://www.semanticscholar.org/paper/The-Effect-of-Expiration-Dates-on-the-Purchasing-Tsiros-Heilman/6d699645f2c35c630a50609986045f3bcfec0417) (search summary; no slope values retrieved).
- **Discounted sales of expiring perishables** (Winkelmann et al., arXiv 2602.04464, Feb 2026): 1,705 SKUs in 676 German stores over 92 days in 2024. About 3% of entries were discounted sales of dairy, cheese and meat, and demand during discounts was underestimated for 92.2% of SKUs. No discount depths are given — [arXiv](https://arxiv.org/html/2602.04464) (opened via fetch summary).
- **Income (expenditure) elasticities of food subcategories, 2005** — [USDA ERS TB-1929, Appendix table 5](https://www.ers.usda.gov/sites/default/files/_laserfiche/publications/47579/7637_tb1929.pdf) (opened):

  | Country | Cereals | Fruit & veg | Fish | Meats | Dairy |
  |---|---|---|---|---|---|
  | United States | −0.085 | 0.210 | 0.260 | 0.343 | 0.354 |
  | United Kingdom | −0.015 | 0.292 | 0.351 | 0.458 | 0.473 |
  | Mexico | 0.184 | 0.441 | 0.506 | 0.640 | 0.661 |
  | India | 0.535 | 0.623 | 0.660 | 0.775 | 0.801 |
  | Ethiopia | 0.622 | 0.684 | 0.713 | 0.820 | 0.848 |

  - The report's summary (search summary) adds that staple consumption changes least and higher-value items most, and that the income elasticity of food averages 0.78 in low-income countries, over 1.5 times the high-income average.
- **MDD-W:** "a dichotomous indicator of whether or not women 15 to 49 years of age have consumed at least five out of ten defined food groups the previous day or night". The groups:
  1. grains, white roots and tubers, and plantains;
  2. pulses;
  3. nuts and seeds;
  4. milk and milk products;
  5. meat, poultry and fish;
  6. eggs;
  7. dark green leafy vegetables;
  8. other vitamin A-rich fruits and vegetables;
  9. other vegetables;
  10. other fruits.
  - Source: [FAO 2021, *Minimum dietary diversity for women*](https://www.fao.org/3/cb3434en/cb3434en.pdf) (opened, section 1).
- **WHO food safety fact sheet:** "An estimated 866 million – almost 1 in 9 people in the world – fall ill after eating contaminated food and 1.52 million die every year". The estimates come from WHO's 2000–2021 burden estimates, published in 2026 — [WHO](https://www.who.int/news-room/fact-sheets/detail/food-safety) (opened).
- **FIES survey module.** Eight yes/no questions about the last 12 months or 30 days, each "because of a lack of money or other resources". Were you, or was there a time when you:
  1. worried about not having enough food;
  2. unable to eat healthy and nutritious food;
  3. ate only a few kinds of foods;
  4. had to skip a meal;
  5. ate less than you thought you should;
  6. ran out of food;
  7. were hungry but did not eat;
  8. went without eating for a whole day.
  - The items "should always be analyzed together, never as separate items" — [FAO FIES survey modules](https://www.fao.org/3/bl404e/bl404e.pdf) (opened).
- **FIES measures access**, one of four food-security dimensions. Its global reference scale comes from more than 140 countries in 2014–2016 — [FAO, About the FIES](https://www.fao.org/measuring-hunger/access-to-food/about-the-food-insecurity-experience-scale-(fies)/en) (opened).
- **SDG 2.1.2** (moderate or severe food insecurity by FIES) — [FAO SDG data portal](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/212-prevalence-of-moderate-or-severe-food-insecurity-in-the-population-based-on-the-food-insecurity-experience-scale/en) (opened):
  - 25.8% of the world (2.1 billion people) in 2025, down from 27.1% in 2024 and 28.7% in 2020;
  - Africa 56.6%, Asia 20.3%, Latin America and the Caribbean 22.9%, Northern America and Europe 8.7%;
  - consistently higher in rural than peri-urban areas, and lowest in urban areas.
  - The SOFI 2025 report gave 28.0% for 2024 (search summary); FAO's page now gives 27.1% for 2024, so the series was revised.

### Inferences

**Quality dimensions to model (each one byte or less):**

| Dimension | Values | Stored as | Effect |
|---|---|---|---|
| Freshness | fresh, stale, last day | derived from expiry, category and storage (no state) | price markdown, small mood penalty, poisoning risk |
| Grade (tier) | staple, standard, fine | 2 bits per lot | price, mood bonus; demand by wealth |
| Category | 6 (section a) | 3 bits per lot | variety; staple versus luxury |
| Variety | categories eaten in 7 days (0–6) | 6-bit mask per household, rolled weekly | health and mood |
| Food insecurity | FIES-style 8-item tally (0–8) | 1 byte per household, monthly | metric only, never a bubble |

- **Price.** posted price = base[cat] × grade% × fresh% in integer cents, with `floor` after each multiply.
  - Freshness: 100% fresh, **75% stale, 50% on the last day.** That is the Brazilian fish path (0.75 × 0.67 ≈ 0.50, computed) and a simple dynamic-markdown rule in the spirit of Sanders.
  - Grade multipliers 100 / 135 / 180% are a design choice. They resemble the cost prototype's `QUAL_PCT` and Stardew's 1 / 1.25 / 1.5 / 2 (section d).
- **Demand by tier.** Wealthier households should shift toward standard and fine grades and toward dairy and protein. Grain and bread demand should barely respond to income (the US cereal elasticity is about 0). This belongs to the wealth researcher's budget model (hand-off).
- **Health.** Base food poisoning about 0.01% per meal (WHO, computed). Suggested multipliers are inference, informed by RimWorld (section d):
  - stale food ×10, i.e. 0.1%;
  - spoiled food, eaten only by agents who are starving, 2%, close to RimWorld's 1–4% for raw food.
  - Variety: "varied" (≥ 4 of 6 categories a week) gives a small health or mood bonus; "monotonous" (≤ 2) gives a penalty. This mirrors MDD-W's "5 of 10" ratio and Banished's four groups.
- **Satisfaction** (hand-off to the happiness researcher; RimWorld's scale used only for relative sizes):
  - fine meal +5, standard +2, staple 0;
  - stale −2, last day −3, spoiled −10;
  - each meal effect lasts 1 day and does not stack.
- **FIES-style metric per household.** Map the 8 items to sim events in a 30-day window:
  1. pantry below 1 day of meals at a day boundary;
  2. stale or last-day food on 3 or more days in a week;
  3. variety ≤ 2 in a week;
  4. a scheduled meal missed for lack of food;
  5. fewer portions eaten than members needed;
  6. zero portions at a day boundary;
  7. hunger above threshold with no food and no money;
  8. a whole day without eating.
  - Report the share of households scoring **≥ 4 as "moderate or severe"** and **≥ 7 as "severe"**.
  - The calibration band for a default developed-country town is 5–15% (FAO: 8.7% in Northern America and Europe), and higher in poor villages.
- **Wealth must not show.** Meal grade and stale food are poverty signals. Under the art-direction rule "wealth never shows", keep grade and freshness out of bubbles. Show them only in the inspector, on stall stock pips and inside the opt-in wealth lens.

### Gaps

- No opened source gave willingness to pay as a function of days to expiry, so the 75% / 50% steps rest on one FAO anecdote plus design judgement.
- FAO turns FIES answers into prevalence with a Rasch model on a global reference scale. The raw-score cut-offs 4 and 7 above are my simplification and are not sourced.
- No quantitative source was opened linking diet variety to satisfaction, as opposed to micronutrient adequacy.
- CDC's US foodborne-illness page was blocked, so the poisoning base rate is global, not US.

---

## d) Game prior art: what players can read, and what to copy

### Takeaway

- **Copy Project Zomboid's two-number rule** (days fresh, days until rotten). Fresh, stale and rotten show in the item name. A fridge makes food last ×5, and frozen food never spoils.
- **Copy RimWorld's day-granular rot timers and tiered meal moods.** Raw meat and fish rot in 2 days, meals in 4, rice in 40 and corn in 60; pemmican lasts 70 days and survival meals never rot. Moods: lavish +12, fine +5, raw −7, rotten −10, all lasting 1 day.
- **Copy Banished and Dwarf Fortress on variety.** Banished's four groups drive health; Dwarf Fortress dwarves tire of eating the same food.
- **Do not copy Factorio's stack-averaged freshness or a constant per-day rot rate.** Averaging hides expiry. A constant rate misstates waste (section e).
- **Oxygen Not Included shows storage as a small multiplier table** (×2 shelf life chilled, ×5 chilled and sterile, frozen and sterile forever). The real data need a per-category table instead (section a).

### Cited Findings

- **RimWorld**, food rot — [Food](https://rimworldwiki.com/wiki/Food), [Temperature](https://rimworldwiki.com/wiki/Temperature), [Thoughts](https://rimworldwiki.com/wiki/Thoughts), [Deterioration](https://rimworldwiki.com/wiki/Deterioration) (opened; Deterioration last edited 3 Apr 2026):
  - "Days to rot" in the comparison table:
    - lavish, fine and simple meals 4; nutrient paste meal 0.75; packaged survival meal never;
    - meat and fish 2; milk 14; eggs 15; berries 14; potatoes 30; rice 40; corn 60; pemmican 70.
  - Rot runs above 0 °C. "Food spoiling between 10C and 0C is multiplied by a factor of (Temp)/10", and freezing stops it entirely.
  - "Once spoiled, food will vanish and can never be recovered. However, food can be eaten at any stage before spoiling with no negative effect."
  - Rot from temperature and deterioration from weather are separate systems.
  - A pawn needs 1.6 nutrition a day; raw food gives 0.05 a unit and meals give 0.9–1.0, so about 2 meals a day.
  - Mood effects ("thoughts"), each lasting 1 day with a stack limit of 1:
    - ate lavish meal +12; ate fine meal +5;
    - nutrient paste −4; ate raw food −7; ate without table −3;
    - kibble −12; corpse −12; ate rotten food −10.
  - Food poisoning — [RimWorld wiki health page reached from the Food_poisoning link](https://rimworldwiki.com/wiki/Food_poisoning) (opened):
    - corpses have a flat 5% chance; other raw food 1–4%, mostly 2%;
    - cooked meals roll on kitchen cleanliness (2% if cooked outdoors), then on the cook's skill;
    - a poisoned meal in a stack spreads its risk over the stack.
- **Project Zomboid** — [Food](https://pzwiki.net/wiki/Food) (opened):
  - "These food types begin as fresh (nothing added to the name), before becoming (stale) and then (rotten)".
  - Rotting reduces hunger restored and raises boredom or unhappiness. Rotten food has "a high chance of making the player sick".
  - Refrigeration "increases spoil time by 5 times"; fully frozen food "will last forever".
  - Each item lists "Fresh (days)" and "Rotten (days)": bread 3 / 6; apple 5 / 8; banana 5 / 7; cabbage 2 / 4; steak 2 / 4; fish fillet 2 / 4; chicken 2 / 4; egg 14 / 21; cheese 14 / 20; potato 28 / 280; oats 180 / 365; rice, dried beans and beef jerky never spoil.
  - "Freshness value is not carried over when using the food to craft some other dish."
- **Stardew Valley** — [Crops](https://stardewvalleywiki.com/Crops) (opened):
  - crops come in four qualities (regular, silver, gold, iridium), fixed at harvest, and never decay;
  - a parsnip sells for 35 / 43 / 52 / 70 g and restores 25 / 35 / 45 / 65 energy by quality;
  - that is price ×1, ×1.23, ×1.49 and ×2.0, and energy ×1, ×1.4, ×1.8 and ×2.6 (computed);
  - quality does not carry into cooked dishes or artisan goods.
- **Dwarf Fortress** — [Food](https://dwarffortresswiki.org/index.php/Food) and the [Kitchen / Prepared meal page](https://dwarffortresswiki.org/index.php/Prepared_meal) (opened):
  - hunger rises 1 per tick (1,200 a day); dwarves go to eat at 45,000, get an unhappy thought at 65,000 and starve after 100,000 once fat is gone; an Eat job takes off 50,000;
  - "Food cooked from or consisting of ingredients the dwarf likes will generate a happy thought. High-quality food will improve this happy thought";
  - "eating the same food over and over again will make the dwarf tire of it";
  - easy, fine and lavish meals use 2, 3 and 4 ingredient stacks, and more ingredients raise the chance of a liked one;
  - "food that is not properly stored in a stockpile rots quite fast".
- **Banished** — [Steam guide "The Essentialest of Food Guides"](https://steamcommunity.com/sharedfiles/filedetails/?id=2733784352) (opened; community source):
  - "For your citizens to be fully healthy, you need to supply them with the four food groups: fruits, grains, vegetables, and protein";
  - herbs from an herbalist compensate for missing groups.
  - Variety counts groups, not items: four kinds of protein still leave people unhealthy — [Steam discussion](https://steamcommunity.com/app/242920/discussions/0/41973820898369997/) (search summary).
- **Factorio: Space Age** — [Spoilage mechanics](https://wiki.factorio.com/Spoilage_mechanics) (opened):
  - every spoilable item has a spoil time and a freshness percentage;
  - merging stacks averages freshness: 10 items at 50% plus 1 at 100% gives 11 at 54.5%, "all items in a stack will spoil at the same time";
  - a recipe's output takes the average freshness of its spoilable inputs;
  - fresher science packs yield more science.
- **Oxygen Not Included** — [Food](https://oxygennotincluded.wiki.gg/wiki/Food) (opened):
  - a duplicant needs 1,000 kcal per cycle; foods carry a quality from −1 to +6, which affects morale;
  - shelf-life multipliers:

    | Temperature | Sterile atmosphere | Normal | Polluted |
    |---|---|---|---|
    | Frozen (below −18 °C) | forever | ×3.33 | ×1 |
    | Chilled (−18 to 4 °C) | ×5 | ×2 | ×0.83 |
    | Above 4 °C | ×1.43 | ×1 | ×0.59 |

  - Food inside cooking stations is held in stasis.
- **Victoria 3** — [Needs wiki](https://vic3.paradoxwikis.com/Needs) (search summary; the page is behind a JavaScript challenge):
  - grain and fish satisfy only "Basic Food"; groceries, meat and fruit satisfy both basic and "Luxury Food";
  - the basic food need is 90 at wealth 1, peaks at 168 at wealth 19 and disappears above wealth 29;
  - substitution uses per-good weights with `max_supply_share` 0.9.
  - [Dev Diary #13, Standard of Living](https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-13-standard-of-living.1489327/) and [#131, Famines](https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-131-famines-starvation-harvest-conditions.1708680/) were blocked.

### Inferences

- **Readable and worth copying:**
  1. **Two numbers per food** (fresh-until, use-by): Project Zomboid, and FoodKeeper's own min–max.
  2. **Three visible stages** in names or tints: fresh, stale, spoiled.
  3. **Storage as a short list of tiers** (ambient, cool, frozen), as in Project Zomboid, RimWorld and ONI. Nomos uses a per-category table, but the tooltip still reads as "lasts N days here".
  4. **Meal tiers with one-day mood effects** (RimWorld): cheap, legible and already tied to a happiness system.
  5. **Variety by groups** (Banished; Dwarf Fortress monotony): "eat from four kinds of food this week".
  6. **Spoiled food vanishes** (RimWorld), with a log line and a waste counter instead of a rot item (Factorio) that needs hauling.
- **Not worth copying:**
  - Factorio's averaged freshness. It is elegant but breaks FEFO and makes "when will this spoil?" unanswerable for mixed stacks.
  - A constant per-day rot probability, which section e shows misstates waste by up to 26 points.
  - Stardew's never-decaying quality. It fits a farm game, but Nomos needs freshness to matter.
  - Victoria 3's wealth-scaled need quantities belong to the wealth and happiness researchers, not here.
- **A player-facing sentence that sums it up:** "Meat lasts a day without a fridge and three with one; bread four; grain a year."

### Gaps

- Banished's spoilage rules (if any) and exact health numbers were not opened, because both wikis were blocked.
- Victoria 3's current need and standard-of-living formulas are search-summary only.
- No game source was opened on how players actually perceive freshness UIs; there are no playtest data.

---

## e) Deterministic integer representation: lots, FEFO, day-boundary spoilage, storage tiers, and a settlement-ledger summary

### Takeaway

- **Agents: one 32-bit word per lot.** Fields: expiry day 16 bits, category 3, grade 2, storage 2, portions 9.
  - At most 8 lots per pantry, kept sorted by expiry and eaten first-expiry-first. The produced day is redundant: age = use-by − days left.
  - Spoilage happens only at the day boundary, as a hard expiry. That is about 15 bytes per agent at 2.4 people per household (computed).
- **Do not use a constant per-day loss rate for perishables.** Against exact FEFO lots (measured here, `aging_compare.mjs`):
  - a single-rate model overstated waste by up to 26 points when restocking kept pace with shelf life (3-day food restocked every 3 days: 25.9% against 0%), and invented shortages;
  - it understated waste by up to 14 points when restocking was slower than shelf life (2-day food restocked weekly: 57.1% against 71.4%);
  - two age bands erred by up to 7.5 points in the first case and 14 points in the second;
  - age bands equal to the shelf life in days are exact.
- **The settlement ledger needs about 12 numbers for food:**
  - a 6-slot perishable ring by days left {1, 2, 3, 4–6, 7–10, 11+};
  - two dated staple cohorts, each a (quantity, expiry) pair;
  - eaten and spoiled counts for the day.
  - The ring matched an exact 32-slot ring within 0.1 point of waste across 12 scenarios. It costs **46.7 ns [45.1–51.4] per settlement-day** on a desktop (measured here), about 62 RM-ns (computed with the plan's ×0.75 desktop factor), against the ≈0.5 µs settlement-day budget.
- **Stored harvests must be dated cohorts.** A single 1/L daily loss rate "lost" 19–29% of a year's harvest that dated cohorts kept intact (0%) (measured here).

### Cited Findings

- **Existing round-6 cost prototype** (another researcher's placeholders, not mechanics) — [`../prototypes/integration-cost/world.mjs` and `food-soa.mjs`](../prototypes/integration-cost/world.mjs) (opened):
  - 8 categories, 4 quality bands, 3 age bands, 8 lots per household;
  - a packed word `(exp << 16) | (cat << 12) | (qual << 9) | qty`;
  - placeholder shelf lives `SHELF = [3, 6, 8, 4, 2, 7, 180, 365]` days for bread, vegetables, fruit, meat, fish, dairy, grain and preserved;
  - a daily random loss `LOSS_Q16` of 1,966 for vegetables, 1,311 for fruit and 66 for grain, on top of hard expiry;
  - a per-settlement `stock` array of C × Q × A = 96 numbers.
- **Factorio** averages freshness when stacks merge (section d, opened). **Project Zomboid** drops freshness when cooking (opened). **RimWorld** removes spoiled food outright (opened).
- **Plan constraints** — [implementation plan](../../../plan/implementation-plan.md) (opened):
  - 1.2 ms per tick for "other agent systems (needs, jobs, inventory, social)" at 10k agents;
  - at most 256 bytes per agent;
  - day-boundary-only canonical writes, and keyed draws `draw(seed, entity, tick, stream)`;
  - round 4's settlement ledger holds 30–80 numbers at about 0.5 µs per settlement-day (from the task brief);
  - the round-5 settlement kernel measured 0.59–0.89 µs per settlement in JS with one food good.

**Measured here** (`aging_compare.mjs`; integer only; demand 100 units a day; 2,800 scored days after 200 warm-up days). Waste and shortage as % of delivered and demanded:

| Shelf life L (days) | Restock every k days | Supply | Exact FEFO | 1 band (per-day rate) | 2 bands | 4 bands |
|---|---|---|---|---|---|---|
| 3 | 3 | 100% | 0.0 / 0.0 | 25.9 / 25.9 | 7.4 / 7.4 | 0.0 / 0.0 * |
| 4 | 3 | 100% | 0.0 / 0.0 | 20.8 / 20.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| 7 | 7 | 100% | 0.0 / 0.0 | 28.3 / 28.3 | 7.5 / 7.5 | 0.0 / 0.0 |
| 14 | 7 | 100% | 0.0 / 0.0 | 17.1 / 17.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| 30 | 7 | 100% | 0.0 / 0.0 | 8.9 / 8.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| 4 | 7 | 100% | 42.9 / 42.9 | 40.5 / 40.5 | 28.6 / 28.6 | 42.9 / 42.9 |
| 2 | 7 | 130% | 78.0 / 71.4 | 64.1 / 53.4 | 78.0 / 71.4 | 56.0 / 42.9 * |
| 2–14 | 1 | 110% | 9.1 / 0.0 | 9.1 / 0.0 | 9.1 / 0.0 | 9.1 / 0.0 |

\* Bands > L is invalid: the per-band ageing fraction B/L caps at 1, so the total delay becomes B days, not L.

**Measured here** (`ledger_ring.mjs`). Perishable mix of 3-, 4-, 7- and 10-day foods at 20 / 25 / 30 / 25% of demand; 5,000 scored days:

- **Pooled 6-slot ring vs exact 32-slot ring.** Waste identical to 0.1 point in all 12 cases (restock every 1, 2, 3 or 7 days; supply 100, 105 or 115%).
  - Example: k = 7, supply 105%, exact 4.7% against 4.8%.
  - Both show 0% shortage.
- **Same mix with no substitution between categories.**
  - Restocking every 1 or 3 days gives the same waste (0% at 100% supply, 13.0% at 115%).
  - **Weekly restocking gives 22.1% waste and 22.2% shortage at 100% supply, and 32.3% waste at 115%.** The pooled ring shows 0% and 13.0%.
- **One harvest a year** covering 365 days of demand, over 20 years:

  | Shelf life L | Dated cohorts | Single 1/L daily loss |
  |---|---|---|
  | 400 days | 0.0% waste, 0.0% shortage | 28.8% waste, 28.8% shortage |
  | 540 days | 0.0%, 0.0% | 23.5%, 23.5% |
  | 730 days | 0.0%, 0.0% | 18.7%, 18.7% |

- **Cost of the 6-slot block** for 10,000 settlements: **46.7 ns per settlement-day, median [45.1–51.4]**.
  - Setup: Node v24.18.0, V8 13.6.233.17-node.50, AMD Ryzen 5 3600 desktop (12 threads), Windows 10 under Git Bash.
  - Warm-up 200 days; 15 samples of 50 days each; this includes 5 keyed hash draws per settlement.
  - `/proc/loadavg` (MSYS emulation) read 1.31 0.49 0.88 before and after; `os.loadavg()` returns zeros on Windows.
  - This is a **desktop** timing, not the reference machine and not a phone.

### Inferences

**Agent-side representation (pantries and shop shelves):**

- **Lot word (Uint32):** `exp:16 | cat:3 | grade:2 | storage:2 | qty:9`.
  - A 16-bit day lasts 65,536 days, about 180 years, which covers round 4's 50-year runs.
  - The cost prototype's packed layout already fits this, using its 3 spare bits.
- **No produced-day field.** Freshness band and age are derived from `exp − today` and the table `L[cat][storage]` (fresh-until, use-by) at the day boundary, with no stored state.
- **FEFO.** Keep each pantry's lots sorted by (expiry, category, grade) with insertion sort on add (n ≤ 8). Eat from the front, merge only on an equal key, and on a full pantry merge into the same-category lot with the earlier expiry. That is conservative, conserves portions and never averages.
- **Day boundary only.** One pass over households:
  - remove lots with `exp < today` into per-category waste counters;
  - recompute portions and foodValue;
  - roll the weekly variety mask and the FIES tally.
  - Nothing about food changes inside ticks except eating and buying, which only consume from or append lots.
- **Storage tier change** (buying from a cooled shop, then storing in a home without a fridge, or freezing):
  - convert the remaining life by integer proportion: `left' = floor((left + 1) × (L2 + 1) / (L1 + 1)) − 1`, clamped at 0, then `exp' = today + left'`;
  - this maps a fresh item to full life in the new tier, and same-day ambient meat to full fridge life when chilled the same day;
  - it is exact integer arithmetic, so it replays bit for bit.
- **No random loss for perishables.** Hard expiry already produces waste. Keep a physical loss only for staples in poor storage:
  - 2.7% a season (APHLIS via SOFA) is about 0.015% a day, Q16 = 10;
  - the sub-Saharan median of about 7% is about 0.04% a day, Q16 = 26;
  - both are computed assuming a 180-day season.
  - Apply these with stochastic rounding from keyed draws.
- **Placeholders to change in the cost prototype:**
  - its `LOSS_Q16` is 3.0% a day for vegetables and 2.0% for fruit, which compounds to 16.7% over a 6-day life;
  - its 0.10% a day for grain compounds to **30.8% a year** (computed), about 10× the APHLIS storage loss.

**Settlement-ledger food block (canonical, about 12 Int32 numbers):**

| Field | Numbers | Update at the day boundary |
|---|---|---|
| Perishable ring by days left {1, 2, 3, 4–6, 7–10, 11–32} | 6 | FEFO consumption from slot 1 up; slot 1's remainder → spoiled; the 1-day slots shift exactly; wide slots age 1/width a day with keyed stochastic rounding |
| Staple cohorts (quantity, expiry day) × 2 | 4 | FEFO between cohorts; pest loss by storage quality; a cohort past expiry → spoiled |
| Eaten today, spoiled today | 2 | flows for history and the divergence meter |
| Optional: cold-chain share (Q16), FIES moderate-or-severe share (Q16) | 2 | parameters or outputs |

- **Twelve numbers fit the 30–80-number ledger.** The cost prototype's 96-number C × Q × A `stock` does not. Keep that as a focus-mode statistics buffer, not canonical ledger state (hand-off).
- **Pooling is fine where restocking is frequent; split it for weekly markets.** Pooling assumes households substitute one perishable for another. In cities with daily or 3-day shopping this matched the no-substitution waste. In villages with weekly markets it hid 22–32% waste.
  - For village settlements, either split perishables into a fast ring (life ≤ 4 days: fresh protein, ambient dairy, bread) and a slow ring (5–14 days), for +6 numbers, or apply a weekly-market waste correction fitted on the divergence meter.
- **Fold (agents to ledger).** Sum each lot's portions into the ring slot for its days left, or into the staple cohort with the nearest expiry. Totals are exact in portions.
- **Spawn (ledger to agents).** Apportion each slot's portions to households and shops with the M0 largest-remainder helper. Give expiry days inside a wide slot by keyed offsets. Totals stay exact, and expiry is approximate only within the wide slots.
- **Conservation identity, every day and exact in portions:** produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit. This extends round 4's goods identity with an explicit spoiled term.

### Gaps

- I did not time the per-household day-boundary pass. The integration-cost researcher owns that measurement, and their prototype already implements it.
- The pooled-versus-split ring choice for villages was tested only on one synthetic mix. It needs a check against agent fold-ups once M3 and M7 exist.
- No phone or reference-machine timing was taken for the ledger block.

---

## Hand-offs to the other round-6 researchers

- **Resources and production:** "preserve" recipes (salt, smoke, dry, can) that turn 0–3-day food into 180–365-day food; harvest seasons that create the staple cohorts; pre-retail loss by group.
- **Happiness:** one-day meal effects (fine +5, standard +2, staple 0, stale −2, last day −3, spoiled −10); a weekly variety bonus or penalty; food poisoning as a health event. Scale them to that researcher's units.
- **Wealth:** grade and category choice by wealth band, following the elasticity ordering (cereals lowest; dairy and meat highest); food stock value in household wealth; keeping grade invisible outside the wealth lens.
- **Integration cost:** replace `SHELF` and `STALE` with the section-a table; drop `LOSS_Q16` for produce and cut grain to Q16 10–26; replace the 96-number settlement `stock` with the 12-number block; add 2 bits for storage tier in the lot word.

---

## Recommendation for the plan

**Mechanics and numbers**

1. **Six food categories,** each with a glyph: grain, bread, produce, dairy, fresh protein, preserved.
2. **Shelf-life table:** 6 categories × 3 storage tiers (ambient, cool, frozen), each cell (fresh-until, use-by) in days, from section a:
   - meat and fish 0 / 0 ambient, 1 / 3 cool, 90 / 240 frozen;
   - dairy 0 / 0, 7 / 14, 90 / 120;
   - bread 2 / 4, 7 / 14, 60 / 90;
   - produce 4 / 7, 7 / 14, 240 / 365;
   - grain and preserved 180 / 365 everywhere.
   - City homes and shops default to cool; market stalls and village homes to ambient.
3. **Lots and FEFO:**
   - one Uint32 per lot (`exp:16 | cat:3 | grade:2 | storage:2 | qty:9`);
   - ≤ 8 lots per pantry and ≤ 32 per shop shelf, sorted by expiry and eaten first-expiry-first;
   - storage moves convert remaining life by integer proportion.
4. **Spoilage only at the day boundary,** by hard expiry into per-category waste counters. Perishables get no per-day random loss. Staples in poor storage lose 0.015–0.04% a day, by keyed stochastic rounding.
5. **Price** = base × grade (100 / 135 / 180%) × freshness (100% fresh, 75% stale, 50% last day), in integer cents with `floor` after each multiply.
6. **Quality effects:**
   - meal mood by grade and freshness, lasting one day;
   - food poisoning 0.01% per meal, ×10 when stale, 2% for spoiled food eaten when starving;
   - weekly variety: "varied" ≥ 4 of 6 categories, "monotonous" ≤ 2.
7. **FIES-style metric:** 8 event flags per household per 30 days. Report the shares scoring ≥ 4 and ≥ 7.
8. **Settlement ledger:** 12 numbers (6-slot perishable ring, 2 dated staple cohorts, eaten and spoiled), plus 6 for a second ring in weekly-market villages. Pre-retail loss by group (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%) scaled by a cold-chain factor of 0.75–1.73.
9. **Calibration targets, emergent rather than imposed:**
   - household spoilage 3–6% of purchased portions with cool storage;
   - shop spoilage 0.5–3% of throughput;
   - moderate-or-severe food insecurity 5–15% in the default town;
   - weekly-market villages without cooling waste ≥ 15% of perishables.

**Draft plan tasks (R6)**

*M2 Economy*

- [ ] Give shop inventories dated food lots in six categories, each with an expiry day and a grade. Sell first-expiry-first and remove expired lots into per-category waste counters only at the day boundary (R6).
- [ ] Mark stale lots down to 75% and last-day lots to 50% of the posted price in integer cents. Log markdown sales and waste per category per day (R6).
- [ ] Exit check: in portions, every day and exactly, produced + imported = eaten + spoiled + exported + Δstock. City-preset shops spoil 0.5–3% of throughput (R6).

*M3 City life*

- [ ] Store each household pantry as at most 8 Uint32 lots (`exp:16 | cat:3 | grade:2 | storage:2 | qty:9`), sorted by expiry. Merge only equal keys, or into the same-category lot with the earlier expiry when full (R6).
- [ ] Build a 6 × 3 shelf-life table (category × ambient/cool/frozen; fresh-until and use-by days) from USDA FoodKeeper and the FDA chart. Derive freshness from expiry, never store it. Convert storage moves as `floor((left+1)(L2+1)/(L1+1)) − 1` (R6).
- [ ] Track a 6-bit weekly category mask and an 8-item monthly FIES-style tally per household. Pass meal grade, freshness and variety to the happiness system (R6).
- [ ] Show freshness only in the inspector pantry, on stall stock pips (a stale tint) and in waste charts. Keep meal grade and stale food out of bubbles except in the opt-in wealth lens (R6).
- [ ] Exit checks (R6):
  - with cool storage, households spoil 3–6% of purchased portions;
  - 5–15% of households score ≥ 4 on the tally in the default town;
  - a no-fridge, weekly-market variant spoils ≥ 15% of perishables;
  - no per-day random loss exists for perishables.

*M5 Society and policy*

- [ ] Add a markdown-and-donation policy (stale food discounted or given to households with a tally ≥ 4), with a predicted cut in shop waste of about 20%. Sanders's 21% is a search summary, so verify it first (R6).
- [ ] Add a home-refrigeration subsidy that moves homes from ambient to cool, with a predicted effect on household spoilage and on the moderate-or-severe share (R6).

*M7 Country of ledgers*

- [ ] Add a 12-number food block to each settlement ledger:
  - a 6-slot perishable ring by days left {1, 2, 3, 4–6, 7–10, 11+};
  - two dated staple cohorts;
  - daily eaten and spoiled counts.
  - Weekly-market villages get a second ring (R6).
- [ ] Never model a stored harvest with a single daily loss rate. A single rate lost 19–29% of a year's harvest in testing, against 0% for dated cohorts (R6).
- [ ] Apply pre-retail loss by food group (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%), scaled by a settlement cold-chain factor of 0.75–1.73 (R6).
- [ ] Exit checks (R6):
  - on presets, the ledger ring's waste stays within 1 point of an exact per-day ring;
  - harvest stores lose only pest loss (≤ 7% a season);
  - the goods identity holds exactly, with spoilage as its own term.

*M9 Zoom across scales*

- [ ] Fold pantry and shop lots into the ledger ring and cohorts exactly in portions. Spawn lots from the ring with largest-remainder apportionment and keyed expiry offsets inside wide slots (R6).

**Verify before hard-coding**

| Figure or question | Decides | Milestone |
|---|---|---|
| FoodKeeper values against the official FSIS file (only GitHub copies opened) | Shelf-life table | M2, M3 |
| Days of life for opened pasteurised milk | Dairy cool column | M3 |
| Sanders's 21% waste cut from dynamic pricing (search summary) | Markdown policy size | M5 |
| FIES raw-score cut-offs against FAO's Rasch thresholds | Food-insecurity metric | M3 |
| Pooled versus split perishable ring for weekly-market villages, on agent fold-ups | Ledger block size | M7, M9 |
| Ledger food-block timing on the reference machine and a phone | Country budget | M7 |
