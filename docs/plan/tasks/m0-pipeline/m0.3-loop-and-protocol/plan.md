# M0.3 Loop and Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The world step and its replay hash; the day boundary, with logged inputs and sliced day work; `sim-protocol`'s snapshot and messages; and a sim worker that ticks 10 times a second, pauses when hidden and checkpoints on `pagehide`.

**Architecture:** `sim-core` owns one `step(world)` that the worker and the headless CLI both run. Each tick runs the day boundary when a day starts, one 1,024-entity day slice while the day's window is open, then a stand-in wander system. Inputs wait in a log until the next boundary. `sim-protocol` packs positions and the visual word into pooled transferable buffers. `sim-worker` wraps the step in a fixed-timestep loop around an injected clock, so tests can drive it.

**Tech Stack:** M0.1's stack; `util.parseArgs` for the CLI; `MessageChannel`, `setTimeout` and `postMessage` in the worker.

**Spec:** [task.md](task.md) and [interfaces.md](../interfaces.md). The latter binds this plan, which owns the world step, snapshot v1, the visual word and the worker messages and uses their names exactly; each refinement is marked where it is made. Sources:
- [calendar.md](../../../calendar.md);
- R2 [engineering gaps §2](../../../../research/round-2-follow-up/notes/engineering-gaps.md);
- R3 [rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md);
- R4 [report](../../../../research/round-4-multi-scale/report.md) and [architecture notes §3.3–3.7](../../../../research/round-4-multi-scale/notes/architecture-lod.md);
- R6 [report, conflict (e)](../../../../research/round-6-goods-and-wellbeing/report.md) and [integration-cost notes §2–4](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md);
- R8 [transmission notes](../../../../research/round-8-cultures/notes/transmission.md).

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, then a body whose `Task:` line names the task by ID and title, such as `Task: M0.3 Loop and protocol, task 1: The world step and its replay hash`, and no co-author.
- In `sim-*` source, use only exactly specified arithmetic and integer or fixed-point replay state, draw every random number from the keyed draw on stable ids, with `draw1`–`draw4` in per-tick code, and use no `BigInt`; M0.2's apportionment module is the one exemption (sim-core rules).
- Per-tick functions allocate nothing: no literals, closures, `new`, spread, `for…of`, array callbacks, `slice`, `subarray`, strings or clocks. Clocks live only in `sim-worker` (sim-core rules).
- Plan, then apply. Only the day boundary writes canonical state, read as R6's fixed window of day slices, and those writes are logged like player commands (sim-core rules, R6 conflict e).
- Workers use fixed 1,024-entity chunks, with identical results for 1–4 workers (sim-core rules).
- In development, all accounts plus MINT sum to zero, checked every tick (sim-core rules).
- A tick is a minute: 1,440 ticks a day at 10 ticks a second at 1×, with 7-day weeks, 28-day seasons and 112-day years. Tick 0 is 00:00 on Spring 1, Year 1 (calendar.md).
- Budgets: 5.3 / 13.3 / 16 ms a tick at 10k / 25k / 100k agents; at most 0.35 ms for the worst day slice and 0.10 / 0.2 / 0.3 ms for snapshots; at most 256 B per agent plus a 24 B snapshot (Performance budget).
- Dependencies point one way: `sim-protocol` imports only types and constants from `sim-core`, `sim-worker` imports both, and `@nomos/cli` imports `sim-core` (interfaces.md). `sim-core` and `sim-protocol` set `"sideEffects": false`, so the page's bundle keeps only the constants it imports, within 35 KB of JS before the first frame (web rules).
- No sim rule reads a look (content rule 1). Relative imports carry `.ts`, TypeScript stays erasable, and comments say only why (code rules).

## Review Focus

1. **Stalls and frozen tabs.** A turn delayed by seconds, from a GC pause, a debugger or a frozen phone tab, runs at most two ticks, and resume never catches up (Task 8).
2. **Inputs on the boundary tick.** An input logged just before a boundary tick's step applies at that boundary, exactly once, and survives a checkpoint (Task 4).
3. **Checkpoints mid-window.** A checkpoint taken during the day slices restores into the same remaining slices and commit tick (Task 5).
4. **No buffers come back.** With all three snapshot buffers out, the worker keeps ticking, posts nothing and allocates no buffer (Tasks 3, 8).
5. **Year edges.** The stride re-keys at tick 161,280, and `floorMod` folds negative day − offset values (Task 6).

---

### Task 1: The world step and its replay hash

**Files:**
- Create: `packages/sim-core/src/{tiers,actions,world,wander}.ts`; `tools/cli/package.json`, `tools/cli/tsconfig.json`, `tools/cli/src/main.ts`
- Modify: `packages/sim-core/src/{store,streams,invariants,index}.ts`, `.github/workflows/ci.yml`
- Test: `packages/sim-core/test/world.test.ts`

**Interfaces:**
- Consumes: M0.2's `reserveArena`, `take`, `createAgentStore`, `addAgent`, `AGENT_SALT`, `createLedger`, `sectorAccount`, `HOUSEHOLDS`, `issue`, `MINT`, `createClaims`, `checkInvariants`, `PHONE_MEMORY_BYTES` and `DESKTOP_MEMORY_BYTES`; M0.1's `draw2`, `draw3` and `mix`.
- Produces:
  - `type Tier = 'phone' | 'phone-plus' | 'desktop'`; `TIER_AGENTS: Readonly<Record<Tier, number>>` of 10,000, 25,000 and 100,000; and `TIER_MEMORY_BYTES: Readonly<Record<Tier, number>>`, `PHONE_MEMORY_BYTES` for both phone tiers and `DESKTOP_MEMORY_BYTES` on desktop;
  - `ACTION_IDLE` to `ACTION_CARRY` as 0–7, in interfaces.md's order, with `ACTION_NAMES`; and `FACING_DOWN`, `FACING_LEFT`, `FACING_UP`, `FACING_RIGHT` as 0–3;
  - canonical store columns `vx` and `vy` (`Int16Array`, Q8 per tick), and `action` and `facing` (`Uint8Array`); and streams `SPAWN = AGENT_SALT + 2` and `WANDER = AGENT_SALT + 3`;
  - `interface World { readonly seed: number; readonly tier: Tier; readonly arena: Arena; readonly globals: Int32Array; readonly agents: AgentStore; readonly cash: Ledger; readonly claims: Claims; readonly extent: number; checks: boolean }`. `globals` is a canonical `Int32Array(8)` with slot `TICK = 0`, and `checks` starts true. Later tasks add fields; M0.4 replaces `extent` with the map's ground.
  - `createWorld(seed: number, tier: Tier): World`, which is `layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier])`, then `populate(world)`. It builds a stand-in world until M0.4's map: a 256 × 256-tile square (`extent` = 2^20 in Q8), 8 settlements, 4 cultures, room for 4,096 loans, and 100,000 cents per agent issued to settlement 0's households.
  - `layoutWorld(seed: number, tier: Tier, agents: number, memoryBytes: number): World`, which reserves the arena and takes every region; `populate(world: World): void`; and `move(world: World): void`, the stand-in wander system, in `wander.ts`;
  - `step(world: World, timer?: SystemTimer): void`, with `interface SystemTimer { lap(system: number): void }` and `SYSTEM_NAMES = ['day', 'move']`. **This refines interfaces.md:** the optional timer lets the worker fill `stats.systemMs` with no clock in `sim-core`.
  - `stateHash(world: World): number`, as interfaces.md defines it; and the additions `currentTick(world): number`, `checkpoint(world): ArrayBuffer`, `restoreWorld(seed: number, tier: Tier, state: ArrayBuffer): World` and `failInvariant(code: number): never`, a cold helper that throws.

- [ ] **Step 1: Write the failing tests:**
  - `gives seed 42 the same state hash at tick 1,000 across runs` (R1 exit check): two `createWorld(42, 'phone')` stepped 1,000 times hash alike, and seed 43 differs.
  - `walks agents on the map in whole sub-pixels`: after 1,000 ticks, positions are integers in [0, 2^20), 65–85% of agents walk, and each walker's velocity matches its facing.
  - `checks the money invariants every tick in development`: after `cash.balance[MINT] += 1`, `step` throws, but not with `checks = false`.
  - `restores a checkpoint into the same future`: a world checkpointed at tick 500 and restored reaches tick 1,000 with the original's hash, and another tier's state throws `RangeError`.
  - `fits every tier and issues the starting money through MINT`: each tier's world holds `TIER_AGENTS[tier]` agents with `arena.top` ≤ `TIER_MEMORY_BYTES[tier]`, `balance[MINT]` is −100,000 × agents, and `sectorAccount(0, HOUSEHOLDS)` holds the rest.
  - `laps the timer once per system per tick`: a recording timer sees laps 0 and 1 on every step, in that order.

  Run: `pnpm test world`. Expected: FAIL.

- [ ] **Step 2: Implement.**
  - `populate` adds agent i with `addAgent(store, seed, i, 4, 0)` at `draw2(seed, SPAWN, i, 0)` and `draw2(seed, SPAWN, i, 1)`, masked to `extent − 1`.
  - `step` runs the day work of Tasks 4–6, laps 0, runs `move`, laps 1 and increments `TICK`. If `checks` is set, it then fails on any nonzero `checkInvariants` code.
  - In `move`, agent i re-draws when `((tick + i) & 63) === 0`, from `w = draw3(seed, WANDER, i, tick)`. It idles if `(w & 3) === 0`, else walks 1,024 Q8 (4 px) a tick in facing `(w >>> 2) & 3`. A step off the map is skipped, and facing flips with `^ 2`.
  - `stateHash` folds every canonical region's words through `h = mix(h ^ word)`.
  - `checkpoint` copies the arena's bytes [0, `top`); `restoreWorld` lays out the same world and copies them back.

- [ ] **Step 3: Add the CLI.** `@nomos/cli` depends on `@nomos/sim-core`. `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `seed=42 tier=phone tick=1000 hash=<8 hex digits>`; `--tier` defaults to `phone` and `--ticks` to 1,000. CI runs it twice and `diff`s the two outputs.

- [ ] **Step 4: Run and commit.** Run: `pnpm install && pnpm test && pnpm lint && pnpm typecheck && node tools/cli/src/main.ts --seed 42`. Expected: PASS, then one hash line.

```bash
git add packages/sim-core/src packages/sim-core/test/world.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add the world step, tiers and replay hash"
git add tools/cli pnpm-lock.yaml .github/workflows/ci.yml
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(cli): print replay hashes and compare two runs in ci"
```

### Task 2: `sim-protocol`: calendar, visual word and messages

**Files:**
- Create: `packages/sim-protocol/package.json`, `tsconfig.json`, `src/{index,calendar,visual,columns,messages}.ts`
- Modify: `packages/sim-core/package.json` (`"sideEffects": false`), `eslint.config.js`
- Test: `packages/sim-protocol/test/protocol.test.ts`, `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: Task 1's `Tier` type, action and facing codes; M0.1's calendar constants; M0.2's `AGENT_COLUMNS` and `CUSTOM_*` constants.
- Produces (interfaces.md, Snapshot v1 and Worker messages):
  - re-exported `TICKS_PER_DAY`, `DAYS_PER_WEEK`, `DAYS_PER_SEASON`, `DAYS_PER_YEAR` and `TICKS_PER_YEAR`, plus `SEASONS_PER_YEAR = 4`, `TICKS_PER_SECOND = 10` and `TICK_MS = 100`. Build-time half-lives and rates convert from these same `sim-core` constants, as M0.2's tables do (Calendar).
  - `SNAPSHOT_BYTES = 12` and `SNAPSHOT_BUFFERS = 3`;
  - `packVisual(look, action, emote, job, facing, trueOnly): number`; `lookOf`, `actionOf`, `emoteOf`, `jobOf`, `facingOf` and `isTrueOnly`, each `(word: number): number`; `VISUAL_FIELDS: readonly { name: string; shift: number; bits: number }[]`; and re-exported `ACTION_*`, `ACTION_NAMES` and `FACING_*`. Job-item ids are M0.4's `JOB_ITEMS`;
  - the column layouts: `AGENT_COLUMNS` and the `CUSTOM_*` constants, re-exported (R8);
  - `type AppMessage = { type: 'init'; seed: number; tier: Tier; map: ArrayBuffer } | { type: 'pause' } | { type: 'resume' } | { type: 'checkpoint' } | { type: 'return'; buffer: ArrayBuffer }`;
  - `type WorkerMessage = { type: 'ready'; agents: number } | { type: 'snapshot'; tick: number; count: number; buffer: ArrayBuffer } | { type: 'stats'; tick: number; systemMs: Record<string, number> } | { type: 'checkpoint'; tick: number; state: ArrayBuffer }`. **This refines interfaces.md** with the app's `{ type: 'checkpoint' }`: a worker cannot see `pagehide`, so the app asks for the checkpoint.

- [ ] **Step 1: Write the failing tests:**
  - `records the calendar the sim runs on`: 1,440, 7, 28, 112 and 161,280; four 28-day seasons make the year; 10 ticks a second and 100 ms a tick.
  - `packs every visual field at its limits`: for look 0 and 95, action 0–7, emote 0 and 31, job 0 and 255, facing 0–3, and trueOnly 0 and 1, every accessor returns its input. Every word is a uint32 with `(word & 0xF8000080) === 0`, so the reserved bits 7 and 27–31 stay clear.
  - `lays out the word as interfaces.md fixes, with no wanted bit`: `VISUAL_FIELDS` is look 0/7, action 8/3, emote 11/5, job 16/8, facing 24/2 and trueOnly 26/1, and no field is named `wanted`.
  - `names the eight actions with sneak and carry last`: `ACTION_NAMES` is `idle`, `walk`, `sit`, `sleep`, `work`, `talk`, `sneak`, `carry`. Against round 3's idle, walk, run, work or sit, sleep, fight, arrested and down, this drops run, fight, arrested and down, splits sit from work, and adds talk, sneak and carry (R3 rendering notes).
  - `applies the sim profile to sim-protocol and sim-worker` (in `lint.test.ts`): `Math.sin(1)` and `BigInt(1)` are rejected at `packages/sim-protocol/src/planted.ts` and `packages/sim-worker/src/planted.ts`, while `s.look[0]` passes in `sim-protocol`.

  Run: `pnpm test protocol lint`. Expected: FAIL.

- [ ] **Step 2: Implement.** Scaffold the package as M0.1 scaffolded `sim-core`, with `"sideEffects": false`, depending on `@nomos/sim-core` (`workspace:*`). In `eslint.config.js`, extend M0.1's `Math` member ban and the `MATH_SYNTAX`, `BIGINT_SYNTAX` and `RATE_PRODUCTS` groups to `packages/{sim-core,sim-protocol,sim-worker}/src/**`. `LOOK_READS` stays `sim-core`'s alone, because the snapshot writer reads looks.

- [ ] **Step 3: Run and commit.** Run: `pnpm install && pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-protocol packages/sim-core/package.json pnpm-lock.yaml
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-protocol): add the visual word, calendar and messages"
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build: lint sim-protocol and sim-worker like sim-core"
```

### Task 3: Snapshots in pooled buffers

**Files:**
- Create: `packages/sim-protocol/src/snapshot.ts`
- Modify: `packages/sim-protocol/src/index.ts`
- Test: `packages/sim-protocol/test/snapshot.test.ts`

**Interfaces:**
- Consumes: Task 1's `World`; Task 2's `packVisual`.
- Produces:
  - `writeSnapshot(world: World, view: Uint32Array): number`, an addition. For each agent it writes x ÷ 256 and y ÷ 256 as float32 bits, then its word, and returns the agent count.
  - `interface SnapshotPool { readonly bytes: number; readonly free: (Uint32Array | null)[] }` and `createSnapshotPool(capacity): SnapshotPool`, which makes three buffers of capacity × 12 bytes;
  - `takeView(pool): Uint32Array | null` and `giveBack(pool, buffer: ArrayBuffer): void`.

- [ ] **Step 1: Write the failing tests:**
  - `writes 12 little-endian bytes per agent`. After 100 ticks of a phone world, check every agent i through a `DataView`: `getFloat32(12i, true) === x[i] / 256`, `getFloat32(12i + 4, true) === y[i] / 256`, and `getUint32(12i + 8, true)` equals `packVisual(look, action, 0, 0, facing, 0)`. The returned count is 10,000.
  - `circulates three buffers`. Three `takeView` calls give 120,000-byte views, and a fourth gives `null`. A returned buffer can be taken again, and a wrong-sized buffer makes `giveBack` throw `RangeError`.

  Run: `pnpm test snapshot`. Expected: FAIL.

- [ ] **Step 2: Implement.** Float bits pass through one module-level `Float32Array(1)` aliased by a `Uint32Array`; every target platform is little-endian. `giveBack` wraps a returned buffer in one view: one small object per snapshot, made outside the tick, while the three buffers circulate (R1).

- [ ] **Step 3: Run and commit.** Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-protocol/src packages/sim-protocol/test/snapshot.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-protocol): write snapshots into pooled buffers"
```

### Task 4: The day boundary and logged inputs

**Files:**
- Create: `packages/sim-core/src/inputs.ts`, `packages/sim-core/src/day.ts`
- Modify: `packages/sim-core/src/world.ts`, `src/index.ts`, `tools/cli/src/main.ts`
- Test: `packages/sim-core/test/day.test.ts`

**Interfaces:**
- Consumes: Task 1's world.
- Produces (R4 architecture §3.3, report Decision):
  - `INPUT_FOCUS = 1`, `INPUT_CAPACITY = 4096`, and `interface InputLog { readonly tick: Int32Array; readonly kind: Uint8Array; readonly a: Int32Array; readonly b: Int32Array; readonly cursor: Int32Array }`, with `cursor` holding the logged and applied counts. The log is replay input, not state: non-canonical, but included in checkpoints.
  - `World.inputs`, and `World.focus: Int32Array(1)`, non-canonical view state, with −1 for none;
  - `logInput(world, kind, a, b): boolean`, false when the log is full, and `logFocus(world, settlement): boolean`, both additions;
  - `dayBoundary(world): void`. `step` calls it first whenever `tick % TICKS_PER_DAY === 0`, tick 0 included.
  - `dayBoundary` applies all pending inputs in log order. A focus change sets `focus[0]` and writes nothing canonical: under R4's default, shadow-canonical history, watching a settlement never writes canonical state, and nothing reads focus until M8. Tier switches and forks will land here too.

- [ ] **Step 1: Write the failing tests:**
  - `applies an input at the next day boundary, once`. A focus logged at tick 300 waits for the boundary at 1,440, and later boundaries never reapply it. An input logged just before tick 1,440's step applies in that step.
  - `leaves the replay hash unchanged when a focus change touches nothing` (R4 exit check). Run seed 42 to tick 3,000 twice: once with no input, once with focus changes logged at tick 300 (settlement 0) and 2,000 (settlement 7). The hashes match at ticks 1,440, 2,880 and 3,000.
  - `carries pending inputs through a checkpoint`. Log a focus at tick 300, checkpoint at 400 and restore. At tick 1,441 the restored focus matches the original's.
  - `refuses an input past the log's capacity`: the 4,097th `logInput` returns false.

  Run: `pnpm test day`. Expected: FAIL.

- [ ] **Step 2: Implement, run and commit.** Give the CLI a repeatable `--focus <tick>:<settlement>`, logged before that tick's step. Run: `pnpm test && pnpm lint && pnpm typecheck && node tools/cli/src/main.ts --seed 42 --ticks 3000 --focus 300:0`. Expected: PASS, then the same hash line as without `--focus`.

```bash
git add packages/sim-core/src packages/sim-core/test/day.test.ts tools/cli/src/main.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): apply logged inputs at the day boundary"
```

### Task 5: Sliced day work and the warm-up

**Files:**
- Create: `packages/sim-core/src/slices.ts`, `packages/sim-core/src/warm.ts`
- Modify: `packages/sim-core/src/{day,world,index}.ts`, `tools/cli/src/main.ts`
- Test: `packages/sim-core/test/slices.test.ts`, `packages/sim-core/test/warm.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 4.
- Produces (R6 integration-cost §2):
  - **The decision point.** `type SpoilageRule = 'accept-lateness' | 'households-first' | 'skip-expired' | 'one-pass-at-10k'` and `SPOILAGE_RULE: SpoilageRule = 'skip-expired'`, marked `OWNER DECISION: R6 conflict (e)`. These are R6's four options:
    - `accept-lateness` runs agent slices, then household slices, as R6 measured them;
    - `households-first` runs household slices first;
    - `skip-expired` keeps R6's order, and M2's meals skip a head lot past its expiry;
    - `one-pass-at-10k` gives phones one slice per kind, households first, and works as `accept-lateness` elsewhere. R6 measured one pass at 10k at 1.19 ms RM, so this option fails M0.6's 0.35 ms day-slice gate unless the owner relaxes it.

    Nothing else reads the rule until M2 adds food, so another choice changes only this constant. The default keeps the measured order, and so the measured cost, and stops expired food being eaten.
  - `SLICE = 1024`, `KIND_AGENTS = 0` and `KIND_HOUSEHOLDS = 1`.
  - `daySliceCount(agents: number, households: number, rule: SpoilageRule, tier: Tier): number` and `daySlice(k: number, agents: number, households: number, rule: SpoilageRule, tier: Tier, out: Int32Array): void`, which writes `[kind, from, to]`. A kind with no entities gets no slice. The schedule is a pure function of these inputs, so it is the same on every device and for every worker count.
  - The settlement record: `RECORD_DAY = 0`, `RECORD_POPULATION = 1` and `RECORD_WALKING = 2`, with `RECORD_FIELDS = 3`. `World.record` is a canonical `Int32Array(2 * RECORD_FIELDS)` holding a front and a back record. `committed(world, field): number` reads the front, and `populate` sets its day to −1.
  - The `globals` slots `RECORD_FRONT = 1`, `DAY_AGENTS = 2` and `DAY_HOUSEHOLDS = 3`, fixed by `dayBoundary`. There are no households until M2.
  - `runDaySlice(world): void`. `step` runs slice k = tick % 1,440 while k is below the day's count. `dayBoundary` clears the back record; agent slices fold population and walkers into it. The last slice stamps the day and flips `RECORD_FRONT`, which commits the record.
  - `warmUp(): void`. It lays out a phone world of `WARM_AGENTS = 1024` in `WARM_MEMORY_BYTES = 1_048_576`, runs `dayBoundary` and every slice of the day `WARM_DAYS = 40` times, then steps it `WARM_TICKS = 2000` times, and discards it. These are R6's pre-warm figures (integration-cost §2).

- [ ] **Step 1: Check the decision.** If the owner has settled R6 conflict (e), set `SPOILAGE_RULE` to that option; otherwise keep the default.

- [ ] **Step 2: Write the failing tests:**
  - `slices 10k, 25k and 100k agents into 10, 25 and 98 slices`.
  - `covers every entity once a day under every rule`. Take agent and household counts of 10,000 and 4,079, 25,000 and 10,184, and 100,000 and 40,582. Under every rule and tier, each entity falls in exactly one slice, and no slice exceeds 1,024 except under `one-pass-at-10k` on phones.
  - `orders slices by the spoilage rule`. On desktop, with 100,000 agents and 40,582 households:
    - under `accept-lateness` and `skip-expired`, household slices are k = 98–137 of 138;
    - under `households-first`, they are k = 0–39;
    - under `one-pass-at-10k`, desktop keeps the `accept-lateness` order, and phones, with 10,000 agents and 4,079 households, get 2 slices, households first.
  - `commits the settlement record when the last slice ends`. In a phone world, with n = `daySliceCount(10_000, 0, SPOILAGE_RULE, 'phone')` (10 under the default), the committed day is −1 before tick n − 1's step and 0 after it, with population 10,000. Day 1 commits in tick 1,440 + n − 1's step.
  - `restores a checkpoint taken mid-window`: a world checkpointed after tick 5 and restored matches the original's hash at tick 1,000.
  - `warms up without changing any replay`: seed 42's hash at tick 1,000 is the same before and after `warmUp()`.

  Run: `pnpm test slices warm`. Expected: FAIL.

- [ ] **Step 3: Implement, run and commit.** Add the CLI flag `--warmup`, which runs `warmUp` first and prints its milliseconds. R6 measured 18–32 ms; it is not gated here. Run: `pnpm test && pnpm lint && pnpm typecheck && node tools/cli/src/main.ts --warmup`. Expected: PASS, then a time and a hash line.

```bash
git add packages/sim-core/src packages/sim-core/test/slices.test.ts packages/sim-core/test/warm.test.ts tools/cli/src/main.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): slice day work and commit the settlement record"
```

### Task 6: The stride scheduler

**Files:**
- Create: `packages/sim-core/src/stride.ts`
- Modify: `packages/sim-core/src/{streams,day,world,index}.ts`
- Test: `packages/sim-core/test/stride.test.ts`

**Interfaces:**
- Consumes: M0.1's `floorMod`, `dayOf`, `dayOfYear`, `yearOf`, `draw2` and `draw3`; M0.2's `take` and `AGENT_SALT`; Task 4's `dayBoundary`.
- Produces (R8 transmission notes and report task list):
  - `STRIDE_DAYS = 30` and `STRIDE = AGENT_SALT + 4`;
  - `interface Stride { readonly period: number; readonly stream: number; readonly offset: Int32Array; readonly changed: Uint8Array; readonly value: Int32Array }`. `offset` is canonical; the change list is non-canonical scratch of ⌈capacity ÷ period⌉ slots.
  - `createStride(arena: Arena, capacity: number, period: number, stream: number): Stride`, and `rekeyStride(stride: Stride, seed: number, year: number): void`, which sets the offset to `draw2(seed, stream, year, period) % period`;
  - `firstDue(stride: Stride, day: number): number`, which is `floorMod(day − offset, period)` for the absolute day. Agent i is due on day d when i ≡ d − offset (mod period), and its change slot is (i − first) ÷ period whatever the visiting order.
  - `setChange(stride: Stride, slot: number, value: number): void`, and `applyChanges(stride: Stride, day: number, n: number, column: Int32Array | Uint16Array | Uint8Array): void`, which writes the flagged values in slot order and clears them;
  - `World.stride`, which `dayBoundary` re-keys with `yearOf(day)` when `dayOfYear(day) === 0`, tick 0 included. No checks run on it until M3.

- [ ] **Step 1: Write the failing tests:**
  - `makes each agent due 3 or 4 times a year`: with a 30-day period and 1,000 agents, re-keyed for years 1–5, every agent is due 3 or 4 times in each year. With the offset at 17, `firstDue` on day 0 is 13, folded up from −17.
  - `re-keys the offset yearly from the seed`. A given seed and year always give the same offset, and years 1–20 give at least 10 distinct offsets. `dayBoundary` at tick 161,280 switches to year 2's offset.
  - `gives identical hashes in reversed visiting order` (R8), on a 10,000-agent toy over 224 days.
    - Each day, read the boundary count of agents in state 1. Each due agent i sets 1 if `draw3(42, 0x1F0, i, day) % 10_000` is below that count, else 0, through `setChange`.
    - Forward, reversed and keyed-shuffled visits all hash alike.
    - Writing directly, with a live count, makes forward and reversed differ.

  Run: `pnpm test stride`. Expected: FAIL.

- [ ] **Step 2: Implement, run and commit.** `applyChanges` visits agents first, first + period, … below n, so the order is fixed whatever order set the changes. Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add packages/sim-core/src packages/sim-core/test/stride.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): add the stride scheduler, re-keyed yearly"
```

### Task 7: No sorting in sim code; top shares from a histogram

**Files:**
- Create: `packages/sim-core/src/histogram.ts`
- Modify: `packages/sim-core/src/index.ts`, `eslint.config.js`
- Test: `packages/sim-core/test/histogram.test.ts`, `packages/sim-core/test/lint.test.ts`

**Interfaces:**
- Consumes: M0.2's `take`.
- Produces (R6 integration-cost §4):
  - `BINS_PER_OCTAVE = 16` and `HISTOGRAM_BINS = 849`: bin 0 for zeros, then 16 bins for each of 53 octaves, R6's 848 plus the zero bin;
  - `interface Histogram { readonly count: Float64Array; readonly sum: Float64Array }`, non-canonical, with `createHistogram(arena: Arena): Histogram` and `clearHistogram(h: Histogram): void`;
  - `binOf(v: number): number` and `addValue(h: Histogram, v: number): void`, for integers 0 ≤ v < 2^53;
  - `topShare(h: Histogram, topPpm: number): number`: the ppm of the total held by the top `topPpm` ÷ 10^6 of entries, splitting the cut bin pro rata.

- [ ] **Step 1: Write the failing tests:**
  - `bins 16 steps per octave`: `binOf` maps 0, 1, 2, 3 and 2^53 − 1 to 0, 1, 17, 25 and 848.
  - `takes the top-10% share within 0.03 points of a sort` (R6). The test builds 100,000 lognormal values (σ 1.2, median 10^6 cents) and 100,000 Pareto values (α 1.5) with `Math.exp`. For each set, `topShare(h, 100_000)` lies within 300 ppm of the exact share from a sorted plain array.
  - `rejects sorting in sim code` (in `lint.test.ts`): `v.sort()` and `v.toSorted()` give messages at `packages/sim-core/src/planted.ts` and `packages/sim-worker/src/planted.ts`, but none at `packages/sim-core/scripts/planted.ts`.

  Run: `pnpm test histogram lint`. Expected: FAIL.

- [ ] **Step 2: Implement, run and commit.** `binOf` finds the octave with `Math.clz32` on the value's high or low 32-bit half, split by `Math.floor(v / 2^32)`, and takes the 4 bits below the leading one, so it needs no `Math.log2`. Add the group `SORT_CALLS`, `CallExpression[callee.property.name=/^(sort|toSorted)$/]`, to every sim source block, exemptions included. ESLint cannot tell which views are shared, and `TypedArray.prototype.sort` copies shared memory (R6), so every such call goes; histograms and slot order replace sorting. Run: `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.

```bash
git add eslint.config.js packages/sim-core/test/lint.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "build(sim-core): lint-ban sorting in sim code"
git add packages/sim-core/src packages/sim-core/test/histogram.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-core): take top shares from a log2 histogram"
```

### Task 8: The worker loop and the page lifecycle

**Files:**
- Create: `packages/sim-worker/package.json`, `tsconfig.json` (`"lib": ["ES2022", "WebWorker"]`), `src/{loop,worker,index}.ts`; `packages/sim-protocol/src/lifecycle.ts`
- Modify: `packages/sim-protocol/src/index.ts`
- Test: `packages/sim-worker/test/loop.test.ts`, `packages/sim-protocol/test/lifecycle.test.ts`

**Interfaces:**
- Consumes: Task 1's `World`, `Tier`, `createWorld`, `step`, `checkpoint`, `currentTick` and `SYSTEM_NAMES`; Task 5's `warmUp`; Task 2's messages and `TICK_MS`; Task 3's `createSnapshotPool`, `takeView`, `giveBack` and `writeSnapshot`.
- Produces:
  - `interface LoopHost { now(): number; sleep(fn: () => void, ms: number): void; yieldNow(fn: () => void): void; post(msg: WorkerMessage, transfer: Transferable[]): void; makeWorld(seed: number, tier: Tier, map: ArrayBuffer): World }`;
  - `createSimLoop(host: LoopHost): { handle(msg: AppMessage): void }`, with `MAX_TURN_MS = 10`, `MAX_GAP_MS = 250`, `STATS_MS = 250` and `SLEEP_MIN_MS = 4`;
  - `worker.ts`, the entry. It binds `self.onmessage` to `handle`, `now` to `performance.now`, `sleep` to `setTimeout`, `yieldNow` to one `MessageChannel`, `post` to `self.postMessage`, and `makeWorld` to `createWorld(seed, tier)`. M0.4 changes only this binding, to `createWorld(seed, tier, parseMap(map))`.
  - `bindPageLifecycle(doc: EventTarget & { readonly visibilityState: string }, win: EventTarget, post: (msg: AppMessage) => void): void`, in `sim-protocol` for M0.5's page. It sends `pause` when the page is hidden and `resume` when it is visible. On `pagehide` it sends `pause`, then `checkpoint`.
- Behaviour:
  - `init` runs `warmUp()`, `makeWorld` and the pool. The worker then posts `ready` and waits paused for `resume`; M0.4 adds a tick-0 snapshot after `ready`. The app decides when to resume, and starts paused under reduced motion (M0.5).
  - `resume` sets `last = now()` and `acc = 0`, so nothing is caught up.
  - Each turn adds the elapsed time to `acc`, caps `acc` at `MAX_GAP_MS`, and runs due ticks until `MAX_TURN_MS` has passed in the turn. The cap means a stall of any length runs at most 2 ticks (R2 §2).
    - If ticks ran and a view is free, the turn posts a snapshot.
    - At most every `STATS_MS`, it posts the mean milliseconds of each system per tick, and of `snapshot` per snapshot.
    - One reused message object and transfer array per kind keep turns allocation-free.
  - The loop sleeps with `setTimeout` when the next tick is at least `SLEEP_MIN_MS` away, and otherwise yields through the `MessageChannel`, which avoids the nested-timer clamp (R2 §2). Sleeping through the 100 ms between ticks keeps 1× from spinning a core (inference).
  - `checkpoint` posts `{ type: 'checkpoint', tick, state }`, transferring the state. `return` gives the buffer to the pool. Messages before `init` are ignored.

- [ ] **Step 1: Write the failing tests** with a fake host: a manual clock, a queue of due callbacks that `advance(ms)` runs in order, and `makeWorld` bound to `createWorld(seed, tier)`.
  - `posts ready and waits`: after `init`, the one post is `ready` with 10,000 agents, and advancing 1,000 ms runs no tick.
  - `runs 10 ticks per second of wall time`: after `init` and `resume`, advancing 1,000 ms runs 10 ticks.
  - `pauses while the page is hidden and resumes without catching up` (R2 exit check). `bindPageLifecycle` posts from a fake document into `handle`. Hide the page at tick 10 and advance 60,000 ms: the tick stays at 10. Show it and advance 1,000 ms: it reaches 20.
  - `never catches up after a stall`: after callbacks are held for 5,000 ms, the next turn runs at most 2 ticks.
  - `sleeps between ticks at 1×`: over 1,000 ms, sleeps of at least 4 ms carry every tick, and `yieldNow` runs at most once per tick.
  - `checkpoints on pagehide`: the posted state is `arena.top` bytes at the current tick, and the loop is paused.
  - `posts snapshots only while a buffer is free`: with no returns, exactly 3 snapshots arrive while ticking continues, and each return allows one more.
  - `reports per-system milliseconds` under the keys `day`, `move` and `snapshot`.
  - In `lifecycle.test.ts`: hidden posts `pause`, visible posts `resume`, `pagehide` posts `pause`, then `checkpoint`.

  Run: `pnpm test loop lifecycle`. Expected: FAIL.

- [ ] **Step 2: Implement, run and commit.** Run: `pnpm install && pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS. M0.5 repeats the hidden-page check in a real browser, through Playwright with a visibility shim (R2 §2). The lifecycle is committed first, since the loop's tests use it.

```bash
git add packages/sim-protocol/src packages/sim-protocol/test/lifecycle.test.ts
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-protocol): pause on hide and checkpoint on pagehide"
git add packages/sim-worker pnpm-lock.yaml
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "feat(sim-worker): run the sim loop at 10 ticks a second"
```

### Task 9: Close M0.3

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Confirm CI passes on `main`.** Run: `gh run list --workflow ci.yml --limit 1`. Expected: success, with the CLI's two runs identical.
- [ ] **Step 2: Record the pace** in M0.3's Started, Done and Actual cells, and rescale the remaining estimates.
- [ ] **Step 3: Tick what landed** in the shared doc's M0 section, then export with `/sync-plan-doc`:
  - the worker loop (R1, R2);
  - snapshot v1 with its eight actions (R1, R3);
  - the day-boundary phase (R4);
  - the calendar in `sim-protocol` (R6, Calendar);
  - the sort ban (R6);
  - day slices and the warm-up (R6), noting `SPOILAGE_RULE` and whether the owner chose it;
  - the stride scheduler (R8), and the culture layout in `sim-protocol` (R8);
  - M0.2's every-tick invariant check;
  - the exit checks: the ledger every tick (R1); apportionment and focus (R4); and seed 42 across runs (R1), whose browser half waits for M0.6. Note pause on hide (R2) as passing in Node; the CI check that lists it with context loss and contrast waits for M0.4 and M0.5.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "docs(plan): record the M0.3 pace"
git add docs/plan/implementation-plan.md
git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -m "docs(plan): sync the implementation plan from the doc"
```
