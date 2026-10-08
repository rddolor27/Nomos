# M0.6 Gates and Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CI gates for every rule the plan relies on: compute and load budgets with the day-slice row, kernels and replay hashes in five engines, the hot-path, generator, name and text lints, and `sim-culture` walled off and proven inert by the relabel test.

**Architecture:** Each new lint profile registers its own copy of an ESLint core rule, so profiles stack; dependency-cruiser adds reachability. `@nomos/bench` times M0.3's step through its `SystemTimer` in Node and Chromium against one sub-budget table, and extends M0.5's startup benchmark. `@nomos/names` holds the name and text lints. `sim-culture` imports only a kernel subpath of `sim-core`, and only `consumption/` imports it.

**Tech Stack:** M0.1–M0.5's stack, plus dependency-cruiser 16, Bun 1.3 and `node:perf_hooks`.

**Spec:** [task.md](task.md), [interfaces.md](../interfaces.md) and the [CI and Load CI gates][perf]. Sources, read but never imported: R5 [compute notes][r5c], [load notes][r5l], [CI drafts][r5ci] and [lint prototype][r5lint]; R8 [customs notes][r8c] (parts c, d), [prior-art notes][r8e] (part c) and [guard demo][r8g]; the R9 [report][r9], "The port matches so far, with four traps to avoid".

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, then a body whose `Task:` line names the task by ID and title, such as `Task: M0.6 Gates and guards, task 1: Kernels and replay goldens in five engines`, and no co-author; `docs/` in its own commits.
- Sim source uses exact arithmetic and keyed draws on stable ids; per-tick functions allocate nothing (no literals, closures, `new`, spread, templates, `for…of`, array callbacks, `slice`, `subarray`, strings or clocks); only the day boundary writes canonical state (sim-core rules).
- Culture shapes demand and leisure only: `crime/`, `police/`, `labour/`, `wages/`, `wealth/`, `ability/`, `housing/` and `migration/` never import `sim-culture` or read a culture column, and `consumption/` may. Culture-level draws are keyed by a stable uid, never an index (R8, content rule 8).
- No "Pokémon", "Poké-" or "-mon" name in file names, package names, identifiers or strings, fixture names included (content rules).
- Fixture sources are CC0 or permissive, licence files beside them (Wikidata CC0 1.0, CLDR Unicode License v3). Culture text gives shares, never bare-plural generics or hierarchy words (R8).
- Compute: the sub-budget table, failing when the fastest of ≥ 9 samples exceeds a budget by > 10%; worst day slice ≤ 0.35 ms RM; zero scavenges over a full day; heap growth < 64 KB a tick (Performance budget).
- Load: brotli size-limit on every chunk; initial JS ≤ 12 kB (stand-in), ≤ 35 kB (production); town map ≤ 40 kB; atlas ≤ 300 kB; 7 cold loads at BenchmarkIndex ≈ 375 with a worker busy-wait, failing on a median over budget or > 15% and > 20 ms worse than `main` (Performance budget).
- Record engine, version and `/proc/loadavg` beside every timing (docs rules). CI runs on every push to `main`. Relative imports carry `.ts`; comments say only why (code rules).

## Review Focus

1. **Unicode forms of the franchise name:** composed and decomposed "é", capitals, paths and package names are caught; "spoke", "bespoke" and "poke" pass (Task 8).
2. **Type imports through orchestration:** a guarded file may `import type` from a module that imports `sim-culture`; a value import from it fails (Task 6).
3. **Evasive culture reads:** `import()`, `export * from`, renamed and computed destructuring, `Reflect.get` and template-literal keys are caught (Task 5).
4. **Error paths in hot code:** `` throw new RangeError(`…${n}`) `` passes the hot-path lint; `new` outside a `throw` fails (Task 2).
5. **Coarse clocks and short runs:** Chromium without cross-origin isolation, or fewer than 9 samples, fails the budget gate (Task 10).

---

### Task 1: Kernels and replay goldens in five engines (R1, R2, R5, R9)

**Files:**
- Create, in `packages/sim-core/`: `test/engines/checks.ts`, `scripts/goldens.ts`, `scripts/engines.ts`, the generated `test/fixtures/goldens.json`, `test/browser/engines.spec.ts`
- Modify: `.github/workflows/ci.yml`
- Test: `packages/sim-core/test/goldens.test.ts`

**Interfaces:**
- Consumes: `kernels.json` (with M0.2's `look` cases), the kernels, `createWorld`, `step`, `stateHash`, `Tier`; M0.4's Playwright config.
- Produces: `replayHash(seed, tier, ticks): string` (8 hex digits, as the CLI prints); `checkKernels(fixture: KernelFixture)` (the shape of `kernels.json`) and `checkGoldens(goldens: Goldens)`, each returning `EngineReport = { cases: number; failures: string[] }`, with `Goldens = { ticks: number; hashes: Record<string, string> }` keyed `"<seed>/<tier>"`; `goldens.json` for seed 42 at tick 1,000 per tier, regenerated by any commit that moves the sim on purpose.

- [ ] **Step 1: Write the failing tests:** `matches the goldens in Node` (3 cases, no failure); `agrees with the CLI` (`--seed 42 --tier phone --ticks 1000` prints the golden); `reports a wrong vector` (one `fbm` output plus 1 gives one failure naming `fbm`). Run `pnpm test -- goldens`: FAIL.
- [ ] **Step 2: Implement.** `checkKernels` runs every case, `look` as `draw1(seed, LOOK, id) % LOOKS`. `goldens.ts` writes the fixture. `engines.ts` runs both checks in its runtime, prints `<runtime> <version>: kernels <n> ok, goldens <n> ok`, and exits 1 on failure. Run `node packages/sim-core/scripts/goldens.ts && pnpm test`: PASS.
- [ ] **Step 3: Run in the browsers.** `engines.spec.ts` bundles `checks.ts` with esbuild (`iife`, `globalName: 'nomosEngines'`), adds it to a blank page, runs both checks through `page.evaluate`, and annotates the browser version. Run `pnpm test:browser engines`: PASS in chromium, firefox and webkit.
- [ ] **Step 4: Add a `bun` job:** `oven-sh/setup-bun@v2` pinned to 1.3, `pnpm install --frozen-lockfile`, `bun packages/sim-core/scripts/engines.ts`. Commit:

```bash
git add packages/sim-core/test packages/sim-core/scripts
git commit -m "test(sim-core): check kernels and replay goldens in five engines"
git add .github/workflows/ci.yml
git commit -m "ci: run the engine checks under bun"
```

### Task 2: The full hot-path lint (R5)

**Files:**
- Modify: `eslint.config.js`, and any code it flags
- Test: `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Produces in `eslint.config.js`:
  - `HOT_FILES`, the one home of the per-tick list: M0.3's `packages/sim-core/src/{world,wander,day,slices,stride,inputs,histogram}.ts` and `packages/sim-protocol/src/{snapshot,visual}.ts`, plus their per-tick callees `packages/sim-core/src/{int,calendar,space,store,ledger,money,claims,registry,flows,split,log2,invariants}.ts`. `draw.ts` (whose variadic `draw` and `below` serve non-tick code) and `apportion.ts` (`BigInt`) stay out; later systems add theirs;
  - `COLD = /^(create|layout|populate|restore|checkpoint|giveBack|fail)/`, the hot-file functions M0.2 and M0.3 let allocate; without `take`, `takeView` stays checked;
  - plugin `hot`: the core `no-restricted-syntax` from `eslint/use-at-your-own-risk`'s `builtinRules`. Flat config replaces a rule's options per block, so each profile needs its own copy.

- [ ] **Step 1: Write the failing tests** (messages from rules ending `no-restricted-syntax` or `no-restricted-properties`): `rejects every allocation and clock in a hot function` (inside `export function tick(a: Int32Array)` at `src/wander.ts`, each of `[1]`, `{ a: 1 }`, `() => 1`, `function inner() {}`, `new Int32Array(4)`, `Math.max(...a)`, a template literal, `for…of`, `for…in`, `a.forEach(g)`, `a.map(g)`, `a.slice(1)`, `a.subarray(1)`, `BigInt(1)`, `Math.random()`, `Math.exp(1)`, `Date.now()`, `performance.now()` and `draw(1, 2, 3)`); `allows creation, errors and constants` (`new Int32Array(4)` in `createThing`, `` throw new RangeError(`bad ${a.length}`) `` in `tick`, a module-level array); `sees every hot function` (`export const tick = (a) => a[0]` fails); `leaves other files alone` (the first list at `src/warm.ts` gives no `hot/` message). Run `pnpm test -- lint`: FAIL.
- [ ] **Step 2: Add the profile,** each selector prefixed `FunctionDeclaration:not([id.name=${COLD}])`. Copy the R5 prototype's selectors; spare errors with `NewExpression:not(ThrowStatement NewExpression)` and likewise `TemplateLiteral`. Add nested `FunctionDeclaration`, `CallExpression[callee.name=/^(draw|below)$/]` ("use draw1–draw4"), `Date`, `performance.now`, and anywhere `VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)`. `BigInt` and banned `Math` are already banned in all sim source.
- [ ] **Step 3: Lint the tree.** Fix each finding in the flagged code; widen `COLD` only for a creation, restore or failure path. Run `pnpm lint && pnpm test && pnpm typecheck`: PASS. Commit:

```bash
git add eslint.config.js packages/sim-core packages/sim-protocol/src
git commit -m "build(sim-core): lint every per-tick file for allocation and clocks"
```

### Task 3: Generator and map lints (R4, R9)

**Files:**
- Modify: `eslint.config.js`, `packages/sim-core/src/draw.ts`, any division flagged in `noise.ts` or `map.ts`
- Test: `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Produces: the sim profile (the `Math` member ban, `MATH_SYNTAX`, `BIGINT_SYNTAX`, `RATE_PRODUCTS`, `SORT_CALLS`) on `packages/sim-*/src/**/*.ts` instead of M0.3's three packages, with `LOOK_READS` extended to `packages/sim-culture/src/**` (content rule 1); `GENERATOR_FILES` = `packages/sim-core/src/{draw,noise}.ts`, the map parser `packages/sim-protocol/src/map.ts` and `packages/sim-*/src/worldgen/**/*.ts` (M3.1's port); plugin `gen` with its own `no-restricted-syntax` there.
- **Ruling on `below`:** JS `%` equals Python's for a non-negative left operand, and R9's first trap is a signed draw before `%`. So `%` is allowed only as `(x >>> 0) % n`, and `below` becomes `(draw(seed, stream, ...keys) >>> 0) % n`, changing no value.

- [ ] **Step 1: Write the failing tests:** `bans transcendental maths in every sim package` (`Math.sin(1)` and `BigInt(1)` at `packages/sim-culture/src/planted.ts` and at `map.ts`; `s.look[0]` at the former); `bans bare division in generator code` (`a / b`, `a /= 2`, `a % b`, `(a | 0) % b`, `a %= 3` at `noise.ts` give `gen/` messages; `(h >>> 0) % n` none); `spares the helpers and other code` (`a / b`, `a % b` at `int.ts` and `ledger.ts` give none). Run `pnpm test -- lint`: FAIL.
- [ ] **Step 2: Implement** `BinaryExpression[operator='/']`, `AssignmentExpression[operator=/^[/%]=$/]` and `BinaryExpression[operator='%'][left.operator!='>>>']`, with messages pointing to `floorDiv`, `floorMod` or a shift and citing R9's traps. Rewrite `below` and fix flagged code. Run `pnpm test && pnpm lint && pnpm typecheck`: PASS, kernel vectors included. Commit:

```bash
git add eslint.config.js packages/sim-core packages/sim-protocol/src
git commit -m "build: lint-ban bare division in generator and map code"
```

### Task 4: The `sim-culture` package (R8)

**Files:**
- Create: `packages/sim-culture/{package.json, tsconfig.json, src/index.ts, src/festivals.ts}`, `packages/sim-core/src/{kernels.ts, consumption/stand-in.ts}`
- Modify: `packages/sim-core/package.json`, `src/{streams,world,index}.ts`; `docs/plan/tasks/m0-pipeline/interfaces.md`
- Test: `packages/sim-culture/test/festivals.test.ts`, `packages/sim-core/test/consumption.test.ts`

**Interfaces:**
- **Layering ruling.** `consumption/` (M2.6) and orchestration (M3.7) call `sim-culture`, which needs `sim-core`'s draw. So `sim-culture` imports values only from `@nomos/sim-core/kernels`, whose modules never import it, and types with `import type`. The manifests name each other; Task 6 keeps the modules acyclic.
- Produces in `sim-core`: `src/kernels.ts`, exported as `"./kernels"` (`draw1`–`draw4`, `DAYS_PER_YEAR`, `CULTURE`, `FESTIVAL`, `customOf`, `withCustom`, `CUSTOM_*`, `MAX_CULTURES`; later code adds more); `FESTIVAL = AGENT_SALT + 5`; `World.cultureUid`, a canonical `Uint8Array(MAX_CULTURES)` from `layoutWorld`, set by `populate` to c + 1 per culture (0 = unused); `festivalShoppers(world, day): number`, the consumption stand-in until M2.6, exported for tests and never called by the step.
- Produces in `sim-culture`: `STAND_IN_FESTIVAL_DAYS = 10` (the guard demo's count) and `festivalToday(seed, uid, day)`, true when `draw3(seed, FESTIVAL, uid, day) % DAYS_PER_YEAR < 10`, until M3.7's festival table. **Ruling:** the package's other contents arrive with their first users: preference rows (M2.6), naming rules (M3.7), region ids (M8.2) and flow splits by culture (M5.5, M7.6) on M0.2's `splitByCounts`.

- [ ] **Step 1: Write the failing tests:** `holds about ten festival days a year` (seed 42, uids 1–4, years 1–20: mean 8–12, repeatable, uids 1 and 2 differ); `counts festival shoppers by uid` (a `phone` world on day 3 counts agents whose `customOf(customs, CUSTOM_FESTIVAL)` culture c has `festivalToday(42, cultureUid[c], 3)`, with uids `[1, 2, 3, 4, 0, 0, 0, 0]`). Run `pnpm test -- festivals consumption`: FAIL.
- [ ] **Step 2: Implement.** Scaffold the package as M0.3 did `sim-protocol`, depending on `@nomos/sim-core`; `sim-core` gains the `./kernels` export and a dependency on `@nomos/sim-culture`. `festivalShoppers` fills a module-level `Uint8Array(MAX_CULTURES)` of today's flags, then counts. Run `pnpm install && pnpm test && pnpm lint && pnpm typecheck`: PASS, with pnpm's workspace-cycle warning.
- [ ] **Step 3: Record** the layering, the subpath and `World.cultureUid` in `interfaces.md`. Commit:

```bash
git add packages/sim-culture packages/sim-core pnpm-lock.yaml
git commit -m "feat(sim-culture): add the package and a stand-in festival calendar"
git add docs/plan/tasks/m0-pipeline/interfaces.md
git commit -m "docs(plan): record sim-culture's kernel imports"
```

### Task 5: The culture wall in ESLint (R8)

**Files:**
- Modify: `eslint.config.js`
- Test: `packages/sim-core/test/culture-wall.test.ts`

**Interfaces:**
- Produces: `GUARDED = packages/sim-*/src/{crime,police,labour,wages,wealth,ability,housing,migration}/**/*.ts` (so M7's `sim-country` is guarded too); `CULTURE_NAMES` = M0.2's `culture`, `birthCulture`, `customs`, `homeRegion`, R8's `culture2`, `cultureMix`, `festivalToday`, `nameKey`, and `cultureUid`; plugin `culture`, with its own copies on `GUARDED` of:
  - `no-restricted-imports`: a pattern `regex: '^@nomos/sim-culture(/|$)|/sim-culture/'` (type imports included);
  - `no-restricted-properties`: one `{ property }` per name, object omitted, which covers destructuring (R8 customs notes, part d);
  - `no-restricted-syntax`: a string `Literal` equal to any of `CULTURE_NAMES`, an expression-free `TemplateLiteral` holding one, `Identifier[name=/^(customOf|withCustom|CUSTOM_[A-Z]+|CULTURE|FESTIVAL|MAX_CULTURES)$/]` and `ImportExpression[source.value=/sim-culture/]`, each message citing R8.

- [ ] **Step 1: Write the failing tests.** `catches every planted read`: at `src/crime/planted.ts` each gives a `culture/` message:
  - `import { festivalToday } from '@nomos/sim-culture'` (also in the other seven folders), its `import type` form, `export * from` it, `import '../../../sim-culture/src/index.ts'`, `await import('@nomos/sim-culture')`;
  - `s.culture[i]`, `w.agents.customs[0]`, `s?.homeRegion`, `const { birthCulture } = s`, `const { culture: c } = s`, `const { agents: { culture } } = w`;
  - `s['culture']`, `` s[`customs`] ``, `const { ['homeRegion']: h } = s`, `Reflect.get(s, 'nameKey')`, `customOf(x, 0)`, `CUSTOM_FOOD`, `draw2(seed, CULTURE, i, 0)`.

  `lets consumption read culture`: the same at `src/consumption/planted.ts`, and the real `stand-in.ts`, give none; so do `s.population` and `'cultivate'` in `crime/`. Run `pnpm test -- culture-wall`: FAIL.
- [ ] **Step 2: Implement.** Run `pnpm test && pnpm lint`: PASS. Commit:

```bash
git add eslint.config.js packages/sim-core/test/culture-wall.test.ts
git commit -m "build: wall guarded folders off from culture in eslint"
```

### Task 6: The culture wall in dependency-cruiser (R8)

**Files:**
- Create: `.dependency-cruiser.cjs`, fixture tree `packages/sim-core/test/fixtures/wall/`
- Modify: root `package.json` (`pnpm add -Dw dependency-cruiser@16`; `"depcruise": "depcruise packages apps tools --config .dependency-cruiser.cjs"`), `packages/sim-core/tsconfig.json` (exclude the fixture tree), `.github/workflows/ci.yml`
- Test: `packages/sim-core/test/depcruise.test.ts`

**Interfaces:**
- Produces `forbidden` rules: `culture-wall` (from `^packages/sim-[^/]+/src/(crime|police|labour|wages|wealth|ability|housing|migration)/` to `^packages/sim-culture/`, `reachable: true`); `culture-imports-kernels-only` (from `^packages/sim-culture/src/` to `^packages/sim-core/`, `pathNot` `^packages/sim-core/src/kernels\.ts$`); `kernels-stay-below-culture` (from `kernels.ts` to `^packages/sim-culture/`, `reachable: true`); `no-cycles` (`circular: true`).
- Options: `tsPreCompilationDeps: false`, so type-only imports, which vanish at runtime, form no edge; `verbatimModuleSyntax` already forces `import type`. `exclude` covers `/test/`, `/dist/` and `node_modules`; `enhancedResolveOptions` reads `exports`, so workspace names resolve to `src`.

- [ ] **Step 1: Build the fixture** of one-line `.ts` modules under `wall/packages/`, mirroring the repo. In `sim-core/src/`: `crime/direct.ts` imports `sim-culture`; `wages/offer.ts` → `util/helpers.ts` → `sim-culture`; `world.ts` imports `sim-culture` and exports a type, taken by `police/types-only.ts` with `import type`, and a constant, taken by `labour/value.ts`; `consumption/reads.ts` and `kernels.ts` import `sim-culture`; `a.ts` and `b.ts` import each other. Also `sim-culture/src/stray.ts` imports `sim-core/src/world.ts`.
- [ ] **Step 2: Write the failing tests** with the `cruise` API, the config's rules and `baseDir` at the fixture root: `catches direct and transitive reach` (`culture-wall` fires for `direct.ts`, `offer.ts` via `helpers.ts` and `value.ts`, not `types-only.ts` or `reads.ts`); `keeps sim-culture on the kernels` (`stray.ts`, `kernels.ts` and `a.ts` trip their rules); `passes the real tree` (no violation in `packages`, and an edge from `consumption/stand-in.ts` to `packages/sim-culture/src/index.ts`, so pnpm's symlinks and `exports` resolve, which R8's single-folder test never covered). Run `pnpm test -- depcruise`: FAIL.
- [ ] **Step 3: Write the config.** Run `pnpm test && pnpm depcruise && pnpm lint && pnpm typecheck`: PASS. Add `pnpm depcruise` to the `ci` job. Commit:

```bash
git add .dependency-cruiser.cjs package.json pnpm-lock.yaml packages/sim-core .github/workflows/ci.yml
git commit -m "build: forbid guarded code from reaching sim-culture"
```

### Task 7: The relabel test (R8)

**Files:**
- Create: `packages/sim-culture/src/relabel.ts`, `packages/sim-culture/test/relabel-harness.ts`
- Modify: `packages/sim-core/src/{world,index}.ts`, `packages/sim-culture/src/index.ts`
- Test: `packages/sim-culture/test/relabel.test.ts`

**Interfaces:**
- Consumes: M0.3's `layoutWorld(seed, tier, agents, memoryBytes)` and `populate(world)` (exported from `sim-core` if they are internal), `step`, `issue`, `sectorAccount`, `HOUSEHOLDS`, `festivalShoppers`, `Arena.canonical`.
- Produces:
  - `stateHashExcept(world, skip: readonly ArrayBufferView[]): number`: M0.3's fold, `h = mix(h ^ word)` over each `(offset, length)` pair of `world.arena.canonical`, skipping pairs at a skipped view's `byteOffset`. `stateHash(world)` becomes `stateHashExcept(world, NO_SKIP)`, so no golden moves;
  - `relabelCultures(world, perm: Uint8Array): void`: `perm` must permute 0..k − 1 for the k cultures with nonzero uids, or it throws `RangeError` and writes nothing. It maps `culture`, `birthCulture` and each `customs` nibble through `perm`, and moves `cultureUid[c]` to slot `perm[c]`, as later custom rows will move;
  - `cultureViews(world)`: the four regions the relabel rewrites. **The non-culture hash** is `stateHashExcept(world, cultureViews(world))`, which keeps `homeRegion`;
  - `relabelRun(seed, perm | null, days, daily?): number[]` (harness): a 1,024-agent world (M0.3's warm-up size, so a year fits every push), relabelled before tick 0, with `daily(world, day)` after each boundary, returning each day's closing non-culture hash.
- The relabel test also enforces what lint cannot: no culture-ordered loop that matters, and no indexing by culture outside custom tables.

- [ ] **Step 1: Write the failing tests:**
  - `relabels columns, nibbles and uids together`: after `PERM = [2, 0, 3, 1]`, each value is `PERM` of the old, uids read `[2, 4, 1, 3, 0, 0, 0, 0]`, and the inverse restores every byte; `refuses a non-permutation` (`[0, 0, 1, 2]`, length 3) with `RangeError` and no write;
  - `keeps every non-culture hash for 3 seeds × 1 year` (R8 exit check): seeds 1, 42 and 0x80000000 agree with and without `PERM` at all 112 day ends (161,280 ticks), while `daily` issues `festivalShoppers(world, day)` cents to settlement 0's households. Timeout 120 s;
  - `catches culture read by index` (seed 42, 10 days): each leak makes the runs differ: 1 cent per agent with `culture === 1`; cents to culture c's members when `draw3(42, 0x1F1, c, day)` is odd; the first 100 agents in culture-index order moved 256 Q8 right, masked to `extent − 1`. Keying the second on `cultureUid[c]` keeps them equal.

  Run `pnpm test -- relabel`: FAIL.
- [ ] **Step 2: Implement.** Run `pnpm test && pnpm lint && pnpm typecheck`: PASS, goldens unchanged. Commit:

```bash
git add packages/sim-core/src
git commit -m "feat(sim-core): hash state while skipping chosen regions"
git add packages/sim-culture
git commit -m "test(sim-culture): prove relabelled cultures change no other state"
```

### Task 8: The name lint and the real-world fixture (R3, R8)

**Files:**
- Create: `tools/names/{package.json, tsconfig.json}`, `src/{fold,franchise,scan,cli,edit,real-world}.ts`, `scripts/build-real-world.ts`, `fixtures/{countries,languages,demonyms,ethnonyms,religions,generic-words}.txt`, `fixtures/{LICENSE-cldr.txt, LICENSE-wikidata.txt, sources.json}`
- Modify: `pnpm-workspace.yaml`, `vitest.config.ts` (include `tools/*/test/**/*.test.ts`), root `package.json` (`"names": "node tools/names/src/cli.ts"`), `.github/workflows/ci.yml`, `interfaces.md` (an `@nomos/names` row)
- Test: `tools/names/test/{franchise,real-world}.test.ts`

**Interfaces:**
- Produces `@nomos/names` (private; M3.7 extends it):
  - `foldName(s)`: NFD, combining marks removed, lower case;
  - `franchiseHits(text): string[]`: a hit when `foldName(text)` holds `pok` + `emon` (any accent or decomposition) or the NFC lower case holds `pok` + `é`. The verb "poke" passes, and the source never spells either word (`/pok[e]mon/`);
  - `scanRepo(root): Finding[]` (`{ path, line, text }`): every `git ls-files` path, plus the text of tracked files under `apps/`, `packages/`, `tools/` and the root `package.json`. It skips `.md` (the READMEs state the rule) and files with a NUL in their first 8 KB. Comments count, since the repo publishes them;
  - `withinDistance(a, b, max)`: Levenshtein on two `Int32Array` rows, stopping once a row's minimum exceeds `max`;
  - `loadRealWorld(): RealWorld` (token to category) and `nearRealWorld(name, fixture): string | null`, at distance 1 up to 5 folded letters and 2 above (R8 customs notes, part c).
- **The fixture:** one folded token of ≥ 3 letters per line, sorted and unique, minus `generic-words.txt` (of, the, republic, united, north, saint…). Countries and languages come from CLDR's English `territories.json` and `languages.json` at a pinned `cldr-json` tag. Demonyms (P1549), ethnonyms (Q41710) and religions (Q9174, Q13414953) come from Wikidata's query service. **Ruling:** Wikidata items need ≥ 5 sitelinks, so obscure labels cannot reject good names. `sources.json` records each category's query, date, licence and count.

- [ ] **Step 1: Build the fixture** by hand, since it needs the network: `node tools/names/scripts/build-real-world.ts` writes the five files and copies CLDR's `unicode-license.txt` and CC0 1.0. Commit tokens, never raw query output.
- [ ] **Step 2: Write the failing tests**, building franchise words at runtime (`'Po' + 'kémon'`):
  - `catches every form of the name` (R3 exit check): composed, decomposed (`e` + U+0301), capitals, unaccented, the accented prefix, `assets/<word>/x.png` and `@nomos/<word>-ui`; `allows ordinary words`: "spoke", "bespoke", "poke", "poker"; `scans the repo clean`;
  - `measures edit distance`: kitten–sitting within 3, not 2;
  - `rejects names near real places, peoples and faiths` (R8): "Japn", "Franse", "Spanesh", "Hindo"; a 5-letter name at distance 2 passes, a 6-letter one fails; "Qzorvex" passes;
  - `keeps the fixture clean`: ≥ 100 entries per category (≥ 190 countries), lines `^[a-z]{3,}$`, sorted, unique, hit-free; both licences present; `sources.json` licences are `CC0-1.0` or `Unicode-3.0`.

  Run `pnpm install && pnpm test -- franchise real-world`: FAIL.
- [ ] **Step 3: Implement.** Run `pnpm test && pnpm names && pnpm lint && pnpm typecheck`: PASS, `0 findings`. Add `pnpm names` to the `ci` job and the package row to `interfaces.md`. Commit:

```bash
git add tools/names/fixtures
git commit -m "test(names): add the real-world name fixture with licences"
git add tools/names pnpm-workspace.yaml vitest.config.ts package.json pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "feat(names): lint paths, packages and code for franchise names"
git add docs/plan/tasks/m0-pipeline/interfaces.md
git commit -m "docs(plan): add the names package to the M0 interfaces"
```

### Task 9: The culture text lint (R8)

**Files:**
- Create: `tools/names/src/culture-text.ts`
- Modify: `tools/names/src/cli.ts`
- Test: `tools/names/test/culture-text.test.ts`

**Interfaces:**
- Produces `HIERARCHY_WORDS` ([prior-art notes, part c][r8e]: primitive, savage, tribe, barbarian, neolithic, civilised, civilized, advanced, native, foreign, exotic, race, and the forms primitives, savages, tribes, tribal, barbarians, barbaric, natives, races, racial); `CUSTOM_NOUNS` (custom(s), festival(s), food(s), dish(es), music, song(s), dance(s), name(s), naming, calendar, region, holiday(s)); and `cultureTextHits(text, cultureNames = ['{culture}']): string[]`, on folded words:
  - any hierarchy word is a hit;
  - a culture name in a plural form (name + s or es), or followed by anything but a custom noun, is a hit. That catches "Velans love fish", "Velan people…" and "The Velan are…": the adjective may describe a custom, never people;
  - a sentence with "raised with <name> customs" and no digit or `{share}` is a hit; R8's form is "6 in 10 people raised with Velan customs pick fish".
- Culture strings live in tracked `*.culture.json` tables under `apps/` and `packages/`, which `pnpm names` checks; none exist before M3.7.

- [ ] **Step 1: Write the failing tests:** `rejects generics` (given `['Velan']`: "Velans love fish", "Velan people love fish", "The Velan are proud", "People raised with Velan customs love fish"); `rejects hierarchy words` ("a tribal feast", "Exotic music", "the Neolithic dance"); `accepts shares and customs` ("6 in 10 people raised with Velan customs pick fish", "{share} of people raised with {culture} customs pick {food}", "the Velan festival starts at dusk"); `checks every culture table` (a temp `x.culture.json` holding a generic is reported). Run `pnpm test -- culture-text`: FAIL.
- [ ] **Step 2: Implement.** Run `pnpm test && pnpm names`: PASS. Commit:

```bash
git add tools/names
git commit -m "feat(names): lint culture strings for generics and hierarchy words"
```

### Task 10: `@nomos/bench` and the budget gate (R5, R6)

**Files:**
- Create: `tools/bench/{package.json, tsconfig.json}`, `src/{budgets,sample,judge,loadavg,budget,serve-isolated,browser-entry}.ts`, `test/browser/budget.spec.ts`, `.github/workflows/perf.yml`
- Modify: `.gitignore` (`bench-results/`)
- Test: `tools/bench/test/{judge,sample}.test.ts`

**Interfaces:**
- Consumes: `createWorld`, `step`, `SystemTimer`, `SYSTEM_NAMES` (`['day', 'move']`), `World.checks`, `warmUp`, `createSnapshotPool`, `takeView`, `writeSnapshot` (M0.3).
- Produces:
  - `BudgetRow = { system: string; reduce: 'mean' | 'max'; rmMs: Readonly<Record<string, number>> }`, keyed by scale so M7 can add `1k` and `10k` country rows; `BUDGET_ROWS` for the systems that exist:

    | system | reduce | phone | phone-plus | desktop |
    | --- | --- | --- | --- | --- |
    | `move` | mean | 0.10 | 0.25 | 0.8 |
    | `day`, the day-slice row (R6) | max | 0.35 | 0.35 | 0.35 |
    | `snapshot` | mean | 0.10 | 0.2 | 0.3 |

  - `MIN_SAMPLES = 9`, `TOLERANCE = 0.10`, `BENCH_SEED = 42`, `WARM_DAYS = 1`, `SAMPLE_DAYS = 9`;
  - `sampleTier(tier, days, now): Record<string, Float64Array>`, one value per day per row. It runs `createWorld(BENCH_SEED, tier)` with `checks = false` after `warmUp()` and `WARM_DAYS`, timing laps through a `SystemTimer` into preallocated arrays and each `writeSnapshot` into one view. `move` and `snapshot` take the day's mean and `day` its worst tick, so the row's fastest sample is the best day's worst slice;
  - `judge(rows, scale, samples): Verdict[]` (`{ system, scale, budgetMs, limitMs, fastestMs, samples, pass }`): pass at ≥ `MIN_SAMPLES` with the fastest ≤ budget × (1 + `TOLERANCE`) (R5);
  - `readLoadavg()`: `/proc/loadavg`, else `os.loadavg()` joined; `serveIsolated(files)`: `node:http` with COOP `same-origin` and COEP `require-corp`, so Chromium's clock resolves 5 µs, not 100 µs;
  - `pnpm --filter @nomos/bench budget`: every tier in Node, a line per verdict, `bench-results/budget-node.json` with Node's version and the loadavg around each tier, exit 1 on any failure.
- **Ruling:** the GitHub runner stands in for the reference machine, unscaled; the loadavg shows its load.

- [ ] **Step 1: Write the failing tests:** `judges the fastest sample` (fastest 0.109 passes a 0.10 budget, 0.111 fails); `refuses fewer than 9 samples`; `takes each day's worst tick` (stub laps of 0.3 ms per slice and 1.0 ms at the boundary give 1.0); `samples a phone world` (9 positive values per row). Run `pnpm install && pnpm test -- judge sample`: FAIL.
- [ ] **Step 2: Implement** and run the Node budget: every row passes; note the values with Node's version and loadavg.
- [ ] **Step 3: Add the Chromium run.** `budget.spec.ts` runs only with `BENCH=1`, in chromium, with a 10-minute timeout. It serves `browser-entry.ts`, a module worker running `sampleTier`, through `serveIsolated`, asserts `crossOriginIsolated`, judges, and writes `test-results/budget-chromium.json` with browser version and loadavg. Run `BENCH=1 pnpm exec playwright test tools/bench/test/browser/budget.spec.ts --project=chromium`: PASS.
- [ ] **Step 4: Add `perf.yml`** (push to `main`, `workflow_dispatch`): a `compute` job on `ubuntu-24.04` installs Chromium, runs both budgets and uploads the results. Commit:

```bash
git add tools/bench pnpm-lock.yaml .gitignore
git commit -m "feat(bench): gate per-system tick budgets with a day-slice row"
git add .github/workflows/perf.yml
git commit -m "ci: run the compute budget gate on every push to main"
```

### Task 11: The allocation and ledger gates (R5, R6)

**Files:**
- Create: `tools/bench/src/alloc.ts`
- Modify: `tools/bench/package.json` (`"alloc": "node --expose-gc src/alloc.ts"`), `.github/workflows/{perf,ci}.yml`
- Test: `tools/bench/test/alloc.test.ts`

**Interfaces:**
- Produces `allocationWindow(world, ticks, view: Uint32Array, extra?: (world) => void): { scavenges: number; heapGrowthPerTick: number }`. It counts `perf_hooks` `'gc'` entries with `detail.kind === constants.NODE_PERFORMANCE_GC_MINOR` over `ticks` of `step` plus `writeSnapshot`, read after one `setImmediate`. Heap growth is the change in `v8.getHeapStatistics().used_heap_size` between forced `gc()` calls, or `NaN` without `--expose-gc`.
- The CLI warms each tier as `sampleTier` does, steps to a day boundary, and runs 1,440 ticks: more than R5's 1,000, and a full day of slices (R6). It fails on any scavenge or growth ≥ 65,536 B a tick, printing JSON with Node's version and the loadavg.

- [ ] **Step 1: Write the failing tests:** `sees no scavenge in a day of phone ticks`; `counts a planted allocator` (`extra` making `new Array(10_000)` a tick gives `scavenges > 0`). Run `pnpm test -- alloc`: FAIL.
- [ ] **Step 2: Implement** and run `pnpm --filter @nomos/bench alloc`: 0 scavenges at every tier, growth far below 64 KB.
- [ ] **Step 3: Add the gates:** `alloc` in `perf.yml`'s `compute` job; in `ci.yml`, the ledger gate, `node tools/cli/src/main.ts --seed 7 --tier <tier> --ticks 2880` per tier. M0.3's checks stay on, so any tick whose cents fail `checkCash` exits non-zero (R5). Commit:

```bash
git add tools/bench .github/workflows
git commit -m "feat(bench): gate scavenges, heap growth and the ledger in ci"
```

### Task 12: The byte gates (R5)

**Files:**
- Create: `tools/bench/src/chunks.ts`
- Modify: `apps/web/.size-limit.json`, `.github/workflows/ci.yml`
- Test: `tools/bench/test/chunks.test.ts`

**Interfaces:**
- Consumes M0.5's entries unchanged ("Library budget", "Initial JS" at the production 35 kB, "Before the first frame", "Town map" at 40 kB), its chunk names and `build_atlas.py --out`.
- Adds brotli entries from R5's production split ([load notes, table A][r5l]): "Entry chunk" ≤ 10 kB (HUD 6 + glue 4), "Renderer chunk" ≤ 10 kB, "Sim worker chunk" ≤ 15 kB, "Charts chunk" (JS and CSS) ≤ 21 kB, "Controls chunk" ≤ 8 kB, "index.html" ≤ 1.5 kB, "Initial JS, M0 stand-in" (the three initial chunks) ≤ 12 kB, and "Atlas" (`dist/atlas/atlas.webp`, `"brotli": false`) ≤ 300 kB. **Ruling:** the 12 kB limit binds while the worker runs M0.3's wander stand-in; the first milestone with real systems there deletes it.
- Produces `uncoveredChunks(webRoot): string[]`: each `.js`, `.css`, `.nmap`, `.webp` or `.wasm` under `dist/` that no entry covers (paths expanded with `fs.globSync`); a `.wasm` reads "add a size-limit entry: WASM core ≤ 64 kB gzip (R5)". **Ruling:** so the WASM rule arms itself when M6.2 ships the first WASM, with no placeholder now.

- [ ] **Step 1: Write the failing tests:** `finds an ungated chunk` (a temp `dist` with `assets/inspector-x.js` and `sim-y.wasm` under a config covering neither lists both, the WASM with its message); `covers the real build` (after `pnpm --filter @nomos/web build`, `uncoveredChunks('apps/web')` is empty). Run `pnpm test -- chunks`: FAIL.
- [ ] **Step 2: Add the entries and check.** Run `pnpm --filter @nomos/web build && python tools/atlas/build_atlas.py --out apps/web/dist/atlas && pnpm --filter @nomos/web size && node tools/bench/src/chunks.ts`: every limit met. If initial JS exceeds 12 kB, stop and report the sizes to the owner; never raise the limit.
- [ ] **Step 3: Extend M0.5's CI size step** with the atlas build and `chunks.ts`. Commit:

```bash
git add apps/web/.size-limit.json tools/bench .github/workflows/ci.yml
git commit -m "build(web): gate every chunk and the atlas with size-limit"
```

### Task 13: The startup gate (R5)

**Files:**
- Create: `tools/bench/src/{calibrate,assert-startup}.ts`
- Modify: `apps/web/test/{serve.ts, startup.spec.ts}`, `apps/web/package.json` (devDependency `@nomos/bench`), `packages/sim-worker/src/{loop,worker}.ts`, `.github/workflows/perf.yml`
- Test: `tools/bench/test/{calibrate,assert-startup}.test.ts`, `packages/sim-worker/test/loop.test.ts`

**Interfaces:**
- Consumes: M0.5's `startServer` and `startup.spec.ts`, which already asserts the absolute medians (first frame ≤ 1,500 ms, interactive ≤ 2,000 ms, ≤ 100,000 bytes, ≤ 35,000 of JS) and writes `test-results/startup.json`; M0.3's `createSimLoop(host)`.
- Produces:
  - `cpuRate(benchmarkIndex, target = 375)` = `clamp(round(index ÷ target × 2) ÷ 2, 1, 10)`; `benchmarkIndex(page)`, the median of 3 runs of Lighthouse's `computeBenchmarkIndex` (Apache-2.0, credited); a CLI printing `BENCHMARK_INDEX=…` and `CPU_RATE=…` for `$GITHUB_ENV`;
  - `startServer({ workerSlowdown })`, prefixing `globalThis.__nomosCpuSlowdown=<n>;` to `/assets/worker-*.js` before compressing, since CDP refuses to throttle workers ([load notes §2][r5l]);
  - `createSimLoop(host, cpuSlowdown = 1)`, which after each message and turn busy-waits until `host.now()` reaches start + elapsed × `cpuSlowdown`; `worker.ts` passes the global when it is finite and ≥ 1, else 1;
  - `startup.spec.ts` throttling the page by `CPU_RATE` (default 4) with the same `workerSlowdown`, recording `cpuRate`, `benchmarkIndex` and `readLoadavg()`;
  - `compareStartup(current, baseline | null): string[]`: a failure per first-frame or interactive median > 15% and > 20 ms above the baseline. Absolute budgets stay in M0.5's spec. Its CLI reads `apps/web/test-results/startup.json` and `perf-baseline/startup.json`.

- [ ] **Step 1: Write the failing tests:** `calibrates the CPU rate` (1,500, 1,700, 375, 100 and 5,000 give 4, 4.5, 1, 1 and 10); `flags real regressions only` (1,000 → 1,160 ms fails; 100 → 116, 1,000 → 1,100 and no baseline pass); `busy-waits for a slowed worker` (on a fake clock of 0.25 ms per `now()`, a W-ms turn takes ≥ 4W at 4 and W at 1). Run `pnpm test -- calibrate assert-startup loop`: FAIL.
- [ ] **Step 2: Implement,** then calibrate and run `pnpm --filter @nomos/web startup && node tools/bench/src/assert-startup.ts` at that `CPU_RATE`: PASS, slower than M0.5's run; note the medians and loadavg.
- [ ] **Step 3: Add a `load` job to `perf.yml`:** build, install Chromium, calibrate into `$GITHUB_ENV`, restore `perf-baseline` from `actions/cache` (prefix `perf-baseline-`), run the spec and assertion, upload results, and on `main` save `startup.json` under `perf-baseline-${{ github.sha }}`. Commit:

```bash
git add packages/sim-worker
git commit -m "feat(sim-worker): busy-wait to match a throttled benchmark cpu"
git add tools/bench apps/web pnpm-lock.yaml .github/workflows/perf.yml
git commit -m "test(web): calibrate startup and gate regressions against main"
```

### Task 14: Close M0.6 and M0

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`
- Create: the next checkpoint in `docs/plan/checkpoints/`

- [ ] **Step 1: Confirm CI on `main`:** `gh run list --limit 3` shows the latest `ci` (with `browser` and `bun`) and `perf` (`compute`, `load`) runs green.
- [ ] **Step 2: Record the pace** in M0.6's cells against its 3–5 days, and fill the M0 total.
- [ ] **Step 3: Tick the shared doc's M0 section,** then `/sync-plan-doc`: M0.6's build items (R4, R5, R8, R9) and exit checks (R1, R2, R3, R5, R6, R8, R9). Note that the WASM rule arms with M6.2, and re-baseline the Performance budget's Measured columns from Tasks 10, 11 and 13, with engine and load.
- [ ] **Step 4: Write the checkpoint** per its README (`milestone: M0.6`, `next` naming M1's first plan). Commit:

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git commit -m "docs(plan): record the M0.6 pace"
git add docs/plan/implementation-plan.md
git commit -m "docs(plan): sync the implementation plan from the doc"
git add docs/plan/checkpoints
git commit -m "docs(plan): add checkpoint NNNN"
```

[perf]: ../../../implementation-plan.md#performance-budget
[r5c]: ../../../../research/round-5-performance/notes/compute.md
[r5l]: ../../../../research/round-5-performance/notes/load-memory.md
[r5ci]: ../../../../research/round-5-performance/prototypes/load/ci/
[r5lint]: ../../../../research/round-5-performance/prototypes/compute/lint/eslint.config.mjs
[r8c]: ../../../../research/round-8-cultures/notes/customs-preferences.md
[r8e]: ../../../../research/round-8-cultures/notes/prior-art-ethics.md
[r8g]: ../../../../research/round-8-cultures/prototypes/customs/guard_demo.mjs
[r9]: ../../../../research/round-9-maps-and-world-builder/report.md
