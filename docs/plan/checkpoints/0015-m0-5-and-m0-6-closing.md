---
checkpoint: 15
date: 2026-10-08
milestone: M0.5 and M0.6
status: paused
based_on: 4b636d3
next: Commit M0.5's review fixes, then close M0.5 and M0 (docs/plan/tasks/m0-pipeline/m0.5-web-app/plan.md Task 10, docs/plan/tasks/m0-pipeline/m0.6-gates-and-guards/plan.md Task 14)
waiting_on: [owner: device timings on an Android phone and an iPhone, the shared doc opened under its owning account]
---

# Checkpoint 0015: M0.5 and M0.6 closing

This checkpoint replaces 0001–0014, which git history keeps. It carries every decision and open item still in force.

## State

- **Built:** every task of M0.1–M0.6 is built and pushed; `origin/main` is at 4b636d3.
  - M0.1–M0.4 are closed.
  - M0.5 Web app and M0.6 Gates and guards are not closed yet.
- **Unfinished:**
  - M0.5's review fixes are half-done and uncommitted.
  - M0.6's whole-change review was stopped before it reported.
- **Paused** early on 9 October 2026, local time, when the owner's usage ran low. No agent is running.

**CI on 4b636d3,** pushed at 01:57 local time: every job passed.
- CI's `check`, `browser` and `bun` jobs;
- all five `stdlib` jobs;
- perf's `compute` and `load` jobs, on their first run.

Every pushed commit carries only the no-reply address.

What runs today: the page in `apps/web` boots the sim worker on the generated 48 × 28 town and draws its agents with the WebGL2 renderer, with a Canvas2D fallback. It has a HUD, charts, controls and device tiers. Seed 42 replays to `b9e2775f` at tick 1,000 in Node, Bun, Chromium, Firefox and WebKit.

## Done in M0.5 and M0.6

The commits run from 14325ac (22:47 on 8 October, local time) to 4b636d3 (01:43 on 9 October). Up to 39d6ec8, they interleave with M0.4's close.

**M0.5 Web app:**
- the pre-flight (14325ac) and the package (7fcfd93, cd9f813);
- the inline boot, query and tiers (6a80eaf, 39cf0dc, e066620);
- the atlas, the licence ledger and the sprite-manifest schema (3870ca0, 65b2807, a8644dd, dc07a5f);
- the framework ban (6487a44);
- charts, controls and the HUD (efefc0a, 53bf6c2);
- byte limits (ab021dc), accessibility (fc29bca) and the startup spec (6db592f).

Measured on an idle desktop:
- first frame 1,051 ms and interactive 1,301 ms;
- 18.5 kB brotli before the first frame, 16.2 kB of it JS;
- libraries 38.4 kB gzip.

**M0.6 Gates and guards,** all 13 build tasks, after the pre-flight (f49d373) and the packages (47e4811):

| Task | Commits |
| --- | --- |
| Task 1, five-engine goldens | 8dba468, 5318a7b |
| Task 2, hot-path lint | b8fbc4a |
| Task 3, generator lint | 862383a |
| Task 4, `sim-culture` | 829fe81 |
| Task 5, ESLint culture wall | 895f2cc |
| Task 6, dependency-cruiser wall | 000cc97 |
| Task 7, relabel test | e06baab, 794165c |
| Task 8, name lint | 084ae4c, 0dc9249, f9c5bbc |
| Task 9, culture-text lint | 90fb65d |
| Task 10, bench and budget, and the `move` split | b1f8f78, 231c81c, 37c8089, 22f2a71 |
| Task 11, allocation and ledger gates | d2b740f |
| Task 12, byte gates | 91e604c |
| Task 13, startup gate | 1768e50, bd8baa1 |

`upload-artifact` moved to v7 in 4b636d3.

Measured:
- at 100k agents in Node, `move` takes 0.405 ms and the snapshot 0.394 ms;
- the allocation gate counts 0 scavenges at every tier;
- with the CPU calibrated to a mid-tier phone (rate 8 here), first frame 1,419 ms and interactive 1,712 ms.

**Docs:** `interfaces.md` (a9d8764), and the owner's decisions (9c02092, af6eb9f, 68403b0).

## Decisions

**The owner's:**
- **Release order:** launch after M8, with M9 and M10 after it (6 October 2026).
- **Licence:** MIT for the code (8 October 2026).
- **Delivery:**
  - push after each sub-milestone, and confirm CI before the next;
  - finish all of M0, using more agents.
- **Spoilage:** `skip-expired` for late spoilage, built as `SPOILAGE_RULE`.
- **The town:** stays 48 × 28, with placeholder values.
- **Snapshot budget:** 0.6 ms at 100k agents, up from 0.3, with the 100k slack down from 3.0 to 2.7 ms (9c02092).
- **Memory row:** 60 B of snapshots per agent.
- **The memory and frames gate** moved to M6.2 (af6eb9f).
- **Byte limits (9 October 2026):** the initial-JS M0 stand-in rose from 12 to 17 kB, and the charts chunk from 21 to 22 kB (68403b0).

**Agent rulings,** which the owner can overturn:
- **Licence scope:** MIT covers the code only. The sprites, sounds and concept art stay the owner's until a licence is chosen for them, because a released licence can't be taken back.
- **Pins:**
  - TypeScript `~6.0.3`, because typescript-eslint rejects 7;
  - ESLint 10, Vitest 5, Vite ^8.3.3 and dependency-cruiser 18;
  - Node `>=24.5`, for size-limit 14.2;
  - CI on the newest action majors: checkout v7, pnpm/action-setup v6, setup-node v7, setup-python v7, upload-artifact v7, cache v6 and setup-bun v2.
- **The town is generated, not LDtk.** The two LDtk-worded M0 items count as met, because the generated town meets their intent (round 9).
- **Money:**
  - @stdlib may run at runtime outside per-agent loops, since every engine probe matched;
  - `mulPpm` has no ±1 step: below 2^53 cents, its division never rounds across a whole number;
  - `create*` isn't atomic, so a world that doesn't fit is dropped whole, and `layoutWorld` must never catch the throw;
  - the cash primitives allow overdrafts, so M2 must enforce non-negative cash, and `economy-review` must check it.
- **Draws:**
  - the draw returns unsigned 32-bit values, and per-tick code uses each one where it is drawn;
  - draws are keyed on slot index, so stable ids must come before any milestone frees or moves a slot.
- **Canonical state:** "only the day boundary writes canonical state" means aggregate state, within R6's window of day slices. Per-agent motion and the tick change every tick.
- **The ground and restores:** the ground is an unhashed input, so a restore must pass the same ground. A map hash and a wrong-seed check join M6's saves.
- **Local servers:**
  - the harness and the preview listen on 127.0.0.1, because Firefox sometimes failed to reach a `::1`-only server;
  - the frame-budget Playwright project runs after the engine projects.
- **The generator lint:** no TypeScript generator exists before M3.1, which adds `packages/worldgen` to the lint.
- **The culture wall:** guarded code imports sim-core subpaths or `./kernels`, never the barrel, because the barrel reaches `sim-culture` through `consumption/stand-in.ts`.
- **lil-gui** has no LOD control, since the skin toggle's Auto owns LOD.
- **Estimates** stay in days by hand. `milestone.md` gives the measured factor.

## Open

1. **M0.5's review fixes,** uncommitted in `apps/web`.
   - **The changed files:** `index.html`, `src/{app,boot,camera-input,hud,lifecycle}.ts`, `vite/early-boot.ts`, `test/early-boot.test.ts` and `test/browser/{boot,hud}.spec.ts`.
   - **To delete:** the untracked `test/browser/zz-debug-pause.spec.ts`, a debug file.
   - **The review's items:**
     - **Must-fix:** a worker that fails before the entry chunk loads goes unreported. The boot script sets `__boot.failed` from `worker.onerror`, and `startApp` shows the message. Add a `boot.spec.ts` case with the worker routed to 404 and the entry chunk delayed.
     - Move the `dvh` grid lines in `index.html` into `@supports (height: 100dvh)`.
     - Add a test for a corrupt map, which shows "could not be read".
     - Add a test for a throwing `localStorage` getter with a Pixel user agent, which shows "Phone tier".
     - Drop `userPaused` and `byUser`, and let `lifecycle.ts` read `app.paused`.
     - Make `bindCameraInput` return `void`.
2. **M0.6's whole-change review** never reported. Run it again with a fresh `code-reviewer` on Opus.
3. **CI:** after the fixes, push following the identity check, and confirm every workflow.
   - The web-fetch tool is gone, so read runs with `Invoke-RestMethod https://api.github.com/repos/rddolor27/Nomos/actions/runs?branch=main&per_page=6`.
4. **Owner: device timings** (M0.5 Task 10 Step 1).
   1. Run `pnpm --filter @nomos/web build`, then `pnpm --filter @nomos/web exec vite preview --host --port 4173`, and allow Node through the firewall if asked.
   2. On a mid-range Android phone and an iPhone, open `http://<this PC's LAN IP>:4173/?seed=42&tier=phone`, then the same with `&tier=phone-plus`.
   3. After 60 s, read the HUD's frame row and the sum of its system rows.
   4. Record the device, OS, browser and both tiers.
5. **Owner: the shared doc.** It refused edits from this session's account ("forbidden", role). Under the owning account:
   - change the CI gates "Bytes" line's initial-JS stand-in from 12 to 17 KB;
   - tick the M0 items and exit checks that are now done;
   - re-baseline the Performance budget's measured columns from M0.6 Tasks 10, 11 and 13;
   - then run `/sync-plan-doc`.
6. **`interfaces.md`** lacks:
   - `relabelCultures` and `cultureViews`;
   - `createSimLoop`'s `cpuSlowdown`;
   - `startServer`'s `workerSlowdown` option.
7. **The pace:** M0.5's and M0.6's rows in `milestone.md`, and the M0 total.
   - M0.1–M0.4 took 346 minutes.
   - M0.5 and M0.6 ran in parallel from 22:47 on 8 October to 01:43 on 9 October, with a usage-limit pause of about 25 minutes around midnight. The review fixes still have to be added.
8. **Licences:**
   - the art licence is still the owner's choice;
   - Ninja Adventure's own licence file is unread;
   - Mana Seed's licence page is unread, so its AI clause is still a search summary.
9. **Later milestones:**
   - **M2:**
     - births read stale positions from the renderer's previous snapshot;
     - a link failure during a context restore still throws.
   - **M3:** the stride change list must become canonical if changes stay pending across ticks.
   - **M3.7:** 45% of short generated names hit the real-world fixture, so names need a minimum length or a retry.
   - **M6:**
     - the worker writes OPFS saves;
     - one allocation run in Chromium is due before M6.2;
     - the WASM size-limit rule arms in M6.2.
   - **The input log:** its lifetime cap of 4,096 holds until inputs that change canonical state are first logged.
   - **The 17 kB stand-in:** the first milestone with real systems deletes it.
   - **`floorDiv(0, -5)`** returns −0.

## Next

1. **Finish and commit item 1.** Run `pnpm test`, the app's browser specs in all engines, `pnpm lint` and `pnpm typecheck`.
2. **Rerun the M0.6 review** (item 2), and fix what it finds.
3. **Push and confirm CI** (item 3).
4. **With the owner:** do items 4 and 5, then close M0.5 and M0.6. That means the pace, the doc sync and the final M0 checkpoint.
5. **M1 Lab mode:** expand M1.1's brief into a step plan, with `writing-plans` on Opus.

## How to verify

- `pnpm install --frozen-lockfile`, then `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names`.
  - All of them pass on the committed tree, as CI's `check` job did on 4b636d3.
  - Stash the uncommitted fixes first.
- `node packages/sim-core/scripts/engines.ts` prints "kernels 865 ok, goldens 3 ok".
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b9e2775f`.
- Run these in turn; every limit is met and no chunk is ungated:
  1. `pnpm --filter @nomos/web build`;
  2. `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`;
  3. `pnpm --filter @nomos/web size`;
  4. `node tools/bench/src/chunks.ts`.
