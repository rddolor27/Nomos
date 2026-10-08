# M8.7 God tools: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **God tools edit the country as stage inputs (R9).** Every edit reruns the generator from its first dirty stage, and the generator then re-places cultures.
- **The tools:**
  - **re-rolls:** lock and re-roll, with per-stage keyed counters, so a re-roll changes only its stage onward;
  - **terrain:** raise, lower and smooth brushes, and biome paint;
  - **drawing:** rivers and roads;
  - **placement:** towns and wonders.
- **Persistence and conflicts:**
  - pins hold a feature in place across reruns;
  - tombstones remove generated features and lower counts;
  - a conflict list shows edits a rerun could not honour;
  - one undo log covers every tool.
- **Never culture paint.** The tools offer no culture, person or hue painting; cultures are always re-placed by the generator (R9). Builder edits keep entity ids stable, as teaching's paired arms need.
- **Countries rerun like any stage.** M8.1's countries stage takes part in lock and re-roll, and an edit to terrain or towns reruns it, so borders and capitals follow the edit. No tool paints a border or assigns a town to a country (Countries).

## Packages and files

- `apps/web/src/build/country/`: the country tool set, extending M3.4's and M6.4's Build mode.
- `packages/worldgen/src/edits/`:
  - `dirty.ts`: the first dirty stage of an edit log;
  - `rerun.ts`: partial rerun from that stage;
  - `pins.ts` and `tombstones.ts`;
  - `conflicts.ts`.

## Interfaces and data

- **Country edit:** `{ stage, op, args }`, where the op is reroll, raise, lower, smooth, paint-biome, draw-river, draw-road, place-town, place-wonder, pin or tombstone.
- **Re-roll counters:** `Uint16` per stage, mixed into that stage's keyed draws.
- **Conflict:** `{ edit, reason }`, shown in a list with "drop edit" and "keep and re-place" options.

## Method and sources

- **Edits on a seeded world, regeneration rules, stable identities and partial reruns:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), part 3, and [R9 edits and saves notes](../../../../research/round-9-maps-and-world-builder/notes/edits-and-saves.md).
- **Tools, autotile and undo:** the same report, "Tools, autotile and undo", and [R9 editor tech notes](../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md).

## Tests for the exit checks

The ongoing rerun test covers country edits:
- `partial rerun equals full rerun`: for 100 random country edit logs, rerunning from the first dirty stage equals a full rerun, byte for byte.

Its own tests:
- `re-roll stays in its stage`: re-rolling stage k leaves every earlier stage's output byte-identical.
- `pins and tombstones survive reruns`: a pinned town stays, and a tombstoned wonder stays gone, across a rerun from an earlier stage.
- `cultures re-placed, never painted`: the tool registry has no culture tool, and every rerun calls M8.2's hearth placement.

## Risks and unknowns

- **Edits that fight the generator,** such as a town placed on a river, need clear conflict rules. Round 9 lists the guardrails; anything they don't cover goes in the conflict list, never silently dropped.
- **Undo across reruns** must restore the exact world. Store edit logs, never world snapshots, so undo replays the log.

## Open questions

- **Owner:** Does each edit rerun the 50–100-year spin-up, or only the generator, with spin-up once on Play? R9 assumed a rerun per edit from round 8's 0.14 s culture-only run; M7.7 computes 8–17 s at 1,000 settlements for the full ledger. Suggested: the generator only per edit, with spin-up and the after-spin-up checks on Play. Needed before: the step plan.
- **Owner:** Does a placed town take its size from the rank-size rule, or from the player? Player sizes would bend the Zipf and fairness checks. Suggested: the generator sizes it, and the player picks the site and tier. Needed before: the step plan.
- **Measure:** How long does a rerun take on a large world after a brush stroke, with hearths re-placed? R9 computed 17–45 ms after an elevation edit on a standard world. Suggested: rerun once per finished stroke, never per pointer event, and time it on a large world in Chromium. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the edit log, first-dirty-stage detection and the partial-equals-full test first, then re-roll, pins and tombstones, then brushes, drawing and placement.
- **Reuse:** M3.4's and M6.4's Build mode and undo, M6.3's edit layers, M8.1's stages and M8.2's hearth placement.
- **Keep it simple:** a drawn river is an elevation channel carve (R9 edits notes), so it needs no river layer of its own.
- **Pitfalls:** an edit that no longer fits goes dormant and is listed, never dropped silently. The tool registry has no culture, crime, wealth or hue tool (R9). A hot spring placed away from the geothermal hotspot is a conflict, not a second hotspot.
- **Hard and easy parts:** first-dirty-stage detection with pins and tombstones needs the most care; the brush ops are mechanical.
