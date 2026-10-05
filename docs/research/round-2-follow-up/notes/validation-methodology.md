# Validation, experiment design and sensitivity analysis for the "society of dots" ABM

Conventions used below: **(opened)** = the page or file was fetched and read in this session. **(snippet only)** = only a search-engine result summary was seen, because the host was blocked by the session's egress proxy. Treat those claims as leads to verify. **(computed)** = numbers I computed myself in pure Python: normal location-shift simulations with 3,000–4,000 replications per cell, Noether's sample-size approximation, exact binomial bounds and Wald SPRT boundaries. They are arithmetic, not literature claims, and you can re-run them. Most academic hosts were unreachable (JASSS, arXiv, Springer, ScienceDirect, PLoS, CoMSES, Read the Docs, among others). The reachable hosts were GitHub, raw.githubusercontent.com, gist.github.com, the npm registry and two Amazon S3 buckets. The full access log is in the Gaps of the last section.

## 1. How many replications (seeds) does a stochastic ABM claim need?

### Takeaway
Choose the seed count from three things: the claim type, the smallest effect that matters, and α/power. Do not use a fixed 20 or 50.
- **20 seeds per arm** can only certify very large differences (Vargha–Delaney A of about 0.80 or more at α = 0.01). For per-seed properties, 20/20 passes only shows a pass rate of at least 0.86.
- **50 seeds per arm** detect A = 0.71 with about 88% power at α = 0.01. 50/50 passes show a pass rate of at least 0.94.
- **Medium effects** (A ≈ 0.64) need about 100–130 seeds per arm. **Small effects** (A ≈ 0.56) need about 360–690.
- **"Fails = no meaningful effect"** cannot be shown with 20 or 50 seeds. It needs an equivalence test with about 180 seeds per arm.

### Cited Findings
- **Lorscheid, Heine & Meyer (2012), CV method.** "Opening the 'black box' of simulations…", *Computational and Mathematical Organization Theory* 18:22–62. It uses the coefficient of variation (CV) of outputs and a fixed epsilon (E) limit on that metric to pick the number of runs: run more replications until CV no longer changes. — [Springer](https://link.springer.com/article/10.1007/s10588-011-9097-3) (snippet only); [ResearchGate](https://www.researchgate.net/publication/225160925_Opening_the_'Black_Box'_of_Simulations_Increased_Transparency_and_Effective_Communication_Through_the_Systematic_Design_of_Experiments) (snippet only)
- **How the CV procedure works in practice** (as summarised from Lee et al. 2015, JASSS 18(4)4):
  - Compare CV across growing run sets (e.g., 10, then 100, 500 runs).
  - The minimum run count is the smallest n for which |CV_n − CV_m| < E for all larger m.
  - Do this for every outcome and take the maximum across outcomes.
  - E = 0.01 was offered as an example criterion.
  — [Lee et al. 2015, "The Complexities of Agent-Based Modeling Output Analysis"](https://jasss.soc.surrey.ac.uk/18/4/4.html) (snippet only)
- **Ritter, Schoelles, Quigley & Klein (2011).** "Determining the number of simulation runs: Treating simulations as theories by not sampling their behavior", in *Human-in-the-Loop Simulations* (Springer).
  - A deterministic simulation needs one run.
  - For a stochastic simulation with expensive runs, they suggest a minimum number of runs based on power calculations.
  - With inexpensive runs, they suggest a "maximum necessary" number of runs.
  — [Springer chapter](https://link.springer.com/chapter/10.1007/978-0-85729-883-6_5) (snippet only); [author PDF](https://acs.ist.psu.edu/papers/ritterSQKip.pdf) (snippet only; host blocked)
- **Seri & Secchi, "How Many Times Should One Run a Computational Simulation?"**
  - Recommends statistical power analysis: guess the effect size, fix α, and set a power goal.
  - Conventional ANOVA effect sizes f are small = 0.1, medium = 0.25, large = 0.4.
  - A conservative setting is α = 0.01, power = 0.95, f = 0.1.
  — [Springer chapter](https://link.springer.com/chapter/10.1007/978-3-319-66948-9_11) (snippet only); companion paper [Secchi & Seri 2017, "Controlling for false negatives in agent-based models"](https://ideas.repec.org/a/spr/comaot/v23y2017i1d10.1007_s10588-016-9218-0.html) (snippet only)
- **Vargha–Delaney A12.**
  - Definition: A12 = #(X>Y)/mn + 0.5·#(X=Y)/mn, the probability that X yields a higher value than Y.
  - Vargha & Delaney's thresholds: small > 0.56, medium > 0.64, big > 0.71 (*J. Educ. Behav. Stat.* 25(2):101–132, 2000).
  - That code also offers alternative thresholds of 0.50/0.66/0.75.
  — [gist by T. Menzies (timm)](https://gist.github.com/timm/5622240) (opened)
- **Hoad, Robinson & Davies, "confidence interval method" for replications.**
  - The user sets a precision, defined as the CI half-width as a percentage of the mean, plus a significance level.
  - Replications run, with CIs around the sequential cumulative means, until the precision is reached.
  - A "look ahead" step runs a further set number of replications after first convergence, to avoid "premature convergence".
  - A "fail safe" warns if convergence will take too long.
  — [Hoad, Robinson & Davies, 2009 INFORMS Simulation Society Research Workshop paper](https://higherlogicdownload.s3.amazonaws.com/INFORMS/ef27cc87-0593-4a9b-85b3-52b5bbeae306/UploadedImages/paper77-81.pdf) (opened)
- **sim-tools implementation of that algorithm.** It cites Hoad, Robinson & Davies 2010, *JORS* 61(11):1632–1644.
  - Defaults: α = 0.05, `half_width_precision` = 0.1, `initial_replications` = 3, `look_ahead` = 5, `replication_budget` = 1000.
  - When n > 100, the look-ahead becomes look_ahead/100 · max(n, 100).
  - Its `confidence_interval_method` returns the smallest replication count whose relative half-width is below the target, with default `desired_precision` = 0.1.
  — [TomMonks/sim-tools output_analysis.py](https://raw.githubusercontent.com/TomMonks/sim-tools/master/sim_tools/output_analysis.py) (opened)
- **Docking statistics: Axtell, Axelrod, Epstein & Cohen** (note the second author is Axelrod, not "Axtell" as in the brief).
  - They compared models with a two-sided Mann–Whitney U test on samples of 10 runs. The critical U at 0.05 for n = 10 is 23.
  - They used a Kolmogorov–Smirnov test on samples of 40, with critical value 0.304.
  - KS "was not used … because it has low power for small sample sizes".
  - They warned that the usual null-hypothesis logic "creates an incentive for investigators to test equivalence with small sample sizes".
  - They proposed instead a null such as "the two distributions differ by no more than X percent".
  — [SFI Working Paper 95-07-065](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) (opened); published in [CMOT 1996](https://link.springer.com/article/10.1007/BF01299065) (snippet only)
- **Sequential testing in statistical model checking.**
  - Statistical model checking was pioneered by Younes and Simmons and is based on Wald's sequential probability ratio test (SPRT).
  - It decides from sampled executions whether a property holds.
  - It can accept a hypothesis before all n runs of a fixed (n, c) plan are done, which minimises the number of simulations.
  — [Legay, Delahaye & Bensalem 2010, "Statistical Model Checking: An Overview"](https://arxiv.org/pdf/1005.1327) (snippet only)
- **MultiVeStA** (a statistical analyser for simulators) supports "counterfactual analysis" — whether dynamics "change significantly across different parametrizations" — using t-tests. — [MultiVeStA wiki](https://github.com/andrea-vandin/MultiVeStA/wiki) (opened)
- **JavaScript/TypeScript statistics building blocks** on npm (all from npm registry metadata):
  - `simple-statistics` 7.12.1 (published 2026-09-27) exports `wilcoxonRankSum`, `permutationTest` and `tTestTwoSample`. `wilcoxonRankSum` returns only the rank sum for sampleX, not a p-value.
  - `@stdlib/stats-wilcoxon` (signed-rank test), `@stdlib/stats-kstest` (one-sample KS), `@stdlib/stats-ttest2` and `@stdlib/stats-ranks` are all at 0.2.3 (2026-02-08).
  - `mann-whitney-utest` 1.0.5 dates from 2016; `@tainakanchu/mann-whitney-utest` 1.1.0 from 2024.
  - `pure-rand` 8.4.2 (2026-07-10) is a seeded PRNG library written in TypeScript.
  — [simple-statistics wilcoxon_rank_sum.js](https://raw.githubusercontent.com/simple-statistics/simple-statistics/main/src/wilcoxon_rank_sum.js) (opened); [npm search "mann whitney"](https://registry.npmjs.org/-/v1/search?text=mann%20whitney&size=8) (opened); [npm search "quasi random sobol" (also lists the @stdlib packages and pure-rand)](https://registry.npmjs.org/-/v1/search?text=quasi%20random%20sobol&size=8) (opened); [simple-statistics metadata](https://registry.npmjs.org/simple-statistics) (opened)

### Inferences

**(computed) Mapping between Cohen's d and A.** Under a normal shift, A = Φ(d/√2). So d = 0.2 / 0.5 / 0.8 gives A = 0.556 / 0.638 / 0.714. The 0.56/0.64/0.71 thresholds are simply Cohen's small, medium and large effects.

**(computed) Power of a two-sided Mann–Whitney test between two configurations** (simulated, normal shift):

| seeds/arm | α | A=0.56 | A=0.64 | A=0.71 | A=0.80 |
|---|---|---|---|---|---|
| 10 | 0.05 | 0.07 | 0.19 | 0.37 | 0.69 |
| 10 | 0.01 | 0.01 | 0.04 | 0.12 | 0.36 |
| 20 | 0.05 | 0.09 | 0.32 | 0.66 | 0.95 |
| 20 | 0.01 | 0.03 | 0.13 | 0.40 | 0.80 |
| 30 | 0.05 | 0.13 | 0.46 | 0.82 | 0.99 |
| 50 | 0.05 | 0.18 | 0.69 | 0.97 | 1.00 |
| 50 | 0.01 | 0.06 | 0.44 | 0.88 | 1.00 |
| 100 | 0.01 | 0.13 | 0.82 | 1.00 | 1.00 |

**(computed) Seeds per arm from Noether's approximation**, N_total = (z₁₋α/₂ + z₁₋β)² / (3(A−0.5)²):

| α, power | A = 0.56 | A = 0.64 | A = 0.71 | A = 0.80 |
|---|---|---|---|---|
| α = 0.05, 80% | 364 | 67 | 30 | 15 |
| α = 0.01, 80% | 541 | 100 | 45 | 22 |
| α = 0.01, 90% | 689 | 127 | 57 | 28 |

**(computed) Minimum detectable A at 80% power:**

| seeds/arm | α = 0.05 | α = 0.01 |
|---|---|---|
| 20 | 0.76 | 0.81 |
| 50 | 0.66 | 0.70 |
| 100 | 0.61 | 0.64 |

**(computed) Â is noisy.**
- The 95% range of Â under no effect is [0.32, 0.68] at n = 20 and [0.39, 0.61] at n = 50.
- When the true A = 0.71, the 95% range is [0.55, 0.86] at n = 20 and [0.61, 0.81] at n = 50.
- The 95% half-width of Â near 0.5 is ±0.18 at n = 20, ±0.11 at n = 50, ±0.08 at n = 100, ±0.06 at n = 180 and ±0.046 at n = 300.

**(computed) Combining a p-value threshold with an Â threshold has hidden costs.**
- At 50 seeds/arm, p < 0.01 by itself already implies Â ≥ about 0.65. At 20 seeds/arm it implies Â ≥ about 0.74.
- So "A ≥ 0.71 and p < 0.01" at 50 seeds passes only 53% of the time when the true A = 0.71, and 80% when the true A = 0.75.
- The rule "p < 0.01 and Â ≥ 0.64" passes 87% of the time at A = 0.71 and 98% at A = 0.75.
- Its false-"Holds" rate is 0–1% when A = 0.5, and 6% when A = 0.56.

**(computed) Per-seed property claims** ("in each seed the Gini ends in [0.45, 0.55]"). One-sided 95% Clopper–Pearson lower bound on the pass probability:

| result | lower bound on pass rate |
|---|---|
| 20/20 | 0.861 |
| 19/20 | 0.784 |
| 50/50 | 0.942 |
| 49/50 | 0.909 |
| 59/59 | ≥ 0.95 (the classic "59 runs" for 95/95) |
| 100/100 | 0.970 |
| 300/300 | 0.990 |

The rule of three gives a failure-rate upper bound of about 3/n (15% at n = 20, 6% at n = 50).

**(computed) How often a fixed seed list catches a rare failure.** With a true per-seed failure rate of 5%, at least one failure appears in 64% of 20-seed suites and 92% of 50-seed suites. With a 1% failure rate the figures are 18% (n = 20), 39% (n = 50) and 63% (n = 100).

**(computed) Estimation claims.**
- The 95% t-based CI half-width of a mean is ±0.47 SD at n = 20, ±0.28 SD at n = 50, ±0.20 SD at n = 100 and ±0.10 SD at n = 400.
- To reach a half-width of E (in SD units) you need n = (1.96/E)². That is 16 runs for 0.5 SD, 62 for 0.25 SD, 97 for 0.2 SD and 385 for 0.1 SD.

**(computed) Sequential testing of per-seed properties with Wald's SPRT** (Bernoulli; H0: p ≥ 0.95 vs H1: p ≤ 0.85; α = β = 0.05):
- Accept "Holds" after 27 straight passes. Each failure costs about 10 extra passes.
- Reject after 3 straight failures.
- With α = β = 0.01, acceptance needs 42 straight passes.
- For H0: p ≥ 0.99 vs H1: p ≤ 0.95 (α = β = 0.05), acceptance needs 72 passes and each failure costs about 39.

**(computed) Fixed-n bound for probability estimates.** The Chernoff–Hoeffding (Okamoto) bound n ≥ ln(2/δ)/(2ε²) needs 185 runs for ±0.10 at 95% confidence and 738 runs for ±0.05.

**(computed) Two-stage scheme for comparisons.**
- Stage 1: run 20 seeds/arm. Declare "Holds" if p < 0.001. Stop as "not large" if Â < 0.55.
- Stage 2: otherwise extend to 50 seeds/arm and declare "Holds" if p < 0.01 and Â ≥ 0.64.
- Total type-I error is at most 0.011 by the union bound.
- Results: P(Holds) = 0.87 at A = 0.71 and 0.00 at A = 0.5. Mean total runs (both arms) are 90 at A = 0.71 and 42 at A = 0.9, versus 100 for a fixed 50/arm design.

**(computed) What the conservative Seri & Secchi setting implies.** For two groups, f = 0.1 means d = 0.2. With α = 0.01 and power 0.95, that needs about 891 seeds per arm. Use it only when small effects are the point.

**Recommended "Holds / Fails / Inconclusive" procedure** (inference):
1. **Tag each claim's type:**
   - **E** — estimate or known answer, e.g., random-exchange Gini → 0.5.
   - **P** — per-seed property.
   - **C** — comparison or direction, e.g., slider ↑ ⇒ thefts ↓.
2. **C claims:**
   - Use common random numbers: the same seed list in both arms.
   - Run 50 seeds/arm and a two-sided Mann–Whitney test. A one-sided test is allowed only if the direction was pre-registered.
   - **Holds** if p < 0.01, Â ≥ 0.64 and the direction matches the prediction. **Fails** if the effect is significantly reversed (p < 0.01 with Â ≤ 0.36). Otherwise **Inconclusive**, never "Fails".
   - If the predicted effect is only medium, use about 130 seeds/arm.
   - Report Â with a percentile-bootstrap CI (e.g., 2,000 resamples).
3. **P claims:** use the SPRT above (p0 = 0.95, p1 = 0.85), capped at 100 seeds, or a fixed 59 seeds with all passing.
4. **E claims:**
   - Use equivalence, not "failure to reject". **Holds** if the 95% CI of the mean lies inside target ± δ, as Axtell et al. suggested for equivalence.
   - Size n with (1.96σ/δ)², or run the Hoad replications algorithm (precision 5–10%, look-ahead 5).
5. **"No effect" claims:** these need the CI of A inside [0.44, 0.56], which takes about 180 seeds/arm.
6. **Multiple claims:** a suite of K claims each at α = 0.01 expects about 0.01·K false "Holds" when nothing is real. Use Holm's correction if K exceeds about 20.

**Common random numbers** (inference): if the paired outputs from the two arms have correlation ρ, the paired effect grows by 1/√(1−ρ). For ρ = 0.5 that halves the seeds needed (computed). Analyse paired seeds with a Wilcoxon signed-rank test on the differences (`@stdlib/stats-wilcoxon`).

**Critique of the CV method** (inference): CV stability measures how precisely mean and SD are estimated for one configuration. It says nothing about power to tell two configurations apart. It is unstable for outputs whose mean is near 0 (net flows, changes). The E cut-off is arbitrary. Use it, if at all, only as a sanity floor.

**CI hygiene** (inference):
- Keep fixed seed lists in Vitest so verdicts are deterministic and never flaky.
- Add a nightly job with fresh seeds (e.g., derived from the date) that re-judges every claim. A verdict that changes on fresh seeds was over-fitted to the seed list.

**TypeScript implementation** (inference): about 60 lines in total.
- Mann–Whitney: mid-ranks plus the tie-corrected normal approximation. For n ≤ 20 or many ties, use a permutation p-value (`simple-statistics` has `permutationTest`).
- A = U_y/(m·n), consistent with the A12 formula above.
- Percentile bootstrap for the CI of A.
- Cross-check once against SciPy in a fixture test.

### Gaps
- None of these could be opened: Lorscheid et al., Ritter et al., Seri & Secchi, Lee et al., or Arcuri & Briand's guide for randomized algorithms. Their formulas and exact recommendations are therefore not quoted.
- I could not verify Ritter et al.'s exact run-count formula, or whether Lorscheid et al. recommend a specific E value. "E = 0.01" comes only from the search tool's paraphrase.
- Noether's formula is from background knowledge. The simulated power table cross-checks it: Noether gives 30/arm for A = 0.71 at α = 0.05 and 80% power, and simulation gives 0.82 power at 30/arm.
- All power numbers assume a normal location shift. Heavy-tailed, bimodal or count outputs with many ties (e.g., arrests = 0 in many seeds) change power. Re-run the power simulation on pilot seeds of the real metrics.
- I found no source explaining why ndouglas/SugarScape uses 20 or 50 seeds.

## 2. Global sensitivity analysis: Morris, Sobol, LHS, why OFAT misleads, tools, and a TypeScript pipeline

### Takeaway
For 10–20 parameters, use a two-stage design.
- **Stage 1, screening with Morris:** r = 20 trajectories gives r(k+1) = 420 design points for k = 20. With 10 seeds per point that is 4,200 runs, under 2 hours on 6 workers even at 10 s/run.
- **Stage 2, Sobol on the 5–8 parameters that survive:** for k = 8 and N = 1024 that is 10,240 design points for first- and total-order indices, or 18,432 including second order. With 5 seeds per point that is 51k–92k runs.
- **Cheaper alternative:** compute the "given-data" indices (RBD-FAST, delta, PAWN) from one LHS sweep of about 2,000 points × 5 seeds.

No maintained JavaScript GSA library exists on npm in 2026. The practical pipeline is: Node/Bun runs the simulations, writes text files, and SALib (Python) does the sampling and analysis.

### Cited Findings
- **Sobol sampler sizes (SALib).**
  - With second-order indices (the default), the sample matrix has N·(2D+2) rows. Without them it has N·(D+2) rows.
  - N should be "ideally a power of 2".
  - Skipping initial points is "not recommended"; use `scramble` instead.
  - References: Sobol' 2001, Saltelli 2002, Campolongo et al. 2011, Owen 2020.
  — [SALib sample/sobol.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/sample/sobol.py) (opened)
- **SALib worked example.** N = 1024 and D = 3 give 8,192 samples, because "The Saltelli sampler generates N*(2D+2) samples". `calc_second_order=False` gives N*(D+2). — [SALib basics.rst](https://raw.githubusercontent.com/SALib/SALib/main/docs/user_guide/basics.rst) (opened)
- **Models not written in Python (SALib).** "If the model is not written in Python, then the samples can be saved to a text file … Each line in `param_values.txt` is one input to the model. The output from the model should be saved to another file with a similar format: one output on each line" (loaded with `np.loadtxt`). Negative index values are "computing errors" that "typically … shrink as the number of samples increases". — [SALib basics.rst](https://raw.githubusercontent.com/SALib/SALib/main/docs/user_guide/basics.rst) (opened)
- **Wrapping external programs (SALib).** For an external program, "a pragmatic approach could be to use subprocess to start the external program, then read in the results". — [SALib wrappers.rst](https://raw.githubusercontent.com/SALib/SALib/main/docs/user_guide/wrappers.rst) (opened)
- **Sobol analysis defaults (SALib).**
  - Defaults are `num_resamples=100` (bootstrap) and `conf_level=0.95`.
  - It returns S1, S1_conf, ST and ST_conf (plus S2 when second order is on).
  - First- and total-order estimators follow Saltelli et al. 2010; the second-order estimator follows Saltelli 2002.
  — [SALib analyze/sobol.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/analyze/sobol.py) (opened)
- **SALib FAQ.**
  - Sobol outputs are normalised by their standard deviation, because estimates "can be biased" for non-centred outputs. Non-normalised outputs "requires larger sample sizes for the indices to converge".
  - "DMIM, RBD-FAST, PAWN and HDMR methods are 'given-data' approaches and can be independently applied" to pre-existing results.
  — [SALib faq.rst](https://raw.githubusercontent.com/SALib/SALib/main/docs/user_guide/faq.rst) (opened)
- **Morris analysis (SALib).**
  - Returns `mu`, `mu_star` (mean of absolute elementary effects), `sigma` and `mu_star_conf`, with defaults `num_levels=4`, `num_resamples=100`, `conf_level=0.95`.
  - `sigma` "is used as an indicator of interactions between parameters".
  - Following Campolongo et al., compare `mu_star` with `mu`: low `mu` with high `mu_star` means effects of different signs.
  — [SALib analyze/morris.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/analyze/morris.py) (opened)
- **Morris sampler (SALib).**
  - Supports vanilla Morris, Campolongo's optimised trajectories and groups.
  - Campolongo generates "a high number of possible trajectories (500 to 1000 in [2])" and selects the r with the highest spread.
  - Brute-force optimisation is advised up to 4 levels from a pool of 100. Ruano's local optimisation, the default, allows more.
  - The output matrix has (G/D+1)·N/T rows. Without groups that is (D+1) rows per trajectory, i.e. r(k+1) model evaluations.
  — [SALib sample/morris/morris.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/sample/morris/morris.py) (opened)
- **Latin hypercube sampling (SALib)** cites McKay, Beckman & Conover 1979 and Iman, Helton & Campbell 1981. — [SALib sample/latin.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/sample/latin.py) (opened)
- **SALib method list:** Sobol, Morris (incl. groups and optimal trajectories), Radial OAT, eFAST, RBD-FAST, Delta moment-independent, DGSM, Shapley effects, fractional factorial, HDMR, PAWN and regional sensitivity analysis. MIT licence. Cite Herman & Usher 2017 (JOSS 2(9)) and Iwanaga et al. 2022 (Socio-Environmental Systems Modelling 4:18155). — [SALib GitHub README](https://github.com/SALib/SALib) (opened)
- **SALib has a command-line interface** (`salib sample <method>` / `salib analyze <method>`) built from argparse subparsers. — [SALib scripts/salib.py](https://raw.githubusercontent.com/SALib/SALib/main/src/SALib/scripts/salib.py) (opened)
- **The JavaScript ecosystem on npm** (registry searches):
  - `sobol` 1.1.4, last published 2019-08-22, only generates Sobol quasi-random sequences.
  - `lobos` 0.10.0 (2020-02-15) provides "Sobol sequences for Scala and Javascript".
  - Searches found no npm package implementing Morris elementary effects or Sobol/FAST indices.
  - The only LHS hit was a 2026 risk-simulation engine, `@veenie/risk` 0.2.0, described as "Monte Carlo & Latin Hypercube Risk Simulation Engine".
  — [npm search "sensitivity analysis sobol"](https://registry.npmjs.org/-/v1/search?text=sensitivity%20analysis%20sobol&size=20) (opened); [npm search "latin hypercube"](https://registry.npmjs.org/-/v1/search?text=latin%20hypercube&size=8) (opened); [npm search "sensitivity analysis morris"](https://registry.npmjs.org/-/v1/search?text=sensitivity%20analysis%20morris&size=8) (opened)
- **EMA Workbench** (Delft, Python ≥ 3.9) supports experiment design, parallel execution on a single machine or cluster, and analysis. It has connectors to NetLogo, Vensim, Simio, Vadere and Excel, so it is an alternative orchestrator to raw SALib. — [EMAworkbench README](https://raw.githubusercontent.com/quaquel/EMAworkbench/master/README.md) (opened)
- **ten Broeke, van Voorn & Ligtenberg (2016), "Which Sensitivity Analysis Method Should I Use for My Agent-Based Model?",** JASSS 19(1)5, DOI 10.18564/jasss.2857. This is the canonical ABM comparison of OFAT, Morris and Sobol, but its content could not be read. — [WUR research portal](https://research.wur.nl/en/publications/which-sensitivity-analysis-method-should-i-use-for-my-agent-based/) (snippet only)

### Inferences
- **Why one-factor-at-a-time misleads** (inference; geometry computed):
  - OFAT moves one parameter at a time from a base point, so it measures local slopes at that point. It cannot see interactions, such as "police only matter when thieves are many and wages low".
  - It also mis-ranks parameters whose effects are non-monotone.
  - Geometrically, every OFAT point lies on the axes through the centre, inside the ball inscribed in the hypercube. That ball fills 0.25% of the space at k = 10 and 2.5×10⁻⁸ at k = 20 (computed). Almost all joint-extreme regions are never visited.
  - Morris's `sigma` and Sobol's ST − S1 gap measure exactly what OFAT misses.
- **(computed) Run budgets.** The number of runs is design points × seeds per point:

| k | Morris r=10 / 20 / 50 | Sobol N(k+2), N=512 / 1024 | Sobol N(2k+2), N=512 / 1024 |
|---|---|---|---|
| 10 | 110 / 220 / 550 | 6,144 / 12,288 | 11,264 / 22,528 |
| 15 | 160 / 320 / 800 | 8,704 / 17,408 | 16,384 / 32,768 |
| 20 | 210 / 420 / 1,050 | 11,264 / 22,528 | 21,504 / 43,008 |

- **(computed) Wall-clock time on 6 worker threads** (the formula is runs × seconds-per-run / 6 / 3600):

| Design | Runs | 0.1 s/run | 0.5 s/run | 2 s/run | 10 s/run |
|---|---|---|---|---|---|
| Morris, k = 20, r = 20, × 10 seeds | 4,200 | < 0.1 h | 0.1 h | 0.4 h | 1.9 h |
| LHS, 1,000 points × 10 seeds | 10,000 | < 0.1 h | 0.2 h | 0.9 h | 4.6 h |
| Sobol, k = 10, N = 1024, first + total, × 5 seeds | 61,440 | 0.3 h | 1.4 h | 5.7 h | 28 h |
| Sobol, k = 20, N = 512, first + total, × 10 seeds | 112,640 | 0.5 h | 2.6 h | 10.4 h | 52 h |
| Sobol, k = 20, N = 1024, with second order, × 10 seeds | 430,080 | 2 h | 10 h | 40 h | 199 h |

  Conclusion: full Sobol on all 20 parameters is only practical if a run takes ≤ 0.5 s. Otherwise screen first.
- **Handling stochasticity in GSA** (inference):
  - Run s seeds (5–10) per design point. Analyse the mean across seeds and, separately, the across-seed SD (which parameters drive unpredictability).
  - Report the noise share: the average within-point variance divided by the total variance across design points. If it exceeds about 20%, raise s or N, because seed noise inflates and destabilises the indices.
  - Do not treat the seed as a Sobol factor.
  - Convergence check: if the bootstrap ST_conf exceeds about 0.05–0.10 for the top parameters, double N.
- **Practical pipeline for the TypeScript core** (inference):
  1. Keep `params.json` with name, bounds and distribution for each slider. The same table goes into the ODD+D parameter table (Section 6).
  2. In Python, use `SALib.sample.morris` / `sobol` / `latin` and write `X.txt`, one row per design point (`np.savetxt`).
  3. Run `node --experimental-strip-types sweep.ts` or `bun sweep.ts`. A `worker_threads` pool of cores − 1 workers runs the headless core for each (row, seed). Seed = hash(row index, replicate). Each run writes a JSONL record with all outputs, the git SHA and the preset hash.
  4. Aggregate per design point into `Y_<metric>.txt`, one value per line in X order.
  5. Run `SALib.analyze` per metric, save JSON, and plot μ\*/σ or S1/ST bars.

  Writing your own Sobol estimators in TypeScript is possible (about 100 lines plus the `sobol` package for sequences), but SALib is the reference implementation. Use it at least to cross-check.
- **Given-data shortcut** (inference based on the SALib FAQ): a single LHS or Sobol-sequence sweep (e.g., 2,000 points × 5 seeds = 10k runs) can be reused three ways. It drives the RBD-FAST, delta and PAWN indices for all 20 parameters, the POM/ABC filtering in Section 3, and the surrogate training data.

### Gaps
- I could not open ten Broeke et al. 2016, Thiele et al. 2014 ("cookbook", JASSS 17(3)11) or Lee et al. 2015. Their specific recommendations (e.g., replicates per point, how to handle stochastic outputs in Sobol) are not verified.
- SALib's exact CLI flags and latest version/date were not verified: PyPI rendered an error page and Read the Docs was blocked. Check `salib sample sobol -h` locally.
- I did not check GitHub (only npm) for JavaScript GSA ports.
- Run-time figures are hypothetical (0.1–10 s/run). Measure the real sim's runs per second headless.

## 3. Calibration and estimation methods practical for a solo developer

### Takeaway
For a stylised "society of dots" without a real dataset, use pattern-oriented modelling (POM) as rejection filtering.
- Define 4–8 quantitative patterns with tolerances.
- Run one LHS sweep (2–5k points × 5 seeds).
- Keep the parameter sets that meet all patterns.
- Hold back 1–2 patterns for corroboration.

Escalate only if needed:
- Method of simulated moments (MSM) with Black-it (Python, wraps any simulator) when you want point estimates.
- History matching plus approximate Bayesian computation (ABC) when runs are slow and you want credible ranges.
- Machine-learning surrogates (Lamperti et al.) when runs are very slow.

### Cited Findings
- **Pattern-oriented modelling: Grimm et al. 2005**, "Pattern-Oriented Modeling of Agent-Based Complex Systems: Lessons from Ecology", *Science* 310(5750):987–991. It presents POM as a unifying strategy for agent-based complex systems such as ecosystems, markets and cities. — [Science](https://www.science.org/doi/10.1126/science.1116681) (snippet only)
- **ODD 2020 builds patterns in:** its first element, "Purpose and patterns", requires naming the patterns that "serve as model evaluation criteria"; patterns are new in the 2020 update. — [Grimm et al. 2020, JASSS 23(2)7](https://www.jasss.org/23/2/7.html) (snippet only)
- **Black-it (Bank of Italy), "Black-box abm calibration kit".**
  - Python ≥ 3.9; JOSS DOI 10.21105/joss.04622.
  - It calibrates "agent-based models and simulations (ABMs)" by looping: samplers propose parameters, the model runs, a loss scores the fit, and samplers exploit past losses.
  - Example: `Calibrator(samplers=[HaltonSampler, RandomForestSampler, BestBatchSampler], loss_function=MethodOfMomentsLoss(), ...)` with `cal.calibrate(n_batches=15)`.
  — [black-it README](https://raw.githubusercontent.com/bancaditalia/black-it/main/README.md) (opened)
- **Black-it components.**
  - Samplers: RandomUniform, Halton, R-sequence, BestBatch, GaussianProcess, RandomForest, XGBoost and ParticleSwarm.
  - Losses: Fourier, Minkowski, MethodOfMoments and GSL-div.
  - The XGBoost sampler is "based on a xgboost surrogate model of the loss function" and cites Lamperti, Roventini & Sani.
  — [black-it docs/samplers.md](https://raw.githubusercontent.com/bancaditalia/black-it/main/docs/samplers.md) (opened); [docs/losses.md](https://raw.githubusercontent.com/bancaditalia/black-it/main/docs/losses.md) (opened); [samplers/xgboost.py](https://raw.githubusercontent.com/bancaditalia/black-it/main/black_it/samplers/xgboost.py) (opened)
- **Lamperti, Roventini & Sani 2018,** "Agent-based model calibration using machine learning surrogates", *JEDC* 90:366–389.
  - Starts from a Sobol-sampled set of parameter points.
  - Runs subsets through the ABM and labels each point positive or negative by a user-defined criterion.
  - Uses a non-parametric ML surrogate to explore the space cheaply.
  — [RePEc working-paper entry](https://ideas.repec.org/p/ssa/lemwps/2017-11.html) (snippet only)
- **Platt 2020, comparison of calibration methods.**
  - "A Comparison of Economic Agent-Based Model Calibration Methods" found the Bayesian estimation procedure of Grazzini et al. (2017) "consistently outperformed" several simulated-minimum-distance methods.
  - The same search summary reports that Carrella (2021), testing 41 models, found no method clearly outperforms the others.
  — [Platt, RePEc/arXiv 1902.05938](https://ideas.repec.org/p/arx/papers/1902.05938.html) (snippet only; the Carrella claim comes from the same aggregated search summary and was not traced to its source)
- **Approximate Bayesian computation tooling: pyABC** is "a massively parallel, distributed, and scalable ABC-SMC … framework for parameter estimation of complex stochastic models" (Python ≥ 3.11). — [pyABC README](https://raw.githubusercontent.com/ICB-DCM/pyABC/main/README.md) (opened)
- **History matching tooling: hmer** (R).
  - Builds emulators — statistical approximations of model output trained on a small number of runs.
  - Then performs history matching, "where unfeasible parts of the parameter space are ruled out", iterating with new samples from the remaining region.
  — [hmer README](https://raw.githubusercontent.com/andy-iskauskas/hmer/master/README.md) (opened)
- **History matching tooling: mogp-emulator** (Alan Turing Institute). Its `HistoryMatching` class computes implausibility, "a number of standard deviations between the emulator mean" and the observation. It has a default `threshold=3.` for ruling points out (NROY = "not ruled out yet"). — [mogp_emulator/HistoryMatching.py](https://raw.githubusercontent.com/alan-turing-institute/mogp-emulator/main/mogp_emulator/HistoryMatching.py) (opened)
- **McCulloch et al. 2022 (JASSS 25(2)1),** "Calibrating Agent-Based Models Using Uncertainty Quantification Methods". It uses history matching to rule out implausible regions and cut the search space and cost, then ABC to get credible intervals. — [White Rose eprint](https://eprints.whiterose.ac.uk/id/eprint/185400/) (snippet only)
- **TRACE corroboration rule.** "Model output corroboration" compares predictions with independent data and patterns "that were not used, and preferably not even known", during development, parameterisation and verification. — [Grimm et al. 2014 TRACE PDF](https://www2.econ.iastate.edu/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf) (snippet only)

### Inferences
- **Practicality ranking for one person** (inference):
  1. POM rejection filter. Days of work, uses the existing sweep harness and is fully in TypeScript.
  2. Rejection ABC on summary statistics (also TypeScript; it is the same filter with a distance and a tolerance).
  3. MSM with Black-it, via a Python wrapper that calls the Node simulator through `subprocess`.
  4. History matching with emulators (hmer or mogp), then ABC in the NROY region, following McCulloch et al. Worth it only if a run takes seconds or more.
  5. Surrogate calibration (XGBoostSampler) for very slow runs.

  Full likelihood-based Bayesian estimation is not worth it here, since there is no real data to fit.
- **A POM recipe for this sim** (inference):
  - Choose patterns from different levels:
    - Macro: wealth Gini band, unemployment band, mean price stability.
    - Spatial: theft concentration (share of thefts in the top 10% of cells).
    - Dynamic: crime responds to police with a lag; recovery time after a shock.
    - Micro: distribution of thief career lengths.
  - Each pattern needs a numeric band, and ideally a literature source for the band. The values are yours to source; none are provided here.
  - Treat each pattern as pass/fail per parameter point, using the median over 5 seeds.
  - Report the accepted fraction, the accepted marginal ranges, and the patterns that no point meets. That last list is structural evidence that a mechanism is missing.
  - Keep 1–2 patterns out of the filter and check them afterwards (TRACE "corroboration").
- **Reusing the sweep** (inference): use the same LHS sweep as in Section 2. If 5–10% of points pass, that is a healthy filter. If fewer than 0.5% pass, check the structure of the model before tuning ranges.
- **Using Black-it with a Node core** (inference): Black-it calls a Python `model(theta, N, seed)` function. Implement it as a `subprocess.run(["node", "headless.js", json.dumps(theta), str(seed)])` call that returns a time series. MSM moments can be the per-tick aggregates you already log.

### Gaps
- None of these could be opened: Grimm 2005, Thiele et al. 2014 (with its categorical POM criteria and NetLogo/R recipes), Lamperti 2018, Platt 2020 or McCulloch 2022. Their run counts (e.g., model evaluations needed, speed-ups) are not verified.
- I did not find Black-it's guidance on batch sizes or the number of batches for a given parameter count. The README example uses `batch_size = 8` and `n_batches = 15`.
- Grazzini, Richiardi & Tsionas 2017 (Bayesian estimation of ABMs) and method-of-simulated-moments references (e.g., Franke & Westerhoff) were not opened.

## 4. Testing without exact oracles: metamorphic testing, docking, statistical model checking, and metamorphic relations for this sim

### Takeaway
Treat metamorphic relations (MRs) as the oracle substitute.
- If the RNG is stream-per-entity, many MRs for this sim can be **exact**: identical fingerprints after a transformation. Examples are nominal rescaling, agent-order permutation, the null intervention, label swaps and the disjoint union.
- The rest are **distributional** and use the equivalence logic from Section 1.
- Docking (Axtell et al.) adds three graded standards for comparing two implementations: numerical identity, distributional equivalence and relational equivalence.
- Statistical model checking provides SPRT-based "P(property) ≥ θ" checks.

### Cited Findings
- **Olsen & Raunak 2019,** "Increasing Validity of Simulation Models Through Metamorphic Testing", *IEEE Transactions on Reliability* 68(1):91–108. The companion paper "Metamorphic Validation for Agent-Based Simulation Models" appeared at SummerSim'16 (Montreal) and was nominated for best paper. — [Olsen CV](http://www.cs.loyola.edu/~olsen/OlsenCV.pdf) (snippet only); [ACM DL entry](https://dl.acm.org/doi/10.5555/3015574.3015607) (snippet only; blocked when fetched)
- **Metamorphic validation of simulations** uses sets of related input–output combinations ("pseudo-oracles") to raise confidence in a simulation model. It searches for inconsistencies by identifying metamorphic properties of the model. It has been applied to agent-based, discrete-event and hybrid simulation models. — [NIST: Metamorphic Testing for Hybrid Simulation Validation](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=932547) (snippet only); [NIST: Metamorphic Testing on the Continuum of V&V of Simulation Models](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=931851) (snippet only)
- **LLM-generated metamorphic relations.** A 2026 arXiv paper automates requirement extraction, metamorphic-relation generation and test generation with LLM-based agents for dynamic simulation models. — [arXiv 2605.25101](https://arxiv.org/html/2605.25101) (snippet only)
- **Docking setup (Axtell, Axelrod, Epstein & Cohen).** They "docked" Sugarscape against Axelrod's culture model. In 11 of 12 comparisons the distributions were statistically indistinguishable. — [SFI WP 95-07-065](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) (opened)
- **Where docking broke down** (same paper):
  - The 20×20 lattice case failed a KS test: statistic 0.5 > 0.304; ACM mean 16.25 vs Sugarscape mean 9.23.
  - The cause was **activation order**. Sugarscape's scheme gave agents a "fair" share of activations, whereas the culture model sampled agents with replacement. Switching made all cases indistinguishable.
  - A second subtle difference: the culture model changed the *active* agent, while Sugarscape changed the *neighbour*. Edge agents have fewer neighbours, so the two give different results.
  — [SFI WP 95-07-065](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) (opened)
- **Three standards of equivalence:** 'numerical identity', 'distributional equivalence' and 'relational equivalence' (the latter meaning the same qualitative relationships, e.g., non-monotonicity in lattice size). — same source (opened)
- **Cost and documentation lessons from docking** (same source):
  - Docking took about 23 hours (Axelrod) plus 37 hours (Axtell).
  - Published descriptions were insufficient. Alignment required contacting the author, access to source code, or documentation "more complete than is generally provided".
  - Generality of code ("throwing switches") made docking easy.
  — same source (opened)
- **Statistical model checking:**
  - SPRT-based; it can stop early when evidence suffices — [Legay et al. 2010](https://arxiv.org/pdf/1005.1327) (snippet only).
  - MultiVeStA offers transient analysis, counterfactual analysis (t-tests), steady-state analysis with automated warm-up estimation, and "ergodicity diagnosis" via "autoRD and autoBM" — [MultiVeStA wiki](https://github.com/andrea-vandin/MultiVeStA/wiki) (opened).
  - Statistical model checking of Python ABMs has been integrated with MultiVeStA and Mesa — [search summary on SMC/ABMs](https://arxiv.org/pdf/1005.1327) (snippet only; the underlying result was not identified).

### Inferences
**Proposed metamorphic relations for the dots society** (inference). These assume integer-cent money and RNG streams keyed by stable entity ID, never by array index or scan order. Making that design change first turns most MRs into exact fingerprint checks you can run in Vitest.

1. **Nominal rescaling (money homogeneity).**
   - Transformation: multiply every money-denominated quantity by k = 10 or 100. That covers initial cash, prices, wages, fines, theft amounts, money thresholds and price-adjustment steps.
   - Expected: identical event sequence and real outputs (goods traded, employment, thefts, arrests, wealth Gini). Money outputs are exactly ×k.
   - What it catches: hard-coded money constants ("steal 5", "min wage 10") and rounding/floor asymmetries. The plan already notes Epstein's floor issue. If floors break exactness, assert distributional equality instead.
2. **Agent storage-order permutation.**
   - Transformation: shuffle the agent array at init, keeping IDs.
   - Expected: the ID-sorted fingerprint is bit-identical.
   - If activation follows array order, this fails. That is exactly the activation-order artefact Axtell et al. hit, so then downgrade to distributional equality and document the order dependence.
3. **Spatial symmetry.**
   - Transformation: rotate the torus 90° or mirror it, transforming initial positions too.
   - Expected: the transformed fingerprint is identical if neighbourhood scans and tie-breaks are isotropic or randomised. Otherwise aggregate outputs should be equal in distribution.
   - What it catches: "north-first" scan biases.
4. **Disjoint union.**
   - Transformation: put two independent worlds side by side behind an impassable wall, with separate markets.
   - Expected: each half's outputs equal the stand-alone runs (exact).
   - What it catches: hidden global state (shared price index, global counters, RNG cross-talk).
   - If the market is necessarily global, skip this and use MR5.
5. **Scale-up at constant density.**
   - Transformation: 2× citizens, police, thieves and merchants on 2× area, with per-capita parameters unchanged.
   - Expected: per-capita rates (thefts per citizen-tick, unemployment rate, median price, Gini) are equivalent within a declared margin, e.g. ±5% on medians. Across-seed SD of per-capita aggregates shrinks by about 1/√2 if correlations are weak.
   - Statistical: equivalence needs about 180 seeds/arm for an A-margin of ±0.06. A screening version at 50 seeds is possible but cannot certify equivalence.
6. **Ablation of a class (exact).**
   - Thieves = 0 ⇒ thefts = arrests-for-theft = merchant theft losses = 0 every tick.
   - Police = 0 ⇒ arrests = 0. Merchants = 0 ⇒ no trades. Money is still conserved in every case.
   - Directional companion: police = 0 ⇒ thefts stochastically ≥ baseline (A ≥ 0.64, p < 0.01 at 50 seeds).
7. **Null intervention (exact).**
   - Transformation: schedule a zero-magnitude policy at tick t, e.g., +0 police, a tax change of 0, a 0-cent transfer.
   - Expected: bit-identical trajectory.
   - What it catches: the most common hidden bug, where a new code path consumes RNG draws or mutates state when it should be a no-op.
8. **Label swap (exact).** Swap two goods, or two districts, that have identical parameters. Outputs swap labels exactly.
9. **Monotone-parameter MR** (upgrades the plan's slider sweeps). For θ → θ + Δ with a predicted sign, use common seeds. "Holds" if the A in the predicted direction is at least 0.64 and p < 0.01 at 50 seeds/arm (Section 1). Otherwise "Inconclusive".
10. **Time-step refinement** (only if rules are rate-based).
    - Transformation: halve the tick length and halve the per-tick probabilities and rates.
    - Expected: aggregate trajectories per unit time equal within tolerance.
    - The residual measures discretisation error.

**Docking for this project** (inference): disable everything except one subsystem (e.g., the arrest rule, or the Yard-Sale exchange). Compare it with an independent reference implementation, for example Mesa's Epstein civil-violence example (see Section 7), at the three equivalence levels:
- numerical identity where the algorithm is deterministic given the same draws;
- distributional equivalence on 40+ seeds, using equivalence margins rather than "p > 0.05";
- relational equivalence, i.e., the same sign of slider effects.

Record discrepancies in TRACE "implementation verification" (Section 6).

**Statistical model checking for this sim** (inference): write rare-event claims as probabilities, e.g., "P(market collapse before tick 5,000 | preset X) ≤ 0.05". Then:
- use the SPRT for pass/fail (27 passes to accept at p0 = 0.95 vs p1 = 0.85, α = β = 0.05; computed); or
- use the Chernoff–Hoeffding n (185 runs for ±0.10, 738 for ±0.05) to estimate the probability with a guaranteed error (computed).

MultiVeStA is Java-based (not verified this session). Integrating a Node simulator would need an adapter that steps the sim and returns observations.

### Gaps
- I could not read Olsen & Raunak's MR catalogue. It is not known whether they propose any of MR1–MR10 above, or how they set tolerances for stochastic MRs. NIST, ACM and IEEE hosts were blocked.
- No source was opened on the ABM-specific statistics of metamorphic tests (e.g., how many runs per MR).
- MultiVeStA's adapter requirements for non-Java simulators and its default CI parameters were not visible on the wiki page.

## 5. Warm-up, steady state, stationarity/ergodicity, and early-warning indicators

### Takeaway
- **Burn-in:** use MSER-5 on series averaged over 5 seeds. Hoad et al. selected it from 44 warm-up methods. It takes about 20 lines of TypeScript.
- **Stationarity:** check after truncation with an ADF or runs test.
- **Ergodicity:** check by comparing within-run time distributions with across-seed distributions. If the model is non-ergodic (e.g., collapse in some seeds), report regime probabilities rather than means.
- **In-app tipping indicator:** compute rolling variance and lag-1 autocorrelation of a detrended key series, with Kendall τ trends. Calibrate the false-alarm rate on stationary presets using surrogates, and expect false positives and misses.

### Cited Findings
- **MSER-5 selection.** "MSER-5 (White, 1997) was selected from a total of 44 'warm-up' methods found in the simulation literature, by a combination of short-listing and testing". Extensive testing showed it "robust and ideally suited to automation". — [Hoad, Robinson & Davies 2009](https://higherlogicdownload.s3.amazonaws.com/INFORMS/ef27cc87-0593-4a9b-85b3-52b5bbeae306/UploadedImages/paper77-81.pdf) (opened)
- **MSER-5 practice** (same paper):
  - "Those finding the warm-up for a simulation with multiple replications would use MSER-5 with 5 replications as it is more robust". The analyser default averages warm-up data over 5 replications.
  - MSER-5 is embedded in "a sequential heuristic procedure" that continues the run until an acceptable truncation point is found.
  - In their case study, 5 replications of length 500 were averaged.
  — same source (opened)
- **The MSER statistic (pyMSER).** Batch the series into means of size m (m = 5 gives MSER-5). For each truncation k, compute g_k = Σ_{i≥k}(Y_i − Ȳ_{n,k})² / (n−k)² and choose the index that minimises g_k. pyMSER also provides an LLM variant using the first local minimum (LLM here is not a language model; the source does not expand the abbreviation) and an Augmented Dickey–Fuller (ADF) test on the equilibrated data. — [pyMSER source](https://raw.githubusercontent.com/IBM/pymser/main/src/pymser/pymser.py) (opened); [pyMSER README](https://raw.githubusercontent.com/IBM/pymser/main/README.md) (opened; cites White 1997 and Oliveira et al. 2024, *J. Chem. Theory Comput.* 20(19):8559–8568)
- **Alternative warm-up detector (pymbar).** `detect_equilibration` picks the start of equilibrated data "using a heuristic that maximizes number of effectively uncorrelated samples". It returns the start index, the statistical inefficiency and Neff_max. — [pymbar timeseries.py](https://raw.githubusercontent.com/choderalab/pymbar/master/pymbar/timeseries.py) (opened)
- **Welch's method** is a graphical moving-average method. The warm-up t₀ is where the moving average flattens. Standard practice: at least 5 replications, a run length T much larger than t₀, and a window w just large enough for a smooth graph (w = 10 is often enough). — [WSC 2013 paper](https://informs-sim.org/wsc13papers/includes/files/028.pdf) and [WSC 2004 paper](https://informs-sim.org/wsc04papers/080.pdf) (snippet only; aggregated search summary, so which result says which is uncertain)
- **Grazzini 2012, stationarity and ergodicity** ("Analysis of the Emergent Properties: Stationarity and Ergodicity", JASSS 15(2)7). It uses the non-parametric Wald–Wolfowitz runs test to detect stationarity and ergodicity in ABM output. Kolmogorov–Smirnov tests are also used for ergodicity. — [ResearchGate entry](https://www.researchgate.net/publication/227450131_Analysis_of_the_Emergent_Properties_Stationarity_and_Ergodicity) (snippet only)
- **Automated analysis for economic ABMs.** Vandin, Giachini, Lamperti & Chiaromonte, "Automated and Distributed Statistical Analysis of Economic Agent-Based Models" — [arXiv 2102.05405](https://arxiv.org/pdf/2102.05405) (snippet only: title only). The tool's own wiki describes automated warm-up estimation and ergodicity diagnosis (autoRD, autoBM) — [MultiVeStA wiki](https://github.com/andrea-vandin/MultiVeStA/wiki) (opened).
- **Early-warning indicators (earlywarnings R package by Dakos).**
  - `generic_ews` computes, within rolling windows: AR(1), SD, skewness, kurtosis, coefficient of variation, return rate (1 − AR(1)), density ratio of the power spectrum, and lag-1 autocorrelation.
  - Window default: "50%" of series length. Detrending options: Gaussian, loess, linear, first-difference.
  - Trends are estimated by "the nonparametric Kendall tau correlation".
  - References: Dakos et al. 2008 (PNAS) and Dakos et al. 2012 (*PLoS ONE* 7(7):e41010).
  — [generic_ews.R](https://raw.githubusercontent.com/earlywarningtoolbox/earlywarnings-R/master/R/generic_ews.R) (opened)
- **Surrogate significance testing (`surrogates_ews`).** It fits an ARMA(p,q) model, generates surrogate series (default `boots` = 100), and compares the Kendall-τ trends of the original with the surrogates "to produce probabilities of false positives". — [surrogates_ews.R](https://raw.githubusercontent.com/earlywarningtoolbox/earlywarnings-R/master/R/surrogates_ews.R) (opened)
- **ewstools** (Python ≥ 3.9 and ≤ 3.12; JOSS 10.21105/joss.05038).
  - Detrending: Gaussian kernel and LOWESS.
  - Indicators: variance, SD, CV, autocorrelation at chosen lags, skewness, kurtosis, power-spectrum metrics, entropy and DFA, with Kendall τ trends.
  - Includes deep-learning bifurcation classifiers (Bury et al. 2021).
  - Cites Scheffer et al. 2009 and the Dakos et al. 2024 review.
  — [ewstools README](https://raw.githubusercontent.com/ThomasMBury/ewstools/main/README.md) (opened)
- **Caveats about early-warning signals.** Boettiger & Hastings showed that conditioning on a purely stochastic transition can produce trajectories that look like early warnings (the "prosecutor's fallacy"), i.e., false positives. — [arXiv 1210.1204](https://arxiv.org/pdf/1210.1204) (snippet only). Further caveats appear in "False alarms: How early warning signals falsely…" — [Wagner & Eisenman 2015](https://eisenman.ucsd.edu/papers/Wagner-Eisenman-2015b.pdf) (snippet only: title only)

### Inferences
- **Burn-in procedure** (inference):
  1. For each preset, run 5 seeds and average each key series (theft rate, unemployment, price index, Gini).
  2. Apply MSER-5 with O(n) suffix sums of Z and Z².
  3. Take the maximum truncation point across metrics × a 1.5 safety factor, and store it in the preset metadata.
  4. Add a Vitest assertion that the argmin lies in the first half of the series; otherwise the run is too short and must be extended. This mirrors Hoad's sequential extension.
  5. Re-run whenever rules change, and fingerprint the burn-in value.
- **Stationarity after truncation** (inference): compare the first and second halves of the post-warm-up window with a KS test (`@stdlib/stats-kstest` is one-sample only, so implement the two-sample version or use permutation). An ADF test (via pyMSER/statsmodels) can serve as an offline check.
- **Ergodicity test** (inference): for metric X, compare two distributions with a two-sample KS test and the A effect size.
  - (a) the batch means from one long run after warm-up (e.g., batches of 50 ticks);
  - (b) the values at one late tick across 50 seeds.

  If they differ, the outcome depends on path or regime. Then do not report means. Report P(regime) per preset with binomial CIs (Section 1 numbers), e.g. "economy collapses in 7/50 seeds, 95% upper bound …".
- **In-app "tipping" gauge, run in the Worker** (inference):
  - Over the last W = 200–400 ticks of 1–3 aggregates (e.g., thefts per tick, unemployment), Gaussian-detrend with a bandwidth of about 10% of W.
  - Compute rolling SD and AR(1) in sub-windows of W/2. Take Kendall τ of each indicator over time.
  - Light the gauge only if both τ_SD and τ_AR(1) exceed a threshold. Calibrate the threshold so that, on stationary presets (or AR-surrogate series, as in `surrogates_ews`), the false-alarm rate per window is ≤ 5%.
  - Validate on tipping presets, e.g., slowly ramp police down past the collapse point. Over 50 seeds, report the hit rate, the false-alarm rate and the median lead time in ticks.
  - Label it "fragility rising", not "collapse predicted". The early-warning literature documents both false positives and silent transitions.

### Gaps
- None of these could be opened: White 1997, Franklin & White, Hoad et al. 2008/2010 (JORS), Welch 1983, Dakos et al. 2012 (PLoS), Scheffer et al. 2009, Grazzini 2012 or Vandin et al. 2022. Specific performance numbers (e.g., MSER-5 bias reduction, Welch window choices, Grazzini's test sizes) are not verified.
- The common "truncation point must be in the first half" rule for MSER is not in pyMSER's code. It is from background knowledge.
- Ditlevsen & Johnsen 2010 ("Tipping points: early warning and wishful thinking") was named in a search summary but not opened or linked.
- I found no ABM-specific evaluation of early-warning signals in crime or market ABMs.

## 6. Documentation (ODD 2020, ODD+D, TRACE), a minimal ODD+D for this sim, and where to publish

### Takeaway
- **ODD (2020)** has 7 elements in 3 blocks. It now starts with "Purpose and patterns", which ties documentation to POM and to the claim tests.
- **ODD+D** adds human-decision design concepts:
  - theoretical and empirical background;
  - individual decision-making, which absorbs the old "Objectives";
  - expanded and reordered sensing and prediction;
  - implementation details.
- **TRACE** organises the modelling notebook into 8 elements that map one-to-one onto the existing test plan.
- **Publishing:** the CoMSES Computational Model Library offers peer review, a badge and a DOI if the model runs with reasonable effort and has narrative documentation such as ODD.

### Cited Findings
- **ODD 2020 structure.** "The ODD Protocol for Describing Agent-Based and Other Simulation Models: A Second Update to Improve Clarity, Replication, and Structural Realism" (JASSS 23(2)7, 2020). ODD has seven elements grouped into "Overview", "Design concepts" and "Details". The first element, "Purpose and patterns", states the model's purpose(s) and "the patterns that serve as model evaluation criteria"; patterns are new in this update. — [JASSS](https://www.jasss.org/23/2/7.html) (snippet only); [Aarhus University record](https://pure.au.dk/portal/en/publications/the-odd-protocol-for-describing-agent-based-and-other-simulation-/) (snippet only)
- **ODD 2020 checklist.** Supplementary "S1: ODD Guidance and Checklists" exists. — [checklist PDF](https://www.railsback-grimm-abm-book.com/E2-Downloads/Chapter03/ODD_GuidanceChecklists_2020.pdf) (snippet only: title only; host blocked); [JASSS S1](https://www.jasss.org/23/2/7/S1-ODD.pdf) (snippet only: title only)
- **ODD+D changes** (Müller et al. 2013, "Describing human decisions in agent-based models – ODD+D"):
  - "Objectives" was merged into a new design concept, "Individual decision-making".
  - A "Theoretical and Empirical Background" concept was added.
  - "Sensing" and "Prediction" were expanded and their order reversed, because agents sense before predicting.
  - Collectives are described as entities with their own variables and behaviours.
  - Implementation details, including where to find the source code, were added.
  — [ETH-hosted PDF of Müller et al. 2013](https://ethz.ch/content/dam/ethz/special-interest/usys/ites/ecosystem-management-dam/documents/EducationDOC/EM_DOC/Recommended%20readingDOC/Muller_2013.pdf) (snippet only); [UFZ author manuscript](https://www.ufz.de/export/data/2/100069_ODD%20+%20D%20-%20Author%20manuscript.pdf) (snippet only)
- **TRACE elements** (Grimm et al. 2014, *Ecological Modelling* 280:129–139). It asks modellers to keep a notebook organised into 8 elements:
  1. Problem formulation
  2. Model description
  3. Data evaluation
  4. Conceptual model evaluation
  5. Implementation verification
  6. Model output verification
  7. Model analysis and application
  8. Model output corroboration

  It is based on "evaludation", a merger of evaluation and validation developed in the CREAM project. — [TRACE PDF](https://www2.econ.iastate.edu/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf) (snippet only); [CREAM TRACE page](https://cream-itn.eu/trace) (snippet only)
- **TRACE "implementation verification"** covers whether code has been "thoroughly tested for programming errors", whether the implementation matches the description, and how the software is designed and documented. — [TRACE PDF](https://www2.econ.iastate.edu/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf) (snippet only)
- **CoMSES peer review.**
  - Models in the Computational Model Library can request review. If they pass, they get a peer-reviewed badge and a DOI.
  - The checklist verifies baseline "good enough practices", aligned with the FAIR Principles for Research Software (FAIR4RS) and "frictionless reuse".
  - Criteria include: runnable "with reasonable effort", with any compilation, input data or library dependencies clearly documented; and "detailed narrative documentation", where ODD meets the requirement but other forms are accepted.
  — [CoMSES reviews page](https://www.comses.net/reviews/) (snippet only); [CoMSES model-review repo (workflow only, no criteria text)](https://github.com/comses/model-review) (opened); [CoMSES forum: Model Publishing Quickstart and FAQs](https://forum.comses.net/t/model-publishing-quickstart-and-faqs/10993) (snippet only: title only)
- **Why full documentation and code matter (docking lesson).** Under current reporting standards, alignment needs contact with the author, the source code, or documentation "more complete than is generally provided in accounts published in contemporary journals". — [Axtell et al. SFI WP](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) (opened)

### Inferences
**A minimal ODD+D for the dots society** (inference; headings follow the ODD+D layout as I know it — check against Müller et al. Table 1, see Gaps):

- **I. Overview**
  - **I.i Purpose and patterns**
    - Purpose: explore how policing, theft and a market economy interact in a closed, money-conserving society; explanatory and teaching use.
    - Patterns: the claim-test suite (Section 1) and known-answer targets, each with a numeric band. Mark which patterns were used for calibration and which are held out.
  - **I.ii Entities, state variables, scales**
    - Citizen: id, position, cash, employer id (≤ 1), needs/consumption, risk attitude, status.
    - Thief: id, position, cash, jail timer, target memory.
    - Police: id, position, patrol state.
    - Merchant: id, position, inventory per good, prices, cash, employees.
    - Market: price index, order book.
    - Ledger: zero-sum accounts.
    - Grid: size, topology (torus or not).
    - Scales: what one tick and one cell represent, run length, and the burn-in from MSER-5.
  - **I.iii Process overview and scheduling**
    - Exact per-tick order, e.g.: sense → decide → move → trade/clear market → theft/arrest → payroll/taxes → observe.
    - Activation order (random from a dedicated scheduler stream), synchronous vs asynchronous updates, and tie-breaking.
- **II. Design concepts**
  - **II.i Theoretical and empirical background:** the rules borrowed and from where, e.g.:
    - an Epstein-style arrest-probability rule, with the floor/rounding choice stated;
    - kinetic/Yard-Sale exchange for wealth dynamics;
    - Godley–Lavoie-style accounting for the ledger;
    - routine-activity or rational-choice framing for theft.
  - **II.ii Individual decision-making:** for each agent type: decisions (work, steal, buy, patrol, arrest), objective, rule form (threshold heuristic vs optimisation), bounded rationality.
  - **II.iii Learning:** none, or the rule used.
  - **II.iv Individual sensing:** vision radius, what is observed (police nearby, prices), noise.
  - **II.v Individual prediction:** e.g., the thief's estimated arrest probability.
  - **II.vi Interaction:** direct (theft, arrest, trade, employment) and indirect (prices).
  - **II.vii Collectives:** firms (employer–employees), police units.
  - **II.viii Heterogeneity:** which attributes vary across agents and from which distributions.
  - **II.ix Stochasticity:** every random draw, its distribution and its RNG stream; the seeding scheme (per-entity streams).
  - **II.x Observation:** recorded metrics and exact formulas (Gini variant, per-capita definitions), sampling interval, warm-up truncation, and the claim-test statistics (Mann–Whitney/A, SPRT).
- **III. Details**
  - **III.i Implementation details:**
    - TypeScript version and the DOM-free core.
    - Web Worker runtime and the headless Node/Bun runner.
    - Repository URL, licence, commit SHA, and how to reproduce figures, e.g. `npm run sweep -- --preset X`.
  - **III.ii Initialization:** presets with all values and seeds.
  - **III.iii Input data:** none, or list the files.
  - **III.iv Submodels:** one subsection per rule with pseudo-code and a parameter table (name, default, range, unit, justification). This table is also the `params.json` for GSA (Section 2).

**Mapping the existing plan onto TRACE** (inference):

| TRACE element | Existing or proposed artefact |
|---|---|
| Implementation verification | Per-tick invariants, fast-check properties, golden fingerprints, exact MRs |
| Model output verification | Known-answer tests (Gini 0.5/0.27/1, SIM output 100, Schelling, hawk–dove p\*) and distributional MRs |
| Model analysis | Morris/Sobol results and claim tests |
| Model output corroboration | Held-out patterns |
| Problem formulation, model description | ODD+D |

Keep TRACE as a `docs/trace/` folder that links to CI artefacts. The replication-failure notes (Epstein floor, Axtell exponent, Sugarscape VI-2) belong under conceptual model evaluation and implementation verification.

**Where to publish** (inference): the CoMSES Computational Model Library (with ODD+D and run instructions) for a peer-review badge and DOI, plus the GitHub repository. Archive a release of the repo for a citable snapshot. This archiving step is not verified in-session.

### Gaps
- ODD 2020, the ODD 2020 checklists, ODD+D and TRACE full texts were all blocked. The following are from background knowledge, not verified:
  - the complete 2020 element names "Entities, state variables, and scales", "Process overview and scheduling", "Initialization", "Input data", "Submodels";
  - the full list of 11 design concepts;
  - the exact ODD+D numbering and headings, including "Heterogeneity" and the "Implementation details" placement;
  - the ODD+D guiding questions.
- The exact CoMSES checklist wording, any licence or code-archive requirement, and whether "OpenABM" is CoMSES's former name were not verified.
- "Visual ODD" (JASSS 27(4)1) appeared in results but was not opened.

## 7. Worked examples on crime and economic ABMs

### Takeaway
There are direct precedents for every method recommended here:
- a crime ABM with police and welfare spending, tipping points, and empirical comparison against 5,660 US cities;
- a dedicated global sensitivity/uncertainty analysis paper by the same group;
- Epstein civil-violence studies showing outcome sensitivity to jail term and risk thresholds;
- Kriging-emulator Sobol analysis of the Keynes+Schumpeter (K+S) macroeconomic model;
- statistical model checking with automated warm-up and ergodicity checks on economic ABMs (including 2026 papers on the K+S and Island models);
- the 1996 docking study, the best concrete template for comparing two implementations.

Most of these could only be seen as search snippets.

### Cited Findings
- **Fonoberova, Fonoberov, Mezić, Mezić & Brantingham (2012),** "Nonlinear Dynamics of Crime and Violence in Urban Settings", JASSS 15(1)2.
  - Their ABM explores the effect of police spending and social-welfare spending on crime, with heterogeneous hardship and views of police legitimacy.
  - It was validated against crime data from 5,660 US cities.
  - It shows tipping points for communities of all sizes: cutting officers below a critical level rapidly increases crime and violence.
  — [JASSS](https://www.jasss.org/15/1/2.html) (snippet only)
- **Fonoberova, Fonoberov & Mezić, "Global sensitivity/uncertainty analysis for agent-based models"** (*Reliability Engineering & System Safety*, per an OSTI record). — [OSTI record](https://www.osti.gov/etdeweb/biblio/22245896) (snippet only: title only; content not verified)
- **Epstein civil-violence model.**
  - Global parameters: legitimacy L, threshold T, maximum jail term J_max, vision v. Agent-level: hardship H and risk aversion R, both U(0,1).
  - Waiting times between outbursts are sensitive to the jail term; longer jail terms flatten the distribution and reduce peak frequency.
  - Adding a risk-perception floor (risk drops to zero below a threshold) strongly changes the size, duration and recurrence of peaks ("massive fear loss").
  - A replication reproduced Epstein's emergent curve.
  — [Epstein 2002 PNAS PDF](https://pdodds.w3.uvm.edu/files/papers/others/2002/epstein2002a.pdf) (snippet only); [arXiv 1501.05838, "Practicality of Agent-Based Modeling of Civil Violence: an Assessment"](https://arxiv.org/pdf/1501.05838) (snippet only); [Lemos et al. review, CEUR-WS](https://ceur-ws.org/Vol-1113/paper10.pdf) (snippet only). Which of these supports which statement is unclear: the search summary aggregated them.
- **Mesa's Epstein example.** Mesa (Python) ships an "Epstein Civil Violence Model" example, a ready docking reference. — [Mesa docs](https://mesa.readthedocs.io/stable/examples/advanced/epstein_civil_violence.html) (snippet only)
- **Police funding ABM.** "Agent-Based Simulation of Police Funding Tradeoffs Through the Lens of Legitimacy and Hardship" (JASSS 26(3)12) is a related crime ABM. — [JASSS](https://www.jasss.org/26/3/12.html) (snippet only: title only)
- **Dosi, Pereira & Virgillito (2018)** ran a global sensitivity analysis of the K+S model's fat-tailed firm-growth-rate result. They used Gaussian-process/Kriging emulation and Sobol indices, and found the result robust to parametrisation. — search summary drawing on [NBER w26634](https://www.nber.org/system/files/working_papers/w26634/w26634.pdf) and [Borgonovo et al. 2022, "Sensitivity analysis of agent-based models: a new protocol", CMOT](https://link.springer.com/article/10.1007/s10588-021-09358-5) (snippet only; attribution between these results unclear)
- **Recent statistical model checking of economic ABMs (2026):**
  - "Statistical Model Checking of the Keynes+Schumpeter Model: A Transient Sensitivity Analysis of a Macroeconomic ABM" — [arXiv 2605.10447](https://arxiv.org/pdf/2605.10447) (snippet only: title only)
  - "Statistical Model Checking of the Island Model: An Established Economic Agent-Based Model of Endogenous Growth" — [arXiv 2604.04543](https://arxiv.org/pdf/2604.04543) (snippet only: title only)
- **MultiVeStA's documented ABM applications** include economic agent-based models (it cites Caiani et al. 2016) and steady-state and ergodicity analyses. — [MultiVeStA wiki](https://github.com/andrea-vandin/MultiVeStA/wiki) (opened)
- **Axtell, Axelrod, Epstein & Cohen** gave concrete numbers for docking:
  - Mann–Whitney on 10-run samples and KS on 40-run samples.
  - One of 12 comparisons differed because of activation order.
  - About 60 person-hours in total.
  — [SFI WP 95-07-065](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/sfi-com/dev/uploads/filer/08/f5/08f53c29-81ee-4709-8d2e-0e134bb11700/95-07-065.pdf) (opened)
- **Calibration studies of economic ABMs:** Lamperti et al. 2018 (ML surrogates), Platt 2020 (method comparison) and McCulloch et al. 2022 (history matching + ABC). See Section 3. — (snippet only)

### Inferences
- **Fonoberova et al. as a template** (inference): it is the closest analogue to the dots society (police, hardship, legitimacy, welfare spending, tipping in police numbers).
  - Use a police-count sweep across the suspected tipping point as a showcase claim: theft rate versus police, with seed bands.
  - Use the same sweep to validate the in-app early-warning gauge (Section 5).
- **Epstein-model results as directional claims** (inference): jail term ↑ ⇒ fewer, larger outbursts; a risk floor ⇒ "fear loss" cascades. These give ready directional and metamorphic claims for the theft/arrest submodule, and pair with the known arrest-rule rounding issue already in the plan.
- **K+S as a template** (inference): emulator-based Sobol (Kriging) is the route if one run takes more than a few seconds. Fit a GP or random-forest surrogate on about 1–2k LHS points, then compute Sobol indices on the surrogate.

### Gaps
- No full text was opened for any of these: Fonoberova 2012/2013, the Epstein sensitivity studies, Dosi et al. 2018, Borgonovo et al. 2022, the 2026 SMC papers, Lamperti, Platt or McCulloch. Their run counts, numbers of parameters and index values are unknown.
- I found no published Sobol or Morris analysis specifically of Epstein's civil-violence model with reported indices.
- **Source access log.**
  - **Unreachable (egress-blocked):** www.jasss.org; jasss.soc.surrey.ac.uk; salib.readthedocs.io; acs.ist.psu.edu; rseri.me; arxiv.org and export.arxiv.org; tsapps.nist.gov; journals.plos.org; www.comses.net; api.semanticscholar.org; www.ebi.ac.uk (Europe PMC); en.wikipedia.org; huggingface.co; cran.r-project.org; link.springer.com; ideas.repec.org; dl.acm.org; www.sciencedirect.com; bio.uib.no; www.railsback-grimm-abm-book.com; ethz.ch; pmc.ncbi.nlm.nih.gov; signosis.eu; d-nb.info; www.nsnam.org; scispace.com; faculty.sites.iastate.edu; www2.econ.iastate.edu; www.osti.gov; carrknight.github.io; informs-sim.org; www.ufz.de.
  - **Unusable:** web.archive.org could not be fetched by the tool. pypi.org returned a JavaScript error page with no content.
  - **GitHub API:** the per-repo `gh` API was refused ("GitHub access to this repository is not enabled for this session").
  - **Search budget:** the session's web-search budget (200 searches) ran out near the end, so some snippet-only items could not be pursued further.
  - **Reachable and used:** github.com, raw.githubusercontent.com, gist.github.com, registry.npmjs.org, sfi-edu.s3.amazonaws.com and higherlogicdownload.s3.amazonaws.com.
