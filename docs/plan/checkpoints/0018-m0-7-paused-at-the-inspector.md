---
checkpoint: 18
date: 2026-10-09
milestone: M0.7
status: paused
based_on: 6442b14
next: M0.7 Modules and blob facts, Task I1 The inspector, then Task C1 Close (docs/plan/tasks/m0-pipeline/m0.7-modules-and-blob-facts/plan.md); beside it, M8.1 World generator Part 2 (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md)
waiting_on: [owner: device timings on an Android phone and an iPhone (closes M0.5), owner: five country colours from the swatch sheet (M8.3)]
---

# Checkpoint 0018: M0.7 paused at the inspector

Usage was nearly out, so this records M0.7 partway. Checkpoint 0016's Decisions still hold, except where Decision 1 below replaces one, and so do the Open items of 0016 and 0017 that aren't settled here.

## State

- **M0.7:** M1–M8, L1–L4, V1, B1–B8 and N1–N3 are committed. I1, the inspector, was in progress and uncommitted. Of C1, only the worldgen path fix is done (b78df6f).
- **Map first:**
  - M8.1's Python countries stage, Part 1, is done.
  - A lead on Opus was writing the world-map contract and the step plan for Part 2, the TypeScript port. None of it was in the tree yet.
  - Snow map tiles landed.
  - A swatch sheet of candidate country colours was being drawn into the gitignored `dist/colours/`.
- **Unpushed:** `origin/main` is at 28abb55. Before this checkpoint, `git rev-list --count origin/main..main` gives 51.

## Done since checkpoint 0017

- **Startup:** 4434b2c warms the worker up after it posts `ready` and the tick-0 snapshot. It was pushed with 28abb55.
- **M8.1 Part 1, the Python countries stage:**
  - commits 3d98a2c to f7ffa6a;
  - the owner's review of the previews, in 328596e;
  - `python tools/worldgen/test_worldgen.py` checks it.
- **The mixed name style in the docs:** e938d18, ff4321a, b494f38, d7401ae and 357b776.
- **M0.7:**
  - **step plan:** cc3fc99 and 87c8b15;
  - **moves, M1–M8:** 90564fd, 538f795, fc17398, 5138430, 0a01837, 70d0722, 3b5242e, d7f82d1 and 4988d5b. 4c49312 refreshed the golden frames for the footbridges fixed in f7ffa6a;
  - **lints, L1–L4:** f9b1d57, a585c93, 6634f17 and 28a5a4b;
  - **V1:** 143cfaa, which loads the view input after the first frame;
  - **wallets (B1):** 8590ae2;
  - **the `Blob` handle (B2):** 5323ec6;
  - **the handle A/B (B3):** recorded in e0e3566. Accessors cost 1.05–1.20× on `move`, past the 10% bar, so per-tick loops keep their columns and B4 changed nothing;
  - **the checks flag (B5):** a2a92a2;
  - **name keys (B6):** 892789e;
  - **inspect (B7):** 953ea1a;
  - **`worldAt` (B8):** 5703e83;
  - **goldens:** now `b3b2c251`, `701bbf1a` and `400498de`;
  - **names:** the filter (b7e55ed, 3b4ad53), the sound set (8cc45d8, 90d593a), and the table and `personName` (60e4f8e, 6442b14). N3's build drew 2,988 candidates and kept 1,024. It rejected 1,290 on length, 37 repeats, 40 copied source words, 9 franchise, 537 real-world, 2 place, 33 species and 16 profanity;
  - **C1:** b78df6f points worldgen at `map/map.ts`. Separately, 73212d5 renames the plan's Berber base to Amazigh, as the pinned file names it.
- **Snow map tiles (M8.1 Task 6):**
  - 5e58bf0 draws `map8_snow` and `map16_snow`;
  - ef9b801 draws snow in the previews with them instead of flat white;
  - `python tools/sprites/test_sprites.py` and `python tools/worldgen/test_worldgen.py` pass;
  - `python tools/worldgen/export_map.py --check` reports `town.nmap` unchanged.

## Decisions

The owner, on 9 October 2026:

1. **Names:** one mixed style for everyone. Each word mixes Greek-like sounds with those of other languages, picked at random, so no culture owns a sound. This replaces checkpoint 0016's choice of round 8's design H. The trigram screen is dropped, and the edit-distance filter stays.
2. **Country previews:** islands may join by sea, and plains borders stay straight. The place-name table freezes as v1 once the owner has heard 100 sample names.
3. **Staffing:** for M0.7, Sonnet juniors for the moves, with one senior overseeing. For the map, one senior and two juniors, starting now, alongside M0.7.
4. **Usage:** when usage nears its limit, write a checkpoint and set the session to resume by itself once usage returns.

The agents' rulings, which the owner can overturn:

1. The franchise fixtures come from Wikidata only (CC0), since the owner didn't pick a source.
2. The senior's rulings 1–15 in M0.7's plan stand, among them Greek at weight 2, two other bases per word and the 11-letter cap.
3. `LICENSE-fmg.txt` keeps its author's email in the copyright line. MIT requires that notice verbatim, and the address is a third party's public one.
4. N3 and I1 ran side by side, against the plan's one-at-a-time order, because their files don't overlap.
5. **N3:**
   - the words script keeps a 5-line copy of `personName`'s rule for its sample names;
   - `--check` and `words.test.ts` read CRLF as LF;
   - `sim-culture`'s index exports `personName` but not `NAME_WORDS`.

## Open

1. **I1's files were uncommitted at this checkpoint:**
   - changed: `apps/web/package.json`, `pnpm-lock.yaml` and `apps/web/src/view/camera-input.ts`;
   - new: `apps/web/src/panels/cents.ts`, `apps/web/src/panels/inspector.ts`, `apps/web/test/inspector.test.ts` and `apps/web/test/browser/inspector.spec.ts`.
2. **The 40 sample person names** go to the owner. Reading them is not a gate. `node tools/names/scripts/words.ts` prints them again and rewrites identical bytes.
3. **The swatch sheet,** `dist/colours/country-swatches.png`, is for the owner to pick the five map-only colours. It is gitignored. If it's missing, redraw it: about 12 candidates, each at least CIEDE2000 15 from every reserved colour, plus a suggested five.
4. **Snow tiles:**
   - The owner hasn't reviewed them yet. `python tools/worldgen/generate.py --seed 5eed000a --size large` draws a world with snow.
   - One frame per size repeats on a fixed grid. If the owner dislikes the pattern, add a second frame and a keyed pick in `mapdraw._tile`, as grassland does.
   - M8.1's `plan.md` still lists Task 6 as open, and its Ruling 4 still calls snow a flat stand-in.
5. **The filter's rate:** `rejectName` rejected 597 of the 1,621 candidates that reached it (37%), 537 of them as real-world. M3.7's 5% target is set per culture over 1,000 seeds, so the two don't compare directly; M3.7 revisits it.
6. **Name stability:** rebuilding `words.ts` renames everyone. Names aren't in the state hash, but once M6's share links show them, the table needs a version.
7. **Carried:**
   - the device timings for M0.5;
   - how wallets roll up into the households account, settled before M2.1's step plan;
   - the art licence, and whether the inspector chunk ships a licence notice;
   - the optional wall margin;
   - M8.6's country-count settings, the 2 ms render bar and regions per country;
   - the stale `images/roadmap.png`, the 83 blocked cells drawn as ground, and the stale mockups.

## Next

1. **I1:** run `git status`.
   - If I1's files are still uncommitted, run its Step 5 checks: the unit tests, the spec in chromium, firefox and webkit, G1, G3 and the startup gate. Then commit as in Step 6.
   - If its files are gone, run I1 from Step 1.
2. **C1:**
   - the Chromium budget spec's `move` row, beside B3's;
   - the reviews: `determinism-review` on `packages/sim-*`, `economy-review` on B1, `perf-check`, `code-reviewer` over all of M0.7, and `senior-qa` on `task.md`'s exit checks;
   - `graphify update .`, delete `.superpowers/m0.7/`, and fill in `milestone.md`'s cells;
   - checkpoint 0019, then the identity check, the push and CI.
3. **Map:**
   - The M8.1 lead writes the world-map contract and Part 2's step plan, ready for juniors, then M8.3's step plan. If that work is missing, brief `sim-engineer` on Opus to write them again.
   - Two Sonnet juniors take the port's tasks one at a time, and the lead reviews each one.
   - Then the place-name table, on its own seed through N3's `buildTable`, and 100 sample names for the owner.
4. Send the owner the 40 person names and the swatch sheet.

## How to verify

- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- `node packages/sim-core/scripts/engines.ts` ends `kernels 865 ok, goldens 3 ok`.
- `node tools/names/scripts/words.ts --check` exits 0.
- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0. During N3, with I1's work partly in the tree, `pnpm test` passed 423 tests in 68 files.
