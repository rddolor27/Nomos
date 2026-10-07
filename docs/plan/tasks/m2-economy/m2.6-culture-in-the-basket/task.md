# M2.6 Culture in the basket

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - culture that changes only the Stone–Geary marginal shares (β) of the six food categories and one wares-against-services split, with shifts that sum to zero, stay within ±25% of the neutral share (±40% on lab cards) and keep every category at 0.6× its neutral share or more (R8);
  - subsistence γ (in portions, bought cheapest-first), saving, labour supply, total consumption, the food total share and grade kept culture-blind (R8);
  - cost-neutral customs: favoured categories start at equal base prices, favourite foods swap within the budget, and festivals draw one equal per-person budget for every culture, asserted exactly in a unit test, with a "basket cost by culture" line per settlement in headless reports, expected within ±2.5% of food spending (R8);
  - a household's shift set to the mean of its adults' shifts, rounded by largest remainder to sum to zero, and recomputed only when the household or a culture changes (R8);
  - `spawnFromLedger` extended to culture: settlement culture counts apportioned exactly, household by household, "mixed" people given one or two local-plurality customs by keyed draw, culture kept independent of wealth rank, home, job and body hue, and fold returning exact counts (R8);
  - shops that stock anticipated festival demand from the public calendar, with festival-week sales, markdowns, spoilage and price moves logged per category (R8).
- **Needs:** M0.6's walled `sim-culture` package, M0.2's culture columns, M2.4's food categories and M2.5's spawn. The festival table, its 2–4× demand and the food-insecurity tally arrive in M3.
- **Exit checks:**
  - Engel's law holds for every culture alike: the food share falls about 7.8 points per doubling of income (R8);
  - unmet food need and the food-insecurity tally do not differ by culture at equal income on paired seeds, and Cramér's V between culture and wealth decile, home district and job stays below 0.05 at spawn over 50 seeds (R8).
