# M6.6 Launch kit: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Playable with no signup.** The app has no accounts, no server state and no tracking.
- **Preview cards:**
  - one 1200×600 card per scenario, drawn in Skin C with blobs, rendered headlessly at build time from a fixed replay frame;
  - each card has alt text;
  - its share text carries the scenario's bet ("Does money buy happiness? Predict, then run").
- **Translation-ready text:** every user-visible string lives in text files keyed by id, with no strings in code. Templates from the gazette and cards use the same files.
- **"What this toy leaves out," live at launch.** It explains:
  - why every agent shares one blob body and a random look that no sim rule reads (R2, R3, R8, R9);
  - what Nomos excludes that games like Norland use: class colours, culture conflict and punishment spectacles (R6).
- **Its culture section (R8):**
  - cultures are fictional, learned, preference-only and never drawn;
  - real cultures are far richer;
  - housing ignores culture, and festival and taste spending never crowds out food (Atkin; Banerjee and Duflo);
  - it names what Nomos leaves out on purpose: real cultures, discrimination by law as in Victoria 3, and xenophobia and culture conflict as in Norland;
  - it states M4.5's audit result in words, and links the illusory-correlation and generic-language studies.
- **Review before launch:** sensitivity readers or the diverse panel review the custom catalogue and a sample of generated names. Results go in `docs/playtests/`.
- **Documentation (R2):**
  - ODD+D, with purpose and patterns first, via the `odd-protocol` skill;
  - a TRACE notebook of the modelling cycle;
  - a CoMSES submission.
- **Credits:** `THIRD_PARTY_NOTICES` and an in-app credits screen cover every asset. All launch copy describes the look as "GBA-era top-down pixel art" (R2, R3).
- **Optional LLM narration** of a clicked agent: called rarely and asynchronously, with a deterministic fallback, and every output logged. It ships only if the owner decides so (R1, R2).

## Packages and files

- `tools/previews/render.ts`: headless preview cards, through Playwright and the real renderer.
- `apps/web/src/i18n/en.json`: all strings, with ids.
- `apps/web/src/pages/leaves-out.ts`, `apps/web/src/pages/credits.ts`.
- `docs/model/odd-d.md` and `docs/model/trace.md`: the ODD+D description and the TRACE notebook. Add them to `docs/README.md`.
- `THIRD_PARTY_NOTICES` at the repo root, generated from `assets/LICENSES.md` plus code dependencies' licences.

## Interfaces and data

- **Scenario metadata:** `{ id, titleKey, betKey, previewFrame: { seed, day, tick, camera }, altKey }`, rendered at build time.
- **String ids:** dotted keys such as `card.happiness.title`. The name and text lints run over the whole file.

## Method and sources

- **Launch, preview cards, translation and documentation:** the [R2 summary](../../../../research/round-2-follow-up/summary.md), presentation and launch, and [R2 validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), part 6 on ODD+D, TRACE and CoMSES.
- **Never Pokémon names, and the look's wording:** the [R3 summary](../../../../research/round-3-2d-look/summary.md), legal.
- **The culture section and its studies:** the [R8 report](../../../../research/round-8-cultures/report.md), and [R8 prior-art and ethics notes](../../../../research/round-8-cultures/notes/prior-art-ethics.md).
- **What Norland does that Nomos excludes:** [R6 Norland notes](../../../../research/round-6-goods-and-wellbeing/notes/norland-prior-art.md).

## Tests for the exit checks

- `launch metadata passes the name lint`: page titles, preview alt text, share texts, the web manifest, package names and store text pass M0.6's name lint, with no "pokemon" or "poké" anywhere.
- `every string is in the text files`: a scan finds no user-visible string literal in app code outside the string files.
- `credits cover every asset`: every `assets/LICENSES.md` row appears in `THIRD_PARTY_NOTICES` and on the credits screen.
- `preview cards render`: each scenario's card renders at 1200×600, with non-empty alt text.

## Risks and unknowns

- **Owner decision first:** whether the optional LLM narration ships. It would add about 2–3 days (unsourced estimate), and calls an outside service, which breaks "no server". Default: no narration.
- **Verify first:** the effect sizes behind the stereotype studies, which decide how the page cites them.
- **Sensitivity readers** need recruiting. Start while M6.4 is built.

## Open questions

- **Owner:** Ship the optional LLM narration? It calls an outside service, which breaks "no server", and adds about 2–3 days (unsourced estimate). Suggested: no narration. Needed before: the step plan.
- **Owner:** Which licence does the repository take? The notices, the credits and the CoMSES submission depend on it. The owner chose MIT for the code on 8 October 2026, and the art licence is still open. Suggested: each asset keeps its own licence. Needed before: the step plan.
- **Owner:** Who reviews the custom catalogue and names: paid sensitivity readers or the diverse panel? Recruiting needs lead time, which is why the brief starts it during M6.4. Suggested: M5.5's panel for names, plus paid readers for the catalogue if the budget allows. Needed before: the step plan.
- **Research:** What effect sizes do the illusory-correlation and generic-language studies report? They decide how strongly the page may cite them. Suggested: open each study and quote its effect with an evidence label. Needed before: launch.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the string files and the name lint over them first. Then notices and credits, the leaves-out page and preview cards, and ODD+D and TRACE last.
- **Reuse:** `assets/LICENSES.md`, M0.6's name and text lints, M4.5's audit report for the result in words, and M0.4's renderer for headless previews.
- **Keep it simple:** generate the notices and the credits screen from one source, `assets/LICENSES.md` plus the lockfile.
- **Pitfalls:** if M1–M5 kept user strings in code, moving them can touch many UI modules, so count them early. State the audit result in words, with no per-culture table (R8 summary, "Never shown together"). ODD+D written now goes stale in M7 and M8, so update it at launch.
- **Hard and easy parts:** the culture section's wording and its review need the most care; notices and previews are mechanical.
