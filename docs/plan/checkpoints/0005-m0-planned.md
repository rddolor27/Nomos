---
checkpoint: 5
date: 2026-10-08
milestone: planning
status: done
based_on: a26ecfb
next: owner review of the M0 plans, then build M0.1
waiting_on: [owner review of the M0 plans, owner answers to the open questions below]
---

# Checkpoint 0005: M0 fully planned

## State

Planning is complete enough to start building. There is still no product code.

| Plans | State |
| --- | --- |
| M0.1–M0.6 step plans | All committed and cross-checked against `interfaces.md`, about 196 KB in all |
| M1–M9 briefs (61) | All committed, but not yet fact-checked |

## Done since checkpoint 0004

- **M0.3 and M0.5 step plans** (0c960c9 and 084c905): agents wrote them before their usage ran out.
- **Reviews:** two review agents checked M0.2–M0.5 against their `task.md`, `interfaces.md` and the research, and fixed them in place (7be12a5, 1edd749, 3a3d560 and 6b99876). Their main finds:
  - **M0.2:**
    - the cash check let a ledger one cent off pass at 2^53, so it now sums exactly;
    - the `BigInt` lint exemption lands before the module that needs it.
  - **M0.3:**
    - a wrong round 4 citation;
    - the fixed-step loop could run 3 ticks after a stall, so it is now capped;
    - the spoilage rule sits behind one decision point.
  - **M0.4:**
    - `Ground` and `JOB_ITEMS` were used but never defined;
    - a shader fetched tiles by world pixel instead of by tile;
    - Canvas2D drew empty tiles transparent.
  - **M0.5:**
    - the atlas tried to pack whole sheets, but `houses.png` is 2,316 px wide, so it now packs frames;
    - the worker now waits for `resume` after `ready`.
- **M0.6 step plan** (c915769): 14 tasks, about 40 KB:
  - kernels and replay goldens in five engines;
  - the hot-path lint, and the generator and map lints;
  - the `sim-culture` package, and its wall in both ESLint and dependency-cruiser;
  - the relabel test;
  - the name lint with its real-world fixture, and the culture text lint;
  - `@nomos/bench` with the budget, allocation, ledger, byte and startup gates;
  - closing M0.
- **`interfaces.md`** (41e419a, c915769) now records every refinement:
  - `createWorld(seed, tier, ground?)`, `restoreWorld`, `Ground`, and `step(world, timer?)` with `SystemTimer` and `SYSTEM_NAMES`;
  - `ACTION_NAMES`, `JOB_ITEMS`, and `Tier` and `TIER_AGENTS` in `sim-protocol`;
  - the app's `checkpoint` request, `bindPageLifecycle`, the tick-0 snapshot and the wait for `resume`;
  - `pushSnapshot` releases buffers before returning;
  - `stateHashExcept` and `World.cultureUid`;
  - the `@nomos/sim-core/kernels` subpath;
  - `@nomos/names` at `tools/names`.

  Its rule now says a plan that refines an interface updates the file in the same commit. Code that changes an interface updates it in a separate docs commit, because code and docs never share a commit.

## Decisions

These are agent rulings, recorded in the plans; the owner can overturn any of them.

- **M0.3:** late spoilage defaults to `skip-expired`. The `one-pass-at-10k` option would fail M0.6's 0.35 ms slice gate.
- **M0.6:**
  - `sim-culture` imports only `@nomos/sim-core/kernels`;
  - every lint profile carries its own copy of the ESLint rule, so profiles stack;
  - the relabel test uses a 1,024-agent world;
  - CI runner times count as reference-machine times, unscaled;
  - the WASM size rule arms itself when the first WASM chunk appears (M6.2);
  - `below` becomes `(x >>> 0) % n`, which changes no value;
  - Wikidata fixture entries need at least 5 sitelinks.

## Open

Questions for the owner from the M0 reviews:
1. **Late spoilage:** keep `skip-expired` as the default? This is round 6's conflict (e).
2. **Map size:** 10,000 agents on the 48×28 capital map is about 10 per walkable tile; round 3 sized 10k for 256×256. Keep the small map for M0, or use a larger one?
3. **Device-tier check:** round 2's 1.5 ms, or the 13.3 ms tick budget? M0.5 uses 13.3 ms.
4. **Map values:** home capacities and shop hours in the M0.4 map are unsourced plan values.
5. **@stdlib at runtime:** whether sim code may call @stdlib waits on M0.2's CI probe.
6. **Package cycle:** `sim-core` and `sim-culture` form a pnpm workspace cycle. Accept it, or move the kernels into their own `sim-kernels` package?
7. **Initial JS:** it may already exceed the 12 KB stand-in limit. M0.6 stops and reports rather than raising the limit.
8. **Reference machine:** should the budget gate scale CI runner times to the reference machine?
9. **Text lint strictness:** it lets culture text describe customs only, never people. Is that too strict?

Other open items:
- the 25 decisions in the roadmap, and the repository licence;
- the values needing sign-off, and the shared-doc fixes, from checkpoint 0002;
- **fact-checking the 61 briefs:** still not done. Spot checks found four errors while writing them, and the M0 reviews found real errors in every plan, so expect some.

## Next

1. **Owner review:** the owner reviews the M0 plans and answers the questions above, starting with the M0.1 plan.
2. **Build M0.1** with the executing-plans skill, recording its Started, Done and Actual cells to measure the pace.
3. **Fact-check the briefs.** In parallel with building, or before M1, run `fact-checker` agents over the briefs, one per milestone group. They check every figure against `task.md` or its cited source, every cited section, and cross-brief names, fix errors in place, and commit per milestone.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: 11 known weak matches.
- Every relative link in `docs/plan/tasks/` resolves (146 files at this checkpoint).
