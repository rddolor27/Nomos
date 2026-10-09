# M3.7 Cultures and festivals: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **All culture logic lives in `sim-culture`.** The world step calls its day-boundary functions from culture-blind orchestration code, and guarded folders never import it (M0.6). Every culture-level draw is keyed by the culture's stable uid, never its index, so the relabel test keeps passing.
- **Transmission at birth (R8):**
  - Shared customs are kept with a fidelity that rises from 0.5 to f₁ as they become locally rare. f₁ is 0.9 for food and naming, 0.95 for festivals and 0.5 for music.
  - When parents differ, vertical succession happens with probability 0.6, following a lead parent 75% of the time.
  - Otherwise the child learns from five district adults, with conformity 0.3.
- **Adult adoption runs on M0.3's 30-day stride scheduler** from day-boundary per-district custom counts.
  - Yearly rates: food 3%, festival 1%, naming 2.5% and music 1%, or 15% at ages 10–24.
  - Rates halve for people holding all four of their own customs, rise 1.5× for two, and double for one or none.
- **Identity:**
  - `birthCulture`, the inherited label, shows in the inspector and in M5's culture lens;
  - `culture` tracks practice by the switching rule: gradual, caused by contact and symmetric, with no default or target culture;
  - a person keeps their name, and the inspector's Customs tab shows their history.
- **Favoured foods** are assigned per culture by keyed draw within M2.6's ±25% band, until M8 ties them to each hearth region's abundance.
- **Festivals:**
  - 4–6 festivals per culture, totalling 8–12 days a year, with the same total and the same daytime and evening mix for every culture;
  - spread across the year, held only on rest days or evenings, and open to all;
  - kept in a global table of about 8 B per festival.
- **Attendance is social contact.** It resets the isolation counter, and festival days per person per year are capped at the culture total. The wellbeing bonus is a knob, default 0.
- **Festival demand:**
  - demand for the festival's favoured categories rises 2–4× on festival days, an unsourced estimate;
  - it is paid from the festival budget within the month's discretionary spending, keeping the monthly food total within +5%;
  - it is never taken from subsistence.
- **Music** is an abstract preference of tempo, loudness and structure, with invented style names. Music events at the park or square buy services, and any services worker may perform any style.
- **Decorations:**
  - one shared set of festival decorations, never in national-flag colours or the six body hues;
  - the eight culture emblems from `assets/sprites/culture.png`;
  - banner and lens colours that avoid the job colours, and the reds and oranges kept for crime.
- **Names come from a stored key (M0.7).** Each blob carries a 32-bit `nameKey`, drawn at birth on the `PERSON_NAME` stream. The sim stores and hashes it but never reads it.
  - `personName(nameKey)` in `sim-culture` already turns it into "Given Family" from M0.7's word table of the one shared mixed sound set, which the owner chose on 9 October 2026 in place of round 8's design H.
  - This adds the naming custom's structure, set by the birth culture, as `personName()`'s second argument: given and family name, given and parent's given name, or given, "of" and home place.
  - Every word passes the full filter by construction, since the table keeps only words that pass.
  - No gendered forms and no diacritics, and site words stay separate.
  - Names show only in the inspector and the follow-cam.
- **The full name filter** for people, places and festivals: M0.7 built it before M1 (owner, 9 October 2026). It already holds:
  - distinctive Pokémon town and city names and species names, rejected at edit distance 1 up to 5 letters and 2 above;
  - the "poke" and "-mon" bans;
  - LDNOOBW Latin-script lists, exact for 3-letter entries and substring for 4 or more;
  - M0.6's real-world fixture.

  This adds real festival names, and runs the filter over festival names.
- **The sound-set screen at authoring time:** M0.7's word table drops any word that copies a real name, and M8.1's place table does the same. The owner relaxed round 8's trigram bar on 9 October 2026, since names now mix Greek-like sounds with other languages. Any word added for people's names takes the same screen.

## Packages and files

- `packages/sim-culture`:
  - `src/transmission.ts` and `src/adoption.ts`;
  - `src/festivals.ts`: the table, the calendar and attendance;
  - `src/music.ts`;
  - `src/naming/`: the naming custom's structure, added to M0.7's `person-name.ts`.
- `packages/sim-core/src/consumption/festival-demand.ts`: reads the festival calendar, which is allowed in `consumption/`.
- `apps/web/src/panels/inspector.ts`, from M0.7: names through `personName()`, and the inspector's Customs tab.
- `tools/names/`, from M0.7:
  - a real festival names fixture beside M0.7's `avoid-places.txt`, `avoid-species.txt` and LDNOOBW lists, with its licence file;
  - the real-name screen against Fantasy Map Generator's bases (MIT), rerun for any word added for people's names.

## Interfaces and data

- **Festival record (8 B):** culture uid, day of the year, length in days, a daytime or evening flag, and favoured categories.
- **Transmission inputs:** the parents' customs nibbles, district custom counts from the day-boundary snapshot, and keyed draws on (seed, child id, purpose).
- **Name API:** `personName(nameKey: number, custom: number): string`, extending M0.7's `personName(nameKey)` with the naming custom from the birth culture's customs. It runs only outside the sim, and is never called by sim code.

## Method and sources

- **Transmission, adoption, rates, retention bands and the stride check:** [R8 transmission notes](../../../../research/round-8-cultures/notes/transmission.md), and prototypes [`town.mjs`](../../../../research/round-8-cultures/prototypes/transmission/town.mjs) and [`lib.mjs`](../../../../research/round-8-cultures/prototypes/transmission/lib.mjs).
- **Festivals, music and names:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), parts b and c, and prototypes [`holiday_counts.mjs`](../../../../research/round-8-cultures/prototypes/customs/holiday_counts.mjs), [`names.mjs`](../../../../research/round-8-cultures/prototypes/customs/names.mjs) and [`names_screen.mjs`](../../../../research/round-8-cultures/prototypes/customs/names_screen.mjs).
- **Wording, emblems and decorations:** [R8 prior-art and ethics notes](../../../../research/round-8-cultures/notes/prior-art-ethics.md).
- **The owner's settled defaults:** the [R8 summary](../../../../research/round-8-cultures/summary.md), "Decisions the owner settled".

## Tests for the exit checks

- `heritage retention bands`: second-generation children keep 40–85% and third-generation children 8–30% of heritage customs, and exogamy rises from the first generation to the second, over 50 seeds × 100 years. This runs on a transmission harness until births arrive.
- `culture costs ≤ 0.1 ms a day at 10k`: M0.6's budget gate gives the culture day pass ≤ 0.1 ms RM at 10k agents, with zero scavenges across a year of day passes.
- `festivals are fair`: with equal festival days and timing, mean contact and mean LS do not differ by culture on 50 paired seeds. Each ratio is within 0.95–1.05, a proposed band.
- `names pass the filter`: 1,000 seeds per culture build person and festival names with no more than 5% rejected, and every accepted name passes the full filter. Person names reject none, since every table word passes.
- `sound set passes the screen`: no word in any table copies a real name from the screen's bases.
- The relabel test (M0.6) and every guard keep passing.

## Risks and unknowns

- **Owner decision first:** births, partner choice and ageing arrive only in M5. Either pull minimal births forward or test transmission on a harness until then. Default: the harness.
- **Owner decision first:** eight emblems share four music styles. Either each culture draws one at world generation, or more styles are written; this sets M3.8's festival music.
- **Verify first:**
  - round 8's transmission bands, re-run with similar culture shares rather than one 60% culture; these decide the retention bands and the 0.5% inflow default;
  - festival demand spikes, attendance targets, and festival and music transmission rates.
- **Third-party fixture licences.** M0.7 commits LDNOOBW (CC BY 4.0), and M8.1 Fantasy Map Generator's bases (MIT), each with its licence notice; the festival fixture needs its own.

## Open questions

- **Owner:** Test transmission on a harness until M5's births, or pull minimal births forward? Births, partner choice and ageing arrive only in M5, and the retention check needs generations. Suggested: the harness, the brief's default. Needed before: the step plan.
- **Owner:** How do eight cultures share four music styles? The answer also sets M3.8's festival music ([Sound](../../../sound.md)). Suggested: each culture draws one style at world generation, keyed by its uid. Needed before: the step plan.
- **Measure:** Do the 40–85% and 8–30% retention bands hold with similar culture shares? Round 8 ran one 60% culture, and the re-run sets the CI bands and confirms the 0.5% newcomer default. Suggested: re-run [`town.mjs`](../../../../research/round-8-cultures/prototypes/transmission/town.mjs) with M2.6's default mix before fixing the bands. Needed before: building.
- **Research:** What evidence sets festival demand spikes (2–4×, an unsourced estimate), attendance targets, and festival and music transmission rates? They drive festival markets, crowds and custom rates. Suggested: a short research round first, as task.md asks, with each value kept a labelled knob. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the filter's festival fixture first, as a tool with no sim dependency. Then the festival table and attendance, adoption on the stride, the transmission harness, festival demand, music events, UI names, and decorations last.
- **Reuse:** M0.7's `nameKey`, `personName()`, word table and name filter; the real-name screen; M0.6's `sim-culture` wall, relabel test, and name and text lints; M0.3's stride scheduler; M2.6's shifts, festival stocking and, if built, its recompute hook; M3.6's isolation counter; M3.3's follow-cam.
- **Pitfalls:**
  - Convert yearly adoption rates to a hazard per 30-day visit, 1 − (1 − p)^(30/112), never p ÷ 3.73 ([calendar.md](../../../calendar.md), "Rescaling rules").
  - Festival contact feeds the isolation counter, LS and then on-the-job search, a path from culture to labour that no import check sees. The fairness check must pass before any festival knob leaves 0.
  - A new word table or naming structure renames everyone in older saves, so version both with the save, as M0.7 notes.
- **Hard and easy parts:** the transmission bands and festival fairness are the hard parts. The festival table, music preferences and list loading are mechanical.
