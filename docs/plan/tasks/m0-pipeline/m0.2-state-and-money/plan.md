# M0.2 State and Money Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One preallocated `WebAssembly.Memory` for agents and ledgers, money and loans that balance to the cent, quantities revalued without touching cash, exact splits, and the build-time tables later systems read.

**Architecture:** An arena hands out typed-array views of one memory reserved for the device tier and never grown; counts live there too, so M0.3 can hash and checkpoint state as bytes. Cash is integer cents in a zero-sum ledger with MINT, loans sit in a claims ledger beside it, and homes, titles and shares are integer quantities. `BigInt` appears only in the apportionment module, and curves arrive as data built with @stdlib.

**Tech Stack:** M0.1's stack, plus the standalone `@stdlib/*` packages at build time, and esbuild, Playwright, Bun and GitHub's ARM64 and macOS runners for the verify-first probe.

**Spec:** [task.md](task.md); [interfaces.md](../interfaces.md) for the package list only. Tasks cite their sources: R4 [architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), R5 [compute notes](../../../../research/round-5-performance/notes/compute.md), R6 [report](../../../../research/round-6-goods-and-wellbeing/report.md) and its [wealth](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), [happiness](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md) and [integration-cost](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md) notes, R8 [report](../../../../research/round-8-cultures/report.md) and R9 [report](../../../../research/round-9-maps-and-world-builder/report.md).

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, no body and no co-author.
- In `sim-core/src`, use only `+ - * /`, `Math.sqrt`, `Math.floor`, `Math.imul` and bit operations, never transcendental `Math`, `**` or `Math.random`. Every random number comes from M0.1's keyed draw on stable ids, with `draw1`–`draw4` in per-tick code (sim-core rules, R9).
- Replay-relevant state is integer: Q8 positions in `Int32Array`s with power-of-two cells, and integer-valued `Float64Array` cents, exact below 2^53. No `BigInt` in hot code, 115× slower in JavaScriptCore (R5); `src/apportion.ts`, never called per tick, is the one module the lint lets use it (Task 6).
- Plan, then apply: flows come from a read-only snapshot and apply as integer additions in a fixed order (sim-core rules).
- One `WebAssembly.Memory` per world, reserved for the tier (32 MB on phones, 64–128 MB on desktops), never grown, with views made once (R5). Counts live in it too, so a checkpoint is one byte copy (R6 integration-cost §3).
- Per-tick functions allocate nothing: no literals, closures, `new`, spread, `for…of`, array callbacks, `slice`, `subarray`, strings or clocks. Only `create*`, `reserve*` and `take` allocate, at creation (sim-core rules).
- All accounts plus MINT sum to exactly zero (sim-core rules).
- At most 256 B per agent plus a 24 B snapshot, and 1 KB per settlement; ledger transfers get 0.15 / 0.4 / 0.3 ms of the 5.3 / 13.3 / 16 ms ticks at 10k / 25k / 100k agents (Performance budget).
- No sim rule reads a look, looks are never inherited, and culture is drawn independently of them (content rules 1, 8).
- Relative imports carry `.ts` and TypeScript stays erasable (no `enum`, `namespace`). Keep it simple, build only what M0.2 needs, and comment only the why (code rules).

## Review Focus

1. **Cents at 2^53.** Balances of ±(2^53 − 1), `mulPpm` at its domain ends and splits whose total × weight crosses 2^53 stay exact, and NaN fails the invariant (Tasks 4–6).
2. **Negative cents.** `mulPpm` floors overdrawn balances toward −∞, as a `BigInt` reference does (Task 5).
3. **Degenerate splits.** A zero total, zero weights among positive ones, tied remainders and empty groups (Task 6).
4. **Full structures.** Past a store's, claims ledger's or registry's capacity, a culture count outside 1–8, or a layout past the reservation, creation throws and writes nothing (Tasks 2, 3, 5).
5. **Name-based lint rules.** `mulPpm(a, b) * 2` and `units * price` pass; `c * l.ratePpm[i]`, `c *= dailyRate` and a destructured `look` fail (Tasks 3, 5).

---

### Task 1: Verify @stdlib bit-identity first

**Files:**
- Create: `packages/sim-core/scripts/stdlib-probe.ts`, `packages/sim-core/scripts/stdlib-firefox.ts`, `.github/workflows/stdlib.yml`, the generated `packages/sim-core/test/fixtures/stdlib-digests.json`
- Modify: `package.json`, `packages/sim-core/package.json`

**Interfaces:**
- Consumes: `mix` and `draw2` from M0.1.
- Produces: `probeStdlib(): Record<string, string>`, an 8-hex-digit digest per function, and the runtime rule for @stdlib (Step 4). Task 7's tables are data either way.

- [ ] **Step 1: Write the probe.** Run `pnpm add -Dw esbuild playwright` and add `@stdlib/math-base-special-{exp,ln,log2,pow,sin,cos,erf}` and `@stdlib/stats-base-dists-normal-{quantile,cdf}` to `sim-core`'s dev dependencies. Each function gets 1,024 inputs from `draw2(42, 0x7F0, f, i)` spread over its useful domain, plus ±0 and ±Infinity. Each result's two `Uint32Array` words fold through `h = mix(h ^ word)`. With no argument the script writes the fixture; `--check` exits 1, naming each function that differs. `stdlib-firefox.ts` bundles the probe with esbuild and checks it in Playwright's Firefox.

  Run: `node packages/sim-core/scripts/stdlib-probe.ts`, then again with `--check`, then `pnpm exec playwright install firefox && node packages/sim-core/scripts/stdlib-firefox.ts`. Expected: nine digests, then exit 0 twice, or the Firefox run names the functions that differ.

- [ ] **Step 2: Add the workflow and commit.** `stdlib.yml` runs on `workflow_dispatch` and on pushes to `main` touching the probe, its fixture or `pnpm-lock.yaml`. It runs the check under Node on `ubuntu-latest`, `ubuntu-24.04-arm` and `macos-latest` (Apple silicon), under Bun on `macos-latest` (JavaScriptCore on Apple's math library), and in Firefox.

```bash
git add package.json pnpm-lock.yaml packages/sim-core/package.json packages/sim-core/scripts packages/sim-core/test/fixtures/stdlib-digests.json
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "test(sim-core): probe @stdlib for bit identity across engines"
git add .github/workflows/stdlib.yml
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "ci: check @stdlib digests on arm64, macos and firefox"
```

- [ ] **Step 3: Read the result** once the owner has pushed `main`. Run: `gh run list --workflow stdlib.yml --limit 1`. Expected: five green jobs, or a red one naming the functions that differ.

- [ ] **Step 4: Record the rule.** If every job passes, code outside per-agent loops may call @stdlib at runtime (task.md), and nothing changes. Otherwise ban `@stdlib/*` with `no-restricted-imports` in `packages/sim-core/src/**`, and add the test `keeps @stdlib out of sim-core source` to `lint.test.ts`: `import exp from '@stdlib/math-base-special-exp'` gives a message at `src/planted.ts` and none at `scripts/planted.ts`. Run: `pnpm test -- lint && pnpm lint`. Expected: PASS.

```bash
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build(sim-core): keep @stdlib out of sim-core at runtime"
```

### Task 2: One reserved memory and Q8 positions

**Files:**
- Create: `packages/sim-core/src/memory.ts`, `packages/sim-core/src/space.ts`, `packages/sim-core/src/store.ts`
- Modify: `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/test/memory.test.ts`, `packages/sim-core/test/store.test.ts`

**Interfaces:**
- Consumes: `draw2` from M0.1, in tests.
- Produces:
  - `PHONE_MEMORY_BYTES = 33_554_432`, `DESKTOP_MEMORY_BYTES = 67_108_864`;
  - `interface Arena { readonly memory: WebAssembly.Memory; top: number; readonly canonical: number[] }`, where `canonical` holds byte offset and padded length pairs, whole 32-bit words, for the state hash; `reserveArena(bytes: number): Arena`, for a multiple of 65,536;
  - `take<T>(arena: Arena, ctor: ViewCtor<T>, length: number, canonical: boolean): T`, `ViewCtor<T>` being a typed-array constructor;
  - `SUBPIXELS = 256` (Q8), `TILE_PX = 16`, `CELL_SHIFT = 15` (8-tile cells), `cellOf(q8: number): number`;
  - `interface AgentStore { readonly capacity: number; readonly count: Int32Array; readonly x: Int32Array; readonly y: Int32Array }`, all canonical, with the count read as `count[0]`; `createAgentStore(arena: Arena, capacity: number): AgentStore`; and `AGENT_COLUMNS: readonly { name: string; bytes: number }[]`.

- [ ] **Step 1: Write the failing tests:**
  - `reserves the tier's memory once and refuses to grow it`: a phone arena holds 33,554,432 bytes, `memory.grow(1)` throws `RangeError`, and an earlier view still reads back its writes.
  - `takes aligned, separate views of the one buffer`: a `Uint8Array(3)`, `Float64Array(5)` and `Int32Array(7)` share the buffer, the `Float64Array` is 8-byte aligned, writes stay apart, and `canonical` lists only canonical takes. `take(reserveArena(65_536), Float64Array, 8_193, true)` throws `RangeError`.
  - `fits 25,000 agents in a phone reservation and 100,000 in a desktop one`, and `AGENT_COLUMNS` sums to at most 256 bytes, each entry matching its column's `BYTES_PER_ELEMENT`.
  - `bins Q8 positions into cells by shift`: for 10,000 keyed x below 2^22, `cellOf(x) === Math.floor(x / 32_768)` and `Math.fround(x / 256) === x / 256`.

  Run: `pnpm test -- memory store`. Expected: FAIL.

- [ ] **Step 2: Implement.** `initial` equals `maximum`, so `grow` throws. The memory is not shared: M0 runs one sim worker, and more workers pay only above 20–25k agents (R5 compute §2). `take` aligns each region to 8 bytes and pads its length to a multiple of 8. Q8 beats Q16 because it converts to float32 exactly up to 65,536 px, against 256 px (computed: 2^24 ÷ 256 and 2^24 ÷ 65,536).

- [ ] **Step 3: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-core/src packages/sim-core/test/memory.test.ts packages/sim-core/test/store.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): reserve one memory for agent state"
```

### Task 3: Looks, cultures and salted streams

**Files:**
- Create: `packages/sim-core/src/streams.ts`
- Modify: `packages/sim-core/src/store.ts`, `packages/sim-core/src/index.ts`, `eslint.config.js`, `tools/worldgen/vectors.py` and its `kernels.json`
- Test: `packages/sim-core/test/looks.test.ts`, `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: `draw1` from M0.1; Task 2's store.
- Produces:
  - `LOOK = 11` from `rng.py`, whose streams 1–255 stay the world generator's; agent streams from `AGENT_SALT = 0x100` and ledger streams from `LEDGER_SALT = 0x200`, the separate salts (R4 architecture §3.7); `CULTURE = AGENT_SALT + 1`; and `layerOf(stream): 'world' | 'agent' | 'ledger'`;
  - canonical columns `look`, `culture`, `birthCulture` (`Uint8Array`), `customs` and `homeRegion` (`Uint16Array`) (R8 conflict a); `LOOKS = 96`, `MAX_CULTURES = 8`;
  - `CUSTOM_FOOD = 0`, `CUSTOM_FESTIVAL = 1`, `CUSTOM_MUSIC = 2`, `CUSTOM_NAMING = 3`, and `customOf(customs, domain)` and `withCustom(customs, domain, culture)` over 4-bit nibbles;
  - `addAgent(store: AgentStore, seed: number, id: number, cultures: number, homeRegion: number): number`, returning the slot.

- [ ] **Step 1: Write the look vectors.** `vectors.py` adds `"streams"`, the stream constants of `rng.py`, and `"look"` cases from `looks.look_for` for seeds 0, 42 and 0xFFFFFFFF and ids 0, 1, 2, 1000, 65535 and 2^31 − 1. Run: `python tools/worldgen/vectors.py && python tools/worldgen/vectors.py --check`. Expected: exit 0.

- [ ] **Step 2: Write the failing tests:**
  - `matches looks.py for every look vector`, and `spreads 96,000 people evenly over the 96 looks` with χ² below 143.3 (p ≈ 0.001, 95 df); a look depends on (seed, id) alone.
  - `draws cultures on their own stream`: for 1–8 cultures, `culture < cultures`, `birthCulture === culture` and all four nibbles hold it. With 8 cultures over 96,000 ids, counts give χ² below 24.32 (p = 0.001, 7 df), and hue (`look % 6`) against culture below 66.62 (35 df).
  - `keeps world, agent and ledger streams apart`: constants are unique, `layerOf` places `LOOK`, `CULTURE` and `LEDGER_SALT + 1`, and the fixture's streams lie below `AGENT_SALT` with its `LOOK` equal to ours.
  - `refuses a bad culture count or a full store`: 0 or 9 cultures, or a slot past `capacity`, throws `RangeError` and leaves `count[0]` unchanged.

  Run: `pnpm test -- looks`. Expected: FAIL.

- [ ] **Step 3: Implement.** `addAgent` fills slot `count[0]` and increments it, with `look = draw1(seed, LOOK, id) % LOOKS` as in `look_for`, `culture = draw1(seed, CULTURE, id) % cultures` copied to `birthCulture`, and `customs = culture * 0x1111`: someone raised in one culture holds its four customs.

- [ ] **Step 4: Lint-ban reading the look.** Test `rejects reading the look column outside the store`: `s.look[0]`, `const { look } = s` and `s['look'][0]` at `packages/sim-core/src/planted.ts` give messages, and none at `src/store.ts`. In `eslint.config.js`, split the `no-restricted-syntax` selectors into named groups `MATH_SYNTAX` and `BIGINT_SYNTAX`, and add `LOOK_READS`: `MemberExpression[property.name='look']`, `MemberExpression[property.value='look']` and `ObjectPattern > Property[key.name='look']`. `src/**` gets every group; a later block gives `src/store.ts` all but `LOOK_READS`.

- [ ] **Step 5: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add tools/worldgen/vectors.py packages/sim-core/test/fixtures/kernels.json
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "test(worldgen): write look and stream vectors"
git add packages/sim-core/src packages/sim-core/test/looks.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add look and culture columns on salted streams"
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build(sim-core): lint-ban reading the look column in sim rules"
```

### Task 4: The cash ledger

**Files:**
- Create: `packages/sim-core/src/ledger.ts`, `packages/sim-core/src/invariants.ts`
- Modify: `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/test/ledger.test.ts`

**Interfaces:**
- Consumes: `take` from Task 2.
- Produces:
  - `MINT = 0`, `TREASURY = 1` and `ROUNDING = 2` in a reserved block of `NATIONAL_ACCOUNTS = 16`, then `SECTORS = 4` per settlement: `HOUSEHOLDS = 0`, `FIRMS = 1`, `LOCAL_GOVERNMENT = 2`, `POLICE_BUDGET = 3` (R4);
  - `interface Ledger { readonly accounts: number; readonly balance: Float64Array }`, canonical; `createLedger(arena, settlements): Ledger`; `sectorAccount(settlement, sector): number`, which is `NATIONAL_ACCOUNTS + settlement * SECTORS + sector`;
  - `transfer(ledger, from, to, cents): void`, with `issue(ledger, to, cents)` and `retire(ledger, from, cents)` through MINT;
  - `MAX_SAFE_CENTS = 9_007_199_254_740_991`, codes `OK = 0`, `CASH_NOT_ZERO = 1`, `CENTS_NOT_EXACT = 2`, and `checkCash(cash: Ledger): number`.

- [ ] **Step 1: Write the failing tests:**
  - `lays out national accounts, then four sectors per settlement`: 3 settlements give 28 accounts, `sectorAccount(0, HOUSEHOLDS) === 16` and `sectorAccount(2, POLICE_BUDGET) === 27`.
  - `sums to zero after every tick of random transfers` (R1): 1,000 ticks of 100 keyed issues, retirements and transfers below 10^12 cents, over 10 settlements, keep `checkCash` at `OK` every tick.
  - `catches money made outside MINT and inexact cents`: `balance[16] += 1` gives `CASH_NOT_ZERO`; a 0.5-cent transfer, a `NaN` balance and a ±2^53 pair give `CENTS_NOT_EXACT`.
  - `sums without rounding near 2^53`: balances 2^53 − 1, 2, −(2^53 − 1) and −1, one cent off, give `CASH_NOT_ZERO`, though a plain float sum of them is 0.

  Run: `pnpm test -- ledger`. Expected: FAIL.

- [ ] **Step 2: Implement.** In one pass, `checkCash` gives `CENTS_NOT_EXACT` for any `b !== Math.floor(b)` or `|b| > MAX_SAFE_CENTS`, which catches `NaN`. It then splits each balance into `hi = Math.floor(b / 2^26)` and `lo = b − hi × 2^26` and sums each part apart. Both sums stay exact below 2^26 accounts, and `CASH_NOT_ZERO` means `hiSum × 2^26 + loSum !== 0`. It returns a code rather than throwing, so per-tick callers allocate nothing.

- [ ] **Step 3: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-core/src packages/sim-core/test/ledger.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add the cash ledger with MINT and reserved accounts"
```

### Task 5: Interest, loans and quantities

**Files:**
- Create: `packages/sim-core/src/money.ts`, `packages/sim-core/src/claims.ts`, `packages/sim-core/src/registry.ts`
- Modify: `packages/sim-core/src/invariants.ts`, `packages/sim-core/src/index.ts`, `eslint.config.js`
- Test: `packages/sim-core/test/money.test.ts`, `packages/sim-core/test/claims.test.ts`, `packages/sim-core/test/registry.test.ts`, `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: Task 4's ledger and codes.
- Produces (R6 wealth §d):
  - `PPM = 1_000_000` and `mulPpm(cents: number, ppm: number): number`, the exact floor of cents × ppm ÷ 10^6 for integer |cents| ≤ `MAX_SAFE_CENTS` and ppm in 0..`PPM`;
  - `interface Claims`, canonical: `capacity`; `count` (`Int32Array(1)`); per loan `lender`, `borrower`, `ratePpm` (`Int32Array`) and `principal`, `payment` (`Float64Array`); per cash account `debt`, `lent` (`Float64Array`);
  - `createClaims(arena, cash, capacity)`, `openLoan(claims, cash, lender, borrower, principal, ratePpm, payment): number`, `accrue(claims, loan): number` (interest capitalised) and `payInstalment(claims, cash, loan): number` (cents paid). `ratePpm` is per service period; M2 sets the schedule on the 112-day year (calendar.md);
  - `CLAIMS_UNBALANCED = 3`; `checkClaims(claims): number`, which requires Σ `debt` = Σ `lent` = Σ `principal`; and `checkInvariants(cash, claims): number`, the first failing code, which M0.3 calls every tick in development;
  - `interface Registry`, canonical: `capacity`; `count` (`Int32Array(1)`); per holding `owner`, `group`, `units` (`Int32Array`); per group `price` (cents per unit), `groupUnits`, `revaluation` (`Float64Array`). It serves homes (one 1-unit holding per map home, by district), titles and firm shares;
  - `createRegistry(arena, capacity, groups)`, `addHolding(reg, owner, group, units): number`, `transferHolding(reg, holding, owner): void` and `holdingValue(reg, holding): number`;
  - `revalue(reg, group, price): number`, which sets the price and writes and returns `revaluation[group] = (price − old) × groupUnits[group]`, touching no ledger. M2 calls it from the day boundary once prices exist.

- [ ] **Step 1: Write the failing tests:**
  - `floors cents times ppm exactly`: 100,000 keyed cases match a `BigInt` floor in the test, with cents up to ±(2^53 − 1) and ppm in 0..10^6. `mulPpm(±MAX_SAFE_CENTS, PPM)` returns its input, `mulPpm(-1, 1) === -1` and `mulPpm(120_000_000_000, 74_100) === 8_892_000_000` (round 6's $1.2B at 7.41%).
  - `books a loan on both sides and services it`: `openLoan(c, cash, 16, 17, 100_000, 1_000, 10_000)` moves 100,000 cents to 17 and sets `debt[17]` and `lent[16]` to 100,000. `accrue` returns 100, `payInstalment` 10,000, and 90,100 remain. A loan of 5,000 with a payment of 10,000 pays 5,000, then 0.
  - `holds the claims and cash identities exactly every day` (R6): for 400 days over 10 settlements, open up to 5 keyed loans a day, then accrue and pay each. `checkInvariants` stays `OK`, and `claims.debt[17] += 1` gives `CLAIMS_UNBALANCED`.
  - `logs revaluations without moving a cent or MINT` (R6): add homes, titles and shares to that ledger, and revalue every group daily within ±5%. Every cash balance, MINT included, stays put, and each group's lines sum to its change in value.
  - `refuses full structures`: a loan or holding past `capacity` throws `RangeError`.

  Run: `pnpm test -- money claims registry`. Expected: FAIL.

- [ ] **Step 2: Implement `mulPpm`** by R6's split (wealth §c): `hi = Math.floor(cents / PPM)` and `lo = cents − hi × PPM`, moving `hi` by ±1 until 0 ≤ `lo` < `PPM`, since near 2^53 the division can round across an integer; then return `hi × ppm + Math.floor(lo × ppm / PPM)`. Every product stays below 2^53.

- [ ] **Step 3: Implement `claims.ts` and `registry.ts`.** `openLoan` moves the principal from lender to borrower and books both sides; `accrue` adds `mulPpm(principal, ratePpm)` to all three; `payInstalment` pays `Math.min(payment, principal)` back and takes it off all three. Records stay append-only until M2 needs slot reuse.

- [ ] **Step 4: Lint-ban raw rate products.** Test `rejects multiplying by a raw rate outside money.ts`: `c * ratePpm`, `c * l.ratePpm[0]` and `c *= dailyRate` at `src/planted.ts` give messages; `units * price`, `mulPpm(a, b) * 2`, and `c * ratePpm` at `src/money.ts` give none. Add the group `RATE_PRODUCTS` to every block except a new one for `src/money.ts`. Under `BinaryExpression[operator='*']` and `AssignmentExpression[operator='*=']` it bans `> Identifier[name=R]`, `> MemberExpression[property.name=R]` and `> MemberExpression > MemberExpression[property.name=R]`, with `R = /^(rate|ppm)$|(Rate|Ppm)$/`.

- [ ] **Step 5: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-core/src packages/sim-core/test/money.test.ts packages/sim-core/test/claims.test.ts packages/sim-core/test/registry.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add mulPpm, the claims ledger and registries"
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build(sim-core): lint-ban multiplying cents by a raw rate"
```

### Task 6: Exact splits and order-free flows

**Files:**
- Create: `packages/sim-core/src/apportion.ts`, `packages/sim-core/src/split.ts`, `packages/sim-core/src/flows.ts`
- Modify: `packages/sim-core/src/index.ts`, `eslint.config.js`
- Test: `packages/sim-core/test/apportion.test.ts`, `packages/sim-core/test/split.test.ts`, `packages/sim-core/test/flows.test.ts`, `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: `take` from Task 2; `mix` from M0.1; Task 4's ledger in tests.
- Produces:
  - `interface ApportionScratch { readonly rem: Float64Array; readonly heap: Int32Array }` and `createApportionScratch(arena, capacity)`, non-canonical;
  - `apportion(total: number, weights: ArrayLike<number>, n: number, out: Float64Array, scratch: ApportionScratch): void`: largest remainder, ties to the lower index (R4);
  - `apportionByStride(total, weights, n, out: Float64Array, word: number): void`: floors, then each leftover cent (fewer than n) to one entry along a keyed stride, for cash over agents (R4 architecture §3.3);
  - `splitByCounts(n: number, counts: ArrayLike<number>, k: number, out: Int32Array, word: number): void`: keyed stochastic rounding of n people over k groups, each getting its floor or one more and never more than it holds (R8 conflict d);
  - weights are non-negative integers summing to 1..2^53 − 1, totals are integers up to `MAX_SAFE_CENTS`, and counts sum to at most 2^26. `word` is a 32-bit keyed draw from the caller's stream, so the splits belong to no layer;
  - `interface FlowPlan { readonly slots: number; readonly from: Int32Array; readonly to: Int32Array; readonly amount: Float64Array }`, non-canonical, and `createFlowPlan(arena, slots)`;
  - `planFlow(plan, slot, from, to, amount): void`, where the slot comes from the entity (entity × flows per entity + k), never the visiting order, and `applyFlows(plan, target: Float64Array): void`, which applies slots in order and clears them.

- [ ] **Step 1: Write the failing tests:**
  - `matches a BigInt reference over 10,000 random cases` (R4 exit check): 1–64 weights of 1–4,095, with totals by c % 4 below 2^20, below 2^40, in [2^53 ÷ 4,095, 2^45) or in [2^45, 2^53). `apportion` equals a `BigInt` Hamilton reference in the test; `apportionByStride` keeps its floors and adds 0 or 1 each; both sum to the total; at least 2,000 cases take the `BigInt` path.
  - `breaks ties toward the lower index`: `(1, [1,1,1])` → `[1,0,0]`, `(10, [1,1,1])` → `[4,3,3]`, `(7, [0,5,0,5])` → `[0,4,0,3]`, `(0, [3,4])` → `[0,0]`.
  - `spreads leftover cents along a keyed stride`: 999 cents over 1,000 equal weights fill exactly 999 entries, a `word` repeats its result, and words 0–99 leave at least 50 different entries empty.
  - `splits people exactly and without bias`: 10,000 keyed cases of 1–8 counts of 0–1,000, not all 0, with n from 0 to their sum, sum to n with every entry its floor or one more and at most its count, so empty groups get 0; `[5, 3, 2]` with n = 7 over 30,000 words averages within 0.03 of `[3.5, 2.1, 1.4]`.
  - `moves small minorities that largest remainder never moves` (R8 customs §e): `[98, 2]` with flows of 1 + m % 3 for 360 months moves 5–25 of the minority (14.4 expected); `apportion` moves none.
  - `gives the same balances in any planning order` (R4): over 10,000 keyed balances, i sends ⌊b[i] ÷ 8⌋ to (7i + 3) mod n and ⌊b[i] ÷ 16⌋ to (13i + 5) mod n daily. Forward, reverse and keyed Fisher–Yates planning agree for 30 days, while writing during the visit makes forward and reverse differ. Applied to `ledger.balance`, a plan keeps `checkCash` at `OK`.

  Run: `pnpm test -- apportion split flows`. Expected: FAIL.

- [ ] **Step 2: Implement `apportion.ts`.** One quota pass serves both rules. While total × max weight < 2^53, `Math.floor(total * w / W)` is exact (R4 architecture §3). Otherwise quotas and remainders come from `BigInt` and return through `Number()`, which is exact since quotas are at most the total and remainders below W. `apportion` pops the L largest remainders from a binary max-heap in `scratch.heap`, never calling `sort`. `apportionByStride` starts at `word % n` and steps by the first value from `1 + mix(word) % n` upward that is coprime with n.

- [ ] **Step 3: Implement `split.ts` and `flows.ts`.** `splitByCounts` is keyed systematic sampling, which R8's transmission note found exact and unbiased. Floor each n × c ÷ N, then walk the groups, accumulating remainders (n × c) mod N from offset `u = word % N`. A group gets one extra per threshold u + t × N (t < L) in its stretch; remainders are below N, so no group gets two.

- [ ] **Step 4: Allow `BigInt` in the apportionment module only.** Test `allows BigInt only in the apportionment module`: `export const z = BigInt(1) + 2n` gives no BigInt message at `src/apportion.ts`, but one at `src/split.ts`, `src/apportion-big.ts` and `src/apportion/inner.ts`. `Math.exp(1)`, `c * ratePpm` and `s.look[0]` stay rejected at `src/apportion.ts`. Add a block giving `src/apportion.ts` every group but `BIGINT_SYNTAX`.

- [ ] **Step 5: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS. The exemption is committed first, so each commit lints clean.

```bash
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build(sim-core): allow BigInt only in the apportionment module"
git add packages/sim-core/src packages/sim-core/test/apportion.test.ts packages/sim-core/test/split.test.ts packages/sim-core/test/flows.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add exact splits and the plan-then-apply helper"
```

### Task 7: The build-time tables

**Files:**
- Create: `packages/sim-core/scripts/tables.ts`, the generated `packages/sim-core/src/tables.ts`, `packages/sim-core/src/log2.ts`
- Modify: `packages/sim-core/package.json` (`"tables": "node scripts/day-length.ts && node scripts/tables.ts"`), `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/test/tables.test.ts`

**Interfaces:**
- Consumes: `DAYS_PER_YEAR` from M0.1; `apportion` from Task 6; Task 1's @stdlib packages.
- Produces, built with @stdlib and rounded half up (R2; R6 happiness §b and §e, wealth §e):
  - `LOG2_Q16: Uint16Array(256)`, round(65,536 × log2(1 + m ÷ 256)), and `log2Q16(x: number): number` for integer x in 1..0xFFFFFFFF: 65,536 × ⌊log2 x⌋ plus the entry for its next 8 bits;
  - `FADE_0_35Y`, `FADE_1Y`, `FADE_2_6Y`, the victimisation, scarring and income-habit fades: Q15 `Uint16Array`s of round(32,768 × 2^(−d ÷ H)) up to the first 0, with H = years × `DAYS_PER_YEAR` (39.2, 112 and 291.2 days);
  - `INV_NORMAL_Q16: Int32Array(4096)`, round(65,536 × Φ⁻¹((i + 0.5) ÷ 4,096)), for set points;
  - `BAND_SHARE_PPM: Int32Array(201 * 5)`: row r is a normal of mean r × 0.05 and SD 1.9 on the 0–10 ladder, cut at 4.0, 5.5, 7.0 and 8.5, apportioned to exactly 1,000,000 ppm over integer weights of share × 2^32;
  - `COPULA_Q16: Uint16Array(64 * 64)`: entry (i, j) is round(65,535 × Φ(r Φ⁻¹((i + 0.5) ÷ 64) + s Φ⁻¹((j + 0.5) ÷ 64))), with r = 2 sin(π × 0.6 ÷ 6) ≈ 0.618 and s = √(1 − r²), for a Spearman of 0.6 between income and wealth rank (SCF 0.63);
  - `buildTables()` in the generator, returning the seven arrays as `number[]`s.

- [ ] **Step 1: Write the failing tests:**
  - `matches its generator`: each table equals its `buildTables()` array.
  - `gives log2 in Q16 within the 8-bit mantissa bound`: `LOG2_Q16[128] === 38_336`; `log2Q16` gives 0, 65,536 and 103,872 for 1, 2 and 3; for 10,000 keyed x it lies within [t − 370, t + 1] of t = 65,536 × `Math.log2(x)` (R6 integration-cost §4).
  - `halves each fade table at its half-life`: each starts at 32,768, never rises and ends with its only 0; `FADE_1Y[112] === 16_384`, and `FADE_0_35Y[196]` and `FADE_2_6Y[1_456]` equal 1,024.
  - `centres the inverse-normal table`: `|INV[i] + INV[4095 − i]| ≤ 1`, entry 0 lies between −3.7 and −3.6 × 65,536, and the SD is 0.99–1.0 × 65,536.
  - `sums every band-share row to a million ppm`. As the mean rises, the top band never falls, and the bottom never rises, by more than 1 ppm, the most rounding can move a share. At mean 7.0 (row 140), bands 2 and 3 differ by at most 1 ppm.
  - `correlates wealth with income rank at Spearman 0.6`: the copula never falls along either axis, and the Spearman between income bin and value over its 4,096 cells is 0.60 ± 0.02.

  Run: `pnpm test -- tables`. Expected: FAIL.

- [ ] **Step 2: Write the generator and run it.** Run: `pnpm --filter @nomos/sim-core run tables`. Expected: `src/tables.ts`, with one `/* @__PURE__ */` line per table under a header naming the generator.

- [ ] **Step 3: Implement `log2.ts`** with `Math.clz32` and `>>>`. Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-core/scripts/tables.ts packages/sim-core/src packages/sim-core/package.json packages/sim-core/test/tables.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): ship log2, fade, normal, band and copula tables"
```

### Task 8: Close M0.2

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Confirm CI passes on `main`.** Run: `gh run list --workflow ci.yml --limit 1 && gh run list --workflow stdlib.yml --limit 1`. Expected: both latest runs succeeded, or the `stdlib` run's failure is the one Task 1 recorded.
- [ ] **Step 2: Record the pace** in M0.2's Started, Done and Actual cells, and rescale the remaining estimates as M0.1 did.
- [ ] **Step 3: Tick what landed** in the shared doc's M0 section, then export with `/sync-plan-doc`:
  - the `AgentStore`, with keyed draws in place of sfc32 (R1, R2);
  - salts, account ranges, apportionment and the plan-then-apply helper (R4), whose lint half waits for M0.6;
  - one memory and Q8 positions (R5);
  - claims, `mulPpm`, registries and tables (R2, R6);
  - culture columns, the look column and stochastic rounding (R8, R9);
  - the claims and cash exit check (R6), with Task 1's result under Ongoing and verify-first.

  The every-tick ledger check and the apportionment and focus check close with M0.3.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "docs(plan): record the M0.2 pace"
git add docs/plan/implementation-plan.md
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "docs(plan): sync the implementation plan from the doc"
```
