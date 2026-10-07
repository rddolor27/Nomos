# M2.3 Calibration and design runner

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - two presets: an exact Lengnick replication, and a city preset with shop markups of 1.36–1.50 over wholesale and 0.8–1.6 months of stock (R2);
  - a log of the share of firm visits that find an acceptable vacancy, π raised toward 0.3–0.6 if job-to-job moves fall short, and workers who differ, so that long unemployment spells occur (R2);
  - a firm credit line as a slider, only if cycles prove too mild, tested against both Mark-0 phase tables (R2);
  - daily flow logs per district in headless runs (hires, separations, wage bill, consumption, repricing share and size, vacancies, firm entries and exits, taxes), and a headless design runner over seeds × city sizes (1,000–100,000 agents) × police shares × unemployment shocks, writing columnar logs (R4).
- **Needs:** M2.2's spawn for the city sizes. The runner's police-share axis does nothing until M4 adds police, and taxes stay at zero until M5 adds the treasury.
- **Exit checks:**
  - the economy targets hold: prices change in 9–12% of months, about 2% of job-stayers see a pay cut a year, about 26% of the unemployed find work each month, plus the BAM bands and the Mark-0 phase table (R2).
