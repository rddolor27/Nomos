# Happiness in Nomos: drivers, adaptation, consequences, prior art and an integer model

Round 6, question 3 of 5. Researched 5 Oct 2026. Scope: what should drive happiness, what happiness should drive, and how to run it deterministically. Resources, food quality and spoilage, wealth and the cost prototype belong to the other four researchers; hand-offs are marked **Hand-off**.

**Units.** Life satisfaction (LS) is on the 0–10 Cantril ladder. The sim stores it in milli-ladder points: 1,000 = one ladder step, so 0–10,000.

**Evidence labels.**
- "opened": I downloaded the primary text (paper, PDF, page or raw wiki source) and read the passages cited.
- "opened (abstract only)": only the abstract was reachable.
- "fetch-tool summary": the page was fetched, but I saw it only through the fetch tool's summary. Treat it like a search summary.
- "search summary", "measured here", "computed", "inference" and "unsourced estimate" as in `.claude/rules/docs.md`.

**Access.** This session reached PMC, NBER, IZA, CEP, arXiv, the WHR site, university repositories and raw MediaWiki sources. Wiley, SAGE, MDPI, ResearchGate and the paywalled journal pages were blocked or paywalled. Paradox wikis sit behind a JavaScript challenge, so Victoria 3 and Cities: Skylines are fetch-tool summaries only.

---

## a) What drives life satisfaction, with effect sizes on the 0–10 ladder

### Takeaway
- **Income works in logs, mostly relative to others.** Within the US, a fourfold income rise adds about 0.64 ladder points, about 0.32 per doubling ([Kahneman & Deaton 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/), opened). Neighbours' earnings subtract roughly as much as one's own add ([Luttmer 2005](https://users.nber.org/~luttmer/relative.pdf), opened).
- **Unemployment is the largest common economic driver.** The employed rate their lives about 0.6 points higher than the unemployed worldwide ([WHR 2017, ch. 6](https://files.worldhappiness.report/WHR17.pdf), opened). One point of national unemployment costs 1.7–5 times as much LS as one point of inflation ([Di Tella et al. 2001](https://wrap.warwick.ac.uk/id/eprint/339/1/WRAP_Oswald_aerfeb2000.pdf); [Blanchflower et al. 2014](https://bpb-us-e1.wpmucdn.com/sites.dartmouth.edu/dist/5/2216/files/2020/08/BLANCHFLOWER_et_al-2014-Journal_of_Money_Credit_and_Banking.pdf), both opened).
- **The WHR six factors explain 76% of the variation between countries.** Coefficients: 0.297 per log unit of GDP, 2.82 for social support, 0.035 per healthy year, 1.546 for freedom, 0.339 for generosity (not significant) and −0.662 for perceived corruption ([WHR 2026 Table 2.1](https://files.worldhappiness.report/WHR26.pdf), opened).
- **Crime hurts victims briefly and everyone through fear.** Violent victimisation costs about 0.40 points in the year it happens, property crime about 0.09 ([Mahuteau & Zhu 2016](https://docs.iza.org/dp9253.pdf), opened). Society-wide, the fear cost of one more victim is about 80 times the victim's own mental-health loss ([Cornaglia et al. 2014](https://docs.iza.org/dp8014.pdf), opened).
- **Income inequality per se has no reliable effect.** Two meta-analyses find pooled effects near zero: r = −0.01 over 24 studies, and an odds ratio of 0.979 per 0.05 of Gini over 168 studies ([Ngamaba et al. 2018](https://d-nb.info/1148950508/34), opened; [Sommet et al. 2026](https://www.nature.com/articles/s41586-025-09797-z), opened (abstract only)).

### Cited Findings

**World Happiness Report six-factor model**
- WHR 2026 Table 2.1, column 1. Pooled OLS of national average Cantril ladder, 155 countries, 2,365 country-years, 2005–2025, year fixed effects, adjusted R² 0.762. Coefficients (robust SE): log GDP per capita 0.297 (0.067); social support 2.82 (0.367); healthy life expectancy 0.035 (0.009) per year; freedom to make life choices 1.546 (0.297); generosity 0.339 (0.241, not significant); perceptions of corruption −0.662 (0.244). — [WHR26.pdf, p. 27](https://files.worldhappiness.report/WHR26.pdf) (opened)
- Box 2.3 definitions: social support, freedom and corruption are national shares of yes/no Gallup answers ("someone to count on", "satisfied with your freedom", "corruption widespread"). GDP is log PPP in 2021 dollars; generosity is donation residual on GDP. — [WHR26.pdf, p. 28](https://files.worldhappiness.report/WHR26.pdf) (opened)
- Decomposition: each country bar is Dystopia (1.16, the world's lowest value on every factor) plus each factor's coefficient times its distance from Dystopia, plus a residual. Finland tops 2023–2025 at 7.764; Afghanistan is lowest at 1.45. Latin America sits about +0.50 above prediction. — [WHR26.pdf, pp. 19–29 and note 36](https://files.worldhappiness.report/WHR26.pdf) (opened)
- Individual unemployment, available in Gallup since 2009, shows "an effect size similar to that found in other research", but is never significant in the country-level equation. — [WHR26.pdf, note 21](https://files.worldhappiness.report/WHR26.pdf) (opened)

**Income**
- Kahneman & Deaton (2010), Gallup-Healthways, 450,000+ US responses, mean ladder 6.76. The ladder coefficient on a high-income dummy (≥ $4,000 a month, "approximately 4-fold") is 0.64. The ladder rises steadily with log income with no satiation; emotional well-being stops rising at about $75,000. Adjacent top income bands differ by 0.227 ladder points each ($60–90k to $90–120k; $90–120k to over $120k). — [PMC2944762](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/) (opened)
- Same study, other correlates as multiples of the income effect on the ladder: health condition −0.48, headache yesterday −0.78, alone yesterday −0.75, divorced −0.32, married +0.32, caregiver −0.25. — [PMC2944762, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/) (opened)
- Killingsworth (2021): 1,725,994 experience-sampling reports from 33,391 employed US adults. Experienced well-being rises linearly with log income: slope 0.109 below $80,000 and 0.110 above. Correlation with income is 0.17 for evaluative and 0.09 for experienced well-being. Sense of control mediates 74% of the income link; "trouble coping with regular bills" mediates 38%. — [PMC7848527](https://pmc.ncbi.nlm.nih.gov/articles/PMC7848527/) (opened)
- Killingsworth, Kahneman & Mellers (2023), adversarial collaboration: the plateau exists only for the least happy 15–20%, flattening above $100,000. The happiest 30% accelerate above $100,000. The median-happiness gap between $15,000 and $250,000 households is "about five points on a 100-point scale". — [PMC10013834](https://pmc.ncbi.nlm.nih.gov/articles/PMC10013834/) (opened)
- Stevenson & Wolfers (2013): the cross-country gradient is 0.335 SD of well-being per log unit of GDP (Gallup 2008–2012, 155 countries, correlation 0.79). Within 98 countries, the rich-part gradient exceeds the poor-part gradient in 61, against 37. No satiation point appears in any dataset. — [AER P&P PDF](http://users.nber.org/~jwolfers/Papers/Satiation(AER).pdf) (opened)
- Easterlin & O'Connor (2020): at a point in time happiness rises with income, but long-term growth rates of happiness and income are unrelated; the stated reason is social comparison. — [IZA DP 13923](https://docs.iza.org/dp13923.pdf) (opened (abstract only))

**Relative income and comparison**
- Luttmer (2005), NSFH, 1–7 happiness scale. A one-SD (0.27 log point) rise in neighbours' earnings lowers happiness by 0.065, 6% of an SD. Instrumented own income is about three times the baseline estimate and larger than the neighbour effect, but the difference is not significant. Only relative position mattering cannot be rejected. — [QJE PDF](https://users.nber.org/~luttmer/relative.pdf) (opened)
- Card, Mas, Moretti & Saez (2012), randomised salary-disclosure at the University of California. Below-median earners lose 0.1 SD of job satisfaction; above-median earners gain nothing. "Pay rank matters more than pay level." — [AER PDF](https://eml.berkeley.edu/~saez/card-mas-moretti-saezAER12ucpay.pdf) (opened)

**Unemployment, its spillover, and inflation**
- WHR 2017 chapter 6, Gallup World Poll: the employed rate their lives "around 0.6 points higher" than the unemployed on 0–10. With log income and demographics held constant, unemployment is −0.281 SD (162 countries, 394,629 people). — [WHR17.pdf, pp. 145–152](https://files.worldhappiness.report/WHR17.pdf) (opened)
- WHR 2017 Table 6.4: the comparison-group unemployment rate lowers the ladder of others by 0.449 SD (men) and 0.154 SD (women) per unit of rate. Own unemployment hurts less where others are unemployed (+0.209 and +0.199 interaction). — [WHR17.pdf, p. 153](https://files.worldhappiness.report/WHR17.pdf) (opened)
- Clark, Diener, Georgellis & Lucas (2006 working paper of EJ 2008), GSOEP, 0–10, fixed effects with income controlled. Men relative to the inactive: employed +0.269; unemployed −0.869 (spell under 1 year), −0.916 (1–2 years), −0.911 (3–4 years). Employed men whose spell began 1–2 years ago score −0.112 below never-unemployed peers; 3–4 years ago, −0.021. — [IZA DP 2526, pp. 12–14](https://docs.iza.org/dp2526.pdf) (opened)
- Di Tella, MacCulloch & Oswald (2001), Eurobarometer, 1–4 scale. Unemployment −2.8 and inflation −1.2 per unit rate in the base model. In the full accounting, a personal job loss costs 0.33, and each point of unemployment costs everyone 0.02 through "fear of unemployment". One point of unemployment equals 1.66 points of inflation. — [Warwick manuscript](https://wrap.warwick.ac.uk/id/eprint/339/1/WRAP_Oswald_aerfeb2000.pdf) (opened)
- Blanchflower, Bell, Montagnoli & Moro (2014), 1.18 million Europeans 1975–2013, 1–4 scale. With personal controls, the unemployment rate costs −0.0168 per point, inflation −0.0037 per point, and being unemployed −0.3957. The abstract states unemployment costs "more than five times" as much as inflation. GDP growth adds nothing. — [JMCB PDF, Table 4A](https://bpb-us-e1.wpmucdn.com/sites.dartmouth.edu/dist/5/2216/files/2020/08/BLANCHFLOWER_et_al-2014-Journal_of_Money_Credit_and_Banking.pdf) (opened)

**Health and social support**
- Kahneman & Deaton (2010), above: a diagnosed health condition is 0.48 × the fourfold-income effect, headache 0.78 ×, being alone yesterday 0.75 ×. — [PMC2944762](https://pmc.ncbi.nlm.nih.gov/articles/PMC2944762/) (opened)
- Oswald & Powdthavee (2008), BHPS, 1–7 scale, fixed effects. Milder disability: −0.408 in year one, about zero after three years. Severe disability: −0.596 in year one, still −0.372 after three. — [IZA DP 2208, pp. 14–15](https://docs.iza.org/dp2208.pdf) (opened)
- WHR 2026: going from no one to everyone in a country "having someone to count on" is worth 2.82 points at the national level. — [WHR26.pdf](https://files.worldhappiness.report/WHR26.pdf) (opened)

**Crime victimisation and fear of crime**
- Mahuteau & Zhu (2016), HILDA, fixed effects, LS 0–10. Year of victimisation: physical violence −0.400 (SE 0.083), property crime −0.089 (SE 0.035). Year after: −0.106 and +0.021, both not significant. Property crime hits safety satisfaction harder (−0.350). Feelings of insecurity explain 16–38% of the violence effect. — [IZA DP 9253, Table 8 and text](https://docs.iza.org/dp9253.pdf) (opened)
- Same paper, raw means: victims of violence average 6.78 LS against 7.83 for non-victims; property victims 7.48. — [IZA DP 9253, Table 6](https://docs.iza.org/dp9253.pdf) (opened)
- Cornaglia, Feldman & Leigh (2014), HILDA mental health (SF-36). Two SD of local violent-crime rate cost non-victims about as much as being a violent-crime victim. Property crime shows no such effect. Society's willingness to pay to remove one victim is about AUD 76,600, 80 times the victim's own AUD 930. — [IZA DP 8014](https://docs.iza.org/dp8014.pdf) (opened)
- Hanslmaier (2013), European Social Survey: victimisation and fear of crime both lower LS; the regional crime rate itself has no effect. — [DOI](https://doi.org/10.1177/1477370812474545) (search summary)
- Ambrey, Fleming & Manning (2014): perceived crime lowers LS beyond real crime, and perceptions far exceed real levels. — [Springer](https://link.springer.com/article/10.1007/s11205-013-0521-6) (search summary)

**Food insecurity**
- Frongillo et al. (2017), 2014 Gallup World Poll, 132,618 people in 138 countries. Food insecurity lowers subjective well-being beyond income, housing and employment. "The associations of food insecurity with subjective well-being were larger than with other explanatory variables." — [PubMed 28250191](https://pubmed.ncbi.nlm.nih.gov/28250191/) (opened (abstract only))
- Frongillo et al. (2019), 147 countries: 27.3% ± 22.0% of people face moderate or severe food insecurity. The within-country link is stronger in more developed countries, which the authors read as hedonic adaptation. — [PubMed 30597047](https://pubmed.ncbi.nlm.nih.gov/30597047/) (opened (abstract only))

**Inequality**
- Ngamaba, Panagioti & Armitage (2018): 39 studies reviewed, 24 meta-analysed. Pooled r = −0.01 (95% CI −0.08 to 0.06). Developed countries r = −0.06; developing countries r = +0.16. — [Qual Life Res PDF](https://d-nb.info/1148950508/34) (opened)
- Sommet et al. (2026, Nature), 168 studies, 11.4 million people: people in more unequal areas do not report lower well-being (OR 0.979 per +0.05 Gini, CI 0.951–1.008). The negative link appears only in high-inflation contexts. — [Nature](https://www.nature.com/articles/s41586-025-09797-z) (opened (abstract only))

### Inferences
- **Converting to the ladder** (computed). Kahneman–Deaton's 0.64 for a fourfold rise is 0.32 per doubling, or 0.46 per natural-log unit. Their adjacent top bands imply about 0.45 per doubling. WHR's 0.297 per log unit is 0.21 per doubling across countries.
- **Unemployment in ladder points** (computed). WHR's −0.281 SD is about −0.55 to −0.6 with a ladder SD near 2. Clark et al.'s gap between employed and unemployed men is 1.1 points, with income controlled. A default of −0.70 sits inside the 0.55–1.1 range.
- **Spillover and inflation as shares of a personal job loss** (computed). One point of the unemployment rate costs everyone 1.5% (WHR 2017), 4.2% (Blanchflower) or 6% (Di Tella) of a personal job loss. One point of inflation costs 0.9% (Blanchflower) to 4.2% (Di Tella). With −0.70 for a job loss, that is about −0.02 per point of unemployment and −0.007 per point of inflation.
- **Proposed drivers** (milli-ladder points; 1,000 = one step):

  | Driver | Default | Range | Basis |
  |---|---|---|---|
  | Own income vs settlement median, per doubling | +300 | 200–450 | K&D, Luttmer (computed) |
  | Own income vs fixed subsistence, per doubling | +50 | 0–150 | Stevenson–Wolfers vs Easterlin (inference) |
  | Own income vs own habit, per doubling (fades, see b) | +250 | 150–350 | Di Tella et al. 2010 (computed) |
  | Settlement median vs national median, per doubling (country mode) | +150 | 100–250 | WHR 0.21 per doubling minus the 50 above (computed) |
  | Unemployed | −700 | −550 to −1,100 | WHR 2017, Clark et al. |
  | Scarring after re-employment | −200, fading | −100 to −250 | Clark et al. (computed fit, see b) |
  | Settlement unemployment rate, per point | −20 | −10 to −40 | three studies above (computed) |
  | Inflation, per point a year | −7 | −5 to −30 | Blanchflower, Di Tella (computed) |
  | No friend or household contact for 7 days | −450 | −300 to −600 | K&D "alone" (inference) |
  | Food insecure (per missed-meal day in the last 7, floor −700) | −150 | unknown | unsourced estimate; **Hand-off** to the food notes |
  | Violent victimisation (initial, fades) | −900 | −600 to −1,200 | Mahuteau & Zhu (computed) |
  | Property victimisation (initial, fades) | −200 | −100 to −300 | Mahuteau & Zhu (computed) |
  | Fear of crime at the most dangerous cell | −300 | 0 to −500 | Hanslmaier, Cornaglia (inference) |
  | Income inequality (Gini) directly | 0 | 0 | two null meta-analyses |
- **No direct Gini term.** Inequality should matter only through relative income and fear, which the model already carries. That matches the meta-analyses and avoids double counting.
- **Income comparisons are the Easterlin–Stevenson compromise** (inference). Within a town, own income enters with 350 per doubling (300 relative + 50 absolute), close to Kahneman–Deaton. If every income in a closed economy doubles, LS rises 300 at first, then settles at +50.
- **Health enters only when a health system exists.** Use −300 for a chronic condition and −600 for severe disability with partial adaptation (Oswald & Powdthavee, computed on a 0–10 rescale). No current milestone models health, so this is a hook.

### Gaps
- No ladder-point effect of food insecurity was opened: both Frongillo papers are paywalled, and MDPI and Wiley alternatives were blocked. The −150 per missed-meal day is an unsourced estimate.
- Fear of crime's individual effect on LS (Hanslmaier 2013) is search summary only.
- Relative versus absolute income is still disputed (Easterlin versus Stevenson–Wolfers). The +50 absolute term is a modelling choice, not a finding.
- The WHR coefficients are country-level. Individual-level social-support and freedom coefficients were not found.

---

## b) Adaptation: which shocks fade, and how fast

### Takeaway
- **Fades within about a year:** violent victimisation (−0.40 in year one, near zero after) and the post-marriage boost (back to baseline in about 11 months in a 188-study meta-analysis) ([Mahuteau & Zhu 2016](https://docs.iza.org/dp9253.pdf); [Luhmann et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289759/), both opened; months computed).
- **Fades over 1.5–4 years:** bereavement (about 20 months), mild disability (about 3 years), and about 65% of a raise within 4 years ([Di Tella et al. 2010](https://www.nber.org/system/files/working_papers/w13159/w13159.pdf), opened).
- **Does not fade:** unemployment for men over 4 years (−0.87 to −0.92 against the inactive, throughout) and much of severe disability (−0.60 to −0.37 over 3 years) ([Clark et al.](https://docs.iza.org/dp2526.pdf); [Oswald & Powdthavee](https://docs.iza.org/dp2208.pdf), opened).
- **Wealth gains persist:** a $100,000 lottery prize raises LS by 0.037 SD, about 0.07 points, with no fading over 5–22 years ([Lindqvist et al.](https://www.nber.org/system/files/working_papers/w24667/w24667.pdf), opened).
- **Anticipation is real:** LS dips one to three years before divorce, layoff and moves ([Clark et al.](https://docs.iza.org/dp2526.pdf); [Nowok et al. 2013](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/6563/vanHam_2013_EPA_Migration_AM.pdf?sequence=1&isAllowed=y), opened).

### Cited Findings
- Clark et al. summary table (GSOEP, 20 waves): men adapt fully to marriage (3 years), divorce, widowhood, first child and layoff, but not at all to unemployment. Women show some adaptation to unemployment. Marriage keeps a small long-run positive effect. — [IZA DP 2526, p. 17](https://docs.iza.org/dp2526.pdf) (opened)
- Clark et al.: for men still unemployed, the extra penalty "is consistently around −0.3, and if anything, becomes larger over time". Layoff's raw long-run effect for men comes from later unemployment, not the layoff. — [IZA DP 2526, pp. 13–16](https://docs.iza.org/dp2526.pdf) (opened)
- Luhmann, Hofmann, Eid & Lucas (2012): 188 publications, 313 samples, 65,911 people. Time since event is log-transformed months. Life satisfaction (cognitive well-being) changes, in d units:
  - unemployment: initial −0.43 (CI −0.48 to −0.38), slope +0.12 per log-month, baseline regained "approximately three years after the event";
  - bereavement: initial −0.48, slope +0.16;
  - marriage: initial +0.26, slope −0.11;
  - unemployment leaves affective well-being below baseline throughout.
  — [PMC3289759](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289759/) (opened)
- Luhmann et al. also cite Lucas et al. (2004): after unemployment, SWB stays below baseline "even if people became reemployed", and repeated spells aggravate this. — [PMC3289759](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289759/) (opened)
- Di Tella, Haisken-De New & MacCulloch (2010 JEBO; 2007 NBER version), GSOEP 1984–2000, 7,812 people, 0–10. Current log income +0.23; four lags sum to −0.15, so 65.2% of the first-year effect is gone after four years, leaving 0.08. Full adaptation cannot be rejected. Status does not adapt. Happiness SD: total 1.74, between-person 1.36, within-person 1.20. A 10% loss weighs like a 21% gain, but the asymmetry is significant only at 26%. — [NBER w13159, pp. 11–22](https://www.nber.org/system/files/working_papers/w13159/w13159.pdf) (opened)
- Lindqvist, Östling & Cesarini (2020 REStud; 2018 NBER version), Swedish lottery players. $100,000 after tax raises overall LS by 0.037 SD (SE 0.014) and financial LS by 0.067 SD. Happiness (0.016) and mental health (0.013) effects are not significant. "No evidence that the effect varies by years-since-win." LS mean 7.21, SD 1.93. — [NBER w24667, Table 3](https://www.nber.org/system/files/working_papers/w24667/w24667.pdf) (opened)
- Oswald & Powdthavee (2008): see part a. Mild disability adapts fully in about 3 years; severe disability adapts about 38% in 3 years. — [IZA DP 2208](https://docs.iza.org/dp2208.pdf) (opened)
- Mahuteau & Zhu (2016): victimisation effects are "intense but short-lived", back to the pre-victimisation level a year after. — [IZA DP 9253](https://docs.iza.org/dp9253.pdf) (opened)
- Nowok, van Ham, Findlay & Gayle (2013), BHPS, 1–7 scale, fixed effects. LS is 0.06–0.11 below baseline from four years to one year before an internal move. It returns to baseline at the move and does not rise further. — [accepted manuscript, Table 3](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/6563/vanHam_2013_EPA_Migration_AM.pdf?sequence=1&isAllowed=y) (opened)
- Frongillo et al. (2019): the weaker food-insecurity slope in less-developed countries is "evidence of hedonic adaptation". — [PubMed 30597047](https://pubmed.ncbi.nlm.nih.gov/30597047/) (opened (abstract only))

### Inferences
- **Recovery times from Luhmann's log-time curves** (computed, assuming the transform is ln months): unemployment 0.43/0.12 → e^3.6 ≈ 36 months, bereavement e^3.0 ≈ 20 months, marriage e^2.4 ≈ 11 months. The 36 months matches the authors' "three years".
- **Exponential half-lives for the sim** (computed). Use real-time years and convert to sim days with the calendar (365 days, or 252 under the economy notes' 21-day months):

  | Driver | Adapts? | Half-life | Basis |
  |---|---|---|---|
  | Unemployment | No, by default | none (knob: 30% over 3 years) | Clark et al. men; Luhmann disagrees |
  | Scarring after re-employment | Yes | 1 year | Clark et al.: −0.11 at 1–2 years, −0.02 at 3–4; −200 initial gives −0.10 at 1 year and −0.03 at 3 |
  | Income change vs habit | Yes | 2.6 years | Di Tella: 65% gone in 4 years → τ = 3.8 years |
  | Income level vs median | No | none | Lindqvist: no fading over a decade |
  | Violent victimisation | Yes | 0.35 years | Mahuteau & Zhu; −900 initial gives −0.39 in year one and −0.05 in year two |
  | Property victimisation | Yes | 0.35 years | Mahuteau & Zhu; −200 initial gives −0.09 in year one |
  | Bereavement (if modelled) | Yes | about 0.6 years | Luhmann, about 20 months to baseline |
  | Isolation, food insecurity, fear | No, while the condition lasts | none | conditions, not one-off events |
- **Do not decay everything toward the set point.** A single global decay would erase unemployment and income-level effects, which the evidence says persist. Instead, the target is the set point plus drivers, and only event drivers carry their own fade.
- **Keep a short inertia on top.** LS moves toward its target with a 7-day half-life, so a missed meal does not swing the ladder in a day. This is smoothing, not adaptation (inference).
- **Loss aversion is optional.** Di Tella's 2:1 loss weight was not significant, so the default is symmetric. Victoria 3's radicals-on-decline is a design precedent, not evidence.
- **Set points differ between agents.** Draw each agent's set point once at birth, mean about 6.8–7.0 and SD 1.36 (Di Tella's between-person SD; Lindqvist's mean 7.21). Never inherit it or tie it to any group.

### Gaps
- Unemployment adaptation conflicts: Clark et al. (none for men over 4 years) versus Luhmann (baseline in about 3 years). The default follows Clark and the WHR 2017 summary; a knob covers Luhmann.
- The Clark et al. version opened is the 2006 IZA working paper; the published EJ 2008 tables may differ slightly. Its six events do not include income, so income adaptation rests on Di Tella et al. and Lindqvist et al.
- Session length versus real half-lives: a 2.6-year habit may outlast a play session. Whether to compress time for teaching is a design decision this research cannot settle.

---

## c) What happiness changes, and which links are robust enough to drive behaviour

### Takeaway
- **Robust enough to drive behaviour: job search and quits.** Telling below-median earners about a pay-disclosure website raised "very likely to search" by 4.3 points, a 20% rise. That answer predicted 19.5 points more actual turnover 27–35 months later ([Card et al. 2012](https://eml.berkeley.edu/~saez/card-mas-moretti-saezAER12ucpay.pdf), opened). Unit-level satisfaction correlates −0.25 with turnover across 1.88 million employees ([Krekel et al. 2019](https://cep.lse.ac.uk/pubs/download/dp1605.pdf), opened).
- **Real but short-run: productivity.** Induced happiness raised piece-rate output about 12% in the lab ([Oswald et al. 2015](https://www.andrewoswald.com/docs/actualJOLEpublished2015WRAP_Oswald_681096.pdf), opened). One point on a 1–5 weekly happiness scale raised call-centre sales 24.5% (CI 4.6–44.7%) ([Bellet et al.](https://cep.lse.ac.uk/pubs/download/dp1655.pdf), opened). Both are mood effects, not life-evaluation effects.
- **Intentions overstate moves about sevenfold.** Gallup's 710 million who wish to emigrate become 66 million planners (1.3% of adults) and 23 million preparers. Actual flows are about one seventh of planners ([IOM GMDAC 2017](https://publications.iom.int/system/files/pdf/gmdac_data_briefing_series_issue_9.pdf), opened). Emigration desire falls from about 25% at the ladder's bottom to 12–14% at the top ([Cai et al. 2014](https://link.springer.com/content/pdf/10.1186/2193-9039-3-8.pdf), opened).
- **Votes follow mean happiness.** One SD of national LS change goes with an 8.5-point swing in incumbent vote share, more than growth (4.5) or unemployment (3.5) ([Ward 2019](https://cep.lse.ac.uk/pubs/download/dp1343.pdf), opened). Negative feelings raise protest intentions 3–4 points per step, but LS does not change turnout ([Lindholm 2020](https://serval.unil.ch/resource/serval:BIB_C44DFFAAC2A3.P001/REF), opened).
- **Not robust: unhappiness causing crime.** No causal estimate was found. Nomos already drives offending from unemployment and income (round 2), so an LS link would double count.

### Cited Findings
**Productivity**
- Oswald, Proto & Sgroi (2015), 713 Warwick students, timed additions at piece rate. A 10-minute comedy clip, or drinks and snacks, raised productivity by about 2 of 20 additions, "approximately 10%–12%". A bad life event (bereavement or family illness) in the previous year cut output by more than 10%, fading with time since the event. — [JOLE PDF](https://www.andrewoswald.com/docs/actualJOLEpublished2015WRAP_Oswald_681096.pdf) (opened)
- Bellet, De Neve & Ward (CEP DP 1655, revised Feb 2020), British Telecom call centres, 1–5 weekly happiness. Weeks rated very happy versus very unhappy differ by about 13% in sales. The weather-instrumented estimate is 24.5% per point (CI 4.6–44.7%); the within-worker SD is 0.95. Effects run through calls per hour and conversion, with "no effects on the extensive margin" (attendance, breaks). — [CEP DP 1655](https://cep.lse.ac.uk/pubs/download/dp1655.pdf) (opened)
- The published Management Science version is reported as "13% more productive". — [Erasmus news](https://www.eur.nl/en/ese/news/study-finds-happy-workers-are-13-more-productive) (search summary)
- Krekel, Ward & De Neve (2019), Gallup meta-analysis: 339 studies, 1,882,131 employees, 82,248 business units. Employee satisfaction correlates 0.31 with customer loyalty, 0.20 with productivity, 0.16 with profitability and −0.25 (CI −0.28 to −0.22) with turnover. — [CEP DP 1605](https://cep.lse.ac.uk/pubs/download/dp1605.pdf) (opened)

**Job search and quits**
- Card et al. (2012): below-median earners told about the pay website became 4.3 points more "very likely" to look for a new job (t = 2.4). "Dissatisfied and very likely to search" rose 5.2 points, 40% over controls. The bottom quartile's quit probability rose 2.3 points against a 31% base (t = 1.74, imprecise). — [AER PDF](https://eml.berkeley.edu/~saez/card-mas-moretti-saezAER12ucpay.pdf) (opened)
- Card et al.: respondents "very likely to search" showed 19.5 points higher turnover 27–35 months later, "somewhat likely" 5 points. — [AER PDF](https://eml.berkeley.edu/~saez/card-mas-moretti-saezAER12ucpay.pdf) (opened)
- Kristensen & Westergård-Nielsen (2004), Danish ECHP 1994–2000: "Low overall job satisfaction significantly increases the probability of quit." Satisfaction with the type of work predicts best; job security does not, unlike in the UK. — [IZA DP 1026](https://docs.iza.org/dp1026.pdf) (opened)
- Clark (2001), BHPS: job satisfaction predicts quits beyond wages and hours; security and pay rank first. — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0927537101000318) (search summary)

**Migration**
- IOM GMDAC (2017), Gallup 2010–2015: 710 million adults wish to migrate; 66 million (1.3%) plan to within 12 months; 23 million (0.4%) have prepared. Recorded flows are about three times smaller than preparers and seven times smaller than planners. A 1% rise in planners goes with 0.9% more outflows. Realisation varies: 8 in 10 preparers in Finland, 2 in 10 in Russia. — [GMDAC briefing 9](https://publications.iom.int/system/files/pdf/gmdac_data_briefing_series_issue_9.pdf) (opened)
- Cai, Esipova, Oppenheimer & Feng (2014), Gallup World Poll: higher SWB means lower emigration desire, more robustly than income does. Predicted desire is 25.4% at the bottom ladder category and 12.2–13.8% at the top. — [IZA J. Migration PDF, Table 1](https://link.springer.com/content/pdf/10.1186/2193-9039-3-8.pdf) (opened)
- Otrachshenko & Popova (2014), Eurobarometer: dissatisfied people intend to migrate more; economic conditions act partly through LS. — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2364407) (search summary)
- Nowok et al. (2013): see part b, the pre-move dip. Luhmann et al. (2012) find relocation and migration neutral for SWB. — [Nowok](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/6563/vanHam_2013_EPA_Migration_AM.pdf?sequence=1&isAllowed=y); [PMC3289759](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289759/) (opened)

**Voting and protest**
- Ward (2019), Eurobarometer, 15 EU countries, country fixed effects: a one-SD within-country change in LS goes with about an 8.5-point swing in governing-coalition vote share. Growth gives 4.5 and unemployment 3.5 points; unemployment loses significance once LS is included. — [CEP DP 1343](https://cep.lse.ac.uk/pubs/download/dp1343.pdf) (opened)
- Ward et al. (2021): US county life evaluation correlates −0.78 with the 2016 Trump vote over Republican baselines, and low SWB predicts anti-incumbent voting in 2012. — [PubMed 32700960](https://pubmed.ncbi.nlm.nih.gov/32700960/) (search summary)
- Lindholm (2020), Swiss Household Panel 2000–2008, fixed effects: one step more negative feeling raises strike intention 3 points and readiness to demonstrate 4 points. SWB has no significant effect on voting. — [SJS PDF](https://serval.unil.ch/resource/serval:BIB_C44DFFAAC2A3.P001/REF) (opened)
- Flavin & Keane (2012): happier Americans participate more in non-conflictual politics, with no link to protest. — [ResearchGate record](https://www.researchgate.net/publication/227315898_Life_Satisfaction_and_Political_Participation_Evidence_from_the_United_States) (search summary)

**Crime**
- General strain theory studies report small standardised effects of strain on delinquency (about 0.08–0.16), mediated by anger. — [search results](https://www.westerncriminology.org/documents/WCR/v06n1/article_pdfs/wareham.pdf) (search summary)
- Round 2 set offending to respond to unemployment: +1% to +3% property crime per point (Raphael & Winter-Ebmer; Levitt 2002 table). — [crime-policing-calibration.md, Q10](../../round-2-follow-up/notes/crime-policing-calibration.md) (opened)
- Games link unhappiness to crime by design: Songs of Syx spawns criminals from "law and happiness" (round 1, search summary), and Cities: Skylines II raises criminal probability with low well-being. — [CS2 wiki: Citizens](https://cs2.paradoxwikis.com/Citizens) (fetch-tool summary)

### Inferences
- **Drive on-the-job search from LS** (inference anchored on Card et al. and Krekel et al.). Multiply the monthly search probability π by 1 + 0.15 per ladder point below 7, capped at ×2. Check that firm-level satisfaction and quits correlate near r = −0.25.
- **Keep productivity optional and small** (inference). If used, scale output by ±4% per ladder point of the fast mood layer, capped at ±8%. The field and lab effects are weekly mood, and the economy is calibrated without them.
- **Migration push, small and per settlement** (computed, then inference). Desire changes about 1.3–1.5 points per ladder step (Cai). Plans are about 9% of desire and moves about one seventh of plans (GMDAC). So one ladder point moves about 0.02 points of the population a year abroad. Internal moves are cheaper, so let a settlement's mean LS below the national mean raise its out-migration hazard by up to +10% per point. Wages stay the main driver; check migration still runs at 3.6–5.5% a year.
- **Show approval, do not elect yet.** Nomos has no elections. A "government approval" readout from mean LS is honest (Ward). Protest is not robust enough to drive behaviour; leave it out.
- **No LS → crime link.** It lacks causal evidence, double counts unemployment, and would draw "sad people steal". Crime stays an act driven by desperation, opportunity and risk.

### Gaps
- No usable elasticity from LS or job satisfaction to quit rates was opened. Card et al. is an information treatment, and Krekel et al. is correlational. The 0.15 per point is an inference.
- No individual panel linking LS to realised internal moves with an elasticity was found; Nowok shows only the pre-move dip.
- Ward's SD is of national LS changes over time in Europe; its size in ladder points was not extracted.
- Tjaden, Auer & Laczko (2019) was not opened; the GMDAC briefing by the same authors was.

---

## d) Game prior art: what is legible, what feels fair, what to avoid

### Takeaway
- **Every major game uses a target-plus-modifiers model.** RimWorld's mood starts at 32% and sums timed "thoughts" such as a lavish meal (+12 for 1 day) or malnourishment (−26). The bar chases its target at +12 per hour up and −8 down ([RimWorld wiki](https://rimworldwiki.com/wiki/Mood), opened).
- **Breakdown thresholds carry an anti-spiral release.** Below 35% a minor break comes on average every 4 days, below 20% every 0.8 days, below 5% every 0.5 days. Each break grants +40 "catharsis" for 3 days to stop spirals ([RimWorld wiki: Mental break](https://rimworldwiki.com/wiki/Mental_break), opened).
- **The treadmill is a known mechanic.** RimWorld's "expectations" add +30 at low colony wealth down to 0 at sky-high ([RimWorld wiki](https://rimworldwiki.com/wiki/Expectations), opened). Victoria 3 radicalises pops whose living standard falls, +3% per decline, scaled down above SoL 15 ([Victoria 3 wiki](https://vic3.paradoxwikis.com/Standard_of_living), fetch-tool summary).
- **Two pitfalls to avoid.** Status-coded expectations (RimWorld's noble −6 to −12 and slave +28 to +40; Victoria 3's expected SoL 5, 10 or 15 by stratum) encode class. Frostpunk raises hope with guard stations and secret informants ([Frostpunk wiki: Hope](https://frostpunk.fandom.com/wiki/Hope), opened).

### Cited Findings
- **RimWorld mood.** Mood runs 0–100%. Base mood is 32 on Strive to survive (22–42 by difficulty), plus the sum of thoughts. Breaks happen at 35/20/5% thresholds, adjustable by traits. Sleeping freezes the bar. The game compares managing mood to Maslow's hierarchy. — [rimworldwiki.com/wiki/Mood](https://rimworldwiki.com/wiki/Mood) (opened)
- **RimWorld thoughts.** Ate lavish meal +12 and fine meal +5, each 1 day; raw food −7; ate without a table −3; ravenously hungry −12; malnourished −26. — [rimworldwiki.com/wiki/Expectations (thought tables)](https://rimworldwiki.com/wiki/Expectations) (opened); hungry −6 on the Mood page (opened)
- **RimWorld expectations.** Extremely low +30, very low +24, low +18, moderate +12, high +6, sky-high 0, by colony wealth thresholds. Noble and royal titles subtract 6–12; slave expectations add 28–40. — [rimworldwiki.com/wiki/Expectations](https://rimworldwiki.com/wiki/Expectations) (opened)
- **RimWorld breaks.** Minor break mean time between 4 days, major 0.8 days, extreme 0.5 days; catharsis +40 for 3 days "will generally prevent pawns from entering a spiral of mental breakdowns". — [rimworldwiki.com/wiki/Mental_break](https://rimworldwiki.com/wiki/Mental_break) (opened)
- **The Sims.** Mood comes from need levels (The Sims, The Sims 2) and from timed or situational moodlets (The Sims 3 and 4). In The Sims 3: Happy +10 to +25, Very Happy +25 to +75, Elated above +75, with the meter showing up to +150. Bad-mood Sims refuse skill-building and may not go to work; good mood raises job performance. The plumbob turns green or red with mood. — [sims.fandom.com Mood](https://sims.fandom.com/wiki/Mood), [Moodlet](https://sims.fandom.com/wiki/Moodlet) (raw wiki source, opened)
- **The Sims 4 emotions.** The game sums each emotion's moodlet weights, and the highest total sets the emotion. Stages escalate with the total (Angry 1–2, Very Angry 3–6, Enraged 7+). — [sims.fandom.com Emotion](https://sims.fandom.com/wiki/Emotion) (raw wiki source, opened)
- **Frostpunk.** Discontent rises with bad food, cold, hunger, overtime and broken promises, and falls with pubs, duels, executions, patrols and guard stations. Hope falls with deaths and rises with prayer houses, propaganda, secret informants and guard stations. Sustained high discontent or low hope ends the game. — [Discontent](https://frostpunk.fandom.com/wiki/Discontent), [Hope](https://frostpunk.fandom.com/wiki/Hope) (raw wiki source, opened)
- **Tropico 6.** Happiness combines food, healthcare, fun, faith, housing, job, liberty and crime safety. Unhappy citizens leave, vote against the presidente, protest, rise up and join rebels. — [tropico.fandom.com Happiness](https://tropico.fandom.com/wiki/Happiness) (raw wiki source, opened)
- **Victoria 3.** SoL runs 1–99, set by pop wealth. Expected SoL is 5, 10 or 15 by stratum, plus up to 5 from literacy. Pops below expectation radicalise +0.2% a month per level. — [vic3 wiki](https://vic3.paradoxwikis.com/Standard_of_living) (fetch-tool summary)
- **Cities: Skylines.** Happiness raises the chance that buildings level up and that citizens pay more tax; the formula is not documented. In Skylines II, happiness is well-being plus health; low well-being raises criminal probability and lowers work efficiency. — [Skylines wiki](https://skylines.paradoxwikis.com/Happiness); [CS2 wiki](https://cs2.paradoxwikis.com/Citizens) (fetch-tool summary)
- **Dwarf Fortress.** Stress is one integer from −1,000,000 to +1,000,000. Effects begin at +10,000, +25,000 and +50,000. Thoughts add or subtract, and stress drifts back to neutral. — [DF2014:Stress](https://dwarffortresswiki.org/index.php/DF2014:Stress) (raw wiki source, opened)
- **Round 2 interface patterns.** Frostpunk previews law effects only qualitatively ("slightly"); CK3 and Victoria 3 nested tooltips explain where a number comes from. — [presentation-launch-ethics.md, Q2](../../round-2-follow-up/notes/presentation-launch-ethics.md) (opened; underlying claims are search summaries)

### Inferences
- **Legible:** one number per agent plus its top three reasons, each with a sign and a remaining duration (RimWorld thoughts, Sims moodlets). Nomos's click-to-explain inspector and nested tooltips fit this directly.
- **Fair:** effects that are predictable, explained and bounded. Nomos should show predicted sizes, not Frostpunk's adjectives, because it is a teaching tool.
- **Avoid death spirals.** If LS feeds back (for example, low LS lowering productivity and so income), cap the loop gain below 1 and add a RimWorld-style floor or release.
- **Avoid status-coded expectations.** Use each agent's own income habit as the treadmill. It is role-neutral and evidence-based (Di Tella), unlike strata-based expected SoL.
- **Avoid making policing raise happiness directly.** Route police effects through true and perceived crime into fear, as the evidence does. This also follows the neutral-police rule in `content.md`.
- **Avoid happiness-spawned crime and mood plumbobs.** Both games do it; Nomos's ethics and evidence say no (parts c and e).
- **Integer state has precedent.** Dwarf Fortress tracks stress as one integer with thresholds, like the proposed 0–10,000 scale.

### Gaps
- Victoria 3 and Cities: Skylines came only through fetch-tool summaries, because the Paradox wikis require JavaScript.
- No developer post-mortem on mood-system fairness was opened; the "anti-spiral" reading comes from the RimWorld wiki text.

---

## e) A deterministic integer model, its cost, and how to show it

### Takeaway
- **Per agent:** 29–36 ns per sim day for the full model on a desktop Ryzen 5 3600 in Node 24.18 (V8 13.6), with zero garbage collections (measured here). That is 0.29–0.36 ms per day at 10k agents and 2.9–3.7 ms at 100k.
- **Stagger it.** Computing 1/K of agents per tick into a back buffer and swapping at the day boundary costs about 47 µs a tick at 100k agents with K = 64 (computed). That fits the 1.2–1.4 ms "other agent systems" sub-budget easily.
- **Per settlement:** the happiness block (mean, two sub-means, an income habit, 5 band counts) costs 63–75 ns per settlement-day (measured here). At 10,000 settlements that adds about 0.73 ms on this desktop, about 1 ms on the reference machine, to the 8.4 ms measured day, under the 12 ms budget (computed).
- **Determinism:** results were bit-identical when agents were processed in a shuffled order, and the branchy and branchless kernels gave the same hash (measured here).
- **Display:** no resting faces or plumbobs from LS, because LS correlates with income and unemployment. Show it as a settlement meter, an opt-in district lens and the inspector's driver list.

### Cited Findings (measured here)
- **Setup.** Node v24.18.0, V8 13.6.233.17-node.50, x64, AMD Ryzen 5 3600 (6 cores, 12 threads), Windows 10 with Git Bash. `/proc/loadavg` (MSYS emulation) read 0.43–4.46 across runs; other researchers were benchmarking at the same time. Warm-up 200 sim days, then 9 samples of 50 days each; median with [min–max] of the per-day time. Day-boundary work only; the churn of job, victim and meal events is outside the timer.
- **Agent pass** (100,000 agents in one settlement unless noted):

  | Kernel | 10k agents, ms/day | 25k | 100k | 100k in 64 settlements | ns per agent | GCs |
  |---|---|---|---|---|---|---|
  | Branchy | 0.356 [0.338–0.435] | 0.901 [0.857–0.942] | 3.57 [3.45–3.78] | 3.68 [3.53–4.22] | 35.6–36.8 | 0 |
  | Branchless (min() via bit tricks, flag masks, band LUT) | 0.288 [0.285–0.319] | 0.727 [0.703–0.737] | 3.02 [2.89–3.45] | 2.95 [2.94–3.14] | 28.8–30.2 | 0 |

  An earlier run under load average 4.46 gave 37.6–43.2 ns per agent for the branchy kernel.
- **Ablation** (100k agents, synthetic arrays, load average 2.44): the same arithmetic with no live events and settlement-free folds ran at 12.5–15.6 ns per agent. Income plus inertia alone ran at 4.1 ns. The gap to 29–36 ns comes from unpredictable event branches and the per-settlement folds.
- **Settlement ledger block:** 1,000 settlements 0.063 ms/day [0.061–0.064] (63 ns each); 10,000 settlements 0.726 ms/day [0.711–0.840] (73 ns each). Band counts summed exactly to population in every settlement. Load average 0.21.
- **Order independence:** 20,000 agents in 4 settlements over 60 days, processed in order and in a keyed shuffled order, gave the same LS hash.
- **Kernel core** (branchless; the full bench is `prototypes/happiness/happy-bench.mjs`):

  ```js
  let t = setPt[i] + ((dRel * 300) >> 16) + ((dChg * 250) >> 16) + shared[s]   // dRel, dChg: Q16 log2, clamped to ±4
        + (1 - emp) * U_PEN + emp * ((SCAR_PEN * SCAR_Z[ds]) >> 15)            // ds, dv: min(days since, LUT end)
        + (1 - fr) * ISO_PEN + fp + ((VPEN[kind] * VIC_Z[dv]) >> 15)
        + ((FEAR_W * fear[cell[i]]) >> 8);
  t = t < 0 ? 0 : t; t = t > 10000 ? 10000 : t;
  ls[i] += ((t - ls[i]) * 6182) >> 16;   // 1 - 2^(-1/7) in Q16: 7-day inertia toward the target
  habit[i] += (L - habit[i]) >> 10;      // income habit, half-life ≈ 710 days
  ```

  log2 uses `Math.clz32` plus a 256-entry Q16 table built by repeated squaring, the same method as the cost prototype. Decay tables use repeated `Math.sqrt(0.5)`, which is exact.

### Inferences
- **State per agent:** `ls` Int16, `setPt` Int16, `habit` Int32 (Q16 log2 income), last-victimisation day and kind, re-employment day, and a missed-meal count. That is 18 bytes, or about 12 bytes with saturating Uint16 "days since" counters, well inside the 256-byte cap.
- **Update rule:** target = set point + the drivers in part a. Then LS moves 9.4% of the way to the target each day (7-day half-life). The income habit moves a fixed fraction of the way to today's log income; the bench used 1/1,024 (half-life 710 days), and production should set the rate from the calendar so the half-life is 2.6 years. Event drivers fade through build-time tables. The settlement terms (unemployment spillover, inflation) are computed once per settlement per day.
- **Bench constants differ slightly from the recommendation** (−800 violent, −150 scarring with a 0.7-year half-life). That changes no timing, because the arithmetic is the same.
- **Plan, then apply.** The pass reads only yesterday's committed aggregates: the settlement median log income from a 16-bins-per-octave histogram, unemployment and inflation. It writes only the agent's own state plus today's folds. So it is order-independent and worker-chunkable.
- **Stagger with a double buffer.** Compute next-day LS for 1/K of agents per tick into a back buffer and swap at the day boundary. The boundary then costs a pointer swap, which honours "canonical writes only at the day boundary". Inputs lag one day, which is harmless for life evaluation.
- **Fit to budget** (computed). Using the plan's desktop multiplier of 0.75, 0.36 ms desktop is about 0.48 ms on the reference machine at 10k agents unstaggered. Staggered, it is well under 0.05 ms a tick at any tier. Phones are not measured.
- **Settlement ledger block:** add about 9 numbers to the 30–80: mean LS for employed and unemployed (Int32 milli-ladder), a log2 median-income habit, the base level, and 5 band counts (Int32). Cut points are 4.0, 5.5, 7.0, 8.5 on the ladder, matching the cost prototype's 5 bands. Each day, update the two means toward the aggregate target. Rebuild the bands exactly from a build-time band-share table (normal, SD 1.9, mean in 0.05 steps), apportioned by largest remainder.
- **Spawn and fold.** `spawnFromLedger` draws agent set points so the spawned bands match the ledger's band counts. `foldToLedger` returns exact band counts and the sum of LS. The 1.9 SD matches Lindqvist's 1.93 and should be refitted from city runs for the emulator.
- **A distribution check is needed.** The model's between-agent SD (set points 1.36 plus income and events) is about 1.4–1.5, below the 1.9 seen in surveys. An optional AR(1) noise term from keyed draws (SD 0.6, half-life 90 days) would close the gap (inference).
- **How to show it without stereotypes:**
  - **No body cue by default.** LS correlates with income and job status. A resting sad face or a red plumbob would make poverty and unemployment visible on bodies, against `content.md` rule 5. Faces stay "momentary feeling" from events, as the round 3 art bible says.
  - **Bubbles stay event-driven:** a heart for social contact, a sweat drop for a fear event, both rate-limited, mood last in priority. No bubble fires from the LS level.
  - **Aggregates:** a settlement meter (mean to one decimal, plus a three-segment bar: suffering below 4, struggling 4–7, thriving 7 and above) and an opt-in district ground lens.
  - **Inspector:** a click-to-explain list of signed drivers, for example "Unemployed −0.70; income vs town median +0.21; theft 40 days ago −0.12".
  - **Audit:** extend the M5 appearance audit so no body pixel varies with LS, and bubble rates by wealth decile differ only through events.
- **Predicted policy sizes for M5 sliders** (computed from the defaults):
  - unemployment down 1 point: mean LS +0.027 (0.007 from the newly employed plus 0.020 spillover);
  - inflation from 5% to 2%: +0.021;
  - unemployment benefit from 40% to 60% of the median wage: +0.20 for the unemployed in the long run, +0.35 at first while the habit lags (350 and 250 per doubling × log2 1.5 = 0.585);
  - doubling every income in one town: +0.30 at first, about +0.12 after 5 years, +0.05 in the long run;
  - halving fear of crime where cells average 0.1 of maximum danger: about +0.015, more than halving 2% annual violent victimisation (+0.004).

### Gaps
- Only Node and V8 on one desktop were measured. JavaScriptCore (Bun), Chromium and WASM were not, and no phone was measured; the scope guard blocked the local Playwright folder.
- The MSYS `/proc/loadavg` on Windows may not be a true Linux load average, and other researchers' benchmarks ran concurrently.
- The ledger band table used `Math.exp` at start-up in the bench. Production must build it with @stdlib at build time and ship it as data, per `sim-core.md`.
- The cost prototype's `happinessDay` ([integration-cost/daily.mjs](../prototypes/integration-cost/daily.mjs), opened) adds drivers as daily increments with a 10%-a-day pull to the set point. That gives steady effects of about 10× each increment and fades everything. **Hand-off:** the target-plus-fading-events model above, with the part a constants, should replace it; the 5-band layout already matches.

---

## Recommendation for the plan

**Model in one paragraph.** Each agent holds life satisfaction 0–10,000 (milli-ladder). Each sim day its target is a set point (drawn at birth, mean 6.8–7.0, SD 1.36) plus drivers. Drivers: +300 per doubling of income vs the settlement median, +50 per doubling vs subsistence, +250 per doubling vs its own income habit (half-life 2.6 years), −700 if unemployed (no adaptation), −200 scarring after re-employment (half-life 1 year), −450 if isolated for 7 days, a food-insecurity penalty from the food notes, −900 violent or −200 property victimisation (half-life 0.35 years), up to −300 fear of crime, −20 per point of settlement unemployment and −7 per point of inflation. LS moves toward its target with a 7-day half-life. There is no direct inequality term.

**What LS drives.** Job search (×(1 + 0.15 per point below 7), capped ×2) and, in country mode, a small migration push. It shows an approval readout. It never drives crime, faces or clothes. Productivity is an optional M5 switch (±4% per point of mood, capped ±8%).

**Draft plan tasks, tagged (R6):**

- **M0 Pipeline**
  - [ ] Build the happiness tables at build time with @stdlib, shipped as data: Q16 log2 (256 entries), fade tables for 0.35-, 1- and 2.6-year half-lives, an inverse-normal table for set points, and the ledger band-share table (R6).
- **M1 Lab mode**
  - [ ] Add a bet card, "Does money buy happiness?": double one agent's income versus double everyone's. Predicted answer: one agent gains +0.60 at first and keeps +0.35; everyone gains +0.30 at first and keeps +0.05, because comparisons dominate (R6).
  - [ ] Add a bet card, "Jobs or prices?": one point of unemployment versus one point of inflation. Predicted answer: about 4:1 in this model (R6).
- **M2 Economy**
  - [ ] Feed each household's daily income into a Q16 log2 income habit, and publish each settlement's median log income from a 16-bins-per-octave histogram at the day boundary (R6).
  - [ ] Scale on-the-job search by 1 + 0.15 per ladder point below 7, capped at ×2, and check that firm-level LS and quits correlate near r = −0.25 (R6).
- **M3 City life**
  - [ ] Add life satisfaction to `AgentStore` (Int16 0–10,000, Int16 set point, Int32 income habit, saturating Uint16 event counters; about 12 bytes) and update it in one order-independent day pass. Stagger 1/K of agents per tick into a back buffer swapped at the boundary (R6).
  - [ ] Wire the needs inputs: −450 for 7 days without friend or household contact, and the food-insecurity penalty agreed with the food notes (R6).
  - [ ] Show the drivers in the click-to-explain inspector as signed contributions with remaining fade time, and add a settlement LS meter (mean plus suffering, struggling and thriving shares) to the HUD (R6).
  - [ ] Exit check: within a town, LS rises 0.30–0.45 per doubling of income; the employed–unemployed gap is 0.6–1.0; the day pass stays within its sub-budget at 10k and 25k agents with zero GC (R6).
- **M4 Crime and police**
  - [ ] Add victimisation (−900 violent, −200 property, half-life 0.35 years) and a fear term of up to −300 from each cell's perceived danger, fed by true and recorded crime, never by police presence alone (R6).
  - [ ] Exit check: a violent-crime victim's LS averages 0.3–0.45 below baseline in the year of the crime and under 0.1 the year after (R6).
- **M5 Society and policy**
  - [ ] Add −20 per point of settlement unemployment and −7 per point of annual inflation, and give each policy slider a predicted LS size next to its other predictions (R6).
  - [ ] Add an opt-in wellbeing lens as a district ground overlay and a government-approval readout from mean LS; do not add elections or protests (R6).
  - [ ] Extend the appearance audit: no body pixel varies with LS, faces stay event-driven, and bubble rates by wealth decile differ only through events (R6).
  - [ ] Optional: a "happiness affects productivity" switch at ±4% per ladder point of mood, capped at ±8%, off by default (R6).
- **M7 Country of ledgers**
  - [ ] Add the settlement happiness block: employed and unemployed mean LS, an income habit, a base level and 5 band counts (cuts 4.0, 5.5, 7.0, 8.5), rebuilt daily from the band table by largest remainder (about 70 ns per settlement-day) (R6).
  - [ ] Add +150 per doubling of settlement median income vs the national median, and let mean LS below the national mean raise out-migration by up to 10% per point, keeping total migration at 3.6–5.5% a year (R6).
- **M9 Zoom across scales**
  - [ ] Make spawn draw set points so spawned bands match the ledger, and make fold return exact band counts and summed LS (R6).

**Verify before hard-coding (R6):**

| Figure or question | Decides | Milestone |
|---|---|---|
| A ladder-point effect of food insecurity (Frongillo 2017 full text, or a panel study) | The food penalty | M3 |
| Unemployment adaptation: none (Clark et al.) or 3 years (Luhmann et al.) | Whether the −700 fades | M3 |
| An LS or job-satisfaction elasticity for quits | The 0.15 search multiplier | M2 |
| How much fear of crime lowers LS individually (Hanslmaier 2013 tables) | The −300 cap | M4 |
| Kernel time in Bun, Chromium and WASM, and on one phone | The staggering factor K | M3 |
| Survey LS spread (SD 1.9) versus the model's 1.4–1.5 | Whether to add AR(1) noise | M3 |
