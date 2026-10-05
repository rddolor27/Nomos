# Villages, towns, cities and a country: economy, demography and crime targets and rules for the multi-scale dot-society simulation (researched 5 Oct 2026)

Read this first.

- **Access.** The network proxy blocked almost every primary host: journals, arXiv, PMC, census.gov, bjs.ojp.gov, ucr.fbi.gov, gov.uk, World Bank, paradoxwikis, university pages and the Wayback Machine all failed (curl 000/403; WebFetch `EGRESS_BLOCKED`). Reachable hosts were GitHub (`git clone` and raw.githubusercontent.com, but not api.github.com search), the npm registry, PyPI, and one S3 mirror of an FBI PDF. The full list is in the last section.
- **Method.** I opened open-source code and data on GitHub and npm and **computed** several targets myself (scaling exponents, Zipf exponents, settlement counts and spacing, commuting gravity). Each computed figure names the data and the method.
- **Search budget.** All 18 WebSearches were used; one query triggered 3 internal searches. Search-engine summaries are marked **snippet only** and may be wrong.
- **Labels.** **opened** = I read the document, code or data myself. **computed** = I calculated the figure from opened data. **snippet only** = search summary, not verified. **background, unverified** = my prior knowledge, used only in Inferences or Gaps.
- **Region tags.** [US], [UK] (England & Wales unless noted), [EU], [DE], [BR], [Intl]. Figures are US unless tagged otherwise. Every figure carries its data year.

---

## 1. Urban scaling laws: exponents with intervals, critiques, and how to validate the simulation against them

### Takeaway
Use cross-sectional targets as follows:
- **Superlinear:** total GDP or wages β ≈ 1.11–1.15 (my fit, US metros 2013: **1.113, 95% CI [1.089, 1.137]**); patents ≈ 1.27; serious crime ≈ 1.16 (US 2003).
- **Sublinear:** road length ≈ 0.81–0.85 (my fit, US 2013: **0.846 [0.818, 0.877]**); petrol stations ≈ 0.77.
- **Linear:** households, dwellings and employment β ≈ 1.00, so household size is flat across city size.

The exponents are **not universal constants**. They shift with the city definition, the minimum-size cutoff and the estimator:
- England & Wales income is linear (0.97–1.01).
- German city GDP is about 1.02 and statistically linear.
- Brazilian GDP moves from 1.04 to 1.29 when places under 50k are dropped.
- Homicide in EU cities is about 1.0.

So the simulation should be tested against ranges and against the β = 1 null with likelihood-based fits, not tuned to one point estimate.

### Cited Findings

#### Original estimates (Bettencourt, Lobo, Helbing, Kühnert & West 2007, PNAS 104:7301–7306)
- [US] **New patents β ≈ 1.27, serious crime β ≈ 1.16** (superlinear) and **gasoline (petrol) stations β ≈ 0.77** (sublinear). Quantities for wealth creation and innovation have **β ≈ 1.2**; infrastructure quantities have **β ≈ 0.8** ("economies of scale"). Published April 2007. — [Bettencourt et al. 2007 PDF (SFI wiki), snippet only](https://wiki.santafe.edu/images/images/3/36/Bettencourt_et_al_2007.pdf). Both the PDF and the uchicago copy were blocked.
- Related titles were seen in results but not opened, so their content is unverified:
  - "Urban Scaling and Its Deviations: Revealing the Structure of Wealth, Innovation and Crime across Cities" (PLoS ONE 2010) — [title only](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0013541)
  - "From global scaling to the dynamics of individual cities" (Depersin & Barthelemy, PNAS 2018) — [title only](https://www.pnas.org/doi/full/10.1073/pnas.1718690115)
  - "Rural to urban population density scaling of crime and property transactions in English and Welsh Parliamentary Constituencies" — [title only](https://arxiv.org/pdf/1602.05596)

#### Exponents computed for this note from open data (Leitão, Miotto, Gerlach & Altmann repository `edugalt/scaling`)
The repository (README and data opened via `git clone`; last commit 2024-12-09) holds the data and code for Leitão et al. 2016 (R. Soc. Open Sci. 3:150649) and a 2020 PLoS ONE follow-up. It fits seven models: per-capita (β = 1), least squares, Gaussian, log-normal, person, gravitational and exponential. The Gaussian and log-normal models use variance ∝ E(y|x)^δ — [edugalt/scaling README, opened](https://github.com/edugalt/scaling).

**My method:** OLS on log–log data with a 2,000-resample bootstrap 95% CI. For counts with zeros I also fit quasi-Poisson maximum likelihood. Data files are listed in the [repo data folder (opened)](https://github.com/edugalt/scaling/tree/master/data).

- **[US] GDP vs population, 381 metropolitan areas, 2013** (BEA GDP and Census population): **β = 1.113 [1.089, 1.137]**, R² = 0.95. The log residual SD is 0.26, so a typical city sits about ±30% off the line. — computed from [USmetro_gdp_pop_2013 (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/USmetro_gdp_pop_2013)
  - The repository's stored ML fits give β = 1.113–1.140 across Gaussian and log-normal variants (errors about 0.02–0.03). The person model gives 1.121 ± 0.024.
  - The log-normal fit has −log L 3654.1 with β free versus 3691.3 with β = 1, so **β = 1 is strongly rejected** (my reading of the stored JSON) — [notebooks/_results (opened)](https://github.com/edugalt/scaling/tree/master/notebooks/_results)
- **[US] Road length (miles) vs population, 460 areas, 2013**, parsed from FHWA table HM-71 (Federal-aid urbanized areas; the repo README calls them "484 metropolitan areas"): **β = 0.846 [0.818, 0.877]**, R² = 0.83, residual SD 0.42. Stored ML fits give 0.814–0.847, and the person model gives 0.807 ± 0.038. — computed from [metropolitan-miles.csv (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/metropolitan-miles.csv)
- **[US] Aggregate travel time to work vs population, metros** (ACS): **β = 1.088 [1.073, 1.103]** in 2010 (n = 292) and **1.068 [1.058, 1.079]** in 2022 (n = 381). Per-capita commuting time therefore rises about 5–6% per doubling of city size. — computed from [us_2010_2022_trav_time.csv (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/us_2010_2022_trav_time.csv)
- **[Intl] OECD metro areas.**
  - GDP 2010 (n = 275): **1.124 [1.063, 1.183]**. Stored ML fits give 1.09–1.13, and β = 1 is rejected (log-normal −log L 3029.4 vs 3036.4).
  - Patents 2008 (n = 218): OLS gives **1.285 [1.006, 1.537]** with R² only 0.28. Stored ML fits give 1.12–1.29 with errors of ±0.21–0.33, and **β = 1 is not rejected** (log-normal −log L 1371.0 vs 1371.2).
  - Sources: computed from [oecd data (opened)](https://github.com/edugalt/scaling/tree/master/data/oecd) and [stored results (opened)](https://github.com/edugalt/scaling/tree/master/notebooks/_results)
- **[DE] GDP 2012.** The 107 kreisfreie Städte (independent cities) give **1.018 [0.949, 1.086]**, which is not distinguishable from linear. All 402 NUTS-3 districts give **1.034 [0.976, 1.091]**. — computed from [germany data (opened)](https://github.com/edugalt/scaling/tree/master/data/germany)
- **[UK] England & Wales urban clusters, Arcaute et al. 2015 data.** The definition uses a density threshold of 14 persons/ha and a 30% commuting cutoff. "P0" means all 535 clusters; "P50" means the 100 clusters over 50,000 people. Data are 2011 Census, with patents 2000–2011. — computed from [uk data and Readme (opened)](https://github.com/edugalt/scaling/tree/master/data/uk)

  | Quantity | P0 β [95% CI] | P50 β [95% CI] |
  |---|---|---|
  | Total weekly income | 1.008 [0.996, 1.020] | 0.971 [0.924, 1.011] |
  | Households | 0.990 [0.986, 0.995] | 1.002 [0.997, 1.009] |
  | Employed | 1.003 | 0.972 |
  | Finance employment | 1.076 [1.045, 1.108] | 1.074 [0.984, 1.156] |
  | Agriculture employment | 0.916 [0.878, 0.953] | 0.851 [0.791, 0.913] |
  | Cars and vans | 0.990 | 0.953 [0.932, 0.971] |
  | Patents (log-OLS, zeros dropped) | 1.057 | 0.990 |
  | Patents (quasi-Poisson) | 1.062 ± 0.034 | 1.064 ± 0.092 |

  - The repository's stored ML fit for UK income is 0.971 ± 0.045, and **β = 1 is not rejected** (log-normal −log L 1693.6 vs 1695.0).
  - **Estimator sensitivity, train stations:** log-OLS that drops the 260 clusters with zero stations gives **0.49**. Quasi-Poisson with the zeros gives **1.08 ± 0.03** (P0) and **1.19 ± 0.05** (P50).
- **[BR] Brazilian municipalities, 2010** (Health Ministry data in the repository).
  - GDP: **1.041 [1.023, 1.057]** for all 5,565 municipalities, but **1.290 [1.233, 1.351]** for the 608 with more than 50k people.
  - External-cause deaths (homicide, accidents and similar): quasi-Poisson **1.019 ± 0.005** for all and **0.988 ± 0.015** for those over 50k.
  - AIDS deaths: quasi-Poisson **1.158 ± 0.012**, stable across cutoffs. Log-OLS that drops the 2,560 zero municipalities gives **0.741**, and 1.220 for those over 50k.
  - Source: computed from [brazil json (opened)](https://github.com/edugalt/scaling/tree/master/data/brazil)
- **[EU] Eurostat Urban Audit cities**, crime counts matched to city population in the same year. — computed from [eurostat data (opened)](https://github.com/edugalt/scaling/tree/master/data/eurostat)
  - Homicides: **1.033 [0.906, 1.161]** in 2012 (n = 119) and **1.006 [0.879, 1.136]** in 2016 (n = 131).
  - The file labelled robberies: **1.378 [1.232, 1.552]** in 2012 and **1.277 [1.155, 1.401]** in 2016.
  - **Data defect:** the repository's `eu_2008_2020_burglaries.csv` and `eu_2008_2020_motortheft.csv` are byte-identical (same md5), so neither was used.

#### Critiques and definition sensitivity
- [UK] **Arcaute et al. 2015** (J. R. Soc. Interface 12(102):20140745) built **thousands of realisations of systems of cities** for England & Wales by varying commuting and density thresholds. They found that "population size alone does not provide enough information to describe or predict the state of a city", that the expected scaling laws were not corroborated, and that the exponent fluctuates considerably — [Royal Society, snippet only](https://royalsocietypublishing.org/rsif/article/12/102/20140745/35313/Constructing-cities-deconstructing-scaling)
- **Leitão et al. 2016 approach** (repository opened, paper blocked). It treats β = 1 (a fixed per-capita rate) as the null model. It compares least-squares, Gaussian and log-normal models with fitted variance–mean exponent δ, plus a "person" model in which tokens are attributed to individuals with probability ∝ N^(β−1). A gravitational variant lets people interact across cities with weight 1/(1 + (d/α_G)²) — [edugalt/scaling README, opened](https://github.com/edugalt/scaling)
- Related critiques seen as titles only:
  - "Cross-sectional Urban Scaling Fails in Predicting Temporal Growth of Cities" — [arXiv 1910.06732, title only](https://arxiv.org/pdf/1910.06732)
  - "On the relation between Transversal and Longitudinal Scaling in Cities" — [arXiv 1910.02113, title only](https://arxiv.org/pdf/1910.02113)
  - "Urban Scaling in Denmark, Germany, and the Netherlands. Relation with Governance Structures" — [arXiv 1903.03004, title only](https://arxiv.org/pdf/1903.03004)
  - "Do Larger Cities Experience Lower Crime Rates? A Scaling Analysis of 758 Cities in the U.S." (Sustainability 2019) — [RePEc, title only](https://ideas.repec.org/a/gam/jsusta/v11y2019i11p3111-d236609.html)

#### Police and household size
- [US] **Police per capita is highest in the smallest places, not the largest** (FBI, *Reported Crimes in the Nation 2024* Quick Stats, released summer 2025):
  - **2.3 sworn officers per 1,000** inhabitants nationally and 3.4 full-time employees per 1,000.
  - **4.5 officers per 1,000 in cities under 10,000**, "the highest rate … among the city population groups" (Table 71).
  - **County agencies: 2.6 per 1,000.**
  - 14,917 city and county agencies reported staffing, and sworn officers were 68.8% of personnel.
  - Source: [FBI 2024 Quick Stats (S3 mirror), opened](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)
- [UK] **Household count scales linearly:** β = 0.990 (P0) and 1.002 (P50), as computed above. Average household size (N / households ∝ N^(1−β)) therefore changes by only about +2.3% (P0) or −0.5% (P50) per tenfold change in cluster size — computed from [uk data (opened)](https://github.com/edugalt/scaling/tree/master/data/uk)

### Inferences

#### Rule for off-focus settlements (aggregate stock-flow mode)
Give each settlement a per-capita multiplier m_X(N) = (N/N_ref)^(β_X − 1). Starting targets:

| Quantity | β target (range) | Per-capita ratio, 1M city vs 10k town | Basis |
|---|---|---|---|
| Output / GDP / wage bill | 1.12 (1.08–1.15) | 1.74 | US 2013 metros 1.11; OECD 1.12; Bettencourt ≈ 1.15–1.2 (snippet) |
| Patents / innovation | 1.27 (1.0–1.3) | 3.47 | Bettencourt 1.27 (snippet); OECD and UK not distinguishable from 1 |
| Serious crime (property + robbery type) | 1.16 (1.05–1.3) | 2.09 | Bettencourt 1.16 (snippet); EU robbery-file 1.28–1.38 (computed) |
| Homicide / external-cause deaths | 1.0 (0.95–1.1) | 1.0 | EU 1.01–1.03; Brazil 0.99–1.02 (computed) |
| Road length, cable, other networks | 0.85 (0.80–0.88) | 0.50 | US 2013 roads 0.85 (computed) |
| Petrol stations / per-capita service outlets | 0.77 | 0.35 | Bettencourt (snippet) |
| Households, dwellings, employment | 1.00 | 1.00 | UK 2011 (computed); flat household size |
| Commuting time (aggregate) | 1.07–1.09 | about 1.4–1.5 | US ACS 2010 and 2022 (computed) |
| Agriculture jobs | 0.85–0.92 | 0.5–0.7 | UK 2011 (computed) |

Add a persistent settlement-level residual (a "SAMI") with SD ≈ 0.25 in logs for output; the US GDP residual SD was 0.26. Use ≈ 0.4 for infrastructure.

#### Rule for the focused settlement (agent mode)
Superlinearity should *emerge* from interaction rates, not be imposed. Examples:
- Labour-search contacts per month, customer arrivals per firm, and potential targets per offender grow with density.
- Detection probability per offence falls with anonymity.

**Consistency test.** For the same N, the focused agent model and the aggregate model must give per-capita output and crime within the aggregate model's tolerance. Otherwise switching focus will cause a visible jump.

#### Crime mechanism (Becker / Epstein)
Glaeser & Sacerdote 1999 (snippet; see section 5) attribute at most about 1/4 of the big-city crime premium to higher loot and at most about 1/5 to lower arrest or recognition probability. In the Becker model, therefore, payoff and detection should explain **≤ about 45%** of the city-size crime gradient. The rest should come from population composition or social multipliers (peer effects, household structure).

#### Validation tests (runnable in CI)
- **(T1) Slope.** Run ≥ 20–30 settlements spanning ≥ 2–3 orders of magnitude.
  - Slope precision is SE(β) ≈ σ_resid / (√n · sd(ln N)). With 30 settlements log-uniform between 1k and 1M and σ_resid = 0.25, the 95% CI is about ±0.045. With 10 settlements it is about ±0.08 (computed).
  - Assert that each β CI overlaps the target band above.
- **(T2) Null test.** For each quantity, report a likelihood-ratio test against β = 1 (as in `edugalt/scaling`). Only GDP-like quantities should reject linearity robustly. Homicide, households and employment should not.
- **(T3) Zeros.** Fit counts (crimes, shops, stations) by Poisson or negative-binomial ML that includes zeros. Never use log-OLS that drops zeros: villages produce many zero counts, and dropping them biased Brazilian AIDS deaths from 1.16 to 0.74 and UK stations from about 1.1 to 0.49 (computed).
- **(T4) Definition robustness.** Re-aggregate the simulated settlements under two boundary rules (separate settlements versus "functional areas" merged by commuting), and report how much β moves. A shift of a few tenths is realistic: Brazilian GDP moved 0.25 between size cutoffs (computed), and Arcaute et al. report that the exponent "fluctuates considerably" across definitions. A simulation whose β never moves is suspiciously over-tuned.
- **(T5) Cross-section vs time.** Do not expect one growing city's per-capita GDP to follow the cross-sectional β over time (see the arXiv 1910.06732 and Depersin–Barthelemy titles). Validate the cross-section at a fixed date.

### Gaps
- The full Bettencourt 2007 Table 1 with confidence intervals could not be opened; only 1.27, 1.16 and 0.77 were confirmed by snippet. **Background, unverified** (my recollection of that table):
  - Total wages 1.12 [1.09, 1.13] (US 2002)
  - GDP 1.15 [1.06, 1.23] (China 2002), 1.26 [1.09, 1.46] (EU 1999–2003), 1.13 [1.03, 1.23] (Germany 2003)
  - Private R&D employment 1.34 [1.29, 1.39]; inventors 1.25 [1.22, 1.27]
  - Serious crimes 1.16 [1.11, 1.18] (US 2003); new AIDS cases 1.23 [1.18, 1.29]
  - Total housing 1.00 [0.99, 1.01]; total employment 1.01 [0.99, 1.02]
  - Gasoline stations 0.77 [0.74, 0.81]; gasoline sales 0.79 [0.73, 0.80]
  - Electrical cable length 0.87 [0.82, 0.92]; road surface 0.83 [0.74, 0.92] (Germany 2002)
  - Walking speed ≈ 0.09
  
  Verify against the PNAS PDF before hard-coding.
- **Background, unverified:** Bettencourt 2013 (Science) theory predicts β = 1 + δ with δ ≈ 1/6 for socio-economic outputs, infrastructure ≈ 5/6, and land area ≈ N^(2/3).
- No reliable **police-officer scaling exponent** (sworn officers vs population across cities) was found. Only the FBI per-capita figures by group (opened) are available; they suggest per-capita staffing falls from the smallest places to the national average. FBI Table 71 values for each population group (beyond < 10k and counties) were not retrieved.
- Separate **violent and property crime exponents for US cities** (for example from the 2010 PLoS ONE paper) could not be opened.
- The Arcaute et al. range of exponents across definitions (minimum and maximum β per variable) could not be opened. The repository only holds one definition (D14, F30).

---

## 2. City-size distributions (Zipf, Gibrat), how many villages, towns and cities a country has, and central place theory

### Takeaway
- **Zipf's law.** Above a threshold, settlement sizes follow a Pareto/Zipf tail with exponent ζ ≈ 1.0–1.1 for metropolitan areas. Examples: US 2013 metros ζ = 0.91 ± 0.13 (all ≥ 54k) and 1.04 ± 0.20 (top 200). Administrative municipalities give ζ ≈ 1.1–1.4. The literature mean is ≈ 1.1.
- **Settlement counts.** In rich countries there is roughly **one place of ≥ 100k per million inhabitants, 11–18 places of ≥ 10k per million, and 50–130 places of ≥ 1k per million**.
- **US places.** 75% of US incorporated places (14,603 of 19,479 in 2024) have fewer than 5,000 people.
- **Spacing.** Small places are slightly more evenly spaced than random (Clark–Evans R ≈ 1.1–1.2), consistent with central-place logic. Spacing grows about as the square root of the size threshold.
- **Gibrat's law.** It holds only roughly. US metro growth 2010–2022 was weakly increasing in size (correlation 0.15) and less volatile for metros over 1M.

### Cited Findings
- [US] **Census Vintage 2024 estimates (1 July 2024)**: of **19,479 incorporated places, 75% (14,603) had under 5,000 people**, and **342 (1.8%) had 100,000 or more** — [Census press release May 2025, snippet only](https://www.census.gov/newsroom/press-releases/2025/vintage-2024-popest.html)
- [Intl] **Soo 2005** studied the city-size distributions of **73 countries (data 1972–2001)** using OLS and the Hill estimator. **Nitsch 2005** meta-analysed **515 estimates from 29 studies** and found the Pareto exponent **on average larger than 1, close to 1.1**. Both studies report the exponent often differs significantly from 1 — [Soo 2005 PDF, snippet only](https://legacy.econ.tuwien.ac.at/hanappi/AgeSo/rp/Soo_2005.pdf). The meta-analysis "MetaZipf" (Cottineau) was seen as a title only — [arXiv 1606.06162](https://arxiv.org/pdf/1606.06162)
- [Intl] **Counts and Zipf exponents computed for this note from GeoNames.**
  - Data: npm package `all-the-cities` v3.1.0 (published 2020-03-18; GeoNames places with ≥ 1,000 inhabitants; 135,233 records).
  - I excluded city sections (PPLX) and historical or abandoned places.
  - ζ is fitted with the Gabaix–Ibragimov rank−½ OLS; ± is the 95% interval, ζ·√(2/n)·1.96.
  - Caveats: GeoNames population vintages are mixed; coverage is poor below about 10k outside Europe and North America; some boroughs are double-counted (Brooklyn appears beside New York City).
  - Source: computed from [all-the-cities on npm (opened)](https://registry.npmjs.org/all-the-cities)

  | Country | Places ≥1k | ≥10k | ≥100k | ≥1M | ζ (≥10k) | ζ (≥100k) | Per million people: ≥10k / ≥100k* |
  |---|---|---|---|---|---|---|---|
  | US | 16,087 | 4,332 | 338 | 14 | 1.18 ± 0.05 | 1.38 ± 0.21 | 13 / 1.0 |
  | GB | 3,569 | 1,016 | 95 | 1 | 1.13 ± 0.10 | 1.48 ± 0.42 | 15 / 1.4 |
  | DE | 6,987 | 1,490 | 81 | 3 | 1.29 ± 0.09 | 1.36 ± 0.42 | 18 / 1.0 |
  | FR | 8,727 | 923 | 39 | 1 | 1.40 ± 0.13 | 1.59 ± 0.70 | 14 / 0.6 |
  | IT | 6,629 | 935 | 33 | 2 | 1.35 ± 0.12 | 1.22 ± 0.59 | 16 / 0.6 |
  | ES | 2,830 | 770 | 64 | 2 | 1.15 ± 0.11 | 1.50 ± 0.52 | 16 / 1.3 |
  | PL | 2,409 | 425 | 47 | 1 | 1.09 ± 0.15 | 1.54 ± 0.62 | 11 / 1.2 |
  | JP | 759 | 738 | 201 | 13 | 0.98 ± 0.10 | 1.32 ± 0.26 | — |
  | BR | 2,013 | 1,653 | 231 | 15 | 0.96 ± 0.07 | 1.24 ± 0.23 | — |
  | MX | 8,682 | 935 | 130 | 12 | 0.88 ± 0.08 | 1.16 ± 0.28 | — |
  | RU | 4,456 | 1,375 | 170 | 12 | 0.96 ± 0.07 | 1.23 ± 0.26 | — |

  \*The per-million column uses approximate national populations (US 331M, GB 67M, DE 83M, FR 68M, IT 59M, ES 48M, PL 38M); these are **background, unverified**. Germany's 81 places of ≥ 100k match its usual count of about 80 *Großstädte*. Primacy ratios (largest ÷ second-largest place): US 2.06, GB 7.68, FR 2.69, DE 1.97, MX 6.77.
- [US] **Zipf exponent for metropolitan areas** (computed). Data: 381 MSAs, 2013 population, from [USmetro_gdp_pop_2013 (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/USmetro_gdp_pop_2013).
  - ζ = **0.91 ± 0.13** for all 381 (smallest 54k).
  - **1.04 ± 0.20** for the top 200 and **1.18 ± 0.33** for the top 100.
  - The ten largest MSAs hold 31% of total MSA population (270.3M). New York is 1.52× Los Angeles.
- [US] **Gibrat test, metro growth 2010→2022** (ACS 1-year population, 289 MSAs with both years; computed). Source: [us_2010_2022_population.csv (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/us_2010_2022_population.csv). Caveat: MSA delineations changed over the period.
  - Mean log growth is **0.65%/yr** with SD **1.02%/yr**.
  - Growth vs log size has slope +0.16 pp/yr per log unit (correlation 0.15).
  - By size class, mean growth is 0.21%/yr (< 100k, n = 19), 0.58% (100–250k), 0.74% (250k–1M) and 0.94% (> 1M, n = 27).
  - The SD is smaller for metros over 1M (0.70%/yr) than for smaller ones (about 1.0%/yr).
- [DE, US] **Settlement spacing vs size threshold** (computed from the same GeoNames data).
  - "Hex spacing" is the side of a regular hexagonal lattice with the same density: √(2A / (√3·n)).
  - R is the Clark–Evans ratio of mean nearest-neighbour distance to the Poisson expectation. R > 1 means more regular than random; R < 1 means clustered.

  | Region (area) | Threshold | n | Mean NN distance | Hex spacing | Clark–Evans R |
  |---|---|---|---|---|---|
  | Germany (357,600 km²) | ≥ 1k | 6,987 | 4.2 km | 7.7 km | 1.18 |
  | | ≥ 10k | 1,490 | 8.5 km | 16.6 km | 1.09 |
  | | ≥ 100k | 81 | 30.5 km | 71.4 km | 0.92 |
  | Southern Germany, Bavaria + Baden-Württemberg (106,300 km²) | ≥ 1k | 2,739 | 3.8 km | 6.7 km | 1.22 |
  | | ≥ 10k | 461 | 7.9 km | 16.3 km | 1.04 |
  | | ≥ 100k | 17 | 41.1 km | 85.0 km | 1.04 |
  | Iowa (145,746 km²) | ≥ 1k | 282 | 14.0 km | 24.4 km | 1.23 |
  | | ≥ 10k | 40 | 27.7 km | 64.9 km | 0.92 |

  Raising the threshold 100× (1k → 100k) multiplied the German hex spacing by 9.3. That is close to √100 = 10, the value Zipf with ζ ≈ 1 implies.
- [CN] **Skinner's standard marketing areas** (1964–65 studies of rural China). Each held about **18 villages**, an inner ring of 6 and an outer ring of 12, which is a hexagonal pattern. The average "for villages together with standard and intermediate market towns was slightly over 100 agricultural households". Markets were periodic, meeting from **once every ten days in remote areas up to every other day** in the busiest places. Traders rotated between markets because no single hinterland had enough demand — [Skinner via eScholarship PDF, snippet only](https://escholarship.org/content/qt51x4g3qh/qt51x4g3qh.pdf?t=o0wtmd)

### Inferences

#### Settlement generator (country of N people)
1. Draw settlement sizes from a Pareto tail with ζ ≈ 1.0 (metro-like units) or 1.1–1.2 (municipal units) above x_min. Add a separate rural, dispersed population; the GeoNames sum covers only about 77% of US population, and the background US rural share is about 20%.
2. With exact Zipf (ζ = 1), the largest settlement is S₁ ≈ N / H_n, where H_n is the harmonic number of the settlement count n = S₁/x_min. Worked examples (computed):
   - **N = 1,000,000, x_min = 200:** S₁ ≈ 140k (14% of the country); about 700 settlements; 70 of ≥ 2k; 14 of ≥ 10k.
   - **N = 100,000, x_min = 200:** S₁ ≈ 19k; about 97 settlements.
   - **N = 10M, x_min = 500:** S₁ ≈ 1.2M; about 2,400 settlements; 119 of ≥ 10k.
3. Most settlements in a plausible country are therefore villages. In the US, 75% of incorporated places are under 5k.

#### Rule-of-thumb counts for a developed country (cross-check)
About **1 city ≥ 100k per million** inhabitants, about **15 towns ≥ 10k per million** and **50–130 places ≥ 1k per million**. France and Italy sit at the low end for big cities and the high end for small communes.

#### Placement
- Place settlements on a jittered hexagonal (Christaller/Skinner) lattice by level, or with Poisson-disc spacing whose minimum distance scales as √(A / N(≥S)).
- **Test:** Clark–Evans R for small places should be 1.1–1.25, and R for large places 0.9–1.1.
- Southern Germany's hex spacing for places ≥ 1k (6.7 km) is a sanity check for the walking-distance village grid of an agrarian country.

#### Dynamics (Gibrat)
- Give each settlement a random annual growth rate, roughly normal with mean equal to national population growth and SD ≈ 1%/yr.
- Allow a slight positive tilt with size (+0.1 to +0.2 pp/yr per log unit) and lower variance for the largest cities, as in US metros 2010–2022.
- **Test:** after 50 simulated years the size distribution should keep ζ within about 0.9–1.2. With no tilt and constant variance, pure Gibrat drifts towards a log-normal and needs a lower reflecting barrier (a minimum village size) to keep a Pareto tail.

#### Service hierarchy (central place)
- Assign each service type a threshold population and a range. A settlement offers the service only if its catchment, including dependent villages within the range, exceeds the threshold.
- A village of a few hundred has one shop and a weekly market. Higher-order goods (bank, hospital, specialist trades) appear only in towns.
- This turns the Lengnick firm count per settlement into a function of catchment population, not of the settlement's own population.

### Gaps
- **Christaller's original k = 3 hierarchy for southern Germany (1933)** could not be opened. **Background, unverified:**

  | Level | Spacing | Central-place population |
  |---|---|---|
  | Market hamlet | 7 km | 800 |
  | Township centre | 12 km | 1,500 |
  | County seat | 21 km | 3,500 |
  | District city | 36 km | 9,000 |
  | Small state capital | 62 km | 27,000 |
  | Provincial head city | 108 km | 90,000 |
  | Regional capital | 186 km | 300,000 |

  Each level's spacing is √3 times the one below. Modern German municipal populations are inflated by the 1970s municipal mergers, so my GeoNames spacings are not a like-for-like test.
- Modern empirical tests of central place theory could not be opened. Examples include Mori–Nishikimi–Smith's "number–average size rule", Berry–Garrison threshold populations for retail functions, and Schiff's restaurant-variety scaling. Threshold populations for specific services are therefore **background, unverified** and should be treated as tunable.
- The Soo 2005 per-country values and the share of countries rejecting ζ = 1 were not retrieved.
- There is no complete US village count below incorporated places (CDPs, unincorporated hamlets), and no 2020 urban/rural split from a primary source. **Background, unverified:** the 2020 Census was about 80% urban and 20% rural.

---

## 3. Trade between settlements: gravity, spatial price equilibrium and the law of one price, periodic markets, caravans, and how games model it

### Takeaway
**Measured rules:**
- **Gravity.** Bilateral trade falls with distance at an elasticity of about **−0.9** (mean of 1,467 estimates; Disdier & Head 2008).
- **Commuting** decays much faster, with an exponent of about **−2** (computed for New York State, 2011).
- **Law of one price.** The workable rule comes from spatial-equilibrium code. Merchants ship whenever destination price × (1 − losses) exceeds origin price × (1 + margin) + tariffs + distance × transport cost. Volume adjusts in proportion to that margin, so price gaps settle inside a transport-cost band.

**Game models** offer three tested designs (one pair of Victoria 3 market formulas is snippet only):
- *Victoria 3*: a market-wide price clamped to ±75% of base, plus state "local prices" blended by market access.
- *Mount & Blade*, Warband-derived code: caravans carry a price vector and pull each town's prices 20% toward it per visit.
- *OpenTTD* and *Project Alice*: gravity-like demand and margin-driven trade volumes.

### Cited Findings

#### Empirical distance decay
- [Intl] **Disdier & Head 2008** (REStat 90(1):37–48): **1,467 distance effects from 103 papers**, with a **mean distance elasticity of 0.9**. The distance effect "rose around the middle of the century and has remained persistently high since then", even with controls — [EconPapers record, snippet only](https://econpapers.repec.org/RePEc:tpr:restat:v:90:y:2008:i:1:p:37-48)
- [US] **Commuting gravity, New York State counties, 2011** (62 counties, 8.83M workers; ACS commuting flows bundled with scikit-mobility; computed). Source data: [NY_commuting_flows_2011.csv and NY_counties_2011.geojson (opened)](https://github.com/scikit-mobility/scikit-mobility/tree/master/examples)
  - An OLS fit on 1,892 positive inter-county flows gives ln T = 2.39 + **0.54 ln Pop_origin + 0.51 ln Pop_dest − 2.28 ln distance**.
  - **66.3% of workers work in their home county.** Inter-county commuters at centroid distances of 0–25 km are 18.6% of all workers, 25–50 km 8.8%, 50–100 km 5.7%, 100–200 km 0.46%, and over 200 km 0.20%.
  - The scikit-mobility documentation fits the same data with a singly constrained gravity model: **deterrence exponent −1.99, destination exponent 0.65** — [skmob/models/gravity.py docstring (opened)](https://github.com/scikit-mobility/scikit-mobility/blob/master/skmob/models/gravity.py)

#### Game and open-source implementations (code opened unless marked)
- **Project Alice** (open-source re-implementation of Victoria 2; main branch, commit 2026-10-04). Trade routes between state markets use explicit arbitrage:
  - **Earnings:** earn = P_dest × (1 − 0.01/6000 × km), i.e. goods are lost at 1% per 6,000 km.
  - **Costs:** pay = P_origin × (1 + export tariff + merchant cut) + P_dest × import tariff + km × transport price. The **merchant cut is 5% for foreign routes and 0.1% for domestic ones**.
  - **Volume update:** volume_next = max(0, volume × decay + (0.001 × volume + 0.1) × diff), where diff = 2(earn − pay) / (earn + p_min). Positive changes are scaled down when transport capacity, buy/sell probabilities or budgets are short. Decay is ≥ 0.999 per day.
  - **Transport is a service:** route volume × km is added to the market's land or naval transport demand, so congestion raises transport prices.
  - Sources: [economy_trade_routes.cpp](https://github.com/schombert/Project-Alice/blob/main/src/economy/economy_trade_routes.cpp), [economy_constants.hpp](https://github.com/schombert/Project-Alice/blob/main/src/economy/economy_constants.hpp) (opened)
  - **Acceptance criteria** in the design doc include: markets at state level; labour costs for trade-route management; "Merchants take a cut of the price difference"; "During travel, based on distance, some of the goods are lost"; "Increase of volume reduces the transport cost"; wartime embargo, blockade and occupation stop trade — [docs/features/trade.md (opened)](https://github.com/schombert/Project-Alice/blob/main/docs/features/trade.md)
  - **Prices** move with the ratio of supply to demand: probability_to_sell = min(demand/supply, 1) and probability_to_buy = min(supply/demand, 1). The commodity speed multiplier is 0.01, and there is a floor price to avoid singularities — [price.hpp (opened)](https://github.com/schombert/Project-Alice/blob/main/src/economy/price.hpp)
- **Mount & Blade: Warband-derived module system** (the *Last Days of the Third Age* mod's `module_scripts.py`, master branch, commit 2026-10-03). Each town stores a **price factor per trade good**, with average 1,000, minimum 100 and maximum 10,000 (×0.1 to ×10).
  - **Caravan departure:** every 8 game hours, a caravan in a town departs with 35% probability for a random town at peace with its faction "in trade route".
  - **On arrival** (`do_party_center_trade`, called with 20%), each good's town price moves **20% of the gap toward the price the caravan carries** (copied from the last town it visited), and the caravan then carries the new town price.
  - **Payoffs:** the caravan's "earning" is half the sum of absolute price gaps before adjustment. The town gains tariffs of (10 + prosperity)/2200 × that earning (the code comment reads "(10 + prosperity)/110 × 5% of the merchant's revenue"), and gets a 35% chance of +1 prosperity.
  - **Player trades:** a player purchase raises the good's factor by 10 (1%); a sale lowers it by 15.
  - Source: [tldmod module_scripts.py and module_simple_triggers.py (opened)](https://github.com/tldmod/tldmod/tree/master/ModuleSystem)
  - In this mod the periodic `update_trade_good_prices` trigger is commented out, so caravans are the only price-diffusion mechanism.
- **Victoria 3** (Paradox).
  - Market price = Base × [1 + 0.75 × clamp((BUY − SELL) / min(BUY, SELL), ±1)].
  - Market access starts as infrastructure ÷ infrastructure usage, capped at 100%; for example, infrastructure 45 with usage 90 gives at most 50%.
  - Local price = MAPI × market price + (1 − MAPI) × state price. MAPI ("market access price impact") has a base of 75%, is modified by laws and technology, and is then multiplied by market access.
  - Overseas states also need ports and convoys.
  - Source: [Victoria 3 wiki "Market", snippet only](https://vic3.paradoxwikis.com/Market)
  - The **current (June 2026) script interface** exposes per-state `market_access` and `world_market_access`, a `world_market_delta` trigger ("exports minus imports in the world market"), per-good `base_price`, trade-route modifiers (cost, competitiveness, quantity, imports and exports), `tariff_import_add` / `tariff_export_add`, and `market_max_imports_add` / `market_max_exports_add` — [CWTools Vic3 config links.cwt and modifiers.gen.cwt (opened; names only, no formulas)](https://github.com/cwtools/cwtools-vic3-config)
- **OpenTTD cargodist** (master). Demand between two stations is assigned as follows:
  - **Formula:** demand = effective supply / (1 + accuracy × s / (2·d₀)).
  - **d₀** = √(the map's corner-to-corner "max-plus-Manhattan" tile distance).
  - **s** = d₀ + (d − d₀)·m/1024, where m is the "demand_distance" setting. The default m = 100 keeps s ≈ 0.9·d₀ + 0.1·d, so distance decay is *weak* by default. Values of m above 100 are boosted quadratically (150 → 308, 200 → 933, 255 → 2102), which makes decay strong.
  - **Symmetric cargo:** effective supply = supply_A × max(1, supply_B) × demand_size% / mean supply.
  - **Defaults:** accuracy 16 (range 2–64), demand_distance 100% (0–255), demand_size 100%.
  - This is a singly constrained gravity model with a tunable hyperbolic distance decay — [src/linkgraph/demands.cpp](https://github.com/OpenTTD/OpenTTD/blob/master/src/linkgraph/demands.cpp), [linkgraph_settings.ini](https://github.com/OpenTTD/OpenTTD/blob/master/src/table/settings/linkgraph_settings.ini) (opened)
- **Freeciv**, classic rules:
  - Trade-route income = (distance + size₁ + size₂) × route-type % / 12.
  - A caravan's one-off entry bonus = (distance + 10) × (trade₁ + trade₂) / 24.
  - Income therefore **rises with distance**, a deliberate game-design reward for long routes and the opposite of real distance decay — [common/traderoutes.c (opened)](https://github.com/freeciv/freeciv/blob/main/common/traderoutes.c)

#### Periodic markets
- [CN] Skinner: markets met from once in ten days (remote) to every other day (busy), with traders rotating between markets. About 18 villages fed each standard market town — [Skinner, snippet only](https://escholarship.org/content/qt51x4g3qh/qt51x4g3qh.pdf?t=o0wtmd)

### Inferences

#### Aggregate trade between off-focus settlements (rule)
Use a **margin-driven arbitrage flow**, as in Project Alice, rather than a fixed gravity matrix. For good g and an ordered pair (i, j):

- margin = p_j(1 − λ·d_ij) − p_i(1 + μ) − τ·d_ij

Then set flow_next = max(0, δ·flow + k·(a·flow + b)·margin / p_j). This conserves goods, since the shipped quantity leaves i and arrives at j minus losses.

Starting values:
- μ ≈ 1–5% merchant margin, with domestic margins near Project Alice's 0.1% only if merchants are not agents.
- λ ≈ small spoilage or loss per km.
- τ = transport price per unit-km. Ideally τ is endogenous, a service that consumes carter or courier labour.

**Equilibrium property (LOOP band):** |p_i − p_j| ≤ τ·d_ij + μ·p + λ·d·p wherever positive flows exist. Larger gaps are allowed only where capacity binds (Victoria 3 market access < 100%) or where no route exists.

#### Calibrating the distance decay
After the run, regress simulated inter-settlement trade values on GDPs and distance. The **distance coefficient should come out around −0.8 to −1.1 for goods**. Commuting and shopping trips should decay faster (exponent about −2; 99.3% of NY workers commute less than 100 km between county centroids).

#### Caravans and couriers as agents (focus mode)
The Warband rule is a simple, conservative "price diffusion" kernel: on each visit, p_town ← p_town + 0.2 (p_carried − p_town). A price gap halves after ln 0.5 / ln 0.8 ≈ 3.1 caravan visits.

In the dot society:
- A merchant agent should buy where its posted-price estimate is low and sell where it is high, paying into the integer-cent ledger.
- Its arrival should *move inventories*, letting posted prices adjust via the Lengnick rules, rather than overwriting prices directly. This keeps the ledger zero-sum.
- Use the 20%-per-visit convergence only as a **target** to check: after k caravan visits, the cross-town price gap for a traded good should shrink at about that rate.

#### Market access and capacity
Adopt Victoria 3's idea that a settlement's link to the national market is limited by transport capacity. When shipments exceed road or cart capacity, the local price becomes a blend weighted toward local supply and demand. This produces realistic famine and shortage price spikes in isolated villages.

#### Tests
- **(T1) LOOP band.** In steady state, no pair of connected settlements keeps a price gap above τ·d + margin for more than N_ticks.
- **(T2) Shock.** A village harvest failure raises the local price, imports start within the merchant reaction time, and the price returns into the band.
- **(T3) Gravity.** Fit simulated flows to a gravity model, expecting a distance elasticity of −0.9 ± 0.2 for goods.
- **(T4) Conservation.** For each good, Σ exports = Σ imports + Δ in-transit + losses, exactly.

#### Market days
Run village markets on a **weekly cycle**, and pick the cycle length from catchment density: every 2 days for dense or rich areas, up to every 10 days for remote ones (Skinner). Itinerant merchants follow a circuit through about 6 neighbouring villages plus the market town.

### Gaps
- **Empirical intra-national price gaps versus distance** could not be searched within the budget. Examples are Atkin & Donaldson 2015 on Ethiopia and Nigeria, Aker 2010 on mobile phones and grain price dispersion in Niger, Jensen 2007 on Kerala fish markets, and Engel–Rogers or Parsley–Wei for US cities. **Background, unverified:** price gaps rise with log distance; mobile phones reduced grain price dispersion in Niger by roughly 10–20%; price-gap half-lives for traded goods across US cities are on the order of a year. Do not hard-code any of these.
- The **Head & Mayer 2014** structural-gravity distance coefficients (background, unverified: about −1.1 in structural estimates) were not retrieved.
- **Mount & Blade II: Bannerlord's** caravan and village-farmer economy could not be opened. Its source is closed, and its wiki and mod docs were blocked. **Background, unverified:** villages produce raw goods and send villager parties to their bound town; towns' workshops convert inputs; clan- or player-owned caravans buy cheap and sell dear between towns, and prices respond to town stocks. Native Warband also has periodic price regression and village-farmer parties; those were not inspected because the opened mod disables or omits them.
- The **Victoria 3** formulas above are from a wiki snippet and may predate the 1.9-era trade rework; the opened config shows world-market and trade-route modifiers but no formulas. The current local-price and world-market formulas are unverified.
- No data were found on **weekly-market counts** (for example Indian haats, African periodic markets) or on village-market turnover.

---

## 4. Migration and commuting: Harris–Todaro, gravity and radiation models, typical rates, and how commuting differs from migration

### Takeaway
**Rates for calibration:**
- **US mobility:** 7.8% (CPS, 2024 record low) to 11.8% (ACS, 2024) of people move each year. Most moves are local: 53.5% of movers in 2022 stayed in the same county. Only about 1 in 5 movers changes state.
- **Rural to urban in poorer countries:** about one in four or five rural-raised people move to urban areas as young adults (Young 2013, 65 countries).

**Destination choice:** use Harris–Todaro expected wages (wage × employment probability) minus moving costs, distributed across destinations by a gravity or radiation kernel.

**Commuting is a different, daily process.** About two-thirds of workers work in their home county (NY 2011); flows fall off with distance at an exponent of about −2; per-capita commuting time grows about 5–6% per doubling of city size.

### Cited Findings
- [Intl] **Young 2013** (QJE 128:1727–1785): DHS data for **65 countries**. "One out of every four or five individuals raised in rural areas moves to urban areas as a young adult." The urban–rural gap **accounts for about 40% of mean within-country (consumption) inequality** — [LSE Research Online record, snippet only](https://researchonline.lse.ac.uk/id/eprint/46872/)
- [US] **Mover rates, 2024:** the ACS counts **39.6 million movers (11.8%)**; the CPS "long-run trend survey" gives **7.8%**, described as the lowest on record — [Axios, 30 Nov 2025, snippet only](https://www.axios.com/2025/11/30/us-moving-rate-map)
- [US] **Within-county share:** in 2022, **53.5% of movers moved within the same county** — [Census story Sept 2023, snippet only](https://www.census.gov/library/stories/2023/09/why-people-move.html)
- [US] **Interstate share:** "19% of movers in 2024 changed states" — [HireAHelper migration report, snippet only; commercial source, low quality](https://www.hireahelper.com/moving-statistics/migration-report/2024/)
- **Radiation model** (Simini, González, Maritan & Barabási 2012, Nature 484:96–100), as implemented in scikit-mobility:
  - T_ij = O_i × [1 / (1 − m_i/M)] × m_i m_j / ((m_i + s_ij)(m_i + m_j + s_ij)).
  - s_ij is the population inside the circle of radius r_ij around i, excluding i and j. The 1/(1 − m_i/M) term is the finite-system normalisation.
  - It is parameter-free. The docstring reports that US census 2000 commuting between two Utah counties is an order of magnitude greater than between an Alabama pair with similar populations and distance, which the radiation model captures — [skmob/models/radiation.py (opened)](https://github.com/scikit-mobility/scikit-mobility/blob/master/skmob/models/radiation.py)
- **Gravity variants** (scikit-mobility):
  - Singly constrained: T_ij = O_i · m_j f(r_ij) / Σ_k m_k f(r_ik).
  - Doubly constrained: T_ij = K_i O_i L_j D_j f(r_ij), with balancing factors K_i and L_j.
  - The default deterrence is a power law with exponent −2.0; exponential deterrence is also available — [skmob/models/gravity.py (opened)](https://github.com/scikit-mobility/scikit-mobility/blob/master/skmob/models/gravity.py)
- [US] **Gravity vs radiation on New York 2011 county commuting** (computed). Fit is measured by the common part of commuters (CPC), using observed origin totals:

  | Model | CPC |
  |---|---|
  | Radiation (parameter-free) | 0.521 |
  | Singly constrained gravity, distance exponent −2 | 0.506 |
  | Same, exponent −3 | 0.494 |
  | Same, exponent −1 | 0.459 |

  The two models perform about equally well at county scale — computed from [scikit-mobility example data (opened)](https://github.com/scikit-mobility/scikit-mobility/tree/master/examples)
- [US] **Commuting vs migration geography** (computed, NY 2011): 66.3% of workers work in their home county, and only 0.66% commute between county centroids more than 100 km apart. Same source as above.
- [US] **Commuting time vs city size** (computed): aggregate travel time to work scales with metro population as β = 1.088 (2010) and 1.068 (2022). Per-capita commuting time therefore rises about 5–6% per doubling — [us_2010_2022_trav_time.csv (opened)](https://github.com/edugalt/scaling/blob/master/data/usa/us_2010_2022_trav_time.csv)
- [UK] **Rural–urban employment structure** (computed): agricultural employment scales sublinearly with cluster size (β = 0.85–0.92), while finance scales superlinearly (1.07–1.08). This is the sectoral wage gap that drives rural–urban moves in Harris–Todaro — [uk data (opened)](https://github.com/edugalt/scaling/tree/master/data/uk)

### Inferences

#### Migration rule (aggregate mode, monthly)
1. Each settlement i loses m_i × Pop_i movers per month.
   - **US-like:** about 0.65–1.0% per month in total (7.8–11.8% per year).
   - **Between settlements:** about 45% of those (1 − 0.535), i.e. **≈ 3.6–5.5% of the population per year (0.3–0.45% per month)**. Within-settlement moves only re-house people.
   - **Interstate-like long-distance:** 0.19 × 7.8% ≈ **1.5% per year** (the 19% share comes from a low-quality source).
2. Destination choice: P(j | i) ∝ exp(θ · [w_j (1 − u_j) − c(d_ij)]) × K_ij.
   - w_j (1 − u_j) is the **Harris–Todaro expected wage** (posted wage × probability of employment).
   - K_ij is a radiation or gravity accessibility kernel.
   - c(d) is a moving cost that rises with distance.
3. Movers carry their household's money and goods between ledgers.

#### Rural–urban cohorts
Young's "1 in 4–5 rural-born move to urban areas as young adults" implies an annual hazard of about **1.5–1.9% per year for ages 15–30** (computed: 1 − (1 − 0.22)^(1/15) ≈ 1.6%). Apply this to village youth when the urban expected wage exceeds the rural wage. **Test:** after 15 simulated years, 20–25% of a village birth cohort lives in towns or cities.

#### Harris–Todaro equilibrium test
With free migration and an urban wage floor, urban unemployment should rise until w_rural ≈ (1 − u_urban) × w_urban (**background**, the standard textbook condition). **Test:** raise the urban minimum wage by 20% and check that urban unemployment rises rather than rural wages converging.

#### Commuting rule (focus mode)
- Commuting links should exist only between settlements within a daily range of about 50–100 km. In NY, more than 99% of workers commute within 100 km and 66% within their own county.
- Destination choice can reuse the radiation kernel, or gravity with exponent −2.
- Commuters keep residence (population and household ledger) in the origin and earn wages in the destination. That is a **cross-settlement income flow, not a population flow**, and it should appear in the settlement accounts as a factor-income transfer.

#### Tests
- **(T1) Flow distance decay.** Simulated inter-settlement migration flows decay more slowly with distance than commuting.
- **(T2) Commuting fit.** A gravity fit to simulated commuting gives a distance exponent of about −2 and a destination-mass exponent of about 0.5–0.7.
- **(T3) Commute time.** Per-capita commute time rises about 5–6% per doubling of settlement size.

### Gaps
- **Harris & Todaro (1970) and Todaro (1969)** were not opened. The expected-wage condition above is textbook material, labelled background.
- **Empirical elasticities of migration to expected wages,** and estimates of moving costs, were not found.
- **UN/World Bank figures on the share of urban growth due to migration and reclassification versus natural increase** were not retrieved. **Background, unverified:** migration and reclassification account for roughly 40% of urban growth in developing countries.
- The official CPS 2024 interstate rate and the ACS 2024 tables were not opened, because census.gov was blocked. The "19% of movers change state" figure comes from a commercial report.
- **Lenormand, Bassolas & Ramasco 2016** and **Masucci et al. 2013** (systematic comparisons of radiation and gravity) were not opened. **Background, unverified:** gravity with fitted exponents usually matches or beats radiation at small scales, and radiation needs a finite-size correction.

---

## 5. Rural versus urban crime and policing: rates by settlement size, staffing, response times, and rural property crime

### Takeaway
- **[US] Crime rises with settlement size.** Property victimisation is about **192 per 1,000 households in urban areas, 98 in suburban and 57 in rural** (NCVS 2023, snippet). Violent crime is **391 per 100k in small cities outside metros versus 208 in non-metro counties** (FBI 2019, snippet).
- **[UK] Recorded crime is 59 per 1,000 in rural England versus 99 in urban England outside London** (2023/24).
- **Policing per capita is highest in the smallest towns,** at 4.5 officers per 1,000 versus 2.3 nationally. County agencies, which cover unincorporated and often rural land but also include metropolitan counties, report 2.6 per 1,000.
- **Rural emergency response times are about twice urban ones,** about 14 versus 7 minutes (median, EMS evidence).
- **Glaeser & Sacerdote attribute only about 1/4 of the city-size crime gap to higher payoffs and about 1/5 to lower arrest or recognition odds.**

### Cited Findings
- [US] **FBI 2019** ("Crime in the United States 2019"):
  - Violent crime was **390.8 per 100,000 in cities outside metropolitan areas** and **207.5 per 100,000 in nonmetropolitan counties**.
  - The national property crime rate was **2,109.9 per 100,000**; in MSAs it was **2,187.5**.
  - [FBI CIUS 2019 Violent Crime / Table 16 pages, snippet only](https://ucr.fbi.gov/crime-in-the-u.s/2019/crime-in-the-u.s.-2019/topic-pages/violent-crime); Table 16 itself ("Rate: number of crimes per 100,000 inhabitants by population group") was found but not opened — [Table 16 data declaration, snippet only](https://ucr.fbi.gov/crime-in-the-u.s/2019/crime-in-the-u.s.-2019/tables/table-16/table-16-data-declaration)
- [US] **FBI 2024** national rates: violent crime **359.1 per 100k** (−5.4% vs 2023) and murder **5.0 per 100k**. Policing figures are as in section 1: 2.3 sworn per 1,000; 4.5 in cities under 10k; 2.6 for county agencies; 14,917 reporting agencies — [FBI 2024 Quick Stats (mirror), opened](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)
- [US] **NCVS 2023 property victimisation per 1,000 households:**
  - **Total 102.2; urban 192.3; suburban 98.1; rural 56.5.**
  - The urban rate rose from **176.1 (2022) to 192.3 (2023)**.
  - [BJS "Key Findings from the 2023 NCVS: Property Crime", snippet only](https://bjs.ojp.gov/document/PropertyCrime_2023.pdf). A 2024 version titled "Property victimization rates varied by household location" also exists — [BJS 2024 property crime key findings, title only](https://bjs.ojp.gov/document/propertycrime_2024.pdf). The snippet's figures should be checked against the PDF table; the total looks low relative to the three components unless urban households are a small share.
- [UK] **England, police-recorded crime excluding fraud, year ending March 2024:**
  - **59 per 1,000 population in rural areas** versus **99 per 1,000 in urban areas outside London**.
  - Predominantly rural areas recorded **3.4 more crimes per 1,000** than in 2022/23; predominantly urban areas outside London recorded **11.2 fewer**.
  - [Defra, Statistical Digest of Rural England "E. Crime", snippet only](https://www.gov.uk/government/statistics/communities-and-households-statistics-for-rural-england/e-crime)
  - Defra's indicator set covers violence against the person, sexual offences and robbery per 1,000 population, **domestic burglary per 1,000 households**, and vehicle offences per 1,000 population, using the Local Authority Rural Urban Classification — [archived Defra "Rural crime statistics" page (opened via S3 archive)](https://s3.amazonaws.com/thegovernmentsays-files/content/181/1819918.html)
- [US] **Glaeser & Sacerdote 1999**, "Why Is There More Crime in Cities?" (JPE vol. 107, pp. 225–258, December 1999 per the snippet; the issue was a supplement), using victimisation data, the NLSY and UCR:
  - Higher pecuniary returns explain **at most about one-quarter** of the city-size crime link.
  - Lower arrest and recognition probabilities explain **at most about one-fifth**.
  - **One-third to one-half** is explained by other factors, notably family structure, where peer influences matter more when families are weak.
  - [NBER WP 5430 record, snippet only](https://ideas.repec.org/p/nbr/nberwo/5430.html); [JSTOR, snippet only](https://www.jstor.org/stable/10.1086/250109)
- [US] **Emergency response times, rural vs urban (EMS evidence, used as a proxy for police):**
  - A systematic review found that **78.4%** of comparing studies reported a rural–urban difference, and **93.1%** of those found rural times longer.
  - One US study found a **median of 7 min (urban) vs over 14 min (rural)**, with **90th percentiles of 12 and 26 min**.
  - [PMC systematic review of prehospital times, snippet only](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9778378/)
  - A lower-quality summary gives 2022 Priority-1 EMS averages of **15.3 min rural vs 7.2 min urban**, and police response "5–10 minutes urban; rural 15 minutes or longer" — [LegalClarity, snippet only; secondary, low quality](https://legalclarity.org/what-is-the-average-response-time-for-police/)
- [US] **State-level association, 2009** (computed from the statsmodels "statecrime" dataset; American Statistical Abstract; % of population in urbanized areas from the 2010 Census):
  - The violent crime rate rises **+4.3 per 100k per percentage point urban** (correlation 0.43, n = 51 including DC).
  - Excluding DC the figures are +2.7 and correlation 0.34.
  - The murder rate rises +0.05 per point (correlation 0.30).
  - [statecrime.csv (opened)](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/datasets/statecrime/statecrime.csv)
- [EU, BR] **Crime scaling exponents computed in section 1:** EU homicide ≈ 1.0; the EU robbery-labelled file 1.28–1.38; Brazil external-cause deaths ≈ 1.0. Bettencourt's US "serious crimes" figure is 1.16 (snippet).

### Inferences

#### Settlement-class crime multipliers (aggregate mode)
Relative to rural = 1:

| Class | Property crime (households) | Violent crime |
|---|---|---|
| Rural / village | 1.0 | 1.0 |
| Small town (non-metro city) | 1.5–2 (interpolated) | ≈ 1.9 (FBI 2019: 390.8 / 207.5) |
| Suburb | ≈ 1.7 (98.1 / 56.5) | — |
| City core | ≈ 3.4 (192.3 / 56.5) | — |

- Recorded-crime ratios are smaller: England urban ≈ 1.7 × rural. This suggests either lower reporting in cities, a different mix of crime types, or a different urban definition.
- These multipliers are roughly consistent with β ≈ 1.15–1.25 between a village of about 1k and a city of about 1M: 1000^0.16 ≈ 3.0.

#### Becker parameters by size
Make detection probability fall with settlement size and anonymity, and make loot rise with the wealth per target (output scales at β ≈ 1.12). Keep these two channels to **no more than ~45%** of the urban–rural crime gradient (Glaeser–Sacerdote). The rest comes from population composition and social interaction, for example peer effects in the Epstein model.

#### Policing by size
- Towns of a few thousand should have **more officers per capita** (4.5 per 1,000) than cities (about 2.3 national). Unincorporated rural land is covered by a county or sheriff force at about 2.6 per 1,000, spread over a large area.
- Simulate rural response delay as travel time over distance. With **median response about 2× urban** (≈ 14 vs 7 min; p90 26 vs 12 min), the per-incident capture probability in rural areas is lower even though officers per capita are higher.
- With the earlier rounds' police elasticity (−0.15) and clearance (≈ 4% of thefts), let rural clearance depend on response time rather than officer density.

#### Hot spots and law of concentration at village scale
- With few targets, monthly village crime counts will be mostly zero or one. Pool several years for validation and use Poisson likelihoods (section 1, T3).
- Run the Short et al. field only in the focused settlement. For a village, use a coarse grid; rural repeat victimisation of farms and outbuildings is a reasonable analogue to "near-repeat" burglary.

#### Tests
- **(T1) Ratios.** Simulated NCVS-style property victimisation should give urban : suburban : rural ≈ 3.4 : 1.7 : 1 (± 30%).
- **(T2) Recorded-crime gradient.** Recorded crime per capita should show urban / rural ≈ 1.5–2.
- **(T3) Staffing pattern.** Officers per 1,000 should be highest in the smallest incorporated places.
- **(T4) Response times.** Rural median response should be about 2× urban.

### Gaps
- **FBI Table 16 (2019) values** for each population group (cities ≥ 250k, 100–250k, …, < 10k; metropolitan and nonmetropolitan counties) were not opened. Only the two violent-crime rates above came through as snippets. Property-crime rates by group are missing.
- **FBI clearance rates by population group** (whether rural clearance is higher) were not retrieved.
- **NCVS reporting-to-police rates by location** (urban, suburban, rural) for true-vs-recorded calibration were not retrieved. A BJS 2025 report on reporting by crime type and location of residence (2020–2023) exists, per the earlier round's notes, but was not opened.
- **Rural property crime specifics** were not retrieved within the search budget: UK NFU Mutual farm-theft costs; machinery, GPS, quad-bike and livestock theft; US farm and ranch theft. No figures are given here.
- **Police response-time data specific to rural police** (rather than EMS) were not found from a primary source.
- **Rural policing structures** (sheriffs, state police, county coverage per km²) and **officers per km²** were not retrieved.

---

## 6. Village economies and village life: agriculture and self-provisioning, informal credit and kinship, market days, cash intensity, and what a simulated village should do differently

### Takeaway
Measured anchors:
- **Own production is 20–43% of food consumption value** in rural sub-Saharan Africa (LSMS-ISA, 2008–2022); 33% on one six-country measure.
- **Markets are periodic,** every 2–10 days, with about 18 villages of about 100 households per market town (Skinner).
- **Agricultural employment scales sublinearly** with settlement size (UK β ≈ 0.85–0.92).
- **Most places are small:** 75% of US incorporated places have under 5k people.

A simulated village should run:
- a non-cash own-production goods flow beside the cent ledger;
- one shop and a weekly market fed by itinerant merchants;
- seasonal farm output with stored stocks;
- informal kin credit.

It should not run a scaled-down city labour market with many posted-price firms.

### Cited Findings
- [Africa] **LSMS-ISA food consumption by source** (World Bank surveys, 2008–2022):
  - Households obtain **33% of the food value consumed from subsistence production** across six countries. Across all countries and years, about **75% of household food value is purchased, 20% own-produced and 5% from gifts**.
  - The own-production share by country is **Ethiopia 42.8%, Malawi 31.1%, Niger 19.5%, Nigeria 23.9%, Tanzania 31.7%, Uganda 42.6%**.
  - "Subsistence households" are those getting more than 50% of food value from own production.
  - [ScienceDirect 2024 "The importance and determinants of purchases in rural food consumption in Africa", snippet only](https://www.sciencedirect.com/science/article/pii/S2211912424000014); [Scientific Data 2026 harmonised food-consumption dataset, snippet only](https://www.nature.com/articles/s41597-026-06548-1)
  - **Conflict:** the search summary merged these sources and gives both 33% and 20% for the own-production share. They probably differ in sample (rural-only vs all households) or weighting; I could not open either to check. Use 20–33% as the cross-country range and 19–43% for single countries.
- [CN] **Skinner's standard marketing community:**
  - About 18 villages per market area (6 inner + 12 outer).
  - Average "slightly over 100 agricultural households".
  - Markets every 10 days (remote) to every other day (busy), with traders rotating between markets because single hinterlands lack enough demand.
  - The "standard marketing community" is where the peasant meets "normal trade needs".
  - [Skinner via eScholarship, snippet only](https://escholarship.org/content/qt51x4g3qh/qt51x4g3qh.pdf?t=o0wtmd)
- [UK] **Sector mix vs settlement size** (computed, England & Wales 2011): agriculture, hunting and forestry employment β = **0.916 [0.878, 0.953]** across all clusters and **0.851 [0.791, 0.913]** for clusters over 50k. The agricultural share therefore falls by about 8–14% per doubling of settlement size — [uk data (opened)](https://github.com/edugalt/scaling/tree/master/data/uk)
- [US] **Most places are small:** 75% of 19,479 incorporated places had under 5,000 people (2024) — [Census Vintage 2024 release, snippet only](https://www.census.gov/newsroom/press-releases/2025/vintage-2024-popest.html)
- **Game-design pattern for self-provisioning** (Project Alice, opened). Land not owned by landowners or capitalists forms a **subsistence sector** of size rgo_base_size × (1 − ownership share). Up to 1.1× that size of otherwise-unemployed peasants work it.
  - Subsistence output produces a "subsistence score" = 5 × quality + 0.9 × 30, where quality comes from the province's life rating.
  - That score directly satisfies "life needs" without market purchases, up to a cap of 30 (`subsistence_score_life`); quality of life from subsistence = available / 30.
  - [economy.cpp](https://github.com/schombert/Project-Alice/blob/main/src/economy/economy.cpp), [economy_pops.cpp](https://github.com/schombert/Project-Alice/blob/main/src/economy/economy_pops.cpp), [economy_constants.hpp](https://github.com/schombert/Project-Alice/blob/main/src/economy/economy_constants.hpp) (opened)

### Inferences

#### What a simulated village should do differently (rules)
1. **Two goods channels.** About 20–45% of village food comes from **own production**. Book it as a goods flow from household or farm to household, *not* through the integer-cent ledger. Cash spending covers the remaining 55–80%, plus non-food goods.
   - **Test:** village M1 money per capita and transaction counts per capita are well below the city's, even at equal real consumption.
   - **Ledger rule:** self-provisioning must never create cents. If GDP is reported, own production is an imputed (non-cash) line.
2. **Fewer firms.** A village of about 100 households (Skinner's average) gets **one general shop** (a Lengnick firm with posted prices) plus farms. Specialised services exist only in the market town that serves about 18 villages. The Lengnick labour search in a village should sample a handful of employers. Unemployed villagers default to **own-farm work** (the Project Alice pattern), not to zero output.
3. **Weekly market.** Every 7 days (2–10 by density), itinerant merchants and neighbouring villagers meet at the market town. Village households sell surplus and buy manufactured goods. Between market days, only the single shop trades.
4. **Seasonality.** Farm output arrives at one or two harvests per year and is stored. Consumption draws stocks down, so prices for food in the village rise towards the pre-harvest "lean season" until imports arrive. Size this through the section 3 LOOP band rather than a fixed seasonal multiplier.
   - **Test:** pre-harvest local food price exceeds the post-harvest price by no more than τ·d to the nearest town plus storage costs.
5. **Informal credit and kinship.**
   - Villagers borrow small amounts from kin or neighbours at zero or low explicit interest, with repayment contingent on shocks.
   - Credit moves cents between households and must net to zero in the village ledger.
   - Expect consumption to be smoothed more than income within villages. **Test:** the cross-household correlation of consumption shocks is higher than that of income shocks.
6. **Migration valve.** Village youth have the 1.5–1.9% per year urban-migration hazard from section 4, driven by the expected-wage gap.
7. **Crime and policing.** Few targets and long police response (section 5). Farm theft and burglary replace street theft as dominant property crimes. Villages have no resident police, or one officer; county or regional coverage applies.

### Gaps
- **Informal credit and risk-sharing magnitudes** could not be searched. **Background, unverified:**
  - Townsend 1994 (ICRISAT villages, India): household consumption co-moves strongly with village average consumption, close to full insurance.
  - Udry 1994 (northern Nigeria): most households both lent and borrowed informally, and repayments were state-contingent.
  - Fafchamps & Lund 2003 (Philippines): risk sharing operates within networks of friends and relatives.
- **Seasonal price amplitude** for staple food was not retrieved. **Background, unverified:** the average maize seasonal price gap in African markets is roughly 25–35%.
- **Cash intensity of rural vs urban economies** (cash share of payments, account ownership) was not retrieved.
- **Developed-country village economics** were not retrieved. Examples are the number of shops and services by village size and the share of rural workers commuting to towns. The LSMS figures above are for low-income African villages; a US or European village would have much lower self-provisioning.

---

## 7. National level: taxes and transfers between regions, national vs local police, a national money issuer, and stock-flow identities that must hold exactly

### Takeaway
Use **Godley & Lavoie's Model REG** (two regions, one government, one central bank) as the template for national accounts. Its equations (opened) show:
- regional exports equal the other region's imports;
- a single national tax rate automatically moves fiscal resources toward a region in trouble;
- money is created only when the central bank buys government bills.

In the dot society, each settlement's net acquisition of financial assets must equal government net spending in it plus its net exports to other settlements. Settlement aggregates must sum exactly to national totals for population, money (integer cents) and goods (including in transit). Policing in the US is local and fragmented, with 14,917 city and county agencies reporting in 2024.

### Cited Findings
- **Godley & Lavoie Model REG** (Monetary Economics, chapter 6), implemented in Python:
  - **Output and trade:** Y_N = C_N + G_N + X_N − IM_N; IM_N = μ_N·Y_N; **X_N = IM_S and X_S = IM_N**.
  - **Income and tax:** YD_N = Y_N − T_N + R₋₁·Bh_N,₋₁; T_N = θ(Y_N + R₋₁·Bh_N,₋₁) with a **single national tax rate θ = 0.2**.
  - **Wealth and consumption:** V_N − V_N,₋₁ = YD_N − C_N; C_N = α₁·YD_N + α₂·V_N,₋₁.
  - **Portfolio:** bills Bh_N = V_N(λ₀ + λ₁R − λ₂·YD_N/V_N) and cash Hh_N = V_N − Bh_N.
  - **National aggregates:** T = T_N + T_S; G = G_N + G_S; Bh = Bh_N + Bh_S; Hh = Hh_N + Hh_S.
  - **Government budget:** Bs = Bs₋₁ + (G + R₋₁·Bs₋₁) − (T + R₋₁·Bcb₋₁).
  - **Central bank:** Hs − Hs₋₁ = Bcb − Bcb₋₁ (money is issued only against bills the central bank buys) and Bcb = Bs − Bh, with R exogenous.
  - **Parameters:** α₁ = 0.6/0.7; α₂ = 0.4/0.3; λ₀ = 0.635/0.67; λ₁ = 5/6; λ₂ = 0.01/0.07; μ = 0.18781 for both regions; θ = 0.2; G = 20 per region; R = 2.5%.
  - **Scenarios plotted:** a rise in the South's propensity to import; a rise in government spending in the South; a rise in the South's propensity to save; a fall in the South's liquidity preference. Each plots the South's change in household wealth, the "government balance with the South region" and the South's trade balance.
  - Source: [kennt/monetary-economics "Chapter 6 Model REG.ipynb" (opened)](https://github.com/kennt/monetary-economics/blob/master/Chapter%206%20Model%20REG.ipynb). PKSFC's DAG for REG also exists — [S120/PKSFC gl06reg.pdf (seen in listing)](https://github.com/S120/PKSFC)
- [US] **Local policing is fragmented:** **14,917 city and county law enforcement agencies** reported staffing in 2024. Staffing is reported by city population group and for county agencies separately (FBI Tables 70–74) — [FBI 2024 Quick Stats, opened](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)
- **Game analogue for a national layer** (Project Alice). Nations are processed in rank order, and domestic supply flows "fractionally, into the sphere leader's domestic production pool". Unsold domestic supply moves to a global pool, and remaining global supply "is trashed" at end of day. That last rule is a deliberate non-conservation that a ledger-exact simulation should avoid — [docs/economy_design.md (opened)](https://github.com/schombert/Project-Alice/blob/main/docs/economy_design.md)

### Inferences

#### Identities that must hold exactly (assert every tick, in integer units)
1. **Population.** For each settlement s: P_s,t+1 = P_s,t + births − deaths + in-migrants − out-migrants. Summed over settlements, internal migration cancels: Σ in = Σ out + Δ in-transit migrants. The national total equals the sum of settlements.
   - When a settlement switches between agent and aggregate mode, the agent count must equal the aggregate stock by type (age, employment status, offender or police role).
2. **Money (cents).** Total money equals central-bank issue plus any bank credit net of repayment. Equivalently, Σ_s (household + firm + local-government deposits and cash in s) + national government + central bank balances is **constant except at explicit issue or destruction events** (the Hs − Hs₋₁ = Bcb − Bcb₋₁ analogue).
   - Inter-settlement payments for goods, wages of commuters, taxes, transfers and migrants' moved savings are double entries that leave the national sum unchanged.
3. **Regional sectoral balance** (derived from REG by substituting Y_S = C_S + G_S + X_S − IM_S into ΔV_S = YD_S − C_S; holds for every settlement each period). Here V_s is the net financial wealth of all private holders in s (households plus firms; REG has households only):
   - ΔV_s ≡ (G_s + transfers_s + interest_s − T_s) + (X_s − IM_s) + net factor income_s (commuter wages in − out).
   - Σ_s (X_s − IM_s) = 0 nationally in a closed economy.
   - Σ_s ΔV_s = the national government deficit, net of central-bank profits returned to the treasury. This holds with no banks; with banks, add their net lending.
4. **Goods (units).** For each good and settlement: production + imports = consumption + exports + Δ inventory + Δ in-transit + losses (spoilage or transport).
   - **Own production is included in the goods identity but never in the money identity** (section 6).
   - Nothing is "trashed" without a loss entry, unlike the Project Alice world pool.
5. **Crime ledger.** Theft is a zero-sum transfer of cents or goods between victim and offender, so national money is unchanged by crime. Recorded crime ≤ true crime for every settlement and type.

#### Fiscal equalisation rule
- Levy taxes at national rates (θ uniform, as in REG), and spend by population need: per-capita public services and police paid per settlement.
- This produces **automatic transfers** from high-income to low-income settlements without any explicit equalisation grant. REG shows that when the South's demand falls, the government's balance with the South swings into deficit while the South's trade balance worsens.
- An optional explicit grant can add equalisation: grant_s = α × (national average per-capita tax base − s's) × P_s, with α as a policy lever between 0 and 1.
- **Test:** a negative shock to one region's exports is partly offset by a rise in its net fiscal inflow within the same year.

#### Police structure
- Default to **local forces**: each town or city funds its own police from local or national revenue, and a county or regional force covers villages (FBI staffing groups).
- A **national police** (national budget, deployable to hot spots anywhere) is a policy option whose effect is spatial reallocation, not extra officers.
- **Test:** total officers equal the sum of local and national forces. Officers per 1,000 are highest in small towns under the local-funding default.

#### Single money issuer
- One central bank or treasury per country issues currency. Settlements cannot create money.
- Interest on government bills (REG R = 2.5%) is a national-to-household flow, allocated to settlements by residents' holdings.
- Integer-cent rounding must be resolved by an explicit rounding account so the identities stay exact.

#### Hand-off test (micro ↔ macro)
1. Focus a settlement and run it for T ticks as agents.
2. Unfocus it and run it in aggregate for T ticks.
3. Compare its per-capita output, prices, crime rate and money stock with an always-aggregate twin.

Differences should stay within the aggregate model's stated noise, and **every identity above (population, money, sectoral balance, goods, crime ledger) must hold exactly at the switch moment**.

### Gaps
- **Fiscal equalisation magnitudes** (OECD averages; Canada, Germany and Australia schemes) and **interregional risk-sharing shares** could not be searched. **Background, unverified:**
  - Asdrubali, Sørensen & Yosha 1996 (US states 1963–1990): about 39% of shocks to gross state product were smoothed by capital markets, 13% by the federal government, 23% by credit markets, and about 25% not smoothed.
  - OECD studies report that fiscal equalisation removes roughly two-thirds of disparities in sub-national fiscal capacity.
  
  Treat both as unverified.
- **National versus local police organisation abroad** (for example France's split between police nationale and gendarmerie; England & Wales's 43 territorial forces) and US counts beyond the FBI reporting figure (BJS CSLLEA agency census) were not retrieved.
- No source was opened on **how official national accounts reconcile regional (state or metro) GDP with national GDP** (for example BEA's regional accounts).

#### Source-access log (applies to all sections)
- **Opened:**
  - GitHub repositories via `git clone` or raw files: `edugalt/scaling`, `scikit-mobility/scikit-mobility`, `OpenTTD/OpenTTD`, `freeciv/freeciv`, `schombert/Project-Alice`, `tldmod/tldmod`, `cwtools/cwtools-vic3-config`, `kennt/monetary-economics`, `S120/PKSFC` (listing only), `statsmodels/statsmodels`.
  - npm package `all-the-cities` 3.1.0 (GeoNames).
  - FBI 2024 Quick Stats PDF via an S3 mirror.
  - An archived Defra page via an S3 archive.
- **Blocked** (curl CONNECT 000/403 or WebFetch `EGRESS_BLOCKED`):
  - **Academic and author sites:** wiki.santafe.edu, math.uchicago.edu, royalsocietypublishing.org, pnas.org, arxiv.org, journals.plos.org, PMC (ncbi.nlm.nih.gov and pmc.ncbi.nlm.nih.gov), europepmc.org, escholarship.org, core.ac.uk, cambridge.org, legacy.econ.tuwien.ac.at, antoniocasella.eu, gtap.agecon.purdue.edu, ageconsearch.umn.edu, scholarship.claremont.edu, economics.ucr.edu, rimisp.org.
  - **Official statistics and government:** ucr.fbi.gov, cde.ucr.cjis.gov, bjs.ojp.gov, ojp.gov, nij.ojp.gov, census.gov, bls.gov, ons.gov.uk, gov.uk and assets.publishing.service.gov.uk, researchbriefings.files.parliament.uk, statcan.gc.ca, worldbank.org (api, data, documents1), population.un.org, unstats.un.org, eurostat, ers.usda.gov, fao.org, policinginstitute.org.
  - **Game and community sites:** vic3.paradoxwikis.com, forum.paradoxplaza.com, mountandblade.fandom.com.
  - **Archives and data hubs:** web.archive.org, archive.org, api.openalex.org, api.crossref.org, osf.io, figshare, dryad, dataverse, icpsr, ourworldindata.org, wikidata, overpass-api, geofabrik, datahub.io, humdata.
  - **GitHub API:** api.github.com search and repository endpoints ("sessions are bound to their configured repositories"), plus github.com HTML pages. `git clone` over HTTPS worked.
- **Searches:** 18 WebSearch calls in total; the census-mobility query triggered 3 internal searches.
