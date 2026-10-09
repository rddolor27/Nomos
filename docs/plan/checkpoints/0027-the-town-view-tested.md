---
checkpoint: 27
date: 2026-10-09
milestone: M3.1
status: paused
based_on: fda1f8f
next: the owner's pick (Open 2 of checkpoint 0026, in git history at c96d81c); M8.1 Task 33 stays queued (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md)
waiting_on: [owner: what comes next, owner: whether to push fda1f8f and the commits before it]
---

# Checkpoint 0027: the town view, tested

## State

The owner's town view is built, reviewed and tested. Senior QA's report came in after checkpoint 0026: every done-check it could run passes, and it found three open bugs. Bug 1 is fixed in fda1f8f, and bugs 2 and 3 stay open, both low. Checkpoint 0026, at c96d81c in git history, holds the full account of the work. Everything below adds to it.

## Done since checkpoint 0026

- **Senior QA's report,** tested on clean exports of five committed states up to 025dda5:
  - Tasks 0–7: every done-check passes.
  - The place goldens over 20 worlds and the 7 pinned places pass in Python: `place_goldens.py --check --worlds 20` took 1 m 24 s.
  - 97 more places from large worlds and edge seeds equal `place.py`'s, and their 582 pictures match `placedraw.py`'s SHA-256 in both backends and three browsers. They cover all five tiers and all eleven wonder kinds.
  - Walk loops over 9,862 places of 69 worlds: no throws and no loop problems.
  - The whole browser suite: 296 passed, 76 skipped by design and 0 failed.
  - The startup gate: first frame at 1,016 ms, interactive at 1,299 ms, and 19,093 B before the first frame.
  - First-load chunks are unchanged: 13,171, 17,049 and 16,209 B.
- **QA's tests:** 025dda5 checks walk loops against the town that is drawn, and 605e16a keeps a walker on its loop in the browser.
- **fda1f8f fixes QA's bug 1:** Try again hid itself while focused once the art loaded, which dropped focus and stopped Escape working. `town-view.spec.ts` now presses Enter on Try again and checks that focus stays on Back to map: 14 passed and 22 skipped by design in three browsers.
- The owner's preview at http://127.0.0.1:4180 was rebuilt at fda1f8f, and its check entered capital-0 with no console errors.

## Decisions

- **Coordinator:** only bug 1 had to be fixed before stopping. Bugs 2 and 3 are low, and the owner warned on 9 October 2026 that usage may run out.

## Open

1. **QA's bug 2, low, Chromium only:** switching on reduced motion while people walk leaves them frozen mid-stride, rather than back where `place.py` put them.
   - `walking()` reads `reducedMotion.matches` every frame (`apps/web/src/map/place-view.ts`), and in that page Chromium may never fire the `change` event. That cause is unproven.
   - QA tested only the emulated switch.
2. **QA's bug 3, low, WebKit on touch only:** a tap that opens a town puts focus on `section#place` rather than Back to map. WebKit's follow-up mousedown lands on the new canvas after focus moves (`map-input.ts` acts on pointerup).
3. **QA's failing specs** for bugs 1–3 are in `dist/qa/proposed-tests/town-view-bugs.spec.ts`, which is git-ignored. Bug 1's spec now passes in substance through `town-view.spec.ts`.
4. **QA's notes:**
   - 5.1% of places have nobody walking, as hamlets and wonders often do;
   - 3.1% of loop cells pass a tile where someone stands still, so blobs sometimes overlap;
   - water shows frame 0, by design;
   - Playwright's WebKit screenshots a still WebGL canvas as black, an artefact only.
5. **Push:** fda1f8f and the commits back to b2bf42e are local. `origin/main` moved to 0ef7592 at 23:57:03 +0800 by a push that nobody asked for (checkpoint 0026, Open 1).
6. Everything else in checkpoint 0026's Open still stands.

## Next

1. Ask the owner what comes next (checkpoint 0026, Open 2): the first screen's town in these sprites, a compact phone bar, or M8.1 Task 33. Also ask whether to push.
2. Bugs 2 and 3, when there is room.

## How to verify

As in checkpoint 0026, plus `npx playwright test apps/web/test/browser/town-view.spec.ts --workers=1`.
