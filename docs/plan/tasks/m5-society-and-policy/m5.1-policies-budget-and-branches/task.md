# M5.1 Policies, budget and branches

Part of [M5 Society and policy](../milestone.md).

- **Builds:**
  - the treasury, taxes, welfare and the police budget, the policy settings and role transitions (R1);
  - a size for each policy, not just a direction: a moderate minimum wage moves employment about ±1%, welfare cuts labour-force participation by 2–4 points, and taxes and transfers take the income Gini from about 0.49 to 0.45; the default wealth tax of about 3% a year is flagged as aggressive (R2);
  - policies set before Run: moving one during a run forks a labelled what-if branch at the next day boundary, the original keeps running, and both replay from (seed, settings, fork day, change) (Calendar);
  - the defence budget as a policy set before Run: soldier posts and pay from taxes, with its predicted effect on raids and taxes (Military).
- **Needs:** M2's households, firms and incomes to tax; M4.2's police; M0.3's day-boundary phase for forks; M3.2's soldier job.
- **Exit checks:**
  - no role goes extinct across seeds (R1).
