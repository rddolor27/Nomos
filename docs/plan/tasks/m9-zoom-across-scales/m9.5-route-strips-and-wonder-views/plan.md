# M9.5 Route strips and wonder views: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The route strip view (R4, R9):**
  - a seeded strip map, 20–40 tiles wide, built from the route's cells with the place code;
  - it shows the route's caravans, bandits and patrols;
  - their counts are aligned to the route ledger's daily figures (M7.7), as M9.2 aligns towns.
- **Patrols walk the strip (Military).** Soldiers move with sheathed or shouldered weapons, at rest, using the existing soldier art. They defend and patrol roads only, never towns, with no battle animation.
- **Raids on a strip follow M4's crime rules:**
  - true raids appear only in the true view;
  - the recorded view shows only reported incidents;
  - nothing marks a person afterwards.
- **Wonder views (R9):**
  - a vista of each natural wonder, with props, built by the place code from the wonder's cell;
  - the wonder art exists; wire it in;
  - M8.3's 11 wonder loops play in full here.

## Packages and files

- `packages/worldgen/src/strip.ts`: the strip from route cells, seeded by the route's id.
- `packages/worldgen/src/wonder-view.ts`: wonder vistas.
- `packages/sim-country/src/routes/strip-align.ts`: caravans, bandits and patrols aligned to the ledger's daily counts.
- `packages/render-gl/src/views/strip.ts` and `wonder.ts`.

## Interfaces and data

- **Strip:** `{ routeId, cells: Int32Array, width: 20..40 }`, with a map in `MapV1` form so the town renderer draws it.
- **Strip population:** per day, `{ caravans, bandits, patrols }` from the route ledger. Agents on the strip are spawned and aligned to these counts.

## Method and sources

- **Route strips and alignment:** the [R4 report](../../../../research/round-4-multi-scale/report.md) and [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md).
- **Strips and wonder views from the place code:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), part 1.
- **Soldiers at rest, and patrols on roads:** [military.md](../../../military.md).
- **Wonder loops:** [sound.md](../../../sound.md).

## Tests for the exit checks

The plan sets none here. The proposed check:
- `strip matches its ledger`: on presets, a strip's caravans, bandits and patrols match its route ledger's daily counts.

Its own tests:
- `soldiers at rest`: no soldier frame on a strip shows a drawn weapon or a fight. This reuses M3.2's sprite check.
- `strips are seeded`: the same route gives the same strip in Node and Chromium.
- `raids follow the views`: unreported raids never show in the recorded view.

## Risks and unknowns

- **The plan sets no exit check here.** The proposed one needs the owner's sign-off.
- **Bandits are people too:** crime is an act, never a costume, so bandits look like everyone else until they act, and are drawn with no mask or mark.
