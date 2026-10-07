# M7.3 Flows and villages

Part of [M7 Country of ledgers](../milestone.md).

- **Builds:**
  - flows between settlements, planned then applied: margin-driven trade per good with losses and stock in transit, monthly migration by expected wage over a gravity or radiation kernel, commuting as cross-settlement wages within about 50–100 km, and movers carrying their cents (R4);
  - flows kept on sparse CSR graphs with at most 24 neighbours per settlement, settlements updated round-robin across a day's ticks, and dense matrices only between regions (R5);
  - village rules: own production outside the cent ledger, a market every 2–10 days by density, seasonal harvests into stores, a rural youth migration hazard, and the region tier for unlisted hamlets (R4);
  - the country CI suite: daily identities, the integer-cent SIM known answer, the five scaling tests, Zipf and spacing, the trade band and gravity, migration and commuting decay, crime ratios, police staffing and response times (R4).
- **Verify first:** FBI tables 16 and 70–74, BJS reporting by location, and Bettencourt 2007 with intervals, which set country mode's crime, police and scaling bands.
- **Exit checks:**
  - 10,000 settlements advance one simulated day within the 12 ms country budget on the reference machine and 1,000 within 1.5 ms (prototypes took 5.1–10.4 ms in JS and 4.7 ms in WASM at 10,000), and every identity holds exactly every day over 20 seeds × 50 simulated years (R4);
  - on at least 30 settlements spanning three orders of magnitude, the GDP-like exponent's interval overlaps 1.08–1.15 and rejects 1, while homicide-like and household exponents do not reject 1 (R4);
  - Zipf's ζ stays within 0.9–1.2 for 50 years, trade distance elasticity is −0.9 ± 0.2, commuting decays at about −2, and migration between settlements runs at 3.6–5.5% a year (R4);
  - urban-to-rural property victimisation is 3.4 ± 30%, officers per 1,000 peak in towns under 10,000, and an export shock to one region is partly offset by its net fiscal inflow within the year (R4).
