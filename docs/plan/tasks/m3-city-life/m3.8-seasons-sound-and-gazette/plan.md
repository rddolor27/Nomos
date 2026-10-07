# M3.8 Seasons, sound and gazette: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Seasons in the town (Calendar):**
  - fields are planted in spring, grow in summer, are harvested over 9–14 days of autumn (M3.5) and lie fallow in winter;
  - day length comes from M0.1's sunrise table and feeds M3.3's light periods;
  - the renderer applies `assets/sprites/season_map.json`: palette swaps for the ground and foliage groups, sprite swaps for bare and snowy trees, and snow overlays on ground tiles and roofs;
  - the snow schedule follows the map file: light, then full, then patchy across winter.

  The art exists; wire it in.
- **Town events with sound (Sound):**
  - Sounds play only for events near the camera, panned by screen position: purchase, emotes, doors, footsteps, work, the clock and animals.
  - Voices are capped at about 24, and each kind is capped per second.
  - Instead of stacking sounds, the town bed steps from quiet to busy to market.
  - The sounds exist; wire them in through M1.4's player.
- **Ambience** follows biome, time of day and season, crossfaded at dawn and dusk with the light periods. Winter brings `amb_snow`.
- **The music player:**
  - title, lab, town day and town night tracks, one at a time, with crossfades;
  - variations keyed on (world seed, place, day), so a replay sounds the same;
  - loaded as its own chunk when first needed.
- **Festival music** plays in one of the four styles, which differ only in tempo, loudness and structure. It never plays in justice views.
- **The town gazette (Gazette):**
  - An edition is a pure function: edition(settlement, day) = f(records up to that day's boundary). One edition per settlement prints at dawn (06:00), covering the day before.
  - **Stories:** each new record maps to a story type with a fixed priority. Ties break by record id, and at most two stories come from one section.
  - **Templates:** plain sentences with slots, from one string table. The variant comes from a keyed draw on (world seed, settlement, day, story), outside the sim's streams.
  - **No personal names**; the justice column arrives in M4.
  - **The panel:** an HTML panel in the HUD, so screen readers can read it, with back issues by date. A dot marks a new edition, and the run never pauses.
  - **Art:** the rolled-paper button icon at 16 and 8 px, and the paper panel frame, both drawn in `tools/sprites`.
- **The record store** is the gazette's only input, and no earlier task builds it.
  - M3.8 builds a minimal append-only store of day-boundary records: town events, market moves, calendar events and festivals, each with an id.
  - It grows from M0.3's day-boundary record and M2's flow logs.
  - It lives beside the sim and is written only at the day boundary.
  - M4 adds justice records to it.

## Packages and files

- `packages/render-gl/src/seasons.ts`: palette swaps, sprite swaps and the snow schedule from `season_map.json`.
- `packages/audio`: the event-sound router (voice caps, per-kind caps and the town bed), ambience selection, the music player and the festival style.
- `packages/sim-core/src/records/store.ts`: the record store, append-only, with records written only at the day boundary.
- `packages/gazette` (`@nomos/gazette`), new:
  - it imports only the record store's read API and its own templates;
  - a dependency-cruiser rule enforces that.
- `apps/web/src/gazette/`: the panel, back issues and the new-edition dot.
- `tools/sprites`: the gazette icon and panel frame.

## Interfaces and data

- **Record:** `{ id, day, settlement, kind, slots }`. The slots are counts, places, goods, prices and case numbers, never a person's name.
- **Store read API:** `recordsFor(settlement, fromDay, toDay)`, returning a read-only view.
- **Edition:** `printEdition(settlement, day, store, templates, seed): Edition`, where an edition is `{ settlement, day, stories: { recordId, section, text }[] }`.
- **Event-sound map:** event kind → sound name, from [sound.md](../../../sound.md)'s trigger table. A test checks that every entry has a visual twin.

## Method and sources

- **Seasons, the snow schedule and day length:** [calendar.md](../../../calendar.md), "Seasons in the world", and `assets/sprites/season_map.json`.
- **Event sounds, caps, the town bed, ambience, music and festival styles:** [sound.md](../../../sound.md).
- **Gazette rules, the build, determinism and the panel:** [gazette.md](../../../gazette.md), "Rules" and "How it works".

## Tests for the exit checks

- `every sound has a visual twin`: for each event kind in the event-sound map, a bubble, log line or icon exists in the renderer's tables.
- **Gazette records:**
  - `every story traces to a record`: over 100 editions from 5 seeds, every story's `recordId` exists in the store and matches its section;
  - `the gazette imports only the record store`: the dependency-cruiser rule on `packages/gazette` allows only `records/store` and its own files, and a planted import fails it.
- **Gazette determinism:**
  - `a replay prints the same editions`: replaying seed 42 for 28 days prints byte-identical editions;
  - `the gazette changes nothing`: running with the gazette off gives the same state hashes at every day.
- `templates and editions pass the filters`: every template and every printed edition passes the name, profanity, generic-claim and hierarchy-word filters from M0.6 and M3.7.
- `snow follows the schedule`: on a winter day, the renderer's season state matches `season_map.json` for that day of the season.

## Risks and unknowns

- **Owner decision first:** whether music stays chiptune or adds soft sampled instruments, which would also need a file format that plays in Safari.
- **Owner decision first:** whether street and district names come from a culture's naming custom. If they do, the gazette names districts by number.
- **The record store is new architecture.** Keep it minimal and append-only; M4's justice records and M5's year-end edition extend it.
- **Voice caps are estimates** set in M1.4, so re-measure them with a busy market.
