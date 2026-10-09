# M0.7 Modules and blob facts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every package's source sits in concern folders, held there by lints. A `Blob` handle reaches each world's rows, and every blob gets two facts, a wallet and a name, shown by a click-to-inspect panel.

**Architecture:** Part 1 moves each package's files with `git mv` and a tested rewrite script, one package a commit. It changes no behaviour, so seed 42's goldens prove it, and four lint changes then hold the layout. Part 2 adds the handle, made once per world in `layoutWorld`, then wallets in the cash ledger, a `nameKey` column, the inspect message and a lazy inspector panel. Names come from a build-time table of 1,024 words, drawn from one shared mixed sound set and filtered in `tools/names`.

**Tech Stack:** M0.1–M0.6's stack: Node 24, pnpm 10.12.1, TypeScript 6.0, Vitest 5, ESLint 10 with typescript-eslint, dependency-cruiser 18, Playwright, Vite 8 and size-limit. Bash and `git mv` for the move. Only the hand-run fixture scripts use the network: Wikidata's query service, and raw files from GitHub at pinned commits.

**Spec:** [task.md](task.md) and [interfaces.md](../interfaces.md): "Layout", "The world step", "Agents and the Blob handle", "Wallets", "Worker messages", "WorldRenderer" and "Culture". This plan replaces the brief of 9 October 2026. It keeps the brief's design and measurements, except where the owner changed the names later that day.

## Global Constraints

- **Git:** commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`.
  - Headers are `type(scope): description`, at most 72 characters, lowercase and imperative, with no trailing period.
  - The body's first line is `Task: M0.7 Modules and blob facts, task <ID>: <title>`, such as `Task: M0.7 Modules and blob facts, task M1: Move sim-core`.
  - Stage by path, keep `docs/` in commits of its own, and add no co-author. Never push, and never pass `--no-verify`.
- **Shell (the scope guard):** run every command from the repo root. Never put `..` in a shell command, and never write a file through a heredoc with a redirect. Make any edit whose text holds `../` with the Edit tool.
- **One working tree:** run one task at a time. Every gate reads the whole repo, so a task half done fails another task's gate.
- **Determinism (sim-core rules):**
  - every random number comes from the keyed draw, through `draw1`–`draw4` in per-tick code;
  - sim source uses no `Math.random`, transcendental `Math`, `**`, clocks or `sort`;
  - positions are Q8 in `Int32Array`s, and money is integer cents in `Float64Array`s;
  - only the day boundary writes canonical aggregate state.
- **Per-tick code allocates nothing:** no object or array literals, closures, `new`, spread, template literals, `for…of`, `for…in`, array callbacks, `slice`, `subarray`, strings, `Date` or `performance.now` in a per-tick function, method, getter or setter.
- **Layout (interfaces.md):** only entry files sit at `src/`, and every other file sits in one level of concern folders. A module imports another folder's module by path. In `sim-core`, only `consumption/` and `index.ts` reach `sim-culture`.
- **The handle (sim-core rules):**
  - code reaches a row through `world.blob` and `at(i)`, and each accessor carries its column's exact name;
  - `Blob` has no `look` and no culture accessor;
  - a per-tick loop calls no method per blob but `at`;
  - a class holds column references and scratch only, never a canonical value, and inherits nothing.
- **Invariants:** all accounts plus MINT sum to zero after every tick in tests, the CLI, CI's ledger gate and development builds.
- **Web rules:** no React, PixiJS or Phaser. Panels are vanilla TypeScript, made once per page. The inspector loads on demand, and only `apps/web/src/panels/inspector.ts` imports `@nomos/sim-culture`. Every built chunk has a size-limit entry.
- **Content rules:**
  - a blob's name and wallet show only in the inspector;
  - no rule reads a look, and culture code stays out of guarded folders;
  - "Pokémon" and "Poké-" never appear in identifiers, file names, strings or comments outside `docs/` and the fixture lists. They appear in no non-Markdown file under `tools/`, which the name scan reads, fixture headers and notices included.
- **Licences:**
  - Wikidata items are CC0, and `LICENSE-wikidata.txt` exists;
  - LDNOOBW is CC BY 4.0: its licence goes in verbatim, with N1's attribution;
  - Fantasy Map Generator (FMG) is MIT with one added paragraph: its licence goes verbatim beside anything derived from it, crediting Azgaar, Dopu and Avengium;
  - never the pret decompilations or PokéAPI.
- **Budgets (Performance budget):**
  - `move` 0.10, 0.25 and 0.8 ms RM a tick at 10k, 25k and 100k; the worst day slice 0.35 ms RM; snapshots 0.1, 0.2 and 0.6 ms RM;
  - 0 scavenges, and at most 16,384 young-generation bytes a day;
  - initial JS at most 17 kB brotli (the owner's M0 stand-in) and 35 kB; at most 100 kB before the first frame;
  - first frame within 1.5 s and interactive within 2.0 s on the startup gate.
- **Code rules:** comment only the why, never use `eslint-disable`, and split any function that trips the complexity or depth limit.
- **Owner decisions of 9 October 2026:**
  - wallets open with 100,000 cents;
  - per-tick loops use the handle's accessors, and a loop more than 10% slower keeps its columns;
  - one mixed name style serves everyone, and round 8's trigram screen is dropped.

## Gates

A task names the gates it runs, and a gate passes only as written here.

- **G1, every task:** `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0.
- **G2, replay:**
  - `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `seed=42 tier=phone tick=1000 hash=` and the `42/phone` hash in `packages/sim-core/test/fixtures/goldens.json`. It was `caae4f61` until B1 moved it to `ba8c436c`, and B6 moves it again;
  - `node packages/sim-core/scripts/engines.ts` ends `kernels 865 ok, goldens 3 ok`.
- **G3, bytes,** for any change to a package the page bundles (`sim-core`, `sim-protocol`, `sim-worker`, `sim-culture`, `render-gl` or `apps/web`):
  1. `pnpm --filter @nomos/web build`;
  2. `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`;
  3. `pnpm --filter @nomos/web size`: every entry passes;
  4. `node tools/bench/src/chunks.ts`: the last line is `0 ungated chunks`.

  Report "Initial JS, M0 stand-in". It measured 16.74 kB of 17 kB on 9 October.
- **G4, compute,** for per-tick code: `pnpm --filter @nomos/bench budget` and `pnpm --filter @nomos/bench alloc` pass, with 0 scavenges at every tier.
- **G5, browsers,** after the goldens move: `pnpm exec playwright test packages/sim-core/test/browser/engines.spec.ts` passes in chromium, firefox and webkit.
- **G6, ledger,** for money: `for tier in phone phone-plus desktop; do node tools/cli/src/main.ts --seed 7 --tier "$tier" --ticks 2880; done` prints three lines and exits 0.

## Task order

| ID | Task | Who | Shared files it edits |
| --- | --- | --- | --- |
| M1 | Move `sim-core`, then split `world.ts` | Junior | `eslint.config.js` |
| M2 | Move `sim-protocol` | Junior | `eslint.config.js`, `sim-core`'s `lint.test.ts` |
| M3 | Move `sim-worker` | Junior | none |
| M4 | Move `sim-culture` | Junior | none |
| M5 | Move `render-gl` | Junior | `tools/sprites/test_skin_a.py` |
| M6 | Move the web app | Junior | none |
| M7 | Move `bench` | Junior | `apps/web`'s `startup.spec.ts` |
| M8 | Move `names` | Junior | none |
| L1 | The layout lint | Senior | `eslint.config.js`, `lint.test.ts` |
| L2 | Hot folders, and class methods, getters and setters | Senior | `eslint.config.js`, `lint.test.ts` |
| L3 | Culture stays in consumption; names stay in the inspector | Senior | `.dependency-cruiser.cjs` |
| L4 | `erasableSyntaxOnly` | Senior | `tsconfig.base.json` |
| V1 | Load the view input after the first frame | Junior | `apps/web/.size-limit.json` |
| B1 | Wallets | Junior | `goldens.json` |
| B2 | The `Blob` handle | Junior | none |
| B3 | The handle A/B | Senior | none; it commits nothing |
| B4 | Per-tick loops through the handle | Junior, from B4's code | `interfaces.md` (docs commit) |
| B5 | The checks flag | Junior | none |
| B6 | Name keys | Junior | `goldens.json` |
| B7 | The nearest blob and the inspect message | Junior | none |
| B8 | `worldAt` | Junior | none |
| N1 | The person-name filter and its fixtures | Senior | `tools/names/fixtures/sources.json` |
| N2 | The mixed sound set | Senior | `tools/names/package.json`, the lockfile, `sources.json` |
| N3 | The name table and `personName` | Junior | none |
| I1 | The inspector | Senior | `apps/web/package.json`, the lockfile, `.size-limit.json` |
| C1 | Close | Orchestrator, with the senior | `milestone.md`, a checkpoint |

- **Run every task in this order, one at a time.**
  - M1 and M2 share `eslint.config.js` and `lint.test.ts`, as do L1 and L2.
  - By files, M3–M8 touch disjoint sets, and so do N1–N3 and B5–B8. But in one working tree every gate reads the whole repo, and B3's timing needs a quiet machine. `main` takes no feature branches, so no task gets a worktree of its own.
  - Work outside these files runs alongside: the senior in `tools/worldgen`, whose two path references C1 updates once that work lands.
- **Juniors** get exact steps: the moves, V1, B1, B2, B4–B8 and N3. **Seniors** take the lints, the A/B, the fixtures, the sound set and the inspector, and review each junior's diff before the next task starts.

## Review Focus

1. **A short drag or a jittery tap:** a pointer that moves under 4 CSS px between down and up is a click and inspects. One that moves 4 px or more pans and never inspects, and a second pointer or another button never inspects. I1 tests both distances and a right-button click.
2. **Zoom and pixel density:** at zoom 2 on a 2× screen, a click still finds the blob drawn under it. I1's spec runs one case at `deviceScaleFactor: 2` after one zoom step.
3. **Money on screen:** a wallet shows exact cents: 100,000 as `1,000.00`, 5 as `0.05`, −250 as `-2.50` (M2 brings debt) and 123,456,789 as `1,234,567.89`. I1 tests `formatCents`.
4. **A restored world:** after `restoreWorld`, `world.blob` reads the restored rows, never another world's. B2 tests it.
5. **Inspect at an odd moment:** before `init` the worker ignores it; while a run plays, the answer carries the current tick; far off the map, the answer is agent −1. B7 tests all three.

---

## Part 1: the move

Every move task follows these steps:

1. If `.superpowers/m0.7/move.sh` is missing, save [Appendix A](#appendix-a-movesh) there with the Write tool. `.superpowers/` is gitignored.
2. Run `bash .superpowers/m0.7/move.sh <package>`. It git-moves the files, then rewrites every relative specifier that named one, and prints `git status --short`: an `R` line per moved file and an `M` line per other rewritten file, nothing else.
   - The script was proven on a copy of the tree on 9 October. Its 79 moves and 305 rewritten specifiers, plus the three hand edits below, left no specifier unresolved.
   - It rewrites only files that name a moved file, so other files keep their line endings.
3. Make the task's hand edits.
4. Run the gates. A failure means a hand edit is missing or wrong; never patch the script's rewrites by guesswork.
5. Commit.

The import lists the script leaves are no longer alphabetical. No lint orders imports, so leave them as they are.

### Task M1: Move `sim-core` (junior)

**Files:** `packages/sim-core/{src,test,scripts}`, `eslint.config.js`.

**Moves** (Appendix A, `sim-core`):
- `random/`: `draw`, `noise`, `streams`; `maths/`: `int`, `log2`, `tables`, `apportion`, `split`; `time/`: `calendar`, `day-length`;
- `memory/`: `arena` (was `memory.ts`), `tiers`; `agents/`: `store`, `actions`;
- `money/`: `ledger`, `ppm` (was `money.ts`), `claims`, `registry`, `invariants`, `flows`, `histogram`;
- `world/`: `world`, `ground`, `inputs`, `space`; `day/`: `day`, `slices`, `stride`; `movement/`: `wander`, `walk`; `step/`: `step`, `warm`.

`index.ts`, `kernels.ts` and `consumption/stand-in.ts` stay. The script also rewrites the real-file path strings in `test/lint.test.ts` and `test/culture-wall.test.ts`, and the output paths in `scripts/tables.ts` and `scripts/day-length.ts`.

**Interfaces:** Produces the Layout's `sim-core` paths. Exports don't change.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh sim-core`. Expected: 32 `R` lines. `M` lines for `scripts/{day-length,goldens,stdlib-probe,tables}.ts`, `src/{index,kernels}.ts`, `src/consumption/stand-in.ts`, `test/run.ts`, `test/engines/checks.ts` and 25 `test/*.test.ts` files.
- [ ] **Step 2: Hand edits.**
  - In `eslint.config.js`:
    - in `UNREAD_LOOK`, `only src/store.ts writes it` becomes `only agents/store.ts writes it`;
    - `GENERATOR_FILES`' first glob becomes `'packages/sim-core/src/random/{draw,noise}.ts'`;
    - the three exemption blocks' `files` become `agents/store.ts`, `money/ppm.ts` and `maths/apportion.ts` under `packages/sim-core/src/`;
    - `HOT_FILES` becomes the list below, the same 22 `sim-core` files at their new paths.

      ```js
      const HOT_FILES = [
        'packages/sim-core/src/world/{world,ground,inputs,space}.ts',
        'packages/sim-core/src/movement/{wander,walk}.ts',
        'packages/sim-core/src/step/step.ts',
        'packages/sim-core/src/day/{day,slices,stride}.ts',
        'packages/sim-core/src/money/{ledger,ppm,claims,registry,flows,invariants,histogram}.ts',
        'packages/sim-core/src/maths/{int,split,log2}.ts',
        'packages/sim-core/src/time/calendar.ts',
        'packages/sim-core/src/agents/store.ts',
        'packages/sim-protocol/src/{snapshot,visual}.ts',
      ];
      ```
  - In `packages/sim-core/test/lint.test.ts`, `['src/split.ts', 'src/apportion-big.ts', 'src/apportion/inner.ts']` becomes `['src/maths/split.ts', 'src/maths/apportion-big.ts', 'src/maths/apportion/inner.ts']`.
  - In `packages/sim-core/scripts/day-length.ts`, the comment `// src/calendar.ts imports` becomes `// src/time/calendar.ts imports`.
- [ ] **Step 3:** `pnpm --filter @nomos/sim-core tables`, then `git diff --exit-code packages/sim-core/src/maths/tables.ts packages/sim-core/src/time/day-length.ts` exits 0: the generators write where the tables now live, and write the same tables.
- [ ] **Step 4:** G1, G2 and G3 pass.
- [ ] **Step 5:** `git add packages/sim-core eslint.config.js`, then commit `refactor(sim-core): move source into concern folders`.
- [ ] **Step 6: Split checkpoints out of `world/world.ts`.**
  - Create `world/checkpoint.ts`, holding `NO_SKIP`, `stateHash`, `stateHashExcept`, `startsAView`, `checkpoint` and `restoreWorld`, moved verbatim with their comments. It imports `mix` from `../random/draw.ts`, `TIER_AGENTS`, `TIER_MEMORY_BYTES` and `type Tier` from `../memory/tiers.ts`, `type Ground` from `./ground.ts`, and `layoutWorld` and `type World` from `./world.ts`.
  - `world/world.ts` drops them, and `mix` from its draw import.
  - `src/index.ts` adds `export * from './world/checkpoint.ts';` after its `world/world.ts` line.
  - Six test files take `checkpoint`, `restoreWorld` and `stateHash` from `world/checkpoint.ts` instead of `world/world.ts`: `test/{day,ground,slices,warm,world}.test.ts` and `test/engines/checks.ts`.
  - In `eslint.config.js`, `'packages/sim-core/src/world/{world,ground,inputs,space}.ts'` becomes `'packages/sim-core/src/world/{world,checkpoint,ground,inputs,space}.ts'`.
- [ ] **Step 7:** G1 and G2 pass.
- [ ] **Step 8:** Commit `refactor(sim-core): split checkpoints out of world.ts`.

### Task M2: Move `sim-protocol` (junior)

**Moves:** `snapshot/`: `snapshot`, `visual`, `jobs`; `messages/`: `messages`, `lifecycle`; `map/`: `map`; `sprites/`: `sprite-manifest`; `shared/`: `calendar`, `columns`. `index.ts` stays.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh sim-protocol`. Expected: 9 `R` lines, and `M` lines for `scripts/manifest-types.ts`, `src/index.ts` and `test/sprite-manifest.test.ts`.
- [ ] **Step 2: Hand edits.**
  - In `eslint.config.js`:
    - `'packages/sim-protocol/src/{snapshot,visual}.ts'` becomes `'packages/sim-protocol/src/snapshot/{snapshot,visual}.ts'`;
    - in `GENERATOR_FILES`, `'packages/sim-protocol/src/map.ts'` becomes `'packages/sim-protocol/src/map/map.ts'`.
  - In `packages/sim-core/test/lint.test.ts`, all three `'packages/sim-protocol/src/map.ts'` become `'packages/sim-protocol/src/map/map.ts'`.
  - In `packages/sim-protocol/test/map.test.ts`, the comment's `src/map.ts` becomes `src/map/map.ts`.
  - `tools/worldgen/mapfile.py` and `tools/worldgen/README.md` name `map.ts` too. Another senior works in that folder, so C1 updates both.
- [ ] **Step 3:** `pnpm --filter @nomos/sim-protocol types`, then `git diff --exit-code packages/sim-protocol/src/sprites/sprite-manifest.ts` exits 0.
- [ ] **Step 4:** G1, G2 and G3 pass.
- [ ] **Step 5:** `git add packages/sim-protocol packages/sim-core/test/lint.test.ts eslint.config.js`, then commit `refactor(sim-protocol): move source into concern folders`.

### Task M3: Move `sim-worker` (junior)

**Moves:** `loop/loop.ts`. `index.ts` and `worker.ts`, the `./worker` export, stay.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh sim-worker`. Expected: one `R` line, and `M` lines for `src/index.ts` and `src/worker.ts`. There are no hand edits.
- [ ] **Step 2:** G1, G2 and G3 pass.
- [ ] **Step 3:** Commit `refactor(sim-worker): move the loop into its own folder`.

### Task M4: Move `sim-culture` (junior)

**Moves:** `festivals/festivals.ts` and `relabel/relabel.ts`. `index.ts` stays.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh sim-culture`. Expected: two `R` lines and an `M` line for `src/index.ts`. There are no hand edits.
- [ ] **Step 2:** G1 and G3 pass.
- [ ] **Step 3:** Commit `refactor(sim-culture): move source into concern folders`.

### Task M5: Move `render-gl` (junior)

**Moves:** `renderer/`: `renderer`, `types`; `backends/`: `webgl`, `canvas2d`; `camera/`: `camera`, `device-size`; `skins/`: `skin`, `skin-toggle`; `dots/`: `dots`, `colour`, `minimap`, `skin-a.json`. `index.ts` stays. `test/golden/skin-a.json` is a different file and keeps its path.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh render-gl`. Expected: 12 `R` lines, and `M` lines for `src/index.ts`, `test/{camera,dots,palette,skin}.test.ts` and `test/browser/{golden,perf}.spec.ts`.
- [ ] **Step 2: Hand edits** in `tools/sprites/test_skin_a.py`: the docstring's `packages/render-gl/src/skin-a.json` becomes `packages/render-gl/src/dots/skin-a.json`, and `SKIN_A` gains `/ 'dots'` before `/ 'skin-a.json'`.
- [ ] **Step 3:** G1 and G3 pass, `python tools/sprites/test_skin_a.py` passes, and `pnpm exec playwright test packages/render-gl/test/browser --project=chromium` passes.
- [ ] **Step 4:** `git add packages/render-gl tools/sprites/test_skin_a.py`, then commit `refactor(render-gl): move source into concern folders`.

### Task M6: Move the web app (junior)

**Moves:** `app/`: `app`, `boot`, `lifecycle`, `query`, `tiers`; `view/`: `camera-input`; `panels/`: `hud`, `charts`, `controls`. `main.ts` stays. The script rewrites its static imports and its lazy `import('./charts.ts')` and `import('./controls.ts')`.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh web`. Expected: 9 `R` lines, and `M` lines for `src/main.ts` and `test/{charts,controls,hud,query,tiers}.test.ts`.
- [ ] **Step 2: Hand edit,** with the Edit tool: in `apps/web/src/app/boot.ts`, `'../../../assets/maps/town.nmap?url'` becomes `'../../../../assets/maps/town.nmap?url'`.
- [ ] **Step 3:** G1 and G3 pass. Lazy chunks keep their file names, so `charts-*.js` and `controls-*.js` stay gated. `pnpm exec playwright test apps/web/test/browser --project=chromium` passes.
- [ ] **Step 4:** Commit `refactor(web): move source into concern folders`.

### Task M7: Move `bench` (junior)

**Moves:** `compute/`: `allocation`, `budgets`, `judge`, `sample`, `serve-isolated`; `machine/`: `benchmark-index`, `LICENSE-lighthouse.txt`, `loadavg`. The six entries stay: `alloc`, `assert-startup`, `browser-entry`, `budget`, `calibrate` and `chunks`. The script also rewrites `apps/web/test/browser/startup.spec.ts`'s deep import `@nomos/bench/src/loadavg.ts`.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh bench`. Expected: 8 `R` lines, and `M` lines for `src/{alloc,browser-entry,budget,calibrate}.ts`, `test/{alloc,judge,sample}.test.ts`, `test/browser/budget.spec.ts` and `apps/web/test/browser/startup.spec.ts`. There are no hand edits.
- [ ] **Step 2:** G1 and G4 pass. `node tools/bench/src/calibrate.ts` prints its two `KEY=value` lines, and `node tools/bench/src/chunks.ts` ends `0 ungated chunks`.
- [ ] **Step 3:** `git add tools/bench apps/web/test/browser/startup.spec.ts`, then commit `refactor(bench): move source into concern folders`.

### Task M8: Move `names` (junior)

**Moves:** `text/`: `fold`, `edit`; `filters/`: `franchise`, `real-world`; `lints/`: `culture-text`, `scan`. `cli.ts` stays. `tools/cli` moves nothing, because its one file is its entry.

- [ ] **Step 1:** `bash .superpowers/m0.7/move.sh names`. Expected: 6 `R` lines, and `M` lines for `src/cli.ts`, `scripts/build-real-world.ts` and `test/{culture-text,franchise,real-world}.test.ts`.
- [ ] **Step 2: Hand edit,** with the Edit tool: in `tools/names/src/filters/real-world.ts`, `new URL('../fixtures/', import.meta.url)` becomes `new URL('../../fixtures/', import.meta.url)`.
- [ ] **Step 3:** G1 passes. `pnpm names` runs the moved scan, and `real-world.test.ts` reads the fixtures through `FIXTURES`.
- [ ] **Step 4:** Commit `refactor(names): move source into concern folders`, then run `graphify update .`.

## Part 1b: the lints that hold the layout

The selectors and globs below were proven on 9 October with ESLint's `Linter`: 17 class cases and 27 path cases. The dependency-cruiser rules were proven on a copy of the wall fixture.

### Task L1: The layout lint (senior)

**Files:** `eslint.config.js`, `packages/sim-core/test/lint.test.ts`.

**Interfaces:** Produces the profile `layout/no-restricted-syntax`, which reports the `Program` of any `{packages,apps,tools}/*/src/*.ts` that is not an entry.

- [ ] **Step 1: Move the plants at `src/`.** `PROFILE_RULE` counts every `*/no-restricted-syntax`, so the layout profile would count wherever a profile test plants a file at a package's `src/`. In `lint.test.ts`:
  - `packages/sim-core/src/planted.ts` becomes `packages/sim-core/src/memory/planted.ts` everywhere. `memory/` is neither hot nor generator code;
  - the `sim-protocol` and `sim-worker` loop over `` `packages/${pkg}/src/planted.ts` `` becomes a loop over `packages/sim-protocol/src/messages/planted.ts` and `packages/sim-worker/src/loop/planted.ts`;
  - `packages/sim-protocol/src/planted.ts` becomes `.../messages/planted.ts`, and `packages/sim-culture/src/planted.ts` becomes `.../festivals/planted.ts`.

  `culture-wall.test.ts` and `apps/web/test/frameworks.test.ts` filter by rule id, so their plants stay.
- [ ] **Step 2: Write the failing tests.**

  ```ts
  const ENTRIES = [
    ...['sim-core', 'sim-protocol', 'sim-worker', 'sim-culture', 'render-gl'].map((pkg) => `packages/${pkg}/src/index.ts`),
    'packages/sim-core/src/kernels.ts',
    'packages/sim-worker/src/worker.ts',
    'apps/web/src/main.ts',
    'tools/cli/src/main.ts',
    ...['alloc', 'assert-startup', 'browser-entry', 'budget', 'calibrate', 'chunks'].map((f) => `tools/bench/src/${f}.ts`),
    'tools/names/src/cli.ts',
  ];
  // in describe('the layout lint', { timeout: 30_000 }):
  //   'reports any file at src/ that is no entry': 'export const a = 1;\n' at packages/sim-core/src/planted.ts,
  //     packages/render-gl/src/planted.ts, apps/web/src/planted.ts, tools/bench/src/planted.ts and
  //     tools/names/src/planted.ts gives exactly one message whose ruleId is 'layout/no-restricted-syntax'.
  //   'spares concern folders and entries': packages/sim-core/src/money/planted.ts, apps/web/src/panels/planted.ts
  //     and every ENTRIES path give none.
  ```
- [ ] **Step 3:** `pnpm vitest run packages/sim-core/test/lint.test.ts`. Expected: the two layout tests fail, and the rest pass.
- [ ] **Step 4: Implement.** Add this beside the other constants, and its block at the end of `defineConfig`:

  ```js
  const LAYOUT = 'interfaces.md, Layout: only entry files sit directly in src/, so put this file in a concern folder.';
  // Each package's exports, and what package scripts, CI and tests run or bundle by path (interfaces.md, Layout).
  const ENTRY_FILES = [
    'packages/*/src/index.ts',
    'packages/sim-core/src/kernels.ts',
    'packages/sim-worker/src/worker.ts',
    'apps/web/src/main.ts',
    'tools/cli/src/main.ts',
    'tools/bench/src/{alloc,assert-startup,browser-entry,budget,calibrate,chunks}.ts',
    'tools/names/src/cli.ts',
  ];
  // ...
    {
      // Its own copy of the core rule, so this ban stacks on the other profiles' instead of replacing them.
      files: ['{packages,apps,tools}/*/src/*.ts'],
      ignores: ENTRY_FILES,
      plugins: { layout: { rules: { 'no-restricted-syntax': builtinRules.get('no-restricted-syntax') } } },
      rules: { 'layout/no-restricted-syntax': ['error', { selector: 'Program', message: LAYOUT }] },
    },
  ```
- [ ] **Step 5:** The tests pass, and G1 passes: no file but an entry sits at any `src/`.
- [ ] **Step 6:** Commit `build: lint that only entry files sit directly in src`.

### Task L2: Hot folders, and class methods, getters and setters (senior)

**Files:** `eslint.config.js`, `packages/sim-core/test/lint.test.ts`.

**Interfaces:** Produces hot folders: every `sim-core` concern folder but `random/` and `memory/`, and `sim-protocol`'s `snapshot/`. `maths/apportion.ts` and `step/warm.ts` stay out. A new concern folder is hot from its first file, and cold code says so with a `COLD` name.

- [ ] **Step 1: Write the failing tests** in `describe('the hot-path lint')`, with `HOT_CLASS = 'packages/sim-core/src/agents/planted.ts'`:
  - `checks every method, getter and setter in a hot folder`: each `HOT_PLANTS` entry inside `` `export class Planted {\n  tick(a: Int32Array): void {\n    ${plant};\n  }\n}\n` `` gets `profileMessageCount` > 0, as in the hot-function test, since the sim profile catches the `BigInt` and `Math` plants. A getter `get value(): number { return [1].length; }`, a setter `set value(v: number) { g([v]); }` and `static tick(): void { g([1]); }` each get `hotMessageCount` > 0;
  - `allows constructors, cold methods and plain fields`: `constructor() { this.s = new Int32Array(4); g([1]); }`, `createScratch(): Int32Array { return new Int32Array(4); }` and the fields `private row = 0; private readonly s = new Int32Array(4);` get 0;
  - `rejects function-valued fields`: `tick = (a: Int32Array) => a[0];` and `tick = function (a: Int32Array) { return a[0]; };` get > 0;
  - `makes every sim-core folder hot but random/ and memory/`: `inTick('g([1])')` gets > 0 at `crime/planted.ts`, `consumption/planted.ts` and `money/planted.ts` under `packages/sim-core/src/`, and at `packages/sim-protocol/src/snapshot/planted.ts`. It gets 0 at `random/planted.ts`, `memory/planted.ts`, `maths/apportion.ts` and `step/warm.ts`, and at `packages/sim-protocol/src/messages/planted.ts`.
- [ ] **Step 2:** `pnpm vitest run packages/sim-core/test/lint.test.ts`. Expected: the four new tests fail.
- [ ] **Step 3: Implement.** `HOT_FILES` and its comment give way to:

  ```js
  // Every sim-core concern folder is per-tick code by default, so a new one is linted from its first file, and cold code
  // says so with a COLD name. random/ (the variadic draw and below serve non-tick code), memory/ (take makes the views at
  // creation), apportion.ts (BigInt, R4) and warm.ts (a throwaway world) never run per tick.
  const HOT_FOLDERS = ['packages/sim-core/src/*/**/*.ts', 'packages/sim-protocol/src/snapshot/**/*.ts'];
  const NOT_HOT = [
    'packages/sim-core/src/{random,memory}/**',
    'packages/sim-core/src/maths/apportion.ts',
    'packages/sim-core/src/step/warm.ts',
  ];
  ```

  The other changes:
  - `IN_HOT` becomes `` `:matches(FunctionDeclaration:not([id.name=${COLD}]), MethodDefinition:not([kind='constructor']):not([key.name=${COLD}]) > FunctionExpression)` ``. A constructor runs once per world, so it may allocate.
  - The last `HOT_SYNTAX` selector's parents gain `PropertyDefinition`: `':matches(VariableDeclarator, Property, PropertyDefinition, ExportDefaultDeclaration, AssignmentExpression) > :matches(ArrowFunctionExpression, FunctionExpression)'`. Its message becomes `'sim-core rules, Hot paths: declare functions in hot files with function or as class methods, so the hot-path lint sees them.'`
  - The hot block's `files: HOT_FILES` becomes `files: HOT_FOLDERS, ignores: NOT_HOT`.
- [ ] **Step 4:** The tests pass, and G1 passes. The newly hot files allocate only in `COLD` functions, so the real tree lints clean: `consumption/stand-in.ts`, `world/checkpoint.ts`, `agents/actions.ts`, `time/day-length.ts`, `maths/tables.ts` and `snapshot/jobs.ts`. If one doesn't, report it rather than widen `COLD`.
- [ ] **Step 5:** Commit `build(sim-core): lint hot folders and their class methods`.

### Task L3: Culture stays in consumption; names stay in the inspector (senior)

**Files:** `.dependency-cruiser.cjs`, `packages/sim-core/test/depcruise.test.ts`, and three new files under `packages/sim-core/test/fixtures/wall/`.

**Interfaces:** Produces the rules `culture-stays-in-consumption` and `names-only-in-the-inspector`.

- [ ] **Step 1: Add the fixtures** with the Write tool, since their text holds `../`, all under `packages/sim-core/test/fixtures/wall/`:
  - `packages/sim-core/src/agents/barrel.ts`: `export * from '../index.ts';`
  - `apps/web/src/panels/inspector.ts` and `apps/web/src/panels/hud.ts`: `import '../../../../packages/sim-culture/src/index.ts';`
- [ ] **Step 2: Write the failing test.** `cruiseFrom` cruises `['packages', 'apps']`. A new test, `keeps culture in consumption and names in the inspector`, expects these sources from the wall:
  - for `culture-stays-in-consumption`, under `packages/sim-core/src/`: `agents/barrel.ts`, `crime/direct.ts`, `housing/barrel.ts`, `kernels.ts`, `labour/value.ts`, `police/inline-type.ts`, `util/helpers.ts`, `wages/offer.ts` and `world.ts`, sorted;
  - for `names-only-in-the-inspector`: `apps/web/src/panels/hud.ts`.

  The existing expectations stay.
- [ ] **Step 3:** `pnpm vitest run packages/sim-core/test/depcruise.test.ts`. Expected: the new test fails.
- [ ] **Step 4: Implement.** Add after `culture-wall`:

  ```js
  {
    name: 'culture-stays-in-consumption',
    comment: 'R8: in sim-core only consumption/ and the barrel may reach sim-culture, so guarded code may import any other folder.',
    severity: 'error',
    from: { path: '^packages/sim-core/src/', pathNot: '^packages/sim-core/src/(consumption/|index\\.ts$)' },
    to: { path: '^packages/sim-culture/', reachable: true },
  },
  {
    name: 'names-only-in-the-inspector',
    comment: 'R8, content rule 5: names reach the page only through the inspector, which loads on demand.',
    severity: 'error',
    from: { path: '^apps/web/src/', pathNot: '^apps/web/src/panels/inspector\\.ts$' },
    to: { path: '^packages/sim-culture/' },
  },
  ```

  The page rule lives here, not in ESLint, because a second `no-restricted-imports` block for `apps/` would replace the framework ban's options.
- [ ] **Step 5:** The tests pass, `passes the real tree` included, and G1 passes.
- [ ] **Step 6:** Commit `build: keep culture in consumption and names in the inspector`.

### Task L4: `erasableSyntaxOnly` (senior)

**Files:** `tsconfig.base.json`.

- [ ] **Step 1:** Add `"erasableSyntaxOnly": true` after `"verbatimModuleSyntax": true`. Node runs `.ts` files by stripping types, and it rejects enums and parameter properties only when the file runs.
- [ ] **Step 2: Prove it bites.** Write `packages/sim-core/src/memory/planted.ts` holding `export enum Planted { A }`. `pnpm --filter @nomos/sim-core typecheck` fails on it. Delete the file.
- [ ] **Step 3:** G1 passes.
- [ ] **Step 4:** Commit `build: allow only erasable TypeScript syntax`.

## Part 2: blob facts

### Task V1: Load the view input after the first frame (junior)

Initial JS has 260 B of headroom under the 17 kB stand-in, and part 2 adds about 550 B to the worker chunk (estimate: the handle alone is 307 B brotli, minified on its own). The view input is already bound only after the first frame. Loading it lazily frees about 500–680 B: it is 683 B brotli on its own, measured here.

**Files:** `apps/web/src/main.ts`, `apps/web/.size-limit.json`, `apps/web/test/browser/after-first-frame.spec.ts`, `apps/web/test/browser/hud.spec.ts`.

- [ ] **Step 1: Write the failing tests.**
  - In `loads uPlot and lil-gui after the first frame`, add `cameraInput: startsOf(/^\/assets\/camera-input-[\w-]+\.js$/)`, and expect it to have length 1 and to start no earlier than `firstFrame`.
  - In `hud.spec.ts`'s `zooms and pans`, wait for the binding right after `open(page)`: `await expect(view).toHaveAttribute('aria-label', /arrow keys pan/);`. Declare `view` above that line.
- [ ] **Step 2:** `pnpm exec playwright test apps/web/test/browser/after-first-frame.spec.ts --project=chromium` fails.
- [ ] **Step 3: Implement** in `main.ts`. Drop the static `bindCameraInput` import. In `afterFirstFrame`, start `import('./view/camera-input.ts')` together with the charts and controls imports, and mount the HUD. Then bind the view input, from `await` on that module, before the first `nextTask()`.
- [ ] **Step 4:** Build. After "Controls chunk", add `{ "name": "Camera input chunk", "path": ["dist/assets/camera-input-*.js"], "limit": "<its brotli size from size-limit, rounded up to the next 0.5 kB>" }`.
- [ ] **Step 5: Run the checks.**
  - The spec passes, and `pnpm exec playwright test apps/web/test/browser` passes in all three browsers.
  - G1 and G3 pass. Record "Initial JS, M0 stand-in" before and after: it falls.
- [ ] **Step 6: Run the startup gate here.**
  1. `pnpm --filter @nomos/web build`;
  2. `node tools/bench/src/calibrate.ts`;
  3. `CPU_RATE=<rate> BENCHMARK_INDEX=<index> pnpm --filter @nomos/web startup`, with the values step 2 printed.

  The medians stay within 1,500 and 2,000 ms. They were about 1,370 and 1,750 ms here at rate 8.5 on 9 October.
- [ ] **Step 7:** Commit `perf(web): load the view input after the first frame`.

### Task B1: Wallets (junior)

**Files:** `packages/sim-core/src/money/ledger.ts`, `src/world/world.ts`, `test/{ledger,world,claims,flows,registry}.test.ts`, `test/fixtures/goldens.json`.

**Interfaces:** Produces:
- `createLedger(arena: Arena, settlements: number, wallets: number): Ledger`;
- `Ledger.firstWallet: number`, which is `NATIONAL_ACCOUNTS + settlements × SECTORS`;
- `walletAccount(ledger: Ledger, slot: number): number`, which is `firstWallet + slot`;
- `OPENING_CENTS = 100_000`, exported from `world/world.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `ledger.test.ts`, `lays out national accounts, then four sectors per settlement, then one wallet per slot`: `const cash = createLedger(reserveArena(65_536), 3, 5);` gives `[cash.accounts, cash.firstWallet, walletAccount(cash, 0), walletAccount(cash, 4)]` equal to `[33, 28, 28, 32]`.
  - `world.test.ts`: `fits every tier and issues the starting money through MINT` becomes `fits every tier and opens every wallet from MINT`. For each tier, with `agents = TIER_AGENTS[tier]`:
    - `OPENING_CENTS` is `100_000`, and `balance[MINT]` is `-OPENING_CENTS * agents`;
    - every `balance[walletAccount(world.cash, i)]` for `i < agents` is `OPENING_CENTS`, and `balance[sectorAccount(0, HOUSEHOLDS)]` is `0`;
    - the non-zero balances number `agents + 1`, and `checkInvariants` is `OK`.

    The arena check and the `layoutWorld(42, 'phone', 10_000, 65_536)` throw stay.
  - `world.test.ts`, `leaves every wallet as it opened after two days`: after `run(createWorld(42, 'phone'), 2 * TICKS_PER_DAY)`, every wallet still holds `OPENING_CENTS`.
- [ ] **Step 2:** `pnpm vitest run packages/sim-core/test/ledger.test.ts packages/sim-core/test/world.test.ts` fails: `walletAccount` is missing.
- [ ] **Step 3: Implement.**
  - `layoutWorld` calls `createLedger(arena, SETTLEMENTS, agents)`.
  - `STARTING_CENTS` gives way to the exported `OPENING_CENTS`.
  - `populate`'s loop issues `issue(world.cash, walletAccount(world.cash, slot), OPENING_CENTS)`, and the households issue goes, with its now-unused imports.
  - Every other `createLedger` call passes `0` wallets: five in `claims.test.ts`, one in `flows.test.ts`, two in `ledger.test.ts` and one in `registry.test.ts`.
- [ ] **Step 4:** The new tests pass. The goldens test fails, since the state moved on purpose.
- [ ] **Step 5:** `node packages/sim-core/scripts/goldens.ts` prints three new hashes. Then G1, G2 with the new phone hash, G3, G5 and G6 pass.
- [ ] **Step 6:** A senior runs the `economy-review` skill on the diff.
- [ ] **Step 7:** Commit `feat(sim-core): open a wallet for every blob from MINT`. The body names the new `42/phone` hash.

### Task B2: The `Blob` handle (junior)

**Files:** Create `packages/sim-core/src/agents/blob.ts` and `test/blob.test.ts`. Modify `src/world/world.ts` and `src/index.ts`.

**Interfaces:** Produces `class Blob`:
- `constructor(agents: AgentStore, cash: Ledger)` and `at(index: number): void`;
- read-only `index`;
- read-write `x`, `y`, `vx`, `vy`, `heading`, `action` and `facing`;
- read-only `wallet` and `cash`.

`World.blob: Blob` is made in `layoutWorld`, so `createWorld`, `restoreWorld` and `warmUp` each get one.

- [ ] **Step 1: Write the failing tests** in `blob.test.ts`.
  - `reads and writes its row through every accessor`: on `createWorld(42, 'phone')`, take 64 rows `i = draw2(42, 1, k, 0) % count`. After `blob.at(i)`:
    - `blob.index` is `i`, and the seven accessors equal their columns at `i`;
    - `blob.wallet` is `walletAccount(cash, i)`, and `blob.cash` is `cash.balance[blob.wallet]`.

    Values written through the seven setters then read back from the columns.
  - `lists exactly its accessors, and no look`: `Object.getOwnPropertyNames(Blob.prototype).sort()` equals `['action', 'at', 'cash', 'constructor', 'facing', 'heading', 'index', 'vx', 'vy', 'wallet', 'x', 'y']`.
  - `gives a restored world its own handle`: for `restored = restoreWorld(42, 'phone', checkpoint(original))`, where `original` has run 100 ticks, `restored.blob` is not `original.blob`. After `at(7)` on both, they read the same `x`, `y` and `cash`.
- [ ] **Step 2:** `pnpm vitest run packages/sim-core/test/blob.test.ts` fails.
- [ ] **Step 3: Implement.**
  - One private field per exposed column holds that column, named `<column>Column`, such as `xColumn`. `balance` and `firstWallet` come from `cash`.
  - `private row = 0`. Use TypeScript's `private`, not `#` fields, and no parameter properties.
  - Each getter returns `this.<column>Column[this.row]`, and each setter writes it. `wallet` is `this.firstWallet + this.row`, and `cash` is `this.balance[this.firstWallet + this.row]`.
  - One comment gives the why: one handle per world, re-pointed by `at`, so values stay in the arena (owner, 9 October 2026).
  - `World` gains `readonly blob: Blob`, built in `layoutWorld` as `new Blob(store, cash)`, and `index.ts` exports `./agents/blob.ts`.
- [ ] **Step 4:** The tests pass. G1 passes, with L2's lint checking every accessor. G2 shows the hash unchanged. G3 and G4 pass. Record the stand-in figure.
- [ ] **Step 5:** Commit `feat(sim-core): reach a blob's row through the Blob handle`.

### Task B3: The handle A/B (senior)

The owner's rule: a per-tick loop reads rows through the handle's accessors unless that runs more than 10% slower than plain columns. Two loops read blobs per tick and could switch: `move` and `foldAgents`. `writeSnapshot` reads `look`, which `Blob` never exposes. `festivalShoppers` reads culture, `nearestAgent` takes an `AgentStore` by its interface, and none of the three runs per tick through a `Blob`. So all three keep their columns.

- [ ] **Step 1: The before.** Run `pnpm --filter @nomos/bench budget` and `BENCH=1 pnpm exec playwright test tools/bench/test/browser/budget.spec.ts --project=chromium`. Record `move`'s rows at every tier, in Node and Chromium.
- [ ] **Step 2: The probe.** Write `.superpowers/m0.7/handle-ab.ts`, never committed. It holds copies of today's column `move` and of B4's accessor `move`, and of `foldAgents`' walker count both ways.
  - Each variant runs on its own `createWorld(42, tier)` with checks off, advancing `globals[TICK]` itself.
  - Take 2 warm samples, then 15 samples of 200 ticks each, interleaved, and keep the fastest sample per variant (R5's statistic).
  - At the end, the two worlds' `stateHash` must match.
  - Run it with `node`, then again with `--reverse`, which starts with the other variant.
- [ ] **Step 3: Decide each loop on its own.** A loop switches to accessors when the fastest accessor sample, divided by the fastest column sample, is at most 1.10 at every tier in both runs. Otherwise it keeps its columns.
- [ ] **Step 4: Record** the table for B4's commit body and the checkpoint: Node version, machine, fastest ms and ratio per tier and loop. Windows has no load average, so say so.

**Result, 9 October 2026** (measured here):
- **Conditions:** Node 24.18.0 on the Windows desktop, with no load average. Each figure is the fastest of 15 interleaved samples of 200 ticks, from one run with columns first and one with accessors first, and every pair of worlds ended in matching states.
- **Grounds:** the all-open stand-in, which the budget gate uses, and the town map, which the app runs.
- **Ratios** are accessor ÷ column, given as columns-first / accessors-first:

| Loop | Ground | 10k | 25k | 100k |
| --- | --- | --- | --- | --- |
| `move`, whole | stand-in | 1.052 / 1.161 | 1.106 / 1.194 | 1.093 / 1.198 |
| `move`, whole | town | 1.134 / 1.105 | 1.141 / 1.096 | 1.133 / 1.103 |
| Walking loop alone | stand-in | 1.021 / 0.999 | 1.002 / 0.986 | 0.998 / 1.000 |
| Walking loop alone | town | 1.119 / 1.109 | 1.109 / 1.101 | 1.101 / 1.102 |
| Redraw loop alone | stand-in | 1.058 / 1.863 | 1.050 / 1.868 | 1.054 / 1.878 |
| The day slice's walker count | stand-in | 2.116 / 1.779 | 3.621 / 3.571 | 1.309 / 1.236 |

- **No loop stays within 1.10 at every tier in both runs.** So `move` and the day slice's walker count keep their columns, and so does `populate` (ruling 8). B4 changes no code.
- **The walking loop alone** matches the brief's probe on open ground. On the town map, walls cost the handle 10–12%, and the redraw loop's cost depends on which variant V8 compiles first. The town's walker counts match the stand-in's within 0.15.
- **A copy of the handle with `declare`d fields** measured worse, 1.14–1.33× on the whole `move`, so `Blob` stays as B2 built it.
- **`move` before, unchanged after:** 0.054, 0.136 and 0.554 ms in Node (`pnpm --filter @nomos/bench budget`), and 0.055, 0.135 and 0.547 ms in Chromium 156.0.8078.4 (the budget spec), at 10k, 25k and 100k.
- **`move` at M0.7's close** (C1, measured here on a busy machine): 0.054, 0.140 and 0.575 ms in Node, and 0.053, 0.137 and 0.573 ms in Chromium 156.0.8078.4. That is 0.96–1.05× B3's figures, and `move` hasn't changed since B3, so the gap is noise. All nine rows of each budget pass.

### Task B4: Per-tick loops through the handle (junior, from this code)

**B3 decided on 9 October 2026 that no loop switches, so B4 changes no code: go on to B5.** The steps below stay as the record of what a passing A/B would have changed.

**Files:** `src/movement/{walk,wander}.ts`, `src/world/world.ts` and `src/day/slices.ts`, as B3 decides, and a separate docs commit to `interfaces.md`.

**Interfaces:** If `move` switches, `setHeading(blob: Blob, heading: number): void` replaces `setHeading(agents, i, heading)`.

- [ ] **Step 1: If `move` passed,** `walk.ts` imports `type Blob` from `../agents/blob.ts`, and `setHeading` writes `heading`, `vx`, `vy` and `facing` through the handle. `wander.ts` becomes:

  ```ts
  export function move(world: World): void {
    const seed = world.seed;
    const ground = world.ground;
    const tick = world.globals[TICK];
    const blob = world.blob;
    const count = world.agents.count[0];
    for (let i = firstRedraw(tick); i < count; i += REDRAW_TICKS) {
      blob.at(i);
      redraw(blob, seed, i, tick);
    }
    for (let first = 0; first < count; first += WALK_CHUNK) {
      const end = Math.min(count, first + WALK_CHUNK);
      let stuck = 0;
      for (let i = first; i < end; i++) {
        blob.at(i);
        const nextX = blob.x + blob.vx;
        const nextY = blob.y + blob.vy;
        if (walkableAt(ground, nextX, nextY)) {
          blob.x = nextX;
          blob.y = nextY;
        } else {
          blocked[stuck++] = i;
        }
      }
      for (let k = 0; k < stuck; k++) {
        blob.at(blocked[k]);
        meetWall(blob);
      }
    }
  }
  ```

  `meetWall(blob: Blob)` and `redraw(blob: Blob, seed, i, tick)` keep their logic, reading and writing `blob.x`, `blob.heading`, `blob.action` and so on, and both call `setHeading(blob, turned)`. `populate` re-points `world.blob` at each new slot. It writes `x`, `y` and `action` through the handle, calls `setHeading(blob, start >>> 24)`, and issues into `blob.wallet`.
- [ ] **Step 2: If `foldAgents` passed,** its loop reads `blob.action` after `blob.at(i)`, from `const blob = world.blob`.
- [ ] **Step 3: If `move` failed,** `wander.ts`, `walk.ts` and `populate` keep their columns, since `populate` shares `setHeading` with `move`.
- [ ] **Step 4:** The existing `wander`, `world`, `slices` and `ground` tests pass unchanged. G1, G2 (hash unchanged), G3 and G4 pass, and the Chromium budget spec's `move` row is recorded beside B3's.
- [ ] **Step 5:** Commit `refactor(sim-core): walk blobs through the Blob handle`, with B3's table in the body.
- [ ] **Step 6:** If `setHeading` changed, make a docs commit: in `interfaces.md`, "Movement", `setHeading(agents, i, heading)` becomes `setHeading(blob, heading)`. Commit it as `docs(plan): note that setHeading takes the Blob handle`.

### Task B5: The checks flag (junior)

**Files:**
- `packages/sim-protocol/src/messages/messages.ts`;
- `packages/sim-worker/src/loop/loop.ts`, and `test/loop.test.ts`;
- `packages/sim-core/src/step/warm.ts`;
- `apps/web/src/app/app.ts`;
- `packages/render-gl/harness/worker.ts`.

**Interfaces:** Produces `AppMessage` `init` as `{ type: 'init'; seed: number; tier: Tier; map: ArrayBuffer; checks: boolean }`.

- [ ] **Step 1: Write the failing test** in `loop.test.ts`, `sets the world's checks from init`. `fakePage({ init: false })` handles `init` with `checks: false`, and `page.world().checks` is `false`. A second page with `checks: true` gives `true`. Every existing `init` in the file gains `checks: true`: the fake page's own and four more.
- [ ] **Step 2:** `pnpm vitest run packages/sim-worker` fails.
- [ ] **Step 3: Implement.**
  - The loop's `init` sets `world.checks = checks` right after `host.makeWorld`.
  - In `warmUp`, `world.checks = false` follows `populate`. Comment: production workers skip the check, so the warm-up compiles the step without it, and its cost stays flat as wallets grow.
  - The app's `init` adds `checks: import.meta.env.DEV`, and the harness's two `init`s add `checks: true`.
- [ ] **Step 4:** The tests pass. G1, G2 and G3 pass, and `pnpm exec playwright test packages/render-gl/test/browser/worker-map.spec.ts --project=chromium` passes.
- [ ] **Step 5:** Commit `feat: check the ledger every tick only in development`.

### Task B6: Name keys (junior)

**Files:** `packages/sim-core/src/random/streams.ts`, `src/agents/store.ts`, `src/agents/blob.ts`, `test/{store,blob}.test.ts`, `test/fixtures/goldens.json`.

**Interfaces:** Produces `PERSON_NAME = AGENT_SALT + 6` (0x106), the `nameKey: Uint32Array` column appended to `AgentStore` and `AGENT_COLUMNS` as `{ name: 'nameKey', bytes: 4 }`, and `Blob`'s read-only `nameKey`.

- [ ] **Step 1: Write the failing tests.**
  - `store.test.ts`, `draws a name key per id on its own stream`: on `createWorld(42, 'phone')`, every `nameKey[i]` equals `draw1(42, PERSON_NAME, i)`. `PERSON_NAME` is `0x106`, `layerOf(PERSON_NAME)` is `'agent'`, and `AGENT_COLUMNS.at(-1)` equals `{ name: 'nameKey', bytes: 4 }`.
  - `blob.test.ts`: the accessor list gains `'nameKey'`, and `blob.nameKey` equals the column at each sampled row.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3: Implement.** `createAgentStore` takes the column last, as canonical. `addAgent` writes `store.nameKey[slot] = draw1(seed, PERSON_NAME, id)`, and `Blob` copies the column. The culture lint already bans `nameKey` from guarded folders.
- [ ] **Step 4:** `node packages/sim-core/scripts/goldens.ts`, then G1, G2 with the new hash, G3 and G5 pass.
- [ ] **Step 5:** Commit `feat(sim-core): give every blob a name key`. The body names the new `42/phone` hash.

### Task B7: The nearest blob and the inspect message (junior)

**Files:**
- create `packages/sim-core/src/agents/nearest.ts` and `test/nearest.test.ts`;
- modify `src/index.ts`, `packages/sim-protocol/src/messages/messages.ts`, `packages/sim-worker/src/loop/loop.ts` and `test/loop.test.ts`.

**Interfaces:**
- `nearestAgent(agents: AgentStore, xQ8: number, yQ8: number, radiusQ8: number): number`: the nearest blob by squared distance within the radius, inclusive, ties to the lower index, or −1;
- `AppMessage` gains `{ type: 'inspect'; x: number; y: number }`, in world pixels;
- `WorkerMessage` gains `{ type: 'inspected'; tick: number; agent: number; nameKey: number; cents: number }`.

- [ ] **Step 1: Write the failing tests.**
  - `nearest.test.ts`: a store of 4 agents, added with `addAgent(store, 1, id, 1, 0)`, with `x` set to `[0, 100, -100, 5_000]` and `y` to zeros. `nearestAgent` with radius 4,096 gives:
    - 0 at (0, 0);
    - 0 at (50, 0), tying agent 1, and 0 at (−50, 0), tying agent 2;
    - 1 at (60, 0);
    - 3 at (9,096, 0), exactly one radius away;
    - −1 at (9,097, 0).
  - `loop.test.ts`, `answers inspect with the nearest blob within a tile`: on `fakePage()`, inspect at `x[0] / 256, y[0] / 256`. The one `inspected` equals `{ type: 'inspected', tick: 0, agent, nameKey: nameKey[agent], cents: 100_000 }`, where `agent = nearestAgent(agents, x[0], y[0], 4_096)`.
  - `loop.test.ts`, `answers -1 off the map`: inspect at (−1,000, −1,000) gives `{ type: 'inspected', tick: 0, agent: -1, nameKey: 0, cents: 0 }`.
  - `loop.test.ts`, `ignores inspect before init`: nothing is posted.
  - `loop.test.ts`, `answers while the run plays`: after `resume` and `advance(500)`, the answer's `tick` equals `page.tick()`.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3: Implement.**
  - `nearestAgent` scans the columns once.
  - The loop adds `const INSPECT_RADIUS_Q8 = TILE_PX * SUBPIXELS`, with the comment "one tile". `handle` gains `else if (msg.type === 'inspect') postInspected(session.world, msg.x, msg.y);` before the `giveBack` fallthrough.
  - `postInspected` rounds `x * SUBPIXELS` and `y * SUBPIXELS`, and asks `nearestAgent`. For a found agent, it reads `nameKey` and `cash` through `world.blob` after `at(agent)`, and posts with no transfer.
- [ ] **Step 4:** The tests pass. G1, G2 (hash unchanged) and G3 pass.
- [ ] **Step 5:** Commit `feat: answer inspect with the nearest blob within a tile`.

### Task B8: `worldAt` (junior)

**Files:** `packages/render-gl/src/camera/camera.ts`, `src/index.ts`, `test/camera.test.ts`.

**Interfaces:** Produces `worldAt(camera: Camera, deviceX: number, deviceY: number): [number, number]`, the world pixel under a device pixel, which `zoomAt` also uses.

- [ ] **Step 1: Write the failing tests.**
  - `worldAt({ x: 10, y: 20, zoom: 4 }, 8, 12)` equals `[12, 23]`.
  - For `camera = { x: 3, y: 5, zoom: 2 }`, `worldAt(zoomAt(camera, 4, 100, 60), 100, 60)` equals `worldAt(camera, 100, 60)`.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3: Implement.** `worldAt` returns `[camera.x + deviceX / camera.zoom, camera.y + deviceY / camera.zoom]`. `zoomAt` takes its point from `worldAt`, which evaluates in the same order, and `index.ts` exports it. The existing camera tests pass unchanged.
- [ ] **Step 4:** G1 and G3 pass.
- [ ] **Step 5:** Commit `feat(render-gl): map a device pixel to its world pixel`.

### Task N1: The person-name filter and its fixtures (senior)

**Files:**
- create `tools/names/scripts/build-avoid.ts` and `scripts/source-notes.ts`;
- create the fixtures `avoid-places.txt`, `avoid-species.txt`, `avoid-items.txt`, `profanity.txt` and `LICENSE-ldnoobw.txt`;
- create `src/filters/name-filter.ts` and `test/name-filter.test.ts`;
- modify `scripts/build-real-world.ts`, `fixtures/sources.json`, and `src/filters/real-world.ts`, which exports `allowedEdits`.

**Interfaces:** Produces `rejectName(word: string): string | null`, which returns `'franchise'`, `'real-world'`, `'place'`, `'species'` or `'profanity'`, in that order, or null. It also produces `nearAny(word: string, tokens: readonly string[]): boolean` and `profane(word: string, entries: readonly string[]): boolean`.

**Inputs from the researcher** (verified 9 October), which the orchestrator attaches:
- the species query, `p:P1685` with the qualifier `pq:P972 wd:Q20005020`;
- the 84 town and city QIDs.

- [ ] **Step 1: One home for source notes.** `scripts/source-notes.ts` exports `mergeSourceNotes(notes)`. It reads `fixtures/sources.json`, assigns the given keys, and writes it back with existing keys in place. `build-real-world.ts` calls it instead of overwriting the file, because a rerun would otherwise erase the new notes.
- [ ] **Step 2: Write `build-avoid.ts`.** It is run by hand, needs the network, and its output is committed.
  - **Wikidata** returns each item's English `rdfs:label` and `schema:version`, its last revision.
    - Species: fold each label with `foldName` and drop every non-letter, so multi-word names join into one token. Keep tokens of 3 or more letters, deduplicated and sorted. Expect 1,023.
    - Towns and cities: take `nameTokens` of 4 or more letters. Drop the suffix words, such as town and city, and the ordinary words a review finds, such as new, white and violet, listed in the script.
    - `avoid-items.txt` pins each item as `<QID> <revision> <species|place>`, sorted.
  - **LDNOOBW** at commit `5faf2ba42d7b1c0977169ec3611df25a3c08eb13`: fetch the lists `cs da de en eo es fi fil fr fr-CA-u-sd-caqc hi hu it kab nl no pl pt sv tlh tr`, and the licence. Fold each entry, keep single words of 3 or more letters a to z, deduplicate and sort them.
  - **`LICENSE-ldnoobw.txt`** opens with the researcher's attribution paragraph, then a blank line, then the licence verbatim. The attribution's "Modified" sentence must name every change the build makes. The proposed wording: "Modified: Latin-script lists merged, lowercased, diacritics stripped, entries other than single words of 3 or more letters a to z dropped, deduplicated and sorted."
  - **Source notes** for `avoid-places`, `avoid-species` and `profanity` give query or URL, date, licence and count.
  - The script, its comments and its output carry no franchise word; say "the franchise". The script asserts that `franchiseHits` finds nothing in any token.
- [ ] **Step 3:** Run `node tools/names/scripts/build-avoid.ts`. Review the counts and the ordinary-word list it prints, and rerun until clean.
- [ ] **Step 4: Write the failing tests** in `name-filter.test.ts`, with synthetic lists, so no banned word sits in a test.
  - `nearAny('zorbax', ['zorbix'])` is true: 6 letters allow 2 edits. `nearAny('zorb', ['zarbo'])` is false: 4 letters allow 1 edit.
  - `profane('cde', ['cde'])` is true, and `profane('abcdefg', ['cde'])` is false, since a 3-letter entry matches exactly. `profane('xxbadwxx', ['badw'])` is true, since 4 or more letters match by substring.
  - `rejectName` is not null for a one-letter change to the first line of each fixture, and is `'franchise'` for `'dalmon'`. It is null for a clean word, which the test pins once it is chosen.
  - The fixtures are sorted, unique and `^[a-z]{3,}$`, with places at 4 or more letters, and their counts equal their notes'. `LICENSE-ldnoobw.txt` names the commit `5faf2ba42d7b1c0977169ec3611df25a3c08eb13` and matches `/Attribution 4\.0 International/`.
- [ ] **Step 5:** The tests fail.
- [ ] **Step 6: Implement `name-filter.ts`.** It loads the fixtures once, lazily, at module level.
  - `franchise` is `franchiseHits(word).length > 0` or a word ending in `mon` (ruling 12).
  - `real-world` is `nearRealWorld`.
  - `place` and `species` are `nearAny` with `allowedEdits`.
  - `profanity` is `profane`.
- [ ] **Step 7:** The tests pass, and G1 passes: `pnpm names` reads the new fixtures and script.
- [ ] **Step 8: Commit twice.**
  1. `feat(names): add the franchise and profanity fixtures`: the build scripts, source notes and fixtures.
  2. `feat(names): reject person names near a banned word`: the filter and its tests.

### Task N2: The mixed sound set (senior)

**Files:**
- create `tools/names/scripts/build-name-bases.ts`, `fixtures/name-bases.json` and `fixtures/LICENSE-fmg.txt`;
- create `src/sound-set/sound-set.ts` and `test/sound-set.test.ts`;
- modify `tools/names/package.json`, which adds `"@nomos/sim-core": "workspace:*"`, `pnpm-lock.yaml` and `fixtures/sources.json`.

**Interfaces:** Produces, in `sound-set/sound-set.ts`:
- `type Chain = ReadonlyMap<string, ReadonlyMap<string, number>>`: a two-letter context, starting `^^`, mapped to each next letter or `$` and its count;
- `interface SoundSet { readonly lead: Chain; readonly others: readonly Chain[]; readonly sources: ReadonlySet<string> }`;
- `chainOf(tokens: readonly string[]): Chain`;
- `loadSoundSet(): SoundSet`;
- `pickOthers(count: number, seed: number, n: number): [number, number]`;
- `drawWord(sounds: SoundSet, seed: number, n: number): string`.

- [ ] **Step 1: Write `build-name-bases.ts`.** It is run by hand and needs the network.
  - It fetches `src/data/name-bases.ts` and `LICENSE` from github.com/Azgaar/Fantasy-Map-Generator at commit `546c41d37e1daf842df620139e3228553e2f0847`.
  - It parses each base with round 8's pattern, `name: "…", i: …, …, b: "comma list"`.
  - It keeps the 33 real-world bases, round 8's indices 0–31 and 42, listed by name: German, English, French, Italian, Castillian, Ruthenian, Nordic, Greek, Roman, Finnic, Korean, Chinese, Japanese, Portuguese, Nahuatl, Hungarian, Turkish, Amazigh, Arabic, Inuit, Basque, Nigerian, Celtic, Mesopotamian, Iranian, Hawaiian, Karnataka, Quechua, Swahili, Vietnamese, Cantonese, Mongolian and Levantine. It asserts all 33 are found, Greek among them; if the pinned file names one differently, fix the list and report it. At the pinned commit, round 8's Berber base is named Amazigh.
  - It writes `name-bases.json` as `{ "<base>": ["token", …] }`, keys and tokens sorted, from `nameTokens` of each name, deduplicated. `LICENSE-fmg.txt` is the licence verbatim.
  - Through `mergeSourceNotes`, a `name-bases` note records URL, commit, date, licence `MIT`, count and `credit`: Azgaar, with Dopu and Avengium, as the file credits them.
- [ ] **Step 2:** Run it, and commit `feat(names): add Fantasy Map Generator's name bases as a fixture`.
- [ ] **Step 3: Write the failing tests** in `sound-set.test.ts`:
  - `chainOf(['abc'])` maps `^^` to `{a: 1}`, `^a` to `{b: 1}`, `ab` to `{c: 1}` and `bc` to `{$: 1}`;
  - `pickOthers(32, 1, n)` gives two distinct indices below 32 for every n below 10,000, and hits all 32;
  - `drawWord(sounds, 1, n)` returns the same word every call, of letters a to z only;
  - for n below 1,000, every transition in `^^` + word + `$`, cut at 11 letters, is in the lead chain or one of word n's two picked chains;
  - `name-bases.json` holds 33 bases, Greek among them, each with 100 or more tokens of `^[a-z]{3,}$`. `LICENSE-fmg.txt` matches `/Permission is hereby granted/`.
- [ ] **Step 4:** The tests fail.
- [ ] **Step 5: Implement.** This is the algorithm, so its decisions are written out.
  - `loadSoundSet` reads `name-bases.json`. `lead` is Greek's chain, `others` the other 32 in name order, and `sources` every token of every base.
  - `pickOthers` takes `draw2(seed, WORDS, n, 0) % count` and `draw2(seed, WORDS, n, 1) % (count - 1)`, the second moved up by one when it reaches the first. `WORDS` is 1, the sound set's one stream; each table differs by its seed.
  - `drawWord` mixes the lead chain at weight 2 with its two picked chains at weight 1 each.
    - From context `^^`, the next letter is a weighted pick over `a`–`z` then `$`, in that fixed order, of the summed weighted counts. Each pick uses `draw2(seed, WORDS, n, k) % total`, for k = 2, 3, and so on.
    - It stops at `$` or at 11 letters. A context always continues in the chain that gave its last letter, so the total is never 0.
  - Add `@nomos/sim-core` to `tools/names/package.json`, run `pnpm install`, and import `draw2` from `@nomos/sim-core/kernels`.
- [ ] **Step 6:** The tests pass, and G1 passes.
- [ ] **Step 7:** Commit `feat(names): draw words from the shared mixed sound set`, staging `tools/names` and `pnpm-lock.yaml`.

### Task N3: The name table and `personName` (junior)

**Files:**
- create `tools/names/scripts/words.ts` and `tools/names/test/words.test.ts`;
- create, generated, `packages/sim-culture/src/naming/words.ts` and `naming/LICENSE-fmg.txt`;
- create `packages/sim-culture/src/naming/person-name.ts` and `packages/sim-culture/test/person-name.test.ts`;
- modify `packages/sim-culture/src/index.ts`.

**Interfaces:** Produces:
- in `words.ts`: `PERSON_SEED = 1`, `TABLE_WORDS = 1_024`, `buildTable(seed: number): { words: string[]; drawn: number; rejected: Record<string, number>; byLength: Record<number, [drawn: number, kept: number]> }` and `tableSource(words: readonly string[]): string`. M8.1 adds its place table on its own seed;
- in `sim-culture`: `NAME_WORDS: readonly string[]` and `personName(nameKey: number): string`.

- [ ] **Step 1: Write the failing tests.**
  - `words.test.ts`, with a 60 s timeout and one `buildTable(PERSON_SEED)` in `beforeAll`:
    - `matches a fresh build`: `packages/sim-culture/src/naming/words.ts` equals `tableSource(words)`, and `naming/LICENSE-fmg.txt` equals `fixtures/LICENSE-fmg.txt`;
    - `keeps 1,024 words of 4–10 letters that pass the filter`: each matches `^[a-z]{4,10}$`, is unique, is no `sources` token, and gets null from `rejectName`.
  - `person-name.test.ts`, where `W` is `NAME_WORDS` and `cap` capitalises a word:
    - `personName(0x0003_0005)` is `` `${cap(W[5])} ${cap(W[3])}` ``;
    - `personName(0x0007_0007)` is `` `${cap(W[7])} ${cap(W[8])}` ``;
    - `personName(0xffff_ffff)` is `` `${cap(W[1023])} ${cap(W[0])}` ``;
    - `personName(0x0400_0001)` is `` `${cap(W[1])} ${cap(W[0])}` ``;
    - for 10,000 keys `draw1(7, 1, i)`, no name repeats a word.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3: Implement `words.ts`.**
  - **Drawing:** for n = 0, 1, 2 and so on, take `drawWord(sounds, seed, n)`. The first rule it breaks names its rejection: `length` (outside 4–10 letters), `repeat`, `source` (a base token copied whole) or `rejectName`'s rule. Words that break none are kept, until 1,024 are.
  - **The file:** `tableSource` sorts the words and writes this header, then `export const NAME_WORDS: readonly string[] = [`, eight single-quoted words a line, and `];`:

    ```text
    // Generated by tools/names/scripts/words.ts from Fantasy Map Generator's name bases, by Azgaar with Dopu and
    // Avengium (MIT, LICENSE-fmg.txt beside this file). Do not edit.
    ```
  - **Running it:** `node tools/names/scripts/words.ts` writes `words.ts` and copies `fixtures/LICENSE-fmg.txt` beside it. With `--check` it writes nothing, exits 1 and names any stale file.
  - **Its report:** drawn, kept, and rejections by rule and by length, the evidence M3.7's 5% target asks for. Then 40 sample full names, for the owner.
- [ ] **Step 4: Implement `person-name.ts`,** as `interfaces.md`'s "Names" gives it, with each word capitalised. `index.ts` exports `./naming/person-name.ts`.
- [ ] **Step 5:** Run `node tools/names/scripts/words.ts`. The tests pass, `node tools/names/scripts/words.ts --check` exits 0, and G1 passes.
- [ ] **Step 6: Commit twice.**
  1. `feat(names): build the person-name table`: `tools/names` and the two generated files.
  2. `feat(sim-culture): turn a name key into a person's name`.
- [ ] **Step 7:** Hand the 40 sample names to the orchestrator for the owner. Reading them is not a gate.

### Task I1: The inspector (senior)

**Files:**
- `apps/web/src/view/camera-input.ts`, and the new `panels/inspector.ts`;
- `apps/web/package.json`, which adds `"@nomos/sim-culture": "workspace:*"`, and `pnpm-lock.yaml`;
- `apps/web/.size-limit.json`;
- `apps/web/test/inspector.test.ts` and `test/browser/inspector.spec.ts`.

**Interfaces:**
- Consumes `worldAt` (B8), the `inspect` and `inspected` messages (B7), and `personName` (N3).
- Produces `mountInspector(parent: HTMLElement, worker: Worker): void`, `formatCents(cents: number): string` and `isClick(dxCss: number, dyCss: number): boolean`.

- [ ] **Step 1: Write the failing unit tests.**
  - `formatCents` gives `1,000.00` for 100,000, `0.05` for 5, `-2.50` for −250 and `1,234,567.89` for 123,456,789, through the HUD's `formatCount`, with no `Intl`.
  - `isClick(3, 0)` is true, and `isClick(4, 0)` and `isClick(0, 5)` are false.
- [ ] **Step 2: Write the failing spec** `inspector.spec.ts`, which runs in chromium, firefox and webkit.
  - Reduced motion holds the run at tick 0. In Node, `createWorld(42, 'phone', parseMap(town.nmap))` and `personName` give the expected text.
  - Clicking a blob with no other blob within a tile shows `<Name>, wallet 1,000.00` in `#inspector`. Clicking open ground shows `No blob here`. A right-button click on that blob changes nothing.
  - Enter on the focused view shows the answer for the view's centre.
  - One case runs at `deviceScaleFactor: 2` after one zoom step.
- [ ] **Step 3: Implement.**
  - **The view input:** a primary-button press and release under 4 CSS px apart, with one pointer down, inspects that device pixel; a drag pans as now. Enter inspects the canvas centre. The view's `aria-label` adds "Enter shows the blob at the centre".
  - **The first inspect** loads `../panels/inspector.ts` once, by a direct dynamic import, so Vite names its chunk `inspector-*.js`. Then it posts `{ type: 'inspect', x, y }` from `worldAt(app.camera, …)`.
  - **The panel:** `mountInspector` appends `<p id="inspector" aria-live="polite">` to `#hud`, reusing the HUD's styles, so `index.html` gains no bytes. It shows `${personName(nameKey)}, wallet ${formatCents(cents)}`, or `No blob here`.
  - **Bytes:** the inspector chunk should hold `personName` and its table only. Add a `./naming` export to `sim-culture` only if size-limit shows `sim-core` code in it.
- [ ] **Step 4: The size-limit entry.** Add `Inspector chunk` for `dist/assets/inspector-*.js`, with its limit at the measured brotli size rounded up to the next 0.5 kB. Revisit V1's `Camera input chunk` limit too.
- [ ] **Step 5: Run the checks.**
  - The tests and spec pass, and so does `pnpm exec playwright test apps/web/test/browser` in all three browsers.
  - G1 and G3 pass. The stand-in figure is unchanged, since both chunks are lazy.
  - Run the startup gate as in V1's Step 6.
- [ ] **Step 6:** Commit `feat(web): show a clicked blob's name and wallet`.

### Task C1: Close (orchestrator, with the senior)

- [ ] Once the worldgen senior's work has landed, point two references at `packages/sim-protocol/src/map/map.ts`, with the Edit tool. Find them by their text, `sim-protocol/src/map.ts`, since their lines move as worldgen changes: one is in `tools/worldgen/mapfile.py`'s docstring, the other is a link in `tools/worldgen/README.md`. Commit `chore(worldgen): point at map.ts's new folder`.
- [ ] Record the Chromium budget spec's `move` row after the change, beside B3's before. This answers the brief's open question.
- [ ] Node and G5's three browsers prove the goldens here. Bun, the fifth engine, runs only in CI's `bun` job, on the owner's push.
- [ ] Run the reviews: the `determinism-review` skill on `packages/sim-*`, `economy-review` on B1, `perf-check`, and `code-reviewer` over the whole change. `senior-qa` proves every exit check in `task.md`.
- [ ] Run `graphify update .`, delete `.superpowers/m0.7/`, and fill in `milestone.md`'s Started, Done and Actual cells.
- [ ] Write the next checkpoint. It records:
  - the owner's mixed name style, which supersedes checkpoint 0016's decision of a name from round 8's design H;
  - the syncs that carried that style into the docs on 9 October: `ff4321a` for M3.7's task and brief, and `b494f38`, `d7401ae` and `357b776` for the implementation plan, the structure tab and the countries tab;
  - the push, which waits for the owner.

## Rulings

These are the senior's rulings where the brief or the task was silent. The owner can overturn any of them.

1. **The move:** one commit per package, plus `sim-core`'s split as a second commit. A throwaway script saved from Appendix A does the git moves and rewrites, and is never committed. Import order stays as the script leaves it.
2. **Plants:** lint tests that plant files at a package's `src/` move them into plain folders (`memory/`, `messages/`, `loop/`, `festivals/`). Tests that filter by rule id keep theirs.
3. **The page rule** lives in dependency-cruiser (L3), so the framework ban's ESLint options stay whole.
4. **Hot folders** follow the brief, with `COLD` unchanged, and the new class selector exempts constructors only.
5. **The warm-up** runs with checks off, so its cost stays flat as wallets grow and it compiles what production runs.
6. **The view input** loads after the first frame (V1), freeing initial JS for part 2 without raising the owner's 17 kB stand-in. If G3 still fails after V1, stop: raising the limit is the owner's call.
7. **The A/B probe** is throwaway. Afterwards CI's budget gates guard `move`, and the Chromium budget spec gives the second engine's figure. Each loop is decided on its own.
8. **`populate`** goes through the handle only if `move` does, since the two share `setHeading`.
9. **A system may be a class** only when it owns working objects made once, such as a second handle or scratch arrays. Such a class is made at world creation, has its per-tick method under the hot-path rules, and inherits nothing (the brief's ruling).
10. **One table serves given and family names,** as round 8's decision (k) asks: 1,024² ≈ 1.05 million full names (computed). Words have a 4-letter floor, as in the brief.
11. **Mixed sound set parameters** (owner's style, senior's numbers):
    - letter chains of order 2, learned from FMG's 33 real-world bases;
    - Greek leads every word at weight 2, mixed with two other bases picked at random per word, at weight 1 each;
    - words stop at 11 letters;
    - a word that copies a base's name whole is dropped, so no real place name becomes a person's name.

    The owner reads N3's sample, and these numbers are the place to tune.
12. **The franchise rule** also rejects words ending in "mon", round 8's creature-style ban, which removed at most 0.28% of names there (measured in round 8).
13. **Licence notices:**
    - `LICENSE-fmg.txt` sits beside the fixture and beside the generated table;
    - LDNOOBW's licence is verbatim, under its attribution paragraph, in `LICENSE-ldnoobw.txt`;
    - the shipped inspector chunk carries no notice. Whether the build should ship one is the owner's licence call, open beside the art licence.
14. **`tools/names` depends on `@nomos/sim-core`** for the keyed draw, so Nomos keeps one draw. Every fixture script merges its notes into `sources.json`.
15. **The inspector** is vanilla TypeScript: two lines of text don't justify Solid's or Preact's bytes. Its line sits in `#hud`. The wallet shows only there (content rule 5), as does the name, which round 8 allows with the follow-cam.

## Data

- **Bytes per agent:** 4 for `nameKey`, 8 for the wallet and 16 for its claims rows, `debt` and `lent`: 28 in all.
- **Arena tops** before and after (the brief, computed): 391 KB to 671 KB of 32 MiB at 10k, 723 KB to 1.42 MB at 25k, and 2.39 MB to 5.19 MB of 64 MiB at 100k. The warm-up world grows from 192 KB to 221 KB of its 1 MiB. `TIER_MEMORY_BYTES` and snapshot v1's 12 bytes don't change.
- **The brief's probe** (measured there, Node 24.18.0, Ryzen 5 3600; fastest of 15 samples of 200 ticks):

  | `move`'s walking loop | 10k | 100k | Against columns |
  | --- | --- | --- | --- |
  | Hoisted columns | 0.0390 ms | 0.391–0.392 ms | 1.00× |
  | Accessors on one re-pointed handle | 0.0417 ms | 0.420 ms | 1.07× |
  | `blob.walk()`, a method per blob | 0.106–0.107 ms | 1.056–1.090 ms | 2.69–2.78× |
  | A `walk` method with the tile test written out | 0.0763 ms | 0.773 ms | 1.96–1.98× |

- **Per-tick checks with wallets** (the brief, measured): 0.048, 0.107 and 0.329 ms a tick at 10k, 25k and 100k, against under 0.001 ms without wallets.
- **Bytes on 9 October** (G3, measured here):
  - initial JS 16.74 kB of 17 kB;
  - entry chunk 5.44 kB, worker 5.36 kB, renderer 5.93 kB;
  - after I1:
    - initial JS is 16,781 B of 17,000, 15 B more, where Step 5 expected no change. The entry chunk now hands `formatCount`, `element` and Vite's preload helper to the lazy chunks.
    - the inspector chunk is 4,126 B, under a 4.5 kB limit;
    - the camera input chunk is 1,042 B, so its limit rose from 1 kB to 1.5 kB.

## Risks

- **Initial JS:** 260 B of headroom before V1. If V1 frees too little, G3 fails partway through part 2, and the owner decides on the limit.
- **Accessor cost is measured in V8 only.** B3 adds Chromium through the budget spec. JavaScriptCore and SpiderMonkey stay unmeasured, and the five-engine goldens catch a change of result, not of speed.
- **A new table renames everyone.** No save exists before M6, which versions the generator with the save (M3.7's brief).
- **Without the trigram screen,** some words may read as one real language. The owner's sample review in N3, and M8.1's 100-name review, are the check.
- **FMG's base names at commit `546c41d` are unverified here.** N2's build asserts all 33 by name.
- **Production stops asserting the ledger every tick.** CI's ledger gate and the tests still do, at every tier.
- **Classes are new in sim code.** L2's tests prove every selector, and B2's handle is the first class they check.

## Open items

- **How wallets roll up into sector accounts** (the senior's economy review of B1, 9 October 2026).
  - B1 funds each blob's wallet and leaves `sectorAccount(0, HOUSEHOLDS)` at 0 by design, so a settlement's households account no longer equals its people's cash.
  - M2.1 and M2.2 already ask whether household cash is an account beside its members' wallets, or their sum.
  - M7.1's settlement ledgers and M9's fold must also say how wallets map to the households account. The brief proposed a city's wallets and the canonical settlement ledger as two `Ledger`s, the fold summing wallets into the households account.
  - Needed before: M2.1's step plan.
- **Left to M2,** as the brief listed:
  - flows between wallets, and non-negative cash (checkpoint 0015);
  - household cash as a multiple of monthly wages (M2.1);
  - cash apportioned from the ledger record (M2.2);
  - the wealth spread (M2.5).

  Until then every wallet holds 100,000 cents, so wealth's Gini is 0 by design.

## Sources

- **The owner's decisions:** 9 October 2026, in [task.md](task.md) and checkpoint [0016](../../../checkpoints/0016-structure-countries-and-m0-6-closing.md). The mixed name style is also in [M8.1's plan](../../m8-country-map/m8.1-world-generator/plan.md), "Names for places and countries".
- **The researcher's results** (verified 9 October 2026): Wikidata for the franchise's species, towns and cities, and LDNOOBW's 21 Latin-script lists; carried in N1.
- **Hot paths, the fastest-of-9 statistic and the 10% tolerance:** the [implementation plan](../../../implementation-plan.md)'s Performance budget and its R5 gates. `move`'s earlier timings are in [M0.6's plan](../m0.6-gates-and-guards/plan.md), Task 10.
- **Names, the filter and the sound set:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, for the filter rules, FMG's bases, the "-mon" ban and decision (k).
- **Money:** M0's ledger items (R1, R4), and [checkpoint 0015](../../../checkpoints/0015-m0-5-and-m0-6-closing.md)'s money rulings. Wealth on screen: the [R6 report](../../../../research/round-6-goods-and-wellbeing/report.md), "On screen".

## Appendix A: move.sh

Save this verbatim as `.superpowers/m0.7/move.sh` with the Write tool.

```bash
#!/usr/bin/env bash
# M0.7's move: bash .superpowers/m0.7/move.sh <package>, run from the repo root. Git-moves the package's files into
# their concern folders (interfaces.md, Layout), then rewrites every relative specifier that named a moved file:
#   entries:  files that stay directly in src/, importing './old'
#   nested:   files that stay one folder down in src/, importing '../old'
#   outside:  files outside src/ that name '.../src/old'
#   moved:    files that moved, importing a sibling './old': './name' in the same folder, else '../folder/name'
set -euo pipefail
nested=''
case "${1:-}" in
  sim-core)
    pkg=packages/sim-core
    nested="$pkg/src/consumption/stand-in.ts"
    outside="$pkg/test/*.ts $pkg/test/engines/*.ts $pkg/scripts/*.ts"
    map='draw.ts random/draw.ts
noise.ts random/noise.ts
streams.ts random/streams.ts
int.ts maths/int.ts
log2.ts maths/log2.ts
tables.ts maths/tables.ts
apportion.ts maths/apportion.ts
split.ts maths/split.ts
calendar.ts time/calendar.ts
day-length.ts time/day-length.ts
memory.ts memory/arena.ts
tiers.ts memory/tiers.ts
store.ts agents/store.ts
actions.ts agents/actions.ts
ledger.ts money/ledger.ts
money.ts money/ppm.ts
claims.ts money/claims.ts
registry.ts money/registry.ts
invariants.ts money/invariants.ts
flows.ts money/flows.ts
histogram.ts money/histogram.ts
world.ts world/world.ts
ground.ts world/ground.ts
inputs.ts world/inputs.ts
space.ts world/space.ts
day.ts day/day.ts
slices.ts day/slices.ts
stride.ts day/stride.ts
wander.ts movement/wander.ts
walk.ts movement/walk.ts
step.ts step/step.ts
warm.ts step/warm.ts'
    ;;
  sim-protocol)
    pkg=packages/sim-protocol
    outside="$pkg/test/*.ts $pkg/scripts/*.ts"
    map='snapshot.ts snapshot/snapshot.ts
visual.ts snapshot/visual.ts
jobs.ts snapshot/jobs.ts
messages.ts messages/messages.ts
lifecycle.ts messages/lifecycle.ts
map.ts map/map.ts
sprite-manifest.ts sprites/sprite-manifest.ts
calendar.ts shared/calendar.ts
columns.ts shared/columns.ts'
    ;;
  sim-worker)
    pkg=packages/sim-worker
    outside=''
    map='loop.ts loop/loop.ts'
    ;;
  sim-culture)
    pkg=packages/sim-culture
    outside=''
    map='festivals.ts festivals/festivals.ts
relabel.ts relabel/relabel.ts'
    ;;
  render-gl)
    pkg=packages/render-gl
    outside="$pkg/test/*.ts $pkg/test/browser/*.ts"
    map='renderer.ts renderer/renderer.ts
types.ts renderer/types.ts
webgl.ts backends/webgl.ts
canvas2d.ts backends/canvas2d.ts
camera.ts camera/camera.ts
device-size.ts camera/device-size.ts
skin.ts skins/skin.ts
skin-toggle.ts skins/skin-toggle.ts
dots.ts dots/dots.ts
colour.ts dots/colour.ts
minimap.ts dots/minimap.ts
skin-a.json dots/skin-a.json'
    ;;
  web)
    pkg=apps/web
    outside="$pkg/test/*.ts"
    map='app.ts app/app.ts
boot.ts app/boot.ts
lifecycle.ts app/lifecycle.ts
query.ts app/query.ts
tiers.ts app/tiers.ts
camera-input.ts view/camera-input.ts
hud.ts panels/hud.ts
charts.ts panels/charts.ts
controls.ts panels/controls.ts'
    ;;
  bench)
    pkg=tools/bench
    outside="$pkg/test/*.ts $pkg/test/browser/*.ts apps/web/test/browser/startup.spec.ts"
    map='allocation.ts compute/allocation.ts
budgets.ts compute/budgets.ts
judge.ts compute/judge.ts
sample.ts compute/sample.ts
serve-isolated.ts compute/serve-isolated.ts
benchmark-index.ts machine/benchmark-index.ts
LICENSE-lighthouse.txt machine/LICENSE-lighthouse.txt
loadavg.ts machine/loadavg.ts'
    ;;
  names)
    pkg=tools/names
    outside="$pkg/test/*.ts $pkg/scripts/*.ts"
    map='fold.ts text/fold.ts
edit.ts text/edit.ts
franchise.ts filters/franchise.ts
real-world.ts filters/real-world.ts
culture-text.ts lints/culture-text.ts
scan.ts lints/scan.ts'
    ;;
  *)
    echo 'usage: bash .superpowers/m0.7/move.sh sim-core|sim-protocol|sim-worker|sim-culture|render-gl|web|bench|names' >&2
    exit 2
    ;;
esac
src="$pkg/src"
esc() { printf '%s' "${1//./\\.}"; }
names=$(cut -d' ' -f1 <<< "$map" | sed 's/\./\\./g' | paste -sd'|')
# Only files that name a moved file are rewritten, so sed leaves every other file's line endings alone.
rewrite() {
  local script=$1
  shift
  local files
  files=$(grep -lE "(/src/|'\\./|'\\.\\./)($names)'" "$@" || true)
  if [ -n "$files" ]; then sed -i "$script" $files; fi
}

while read -r old new; do
  mkdir -p "$src/$(dirname "$new")"
  git mv "$src/$old" "$src/$new"
done <<< "$map"

entry_script=''
nested_script=''
outside_script=''
while read -r old new; do
  o=$(esc "$old")
  entry_script+="s#'\\./$o'#'./$new'#g;"
  nested_script+="s#'\\.\\./$o'#'../$new'#g;"
  outside_script+="s#/src/$o'#/src/$new'#g;"
done <<< "$map"
rewrite "$entry_script" "$src"/*.ts
if [ -n "$nested" ]; then rewrite "$nested_script" $nested; fi
if [ -n "$outside" ]; then rewrite "$outside_script" $outside; fi

for dir in $(cut -d' ' -f2 <<< "$map" | xargs -n1 dirname | sort -u); do
  script=''
  while read -r old new; do
    if [ "$(dirname "$new")" = "$dir" ]; then to="./$(basename "$new")"; else to="../$new"; fi
    script+="s#'\\./$(esc "$old")'#'$to'#g;"
  done <<< "$map"
  rewrite "$script" "$src/$dir"/*.ts
done
git status --short
```
