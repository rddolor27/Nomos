# M4.6 Justice on screen: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Buildings,** from the existing original sprites:
  - the police station: a slate roof and a plain badge, no flags;
  - the jail, with bars;
  - the records office, with a ledger sign drawn as a scroll.

  Draw the jail yard and the occupancy counter, which don't exist yet, in `tools/sprites` under the art rules, then wire all of it in (R3).
- **Justice events, each with a bubble, a log line and a chart glyph** from M2.7's one-glyph table:
  - a witness "!" with a short, straight sight line;
  - a victim "?";
  - a report as a clipboard carried to the records office;
  - an arrest as a handcuff ring with an escort at walking speed;
  - jailing as bars, and release as an open door;
  - wrongful stops drawn as heavily as arrests: same size, same duration and same log weight.

  The "!" and "?" exist. Draw the clipboard, handcuff-ring, bars and open-door bubbles.
- **Two views of crime (R2, R3):**
  - the true view shows act cues: the carried item and Skin A's act ring;
  - the recorded view filters them out through the visual word's `trueOnly` bit, which M0.3 defined and M0.4's render-filter test checks;
  - true and recorded crime show as two synced small panels.
- **Police iconography (R3, content rules):**
  - a cap and badge only, no weapons or heroic poses;
  - the same emotes as citizens;
  - patrol schedules driven by data, not night-only;
  - patrol and station overlays in Skin A.
- **Culture never appears where crime is shown (R8):**
  - no culture or names in justice bubbles, log lines, record states, the records office, or the true and recorded panels; only case numbers and roles;
  - no offence or report type tied to customs, such as noise, gathering or street vending;
  - patrols never read culture, the festival calendar or crowds.
- **Content lint extended (R6):** it forbids punishment spectacles, shame marks, scars from punishment and mood rewards for watching punishment.

## Packages and files

- `tools/sprites`: the jail yard, the occupancy counter, and the four new justice bubbles.
- `packages/render-gl`:
  - `src/justice/` for event drawing, the sight line, the escort and the item hop;
  - `src/views.ts`, where the `trueOnly` filter is enforced in the recorded view;
  - Skin A's patrol and station overlays.
- `apps/web`: the two synced true and recorded panels, and the justice log.
- `tools/audit/appearance.ts`: the appearance audit.
- M0.6's content and text lints, extended with the punishment-spectacle terms.

## Interfaces and data

- **Justice event kinds** join the closed event enum, each mapped in the glyph table.
- **Every justice log line** carries a case number and a role: victim, witness, reporter, officer or person stopped. It never carries a name, culture, look or wealth term.
- **View state:** `'true' | 'recorded'`. The renderer filters by the `trueOnly` bit, and the panels read from separate true and recorded logs.

## Method and sources

- **Justice art, events, the true and recorded split, and police iconography:**
  - [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md);
  - the [R3 summary](../../../../research/round-3-2d-look/summary.md): keep Pokémon's tiles, walks, bubbles and clock, but invert the two conventions that encode crime.
- **Never on a crime surface:** the [R8 summary](../../../../research/round-8-cultures/summary.md), "Respect: never on a crime surface", and the [R8 report](../../../../research/round-8-cultures/report.md).
- **No punishment spectacles:** [R6 Norland notes](../../../../research/round-6-goods-and-wellbeing/notes/norland-prior-art.md), on what to avoid.

## Tests for the exit checks

- **`appearance audit`, over 50 seeds:**
  - for every rendered attribute (sprite frames, palette, overlays and accessories), compare agents who stole with agents who did not;
  - apart from true-view act cues, no attribute differs;
  - accessories depend only on job and on random neutral items.
- **`recorded view never shows a true cue`:**
  - Playwright renders the same replay in both views;
  - the recorded view's frames contain no pixels from true-only cues;
  - the check is an offscreen framebuffer diff, masked to cue sprites.
- `every justice event has three surfaces`: over a replay, each justice event id has a bubble (or a ticker entry if capped), a log line and a chart glyph.
- `no culture on crime surfaces`: a text scan of every justice log line, record view and panel string over 20 seeds finds no culture name, emblem id, person name or custom term.

## Risks and unknowns

- **Verify first:** whether a stream of animated crime events, or the gazette's daily justice column, builds illusory correlation as static sentence lists do (round 8). The answer sets how strict the justice-view rules must be, and the [Gazette](../../../gazette.md) tab asks for a playtest before M4 ships.
- **Sight lines** must stay short and straight, never a cone or spotlight that dramatises.
- **New bubbles need the M1.5 recognition test** before shipping: 8 of about 10 novices must read each one.

## Open questions

- **Owner:** Does a new run open in the true view or the recorded view? The plan sets no default, and it decides whether players first see acts or only what police know. Suggested: the recorded view, with the true view one labelled toggle away. Needed before: building.
- **Measure:** Do the four new bubbles pass M1.5's recognition test, with 8 of about 10 novices reading each? A bubble nobody reads makes the three-surface check hollow. Suggested: test the clipboard, handcuff ring, bars and open door on still frames before wiring them. Needed before: building.
- **Research:** Does a stream of animated crime events build illusory correlation, as static sentence lists did in round 8? It sets how strict the justice view must be, and the Gazette tab wants a playtest before M4 ships. Suggested: build to the strict rules, then run the playtest panel on M4.6's build before M4 closes. Needed before: launch.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the recorded-view filter and its pixel test first, since every later cue relies on it. Then the buildings, then events one kind at a time with all three surfaces.
- **Reuse:** M0.3's `trueOnly` bit and M0.4's render-filter test, M1.3's bubble passes, M2.7's glyph table, the existing "!" and "?" art, and M3.3's follow-cam.
- **Keep it simple:** one table maps each justice kind to its bubble, log template and glyph. The three-surface check is then a table test plus one replay scan.
- **Pitfalls:** rings, escorts and bars end with their event, so nothing stays on a person afterwards (R3 summary, rules 3 and 4). Add R3's rule 7 to the iconography audit: no role wears black.
- **Hard and easy parts:** the 50-seed appearance audit and the masked framebuffer diff need care. Wiring the existing sprites is routine.
