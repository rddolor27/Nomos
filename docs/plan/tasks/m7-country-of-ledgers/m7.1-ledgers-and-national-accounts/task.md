# M7.1 Ledgers and national accounts

Part of [M7 Country of ledgers](../milestone.md).

Needs only M0, so it could start as soon as M0 lands.

- **Builds:**
  - the settlement store as typed arrays: people by state (employed, unemployed, merchants and owners, police, jailed), optionally in three age and three wealth bands, integer-cent accounts by sector, price and wage indices, inventory, vacancies, firm counts, and true and recorded crime over a 21-day window with arrests, a top-5% concentration share and the police mode (R4);
  - daily flows as integer stochastic draws: stochastic rounding below a mean of 8, otherwise a 4,096-entry inverse-normal table plus `sqrt`, with price revisions as the share of firms repricing (R4);
  - the national layer on Godley–Lavoie Model REG: one treasury, a central bank as the only issuer, a uniform national tax, services and police paid per settlement, Hamilton apportionment, an optional equalisation grant, and local police with an optional national force (R4);
  - a terrain-free generator for tests: Zipf sizes, hexagonal or Poisson-disc spacing by level, Gibrat growth with a reflecting floor, and a Delaunay → spanning tree → spanner route graph (R4).
- **Owner decision first:** whether people by state carry the optional three age and three wealth bands; M7.3's rural youth migration hazard and the Calendar's age-based hazards would read an age split.
- **Exit checks:**
  - integer-cent model SIM reaches exactly Y = 10,000 = G/θ (R4).
