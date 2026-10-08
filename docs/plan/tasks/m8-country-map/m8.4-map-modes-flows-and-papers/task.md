# M8.4 Map modes, flows and papers

Part of [M8 Country map](../milestone.md).

Needs: M7's settlement and route ledgers, M4's true and recorded split, M5's culture lens, and the gazette from M3–M5.

- **Builds:**
  - map modes as (state, entity) → {base, stripe}: true crime as base and recorded as stripe, plus population, growth, clearance, police, prices, wages, trade and danger (R4);
  - M8.3's flat Countries view as one of the map modes (Countries);
  - goods map modes: main product per settlement (eight classes, icon plus colour), the price of a chosen good, days of stock, and resource health (fish B/K, forest V/K, ore left) (R6);
  - the home-regions map mode in the culture lens: dominant culture with hatching for diversity, and labels; it never uses the six body-hue colours or the police, merchant and crime colours, and is never the default view (R8);
  - in the home-regions mode, country borders show only as thin neutral lines, with no country colour or name, so cultures can be seen crossing them; no panel shows a country's culture mix outside the culture lens (Countries);
  - flows as directed, side-offset bands along routes, aggregated per level, with capped particles for the selected flow only; the caravan and boat art exists; wire it in (R4);
  - route ledgers on the map (traffic, bandit pressure, patrols, incidents), with robbery markers in the recorded view only once they are reported (R4);
  - in country mode, each town's own paper from its ledger, one paper per town, plus a gazette for each country from that country's aggregate ledgers: harvests, prices, migration and recorded raids on its roads (Gazette, Countries).
- **Verify first:** culture lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1), which decide whether a lens colour reads as a body colour.
- **Exit checks:**
  - every figure in each country's gazette equals that country's recorded ledger figure (Gazette, Countries).
