# M8.4 Map modes, flows and papers: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Map modes are data:** (state, entity) → {base, stripe}. One mode paints a settlement's base colour, and an optional second paints a stripe.
  - True crime is the base and recorded crime the stripe.
  - Other modes: population, growth, clearance, police, prices, wages, trade and danger (R4).
- **Goods modes (R6):**
  - main product per settlement, eight classes, each an icon plus a colour;
  - the price of a chosen good;
  - days of stock;
  - resource health: fish B/K, forest V/K and ore left.
- **Home regions, inside the culture lens only (R8):**
  - the dominant culture, with hatching for diversity, and labels;
  - it never uses the six body-hue colours or the police, merchant and crime colours;
  - it is never the default view.
- **Flows (R4):**
  - directed, side-offset bands along routes, aggregated per zoom level;
  - capped particles for the selected flow only;
  - the caravan and boat art exists; wire it in.
- **Route ledgers on the map (R4):** traffic, bandit pressure, patrols and incidents. Robbery markers appear in the recorded view only once reported.
- **Papers in country mode (Gazette):**
  - each town keeps its own paper, built from its ledger: one paper per town (owner, 7 October 2026);
  - the national gazette is built from the aggregate ledgers: harvests, prices, migration and recorded raids on the roads.

## Packages and files

- `packages/render-gl/src/map-modes/`:
  - `registry.ts`: the (state, entity) → {base, stripe} table;
  - `goods.ts`, `crime.ts` and `home-regions.ts`, the last available only in the culture lens.
- `packages/render-gl/src/flows.ts`: bands, offsets, aggregation and particles.
- `packages/gazette/src/national.ts`: the national gazette from aggregate ledger records.
- `packages/sim-country/src/records.ts`: country records for the record store, with town ledgers feeding town papers.

## Interfaces and data

- **Map mode:** `{ id, state: StateKey, entity: 'settlement' | 'route' | 'region', base: ColourScale, stripe?: ColourScale, lens?: 'culture' }`.
- **Flow band:** `{ route, direction, amount, kind }`, aggregated per zoom level and drawn with an offset by direction.
- **National gazette inputs:** recorded aggregate ledger figures only, never true ones.

## Method and sources

- **Map modes, stripes, flows and route ledgers:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md) and the [R4 report](../../../../research/round-4-multi-scale/report.md).
- **Goods modes and resource health:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md).
- **Home regions in the lens only:** the [R8 report](../../../../research/round-8-cultures/report.md) and M5.5.
- **Papers in country mode:** [gazette.md](../../../gazette.md), "How it works".

## Tests for the exit checks

- `national gazette equals recorded ledgers`: over 20 seeds × 2 years, every figure in the national gazette equals the aggregate ledgers' recorded figure for that day.
- `home regions only in the lens`: with the lens off, the home-regions mode is unavailable, and no frame uses its palette.
- `lens colours avoid body hues`: every lens and emblem colour differs from every body-hue shade tone by more than the verified CIEDE2000 threshold.
- `robbery markers only once reported`: in the recorded view, no marker appears for an unreported raid.

## Risks and unknowns

- **Verify first:** culture lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1). They decide whether a lens colour reads as a body colour.
- **Too many modes overwhelm.** Group them, and keep the default mode neutral (population).
- **Flows at the country level** need aggregation by zoom, or bands clutter. Cap the drawn bands per view.
