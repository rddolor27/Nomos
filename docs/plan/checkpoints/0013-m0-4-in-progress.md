---
checkpoint: 13
date: 2026-10-08
milestone: M0.4
status: paused
based_on: 682f055
next: M0.4 Renderer and Skin A, wave 1 (docs/plan/tasks/m0-pipeline/m0.4-renderer-and-skin-a/plan.md)
waiting_on: []
---

# Checkpoint 0013: M0.4 in progress

## State

M0.4 Renderer and Skin A is partway through wave 1. A usage limit stopped three agents at 19:00. They resumed at 20:42 with their work intact in the working tree, uncommitted. Everything committed passes the gate.

## Done since checkpoint 0012

**Committed:**
- **Wave 0:**
  - 2c8d3cd: the render-gl manifest and tsconfig, the root `test:browser` script, `.npmrc`, `.gitignore` and the lockfile;
  - cbf8c6d: the pins in `tools/requirements.txt`.
- **Task 4:**
  - 9cda5a7: the ground in sim-core. Agents spawn at open cells' centres and turn back from blocked ones. Seed 42 hashes to `d9bc671b` at tick 1,000, re-pinned;
  - 682f055: the loop posts a tick-0 snapshot right after `ready`.

**In the working tree, uncommitted:**
- **The render engineer, task 3:** render-gl's `src/`, `harness/` and `test/`, the root `playwright.config.ts`, and render-gl's `typecheck` script.
- **Junior A, tasks 1 and 2 in Python:**
  - `tools/worldgen/mapfile.py`, `export_map.py` and `place.py`, and `tools/licenses.py`;
  - `packages/sim-protocol/test/fixtures/tiny.nmap`, `assets/maps/town.nmap` and `assets/LICENSES.md`.
- **Junior B, tasks 1, 2 and 5 in TypeScript:**
  - sim-protocol's `src/map.ts` and `src/jobs.ts`, and their exports in `src/index.ts`;
  - the tests `map`, `town-map` and `jobs`.

## Decisions

These are the agents' rulings. The owner can overturn any of them.
- **Wave 0 is the orchestrator's,** so no two builders share the lockfile. `ci.yml` waits for the last wave, which adds the Python checks, `test_skin_a.py` and the browser job together.
- **Task 4 belongs to M0.3's senior,** since it changes the world step. `layoutWorld` throws `RangeError` when `walk.length` isn't width × height, or when no cell is open.
- **The ground is an unhashed input.** A restore must pass the same ground, and a map hash joins M6's deferred save check.

## Open

- **Owner decision, before M0.6:** the 100k snapshot budget, either 0.6 ms or a visual-word column (checkpoint 0012).
- **Owner question:** may main be pushed once after task 3, to find out early whether GitHub's runners can run WebGL2 in headless Firefox and WebKit?
- Everything open in checkpoint 0012 stays open.

## Next

1. Review and commit wave 1's three pieces as each report arrives.
2. **Wave 2:**
   - M0.3's senior binds `worker.ts` to `parseMap`, and adds `harness/worker.*` and `worker-map.spec.ts`;
   - the render engineer builds task 5's GL;
   - Junior B builds `dots.ts` and the palette test;
   - Junior A builds `test_skin_a.py` and the camera.
3. Waves 3 and 4, then the CI jobs, a final review, the pace, the doc ticks, checkpoint 0014 and a push.

## How to verify

- `git status`: the uncommitted files listed above.
- `pnpm test && pnpm lint && pnpm typecheck`: everything committed passes. Work in flight may not yet.
