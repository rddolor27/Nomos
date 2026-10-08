# M0 Pipeline: sub-milestones

M0 holds 47 build tasks and 13 exit checks in the [implementation plan](../../implementation-plan.md#m0-pipeline), so it runs as six sub-milestones. Each one ends with software that runs and passes its own checks. Every sub-milestone has a step-by-step plan in its `plan.md`, and [interfaces.md](interfaces.md) fixes the names they share.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so after M0.1 the rest of the plan can be rescaled to the measured pace. The plan's own M0 effort line, about 1 week plus 4–6 days, predates rounds 4–9, which added most of these tasks.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M0.1 Workspace and kernels](m0.1-workspace-and-kernels/task.md) | The workspace, CI, the keyed draw, integer noise and the calendar | 2–3 days | 8 Oct 2026, 15:45 | 8 Oct 2026, 16:20 | 35 min, 4 agents |
| [M0.2 State and money](m0.2-state-and-money/task.md) | One preallocated memory for agents, and money that always balances | 3–5 days | | | |
| [M0.3 Loop and protocol](m0.3-loop-and-protocol/task.md) | The sim worker at 10 ticks a second, the day boundary and snapshots | 3–4 days | | | |
| [M0.4 Renderer and Skin A](m0.4-renderer-and-skin-a/task.md) | One WebGL2 renderer drawing 10,000 agents as dots over a map | 4–6 days | | | |
| [M0.5 Web app](m0.5-web-app/task.md) | The page a visitor opens: first frame, HUD, charts, tiers, accessibility | 3–4 days | | | |
| [M0.6 Gates and guards](m0.6-gates-and-guards/task.md) | CI gates that enforce every rule the plan relies on | 3–5 days | | | |
| **Total** | | **18–27 days** | | | |

M0.1 took 35 minutes of Claude Code time with four agents working in parallel, against 2–3 days by hand: about 1/30 to 1/40 of the estimate. One sub-milestone is too few to rescale the rest, so the estimates stay as written until M0.2 gives a second measurement.

Two decisions apply throughout:
- **One keyed draw.** Rounds 4 and 9 replace round 1's seeded sfc32 streams with the stateless `draw(seed, stream, ...keys)` from `tools/worldgen/rng.py`, so every package draws the same way the world generator does.
- **Packages arrive when needed.** Each package of the monorepo is created by the sub-milestone that first uses it, not all at once in M0.1. `sim-protocol`, `sim-worker` and `tools/cli` arrive in M0.3, `render-gl` in M0.4, `apps/web` in M0.5 and `tools/bench` in M0.6 (R1).

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
