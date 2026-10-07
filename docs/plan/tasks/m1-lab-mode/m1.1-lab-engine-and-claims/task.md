# M1.1 Lab engine and claims

Part of [M1 Lab mode](../milestone.md).

- **Builds:**
  - the discrete-day engine with the thief/trader contest, Primer's ±1 market and animated day phases, drawn as Skin A dots until M1.3 (R1);
  - claim tags (estimate, per-seed property or comparison): comparisons on 50 paired seeds per arm (Holds at p < 0.01 and A ≥ 0.64, Fails only if significantly reversed, otherwise Inconclusive), Wald's sequential test for properties, equivalence bands for estimates, and fresh seeds nightly (R2);
  - scripted event timing only as logged inputs on lab and scenario cards, never as a state-driven director in the sim core (R6).
- **Needs:** M0.2's ledger, M0.3's worker loop and day boundary, and M0.4's Skin A.
- **Exit checks:**
  - the contest's median hawk share lands within 0.05 of the paper-computed p\* over 50 seeds, and the ±1 market price converges on the supply-and-demand intersection (R1).
