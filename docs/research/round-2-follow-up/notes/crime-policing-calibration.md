# Crime and policing calibration values for the dot-society simulation (researched 4 Oct 2026)

Read this first: the network proxy blocked almost every academic and government host (full list in the last section's Gaps), and the session's web-search budget (200 calls) ran out partway through. Only three primary or near-primary documents could be **opened**:
1. the FBI's *Reported Crimes in the Nation, 2024* Quick Stats, read through a third-party S3 mirror;
2. Levitt (2002, AER), read through a public GitHub course repository;
3. a third-party Python implementation of Short et al. (2008) on GitHub.

Everything else is **snippet only**: text from search-engine summaries, which can be wrong. Each citation below is labelled. Region tags: [US], [UK], [AR] Argentina, [CO] Colombia, [IL] Israel, [NL] Netherlands, [Intl].

## Q1. Police → property crime and theft: elasticities by crime type, and a usable simulation rule

### Takeaway
Causal estimates put the police elasticity of property crime at about −0.2 to −0.5. By type:
- **Larceny/theft:** smallest, about −0.1 to −0.2, and not statistically significant on its own.
- **Burglary:** about −0.2.
- **Robbery:** about −0.45.
- **Motor-vehicle theft:** largest, about −0.6 to −1.7.

Murder is about −0.67 to −0.9. A defensible default rule is **+10% police → about −1.5% theft, −2% burglary, −4% robbery, −5% to −6% motor-vehicle theft (MVT)**. Separately, a stationed guard has a strong but very local effect: −75% car theft on the guarded block and nothing detectable 1–2 blocks away.

### Cited Findings
- [US] **Levitt 2002** (AER 92(4):1244–50, reply to McCrary). Instrument: firefighters per capita. Sample: 122 cities with ≥100k residents, 1975–1995. Table 3 IV elasticities: **violent −0.435 (SE 0.231)** and **property −0.501 (SE 0.235)**. City-fixed-effects OLS: −0.076 and −0.218 (SE 0.052) — [Levitt 2002, opened via GitHub copy](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf); canonical: [AEA](https://www.aeaweb.org/articles?id=10.1257%2F00028280260344777) (blocked).
- [US] **Levitt 2002, Table 4, IV by crime type** (SE in parentheses; 95% CI = ±1.96·SE, which I computed):

  | Crime | IV elasticity (SE) | 95% CI | FE-OLS (SE) |
  |---|---|---|---|
  | Murder | −0.914 (0.332) | [−1.56, −0.26] | |
  | Rape | −0.034 (0.273) | | |
  | Robbery | −0.452 (0.255) | [−0.95, +0.05] | |
  | Aggravated assault | +0.397 (0.348) | | |
  | Burglary | −0.195 (0.255) | [−0.69, +0.31] | −0.294 (0.066) |
  | Larceny | −0.135 (0.198) | [−0.52, +0.25] | −0.136 (0.058) |
  | Auto theft | −1.698 (0.570) | [−2.82, −0.58] | −0.317 (0.104) |

  Across sensitivity specifications, the property IV estimate ranges from −0.149 to −0.845 — [Levitt 2002, opened](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf)
- [US] Levitt 2002 also summarises other work (opened):
  - Corman & Mocan (2000), NYC monthly data: elasticities from −0.29 to −1.385, median −0.452.
  - Marvell & Moody (1996): total index crime −0.30.
  - "Four different approaches … have all obtained point estimates in the range of −0.30 – 0.70."
  - Sample mean police per capita: 0.0033 (3.3 per 1,000).

  [Levitt 2002, opened](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf)
- [US] **Levitt 1997 and McCrary 2002** (snippet only):
  - Levitt (1997): elasticity ≈ −1.0 for violent crime and ≈ −0.2 for property crime.
  - McCrary (2002) found a weighting error. Correctly weighted 2SLS shows no significant effect for any category, and the pooled violent estimate is about half the published size.

  [McCrary replication PDF](https://eml.berkeley.edu/replications/mccrary/clewp35.pdf); [ResearchGate](https://www.researchgate.net/publication/4730441_Using_Electoral_Cycles_in_Police_Hiring_to_Estimate_the_Effect_of_Police_on_Crime_Comment)
- [US] **Chalfin & McCrary 2018** (REStat 100(1):167–186; cities 1960–2010, corrected for measurement error), snippet only:
  - "Best guess" murder elasticity: **−0.67 ± 0.47**.
  - A secondary summary gives **violent −0.34, property −0.17, cost-weighted index −0.47**.

  [Berkeley PDF](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf); [MIT Press](https://direct.mit.edu/rest/article/100/1/167/58429/Are-U-S-Cities-Underpoliced-Theory-and-Evidence)
- [US] **Chalfin & McCrary 2018 by crime type** (snippet only; one search summary, so treat with caution):
  - Corrected estimates: murder −0.80, MVT −0.59, robbery −0.46, burglary −0.22.
  - Uncorrected OLS: murder −0.27, MVT −0.19, robbery −0.18.
  - Larceny was not captured.
  - Cost figures: murder ≈ $7M, robbery ≈ $13k, MVT ≈ $6k. Murder is about 60% of expected per-capita crime cost.

  [Berkeley PDF](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf)
- [US] **Mello 2019** (J. Public Econ. 172:174–200; COPS hiring-grant instrument), snippet only:
  - Cost-weighted crime elasticity −1.17.
  - IV elasticities: about **−1.3 violent (−1.36)** and **−0.8 property (−0.84)**.
  - Significant effects on robbery, larceny and auto theft.
  - Each additional officer prevents **1.9 robberies and 5.1 auto thefts** (time unit not captured in the snippet).

  [Princeton PDF](https://www.princeton.edu/~smello/papers/cops.pdf); [EconPapers](https://econpapers.repec.org/RePEc:eee:pubeco:v:172:y:2019:i:c:p:174-200)
- [US] **Chalfin, Hansen, Weisburst & Williams 2022** (AER: Insights 4(2):139–58), snippet only:
  - Each additional officer abates about **0.1 homicides**.
  - Per-capita effects are about **twice as large for Black victims**.
  - Larger forces make more low-level "quality-of-life" arrests, disproportionately of Black Americans.
  - The paper notes literature elasticities "roughly −0.1 to −2", largest for murder, robbery and MVT.
  - The NBER version reports that index-crime arrests change by −0.97 to −1.56 per added officer (context unclear).

  [eScholarship PDF](https://escholarship.org/content/qt3m116366/qt3m116366.pdf); [NBER w28202](https://www.nber.org/system/files/working_papers/w28202/w28202.pdf)
- [US] **Klick & Tabarrok 2005** (J. Law & Econ. 48(1):267–79; DC terror-alert days), snippet only:
  - Daily crime fell about **7%** on high-alert days.
  - District 1 (National Mall) elasticity ≈ **−0.3**.
  - Auto-related crime fell most. One summary gives an auto-theft elasticity of −0.85 (not verified).

  [ResearchGate](https://www.researchgate.net/publication/24101148_Using_Terror_Alert_Levels_to_Estimate_the_Effect_of_Police_on_Crime); [Penn Law chapter](https://www.law.upenn.edu/live/files/11163-policeprisonspdf)
- [UK] **Draca, Machin & Witt 2011** (AER 101(5):2157–81), snippet only: police deployment in central London rose by more than 30% for six weeks after the July 2005 bombings. The crime–police elasticity is ≈ **−0.3**, so 10% more police means about 3% less crime — [AEA](https://www.aeaweb.org/articles?id=10.1257%2Faer.101.5.2157); [Warwick PDF](https://warwick.ac.uk/fac/soc/economics/staff/mdraca/panic_aer_draca.pdf)
- [AR] **Di Tella & Schargrodsky 2004** (AER 94(1):115–133), snippet only: after the July 1994 attack, Jewish institutions in Buenos Aires got 24-hour police protection. **Car thefts fell 75%** on protected blocks relative to controls, with **no evidence of an effect one or two blocks away** — [Brookings PDF](https://www.brookings.edu/wp-content/uploads/2016/06/CSS_policeeffect.pdf); [CEBCP matrix](https://cebcp.org/evidence-based-policing/the-matrix/micro-places/micro-places-di-tella-andschargrodsky-2004/)
- [Intl] **Syntheses from 2015 onward** (snippet only):
  - "Police levels and crime: A systematic review and meta-analysis" (*The Police Journal*): 24 studies, 12 meta-analysed, finding a **small inverse** macro-level association — [SAGE](https://journals.sagepub.com/doi/10.1177/0032258X15612702)
  - A 2023 PLOS ONE location discrete-choice model reports average spatial elasticities of **−0.26 violent, −0.38 property, −0.38 total**, all significant — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0294020)
  - Braga et al. (2024), updated disorder-policing meta-analysis: significant crime reductions that spill over into surrounding areas. One summary cites a 31.1% reduction in property-offence outcomes (not verified) — [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/1745-9133.12667)
- [US] Real police density in 2024: **2.3 sworn officers per 1,000 inhabitants** and 3.4 full-time law-enforcement employees per 1,000. Cities under 10k average 4.5 officers per 1,000; county agencies 2.6 — [FBI Reported Crimes in the Nation 2024 Quick Stats, opened via mirror](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)

### Inferences
- **Default elasticities**, as ε = d ln(true crime) / d ln(police):

  | Crime | Default ε | Range | Basis |
  |---|---|---|---|
  | Theft/larceny | −0.15 | −0.1 to −0.3 | Levitt larceny −0.135; C&M property −0.17 |
  | Burglary | −0.2 | | Levitt IV −0.195, OLS −0.29; C&M −0.22 |
  | Robbery | −0.45 | | Levitt −0.45; C&M −0.46 |
  | MVT | −0.6 | | C&M −0.59; Mello and Klick–Tabarrok higher; Levitt −1.7 is imprecise |
  | Aggregate property | −0.2 to −0.5 | C&M −0.17 (low), Mello −0.8 (high) | |
  | Murder | −0.67 | | C&M |

- **Usable form:** crime_rate = base · (police/police_ref)^ε.
  - +1% police → −0.15% theft.
  - +10% → −1.4% theft (1.1^−0.15 ≈ 0.986).
  - Doubling police → −10% theft, but −34% MVT (2^−0.6 ≈ 0.66).
- **Treat these as validation targets, not hard-coded multipliers.** The simulation's crime should come out of the decision rule (desperation × opportunity × (1 − P_arrest)). The test: add 10% more police dots, run to steady state, and check that TRUE theft falls by about 1–3%.
- **Recorded crime can rise when police increase.** More police means more detection, so RECORDED theft may fall less, or even rise, while true theft falls. This fits Chalfin et al.'s finding that larger forces make more low-level arrests, and it is a good teaching moment for viewers.
- **Use two separate mechanisms:**
  - A macro elasticity, which is small.
  - A micro "guard" effect at the patrolled cell, which is large (−75% on the block) and does not leak 1–2 cells away.
- **The 4% police share is unrealistic.** NetLogo Rebellion's 4% cops is about 17× the real US sworn-officer share (2.3/1,000 = 0.23%). Either use about 0.2–0.5% police, or describe police dots as visible patrol units rather than headcount.

### Gaps
- No 2023–2026 meta-analysis of police-numbers elasticities broken down by crime type was found. The PLOS ONE 2023 model and the Braga 2024 disorder-policing update are the closest.
- Chalfin & McCrary's larceny elasticity and its CI were not retrieved.
- Mello's and Draca et al.'s confidence intervals and by-type numbers were not retrieved.
- A 2024 replication, "Narrow and wide replication of Chalfin and McCrary" (J. Applied Econometrics 39(1):217–224), exists ([IDEAS](https://ideas.repec.org/a/wly/japmet/v39y2024i1p217-224.html), title only). It was not read.

## Q2. Reporting to police: NCVS by crime type (latest year), plus non-US comparisons

### Takeaway
The latest NCVS available as of October 2026 is **2024** (published September 2025). No 2025 NCVS report was found.
- About half of violent victimizations and about 3 in 10 property victimizations were reported to police.
- By type (snippet values): theft ≈ 25%, burglary/trespass ≈ 41%, MVT ≈ 75%, robbery ≈ 73%, aggravated assault ≈ 69%, simple assault ≈ 40%, rape/sexual assault ≈ 24%.

### Cited Findings
- [US] **BJS, *Criminal Victimization, 2024*** (released September 2025), snippet only:
  - "Almost half" of violent victimizations were reported, similar to 2023.
  - 11.2 violent victimizations reported to police per 1,000 persons aged 12+.

  [BJS publication page](https://bjs.ojp.gov/library/publications/criminal-victimization-2024); [cv24.pdf](https://bjs.ojp.gov/document/cv24.pdf)
- [US] **NCVS 2024 by type** (snippet only; one search summary of the 2024 report; **verify against cv24 tables before hard-coding**):
  - Rape/sexual assault 24%; robbery 73%; aggravated assault 69%; simple assault 40%.
  - Property overall about 3 in 10; burglary/trespassing 41%; motor vehicle theft 75%; other theft 25%.

  [BJS Criminal Victimization 2024](https://bjs.ojp.gov/library/publications/criminal-victimization-2024); [NCVS key findings 2024](https://bjs.ojp.gov/document/ncvskeyfindings_2024.pdf)
- [US] *Criminal Victimization, 2023* summary (snippet only): reporting of motor vehicle theft fell **from 81% to 72%** — [cv23 summary](https://bjs.ojp.gov/document/cv23_sum.pdf)
- [US] NCVS method change (snippet only): 2024 combined the legacy and redesigned instruments in a split sample. The survey fully moved to the redesigned NCVS in 2025, adding Police Performance and Community Safety modules — [BJS NCVS page](https://bjs.ojp.gov/data-collection/ncvs)
- [US] BJS has also published *Reporting to Police by Type of Crime and Location of Residence, 2020–2023* (title only, snippet) — [OJP archive](https://www.ojp.gov/archives/pressreleases/2025/bjs-releases-reporting-to-police-by-type-of-crime-and-location-of-residence-2020-2023)
- [CO] Bogotá's 2014 victimization survey (Cámara de Comercio de Bogotá) covered 19 urban districts, with **reporting rates from 13% to 33%** across districts (snippet only, via Akpinar et al. 2021) — [arXiv 2102.00128](https://arxiv.org/abs/2102.00128)
- [UK] CSEW measurement notes (snippet only):
  - "Repeat victimisation" means being a victim of the same type of crime more than once in 12 months.
  - Since 2015, ONS caps high-frequency repeats at the 98th percentile: about 10 incidents for violence, 5 for sexual offences, 5 for robbery, 9 for threats.

  [ONS CSEW QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/methodologies/crimeinenglandandwalesqmi); [ONS blog](https://blog.ons.gov.uk/2019/01/24/continuing-improvements-to-crime-statistics-repeat-victimisation/amp)

### Inferences
- **Base reporting probability** at "average" legitimacy, from NCVS 2024 (snippet): p_report(theft) = 0.25, burglary = 0.41, MVT = 0.75, robbery = 0.73 (use 0.6–0.75 until verified), simple assault = 0.40, aggravated assault = 0.69. Overall property ≈ 0.30; violent ≈ 0.45–0.50.
- **Legitimacy scaling:** p = clamp(p_base · f(L)). The Bogotá spread (13–33%, about 2.5×) is a realistic range for between-district differences in the simulation. MVT reporting stays high (≥72%) even when it falls, so it should respond weakly to legitimacy. (My suggestion: reporting a car theft serves practical needs that do not depend on trust in police; this is not from a cited source.)

### Gaps
- No NCVS 2025 report (due about September 2026) was found in searches.
- The per-type 2024 percentages are snippet only and need checking against the cv24 tables.
- **CSEW (England & Wales) reporting rates by type** were not retrieved. ONS bulletins and appendix tables were blocked and searches returned no figures.
- No other non-US per-type reporting rates were retrieved.

## Q3. Clearance rates: latest FBI figures by type, and caveats from the NIBRS transition

### Takeaway
FBI 2024 (opened): **larceny-theft 17.3%, burglary 15.2%, motor-vehicle theft 9.2%, robbery 30.4%** cleared; all property 15.9%; all violent 43.8%. FBI 2025 data were released on 14 August 2026 (snippet): **violent 47.4%, property 17.4%** cleared. Per-type 2025 values could not be verified.

### Cited Findings
- [US] **FBI, *Reported Crimes in the Nation, 2024*** ("Released Summer 2025"), opened via mirror:
  - Clearance by arrest or exceptional means: **43.8% of violent and 15.9% of property crimes**.
  - Murder 61.4%; aggravated assault 49.1%; rape 27.2%; **robbery 30.4%**.
  - **Burglary 15.2%; larceny-theft 17.3%; MVT 9.2%**; arson 28.1%.

  [FBI 2024 Quick Stats (mirror, opened)](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf); canonical [CDE](https://cde.ucr.cjis.gov/LATEST/resources/reports/Reported%20Crimes%20in%20the%20Nation%20Quick%20Stats.pdf) (blocked)
- [US] **Same FBI 2024 document, volumes and rates** (opened):

  | Category | 2024 estimate | Rate per 100k | Note |
  |---|---|---|---|
  | Property crime | 5,986,400 | 1,760.1 | |
  | Larceny-theft | 4,326,531 | 1,272.1 | 72.3% of property; shoplifting = 29.4% of larcenies |
  | Burglary | 779,542 | | 13.0% of property |
  | MVT | 880,327 | 258.8 | 14.7% of property |
  | Robbery | 205,952 | 60.6 | |
  | Violent crime | 1,221,345 | 359.1 | |

  Arrests: 7,522,824 total, of which 910,654 for property crime; larceny-theft arrests 725,109. Property-crime arrest rate 269.7 per 100k — [FBI 2024 Quick Stats (mirror, opened)](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)
- [US] **FBI 2025 data** (released 14 August 2026), snippet only:
  - **47.4%** of violent crimes cleared (up from 43.8% in 2024); **17.4%** of property crimes cleared.
  - Violent crime −9.3% and property crime −12.4% vs 2024; murder rate 4.1 per 100k.
  - Data from more than 17,000 agencies covering nearly 97% of the population.

  [FBI news story](https://www.fbi.gov/news/stories/violent-crime-falls-at-historic-rate-new-fbi-data-show); [UCR Summary 2025](https://cde.ucr.cjis.gov/LATEST/resources/reports/UCR_Summary_of_Reported_Crimes_in_the_Nation_2025.pdf); [Stateline](https://stateline.org/2026/08/18/violent-crime-in-us-fell-at-record-pace-in-2025/)
- [US] Composition in 2025 (snippet only): larceny-theft 74.5% of property crimes, MVT 12.8%, burglary 12.6% — [UCR Summary 2025](https://cde.ucr.cjis.gov/LATEST/resources/reports/UCR_Summary_of_Reported_Crimes_in_the_Nation_2025.pdf)
- [US] Trend (Jeff Asher, snippet only):
  - Murder clearance rose from 52% (2022) to 58% (2023).
  - Violent clearance rose from under 37% (2022) to 41% (2023), against 45% in 2019.
  - **MVT clearance was 8.2% in 2023, "the lowest clearance rate ever recorded for any crime type."**
  - About 36% of robberies reported in 2025 had been cleared, according to city dashboards. This is preliminary and would be the highest since 1965.

  [Lagniappe Thoughts on the FBI's Annual Report](https://jasher.substack.com/p/lagniappe-thoughts-on-the-fbis-annual); [Robbery Clearance Rates Are Soaring](https://jasher.substack.com/p/robbery-clearance-rates-are-soaring)
- [US] NIBRS caveats (snippet only):
  - Under NIBRS, robbery is classed as a crime against property; under the old Summary Reporting System it was violent.
  - NIBRS-contributing agencies grew by 562 from 2023 to 2024.

  [Jeff Asher, Murder Officially Plunged in 2024](https://jasher.substack.com/p/murder-officially-plunged-in-2024); see also BJS "Effects of NIBRS on Crime Statistics" ([PDF](https://bjs.ojp.gov/content/pub/pdf/encs.pdf), title only)
- [US] **Conflicting figures:** one aggregator reports 2024 clearance as robbery 20.10%, burglary 9.65%, larceny 14.28%, MVT 12.16% (snippet only). These do not agree with the FBI's national figures — [Statista](https://www.statista.com/statistics/194213/crime-clearance-rate-by-type-in-the-us/) / search summary.

### Inferences
- **Which 2024 figures to trust.** The FBI per-type figures match its own aggregate: weighting larceny 17.3%, burglary 15.2% and MVT 9.2% by 2024 shares (72.3/13.0/14.7) gives 15.8%, against the published 15.9%. The aggregator set gives about 13%, so it probably comes from a different universe (NIBRS-only agencies, or incident-based counting). Use the FBI numbers.
- **Larceny cross-check.** Larceny arrests divided by recorded larcenies = 725,109 / 4,326,531 ≈ 0.168, close to the 17.3% clearance rate (clearances are not the same as arrests).
- **Calibration target: probability a TRUE offense ends in a clearance** ≈ NCVS reporting × FBI clearance:
  - theft ≈ 0.25 × 0.173 ≈ **4.3%**
  - burglary ≈ 0.41 × 0.152 ≈ **6.2%**
  - MVT ≈ 0.75 × 0.092 ≈ **6.9%**
  - robbery ≈ 0.73 × 0.304 ≈ **22%** (≈18% if robbery reporting is about 60%)

  These are rough: NCVS covers households, so it excludes commercial theft such as shoplifting (29.4% of UCR larcenies). The simulation's *realised* arrest rate per theft should land at about 3–7%.
- **Epstein's P is too high for property crime.** P = 1 − exp(−2.3·C/A) gives 0.90 at C/A = 1, 0.68 at 0.5 and 0.21 at 0.1 (my computation). Applied to theft it implies far more risk than the 4–7% observed. Two fixes:
  - lower the constant or vision for theft, or
  - multiply by a per-encounter catch probability.

  Keep the Epstein form for *perceived* risk only, if the design wants offenders to overestimate risk.

### Gaps
- FBI 2025 clearances by type (burglary, larceny, MVT, robbery) were not verified. One snippet repeats the 2024 numbers exactly, which looks like a mix-up between years.
- The participation and coverage numbers for the 2021 NIBRS-only year (the low-coverage year) were not retrieved, because all FBI and BJS hosts were blocked.
- No non-US clearance or "outcome" rates were retrieved. England & Wales "Crime outcomes 2024 to 2025" exists ([GOV.UK](https://www.gov.uk/government/statistics/crime-outcomes-in-england-and-wales-2024-to-2025/crime-outcomes-in-england-and-wales-2024-to-2025), title only).

## Q4. Crime concentration (law of crime concentration) and repeat victimization

### Takeaway
Across cities, about 50% of crime falls on 2–6% of street segments and 25% on 0.4–1.6%. On average, about 5% of places produce about 50% of crime. Victimization is concentrated too: counting everyone at risk, 5% of possible targets suffer about 60% of victimizations.

### Cited Findings
- [Intl] **Weisburd (2015, *Criminology*) "law of crime concentration"** (snippet only): there is a tight bandwidth.
  - 50% of crime falls on about 2% to 6% of street segments (bandwidth about 4%).
  - 25% of crime falls on 0.4% to 1.6% of segments.

  [ResearchGate: Weisburd 2015](https://www.researchgate.net/publication/276150162_The_law_of_crime_concentration_and_the_criminology_of_place); [Gill et al. (CEBCP PDF)](https://cebcp.org/wp-content/halloffame/Gill-etal-Testing-Concentration-Crime.pdf)
- [US/IL] **City examples** (snippet only):

  | City | Segments with 50% of crime | Segments with 25% of crime |
  |---|---|---|
  | Seattle | 5.1% | 1.6% |
  | Brooklyn Park, MN (suburb) | 2% | 0.4% |
  | Tel Aviv | 4.5% | 0.9% |

  [Gill et al. "Testing the Law of Crime Concentration at Place"](https://cebcp.org/wp-content/halloffame/Gill-etal-Testing-Concentration-Crime.pdf); [JQC editors' introduction](https://link.springer.com/article/10.1007/s10940-017-9342-0)
- [Intl] **Lee, Eck, O & Martinez 2017** (*Crime Science*; systematic review of 1970–2015 studies), snippet only: crime is concentrated "regardless of how crime is measured, the geographic unit … or type of crime". On average, about 5% of streets produce about 50% of general crime — [USF repository](https://digitalcommons.usf.edu/cjp_facpub_sm/52/)
- [Intl] **O, Martinez, Lee & Eck 2017**, "How concentrated is crime among victims?" (*Crime Science*; 1977–2014), snippet only:
  - Including all possible victims, **5% of subjects experience 60% of victimizations**.
  - Among victims only, the top 5% have 12% (this second figure looks low; verify).

  [Crime Science](https://crimesciencejournal.biomedcentral.com/articles/10.1186/s40163-017-0071-3)
- [Intl] A metric caution paper exists: "Is crime concentrated or are we simply using the wrong metrics?" (title only) — [arXiv 1902.03105](https://arxiv.org/pdf/1902.03105)

### Inferences
- **Validation tests on TRUE crime per cell:**
  - Over a long window, the smallest share of cells containing 50% of crimes should be about 2–6%.
  - The smallest share containing 25% should be about 0.4–1.6%.
  - Run the same test on RECORDED crime. Predictive policing should make recorded crime *more* concentrated than true crime, which is a visible symptom of the feedback loop.
- **Avoid a sparse-count artefact.** Compute concentration over windows where crimes are not far fewer than cells. When crimes are fewer than places, raw concentration is inflated mechanically (the point of the metrics-caution paper).
- **Repeat victimization target:** among all dots and cells at risk, the top 5% should take roughly 50–60% of victimizations.

### Gaps
- No CSEW or NCVS figure for the share of incidents suffered by repeat victims was retrieved (ONS and BJS were blocked).
- The "top 5% of victims = 12%" figure is unverified.
- Near-repeat parameters are already in the plan and were not re-researched.

## Q5. Journey to crime: distances by crime type, distance-decay shape, buffer zone

### Takeaway
Most offenders travel short distances. In British data, typical trips are 1–2 miles and about half are under a mile. In a sprawling US city (Dallas), median residence-to-crime distances are much longer: about 4–6 miles. Burglary has the shortest trips and theft/shoplifting the longest. Distance decay is well fitted by a negative exponential. The buffer zone is contested: its main systematic review was **retracted** in 2021.

### Cited Findings
- [UK] **Wiles & Costello 2000** (Home Office Research Study 207), snippet only: offenders generally offend within 1–2 miles of home and about half of journeys are under 1 mile. Shoplifters travel further — [POP Center "Step 16: Study the journey to crime"](https://popcenter.asu.edu/content/step-16-study-journey-crime)
- [US] **Ackerman & Rossmo 2015** (J. Quant. Criminol. 31:237–262; Dallas police data, 5 years, 10 offence types), snippet only:
  - **Median residence-to-crime distance: violent 4.2 miles, property 5.7 miles.**
  - Residential burglary had the shortest median of all categories; theft had the longest.
  - Individual and neighbourhood factors explained little of the variation.

  [Springer](https://link.springer.com/article/10.1007/s10940-014-9232-7); [Texas State repository](https://digital.library.txst.edu/items/7133c59e-13e1-4b45-acc9-a91e057daee6)
- [Intl] **Townsley & Sidebottom 2010** (*Criminology* 48(3):897–917), snippet only:
  - For burglary, about **half of the variation** in home-to-crime distance lies between offenders.
  - Once nesting (repeat trips by the same offender) is controlled, only a few prolific offenders show distance decay.
  - A median of 1.8 km appears in a summary of this literature; the sample is unclear.

  [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-9125.2010.00205.x); [OJP abstract](https://www.ojp.gov/ncjrs/virtual-library/abstracts/all-offenders-are-equal-some-are-more-equal-others-variation)
- [Intl] **Shape of the distribution** (snippet only):
  - Distance decay plus a buffer zone gives a cross-section "like a volcano with a caldera".
  - A linear rise in opportunities with distance, combined with a nonlinear fall in willingness to travel, produces the buffer.
  - Journey-to-crime distributions fit a negative exponential or truncated negative exponential. **Burglary and auto theft are best represented by negative exponential functions.**

  [CrimRxiv: The Journey-to-Crime Buffer Zone](https://www.crimrxiv.com/pub/udrmepzn); [Cityscape: Modeling Criminal Distance Decay](https://www.huduser.gov/periodicals/cityscpe/vol13num3/Cityscape_Nov2011_Modelling_Criminal.pdf)
- [Intl] **Buffer-zone evidence retracted** (snippet only): Bernasco & van Dijke (2020), "Do offenders avoid offending near home? A systematic review of the buffer zone hypothesis" (*Crime Science* 9:8), was **retracted in April 2021** with both authors agreeing. The issue was an ecological fallacy: pooling unstandardised trip distances from different offenders hides the buffer zone. Kim Rossmo identified it.

  [Springer retraction note](https://link.springer.com/article/10.1186/s40163-021-00143-y); [Retraction Watch](https://retractionwatch.com/2021/05/06/rejection-overruled-retraction-ensues-when-annoyed-reviewer-does-deep-dive-into-data)
- [NL] Block & Bernasco (2009) applied Bayesian journey-to-crime estimation to **62 serial burglars in The Hague** (snippet only) — [CrimRxiv buffer-zone paper](https://www.crimrxiv.com/pub/udrmepzn/download/pdf)

### Inferences
- **Target choice:** P(offend at distance d from home) ∝ exp(−d/λ) × (cell opportunity, e.g. the attractiveness field).
  - For a European-scale city, set λ so the burglary median ≈ 1–2 km (about half of trips under 1 mile).
  - Make λ larger for theft/shoplifting, and larger again for a US-sprawl setting (medians 4–6 miles).
  - Under a negative exponential, median = λ·ln2. So λ ≈ 1.4–2.9 km gives a 1–2 km median.
- **Buffer zone:** optional and weak, because the systematic evidence was retracted. If used, multiply by (1 − exp(−d/b)) with b small, a few hundred metres. No reliable estimate of b was found.
- **Offenders differ:** draw λ per offender (heterogeneous), since about half of the variance lies between offenders.
- **Watch the 2-D effect.** If exp(−d/λ) weights each *cell*, the number of cells at distance d grows roughly in proportion to d. The realised trip-length distribution is then about d·exp(−d/λ), a Gamma with shape 2, whose median ≈ 1.68·λ (my computation). So for a 1–2 km median, use λ ≈ 0.6–1.2 km. This shape is also zero at d = 0, which gives a natural 'caldera' without a separate buffer term.

### Gaps
- No pooled median distances by crime type (theft, burglary, robbery, MVT) from one consistent multi-city source were retrieved.
- Bernasco's distance coefficients from discrete-choice models (for example, Bernasco & Nieuwbeerta 2005, The Hague) were not retrieved before the search budget ran out.
- No numeric buffer-zone radius was found.

## Q6. Displacement vs diffusion of benefits

### Takeaway
Spatial displacement is the exception, not the rule. In situational crime prevention it appeared in about 26% of observations, against 27% showing diffusion of benefits. For geographically focused policing, diffusion (37%) outnumbered displacement (23%). Where displacement occurs, it is usually smaller than the reduction achieved.

### Cited Findings
- [Intl] **Guerette & Bowers 2009** (*Criminology* 47(4)), snippet only: 102 studies, **574 observations**. Displacement in **26%**, diffusion of benefits in **27%** — [ResearchGate](https://www.researchgate.net/publication/229732660_Assessing_the_extent_of_crime_displacement_and_diffusion_of_benefits_A_review_of_situational_crime_prevention_evaluations); [OJP abstract](https://ojp.gov/ncjrs/virtual-library/abstracts/assessing-extent-crime-displacement-and-diffusion-benefits-review)
- [Intl] **Bowers, Johnson, Guerette, Summers & Poynton 2011** (Campbell review, also in J. Exp. Criminol.), snippet only:
  - 44 studies in the narrative review; 16 had enough data for meta-analysis.
  - **37% of observations showed spatial diffusion and 23% displacement.**
  - One summary reports a non-significant mean displacement effect size of 1.069 and a significant catchment (diffusion) effect of 1.14 (attribution not verified).

  [Wiley Campbell review](https://onlinelibrary.wiley.com/doi/full/10.4073/csr.2011.3); [3ie gap map entry](https://gapmaps.3ieimpact.org/bowers-et-al-2011-spatial-displacement-and-diffusion-benefits-0)
- [US] **Weisburd et al. 2006**, "Does crime just move around the corner?" (*Criminology* 44(3):549–592), snippet only:
  - Jersey City; two target sites (drug and prostitution markets) and two adjacent catchment areas; more than **6,000 20-minute social observations**.
  - Intensive policing did **not** displace offending to nearby sites. Benefits **diffused** to the catchment areas.
  - Arrestee interviews showed some offenders adapted their methods within the target areas, which made offending harder.

  [OJP abstract](https://www.ojp.gov/ncjrs/virtual-library/abstracts/does-crime-just-move-around-corner-controlled-study-spatial)
- [AR] Di Tella & Schargrodsky 2004: no detectable effect on car theft one or two blocks from guarded buildings (snippet only) — [Brookings PDF](https://www.brookings.edu/wp-content/uploads/2016/06/CSS_policeeffect.pdf)
- [Intl] Braga et al. (2024), disorder policing: crime-reduction effects "spill over into surrounding areas" (snippet only) — [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/1745-9133.12667)

### Inferences
- **Simulation rule** when a patrol suppresses crime at a cell:
  - With probability about 0.25, a deterred would-be offender relocates to a nearby cell (displacement).
  - Otherwise the offence is abandoned.
  - Separately, neighbouring cells (1–2 cells away) get a small risk reduction about as often (diffusion).
  - The default net effect on neighbours should be about zero to slightly negative.
- **Validation:** after a hot-spot intervention, the catchment ring's change in TRUE crime should not exceed the target's reduction. A weighted displacement quotient near 0 or positive (meaning diffusion) is the realistic result.

### Gaps
- Braga 2019's specific displacement and diffusion statistics were not retrieved.
- No per-crime-type displacement magnitudes (for example, for theft) were found.

## Q7. Verifying Short et al. (2008), "A statistical model of criminal behavior" (M3AS 18 Suppl:1249–1267)

### Takeaway
**The primary PDF could not be opened** (www.math.ucla.edu and arXiv are blocked), so this check rests on search snippets and a third-party implementation.
- **The plan's spatial term is correct.** (1 − η)·B + η·mean4(B) is algebraically identical to the paper's B + (ηℓ²/z)·ΔB with z = 4.
- **The decay term is wrong unless one tick equals one time unit.** The paper multiplies by (1 − ω·δt), not (1 − ω).
- **The other rules match:** A = A0 + B, burglary probability p = 1 − exp(−A·δt), movement in proportion to neighbours' attractiveness A, removal after a burglary, and generation at rate Γ per site.
- Γ = 0.019 with θ = 0.56 and η = 0.03 (Fig. 3c) is supported by snippets. ω = 1/15 is supported only indirectly: later papers in this line use it, and the third-party code uses 0.06. **A0 = 1/30 could not be confirmed.**

### Cited Findings
- **Paper identity:** Short, D'Orsogna, Pasour, Tita, Brantingham, Bertozzi & Chayes, *M3AS* Vol. 18 Suppl. (2008) 1249–1267 — [GitHub jjapp/shortBurglary README, opened](https://github.com/jjapp/shortBurglary); [World Scientific DOI page](https://www.worldscientific.com/doi/10.1142/S0218202508003029) (blocked)
- **Attractiveness:** A = B_s + A_0, a static baseline plus a dynamic part. The README states the update as:

  B(t+δt) = (B_s(t) + (μ l²/z)·ΔB_s(t))·(1 − ω δt) + θ·E_s(t)

  Here Δ is the discrete Laplacian, z is the number of neighbouring houses (4), and μ is the implementer's name for η. The code computes exactly:

  `(B + (μ/4)·(ΣB_neighbors − 4B))·(1 − ω·δ) + θ·crime_events`

  [jjapp/shortBurglary README.rst and agent.py, opened](https://github.com/jjapp/shortBurglary) (third-party code, not the authors')
- **Base update without neighbour effects** is B_s(t+δt) = B_s(t)(1 − ωδt) + θE_s(t). The "coordination number z … (four for the square lattice)"; η is between 0 and 1 and controls neighbourhood effects (snippet only, from search excerpts of the paper and later restatements) — [ResearchGate: Short et al. 2008](https://www.researchgate.net/publication/242451455_A_Statistical_Model_of_Criminal_Behavior); [Lévy-flight restatement (SIAM)](https://www.mathstat.dal.ca/~tkolokol/papers/levycrime.pdf)
- **Burglary event:** p_s(t) = 1 − exp(−A_s(t)·δt). The implementation uses `1 - exp(-att_t*delta)` ([agent.py, opened](https://github.com/jjapp/shortBurglary)). One snippet writes p_s(t) = 1 − exp[−A_s(t)], which corresponds to δt absorbed or set to 1 — [arXiv 2605.17709 / 1411.1743 search excerpts](https://arxiv.org/pdf/1411.1743)
- **Movement and the burglar life cycle** (snippet only; the implementation does the same):
  - A burglar moves from s to neighbour r with q_{s→r} = A_r(t) / Σ_{s'∼s} A_{s'}(t).
  - A burglar who burgles is **removed** ("to represent the tendency of burglars to flee").
  - New burglars are **generated at rate Γ, uniformly on the lattice**.
  - The implementation creates a new burglar at each site each step with probability 1 − exp(−Γδt).

  [Lévy-flight paper (cam18-25)](https://ww3.math.ucla.edu/camreport/cam18-25.pdf); [jjapp model.py, opened](https://github.com/jjapp/shortBurglary)
- **Parameters and regimes** (snippet only):
  - "Γ = 0.019, θ = 0.56, and η = 0.03 were used together … in Figure 3(c)."
  - The lattice is rectangular with constant spacing and periodic boundary conditions.
  - With few burglars, hotspots are dynamic; with more burglars, there are either no significant hotspots or stationary ones.

  [ResearchGate: Short et al. 2008](https://www.researchgate.net/publication/242451455_A_STATISTICAL_MODEL_OF_CRIMINAL_BEHAVIOR); [Adding police to a mathematical model of burglary](https://www.researchgate.net/publication/243031455_Adding_police_to_a_mathematical_model_of_burglary)
- **ω = 1/15 in later work** (snippet only): a 2026 arXiv paper ("Crime hotspot dynamics in residential burglary models with police response") sets ω = 1/15.
  - With Γ = 0.019 and θ = 0.2339, Γθ/ω² ≈ 1. With Γ = 0.0285, θ = 0.2339, Σ = 0, Γθ(1 − Σ)/ω² ≈ 1.5. I checked the arithmetic: 0.9999 and 1.4999.
  - That model adds Σ, the probability that a burglary leads to arrest. Burglars are generated at (1 − Σ)·Γ·e^{−β m_s/h²}, where m_s is police presence.

  [arXiv 2605.17709](https://arxiv.org/pdf/2605.17709); [arXiv HTML](https://arxiv.org/html/2605.17709)
- **Third-party implementation settings** (opened; these are the implementer's choices, not verified as the paper's): 128 × 128 torus, δt = 0.01, ω = 0.06 (≈1/15), θ = 5.6, η = 0.1, Γ = 0.019, ℓ = 1, A0 = 0.2 (hard-coded) — [jjapp main.py / model.py](https://github.com/jjapp/shortBurglary)

### Inferences
- **Verdict on the plan's update.** The plan's

  `B[c] = ((1 − η)·B[c] + η·mean4(B,c))·(1 − ω) + θ·crimes[c]`

  matches the paper's structure. Proof: (ηℓ²/z)·ΔB_s = (η/z)(ΣB_nbr − zB_s) = η(mean_z B − B_s), so B_s + η(mean − B_s) = (1 − η)B_s + η·mean.

  It is exactly right **only if δt = 1** (one tick = one model time unit). The paper-faithful form is:

  `B[c] ← ((1 − η)·B[c] + η·mean4(B,c))·(1 − ω·δt) + θ·E[c]`

  together with:
  - A[c] = A0 + B[c]
  - p_burgle = 1 − exp(−A[c]·δt)
  - move to neighbour n with probability A[n]/Σ_nbrs A
  - remove an offender after a burglary
  - spawn new offenders at each cell with probability Γ·δt (or 1 − e^{−Γδt}) per step

  η is **not** multiplied by δt; it is a per-step mixing fraction.
- **Choose one time convention and convert consistently:**
  - (a) Keep the paper's δt = 0.01 with paper values: per-step decay 1/1500 and base burglary probability per step ≈ A·0.01.
  - (b) Use δt = 1 per tick and rescale: ω_tick = ω, Γ_tick = Γ, p = 1 − e^{−A}. At the homogeneous state this gives p ≈ 0.18 per tick for Fig. 3(c)-type values. That is coarse but internally consistent.

  Mixing ω = 1/15 per tick with Γ, θ or p calibrated for δt = 0.01 makes attractiveness decay 100× too fast relative to crime events.
- **Equilibrium values for a unit test** (my derivation, not cited). Uniform B makes the η term vanish. Per site per unit time, burglaries = Γ (generation balances removal), so:
  - B̄ = θΓ/ω
  - n̄ (burglars per site) = Γδt / (1 − e^{−Āδt}) ≈ Γ/Ā

  For Γ = 0.019, θ = 0.56, ω = 1/15, and A0 = 1/30 (unverified):
  - B̄ ≈ 0.160, Ā ≈ 0.193, n̄ ≈ 0.099 burglars per site, about 1,615 burglars on a 128² lattice.

  For Γ = 0.002 with θ = 5.6 (a set I remember, not verified): B̄ ≈ 0.168 and n̄ ≈ 0.010, about 163 burglars. This fits the snippet: few burglars → dynamic hotspots; many → none or stationary.
- **Generalising to all dots.** If any dot can offend (not only dedicated burglars), keep θ per event. Calibrate so expected events per cell per step are similar in size to Γδt, or B̄ = θ·(event rate)/ω will sit far from A0.

### Gaps
- **Primary PDF not opened** (www.math.ucla.edu, ww3.math.ucla.edu and arxiv.org all blocked). Not confirmed from the paper:
  - δt = 0.01 and ℓ = 1 (used by the implementation);
  - A0 = 1/30 (the implementation uses 0.2);
  - the 128×128 lattice;
  - the other Fig. 3 sets (η = 0.2; θ = 5.6 with Γ = 0.002);
  - whether new-burglar generation is Γδt or 1 − e^{−Γδt} per site per step.

  A direct read of Short et al. 2008 Section 2 and the Fig. 3 caption, or of D'Orsogna & Perc (2015) "Statistical physics of crime: a review" (arXiv 1411.1743), is still needed.

## Q8. Feedback in recorded crime data: Lum & Isaac (2016) and empirical studies 2020–2026

### Takeaway
Training hotspot algorithms on arrest or report data reproduces where police already look, not where crime happens:
- Oakland drug arrests: a PredPol-type model targeted Black residents about 2× as often as white residents, although estimated drug use was similar.
- Differences in victim reporting (13–33% by district in Bogotá) shift predicted hotspots towards high-reporting areas.
- Audits of deployed PredPol/Geolitica found targeting skewed to Black, Latino and low-income areas, and under 0.5% predictive "hits" in one city.

### Cited Findings
- [US] **Lum & Isaac 2016** ("To predict and serve?", *Significance* 13(5)), snippet only:
  - Compared Oakland's 2010 drug arrests with public-health (NSDUH-based) estimates of drug use by grid cell.
  - Arrests concentrated around West Oakland and International Boulevard, with about **200× more** drug arrests than elsewhere. Estimated use was **roughly uniform**, varying mainly with population density.
  - Applied to every day of 2011, the PredPol-type algorithm targeted Black people at **roughly twice** the rate of white people.
  - An "add 20%" scenario simulated extra crimes being observed in targeted locations, as the feedback mechanism.

  [Wiley](https://rss.onlinelibrary.wiley.com/doi/full/10.1111/j.1740-9713.2016.00960.x); [AMS feature column](https://mathvoices.ams.org/featurecolumn/2020/07/01/fc-2020-07/); [Oakland North](https://oaklandnorth.net/2016/11/07/critics-say-a-predictive-policing-system-could-further-racial-bias-in-oakland/)
- [CO] **Akpinar, De-Arteaga & Chouldechova 2021** (FAccT), snippet only: a simulation patterned on Bogotá's district-level victimization and reporting survey (19 districts, reporting 13–33%). Differences in reporting **displace predicted hotspots** from high-crime, low-reporting areas to high- or medium-crime, high-reporting areas, producing both over- and under-policing — [arXiv 2102.00128](https://arxiv.org/abs/2102.00128)
- [US] **The Markup / Gizmodo 2021** (snippet only):
  - More than **5.9 million** PredPol predictions found on an unsecured server.
  - Targeted neighbourhoods were more likely to be Black, Latino and eligible for free or reduced-price lunch.
  - Whiter, wealthier areas often went years without a prediction.

  [The Markup](https://themarkup.org/prediction-bias/2021/12/02/crime-prediction-software-promised-to-be-free-of-biases-new-data-shows-it-perpetuates-them); [methodology](https://themarkup.org/show-your-work/2021/12/02/how-we-determined-crime-prediction-software-disproportionately-targeted-low-income-black-and-latino-neighborhoods)
- [US] **The Markup 2023** (snippet only): in Plainfield, NJ, **23,631** Geolitica predictions (25 Feb – 18 Dec 2018) yielded **fewer than 100** matches with a later-reported crime of the predicted type, a success rate **under 0.5%** — [The Markup](https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes); [methodology](https://themarkup.org/show-your-work/2023/10/02/how-we-assessed-the-accuracy-of-predictive-policing-software)
- [US] Related work, titles only (snippet only; findings not captured):
  - Brantingham, Valasik & Mohler 2018, "Does Predictive Policing Lead to Biased Arrests? Results From a Randomized Controlled Trial" — [T&F](https://www.tandfonline.com/doi/full/10.1080/2330443X.2018.1438940)
  - "A Comparative Simulation Study of the Fairness and Accuracy of Predictive Policing Systems in Baltimore City" (2026) — [arXiv 2602.02566](https://arxiv.org/pdf/2602.02566)
  - "Modelling underreported spatio-temporal crime events" (PLOS ONE 2023) — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0287776)

### Inferences
- **A built-in demonstration.** Give two districts equal TRUE crime but reporting rates of 0.13 and 0.33 (the Bogotá range). A predictor trained on RECORDED crime should initially send about 2.5× more patrol to the high-reporting district. Patrol-driven detection then compounds this, in the spirit of Ensign et al.
- **Metrics to show viewers:**
  - recorded/true ratio by district;
  - concentration of recorded vs true crime;
  - "hit rate" of predictions against TRUE crime, with The Markup's under 0.5% as a real-world reference point.

### Gaps
- Lum & Isaac's exact figures (for example, the multiplier for other non-white groups) could not be retrieved; the Wiley and OUP pages were blocked.
- Results of the Brantingham et al. 2018 RCT and the 2026 Baltimore simulation were not captured.

## Q9. Reviews of agent-based crime models: parameters and validation targets

### Takeaway
The main review, Groff, Johnson & Thornton (2019), covered **45 publications**. Opportunity-theory models dominate. Most papers did not give enough detail to replicate them or explain how parameters were chosen and calibrated. Well-regarded models validate against stylized facts: spatial concentration, repeat victimization, and the journey-to-crime decay curve.

### Cited Findings
- [Intl] **Groff, Johnson & Thornton 2019** (J. Quant. Criminol. 35(1):155–193), snippet only:
  - 45 publications reviewed; opportunity-theory models dominated.
  - "Most publications lacked detail sufficient to enable replication and many did not include clear rationale for modeling choices, parameter selection or calibration."

  [UCL Discovery PDF](https://discovery.ucl.ac.uk/id/eprint/10051936/1/Johnson_State%20of%20the%20Art%20in%20Agent-Based%20Modeling%20of%20Urban%20Crime.%20An%20Overview_VoR.pdf)
- [Intl] **Birks, Townsley & Stewart 2012** ("Generative explanations of crime", *Criminology* 50:221–254), snippet only: simulated residential burglary was validated against **spatial concentration of crime, repeat victimization, and the journey-to-crime curve**. Routine-activity, rational-choice and crime-pattern mechanisms generated all three — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-9125.2011.00258.x)
- [UK] **Malleson, Heppenstall & See 2010** (*Computers, Environment and Urban Systems* 34(3):236–250), snippet only:
  - Residential burglary in Leeds, using the **PECS** framework (Physical conditions, Emotional state, Cognitive capabilities, Social status).
  - Agents' needs and motives drive offending, set in real environmental data.
  - Reproduces patterns consistent with offending theory.
  - Follow-ups: Malleson et al. 2012 (*Simulation*) and a 2013 urban-regeneration burglary-risk paper.

  [White Rose](https://eprints.whiterose.ac.uk/76813/); [SAGE 2012](https://journals.sagepub.com/doi/10.1177/0037549710384124); [EPB 2013 PDF](http://www.nickmalleson.co.uk/wp-content/uploads/2013/05/EPB-V6-forBlog.pdf)
- [Intl] **Short-type model with police (2026)**, snippet only: arrest probability Σ, and burglar generation (1 − Σ)·Γ·e^{−β m_s/h²} that falls with police presence m_s; ω = 1/15 — [arXiv 2605.17709](https://arxiv.org/pdf/2605.17709)
- [Intl] Other leads (titles only, snippet):
  - "Agent-Based Modeling in Criminology", *Annual Review of Criminology* — [Annual Reviews](https://www.annualreviews.org/content/journals/10.1146/annurev-criminol-022222-033905)
  - "Agent-Based Simulation of Police Funding Tradeoffs Through the Lens of Legitimacy and Hardship", *JASSS* 26(3):12 (2023), relevant to legitimacy-scaled reporting — [JASSS](https://www.jasss.org/26/3/12.html)
  - A 2021 data-driven ABM paper by Malleson's group — [PDF](https://www.nickmalleson.co.uk/papers/2021-Raquel-CEUS.pdf)

### Inferences
- **Validation checklist** for the dot society, each target with its source above:
  1. Crime concentration: 50% of crime in 2–6% of cells; 25% in 0.4–1.6%.
  2. Repeat victimization: top 5% of targets take about 50–60% of incidents.
  3. Journey-to-crime: negative-exponential decay; burglary median about 1–2 km at European scale.
  4. City-wide police elasticity: theft about −0.15; property about −0.2 to −0.5.
  5. Reporting by type: NCVS 2024.
  6. Clearance by type: FBI 2024.
  7. Displacement in about 25% of interventions, with diffusion at least as likely.
  8. Hot-spot policing succeeds in about 80% of tests (Braga 62/78, already in the plan).
  9. Koper-curve dwell response.
- **Answer Groff et al.'s critique** by shipping a parameter table with a source and rationale for every value.

### Gaps
- Malleson's exact numeric parameters and validation statistics (for example, fit to Leeds burglary counts) were not retrieved.
- The *Annual Review of Criminology* review's findings were not retrieved; the search budget was exhausted.

## Q10. Re-verifying plan figures, plus the source-access log

### Takeaway
Braga's 62 of 78 and the BJS recidivism figures are confirmed (82% within 10 years; 43% arrested in year 1; 22% in year 10). Three plan figures need small corrections:
- **Chalfin & McCrary:** every snippet says **−0.67 ± 0.47**, not ± 0.48.
- **Koper's "16% vs 4%":** some secondary sources give **15%** (drive-through) vs 4% (stops of 10–16 min).
- **Raphael & Winter-Ebmer's "2.8–5%":** could **not** be confirmed. Summaries give 1–5% per percentage point across specifications, with IV 3–4× OLS.

### Cited Findings
- [US] **Koper 1995** (*Justice Quarterly*; Minneapolis Hot Spots data, 100 hot spots, Dec 1988 – Nov 1989, about 17,000 observations), snippet only:
  - Each additional minute of presence increased survival time (to the next disorder after departure) by **23%**.
  - The optimum was **14–15 minutes**, with diminishing returns after about 15.
  - Probability of crime or disorder within 30 minutes of departure: **15%** after a drive-through vs **4%** after stops of **10–16 minutes** (one source). Another source says the drop was "from 16%" to 4%.

  [OJP abstract](https://www.ojp.gov/ncjrs/virtual-library/abstracts/just-enough-police-presence-reducing-crime-and-disorderly-behavior); [ILSED PDF](https://www.ilsed.org/wp-content/uploads/2024/10/JustenoughpolicepresenceReducingcrimeanddisorderlybehaviorbyoptimizingpatroltimeincrimehotspots-2.pdf); [SoundThinking summary](https://www.soundthinking.com/blog/optimizing-patrol-time-in-crime-hot-spots/)
- [Intl] **Braga, Turchan, Papachristos & Hureau 2019** (Campbell Systematic Reviews), snippet only: **65 studies containing 78 tests; 62 of 78 tests** reported noteworthy reductions in crime and disorder, with a small, statistically significant mean effect — [Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/cl2.1046); [NIJ](https://nij.ojp.gov/library/publications/hot-spots-policing-and-crime-reduction-update-ongoing-systematic-review-and)
- [US] **BJS, *Recidivism of Prisoners Released in 24 States in 2008: A 10-Year Follow-Up (2008–2018)*** (Antenangeli & Durose, September 2021), snippet only:
  - **82%** arrested within 10 years; 66% within 3 years.
  - The **annual** arrest percentage fell from **43% in year 1 to 22% in year 10**.
  - 61% returned to prison within 10 years.

  [BJS](https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018); [summary PDF](https://bjs.ojp.gov/sites/bjs/files/media/document/rpr24s0810yfup0818_sum.pdf)
- [US] **Raphael & Winter-Ebmer 2001** (J. Law & Econ. 44(1); state data 1971–1997; instruments: defense contracts and oil-shock exposure), snippet only:
  - Significant positive effects of unemployment on property crime.
  - "Across different specifications … a 1 percentage point increase in unemployment could lead to a 1 percent to 5 percent increase" in property crime.
  - IV effects are 3–4× OLS. Nearly 40% of the 1990s decline in property crime is attributed to falling unemployment.

  [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=242571); [eScholarship PDF](https://escholarship.org/content/qt5hb4h56g/qt5hb4h56g.pdf); [JSTOR](https://www.jstor.org/stable/10.1086/320275)
- [US] **Cross-check from Levitt 2002 Table 3** (opened): with unemployment measured as a fraction (mean 0.068), the coefficient on ln(property crime) is **1.023** (FE-OLS) and **1.231** (IV). So +1 pp unemployment ≈ **+1.0–1.2%** property crime in that city panel. Levitt notes unemployment is "strongly positively related to property crime, but the opposite is true for violent crime (e.g., … Raphael and Winter-Ebmer, 2001)" — [Levitt 2002, opened](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf)
- [US] **Chalfin & McCrary 2018**: "Our best guess regarding the elasticity for murder is **−0.67 ± 0.47**", repeated across several snippets — [Berkeley PDF](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf)

### Inferences
- **Recidivism.** The "22% in year 10" is the share of the whole released cohort arrested during year 10, not a conditional hazard. For a per-tick re-offence hazard among released dots, fit to cumulative arrest: 43% by year 1, 66% by year 3, 82% by year 10. A decreasing hazard (for example, Weibull with shape < 1) fits this.
- **Unemployment.** Use +1 pp → +1% to +3% property crime as a central range. Treat "2.8–5%" as an upper, IV-based bound until it is checked against the paper.
- **Koper.** Use 15–16% vs 4% (30-minute post-departure risk) as the target. The difference is immaterial for calibration.

### Gaps
- **Source-access log.**
  - **Opened (3):**
    - FBI *Reported Crimes in the Nation, 2024* Quick Stats, via an S3 mirror;
    - Levitt (2002) AER reply, via the GitHub repo ryansafner/metricsF22;
    - the jjapp/shortBurglary GitHub code and README.
  - **Everything else: snippet only.** That includes every NCVS, CSEW, Koper, Braga, BJS-recidivism, Raphael & Winter-Ebmer, Chalfin & McCrary, Mello, Draca, Di Tella, Klick & Tabarrok, Weisburd, Guerette & Bowers, Bowers, Lum & Isaac, Markup, Akpinar, Groff, Malleson and Birks item.
- **Unreachable hosts.** Each returned proxy CONNECT 403 / EGRESS_BLOCKED via curl and/or WebFetch.
  - Paper and government hosts: www.math.ucla.edu, ww3.math.ucla.edu, www.stat.ucla.edu, arxiv.org, bjs.ojp.gov, www.ojp.gov, nij.ojp.gov, crimesolutions.ojp.gov, cde.ucr.cjis.gov, www.fbi.gov, ucr.fbi.gov, www.ons.gov.uk, www.gov.uk, assets.publishing.service.gov.uk, doc.ukdataservice.ac.uk.
  - Publishers: onlinelibrary.wiley.com, link.springer.com, crimesciencejournal.biomedcentral.com, journals.sagepub.com, www.sciencedirect.com, www.tandfonline.com, academic.oup.com, www.jstor.org, www.journals.uchicago.edu, direct.mit.edu, www.aeaweb.org, epubs.siam.org, www.pnas.org, journals.plos.org, www.nature.com.
  - Working-paper, preprint and repository hosts: www.nber.org, papers.ssrn.com, ideas.repec.org, escholarship.org, pmc.ncbi.nlm.nih.gov, www.researchgate.net, www.semanticscholar.org, core.ac.uk, web.archive.org, www.crimrxiv.com, osf.io, par.nsf.gov, eprints.whiterose.ac.uk, discovery.ucl.ac.uk.
  - University and personal sites: eml.berkeley.edu, www.princeton.edu, warwick.ac.uk, cep.lse.ac.uk, law.stanford.edu, crim.sas.upenn.edu, www.law.upenn.edu, mshort9.math.gatech.edu, www.mathstat.dal.ca, personal.math.ubc.ca, www.nickmalleson.co.uk, *.github.io.
  - Policy, evidence and data sites: www.campbellcollaboration.org, cebcp.org, www.policinginstitute.org, popcenter.asu.edu, www.jasss.org, www.comses.net, www.icpsr.umich.edu, www.rand.org, www.pewresearch.org, counciloncj.org.
  - News, blogs and aggregators: jasher.substack.com, www.statista.com, en.wikipedia.org.
  - Only github.com (git clone of public repos), raw.githubusercontent.com, pypi.org, registry.npmjs.org and some *.s3.amazonaws.com bucket hosts were reachable.
- **Search budget.** The session's 200-call WebSearch budget ran out, so the remaining open items were not searched further:
  - NCVS per-type table check;
  - CSEW reporting rates;
  - a 2025 FBI per-type clearance check;
  - Bernasco distance coefficients;
  - Malleson parameters.
