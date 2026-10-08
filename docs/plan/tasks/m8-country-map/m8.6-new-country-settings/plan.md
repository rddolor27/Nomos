# M8.6 New country settings: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **A "New country" settings panel (R9):**
  - about 10 overrides, grouped by generator stage;
  - each badged by what it keeps: "keeps coastline" when it changes a later stage, "new world" when it changes an early one;
  - standard or large size;
  - a culture count, and a single-culture switch;
  - presets, a live preview and validation.
- **Settings are edits.** Each override is an edit layer on its stage (M6.3), so a setting and a hand edit replay the same way.
- **Validation, on Play, on Share and on every open (R9):**
  - every settlement reaches its own country's capital by road or sea lane;
  - food capacity is enough for the population, counted over the whole world, since trade crosses borders under the owner's map-facts-only decision of 9 October 2026 (agent ruling);
  - no pin sits in water;
  - names pass round 8's filter, in ASCII;
  - payloads stay within M6.3's caps.

  A failing world can't start, and the reasons show on the map.

## Packages and files

- `apps/web/src/new-country/`: the panel, the stage badges and presets, and a live preview at Country-view scale.
- `packages/worldgen/src/settings.ts`: overrides as stage inputs.
- `packages/worldgen/src/validate.ts`: the five checks, run in the worker.

## Interfaces and data

- **Override:** `{ stage, key, value }`, with the key from a fixed list of about 10 (template, land share, mountain chains, wetness, cold edge, settlement density, wonder count, culture count, single culture and so on), set in the step plan from round 9's list.
- **Validation result:** `{ ok, problems: { kind, cell?, settlement? }[] }`.

## Method and sources

- **Settings, badges and presets:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "UX patterns to copy" and "Four levels, an MVP order and the cost".
- **Guardrails on Play, on Share and on every open:** the same report, "Guardrails, checked on Play, on Share and on every open".
- **A culture count, never painting:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md).

## Tests for the exit checks

The ongoing edit tests cover country settings:
- `a no-op edit leaves the replay hash unchanged`: setting an override to its current value changes nothing.
- `a treatment edit changes no unrelated entity id`: changing a late-stage override keeps the ids of every settlement it doesn't touch.

Its own tests:
- `validation catches each failure`: an unreachable settlement, a food shortfall, a pin in water, a filtered name and an oversized payload each fail with the right kind.
- `badges are true`: a "keeps coastline" override leaves the coastline grid byte-identical.

## Risks and unknowns

- **Live preview cost:** a large world takes up to 400 ms to generate. Preview at standard size, or debounce, so the panel stays responsive.
- **Override list size:** about 10 is round 9's estimate. Keep the list small, because each override is a stage input forever.

## Open questions

- **Owner:** Which ten or so overrides ship? Each one is a stage input forever. Suggested: one per world-level draw in `tools/worldgen`, eleven from template to wonder count (R9 builder notes), plus the culture settings. Needed before: the step plan.
- **Owner:** May players set the number of countries? The owner's decision of 9 October 2026 has the seed pick 3–5. Suggested: yes, as one override of M8.1's countries stage, limited to 3–5. Needed before: the step plan.
- **Owner:** Which presets ship, and under what names? Preset names are public text under the content rules. Suggested: "Surprise me" plus 4–6 presets named for landforms, never real places, each through the name filter. Needed before: building.
- **Measure:** What margin makes food capacity "enough"? Validation needs a number. Suggested: capacity at least equal to need after M7.4's pre-retail losses, as a design value. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** validation in the worker first, since Play and Share both need it, then overrides as stage inputs, then the panel, badges, presets and preview.
- **Reuse:** M6.3's edit layers, share links and payload caps, M8.1's `generateWorld` and M3.7's name filter.
- **Keep it simple:** each override replaces one keyed draw, so an override set to its current value gives the same draw and the same replay hash.
- **Pitfalls:** derive each badge from measurement, not intuition. Changing the mountain chains kept the coastline in only 7 of 12 seeds (R9 builder notes, measured there), so it is "new world".
- **Hard and easy parts:** true badges and the edit tests need care; the panel and presets are mechanical.
