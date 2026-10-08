# M7.7 Spin-up and patrols: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Spin-up (Calendar).** A new country runs 50–100 years of ledger history, 5,600–11,200 days, before day 0, so it starts with settled distributions.
  - This takes about 8–17 s at 1,000 settlements and 67–134 s at 10,000, from the 1.5 ms and 12 ms day budgets (computed).
  - The worker reports progress, and the player can watch the map form.
  - Skip-ahead in 112-day years reuses the same fast path with nothing drawn.
- **Route ledgers.** No plan task built them, so they land here, adding about a day. Each route edge of M7.1's graph carries:
  - traffic;
  - bandit pressure;
  - patrol intensity;
  - true and recorded incidents.

  M8 draws them.
- **Garrisons and patrols (Military):**
  - garrison posts sit on settlement ledgers, from M5.1's defence budget;
  - each route's patrol intensity comes from nearby garrisons and the budget;
  - raids fall as patrols rise;
  - true and recorded raids stay apart, and records follow reports and sightings.

  Soldiers defend roads and patrol them; they never police towns.

## Packages and files

- `packages/sim-country`:
  - `src/spin-up.ts`: the fast path, with progress messages through the worker;
  - `src/routes/ledger.ts`: route edge columns;
  - `src/routes/patrols.ts`: garrison reach and the budget;
  - `src/crime/raids.ts`, in M0.6's guarded `crime/` folder: true raids, then sightings and reports, then records.
- `packages/sim-protocol`: `{ type: 'progress', phase: 'spin-up', day, of }`. Update [interfaces.md](../../m0-pipeline/interfaces.md).

## Interfaces and data

- **Route ledger per edge:** `traffic`, `banditPressure` (Q16), `patrol` (Q16), and `trueRaids` and `recordedRaids` (`Int32`) over a window.
- **Garrison:** `posts` (`Int16`) per settlement, set from the defence budget at the day boundary.
- **Spin-up input:** the world definition from M6.3. Spin-up is deterministic, so a world's day-0 state is a pure function of it.

## Method and sources

- **Spin-up length and timing:** [calendar.md](../../../calendar.md), "Rescaling rules".
- **Garrisons, patrols, raids and records:** [military.md](../../../military.md).
- **Route graph:** M7.1 and M7.3; country budgets from the Performance budget in the [implementation plan](../../../implementation-plan.md#performance-budget).

## Tests for the exit checks

- `more patrols cut true raids`: a comparison claim on 50 paired seeds. Raising the defence budget lowers true raids, and the claim Holds.
- `records follow sightings`: recorded raids rise and fall with sightings, while true raids are held fixed by a scenario input.
- `spin-up is deterministic`: the same world definition gives the same day-0 state hash in Node and Chromium.
- `spin-up within its time`: at 1,000 settlements, spin-up takes ≤ 17 s RM.

## Risks and unknowns

- **Owner decision first:** with no neighbouring country, what counts as a border for garrison towns. Options are the map edge, mountain passes or region lines.
- **Spin-up time at 10,000 settlements** is 67–134 s. Consider a precomputed day-0 state for preset worlds, and show the map forming meanwhile.
- **Bandit pressure has no source in the research.** Its model is a design choice, so label its parameters as such.

## Open questions

- **Owner:** With no neighbouring country, what counts as a border for garrison towns? Garrison posts here and M8.3's forts both wait on it. Suggested: region lines, since M8.1 already grows regions and passes would need a new detector. Needed before: the step plan.
- **Owner:** Do patrols stop travellers? Stops add stop counts to the route ledger, and wrongful stops must then be drawn as heavily as arrests (Military). Suggested: no stops; patrols only deter and sight raids. Needed before: the step plan.
- **Owner:** Ship precomputed day-0 states for preset worlds? They add download bytes and must be rebuilt whenever the sim changes. Suggested: no, unless spin-up on M8's worlds proves slow; R9's 40–237 listed places plus a few dozen regions would take about 0.3–5 s at the 1.5 ms budget rate (computed). Needed before: launch.
- **Measure:** How many years until the ledger's distributions stop drifting? That sets spin-up length and load time. Suggested: 50 years, unless Zipf's ζ, wealth shares or culture shares still drift in the last decade. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** route columns on M7.1's CSR edges, then raids with patrols fixed by a scenario input, sightings and records, garrisons, and spin-up last.
- **Reuse:** R4's robbery hazard per km, from bandit pressure, patrol, traffic, night share and cargo value, with Poisson incidents (R4 world-map notes, Q5). M4's reporting thinning and M5.1's defence budget also apply.
- **Keep it simple:** spin-up is the normal day step in a loop that skips snapshots, with no separate fast model.
- **Pitfalls:** key raid draws by (route, day, event), so patrols on one road never shift another road's raids (Military). Post progress between chunks of days, and check the hash is the same chunked or not. The `progress` message updates `interfaces.md` in the step plan's commit.
- **Hard and easy parts:** giving the paired-seed test enough raids to Hold needs care; the posts column and the progress message are mechanical.
