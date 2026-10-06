# Integration cost: resources, food lots with spoilage, happiness and wealth against the tick, memory and ledger budgets

**Answer.** Yes for the agent tiers, with two design rules; not yet for a 10,000-settlement country in plain JS.
- **Per tick:** goods and wellbeing fit easily if needs are stored lazily and meals ride a timing wheel. At 100k agents that costs about 0.024 ms in reference-machine (RM) terms, 1.7% of the 1.4 ms "other agent systems" sub-budget. Decaying every agent's needs every tick costs about 1.8 ms RM at 100k, 130% of that sub-budget.
- **Day boundary:** spoilage, payroll, wealth and happiness cost 0.63 / 1.6 / 6.6 ms on this desktop at 10k / 25k / 100k. That is about 1.2 / 3.0 / 12.5 ms RM, at or over the whole tick slack (1.25 / 2.95 / 3.0 ms). Slicing the same work into fixed 1,024-entity chunks, one per tick, brings the worst tick to about 0.13 / 0.13 / 0.27 ms RM.
- **Memory:** 89–101 B per agent (about 1.1 / 2.6 / 10.5 MB in total), well inside the 256 B per-agent cap and the 64 / 72 / 160 MB app budgets.
- **Settlement ledger:** a full category × quality × age cube adds 153 numbers (644 B) per settlement and costs 1.7 µs per settlement-day here. An exact expiry-day ring adds 115 numbers (492 B) at 0.45–0.5 µs. Even the cheapest variant exceeds the 10k-settlement JS headroom of about 0.36 µs RM, so the extension needs the planned WASM port there.

## Setup, method and labels

- **Machine (measured here):** AMD Ryzen 5 3600, 6 cores / 12 logical CPUs at 3.6 GHz base, 32 MB L3, 16 GB RAM, Windows 10 Pro 10.0.19045. Engine: Node v24.18.0, V8 13.6.233.17-node.50. Node only: no Bun, Deno or Chromium was installed.
- **No load average on Windows:** `os.loadavg()` returned `[0, 0, 0]` in every run (measured here). Node's docs say "The load average is a Unix-specific concept. On Windows, the return value is always `[0, 0, 0]`" ([nodejs/node doc/api/os.md](https://github.com/nodejs/node/blob/main/doc/api/os.md), opened as the raw file through the fetch tool).
- **Load proxy instead:** each run sampled `os.cpus()` time deltas over 0.5–1 s before the run, after the tick samples and at the end. This desktop was not dedicated: 0.09–5.27 of 12 logical CPUs were busy at those points. Three runs started with ≥3 CPUs busy: `10k-wheel-scatter`, `25k-all-scatter` and `100k-wheel-scatter`. The raw values are in each result's `cpuBefore`, `cpuAfterTicks` and `cpuEnd` fields.
- **Method (as `/perf-check` and R5):** ≥250 ms of warm-up, then ≥9 samples, each at least 25 ms of measured work. I report the median [min–max] and gate on the minimum.
  - Per-tick samples run inside the live simulation, so caches are realistic. Each tick times needs + eating and shopping apart from day work, minus a measured 57–120 ns `performance.now()` overhead.
  - Day work is sampled at ≥9 real day boundaries per run (9–86). It is also re-timed on one identical whole-arena snapshot per variant ("probe").
  - Allocation windows use the `perf_hooks` `gc` observer plus `v8.getHeapStatistics()` under `--expose-gc`, with no timing calls inside the windows.
- **Workload (inference: plausible placeholders for the other four researchers' mechanics):**
  - 10k / 25k / 100k agents in 4,079 / 10,184 / 40,582 households (mean 2.46 people) and 408 / 1,019 / 4,059 firms.
  - 1,440 ticks per sim day as the default (the plan has fixed no day length). Runs at 240 and 14,400 ticks per day test sensitivity.
  - Agents eat about 2.6–2.7 meals a day. About 5% of food spoils at steady state.
- **Code:** [`../prototypes/integration-cost/`](../prototypes/integration-cost/) is plain ES modules with no dependencies. All state lives in one `WebAssembly.Memory` carved into typed-array views ([arena.mjs](../prototypes/integration-cost/arena.mjs)), as plan task M0 (R5) asks. The layouts, tick variants and day variants are swappable.
  - Reproduce: `node run-all.mjs` (about 6 minutes), then `node summarize.mjs`, `node --expose-gc sort-shared.mjs` and `node jit-prewarm.mjs N=100000 warm=1`.
  - Raw JSON results are in [`results/`](../prototypes/integration-cost/results/).
- **RM-equivalent:** "RM-eq" means a figure from this desktop multiplied by 1.9, a calibration against R5's reference machine (section 6). It is a desktop-derived estimate, not an RM or phone measurement.

## 1. Per-tick cost: needs, eating from household food lots, shopping

### Takeaway
- **Lazy needs on a timing wheel cost almost nothing:** 0.0012 / 0.0034 / 0.0148 ms per tick at 10k / 25k / 100k here. In RM terms that is 0.2% / 0.2% / 1.7% of the "other agent systems" sub-budget.
- **Decaying four needs for every agent every tick** costs 0.098 / 0.235 / 0.976 ms here, about 15% / 15% / 130% of the sub-budget in RM terms. It fails at 100k.
- **A 1/8 contiguous stagger** sits in between: 0.015 / 0.032 / 0.139 ms here, 2% / 2% / 17% of the sub-budget.
- **Eating is cheap per event:** a FEFO meal from packed household lots costs 16–20 ns when household members sit next to each other in agent order, and 28–46 ns when they are scattered. Shopping, capped per tick, costs ≤ 0.0035 ms per tick at 1,440 ticks per day.
- **A per-tick mood update** (happiness EMA over all agents) costs 0.023 / 0.057 / 0.225 ms here, or 31% of the 100k sub-budget in RM terms. Keep happiness daily.

### Cited Findings
- **Per-tick bundle** (needs + eating + shopping), ms per tick, median [min–max], 1,440 ticks per day, contiguous households, packed lots — measured here ([summary](../prototypes/integration-cost/summarize.mjs); [results](../prototypes/integration-cost/results/)):

  | Agents | All agents every tick | 1/8 stagger | Lazy needs + timing wheel | Sub-budget, RM ms | RM-eq share (all / stagger / wheel) |
  |---|---|---|---|---|---|
  | 10k | 0.0982 [0.0965–0.1666] | 0.0149 [0.0130–0.0174] | 0.0012 [0.0012–0.0013] | 1.2 | 15% / 2.1% / 0.2% |
  | 25k | 0.2347 [0.2298–0.2386] | 0.0324 [0.0291–0.0637] | 0.0034 [0.0032–0.0036] | 3.0 | 15% / 1.8% / 0.2% |
  | 100k | 0.9760 [0.9590–1.0071] | 0.1394 [0.1226–0.1844] | 0.0148 [0.0124–0.0208] | 1.4 | **130%** / 17% / 1.7% |

  - The shares come from the minimum × 1.9 (computed); the sub-budgets are from the [plan](../../../plan/implementation-plan.md).
  - Single-tick p99 / max at 100k: 1.33 / 1.68 ms (all), 0.29 / 0.60 ms (stagger), 0.051 / 0.22 ms (wheel) — measured here.
- **The variants:** [needs.mjs](../prototypes/integration-cost/needs.mjs) — own code.
  - "All" keeps four `Uint16` needs per agent and eats below 60% hunger.
  - "Stagger" visits one contiguous eighth of agents per tick at 8× the decay.
  - "Wheel" stores, for each need, the tick at which it reaches zero, in an `Int32`. Current value = rate × (zero tick − now), read on demand. A 2,048-slot wheel with intrusive `Int32` lists schedules each agent's next meal.
- **Meals per agent-day:** 2.57–2.69 across variants at 1,440 ticks per day — measured here.
  - At 14,400 ticks per day it fell to 2.21. Integer per-tick rates round 4.32 down to 4 at that day length (computed). Long days need fractional (Q8) rates.
- **Per-meal cost, "dinner rush"** (every agent eats in the same tick), ns per agent, median [min–max] — measured here:
  - contiguous households: 16.0–17.6 at all scales, e.g. 17.4 [17.1–19.0] at 100k;
  - scattered households: 27.5 (10k), 32.3 (25k), 38.2–45.5 (100k);
  - field-array (SoA) lots: 18.9–20.1.

  If all 100k agents ate in one tick, that would cost 1.7 ms contiguous or 3.8–4.5 ms scattered here (computed).
- **Ticks per day:** at 240 ticks per day the wheel bundle at 100k rises to 0.074 [0.072–0.085] ms, with 64 shopping trips per tick. At 14,400 it falls to 0.0025 [0.0020–0.0037] ms — measured here.
- **Household order:** scattering household members across agent indices changed the "all" bundle by under 1% at 100k (0.968 vs 0.976 ms). It raised the wheel bundle 15% (0.0170 vs 0.0148 ms) — measured here.
- **Lot layout:** field-array lots made the 100k "all" bundle 3.6% slower (1.011 vs 0.976 ms) and the 10k one 5% faster (0.094 vs 0.098 ms). Both differences are within noise — measured here.
- **Optional per-tick mood EMA:** 0.0245 [0.0227–0.0445], 0.0577 [0.0571–0.0588] and 0.2296 [0.2272–0.2426] ms at 10k / 25k / 100k. In RM terms that is 3.6% / 3.6% / 31% of the sub-budget — measured here (`moodTick` in [needs.mjs](../prototypes/integration-cost/needs.mjs)), shares computed.
- **R5 context:** decisions on a timing wheel already cost ≈0.03 / 0.082 / 0.40 ms RM at 10k / 25k / 100k. A dense awake list beat a per-agent flag check by 4–5× ([R5 compute notes §4](../../round-5-performance/notes/compute.md), opened).

### Inferences
- **The 100k tier decides the design.** Its sub-budget is 14 ns per agent per tick, against 120 ns at 10k and 25k (computed from the plan). Any pass that touches every agent every tick spends most of it.
- **Lazy needs move cost into the decision system.** Each decision must compute four needs from zero ticks: one subtract and one multiply each. R5's wheel already visits only about 2.5% of agents per tick, so the extra cost should be a few percent of 0.40 ms RM at 100k. This was not measured.
- **Synchronised meal times would recreate the dinner-rush spike.** The wheel spreads meals by personal hunger. If designers want fixed mealtimes, spread them over ≥30 ticks: 100k agents then cost about 0.06–0.15 ms per tick here (computed).

### Gaps
- Eating ignores location: in the real sim an agent must be at home or a shop. Shopping is modelled as an instant purchase, not a trip.
- The decision-side cost of reading lazy needs, and the jobs, inventory and social systems that share this sub-budget, were not measured.
- Node only. V8 in Chromium and JavaScriptCore were not run.

## 2. Day-boundary cost: spoilage and stock fold, payroll and wealth, happiness, resources

### Takeaway
- **One pass at the boundary costs** 0.636 / 1.645 / 6.74 ms here (median, warm JIT) at 10k / 25k / 100k. That is about 1.19 / 3.04 / 12.5 ms RM: 95% / 103% / 416% of the tick slack.
- **Fixed 1,024-entity slices fix it.** One slice per tick, agents then households, takes 14 / 35 / 138 ticks per day. The worst tick costs 0.072 / 0.072 / 0.154 ms here, about 0.13 / 0.13 / 0.27 ms RM. On the same state, total day work changes by −0.5% to +4.3% (+13% with scattered households).
- **Fusing the passes buys nothing.** One agent sweep plus one household sweep cost 4–6% more than four passes, and 13% more with scattered households.
- **The parts at 100k** (warm, probe): happiness 3.05 ms, spoilage with the stock fold 2.20 ms, household wealth 0.81 ms, payroll 0.53 ms, resources 0.11 ms, ledger commit 0.005 ms. Folding the ledger stocks and food value into the spoilage pass adds 0.73 ms (+51%) at 100k.
- **Day code runs cold in play.** At 1,440 ticks per day it runs every 144 s at 1× speed. The first boundary costs 3.1–5.7 / 4.7–11.2 / 13.3–26.8 ms here. Pre-warming on a 1,024-agent dummy world (18–32 ms at start) roughly halves the 100k figure.

### Cited Findings
- **In-sim day work**, ms per day, median [min–max] over ≥9 real day boundaries, warm JIT, wheel needs, contiguous households, packed lots — measured here ([sim.mjs](../prototypes/integration-cost/sim.mjs), [daily.mjs](../prototypes/integration-cost/daily.mjs)):

  | Agents | One pass at the boundary | Sliced: day total | Sliced: worst tick | Slices a day | Tick slack, RM ms | RM-eq worst tick, one pass / sliced |
  |---|---|---|---|---|---|---|
  | 10k | 0.636 [0.627–0.737] | 0.681 [0.664–1.200] | 0.072 [0.069–0.180] | 14 | 1.25 | 1.19 / 0.13 |
  | 25k | 1.645 [1.602–1.879] | 1.657 [1.635–1.847] | 0.072 [0.069–0.144] | 35 | 2.95 | 3.04 / 0.13 |
  | 100k | 6.736 [6.562–7.210] | 7.238 [6.878–11.603] | 0.154 [0.140–0.460] | 138 | 3.0 | 12.5 / 0.27 |

  RM-eq is the minimum × 1.9 (computed). With "all-agents" needs, one pass cost 0.742 / 1.693 / 6.754 ms — measured here.
- **Probes on one identical day state** at 100k, ms: separate passes 6.838 [6.633–7.532], fused sweeps 7.142 [6.813–10.732], sliced total 7.054 [6.794–8.007], largest slice 0.152 [0.148–0.291]. At 10k: 0.639 / 0.663 / 0.661 / 0.070 — measured here.
- **Parts at 100k, wheel needs, probe**, ms median [min–max] — measured here:
  - spoilage + stock fold 2.195 [2.174–2.395], about 54 ns per household;
  - payroll and spending 0.530 [0.523–0.559], 5.3 ns per agent;
  - household wealth 0.814 [0.808–1.297], 20 ns per household;
  - happiness 3.051 [3.007–3.868], 30 ns per agent; it was 2.610 ms with stored needs, because the wheel variant computes the social need on demand;
  - resources for 4,059 firms × 8 resources 0.106 ms;
  - commit 0.0049 ms.
- **Spoilage with vs without the fused ledger fold** (stock cube plus household food value), minimum: 0.191 vs 0.119 ms at 10k, 0.525 vs 0.323 ms at 25k, 2.153 vs 1.427 ms at 100k — measured here.
- **Scattered households** (members not adjacent in agent order) cost +15% day work at 100k (7.772 vs 6.736 ms). Payroll rose 77% (0.94 vs 0.53 ms) from random purse writes — measured here.
- **First five day boundaries after start**, ms, one pass — measured here:
  - first boundary: 3.1–5.7 (10k), 4.7–11.2 (25k), 13.3–26.8 (100k); the top of each range is a fused-sweep run;
  - boundaries two to five: 0.7–2.0, 1.8–2.2 and 6.6–11.1.
  - Sliced, the worst tick on day one was 1.5–2.0 ms, falling to 0.08–0.56 ms by day five.
- **Pre-warm test** ([jit-prewarm.mjs](../prototypes/integration-cost/jit-prewarm.mjs), 3 runs each) — measured here:
  - first 100k boundary: 15.6–16.7 ms cold vs 8.7–9.1 ms after 40 day boundaries and 2,000 ticks on a 1,024-agent dummy world (17.5–31.8 ms);
  - first 10k boundary: 3.04 vs 1.18 ms.
- **Top-10% wealth share:** a 16-bins-per-octave log2 histogram filled in the wealth pass costs 0.001 ms to read. Sorting a scratch copy costs 0.31–0.35 / 0.88–0.97 / 4.16–4.32 ms. The two differ by 17–21 Q16 units (0.03 percentage points) — measured here.
- **R4/R5 context:** R4 advises double-buffering any time-sliced aggregate update and committing at the day boundary, "so slicing can never change results" ([R4 architecture-lod §3.7](../../round-4-multi-scale/notes/architecture-lod.md), opened). R5 fixes 1,024-agent chunks for workers, reduced in chunk order ([R5 compute notes §2](../../round-5-performance/notes/compute.md), opened).

### Inferences
- **Slice the day work.** One pass fits only at 10k, and only with no margin. Slicing turns the day spike into ≤ 0.3 ms RM per tick at every tier. The 1,024-entity chunks match R5's worker chunks, so the slices can run in parallel later.
- **Slicing changes results versus one pass,** because the order relative to eating changes (lots that expire today stay edible for up to 138 ticks at 100k). It stays deterministic if the schedule is fixed: chunk k runs at tick (boundary + k) on every device and worker count. Commit the settlement record once, when the last slice ends.
- **Happiness is the biggest daily cost.** Caching log-income per agent when the wage changes would remove a LUT lookup and a division per agent (inference, not measured). The cost per agent depends on the final number of drivers.
- **Keep household members adjacent in agent index** (spawn household by household). This was worth 15% of day work and 2.3× per-meal cost at 100k.

### Gaps
- Births, deaths and moves will fragment household order over time. The cost of compacting or re-sorting was not measured.
- Mechanics are placeholders. Spoilage scales with lots per household (about 3–4 here), happiness with the number of drivers.
- Running slices on worker threads was not measured.

## 3. Memory: bytes per agent, per household and in total

### Takeaway
- **Per agent:** 48 B (stored needs) or 60 B (lazy needs plus the wheel link).
- **Per household:** 98 B (packed lots) or 114 B (field-array lots), that is 39.8 or 46.3 B per agent.
- **Firm resources:** 1.3 B per agent.
- **Total:** 89–101 B per agent, plus an optional 3.2 B sort scratch that the histogram makes unnecessary.
- **Against the budgets:** with R5's measured 56 B per agent the hot state reaches about 157 B, 61% of the 256 B cap. The arenas take 1.07 / 2.63 / 10.45 MB, 1.7% / 3.7% / 6.5% of the 64 / 72 / 160 MB app budgets and 8% of a 32 MB phone reservation at 25k.

### Cited Findings
- **Arena regions** (exact bytes from the bump allocator; [world.mjs](../prototypes/integration-cost/world.mjs) `layout`) — measured here:
  - **Agent fields:**
    - needs: 8 B (`Uint16` × 4), or 16 B of zero ticks (`Int32` × 4) plus a 4 B wheel link;
    - metabolism 1 B; household id 4 B;
    - happiness (`Int32` Q16) 4 B and set point (`Int16` Q8) 2 B;
    - daily meal-quality sum, meals and missed meals 4 B; flags 1 B;
    - cash, wage and today's income as integer-cent `Float64` 24 B.
  - **Household fields:**
    - 8 packed lots 32 B (or 48 B as fields); lot count 1 B; portions 2 B; members 1 B;
    - shop-queue flag and slot 5 B;
    - purse, deposits, home value, durables, net worth, food value and a member-cash scratch, 7 × `Float64` = 56 B;
    - wealth band 1 B.
  - **Settlement and system:**
    - L0 settlement record: 628 B, double-buffered as 1,256 B;
    - system: 10–18 KB (wheel heads, accounts, a 848-bin histogram).
- **Totals and reservations** — measured here:
  - 936,960 / 2,323,632 / 9,243,112 B used (stored needs); 1,065,152 / 2,631,824 / 10,451,304 B (wheel);
  - reserved in 64 KiB pages: 1.11 / 2.69 / 10.49 MB.
- **Whole-state snapshot:** copying the arena costs 0.29–0.56 ms (about 1 MB, 10k), 0.46–2.55 ms (2.4–2.7 MB, 25k) and 1.4–3.6 ms (9.3–10.5 MB, 100k). Restoring costs 0.07–0.19, 0.21–0.27 and 0.76–1.17 ms — measured here.
- **Budgets:** ≤ 256 B per agent hot SoA with 56 B measured; app memory ≤ 64 / 72 / 160 MB; WASM memory 32 MB on phones and 64–128 MB on desktops ([plan, Performance budget](../../../plan/implementation-plan.md), opened; [R5 compute notes §7](../../round-5-performance/notes/compute.md), opened).
- **Node process:** `heapUsed` stayed at 5.4–6.4 MB in every run, mostly the harness — measured here.

### Inferences
- Memory is not the constraint. Even the wider field-array lots (+6.5 B per agent) and lazy needs (+12 B) leave about 99 B per agent of the 256 B cap.
- Packed lots are the better default. They are 16 B smaller per household, run at the same speed and give identical results (section 4). Keep the field-array form only if designers need more than 511 portions per lot, 16 categories or 8 quality bands.
- One arena makes a whole-state checkpoint a single 1–10 MB copy of 0.3–3.6 ms. That suits R1's "checkpoint on `pagehide`" and save snapshots (inference).

### Gaps
- Real mechanics may add fields: more needs, more drivers, more asset types, lot provenance. Each `Float64` asset per household adds 3.3 B per agent (computed).
- Browser memory (`measureUserAgentSpecificMemory`) was not measured. These are arena bytes.

## 4. Zero allocation and determinism

### Takeaway
- **Zero GC events in every window of all 26 runs:** 1,000 quiet ticks; 2,890 ticks including two day boundaries; 20 day boundaries of each variant; 20 sorts.
- **Heap growth was far below the 64 KB-per-tick gate.** It was 22–49 B per tick on quiet ticks (187 B at 240 ticks per day) and 4–145 B per tick with day work. Each day boundary added 0.5–19 KB while the JIT was still tiering.
- **Never call `TypedArray.prototype.sort` on shared memory.** On a shared `WebAssembly.Memory` it copies the array. Arrays of 32 KB and 82 KB caused 1 and 4 GC events per 50 sorts. Arrays above V8's regular-object limit are copied off the JS heap. Use the histogram.
- **Repeat runs gave identical state hashes in all 26 runs.** The packed and field-array lot layouts gave identical hashes at all three scales. Total cents plus MINT summed to exactly zero after every run.

### Cited Findings
- **GC windows per run** (`gc` entries, `used_heap_size` deltas; [bench.mjs](../prototypes/integration-cost/bench.mjs) `gcWindow`) — measured here:
  - 0 scavenges and 0 mark-compacts in 156 windows;
  - two windows showed negative heap deltas (−5.7 KB and −11.4 KB per unit), consistent with concurrent sweeping (inference).
- **Day-boundary allocation while warming** — measured here:
  - the composite boundary allocated 10–28 KB per call over its first 20–40 calls;
  - afterwards 1.2–1.5 KB per call at both 10k and 100k (it does not scale with N);
  - each day function alone allocated about 31 B per call once warm.
- **Shared-memory sort** ([sort-shared.mjs](../prototypes/integration-cost/sort-shared.mjs); [sort-shared.json](../prototypes/integration-cost/results/sort-shared.json)) — measured here:
  - non-shared memory, 4,079 / 10,199 / 40,582 doubles: 0 GC events, in place;
  - shared memory: 1 GC event (32.6 KB) and 4 GC events (81.6 KB) per 50 sorts, but none at 324.7 KB.
- **V8 source, sort without a comparator:** it calls `TypedArraySortFast` ([typed-array-sort.tq](https://github.com/v8/v8/blob/main/src/builtins/typed-array-sort.tq), opened as the raw file through the fetch tool). With a comparator it allocates two `FixedArray` work arrays.
- **V8 source, shared buffers:** for a SharedArrayBuffer, "the data is copied into temporary memory, as std::sort might crash in case the underlying data is concurrently modified while sorting". Copies up to `kMaxRegularHeapObjectSize` go to a JS-heap `ByteArray`, larger ones to a `std::vector`. Non-shared arrays sort in place ([runtime-typedarray.cc](https://github.com/v8/v8/blob/main/src/runtime/runtime-typedarray.cc), opened as the raw file through the fetch tool).
- **Determinism** — measured here:
  - two fresh worlds per run (same seed, 3 days + 200 ticks) gave identical FNV hashes over all state in 26 of 26 runs;
  - packed vs field-array lots matched: `27d1980d` (10k), `3f132ec5` (25k), `8c119aea` (100k);
  - each tick and day variant has its own hash, as expected, since they schedule work differently.
- **Ledger:** every money change is a two-sided integer-cent transfer (payroll, purse contributions, spending, food purchases, household bills, interest). `moneyTotal` was exactly 0 at the end of every run — measured here ([world.mjs](../prototypes/integration-cost/world.mjs)).
- **Log table:** the 256-entry Q16 table of log2(1 + m/256) is built by repeated squaring and halving, which are correctly rounded IEEE operations. Entries are within 1.0 Q16 unit of `Math.log2`, which is used only to check. Lookups from 8 mantissa bits err by at most log2(1 + 1/256) = 0.0056 — measured here ([det.mjs](../prototypes/integration-cost/det.mjs)), bound computed.
- **R5 gate definitions** (zero scavenges over 1,000 ticks; heap growth < 64 KB per tick) come from the [plan's CI gates](../../../plan/implementation-plan.md) and [R5 compute §3](../../round-5-performance/notes/compute.md) (opened).

### Inferences
- The goods and wellbeing systems can meet R5's allocation gate as written. The only trap found is a standard-library call on shared memory, which the lint profile does not catch (`sort` is not in R5's banned list).
- Swappable layouts with identical hashes make a good regression test. The lot layout can change later without breaking replays.

### Gaps
- R5's ESLint hot-path profile was not run, because the brief bans npm dependencies. Only runtime GC checks were used.
- The shared-memory sort was tested in Node only, not in Chromium or JavaScriptCore.
- Cross-engine hashes (Bun, Chromium) were not produced. All arithmetic is integer or exact `Float64` integers, so R5's result that integer kernels match across engines should carry over (inference).

## 5. Settlement-ledger extension: numbers added and settlement-day cost

### Takeaway
- **L0 fold (the focused settlement, folded from agents each day):** 149 numbers, 628 B per record (1,256 B double-buffered). It is fused into the day passes: +0.07 / +0.20 / +0.73 ms here in the spoilage pass, and a few adds in the wealth and happiness passes.
- **L2 settlement-day (country scale) costs**, per settlement-day here: 1.7 µs for the full 8 × 4 × 3 cube with keyed stochastic rounding (153 numbers, 644 B), 1.0 µs with a deterministic remainder per cell (249 numbers, 836 B), and 0.45–0.50 µs for an exact expiry-day ring (115 numbers, 492 B).
- **The cheapest variant** (one stock per category, 73 numbers, 308 B) costs 0.26–0.33 µs.
- **Against the country budget in RM JS:** headroom is about 0.74 µs per settlement at 1k settlements and 0.36 µs at 10k. Only the one-stock variant fits at 1k (≈0.49–0.61 µs RM). Nothing fits at 10k in JS; the extension must follow the settlement model into WASM.
- **Per-cell keyed draws are the main cost.** One draw per settlement-day plus one hash round per rounding decision saved 15%. The exact ring with those cheaper draws costs 71–74% less than the stochastic cube.

### Cited Findings
- **L0 record layout** — own code ([world.mjs](../prototypes/integration-cost/world.mjs), [daily.mjs](../prototypes/integration-cost/daily.mjs) `dayEnd`):
  - food stock by 8 categories × 4 quality bands × 3 age bands: 96 `Int32`;
  - waste 8, eaten 8, non-food resources 8;
  - happiness bands 5; wealth band counts 8 plus band cents 8 `Float64`;
  - 8 scalars: happiness mean, mean log income, top-10% share and spares.
- **L2 settlement-day extension**, run alone ([settle-ext.mjs](../prototypes/integration-cost/settle-ext.mjs), [settle-ext.json](../prototypes/integration-cost/results/settle-ext.json)) — measured here, RM-eq computed:

  | Variant | Numbers / settlement | Bytes / settlement | µs per settlement-day, 1k | µs, 10k | RM-eq µs (min × 1.9) |
  |---|---|---|---|---|---|
  | full cube, stochastic rounding | 153 | 644 | 1.860 [1.611–2.197] | 1.724 [1.678–2.030] | 3.1–3.2 |
  | full cube, remainder per cell | 249 | 836 | 1.002 [0.955–1.241] | 0.998 [0.934–1.142] | 1.8 |
  | categories × age bands, stochastic rounding | 89 | 388 | 0.678 [0.662–0.704] | 0.709 [0.678–0.821] | 1.3 |
  | same, one draw a day + one hash round a decision | 89 | 388 | 0.578 [0.562–0.675] | 0.601 [0.583–0.709] | 1.1 |
  | expiry-day ring (8 slots) + 2 long-life stocks | 115 | 492 | 0.484 [0.451–0.548] | 0.497 [0.464–0.571] | 0.86–0.88 |
  | one stock per category, remainder | 73 | 308 | 0.312 [0.258–0.345] | 0.327 [0.322–0.523] | 0.49–0.61 |
  | happiness + wealth + resources only, no goods | 33 (164 B) | — | 0.086 [0.080–0.105] | 0.171 [0.170–0.204] | 0.15–0.32 |

  - Every variant gave identical hashes on two 365-day runs.
  - Each variant includes 8 resources, happiness mean, set point and 5 bands with stochastic band shifts, and 8 wealth bands with households, integer cents, exact interest and pro-rata cents on moves. It also carries an income reference and the top-10% share.
- **Country budget:** 1.5 ms per day at 1k settlements and 12 ms at 10k (RM). Measured JS: 0.76 and 8.4 ms; WASM: 0.44 and 4.7 ms. A settlement may use at most 1 KB including its graph edges; the measured model uses 232–360 B ([plan](../../../plan/implementation-plan.md), opened; [R5 compute §5, §7](../../round-5-performance/notes/compute.md), opened).
- **R5's WASM gain:** the settlement model ran 1.7–2.5× faster in WASM than JS ([R5 compute §1](../../round-5-performance/notes/compute.md), opened).
- **Headroom per settlement-day, RM** (computed):
  - JS: (1.5 − 0.76) / 1,000 = 0.74 µs at 1k; (12 − 8.4) / 10,000 = 0.36 µs at 10k;
  - with the WASM baseline: 1.06 and 0.73 µs.
- **Bytes per settlement with the extension:** R5's 232–360 B plus the variant gives 876–1,004 B (full cube), 1,068–1,196 B (cube with remainders), 724–852 B (ring) and 540–668 B (one stock) — computed against the 1 KB cap.

### Inferences
- **The expiry-day ring is the right settlement representation for perishables.**
  - Its slots have the same identity as agent lots (category, expiry day), so the L0 fold and the M2 spawner map lots to ring slots exactly, with no rounding.
  - Spoilage is "empty today's slot", with no draws.
  - Quality fits as a mean per category, and the UI can derive age bands from the ring on demand.
  - The category × quality × age cube is a view, not state.
- **Country scale needs WASM or fewer updates.** The ring in JS (≈0.87 µs RM) misses even the 1k headroom by about 18%. Options:
  - port it with the settlement model (R5's 1.7–2.5× gives ≈0.35–0.51 µs RM, which fits both tiers with the WASM baseline);
  - update goods weekly for settlements far from the focus;
  - drop to one stock per category for distant settlements.
- **The happiness and wealth side alone** costs 0.15–0.32 µs RM, close to the whole 10k JS headroom. It also uses per-band keyed draws. It should share the per-settlement-day key or use remainders.

### Gaps
- The country baseline (R5's settle + flows) was not re-run here, so the headroom mixes R5's RM figures with calibrated desktop figures.
- The L2 dynamics are placeholders (production and demand per head, band mobility rates). Real hazards fitted from agent runs (R4) will change the per-settlement cost.
- No WASM build of the extension was made.

## 6. From this desktop to the reference machine and to phones

### Takeaway
- **This desktop runs R5's movement and grid kernels 1.84–1.91× faster than the RM under Node 22** (geometric mean of minimum ratios, start and end of the session). The per-kernel spread is 1.30–2.72×.
- **This desktop runs 1.53–1.59× faster than the RM under Chromium 141.** I use ×1.9 for "RM-eq" and ×2.7 as a stress case.
- **R5 gives two phone proxies that disagree by about 4×.**
  - The tick budgets assume a budget Android phone is ×1.5 slower than the RM, and the RM ≈ a mid-range Android ([R5 compute §6](../../round-5-performance/notes/compute.md)).
  - The startup budgets say 4× CPU throttling of the RM equals a "mid-tier mobile" ([R5 load-memory §2](../../round-5-performance/notes/load-memory.md)).
  - From this desktop, that is ≈2.9× (budget Android) or ≈7.6× (Lighthouse mid-tier) slower. None of these are phone timings.
- **Under either reading the recommended design holds on phones.** Lazy needs plus sliced day work cost ≤ 0.6 ms per tick even at ×7.6 for 10k–25k agents.

### Cited Findings
- **Calibration** ([calibrate.mjs](../prototypes/integration-cost/calibrate.mjs)): I transcribed R5's integer movement and float grid-rebuild kernels with the same agent setup and the same `measure()` method. R5's medians are read from its JSON as data — measured here; R5 figures opened from [kernels-node-lowload.json](../../round-5-performance/prototypes/compute/results/kernels-node-lowload.json) and [kernels-chromium.json](../../round-5-performance/prototypes/compute/results/kernels-chromium.json).
  - Start of session: factor 1.81 (median) and 1.84 (minimum) vs RM Node 22.22.0 (V8 12.4); 1.53 vs RM Chromium 141 (minimum).
  - End of session: 2.10 / 1.91 / 1.59.
  - Per kernel (minimum): movement 1.76 / 2.72 / 2.64 and grid 1.57 / 1.51 / 1.30 at 10k / 25k / 100k.
- **R5 tick multipliers:** "For budgets, treat the RM as roughly a mid-range Android phone. Budget phones are ≈1.3× slower than the RM; budgets use ×1.5 to add a thermal margin". Capable phones are credited ×0.6. These rest on snippet-only Speedometer scores ([R5 compute §6](../../round-5-performance/notes/compute.md), opened). The plan repeats them: "×1.5 for budget Android, ×0.6 for capable phones and ×0.75 for desktops" ([plan](../../../plan/implementation-plan.md), opened).
- **R5 Lighthouse calibration:** the RM's BenchmarkIndex was 1,510–1,635 at 1×, "high-end desktop". CDP 4× gave 360–388, "mid-tier mobile". "So 4× on this VM is a mid-tier phone and 6× is a lower mid-tier phone" ([R5 load-memory §2](../../round-5-performance/notes/load-memory.md), opened).
- **R4:** "Assume 2–4× slower per core (background, unverified)" ([R4 architecture-lod §5](../../round-4-multi-scale/notes/architecture-lod.md), opened).
- **Desktop → device chains** (computed, not measured):
  - budget Android ≈ 1.9 × 1.5 ≈ 2.9× this desktop;
  - capable phone ≈ 1.9 × 0.6 ≈ 1.1×;
  - Lighthouse mid-tier ≈ 1.9 × 4 ≈ 7.6×.
- **Device estimates** (computed, not measured):
  - 10k on a budget Android: lazy needs ≈ 0.0035 ms per tick; worst slice ≈ 0.20 ms; one-pass day ≈ 1.8 ms.
  - With the Lighthouse ×7.6: one pass ≈ 4.8 ms, worst slice ≈ 0.52 ms.
  - 25k on a capable phone (×1.1): worst slice ≈ 0.08 ms.

### Inferences
- The "3–4× slower on a mid-tier phone" figure matches R5's Lighthouse reading relative to the RM (4×), not the Speedometer reading the tick budgets use (×1.0–1.5). The two R5 notes should be reconciled with one on-device run of the same harness.
- The recommendations do not depend on which reading is right. One-pass day work fails the 25k and 100k slack even on the RM, and slices stay under 1 ms per tick under the pessimistic reading.

### Gaps
- No phone, no Chromium, no JavaScriptCore. The calibration uses two kernels, and Node 24's newer V8 (13.6 vs 12.4) is part of the speed-up.
- The desktop was not dedicated (0.09–5.27 of 12 CPUs busy), with no load average available. Gating on minima mitigates this.

## Recommendation for the plan

**Data layout** (all in the one reserved `WebAssembly.Memory`, SoA):
- **Per agent** (≈48–60 B):
  - needs as one `Int32` zero tick per need (lazy), plus an `Int32` wheel link;
  - `Uint8` Q7 metabolism; `Int32` household id;
  - happiness `Int32` Q16 and set point `Int16` Q8;
  - daily meal accumulators 4 B; flags 1 B;
  - cash, wage and today's income as integer-cent `Float64`.
- **Per household** (≈98 B):
  - up to 8 food lots packed in one `Uint32` each (expiry day 16 bits | category 4 | quality band 3 | quantity 9), sorted by (expiry, category, quality), equal keys merged; FEFO takes slot 0;
  - lot count, portions and members;
  - purse, deposits and assets as integer-cent `Float64`; net worth and food value; a `Uint8` wealth band.
- **Agent order:** keep household members adjacent in agent index.
- **Per settlement (L2, ≈492 B):**
  - perishables as per-category 8-slot expiry-day rings, with long-life goods as single stocks and a mean quality per category;
  - happiness mean, set point and 5 bands; 8 wealth bands (households and cents);
  - 8 resources; the income reference; the top-10% share.
  - The L0 record folds into the same shape exactly.

**Per tick versus day boundary:**
- **Per tick:**
  - meals from the timing wheel, each a FEFO decrement of the household's slot-0 lot;
  - a capped shopping queue;
  - a per-meal happiness bump;
  - no all-agent needs decay and no per-tick mood pass at 100k.
- **At the day boundary,** as fixed 1,024-entity slices, one per tick from the boundary (14 / 35 / 138 ticks at 10k / 25k / 100k), agents first and then households:
  - payroll and spending transfers, then happiness (drivers, decay toward the set point, band fold);
  - spoilage with the stock fold, then household wealth (bills, interest, depreciation, net worth, log2 band, histogram);
  - the settlement record committed once, when the last slice ends.

**Budget headroom** (RM-eq = desktop minimum × 1.9; stress × 2.7):

| Item | 10k | 25k | 100k | Budget it draws on |
|---|---|---|---|---|
| Lazy needs + meals + shopping, per tick | 0.0023 ms (0.2%) | 0.0061 ms (0.2%) | 0.024 ms (1.7%; 2.4% at ×2.7) | "Other agent systems" 1.2 / 3.0 / 1.4 ms |
| Worst day slice, per tick (first ticks of each day) | 0.13 ms (11%) | 0.13 ms (4.4%) | 0.27 ms (19%; 27% at ×2.7) | Same sub-budget, or slack 1.25 / 2.95 / 3.0 ms |
| One-pass day boundary, if not sliced | 1.19 ms (95% of slack) | 3.04 ms (103%) | 12.5 ms (416%) | Slack — fails at 25k and 100k |
| Memory (arena, wheel variant) | 1.07 MB (101 B/agent plus fixed tables) | 2.63 MB | 10.45 MB | 256 B/agent; 64 / 72 / 160 MB |
| Settlement extension (ring), JS | — | — | — | 0.86 µs vs 0.74 (1k) and 0.36 (10k) µs headroom: needs WASM |

**Draft plan tasks:**
- [ ] Store each need as the `Int32` tick at which it reaches zero and schedule meals on the decision timing wheel. Never decay every agent's needs every tick: that costs ≈1.8 ms RM at 100k against a 1.4 ms sub-budget (R6).
- [ ] Keep up to 8 food lots per household, packed as one `Uint32` (expiry 16 | category 4 | quality 3 | quantity 9), sorted by (expiry, category, quality) with equal keys merged, so FEFO eating takes slot 0 (R6).
- [ ] Run day work (payroll, happiness, spoilage with its stock fold, household wealth) as fixed 1,024-entity slices, one per tick after the boundary: agents first, then households. Commit the settlement record when the last slice ends, on the same schedule on every device and worker count (R6).
- [ ] Add a day-slice row to the CI budget gate: worst slice ≤ 0.35 ms RM at every tier, plus the existing zero-scavenge gate over a window that includes a full day of slices (R6).
- [ ] Warm the day-boundary code at worker start on a 1,024-agent dummy world (≈20–30 ms), so the first in-game day does not run cold (13–27 ms at 100k) (R6).
- [ ] Keep happiness as `Int32` Q16, updated daily from its drivers with decay toward an `Int16` set point. Take log income from a 256-entry Q16 log2 table built at build time with exact arithmetic. Bump happiness per meal, but run no per-tick mood pass (R6).
- [ ] Keep wealth as integer-cent `Float64` cash per agent and purse, deposits and assets per household, with every change a two-sided transfer. Derive wealth bands from the same log2 table and the top-decile share from a 16-bins-per-octave histogram (R6).
- [ ] Ban `TypedArray.prototype.sort` on views of shared memory in hot and day-boundary code (it copies to the JS heap below the regular-object limit), and add it to the lint profile (R6).
- [ ] Spawn agents household by household, so members stay adjacent in agent index. Scattered membership cost +15% day work and 2.3× per meal at 100k (R6).
- [ ] Represent settlement goods as per-category 8-slot expiry-day rings plus single stocks for long-life goods, with a mean quality per category, so agent lots fold and spawn exactly. Derive age and quality views on demand; budget ≤ 512 B per settlement (R6).
- [ ] Budget the settlement goods-and-wellbeing extension at ≤ 0.7 µs RM per settlement-day at 1k settlements. Port it to WASM with the settlement model before the 10k-settlement tier, or update distant settlements' goods weekly (R6).
- [ ] Use one keyed draw per settlement-day, plus one hash round per rounding decision, for aggregate band shifts; or use deterministic remainders. Never use a full keyed draw per cell (R6).
- [ ] Make per-tick need rates fractional (Q8) once the ticks-per-day figure is fixed. At 14,400 ticks a day, integer rates cut meals by 17% (R6).
- [ ] Add a determinism test that swaps the lot layout (packed vs field arrays) and requires identical state hashes (R6).
