# M3.7 Cultures and festivals

Part of [M3 City life](../milestone.md).

Needs M0.2's culture columns, M0.3's stride scheduler, M0.6's `sim-culture` walls, M2's preference shifts and festival budget, M3.6's isolation counter and M3.3's follow-cam. M0.7 already gives each blob a stored `nameKey` and `personName()`, on a word table of the one shared sound set that passes the full name filter, and M8.1 screens that table; both come before M1 (owner, 9 October 2026), so this reuses them.

- **Builds:**
  - customs passed on at birth from both parents: shared customs kept with fidelity rising from 0.5 to f₁ (0.9 food and naming, 0.95 festival, 0.5 music) as they become locally rare; when parents differ, vertical succession with probability 0.6, following a lead parent 75% of the time; otherwise learning from five district adults with conformity 0.3 (R8);
  - adult adoption on a 30-day stride from day-boundary per-district custom counts, at yearly rates of food 3%, festival 1%, naming 2.5% and music 1% (15% at ages 10–24), halved for people holding all four of their own customs, raised 1.5× for two and doubled for one or none (R8);
  - the inherited label (`birthCulture`) shown in the inspector and in the culture lens, which M5 builds, while `culture` tracks practice by the switching rule: gradual, caused by contact and symmetric, with no default or target culture; the person keeps their name, and the inspector's Customs tab shows their history (R8);
  - each culture's favoured food categories assigned by keyed draw within the ±25% band, until M8 switches them to what each hearth region produces in abundance (R8);
  - 4–6 festivals per culture totalling 8–12 days a year, with the same total and the same daytime and evening mix for every culture, spread across the year and open to all, in a global table of about 8 B per festival, held only on rest days or evenings (R8);
  - festival attendance counted as social contact that resets the isolation counter, with festival days per person per year capped at the culture total and no wellbeing bonus by default (a knob, default 0) (R8);
  - demand for a festival's favoured categories raised 2–4× on festival days (an unsourced estimate), funded from the festival budget within the month's discretionary spending, keeping the monthly food total within +5%, never from subsistence (R8);
  - music as an abstract preference (tempo, loudness, structure) with invented style names, and music events at the park or square that buy services, where any services worker may perform any style (R8);
  - one shared set of festival decorations, never in national-flag colours or the six body hues, and the culture emblems in `assets/sprites/culture.png`, drafted on `feat/pixel-sprites` and now on `main`; banner and lens colours also avoid the job colours and the reds and oranges kept for crime; art exists; wire it in (R8);
  - personal names read from each blob's stored `nameKey`, drawn at birth on the `PERSON_NAME` stream, and turned into text in the UI by `personName()` from M0.7's word table of the one shared mixed sound set, Greek-like sounds combined with other languages (owner, 9 October 2026); this adds the naming custom's structure, set by the birth culture, as `personName()`'s second argument, with no gendered forms, no diacritics and site words kept separate, shown only in the inspector and follow-cam (R8);
  - the name filter for people, places and festivals: M0.7 built it, with distinctive Pokémon town and city names and species names (edit distance 1 up to 5 letters, 2 above), the "poke" and "-mon" bans, LDNOOBW Latin-script lists (exact for 3-letter entries, substring for 4+) and the real-world fixture; this adds real festival names and runs the filter over festival names (R8);
  - the shared name sound set screened at authoring time: M0.7 builds it in the owner's mixed style and drops any word that copies a real name, and any word added for people's names takes the same screen; the owner relaxed round 8's trigram bar on 9 October 2026 (R8, Structure).
- **Owner decision first:**
  - customs pass on at birth, but births, partner choice and ageing arrive only in M5. Pull minimal births forward, or test transmission on a harness until then;
  - eight culture emblems share four music styles. Either each culture draws one at world generation, or more styles are written; this also sets M3.8's festival music ([Sound](../../../sound.md)).
- **Verify first:**
  - round 8's transmission bands re-run with similar culture shares, not one 60% culture, which decide the CI retention bands and the 0.5% inflow default;
  - festival demand spikes (2–4×), attendance targets, and festival and music transmission rates, which decide festival markets, crowds and custom rates.
- **Exit checks:**
  - second-generation children keep 40–85% and third-generation children 8–30% of heritage customs, and exogamy rises from the first generation to the second (R8);
  - culture costs at most 0.1 ms RM a day at 10k agents, with zero scavenges across a year of day passes (R8);
  - with equal festival days and timing, mean contact and wellbeing do not differ by culture on paired seeds (R8);
  - the name filter passes 1,000 seeds per culture at no more than 5% rejection, and the shared name sound set passes the screen (R8).
