---
checkpoint: 19
date: 2026-10-09
milestone: M0.7
status: done
based_on: 0efac06
next: M8.1 World generator Part 2 from Task 10 (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md), beside M8.3 Country and Region views from Task 1 (docs/plan/tasks/m8-country-map/m8.3-country-and-region-views/plan.md)
waiting_on: [owner: device timings on an Android phone and an iPhone (closes M0.5)]
---

# Checkpoint 0019: M0.7 done, the map under way

M0.7 Modules and blob facts is closed. Checkpoint 0018's Decisions and Open items still hold, except where this file settles them.

## State

- **M0.7:** every exit check passes.
  - Senior QA proved six of the seven here, and all of the seventh except Bun.
  - CI proved Bun's share of the five-engine goldens. On 66f13b8 the `CI`, `perf` and `stdlib` workflows all succeeded.
  - The code review found nothing critical. Its findings and QA's are fixed, or deferred in `plan.md`'s Open items.
- **Map:**
  - M8.1 Part 2 has a step plan (52edb63), and its Tasks 7, 8, 9 and 11 are committed.
  - M8.3 has a step plan (c79a364, e933788 and 166d2cf), and its Task 2 is committed.
  - Two tasks were in progress and uncommitted when this was written:
    - M8.1 Task 10: `eslint.config.js`, `.dependency-cruiser.cjs`, `packages/worldgen/test/lint.test.ts`, `test/depcruise.test.ts` and `test/fixtures/deps/`;
    - M8.3 Task 1: `tools/atlas/build_atlas.py`, `tools/atlas/test_atlas.py` and `apps/web/.size-limit.json`.
- **Pushes:**
  - An agent pushed `main` to 66f13b8 at 13:08 without being asked. Every pushed commit carries the no-reply address.
  - The five commits after it, and this checkpoint, go out next, after the identity check.

## Done since checkpoint 0018

- **I1, the inspector:** e8ffcef. A click shows a blob's name and wallet, in three browsers.
- **Review fixes:**
  - 39451bd: a chorded or second-pointer press never inspects, with browser cases for jitter, drags, chords and a second pointer;
  - 9801584 and 42061dd: two tests that couldn't fail now can;
  - e577df9: `money/` is a guarded folder in the culture wall, in both ESLint and dependency-cruiser;
  - 51ebbc5: `formatCents` moved into the inspector;
  - cd71010: the name scripts share one fetch helper;
  - 7c43552: a 56-word deny list, with a `denied` rule, and the rebuilt table;
  - e34f4af and 77c5b7c: the docs for these.
- **C1:**
  - b78df6f: the worldgen path references;
  - 2d6734e: `move`'s timings and the bytes at close;
  - 0efac06: the milestone row and the pace.
- **Bytes at close:**
  - initial JS 16,780 B of 17,000;
  - the inspector chunk 4,166 B, against 4.5 kB;
  - the camera input chunk 1,060 B, against 1.5 kB.
- **The pace:** M0.7 took about 235 minutes. M0 so far comes to 20–31 estimated days in about 771 minutes, or 25–39 minutes per estimated day.
- **The map:**
  - M8.1 Task 7, 5bec208: `COUNTRY` and `NAME` streams in `rng.py`;
  - Task 8, c02627f: goldens for 23 stages over 200 worlds;
  - Task 9, df3d640: the `worldgen` package, `isqrt` and the world-map codes;
  - Task 11, 66f13b8: grid helpers, the heap, keyed draws and the fold;
  - M8.3 Task 2, 0968aa8: the `./map` export and its camera, with the owner's colours in `map-colours.json`.

## Decisions

The owner, on 9 October 2026:

1. **Country colours:** the swatch sheet's suggested five, `#42F6FC`, `#0000E4`, `#600090`, `#CC36D8` and `#FC66FC`. `map-colours.json` holds them, read by both `render-gl` and `mapdraw.py`.

The agents' rulings, which the owner can overturn:

1. **M8.3's colour check** (166d2cf, M8.3 Rulings 11–13):
   - colour "families" are hue sectors;
   - the pair bar is 12, since no five colours in the free hues keep 20 apart;
   - distances use D65 Lab.
2. **`money/` is guarded,** because wallets are wealth.
3. **The deny list** (M0.7 Rulings 16 and 17) matches exactly.
   - It drops common words in the major Latin-script languages, and words that read as rude or slang, brands or franchises, faith terms or famous people.
   - Place names, real given names and surnames, and rare English words stay.
4. **Commits:** juniors stop before committing. The orchestrator checks each diff and commits it with the plan's message, shortened where the hook's 72-character limit requires.
5. **Order:** M8.3 Task 2 ran before M8.1 Task 10, and both ran after the `money/` guard, because all three edit `eslint.config.js`.

## Open

1. **CI on the next push:** confirm CI's `check`, `browser` and `bun` jobs, and perf's `compute` and `load` jobs. The deny list (7c43552) and M8.3 Task 2 haven't been through CI yet.
2. **Briefs forbid `git push`.** An agent pushed unasked. From now on, every brief names `git push` among the commands it must never run.
3. **M0.7's deferrals,** listed in its `plan.md`:
   - Canvas2D inspect names blobs past its 5,000-agent draw cap;
   - the `sim-protocol/src/shared/` folder name;
   - nested guarded folders;
   - `move` on the town map at 100k has about 5% headroom and no gate;
   - the a11y and perf specs flake under parallel load;
   - a failed inspector chunk load stays cached;
   - the deny list misses near misses of franchise names other than the Pokémon ones, such as `olmar`.
4. **The owner:**
   - the 40 fresh sample names are an optional read; `node tools/names/scripts/words.ts` prints them;
   - the map's phone-tier timings at M8.1 Task 31;
   - the 2 ms render bar, `MAP_FRAME_MS`, at M8.3 Task 13;
   - the snow tiles' review;
   - whether to sync the five colours into the shared doc's Countries tab.
5. **Carried from 0018:**
   - the wallet roll-up before M2.1;
   - the art licence and the inspector's licence notice;
   - the wall margin;
   - M8.6's country-count settings and regions per country;
   - the stale roadmap image, the 83 blocked cells and the mockups.

## Next

1. Push after the identity check, and confirm every workflow.
2. **M8.1:** commit Task 10, then Task 12, the golden harness and the falloff. Then Tasks 13 and 14 side by side, then 15–22 one at a time. The lead takes Task 23 after 22.
3. **M8.3:**
   - commit Task 1;
   - Tasks 3–6 need only M8.1 Task 9, which is done, so they run beside the ports, one or two at a time, minding shared files;
   - the lead takes Tasks 7–10 and 13–15 when their inputs land.

## How to verify

- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- `node packages/sim-core/scripts/engines.ts` ends `kernels 865 ok, goldens 3 ok`.
- `node tools/names/scripts/words.ts --check` exits 0.
- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0.
- `python tools/worldgen/test_worldgen.py` prints ok for every check.
- `python tools/worldgen/goldens.py --check --seeds 3` matches.
