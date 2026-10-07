# M5 Society and policy: sub-milestones

M5 holds 34 build tasks and 9 exit checks in the [implementation plan](../implementation-plan.md#m5-society-and-policy), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0–M4 can rescale them. The plan's M5 effort line, about 2 weeks plus 1–2 days for the visual layer, covers rounds 1 and 3 only. The owner's plans add 3–6 days for the calendar, 1–2 for the defence budget and 1 for the gazette. The 23 tasks from rounds 2, 4, 6, 8 and 9 carry no estimate of their own. The plan's own figures sum to 16–21 days, and this breakdown to 36–56.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M5.1 Policies, budget and branches | The treasury and policy settings with predicted sizes, set before Run, where a change forks a branch | 6–9 days | | | |
| M5.2 Ageing and social ties | Real ages, friends, rumours and fear, and culture-blind housing moves and partners | 6–9 days | | | |
| M5.3 Wealth and resources | Wealth and resource policies, development and wealth presets, and harvest shocks | 8–12 days | | | |
| M5.4 Wellbeing and fear on screen | Life satisfaction tied to policy, and opt-in lenses and meters that never mark a person | 4–7 days | | | |
| M5.5 Culture lens and audits | The opt-in culture and exposure lenses, and the appearance audits extended to wealth, culture and looks | 7–11 days | | | |
| M5.6 Calibration sweeps | Sensitivity analysis over every policy and city size, logged for the country emulator | 3–5 days | | | |
| M5.7 Year in review | The year-end card and gazette edition, and the follow-the-news camera | 2–3 days | | | |
| **Total** | | **36–56 days** | | | |

Three points apply throughout:
- **Policies are settings, not live sliders.** The owner made Nomos watch-only: every policy is set before Run, and a change during a run forks a labelled branch at the next day boundary (Calendar). Round 1's "policy sliders" are these settings.
- **Nothing marks a person.** Wealth, fear, mood and culture show only through places, overlays and opt-in lenses, never through how an agent looks (R3, R6, R8).
- **The model before the lenses.** M5.1–M5.3 build the policies and their effects; M5.4–M5.5 show them and prove nothing leaks into appearance.

## M5.1 Policies, budget and branches

- **Builds:**
  - the treasury, taxes, welfare and the police budget, the policy settings and role transitions (R1);
  - a size for each policy, not just a direction: a moderate minimum wage moves employment about ±1%, welfare cuts labour-force participation by 2–4 points, and taxes and transfers take the income Gini from about 0.49 to 0.45; the default wealth tax of about 3% a year is flagged as aggressive (R2);
  - policies set before Run: moving one during a run forks a labelled what-if branch at the next day boundary, the original keeps running, and both replay from (seed, settings, fork day, change) (Calendar);
  - the defence budget as a policy set before Run: soldier posts and pay from taxes, with its predicted effect on raids and taxes (Military).
- **Needs:** M2's households, firms and incomes to tax; M4.2's police; M0.3's day-boundary phase for forks; M3.2's soldier job.
- **Exit checks:**
  - no role goes extinct across seeds (R1).

## M5.2 Ageing and social ties

- **Builds:**
  - ageing: one year per 112-day year, with real lifespans, birthdays spread over the year, and age hazards converted as 1 − (1 − p)^(1/112) into build-time integer tables (Calendar);
  - the friend network, rumours and fear, contagion and Schelling moves (R1);
  - culture-blind housing and Schelling moves: any kin placement is a labelled knob, off by default, shown with the dissimilarity index and the place-driven disparity monitor; round 1's Schelling known-answer test stays on neutral colours, and culture dissimilarity above 0.2 is flagged (R8);
  - partner candidates weighted by how many customs they share, calibrated to the prototype's exogamy bands (own-culture preference 0.2 plus 0.1 per own custom kept), never by hue (R8);
  - the friend network offered as an optional source for adoption, with district counts the default; festival contact stays transient and builds no lasting ties unless an employment-by-culture audit also runs (R8).
- **Needs:** M3's homes and routines; M3.7's cultures and festivals; M4's crimes as the source of fear rumours.
- **Exit checks:**
  - the age pyramid stays within its band, no culture's festivals cluster in one season, and a branch replays identically from (seed, settings, fork day, change) (Calendar).

## M5.3 Wealth and resources

- **Builds:**
  - wealth-tax (0–3% above 4× mean net worth), estate-tax (0–70%), property-tax (0–2%, default 1%) and credit-access (0–2× income) policies, with the Gini and negative-net-worth sizes from the Goods & wellbeing tab (R6);
  - a note on each wealth policy that Nomos has no avoidance channel, so top-end effects are upper bounds (Denmark's long-run elasticity is about 0.5), and 3% labelled as above Denmark's historical 2.2% (R6);
  - the poverty-trap meter: households stuck at the credit limit for at least 5 years (R6);
  - if a wealth term is enabled, liquid wealth measured in years of settlement median income (+50 per year, capped at +150), never by fixed coin thresholds (R6);
  - euro-like and US-like wealth presets with CI bands, measured from a spawned start (R6);
  - development presets setting productivity per sector from World Bank 2023 bands: 0.7, 1.5, 4.4 and 47 t of cereal per farm worker a year (R6);
  - resource policies with predicted sizes: fishing effort (collapse above 0.75 r), logging quota (recovery in 70–85 years), and manure or fertiliser (an unfertilised floor of 0.35–0.45 of manured) (R6);
  - a markdown-and-donation policy predicting about 20% less shop waste, and a home-refrigeration subsidy moving homes from ambient to cool storage (R6);
  - harvest shocks as logged scenario inputs, announced as forecasts with uncertainty (R6).
- **Needs:** M2.5's household balance sheets; M2.4's goods and food; M3.5's harvest; M5.1's policy settings.
- **Verify first:** Sanders's 21% shop-waste figure, before the markdown policy predicts from it (R6).
- **Exit checks:**
  - every policy moves its metric in the predicted direction and by roughly the predicted size, and the Gini falls steadily as the wealth tax rises (R1, R2);
  - the food share falls about 7.8 points per doubling of income across presets (R6);
  - without policy changes, wealth drift over 50 years stays within 0.03 Gini and 3 points of top-10% share, and the wealth-tax Gini check runs from a spawned near-stationary state (R6).

## M5.4 Wellbeing and fear on screen

- **Builds:**
  - −20 life satisfaction per point of settlement unemployment and −7 per point of inflation, and a predicted life-satisfaction size for each policy (R6);
  - an opt-in district wellbeing lens, a government-approval readout from mean life satisfaction, and a district panel of the suffering share and the strongest drivers; never mood per house, and no elections or protests (R6);
  - optional: a happiness-affects-productivity switch at ±4% per ladder point, capped at ±8%, off by default (R6);
  - an opt-in wealth lens, fear-of-crime and trust-in-police meters, and rate-limited sweat-drop and heart bubbles (R3; the bubble art exists, so wire it in);
  - policy changes shown through places and overlays, such as station staffing, patrol density and shop shutters, never through how agents look (R3).
- **Needs:** M3.6's wellbeing; M4.4's victims and trust; M5.1's policies.
- **Owner decision first:** whether the optional happiness-affects-productivity switch ships at all, off by default.
- **Exit checks:** none of its own; M5.5's appearance audits cover these lenses and bubbles.

## M5.5 Culture lens and audits

- **Builds:**
  - the opt-in culture lens: off by default and never in share cards or default replays; customs only, as district shares in small multiples and the festival calendar, with M8 adding the home-regions map mode; justice cues hidden while it is on; separate Customs and Records inspector tabs; a palette apart from body hues and crime colours, with icons or patterns (R8);
  - a culture panel inside the lens (shares, effective number of cultures, customs from other cultures 0–4, generational retention), and City mode's boundary inflow of culturally different arrivals, defaulting to 0.5% a year (R8);
  - a place-and-hour Exposure lens: night outdoor hours, and victimisation and police contacts per 1,000 outdoor hours, by district and hour, never by culture; remedies act only on places and times (R8);
  - the appearance audit extended to wellbeing and wealth: no body pixel varies with life satisfaction, faces stay event-driven, bubbles are capped per agent per day, and every rendered attribute has |Spearman| < 0.05 with wealth decile outside the lens over 50 seeds (R6);
  - a culture row in the audit (|Cramér's V| < 0.05 for every rendered attribute outside the lens over 50 seeds), a hue × culture independence test over 10⁶ births, and no policy that reads culture (R8);
  - the audit and the hue × culture test extended to eye shape and pattern (R9);
  - the diverse playtest panel on customs and names: which real people does each culture resemble, and which commits more crime? (R8).
- **Needs:** M3.7's culture system; M4.5's culture audit; M5.4's lenses.
- **Owner decision first:** the playtest panel's bar, proposed as at least 8 in 10 naming no real people and seeing no difference.
- **Verify first:**
  - whether a stream of animated crime events, or the gazette's daily justice column, builds illusory correlation as static sentence lists do (round 8); it sets how strict the culture lens and justice-view rules must be;
  - round 8's transmission bands re-run with similar culture shares, not one 60% culture; they set the CI retention bands and the 0.5% inflow default;
  - culture lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1), so no lens colour reads as a body colour.
- **Exit checks:**
  - the appearance audit, extended to wealth, finds no rendered attribute that correlates with wealth decile outside the opt-in lens (R3);
  - recruitment and postings never read culture, region, looks or wealth, and the appearance and culture audits cover soldiers (Military).

## M5.6 Calibration sweeps

- **Builds:**
  - Morris screening and then Sobol indices via SALib text files beside the policy sweeps, calibrated against patterns with one or two held out (R2);
  - city size as a factor in the calibration sweeps (at least four sizes from 1,000 to 100,000 agents), with every run's daily flow logs kept so the same runs train the country emulator (R4).
- **Needs:** every policy from M5.1 and M5.3; M7.2's emulator fitter reads the logs.
- **Exit checks:**
  - the emulator fitter reads the sweep logs without conversion (R4).

## M5.7 Year in review

- **Builds:**
  - the year-in-review card (population, births and deaths, festivals held, true against recorded crime, wealth shifts) and history charts on a year axis, never broken down by culture (Calendar);
  - the year in review printed as the gazette's year-end edition, and an opt-in follow-the-news camera that eases to the front-page story at 4× and 16× (Gazette).
- **Needs:** M5.2's births and deaths; M5.3's wealth shifts; M3.8's gazette and M4.7's justice column.
- **Owner decision first:** whether the year-in-review card pauses the run or appears without stopping it.
- **Exit checks:**
  - the follow-the-news camera is off by default and never changes the state hash (Gazette).
