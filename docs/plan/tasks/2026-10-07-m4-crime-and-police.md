# M4 Crime and police: sub-milestones

M4 holds 24 build tasks and 15 exit checks in the [implementation plan](../implementation-plan.md#m4-crime-and-police), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0–M3 can rescale them. The plan's M4 effort line, 2–3 weeks plus 4–6 days for the visual layer, covers rounds 1 and 3 only. Round 4 adds 1–2 days, and the owner's plans add 0.5–1 day for sound and 1–2 for the gazette. The 14 tasks from rounds 2, 6 and 8 carry no estimate of their own. The plan's own figures sum to 16.5–26 days, and this breakdown to 28–40.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M4.1 Guarded decisions | Every guarded decision as a threshold and one keyed draw, under the flip test in CI | 2–3 days | | | |
| M4.2 Crime and justice loop | Offending, the hotspot field, patrols, arrests and jail, with true and recorded crime kept apart | 8–11 days | | | |
| M4.3 Calibrated crime | Clearances, reporting, hotspots and re-arrests tuned to measured figures, with daily district logs | 5–7 days | | | |
| M4.4 Victims, records and trust | Record states, and what crime and wrongful stops do to victims, contacts and trust in police | 3–4 days | | | |
| M4.5 Culture audit | The outcome and exposure audit over 50 paired seeds, with its counterfactual worlds | 3–5 days | | | |
| M4.6 Justice on screen | Justice buildings, events and the true and recorded views, drawn without stereotypes | 5–7 days | | | |
| M4.7 Justice sounds and gazette | The justice sounds in play, and the gazette's justice column | 2–3 days | | | |
| **Total** | | **28–40 days** | | | |

Three points apply throughout:
- **Guards before crime code.** M4.1 puts the flip test in CI first, so each later decision registers its threshold and draw key as it is written.
- **The model before the pictures.** M4.2–M4.5 build and audit the model, mostly headless, before M4.6 draws justice on screen.
- **Wire in what exists.** The justice buildings, the "!" and "?" bubbles and the 7 justice sounds are already built, so their tasks mostly wire them in.

## M4.1 Guarded decisions

- **Builds:**
  - every guarded decision written as an integer threshold followed by one keyed draw, and the flip test: shuffle culture, re-derive culture-package outputs, hold behaviour fixed, and require identical thresholds, utilities and draw keys across offending, targeting, patrols, stops, arrests, sentencing, reporting, hiring, wages, productivity and spawn wealth rank (R8).
- **Needs:** M0.6's `sim-culture` wall and relabel test, and M2's hiring, wages, productivity and spawned wealth ranks, the first decisions the flip test covers.
- **Exit checks:**
  - the flip test changes zero thresholds and draw keys over one seed-year of ticks, and catches planted id, custom, keyed-draw and hiring leaks (R8).

## M4.2 Crime and justice loop

- **Builds:**
  - the offend action, the Short hotspot field, respond, pursue, hot-spot and random patrol, lingering deterrence, jail, stigma, recidivism, true versus recorded crime, and guardrails against cascades (R1);
  - the Short decay as (1 − ω·δt), with one time step for every rate and never ω = 1/15 per hourly update, plus a rescaled θ and the police suppression term (R2);
  - police at about 0.25% of the population (0.2–0.5%) by default, or police dots labelled as patrol units, with exaggerated shares kept to labelled lab cards (R2).
- **Needs:** M3.2's daily routines, per-cell aggregates and soldier job, and its optional witness pass, built here if M3 skipped it; M2.4's shop stock as theft targets.
- **Owner decision first:** police near 0.25% of the population, or police dots labelled as patrol units; round 2 allows either.
- **Verify first:** Short et al.'s A0, time step and grid spacing, and NCVS 2024 reporting and FBI 2025 clearance by crime type. They set the hotspot constants here and the capture and reporting constants in M4.3.
- **Exit checks:**
  - a unit test: mean hotspot attractiveness equals θΓ/ω at steady state (R2);
  - no code path sends soldiers into a town to keep order, and town stops and arrests come only from the police (Military).

## M4.3 Calibrated crime

- **Builds:**
  - true and recorded offences, arrests, releases and the top-5% concentration share logged per district per day, and the hotspot field exported and imported as a 32×32 Uint16 grid (2 KB), upsampled on revisits in M9 (R4);
  - realised arrests calibrated so clearances per true theft land near 3–7% (robbery about 20%), with damping of Epstein's perceived risk considered (R2);
  - trip lengths, exp(−d/λ) per cell with λ drawn per offender, and displacement, with about 25% of deterred offenders moving nearby (R2);
  - reporting by crime type within a 2.5× band between districts, legitimacy that falls with arbitrary arrests, and separate switches for reporting bias and patrol feedback (R2);
  - targets per offender that grow with density and detection that falls with anonymity, each channel's share of offending logged, and a police reaction-delay parameter for M9's district tier (R4);
  - food theft as an offend option whose gain rises with unmet food need, inside the opportunity-based utility, where no agent ever becomes a "criminal" type and LS never enters the offend utility (R6).
- **Needs:** M2.3's design runner over seeds, city sizes, police shares and unemployment shocks; M3.5's missed meals and food-insecurity tally, which measure unmet food need.
- **Exit checks:**
  - tripling police from the new default cuts true theft by about 15%, certified on paired seeds, and a tipping test shows the police effect nearly flat near the default and steep at very low staffing (R2);
  - 50% of crime falls in 2–6% of cells, recorded crime is more concentrated than true crime when patrols follow records, and cumulative re-arrest runs about 43% / 66% / 82% at 1 / 3 / 10 years (R2);
  - district logs sum exactly to city totals, recorded never exceeds true on any district-day, and a re-imported field keeps the top-5% share within 0.05 (R4);
  - in a 1,000–100,000-agent size sweep, loot and detection explain no more than about 45% of the per-capita theft gradient, Glaeser and Sacerdote's bound (R4);
  - at full employment, true theft stays above zero on paired seeds (R6).

## M4.4 Victims, records and trust

- **Builds:**
  - record states (none, suspected, arrest, incarcerated, parole, discharged) kept at the records office and in the inspector, never over heads (R2, R3);
  - victimisation in LS (−900 violent, −200 property, half-life 0.35 years), and a fear term of up to −300 from each cell's perceived danger, fed by true and recorded crime and the witness pass, never by police presence alone (R6);
  - a "case unresolved" flag on victims and 1–3 close contacts until the records office clears the case, with its prevalence logged and any LS effect an unsourced knob, default 0 (R6);
  - wrongful stops that lower trust in police for the person stopped and 3–5 acquaintances (a Norland design number, to calibrate), charted beside arrests (R6).
- **Needs:** M3.6's LS pass and M3.2's inspector. The case flag and the trust spread need close contacts and acquaintances, which the plan builds only in M5.1's friend network.
- **Exit checks:**
  - a violent-crime victim's LS averages 0.3–0.45 below baseline in the year of the crime, and under 0.1 the year after (R6).

## M4.5 Culture audit

- **Builds:**
  - the outcome and exposure audit in headless CI over 50 paired seeds × 20 simulated years, in agent-level units: raw per-culture rates of true offending, victimisation, stops, wrongful stops, arrests, records and wealth decile within 0.9–1.1 of the population rate; Mantel–Haenszel ratios on place × time × visible-cue strata within |ln ratio| ≤ 0.05, overall and by period; and reporting and trust logged by culture too (R8);
  - the same audit run against a single-culture world, a culture-blind twin with preference shifts set to zero, and customs counterfactuals on the same seeds (R8).
- **Needs:** M2.3's design runner, and M2.6's spawn by culture and M3.7's customs and festivals for the counterfactual worlds. At 1,440 ticks a day, 20 simulated years is about 3.2 million ticks per seed (computed).
- **Verify first:** the culture audit's outcome band (0.9–1.1), equivalence margin (0.05) and power over 50 paired seeds, which decide whether the audit detects culture leaks.
- **Exit checks:**
  - the audit passes both bands, or a named place-time mechanism explains each exception (R8).

## M4.6 Justice on screen

- **Builds:**
  - the justice buildings, now original sprites rather than recoloured CC0 tiles: a slate-roofed police station with a plain badge and no flags, a jail with bars, a yard and an occupancy counter, and a records office with a ledger sign, drawn as a scroll (R3); art exists; wire it in, adding the jail yard and occupancy counter, which are not drawn;
  - justice events: a witness "!" with a short straight sight line, a victim "?", clipboard reports carried to the records office, a handcuff ring with an escort at walking speed, bars on jailing and an open door on release, with wrongful stops drawn as heavily as arrests (R3); the "!" and "?" art exists; wire it in, and draw the clipboard, handcuff-ring, bars and open-door bubbles;
  - true-view cues (the carried item, Skin A's act ring) filtered out of the recorded view, and true and recorded crime shown as two synced small panels (R2, R3);
  - the police iconography audit (cap and badge only, no weapons or heroic poses, the same emotes as citizens), patrol schedules driven by data rather than night-only, and patrol and station overlays for Skin A (R3);
  - no culture or names in justice bubbles, log lines, record states, the records office or the true and recorded panels, only case numbers and roles; no offence or report type tied to customs (noise, gathering, street vending); and patrols that never read culture, the festival calendar or crowds (R8);
  - the appearance audit and content lint extended to forbid punishment spectacles, shame marks, scars from punishment and mood rewards for watching punishment (R6).
- **Needs:** M1.3's sprite and bubble passes, M2.7's one glyph per event, M3.2's inspector, and M3.3's Skin C town and follow-cam.
- **Verify first:** whether a stream of animated crime events, or the gazette's daily justice column, builds illusory correlation as static sentence lists do (round 8). The answer sets how strict the justice-view rules must be, and the [Gazette](../gazette.md) tab asks for a playtest before M4 ships.
- **Exit checks:**
  - an appearance audit over 50 seeds finds no rendered attribute, apart from true-view act cues, that differs between agents who stole and agents who did not, and accessories depend only on job and random neutral items (R3);
  - the recorded view never shows a true-view cue, and every justice event produces a bubble, a log line and a chart glyph (R3).

## M4.7 Justice sounds and gazette

- **Builds:**
  - the justice sounds under the visual rules: theft in the true view only and the same for everyone; report, stop, arrest, wrongful stop, release and record filed, with the wrongful stop matching the arrest (Sound); the sounds exist; wire them in;
  - the gazette's justice column from police and court records: reports, stops, arrests, wrongful stops, releases and verdicts, by case number and role only, with a wrongful stop given an arrest's priority, and in the true view a margin note counting the day's unrecorded crimes (Gazette).
- **Needs:** M1.4's synth and buses, M3.8's event sounds, voice caps and gazette core, and M3.8's ruling on whether district names come from naming customs.
- **Owner decision first:** whether the true view's margin note exists, or players find unrecorded crime only on the true-view map ([Gazette](../gazette.md)).
- **Exit checks:**
  - the audio audit: outside festival music, no sound parameter differs by hue, look, culture, wealth decile or offender status in the recorded view, and a wrongful stop matches an arrest in length and loudness (Sound);
  - over 50 paired seeds, the justice column's counts equal the recorded counts, never the true ones (Gazette);
  - no justice story carries a name, culture, look or wealth term, and the culture flip test leaves every gazette story outside festivals unchanged (Gazette).
