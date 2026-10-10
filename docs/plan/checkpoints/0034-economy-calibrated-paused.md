---
checkpoint: 34
date: 2026-10-10
milestone: M2.3
status: paused
based_on: 2da85d0
next: M2.3 Calibration and design runner, review fixes (docs/plan/tasks/m2-economy/m2.3-calibration-and-design-runner/plan.md), after the owner's restructure
waiting_on: [owner: the new project structure, testing and dev guidelines]
---

# Checkpoint 0034: economy calibrated, work paused for the owner's restructure

## State

On 10 October 2026, the owner paused all implementation to rework the project structure, testing and dev guidelines. Work was slow, and usage kept running out.

The economy (M2.1–M2.3) is built and calibrated, but runs only headless, in tests and the CLI. Nothing in the app uses it yet.

M2.3 is one fix short of closing, because its review found a critical bug (Open, item 1). The owner also made Nomos a proof of concept: browser tests run in Chromium only, and the process rules in the local `models.md` are lighter.

## Done since checkpoint 0033

[HANDOFF.md](../HANDOFF.md) has the details, under each item's date.
- **M2.1 Lengnick core and M2.2 Spawn and fold** closed, each with one QA pass.
  - M2.2's spawn takes about 31–34 ms at 100k agents, against a 35 ms row.
- **Town walkers** share one steering function with the sim, so they wander in any direction. The first screen draws Highcourt in the Town skin.
- **The allocation regression** from a530047 was fixed in 5a7da19, which closes item 7 of 0033's Open list.
- **M2.3** (d2cf7bf to 6abe0bb): all four tasks.
  - **Built:**
    - the flow log;
    - the target suite;
    - the city preset's exits, markup clamp and slow searchers;
    - the design runner on worker threads.
  - **`CITY`** was tuned on seeds 1–20 and confirmed once on 1001–1050:
    - all six tier-1 targets hold;
    - the tier-2 gaps are listed in its `task.md`.
  - **`burnInDays`** is 17,295, measured over 40,000 days.
  - **`interfaces.md`** was updated in d42972f.
- **Proof-of-concept mode:** Playwright and CI run Chromium only, and the Bun engine job is gone (3d92e2e).
- **Hashes:** the CLI hash is `746a06a3` (seed 42, phone, 1,000 ticks), and the economy golden is `6a652730`.

## Decisions

**Owner, 10 October 2026:**
1. Nomos is a proof of concept for now.
   - Browser tests run in Chromium, which covers Chrome and Brave. Firefox, WebKit and Bun return before launch.
   - Testing is lighter and agents are fewer, as the local `models.md` sets out.
2. All implementation stops until the owner's restructure.
3. Claude may settle open decisions itself, recording each as a ruling.

**The coordinator's rulings,** each with its reason in `HANDOFF.md` or M2.3's `plan.md`:
- **The pay-cut target** moves to tier 2 as a documented gap, since closed money can't reach it. Revisit it when M5 adds inflation.
- **The burn-in** comes from a 40,000-day run, because the 20,000-day run put the price truncation in its second half (Ruling 18).
- **No credit line:** Ruling 14's trigger is a median unemployment s.d. under 0.010, and the confirmation gave 0.0104.
- **Exits off in `CITY`** for the proof of concept, until entry is designed. Not yet applied: see Open, item 1.

## Open

1. **M2.3's critical bug, unfixed.**
   - **Cause:** a re-entered firm row can never get a customer, because `firmByWorkers` (`packages/sim-core/src/consumption/search.ts`) weights shops by workers, and shop search runs before job search.
   - **Effect:** the row hires, sells nothing and exits again, every month. On seed 1001, 98% of exits were repeats.
   - **The ruled fix:**
     1. Set `CITY.shortPayExitPpm` to 0.
     2. Re-check tier 1 on seeds 1–20.
     3. Re-measure the burn-in.
     4. Confirm once on seeds 2001–2050.
2. **Four minor review findings, unfixed:**
   - the spell counter: reset `spellMonths` in `labour/search.ts`'s `hire()`;
   - the `slowJobSearches` bound in `economy/params.ts`, which should apply only when `slowSearcherPpm > 0`;
   - `design --out` (`tools/cli/src/design/run.ts`), which should refuse a used folder;
   - Okun, measured on units sold in `tools/cli/src/targets/summarize.ts`, which should use units produced.
3. **Docs:**
   - M6.6's fairness line, which Ruling 3's fourth condition requires;
   - two notes for M2.3's `task.md`: job-to-job's cause, and that the markup and stock bands mostly test inputs.
4. **Byte order:** `design` writes its columns in the machine's byte order. `interfaces.md` records it as little-endian on x64 and arm64.
5. **The shared plan doc** still names five engines and the 2% pay cut. Updating it needs the owner.
6. **Still open from 0033,** items 1–6:
   - M3.1 Part 3's Tasks 12–16 and 19–21;
   - the designers' art calls;
   - the first screen's blob counts;
   - Part 3 in the shared doc;
   - CI time;
   - the sprites README.
7. **Backlog:**
   - `names-only-in-the-inspector` isn't `reachable`;
   - the atlas is fetched twice;
   - `fallback.spec` centres on the old map;
   - M0.8's leftovers;
   - the slow-searcher trait keys on the row index.

## Next

After the owner's restructure:
1. Apply Open items 1–3, which closes M2.3.
2. Put the economy on screen: jobs and wages in the inspector, a panel of prices, wages and unemployment, and recent trades.

There is no uncommitted state.

## How to verify

- `pnpm test && pnpm lint && pnpm typecheck`
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `746a06a3`.
- `ECONOMY_LONG=1 pnpm vitest run tools/cli/test/city-targets.test.ts` takes about 24 s.
