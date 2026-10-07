# M5.1 Policies, budget and branches: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The treasury** is M0.2's reserved national treasury account, plus local-government accounts per settlement. Taxes, welfare, police pay and soldier pay are ledger transfers, so Σ = 0 still holds. Soldier pay moves off M3.2's stopgap onto taxes.
- **Policies are plain data set before Run:**
  - income tax, welfare, minimum wage and the police budget (R1);
  - the defence budget: soldier posts and pay from taxes, with its predicted effect on raids and taxes (Military).
- **Each policy carries a predicted size, not just a direction (R2):**
  - a moderate minimum wage moves employment about ±1%;
  - welfare cuts labour-force participation by 2–4 points;
  - taxes and transfers take the income Gini from about 0.49 to 0.45;
  - the default wealth tax of about 3% a year is flagged as aggressive.

  Every prediction is an M1.1 estimate claim, judged on paired seeds.
- **Role transitions (R1):** dots move between roles as states (household member, worker, firm owner, police, soldier, jailed), never as identities. Floors on the numbers of police, merchants and producers keep the economy from dying out.
- **Branches, not live changes (Calendar):**
  - Changing a policy during a run forks a labelled what-if branch at the next day boundary, after that day's commit.
  - The original keeps running.
  - Both replay from (seed, settings, fork day, change).
  - The fork is logged like a player command.
  - This builds on M1.2's watch-only protocol: a fork returns the new branch to `setup` with the changed settings.

## Packages and files

- `packages/sim-core`:
  - `src/policy/settings.ts`: the policy record and its validation;
  - `src/policy/treasury.ts`: taxes, welfare and budgets as transfers;
  - `src/policy/roles.ts`: transitions and floors;
  - `src/policy/defence.ts`: soldier posts and pay.
- `packages/sim-worker`: `fork`, which snapshots at the next day boundary and starts a branch worker or a second world in the same worker, decided in the step plan by memory.
- `packages/sim-protocol`:
  - `{ type: 'fork', change }` from the app;
  - `{ type: 'branch', id, forkDay }` from the worker.

  Update [interfaces.md](../../m0-pipeline/interfaces.md) in the same commit.
- `apps/web`: the policy panel (setup only), and the branch switcher.

## Interfaces and data

- **`PolicySettings`:** `{ incomeTaxPpm, welfareCents, minWageCents, policeBudgetPpm, defencePosts, soldierPayCents, … }`. The step plan fixes the full list, and M5.3 extends it with the wealth and resource policies.
- **Branch identity:** `(seed, settingsHash, forkDay, changeHash)`, shown as a label in the HUD.
- **Prediction table:** policy → metric → predicted size and band → source, read by the claims judge and shown in the policy panel.

## Method and sources

- **Treasury, taxes, welfare, role transitions and floors:** [R1 full report](../../../../research/round-1-baseline/full-report.md), "Compose published sub-models into one city loop".
- **Policy sizes:** [R2 economy calibration notes](../../../../research/round-2-follow-up/notes/economy-calibration.md), Key Question 7: minimum wage, wealth tax and transfers.
- **Branches and the fork rule:** [calendar.md](../../../calendar.md), "Watching".
- **Defence budget:** [military.md](../../../military.md).

## Tests for the exit checks

- `no role goes extinct`: over 50 seeds × 20 years under default policies, and under each policy at its extremes, every role keeps at least its floor.
- `policies move metrics as predicted`: each prediction holds as an estimate claim on paired seeds, or is labelled Inconclusive with a reason. M5.3 adds the wealth and resource policies.
- `branch replays identically`: fork seed 42 at day 50 with one change. Replaying from (seed, settings, fork day, change) gives the branch's state hash at day 100, and the original's hash is unchanged by the fork.
- `treasury balances`: Σ = 0 holds every tick with taxes, welfare and both budgets on.

## Risks and unknowns

- **Two worlds at once** double memory. At 100k agents that may not fit, so the desktop tier may need to run a branch alone, or replay to the fork day on switch. Decide by measurement.
- **The wealth tax default** of 3% is above Denmark's historical 2.2%. Keep the aggressive flag in the panel (R2, R6).
- **Role floors** are a guardrail that can hide a broken economy. Log every floor activation.
