# Customs as preferences: food, festivals, names, regions, and the guardrails

Round 8, question 2: how cultural customs feed preferences (food demand, festivals, music and services, names, home regions) without ever touching ability or crime, and how that is checked. Researcher notes, 6 October 2026.

All timings ran on one Windows 10 desktop under Node 24.18.0, with other work running. Windows has no load average, so the MSYS `/proc/loadavg` emulation is quoted beside each timing. None is a browser, WASM or phone timing. Raw data, fixtures and third-party tools (ICP, Nager.Date, Census retail, pret, LDNOOBW, Fantasy Map Generator, franc, ESLint, dependency-cruiser) stayed in a scratch folder outside the repo. Only the research scripts are in [`prototypes/customs/`](../prototypes/customs/).

Labels: "opened" (source read in full), "search summary" (seen only in a search result), "measured here", "computed", "inference", "unsourced estimate". As in round 6, "fetch-tool summary" (a model summary of a page the tools could not download) and "abstract only" count as search summaries.

Scope: how customs plug into the simulation. Transmission dynamics are in `transmission.md`; prior art and ethics in `prior-art-ethics.md`.

## a) Food and goods preferences

### Takeaway

- **Income explains little of what countries eat within the food budget.** Across 173 countries in ICP 2021, income explains 1–37% of the variation in each category's share of food spending. After income and the category's own relative price, the residual SD is 4.4–8.4 points of the food budget, or 25–38% of the mean share (computed). Countries within ±15% of each other's income differ by a median 4.9–9.1 points between quartiles.
- **Tastes travel with people and fade slowly.** Indian interstate migrants keep their origin state's food shares and forgo 1.6% of calories on average, up to 7.0% where origin foods are dear locally (Atkin, opened). US movers close 60% of a brand-share gap at once, and need over 20 more years to close half of the rest (Bronnenberg, Dubé and Gentzkow, opened).
- **Design:** each culture shifts only the marginal Stone–Geary shares (β) inside the food budget, plus one wares-versus-services split. Shifts sum to zero and stay within ±25% of the neutral share per category (about 0.7–1.0 residual SD). Subsistence (γ), total spending, saving, work and grade stay culture-blind.
- **Welfare stays put by construction.** At the default band and ±10% local price gaps, a culture's basket costs at most 2.5% more or less of food spending: 0.2–1.1% of consumption across the four presets (computed). Even counted as lost income, that is 1–5 milli-ladder, against −700 for unemployment.

### Cited Findings

- **Cross-country composition at similar incomes** ([icp_taste.mjs](../prototypes/customs/icp_taste.mjs), computed from the World Bank ICP 2021 API, [series list](https://api.worldbank.org/v2/sources/90/series?format=json) and [classifications](https://api.worldbank.org/v2/sources/90/classification?format=json), opened). Within-food shares use local-currency spending (`CN`) for the nine ICP food classes, because the API's `AICZS` share for Fruit is null. Income is actual individual consumption per head at PPP (US$689–52,654). 173 countries.

  | Nomos-like group (ICP classes) | Mean share of food | R² on income | Residual SD after income and own price | Median quartile gap among peers (±15% income) | Median p10–p90 among peers |
  |---|---|---|---|---|---|
  | Grain and bread (bread and cereals) | 21.4% | 0.37 | 7.0 pp (33%) | 5.8 pp | 9.7 pp |
  | Fresh protein (meat, fish) | 27.2% | 0.14 | 6.8 pp (25%) | 6.8 pp | 12.1 pp |
  | Dairy (milk, cheese, eggs) | 11.5% | 0.32 | 4.4 pp (38%) | 5.4 pp | 8.9 pp |
  | Produce (fruit, vegetables) | 22.8% | 0.01 | 8.4 pp (37%) | 9.1 pp | 15.1 pp |
  | Other and preserved (oils, sugar, n.e.c.) | 17.1% | 0.02 | 6.5 pp (38%) | 4.9 pp | 12.3 pp |

  - Own relative price adds almost nothing except for fish, where R² rises from 0.015 to 0.205: fish is cheap where it is eaten (computed).
  - Among the 26 countries at US$30,000–45,000 a head, p10–p90 ranges are grain and bread 11.9–20.7%, fresh protein 23.8–33.8%, dairy 7.9–17.3% and produce 18.3–27.2% (computed).
  - The food share of consumption itself is income-driven (R² 0.70, residual SD 8.0 pp). Recreation and culture take 4.5% of consumption with R² 0.55 and a residual SD of 1.8 pp, 41% of the mean. Restaurants and hotels (66%), clothing (71%) and alcohol (105%) vary far more beyond income (computed).
- **Atkin, "The Caloric Costs of Culture"** ([NBER w19196, 2013 version](https://www.nber.org/system/files/working_papers/w19196/w19196.pdf), opened; published as [AER 106(4) 2016](https://www.aeaweb.org/articles?id=10.1257%2Faer.20140297), not opened):
  - Keralans ate 13 times more rice than wheat and Punjabis 10 times more wheat than rice, at similar relative prices.
  - Interstate migrants' food-budget shares track their origin state's shares, more so when both spouses migrated.
  - The average "caloric tax" is 1.6% of intake, 1–1.7% for poor or undernourished households, and 7.0% (5.2% if undernourished) where both spouses moved to a village whose prices suit their origin bundle badly. With local preferences, that group's inadequate diets would fall from 58% to 47%.
  - The tax persists many years after migration and does not shrink with education, which rules out pure information or cooking-skill explanations.
- **Bronnenberg, Dubé and Gentzkow, "The Evolution of Brand Preferences"** ([NBER w16267](https://www.nber.org/system/files/working_papers/w16267/w16267.pdf), opened): 38,000 US households, 238 packaged-goods categories.
  - About 60% of the gap between origin and destination closes immediately on moving. Persistent preferences explain about 40% of geographic variation in market shares; supply-side factors explain the rest.
  - Half of the remaining gap takes more than 20 years to close, and it is still significant after 50 years. Estimated depreciation of past experience is 2.6% a year; people who move after 25 still converge.
  - The same paper summarises Logan and Rhode (2010): 19th-century immigrants' food shares were predicted by past relative prices in their origin countries (summarised in BDG; the original was not opened).
- **Round 6 anchors:** food falls from 45.3% to 8.7% of consumption from low to high income ([ICP 2021](https://api.worldbank.org/v2/sources/90/country/LIB;LMB;UMB;HIB;USA/series/1101000/classification/AICZS/time/YR2021/data?format=json), opened in round 6), and by 7.8 points per doubling of income across 102 countries (computed in round 6). Grade comes from the consumption budget per adult ([round 6 report](../../round-6-goods-and-wellbeing/report.md), conflict c).
- **Welfare bound** ([welfare_bound.mjs](../prototypes/customs/welfare_bound.mjs), computed). Neutral shares are the ICP means mapped to Nomos's six categories (grain 11.4, bread 10.0, produce 22.8, dairy 11.5, fresh protein 27.2, preserved 17.1%; the grain–bread split is an assumption). The worst-case shift raises the two largest categories and lowers the rest.

  | Band per category | Largest shift (L1, pp of food) | Local price gap ±10%: basket cost gap | Same, share of consumption (low → high preset) | As lost income, milli-ladder (low → high) |
  |---|---|---|---|---|
  | ±10% | 10 | 1.0% of food | 0.45% → 0.09% | 2.0 → 0.4 |
  | ±25% (default) | 25 | 2.5% of food | 1.13% → 0.22% | 4.9 → 0.9 |
  | ±40% (lab only) | 40 | 4.0% of food | 1.81% → 0.35% | 7.9 → 1.5 |

  At the clamp extremes (every preferred category at 175% and every other at 25% of base, which cannot persist), the default band's gap would reach 18.8% of food, or 7–38 milli-ladder (computed).

### Inferences

- **Where culture enters the budget.** The Stone–Geary rule is e_k = p_k·γ_k + β_k·(m − Σ p_j·γ_j). Culture changes only β, the marginal shares above subsistence:
  - β_k(c) = β_k(neutral) + Δβ_k(c), stored as Int32 ppm, with Σ_k Δβ_k(c) = 0 enforced at build time by largest remainder.
  - Default band: |Δβ_k| ≤ 25% of the neutral β, about 0.7–1.0 of the ICP residual SD, so cultures differ about as much as countries at similar income. No category may fall below 0.6× its neutral share, which keeps the weekly variety mask reachable. ±40% is for lab cards only.
  - Non-food: one split between wares and services (music and arts) may move by up to ±20% of the services β. ICP's recreation residual is 41%, but national data mixes goods and services. Grain sold as a production input, timber, stone, metal and fuel stay culture-blind.
- **What stays culture-blind, and why.** The saving rule (by income quintile), total consumption m, labour supply, the food total share, grade choice and subsistence γ never read culture.
  - γ is in portions, bought cheapest-first, so unmet food need does not depend on culture. Unmet need drives food theft, the FIES tally and the LS food penalty, so this one rule keeps culture out of crime and welfare.
  - Culture changes what people buy above subsistence, never how much they save, work or eat.
  - Real festival and taste spending can crowd out food among the poor (Atkin; Banerjee and Duflo in b). Nomos leaves that channel out on purpose, and the "What this toy leaves out" page should say so.
- **Households.** A household's Δβ is the mean of its adults' Δβ, rounded by largest remainder so it still sums to zero. Children follow the household until they set up their own. Migrants keep their Δβ; any drift toward local tastes belongs to `transmission.md`. BDG's 2.6% a year (a half-life near 26 years) is the evidence to start from.
- **Prices move, honestly.** A culture's home region will show a local premium on its favourite categories, bounded by import parity plus transport. Fresh food, which trades only under a day's travel, will show the largest premia. That is the realistic, visible effect the owner wants: taste moves stock, prices and spoilage.
- **Availability does half the work.** BDG's 60% immediate convergence is mostly supply-side. In Nomos, shops stock what local demand buys, so a migrant whose favourite foods are scarce substitutes through stock-outs. Logging unmet demand per category, already planned in M2, will show it.
- **Diagnostic, not a guard.** Publish a "basket cost by culture" line per settlement: Σ_k (s_k(c) − s_k(neutral)) × (p_k / p̄_k − 1). It should stay within about ±2.5% of food spending at the default band. Show it rather than correct it.

### Gaps

- The ICP residual is an upper bound on taste. It also holds climate, geography, product mix within classes, measurement and subnational mixing. No within-country cultural split was computed.
- Atkin's figures come from the 2013 working paper, not the 2016 AER version. Logan and Rhode was read only as summarised by BDG.
- No study found compares services or music spending across cultures at equal income; ICP's recreation and culture class mixes goods with services.
- Mapping ICP classes onto Nomos's six categories is approximate: "preserved" is a shelf-life class, while ICP's oils, sugar and n.e.c. are nutritional ones.
- The local price premia that culture creates depend on M2 and M7 supply responses, which do not exist yet.

## b) Festivals and music

### Takeaway

- **Frequency:** countries keep a median of 12 nationwide public holidays a year (p10–p90 7–16, range 3–25, 204 countries), and 27% of them sit in runs of two or more days (computed from Nager.Date). Give every culture the same festival time: 4–6 festivals, 8–12 days a year, one of them a 2–3-day major festival.
- **Size and pull:** 32% of US adults attended a performance in a park or outdoor space in 2017 (NEA, opened), and 71% of UK adults attended some arts event in a year (DCMS 2014, opened). 62% of US performing-arts participants say they do it to spend time with family and friends (NEA). Socialising doubles on rest days and holidays, from 0.44 to 0.92 hours (ATUS 2025, fetch-tool summary).
- **Spending spikes are sharp for one food and small for the month.** US grocery sales run only 4.5% above the year's daily rate in December (range 2.6–6.8%), against 31% for liquor stores (computed from Census data). The median extremely poor household in Udaipur spends 10% of its annual budget on festivals (Banerjee and Duflo, opened). US turkey prices tend to fall in November and December because supply is stored ahead (ERS, opened).
- **What a festival drives in Nomos:** social contact (the isolation driver), a 2–4× demand spike for the culture's festival foods paid for from the month's discretionary budget, services demand for performers at the square or park, and crowds in public spaces. Festivals never close workplaces, so culture never touches work. That pushes them into rest days and evenings, which is exactly the exposure case in d.
- **Wellbeing:** attending arts events goes with +0.043 life satisfaction on a 1–7 scale (cross-sectional, DCMS), about +0.07 on 0–10 (computed, crude). So a festival should count as social contact, with no separate bonus by default.

### Cited Findings

- **Public holidays per country, 2025** ([holiday_counts.mjs](../prototypes/customs/holiday_counts.mjs), computed from the [Nager.Date API](https://date.nager.at/api/v3/AvailableCountries), opened). Counted nationwide days of type "Public" with `global: true`, one per date: 204 countries, min 3, p25 10, median 12, p75 14, max 25. 27.3% of holiday dates sit next to another holiday date. Shares by month peak in April (16.8%), December (15.8%), May (14.0%) and January (13.4%). Nager.Date coverage varies by country, and the counts mix secular and religious days; only the counts are used.
- **NEA, 2017 Survey of Public Participation in the Arts** ([press release](https://www.arts.gov/news/press-releases/2020/national-endowment-arts-releases-latest-survey-public-participation-arts), opened):
  - 54.3% of US adults (128 million) attended artistic, creative or cultural activities, with live music the most frequent.
  - 32% attended a performing-arts event at a park or outdoor facility, against 50% in Oregon and Rhode Island.
  - 62% of adults who took part in the performing arts did so to spend time with family and friends.
  - 58.5 million attended outdoor performing-arts festivals (search summary only).
- **DCMS, "Quantifying and valuing the wellbeing impacts of culture and sport"** (Fujiwara, Kudrna and Dolan 2014, [PDF](https://assets.publishing.service.gov.uk/media/5a7de7a0e5274a2e8ab4492f/Quantifying_and_valuing_the_wellbeing_impacts_of_sport_and_culture.pdf), opened):
  - Understanding Society wave 2 (2010–11): 70.71% had been an audience member at an arts or cultural event in the past year.
  - Cross-sectional OLS on life satisfaction (1–7), n = 36,531: all audience arts +0.043 (SE 0.020), music audience +0.034 (0.016), plays +0.046 (0.016). These are associations, not causal estimates.
- **Taking Part, art forms, 2015/16** ([DCMS release](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/562672/Focus_on_art_forms_final.pdf), opened): 30.7% of adults in England attended an "other" live music event in the past year, up from 24.4% in 2005/06. The PDF's charts lost their labels in text extraction, so no other figure is used.
- **American Time Use Survey 2025, Table 2** ([BLS](https://www.bls.gov/news.release/atus.t02.htm), fetch-tool summary; BLS blocks direct downloads): socialising and communicating takes 0.44 hours a day on weekdays (28.4% take part) and 0.92 hours on weekends and holidays (35.2%). Leisure and sports take 4.60 and 6.48 hours.
- **Banerjee and Duflo, "The Economic Lives of the Poor"** ([MIT copy](https://economics.mit.edu/sites/default/files/publications/The%20Economic%20Lives%20of%20the%20Poor.pdf), opened):
  - In Udaipur, more than 99% of extremely poor households spent money on a wedding, a funeral or a religious festival in the past year. The median household spent 10% of its annual budget on festivals.
  - 90% of South African households under $1 a day spent on festivals, and more than 50% in Pakistan, Indonesia and Côte d'Ivoire. In Panama, Guatemala and Nicaragua festivals were not a notable expense.
  - The extremely poor spent under 1% on movies, theatre or video shows in all 13 countries, against 5% in the United States. The typical poor Udaipur household "could spend up to 30 percent more on food" than it does, judging by its alcohol, tobacco and festival spending.
- **US holiday-season retail** ([grocery_seasonality.py](../prototypes/customs/grocery_seasonality.py), computed from the Census Bureau's [Monthly Retail Trade workbook](https://www.census.gov/retail/mrts/www/mrtssales92-present.xlsx), opened; not seasonally adjusted; 2015–2019 and 2022–2024):
  - Grocery stores: December's daily sales rate is 4.5% above the year's mean day (range 2.6–6.8%), November's 3.2%.
  - Beer, wine and liquor stores: December +31% (27–35%). Food services: December +2%.
- **USDA ERS, "Turkey consumption surges and prices fall during the holidays"** ([chart note](https://www.ers.usda.gov/data-products/charts-of-note/chart-detail?chartId=77090), opened): per-head turkey consumption peaks around Thanksgiving, while wholesale and retail prices peak in the months before and drop during November and December.
  - About half of whole turkeys are sold for Thanksgiving: 46 million at Thanksgiving, 22 million at Christmas and 19 million at Easter (search summary only).

### Inferences

- **A calendar per culture, all the same size.**
  - Each culture gets 4–6 festivals totalling 8–12 days a year, matching the middle of the public-holiday range: one major festival of 2–3 days and the rest one day each.
  - Equal festival time per culture keeps expected social contact equal, which keeps welfare equal.
  - Store festivals in one global table, about 8 bytes each: day of year, length, period (rest-day daytime or evening), kind flags (home feast, public gathering, music), up to two favoured food categories and an attendance target.
- **Festivals never close workplaces.** If a culture's festival day were a day off for its members only, culture would change hours worked, income and wealth. Festivals therefore fall in leisure time: rest days or evenings after work.
  - Rest-day daytime festivals add less night-time exposure than evening ones; d measures the difference.
  - Shared public holidays for everyone, if Nomos adds them, are a calendar rule and not a custom.
- **Social contact.** Attending a festival or a home feast counts as contact and resets the 7-day isolation counter behind the −450 driver.
  - Cap festival days per person per year at the culture's total, so people who mix cultures choose among more festivals but never get more of them. Mixing changes variety, not quantity.
  - No separate LS bonus by default. DCMS's association is about +0.07 on the 0–10 ladder for any attendance in a year (computed by rescaling 1–7 linearly), too small and too confounded to carry. Keep a knob, default 0.
- **Market spikes.** On festival days members' demand for the favoured categories rises 2–4× (an unsourced estimate, shaped by the turkey pattern). The extra is taken from discretionary spending over the surrounding 30 days, so the monthly food total moves by at most about 5%, in line with US December groceries.
  - Shops read the public calendar and stock ahead: the target stock adds known festival demand. Prices should then barely spike, as with US turkeys, while overstocked fresh food spoils after the festival. That is an emergent, honest cost.
  - Festival spending comes only from the discretionary budget, never from subsistence. The Udaipur pattern of festivals crowding out food is a real effect that Nomos deliberately leaves out.
- **Music and services.**
  - A culture's music custom picks the style of its festival events and how strongly members value attending.
  - Events buy services at the square or park: performers are paid from small attendance fees or the local government's events line.
  - Any agent with a services job can perform any style. Culture shapes the demand side only, never who is hired or what they earn.
- **Public spaces.** A public festival books the park or market square for its hours. On market days it shares the square and adds footfall to stalls. Attendance targets: majors 40–70% of members, minors 10–30%, non-members 5–15% (unsourced estimates, bounded below by NEA's 32% yearly outdoor attendance).

### Gaps

- No good source was found for attendance at community festivals as a share of residents, only arts-event participation. The attendance targets are unsourced estimates.
- The size of a festival-day spike in one food category, as against a month's total, was found only for US turkeys (search summary). The 2–4× band is unsourced.
- ATUS figures are a fetch-tool summary, because BLS refuses scripted downloads.
- DCMS's arts coefficients are cross-sectional, and its 1–7 to 0–10 rescale is crude.
- No study was found on how often people attend another group's festivals; the non-member rate is an estimate.

## c) Names and home regions

### Takeaway

- **A syllable generator per culture is cheap and fully deterministic.** The prototype makes about 220 names per ms from integer hashes. 5,000 draws per culture gave 85–98% unique given names (measured here). Names must carry no gender, because Nomos bodies have none.
- **The planned "edit distance ≤ 2" rule is too blunt for short names.** Against 107 place-name tokens or 383 species names, each list alone rejected 35–42% of 3–4-letter names. Together with profanity and bans, the rules rejected 18–35% of all names. Two changes bring rejections to 2.0–4.6%: a fixture of distinctive town and city names only, and a threshold of 1 for names up to 5 letters and 2 above (measured here).
- **Simple, "neutral" phonologies sit next to real languages.** A trigram screen recovered all 33 real-language control sets, while franc language ID recovered only 12 of 33.
  - Open-syllable designs leaned Finnic, Hawaiian, Castilian or West African. One leaning design matched 0.30–0.33 against a review bar of 0.26.
  - Three designs with moderately complex syllables, 10–13 consonants and an uncommon vowel letter scored 0.21–0.23 and passed (measured here).
  - WALS explains why: five-vowel systems are the single most common type, and CV-only languages cluster near the equator.
- **Home regions** grow from 4–8 culture hearths by multi-source Dijkstra on M8's travel-cost mesh, with a mixed border band. Migration splits each flow by the origin's culture counts with keyed stochastic rounding, so counts stay exact through spawn and fold and small minorities still move. Plain largest remainder never moved a 2% minority in 30 years (section e).

### Cited Findings

- **Generator and screen** ([names.mjs](../prototypes/customs/names.mjs), [names_screen.mjs](../prototypes/customs/names_screen.mjs); measured here, Node 24.18.0 on the round's Windows desktop, MSYS `/proc/loadavg` 0.93–7.31 across runs while other work ran; single runs, so timings are indicative only):
  - Nine example cultures (A–H plus A2) differ in consonant and vowel letters, syllable templates, coda sets and naming custom: given + family name, given + parent's given name, or given + "of" + home place.
  - Speed: 219–229 names per ms to generate. With every filter applied naively (an edit-distance matrix per comparison), 1.9–2.0 names per ms.
  - Uniqueness: 4,265–4,908 distinct given names in 5,000 draws per culture.
- **IP filter rates, 5,000 given names per culture** (measured here). The fixture held 107 Pokémon place-name tokens of 4+ letters from pret's [Emerald](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/region_map/region_map_sections.json) and [FireRed](https://github.com/pret/pokefirered/blob/037335f4c7/src/data/region_map/region_map_sections.json) sections, after dropping generic words. It also held 383 species names from Emerald's [`species_names.h`](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/text/species_names.h). All three files were opened and kept outside the repo as test fixtures.

  | Rule | Rejected, by culture |
  |---|---|
  | Place names, edit distance ≤ 2 | 10.6–20.2% |
  | Place names, edit distance ≤ 1 | 0.3–1.2% |
  | Species names, ≤ 2 | 9.1–21.5% |
  | All naive rules combined (≤ 2, profanity, bans) | 18.4–34.8% |
  | Refined: town and city names only (24 tokens), ≤ 1 up to 5 letters and ≤ 2 above, plus species, profanity and bans | 2.0–4.6% |

  - By name length, the naive place rule rejected 41.7% of 3-letter, 42.0% of 4-letter, 16.8% of 5-letter, 3.0% of 6-letter and ≤ 0.3% of 7+-letter names.
  - Many naive hits were ordinary English words in place names, not Pokémon coinages: "Iven" and "Dike" matched "five", "Toton" "moon", "Vohe" "hole".
  - The "-mon" and "poke" bans removed 0–0.28%.
- **Profanity** ([LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/tree/5faf2ba42d7b1c0977169ec3611df25a3c08eb13), commit 5faf2ba of 13 July 2020, CC BY 4.0, opened). The repo holds 29 language lists; the 18 Latin-script ones gave 1,385 single-word entries of 3+ letters after stripping diacritics. Exact matches rejected 0.04–0.36% of names, substrings of 4+ letters 0.48–1.72%, and substrings of 3+ letters 1.9–6.5% (measured here). The 3-letter substring rule mostly catches innocent names, the classic Scunthorpe problem (inference).
- **Reads as a real language?** Character-trigram profiles were compared by cosine similarity against 33 real-language name bases from Fantasy Map Generator ([name-bases.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/data/name-bases.ts), MIT, opened; place names, not personal names). Measured here:
  - Calibration: two halves of the same base match at a median of 0.747 (minimum 0.404). Different bases match at a median of 0.141, p90 0.26, p99 0.438.
  - Controls: a held-out half of every base was nearest to its own base, 33 of 33.
  - Example cultures, nearest base: A (open CV) Finnic 0.329 and Hawaiian 0.276; B Castilian 0.294; F West African 0.301; A2 (A revised once) Castilian 0.301; C 0.261 and D 0.267, borderline. E 0.212, G 0.229 and H 0.209 passed.
  - [franc-all](https://www.npmjs.com/package/franc-all) 7.2.0 (MIT, opened, run outside the repo), given 120 names joined as text, named the right language for only 12 of 33 controls. It recovered German, English, French, Italian, Spanish, Nordic, Latin, Greenlandic, Basque, Gaelic, Hawaiian and Quechua. It placed culture A among Niuean, Māori and Fijian, agreeing with the trigram screen's Polynesian lean.
- **WALS** (Maddieson; opened):
  - [Ch. 1](https://wals.info/chapter/1): consonant inventories run from 6 to 122, with mean 22.7, mode 22 and median 21 over 562 languages. "Small" means 6–14.
  - [Ch. 2](https://wals.info/chapter/2): vowel qualities run from 2 to 14. Five vowels occur in 188 languages, just over a third, and six in 17.8%. 51.2% have 5–6.
  - [Ch. 12](https://wals.info/chapter/12): 12.5% of languages allow only (C)V syllables, mostly near the equator (Hawaiian is the example). 56.5% are moderately complex and 30.9% complex.
- **Names cue group membership.** Fictitious résumés with White-sounding names got 50% more callbacks than identical ones with African-American-sounding names. The study covered over 1,300 ads and nearly 5,000 résumés in Boston and Chicago ([Bertrand and Mullainathan, NBER w9873](https://www.nber.org/system/files/working_papers/w9873/w9873.pdf), opened).
- **Geography makes culture regions.** Variation in land quality and elevation predicts present-day ethnolinguistic diversity ([Michalopoulos 2012, AER](https://www.aeaweb.org/articles?id=10.1257%2Faer.102.4.1508), search summary; the PDF was paywalled).
- **Prior Nomos work:** round 4 measured foswig order-3 chains at 1,000 names in about 15 ms and proposed site suffixes ("-ford", "-haven") plus the CI filter ([world-maps notes, Q6](../../round-4-multi-scale/notes/world-maps.md)). M8 already plans multi-source Dijkstra regions and market territories ([plan](../../../plan/implementation-plan.md)).

### Inferences

- **Generator rules.**
  - One phonology per culture: 10–16 consonant letters with rank dropoff, 5–7 vowel letters including one uncommon letter, and moderately complex syllables (CV, CVC with a small coda set, obstruent-plus-liquid onsets). 2–3 syllables.
  - Draws are keyed by (world seed, person or place id, salt). A failed name re-draws with the next attempt number, so names replay exactly.
  - No gendered templates or affixes.
  - The same phonology names the culture's settlements, regions and festivals, so a home region reads as one place.
- **Descriptive words stay outside the stems.** Round 4's fused English suffixes ("Dunwyngate", "-haven") would make every culture read English. Write site words as separate UI-language words ("Kelvi Ford", "Port Amiro"), and translate them with the UI.
- **CI filter, proposed for persons, places and festivals:**
  - Exact and near matches to distinctive Pokémon town and city names (edit distance 1 up to 5 letters, 2 above).
  - The same against species names, which the content rule's "-mon" ban implies.
  - The "poke" and "-mon" bans.
  - LDNOOBW Latin-script lists: exact for 3-letter entries, substring for 4+.
  - A blocklist of real festival names, kept as a fixture.
  - Run over 1,000 seeds per culture, as round 4 planned for places. At runtime the filter runs only on display; at about 0.5 ms a name that is fine for an inspector click. A BK-tree would make bulk checks cheap if needed (inference).
- **The real-language screen is a smoke test, not a verdict.**
  - At authoring time, compute each culture's nearest real-base similarity. Below 0.26 passes; 0.26–0.40 goes to review; above 0.40, the floor of same-language similarity, fails.
  - Then run M1's demographically diverse playtest panel on name samples. The screen cannot see romanised Asian languages well, and FMG's 33 bases miss most of the world.
  - The fixtures (FMG bases, MIT; LDNOOBW, CC BY 4.0) would need licence notices if committed for CI.
- **Where names show.** Names appear only in the inspector and the follow-cam panel, never over heads.
  - Justice-facing views (records office, event log, recorded-crime panels) use case numbers and roles. Names cue culture, as Bertrand and Mullainathan show for real groups. A list of arrested people's names would let viewers infer culture from crime records.
  - The sim never reads a name: names are built in the UI layer from (seed, id, naming culture at birth).
- **Home regions.**
  - At world generation, place 4–8 hearths by keyed Poisson-disc on habitable cells. Grow regions by multi-source Dijkstra on M8's travel-cost mesh, adding costs for ridges, rivers and sea, so borders follow terrain. More than 8 cultures would also break the 8-class map-mode limit from round 6.
  - Settlements within a border band of cost d_b share people with the neighbouring culture, at (1 − d/d_b)/2 of the population, apportioned by largest remainder.
  - A person's home region is their birth settlement's region (Uint16) and never changes. Their culture can change; that belongs to `transmission.md`.
- **Migration carries culture exactly.** Each monthly flow from s to t splits by s's culture counts: whole parts first, then each leftover person goes to a culture drawn by a keyed draw weighted by the remainders.
  - People by culture always sum to the population, and spawn-fold stays exact per culture.
  - Plain largest remainder is exact too, but it hands every leftover to the biggest culture, so minorities in small flows never move (section e).
  - In city mode an arriving migrant takes a culture from the flow's exact composition, so cities mix over time.
- **Map modes.** A "home regions" mode shows dominant and second culture per settlement with hatching and labels. It never uses the six body-hue colours (sun, lilac, rose, ice, mint, silver), so no one reads hue as culture. It is never the default view.

### Gaps

- The real-language screen covers 33 bases of place names, not personal names. It is weak for romanised Japanese, Chinese, Korean and Vietnamese, and silent for most of Africa, South Asia and the Pacific. The 0.26 and 0.40 cut-offs come from one fixture.
- No human panel has rated the example cultures. "Reads as" is a perception that only people can judge.
- The species fixture covers 386 Gen 1–3 species only. Later generations add about 650 more, which would raise rejections.
- Michalopoulos was read only as a search summary. No source was opened on how sharp real cultural borders are, so the border band d_b is a design choice.
- Timings are single runs under other load, and a naive edit distance with per-comparison allocation was used.

## d) Guardrails and honest measurement

### Takeaway

- **Four layers, each catching what the others miss** ([guard_demo.mjs](../prototypes/customs/guard_demo.mjs); measured here):
  - A static boundary. ESLint caught all 4 direct violations but not a transitive import; dependency-cruiser caught the transitive one.
  - A relabel test, bit-exact: permute culture ids together with their customs. It caught id-reading leaks in 3 of 3 seeds, and it is blind to custom-reading leaks by design.
  - A one-step flip test: shuffle the culture column and recompute every guarded decision's integer threshold. It changed 0 of 3.69 million thresholds when clean. It caught every planted leak: 4,136, 67,044 and 35,417 changed thresholds.
  - Comparing realised yes/no outcomes instead caught only 4, 93 and 0 changes. So the flip test must compare thresholds, not draws.
- **Customs do change exposure, and that shows up honestly.** In a toy town (50 paired seeds × 10,000 agents × 360 days), a culture with 10 evening festivals a year was victimised 11.0% more per person than a culture with daytime festivals [8.1–14.0%].
  - On the same seeds, evening festivals raised its victimisation 8.7% [7.9–9.5%] against daytime ones.
  - Per hour outdoors at the same cell, tick and visible cue, its rate ratio was 1.019 [0.991–1.048]: the gap is exposure, not treatment. Exposure explains about 81% of the per-person gap.
  - The theft cost to wealth was 2.3 cents a person-year (computed share: 0.008% of income).
- **Audits need good random draws and fine strata.** A weak ad-hoc mixer gave the smaller culture's fine-strata ratio as 1.047 in one seed batch and 0.950 in another. A murmur3-style finaliser after every input gave 1.027 and 1.017 (measured here).
  - The weak mixer also opened a gap between coarse strata (1.053) and fine strata (1.006). With good draws both read 1.02.
  - Reporting by period matters: a planted 1.25× evening stop bias read 1.075 over all periods but 1.269 [1.233–1.306] within evening and night strata.

### Cited Findings

- **Fairness testing** ([Galhotra, Brun and Meliou 2017, arXiv 1709.03221](https://arxiv.org/pdf/1709.03221), opened):
  - "Causal discrimination" is the fraction of inputs for which changing only the protected characteristics changes the output. "Group discrimination" compares outcome rates between groups.
  - Group measures can miss discrimination that runs both ways, and software can game them.
  - "Apparent discrimination" arises on real input distributions where a protected attribute correlates with other inputs. Their example: same-day delivery software that never read race but made race-correlated decisions.
  - Their Themis tool found discrimination in 20 systems, up to 98% of an input subdomain.
- **Veil of darkness** ([Pierson et al. 2020, Nature Human Behaviour](https://www.nature.com/articles/s41562-020-0858-1), abstract only; paywalled). Across nearly 100 million US traffic stops, Black drivers were less likely to be stopped after sunset, "when a 'veil of darkness' masks one's race". The method is Grogger and Ridgeway (2006, JASA), cited there and not opened. It compares stop composition in light against dark at the same clock time.
- **Darkness and street crime** ([Doleac and Sanders 2015, REStat](https://njsanders.human.cornell.edu/DST_Crime_RESTAT.pdf), opened):
  - Robberies fell about 7% after daylight saving time began, with a 19% drop in the probability of any robbery. They fell 27% in the sunset hours, and difference-in-differences gives 20%.
  - The paper notes that most street crime occurs around the 5–8 pm commuting hours.
- **Nights out and victimisation** (search summary): in 107,678 residents of 13 US cities, frequent night-time activity away from home carried the highest victimisation risk (Miethe, Stafford and Long 1987). In Canada, going to bars, movies or meetings raised risk (Kennedy and Forde 1990).
- **Networks can make group gaps without any rule reading the group** ([Calvó-Armengol and Jackson 2004, AER](https://www.aeaweb.org/articles?id=10.1257%2F0002828041464542), search summary). When job information travels through contacts, a group that starts worse off drops out more and stays below the other group's employment.
- **Rate decomposition** ([Kitagawa 1955, JASA 50(272)](https://en.wikipedia.org/wiki/Kitagawa%E2%80%93Oaxaca%E2%80%93Blinder_decomposition), search summary): a crude rate gap splits exactly into a composition part and a specific-rate part over strata.
- **Static tooling:**
  - ESLint [`no-restricted-imports`](https://github.com/eslint/eslint/blob/main/docs/src/rules/no-restricted-imports.md) takes gitignore-style `group` patterns or `regex` with a custom message. [`no-restricted-properties`](https://github.com/eslint/eslint/blob/main/docs/src/rules/no-restricted-properties.md) bans a property on all objects when the object is omitted, including in destructuring (both opened).
  - dependency-cruiser's `forbidden` rules with `to: { reachable: true }` flag transitive dependencies ([rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md), opened).
  - pnpm "uses symlinks to add only the direct dependencies of the project into the root of the modules directory", unlike npm and Yarn Classic ([pnpm motivation](https://github.com/pnpm/pnpm.io/blob/main/docs/motivation.md), opened).
- **Lint check** (measured here, in a scratch project outside the repo; ESLint 9.39.5, dependency-cruiser 16.10.4):
  - Planted violations in `src/crime/` were a direct import of `src/culture/`, `store.culture[i]`, `const { homeRegion } = store` and `store['customs']`. ESLint reported 5 errors covering all four; the bracket read hit two rules.
  - It reported nothing for `src/wages/offer.js`, whose only path to culture runs through a shared helper.
  - dependency-cruiser reported both guarded files, including the path `offer.js → util/helpers.js → culture/calendar.js`.
  - The allowed `src/consumption/` file, which reads culture, passed.
- **Guard demo** (measured here; Node 24.18.0; MSYS `/proc/loadavg` 1.90 / 3.02 / 2.80 before and 1.49 / 2.42 / 2.60 after; 178 runs in 142 s; murmur3-style draws). The toy has 64 cells (48 homes, 8 markets, 8 parks) and 4 periods a day.
  - Three cultures (50 / 30 / 20%) each hold 10 festivals a year with 60% attendance. Culture 0 holds them on rest-day daytimes, culture 1 in evenings (half the attendees stay into the night), culture 2 half and half. Members shop for festival food the evening before, carrying goods, which is a visible cue.
  - Victimisation depends on period, cell type and patrol deterrence. Patrols (12 units) follow recorded crime over 30 days. Stops depend on patrol and carried goods.
  - Planted leaks: stops ×1.25 at night if culture id = 1 ("id"); the same keyed on "my culture's festival is tonight" ("custom"); hiring ×0.8 for culture 2 ("hire").

  | Test | Clean | Custom leak | Id leak | Hire leak |
  |---|---|---|---|---|
  | T1 relabel (3 seeds, state hash identical) | 3/3 | 3/3 (blind) | 0/3 | 0/3 |
  | T2 flip, thresholds changed (of 3.69 M) | 0 | 4,136 | 67,044 | 35,417 |
  | T2 flip, realised stops changed | 0 | 4 | 93 | 0 |

  | Paired-seed result, culture 1 against culture 0 | Value [95% CI over 50 seeds] |
  |---|---|
  | Victimisation per person, raw ratio | 1.110 [1.081–1.140]; culture 2 (5 evening festivals) 1.070 [1.036–1.105] |
  | Same, festivals all moved to daytime | 1.021 [0.993–1.050] |
  | Evening against daytime, paired | ×1.087 [1.079–1.095] |
  | Victimisation, MH ratio on fine strata (cell × tick × carried) | 1.019 [0.991–1.048] |
  | Kitagawa split of the per-capita gap (coarse strata) | exposure 0.0046, rate 0.0011 per person-year: exposure explains about 81% |
  | Stops per person, raw ratio | 1.022 [1.008–1.037]; fine-strata MH 1.008 [0.993–1.023] |
  | Wealth, evening against daytime, paired | −2.3 cents a person-year [−2.5 to −2.1] |
  | Id leak: fine-strata MH for stops, all periods / evening and night only | 1.075 [1.059–1.091] / 1.269 [1.233–1.306] (true factor 1.25) |
  | Clean: fine-strata MH for stops, evening and night only | 1.020 [0.987–1.054] |

  - Hash sensitivity, same model and seeds (measured here). The ad-hoc mixer shared with `names.mjs` gave culture 2's fine-strata victimisation ratio as 1.047 [1.003–1.094] for seeds 1001–1050 and 0.950 [0.910–0.991] for seeds 5001–5050. The murmur3-style mixer gave 1.027 [0.994–1.061] and 1.017 [0.982–1.053].
  - In the weak-hash runs, the coarse-strata victimisation ratio for culture 1 was 1.053 [1.014–1.093] against 1.006 on fine strata. With the strong mixer they were 1.020 [0.992–1.049] and 1.019 [0.991–1.048].
  - A plausible timing confounder exists: patrols follow last month's records, so festival nights are under-patrolled. In this toy it was too weak to see, because patrols seldom reach parks at night (inference).

### Inferences

- **Draw the line at "demand side and visible behaviour".**
  - Culture may feed consumption shares, festival attendance and timing, music taste, naming and the home-region label.
  - Systems that judge people (offending, victim choice, patrol, stops, arrests, sentencing, reporting, hiring, wages, productivity, saving, returns, inheritance, credit) may read place, time, acts and visible cues such as carried goods. They may never read culture or anything derived from it.
  - Police in Nomos cannot see culture at all, because culture is never drawn on bodies. The rules should match what the screen shows.
- **Static boundary (M0).**
  - Put culture in its own package (`sim-culture`), exporting only preference tables, the calendar and pure functions. Under pnpm a package cannot import an undeclared dependency.
  - Inside `sim-core`, a dependency-cruiser rule bans any guarded folder from reaching `sim-culture`, directly or transitively.
  - An ESLint profile for the same folders bans the import and the column names (`culture`, `culture2`, `cultureMix`, `homeRegion`, `birthCulture`, `festivalToday`, `nameKey`) through properties, destructuring and bracket access.
  - Guarded systems receive narrowed views that omit culture columns. Culture-derived flags never sit in shared columns: "festival tonight" is a function inside `sim-culture`, read only by leisure.
- **Relabel test (M0, every pull request):** permute culture ids and their custom rows. Every culture-level draw is keyed by a stable culture uid, never its index. All non-culture state must then hash identically. This catches code that branches on raw ids or orders work by culture index.
- **Flip test (M4, every pull request):** at sampled ticks, shuffle the culture column, re-derive anything the culture package computes, and hold behaviour (positions, activities, carried goods) fixed. Rerun every guarded decision and require identical integer thresholds and utilities.
  - It needs every guarded decision written as "threshold, then one keyed draw", which the plan's integer style already implies.
  - It does not need statistics, and it fails on the first changed threshold.
- **Emergent-disparity audit (M4–M5, nightly, 50 paired seeds):** log exposure (agent-ticks outdoors) and events (victimisation, stops, arrests, wrongful stops, reports) by culture, in strata of place × time × visible cue.
  - Report the Mantel–Haenszel ratio per culture overall and by period, with seed-level intervals.
  - Treat |ln ratio| ≤ 0.05 as equivalence, tested two one-sided at 50 seeds. A failure means a bug or a missing stratum, never a quota to rebalance.
  - Run the "customs counterfactual" too: the same seeds with every festival moved to daytime, or culture reassigned at random. It attributes raw gaps to customs.
- **Show emergent differences; never hide or "fix" them by making police culture-aware.** That would put culture into policing.
  - Add an opt-in Exposure lens: hours outdoors at night per person, and victimisation and police contacts per 1,000 people and per 1,000 outdoor hours at the same place and hour. Add the share of each gap explained by exposure, and a one-click paired "what if festivals were by day".
  - Pair it with an M1 or M4 bet card: "Evening festivals: will that culture be stopped more?" In the toy the answer is "victimised about 9% more, stopped about the same, and only because of where and when people are".
  - Remedies act on places and times: festival lighting, patrols that read the public calendar, or a festival-time slider. They never act on people.
  - Disaggregated results stay in the lens, the inspector and headless reports, never as a headline.
- **Watch the slow channels too.**
  - Festival co-attendance could build friendships. If M5's friend network ever carries job referrals, culture could reach employment through networks, as Calvó-Armengol and Jackson show for real groups. Either keep festival contact transient (it resets isolation but builds no lasting tie), or log employment by culture in the same audit.
  - Wrongful stops lower trust and reporting (R6). Exposure-driven stops could then feed back through reporting, so the audit should track trust and reporting by culture as well.
- **Use a strong mixer for all draws.** The audit's own numbers swung ±5% for the smaller culture under a weak mixer. The plan's verify-first item on draw independence should require full avalanche after every input. The χ² test should include cross-stream pairs (culture stream against event streams), not only one stream.

### Gaps

- The guard demo is a toy, not Nomos's crime model: no offenders, a fixed schedule and four periods a day. Its sizes (an 8.7% victimisation rise) illustrate the method and are not predictions.
- Pierson et al. were read as an abstract only, Grogger and Ridgeway not at all, and Calvó-Armengol and Jackson and the routine-activity studies only as search summaries.
- Fine strata (cell × tick × cue) are cheap in the toy. Nomos's 256² grid will need coarser place blocks or sampled days, and how coarse is safe is untested.
- The ±0.05 equivalence margin and the 50-seed count are proposals. Power was shown only for a 1.25× planted bias in a subset of periods.
- ESLint and dependency-cruiser were tested on six planted files, not a real code base. Data leaks through shared typed-array columns are invisible to both; only the flip test sees them.

## e) Cost

### Takeaway

- **Agents: 6 bytes each.** Culture, second culture, a domain-mix byte and birth culture take 1 byte each, plus a Uint16 home region. That is 0.6 MB at 100k agents. Round 6's about 170 B becomes about 176 B of the 256 B cap, or about 182 B with an optional household preference cache (computed).
- **Agent time is negligible if event-driven.** Blending a household's preference shifts costs 34 ns per agent, or 3.4 ms for 100k agents on this desktop (measured here). Recompute it only when a household or a culture changes. Even daily, a 1,024-agent slice takes about 35 µs, 0.07 ms in RM terms (computed), under the 0.35 ms slice gate.
- **Settlements: 32–34 bytes each.** Eight Int32 culture counts plus a region id take round 6's 510–640 B to about 544–674 B, under the 1 KB cap (computed).
- **Monthly migration with a culture split** costs 1.38–1.42 µs per settlement-month: 14 ms a month at 10,000 settlements (measured here). Spread over the month, that is about 0.9 ms a day in RM terms, 7.5% of the 12 ms budget (computed). Sparse loops over the 1–2 cultures most settlements hold should cut it severalfold (inference).
- **Saves:** the culture block adds about 50–53 KB gzip at 10,000 settlements after 30 years of mixing (measured here). Round 6's 0.5 MB target becomes about 0.55 MB (computed).

### Cited Findings

- **Cost prototype** ([cost.mjs](../prototypes/customs/cost.mjs); measured here, Node 24.18.0 on the round's Windows desktop; MSYS `/proc/loadavg` 2.01–2.82 one-minute; 3 warm-ups then 9 samples, median [min–max]; desktop, not phone):

  | Item | Result |
  |---|---|
  | Household Δβ blend (7 Int32 per household, adults only, zero sum kept), 10k / 25k / 100k agents | 0.343 / 0.843 / 3.419 ms; 33.7–34.3 ns per agent [33.5–77.1] |
  | Monthly migration over 24 CSR edges, 8 culture slots, 10,000 settlements | largest remainder 13.83 ms [13.65–13.96]; keyed stochastic rounding 14.22 ms [14.06–15.54]; 1.38 / 1.42 µs per settlement-month |
  | Weekly settlement demand shift, Σ share × Δβ, 10,000 settlements | 1.19 ms [1.16–1.37], 119 ns per settlement-week |
  | Culture block for 10,000 settlements after 30 years of stochastic mixing, gzip level 9 | dense 8 × Int32: 320,000 B raw, 53,367 B gzip; top-3 sparse (Uint8 id + Int32 count): 150,000 B raw, 50,116 B gzip |
  | Exactness over 30 years of monthly migration | 143,346,070 people before and after in both modes; no negative counts |

- **Rounding small flows matters** (same prototype, measured here):
  - With deterministic largest remainder, a settlement with a 2% minority and flows of 1–3 people a month sent 0 minority members among 720 movers in 30 years, against 14.4 expected. Keyed stochastic rounding sent 21.
  - Country-wide, largest remainder left 6,674 of 10,000 settlements with one culture and 580 with three or more. Stochastic rounding left 4,446 and 1,867.
  - National move rates by culture looked fine in both modes (0.986–1.010 against 1.000), so only a per-settlement check reveals the bias.
- **Round 6 budgets used here** ([report](../../round-6-goods-and-wellbeing/report.md), section 5): about 170 B per agent of 256 B; 510–640 B per settlement of 1 KB; desktop-to-RM factor ×1.9; day work in 1,024-entity slices gated at 0.35 ms RM; save target about 0.5 MB at 10,000 settlements.
- **Other costs measured in c and d:** names generate at about 220 per ms and take 0.5 ms each with naive filters, only on display. The guard demo ran 178 toy runs of 10,000 agents × 360 days in 142 s; that cost falls on headless CI, not play.

### Inferences

- **Per agent (computed):** 6 B of hot columns (`culture`, `culture2`, `cultureMix`, `birthCulture`: Uint8; `homeRegion`: Uint16). The optional household Δβ cache adds 14 B per household as Int16 × 7, about 5.7 B per agent at 2.46 per household.
  - That is 0.06 / 0.15 / 0.6 MB at 10k / 25k / 100k, plus up to 0.57 MB for the cache at 100k. It leaves about 74–80 B of the 256 B cap after round 6.
  - Names need no storage: (seed, id, birthCulture) rebuilds them. Festival membership is the culture plus the mix byte.
- **Per agent time (computed):** event-driven blending costs almost nothing, because culture changes are rare.
  - Festival attendance runs through the timing wheel, about 6 events per person-year at 10 festival days and 60% attendance.
  - Shopping already reads the household's shares, so adding Δβ costs one 7-entry add per budget update.
- **Global tables:** the festival calendar takes 8 cultures × 6 festivals × 8 B = 384 B. Culture Δβ rows take 8 × 7 × 4 B = 224 B. Each culture's phonology is a few hundred bytes of strings, kept in the UI bundle, not the sim.
- **Country tier (computed at ×1.9):**
  - Migration with the culture split costs about 0.9 ms RM a day at 10,000 settlements if spread over the month, and 0.09 ms at 1,000, about 6–7.5% of each budget.
  - The weekly demand shift costs about 0.32 ms RM a day at 10,000 settlements, round-robin (1.19 ms a week ÷ 7 × 1.9), or nothing if recomputed only when counts change.
  - Round 6 already found 10,000 settlements over budget in JavaScript before wealth. These additions belong in the same WASM port, and sparse loops over present cultures should come first.
- **Saves:** use the top-3 sparse layout where settlements hold three or fewer cultures, which was 97.3% of them here. Keep dense counts only for the 2.7% where a fourth culture is present, so the block stays exact. Plan on about +50 KB.
- **Audit logging** happens only in headless runs. The toy's fine strata (64 cells × 1,440 ticks × 2 cues) held up to 184,320 keys per run. Nomos's grid needs coarser place blocks or sampled days.

### Gaps

- All timings are single-desktop Node runs under other load (MSYS load 1.5–3). None ran in a browser, in WASM or on a phone.
- The migration kernel is a stand-in: an even split over 24 neighbours, not the plan's gravity kernel. Its cost combines the flow and the culture split.
- The household blend was not optimised (`fill`, no unrolling); event-driven recompute makes that moot.
- Save sizes come from a synthetic country (6 hearths, grid neighbours). Real maps with rivers and coasts may mix more or less.

## Recommendation for the plan

**One rule carries the design: culture shapes the demand side and leisure, never the supply side or any judgement.** It may change what people buy above subsistence, when and where they gather, what music they seek, how they are named and which region they call home. It never enters offending, victim choice, patrols, stops, arrests, reporting, hiring, wages, productivity, saving, returns, credit or inheritance. Four layers enforce it: a package boundary with lint, a relabel test, a threshold-level flip test, and an exposure audit that shows emergent differences instead of hiding them. Draft tasks follow, tagged (R8). They should be reconciled with `transmission.md` (representation and drift) and `prior-art-ethics.md` (respect and real-world mapping) in the report.

### M0 Pipeline

- [ ] Put culture code in its own package, `sim-culture`: preference rows, festival calendar, phonologies and home-region ids. Add a dependency-cruiser `reachable` rule and an ESLint profile so that crime, police, labour, wages, wealth and ability folders can neither import it nor read culture columns, whether by property, destructuring or bracket (R8).
- [ ] Add culture columns to `AgentStore`: `culture`, `culture2`, `cultureMix` and `birthCulture` (Uint8 each) and `homeRegion` (Uint16), 6 B per agent. Key every culture-level draw by a stable culture uid, never its index (R8).
- [ ] Add the relabel test: permuting culture ids together with their custom rows leaves every non-culture state hash identical. Run it on every pull request (R8).
- [ ] Make the keyed draw avalanche after every input (a murmur3-style finaliser), and extend the χ² test to cross-stream pairs. A weak mixer moved the culture audit by ±5% in testing (R8).
- [ ] Split small flows of people by culture with keyed stochastic rounding, never plain largest remainder. Largest remainder never moved a 2% minority over 30 years of 1–3-person flows (R8).

**Exit checks**

- [ ] The lint profile and dependency-cruiser catch planted direct, property, destructuring, bracket and transitive violations, and pass the consumption package (R8).
- [ ] The relabel test gives identical hashes for 3 seeds × 1 simulated year (R8).

### M1 Lab mode

- [ ] Add a bet card, "Evening festivals: will that culture be stopped more?", on paired seeds. In the prototype, victimisation rose 8.7% against daytime festivals, stops rose 1.3%, and the rate per outdoor hour stayed the same (R8).

### M2 Economy

- [ ] Let culture change only Stone–Geary marginal shares (β): the six food categories plus one wares-versus-services split. Shifts sum to zero, stay within ±25% of the neutral share (±40% on lab cards), and keep every category at 0.6× its neutral share or more (R8).
- [ ] Keep subsistence γ (in portions, bought cheapest-first), saving, labour supply, total consumption and grade culture-blind (R8).
- [ ] Set a household's Δβ to the mean of its adults' Δβ, rounded by largest remainder to sum to zero. Recompute it when a household or a culture changes, never daily (R8).
- [ ] Assign culture at spawn household by household, from the settlement's culture counts, on its own keyed stream, independent of wealth rank, jobs and hue. Check |Spearman| < 0.05 between culture and wealth decile (R8).
- [ ] Let shops stock anticipated festival demand from the public calendar. Log festival-week sales, markdowns, spoilage and price moves per category, and a "basket cost by culture" line per settlement, expected within ±2.5% of food spending (R8).

**Exit checks**

- [ ] Engel's law holds identically for every culture: the food share falls about 7.8 points per doubling, whatever the culture (R8).
- [ ] Unmet food need and the food-insecurity tally do not differ by culture at equal income on paired seeds (R8).

### M3 City life

- [ ] Give each culture a calendar of 4–6 festivals, 8–12 days a year, with the same total for every culture. Hold festivals only in leisure time (rest-day daytime or evenings), so culture never closes a workplace (R8).
- [ ] Count festival attendance as social contact that resets the isolation counter. Cap festival days per person per year at the culture total, and give no LS bonus by default (a knob, default 0) (R8).
- [ ] Raise demand for a festival's favoured categories 2–4× on festival days (an unsourced estimate). Fund it from the month's discretionary budget, keeping the monthly food total within +5%, and never from subsistence (R8).
- [ ] Hold music and arts events at the park or square, buying services. The event's style follows its culture; any services worker may perform any style (R8).
- [ ] Add per-culture name generators: 10–16 consonant letters, 5–7 vowel letters including one uncommon, moderately complex syllables and no gendered forms. Build names in the UI from (seed, id, birth culture), and show them only in the inspector and follow-cam (R8).
- [ ] Add a name filter for people, places and festivals:
  - distinctive Pokémon town and city names and species names, at edit distance 1 up to 5 letters and 2 above;
  - the "poke" and "-mon" bans;
  - LDNOOBW Latin-script lists, exact for 3-letter entries and substring for 4+;
  - a fixture of real festival names.
  The target is ≤ 5% rejection (R8).
- [ ] Screen each culture's phonology at authoring time by trigram similarity to real name bases (below 0.26 pass, 0.26–0.40 review, above 0.40 fail). Then put samples to M1's diverse playtest panel (R8).

**Exit checks**

- [ ] The name filter passes 1,000 seeds per culture, and every shipped culture passes the screen and the panel (R8).
- [ ] With equal festival days, mean contact and LS do not differ by culture on paired seeds (R8).

### M4 Crime and police

- [ ] Write every guarded decision as an integer threshold followed by one keyed draw. Add the flip test: shuffle culture, re-derive culture-package outputs, hold behaviour fixed, and require identical thresholds and utilities (R8).
- [ ] Show case numbers and roles, never names, in justice-facing views: the records office, the event log and recorded-crime panels (R8).
- [ ] Add the exposure audit. Log outdoor agent-ticks and events (victimisation, stops, wrongful stops, arrests, reports, trust) by culture, in place × time × visible-cue strata. Run it nightly over 50 paired seeds, with Mantel–Haenszel ratios overall and by period and equivalence at |ln ratio| ≤ 0.05 (R8).
- [ ] Add customs counterfactuals on the same seeds (festivals moved to daytime; culture reassigned at random) to attribute raw gaps (R8).

**Exit checks**

- [ ] The flip test changes zero thresholds over one seed-year of ticks, and catches planted id, custom and hiring leaks (R8).
- [ ] The audit passes equivalence on fine strata, or each exception is explained by a named place-time mechanism (R8).

### M5 Society and policy

- [ ] Add an opt-in Exposure lens. Per culture, it shows night outdoor hours, victimisation and police contacts per 1,000 people and per 1,000 outdoor hours, the share explained by exposure, and a paired daytime-festival what-if. Remedies act only on places and times: lighting, calendar-aware patrols, a festival-time slider (R8).
- [ ] Keep festival contact transient, building no lasting ties, unless an employment-by-culture audit also runs (R8).

### M6 Scale and sharing

- [ ] On the "What this toy leaves out" page, explain that Nomos excludes festival and taste spending that crowds out food among the poor (Atkin; Banerjee and Duflo), and why culture never enters crime, jobs or police perception (R8).
- [ ] Add the settlement culture block to the save format, top-3 sparse with dense counts where needed: about +50 KB gzip at 10,000 settlements, so the target becomes about 0.55 MB (R8).

### M7 Country of ledgers

- [ ] Add up to 8 Int32 culture counts per settlement (32 B), summing exactly to population. Split migration by origin culture counts with keyed stochastic rounding, spread over the month with sparse loops. Derive demand shifts from Σ share × Δβ, recomputed only when counts change (R8).

**Exit checks**

- [ ] People by culture sum exactly to population every day, spawn-fold is exact per culture, and minority move rates stay within 5% of their population share over 30 years (R8).

### M8 Country map

- [ ] Place 4–8 culture hearths by keyed Poisson-disc and grow regions by multi-source Dijkstra on the travel-cost mesh, with a mixed border band. Name places, regions and festivals from the region culture's phonology, keeping descriptive words ("Ford", "Port") separate (R8).
- [ ] Add a "home regions" map mode with hatching and labels. It never uses the six body-hue colours and is never the default view (R8).

### Verify before hard-coding

| Figure or question | Evidence now | Decides | Milestone |
|---|---|---|---|
| Taste band ±25% | Cross-country ICP residual, an upper bound; no within-country split | Size of cultural demand shifts | M2 |
| Festival demand 2–4× and attendance targets | Unsourced; US turkeys a search summary | Festival market spikes and crowds | M3 |
| Name screen cut-offs 0.26 and 0.40 | One fixture of 33 place-name bases | Which phonologies ship | M3 |
| Human reading of example names | No panel yet | Real-world mapping risk | M1, M3 |
| Fine-strata size on a 256² grid | Toy with 64 cells only | Audit memory and power | M4 |
| Equivalence margin 0.05 and 50 seeds | Proposal; power shown for one planted bias | Audit pass and fail | M4 |
| Network channel from festivals to jobs | Search summary only | Whether festival ties are allowed | M5 |
