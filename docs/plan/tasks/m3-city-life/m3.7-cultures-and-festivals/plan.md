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
- **Names are generated in the UI,** never stored in the sim, from (seed, id, birth culture):
  - one shared invented sound set, with naming customs setting the structure;
  - no gendered forms and no diacritics, and site words kept separate;
  - shown only in the inspector and the follow-cam.
- **The full name filter** for people, places and festivals extends M0.6's filter with:
  - distinctive Pokémon town and city names and species names, rejected at edit distance 1 up to 5 letters and 2 above;
  - the "poke" and "-mon" bans;
  - LDNOOBW Latin-script lists, exact for 3-letter entries and substring for 4 or more;
  - real festival names;
  - M0.6's real-world fixture.
- **The sound-set screen at authoring time:** trigram similarity to real name bases, where below 0.26 passes, 0.26–0.40 goes to review and above 0.40 fails.

## Packages and files

- `packages/sim-culture`:
  - `src/transmission.ts` and `src/adoption.ts`;
  - `src/festivals.ts`: the table, the calendar and attendance;
  - `src/music.ts`;
  - `src/naming.ts`: name structure and the shared sound set.
- `packages/sim-core/src/consumption/festival-demand.ts`: reads the festival calendar, which is allowed in `consumption/`.
- `apps/web/src/names.ts`: UI-side name generation, and the inspector's Customs tab.
- `tools/names/`, extending M0.6's filter:
  - fixtures under `tools/names/fixtures/`. File names never contain the franchise name, so the place and species lists are `avoid-places.txt` and `avoid-species.txt`;
  - a licence file beside each third-party list. LDNOOBW is CC BY 4.0 and needs attribution.
- `tools/names/screen.py`: the authoring-time trigram screen against real name bases. Fantasy Map Generator's bases are MIT.

## Interfaces and data

- **Festival record (8 B):** culture uid, day of the year, length in days, a daytime or evening flag, and favoured categories.
- **Transmission inputs:** the parents' customs nibbles, district custom counts from the day-boundary snapshot, and keyed draws on (seed, child id, purpose).
- **Name API:** `personName(seed, id, birthCulture): string`. It runs only outside the sim, and is never called by sim code.

## Method and sources

- **Transmission, adoption, rates, retention bands and the stride check:** [R8 transmission notes](../../../../research/round-8-cultures/notes/transmission.md), and prototypes [`town.mjs`](../../../../research/round-8-cultures/prototypes/transmission/town.mjs) and [`lib.mjs`](../../../../research/round-8-cultures/prototypes/transmission/lib.mjs).
- **Festivals, music and names:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), parts b and c, and prototypes [`holiday_counts.mjs`](../../../../research/round-8-cultures/prototypes/customs/holiday_counts.mjs), [`names.mjs`](../../../../research/round-8-cultures/prototypes/customs/names.mjs) and [`names_screen.mjs`](../../../../research/round-8-cultures/prototypes/customs/names_screen.mjs).
- **Wording, emblems and decorations:** [R8 prior-art and ethics notes](../../../../research/round-8-cultures/notes/prior-art-ethics.md).
- **The owner's settled defaults:** the [R8 summary](../../../../research/round-8-cultures/summary.md), "Decisions the owner settled".

## Tests for the exit checks

- `heritage retention bands`: second-generation children keep 40–85% and third-generation children 8–30% of heritage customs, and exogamy rises from the first generation to the second, over 50 seeds × 100 years. This runs on a transmission harness until births arrive.
- `culture costs ≤ 0.1 ms a day at 10k`: M0.6's budget gate gives the culture day pass ≤ 0.1 ms RM at 10k agents, with zero scavenges across a year of day passes.
- `festivals are fair`: with equal festival days and timing, mean contact and mean LS do not differ by culture on 50 paired seeds. Each ratio is within 0.95–1.05, a proposed band.
- `names pass the filter`: 1,000 seeds per culture generate person, place and festival names with no more than 5% rejected, and every accepted name passes the full filter.
- `sound set passes the screen`: no syllable combination in the shared sound set scores above 0.40, and every one between 0.26 and 0.40 has a recorded review.
- The relabel test (M0.6) and every guard keep passing.

## Risks and unknowns

- **Owner decision first:** births, partner choice and ageing arrive only in M5. Either pull minimal births forward or test transmission on a harness until then. Default: the harness.
- **Owner decision first:** eight emblems share four music styles. Either each culture draws one at world generation, or more styles are written; this sets M3.8's festival music.
- **Verify first:**
  - round 8's transmission bands, re-run with similar culture shares rather than one 60% culture; these decide the retention bands and the 0.5% inflow default;
  - festival demand spikes, attendance targets, and festival and music transmission rates.
- **Third-party fixture licences.** LDNOOBW (CC BY 4.0) and Fantasy Map Generator's bases (MIT) need licence notices if committed for CI.

## Open questions

- **Owner:** Test transmission on a harness until M5's births, or pull minimal births forward? Births, partner choice and ageing arrive only in M5, and the retention check needs generations. Suggested: the harness, the brief's default. Needed before: the step plan.
- **Owner:** How do eight cultures share four music styles? The answer also sets M3.8's festival music ([Sound](../../../sound.md)). Suggested: each culture draws one style at world generation, keyed by its uid. Needed before: the step plan.
- **Measure:** Do the 40–85% and 8–30% retention bands hold with similar culture shares? Round 8 ran one 60% culture, and the re-run sets the CI bands and confirms the 0.5% newcomer default. Suggested: re-run [`town.mjs`](../../../../research/round-8-cultures/prototypes/transmission/town.mjs) with M2.6's default mix before fixing the bands. Needed before: building.
- **Research:** What evidence sets festival demand spikes (2–4×, an unsourced estimate), attendance targets, and festival and music transmission rates? They drive festival markets, crowds and custom rates. Suggested: a short research round first, as task.md asks, with each value kept a labelled knob. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the name filter and sound-set screen first, as tools with no sim dependency. Then the festival table and attendance, adoption on the stride, the transmission harness, festival demand, music events, UI names, and decorations last.
- **Reuse:** M0.6's `sim-culture` wall, relabel test, and name and text lints; M0.3's stride scheduler; M2.6's shifts, festival stocking and, if built, its recompute hook; M3.6's isolation counter; M3.3's follow-cam.
- **Pitfalls:**
  - Convert yearly adoption rates to a hazard per 30-day visit, 1 − (1 − p)^(30/112), never p ÷ 3.73 ([calendar.md](../../../calendar.md), "Rescaling rules").
  - Festival contact feeds the isolation counter, LS and then on-the-job search, a path from culture to labour that no import check sees. The fairness check must pass before any festival knob leaves 0.
  - A change to name generation renames everyone in older saves, so version the generator with the save.
- **Hard and easy parts:** the transmission bands and festival fairness are the hard parts. The festival table, music preferences and list loading are mechanical.
