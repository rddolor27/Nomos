# M1.1 Lab engine and claims: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Two modes, one engine.** Lab mode runs Primer-style scenarios in discrete days with small populations and answers worked out on paper. It doubles as the test oracle for city mode ([R1 full report](../../../../research/round-1-baseline/full-report.md), "Primer contributes a verification habit, not reusable code").
- **A lab day resolves in one step, then plays as animation.** `labDay` settles the day's contests and trades at once. The worker then plays the day's phases as ticks, moving dots along keyed paths between phase keyframes, so speed controls, snapshots and the renderer work exactly as in city mode.
- **Phases follow Primer:** morning stock, daytime contests and trade, evening home, night settlement. Primer's phase lengths are 0.5, 0.25, 4, 0.25 and 0.5 s ([R1](../../../../research/round-1-baseline/findings-and-plan.md), "Presentation patterns"). M1.2's owner decision sets how long a lab day lasts at 1×. Until then the phase lengths are one constant table.
- **Two cards:**
  - **Contest:** two dots meet over a purse, Primer's hawk–dove game.
    - Two traders split it, 1 each.
    - A taker meets a trader: the taker gets 1.5 and the trader 0.5.
    - Two takers fight, 0 each.
    - A lone dot takes the whole purse, 2.
    - Survival and reproduction follow Primer's `hawk_dove.py`: a dot survives if its score beats a uniform draw and reproduces if its score beats 1 plus a uniform draw.
    - Store scores in integer half-units and test them with keyed draws, never floats.
  - **Market:** Primer's ±1 market.
    - Private price limits are drawn from 0–50, with a shared starting expectation of 30.
    - A trade happens when the ask is at or below the buyer's limit.
    - After a trade, the seller's ask rises 1 and the buyer's bid falls 1; a failure moves each 1 toward its limit.
    - Payments run through M0.2's integer-cent ledger, so Σ = 0 holds in the lab too.
- **Claims are judged in Node, in CI, and ship as data.** The player's run uses the card's hand-picked first seed (M1.2). The verdict revealed after the bet is the certified one, computed on pinned seed lists at build time and re-judged nightly on fresh seeds (R2).
- **No director in the sim core (R6).** Lab and scenario cards may time events only as entries in their input log, applied at day boundaries through M0.3's tick-stamped input path. No sim code reads state to decide when an event fires.

## Packages and files

- `packages/sim-lab` (`@nomos/sim-lab`), new:
  - pure TypeScript with no DOM, under the sim-core rules and M0.6's lint profiles;
  - depends on `sim-core` (draws, ledger, apportionment) and `sim-protocol` (snapshot v1, visual word);
  - files: `src/world.ts`, `src/day.ts`, `src/phases.ts`, `src/cards/contest.ts`, `src/cards/market.ts`, `src/snapshot.ts`.
- `packages/claims` (`@nomos/claims`), new:
  - statistics for claims, in plain TypeScript;
  - outside the sim, so floats and `@stdlib` calls are fine here;
  - files: `src/wilcoxon.ts`, `src/vargha-delaney.ts`, `src/sprt.ts`, `src/equivalence.ts`, `src/holm.ts`, `src/judge.ts`.
- `tools/cli`: a `claims` command that runs every card's claims on its pinned seeds and writes `claims.json` into the web build. With `--fresh <date>`, it draws fresh seeds from the date.
- `packages/sim-worker`: lab mode in `init`.
- `.github/workflows/nightly.yml`: the fresh-seed re-judge.
- `tools/claims/vectors.py`: writes SciPy reference values for the Wilcoxon test as a fixture.

## Interfaces and data

- `LabCard`: `{ id, arms: Record<ArmId, Treatment>, claims: Claim[], firstSeed: number, phases: PhaseTable }`. A treatment is plain data, such as `{ takers: 0.3 }` or `{ buyers: 60, sellers: 60 }`.
- `createLab(card: LabCardId, arm: ArmId, seed: number, agents: number): LabWorld`, `labStep(world): void` (one tick), `labDay(world): void` (called by `labStep` at each day boundary) and `labHash(world): number`.
- Lab worlds write snapshot v1 through the same `sim-protocol` helpers as city mode. The visual word's `action` field carries walk and sneak, and its `emote` field carries the faces M1.3 draws.
- **Worker protocol.** `init` gains `mode: 'city' | 'lab'`, plus `card` and `arm` in lab mode. This refines M0.3's message in [interfaces.md](../../m0-pipeline/interfaces.md); update that file in the same commit.
- **Claims:**
  - A `Claim` is `{ id, tag: 'estimate' | 'property' | 'comparison', card, arms, metric, direction?, target?, margin?, seeds }`.
  - `metric` is a pure function of a finished run, such as the final hawk share.
  - A `Verdict` is `{ verdict: 'holds' | 'fails' | 'inconclusive', n, p?, a?, ci? }`.
- **`claims.json`:** card → claim → verdict, its statistics and a hash of the seed list. The web build bundles it; nothing writes it at runtime.

## Method and sources

- **Comparisons:**
  - Run the same seed list in both arms and apply a Wilcoxon signed-rank test to the paired differences.
  - **Holds** when p < 0.01, A ≥ 0.64 and the direction matches.
  - **Fails** only when significantly reversed.
  - Otherwise **Inconclusive**.
  - The two-stage variant keeps 20 seeds for speed: Holds at once if p < 0.001, stops if A < 0.55, and otherwise extends to 50.
  - Apply Holm's correction beyond about 20 claims.
  - Source: [R2 summary](../../../../research/round-2-follow-up/summary.md), "Validation method".
- **Wilcoxon library:** use `@stdlib/stats-wilcoxon`, because `simple-statistics`' `wilcoxonRankSum` returns only the rank sum. Check it once against SciPy (R2).
- **Properties:** Wald's sequential test of a 95% against an 85% pass rate. It accepts after 27 straight passes and rejects after 3 straight failures (R2).
- **Estimates:** a claim passes when its confidence interval lies inside the target ± a stated margin, the equivalence logic of Axtell et al. (R2).
- **Equilibrium on paper:** for payoffs a = H|H, b = H|D, c = D|H and d = D|D, p\* = (b − d) / ((b − d) + (c − a)). Primer's payoffs (0, 1.5, 0.5, 1) give 0.5 ([R1 full report](../../../../research/round-1-baseline/full-report.md), which also sketches the test).
- **Market intersection:** sort buyers' limits descending and sellers' limits ascending. The intersection is the price where the curves cross, computed per seed from the drawn limits.
- **Primer's rules:** take them from his repositories (`hawk_dove.py`, `market_sim.py`), which carry no licence. Reimplement the rules and copy no code ([R1 findings](../../../../research/round-1-baseline/findings-and-plan.md)).

## Tests for the exit checks

- `contest settles near the analytic mix`: `mixedEquilibrium(0, 1.5, 0.5, 1)` is 0.5, and over 50 pinned seeds × 400 days, |median hawk share − p\*| < 0.05 (R1).
- `market price converges on the intersection`: over 50 pinned seeds, the median traded price of the last 20 days lies within ±2 price units of each seed's intersection, in at least 47 of 50 seeds. The ±2 units and 47 of 50 are starting values to confirm in the step plan.
- `matches SciPy`: Wilcoxon p-values agree with the fixture within 1e-9. Vargha–Delaney A matches hand-computed cases, and the sequential test accepts at 27 passes and rejects at 3 failures.
- `replays a lab run`: the same card, arm and seed give the same `labHash` across runs, and in Node and Chromium through M0.6's engine harness.
- `takes events only from the log`: removing a scripted event from a card's input log changes the hash, and replaying the log restores it.
- `ledger balances in the lab`: the market card keeps Σ = 0 every tick.

## Risks and unknowns

- **Small populations drift.** About 122 dots on 61 sites may wander from 0.5, or die out, within 400 days. If the median misses, raise the population for the statistics runs rather than the tolerance. Primer ran 800–11,000 dots without animation (R1).
- **Names must be neutral (R2).** The contest's roles are "takers" and "traders" in card text. Final wording belongs to M1.2's neutral-names rule and the content rules: crime is an act, never a role on a body.
- **The fresh-seed job can flip a verdict.** A flip is a finding: fix the card or relabel the claim Inconclusive; never pin the lucky seeds.
- **Holm's correction** changes thresholds as claims are added. Record the claim count in `claims.json`.

## Open questions

- **Measure:** does the 61-site contest keep its median hawk share within 0.05 of p\* over 50 seeds × 400 days? If not, the statistics runs need more sites than the watched run, and the reveal must say so. Suggested: probe 61 sites and Primer's 1,830-site run ([R1 sources](../../../../research/round-1-baseline/sources.md), `aggression.py`). Needed before: the step plan.
- **Measure:** do ±2 price units in at least 47 of 50 seeds suit the market test? Both are starting values, and they decide when M1.1 closes. Suggested: keep them unless the ±1 steps alone swing wider, and never widen a bound just to pass. Needed before: building.
- **Research:** which interval and which Fails rule do estimate claims use? The [R2 summary](../../../../research/round-2-follow-up/summary.md), "Validation method", says only that the interval must lie inside the target ± a margin. Suggested: a 90% interval of the mean, as in two one-sided tests at 5%, failing when wholly outside the band (inference). Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the contest's `labDay` and its 50-seed median test in Node come first, then the market and its ledger check. `@nomos/claims` against the SciPy fixture and the `claims` command follow, and the worker's lab `init` and Skin A phases come last.
- **Keep it simple:** claims runs call `labDay` alone and skip the animation ticks. A comparison then costs 40,000 day steps (50 seeds × 2 arms × 400 days, computed). M1's cards carry about ten claims (M1.1 and M1.2 briefs), so the two-stage variant and Holm's correction can wait until nearer 20.
- **Pitfalls:** the animation must never feed a day's outcome, or headless and watched runs disagree. With integer limits the price curves often cross over a range, so define the intersection, such as its midpoint, before the test. SciPy and @stdlib pick exact or approximate p-values by sample size, ties and zeros. Their defaults may differ at exactly 50 pairs (inference), so pin both. M0.6's culture wall guards only folders such as `crime/` and `wages/` ([M0.6 plan](../../m0-pipeline/m0.6-gates-and-guards/plan.md), Tasks 5–6), but the lab's takes and prices sit in `src/cards/`. Guard all of `sim-lab`.
- **Hard and easy parts:** small-population drift and the statistics' edge cases need the most care. The payoff table, `mixedEquilibrium`, Wald's thresholds and the ±1 rule are mechanical.
