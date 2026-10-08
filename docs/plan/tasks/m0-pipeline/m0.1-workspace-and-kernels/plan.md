# M0.1 Workspace and Kernels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pnpm workspace with `@nomos/sim-core`, its lint profile and CI, and the deterministic kernels every later system uses: the keyed draw, integer value noise and the calendar, matching the Python world generator bit for bit.

**Architecture:** `sim-core` is pure TypeScript with no DOM. Every random number comes from a stateless keyed hash, `draw(seed, stream, ...keys)`, ported from `tools/worldgen/rng.py`. Noise and the calendar use integer maths only. A Python script writes test vectors from the reference generator, and Vitest checks the port against them in Node; other engines follow in M0.6.

**Tech Stack:** Node 24 (runs `.ts` scripts natively), pnpm 10.12.1, TypeScript 6.0 in strict mode, Vitest 5, ESLint 10 with typescript-eslint, GitHub Actions, Python 3.12 for the vectors.

**Spec:** [M0 Pipeline](../../../implementation-plan.md#m0-pipeline), [calendar.md](../../../calendar.md), `tools/worldgen/rng.py` and `tools/worldgen/noise.py`. The sub-milestone list is [milestone.md](../milestone.md).

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, then a body whose `Task:` line names the task by ID and title, such as `Task: M0.1 Workspace and kernels, task 1: Workspace, CI and the keyed draw`, and no co-author.
- `sim-core` is pure TypeScript with no DOM (R1).
- In `sim-core`, use only `+ - * /`, `Math.sqrt`, `Math.floor`, `Math.imul` and bit operations. Never use `Math.sin`, `cos`, `exp`, `log`, `pow`, `hypot`, `atan2`, `**` or `Math.random`; build tables at build time instead (sim-core rules).
- No `BigInt` in hot code (sim-core rules).
- Every random number comes from the keyed draw, with the seed hashed before any key (sim-core rules, R9).
- 32-bit draw arithmetic uses `Math.imul` and `>>>`, and results are unsigned (`>>> 0`), as `rng.py` notes.
- Hot-path draws take a fixed number of arguments, so per-tick code never allocates (R9).
- Relative imports carry their `.ts` extension, so Node runs scripts without a build step.
- The calendar has 1,440 ticks a day, 7-day weeks (weekdays 0–4 are workdays, 5 and 6 rest days), 28-day seasons and 112-day years, with tick 0 at 00:00 on Spring 1, Year 1 (calendar.md).
- Keep it simple, build only what this sub-milestone needs, and comment only the why (code rules). When a simplicity limit fires, split or flatten the code; never silence it with `eslint-disable`.

## Review Focus

1. **Negative keys and coordinates.** `draw(seed, stream, -1)` must equal Python's `k & MASK`, and `value` at negative x and y must floor like Python's `divmod`. The vectors include both (Tasks 1 and 3).
2. **Seeds and keys at or above 2^31**, such as 0x80000000 and 0xFFFFFFFF, must not go negative. The vectors include them (Task 1).
3. **Small noise cells.** Cell sizes of 1 and 3, and fbm octaves where `cell >> octave` reaches 0 and `max(1, …)` applies, are in the vectors (Task 3).
4. **Calendar edges:** the last minute of a year (tick 161,279 → 161,280) and negative ticks before Year 1 (Task 4).
5. **The lint profile** must reject banned maths in `src/` but allow it in the build script that generates the day-length table (Task 2).
6. **Simplicity limits:** no `eslint-disable` comment silences `complexity`, `max-depth` or `no-nested-ternary` (Task 1).

---

### Task 1: Workspace, CI and the keyed draw

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `eslint.config.js`, `.github/workflows/ci.yml`
- Create: `packages/sim-core/package.json`, `packages/sim-core/tsconfig.json`, `packages/sim-core/src/draw.ts`, `packages/sim-core/src/index.ts`
- Create: `tools/worldgen/vectors.py`, generating `packages/sim-core/test/fixtures/kernels.json`
- Test: `packages/sim-core/test/draw.test.ts`

**Interfaces:**
- Produces, from `@nomos/sim-core`:
  - `mix(x: number): number`: lowbias32, an unsigned 32-bit result.
  - `draw(seed: number, stream: number, ...keys: number[]): number`: unsigned 32-bit, for tests and code outside the tick.
  - `draw1(seed, stream, a)`, `draw2(seed, stream, a, b)`, `draw3(seed, stream, a, b, c)` and `draw4(seed, stream, a, b, c, d)`: the same values without allocating.
  - `below(n: number, seed: number, stream: number, ...keys: number[]): number`, which is `draw(...) % n`.
- Produces the fixture `kernels.json`: `{ "mix": [[x, out], …], "draw": [{ "seed", "stream", "keys", "out" }, …], "below": [{ "n", "seed", "stream", "keys", "out" }, …], "fade": [[t, out], …], "value": [{ "seed", "stream", "x", "y", "cell", "octave", "out" }, …], "fbm": [{ "seed", "stream", "x", "y", "cell", "octaves", "out" }, …] }`.

- [ ] **Step 1: Scaffold the workspace**
  - Root `package.json`: `"name": "nomos"`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@10.12.1"`, `"engines": { "node": ">=24.2" }`, since the day-length generator uses `import.meta.main`, and scripts `"test": "vitest run"`, `"lint": "eslint ."`, `"typecheck": "pnpm -r --if-present run typecheck"`.
  - `pnpm-workspace.yaml`: `packages: [packages/*, apps/*, tools/cli, tools/bench]`.
  - Run `pnpm add -Dw typescript@~6.0.3 vitest@^5.0.3 eslint@^10.12.0 @eslint/js@^10.0.1 typescript-eslint@^8.71.1 @types/node@^24`. Unpinned, it installs TypeScript 7, which typescript-eslint 8.71 rejects: it accepts only versions below 6.1.
  - `tsconfig.base.json`: `strict`, `target` and `lib` ES2022, `module` ESNext, `moduleResolution` Bundler, `verbatimModuleSyntax`, `isolatedModules`, `allowImportingTsExtensions`, `noEmit`, `skipLibCheck`.
  - `packages/sim-core/package.json`: `"name": "@nomos/sim-core"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, `"scripts": { "typecheck": "tsc --noEmit" }`.
  - `packages/sim-core/tsconfig.json`: extends the base, includes `src`, `test` and `scripts`, and sets `"types": ["node"]`, because TypeScript 6 no longer loads `@types/node` by itself.
  - `vitest.config.ts`: `test.include` is `['packages/*/test/**/*.test.ts']`.
  - `eslint.config.js`: `@eslint/js` recommended plus typescript-eslint recommended, ignoring `docs/**`, `graphify-out/**`, `.claude/**`, `.githooks/**`, `dist/**`, `coverage/**` and `assets/**`. Round 7's prototypes under `docs/` carry their own `node_modules`, and the local-only `.claude/` and the CommonJS hook in `.githooks/` hold scripts outside the workspace.
  - The same file sets simplicity limits for `**/*.ts` (code rules):
    - `complexity: ['error', { max: 10, variant: 'modified' }]`, where `modified` counts a `switch` once and needs ESLint 9.12 or later;
    - `max-depth: ['error', 4]`;
    - `no-nested-ternary: 'error'`.

    Add no parameter limit: per-tick code passes values one by one rather than allocating an options object.

  Run: `pnpm install`. Expected: it succeeds and writes `pnpm-lock.yaml`.

- [ ] **Step 2: Write the Python vectors**

  `tools/worldgen/vectors.py` imports `rng` and `noise` and writes `kernels.json`, sorted and with stable formatting. With `--check` it compares the output with the committed file instead and exits 1 on any difference. Inputs:
  - `mix` of 0, 1, 2, 12345678, 0x7FFFFFFF, 0x80000000, 0x9E3779B9 and 0xFFFFFFFF;
  - `draw` over seeds 0, 1, 42, 0x09F02FFE, 0x7FFFFFFF, 0x80000000 and 0xFFFFFFFF, streams 0, 1, 12 and 255, and key tuples `()`, `(0,)`, `(-1,)`, `(7, -37)`, `(2**31, 5, 9)` and `(0xFFFFFFFF, 1, 2, 3)`;
  - `below` with n of 1, 2, 3, 1000, 65536 and 0x7FFFFFFF, over the first three seeds, the first two streams and the second to fourth key tuples;
  - `fade` for t from 0 to 32,768 in steps of 1,024, plus 1 and 32,767;
  - `value` over seeds 1 and 42, stream 3, x in −50, −1, 0, 15, 100 and 1000, y in −7, 0, 33 and 999, cells 1, 3, 7, 16 and 96, and octaves 0 and 2;
  - `fbm` over seed 42, stream 5, (x, y) in (−50, 3), (0, 0), (15, 77) and (1000, 999), cells 1, 3, 32 and 96, and octaves 1, 3 and 5.

  Run: `python tools/worldgen/vectors.py`, then `python tools/worldgen/vectors.py --check`. Expected: the first prints the number of cases per kernel; the second exits 0.

- [ ] **Step 3: Commit the scaffold and vectors**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json vitest.config.ts eslint.config.js packages/sim-core/package.json packages/sim-core/tsconfig.json
git commit -m "build: set up the pnpm workspace and sim-core"
git add tools/worldgen/vectors.py packages/sim-core/test/fixtures/kernels.json
git commit -m "test(worldgen): write kernel vectors for the TypeScript port"
```

- [ ] **Step 4: Write the failing tests** in `packages/sim-core/test/draw.test.ts`, loading the fixture with `JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'))`:
  - `matches the Python vectors for mix, draw and below`: every case, with `expect(...).toBe(out)`;
  - `gives the fixed-arity draws the same values`: for every `draw` case with one to four keys, `drawN` equals `draw`;
  - `gives each entity the same draw in any visiting order`: `draw2(42, 7, id, 1000)` for ids 0–9,999 visited forward and in the order of `draw(1, 99, id)` match per id;
  - `spreads a million entities evenly over 16 buckets`: bucket `draw2(42, 7, id, 1000) >>> 28` for ids 0–999,999; expected 62,500 per bucket; χ² below 37.70 (p = 0.001, 15 degrees of freedom);
  - `gives neighbouring seeds unrelated draws`, added as built for task.md's verify-first item: seeds 0 and 1, and 42 and 43, share no draws over 10,000 ids;
  - `keeps streams independent`: for stream pairs (1, 2), (2, 3) and (7, 255), the joint bucket `(draw2(42, s1, id, 0) >>> 30) * 4 + (draw2(42, s2, id, 0) >>> 30)` over a million ids has χ² below 37.70 (R8).

  Run: `pnpm test`. Expected: FAIL, because `../src/index.ts` exports nothing yet.

- [ ] **Step 5: Implement `src/draw.ts`** and export it from `src/index.ts`. Port `rng.mix` and `rng.draw`: one `Math.imul` per multiply, `>>>` for every right shift, and `>>> 0` on every result. JS `^` already reduces a key modulo 2^32, as Python's `& MASK` does, so negative keys and keys up to 0xFFFFFFFF need no extra step. `draw1`–`draw4` unroll the key loop.

- [ ] **Step 6: Run the tests.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

- [ ] **Step 7: Add CI** in `.github/workflows/ci.yml`. It runs on push to `main` on `ubuntu-latest`, with `actions/checkout@v7`, `pnpm/action-setup@v6` (which reads `packageManager`), `actions/setup-node@v7` (Node 24, with an explicit `cache: pnpm`, since it auto-caches only npm from v6 on) and `actions/setup-python@v7` (3.12). Its steps are `pnpm install --frozen-lockfile`, `python tools/worldgen/vectors.py --check`, `pnpm lint`, `pnpm typecheck` and `pnpm test`.

- [ ] **Step 8: Commit**

```bash
git add packages/sim-core/src packages/sim-core/test/draw.test.ts
git commit -m "feat(sim-core): port the keyed draw"
git add .github/workflows/ci.yml
git commit -m "ci: run the vectors, lint, types and tests on main"
```

### Task 2: The sim-core lint profile

**Files:**
- Modify: `eslint.config.js`
- Test: `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: the workspace from Task 1.
- Produces: the rules `no-restricted-properties` and `no-restricted-syntax` on `packages/sim-core/src/**/*.ts`. Later sub-milestones extend this profile (M0.3, M0.6). M0.2 exempts the apportionment module, whose `BigInt` path the sim-core rules allow because it is not hot code.

- [ ] **Step 1: Write the failing tests** with ESLint's Node API, `new ESLint({ cwd: <repo root> })` and `lintText(code, { filePath })`, counting only messages whose `ruleId` is `no-restricted-properties` or `no-restricted-syntax`:
  - `rejects transcendental Math, ** and BigInt in sim-core source`: each of `export const a = Math.sin(1)`, `Math.pow(2, 3)`, `Math.random()`, `Math.log(2)`, `2 ** 3`, `let b = 2; b **= 2; export { b }`, `export const c = 10n`, `BigInt(1)` and `new BigInt64Array(1)`, at `packages/sim-core/src/planted.ts`, gives at least one such message;
  - `allows the same maths in build scripts`: `export const x = Math.cos(1)` at `packages/sim-core/scripts/planted.ts` gives none.

  Give the test `{ timeout: 30_000 }`: its first run on a fresh install takes about 6 s, past Vitest's 5 s default.

  Run: `pnpm test -- lint`. Expected: FAIL on the first test.

- [ ] **Step 2: Add the profile** for `packages/sim-core/src/**/*.ts`. It bans the `Math` members `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `exp`, `expm1`, `log`, `log1p`, `log2`, `log10`, `pow`, `hypot`, `cbrt` and `random`. It also bans these syntax selectors: `BinaryExpression[operator='**']`, `AssignmentExpression[operator='**=']`, `Literal[bigint]`, `CallExpression[callee.name='BigInt']` and `Identifier[name=/^Big(Int|Uint)64Array$/]`. Each message names the sim-core rule it enforces.

- [ ] **Step 3: Run the tests.** Run: `pnpm test && pnpm lint`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js packages/sim-core/test/lint.test.ts
git commit -m "build(sim-core): lint-ban transcendental maths and BigInt"
```

### Task 3: Integer value noise

**Files:**
- As built: `int.ts` and its `floors like Python` test, in `test/int.test.ts`, landed with Task 4, which ran first because it needs them.
- Create: `packages/sim-core/src/int.ts`, `packages/sim-core/src/noise.ts`
- Modify: `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/test/noise.test.ts`

**Interfaces:**
- Consumes: `draw3` from Task 1.
- Produces:
  - `floorDiv(a: number, b: number): number` and `floorMod(a: number, b: number): number`: Python's `//` and `%` for integers with |a| and |b| below 2^31, where `Math.floor(a / b)` is exact;
  - `ONE = 32768`;
  - `fade(t: number): number` for t in 0..ONE;
  - `value(seed: number, stream: number, x: number, y: number, cell: number, octave?: number): number`, returning 0..65535, with octave defaulting to 0;
  - `fbm(seed: number, stream: number, x: number, y: number, cell: number, octaves?: number): number`, with octaves defaulting to 5.

- [ ] **Step 1: Write the failing tests:**
  - `floors like Python`: `floorDiv`/`floorMod` of (7, 2) → (3, 1), (−7, 2) → (−4, 1), (7, −2) → (−4, −1), (−7, −2) → (3, −1) and (0, 5) → (0, 0);
  - `matches the Python vectors for fade, value and fbm`: every fixture case.

  Run: `pnpm test -- noise`. Expected: FAIL.

- [ ] **Step 2: Implement `int.ts` and `noise.ts`.** Port `noise.py`, with `floorDiv` and `floorMod` in place of `divmod` and `//`. Lattice values are `draw3(seed, stream, octave, ix, iy) >>> 16`. Interpolation uses `>>`, which floors negatives as Python's `>>` does. Every intermediate fits a signed 32-bit integer: `fade` peaks at 2^30, and `(b - a) * t` stays below 2^31.

- [ ] **Step 3: Run the tests.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/sim-core/src/int.ts packages/sim-core/src/noise.ts packages/sim-core/src/index.ts packages/sim-core/test/noise.test.ts
git commit -m "feat(sim-core): port integer value noise"
```

### Task 4: The calendar

**Files:**
- Create: `packages/sim-core/src/calendar.ts`, `packages/sim-core/scripts/day-length.ts`, and the generated `packages/sim-core/src/day-length.ts`
- Modify: `packages/sim-core/src/index.ts`, and add `"tables": "node scripts/day-length.ts"` to `packages/sim-core/package.json`
- Test: `packages/sim-core/test/calendar.test.ts`

**Interfaces:**
- Consumes: `floorDiv` and `floorMod` from Task 3.
- Produces:
  - constants `TICKS_PER_DAY = 1440`, `DAYS_PER_WEEK = 7`, `DAYS_PER_SEASON = 28`, `DAYS_PER_YEAR = 112` and `TICKS_PER_YEAR = 161280`;
  - `dayOf(tick)` and `minuteOf(tick)`;
  - `yearOf(day)`, counted from 1; `dayOfYear(day)`, 0..111; `seasonOf(day)`, 0 spring to 3 winter; `dayOfSeason(day)`, 1..28;
  - `weekdayOf(day)`, 0..6, and `isRestDay(day): boolean`;
  - `tickAt(year, season, dayOfSeason, minute)`;
  - `SUNRISE` and `SUNSET`: `Uint16Array`s of 112 minutes each.
  
  Every function takes and returns numbers, never objects, so tick code can call them without allocating.
- Produces `dayLengthTable(): { sunrise: number[], sunset: number[] }` from `scripts/day-length.ts`, the build-time generator. Running it as a script writes `src/day-length.ts`. For day d, light = 720 + 120 × cos(2π(d − 42) / 112) minutes, half = round(light / 2), sunrise = 720 − half and sunset = 720 + half.

- [ ] **Step 1: Write the failing tests:**
  - `round-trips ticks through their dates`: every 997th tick from −2 × `TICKS_PER_YEAR` to 3 × `TICKS_PER_YEAR`, plus −1, 0, 1439, 1440, 161,279 and 161,280, satisfies `tickAt(yearOf(d), seasonOf(d), dayOfSeason(d), minuteOf(t)) === t` with `d = dayOf(t)`;
  - `lines up seasons, weeks and years`: `DAYS_PER_SEASON === 4 * DAYS_PER_WEEK`, `DAYS_PER_YEAR === 4 * DAYS_PER_SEASON`, and `weekdayOf(dayOf(tickAt(y, s, 1, 0))) === 0` for years 1–3 and seasons 0–3;
  - `rests on the last two days of each week`: `isRestDay` for days 0–6 is false five times, then true twice;
  - `turns the year at tick 161,280`: tick 161,279 is Year 1, season 3, day 28, minute 1439; tick 161,280 is Year 2, season 0, day 1, minute 0;
  - `counts back before Year 1`: tick −1 is Year 0, season 3, day 28, minute 1439;
  - `gives 14 hours of light at mid-summer and 10 at mid-winter, centred on noon`: `SUNSET[42] - SUNRISE[42] === 840`, `SUNSET[98] - SUNRISE[98] === 600`, and `SUNRISE[d] + SUNSET[d] === 1440` for all 112 days;
  - `matches its generator`: `Array.from(SUNRISE)` and `Array.from(SUNSET)` equal `dayLengthTable()`.

  Run: `pnpm test -- calendar`. Expected: FAIL.

- [ ] **Step 2: Write the generator and run it.** Run: `pnpm --filter @nomos/sim-core run tables`. Expected: it writes `src/day-length.ts` with a one-line header naming the generator.

- [ ] **Step 3: Implement `calendar.ts`** with `floorDiv` and `floorMod`, so negative ticks count back into Year 0 and earlier.

- [ ] **Step 4: Run the tests.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/sim-core/scripts/day-length.ts packages/sim-core/src/day-length.ts packages/sim-core/src/calendar.ts packages/sim-core/src/index.ts packages/sim-core/package.json packages/sim-core/test/calendar.test.ts
git commit -m "feat(sim-core): add the calendar"
```

### Task 5: Close M0.1

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, and the shared plan doc, then its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Confirm CI passes on `main`.** Run: `gh run list --limit 1`. Expected: the latest run's conclusion is success.
- [ ] **Step 2: Record the pace.** Fill in M0.1's Started, Done and Actual cells in the overview's table. Compare Actual with the 2–3-day estimate, and rescale the remaining estimates by that ratio.
- [ ] **Step 3: Tick what landed** in the shared doc's M0 section: the finaliser with cross-stream χ² (R8), the calendar module (Calendar), and the χ² and calendar exit checks (R4, Calendar). Then export with `/sync-plan-doc`.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git commit -m "docs(plan): record the M0.1 pace"
git add docs/plan/implementation-plan.md
git commit -m "docs(plan): sync the implementation plan from the doc"
```
