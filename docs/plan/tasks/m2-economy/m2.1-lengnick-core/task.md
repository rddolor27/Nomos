# M2.1 Lengnick core

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - Lengnick households and firms: posted prices, labour search, Stone–Geary budgets, closed and fiat money, BAM entry and exit, and a wholesale call auction (R1). Stone–Geary budgets are built in M2.4, where there are goods to split, per the coordinator's ruling of 10 October 2026, since M2.1 has one good;
  - Lengnick's missing parameters, ξ = 0.01 and a separate ψ\_quant = 0.25, written integer-cent rounding rules, and start prices inside 1.025–1.15 × w/63 (R2);
  - a burn-in measured with MSER-5 rather than an assumed 1,000 months (R2);
  - household cash holdings chosen deliberately, a money-velocity chart, and a saving-rate target only when money is issued (R2).
- **Needs:** M0.2's ledger and `mulPpm`, and M0.3's day boundary; it runs headless in Node.
- **Owner decision (10 October 2026):** a month is 21 days, three 7-day weeks, as in the paper. A year then holds 5⅓ months, and Lengnick's known-answer tests and round 2's monthly targets work unchanged. Months stay inside the sim; the player sees weeks and seasons.
- **Verify first:** Lengnick's own figures and starting values, the size of price changes, a direct job-to-job rate and headless runs per second. They decide the presets and the sensitivity budget.
- **Exit checks:**
  - over 50 seeds × 20,000 sim days: no NaN, exact money conservation, and household saving that averages zero under fixed money (R1, R2);
  - known-answer tests pass: random exchange gives Gini ≈ 0.5, saving half gives ≈ 0.27, and Godley–Lavoie SIM goes 38.44 → 47.9 (R1).
