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
  - Lengnick's paper stays unopened, as in R2, so the start is the replication's. The calibration flags below measure the rest.
- **Exit checks:**
  - over 50 seeds × 20,000 sim days: no NaN, exact money conservation, and household saving that averages zero under fixed money (R1, R2);
    - met by `economy.test.ts` under `ECONOMY_LONG=1`. QA ran it at close: 16 of 16 passed in 455 s, with every seed's saving within ±0.1% of income (measured here);
  - known-answer tests pass: random exchange gives Gini ≈ 0.5, saving half gives ≈ 0.27, and Godley–Lavoie SIM goes 38.44 → 47.9 (R1);
    - met by `known-answers.test.ts` (ab081c9), which every push runs.
- **Calibration flags for M2.3,** measured here in Node 24.18.0 on a Ryzen 5 3600, with another session running. Rates are medians over seeds 42–51 after burn-in. They are findings, not bugs:
  - prices change in 18.9% of firm-months, against R2's 9–12%, by 1.02% on average;
  - job-to-job moves are 2.5% per employed household-month. Hires run 3.7%, layoffs 1.24% and job finding 31.9% a month, against 3.3%, 1.0% and about 26%;
  - firms exit in 0.003% of firm-months, against 0.65%: about 200 times too rarely;
  - 66% of firm-months sit above the 1.15 markup ceiling, which stops only further rises, so a price step or a wage cut can overshoot it;
  - about 17% of firms cut wages a year, above the economy review's 10% warning line;
  - firm sizes skew 0.50, against 1.9;
  - an exiting firm's unsold stock vanishes, with no write-off stat;
  - `economyDay` allocates up to 0.6 KB a sim day;
  - R1's bands hold: the mean price stays at 1.19–1.21× the start, and unemployment averages 2.6%;
  - a run reaches about 7,000 sim days a second with the daily checks on, and 11,000 without.
