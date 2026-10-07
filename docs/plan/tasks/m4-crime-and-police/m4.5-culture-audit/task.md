# M4.5 Culture audit

Part of [M4 Crime and police](../milestone.md).

- **Builds:**
  - the outcome and exposure audit in headless CI over 50 paired seeds × 20 simulated years, in agent-level units: raw per-culture rates of true offending, victimisation, stops, wrongful stops, arrests, records and wealth decile within 0.9–1.1 of the population rate; Mantel–Haenszel ratios on place × time × visible-cue strata within |ln ratio| ≤ 0.05, overall and by period; and reporting and trust logged by culture too (R8);
  - the same audit run against a single-culture world, a culture-blind twin with preference shifts set to zero, and customs counterfactuals on the same seeds (R8).
- **Needs:** M2.3's design runner, and M2.6's spawn by culture and M3.7's customs and festivals for the counterfactual worlds. At 1,440 ticks a day, 20 simulated years is about 3.2 million ticks per seed (computed).
- **Verify first:** the culture audit's outcome band (0.9–1.1), equivalence margin (0.05) and power over 50 paired seeds, which decide whether the audit detects culture leaks.
- **Exit checks:**
  - the audit passes both bands, or a named place-time mechanism explains each exception (R8).
