---
checkpoint: 22
date: 2026-10-09
milestone: M8.1 and M8.3
status: paused
based_on: c0a591b
next: The queue below, from its first task without a commit; checkpoint 0020's rules for running and committing tasks still hold
waiting_on: []
---

# Checkpoint 0022: the map crowd and five agents

On 9 October 2026 the owner resumed the map work and settled checkpoint 0021's open question: they want to see each country's people on the map. Before any code, they answered four questions and named the staffing. This checkpoint records both, with the queue merged from checkpoint 0020's and the crowd's four new tasks.

## State

- **M8.1:**
  - Tasks 7–25 are committed.
  - Task 26, Sea lanes, was running at this checkpoint. Its files were uncommitted: `packages/worldgen/src/routes/lanes.ts` and `test/engines/stages.ts`.
- **M8.3:**
  - Tasks 1–9 and Task 14's colour check are committed.
  - Tasks 16–19, the map crowd, are planned (c0a591b), and the crowd's type is committed (9f4f9e1).
- **Unpushed:** everything after e8c3bfb.

## Done since checkpoint 0021

- **9f4f9e1:** `MapCrowd`, `CROWD_HUES`, `CROWD_STOPS`, `CROWD_Q` and `crowdBuffers` in `@nomos/sim-protocol/world-map`.
- **c0a591b:** the crowd in the plans:
  - M8.3's `plan.md` gains Tasks 16–19, the owner's crowd decisions and a crowd row among its exit checks;
  - `task.md` gains the crowd and its exit check;
  - `interfaces.md` gains The map crowd and `MapRenderer.setCrowd`.

## Decisions

- **The map crowd, owner, 9 October 2026.** From four questions, the owner chose the recommended answer each time:
  1. **A look-only crowd:** a dot per 100 people, about 10,000 on a large world (computed from `settle`'s population rule: 5,000–16,000). It comes from the seed, with no names, money or sim, so the town's hash never moves. The rejected choices were clickable named dots and live sim agents.
  2. **Dots appear on zoom:** none in the Country view; from the Region view in, growing with zoom.
  3. **Random body hues.** The five country colours still never go on a person.
  4. **Wandering near home,** on their own country's land.

  The page still opens on the town, with the map a click away.
- **Staffing, owner, 9 October 2026:** five agents at once, two seniors, two juniors and one sim engineer, with Claude orchestrating.
- **Agent rulings, which the owner can overturn:**
  - **The CROWD stream.** The crowd draws on the existing CROWD stream (12) with the world seed, from first key 0x100, clear of `place.py`'s 1–6. So `rng.py`, `kernels.json` and `goldens-v1.json` stay as they are.
  - **Outside the world.** The crowd is no part of `WorldMap`, so the world's fingerprint and the v1 freeze don't cover it.
  - **Made in the worker.** The map worker makes the crowd beside the world. The page only moves dots between stops, so the map view needs no draws of its own.
  - **Stops near home.** A dot's later stops stay in the 3 × 3 block around its home, so a leg rarely crosses water; it may clip a water cell's corner.
  - **Task 27 beside Task 26.** The survey and wonders run under a second junior, beside Task 26. The stage mirror takes one editor at a time, so that junior adds its mirror block only after Task 26's commit.

## The queue

- **Who:**
  - the sim engineer is `sim-engineer` on Sonnet;
  - juniors run on Sonnet;
  - seniors run on Opus, `render-engineer` in `render-gl` and `senior-game-engineer` in `apps/web`.
- **Commits:** seniors commit their own work by path; juniors stop, and the orchestrator checks each diff and commits it. No agent pushes.

| # | Task | Who | After | At this checkpoint |
| --- | --- | --- | --- | --- |
| M8.1 26 | Sea lanes | Sim engineer | 25 | Running |
| M8.1 27 | The survey and wonders | Junior | 25; its mirror block after 26's commit | Running, source first |
| M8.3 16 | The crowd's homes and stops | Junior | — | Running |
| M8.3 17 | The crowd pass | Senior, render | 9 | Running |
| M8.3 18, motion | `crowd-motion.ts` and its test | Senior, web | — | Running |
| M8.3 10, draft | The Map control and the lazy map view | Senior, web | — | Running; finishes after M8.1 30 |
| M8.1 28 | Landmarks | Sim engineer | 27 | |
| M8.1 29 | `generateWorld`, the `WorldMap` and the world fingerprint | Sim engineer | 26, 28 | |
| M8.1 30 | Stand-in names and the map worker | Sim engineer | 29 | |
| M8.3 10 | The Map control and the lazy map view, built and checked | Senior, web | M8.1 30 | |
| M8.3 18 | The crowd in the map view | Senior, web | 10, 16, 17 | |
| M8.3 19 | The crowd on real worlds, and the owner's screenshots | Junior | 16, M8.1 29; screenshots 18 | |
| M8.3 11 | Size limits and the first-load check | Junior | 10 | |
| M8.3 12 | The exit tests | Junior | 10, M8.1 29 | |
| M8.1 32 | The exit sweeps and the identity test | Junior | M8.1 29 | |
| M8.3 13 | The 2 ms bar | Senior | 10, 18; the owner accepts | |
| M8.3 14 | The Countries golden frame | Senior | 10, M8.1 29 | |
| M8.1 31 | The generation budget | Senior | 29; the owner's phone timings | |
| M8.1 33–35 | The place-name table, the 100 names and the freeze, and the close | Senior and owner | 30 | |
| M8.3 15 | Close M8.3 | Senior | 11–14, 16–19 | |

The owner can see the map with its crowd in a local build once M8.3 Task 18 lands, and Task 19's screenshots show it.

## Open

1. **The owner:**
   - whether the crowd goes into the shared plan doc, which needs asking first;
   - the map's phone timings, at M8.1 Task 31;
   - 100 sample place names, at Task 34;
   - accepting the 2 ms bar, at M8.3 Task 13;
   - reviewing the snow tiles;
   - whether to sync the five colours into the shared doc;
   - the device timings for M0.5.
2. **Carried from 0019:** M0.7's deferrals, the wallet roll-up before M2.1, and the licence items.

## Next

Continue the queue above. If the session that wrote this checkpoint has ended:
1. Run `git log --oneline c0a591b..HEAD` to see which tasks landed.
2. Run `git status` to find uncommitted agent work. Look in `routes/lanes.ts`, `stages.ts`, `world/`, `features/` and `crowd/` in `packages/worldgen`, in `src/map/` in `packages/render-gl`, and in `src/map/` in `apps/web`.
3. Check each piece against its task's done-checks, then commit it or run its task again.

## How to verify

At c0a591b:
- `node packages/worldgen/scripts/engines.ts` prints `3800 stage checks ok`; the count rises as ports land.
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0.
