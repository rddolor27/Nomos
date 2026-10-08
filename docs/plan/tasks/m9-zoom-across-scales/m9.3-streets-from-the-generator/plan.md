# M9.3 Streets from the generator: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Every tier's streets come from the district generator** (M6.1).
  - Districts are prefetched when the cursor hovers over a place, and cross-faded in.
  - Building interiors stay abstract, as building cards (R4, R9).
- **Place record version 2 (R9):**
  - a stable id and cell;
  - edge biomes per side;
  - elevation and relief;
  - river size and road rank;
  - region, founding tier and versions;
  - temperature and moisture, quantised to the place generator's bands.
- **Growth never moves a street.**
  - Each place's plan type is locked at its founding tier.
  - Keyed lots are built by population, so new lots fill in without moving old ones (R9).
- **Place edits are reservations** the generator flows around.
  - They are stored per place uid, with the place version and a record hash.
  - They go dormant rather than being dropped when the record changes (R9).
- **Sound (Sound):** music and ambience crossfade between country, region, city and street, through M3.8's player. The sounds exist; wire them in.

## Packages and files

- `packages/worldgen/src/place/record-v2.ts`: the record, its quantisation and its hash.
- `packages/worldgen/src/place/growth.ts`: the plan-type lock and keyed lots by population.
- `packages/worldgen/src/place/reservations.ts`: edits as reservations, including dormancy.
- `packages/render-gl/src/zoom/prefetch.ts`: hover prefetch and the cross-fade.
- `packages/audio`: zoom-level crossfades.
- `tools/worldgen/model.py`: `PlaceContext` gains the version 2 fields, with Python goldens regenerated.

## Interfaces and data

- **`PlaceRecordV2`:** `{ uid, cell, edges: Uint8Array(4), elevation, relief, river, roadRank, region, foundingTier, versions, tempBand, moistBand }`.
- **Reservation:** `{ uid, placeVersion, recordHash, edits: EditLayer, dormant: boolean }`.
- **Prefetch:** `prefetch(uid)` starts generation and spawning in the worker, ready to cross-fade.

## Method and sources

- **Identity across visits, growth and versions, and edits as reservations:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "A place stays identical across visits, growth and versions" and "Regeneration rules".
- **Interiors as cards, and the zoom ladder:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md) and the [R4 report](../../../../research/round-4-multi-scale/report.md).
- **Zoom crossfades:** [sound.md](../../../sound.md), "Space and zoom".

## Tests for the exit checks

- `zoom without a dropped frame`:
  - Playwright zooms from Region to City with hover prefetch;
  - interior generation (≤ 60 ms) and spawning (≤ 10 ms) finish under the cross-fade;
  - no frame exceeds twice the median.
- **`zoom-consistency`, over 100 seeds:**
  - road, river and sea sides of every place match the country exactly;
  - every landmark icon appears in its place;
  - edge farmland shows as fields.
- `growth keeps streets`: growing a place's population across a tier boundary leaves every existing street and lot unchanged.
- `reservations go dormant`: changing a place's record makes its reservation dormant, never deleted, and restoring the record re-applies it.

## Risks and unknowns

- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones. They set the phone tier for country mode.
- **Record version 2 changes the Python reference too.** Regenerate goldens and mockups in the same commits.
- **Prefetch on hover** does nothing on touch screens. Use a tap-and-hold, or prefetch the nearest places to the camera.

## Open questions

- **Owner:** Does one prefetch trigger serve every device? Hover does nothing on touch screens. Suggested: prefetch the place nearest the camera centre once zoom passes a threshold, for mouse and touch alike. Needed before: the step plan.
- **Measure:** What are district generation and spawn times on phones? The 60 ms and 10 ms budgets come from desktop Node, where generation took 59 ms warm (R4), so phones may need longer cross-fades. Suggested: time both on one mid-range Android phone and one iPhone, alongside M8.1's device runs. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** record version 2 and its goldens in Python, then the TypeScript record and zoom-consistency test, growth and reservations, and prefetch, cross-fade and sound last.
- **Reuse:** M6.1's district generator, M8.1's place records, and M6.3's edit layers for reservations.
- **Keep it simple:** regenerate a district on every visit, since generation is deterministic and within 60 ms, and cache nothing.
- **Pitfalls:** quantised temperature and moisture bands must match the Python bands exactly, or the zoom-consistency test fails at band edges. A dormant reservation is listed to the player, never hidden.
- **Hard and easy parts:** growth that never moves a street needs the most care; the crossfades and the record hash are mechanical.
