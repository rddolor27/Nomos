# M4.4 Victims, records and trust: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Record states live at institutions, never over heads.** Each person's record state is one of none, suspected, arrest, incarcerated, parole or discharged. It is held at the records office and shown in the inspector only. No sprite, bubble or overlay carries it (R2, R3).
- **Victimisation joins M3.6's LS drivers (R6):**
  - −900 for violent crime and −200 for property crime, each with a half-life of 0.35 years on the 112-day year;
  - a fear term of up to −300 from each cell's perceived danger;
  - perceived danger comes from true and recorded crime and the witness pass, never from police presence alone.
- **"Case unresolved" flag:**
  - it marks the victim and 1–3 close contacts until the records office clears the case;
  - its prevalence is logged;
  - any LS effect is an unsourced knob, default 0 (R6).
- **Wrongful stops lower trust:**
  - in police, for the person stopped and 3–5 acquaintances, a Norland design number still to calibrate;
  - trust feeds M4.3's reporting and legitimacy;
  - wrongful stops are charted beside arrests, at equal visual weight (R6, content rules).
- **Contacts come later.** Close contacts and acquaintances arrive with M5.2's friend network. Until then, a stand-in uses household members and same-workplace colleagues, keyed and capped, and is replaced in M5.2.

## Packages and files

- `packages/sim-core`:
  - `src/crime/record-state.ts`: the state machine;
  - `src/wellbeing/drivers.ts`, extended with victimisation, fear and the case knob;
  - `src/police/trust.ts`: trust per person, its spread to contacts, and its link to reporting;
  - `src/social/contacts-standin.ts`, until M5.2.
- `apps/web/src/inspector/`: the record state and case flag, in the inspector only. The trust chart sits beside the arrests chart.

## Interfaces and data

- **Record state:** `Uint8` per agent, at the records office's table, never in the visual word or snapshot.
- **Fear:** a per-cell perceived-danger value (Q16), updated at the day boundary from true and recorded events and witness reports.
- **Trust:** `Int16` per agent, 0–10,000, with a fade table from the build step.
- **Case:** `{ caseId, victim, contacts[3], opened, cleared }` in a fixed-size pool, with ids in the record store.

## Method and sources

- **Record states at institutions, never as marks:** the [R2 summary](../../../../research/round-2-follow-up/summary.md), and the [R3 summary](../../../../research/round-3-2d-look/summary.md), on inverting Pokémon's costume conventions.
- **Victimisation sizes, fear and the half-life:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), and the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md)'s driver table (Mahuteau and Zhu).
- **Trust spread to acquaintances:** [R6 Norland notes](../../../../research/round-6-goods-and-wellbeing/notes/norland-prior-art.md). It is a design number, not a measurement.

## Tests for the exit checks

- `violent victims' LS`: on 50 paired seeds, a violent-crime victim's LS averages 0.3–0.45 below their own baseline in the year of the crime, and under 0.1 below it the year after.
- `record state never drawn`: no frame, bubble or overlay reads the record state. A renderer test toggles every agent's state and gets identical frames.
- `fear never from police alone`: with crime zeroed and patrols on, perceived danger stays at zero in every cell.
- `wrongful stops weigh like arrests`: chart glyph size and log weight are equal for both, by a table test.

## Risks and unknowns

- **The trust numbers are a design guess** from Norland, at 3–5 acquaintances. Calibrate them against M4.3's reporting band.
- **The stand-in contact network** changes when M5.2 lands. Re-run the LS and trust checks then.
- **The case knob stays at 0** unless evidence supports an effect. Its prevalence is logged either way.
