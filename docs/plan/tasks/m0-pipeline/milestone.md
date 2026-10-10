# M0 Pipeline: sub-milestones

M0 holds 52 build tasks and 16 exit checks in the [implementation plan](../../implementation-plan.md#m0-pipeline), so it runs as six sub-milestones. The owner's structure decisions of 9 October 2026 add a seventh, M0.7, and the owner's UI request of 10 October 2026 an eighth, M0.8. Each one ends with software that runs and passes its own checks. M0.1–M0.7 have step-by-step plans in their `plan.md`, M0.8 has a brief, and [interfaces.md](interfaces.md) fixes the names they share.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so after M0.1 the rest of the plan can be rescaled to the measured pace. The plan's own M0 effort line, about 1 week plus 4–6 days, predates rounds 4–9, which added most of these tasks; the owner's Structure tab of 9 October 2026 adds 5–8 days for M0.7.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M0.1 Workspace and kernels](m0.1-workspace-and-kernels/task.md) | The workspace, CI, the keyed draw, integer noise and the calendar | 2–3 days | 8 Oct 2026, 15:45 | 8 Oct 2026, 16:20 | 35 min, 4 agents |
| [M0.2 State and money](m0.2-state-and-money/task.md) | One preallocated memory for agents, and money that always balances | 3–5 days | 8 Oct 2026, 16:33 | 8 Oct 2026, 17:16 | 43 min, 4 agents |
| [M0.3 Loop and protocol](m0.3-loop-and-protocol/task.md) | The sim worker at 10 ticks a second, the day boundary and snapshots | 3–4 days | 8 Oct 2026, 17:09 | 8 Oct 2026, 18:22 | 73 min, 4 agents |
| [M0.4 Renderer and Skin A](m0.4-renderer-and-skin-a/task.md) | One WebGL2 renderer drawing 10,000 agents as dots over a map | 4–6 days | 8 Oct 2026, 18:20 | 8 Oct 2026, 23:19 | 195 min of work, 4–6 agents (plus a 1 h 44 min pause when usage ran out) |
| [M0.5 Web app](m0.5-web-app/task.md) | The page a visitor opens: first frame, HUD, charts, tiers, accessibility | 3–4 days | 8 Oct 2026, 22:47 | | About 230 min so far, 1–3 agents, beside M0.6 (a 24 min usage pause excluded); it closes with the owner's device timings |
| [M0.6 Gates and guards](m0.6-gates-and-guards/task.md) | CI gates that enforce every rule the plan relies on | 3–5 days | 8 Oct 2026, 22:51 | 9 Oct 2026, 06:59 | About 190 min of work, 2–4 agents, beside M0.5 (a 24 min usage pause excluded) |
| [M0.7 Modules and blob facts](m0.7-modules-and-blob-facts/task.md) | Module folders in every package, the `Blob` handle, and a name and a wallet for every blob, shown on click; walking in any direction, built first on 9 October 2026, falls outside this estimate | 5–8 days | 9 Oct 2026, 09:06 (step plan committed) | 9 Oct 2026, 13:19 | About 235 min of work, 1–5 agents, beside the map's first tasks (a usage pause of about 20 min excluded) |
| [M0.8 UI look](m0.8-ui-look/task.md) | The owner's look for the app: one design system, clearer buttons and toolbars, one set of zoom controls, and charts a user can read (owner, 10 October 2026) | 3–5 days | 10 Oct 2026, 01:26 (brief committed) | | About 35 min so far, 1 agent, beside the wall art; it closes with lil-gui behind `?dev=1`, the town's Fit, Home and pinch, and `toolbar.ts` in Layout |
| **Total** | | **26–40 days** | | | |

M0.1 took 35 minutes, M0.2 43, M0.3 73, M0.4 195, M0.6 about 190 and M0.7 about 235 of Claude Code time, each with one to six agents working in parallel: 20–31 estimated days in about 771 minutes, or 25–39 minutes per estimated day. M0.4's browser testing in three engines made it slower than the sim sub-milestones, and M0.6 and M0.7 each also took a whole-change review and its fixes. The estimates stay in days by hand, so they keep their relative sizes. At this pace everything before launch (341–535 days) takes about 142–348 hours (computed). From M1 the plans are briefs, not step plans, so expect a slower pace there (inference).

Three decisions apply throughout:
- **One keyed draw.** Rounds 4 and 9 replace round 1's seeded sfc32 streams with the stateless `draw(seed, stream, ...keys)` from `tools/worldgen/rng.py`, so every package draws the same way the world generator does.
- **Packages arrive when needed.** Each package of the monorepo is created by the sub-milestone that first uses it, not all at once in M0.1. `sim-protocol`, `sim-worker` and `tools/cli` arrive in M0.3, `render-gl` in M0.4, `apps/web` in M0.5 and `tools/bench` in M0.6 (R1).
- **Modules and handles.** From M0.7, every package keeps its source in concern folders under `src/`, and code reads and writes a blob's row through the `Blob` handle, never an object per blob (owner, 9 October 2026). `interfaces.md` holds the layout.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
