# Follow-up research: what the plan leaves open

Oct 4, 2026 · @Rd

## Bottom line

The plan's architecture holds, but many of its numbers and three of its methods need to change. Real policing is far sparser than the plan assumes and its arrest rate is never calibrated, 20 seeds cannot certify the small effects that follow, and Chrome 150 broke the plan's same-engine replay promise wherever `Math` calls remain.

- **Policing:** the US has 2.3 sworn officers per 1,000 people (0.23%); the plan's 1–3% is 4–13 times that. Only about 4% of true thefts end in a clearance, a rate the plan never checks, while offenders' perceived risk is 90% with one officer in sight. Theft's elasticity to police is about −0.15, so 10% more police cuts theft by about 1.4%.
- **Hotspots:** write the Short field's decay as (1 − ω·δt). The plan's half-life rule is sound, but the ω = 1/15 it quotes would give a 10-hour half-life if applied per hourly update.
- **Economy:** shops need retail margins (26–33%, not Lengnick's 2–13%), job search needs checking against US hiring and quit rates, and fixed money pins average household saving at zero. Two Lengnick parameters are missing.
- **Validation:** 20 seeds per arm detect only effects larger than "large". Use 50 paired seeds per arm and three verdicts: Holds, Fails and Inconclusive.
- **Engineering:** Chrome 150 changed `Math.exp`, `Math.log` and `Math.atan2` results, so any `Math` call left in the core, such as Lengnick's power function, breaks replays between Chrome versions; @stdlib math stayed bit-identical across the three engines tested. Workers keep running in hidden desktop tabs, and the raw WebGL2 renderer M0 already specifies should replace PixiJS.
- **Competition:** economySim and SocSim each cover half the idea, and ndouglas/SugarScape added rule-based theft with witnesses. That strengthens the plan's own conclusion: the edge is being verifiable, not being first.
- **Framing:** headline the true-vs-recorded view with two districts that have identical crime but report 13% and 33% of it. Keep dots free of demographic traits, and ship a "What this toy leaves out" page at launch.

**The design consequence:** calibrated effects are small, local and slow, which sharpens the risk the plan already ranks highest, illegibility: one run teaches nothing on screen. Lab cards should use exaggerated, labelled contrasts certified with paired seeds; city mode should run calibrated values and show the spread across seeds.

**Evidence:** the network again blocked most primary sources; GitHub, npm, PyPI and a few PDFs opened. Tables below mark each figure as opened, summary (search snippet only) or own measurement. Check summary figures before hard-coding them.

## More prior art

No project yet combines all five ingredients, but two hobby projects now cover one half each, and ndouglas/SugarScape added rule-based theft. GitHub was searched through its public search API, which shows only the top 15–18 results per query; itch.io and Hacker News only through snippets; Reddit and Steam were unreachable.

| Project | What it adds | What it lacks | Licence · status |
| --- | --- | --- | --- |
| [AtakanAytar/economySim](https://github.com/AtakanAytar/economySim) | About 25k people and firms in TypeScript struct-of-arrays; money "conserved to the exact cent"; seeded, bit-identical runs with 77 tests; goods, labour, housing, banking and a Taylor-rule central bank on a Canvas2D map | Crime deferred on purpose (a planned money-laundering layer watched by a regulator); sim on the main thread; no demo | MIT · pushed 2026-08-27 · 0 stars |
| [pietro-works/SocSim](https://github.com/pietro-works/SocSim) | A few hundred creatures; tax-funded Enforcers chase Predators who steal and build hideouts; 16 sliders; up to 1000× speed | No money, prices or merchants; crime is a fixed creature type; no seeding | MIT · pushed 2026-06-28 · 0 stars |
| [ndouglas/SugarScape](https://github.com/ndouglas/SugarScape) (update) | Now 25+ models and 1,093 commits; Minds 6 pilfering and Minds 8 witnessed theft; Compare mode, step-back branching, "Stop at" rules, charts downsampled to about 2,000 points; an "underworld" campaign announced on 3 Oct | Still separate models, with no society where merchants and police coexist | MIT · 0 stars |
| [NeoLorenzo/Econ-Engine](https://github.com/NeoLorenzo/Econ-Engine) | Deterministic TypeScript core; integer cents; taxes in integer basis points; a government that cannot borrow or create money | Crime, police, a dot view | AGPL-3.0 · pushed 2026-09-30 |
| [dotshome/dots](https://github.com/dotshome/dots) | Roles earned from what a dot keeps doing; votes on currency, a court and a warden; one logged `minds.decide()` call site | Four agents; server-side, watch-only | MIT · pushed 2026-10-02 |
| [casaisdev/primordial](https://github.com/casaisdev/primordial) | Sim and renderer in one Worker on a transferred OffscreenCanvas; a lockstep reproducibility test; integer grid keys | Artificial life, not a society | MIT |
| [Chessiee/ModelingCivilViolence](https://github.com/Chessiee/ModelingCivilViolence) | Epstein's model with "violent cops"; legitimacy updated as L + 0.005 × (fair − 2 × arbitrary arrests) | NetLogo only; no economy | No licence · 2025 |
| [zeikar/cimulity](https://github.com/zeikar/cimulity) | PixiJS 8 city builder; police coverage from road-network distance | Crime is not simulated | MIT · pushed 2026-09-22 |

Common Ground has not changed since 26 September. Many of these projects are AI-assisted and have 0–13 stars, so star-sorted searches miss them; watch by topic, language and recency instead.

**Mechanisms to borrow from open-source games** (the code is GPL, AGPL or closed, so study and reimplement):

- [Micropolis](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (SimCity): crime per block = 128 − land value + density (capped at 300), minus a police-coverage map smoothed three times, clamped to 0–250. Land value drops 20 where crime exceeds 190. A cheap baseline for Compare mode.
- [Space Station 13](https://github.com/tgstation/tgstation/blob/master/code/__DEFINES/security.dm): wanted statuses None → Suspected → Arrest → Incarcerated → Parole → Discharged, a ready state machine for recorded crime.
- [Citybound](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/households/mod.rs): a household with no pressing need waits 200 ticks before deciding again, and shop hours are shifted by travel time.
- [Shadows of Doubt](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/) (summary only): each citizen's 4–10 daily journeys are planned at dawn, and one global pass finds which travellers can see each other to generate witnesses.

**Libraries and licence traps.** No JS agent-based library changes the custom-core decision: Flocc, agentscape and AgentMaps use one object per agent and publish no benchmarks, and Flocc gets about 368 npm downloads a month. Nicky Case's CC0 [crowds](https://github.com/ncase/crowds) bundles non-commercial sound effects, and the CC BY 4.0 Complexity Explorables depend on the GPL-3.0 d3-widgets library.

**LLM societies** still hit compute limits and none studies crime: Project Sid's runs above 1,000 agents [exceeded its server](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf), and [OASIS](https://github.com/camel-ai/oasis) used about 3,356 input tokens per agent per step. If narration is ever added, route it through one call site, call it asynchronously every N ticks, fall back to a deterministic mock and log each output so replays stay identical.

## Crime and policing calibration

Real US staffing is 4–13 times sparser than the plan's 1–3%, only about 4% of true thefts end in a clearance, and police effects on theft are small and mostly local. Use these values as targets the simulation should reproduce, not as multipliers in the code.

| Quantity | Plan now | Value the evidence supports | Checked |
| --- | --- | --- | --- |
| Police share | 1–3% (Epstein default 4%) | 0.23% (2.3 officers per 1,000); use 0.2–0.5%, or label each police dot as a patrol unit | Opened ([FBI 2024](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf)) |
| Clearance of reported crime | Not set | Larceny 17.3%, burglary 15.2%, vehicle theft 9.2%, robbery 30.4% (2024) | Opened (FBI 2024) |
| Reporting to police | One rate × legitimacy | Theft 25%, burglary 41%, vehicle theft 75%, robbery 73% (2024); 13–33% across Bogotá's districts | Summary ([NCVS 2024](https://bjs.ojp.gov/library/publications/criminal-victimization-2024)) |
| Chance a true crime ends in a clearance | Not calibrated (perceived risk ≈90% at one officer per offender) | Theft ≈4%, burglary ≈6%, vehicle theft ≈7%, robbery ≈22% | Reporting × clearance |
| Police elasticity | Murder only, −0.67 ± 0.48 | Theft −0.15, burglary −0.2, robbery −0.45, vehicle theft −0.6; murder −0.67 ± 0.47 | [Levitt 2002](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf) opened; [Chalfin & McCrary](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf) summary |
| Guarded block | Not quantified | Car theft −75% on the guarded block, no change 1–2 blocks away | Summary ([Di Tella & Schargrodsky](https://www.brookings.edu/wp-content/uploads/2016/06/CSS_policeeffect.pdf)) |
| Unemployment → property crime | +2.8–5% per point | +1–3% per point; 2.8–5% only as an upper bound | Summary ([SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=242571)); Levitt opened |
| Koper stop | 10–15 min; 16% vs 4% | Best at 14–15 min; 15% vs 4% | Summary ([OJP](https://www.ojp.gov/ncjrs/virtual-library/abstracts/just-enough-police-presence-reducing-crime-and-disorderly-behavior)) |
| Recidivism | Fitted to the shape of 43% (year 1), 22% (year 10) and 82% within 10 years | Cumulative re-arrest 43% / 66% / 82% by years 1 / 3 / 10; the 22% is the share arrested during year 10 | Summary ([BJS](https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018)) |
| Crime concentration | Top 5% of cells | 50% of crime on 2–6% of street segments; 25% on 0.4–1.6% | Summary ([Gill et al.](https://cebcp.org/wp-content/halloffame/Gill-etal-Testing-Concentration-Crime.pdf)) |
| Repeat victims | No target | The top 5% of at-risk targets suffer ≈60% of victimisations | Summary ([O et al.](https://crimesciencejournal.biomedcentral.com/articles/10.1186/s40163-017-0071-3)) |
| Trip length | Familiar places only | Weight cells by exp(−d/λ), with λ ≈ 0.6–1.2 km drawn per offender; no buffer zone | Summary ([Townsley & Sidebottom](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-9125.2010.00205.x)) |
| Displacement | No target | ≈25% of deterred offenders move nearby; benefits spreading to neighbours is at least as common | Summary ([Guerette & Bowers](https://www.researchgate.net/publication/229732660_Assessing_the_extent_of_crime_displacement_and_diffusion_of_benefits_A_review_of_situational_crime_prevention_evaluations)) |

**Calibrate realised arrests.** Epstein's 1 − exp(−2.3·C/A) is 0.90 at one officer per offender, 0.68 at one per two and 0.21 at one per ten. The plan already uses it only for offenders' perceived risk; arrests come from officers responding and pursuing, and nothing checks how often that succeeds. Add a test that clearances per true theft land near 3–7% (robbery about 20%), and consider damping perceived risk, which at 90% deters far more than a real chance of about 4% justifies.

**Recidivism fit.** Fit the plan's h0·e^(−t/τ) + h∞ to cumulative re-arrest, not to the 22%: h0 ≈ 0.68 a year, τ ≈ 1.46 years and h∞ ≈ 0.073 a year give 43%, 66% and 82% by years 1, 3 and 10, but the constant floor eventually re-arrests everyone. A Weibull with 15% never re-arrested, S(t) = 0.15 + 0.85·exp(−(t/1.65)^0.68), fits within 0.3 points and levels off (own fits).

**Short et al. check.** The paper itself could not be opened. A third-party implementation ([jjapp/shortBurglary](https://github.com/jjapp/shortBurglary)) and summaries confirm the plan's spread term. Its decay, set per hourly update from a 1–2 week half-life, is sound, but state the time step explicitly: the ω = 1/15 quoted beside it would give a 10-hour half-life per hourly update.

```ts
// Short et al. 2008: one time step dt for every rate (the third-party code uses dt = 0.01; the paper's value is unconfirmed)
B[c] = ((1 - eta) * B[c] + eta * mean4(B, c)) * (1 - omega * dt) + theta * crimes[c];
const pBurgle = 1 - dexp(-(A0 + B[c]) * dt); // dexp: a deterministic exp, see Engineering gaps
```

Γ = 0.019, θ = 0.56 and η = 0.03 match one of the paper's figures (summary), and [2026 follow-up work](https://arxiv.org/pdf/2605.17709) uses ω = 1/15. A0 = 1/30 is unconfirmed; the implementation uses 0.2. Unit test: mean attractiveness B̄ = θΓ/ω ≈ 0.16.

When any dot can offend, the agent model sets the burglary rate, so rescale θ to keep B̄ comparable with A0. The same 2026 paper adds police by generating burglars at (1 − Σ)·Γ·e^(−β·m/h²), where m is local police presence and Σ the arrest probability.

**Two distortions, two switches.** With realistic staffing, most recorded theft enters through victim reports, not patrol sightings. Unequal reporting is static: in search summaries, Bogotá's 13–33% spread pulled predicted hotspots toward high-reporting districts ([Akpinar et al.](https://arxiv.org/abs/2102.00128)). Patrol feedback is Ensign's runaway loop, so give each distortion its own toggle. Search summaries say larger forces also make more low-level arrests ([Chalfin et al. 2022](https://escholarship.org/content/qt3m116366/qt3m116366.pdf)), so recorded crime can rise while true crime falls.

**Cliffs at deep cuts.** In search summaries, Fonoberova et al.'s crime model, checked against 5,660 US cities, found crime rising rapidly once officers fall below a critical level ([JASSS](https://www.jasss.org/15/1/2.html)). Make the police slider nearly flat near its default and steep at very low staffing, and test both regimes.

## Economy calibration

Lengnick's loop stays, but its shops need retail margins, its job search needs checking against US hiring and quit rates, and fixed money pins average household saving at zero. Every official statistic here comes from search summaries; only the cloned code repositories were opened.

**Lengnick fixes.** The plan's parameters match the paper's Table 1 as encoded in the [replication's tests](https://github.com/avakeeling199/Lengnick-replication), with two gaps:

- **ξ = 0.01:** a household switches shop only if the new price is at least 1% lower.
- **ψ\_quant = 0.25:** a separate chance of dropping a shop that ran out of stock, beside ψ\_price = 0.25 for swapping to a cheaper one.

The paper runs 6,000 months after a 1,000-month burn-in and gives no starting values, so 3,100 / 25 / 1,428 are the replication's own choices. Another replication lists [about 20 ambiguities](https://github.com/newwayland/baseline-economy), so write down the integer-cent rules: round buffers up and purchases down, floor prices at one cent, and pay wages before profit shares. Start prices inside 1.025–1.15 × marginal cost, which is w/63 (21 working days × 3 goods per worker-day).

| Target | Value | Tunes | Checked |
| --- | --- | --- | --- |
| Regular price changes | 9–12% of months (Lengnick ≈9%); 15–20% during inflation | θ, stock target | Summary ([Nakamura & Steinsson](https://ideas.repec.org/a/oup/qjecon/v123y2008i4p1415-1464..html); [Fed note](https://www.federalreserve.gov/econres/notes/feds-notes/price-setting-during-the-covid-era-20230829.html)); replication opened |
| Wage cuts | ≈2% of job-stayers per year; ≈12% with near-zero growth (Aug 2026) | 24-month wait before cuts, δ | Summary ([Grigsby et al.](https://www.nber.org/papers/w25628); [Atlanta Fed](https://www.atlantafed.org/research-and-data/data/wage-growth-tracker)) |
| Job finding | ≈26% of the unemployed per month (Aug–Sep 2026) | β, lowest acceptable wage | Summary ([BLS flows](https://www.bls.gov/web/empsit/cps_flows_current.htm)) |
| Job losses | ≈1.0–1.1% of workers per month | Firing rule | Summary ([JOLTS, Aug 2026](https://hiringlab.indeed.com/2026/09/29/august-2026-jolts-report/)) |
| Job-to-job moves | ≈1–2% per month (quits 1.9%) | π | Summary |
| Unemployment duration | Median 11.5 weeks, mean 24.8; 27% out ≥ 27 weeks | Differences between workers | Summary ([BLS A-12](https://www.bls.gov/news.release/empsit.t12.htm)) |
| Business survival | 78% / 51% / 35% at 1 / 5 / 10 years | Entry and exit | Summary ([BLS](https://www.bls.gov/opub/ted/2024/34-7-percent-of-business-establishments-born-in-2013-were-still-operating-in-2023.htm)) |
| Firm exit | Firms ≈7.5% a year (≈0.65% a month); establishments 8.5% | Exit rule | Summary ([Fed note](https://www.federalreserve.gov/econres/notes/feds-notes/business-entry-and-exit-in-the-covid-19-pandemic-a-preliminary-look-at-official-data-20220506.html)) |
| Retail stock | 1.27 months of sales (July 2026) | Shop stock target | Summary ([Census MTIS](https://www.census.gov/mtis/www/data/pdf/mtis_current.pdf)) |
| Retail markup | 1.36–1.50 over goods cost (gross margin 26–33%) | Shop price band | Summary ([Damodaran](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)) |
| Household budget (2024) | Housing 33.4%, transport 17.0%, food 12.9% | Stone–Geary shares | Summary ([BLS CE](https://www.bls.gov/news.release/pdf/cesan.pdf)) |
| Income Gini (2025) | 0.490 before tax, 0.448 after | Taxes, transfers | Summary ([Census P60-289](https://www2.census.gov/library/publications/2026/demo/p60-289.pdf)) |
| Wealth Gini; top 1% share | 0.83 (2022); 31.6–35% | Wealth tax, dividends | Summary ([VoxEU](https://cepr.org/voxeu/columns/us-wealth-inequality-2022-modest-reversal-top-persistent-challenges-below); [FRED](https://fred.stlouisfed.org/series/WFRBST01134)) |
| Saving rate | 4.1% when money is issued; averages 0 with fixed money | Money regime | Summary ([BEA](https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026)) |
| Money velocity | M2 1.418 a year (≈8.5 months of spending held) | Starting cash | Summary ([FRED M2V](https://fred.stlouisfed.org/series/M2V)) |
| BAM macro bands | Unemployment 6.5% ± 2.5 points, collapse above 20%; vacancies ≈13%; Okun ≈ −0.85; Beveridge ≈ −0.27 | Whole loop | Opened ([bam-engine](https://github.com/kganitis/bam-engine)) |

**Two presets.** Lengnick's band implies 2.4–13% margins and 0.25–1.0 months of stock, far below real retail. Keep an exact Lengnick preset for comparison tests, and add a city preset whose shops mark up wholesale cost by 1.36–1.50 and hold 0.8–1.6 months of stock.

**Job search.** Matching 26% job finding with β = 5 visits a month needs only about 6% of visits to find an acceptable vacancy. At that hit rate, π = 0.1 gives about 0.3% job-to-job moves a month against 1.9% quits (up to 2% if vacancies are plentiful), so measure the hit rate first and raise π toward 0.3–0.6 if it is low. Make workers differ so long spells occur; post-jail stigma can supply that.

**Money.** In a stationary fixed-money economy, household saving must average zero, which becomes a ledger test. The replication's starting cash is about 2.2 months of wages (velocity near 5), while M2 implies about 8.5 months of spending. Pick one deliberately and chart velocity.

**Mark-0 and credit.** In the team's own sweep of the [MIT reference code](https://github.com/KarlNaumann/Mark0), run close to the 2015 paper's settings, the economy collapsed when the hiring-to-firing ratio R fell below about 0.6–0.7. Above R ≈ 0.9, a bankruptcy threshold Θ ≤ 1 gave residual unemployment, Θ = 2 self-generated crises and Θ ≥ 3 full employment. With the code's own defaults, Θ ≥ 2 gave full employment and no setting produced crises. The plan's no-overdraft ledger acts like Θ = 0, so expect residual unemployment without cycles; if that is too mild to drive the poverty → crime loop, add a firm credit line as a slider and test it against both tables, since about two payrolls may create cycles or remove them.

**Slider expectations.** A moderate minimum wage should move employment by about ±1%: 138 state increases cost no low-wage jobs over five years ([Cengiz et al.](https://www.nber.org/papers/w25434)). The default wealth tax of 0.25% a month compounds to about 3% a year, which is aggressive ([Jakobsen et al.](https://www.nber.org/papers/w24371)). A guaranteed $1,000 a month cut labour-force participation by 2 points in the 2024 study, and a revision reports 4.2 ([NBER w32719](https://www.nber.org/papers/w32719)).

**Licences.** bam-engine, the Mark0 wrapper and the Lengnick replication are MIT. Jamel and JMAB are GPL-3.0, newwayland's replication is AGPL-3.0, and the Caiani benchmark and the K+S port have no licence, so treat those as study-only.

## Validation method

Twenty seeds per arm only detect effects larger than "large", so claims need paired seeds, about 50 per arm, and a third verdict: Inconclusive. The power figures below are the research team's own computation and assume normally distributed differences; re-run them on a pilot batch for zero-heavy counts such as arrests.

| Seeds per arm | Smallest effect detectable (Vargha–Delaney A; 1% significance, 80% power) | Lowest pass rate shown when every seed passes (95% confidence) |
| --- | --- | --- |
| 20 | 0.81 (beyond "large") | 0.86 |
| 50 | 0.70 | 0.94 |
| 100 | 0.64 (medium) | 0.97 |
| ≈540 | 0.56 (small) | — |

A is the chance that a run under one setting beats a run under the other, with 0.56, 0.64 and 0.71 the standard small, medium and large thresholds ([Vargha–Delaney](https://gist.github.com/timm/5622240)). At a theft elasticity of −0.15, 10% more police is a small effect, so certified claims should compare large contrasts such as tripling police (about −15% theft).

**Verdicts by claim type:**

- **Comparison** ("more police means less theft"): run the same seed list in both arms and a Wilcoxon signed-rank test on the paired differences. Holds when p < 0.01, A ≥ 0.64 and the direction matches; Fails only when significantly reversed; otherwise Inconclusive.
- **Per-seed property** ("prices stay finite"): Wald's sequential test of a 95% against an 85% pass rate accepts after 27 straight passes and rejects after 3 straight failures.
- **Estimate** ("random exchange gives a Gini of 0.5"): passes when its confidence interval lies inside the target ± a stated margin, the equivalence logic of [Axtell, Axelrod, Epstein & Cohen](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf).

A two-stage variant keeps 20 seeds for speed: Holds at once if p < 0.001, stop if A < 0.55, otherwise extend to 50. Apply Holm's correction beyond about 20 claims, pin seed lists in Vitest and re-judge nightly on fresh seeds. Drop claims that follow straight from the rules; ndouglas found 3 of 5 judged results were like that. Note that `simple-statistics`' `wilcoxonRankSum` returns only the rank sum, so use @stdlib/stats-wilcoxon for the signed-rank test and check it once against SciPy.

**Sensitivity analysis.** The plan's sweeps vary one or two sliders around a base point, so they measure local slopes and miss interactions; such points stay inside a ball that fills only 0.25% of a ten-parameter space (own computation). Screen with Morris first: 20 trajectories × 21 points × 10 seeds = 4,200 runs, under two hours on six workers at 10 s a run. Then compute Sobol indices on the 5–8 survivors by exchanging text files with [SALib](https://github.com/SALib/SALib), since npm has no maintained equivalent; full Sobol on 20 parameters is practical only below about 0.5 s per run, so benchmark the headless core at M2.

**Calibrate with patterns.** Pick 4–8 patterns at different levels with numeric bands, such as the crime and economy targets above ([Grimm et al. 2005](https://www.science.org/doi/10.1126/science.1116681)). Run one Latin hypercube sweep of 2,000–5,000 settings at five seeds each, keep the settings that meet every pattern, and hold one or two patterns back. A healthy filter passes 5–10% of settings; below 0.5%, check the model's structure before widening ranges.

**Metamorphic tests** turn transformations into exact fingerprint checks once every random draw is keyed to a stable dot ID and tick, not to array position:

- Multiply all money by 100: goods, jobs, thefts and the Gini stay identical, and money outputs scale exactly.
- Shuffle dot storage order: the ID-sorted fingerprint is unchanged.
- Schedule a policy change of zero size: the run stays bit-identical.
- Remove all thieves: thefts and theft arrests are zero on every tick.
- Rotate or mirror the grid, run two walled-off worlds side by side, or swap two identical goods: outputs map across exactly.

Also dock the arrest submodule against Mesa's Epstein implementation at three levels: identical numbers, the same distribution and the same direction of effects.

**Burn-in and regimes.** Measure burn-in with MSER-5 on series averaged over five seeds, about 20 lines of code ([Hoad et al.](https://higherlogicdownload.s3.amazonaws.com/INFORMS/ef27cc87-0593-4a9b-85b3-52b5bbeae306/UploadedImages/paper77-81.pdf)); as a rule of thumb, multiply the cut-off by 1.5 and fail if it lands in the second half of the run. If one long run's time averages differ from 50-seed averages, report regimes as odds, such as "collapses in 7 of 50 seeds". An in-app tipping gauge built from rolling variance and lag-1 autocorrelation should read "fragility rising" and be calibrated to at most 5% false alarms on stable presets.

**Documentation.** ODD's 2020 update opens with "Purpose and patterns" ([JASSS](https://www.jasss.org/23/2/7.html)), ODD+D adds agents' decision-making ([Müller et al.](https://ethz.ch/content/dam/ethz/special-interest/usys/ites/ecosystem-management-dam/documents/EducationDOC/EM_DOC/Recommended%20readingDOC/Muller_2013.pdf)), and TRACE's eight elements map onto the planned invariants, known-answer tests, sweeps and held-out patterns ([TRACE](https://www2.econ.iastate.edu/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf)). [CoMSES](https://www.comses.net/reviews/) offers peer review and a citable DOI for documented models. All four were seen only in search summaries.

## Engineering gaps

Chrome 150 broke Math-based replay across versions, hidden desktop tabs do not throttle the worker, and the raw WebGL2 renderer the plan's M0 already specifies (about 1 KB) should replace PixiJS in the recommended build. Most findings here come from browser and library source code on GitHub, plus the team's own measurements.

**Deterministic math.** On 100,000 inputs per function, V8 15.0 (Chrome 150, 30 June 2026) disagreed with V8 12.4 on 1.7–17.8% of `sin`, `exp`, `log`, `pow` and `atan2` results, after switching to LLVM libc ([ieee754.cc](https://github.com/v8/v8/blob/15.0-lkgr/src/base/ieee754.cc)). Its `Math.pow` now calls the operating system's pow, and `hypot` still differed from JavaScriptCore on 35.6% of inputs. The [@stdlib](https://github.com/stdlib-js/math-base-special-exp) ports returned identical bits on all 800,000 results across V8 12.4, V8 15.0 and JavaScriptCore; they cost 1.0–1.7× as much as `Math.*` for sin, cos, atan2 and hypot, 1.4–3.4× for exp and log, and 3–10× for pow.

A 4,096-entry sine table built with @stdlib was also bit-identical, at about 16 ns a call and a maximum error of 3 × 10⁻⁷. These are the team's own measurements with Node 22, Deno 2.9.7 and Bun 1.3.14; SpiderMonkey and ARM64 phones were not tested, and neither was Apple's math library, because Bun ran JavaScriptCore on Linux's C library.

| Issue | Finding | Do this | Checked |
| --- | --- | --- | --- |
| Replays | Any Math call left in the core, such as Lengnick's power function, now drifts across Chrome versions and operating systems, and `**` is as approximate as `Math.pow` | Lint-ban `Math` transcendental functions and `**` in sim-core; @stdlib tables in per-agent code and @stdlib calls elsewhere, including Lengnick's (m/P̄)^0.9; replay-hash tests in Node, Bun, Deno, Chromium, Firefox and WebKit | Own measurement; V8 source opened |
| Hidden tabs | Dedicated-worker timers are not throttled in stable Chrome, Safari or Firefox; main-thread timers drop to one wake-up a minute after 60 s; phones freeze background pages | Pause on `visibilitychange`, checkpoint on `pagehide`, resume without catching up; yield through a MessageChannel, since `setTimeout(4)` still clamps | Engine source opened ([DOMTimer.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.cpp)) |
| Renderer | PixiJS 8.22 is 110 KB gzip (WebGL-only + ParticleContainer), 157 KB (Application) and 265 KB (all); an open iOS bug can leave a [permanent black screen](https://github.com/pixijs/pixijs/issues/12224) | Keep the raw WebGL2 instanced dots M0 already specifies (≈1.1 KB) behind a `DotRenderer` interface; one context per page; `preventDefault()` on context loss, then rebuild; Canvas2D fallback, capped near 5,000 dots, when WebGL2 is unavailable | Own measurement (esbuild); issue opened |
| OffscreenCanvas | WebGL2 in workers needs Chrome 69+, Firefox 105+ or Safari 17+; Safari lacks `devicePixelContentBoxSize` there, and WebGL context loss on OffscreenCanvas is undocumented; uPlot needs the DOM | Render on the main thread up to 25k dots; a separate render worker only for the desktop 100k tier; never render in the sim worker | Opened ([MDN compat data](https://github.com/mdn/browser-compat-data)) |
| Phones | No device benchmarks were reachable; WebKit caps canvases at 8192², allows 16 WebGL contexts on the main thread and 4 per worker, and drops to 30 fps in Low Power Mode or when hot | Default 10k dots; 25k only if a 300-tick start-up check keeps 95% of ticks under 1.5 ms; 100k desktop-only; device pixel ratio ≤ 2; charts ≤ 4 Hz; drop a tier if tick time rises 50% for 10 s | WebKit source opened; thresholds are proposals |
| CI | Playwright launches Chromium with background throttling off, and software WebGL draws differently from a GPU | Core on Node, Bun and Deno; worker tests with `@vitest/web-worker` or browser mode; Playwright in Chromium (`--use-angle=swiftshader --enable-unsafe-swiftshader`), Firefox and WebKit, asserting the replay hash at 2,000 ticks, context-loss recovery, pause on hide and pixel statistics | Repos opened |
| Accessibility | "Role is hue" fails WCAG 1.4.1; 2.2.2 requires a pause control; 2.1.1 requires every control to work from a keyboard; 2.3.1 caps flashes at three a second; 1.4.11 needs 3:1 contrast; uPlot has [no accessibility support](https://github.com/leeoniya/uPlot/issues/954) | A shape per role (circle, square, triangle, diamond, ring); start paused under `prefers-reduced-motion`; Play/Pause first in tab order; polite summaries at most every 10 s; a data table per chart | WCAG source opened |

With uPlot (23 KB), Comlink (2 KB) and lil-gui (8 KB), the library budget drops from about 144 KB gzip with PixiJS to about 34 KB.

**Role palettes** that stayed distinguishable under simulated colour blindness and passed 3:1 contrast against #0B0F14 (own computation):

- **4 roles:** Paul Tol muted #DDCC77, #117733, #88CCEE, #AA4499.
- **5 roles:** Petroff #5790FC, #F89C20, #E42536, #964A8B, #9C9CA1.
- **6 roles:** Tol muted #DDCC77, #117733, #44AA99, #999933, #AA4499, #DDDDDD.

Tol's #332288 and #882255 and Petroff's #7A21DD fail contrast on dark backgrounds.

## Presentation, launch and framing

Make readers bet before each run, put bias in the records rather than in the dots, and have a "What this toy leaves out" page live on launch day. Outside Nicky Case's own writing, which is on GitHub, most evidence here is summary-only.

**Teaching patterns:**

- **Bet cards, not rules cards.** Students who only watched a demonstration understood no more than those who skipped it, while predicting first helped significantly ([Crouch et al.](https://mazur.harvard.edu/publications/classroom-demonstrations-learning-tools-or-entertainment), summary). Lock in a prediction before Run, hand-pick the first seeds so the first run shows the effect (and say they were picked), and unlock each city slider after the lab card that introduces it.
- **Case's playtested rules.** Start concrete, add one surprising "BUT" at a time and save the sandbox for the end ([Case](https://github.com/ncase/blog/blob/main/src/posts/how-i-make-an-explorable-explanation.md)). Trust renamed Tit for Tat to "Copycat" so a known name would not give the answer away.
- **Small multiples for analysis, animation for the hook.** In search summaries, animation was slower and less accurate than small multiples ([Robertson et al.](https://dl.acm.org/doi/10.1109/TVCG.2008.125)), and animated outcome draws beat error bars ([Hullman et al.](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0142444)). Show true and recorded crime as two synced panels, and show spread as a flicker of outcomes captioned "in 87 of 100 runs".
- **Colony-sim interface patterns** (summary only): a severity-coloured event feed like RimWorld's letters; one map shading cells by true crime with recorded incidents marked on top, like the police view in Cities: Skylines; two independent meters such as fear and trust, like Frostpunk's hope and discontent; and nested tooltips for follow-the-money, as in Crusader Kings III and Victoria 3.
- **Neutral names.** Call a policy "Hotspot patrol", not "Biased predictor", and keep the `arrestRule` switch in tests and an expert panel.

**The headline card.** Two districts have identical true crime but reporting rates of 0.13 and 0.33, the range found across Bogotá. A predictor trains on recorded crime, and the reader bets where patrols will go before pressing Run. Expect about 2.5× more patrols in the high-reporting district at first, widening as those patrols detect more; [Ensign et al.'s code](https://github.com/algofairness/runaway-feedback-loops-src) models the update as an urn, with an option to add only reported crimes. The widening step needs deliberately dense, labelled patrols, because at calibrated staffing patrols witness little.

The real-world record, seen here only in search summaries, supports the card. Oakland drug arrests ran about 200× higher in two areas despite similar estimated drug use, and a PredPol-style model trained on them would target Black residents at about twice the rate ([Lum & Isaac](https://rss.onlinelibrary.wiley.com/doi/full/10.1111/j.1740-9713.2016.00960.x)). In Plainfield, New Jersey, fewer than 100 of 23,631 predictions matched a later-reported crime of the predicted type ([The Markup](https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes)).

**Framing and ethics:**

- Dots carry only roles and states, with no demographic attributes, names or real places; "thief" is a state a dot enters under pressure.
- Put the asymmetry where the critiques locate it: in reporting, patrol allocation and records. That also answers the standard critique that Schelling-style toys leave institutions out ([American Scientist](https://www.americanscientist.org/article/the-math-of-segregation)).
- Label three views plainly: true crime ("only the simulator knows this"), recorded crime and predicted hotspots.
- Include one scenario where policing visibly cuts true crime, so the lesson is about feedback from records, not "policing is useless" (the team's inference).
- Follow honest precedents. Polygons says "we gave his model a happy ending" and links real data ([Polygons](https://github.com/ncase/polygons/blob/gh-pages/index.html)), and What Happens Next? insisted on "IF WE DO NOTHING". Ship a "What this toy leaves out" page (no courts, simplified reporting, no demographics, no history of redlining) and a "toy, not forecast" note by each chart.

**Launch kit:**

- Playable at the URL with no signup, as [Show HN](https://news.ycombinator.com/showhn.html) requires (summary), with the whole run encoded in the URL like [TensorFlow Playground](https://github.com/tensorflow/playground/blob/master/src/state.ts).
- One 1200 × 600 preview card per scenario with Open Graph tags and alt text, as Trust uses; share text that carries a bet; a 10–20 s clip labelled "one run of many".
- Text in translation-ready files; [Trust](https://github.com/ncase/trust) gathered 50+ community translations.
- Submit to [explorabl.es](https://github.com/explorableexplanations/explorableexplanations.github.io), and time the launch to the news: Polygons (2014) reached 3M plays and Trust (2017) 5M by Case's 2019 count, which [Case credits to timing](https://github.com/ncase/blog/blob/main/src/posts/2010-2019.md).
- Finish accessibility first; Hacker News commenters criticised Trust's low-contrast captions (summary).

**Licences and funding.** MIT code needs its notice kept; Apache-2.0 code needs its licence, change notes and NOTICE contents, which an in-app credits panel can show ([Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)). Release code as MIT or Apache-2.0 and prose and cards as CC BY 4.0 or CC0, stated per part, since [Creative Commons does not recommend its licences for software](https://github.com/github/choosealicense.com/blob/gh-pages/non-software.md). Funding will be modest: Case and Primer each have about 540–640 Patreon members (undated snapshots), and the large sums come from paid editions, such as Dwarf Fortress's $7.23M gross in January 2023 after its Steam release (summary).

## Changes to make

Twenty-six changes, none of them architectural; tick each one off as you fold it into the plan. Each starts with the milestone it first touches.

- [ ] **M0** Lint-ban `Math` transcendental functions and `**` in sim-core; add a deterministic-math module (@stdlib tables for per-agent code, @stdlib calls elsewhere).
- [ ] **M0** Key every random draw to a stable dot ID and tick, not array position, while keeping separate streams per subsystem.
- [ ] **M0** Pause the worker on `visibilitychange`, checkpoint on `pagehide`, resume without catching up, and yield through a MessageChannel.
- [ ] **M0** Settle on the raw WebGL2 instanced dots M0 already specifies, dropping PixiJS from the recommended build, behind a `DotRenderer` interface: one context per page, context-loss handling, Canvas2D fallback capped near 5,000 dots.
- [ ] **M0** Add device tiers (phones 10k, 25k after a start-up check, 100k desktop-only; pixel ratio ≤ 2; phone charts ≤ 4 Hz) in place of the "10k dots at 60 fps" exit test.
- [ ] **M0** Build three-layer CI that asserts identical replay hashes in Chromium, Firefox and WebKit, context-loss recovery and pause on hide.
- [ ] **M0** Show role by shape as well as colour; use a tested palette; put Play/Pause first in tab order; start paused under reduced motion; add chart data tables.
- [ ] **M1** Tag claims as estimate, per-seed property or comparison; judge comparisons on 50 paired seeds per arm (Holds at p < 0.01 and A ≥ 0.64); add Inconclusive and nightly fresh seeds.
- [ ] **M1** Turn rules cards into bet cards that lock in a prediction; hand-pick and label first seeds; use neutral names; unlock city sliders through lab cards.
- [ ] **M2** Add ξ = 0.01 and a separate ψ\_quant = 0.25; document integer-cent rounding; start prices inside 1.025–1.15 × w/63; measure burn-in with MSER-5.
- [ ] **M2** Ship two presets: an exact Lengnick replication, and a city preset with 1.36–1.50 markups and 0.8–1.6 months of stock.
- [ ] **M2** Replace the loose exit bands with the economy targets table, the BAM bands and the Mark-0 phase table.
- [ ] **M2** Log the share of visits that find an acceptable vacancy; raise π toward 0.3–0.6 if the hit rate is low; make workers differ; add a firm credit line only if cycles prove too mild, tested against both Mark-0 tables.
- [ ] **M2** Choose household cash holdings deliberately and chart velocity; target the saving rate only when money is issued; test that household saving averages zero under fixed money.
- [ ] **M3** Optional: idle back-off, shop hours shifted by travel time, day plans made at dawn and one global witness pass.
- [ ] **M4** Default police to about 0.25% (0.2–0.5%), or label police dots as patrol units; keep exaggerated shares to labelled lab cards.
- [ ] **M4** Calibrate realised arrests: test that clearances per true theft land near 3–7% (robbery about 20%), and consider damping Epstein's perceived risk.
- [ ] **M4** Write the Short decay as (1 − ω·δt) with one time step for every rate, never applying ω = 1/15 per hourly update; rescale θ; add the B̄ = θΓ/ω test and the police suppression term.
- [ ] **M4** Add trip lengths, exp(−d/λ) per cell with λ per offender, and displacement: about 25% of deterred offenders move nearby.
- [ ] **M4** Set reporting by crime type within a 2.5× band between districts; add record states from None to Discharged; let legitimacy fall with arbitrary arrests; switch reporting bias and patrol feedback separately.
- [ ] **M4** Keep a tripling test from the new default (about −15% true theft, on paired seeds) and add concentration, a tipping test under deep cuts, recorded-vs-true concentration and 43/66/82% cumulative re-arrest targets.
- [ ] **M5** Add Morris screening, then Sobol indices via SALib, beside the slider sweeps; calibrate against patterns with one or two held out.
- [ ] **M5** Give each slider a size, not just a direction: minimum wage about ±1% employment, welfare −2 to −4 points of participation, Gini about 0.49 → 0.45 after taxes and transfers; flag the 3%-a-year wealth tax.
- [ ] **M6** Make share links replay across browsers; prepare the launch kit; put the "What this toy leaves out" page live at launch.
- [ ] **M6** Write ODD+D with purpose and patterns first, keep a TRACE notebook, submit to CoMSES, and add THIRD\_PARTY\_NOTICES and an in-app credits panel.
- [ ] **Ongoing** Re-check economySim, SocSim and ndouglas/SugarScape weekly until launch; treat GPL, AGPL and unlicensed repositories as study-only.

**Verify before hard-coding** (the figures that rest on summaries and would change a constant):

- [ ] Lengnick's own figures and starting values, from the 2013 paper or the 2011 Kiel working paper (M2 preset).
- [ ] The typical size of a price change and a direct US job-to-job rate (whether ϑ = 2% and π are realistic).
- [ ] Headless runs per second of the core (the sensitivity-analysis budget, at M2).
- [ ] Short et al.'s A0, time step and grid spacing, from the 2008 paper or D'Orsogna and Perc's 2015 review (M4).
- [ ] NCVS 2024 reporting and FBI 2025 clearance by crime type, from the BJS tables and the FBI Crime Data Explorer (M4).
- [ ] Tick times and overheating on an iPhone 13–16 and a mid-range Android (device tiers).
- [ ] Bit-identical @stdlib math in Firefox, on ARM64 and with Apple's math library (the cross-browser replay promise).
- [ ] A manual search of Reddit, Steam and itch.io, plus what ndouglas's "underworld" campaign contains (competitor risk).

## Sources

155 links from the follow-up research, grouped by track. Opened means read in full on GitHub, npm, PyPI or a reachable PDF; summary means seen only in search results, so check it before relying on it. The research notes behind each track hold the full access logs.

**Prior art**

- [AtakanAytar/economySim](https://github.com/AtakanAytar/economySim) · opened
- [pietro-works/SocSim](https://github.com/pietro-works/SocSim) · opened
- [NeoLorenzo/Econ-Engine](https://github.com/NeoLorenzo/Econ-Engine) · opened
- [dotshome/dots](https://github.com/dotshome/dots) · opened
- [Chessiee/ModelingCivilViolence](https://github.com/Chessiee/ModelingCivilViolence) · opened
- [casaisdev/primordial](https://github.com/casaisdev/primordial) · opened
- [zeikar/cimulity](https://github.com/zeikar/cimulity) · opened
- [ndouglas/SugarScape](https://github.com/ndouglas/SugarScape) · opened
- [ndouglas/SugarScape · commits](https://github.com/ndouglas/SugarScape/commits/main) · opened
- [fraferra/agents-world](https://github.com/fraferra/agents-world) · opened
- [SimHacker/micropolis · scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) · opened
- [SimHacker/micropolis · simulate.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/simulate.cpp) · opened
- [tgstation/tgstation · security.dm](https://github.com/tgstation/tgstation/blob/master/code/__DEFINES/security.dm) · opened
- [citybound · households/mod.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/households/mod.rs) · opened
- [citybound · market/mod.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/market/mod.rs) · opened
- [Shadows of Doubt DevBlog 15](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/) · summary
- [flocc on npm](https://registry.npmjs.org/flocc) · opened
- [ncase/crowds](https://github.com/ncase/crowds) · opened
- [Complexity Explorables repositories (GitHub API)](https://api.github.com/search/repositories?q=user:dirkbrockmann&sort=stars&order=desc&per_page=25) · opened
- [Project Sid report (2024-10-31)](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) · opened
- [camel-ai/oasis](https://github.com/camel-ai/oasis) · opened
- [Autopolis](https://github.com/sleuthy-sloth/autopolis) · opened
- [simfile](https://github.com/noopolis/simfile) · opened

**Crime and policing**

- [FBI: Reported Crimes in the Nation 2024, Quick Stats](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf) · opened
- [Levitt 2002](https://github.com/ryansafner/metricsF22/blob/main/files/readings/Levitt-2002.pdf) · opened
- [Chalfin & McCrary 2018](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf) · summary
- [Di Tella & Schargrodsky](https://www.brookings.edu/wp-content/uploads/2016/06/CSS_policeeffect.pdf) · summary
- [FBI: 2025 crime data release](https://www.fbi.gov/news/stories/violent-crime-falls-at-historic-rate-new-fbi-data-show) · summary
- [BJS: Criminal Victimization, 2024](https://bjs.ojp.gov/library/publications/criminal-victimization-2024) · summary
- [Akpinar et al.](https://arxiv.org/abs/2102.00128) · summary
- [Chalfin et al. 2022](https://escholarship.org/content/qt3m116366/qt3m116366.pdf) · summary
- [jjapp/shortBurglary](https://github.com/jjapp/shortBurglary) · opened
- [Short et al. 2008 (ResearchGate)](https://www.researchgate.net/publication/242451455_A_Statistical_Model_of_Criminal_Behavior) · summary
- [arXiv 2605.17709 (Short model with police)](https://arxiv.org/pdf/2605.17709) · summary
- [Gill et al.](https://cebcp.org/wp-content/halloffame/Gill-etal-Testing-Concentration-Crime.pdf) · summary
- [O et al. 2017](https://crimesciencejournal.biomedcentral.com/articles/10.1186/s40163-017-0071-3) · summary
- [arXiv 1902.03105](https://arxiv.org/pdf/1902.03105) · summary
- [POP Center](https://popcenter.asu.edu/content/step-16-study-journey-crime) · summary
- [Ackerman & Rossmo](https://link.springer.com/article/10.1007/s10940-014-9232-7) · summary
- [Buffer-zone review retraction note](https://link.springer.com/article/10.1186/s40163-021-00143-y) · summary
- [Townsley & Sidebottom](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-9125.2010.00205.x) · summary
- [Guerette & Bowers](https://www.researchgate.net/publication/229732660_Assessing_the_extent_of_crime_displacement_and_diffusion_of_benefits_A_review_of_situational_crime_prevention_evaluations) · summary
- [Bowers et al.](https://onlinelibrary.wiley.com/doi/full/10.4073/csr.2011.3) · summary
- [Koper: Just enough police presence (OJP)](https://www.ojp.gov/ncjrs/virtual-library/abstracts/just-enough-police-presence-reducing-crime-and-disorderly-behavior) · summary
- [Raphael & Winter-Ebmer (SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=242571) · summary
- [BJS: recidivism of prisoners released in 24 states, 2008–2018](https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018) · summary
- [Fonoberova et al. (JASSS)](https://www.jasss.org/15/1/2.html) · summary

**Economy**

- [Lengnick replication](https://github.com/avakeeling199/Lengnick-replication) · opened
- [newwayland/baseline-economy](https://github.com/newwayland/baseline-economy) · opened
- [YudiWang/Baseline-Economy](https://github.com/YudiWang/Baseline-Economy) · opened
- [Nakamura & Steinsson](https://ideas.repec.org/a/oup/qjecon/v123y2008i4p1415-1464..html) · summary
- [Montag & Villar, FEDS Note](https://www.federalreserve.gov/econres/notes/feds-notes/price-setting-during-the-covid-era-20230829.html) · summary
- [Grigsby, Hurst & Yildirmaz](https://www.nber.org/papers/w25628) · summary
- [Atlanta Fed](https://www.atlantafed.org/research-and-data/data/wage-growth-tracker) · summary
- [Indeed Hiring Lab: August 2026 JOLTS](https://hiringlab.indeed.com/2026/09/29/august-2026-jolts-report/) · summary
- [BLS flows](https://www.bls.gov/web/empsit/cps_flows_current.htm) · summary
- [BLS Table A-12](https://www.bls.gov/news.release/empsit.t12.htm) · summary
- [BLS TED](https://www.bls.gov/opub/ted/2024/34-7-percent-of-business-establishments-born-in-2013-were-still-operating-in-2023.htm) · summary
- [Business survival rates by state (aggregator)](https://startbusinessbystate.com/business-survival-rates-by-state/) · summary
- [Fed note: business entry and exit](https://www.federalreserve.gov/econres/notes/feds-notes/business-entry-and-exit-in-the-covid-19-pandemic-a-preliminary-look-at-official-data-20220506.html) · summary
- [Axtell 2001](https://www.science.org/doi/10.1126/science.1062081) · summary
- [Census MTIS](https://www.census.gov/mtis/www/data/pdf/mtis_current.pdf) · summary
- [Damodaran](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) · summary
- [BLS: Consumer Expenditures 2024](https://www.bls.gov/news.release/pdf/cesan.pdf) · summary
- [Census P60-289](https://www2.census.gov/library/publications/2026/demo/p60-289.pdf) · summary
- [VoxEU: US wealth inequality in 2022](https://cepr.org/voxeu/columns/us-wealth-inequality-2022-modest-reversal-top-persistent-challenges-below) · summary
- [FRED DFA](https://fred.stlouisfed.org/series/WFRBST01134) · summary
- [BEA: Personal income and outlays, August 2026](https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026) · summary
- [FRED M2V](https://fred.stlouisfed.org/series/M2V) · summary
- [KarlNaumann/Mark0](https://github.com/KarlNaumann/Mark0) · opened
- [arXiv 1307.5319](https://arxiv.org/abs/1307.5319) · summary
- [bam-engine](https://github.com/kganitis/bam-engine) · opened
- [BeforeIT.jl](https://github.com/bancaditalia/BeforeIT.jl) · opened
- [Cengiz et al.](https://www.nber.org/papers/w25434) · summary
- [Jakobsen et al.](https://www.nber.org/papers/w24371) · summary
- [NBER w32719](https://www.nber.org/papers/w32719) · summary

**Validation**

- [Vargha–Delaney code](https://gist.github.com/timm/5622240) · opened
- [SFI working paper](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) · opened
- [simple-statistics · wilcoxon\_rank\_sum.js](https://raw.githubusercontent.com/simple-statistics/simple-statistics/main/src/wilcoxon_rank_sum.js) · opened
- [SALib docs](https://raw.githubusercontent.com/SALib/SALib/main/docs/user_guide/basics.rst) · opened
- [Grimm et al. 2005](https://www.science.org/doi/10.1126/science.1116681) · summary
- [Black-it](https://raw.githubusercontent.com/bancaditalia/black-it/main/README.md) · opened
- [McCulloch et al.](https://eprints.whiterose.ac.uk/id/eprint/185400/) · summary
- [NIST: metamorphic testing](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=932547) · summary
- [Hoad et al.](https://higherlogicdownload.s3.amazonaws.com/INFORMS/ef27cc87-0593-4a9b-85b3-52b5bbeae306/UploadedImages/paper77-81.pdf) · opened
- [earlywarnings](https://raw.githubusercontent.com/earlywarningtoolbox/earlywarnings-R/master/R/generic_ews.R) · opened
- [Boettiger & Hastings](https://arxiv.org/pdf/1210.1204) · summary
- [ODD protocol 2020 update (JASSS)](https://www.jasss.org/23/2/7.html) · summary
- [Müller et al.](https://ethz.ch/content/dam/ethz/special-interest/usys/ites/ecosystem-management-dam/documents/EducationDOC/EM_DOC/Recommended%20readingDOC/Muller_2013.pdf) · summary
- [TRACE (Grimm et al. 2014)](https://www2.econ.iastate.edu/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf) · summary
- [CoMSES](https://www.comses.net/reviews/) · summary

**Engineering**

- [tc39/ecma262 · spec.html](https://github.com/tc39/ecma262/blob/main/spec.html) · opened
- [V8 15.0 ieee754.cc](https://github.com/v8/v8/blob/15.0-lkgr/src/base/ieee754.cc) · opened
- [V8 15.0 flag-definitions.h](https://github.com/v8/v8/blob/15.0-lkgr/src/flags/flag-definitions.h) · opened
- [Firefox Math.cpp](https://github.com/mozilla-firefox/firefox/blob/main/js/src/builtin/Math.cpp) · opened
- [WebKit MathObject.cpp](https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/runtime/MathObject.cpp) · opened
- [stdlib exp](https://github.com/stdlib-js/math-base-special-exp) · opened
- [Chromium worker\_thread\_scheduler.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/worker/worker_thread_scheduler.cc) · opened
- [Chromium scheduler features.h](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.h) · opened
- [WebKit DOMTimer.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.cpp) · opened
- [Firefox StaticPrefList.yaml](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml) · opened
- [Playwright chromiumSwitches.ts](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts) · opened
- [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp) · opened
- [WebKit WebGLRenderingContextBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp) · opened
- [WebKit AnimationFrameRate.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/AnimationFrameRate.cpp) · opened
- [pixijs/pixijs](https://github.com/pixijs/pixijs) · opened
- [pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) · opened
- [WebGL 1.0 specification](https://github.com/KhronosGroup/WebGL/blob/main/specs/latest/1.0/index.html) · opened
- [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) · opened
- [leeoniya/uPlot](https://github.com/leeoniya/uPlot) · opened
- [Vitest browser mode](https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md) · opened
- [Chromium gl\_switches](https://github.com/chromium/chromium/blob/main/ui/gl/gl_switches.cc) · opened
- [WCAG 2.2.2 Pause, Stop, Hide](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/pause-stop-hide.html) · opened
- [WCAG 2.3.1 Three Flashes](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/three-flashes-or-below-threshold.html) · opened
- [WCAG 1.4.1 Use of Color](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/use-of-color.html) · opened
- [WCAG 1.4.11 Non-text Contrast](https://github.com/w3c/wcag/blob/main/guidelines/sc/21/non-text-contrast.html) · opened
- [WCAG 4.1.3 Status Messages](https://github.com/w3c/wcag/blob/main/guidelines/sc/21/status-messages.html) · opened
- [tol-colors (PyPI)](https://pypi.org/project/tol-colors/) · opened
- [Media Queries 5 (prefers-reduced-motion)](https://github.com/w3c/csswg-drafts/blob/main/mediaqueries-5/Overview.bs) · opened
- [uPlot#954](https://github.com/leeoniya/uPlot/issues/954) · opened

**Presentation, launch and framing**

- [Crouch et al. (Mazur group)](https://mazur.harvard.edu/publications/classroom-demonstrations-learning-tools-or-entertainment) · summary
- [PhET interview study (PER-Central)](https://www.per-central.org/items/detail.cfm?ID=12269) · summary
- [Case: How I make an explorable explanation](https://github.com/ncase/blog/blob/main/src/posts/how-i-make-an-explorable-explanation.md) · opened
- [Case: Explorable explanations (2014)](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations.md) · opened
- [Case: 4 more design patterns](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md) · opened
- [Case: Neurotic Neurons design patterns](https://github.com/ncase/blog/blob/main/src/posts/neurotic-neurons-design-patterns.md) · opened
- [ncase/trust · design notes](https://github.com/ncase/trust/blob/gh-pages/notes/index.html) · opened
- [Robertson et al. 2008 (IEEE TVCG)](https://dl.acm.org/doi/10.1109/TVCG.2008.125) · summary
- [Hullman et al.](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0142444) · summary
- [RimWorld Wiki: Events](https://rimworldwiki.com/wiki/Events) · summary
- [Cities: Skylines Wiki: Info views](https://skylines.paradoxwikis.com/Info_views) · summary
- [PC Gamer: Frostpunk on hope and discontent](https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws/) · summary
- [PCGamesN: Victoria 3 nested tooltips](https://www.pcgamesn.com/victoria-3/nested-tooltip-system) · summary
- [Lum & Isaac](https://rss.onlinelibrary.wiley.com/doi/full/10.1111/j.1740-9713.2016.00960.x) · summary
- [runaway-feedback-loops-src](https://github.com/algofairness/runaway-feedback-loops-src) · opened
- [Richardson, Schultz & Crawford (NYU Law Review)](https://www.nyulawreview.org/wp-content/uploads/2019/04/NYULawReview-94-Richardson_etal-FIN.pdf) · summary
- [The Markup 2021: PredPol predictions](https://themarkup.org/prediction-bias/2021/12/02/crime-prediction-software-promised-to-be-free-of-biases-new-data-shows-it-perpetuates-them) · summary
- [The Markup 2023: Plainfield predictions](https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes) · summary
- [American Scientist: The math of segregation](https://www.americanscientist.org/article/the-math-of-segregation) · summary
- [ncase/polygons](https://github.com/ncase/polygons/blob/gh-pages/index.html) · opened
- [Case: Neurotic Neurons simplifications](https://github.com/ncase/blog/blob/main/src/posts/neurotic-neurons-simplifications.md) · opened
- [What Happens Next? words.md](https://github.com/ncase/covid-19/blob/master/words/words.md) · opened
- [Case: 2010–2019](https://github.com/ncase/blog/blob/main/src/posts/2010-2019.md) · opened
- [Show HN guidelines](https://news.ycombinator.com/showhn.html) · summary
- [tensorflow/playground · state.ts](https://github.com/tensorflow/playground/blob/master/src/state.ts) · opened
- [Open Graph protocol](https://github.com/facebook/open-graph-protocol/blob/master/index.html) · opened
- [ncase/trust](https://github.com/ncase/trust) · opened
- [explorabl.es repository](https://github.com/explorableexplanations/explorableexplanations.github.io) · opened
- [Hacker News thread on The Evolution of Trust](https://news.ycombinator.com/item?id=14864183) · summary
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) · opened
- [choosealicense.com · non-software.md](https://github.com/github/choosealicense.com/blob/gh-pages/non-software.md) · opened
- [Nicky Case on Patreon](https://www.patreon.com/ncase) · summary
- [Primer on Patreon](https://www.patreon.com/primerlearning) · summary
- [Game World Observer: Dwarf Fortress revenue](https://gameworldobserver.com/2023/02/02/dwarf-fortress-revenue-7-million-january-bay-12-games) · summary
- [Distill hiatus post](https://github.com/distillpub/post--distill-hiatus/blob/master/index.md) · opened
