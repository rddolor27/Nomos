# M2.1 Lengnick core

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - Lengnick households and firms: posted prices, labour search, Stone–Geary budgets, closed and fiat money, BAM entry and exit, and a wholesale call auction (R1);
  - Lengnick's missing parameters, ξ = 0.01 and a separate ψ\_quant = 0.25, written integer-cent rounding rules, and start prices inside 1.025–1.15 × w/63 (R2);
  - a burn-in measured with MSER-5 rather than an assumed 1,000 months (R2);
  - household cash holdings chosen deliberately, a money-velocity chart, and a saving-rate target only when money is issued (R2).
- **Needs:** M0.2's ledger and `mulPpm`, and M0.3's day boundary; it runs headless in Node.
- **Owner decision first:** what a month is on the 112-day year. Lengnick's firms decide monthly, and round 2's targets count months. A 21-day month, as in the paper, gives 5⅓ months a year; a 28-day season gives 4 (computed).
- **Verify first:** Lengnick's own figures and starting values, the size of price changes, a direct job-to-job rate and headless runs per second. They decide the presets and the sensitivity budget.
- **Exit checks:**
  - over 50 seeds × 20k ticks, read as 20,000 sim days: no NaN, exact money conservation, and household saving that averages zero under fixed money (R1, R2);
  - known-answer tests pass: random exchange gives Gini ≈ 0.5, saving half gives ≈ 0.27, and Godley–Lavoie SIM goes 38.44 → 47.9 (R1).
