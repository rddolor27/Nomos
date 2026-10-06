# Culture transmission and dynamics

Round 8, question 1: how cultures pass between generations, spread, mix and change with migration, and how Nomos should model that deterministically and cheaply. Researcher notes, written 6 October 2026.

Labels: "opened" means the source was read in full; "search summary" means it was seen only in a search result; "measured here" and "computed" mean this researcher produced the figure; "inference" is reasoning; "unsourced estimate" is a design number with no source. Real-world groups appear below only as evidence about rates. No Nomos culture is modelled on any of them (content rule 8), and every Nomos parameter is a design value calibrated against these bands.

All timings come from one desktop: AMD Ryzen 5 3600 (6 cores, 12 threads), Windows 10 Pro 10.0.19045, Node 24.18.0 (V8 13.6.233.17-node.50). Windows has no load average, so each run records busy logical CPUs over one to two seconds before and after. No timing here is a browser, WASM or phone timing.

## a) Transmission models with evidence

### Takeaway

- **Vertical transmission is the backbone, but its strength differs by custom.** Cavalli-Sforza's index of vertical transmission averages 0.77 for religion and 0.61 for politics, against 0.19 for entertainment and 0.09 for habits. Each Nomos custom therefore needs its own vertical, oblique and horizontal rates.
- **Heritage practice fades over about three generations.** In 2000, 85% of second-generation Hispanic children in the US spoke Spanish at home, against 28% in the third generation; for Asian groups the figures were 61% and 8%. In Canada, 41% of immigrant mothers passed on their mother tongue in 1981, their daughters passed it to 23%, and about 10% of grandchildren kept it.
- **Intermarriage is the main brake, and it rises by generation.** Immigrant newlyweds in the US intermarried at 15% (Hispanic) and 24% (Asian), US-born ones at 39% and 46%. In Canada, 79% of immigrant mothers but only 45% of their Canadian-born daughters were in same-language unions. Households where both partners are migrants keep origin food preferences far more strongly than those with one (Atkin: 5.3× the effect).
- **Customs blend over decades, not years.** About 60% of a migrant's brand-preference gap closes on arrival, and half of the remainder takes more than 20 years; immigrant parents closed half the naming gap to natives in 20 years a century ago, and a third today. That is a yearly adoption hazard of 2.0–3.4% (computed).
- **Model forms:** Bisin–Verdier socialisation homogenises when parental effort is fixed, and keeps a stable mix when minority parents try harder (cultural substitution). Continuous blending of traits always homogenises. Boyd–Richerson conformity is real but uneven: 28 of 40 lab social learners conformed with D ≈ 0.38, and the other 12 ignored frequencies.

### Cited Findings

- Cavalli-Sforza, Feldman, Chen and Dornbusch defined vertical (parent to child), oblique (non-parent adults to children) and horizontal (same generation) transmission ([Science 1982](https://doi.org/10.1126/science.7123211), opened via a scanned copy).
- The same paper's theory: many-to-one transmission (class or caste pressure) changes slowly with low variation; one-to-many (teachers, media) changes fast with low within-group variation; parent-to-child gives moderate change and "relatively high within- and between-population heterogeneity" (opened).
- Its survey used 203 student-plus-both-parents sets and 98 student-plus-two-friends sets at Stanford. Mean correlations were 0.35 between parents, 0.22 parent–child and 0.13 between friends (opened).
- Index of vertical transmission averages ± SD: religion 0.77 ± 0.09, politics 0.61 ± 0.11, entertainment 0.19 ± 0.05, beliefs 0.17 ± 0.04, sports 0.12 ± 0.05, habits 0.09 ± 0.05. Its 41 traits included food habits such as breakfast, coffee, salt use and milk with dinner (opened; their category codes were not legible in the scan).
- Its additive model for Democratic party affiliation gave a non-parental baseline of 0.27, a maternal coefficient of 0.41 and a paternal one of 0.24, with "zero interaction between the two parental components" for all traits (opened). The authors conclude "it is likely for many of these traits that vertical transmission is stronger than horizontal" (opened).
- Bisin and Verdier's basic model: a type-i parent socialises the child with probability τᵢ, otherwise the child copies a random adult; the share follows q̇ = q(1 − q)(τₐ − τ_b). With fixed τ the population homogenises ([Annual Review of Economics 2023](https://bpb-us-e1.wpmucdn.com/wp.nyu.edu/dist/c/16384/files/2024/01/bisin-verdier-2023-advances-in-the-economic-theory-of-cultural-transmission.pdf), opened).
- With endogenous effort τᵢ = (1 − qᵢ)ΔVᵢ ("cultural substitution"), a heterogeneous distribution emerges "from almost every initial state" (opened). Solving q̇ = 0 gives q\* = ΔVₐ / (ΔVₐ + ΔV_b) (computed from the review's equations 3 and 5).
- The same review: continuous traits mixed as a weighted average of parent and society lead "to cultural homogeneity in the long run"; with n traits and equal intolerance, a unique interior distribution is globally stable (opened).
- On marriage: socialisation is usually assumed "more effective within homogamous couples"; under perfect vertical transmission and homophilic matching diversity persists, but "a small mass of heterophilic individuals is enough" to give homogeneity (Hiller et al., as reviewed; opened).
- Bisin, Topa and Verdier's estimates from the General Social Survey imply strong preferences for children of one's own religion, with dynamics unlike linear extrapolation of intermarriage rates ([JPE 2004](https://www.journals.uchicago.edu/doi/10.1086/383101), search summary only).
- Conformity (Boyd and Richerson's D ∈ (0, 1]) means a majority trait is adopted more often than its frequency. In Efferson et al.'s experiment, 28 of 40 social learners were "stated conformists" with D = 0.3805 (SE 0.025); the other 12 had D = −0.48 (SE 0.044) and did not respond to frequency on average ([Evolution and Human Behavior 2008](http://www.des.ucdavis.edu/faculty/richerson/EffsConfMavericks.pdf), opened).
- Alba's analysis of 2000 census data on children aged 6–15 describes the classic three-generation shift. In the second generation, 85% of Hispanic children spoke at least some Spanish at home and 61% of Asian children an Asian language; in the third generation, 72% of Hispanic and 92% of Asian children spoke only English ([CCIS working paper 111](https://ccis.ucsd.edu/_files/wp111.pdf), opened).
- The same paper: English-only at home among Mexican-origin children was 5% in the first generation, 11% in the second and 71% in the third (64% in 1990). European groups after mass immigration ended reached about 95% by the third generation (opened).
- Alba, Logan, Lutz and Stults found intermarriage and communal context the main factors for third-generation home language: 68% of third-generation Cubans, 71% of Mexicans and 91% of Chinese spoke only English ([Demography 2002](https://link.springer.com/article/10.1353/dem.2002.0023), search summary only).
- Rumbaut, Massey and Bean computed "linguistic life expectancies"; Spanish survived longest, but its "demise nonetheless seems assured by the third generation" ([PDR 2006](https://onlinelibrary.wiley.com/doi/10.1111/j.1728-4457.2006.00132.x), search summary only).
- Statistics Canada (Houle) found immigrant mothers passed their mother tongue to 41% of Canadian-born children in 1981 and 55% in 2006. Their daughters, as mothers in 2006, passed it to 23%; so about 10% of grandchildren kept the grandmother's tongue ([Canadian Social Trends 2011](https://web.archive.org/web/2023/https://www150.statcan.gc.ca/n1/pub/11-008-x/2011002/article/11453-eng.htm), opened via the Wayback Machine).
- The same study: 79% of 1981 immigrant mothers had a same-tongue spouse, against 45% of their daughters in 2006. Second-generation endogamy was 83% (Punjabi), 56% (Greek), 55% (Italian) and 46% (Portuguese, Chinese). Union type "alone explains almost all" of the drop (opened).
- Also from Houle: transmission ranges from at most 20% (Dutch, Italian, Creole, Tagalog) to over 70% (Armenian, Punjabi, Chinese and others). A steady inflow of new immigrants raised transmission; group concentration mattered in 1981 (opened).
- Pew: 17% of US newlyweds in 2015 had a spouse of a different race or ethnicity, against 3% in 1967, and 10% of all married people. Intermarriage was 15% for immigrant and 39% for US-born Hispanic newlyweds, 24% and 46% for Asian ones ([Pew Research Center 2017](https://www.pewresearch.org/wp-content/uploads/sites/20/2017/05/intermarriage-may-2017-full-report.pdf), opened).
- Bronnenberg, Dubé and Gentzkow: "approximately 60 percent of the gap" in brand purchases between origin and destination closes immediately when a consumer moves. Half of the rest takes "more than 20 years", the gap is still significant after 50 years, and one year's brand capital has a half-life of 27.2 years ([AER 2012](https://web.stanford.edu/~gentzkow/research/brands.pdf), opened).
- Abramitzky, Boustan and Eriksson: immigrant parents gave less foreign names the longer they had lived in the US, erasing half the gap to natives after 20 years in 1920 and a third in California today; the index fell 0.33–0.40 points a year against a gap of about 20 ([NBER w22381](https://www.nber.org/system/files/working_papers/w22381/w22381.pdf), opened).
- Atkin: inter-state migrants in India keep their origin-state food preferences. The bundle-similarity coefficient was 0.0079 when one spouse migrated and 0.0416 when both did, and the "caloric tax" persisted for migrants of 20+ years (1.79%) ([NBER w19196](https://www.nber.org/system/files/working_papers/w19196/w19196.pdf), opened; published in AER 2016).
- Mesoudi's review of migrant studies: complete one-generation assimilation is rare; second generations sometimes move over 50% towards local values. In one four-generation US study, 13 of 26 attitudes moved at least 50% between generations 1 and 2, and 23 of 26 by generation 4. Rates ranged from about 0 to 0.87 by trait ([PLOS ONE 2018](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0205573), opened).
- Holbrook and Schindler found popular-music preference peaks for songs from a listener's early twenties, about age 23.5 ([JCR 1989](https://academic.oup.com/jcr/article/16/1/119/1791633), search summary only).

### Inferences

- Yearly hazards from the half-lives: 1 − 0.5^(1/20) = 3.4% and 1 − 0.5^(1/27.2) = 2.5% for food-like preferences; 1 − (2/3)^(1/20) = 2.0% for today's naming drift (computed).
- Per-generation retention from the census figures: third/second generation = 0.28 / 0.85 = 0.33 (Hispanic) and 0.08 / 0.61 = 0.13 (Asian). Canada's mother-to-daughter step is 0.23 against 0.41 for the immigrant step (computed). Nomos should land gen-2 retention near 0.4–0.85 and gen-3 near 0.08–0.3.
- Atkin's both-spouse effect is 0.0416 / 0.0079 = 5.3× the one-spouse effect (computed). Transmission should be strongly nonlinear in whether both parents share a custom.
- The habits index of 0.09 measures variation *within* one society. It does not contradict Atkin's strong persistence of regional food cultures *between* societies (inference).
- Custom-by-custom defaults (inference, with design values): festivals behave like identity traits (high vertical, about 1% a year horizontal); food is moderately vertical with 2.5–3.4% a year horizontal; music is weakly vertical and learned mostly from peers aged 10–24; naming is vertical by construction, with parents' naming custom drifting 2–3.4% a year; home region is vertical only.
- Customs must be nominal (which culture's version), never a continuous blend. Both Bisin–Verdier's linear mixing and Flache et al.'s single metric feature (section b) drive everyone to one culture (inference from opened sources).

### Gaps

- The full texts of Alba et al. 2002, Rumbaut et al. 2006 and Bisin, Topa and Verdier 2004 were not reachable; their figures are search summaries. Boyd and Richerson (1985) and Cavalli-Sforza and Feldman (1981) are books and were not opened.
- Houle's transmission rates for same-tongue against mixed couples sit in a table that was not captured; only the qualitative "paramount importance" and the union shares are opened.
- No study measures festival or music transmission across migrant generations. Festival rates borrow from religious practice and music rates from age-of-taste studies; both are analogies (inference).
- Real intermarriage rates depend strongly on group size (small groups intermarry more). Nomos cultures will often be small, so exogamy bands must be read by group size.
- No empirical estimate of conformity strength in real migrant communities was found; Mesoudi calls for one.

## b) Mixing, switching and diversity

### Takeaway

- **Pure horizontal imitation collapses diversity.** Axelrod's model kept 20 regions only at 5 features × 15 traits on a 10 × 10 grid, about 2 on 100 × 100 sites, and 1.0 at 10 features × 10 traits. A mutation rate of 10⁻³ left 1.55 regions, and one ordered ("metric") feature gave a monoculture in 100 of 100 runs.
- **Diversity survives through structure:** minority parents socialising harder, partners from one's own culture, newcomers arriving, and conformist learning that keeps regions distinct. Mesoudi's model keeps between-group F_ST near 0.35 with a 20% conformity boost at 10% migration per step, while migration alone erases it within 30 steps.
- **Measured here (town of 10k):** with conformity and no newcomers, minority identities vanished within 150–200 years, with or without vertical substitution. Culturally different inflow of 0.5% a year held the host share near 0.55 over a century; 0.25% pushed it up to 0.79 and 1% down to 0.21.
- **Measured here (country):** with 20% of movers going anywhere, regional G_ST fell from 0.73 to 0.24 in 100 years without acculturation and to 0.54 with it. Capitals became the most diverse places (effective number of cultures 2.0–4.2) and villages stayed uniform (1.1–1.6).
- **Schelling sorting is easy to trigger and Nomos should not model it with cultures.** Demanding half of one's neighbours alike gives over 4 : 1 like-to-unlike neighbours, and a 10% minority forms clusters of 100+. Real US immigrant dissimilarity averaged 0.35–0.56 (1910–2000). Clustered housing alone produced 3.2× stop and 8.2× arrest gaps between cultures under culture-blind rules (section d).

### Cited Findings

- Axelrod's Table 2 (10 × 10 sites, four neighbours, 10 runs each): 5 features gave 1.0, 3.2 and 20.0 stable regions at 5, 10 and 15 traits; 10 features gave 1.0, 1.0 and 1.4; 15 features gave 1.0, 1.0 and 1.2 ([J. Conflict Resolution 1997](https://journals.sagepub.com/doi/10.1177/0022002797041002001), opened from the [author's scanned copy](http://www-personal.umich.edu/~axe/research/Dissemination.pdf)).
- In the same paper, 4, 8 and 12 neighbours gave 3.4, 2.5 and 1.5 regions on average. With 5 features × 15 traits, regions peaked near 23 at 12 × 12 sites and fell to about 6 at 50 × 50 and about 2 at 100 × 100 (opened).
- Axelrod's sample setting (5 × 10) had a median of 3 stable regions over 100 runs; 14% ended with one region and 10% with more than six (opened).
- Flache and Macy replicated 19.55 regions (Axelrod: 20). A mutation rate of 10⁻³ left 1.55 regions on average; random interaction of 0.001 left 1.11. One metric feature among five gave "full homogeneity in equilibrium" in all 100 runs ([arXiv physics/0604201](https://arxiv.org/pdf/physics/0604201), opened).
- The same paper: interaction thresholds sustain diversity only above 0.2 without noise, 0.4 with mutation and 0.75 with random interaction; "diversity can be sustained only with a relatively small number of features, low levels of noise, and very high thresholds" (opened).
- Klemm, Eguíluz, Toral and San Miguel: with cultural drift at rate r, disordered multicultural states are metastable. The relaxation time is T ≈ N ln N, so r ≪ 1/T yields a monoculture and r ≫ 1/T disorder; without noise the order–disorder threshold was q ≈ 50 traits at 10 features on 50 × 50 sites ([arXiv cond-mat/0205188](https://arxiv.org/pdf/cond-mat/0205188), opened).
- Castellano, Marsili and Vespignani found the transition at q_c ≈ 300 for 10 features with Poisson-distributed initial traits ([arXiv cond-mat/0003111](https://arxiv.org/pdf/cond-mat/0003111), opened).
- Centola, González-Avella, Eguíluz and San Miguel: when ties co-evolve with similarity, diversity can survive drift "in certain regions of the parameter space", because the network splits into groups that cannot interact ([arXiv physics/0609213](https://arxiv.org/pdf/physics/0609213), opened).
- Mesoudi's island model: with no acculturation, perfect between-group structure disappears within 300, 30 and 10 steps at migration of 0.01, 0.1 and 0.3. At m = 0.01, a = 0.1 keeps F_ST ≈ 0.87 and a = 0.02 keeps ≈ 0.35; at m = 0.1, a = 0.2 keeps ≈ 0.35; above m = 0.5 nothing works; three demonstrators fail at m = 0.3; assortation weakens acculturation ([PLOS ONE 2018](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0205573), opened).
- Mesoudi cites a mean cultural F_ST of 0.08 for World Values Survey items (Bell, Richerson and McElreath 2009) and 0.09 for a folktale, with attitudes ranging 0.008–0.612; he takes 0.1 as "a reasonable benchmark" (opened; Bell et al. not opened).
- Berry, Phinney, Sam and Vedder studied 5,366 immigrant youth aged 13–18 in 13 countries. Profiles were integration 36.4%, ethnic 22.5%, national 18.7% and diffuse 22.4% ([Applied Psychology 2006](https://multiculturalmentalhealth.ca/wp-content/uploads/2019/07/dwn46726.pdf), opened).
- The same study: integration and national profiles more than doubled from six or fewer years of residence to birth or 12+ years; diffuse fell from over 45% to about 12%. The ethnic profile held at 20–25% regardless of residence, and dominated in neighbourhoods of one's own group (opened).
- Schelling: with equal groups and eight-cell neighbourhoods, segregation "is slight when the demand is for about one-third of one's neighbors like oneself and striking when the demand is as high as one-half". Like-to-unlike ratios were over 4 : 1 at one-half and under 1.5 at one-third. A 10% minority demanding half forms clusters of "upwards of 100" ([J. Math. Sociology 1971](https://www.suz.uzh.ch/dam/jcr:00000000-68cb-72db-ffff-ffffff8071db/04.02_schelling_71.pdf), opened).
- Cutler, Glaeser and Vigdor: average dissimilarity of US immigrant groups was 0.352 (1910), 0.379 (1950), 0.463 (1970), 0.561 (1990) and 0.560 (2000). Large groups in 2000 sat at 0.5–0.6, like Italians and Russians in 1910; neighbourhood and city definitions changed in 1940 and 1970 ([REStat 2008, working-paper version](https://content.csbs.utah.edu/~philips/soccer2/readings_files/Vigdor%20Is%20the%20Melting%20Pot%20Still%20Hot%20Explaining%20the%20Resurgence%20of%20Immigrant%20Segregation.pdf), opened).
- Abramitzky, Boustan and Connor: Jewish households helped to leave New York enclaves (1900–1922) were later more likely to speak English and married spouses with less Jewish names ([NBER w27372](https://www.nber.org/system/files/working_papers/w27372/w27372.pdf), abstract opened).
- Wu and Zhang (as reviewed by Bisin and Verdier): random matching can give multiple stable cultural equilibria, assortative matching a unique one (opened, secondary).

### Inferences

- Nomos needs four diversity-keeping forces at once: vertical transmission with substitution and homogamy; newcomers from the ledger's migration flows; conformist learning within settlements, which keeps regions distinct; and bundled customs, so people stay recognisably of a culture (inference from sections a and b and the prototype).
- A single town without newcomers will, realistically, lose small minorities over three to five generations. "No collapse" is a property of the connected country, or of City mode's boundary inflow, not of a closed town (inference; measured trajectories in section c).
- Frozen enclaves come from homophily near 1, chain placement, low mobility and learning only from one's own group. The prototype's enclave preset (partner homophily 0.8–1.0, assortation 0.6, mobility 2% a year) froze marriage and learning: exogamy fell to 0.1–0.5% and third-generation children kept 44–46% of heritage customs, against 13–14% in the baseline. Its housing still thawed, with dissimilarity falling from 0.86 to 0.17 over 100 years (measured here).
- Schelling moves on culture would be a neighbour-culture preference. That is the "xenophobia mechanic" round 6 listed under "Avoid", and section d shows place alone turns culture-blind policing into large group gaps. Keep housing culture-blind; keep round 1's Schelling known-answer test on neutral colours only (inference).
- Mild clustering could come only from kin placement (a household moving near relatives), as a labelled knob that is off by default and watched by the place-mediated disparity monitor (inference).

### Gaps

- No source gives district-level cultural F_ST within towns, so the town's dissimilarity target is open; US immigrant dissimilarity (0.35–0.56) is the only band found.
- Berry's profiles mix identity, language and peers; they are not custom counts, so the comparison with the prototype's custom profiles is loose.
- Conformity strength among real migrants is not measured (Mesoudi's call); the prototype's a = 0.3 with five demonstrators is a design value.

## c) Representation, cost and the prototype

### Takeaway

- **Five bytes per person.** Store the primary culture as a `Uint8`, and the five customs (food, festival, music, naming, home region) as 4-bit culture-of-origin nibbles in one `Uint32`. That allows up to 16 cultures per world and takes memory from about 170 to about 175 B of the 256 B cap (computed).
- **Culture costs almost nothing at a 30-day stride (measured here, desktop Node).** Horizontal checks took 149–155 ns per person-year: 4.2 µs a day at 10k agents and 40.6 µs at 100k. Daily checks cost 23× more (3.5 µs per person-year). Each birth's transmission took 0.50–0.58 µs, and no collection ran during 36,500 day passes.
- **In reference-machine terms (×1.9, computed), 100k agents need about 77 µs a day.** At 1,440 ticks a day that is 0.05 µs a tick, about 0.004% of the 1.4 ms "other agent systems" sub-budget.
- **The baseline town stays diverse and mixes realistically (measured here, 3 seeds at 10k and 100k).** Over 100 years the host share went from 0.59–0.61 to 0.55–0.56, and the effective number of cultures from 2.5–2.6 to 2.86–2.92. Second-generation children kept 48% of the heritage food custom and third-generation children 13–14%. Exogamy was 27–34% in the first generation and 35–41% in the second.
- **The country block is 2K Int32 per settlement** (64 B at 8 cultures, 128 B at 16). It costs 1.3–1.4 µs per settlement-year (3.6–3.9 ns per settlement-day) and saves at 11.8 B gzip per settlement, 118 KB for 10,000 settlements (measured here).

### Cited Findings

- Machine for every run: AMD Ryzen 5 3600 (12 logical CPUs), 15.9 GiB, Windows 10 Pro 10.0.19045, Node 24.18.0, V8 13.6.233.17-node.50. Busy logical CPUs before and after each run ranged 0.00–1.94 for the town and 0.01–1.16 for the ledger (measured here; [summary.json](../prototypes/transmission/results/summary.json)).
- Protocol: 100 simulated years per town run, the first 5 years as warm-up, and 95 yearly samples. Day passes were sampled on every 32nd day (1,140 samples per run). Births ran as a separate microbenchmark: 3 warm-up and 9 timed batches of 100,000 births. Figures are medians [min–max] (measured here).
- Town model ([town.mjs](../prototypes/transmission/town.mjs), measured here): a fixed population with 55–94-year lifespans; births to partnered adults aged 20–45; 8 cultures (initial shares 60/12/10/7/5/3/2/1%); 16 districts; 8% of households moving each year to a random district; 0.5% a year culturally different immigrants (60% arriving as couples) and 0.5% random emigrants.
- Transmission rules in the model:
  - At birth, a custom both parents share is kept with fidelity 0.5 + (f₁ − 0.5)(1 − q), where q is its local share and f₁ is 0.9 (food, naming), 0.95 (festival, home region) or 0.5 (music).
  - When parents differ on a custom, vertical transmission succeeds with probability 0.6. It then takes the version of one lead parent, chosen once per child, 75% of the time. Otherwise the child learns from five district adults with conformity a = 0.3 (Mesoudi's rule).
  - Adults copy at yearly rates of 3% (food), 1% (festival), 2.5% (naming) and 1% (music), or 15% for music at ages 10–24. Depending on how many of the four adoptable customs a person still holds from their own culture, the rates are halved (all four), unchanged (three), raised 1.5× (two) or doubled (one or none).
  - Identity switches at 25% a year once three of the four adoptable customs come from one other culture. Partner homophily is 0.2 + 0.1 per own custom kept, applied by both partners.
- Cost by check period, 10k / 100k agents (measured here):

  | Check period | Horizontal ns per person-year | Day pass |
  |---|---|---|
  | Daily (P = 1) | 3,491 [3,367–3,774] / 3,513 [3,375–3,631] | 94.9 µs / 955 µs |
  | 30 days (P = 30) | 155 [140–225] / 149 [138–192] | 4.2 µs / 40.6 µs |
  | Yearly (P = 365) | 47 [35–72] / 43 [29–54] | 1.4 µs / 11.6 µs |

- Births cost 557–580 ns each at 10k and 498–515 ns at 100k with conformist oblique learning (five demonstrators). They cost 150 ns with unbiased copying and 263–271 ns without substitution. The whole yearly phase took 50–56 ns per person-year: deaths, births, immigration, moves, partnering and identity (measured here).
- Friend lists (8 friends per agent, refilled yearly with homophily) cost the same per check (143 ns per person-year). They raised the yearly phase to 109–122 ns per person-year and add 48 B per agent (measured here).
- Allocation: after a forced collection, untimed windows of 3,650 and 36,500 day passes grew the heap by 3.6–9.8 KB, flat across window sizes, at 10k agents (P = 1, P = 30, friends) and at 100k (P = 1). At 100k with P = 30 the growth was 491 KB and 886 KB: sublinear in passes, with zero collections in either window (`--expose-gc --trace-gc`, measured here; [gccheck files](../prototypes/transmission/results/)).
- Determinism: the same seed gave the same state hash twice (`ab217b35`), and reversing the visiting order of due agents gave identical hashes at P = 30 and P = 1 (`86aa25fb`). The day pass reads a day-boundary snapshot and applies an ordered change list (measured here).
- Schedule choice does not change outcomes. At 10k (seed 1), P = 1, 30 and 365 gave host shares of 0.558, 0.553 and 0.563 at year 100; second-generation food retention was 0.49, 0.48 and 0.48; third-generation 0.12, 0.13 and 0.12. Seeds 1–3 at P = 30 spanned 0.553–0.555 (measured here).
- Baseline trajectory, seeds 1–3 at 10k and 100k (measured here; [digest.json](../prototypes/transmission/results/digest.json)):

  | Measure | Year 0 | Year 100 |
  |---|---|---|
  | Host share | 0.59–0.61 | 0.553–0.560 |
  | Effective number of cultures | 2.47–2.59 | 2.86–2.92 |
  | Effective variants: food / festival / music / naming / home region | as above | 2.98–3.05 / 4.34–4.62 / 2.87–2.98 / 3.22–3.38 / 5.47–5.74 |
  | People holding 0 / 1 / 2 / 3 / 4 foreign customs (10k, seed 1) | 100 / 0 / 0 / 0 / 0% | 24 / 32 / 23 / 14 / 7% |
  | Minority dissimilarity across districts | 0.48 | 0.07–0.09 (10k), 0.02–0.03 (100k) |

- Second-half bands (years 51–100, children aged 6–15): second generation kept 0.48 (0.476–0.487) of the heritage food custom and 0.50–0.51 of all four adoptable customs. The third generation kept 0.13–0.14 and 0.15–0.17 (measured here).
- First-generation immigrants kept their food custom at 0.95–0.99 within 5 years, 0.87–0.93 at 5–9 years, 0.77–0.82 at 10–19 years and 0.53–0.60 after 20+ years (years 50–100, measured here).
- Exogamy over years 51–100: host natives 0.17–0.20, first generation 0.27–0.34, second generation 0.35–0.41, third generation and later 0.27–0.34. Teenagers of migrant descent (13–18) held only heritage customs 4.5–5.3% of the time, only host customs 7–8% and a mix 58–60% (measured here).
- Variants at 10k over 100 years (measured here):
  - No newcomers, unbiased copying: the host share went from 0.59 to 0.95.
  - No newcomers, conformity a = 0.3: 0.98, with substitution 0.98.
  - Over 200 years both reached 1.00, with 0.9997–0.9998 already at year 150.
  - Inflow sweep: 0.25%, 0.5% and 1% a year gave host shares of 0.79, 0.55 and 0.21 and effective numbers of cultures of 1.60, 2.91 and 6.27.
- Friend lists instead of district aggregates gave a host share of 0.50, 0.52 second-generation and 0.16–0.19 third-generation food retention (measured here).
- Ledger model ([ledger.mjs](../prototypes/transmission/ledger.mjs), measured here): 1,000 settlements, Zipf sizes (1.2 million people, floor 200), and a k = 8 nearest-neighbour route graph capped at 24 edges. Settlements send out 4.5% of their people each year by gravity, of whom 20% move anywhere with destination weight pop^1.5. Births follow homogamy (η = 0.4), substitution and conformist oblique learning. All counts use keyed systematic rounding, which is exact and unbiased; plain flooring silenced small-village dynamics in an earlier version.
- Ledger results after 100 years (measured here):

  | Variant | Regional G_ST | Within-town effective cultures | Capital | Top 10 | Small half | Towns ≥ 90% one culture |
  |---|---|---|---|---|---|---|
  | Start | 0.733 | 1.36 | 1.00 | — | — | 37% |
  | Migration only | 0.239 | 3.18 | 4.19 | 3.65 | 1.61 | 16% |
  | Conformity a = 0.3 | 0.544 | 1.67 | 2.00 | 1.83 | 1.13 | 80% |
  | Conformity a = 0.6 | 0.667 | 1.38 | 1.58 | 1.43 | 1.11 | 86% |
  | Local moves only, no conformity | 0.771 | 1.30 | 1.00 | 1.20 | 1.40 | 45% |

- 94.8–95.7% of settlements kept their initial dominant culture in every 1,000-settlement variant. At 10,000 settlements over 30 years, G_ST went from 0.694 to 0.553 and the capital's effective number of cultures from 1.27 to 2.77 (measured here).
- Ledger cost per settlement-year (warm-up 5 years): with conformity 1,431 ns [1,107–4,210], migration only 1,476 [1,147–9,805], conformity 0.6 1,612 [1,023–20,800], local moves only 885–942 ns (all n = 95). At 10,000 settlements it was 1,312 ns [1,269–2,498] (n = 25). The culture arrays saved at 11,550 B gzip for 1,000 settlements and 117,730 B for 10,000 (measured here).
- Azgaar's Fantasy Map Generator places culture centres on populated cells with a shrinking spacing ((width + height) / 2 / count, ×0.9 per retry). It grows cultures by multi-source Dijkstra with costs for biome, biome change, height, rivers and coast, divided by an "expansionism" factor by culture type. Each cell gets exactly one culture, and the code uses `Math.random` ([cultures-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/cultures-generator.ts), MIT, opened).
- Round 6 estimates memory at about 170 B per agent against a 256 B cap, settlement records at 510–640 B against 1 KB, and a desktop-to-reference factor of ×1.9; the M6 save target rose to about 0.5 MB ([round 6 report](../../round-6-goods-and-wellbeing/report.md), opened).
- Round 4's keyed draw `draw(seed, entity, tick, stream)` and monthly migration at 3.6–5.5% a year between settlements are the inputs reused here ([round 4 summary](../../round-4-multi-scale/summary.md), opened).

### Inferences

- Reference-machine costs (×1.9, computed):
  - 100k agents at P = 30: 77 µs a day. At P = 1: 1.8 ms a day, which fits as 18.6 µs per 1,024-agent slice.
  - Births at 100k: about 7 a day × 0.5 µs ≈ 6.5 µs a day.
  - 10,000 settlements: 24.9 ms a year, or 68 µs a day (0.57% of the 12 ms country budget) if each settlement steps on its own stride day.
- Use the 30-day stride: agent i is due on day d when i ≡ d − offset (mod 30), with the offset re-keyed each year. It needs no extra memory, no per-agent scan and no sorting, and it gave the same outcomes as daily checks (inference from measurements).
- Use per-district custom counts (D × 5 × K Int32, 2.5 KB at 16 districts and 8 cultures) as the default demonstrator pool. That matches the plan's per-cell aggregates and needs no friend list; M5's friend network can be an optional source (inference).
- Settlement memory with the block: 510–640 + 64 = 574–704 B at 8 cultures, or up to 768 B at 16, under the 1 KB cap (computed).
- The save grows by about 118 KB at 10,000 settlements, on top of round 6's about 0.5 MB. A sparse encoding (non-zero cultures only, as varints) should be tried before M6 freezes the format (inference; not measured).
- Map seeding: run FMG-style multi-source shortest paths with integer costs and keyed draws. Mix frontier towns by share₁ = 1 − ½(d₁/d₂)², then spin the ledger up 50–100 years so cities become melting pots before play. A 100-year spin-up of 1,000 settlements costs about 0.14 s on this desktop (computed from 1.4 µs × 1,000 × 100).
- Spawn and fold:
  - Spawn: draw primary cultures by exact apportionment of the settlement counts, give "mixed" people one or two customs of the local plurality culture by keyed draw, and use a separate draw stream so culture is independent of wealth rank and body hue.
  - Fold: count exactly (inference).
- The identity rule matters. "Identity follows practice" drifts toward the majority even under neutral copying (0.59 → 0.95 in 100 years), because customs copied at random come mostly from the majority. A stickier, inherited label would keep more identity diversity while practice converges (inference from the neutral run).

### Gaps

- The model under-produces coherent orientations among teenagers of migrant descent: 4.5–5.3% heritage-only and 7–8% host-only against Berry's 22.5% ethnic and 18.7% national profiles. Custom bundling needs more work, or a latent orientation per person.
- First-generation exogamy (27–34%) sits above the US immigrant band (15–24%). That is partly realistic, because each Nomos minority is small; it should be read by group size.
- The ledger's rules are hand-written mean-field approximations, not fitted to the agent model; round 4's emulator fitting and docking apply.
- Every timing is Node on one desktop. None is a browser, WASM or phone timing, and the ×1.9 factor comes from round 6.
- Demography is simplified (fixed population, uniform lifespans, births to random couples), and days per year is fixed at 365 here while the plan has not fixed it.
- The 118 KB save cost and its sparse alternative are not measured against the full country save.
- The 100k, P = 30 heap growth (491–886 KB over 3,650–36,500 passes, no collections) looks like one-off compiled code or feedback rather than per-pass garbage, but this was not proven. It should be re-checked under the plan's allocation gate (zero scavenges over 1,000 ticks).

## d) Guardrails

### Takeaway

- **Four layers, from cheap to strong:** a lint that keeps culture columns out of crime, policing, ability, labour and wealth code; a label-permutation replay that must hash identically; a decision swap that compares pre-draw scores; and statistical group monitors with label-shuffle tests.
- **The permutation and swap tests catch leaks exactly (measured here).** Clean code hashed identically on 10 of 10 seeds; an ID read and a culture-keyed draw each failed 10 of 10. The ID leak changed only 3 of 40,000 decisions, but 531 of 20,000 pre-draw thresholds.
- **Culture-blind rules are not enough.** Clustered housing alone produced 3.2× stop and 8.2× arrest gaps between cultures (p = 0.005). Unequal prices for favourite foods alone produced 7× offending, 8× arrest and 13× wealth gaps. Customs must be cost-neutral, and housing culture-blind.

### Cited Findings

- Galhotra, Brun and Meliou define a group discrimination score (the gap between groups' shares of an outcome) and a causal one: "the fraction of inputs for which changing specific input characteristics causes the output to change". Their tool found software discriminating "against as much as 98% of an input subdomain" ([FSE 2017, arXiv 1709.03221](https://arxiv.org/pdf/1709.03221), opened).
- Kusner, Loftus, Russell and Silva: "fairness through unawareness" (never using the attribute) has a clear shortcoming, because other features "can contain discriminatory information analogous to A". Counterfactual fairness requires the same prediction when A changes with the background held fixed ([NeurIPS 2017, arXiv 1703.06856](https://arxiv.org/pdf/1703.06856), opened).
- Content rule 8 limits customs to preferences, "never ability, honesty, work or crime", and keeps culture independent of body hue and invisible on bodies and clothes (`.claude/rules/content.md`, opened).
- Round 6 lists "xenophobia mechanics" under "Avoid" in its Norland table ([round 6 report](../../round-6-goods-and-wellbeing/report.md), opened).
- Toy test bed ([guard.mjs](../prototypes/transmission/guard.mjs), measured here; 20,000 agents × 365 days; 10 seeds for T1; 40 seeds and 200 label shuffles per group test): a culture-blind offend rule driven by unmet food need and four hot districts, record-driven patrols, stops of anyone in a district, and a wallet that buys the culture's favourite food.
- T1, label permutation: renaming culture IDs and permuting the custom tables gave identical hashes on 10 of 10 seeds for clean code, and 0 of 10 for an ID read (`culture === 2` raises the offend threshold 1.5×) or a draw keyed on culture (measured here).
- T2, decision swap at day 180: changing only each agent's culture changed 0 of 40,000 decisions in clean code. The ID leak changed 3 decisions but 531 of 20,000 pre-draw thresholds; the keyed-draw leak changed 231 decisions and no thresholds (measured here).
- T3, culture-blind housing with equal prices: no group gap was significant (agent-level max/min 1.02–1.37, shuffle p = 0.39–0.66). Clustered housing (80% of three minorities in hot districts) gave 3.15× stops and 8.18× arrests per agent (p = 0.005, the floor for 200 shuffles) (measured here).
- T4, culture-blind housing with favourite-food prices of 7.00–13.00 against 9.00 equal: ever-offended rates differed 7.0×, arrests 8.1× and mean wealth 13.3× between cultures (p = 0.005) (measured here).
- A person-day chi-square on offending flagged the clean case falsely (χ² = 118.5 against 24.3 at p = 0.001 with 7 degrees of freedom), because offending clusters within low-income agents. Agent-level units with label shuffles fixed it (measured here).

### Inferences

- Lint is "fairness through unawareness" and is necessary but not sufficient (Kusner et al.). Permutation and swap tests prove no rule reads culture directly or keys a draw on it. Group monitors catch proxies such as place and price (inference).
- The swap test should compare the fixed-point score before the draw, not only the decision: decisions change only for agents near a threshold, so small leaks hide (measured here, inference).
- Culture IDs must never be a draw key, a loop order that matters, or an array index into anything but custom tables (inference from T1 and T2).
- Customs need a cost-neutrality rule: each culture's favourite food, festival and music must cost the same at base prices, within a tolerance set with the customs researcher. Otherwise preferences alone create culture–wealth and culture–crime gaps (inference from T4).
- Group monitors cannot demand zero gaps, because culture legitimately shifts demand. They should compare against a culture-blind twin (customs' preference weights set to zero) and report any gap in crime, stops, arrests or wealth beyond the twin's band (inference).
- Two independence checks belong beside them (proposals; thresholds unsourced):
  - Culture and body hue are drawn on separate streams, and a χ² test of hue × culture over 10⁶ births must not reject independence.
  - The appearance audit gains a culture row: no rendered attribute may differ by culture, with |Cramér's V| < 0.05 over 50 seeds, mirroring round 6's |Spearman| < 0.05 for wealth.
- The swap test should cover every rule under contract: offend, target choice, patrol allocation, stops, arrests, sentencing, hiring, wages, productivity and spawn wealth rank. Preference functions are the only ones allowed to change under a swap (inference).

### Gaps

- The toy loop is not Nomos's crime model; the size of place and price effects in the real M4 model is unknown until it exists.
- The cost-neutrality tolerance and the monitor thresholds are proposals, not sourced standards.
- Whether any clustering at all is acceptable is an owner decision, informed by the ethics researcher.

## Recommendation for the plan

**Model.** Each person holds a primary culture and five customs as culture-of-origin nibbles (5 B). Customs pass at birth from both parents, with cultural substitution, a lead parent and conformist oblique learning. Adults adopt customs slowly on a 30-day stride from per-district counts. Identity follows practice with a lag. Settlements hold 2K counts that births, conformity and exact migration splits move. The map seeds regions from hearths, and the ledger spins up before play. Housing never reads culture, customs are cost-neutral, and a four-layer guard suite runs in CI.

**Why.**

- Evidence bands: a three-generation fade, exogamy rising by generation, and decades-long blending.
- Model results: imitation alone collapses, and structure keeps diversity.
- Measured here: under 0.1 ms reference time a day at 100k agents, and realistic trajectories at 0.5% inflow.

**Draft tasks** (tagged R8, by milestone):

### M0 Pipeline

- [ ] Reserve culture columns in `AgentStore`: primary culture as `Uint8` and five customs as 4-bit culture-of-origin nibbles in one `Uint32` (food, festival, music, naming, home region), at most 16 cultures per world; document the layout in `sim-protocol` (R8).
- [ ] Extend the lint profile so only culture and preference modules may import culture columns and custom tables; crime, policing, labour, ability, wealth and housing code may not, and no draw may be keyed on a culture ID (R8).
- [ ] Add a stride scheduler for staggered checks (agent i due on day d when i ≡ d − offset mod P, offset re-keyed yearly) that reads a day-boundary snapshot and applies an ordered change list; test that reversed visiting order gives identical hashes (R8).

### M2 Economy

- [ ] Extend `spawnFromLedger` to culture: exact apportionment of settlement culture counts, one or two local-plurality customs for "mixed" people by keyed draw, and a separate draw stream so culture stays independent of wealth rank and body hue; fold returns exact counts (R8).
- [ ] Make customs cost-neutral: every culture's favourite foods and festival basket cost the same at base prices, within a tolerance agreed with the customs research; a toy test showed unequal prices alone gave 13× wealth gaps (R8).

### M3 City life

- [ ] Transmit customs at birth from both parents. Keep shared customs with fidelity rising from 0.5 to f₁ (0.9 food and naming, 0.95 festival and home region, 0.5 music) as they become locally rare. When parents differ, succeed vertically with probability 0.6 and follow a lead parent 75% of the time; otherwise learn from five district adults with conformity 0.3 (R8).
- [ ] Run horizontal adoption on a 30-day stride from day-boundary per-district custom counts, at yearly copying rates of food 3%, festival 1%, naming 2.5% and music 1% (15% at ages 10–24); halve the rate for people still holding all their own customs (R8).
- [ ] Switch the primary culture at 25% a year once three of four adoptable customs come from one other culture; show culture and adopted customs only in the inspector, never on bodies or clothes (R8).
- [ ] CI bands: second-generation children keep 40–85% and third-generation 8–30% of heritage customs; exogamy rises from the first to the second generation; culture costs at most 0.1 ms RM a day at 10k agents, with zero scavenges across a year of day passes (R8).

### M4 Crime and police

- [ ] Add the culture guard suite to CI (R8):
  - label permutation with bit-identical hashes;
  - a decision and pre-draw-score swap over offend, targeting, patrol, stop, arrest and sentencing rules, which must score 0;
  - agent-level group monitors with label-shuffle tests against a culture-blind twin.

### M5 Society and policy

- [ ] Keep Schelling moves and all housing choice culture-blind; any kin placement is a labelled knob, off by default, shown with the dissimilarity index and the place-mediated disparity monitor; keep round 1's Schelling known-answer test on neutral colours (R8).
- [ ] Set partner homophily from customs kept (0.2 + 0.1 per own custom, applied by both partners), never from hue (R8).
- [ ] Offer M5's friend network as an optional horizontal source, keeping district aggregates as the default (R8).
- [ ] Add a culture panel (shares, effective number of cultures, foreign customs 0–4, generational retention) and City mode's boundary inflow of culturally different arrivals (default 0.5% a year) (R8).
- [ ] Extend the appearance audit with a culture row (|Cramér's V| < 0.05 for every rendered attribute over 50 seeds) and add a hue × culture independence test (R8).

### M6 Scale and sharing

- [ ] Say on the "What this toy leaves out" page that cultures are fictional, learned and never drawn, that housing ignores culture, and that Nomos has no xenophobia or enclave mechanics (R8).
- [ ] Budget about 12 B gzip per settlement for culture (118 KB at 10,000) and try a sparse encoding before the save format freezes (R8).

### M7 Country of ledgers

- [ ] Add the settlement culture block (R8):
  - counts by primary culture plus mixed counts, 2K Int32 (64 B at 8 cultures);
  - stepped yearly on each settlement's stride day: births by homogamy and conformist oblique learning, then mixing and switching hazards;
  - keyed systematic rounding throughout, never flooring.
- [ ] Split every migration flow by culture exactly, outflow by culture first and then by destination, with about 20% long-distance movers weighted by pop^1.5 (R8).
- [ ] Fit the culture hazards from M3–M5 agent runs and dock them on held-out runs, as round 4 does for other flows (R8).
- [ ] CI bands over 100 years: regional G_ST stays ≥ 0.3 with acculturation, ≥ 90% of settlements keep their dominant culture, and the capital's effective number of cultures exceeds the village median (R8).

### M8 Country map

- [ ] Seed K culture hearths by farthest-point sampling and grow regions by multi-source shortest paths with terrain costs (FMG's method with keyed draws, no `Math.random`). Mix frontier towns by 1 − ½(d₁/d₂)², and spin the ledger up 50–100 years before play (R8).
- [ ] Add a culture map mode (dominant culture as base, diversity as stripe) whose colours never match the six body hues (R8).

### M9 Zoom across scales

- [ ] Spawn and fold customs exactly from the culture block, and keep notables' customs across visits (R8).

**Verify before hard-coding**

| Figure or question | Evidence now | Decides | Milestone |
|---|---|---|---|
| Festival and music transmission rates | Analogies to religion and age-of-taste; no migrant study | f₁ and yearly rates per custom | M3 |
| Coherent orientations among teenagers of migrant descent | Model 5% heritage-only, 8% host-only, against Berry's 22.5% and 18.7% | Bundling rule or latent orientation | M3 |
| Exogamy by group size | US bands are for large groups; Nomos minorities are small | Homophily constants | M5 |
| Conformity strength among migrants | Lab only (D ≈ 0.38 for 70% of learners) | a and demonstrator count | M3, M7 |
| Cost-neutrality tolerance and monitor thresholds | Proposals | Customs tables and CI gates | M2, M4 |
| Alba et al. 2002, Rumbaut et al. 2006, Bisin–Topa–Verdier 2004 | Search summaries | Third-generation and socialisation bands | M3 |

**Owner decisions**

| Decision | Options and what they change |
|---|---|
| Identity rule | Practice-driven switching drifts toward the majority (0.59 → 0.95 in 100 years with no newcomers); an inherited ancestry label keeps identity diverse while practice converges |
| City-mode inflow | 0.25% / 0.5% / 1% a year gave host shares of 0.79 / 0.55 / 0.21 after 100 years |
| Any residential clustering | None (dissimilarity 0.02–0.09) or a kin-placement knob, at the price of place-mediated gaps (3.2× stops and 8.2× arrests in the toy test) |
