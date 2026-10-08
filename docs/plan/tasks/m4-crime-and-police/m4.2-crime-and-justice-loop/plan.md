# M4.2 Crime and justice loop: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Crime is an action anyone may choose.** The offend action joins M3.2's utility scoring as one more scored action. No agent is ever a criminal type (R1, R6). Its threshold follows M4.1's guarded-decision shape.
- **The hotspot field** follows Short et al. (2008), on a cell grid over the town:
  - B(t+δt) = (B + (η/4)·(ΣB_neighbours − 4B))·(1 − ω·δt) + θ·E, where E is the cell's crime events;
  - the decay term is always (1 − ω·δt), with one time step for every rate, never ω = 1/15 per hourly update (R2);
  - θ is rescaled to the tick length, and a police suppression term lowers attractiveness where patrols are present;
  - everything is integer: B in Q16, with rates from build-time tables.
- **The justice loop (R1):**
  - respond, pursue, and hot-spot and random patrol;
  - lingering deterrence, jail, stigma and recidivism;
  - true and recorded crime kept apart: every offence is true, and only reported or observed ones become records;
  - guardrails against cascades, such as caps on arrests per patrol per day and a cooldown on hotspot spikes.
- **Police staffing:** about 0.25% of the population by default (0.2–0.5%), or police dots labelled as patrol units, each standing for several officers. That is the owner decision below. Exaggerated shares appear only on labelled lab cards (R2).
- **Soldiers never police towns (Military).** Town stops and arrests come only from police. No code path sends soldiers into a town to keep order. Soldiers keep M3.2's job and patrol roads only.
- **The witness pass** comes from M3.2's optional global pass, built here if M3 skipped it. Witnesses see acts in their cell and line of sight, never people's culture or looks.

## Packages and files

- `packages/sim-core`, all guarded:
  - `src/crime/offend.ts`, `src/crime/hotspot.ts` and `src/crime/records.ts`;
  - `src/crime/jail.ts` and `src/crime/recidivism.ts`, kept in `crime/` so the guarded folder list stays as M0.6 sets it;
  - `src/police/patrol.ts`, `src/police/respond.ts`, `src/police/stop.ts` and `src/police/arrest.ts`.
- `packages/sim-core/scripts/hotspot-tables.ts`: decay and θ tables for the tick length.
- The record store from M3.8 gains justice records: report, stop, arrest, wrongful stop, release and verdict.

## Interfaces and data

- **Hotspot field:** `Int32Array` of Q16 attractiveness per cell, plus `Int32Array` event counts per cell per day.
- **True and recorded:**
  - every offence writes a true-event record, kept in the true log for the true view;
  - only a report or an observation writes a recorded event;
  - recorded ≤ true is asserted every tick in development.
- **Police roster:** agents with the police job, an assignment (patrol, respond or station), and a beat.
- **Soldier guard:** the stop and arrest functions accept only police agents. A unit test and an assertion check the job.

## Method and sources

- **Short et al. 2008, with its corrected decay, Γ, θ, η and ω, and its open values:** [R2 crime notes](../../../../research/round-2-follow-up/notes/crime-policing-calibration.md), Q7.
- **Police elasticities and staffing share:** the same notes, Q1, and the [R2 summary](../../../../research/round-2-follow-up/summary.md).
- **The loop's parts (offend, respond, pursue, deterrence, jail, stigma and recidivism):** [R1 full report](../../../../research/round-1-baseline/full-report.md), "Compose published sub-models into one city loop".
- **Soldiers defend roads only:** [military.md](../../../military.md).

## Tests for the exit checks

- `hotspot steady state`: with constant events and no neighbour term, mean attractiveness converges to θΓ/ω within 1%. With the neighbour term on, the mean is unchanged.
- `soldiers never police towns`:
  - over 20 seeds × 28 days, every stop and arrest record's officer has the police job;
  - no soldier is ever assigned inside a town's bounds;
  - a planted call that passes a soldier to `stop` throws in development.
- `recorded never exceeds true`: on every cell and day, over 20 seeds.
- `decay uses one time step`: a unit test runs the field at two tick lengths over the same simulated time, and both reach the same state within rounding.

## Risks and unknowns

- **Owner decision first:** police near 0.25% of the population, or police dots labelled as patrol units. Round 2 allows either.
- **Verify first:**
  - Short et al.'s A0, time step and grid spacing, which set the hotspot constants here;
  - NCVS 2024 reporting and FBI 2025 clearance by crime type, which set M4.3's capture and reporting constants.

  A0 = 1/30 and ω = 1/15 are not confirmed (R2).
- **Cascades:** feedback between records and patrols can run away. The guardrails need tests, and M4.3 adds separate switches for reporting bias and patrol feedback.

## Open questions

- **Owner:** Police as officers near 0.25% of the population, or as labelled patrol units that each stand for several? Units would need their own pay, homes and officer counts in M4.3's sweeps. Suggested: officers, one agent per person, about 25 at 10k agents. Needed before: the step plan.
- **Measure:** What arrest cap per patrol per day, and what hotspot cooldown, stop runaway feedback without binding in normal runs? Both guardrails are unsourced, and a cap that binds often would distort M4.3's calibration. Suggested: set each to bind on under 1% of patrol-days or cell-days in default runs (unsourced estimate), and log every activation. Needed before: building.
- **Research:** What A0, time step and grid spacing does Short et al. (2008) use? A0 = 1/30 is unconfirmed, and ω = 1/15 rests on snippets of later papers (R2 crime notes, Q7). Suggested: open the paper and record each value with its evidence label. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** offend and the true log first, then the hotspot field, then patrols, stops and arrests, then jail, stigma and recidivism. Recorded ≤ true can be asserted from the first record.
- **Reuse:** M3.2's utility scoring, per-cell aggregates and witness pass if M3 built it, M3.8's record store, and M4.1's registry for every new threshold.
- **Keep it simple:** update the field once a day at the day boundary, so δt is one day and only the day boundary writes it. Per tick at ω = 1/15 a day, decay is under one Q16 unit wherever B < 0.33, so rounding stalls or over-decays it (computed).
- **Pitfalls:** η is a per-step mixing fraction that does not scale with δt (R2 crime notes, Q7), so fix the cadence before tuning. Set `trueOnly` on act cues from the first offence, and never put an offender flag in the snapshot.
- **Hard and easy parts:** feedback between records, patrols and the field needs the most care. The soldier guard and the hotspot tables are mechanical.
