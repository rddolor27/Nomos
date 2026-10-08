# M5.7 Year in review: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The year-in-review card (Calendar)** appears with each new year. It shows:
  - population, births and deaths;
  - festivals held;
  - true against recorded crime;
  - wealth shifts.

  It never breaks any figure down by culture. History charts take a year axis, and replays seek by date.
- **The card is the gazette's year-end edition (Gazette).** It is built from the record store at the year's last day boundary, like any edition, and printed as a special issue.
- **Follow-the-news camera (Gazette):**
  - opt-in, and off by default;
  - at 4× and 16×, it eases to the place of the front-page story with each new edition;
  - under reduced motion it cuts instead of easing;
  - it never touches sim state, so the state hash cannot change.

## Packages and files

- `packages/gazette/src/year-end.ts`: the year-end edition's story types and template, with no per-culture slots.
- `packages/sim-core/src/records/store.ts` gains yearly aggregates written at the year's last day boundary: population, births, deaths, festivals held, true and recorded crime, and wealth shifts.
- `apps/web`:
  - `src/year-in-review/card.ts`;
  - year-axis history charts, with uPlot from M0.5;
  - `src/camera/follow-news.ts`.

## Interfaces and data

- **Year record:** `{ year, population, births, deaths, festivalsHeld, trueCrime, recordedCrime, gini, top10Share }`, with no culture fields. A type test ensures no field name contains "culture".
- **Camera input:** the front-page story's place, read from the latest edition. The camera writes only to the renderer's camera.

## Method and sources

- **The card, the year axis and seek by date:** [calendar.md](../../../calendar.md), "Watching".
- **Year-end edition and follow the news:** [gazette.md](../../../gazette.md), "How it works".
- **Never by culture:** the [R8 summary](../../../../research/round-8-cultures/summary.md).

## Tests for the exit checks

- `follow-the-news is off by default and changes no state`:
  - a fresh profile starts with it off;
  - with it on at 4× and 16×, state hashes over 3 years match a run with it off.
- `year-end edition never by culture`:
  - the year-end template has no culture slot;
  - a text scan of 20 seeds' year-end editions finds no culture name or emblem id;
  - the culture flip test leaves the edition byte-identical.
- `card matches records`: every figure on the card equals the record store's yearly aggregate.

## Risks and unknowns

- **Owner decision first:** whether the year-in-review card pauses the run or appears without stopping it.
- **Wealth shifts are sensitive.** Show them as Gini and top-share changes only, never by person or group.

## Open questions

- **Owner:** Does the year card pause the run? The Calendar tab leaves it open. Suggested: the card appears without stopping the run and closes on its own; during a skip, it waits for the skip to end. Needed before: building.
- **Owner:** May the card show festivals held beside true and recorded crime? Round 8 keeps culture off every surface that shows crime (R8 summary, "Never shown together"). Suggested: festivals held as one total, with no festival or culture names, in a block apart from the crime figures. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the yearly aggregates first, then the year-end edition from them, then the card and year-axis charts; the camera last.
- **Reuse:** M3.8's gazette core and record store, M4.7's justice column, M5.2's births and deaths, M5.3's Gini and top-10% share, and uPlot from M0.5.
- **Keep it simple:** check the year record against a fixed allow-list of fields; a scan for "culture" in field names misses names like "customs".
- **Pitfalls:** the yearly aggregates belong in saves, or a restored run shows an empty card. The camera reads only published editions, so the worker protocol gains no message for it.
- **Hard and easy parts:** nothing here is deep; the content review of the card's layout needs the most care.
