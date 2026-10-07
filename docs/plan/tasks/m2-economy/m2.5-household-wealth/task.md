# M2.5 Household wealth

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - household balance sheets: deposits, unsecured debt (limit 0.5–1× annual income at 12–20% a year, discharged after 5–7 years at ≥ 80% of the limit), durables (about 0.35× earnings) and shares in named firms (R6);
  - firm profits paid as dividends to each firm's shareholders, with returns logged and checked for an SD near 6% a year and a persistent part near 3 points, re-drawn every 10–20 years (R6);
  - a saving rule rising by income quintile (about 0, 2, 6, 9 and 15–18% of income above subsistence and housing), with 5% a year drawn from liquid wealth and less from illiquid wealth as wealth rises (R6);
  - happiness income as household disposable income per adult, fed into each agent's Q16 log2 income habit, with each settlement's median log income published from a histogram at the day boundary (R6);
  - `spawnFromLedger` extended to wealth: keyed rank, a per-preset quantile table, income–wealth rank correlation near 0.6, exact apportionment to group totals, a portfolio split by group, and homes by rank plus noise (R6).
- **Needs:** M2.2's spawn, M2.4's firms, and M0.2's claims ledger, quantity registries and @stdlib tables. The income habit column belongs to the life-satisfaction block that M3 adds to `AgentStore`, and housing costs arrive with M3's rents.
- **Exit checks:**
  - known answers: an earnings-only economy settles within 0.1 of the earnings Gini, the Yard-Sale model without redistribution drifts toward Gini 1, and cash and loan identities hold over 50 seeds × 400 simulated years (R6).
