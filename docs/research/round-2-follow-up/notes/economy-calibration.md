# Economy calibration targets and benchmark models for the "society of dots" market economy

Source-status tags used throughout: **(opened)** = page/file actually read; **(opened via git clone)** = repository cloned and files read locally; **(snippet only)** = number taken from a web-search result summary because the page itself was blocked by the network egress proxy. Almost every government and academic site was blocked in this session (full list in the Gaps of Key Question 1), so most official statistics below are snippet-only and should be spot-checked before they are hard-coded. All figures are US unless noted. Simulation time units: 1 tick = 1 day, 1 month = 21 days, 1 year = 12 months = 252 days.

Useful conversions (used in the Inferences):
- Monthly probability p to per-day hazard (21-day month): p_day = 1 − (1 − p)^(1/21).
- Monthly change frequency f to implied mean duration in months: d = −1 / ln(1 − f).
- Gross margin GM to markup over cost of goods: m = 1 / (1 − GM).

---

## Key Question 1: Price and wage stickiness (Bils & Klenow 2004, Nakamura & Steinsson 2008, Klenow & Kryvtsov 2008, post-2021 evidence, wage rigidity) and what it implies for Lengnick's θ = 0.75 and ϑ = 2%

### Takeaway
Before 2020, US regular (non-sale) consumer prices changed about 9–12% of months (median duration of about 7–11 months). Counting sales, the figure was about 20–26% (about 4 months). During the 2021–22 inflation surge the regular-price frequency roughly doubled, to about 20%/month, then fell back to about 15% by 2023. Lengnick's θ = 0.75 applies only when a firm's inventory is outside its band, so the right test is the frequency that emerges. The paper reports a median of about 9%/month, which matches the pre-2020 regular-price data. Wages are stickier and almost never fall: about 2% of job-stayers get a nominal base-wage cut each year, about 35% get no base-wage change, and about 12% of workers have roughly zero year-over-year wage growth (Aug 2026).

### Cited Findings
**Prices (US CPI micro data)**
- Bils & Klenow (2004, JPE): 350 categories covering about 70% of consumer spending, unpublished BLS data for 1995–97. Mean monthly frequency of price changes is 26.1% and the weighted median is 20.9%. Half of prices last less than 4.3 months (sales included). — [Bils & Klenow PDF](https://www.sas.rochester.edu/eco/people/faculty/bils_mark/assets/pdf/StickyPrices1.pdf) (snippet only)
- Restated by Klenow & Kryvtsov: Bils–Klenow median duration is 4.3 months for posted prices and "perhaps 5.5 months" for regular prices. — [Klenow & Kryvtsov 2008 PDF](http://klenow.com/KK.pdf) (snippet only)
- Nakamura & Steinsson (2008, QJE 123(4):1415–1464). Median monthly frequency of non-sale price change: 9–12% for identical items and 11–13% including product substitutions. With sales included: 19–20% for identical items and 21–22% with substitutions. Finished-goods producer prices change about as often as consumer prices excluding sales. — [IDEAS record](https://ideas.repec.org/a/oup/qjecon/v123y2008i4p1415-1464..html); [JSTOR](https://www.jstor.org/stable/40506213) (snippet only)
- Klenow & Kryvtsov (2008, QJE): for the median category, prices change about every 4 months including sales and about every 7 months excluding them. Regular prices have a mean implied duration of 8.6 months (median 7.2). — [KK 2008 PDF](http://klenow.com/KK.pdf); [UC Davis copy](https://faculty.econ.ucdavis.edu/faculty/kdsalyer/LECTURES/Ecn235a/presentation%20papers/Klenow_Kryvtsov.pdf) (snippet only)
- Klenow & Kryvtsov (2005 working-paper version), as cited by Caiani et al.: monthly frequency of price changes is 29.3%, implying a pseudo-average duration of 3.4 months. — [Caiani et al. working paper PDF in the S120/benchmark repo](https://github.com/S120/benchmark/blob/master/benchmark/paper/BenchmarkModel.pdf) (opened via git clone; secondary citation)
- Montag & Villar (FEDS Note, 29 Aug 2023; FEDS WP 2025-024 "Post-Pandemic Price Flexibility in the U.S."), using CPI micro data:
  - Before the Covid inflation, firms changed prices about every ten months. At the peak this fell to about every five months (about 2.4 changes per year).
  - From the start of 2022 the frequency fell from about 0.20 to just below 0.15.
  - The average size of price changes rose as increases became more common, but the absolute size changed little, and the dispersion of price changes did not fall.
  - A menu-cost model fitted to pre-pandemic data cannot match the post-pandemic rise in frequency.
  - Sources: [FEDS Note](https://www.federalreserve.gov/econres/notes/feds-notes/price-setting-during-the-covid-era-20230829.html); [FEDS WP 2025-024](https://www.federalreserve.gov/econres/feds/files/2025024pap.pdf); [Richmond Fed Econ Focus 2023 Q4](https://www.richmondfed.org/publications/research/econ_focus/2023/q4_feature1) (snippet only)
- Euro area (for comparison): monthly frequency averaged 8% over 2010–2019, rose to 12% in 2022 and peaked near 16% in January 2023. The rise came mainly from more price increases. — [ECB Economic Bulletin 3/2024 article](https://www.ecb.europa.eu/press/economic-bulletin/articles/2024/html/ecb.ebart202403_02~5de13ad1b7.en.html) (snippet only)

**Lengnick's own price-setting rule and its emergent frequency**
- Lengnick (2013), Section 2.2, Eqs. (6)–(10), as transcribed in the replication's paper-conformance tests:
  - The firm considers raising its price when inventory is below φ_lower × demand, and cutting it when inventory is above φ_upper × demand.
  - Prices stay within [1.025, 1.15] × marginal cost.
  - The new price is adopted only with probability θ = 0.75, and the change is drawn up to ϑ = 0.02.
  - Source: [avakeeling199/Lengnick-replication, tests/test_paper_conformance.py](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)
- Emergent results in the paper's Fig. 6, per the replication's figure script: the median monthly price-change frequency is 9%, the skewness of price-change frequency across firms is about 0.47, and the skewness of firm size is about 1.88. — [Lengnick-replication scripts/make_tier1_figures_singlerun.py](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone). A search summary describes the paper's simulated frequency distribution as right-skewed with a median "between 9 and 12 percent per month". That may conflate the model output with Nakamura–Steinsson's empirical range. — [Lengnick 2013 PDF (TU Wien copy)](https://legacy.econ.tuwien.ac.at/lva/compeco.se/artikel/jebo_2013_agent_based_macroeconomics_a_baseline_model.pdf) (snippet only)

**Wages**
- Grigsby, Hurst & Yildirmaz (2021, AER 111(2):428–71), using ADP administrative payroll data: only about 2% of job-stayers receive a nominal base-wage cut in a given year, and about 35% receive no base-wage change year over year. — [NBER w25628](https://www.nber.org/papers/w25628); [AEA page](https://www.aeaweb.org/articles?id=10.1257%2Faer.20190318) (snippet only)
- Atlanta Fed Wage Growth Tracker, Aug 2026: overall 4.1% (July 3.8%). Job stayers 3.6% (held steady); job switchers 5.0% (July 4.4%). July 2026 values: overall 3.8%, stayers 3.6% (June 3.4%), switchers 4.4% (June 4.1%). — [Atlanta Fed WGT](https://www.atlantafed.org/research-and-data/data/wage-growth-tracker); [Atlanta Fed post on X](https://x.com/AtlantaFed/status/2087951562538664385) (snippet only)
- Atlanta Fed share of "zero" wage changes (year-over-year change within ±0.5%): 12.4% in Aug 2026, down from 12.9% in July 2026. Record high 17.1% (Feb 2011); record low 10.1% (Nov 2000). The share rose in both of the last two recessions. — [Atlanta Fed WGT](https://www.atlantafed.org/research-and-data/data/wage-growth-tracker); [Wage Rigidity Meter (FRASER)](https://fraser.stlouisfed.org/title/wage-rigidity-meter-6771) (snippet only; the monthly values could not be opened, so verify them)
- Lengnick's wage rule, quoting the paper: a firm raises its wage if a vacancy went unfilled last month. It lowers the wage only if all positions stayed filled for γ = 24 months. The new wage is w × (1 ± U[0, δ]) with δ = 0.019. — [Lengnick-replication tests](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)

### Inferences
- **θ = 0.75 is a conditional probability, so do not compare it with empirical frequencies.** If a firm is outside its inventory band (and inside the markup bounds) a fraction b of months, its unconditional monthly price-change frequency is about 0.75 × b. A pre-2020 target of about 10%/month needs b ≈ 13%. An inflation-era target of about 20%/month needs b ≈ 27%. Validate the emergent median frequency, not θ:
  - normal regime: 9–12%/month (Nakamura–Steinsson regular prices; Lengnick reports about 9%);
  - with sales-like temporary cuts: about 20%/month;
  - inflationary regime (fiat money with high MINT issuance): 15–20%/month.
- **Per-tick equivalents (21-day month):**
  - 10%/month ≈ 0.50%/day;
  - 15%/month ≈ 0.77%/day;
  - 20%/month ≈ 1.06%/day;
  - 26%/month ≈ 1.42%/day.
  - Implied durations: 9% → 10.6 months; 12% → 7.8 months; 20.9% → 4.3 months, which reproduces Bils–Klenow's 4.3 and so checks the formula.
- **ϑ = 2% sets the size of each price step, not how often prices change.** Each adjustment draws from U(0, 2%), so the mean step is 1%. The micro data say sizes changed little even when frequency doubled (Montag–Villar). So keep ϑ fixed across policy regimes and let frequency carry the inflation response. An inflation shock that forces firms to keep hitting the price bounds will show up as higher frequency, which is the empirically correct margin. The empirical absolute size of price changes was not retrieved in this session (see Gaps), so I cannot say whether ϑ = 2% is realistic.
- **Wage tests for the simulation:**
  1. In a fixed-money, zero-productivity-growth economy, steady-state nominal wage growth should be about 0. Validate the distribution of wage changes instead: about 2% of worker-years with a nominal cut, about 12% (range 10–17%) with roughly zero change, and a cut share that rises in downturns.
  2. Lengnick's γ = 24-month rule caps cuts at one per firm per two years, which should keep cut shares low. Check that the share of worker-years with a cut is about 2%, not 10%+.
  3. Under a fiat regime with 2–3% inflation, job-stayer median wage growth of about 3.5–4%/yr is the target, and job switchers should earn about 1–1.5 pp more than stayers (Aug 2026: 5.0% vs 3.6%).
- **δ = 1.9%/month max raise:** the mean raise per adjustment is about 0.95%. Reaching about 3.6%/yr needs about 3.8 net upward adjustments per year. If the simulation shows much more wage drift with stable prices, δ or the vacancy trigger is too generous.

### Gaps
- No primary page could be opened for Bils–Klenow, Nakamura–Steinsson, Klenow–Kryvtsov, Montag–Villar or Grigsby–Hurst–Yildirmaz. All numbers are snippet-only, apart from the Klenow–Kryvtsov 2005 figure read inside the Caiani PDF.
- The average absolute size of regular price changes (needed to judge ϑ = 2%) was not retrieved. The web-search budget ran out before it could be searched.
- The month-by-month 2024–2026 US frequency of price changes after the 2023 decline was not found. The latest point found is "just below 0.15" in 2023.
- Grigsby–Hurst–Yildirmaz's evidence on the timing of wage changes (for example, clustering at 12-month intervals) was not confirmed.

#### Access log (applies to all sections)
- **Blocked** (WebFetch "EGRESS_BLOCKED" or curl CONNECT 403):
  - US statistical agencies and the Fed: bls.gov (including data.bls.gov, download.bls.gov, api.bls.gov), census.gov / www2.census.gov / api.census.gov, federalreserve.gov, fred.stlouisfed.org / files.stlouisfed.org, bea.gov / apps.bea.gov, atlantafed.org, kansascityfed.org, chicagofed.org, philadelphiafed.org, richmondfed.org, frbsf.org, newyorkfed.org, dallasfed.org, minneapolisfed.org, clevelandfed.org, bostonfed.org, cbo.gov, dol.gov, congress.gov.
  - Papers and indexes: arxiv.org / export.arxiv.org, nber.org, papers.ssrn.com, aeaweb.org, sciencedirect.com, academic.oup.com, journals.uchicago.edu, jstor.org, link.springer.com, onlinelibrary.wiley.com, tandfonline.com, cambridge.org, mdpi.com, journals.plos.org, nature.com, science.org, doi.org, ideas.repec.org, econpapers.repec.org, econstor.eu, researchgate.net, semanticscholar.org, core.ac.uk, scholar.archive.org, hal.science, jasss.org, zenodo.org, openicpsr.org, en.wikipedia.org.
  - Statistics and policy sites: ecb.europa.eu, imf.org, bis.org, oecd.org, ourworldindata.org, wid.world, pip.worldbank.org.
  - University and author pages: klenow.com, sas.rochester.edu, faculty.econ.ucdavis.edu, legacy.econ.tuwien.ac.at (Lengnick 2013 PDF), macau.uni-kiel.de (Lengnick dissertation), uni-kiel.de, ifw-kiel.de, indico.ijclab.in2p3.fr (Mark-0 paper PDF), ofce.sciences-po.fr, lem.sssup.it, iris.sssup.it, faculty.sites.iastate.edu (Tesfatsion archive), gabriel-zucman.eu, econ.ku.dk, eml.berkeley.edu, web.stanford.edu, scholar.harvard.edu, economics.yale.edu, crei.cat, janeeckhout.com, sites.google.com.
  - News and data aggregators: openresearchlab.org, hiringlab.indeed.com, epi.org, tradingeconomics.com, ycharts.com, statista.com, cnbc.com, reuters.com, brookings.edu, urban.org, pewresearch.org, x.com.
- **Reachable:** github.com (pages and `git clone`), raw.githubusercontent.com, gitlab.com, bitbucket.org, pypi.org, registry.npmjs.org.
- **Search budget:** the session-wide WebSearch budget (200 calls, shared with parallel researchers) ran out near the end. Some items listed in later Gaps could therefore not be searched.

---

## Key Question 2: Labour-market flows (CPS flows, JOLTS, unemployment duration) and the search parameters β (firms sampled) and π (on-the-job search) that would reproduce them

### Takeaway
The latest data show a "low-hire, low-fire" labour market:
- JOLTS, Aug 2026: hires 3.3%/month, quits 1.9%, layoffs 1.0%, total separations 3.2%, openings rate 4.3%.
- CPS, Aug to Sep 2026: about 1.86M unemployed found jobs, out of about 7.0M unemployed. That is a monthly job-finding rate of about 26%.
- Median unemployment spell 11.5 weeks; mean 24.8 weeks (Sep 2026).

With Lengnick-style random search (β = 5 firm visits), a 26% finding rate needs only about 6% of firm visits to land on an open, acceptable vacancy. That is far fewer vacancies than JOLTS implies, so either acceptance (the reservation wage) must bind or β must be lower. The plan's π = 0.1 produces job-to-job moves an order of magnitude below the JOLTS quits rate.

### Cited Findings
- JOLTS, August 2026:
  - job openings 7.079M, rate 4.3%;
  - hires 5.192M (+46k), rate 3.3%;
  - total separations about 5.1M (unchanged), rate 3.2%;
  - quits 3.066M (−23k), rate 1.9%, joint-lowest since June 2020;
  - layoffs and discharges 1.641M (−61k), rate 1.0%, the fewest since March 2025.
  - Indeed characterises the month as "little change, limited dynamism".
  - Sources: [Indeed Hiring Lab, 29 Sep 2026](https://hiringlab.indeed.com/2026/09/29/august-2026-jolts-report/); [BLS JOLTS release PDF](https://www.bls.gov/news.release/pdf/jolts.pdf); [BLS JOLTS summary](https://www.bls.gov/news.release/jolts.nr0.htm); [dca-calculator summary](https://dca-calculator.com/en/guides/jolts-august-2026) (snippet only)
- CPS labour-force status flows, August to September 2026, seasonally adjusted: unemployed to employed 1,858k; employed to unemployed 1,446k. Earlier unemployed-to-employed values: 1,832k (Jan 2026), 1,688k (Feb), 1,882k (Mar). — [BLS labor force status flows](https://www.bls.gov/web/empsit/cps_flows_current.htm); [FRED LNS17100000](https://fred.stlouisfed.org/series/LNS17100000) (snippet only)
- August 2026: unemployment rate 4.1%, about 7.0M unemployed; payrolls +162k (release of 4 Sep 2026). September 2026: unemployment rate 4.2%. — [BLS Employment Situation archive, Aug 2026](https://www.bls.gov/news.release/archives/empsit_09042026.htm); [CNBC, 4 Sep 2026](https://www.cnbc.com/2026/09/04/jobs-report-august-2026.html); [BLS Table A, Sep 2026](https://www.bls.gov/news.release/empsit.a.htm) (snippet only)
- Unemployment duration, September 2026, seasonally adjusted:
  - fewer than 5 weeks: 2,098k;
  - 5–14 weeks: 1,956k;
  - 15–26 weeks: 1,189k;
  - 27 weeks and over: 1,944k;
  - median 11.5 weeks; mean 24.8 weeks.
  - Sources: [BLS Table A-12](https://www.bls.gov/news.release/empsit.t12.htm); [BLS Employment Situation](https://www.bls.gov/news.release/empsit.htm) (snippet only)
- Lengnick's search rules, quoting the paper:
  - An unemployed household visits randomly chosen firms until it finds an open position paying enough, up to β = 5 firms per month.
  - An employed household searches one other firm with probability π = 0.1 per month.
  - A household whose wage is below its reservation wage searches with probability 1.
  - The reservation wage falls 10% for each month of unemployment and rises to the received wage when income exceeds it.
  - Firing takes effect with a one-month lag.
  - Sources: [Lengnick-replication tests](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone); [newwayland/baseline-economy notes/issues.md](https://github.com/newwayland/baseline-economy) (opened via git clone)
- In Lengnick a firm opens at most one position per month when inventory is below the lower band, and marks one worker to fire when inventory is above the upper band. — [newwayland/baseline-economy notes/issues.md and Lengnick-replication tests](https://github.com/newwayland/baseline-economy) (opened via git clone)

### Inferences
- **Monthly targets for a 1,000-household economy** (2026 US levels; the simulation has no "not in labour force" state):

  | Measure | US rate (2026) | Per 1,000 households per month |
  |---|---|---|
  | Unemployment-to-employment (job-finding) | 1,858k / ≈7.0M ≈ 26.5% | about 26% of the unemployed |
  | Hires | 3.3% | about 32 |
  | Quits | 1.9% | about 18 |
  | Layoffs | 1.0% | about 10 |
  | Unemployment rate | 4.1–4.2% | about 41–42 unemployed |

  The employment-to-unemployment probability is roughly 0.9% if employment is about 160M, but the employment level was not retrieved. Per-day job-finding hazard is about 1.42%.
- **Steady-state consistency:** u = s / (s + f). With f = 0.26 and u = 4.1%, the required monthly separation probability is s = u·f/(1 − u) ≈ 1.1%. That matches the JOLTS layoff rate of 1.0%, which makes it a clean joint calibration target.
- **β (firms sampled by the unemployed):** P(find) = 1 − (1 − q)^β, where q is the share of firm visits that hit an open vacancy paying at least the reservation wage.
  - With β = 5 and f = 0.26, q ≈ 5.8%; with f = 0.30, q ≈ 6.9%.
  - A JOLTS-like openings rate of 4.3% would mean about 43 vacancies across 100 firms, so q_raw ≈ 0.43 and f ≈ 94% if every vacancy were acceptable. To keep f near 26% with β = 5, only about 13% of vacancies may be acceptable to a given searcher (reservation wage binding).
  - Alternatively, set β ≈ 1 and let about 60% of vacancies be acceptable.
  - Bottom line: β = 5 is defensible only if wage dispersion or reservation wages make most vacancies unacceptable. Log q in the simulation as a diagnostic.
- **π (on-the-job search):** job-to-job moves ≈ π · q_raw · P(offer beats current wage).
  - With π = 0.1, q_raw ≈ 0.06–0.4 and P(better) ≈ 0.5, this gives 0.3–2% per month.
  - Under the realistic low-q case it is about 0.3%, an order of magnitude below the 1.9% JOLTS quits rate.
  - Quits also include moves out of employment, so the true job-to-job target is lower (not retrieved in this session).
  - Suggested target: π roughly 0.3–0.6 with one firm sampled, or keep π = 0.1 and sample 3–5 firms when searching. Tune until monthly voluntary moves are about 1–2% of employed.
- **Duration test:** a constant hazard f = 0.26 gives a median spell of about 2.3 months (about 10 weeks), close to the observed 11.5 weeks. But it gives a mean of only 3.8 months (about 16.7 weeks) against 24.8 observed, and only about 15% of the unemployed out 27+ weeks against about 27% observed (1,944 / 7,187). The simulation therefore needs heterogeneity or negative duration dependence. Lengnick's 10%/month reservation-wage decay produces the opposite (positive) duration dependence, so expect it to under-produce long-term unemployment.

### Gaps
- No BLS, FRED or JOLTS page could be opened, so all flow numbers are snippet-only. The CPS employment level for August 2026, which is needed for an exact employment-to-unemployment rate, was not retrieved.
- No source was retrieved for a direct US job-to-job (employment-to-employment) monthly rate, which would be a cleaner target for π than JOLTS quits.

---

## Key Question 3: Firm dynamics: survival, exit rates, size distribution, inventories and margins/markups

### Takeaway
- Survival of new US establishments: about 78% after 1 year, about 51% after 5, about 35% after 10.
- Annual exit: roughly 7.5% (firms) to 8.5% (establishments).
- The firm-size distribution is approximately Zipf, with exponent about 1.
- Retail holds about 1.27 months of sales in inventory (July 2026).
- Retail gross margins are about 26–33%, which implies markups of about 1.36–1.50 over the cost of goods.

Lengnick's inventory band (0.25–1.0 months of demand) and markup band (1.025–1.15 over labour cost) both sit well below these retail figures.

### Cited Findings
- BLS Business Employment Dynamics establishment survival:
  - 77.9% survive year 1 (cohort opened in the year ending March 2024, i.e. a 22.1% first-year exit);
  - 51.4% survive 5 years (48.6% of the March 2020 cohort gone by March 2025);
  - 34.7% survive 10 years;
  - 12.6% of the March 1994 cohort was still operating in March 2025.
  - Sources: [startbusinessbystate.com (BLS BED aggregation)](https://startbusinessbystate.com/business-survival-rates-by-state/); [BLS TED 2024 1-year survival](https://www.bls.gov/opub/ted/2024/1-year-survival-rates-for-new-business-establishments-by-year-and-location.htm) (snippet only; aggregator, so cohort labels are uncertain)
- The 10-year figure is confirmed by a BLS article title: "34.7 percent of business establishments born in 2013 were still operating in 2023". The aggregator instead attributes 34.7% to the 2015 cohort in 2025, a conflict in cohort labels. — [BLS TED 2024](https://www.bls.gov/opub/ted/2024/34-7-percent-of-business-establishments-born-in-2013-were-still-operating-in-2023.htm) (snippet only)
- Annual exit rates: firm exit rates have averaged about 7.5% and establishment exit rates about 8.5% "in recent years". — [Fed FEDS Note, Business entry and exit in the COVID-19 pandemic (2022)](https://www.federalreserve.gov/econres/notes/feds-notes/business-entry-and-exit-in-the-covid-19-pandemic-a-preliminary-look-at-official-data-20220506.html) (snippet only; attribution to this exact page is uncertain)
- The Census BDS 2023 vintage was released on 25 Sep 2025, covering 1978–2023. — [Census press release](https://www.census.gov/newsroom/press-releases/2025/business-dynamics-statistics.html) (snippet only)
- Warning: a snippet's "2023 entry rate 12.3%, exit rate 11.9%" comes from Statistics Canada, not the US. — [StatCan Daily](https://www150.statcan.gc.ca/n1/daily-quotidien/260212/dq260212a-eng.htm) (snippet only)
- Axtell (2001, Science 293:1818–1820): firm sizes over the whole population of US tax-paying firms follow a Zipf law, where the probability a firm is larger than s is proportional to 1/s. Estimated exponents range from 0.996 to 1.059 across years and size definitions. — [Science](https://www.science.org/doi/10.1126/science.1062081); [SSRN](https://www.ssrn.com/abstract=2826882) (snippet only)
- Counterpoint: Census CES working paper 21-15, "Heavy Tailed, but not Zipf: Firm and Establishment Size in the U.S." — [CES-WP-21-15](https://www2.census.gov/ces/wp/2021/CES-WP-21-15.pdf) (title only, snippet only)
- Caiani et al. (2016) survey this literature: firm-size distributions are right-skewed and fat-tailed. Studies variously find log-normal (Stanley et al. 1995) or Zipf/power-law (Axtell 2001, exponent of −1) shapes. — [Caiani et al. working paper PDF](https://github.com/S120/benchmark/blob/master/benchmark/paper/BenchmarkModel.pdf) (opened via git clone)
- Inventory-to-sales ratios, July 2026, seasonally adjusted:
  - retailers 1.27 (1.22 not seasonally adjusted);
  - total business 1.30;
  - merchant wholesalers 1.20 (1.28 in July 2025).
  - Total business inventories $2,764.7B, +0.8% from June and +3.8% year on year.
  - Sources: [Census MTIS](https://www.census.gov/mtis/www/data/pdf/mtis_current.pdf); [Census wholesale July 2026](https://www.census.gov/wholesale/pdf/mwts/currentwhl.pdf); [FRED retail I/S](https://fred.stlouisfed.org/series/MRTSIR44000USN) (snippet only)
- Retail margins (Damodaran, NYU Stern, January 2026 update):

  | Industry | Gross margin | Net margin | EBITDA margin |
  |---|---|---|---|
  | Retail (General) | 33.18% | 5.61% | 10.11% |
  | Retail (Grocery and Food) | 26.31% | 1.32% | 5.40% |

  Sources: [Damodaran margins by sector](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) (snippet only; this domain was not tested for reachability)
- The Census Annual Retail Trade Survey publishes gross margins for 33 retail industries for 2004–2022. The values were not retrieved. — [Census ARTS](https://www.census.gov/programs-surveys/arts.html) (snippet only)
- De Loecker, Eeckhout & Unger (2020, QJE 135(2):561–644): the average US markup over marginal cost rose from about 1.21 in 1980 to about 1.61 in 2016, concentrated in the upper tail. — [Eeckhout PDF](https://www.janeeckhout.com/wp-content/uploads/RMP.pdf) (snippet only)

### Inferences
- **Exit and entry targets for 100 firms:**
  - About 7.5–8.5 exits per year, i.e. a monthly exit hazard of about 0.65% (1 − 0.925^(1/12)), or about 0.031% per day.
  - The hazard should fall with age. Implied from the survival points: about 22% in year 1, about 9.9%/yr in years 2–5 ((0.514/0.779)^(1/4) = 0.901), and about 7.6%/yr in years 6–10.
  - Test: after a long run, the survival curve of BAM-style entrants should pass near 78% at 12 months, 51% at 60 months and 35% at 120 months.
- **Size distribution:** with only 100 firms (mean about 10 workers), Zipf's α ≈ 1 cannot be estimated reliably. Use simpler checks:
  - right skew, with firm-size skewness about 1.9 (Lengnick's reported 1.88, per Key Question 6);
  - a largest firm several times the median;
  - optionally, a log-log rank-size slope near −1 on runs with more firms.
- **Inventory band:** Lengnick's band of 0.25–1.0 × last month's demand means an inventory-to-sales ratio of 0.25–1.0 months. US retail holds 1.27 months (about 27 working days of sales; 1.27 × 21). If the shops' stocks should look like real retail, centre the band near 1.2–1.3 (for example 0.8–1.6). For pure Lengnick replication, keep the original band.
- **Markups:** Lengnick's band of 1.025–1.15 over marginal labour cost means gross margins of only 2.4–13%. In the plan, shops buy goods in a wholesale call auction, so the shop-level markup over wholesale cost should be about 1.36 (grocery) to 1.50 (general retail) to match US retail gross margins. Net margins of about 1–6% leave room for wages and other costs. The economy-wide markup statistic of 1.61 (2016) is a sales-weighted, Compustat-based upper reference, not a retail target.

### Gaps
- No BLS BED, Census BDS, Census MTIS/MARTS or ARTS page could be opened. BDS 2023 US exit rates and ARTS gross margins for 2023/2024 were not retrieved, partly because the search budget ran out.
- The cohort labels for the BED survival figures conflict between the aggregator and the BLS article title (see above).

---

## Key Question 4: Households: budget shares (CE), income Gini, wealth Gini and top shares, saving rate, M2 velocity

### Takeaway
**Budget shares.** The latest released Consumer Expenditure data are for 2024 (published Sept 2025): average spending $78,535, of which housing 33.4%, transportation 17.0%, food 12.9% (7.9% at home, 5.0% away) and healthcare about 7.9%. The 2025 release is scheduled for 30 Oct 2026 and has gaps caused by the 2025 shutdown.

**Inequality, saving and money:**

| Target | Value | Year |
|---|---|---|
| Household income Gini, pretax money income | 0.490 | 2025 |
| Household income Gini, post-tax | 0.448 | 2025 |
| Wealth Gini (SCF) | about 0.83 | 2022 |
| Top 1% wealth share | 31.6% (DFA) to 35% (SCF) | Q1 2026 / 2022 |
| Personal saving rate | 4.1% | Aug 2026 |
| M2 velocity | 1.418 | 2026 Q2 |

### Cited Findings
- **CE 2024, the latest released year:**
  - average annual expenditures $78,535;
  - housing 33.4%, transportation 17.0%, food 12.9%, healthcare 7.9%;
  - housing and transportation together account for 50% of spending;
  - food at home $6,224, food away from home $3,945;
  - changes on 2023: food at home +2.8%, food away +0.3%, food +1.8%, healthcare +0.6%, entertainment −0.7%, apparel and services −2.0%.
  - Sources: [BLS CE 2024 release PDF](https://www.bls.gov/news.release/pdf/cesan.pdf); [BLS Reports: Consumer expenditures in 2024](https://www.bls.gov/opub/reports/consumer-expenditures/2024/home.htm); [USDA ERS chart: food 12.9% in 2024](https://ers.usda.gov/data-products/chart-gallery/58276) (snippet only; the healthcare 7.9% figure should be double-checked because it coincides with the food-at-home share)
- **CE 2025:**
  - Scheduled for release 30 Oct 2026 (one source says 29 Oct).
  - No CE data were collected in October–November 2025 because of the 1 Oct to 12 Nov 2025 lapse in appropriations; collection resumed 5 Dec 2025.
  - BLS reweighted affected months (×3 for months missing one-third of reports, ×3/2 for months missing two-thirds).
  - Sources: [BLS 2026 release schedule](https://www.bls.gov/schedule/news_release/current_year.asp); [BLS shutdown impact on CE](https://www.bls.gov/cex/2025-federal-government-shutdown-impact-ce.htm); [MLR 2026 article](https://www.bls.gov/opub/mlr/2026/article/addressing-missing-consumer-expenditure-data-due-to-the-2025-lapse-in-appropriations.htm) (snippet only)
- **Census "Income in the United States: 2025" (P60-289, released 15 Sep 2026):**
  - real median household income $87,460, +2.6% from $85,210 in 2024, a record;
  - median post-tax household income $76,060, up from $73,760;
  - Gini index (pretax money income) 0.490, not statistically different from 2024;
  - post-tax Gini 0.448, which is 8.7% lower than pretax;
  - 90th-percentile income +1.7%; 10th percentile no significant change.
  - Sources: [Census P60-289 PDF](https://www2.census.gov/library/publications/2026/demo/p60-289.pdf); [Census press release](https://www.census.gov/newsroom/press-releases/2026/income-poverty-health-insurance-coverage.html) (snippet only; one snippet gives the 2024 Gini as 0.488, unverified)
- **Survey of Consumer Finances 2022:**
  - median net worth about $192,700–192,900, up 37% from 2019; mean about $1.06M;
  - wealth Gini 0.83, compared with 0.61 for income and 0.68 for earnings in the SCF;
  - wealth Gini path: 0.79 (1989), 0.86 (2016), 0.83 (2022);
  - top 1% hold about 35% of wealth;
  - top 10% hold about 69% (about 60% if Social Security wealth is included).
  - Sources: [VoxEU/CEPR column "US wealth inequality in 2022"](https://cepr.org/voxeu/columns/us-wealth-inequality-2022-modest-reversal-top-persistent-challenges-below); [Ríos-Rull et al. SCF update](https://www.sas.upenn.edu/~vr0j/papers/vrUpdate-22.pdf); [CBO wealth working paper](https://cbo.gov/system/files/2023-02/58305-Wealth.pdf); [Fed SCF chart page](https://www.federalreserve.gov/econres/scf/dataviz/scf/chart/) (snippet only; which source reported which figure is uncertain)
- **SCF 2025:** fieldwork began in 2025 and results are expected "late 2026". No release was found as of early October 2026. — [St. Louis Fed Open Vault, June 2025](https://www.stlouisfed.org/open-vault/2025/june/the-state-of-us-household-wealth) (snippet only)
- **Fed Distributional Financial Accounts:** at 31 March 2026 the top 1% held 31.63% of $174.0T total household net worth. Aggregators put the top 10% at about 67% and the bottom 50% at about 2.5%. — [FRED WFRBST01134](https://fred.stlouisfed.org/series/WFRBST01134); [usluck summary](https://www.usluck.com/888677/oc-the-top-1-of-u-s-households-now-hold-31-6-of-all-household-wealth-and-the-bottom-90-hold-32-1/) (snippet only; the top-10% and bottom-50% figures are low-confidence aggregator numbers)
- **Personal saving rate:** 4.1% of disposable income in August 2026, down from 4.6% in July; personal saving $990.2B. Personal income +0.2%, disposable income +0.3%, consumption spending +0.9% (release of 30 Sep 2026). — [BEA Personal Income and Outlays, August 2026](https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026) (snippet only)
- **Velocity of M2 (nominal GDP divided by the quarterly average of M2):** 1.418 in 2026 Q2 (updated 30 Sep 2026). — [FRED M2V](https://fred.stlouisfed.org/series/M2V) (snippet only)

### Inferences
- **Stone–Geary seeding from CE 2024:**
  - shares: housing 0.334, transport 0.170, food at home 0.079, food away 0.050, healthcare 0.079, everything else about 0.288 (residual);
  - in U = Σ β_i ln(c_i − γ_i), spending is e_i = p_i γ_i + β_i (Y − Σ p_j γ_j), so average shares equal the marginal shares β_i only when subsistence spending is small;
  - a practical recipe: set the γ_i so that subsistence spending equals the plan's welfare floor, then solve for β_i so that budget shares at mean income match the CE shares above;
  - food then has a higher average than marginal share, as Engel's law requires.
- **Inequality targets (measure money income, including wages, profit share and transfers, over a 12-month window):**
  - pretax income Gini about 0.49;
  - post-tax-and-transfer Gini about 0.45, so the income-tax and welfare sliders should cut the Gini by about 8–9% at US-like settings;
  - wealth (money holdings) Gini about 0.83;
  - top 1% wealth share about 31–35%; top 10% about 67–69%.
- **Concentration risk in Lengnick:** profits are paid out in proportion to household liquidity. That is a multiplicative, rich-get-richer channel, so watch whether wealth concentration overshoots 0.83 over long runs (compare the Yard-Sale benchmark already in the plan).
- **The saving-rate target conflicts with fixed money.** In a stationary, fixed-money economy aggregate household saving must average 0, because the money stock is constant. A positive 4.1% saving rate is achievable only in the fiat regime, where the MINT issues new money, or as a cross-sectional statistic (savers offset by dissavers). Use 4% as a fiat-regime target, and use "about 0 in aggregate" as an accounting test of the integer-cent ledger in fixed-money mode.
- **Velocity and initial money:** with M2 velocity of about 1.4, money holdings equal about 8.5 months of annual spending (12 / 1.418).
  - The Lengnick replication's starting point is household cash of 3,100 against a 1,428 monthly wage, about 2.2 months of wages. That implies a velocity of roughly 5 per year, which is closer to a transactions-money (M1-like) concept.
  - For an M2-like velocity, endow households with about 8–9 months of spending.
  - Report velocity in the dashboard as 12 × monthly nominal sales ÷ total money held by households and firms.

### Gaps
- Not retrieved because the search budget ran out:
  - CE 2024 dollar figures for personal insurance and pensions, entertainment, apparel, cash contributions, education and other categories;
  - CE shares by income quintile, which would help calibrate subsistence;
  - Census 2025 quintile income shares.
- SCF 2025 has not been published, so 2022 remains the latest survey wealth Gini. The DFA top-10% and bottom-50% shares came only from aggregators.
- No BEA, FRED, Census or Fed page could be opened, so every number in this section is snippet-only.

---

## Key Question 5: Benchmark macro ABMs with known, testable behaviour (Mark-0, Caiani et al. 2016 AB-SFC, Dosi K+S, CATS/BAM, Jamel, others), open-source implementations and licences, and stylized-fact lists

### Takeaway
- **Mark-0** is the most useful extra benchmark for a browser simulation. It is small (firms plus a representative household), has a known four-phase diagram (FE, FU, RU and EC: full employment, full unemployment, residual unemployment and endogenous crises), and the transition is controlled by R = η₊/η₋, the ratio of hiring to firing propensity, together with Θ, the bankruptcy threshold measured as debt over payroll. An MIT-licensed reference code exists. I compiled it and swept R and Θ, giving a concrete phase table the TypeScript port can be tested against.
- **BAM** (bam-engine, MIT) ships numeric validation targets taken from Delli Gatti et al. (2011).
- **Caiani et al. (2016)** provide stock-flow-consistent volatility and correlation facts.
- **K+S, Jamel and BeforeIT.jl** are larger models. Their licences range from no licence file, to GPL-3.0, to Apache-2.0.

### Cited Findings
**Mark-0 (Gualdi, Tarzia, Zamponi & Bouchaud 2015, JEDC, doi:10.1016/j.jedc.2014.08.003)**
- Phase diagram, per search snippets:
  - In the R–Θ plane there are four phases: FE, FU, RU and EC.
  - FE holds for R > R_c with large Θ and shows positive average inflation; FU holds for R < R_c and shows deflation.
  - The diagram is "extremely robust" to model details and other parameters, which shift the boundaries but not the qualitative behaviour.
  - Mark-0 has no exogenous shocks, so crises are purely endogenous.
  - R = η₊⁰/η₋⁰. When R < R_c (fast downward production adjustment), the economy collapses to full unemployment.
  - Sources: [arXiv 1307.5319](https://arxiv.org/abs/1307.5319); [arXiv 2412.11259, Naumann-Woleske et al. "Navigating through Economic Complexity: Phase Diagrams & Parameter Sloppiness"](https://arxiv.org/html/2412.11259v1); [paper PDF at IJCLab Indico](https://indico.ijclab.in2p3.fr/event/3099/attachments/6779/8013/Guali_et_al_14__-_tipping_points_in_macroeconomic_abm.pdf) (snippet only)
- Reference implementation [KarlNaumann/Mark0](https://github.com/KarlNaumann/Mark0) (opened via git clone):
  - MIT licence (2022, Karl Naumann-Woleske): a Python wrapper around C++ code originally written by S. Gualdi and extended by D. Sharma (the COVID variant of Sharma et al. 2021).
  - Last commit 7 Jun 2022.
  - "Full employment" default parameters: R = 2.0, η₋ = 0.1, γ_p = 0.1, r = γ_w/γ_p = 1, Θ = 2.0, f = 0.5, c₀ = 0.5, δ (dividend share) = 0.02, β (intensity of choice) = 2.0, φ (revival probability per step) = 0.1, Γ₀ = 50, α_c = 4, ρ* = 0.005; N = 5,000 firms, T = 5,000.
- Mark-0 mechanics, from the C++ code:
  - η₊ = R·η₋.
  - A firm is bankrupt if its cash A < −Θ × payroll.
  - With excess demand, a firm raises output by η₊(D − Y) and raises its price by U(0, γ_p) only if its price is below the average.
  - With excess supply, it cuts output by η₋|D − Y| and cuts its price only if it is above the average.
  - Bankrupt firms revive with probability φ per step.
- The repository's phase classifier: FE if mean unemployment < 10%; FU if > 90%; EC if the standard deviation of unemployment > 0.10; otherwise RU. Its docstring calls this "admittedly ad hoc".
- Related papers listed in the repository README: Gualdi et al. 2017, "Monetary policy and dark corners" (JEIC); Bouchaud et al. 2018, "Optimal inflation target" (Economics e-journal); Sharma et al. 2021, "V-, U-, L- or W-shaped recovery after COVID" (PLOS ONE). (opened via git clone)

**Caiani, Godin, Caverzasi, Gallegati, Kinsella & Stiglitz (2016), "Agent based-stock flow consistent macroeconomics: Towards a benchmark model", JEDC 69:375–408** — figures below from the working-paper PDF in the [S120/benchmark repo](https://github.com/S120/benchmark) (opened via git clone)
- Set-up: quarterly periods; 100 Monte Carlo runs of 400 periods; sensitivity sweeps of 25 runs each. Initial values come from a solved aggregate steady state with symmetric agents, rather than from a long burn-in.
- Calibration:
  - 8,000 households;
  - 1,000 capital-sector and 5,000 consumption-sector workers initially, at 25 per firm (so 40 capital and 200 consumption firms by arithmetic);
  - steady-state unemployment 8%; wage 5;
  - nominal steady-state growth 0.0075 per quarter;
  - markups 0.075 (capital firms) and 0.319 (consumption firms, about 0.10 over total unit cost);
  - flat tax 18% on all sectors;
  - dividend payout 0.9 (firms) and 0.6 (banks);
  - inventories 10% of sales; loans last 20 quarters; bank liquidity ratio 8%.
- Results:
  - quasi-steady-state unemployment "just below 8%";
  - consumer prices and nominal GDP grow about 1.6–1.8%/yr;
  - standard deviation relative to GDP (HP-filtered): consumption 0.79, investment 4.45, unemployment 13.25, against US values of 0.80, 4.61 and 8.22 (Carlin & Soskice 2015, FRED 1947/1955–2013);
  - output-growth distribution tent-shaped with excess kurtosis ≈ 0.70;
  - inflation pro-cyclical and lagging; markups counter-cyclical and lagging; unemployment counter-cyclical and lagging output by one quarter;
  - firm-size skewness 0.83 (consumption firms, sales) and 2.88 (capital firms); excess kurtosis 0.49 and 10.20;
  - persistent market shares and lumpy investment.
- Code:
  - [S120/jmab](https://github.com/S120/jmab) (Java; source headers say GNU GPL version 3 "or (at your option) any later version"; copyright 2013 Caiani & Godin; last commit 2018) (opened via git clone).
  - [S120/benchmark](https://github.com/S120/benchmark) (no LICENSE file; README "Copyright (c) 2016 Alessandro Caiani and Antoine Godin"; last commit Jan 2020) (opened via git clone).
  - [Sylvain-Barde/begrs_sfc](https://github.com/Sylvain-Barde/begrs_sfc) (MIT, 2024; Bayesian estimation of the benchmark model; bundles benchmark_sfc.jar; last commit Jul 2025) (opened via git clone).

**CATS/BAM (Delli Gatti et al. 2011, *Macroeconomics from the Bottom-up*)** — from [kganitis/bam-engine](https://github.com/kganitis/bam-engine) (MIT, copyright 2026 Konstantinos Ganitis; PyPI package `bamengine`; Zenodo DOI 10.5281/zenodo.17610305) (opened via git clone)
- Book set-up: 100 firms, 500 households, 10 banks, 1,000 periods. The validation burn-in is 500 periods.
- Validation targets in src/validation/scenarios/baseline/targets.yaml, from the book's Section 3.9.1:

  | Metric | Target |
  |---|---|
  | Unemployment mean | 6.5% ± 2.5 pp |
  | Unemployment s.d. | 0.010–0.030 (book 0.018) |
  | Unemployment ceiling | above 20% counts as collapse |
  | Inflation mean | 5% ± 3 pp (book figure 5.5%) |
  | Inflation s.d. | 0.020 ± 0.010 |
  | Real wage | 0.34 ± 0.03 of productivity |
  | Vacancy rate | 13% ± 3 pp |
  | Phillips correlation | −0.50 to −0.05 (book −0.10) |
  | Okun correlation | −0.98 to −0.70 (book −0.85; R² ≥ 0.5) |
  | Beveridge correlation | −0.65 to −0.10 (book −0.27) |
  | Firm-size skewness | 1–10 |

**K+S (Dosi, Fagiolo & Roventini 2010 JEDC; Dosi et al. 2013)**
- Stylized facts the K+S family reproduces, per snippets:
  - fat-tailed output growth-rate distributions;
  - exponentially distributed recession durations;
  - lumpy investment constrained by firms' finances;
  - right-skewed firm-size distributions;
  - fat-tailed firm growth-rate distributions;
  - firm productivity heterogeneity;
  - wage and income inequality.
  - Dosi et al. (2017, J. Evol. Econ.) list them in a table split into micro and macro facts.
  - Sources: [OFCE WP 2014-19, Dosi, Napoletano, Roventini & Treibich](https://www.ofce.sciences-po.fr/pdf/dtravail/WP2014-19.pdf); [Springer article](https://link.springer.com/article/10.1007/s00191-016-0466-4); [academia.edu copy](https://www.academia.edu/15498425/Micro_and_Macro_Policies_in_the_Keynes_Schumpeter_Evolutionary_Models) (snippet only)
- Open code: [jasmineRepo/MacroABM](https://github.com/jasmineRepo/MacroABM). A Java (JAS-mine) reinterpretation of Dosi et al. 2013, by Lhuillier (2016) and Richardson (2018), built with source code provided by Napoletano, Roventini and Treibich. It has no LICENSE file; last commit Oct 2018. The README warns it "should NOT be considered simply as a porting". (opened via git clone)
- The original K+S runs in LSD (Laboratory for Simulation Development). — [UNICAMP course outline](https://www.eco.unicamp.br/images/posgraduacao/HO450-Agent-Based_Macro-Feb2018_2.pdf) (snippet only)
- 2026 work: arXiv 2605.10447, "Statistical Model Checking of the Keynes+Schumpeter Model". — [arXiv](https://arxiv.org/pdf/2605.10447) (title only, snippet only)

**Jamel (Seppecher)**
- [pseppecher/jamel](https://github.com/pseppecher/jamel): Java Agent-based MacroEconomic Laboratory; licensed GPL-3.0 (LICENSE.txt); last commit May 2019. (opened via git clone)
- Stock-flow consistent, with heterogeneous households and firms and a bank. — [Jamel site](http://p.seppecher.free.fr/jamel/) (snippet only)

**BeforeIT.jl (Bank of Italy)**
- [bancaditalia/BeforeIT.jl](https://github.com/bancaditalia/BeforeIT.jl): Julia implementation of Poledna et al.'s forecasting ABM ("Economic forecasting with an agent-based model"). The LICENSE file is **Apache-2.0**; last commit 31 Jul 2026. (opened via git clone)
- Conflict: the 2025 arXiv paper states the package is under **AGPL-3.0**. — [arXiv 2502.13267](https://arxiv.org/html/2502.13267v1) (snippet only)

**Lengnick-family implementations** (useful for a TypeScript port)
- [avakeeling199/Lengnick-replication](https://github.com/avakeeling199/Lengnick-replication): MIT, Mesa 3, last commit 21 Sep 2026. (opened via git clone)
- [newwayland/baseline-economy](https://github.com/newwayland/baseline-economy): AGPL-3.0, Mesa, last commit Jul 2023. Integer money and goods, with documented workarounds. (opened via git clone)
- [YudiWang/Baseline-Economy](https://github.com/YudiWang/Baseline-Economy): MIT (copyright 2018 Luis Gustavo Nardin); JavaScript built on the OESjs framework, also hosted at sim4edu. It is a variant: expenditure decay of 0.87–0.94 instead of α = 0.9, initial price ≈ 1, wage ≈ 52, household cash 98.78, firm inventory 50. (opened via git clone)
- [Wehzie/Bachelor-Thesis-Data-Democracy](https://github.com/Wehzie/Bachelor-Thesis-Data-Democracy): a Python re-implementation of Lengnick with a flat tax and universal basic income, plus a WebAssembly browser port. No LICENSE file at the repository root; last commit May 2021. (opened via git clone)

**Stylized-fact lists for validation**
- Fagiolo & Roventini (2017), "Macroeconomic Policy in DSGE and Agent-Based Models Redux", JASSS 20(1). — [IDEAS](https://ideas.repec.org/a/jas/jasssj/2016-78-2.html); [Tesfatsion archive PDF](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/ACEVsDSGE.JASSS2017.FagioloRoventini.pdf) (title only, snippet only; table not retrieved)
- Fagiolo et al. (2017), "Validation of agent-based models in economics and finance". — [ISIGrowth WP 2017/25](http://www.isigrowth.eu/wp-content/uploads/2017/10/working_paper_2017_25.pdf) (title only, snippet only)

### Inferences
**Mark-0 phase sweep: my own computation, not a published result**
- Method:
  - Compiled `mark0_covid.cpp` from KarlNaumann/Mark0, replacing GSL with a 20-line shim (`std::mt19937_64` for `gsl_rng_uniform`; `std::exp`/`std::log`).
  - N = 1,000 firms; T = 6,000 steps; statistics over the last 3,000 steps; 3 seeds per cell; the repository's classifier thresholds.
  - Fixed parameters: γ_p = 0.1, r = 1, η₋ = 0.1, c₀ = 0.5, δ = 0.02, β = 2, f = 0.5, φ = 0.1, τ_π = 0.2, y₀ = 0.5, π* = 0.002, ε* = 0.05.
- **Config B** ("2015-like": no financial-fragility feedback Γ₀ = 0, no real-rate effect α_c = 0, ρ = 0, no central-bank reaction). Cells show mean unemployment (s.d.) and phase:

  | R \ Θ | 0.5 | 1 | 2 | 3 | 5 | 10 |
  |---|---|---|---|---|---|---|
  | 0.5 | 0.99 FU | 0.99 FU | 0.99 FU | 0.99 FU | 0.99 FU | 0.99 FU |
  | 0.6 | 0.95 FU | 0.95 FU | 0.94 FU | 0.94 FU | 0.94 FU | 0.94 FU |
  | 0.7 | 0.63 RU | 0.61 RU | 0.62 RU | 0.83 RU | 0.45 RU | 0.45 RU |
  | 0.8 | 0.56 RU | 0.54 RU | 0.51 RU | 0.005 FE | 0.005 FE | 0.005 FE |
  | 0.9–1.3 | 0.45–0.53 RU | 0.40–0.50 RU | 0.47–0.65 (sd 0.24–0.35) EC | 0.004–0.005 FE | FE | FE |
  | 1.5–3.0 | 0.30–0.42 RU | 0.22–0.36 RU | 0.33–0.49 (sd 0.35–0.37) EC | 0.004 FE | FE | FE |

  So the FU boundary R_c lies between 0.6 and 0.7 at these settings. Above it, Θ selects the phase: RU at Θ ≤ 1, EC at Θ = 2, and FE (u ≈ 0.4%) at Θ ≥ 3.
- **Config A** (the repository's "full employment" defaults, Γ₀ = 50, α_c = 4, ρ* = 0.005): FE (u ≈ 0.4%) for R ≥ 0.9 with Θ ≥ 2; RU (u 0.22–0.69) everywhere else in the grid; no FU or EC cells.
- **Use as a test:** a TypeScript port of Mark-0 should reproduce this table qualitatively. Boundaries may shift by about one grid step because of RNG and finite N. Raw results are in the session scratchpad (`mark0run/results.txt`); copy them out if they are needed.
- **R maps onto the plan's own parameters:** R is the ratio of how fast firms hire versus fire when demand moves. In the dot economy this corresponds to hiring at most one worker per month versus firing one per month. Lengnick's symmetric one-hire/one-fire rule is roughly R ≈ 1. The Mark-0 results suggest a fast-firing variant (R well below 1) can tip into a high-unemployment trap.
- **Θ corresponds to how much debt a shop may carry before bankruptcy.** The plan's ledger forbids negative balances, which is effectively Θ = 0. Mark-0 suggests this pushes the economy toward residual unemployment rather than crises. If an overdraft or credit line is added later, expect endogenous-crisis behaviour near Θ ≈ 2 payrolls.
- **Cheap unit-test benchmarks** (known answers), in addition to SIM, random exchange and Gode–Sunder already in the plan:
  1. the Mark-0 phase table above;
  2. bam-engine's numeric BAM targets (unemployment about 6.5%, Okun correlation about −0.85, Beveridge about −0.27, Phillips weakly negative);
  3. Caiani's relative volatilities (consumption about 0.8 × GDP, unemployment ≫ GDP).
- **Licences:** MIT (bam-engine, Mark0 wrapper, Lengnick replication, OESjs Lengnick, begrs_sfc) and Apache-2.0 (BeforeIT.jl per its LICENSE file) can be studied and ported into a TypeScript project with attribution. GPL-3.0 (Jamel, JMAB) and AGPL-3.0 (newwayland) would impose copyleft on a port. MacroABM, S120/benchmark and the Wehzie repository have no licence file, so treat them as reference-only.

### Gaps
- The Mark-0 paper's own numerical R_c and Θ_c values, and its exact parameter set, could not be read (arXiv and the Indico PDF were blocked), so my sweep was not cross-checked against the paper's figure.
- The full stylized-fact tables of Dosi et al. (2010/2013/2017) and Fagiolo & Roventini (2017) could not be opened. The lists above come from snippets and the Caiani paper.
- Licence terms for the original LSD K+S code and for sim4edu/OESjs beyond the cloned repository were not verified.

---

## Key Question 6: Verify Lengnick (2013, JEBO 86:102–120): do the replication's parameters match the paper, what initial conditions and burn-in were used, and are there errata or critiques?

### Takeaway
The plan's parameter list matches the paper's Table 1 as transcribed by the MIT replication. The plan omits two household parameters:
- ξ = 0.01: a household switches to a cheaper firm only if its price is at least 1% lower;
- ψ_quant = 0.25: the probability of replacing a supplier that could not satisfy demand.

The paper runs 6,000 months (500 years) after a 1,000-month burn-in, with 1,000 households and 100 firms. It does **not** specify initial values. The replication's 3,100 / 25 / 1,428 are the replication's own choices. No formal erratum was found, but independent replications list about 20 specification ambiguities that matter for an integer-cent implementation.

### Cited Findings
**Parameters**
- Paper Table 1, as encoded in the replication's conformance test:
  - households: ψ_price = 0.25, ξ = 0.01, β = 5, π = 0.1, α = 0.9, n = 7, ψ_quant = 0.25;
  - firms: γ = 24, δ = 0.019, φ̄ (inventory upper) = 1, φ̲ (inventory lower) = 0.25, φ̄_p = 1.15, φ̲_p = 1.025, ϑ = 0.02, θ = 0.75, λ = 3, χ = 0.1.
  - The replication's `src/config.py` holds the same values.
  - Source: [avakeeling199/Lengnick-replication](https://github.com/avakeeling199/Lengnick-replication), files `tests/test_paper_conformance.py` and `src/config.py` (opened via git clone)

**Run length and initial conditions**
- Run length: "500 years (6000 months) plus a burn-in of 1000 months to get rid of the influence of arbitrary starting conditions", with 1,000 households and 100 firms. — [Lengnick 2013 PDF (TU Wien)](https://legacy.econ.tuwien.ac.at/lva/compeco.se/artikel/jebo_2013_agent_based_macroeconomics_a_baseline_model.pdf) (snippet only). The replication's `config.py` agrees: `DEFAULT_MONTHS = 7000 # paper: 6000 + 1000 burn-in` (opened via git clone).
- Initial conditions in the replication: household cash m_h = 3100, firm price p_f = 25, wage w_f = 1428 (`src/agents.py`). The README says: "Initial calibration (e.g. m_h, w_f, p_f) is not specified exactly in the paper, since the model relies on a long burn-in period ... Values here were chosen to keep household demand and firm production roughly balanced from the start." — [Lengnick-replication](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)

**Known ambiguities (from the independent newwayland replication)**
- Source: [newwayland/baseline-economy notes/issues.md](https://github.com/newwayland/baseline-economy) (opened via git clone)
- Bootstrap values are unspecified: wage, price, inventory and liquidity for firms; reservation wage and liquidity for households; and whether households start employed.
- Issues that matter for the integer-cent ledger:
  - Eq. (12) is redundant once purchases are whole units, because daily consumption rounds to integers.
  - Money and goods are treated as infinitely divisible, which breaks when prices are driven to unit levels.
- Specification gaps in the rules:
  - The unemployed accept a job based on the "currently received wage", which is ambiguous; it is probably the reservation wage.
  - The marginal-cost formula is not specified (the workaround is w / (21 × λ)).
  - The average-price definition is not specified.
  - The order of the monthly profit distribution is not specified.
  - The open-position and notice interactions are not specified.
- Structural quirks of the model:
  - Firms with zero demand, workers and inventory effectively exit.
  - There is no fire-sale mechanism for excess inventory.
  - Households buy from their preferred suppliers in random order rather than cheapest first.
  - Firms run before households at month start, but households run first each day, so households can only buy prior production.
- The avakeeling replication flags the same acceptance-wage ambiguity, citing footnote 25: "at the point in time when the household accepts a given job offer, the received wage rate is always above his reservation wage". That only holds if the threshold is the reservation wage. — [Lengnick-replication tests](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)
- Rules confirmed by quotation in the replication tests:
  - The reservation wage rises to income if income exceeds it, and falls 10% after a month of unemployment.
  - Dissatisfied workers search with probability 1.
  - Profits are pooled and distributed in proportion to household liquidity (footnote 22).
  - Firing takes effect with a one-month lag.
  - Source: [Lengnick-replication tests](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)

**Paper's validation figures**
- Fig. 4: excess demand and employment. Fig. 5: Phillips and Beveridge curves, plotted with unemployment as an absolute count and a small U[−0.5, 0.5] jitter. Fig. 6: firm size (skewness ≈ 1.88) and price-change frequency (median 9%, skewness ≈ 0.47). Fig. 7: GDP correlation and liquidity. — [Lengnick-replication scripts/make_tier1_figures_singlerun.py](https://github.com/avakeeling199/Lengnick-replication) (opened via git clone)
- The paper's working-paper version: Lengnick (2011), Kiel Economics Working Paper. — [EconStor PDF](https://www.econstor.eu/bitstream/10419/45012/1/654079951.pdf) (snippet only)
- Lengnick's dissertation. — [Uni Kiel](https://macau.uni-kiel.de/servlets/MCRFileNodeServlet/dissertation_derivate_00005979/Dissertation_Lengnick.pdf) (snippet only)

### Inferences
- **Add ξ = 0.01 and ψ_quant = 0.25** to the plan's parameter list. They govern how quickly price competition and stock-outs reshuffle the household–shop network, so they directly affect concentration and the firm-size distribution.
- **Initial-condition consistency check:** marginal labour cost = w / (21 × λ).
  - Replication: 1428 / 63 = 22.67, so p = 25 is a markup of 1.103, inside the 1.025–1.15 band.
  - JavaScript variant: 52 / 63 = 0.825, so p = 1 is a markup of 1.21, outside the band, and the rules will pull prices down at the start.
  - For the plan, pick p₀ ∈ [1.025, 1.15] × w₀/63.
  - Household cash of about 2.2 months of wages is the replication's choice. See Key Question 4 for the velocity implication.
- **Burn-in for a browser simulation:** 1,000 months is 21,000 day ticks. If the UI cannot run that before display, either run a hidden fast-forward or start from a pre-computed post-burn-in snapshot. Caiani et al. instead start from a solved steady state with symmetric agents, which avoids burn-in.
- **Ledger decisions:** the integer-cent ledger makes the newwayland integer workarounds directly relevant:
  - round buffers up and purchases down;
  - set a price floor of one cent;
  - pay wages first, then compute liquidity shares once for the profit distribution.
  - Decide each explicitly and document it.

### Gaps
- The Lengnick paper itself could not be opened (ScienceDirect, the TU Wien copy, EconStor and Uni Kiel were all blocked). Table 1 values are as transcribed by the replication, and burn-in details come from a snippet plus replication comments.
- No published erratum or formal critique paper was found. The critiques above are replication notes, not peer-reviewed. Whether the paper reports a mean unemployment rate or other headline numbers usable as targets was not confirmed.

---

## Key Question 7: Sanity-check the policy sliders (minimum wage, wealth tax, welfare/transfers) against empirical literature

### Takeaway
- **Minimum wage:** moderate US minimum-wage increases left the number of low-wage jobs essentially unchanged over five years (Cengiz et al. 2019). A minimum-wage slider in the moderate range should therefore not destroy employment. Disemployment should appear only when the floor exceeds what many firms can pay, as in tradable sectors.
- **Wealth tax:** taxable wealth is highly elastic at the top (Denmark), so a 0.25%/month (about 3%/yr) wealth tax is aggressive and should visibly compress the top.
- **Transfers:** labour-supply responses are modest. Guaranteed income of $1,000/month cut participation by about 2–4 pp and hours by about 1–2 per week. The 1970s negative-income-tax experiments cut hours by about 5–7% for men and 17–21% for married women.

### Cited Findings
- **Cengiz, Dube, Lindner & Zipperer (2019, QJE 134(3):1405–1454):**
  - 138 prominent state minimum-wage increases, 1979–2016, analysed with a bunching estimator that compares missing jobs below the new minimum with excess jobs at or just above it.
  - The overall number of low-wage jobs remained essentially unchanged over the five years after an increase.
  - Earnings effects were amplified by modest wage spillovers.
  - No disemployment was found in the non-tradable, restaurant and retail sectors (own-wage employment elasticity in non-tradables 0.387, s.e. 0.597).
  - There is some evidence of reduced employment in tradables.
  - Sources: [NBER w25434](https://www.nber.org/papers/w25434); [DOL CLEAR review](https://clear.dol.gov/Study/effect-minimum-wages-low-wage-jobs-Cengiz-et-al-2019) (snippet only)
- **Jakobsen, Jakobsen, Kleven & Zucman (2020, QJE 135(1):329–388):**
  - Denmark's 1989–1997 wealth-tax reforms, including the abolition in 1997.
  - Identification: differential treatment of couples and singles at the 98th–99th percentile, and exemptions within the top 1%.
  - The long-run elasticity of taxable wealth with respect to the net-of-tax return is "sizable at the top".
  - Snippet values: elasticities of 8.9 (moderately wealthy) and 11.3 (very wealthy) over 8 years. These include avoidance and evasion, so they are upper bounds on real saving responses.
  - In 2012 the top 1% held about 20% of wealth in Denmark versus almost 40% in the US.
  - Sources: [NBER w24371](https://www.nber.org/papers/w24371); [KU working-paper PDF](https://www.econ.ku.dk/cebi/publikationer/journals/JJKZ_QJE_Aug2019.pdf); [Zucman PDF](https://gabriel-zucman.eu/files/JJKZ2020.pdf) (snippet only; the elasticity definition and exact values must be checked against the paper)
- **Vivalt, Rhodes, Bartik, Broockman & Miller, "The Employment Effects of a Guaranteed Income" (NBER w32719, OpenResearch):**
  - 1,000 low-income people received $1,000/month unconditionally for three years; 2,000 controls received $50/month.
  - 2024 version: income excluding transfers fell about $1,500/yr; labour-market participation fell 2.0 pp; hours fell 1.3 per week; partners reduced hours by a similar amount; leisure was the largest time-use gain; no effect on job quality.
  - Sources: [OpenResearch findings](https://www.openresearchlab.org/findings/nber-working-paper-employment); [NBER w32719](https://www.nber.org/papers/w32719) (snippet only)
  - Conflict: another snippet, describing a later revision ("revised August 2026"), reports income excluding transfers −$1,900/yr, participation −4.2 pp and hours −1 to 2 per week. — [NBER w32719](https://www.nber.org/papers/w32719) (snippet only; which version is current is unverified)
- **1970s US negative-income-tax experiments:**
  - Annual hours fell 89–119 (5–7%) for married men, 93–117 (17–21%) for married women, and 123–133 (13–17%) for single female heads.
  - SIME/DIME alone showed a significant 4 pp fall in the employment rate. Stanford Research Institute estimates for SIME/DIME were about −9% for husbands and −18% for wives.
  - Sources: [Burtless 1986, Boston Fed conference volume](https://www.bostonfed.org/-/media/Documents/conference/30/conf30b.pdf); [Marinescu, NBER w24337](https://www.nber.org/system/files/working_papers/w24337/w24337.pdf); [IRP special report](https://www.irp.wisc.edu/publications/sr/pdfs/sr10.pdf) (snippet only)
- **Reference tax rates:** the Caiani et al. benchmark uses a flat 18% tax on households, banks and both firm sectors. — [Caiani et al. working paper PDF](https://github.com/S120/benchmark/blob/master/benchmark/paper/BenchmarkModel.pdf) (opened via git clone)

### Inferences
- **Minimum-wage slider:**
  - Expected behaviour for floors below most shops' revenue per worker: little or no employment loss, a compressed bottom of the wage distribution, small spillovers above the floor.
  - Disemployment should start only when the floor exceeds what marginal shops can pay. Because shops can raise prices, this corresponds to the "non-tradable" case, where pass-through is possible.
  - A test: raising the floor 10% above the bottom-decile wage should change employment by roughly ±1% and raise the bottom-decile wage.
- **Wealth-tax slider:**
  - 0.25%/month compounds to about 2.96%/yr (1 − 0.9975¹²), which is aggressive by historical standards.
  - If the snippet elasticities (about 9–11 over 8 years) are applied loosely, a 1 pp/yr wealth tax would lower top taxable wealth by roughly 9–11% after about 8 years. At about 3%/yr the effect could approach 25–30% at the top.
  - In the simulation there is no avoidance channel, so the effect comes only through consumption and saving, and is likely smaller.
  - Test: the top 1% money share should fall monotonically with the slider, with no change in the money total in fixed-money mode (zero-sum check).
- **Welfare slider (0–100% of subsistence):**
  - Expect modest labour-supply responses.
  - At a transfer comparable to the OpenResearch arm, which equals a large fraction of low-income earnings, aim for about −2 to −4 pp participation or about −5 to −10% hours among recipients. Avoid a collapse of employment.
  - The negative-income-tax evidence says second earners and single parents respond more than primary earners. That matters only if the plan models household composition.
- **Income tax 15% and sales tax 5% defaults:** these were not separately researched. The Caiani benchmark's flat 18% shows that rates of this order are standard in benchmark ABMs.

### Gaps
- None of the policy papers could be opened (NBER, SSRN, Zucman, KU, OpenResearch and Boston Fed were blocked).
- Unconfirmed details: the Cengiz et al. headline elasticities beyond the non-tradable figure; the exact definition and value of the Jakobsen et al. elasticities; which OpenResearch version (2024 vs 2026 revision) is current.
- Historical statutory wealth-tax rates (for example Denmark's pre-1989 top rate), which would anchor the 0.25%/month slider, were not retrieved.
