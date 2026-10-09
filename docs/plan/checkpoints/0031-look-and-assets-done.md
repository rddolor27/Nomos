---
checkpoint: 31
date: 2026-10-09
milestone: M0.8 and M3.1 part 2
status: paused
based_on: b8d3bc2
next: M3.1 part 2, step 1, bigger places. Expand its brief first (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md, "Part 2")
waiting_on: []
---

# Checkpoint 0031: the UI look and the new assets

## State

The owner's first M0.8 look and the new sprites are built and pushed to `origin/main` at b8d3bc2. No QA ran, at the owner's word, since usage was low. QA runs once, when the next implementation is finished (`models.md`).

## Done since checkpoint 0030

- **M0.8 UI look** (ui-designer, Chromium checks only):
  - 8e70a4f puts the tokens and button states in `apps/web/index.html`, with an orange accent, #f08a4b, and a page of #20242c.
  - 42f509e adds a shared one-row toolbar in `apps/web/src/panels/toolbar.ts`, with a −, + and Fit group and a More menu on narrow views.
  - 4b97e95 labels the charts' axes.
  - Before the first frame: 19.59 of 100 kB; first-load JS: 16.79 of 17 kB.
- **Assets** (asset-designer):
  - town walls, towers, gates and gate piers, in `tools/sprites/walls.py` (5e41e9b and 0341dd1);
  - the `board` and `rubble` house styles (edb2589);
  - six props (cfbb5a5);
  - the preview, `docs/mockups/town_walls_preview.png` (f292ed6 and 6ec1b63);
  - `docs/mockups/town-references.md` (b8d3bc2).
  - The atlas packs to 2048 × 763 px, with `atlas.webp` at 96,862 B, against a 300 kB entry.
- The owner's preview at :4180 was rebuilt at b8d3bc2.

## Open

1. **M0.8 left undone:**
   - lil-gui's Map button and zoom;
   - Fit, Home and pinch for the town itself;
   - `toolbar.ts` in `interfaces.md`'s Layout;
   - runs in Firefox and WebKit, and of the other map specs, such as `map-crowd.spec.ts`, whose selector changed.
2. **Little headroom:** index.html is at 1.38 of 1.5 kB, and the map view at 14.08 of 14.5 kB.
3. **Walls in towns,** M3.1 part 2, step 5:
   - vertical runs are flat walkway strips;
   - the side gate is a tall pier with its door, a two-tile gap, then an end cap;
   - towers are 2 × 2, and the two tiles above each tower and pier stay clear.
4. **References:** the six in `town-references.md` were written from memory and are labelled "not opened". They need a link check.
5. Everything open in checkpoints 0028 and 0030.

## Next

M3.1 part 2, step 1, bigger places, then the steps after it, as checkpoint 0028 (1cf1b50 in git history) lists them.

## How to verify

- `pnpm test && pnpm lint && pnpm typecheck`
- `python tools/sprites/test_sprites.py`
- `PYTHONIOENCODING=utf-8 python tools/worldgen/place_fixtures.py --check`
