# M3.6 Wellbeing and housing

Part of [M3 City life](../milestone.md).

Needs M2's happiness income and household balance sheets, M0.2's claims ledger and quantity registries, and M3.5's missed-meal count.

- **Builds:**
  - life satisfaction (LS) in `AgentStore` (Int16 0–10,000, Int16 set point, Int32 income habit, saturating Uint16 event counters; about 12 bytes), updated in one order-independent daily pass into a back buffer (R6);
  - the LS drivers: income terms, −700 unemployed, −200 scarring, −450 after 7 days without contact, and the food-insecurity penalty as a labelled unsourced knob (default −150 per missed-meal day, floor −700) (R6);
  - low needs and low LS only lowering utility weights, except in physiological collapse, with the driver behind every effect named in the click-to-explain panel (R6);
  - on-the-job search scaled by 1 + 0.15 per ladder point below 7, capped at ×2, with a check that firm-level LS and quits correlate near r = −0.25 (R6);
  - optional: a meal-mood knob (default 0) giving a one-day effect for grade and freshness, measured against the agent's own recent average quality, never by class (R6);
  - signed LS drivers with remaining fade times, household food reserves and pantry freshness in the inspector, and a settlement LS meter in the HUD (mean plus suffering, struggling and thriving shares); art exists; wire it in (R6);
  - freshness kept to the inspector, stall stock pips and waste charts, grade and stale food kept out of bubbles outside the wealth lens, carried goods drawn by category, and no bubble fired from the LS level; M2.7 draws the stall stock pips, and the rest of the art exists; wire it in (R6);
  - housing as a fixed stock of map homes, from the generator rather than LDtk, with owners or renters, rent paid to the owner, mortgages at LTV ≤ 80% and payments ≤ 35% of income above subsistence, a forced sale at a 10% discount on default, and a monthly district price index from recent sales (R6, R9);
  - every home drawn from the map, with no tile, roof, size or decoration depending on the occupant's wealth or the home's price (R6).
- **Exit checks:**
  - within a town, LS rises 0.30–0.45 per doubling of income, and the employed–unemployed gap is 0.6–1.0 (R6);
  - at 10k and 25k agents, needs, meals, the LS pass and day slices stay within their sub-budgets with zero GC (R6).
