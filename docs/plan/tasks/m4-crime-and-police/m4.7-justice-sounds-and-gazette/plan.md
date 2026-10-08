# M4.7 Justice sounds and gazette: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Justice sounds follow the visual rules (Sound).** The sounds exist; wire them into M3.8's event-sound router.
  - `justice_theft` plays only in the true view, and is the same for everyone.
  - Reports, stops, arrests, wrongful stops, releases and filed records play `justice_<event>`.
  - A wrongful stop matches an arrest in length and loudness: RMS within 1 dB, which the justice bank's build already asserts.
  - No motif follows a person, and no sound marks anyone afterwards.
- **The audio audit (Sound).** Outside festival music, no sound parameter may differ by hue, look, culture, wealth decile or offender status in the recorded view. Parameters include the sound name, gain, pitch wobble, pan law and voice priority.
  - The router's inputs are the event kind and the screen position only. That makes the audit a check of the router's signature plus a statistical test of its outputs.
- **The gazette's justice column (Gazette):**
  - it is built from police and court records in M3.8's record store: reports, stops, arrests, wrongful stops, releases and verdicts;
  - each story gives a case number and a role only;
  - a wrongful stop takes an arrest's priority;
  - in the true view only, a margin note counts the day's unrecorded crimes, if the owner keeps it (decision below);
  - crime never leads the paper by default (Gazette rules).

## Packages and files

- `packages/audio/src/router.ts`: justice kinds, the true-view gate for theft, and the audit hook.
- `packages/gazette`:
  - `src/sections/justice.ts`: story types and priorities, with the wrongful stop at arrest priority;
  - `src/margin-note.ts`: true view only, behind the owner decision.
- `tools/audit/audio.ts`: the audio audit, run in the nightly job beside M4.5's.
- `packages/gazette/templates/justice.json`: the justice templates, checked by M0.6's and M3.7's filters.

## Interfaces and data

- **Router input:** `{ kind, screenX, screenY, view }`. Agent ids, looks, culture and wealth never reach it.
- **Justice story:** `{ recordId, kind, caseNumber, role, place }`, where place is a district number or name per M3.8's ruling.
- **Margin note:** a count of the day's true offences minus recorded ones, from the true log, shown only when the view is `'true'`.

## Method and sources

- **Justice sounds, the wrongful-stop rule and the audio audit:** [sound.md](../../../sound.md), "Rules" and the exit checks.
- **The justice column, its priority rules and the margin note:** [gazette.md](../../../gazette.md).
- **Never on a crime surface:** the [R8 summary](../../../../research/round-8-cultures/summary.md).

## Tests for the exit checks

- **`audio audit`, over 50 seeds:**
  - log each played sound's parameters with the triggering agent's hue, look, culture, wealth decile and offender status, captured in the audit build only;
  - in the recorded view, outside festival music, no parameter differs by any of them;
  - a wrongful stop and an arrest match within 1 dB RMS and 1% in length.
- `justice column counts recorded, never true`: over 50 paired seeds, every edition's justice counts equal the record store's recorded counts for that day, and never the true counts.
- `no names or traits in justice stories`: a text scan of every justice story finds no person name, culture, look or wealth term.
- `flip test leaves the gazette unchanged`: with M4.1's culture shuffle, every gazette story outside festival stories is byte-identical.
- `theft sound only in the true view`: in the recorded view, `justice_theft` never plays.

## Risks and unknowns

- **Owner decision first:** whether the true view's margin note exists, or whether players find unrecorded crime only on the true-view map.
- **Needs M3.8's ruling** on whether district names come from naming customs. If they do, stories name districts by number.
- **Claude cannot hear audio.** The owner listens to the justice set once more before M4 ships, above all to the wrongful stop against the arrest.

## Open questions

- **Owner:** Keep the true view's margin note? It tells players how much crime goes unrecorded, which the true-view map shows only to those who look. Suggested: keep it, in the true view only, as the Gazette tab's rule 8 drafts it. Needed before: the step plan.
- **Owner:** Does the wrongful stop sound as heavy as the arrest when heard in play? The 1 dB RMS and 1% length checks cannot judge how it feels. Suggested: one listening pass on the justice set before M4 closes. Needed before: launch.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the router's justice kinds and true-view gate first, then the audio audit. The justice column and its count test follow, and the margin note comes last.
- **Reuse:** M3.8's router, voice caps, gazette core and record store; M4.1's flip test; M0.6's and M3.7's text filters; the justice bank's 1 dB assertion.
- **Keep it simple:** the margin note, if kept, is one number in a fixed sentence, with no breakdown by place, type or time.
- **Pitfalls:** pan and distance gain follow screen position, which follows place, so compare them within position bins, or the audit reads place as culture.
- **Hard and easy parts:** the audit's statistics need care; wiring the existing sounds is routine.
