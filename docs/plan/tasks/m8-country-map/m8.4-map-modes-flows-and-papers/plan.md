# M8.4 Map modes, flows and papers: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Map modes are data:** (state, entity) → {base, stripe}. One mode paints a settlement's base colour, and an optional second paints a stripe.
  - True crime is the base and recorded crime the stripe.
  - Other modes: population, growth, clearance, police, prices, wages, trade and danger (R4).
  - M8.3's flat Countries view becomes a mode too, with entity `'country'`, so the map has one way to switch what it shows (Countries).
- **Goods modes (R6):**
  - main product per settlement, eight classes, each an icon plus a colour;
  - the price of a chosen good;
  - days of stock;
  - resource health: fish B/K, forest V/K and ore left.
- **Home regions, inside the culture lens only (R8):**
  - the dominant culture, with hatching for diversity, and labels;
  - it never uses the six body-hue colours or the police, merchant and crime colours;
  - it is never the default view;
  - it draws country borders only as thin neutral lines, with no country colour or name, so viewers see cultures cross them (Countries).
- **Flows (R4):**
  - directed, side-offset bands along routes, aggregated per zoom level;
  - capped particles for the selected flow only;
  - the caravan and boat art exists; wire it in.
- **Route ledgers on the map (R4):** traffic, bandit pressure, patrols and incidents. Robbery markers appear in the recorded view only once reported.
- **Papers in country mode (Gazette):**
  - each town keeps its own paper, built from its ledger: one paper per town (owner, 7 October 2026);
  - each country gets its own gazette, built from that country's aggregate ledgers: harvests, prices, migration and recorded raids on its roads (owner, 9 October 2026).

## Packages and files

- `packages/render-gl/src/map-modes/`:
  - `registry.ts`: the (state, entity) → {base, stripe} table;
  - `goods.ts`, `crime.ts` and `home-regions.ts`, the last available only in the culture lens.
- `packages/render-gl/src/flows.ts`: bands, offsets, aggregation and particles.
- `packages/gazette/src/country.ts`: each country's gazette from its aggregate ledger records.
- `packages/sim-country/src/records.ts`: country records for the record store, with town ledgers feeding town papers.

## Interfaces and data

- **Map mode:** `{ id, state: StateKey, entity: 'settlement' | 'route' | 'region' | 'country', base: ColourScale, stripe?: ColourScale, lens?: 'culture' }`.
- **Flow band:** `{ route, direction, amount, kind }`, aggregated per zoom level and drawn with an offset by direction.
- **Country gazette inputs:** each country's recorded aggregate ledger figures only, never true ones.

## Method and sources

- **Map modes, stripes, flows and route ledgers:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md) and the [R4 report](../../../../research/round-4-multi-scale/report.md).
- **Goods modes and resource health:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md).
- **Home regions in the lens only:** the [R8 report](../../../../research/round-8-cultures/report.md) and M5.5.
- **Papers in country mode:** [gazette.md](../../../gazette.md), "How it works".

## Tests for the exit checks

- `country gazette equals recorded ledgers`: over 20 seeds × 2 years, every figure in each country's gazette equals that country's aggregate recorded figure for that day.
- `home regions only in the lens`: with the lens off, the home-regions mode is unavailable, and no frame uses its palette.
- `lens colours avoid body hues`: every lens and emblem colour differs from every body-hue shade tone by more than the verified CIEDE2000 threshold.
- `robbery markers only once reported`: in the recorded view, no marker appears for an unreported raid.

## Risks and unknowns

- **Verify first:** culture lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1). They decide whether a lens colour reads as a body colour.
- **Too many modes overwhelm.** Group them, and keep the default mode neutral (population).
- **Flows at the country level** need aggregation by zoom, or bands clutter. Cap the drawn bands per view.

## Open questions

- **Measure:** How many flow bands per view keep the views within M8.3's 2 ms? Bands clutter and cost frame time at country zoom. Suggested: set the cap from a timing run on a large world. Needed before: building.
- **Owner, decided on 9 October 2026:** one gazette per country, not one for the whole world. The Gazette tab planned one for a one-country world. Countries share laws and money (owner, 9 October 2026), so each country's gazette sums the ledgers of its own settlements, and its stories never put a culture beside a raid.
- **Research:** What CIEDE2000 distance keeps a lens colour from reading as a body colour? R8 found lens and emblem colours only 6.0–9.1 from the ice, sun, lilac and silver shades (computed), and set no bar. Suggested: a provisional 10, an unsourced estimate, until a short research round settles it. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the registry with population and the crime pair first, then goods modes, flows, route ledgers and papers, with the home-regions mode last.
- **Reuse:** M8.3's views, M4's true and recorded split, M5.5's culture lens, M7.7's route ledgers, and the gazette from M3–M5.
- **Keep it simple:** build a town's paper only when it is opened, from the record store; keep records, never rendered papers.
- **Pitfalls:** in the recorded view the crime mode drops its true base. With the lens on, justice modes and raid markers are unavailable, and no country's gazette prints culture figures beside raids (content rule 8). Raid markers sit on routes, never on people.
- **Hard and easy parts:** keeping every view's palette and filter rules right needs care; most modes are data rows.
