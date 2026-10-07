# M9.2 Daily alignment

Part of [M9 Zoom across scales](../milestone.md).

- **Builds:**
  - interior totals aligned daily by sorting, carrying each day's shortfall, with boundary flows executed exactly: arrivals released and departures removed at entry tiles (R4);
  - a divergence meter: daily z-scores per flow in the developer panel, logged for emulator refits (R4).
- **Needs:** M9.1; M7.2's emulator, which the logs refit.
- **Owner decision first:** the proposed bar of |z| < 2 on at least 95% of flow-days.
- **Exit checks:**
  - on presets, daily |z| < 2 on at least 95% of flow-days, and a camera oscillating across the threshold causes at most one switch per dwell period (R4).
