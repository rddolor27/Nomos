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

## Open questions

- **Owner:** Is the proposed exit check accepted: a strip's caravans, bandits and patrols match its route ledger's daily counts? The plan sets none here. Suggested: accept it, as exact daily counts on presets. Needed before: the step plan.
- **Owner:** How long is a strip? R4 makes its length a compressed function of the route's real length but gives no function. Suggested: the length grows with the route's cell count up to a fixed cap, so one reserved map buffer fits every strip. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** a strip from route cells, drawn by the town renderer, first, then aligned counts, then patrols and raids, then wonder views and their loops.
- **Reuse:** M9.1's spawn and switch rules, M9.2's alignment, M7.7's route ledger, M6.1's place code and M8.3's wonder loops.
- **Keep it simple:** strip agents are view-only, keyed by (route, day, event), never notables, and dropped on leave, since the route ledger holds only counts.
- **Pitfalls:** raids show here, so strip agents show no culture (content rule 8). Bandits look like everyone else until they act (content rule 3). If M7.7 added road stops, wrongful stops are drawn as heavily as arrests (Military).
- **Hard and easy parts:** fitting moving caravans to daily counts on a compressed strip needs care; wonder views reuse the place code.
