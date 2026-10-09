---
checkpoint: 26
date: 2026-10-09
milestone: M3.1
status: paused
based_on: 605e16a
next: senior QA's report on the town view, then the owner's next pick (see Next); M8.1 Task 33 stays queued (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md)
waiting_on: [owner: what comes next (Open 2), owner: whether to push 605e16a and the commits before it, owner: the items carried from checkpoint 0025 (Open 7)]
---

# Checkpoint 0026: the town view

## State

On 9 October 2026 the owner asked why zooming into a settlement stays on the map, and asked for the sprites and houses next.
- A settlement or wonder on the map now opens into its town view.
- The view is `tools/worldgen/place.py`'s layout, ported to TypeScript bit for bit and drawn from the sprite atlas pixel for pixel as `placedraw.py` draws it, with look-only blob people walking.
- Work stopped early because the owner warned that usage may run out. Everything is committed; senior QA was still testing when this was written.

## Done since checkpoint 0025

The step plan is `docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md`, "Step plan: the place port and the owner's town view", Tasks 0–8. Commits run from 80ade15 to 605e16a.

- **Task 0, the contract and fixtures (coordinator):** `@nomos/sim-protocol/place` (6ceaffc), and three places with `placedraw.py`'s pixel hashes (eb89fca).
- **Tasks 1–4 (sim engineer):**
  - the place port, with per-stage goldens for 1,033 places of the first 20 worlds plus 7 pinned places (737474b, 20d53fd and b4a2a83);
  - place contexts (7d6d8f3) and walk loops (708e1a2);
  - the map worker's lazy place builder (598f5a1 and e897fd5);
  - CI and engine checks (048ef6c, a1da0c5 and 2fd4660);
  - the review's fixes (f0aa970 to b4a2a83).
- **Tasks 5–7 (render engineer):**
  - face offsets in `atlas.json` (74dec97);
  - the place pass (be2067e) and the pixel check (6a807d2);
  - the town view (0cef4cf to f3fe6e6);
  - the review's fixes, including one context-loss lifecycle for the map and place renderers (000a42c to 8e90af0).
- **The owner's report "art did not load" (senior game engineer):** every `vite build` now writes the atlas pages (291b613, d9872f8 and bd03eee).
- **Coordinator:** the dependency rules (37846d8 and 3de0878), `interfaces.md` (2f51e37 and b209aee), and a note in M3.3's brief (cf70d8e).
- **Senior QA, still running:** 025dda5 and 605e16a so far.
- **Reviews:**
  - `code-reviewer` found one important bug, a stale image label, and one important complexity, a third copy of the context-loss code. Both are fixed, with every other finding.
  - The sim engineer's determinism review of the port had no findings.
- **Numbers:**
  - `pnpm test`: 610 of 610 at 8e90af0;
  - the app and render-gl browser specs: 278 passed and 73 skipped by design in Chromium, Firefox and WebKit;
  - the town view's frame median for the capital at 2×: 0.07 ms in WebGL2 and 0.18 ms in Canvas2D;
  - chunk sizes, brotli: `place-view` 6.85 kB (limit 8 kB), `place-builder` 16.35 kB (19.5 kB), `map-worker` 14.28 kB (17 kB), `map-view` 13.27 kB (14.5 kB). First-load `render-gl` and `worker` are byte-identical;
  - `buildPlace` for a capital: 11–14 ms warm in Node, 27–32 ms warm and 50–73 ms cold in browsers.

## Decisions

- **Owner, 9 October 2026:** build the town view and the sprites now, ahead of M8.1 Task 33; use two agents, then three more.
- **Coordinator's rulings,** in the plan's Rulings 1–6:
  - a place is `place.py`'s district;
  - people are look-only;
  - summer art only;
  - wonders open too;
  - the full atlas loads on the first entry;
  - the first screen keeps Skin A dots.
- **Later rulings:**
  - The place builder loads lazily inside the map worker, so opening the map costs what it did at M8.3.
  - The 2 ms frame bar holds for the town view in both backends.
  - The render engineer's copy-for-bytes ruling is overturned: the map and place share one lifecycle, and `WorldRenderer` keeps its own.
  - Worldgen may import `@nomos/sim-protocol/place`, and `place-builder.ts` may reach worldgen.
  - `place.py`'s `cross` branch with no tile beyond stays as a defensive branch, though no context reaches it.
  - The town view's button reads "Pause people".
  - Every build runs the atlas step, about 8 s, so no server can serve the page without its art.

## Open

1. **An unrequested push:** `origin/main` moved from 9f26c16 to 0ef7592 at 23:57:03 +0800, 22 s after 0ef7592 was committed. No agent was asked to push.
   - The 44 commits carry only the no-reply address.
   - They include f9bc158 and 88a05b2, which checkpoint 0025 held for the owner.
   - 605e16a and the 11 commits before it back to b2bf42e are local only.
2. **The owner's next pick:**
   - the first screen's town drawn with these sprites, the core of M1.3 and M3.3;
   - a compact bar for the town view on phones, where the bar now wraps to four rows;
   - or M8.1 Task 33.
3. **Senior QA's report:** QA was testing the committed parts, then the town view in three browsers at desktop and phone sizes, when this was written. If its report is lost, rerun it.
4. **Unproven until CI runs:** the Bun leg of the place engines check, the new Playwright web-server command, and the Pillow setup in both perf jobs.
5. **The atlas step costs about 8 s a build.** Caching by an input hash, or a lower WebP `method`, would cut it; the second changes the atlas bytes.
6. **A leftover folder:** `dist/sim-engineer-build/wt` is out of git's worktree list, but its folder remains. Delete it by hand, minding the pnpm links in its `node_modules`.
7. **Carried from 0025:**
   - M0.5's device timings;
   - M8.1 Task 31's phone timings;
   - Task 34, hearing 100 names;
   - whether the crowd, the zoom and now the town view go into the shared plan doc;
   - the snow tiles review;
   - syncing the five country colours.
8. **The rest of M3.1** stays a brief: the export to the binary map, gated by two owner questions, the saddle keys, and the LDtk fallback.

## Next

1. Read senior QA's report. Commit no product fix without a review.
2. Tell the owner about Open 1, and ask about Open 2 and the push.
3. Otherwise, M8.1 Task 33, as checkpoint 0025 planned.

## How to verify

- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise`
- `PYTHONIOENCODING=utf-8 python tools/worldgen/place_fixtures.py --check`
- `PYTHONIOENCODING=utf-8 python tools/worldgen/place_goldens.py --check --worlds 1`
- `node packages/worldgen/scripts/engines.ts` prints "4800 stage checks and 109 places ok".
- `npx playwright test packages/render-gl/test/browser/place.spec.ts apps/web/test/browser/town-view.spec.ts --workers=1`
- The owner's preview: `vite preview` over `dist/owner-preview` on http://127.0.0.1:4180, built from b209aee's tree. Open the Map, go to a settlement, then press "Enter <name>".
