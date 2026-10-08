---
checkpoint: 16
date: 2026-10-08
milestone: M0.6
status: blocked
based_on: e40e703
next: Restore the startup gate's headroom, then close M0.6 (docs/plan/tasks/m0-pipeline/m0.6-gates-and-guards/plan.md Task 14), then expand M0.7's brief (docs/plan/tasks/m0-pipeline/m0.7-modules-and-blob-facts/plan.md)
waiting_on: [perf's load gate (first frame 1,512 ms against 1,500), owner: device timings on an Android phone and an iPhone]
---

# Checkpoint 0016: the owner's 9 October direction, and M0.6 closing

This checkpoint replaces 0015. It carries every decision and open item still in force.

## State

- **Pushed:** `main` is at e40e703 on `origin`. The push of 46 commits, 4b636d3..e40e703, carried only the no-reply address.
- **CI on e40e703:**
  - CI's `check`, `browser` and `bun` jobs passed, so the new replay goldens hold under Bun too. perf's `compute` passed.
  - perf's `load` failed. Its first frame was a median of 1,512 ms against the 1,500 ms budget, at a calibrated CPU rate of 8.5; reproduced locally (Chromium 156). Earlier on 9 October the same gate read 1,530 and 1,485 ms, so it rides the line.
  - A senior game engineer is finding headroom. No limit is raised.
  - `stdlib` didn't run; it runs only when its probe files change.
- **Built on 9 October:** M0.5's six review fixes, M0.6's review fixes, and blobs walking in any direction, an owner request.
- **Planned on 9 October:** M0.7 Modules and blob facts, and the map first. M8.1 and M8.3, with 3–5 countries a world, now come right after M0 and before M1.
- **Still open:**
  - M0.5 waits on the owner's device timings.
  - M0.6 waits on the startup gate.
  - M0, now seven sub-milestones, closes after M0.7.

## Done since checkpoint 0015

**Walking in any direction:**
- the contract: f2d0758, cc5535d, f626a93;
- keyed spawn points inside tiles: 9d5e51d;
- 256 headings with gentle turns: 013771a;
- three in four blobs walking from tick 0: 9d28bea;
- tests and comments: 1a05b91;
- `walk.ts` linted as per-tick code: ad960ca;
- render-gl's diagonal-step test: e904041.

**M0.5's review fixes:**
- a worker that fails before the app listens is now reported: b6887bb;
- the `dvh` fallback: 0b76cab;
- the corrupt-map and throwing-storage tests: 494f555, 30e77ed;
- `userPaused` and `bindCameraInput`'s return value dropped: 3e6c769, 7ec2e13;
- the debug spec deleted.

**M0.6's review fixes:**
- the hot lint catches strings, rest parameters, non-declared functions and look-alike cold names: fd884b3;
- the allocation gate also fails above 16,384 B allocated in the young generation a day: e244410;
- comments: c88bf4b;
- docs: 8ea66ce, b7859d4;
- the four missing `interfaces.md` entries: e40e703.

**Plans and the shared doc:**
- **M0.7:** 5b647b1.
- **Map first:**
  - the roadmap tool: 3cea971;
  - M8: f762fe4;
  - M3, M7 and M9: b024445;
  - names reconciled: 2aee836;
  - the roadmap: 6f60dbc.
- **Doc syncs:** 2fbc047, f953afd, 67a8662, 931b61b, fb4003f, 8d0aee0, b5dce3b, 725d9e2, 405c1f5, 5c899d6.
- **The alignment with this checkpoint's predecessor:** 251a0bf to d88c077, then 670a0f1 and fa7c25a.
- **New doc tabs:** Structure and Countries, exported to `docs/plan/structure.md` and `countries.md`.

**Measured (Node 24.18.0, Windows desktop, no load average on Windows):**
- `move` at 100k agents takes 0.536 ms, against a 0.8 ms budget and a 0.88 ms limit.
- The allocation gate counts 0 scavenges and 2.8–3.4 KB of young-generation allocation a day at every tier.
- Initial JS is 16,741 of 17,000 B brotli, and 19,047 B load before the first frame.
- Seed 42's replay goldens at tick 1,000 are phone `caae4f61`, phone-plus `8b8085d3` and desktop `5e02e3b0`.

## Decisions

**The owner's, on 9 October 2026:**
- **Code:**
  - concern folders in every package;
  - a `Blob` handle re-pointed per row, never an object per blob;
  - per-tick loops use its accessors, with plain columns for any loop more than 10% slower.
- **Blob facts:** a name from round 8's design H and a wallet opened with 100,000 cents. No home or job yet.
- **Walking:** blobs walk in any direction, not only up, down, left and right.
- **Map first:** M8.1 World generator and the core of M8.3 Country and Region views come after M0 (with M0.7) and before M1. Blobs stay in the town until M9.
- **Countries:**
  - 3–5 per seed on the 192×128 world;
  - countries differ by map facts only; laws, money and cultures are shared;
  - natural borders;
  - no wars, as the Military tab already said;
  - five map-only colours, which the owner picks from a swatch sheet when M8.3 starts;
  - the page opens on the town;
  - crossing bars: at least 15% of each culture's people outside its main country, and no country over two-thirds one culture, in 90 of 100 seeds;
  - a gazette per country.
- **Working style:** update plans, agents and the implementation plan before code, and ask clarifying questions before big new work.
- **Earlier decisions still hold:** launch after M8; MIT for the code; `skip-expired`; the 48×28 town; the 0.6 ms snapshot budget at 100k; 60 B of snapshots per agent; the memory and frames gate in M6.2; and the 17 kB and 22 kB byte limits.

**Agent rulings, which the owner can overturn:**
- **Walking:**
  - 256 headings, each redrawn every 16 ticks, turning by up to ±15 headings;
  - idlers start walking with chance 3/16;
  - a blocked step slides along the wall and leaves at half its angle;
  - facing is the nearest of the four directions;
  - spawn points are keyed inside each tile, and three in four blobs start walking.
- **M0.7:**
  - it may start before the device timings;
  - the walking work counts outside its 5–8 days;
  - invariant checks run every tick only in development, tests, the CLI and CI's ledger gate.
- **Countries:**
  - the stage lands in Python first;
  - one treasury, issuer and tax for all countries;
  - no checkpoints or tolls at borders, and patrols from both sides;
  - a proposed 3-cell border reach;
  - food capacity counts over the whole world;
  - M8.1's previews use provisional colours;
  - M8.1 sets a provisional cell scale and region count, which M7 adopts or revises.
- **Gates:** the hot lint and the allocation gate are widened per M0.6's review.
- **Carried from checkpoint 0015:** its agent rulings still hold, with two changes. The generator lint now belongs to M8.1, not M3.1. The goldens are the new ones above.

## Open

1. **The startup gate's headroom,** in progress. Target: a median first frame of 1,425 ms or less at the calibrated rate, without raising a limit.
2. **Close M0.6** (Task 14):
   - record the pace;
   - tick the doc's proven M0.6 items;
   - re-baseline the Performance budget's measured columns;
   - write a checkpoint.

   **The pace so far:**

   | Sub-milestone | Build | Review fixes | Status |
   | --- | --- | --- | --- |
   | M0.5 | 22:47 on 8 October to 01:22 | 03:29–04:08 on 9 October | Waits on the owner's device timings |
   | M0.6 | 22:51 on 8 October to 01:43 | 05:03–05:19 on 9 October | Closes when perf is green |

   A usage-limit pause of about 24 minutes fell around midnight.
3. **Owner: device timings** (M0.5 Task 10 Step 1).
   1. Run `pnpm --filter @nomos/web build`, then `pnpm --filter @nomos/web exec vite preview --host --port 4173`.
   2. On a mid-range Android phone and an iPhone, open `http://<this PC's LAN IP>:4173/?seed=42&tier=phone`, then the same with `&tier=phone-plus`.
   3. After 60 s, read the HUD's frame row and the sum of its system rows.
   4. Record the device, OS, browser and both tiers.
4. **Owner decisions still open:**
   - the five country colours;
   - the hearth-balance tolerance;
   - street, district and region names (M8.2);
   - the country count in New country settings;
   - the 2 ms render bar;
   - regions per country.
5. **Licences:**
   - the art licence;
   - Ninja Adventure's own licence file;
   - Mana Seed's licence page;
   - a source for the Pokémon name fixtures other than the pret decompilations (M0.7's verify-first).
6. **The map export drops scenery:** 13 bridge cells draw as river, and 3 blocked tiles draw as plain ground. It's a `tools/worldgen` fix.
7. **Dots overlap walls** by up to 4 px at zoom 6, up from 3 px before. Keeping blobs 4 px clear of walls is the owner's call.
8. **Up and down steps are rarer on the town:** about 7% each, against 12.5% if even, while open ground is even. The town's long walls with the wall-slide rule are the likely cause (inference).
9. **M0.6 review, minor items:**
   - the calibration's half-step rounding, about the size of the regression threshold;
   - budget rows not enforced per system and tier;
   - `chunks.ts` checks five file types;
   - the name lint's reach;
   - ligatures in `nearRealWorld`;
   - perf jobs that start unused servers;
   - small simplifications.
10. **Hot lint gaps still open:**
    - class methods, which M0.7 covers;
    - `toLocaleString`, `String.fromCharCode`, `JSON.stringify` and `padStart`;
    - a module-level `wrap((a) => [a])`.
11. **The roadmap drawing** (`docs/plan/images/roadmap.png`) predates the map-first order.
12. **Flat `src/` paths** remain in 18 M1–M10 briefs. Each step plan maps them to M0.7's folders.
13. **Local browser runs are flaky:** a software-rendered Chromium page keeps about 10 of 12 cores busy. Cap local Playwright workers.
14. **Later milestones:**
    - births read stale positions (M2);
    - a link failure during a context restore still throws;
    - the stride change list must become canonical (M3);
    - the input log's cap of 4,096;
    - worker-side OPFS saves (M6);
    - a Chromium allocation run before M6.2;
    - the WASM size-limit rule arms in M6.2;
    - the 17 kB stand-in goes with the first real systems;
    - `floorDiv(0, -5)` returns −0, to settle before M8.1, whose port bans bare `/` and `%`;
    - sea cliffs only on south coasts, and snow-less shore tiles, which the M8.1 and M8.8 briefs carry.

## Next

1. **Land the startup headroom fix.** Push after the identity check, then confirm every workflow, perf included.
2. **Close M0.6** per Task 14.
3. **M0.7:** expand its brief into a step plan with `writing-plans` on Opus, then build it.
4. **Then:** M8.1, M8.3 and M1, each step plan written when the one before closes.

## How to verify

- `pnpm install --frozen-lockfile`, then `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names`: all pass, 377 tests.
- `node packages/sim-core/scripts/engines.ts` prints "kernels 865 ok, goldens 3 ok".
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=caae4f61`.
- `node --expose-gc tools/bench/src/alloc.ts`: 0 scavenges, and under 16,384 young bytes a day at every tier.
- The startup gate still fails here: `pnpm --filter @nomos/web build`, then `node tools/bench/src/calibrate.ts` and `pnpm --filter @nomos/web startup` with its output, give a median first frame of about 1,512 ms.
