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
  - every settlement reaches the capital by road or sea lane;
  - food capacity per country is enough for its population;
  - no pin sits in water;
  - names pass round 8's filter, in ASCII;
  - payloads stay within M6.3's caps.

  A failing world can't start, and the reasons show on the map.

## Packages and files

- `apps/web/src/new-country/`: the panel, the stage badges and presets, and a live preview at Country-view scale.
- `packages/worldgen/src/settings.ts`: overrides as stage inputs.
- `packages/worldgen/src/validate.ts`: the five checks, run in the worker.

## Interfaces and data

- **Override:** `{ stage, key, value }`, with the key from a fixed list of about 10 (sea level, mountain count, climate, river density, settlement density, culture count, single culture and so on), set in the step plan from round 9's list.
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
