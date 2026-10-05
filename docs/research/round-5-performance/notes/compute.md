# Compute budget for the browser civ-sim core: JS vs WASM/SIMD, workers, GC, algorithms, country scale, phone scaling

All "measured here" numbers come from one machine. The **reference machine (RM)** is a cloud VM with 4 vCPU Intel Xeon (Cascade Lake, model 85, "@ 2.80GHz", AVX-512), 15 GiB RAM and Linux 6.18. Engines measured: **Chromium 141.0.7390.37** (Playwright 1.56.1 headless shell, V8 14.1, page served with COOP/COEP headers, code running in a dedicated module worker), **Node 22.22.0** (V8 12.4.254.21) and **Bun 1.3.14** (JavaScriptCore, WebKit 5488984d). WASM was built from Rust 1.97.0 for `wasm32-unknown-unknown` (no_std, raw `extern "C"` exports, LTO, `-C target-feature=+simd128` for the SIMD build). Firefox/SpiderMonkey was not available.

Method: each benchmark gets ≥250 ms of warm-up, then 9 samples of ≥25 ms each (looping the kernel). I report **median [min–max] per call**. Workload: uniform density of 4 agents per 8×8 cell and a neighbour radius of 8, which gives **36 candidates and 12.3 true neighbours per agent**. A "clustered" variant puts half the agents in 20 towns (224 candidates per agent at 100k).

**Contention caveat:** another agent was running AVIF encoding and headless Chromium on the same 4 cores. I recorded `/proc/loadavg` (1-minute value, which includes the benchmark's own ~1.0) for every timing. Single-thread kernel runs happened at load 1.4–2.0 and are close to uncontended (run-to-run min-of-samples drift was 1% at p50). Multi-worker runs are the most sensitive and are marked as lower bounds where load exceeded 1.5.

Scripts and raw JSON: `../prototypes/compute` (`js/`, `rust-kernels/`, `browser/`, `results/`).

## 1. JS vs WebAssembly (scalar and 128-bit SIMD) for the real hot loops; copy vs shared memory; code size; bit-identity

### Takeaway
The exact uniform-grid neighbour query is the one hot loop where WASM clearly pays off:
- **WASM SIMD runs it 2.7–3.5× faster than the best JS for floats and 2.8–4.4× faster for integers**, in every engine (≈100 ns/agent vs 290–350 ns/agent at 36 candidates).
- Movement gains 4–7× with SIMD, but costs <1 ms at 100k either way. Utility scoring gains only 1.2–2× over *well-written* JS, and settlement updates and sparse flows gain 1.5–2.5×.
- WASM speed is nearly identical across V8 and JSC, while the same JS varies up to 2.4× between engines.
- Keep state **in WASM linear memory with JS typed-array views over it**. JS kernels run equally fast on those views, while copying in and out (12.5–44 GB/s) erases the gain for light kernels.
- Determinism: **integer kernels are bit-identical across JS, WASM scalar, WASM SIMD and all three engines**. Float kernels match only when the arithmetic (f64 vs f32) and the reduction order are the same.

### Cited Findings
**Per-agent cost at 100k agents (ns per agent per tick, median), Chromium 141 / Node 22 / Bun (JSC):**
- Movement (x+=v·dt with wall reflection): JS 6.4 / 10.5 / 6.9; WASM scalar 4.4 / 4.3 / 6.3; WASM explicit SIMD 1.3 / 1.6 / 1.7; LLVM auto-vectorised 1.4 / 1.3 / 1.6 — [measured here: suite-kernels.mjs + lib.rs](../prototypes/compute/js/suite-kernels.mjs).
- Uniform-grid rebuild (counting sort plus sorted position copies): JS 24.8 / 25.3 / 16.0; WASM 15.6 / 16.9 / 15.3; integer-position WASM 12.8 / 13.4 / 13.0 — [measured here](../prototypes/compute/js/suite-kernels.mjs).
- Exact neighbour query, f32 positions (36 candidates/agent): JS 289 / 353 / 321; WASM scalar 263 / 292 / 324; WASM explicit f32x4 SIMD **108 / 101 / 98**. That is ≈8.0 ns per candidate in JS vs ≈3.0 ns in WASM SIMD. In absolute terms at 100k: JS 28.9 ms [28.2–38.6] (Chromium), 35.3 ms [34.7–45.0] (Node) and 32.1 ms (Bun), vs WASM SIMD 10.7 ms [9.8–14.3], 10.1 ms [9.6–11.7] and 9.8 ms — [measured here](../prototypes/compute/results/kernels-chromium.json).
- Exact neighbour query, Q8 fixed-point Int32 positions: JS 297 / 342 / 235; WASM scalar 144 / 140 / 138; WASM i32x4 SIMD **88 / 81 / 83**; LLVM auto-vectorised 86 / 82 / 91 — [measured here](../prototypes/compute/results/kernels-node-lowload.json).
- LLVM auto-vectorised the integer neighbour query (≈ explicit SIMD speed) but **not** the float one (28.0 ms vs 29.2 ms scalar at 100k, Node). Without fast-math, the float sums cannot be reordered — [measured here](../prototypes/compute/results/kernels-node-lowload.json).
- Clustered towns at 100k (224 candidates/agent): JS 121 / 156 / 124 ms vs WASM SIMD 26.4 / 22.6 / 28.1 ms. Cost tracks candidate count, not N — [measured here](../prototypes/compute/results/kernels-chromium.json).
- Utility scoring (6 actions × 3 LUT considerations, integer Q16, keyed hash jitter, argmax):
  - Naive JS: 119 / 177 / 73 ns/agent.
  - Hand-hoisted and unrolled JS: **44 / 63 / 46**.
  - WASM: 32.5 / 31.2 / 38.1.
  - Gains: hoisting = 2.7× in V8 and 1.6× in JSC; WASM over hoisted JS = 1.36× / 2.0× / 1.2×. SIMD128 gave nothing, because it has no gather and the curve tables are LUTs.
  - [measured here](../prototypes/compute/js/kernels.mjs).
- Aggregate settlement day (32 age×sex cohorts, Q28 stochastic rounding, food/price/integer-cent money): JS **0.59 / 0.65 / 0.89 µs per settlement**; WASM 0.35 / 0.34 / 0.35 µs. Speed-up 1.7× / 1.9× / 2.5× — [measured here](../prototypes/compute/results/kernels-chromium.json).
- Other code-shape effects in JS (100k, Chromium / Node / Bun):
  - Branch-free accumulation gave no gain (+3% / +3% / −6%).
  - Gathering positions through the sorted index instead of sorted copies was +23% / +23% / +21% slower.
  - `Math.fround` everywhere (to mimic f32) costs +81% / +52% in V8 but is −14% (faster) in JSC.
  - [measured here](../prototypes/compute/results/kernels-bun-lowload.json).
- **Shared memory vs copying:**
  - JS kernels on Float32Array views over WASM memory run as fast as on JS-owned buffers (28.6 vs 28.9 ms Chromium; 31.5 vs 32.1 ms Bun).
  - Copying 8 arrays in and out (3.2 MB at 100k) costs 253 µs (≈12.6 GB/s, memory-bound). At ≤0.8 MB it runs at ≈40–44 GB/s (cache-resident).
  - This turns WASM SIMD movement at 100k from 140 µs into 377 µs (JS: 642 µs). On the heavy grid+query pipeline it adds only +2–11% (Chromium 12.4 → 12.6 ms; Bun 12.1 → 13.4 ms).
  - [measured here](../prototypes/compute/results/kernels-chromium.json).
- **Code size and startup:**
  - All 15 kernels: 7,209 B raw / 3,152 B gzip (scalar build); 13,466 B / 5,782 B gzip (SIMD build). binaryen `wasm-opt -O3/-Oz` (v132) saves only ~4% after Rust LTO.
  - Compile + instantiate: scalar 1.1 + 0.4 ms (Chromium), 0.6 + 0.3 ms (Node), 0.9 + 0.5 ms (Bun). SIMD build 1.8 + 0.1 ms (Chromium), 9.3 + 0.2 ms (Node), 3.2 + 0.2 ms (Bun).
  - No wasm-bindgen glue is needed when kernels take pointers into linear memory.
  - [measured here](../prototypes/compute).
- **Bit-identity, movement (f32, 25k agents, 200 ticks, dt = fround(0.1)):**
  - Plain JS (f64 intermediates, f32 storage) differs from WASM f32 in **107 of 50,000 position words**.
  - JS using `Math.fround` on every intermediate, WASM scalar, WASM explicit SIMD and WASM auto-vectorised are all **bit-identical** (lane-wise SIMD does not change the operation order).
  - [measured here](../prototypes/compute/results/kernels-chromium.json).
- **Bit-identity, neighbour query on moved positions:**
  - Plain JS = branch-free JS = Rust "f64-mimic" (f64 intermediates); JS+fround = WASM f32 scalar = WASM auto-vectorised.
  - WASM f32 SIMD (lane partial sums, then horizontal add) differs from scalar in **293 of 25,000 x-sums (1.2%)**, with neighbour counts identical.
  - Caution: on the *initial*, quantised positions every float variant agreed, because the float sums happened to be exact. Determinism tests must use realistic, full-mantissa data.
  - [measured here](../prototypes/compute/js/suite-kernels.mjs).
- **Bit-identity, integer kernels and across engines:**
  - Integer movement, integer neighbour query, utility scoring, and a 365-day run of 1k and 10k settlements with sparse flows: identical hashes for JS, WASM scalar and WASM SIMD.
  - **All determinism hashes (including plain-JS float and WASM f32 SIMD) were identical in Node/V8 12.4, Chromium/V8 14.1 and Bun/JSC.**
  - [measured here](../prototypes/compute/results/kernels-bun-lowload.json).
- **Spec basis:**
  - WebAssembly's only arithmetic nondeterminism is NaN bit patterns (plus the NaN sign bit), and "the relaxed SIMD instructions have nondeterministic results" — [WebAssembly/design Nondeterminism.md (opened)](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md).
  - SIMD float ops follow IEEE semantics and use "the same" NaN rules and roundTiesToEven as scalar ops — [WebAssembly SIMD proposal (opened)](https://github.com/WebAssembly/simd/blob/main/proposals/simd/SIMD.md).
  - Relaxed SIMD deliberately adds FMA "single rounding if hardware supports it, double rounding if not", plus implementation-defined min/max and swizzle — [relaxed-simd Overview (opened)](https://github.com/WebAssembly/relaxed-simd/blob/main/proposals/relaxed-simd/Overview.md).
- **ECMAScript:**
  - `Math.sqrt` returns 𝔽(the exact square root), so it is correctly rounded and deterministic.
  - `Math.sin`, `Math.exp` and similar return "an implementation-approximated Number value" — [ECMA-262 spec.html (opened)](https://github.com/tc39/ecma262/blob/main/spec.html).
- **Support:**
  - WASM SIMD: Chrome 91, Firefox 89, Safari/iOS 16.4.
  - Relaxed SIMD: Chrome 114+ only, Firefox Nightly only.
  - WASM threads/atomics: Chrome 74, Firefox 79, Safari 14.1.
  - [caniuse wasm-simd (opened)](https://github.com/Fyrd/caniuse/blob/main/features-json/wasm-simd.json); [caniuse wasm-relaxed-simd (opened)](https://github.com/Fyrd/caniuse/blob/main/features-json/wasm-relaxed-simd.json); [caniuse wasm-threads (opened)](https://github.com/Fyrd/caniuse/blob/main/features-json/wasm-threads.json). V8 confirms SIMD on by default from Chrome 91 — [v8.dev features/simd (opened, GitHub source)](https://github.com/v8/v8.dev/blob/main/src/features/simd.md).
- "Every call to `grow` will detach any references to the old `buffer`, even for `grow(0)`". For shared memory, the old SharedArrayBuffer is not detached, but its length does not update — [MDN WebAssembly.Memory.grow (opened, GitHub source)](https://github.com/mdn/content/blob/main/files/en-us/webassembly/reference/javascript_interface/memory/grow/index.md).
- **Toolchain status, October 2026:**
  - wasm-bindgen 0.2.129 (crate updated 2026-09-25), repository now `github.com/wasm-bindgen/wasm-bindgen` (moved from the rustwasm organisation); wasm-pack 0.15.0 (2026-05-15), `github.com/wasm-bindgen/wasm-pack` — [crates.io API (opened)](https://crates.io/api/v1/crates/wasm-bindgen).
  - AssemblyScript 0.28.20 (2026-07-22); binaryen 132.0.0 (2026-08-13) — [npm registry (opened)](https://registry.npmjs.org/assemblyscript).
  - `rustup target add wasm32-unknown-unknown` worked here, so the AssemblyScript fallback was not needed — [measured here](../prototypes/compute/build.sh).

### Inferences
- **Priority order for WASM ports:** (1) the exact neighbour/perception query (≈70–80% of a naive tick); (2) the settlement/cohort model and flows (≈2×); (3) utility scoring only if JS cannot be hoisted. Movement and grid rebuild are not worth porting on their own.
- **Expected end-to-end gains.** The JS "every agent, exact query, every tick" pipeline at 100k costs 36.5 ms in Chromium (0.64 + 2.48 + 28.9 + 4.43). The same pipeline in WASM SIMD costs 15.6 ms (0.135 + 1.56 + 10.7 + 3.25), about 2.3×. Algorithmic changes (section 4) give more: 9.3 ms in plain JS.
- **Determinism policy.** Make every system that must replay identically integer or fixed-point (positions Q8/Q16 in Int32, money in integer cents). Integer kernels can then use JS, WASM scalar or WASM SIMD interchangeably, including as a fallback.
- If float kernels are kept: fix one canonical implementation per system (e.g. "WASM f32 SIMD"), never mix it with the plain-JS f64 path within one save or replay, and never use relaxed SIMD or FMA.
- Power-of-two cell sizes (8 units, inverse 0.125) made float→cell mapping exact in both f32 and f64. The grid was identical in JS and WASM.
- **Architecture:** one preallocated WASM `Memory` (sized for the tier, never grown during play) holds all SoA state. JS systems use typed-array views created once after allocation, and WASM systems receive byte offsets. No copies, no wasm-bindgen.

### Gaps
- Firefox/SpiderMonkey and real Safari (only Bun's JSC, a proxy) were not measured.
- No ARM measurements: phone SIMD (NEON-backed) speed-ups may differ from x86 SSE/AVX lowering.
- An AssemblyScript build was not compared, since Rust worked.
- The Rust SIMD kernels are straightforward; the float SIMD neighbour query could perhaps go further with cell-sorted SoA plus early rejection.

## 2. Multi-worker scaling with SharedArrayBuffer + Atomics (grid strips, sync cost, determinism, when it pays)

### Takeaway
Splitting the per-agent phases into fixed 1,024-agent chunks over SAB gives, at 100k agents:
- **Node/Bun:** ~1.8× with 2 workers, ~2.5× with 3 and ~3.0–3.2× with 4. The neighbour-query phase alone reaches 3.5–3.8×.
- **Real Chromium Web Workers:** 2.1–2.3× with 4 (contended; the browser's own threads also compete).

The serial grid rebuild is the Amdahl limit.
- At **10k agents, workers pay little**: typically 1.4–2×, best 2.8×, saving ≤2.5 ms per tick. Each barrier costs 50–130 µs with `Atomics.wait`/`notify`.
- Short spinning cuts the barrier to 1–2 µs, but explodes (130–380 µs) when cores are oversubscribed.
- WASM SIMD kernels also run multi-threaded over one shared `WebAssembly.Memory`, built on stable Rust: 100k ticks drop from 15.9 ms to 7.5–8.7 ms.
- Results were **bit-identical for 1–4 workers and for static or dynamic scheduling**.

### Cited Findings
- **JS, Node 22, low-load re-run** (start load 0.99; the 10k block ran at load ≤1.5, the 25k/100k blocks at 2.0–4.1 because the other agent resumed). Tick = parallel move+utility, serial grid rebuild, parallel neighbour query + per-chunk reduction.
  - 10k: 1 worker 3.95–4.00 ms → 2 workers 2.24–2.37 (1.7×) → 3 workers 2.16–2.42 → 4 workers 1.43–2.06 (1.9–2.8×).
  - 25k: 10.1–11.2 ms → 6.0–7.1 (1.6–1.75×) → 4.0–5.9 → 3.7–5.9 (1.9–2.7×).
  - 100k: 42.5–43.2 ms → 23.3–28.5 (1.5–1.85×) → 17.7–24.1 → 14.3–18.5 (2.3–3.0×). The 4-worker neighbour phase took 9.6–12.7 ms.
  - [measured here: mt-core.mjs](../prototypes/compute/js/mt-core.mjs).
- **JS, Chromium 141, real Web Workers** (nested workers spawned by the sim worker; start load 0.98, rising to 4.4 as the other agent resumed):
  - 10k: 3.50–3.73 ms → 2.03–2.69 (1.4–1.7×) → 1.92–2.53 → 1.54–2.63 (up to 2.3×).
  - 25k: 8.53–8.87 → 5.67–6.63 (1.3–1.5×) → 4.48–5.35 → 3.81–4.57 ms (1.9–2.2×).
  - 100k: 36.9–37.3 → 21.6–24.7 (1.5–1.7×) → 17.7–20.1 (1.8–2.1×) → 16.3–17.5 ms (**2.1–2.3×**; neighbour phase 2.4–2.7×).
  - Barrier: 56–75 µs with futex wait, 0.8–9.4 µs spinning. Results bit-identical across 1–4 workers and both modes.
  - [measured here](../prototypes/compute/results/mt-chromium.json).
- **JS, Node 22, earlier run at steady load ≈2.0–2.3**, 100k, dynamic chunks: 41.8 → 23.2 (1.80×) → 16.5 (2.53×) → 13.4 ms (3.13×). Neighbour-query phase 33.1 → 17.1 → 11.5 → 8.8 ms (3.76×). The serial grid stayed 2.7–2.9 ms — [measured here: log of that run](../prototypes/compute/results/q1-mt-node.log).
- **JS, Bun/JSC (load 1.6–3.2):** 100k 41.0–41.8 → 22.0–24.6 (1.7–1.9×) → 15.6–16.4 (2.6×) → 12.8–15.6 ms (2.6–3.2×; 4-worker neighbour phase 8.8–11.2 ms). 25k reached 2.6–2.7× at 3 workers; 10k topped out at 1.9–2.3×. The earlier "Bun deadlock" was my barrier bug (inactive helpers incremented the done-counter), reproduced in Node and fixed; Bun SAB + Atomics then worked — [measured here](../prototypes/compute/results/mt-bun.json).
- **Barrier cost** per empty parallel phase (coordinator + helpers, in µs):
  - Pure `Atomics.wait`/`notify`: 48 (2 workers), 86 (3), 105 (4) at low load; 62–128 contended.
  - Spin up to 20k iterations, then wait: 0.9 (2), 1.9 (3) at low load. But 131–384 µs with 4 workers on 4 vCPUs (Node) and 17 µs (Bun).
  - A tick with 2 parallel phases therefore pays ≈0.1–0.25 ms of synchronisation with futex waits.
  - [measured here](../prototypes/compute/results/mt-node.json).
- **WASM SIMD, multi-threaded** (one shared `WebAssembly.Memory`, one instance per worker with its own `__stack_pointer`, dynamic chunks):
  - Node (load 1.1–1.95): 25k 3.72 → 2.26–2.36 → 1.64–1.73 → 1.56–1.77 ms (2.4× at 4); 100k 15.9 → 10.5 → 7.5–9.2 → 7.9–8.7 ms (≈2×). The neighbour query goes 10.2 → 3.8–4.1 ms (2.5–2.7×); the serial WASM grid rebuild stays 2.0–2.4 ms.
  - Bun/JSC (load 1.1–1.5): 25k 3.84 → 2.62–2.82 → 2.10–2.31 → 2.44–2.70 ms (best 1.8× at 3); 100k 16.9 → 10.2–10.7 → 8.9–9.9 → **7.9–8.3 ms (2.0–2.1×)**.
  - Hashes identical for 1–4 workers in both engines.
  - Built on **stable Rust** with `+atomics,+bulk-memory,+mutable-globals` and `--shared-memory --import-memory --export=__stack_pointer` (warning: "unstable feature specified for -Ctarget-feature: atomics"). Only one function (`settle_day`) touched the shadow stack.
  - [measured here: mtw-core.mjs](../prototypes/compute/js/mtw-core.mjs).
- **Determinism design that held:**
  - Fixed chunk size (1,024 agents), independent of worker count.
  - Sorted (row-major cell) order, so chunks are horizontal grid strips.
  - Per-agent outputs only, and per-chunk float partial sums reduced by the coordinator in chunk order.
  - Static vs dynamic (`Atomics.add` work claiming) made no difference to results.
  - [measured here](../prototypes/compute/js/mt-core.mjs).
- **Platform requirements:**
  - Shared memory requires a secure, **cross-origin isolated** context (COOP/COEP) — [MDN SharedArrayBuffer (opened)](https://github.com/mdn/content/blob/main/files/en-us/web/javascript/reference/global_objects/sharedarraybuffer/index.md).
  - `Atomics.wait` "is blocking and cannot be used in the main thread" — [MDN Atomics.wait (opened)](https://github.com/mdn/content/blob/main/files/en-us/web/javascript/reference/global_objects/atomics/wait/index.md).
  - On hosts that cannot set headers (e.g. GitHub Pages), coi-serviceworker adds COOP/COEP via a service worker. It reloads the page on first visit, must be a separate same-origin file, and needs HTTPS or localhost — [coi-serviceworker README (opened)](https://github.com/gzuidhof/coi-serviceworker).
  - SAB support: Chrome 68, Firefox 79, Safari 15.2, all requiring COOP+COEP — [caniuse sharedarraybuffer (opened)](https://github.com/Fyrd/caniuse/blob/main/features-json/sharedarraybuffer.json).
  - My COOP/COEP-served headless Chromium page reported `crossOriginIsolated: true`, SAB available and a 5 µs `performance.now()` step — [measured here](../prototypes/compute/results/probe-chromium.json).
  - MDN documents 5 µs isolated / 100 µs non-isolated timer resolution — [MDN performance.now (opened)](https://github.com/mdn/content/blob/main/files/en-us/web/api/performance/now/index.md).
- V8 itself had to rework GC parallelism because "page-level parallelism does not necessarily load balance work on big.LITTLE", and moved to work stealing — [v8.dev Orinoco parallel scavenger (opened)](https://github.com/v8/v8.dev/blob/main/src/blog/orinoco-parallel-scavenger.md).

### Inferences
- **When it pays:** a parallel phase must carry well over ~0.5 ms of work to amortise ~50–130 µs of futex barriers per phase. With exact queries that means roughly ≥20–25k agents per tick (≥5k agents per worker). At 10k agents, staggering and aggregates (section 4) save more than workers.
- **Default worker count:** `min(navigator.hardwareConcurrency − 2, 3)` helpers (main thread + renderer need cores), with dynamic chunk claiming. Phones' big.LITTLE cores make static strips risky; results stay deterministic either way.
- **Spin policy:** spin ≤ ~20–50 µs, then `Atomics.wait`. Never spin when helpers ≥ physical cores − 1.
- **Amdahl:** at 100k the serial grid rebuild (2.5 ms JS / 1.6–2.3 ms WASM) caps speed-up near 3×. Parallelise it next (per-worker histograms + prefix sum), or rebuild incrementally.
- **Combined ceiling observed here:** WASM SIMD + 3–4 workers ≈ 7.5–8.7 ms per 100k-agent exact tick in both Node and Bun, ≈5× faster than single-thread JS in Node (41.8 ms). The browser should land between this and the Chromium JS figures, since the renderer process needs cores too.
- **Fallback:** when `crossOriginIsolated` is false (no headers, service worker blocked), run single-threaded. Integer kernels guarantee the same results, only slower.

### Gaps
- The Chromium (Web Worker) multi-worker run and all 25k/100k JS re-runs were contended (load 2–4). True low-load speed-ups at 25k/100k are probably slightly higher than reported.
- Phone big.LITTLE behaviour, thermal throttling with 3–4 busy workers, and Safari's worker scheduling were not measured.
- A parallel grid rebuild was not implemented.

## 3. Garbage collection: pause times with allocating vs allocation-free hot loops (V8, JSC); patterns; lint/test

### Takeaway
The allocation-free typed-array kernel produced **zero GCs in 200 ticks** in Node/V8 (7 negligible ≤0.45 ms scavenges in Chromium) at 25k agents. Writing the same neighbour query with per-agent temp arrays, objects or closures allocates 5–77 MB per tick. That causes hundreds of scavenges, 4–37 ms worst pauses, and 1.3–4.9× slower median ticks in V8 and JSC alike.
- In Chrome, scavenging short-lived garbage is cheap (≤0.25–1.9 ms per pause). The long pauses (4–21 ms) come from mark-compacting objects that survive or are retained.
- Retaining per-tick objects (history logs) triggers 17–21 ms mark-compact pauses even when the hot loop is clean.
- Enlarging the young generation trades frequency for longer pauses (32–37 ms).
- An ESLint `no-restricted-syntax` profile caught every allocating construct, plus one subtle `subarray()` allocation, in my own code.

### Cited Findings
Neighbour query at 25k agents, five styles (identical results), 200 measured ticks after 20 warm-up ticks. Times are ms per tick: median / p99 / max.
- **Node 22 (perf_hooks GC events, load 1.4–1.7):**
  - A, typed arrays: 7.36 / 10.5 / 10.6, **0 GCs**.
  - B, temp array per agent: 10.47 / 15.0 / 17.0; 510 scavenges, 81 ms total, max pause 2.3 ms.
  - C, object per neighbour + result object kept until next tick: 21.1 / 38.0 / 40.2; 375 scavenges + 6 mark-compacts, **1,782 ms GC total**, max pause 9.7 ms.
  - D, closures with filter/map/reduce: 28.8 / 40.1 / 42.1; 912 scavenges + 9 mark-compacts, 388 ms GC, max 6.8 ms.
  - E, typed + retained 10-tick history: 7.7 / 11.2 / 16.8; 3 mark-compacts, max pause **17.0 ms**.
  - [measured here: gc-suite.mjs](../prototypes/compute/js/gc-suite.mjs).
- **Allocation volume per tick** (Node, measured with a 128 MB semi-space and `--expose-gc` so one tick never collects): A 0.02 MB (≈1 B/agent), B 5.25 MB (210 B/agent), C 29.1 MB (1,163 B/agent), D 77.5 MB (3,099 B/agent).
  - With that 128 MB young generation, collections become rare but long: C 44 scavenges with max pause **32 ms**, D 116 scavenges with max **37 ms**.
  - [measured here](../prototypes/compute/results/gc-node-bigsemi.json).
- **Chromium 141 worker (`--js-flags=--trace-gc`; second run attributes GC events to each style's measured window; load 1.45–1.98):**
  - **A, typed:** median 7.04 / max 15.6 ms; 7 scavenges, max 0.45 ms (source unclear; Node showed 0).
  - **B, temp arrays:** 8.96 / 17.4 ms; 249 scavenges, 33 ms total, **max 0.25 ms**, no mark-compact.
  - **C, objects:** 11.1 / 22.2 ms; 364 scavenges (max 1.0 ms) + 13 mark-compacts (38.7 ms total, **max 4.3 ms**).
  - **D, closures:** 22.7 / 52.5 ms; 974 scavenges (128 ms total, max 1.9 ms) + 13 mark-compacts (**max 11.8 ms**).
  - **E, retained history:** 7.44 / 31.1 ms; **0 scavenges** (the history objects were evidently pretenured) but 2 mark-compacts totalling 31 ms, **max 21.2 ms**.
  - A first run without windows logged 1,535 scavenges (mostly 0.2–0.5 ms) and 28 mark-compacts of 2.6–6.4 ms over the whole suite.
  - [measured here](../prototypes/compute/results/gc-chromium-tracegc.json).
- **Bun/JSC** (tick-time tails only; JSC exposes no GC events to JS; load 1.4–2.8):
  - Medians A 7.97, B 11.4, C 14.9, D 38.7, E 8.1 ms; maxima 11.6 / 25.7 / 23.6 / 67.4 / 23.9 ms.
  - With `--smol` (Bun's low-memory GC mode): D 46.6 ms median, 81 ms max.
  - [measured here](../prototypes/compute/results/gc-bun.json).
- **BigInt as an allocation hazard:** applying 1M precomputed integer-cent transfers between 10k accounts took:
  - Float64Array: 3.7 ms (Chromium), 6.1 ms (Node), 2.5 ms (Bun).
  - BigInt64Array: 3.9 ms (Chromium), 6.5 ms (Node), but **286 ms in Bun/JSC (≈115× slower)**.
  - WASM i64: 1.9–2.5 ms everywhere.
  - [measured here](../prototypes/compute/results/kernels-bun-lowload.json).
- **V8 design context:**
  - V8 has a generational heap with a semi-space Scavenger for the young generation and Mark-Compact for the whole heap. Objects surviving two scavenges are promoted to the old generation — [v8.dev "Trash talk" (opened)](https://github.com/v8/v8.dev/blob/main/src/blog/trash-talk.md).
  - The parallel scavenger "reduces the main thread young generation garbage collection total time by about 20%–50%" — [v8.dev Orinoco parallel scavenger (opened)](https://github.com/v8/v8.dev/blob/main/src/blog/orinoco-parallel-scavenger.md).
  - With pointer compression (used in Chrome), double fields are no longer unboxed in objects. V8 suggests "storing data in Float64 TypedArrays, or even by using Wasm" for number-crunching — [v8.dev pointer compression (opened)](https://github.com/v8/v8.dev/blob/main/src/blog/pointer-compression.md).
- **Lint profile:** ESLint 10.1.0 flat config with `no-restricted-syntax` selectors scoped to hot-path files. It bans, inside functions:
  - array/object literals, closures, `new`, spread/template literals, `for…of`/`for…in`;
  - allocating or callback array methods (`map|filter|reduce|forEach|slice|subarray|concat|push|…`);
  - `BigInt`; `Math.random`, transcendental `Math.*` and `Date`/`performance.now`.
  - Result: **24 errors** across styles B–E and in `ledgerBig`, while style A passed. It also flagged `cs.subarray()` in my grid builder (allocates a view object per call).
  - [measured here: eslint.config.mjs](../prototypes/compute/lint/eslint.config.mjs).

### Inferences
- **Patterns to enforce in hot systems (sim core):**
  - SoA typed arrays only, allocated at world creation and sized for the tier max.
  - Preallocated scratch typed arrays passed in (no per-call `new`, `slice`, `subarray`, `Array.from`).
  - Indexed `for` loops, no callbacks or iterators; results written into output typed arrays, never returned objects.
  - Integer-valued `Float64Array` cents, not BigInt.
  - Bounded ring buffers of typed records for events/history, never per-tick JS objects.
  - Strings only at UI boundaries.
- **What to keep off the main sim worker:** a retained history of objects alone caused 17 ms mark-compact pauses in V8. Logs and analytics should be typed-array ring buffers flushed occasionally, or live off the sim worker.
- **Runtime test (CI):** in Node, warm 50 ticks, then observe `perf_hooks` `'gc'` entries over 1,000 ticks of each system and require **0 scavenges**. This is achievable: style A showed 0 in 200 ticks.
- **Second runtime check:** with `--expose-gc --max-semi-space-size=128`, `used_heap_size` growth per tick must stay < 64 KB. Style A measured ≈20 KB per 25k-agent tick, including measurement overhead; violators measured 5–77 MB. Pair both with the lint profile in pre-commit.

### Gaps
- Safari's JSC heap configuration on iOS may differ from Bun's. No JSC GC pause events were available, only tick-time tails.
- Android Chrome's V8 young-generation sizing on low-memory devices was not measured or sourced.
- Chromium GC attribution uses the worker's `performance.now()` windows as a proxy for the isolate's trace timestamps (both start at about worker creation). The 7 small scavenges during style A in Chromium were not traced to their source (harness or runtime).

## 4. Algorithmic savings worth more than micro-optimisation

### Takeaway
Algorithmic changes beat WASM and threads:
- **Per-cell aggregates instead of exact radius queries: 5–9× cheaper for uniform density and 21–35× for clustered towns**, at a cost independent of clustering.
- Staggered decisions scale exactly linearly (1/8 → 12%).
- A timing wheel for event-driven thinking cuts scheduling to ≈15–25 ns per thinking agent, and total decision cost to ≈6–8% of "everyone every tick".
- Dense awake-lists make sleeping agents nearly free; a per-agent flag check still costs ~50% of a full pass.

### Cited Findings
At 100k agents, ms per tick, median: Node / Bun / Chromium.
- **Perception:**
  - Exact neighbour query (uniform): 30.2 / 31.8 / 28.7. Per-cell aggregates (build per-cell count and sums, then read 9 cells per agent): **5.69 / 3.66 / 5.61** (5.3× / 8.7× / 5.1×).
  - Clustered towns: exact 127 / 130 / 118 vs aggregates 5.59 / 3.68 / 5.59 (**23× / 35× / 21×**).
  - [measured here: algo-suite.mjs](../prototypes/compute/js/algo-suite.mjs).
- **Staggered utility decisions** (hoisted JS): every agent 4.91 / 4.97 / 5.27; 1/4 per tick 1.26 / 1.23 / 1.42; 1/8 0.74 / 0.61 / 0.57; 1/16 0.32 / 0.32 / 0.28 — [measured here](../prototypes/compute/results/algo-chromium.json).
- **Event-driven thinking** (each agent re-schedules itself 8–71 ticks ahead, about 2,536 thinkers per tick):
  - Scheduling overhead alone: scanning `nextThink[i] === tick` costs 0.34 / 0.13 / 0.43; a 128-slot timing wheel with intrusive Int32 lists costs **0.039 / 0.052 / 0.064**.
  - With real utility work: scan 0.59 / 0.50 / 0.69 vs wheel **0.34 / 0.32 / 0.40**, vs 4.9–5.3 ms for everyone every tick.
  - [measured here](../prototypes/compute/results/algo-node.json).
- **Sleeping agents** (10% awake): moving all 0.84 / 0.71 / 0.71; flag check `if (!awake[i]) continue` 0.42 / 0.29 / 0.39; dense awake index list **0.084 / 0.074 / 0.089** — [measured here](../prototypes/compute/results/algo-bun.json).
- The same ratios held at 25k agents: aggregates 1.38–1.42 ms vs exact 6.8–7.2 ms in V8 (JSC 0.91 vs 8.0 ms); wheel 0.066–0.082 ms vs scan 0.11–0.17 ms with utility — [measured here](../prototypes/compute/results/algo-node.json).
- For comparison, data-layout micro-optimisation (sorted position copies vs index gather) was worth 17–23%, and branch-free code 0%. JS hoisting of utility tables was worth 1.6–2.8× (section 1) — [measured here](../prototypes/compute/results/kernels-chromium.json).

### Inferences
- **Recommended perception model:**
  - Per-cell aggregates every tick for crowding, attraction and markets.
  - Exact radius queries only for agents that need them (combat, collision, conversation partners), staggered (≥1/4 per tick) and capped (e.g. stop after 16 neighbours).
  - The clustered case shows exact cost rising 4–6× in towns, exactly where cities form.
- **Optimised-JS 100k tick in Chromium:** movement 0.64 + grid 2.48 + aggregates 5.61 + event-driven decisions 0.40 ≈ **9.1 ms**, versus 36.5 ms naive. Consistent with the project's earlier "agent-tick 50–90 ns" (≈91 ns here).
- Sleeping/LOD agents should live in dense index lists maintained by swap-remove, never filtered by flags in every system.
- Everything above stays deterministic:
  - stagger phase = tick mod K;
  - wheel slots processed in insertion order;
  - aggregates computed in cell order.

### Gaps
- Verlet/skin neighbour lists (reuse a radius+skin list for K ticks) were not measured.
- Approximation error of cell aggregates vs exact radius was not quantified; they model a different, coarser perception.
- Pathfinding (likely the next big cost) was out of scope.

## 5. Country scale: 1,000 and 10,000 aggregate settlements with trade and migration; sparse vs dense; WebGPU

### Takeaway
A full country day (cohort model + sparse 8-neighbour trade/migration) costs **≈0.76–1.04 µs per settlement in JS and ≈0.44–0.47 µs in WASM**. That is 0.76–1.04 ms (JS) / 0.44 ms (WASM) for 1k settlements, and 8.4–10.4 ms (JS) / 4.6–4.7 ms (WASM) for 10k on the RM.
- Dense all-pairs flows at 10k cost 160–320× the sparse flows in JS (376–564 ms vs 1.8–2.4 ms per day) and ≈50× in WASM SIMD (58–63 ms vs 1.15 ms). They would also need 400 MB as an f32 matrix. **Use sparse CSR graphs.**
- **WebGPU is not worth it for this model.** CPU cost is a few ms per day, availability is partial, the readback round-trip is asynchronous, and WGSL allows float reassociation and fusion. Only integer kernels are reproducible (verified bit-identical here on the SwiftShader fallback).

### Cited Findings
**Per day, ms (Chromium / Node / Bun; WASM ≈ same in all).** Sparse flows are two-phase: read-only per-edge proposals, then application in fixed edge order. Same-state runs of 60–200 days were used.
- 1k settlements: settle 0.57 / 0.66 / 0.88 + flows (k=8 lattice, 3,811 undirected edges) 0.19 / 0.20 / 0.15. WASM 0.35 + 0.09.
- 10k settlements: settle 6.08 / 6.49 / 8.66 + flows (k=8, 39,402 edges) 2.30 / 2.37 / 1.78. WASM 3.42–3.56 + 1.15–1.16.
- k=24 (117,018 edges at 10k): flows 6.06 / 6.78 / 5.09; WASM 3.28–3.54. That is ≈20–60 ns per edge in JS and ≈30 ns in WASM (data-dependent branches dominate).
- [measured here: suite-kernels.mjs](../prototypes/compute/results/kernels-chromium.json).
- **Dense gravity flows computed on the fly (O(S²)):**
  - 1k: JS 4.5 / 5.7 / 3.2 ms; WASM f32 scalar 2.3–2.6 ms; WASM SIMD 0.58–0.62 ms; precomputed 1k×1k f32 matrix (4 MB) mat-vec 2.2–3.3 ms.
  - 10k: JS **445 / 564 / 376 ms**; WASM scalar 230–264 ms; WASM SIMD **58–63 ms**. A stored 10k matrix would be 400 MB.
  - [measured here](../prototypes/compute/results/kernels-node-lowload.json).
- **365-day determinism and conservation:**
  - JS (integer-valued Float64 cents, exact products < 2^53) and WASM (i64) produced identical population/food/price/money hashes for 1k and 10k settlements, in all three engines.
  - Total money was exactly conserved (zero-sum) in both. Population went 20.71M → 20.87M (1k) and 209.1M → 210.7M (10k).
  - Wall time for the year: JS 0.30–0.50 s vs WASM 0.15–0.16 s (1k); JS 3.2–3.3 s vs WASM 1.6–1.7 s (10k), including JIT warm-up.
  - [measured here](../prototypes/compute/results/kernels-bun-lowload.json).
- **WGSL spec on floats:** add, subtract and multiply are correctly rounded, but `x / y` is 2.5 ULP, `sqrt` is "inherited from 1.0 / inverseSqrt(x)" (2 ULP), "an implementation may reassociate operations", and "may fuse operations". Concrete integer expressions that overflow produce results "modulo 2^bitwidth" — [WGSL spec source index.bs (opened)](https://github.com/gpuweb/gpuweb/blob/main/wgsl/index.bs).
- **WebGPU availability:**
  - Chrome 113 (ChromeOS/macOS/Windows), Chrome 144 adds Linux on Intel Gen12+ GPUs only; Chrome Android 121; Safari 26; Firefox 141 (not in service workers) — [MDN browser-compat-data api/GPU.json (opened)](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json).
  - caniuse marks Firefox and desktop Safari as partial ("only enabled by default on Windows", "macOS 26 Tahoe or later") — [caniuse webgpu (opened)](https://github.com/Fyrd/caniuse/blob/main/features-json/webgpu.json).
- **WebGPU probe here:**
  - Headless Chromium 141 without a GPU exposed `navigator.gpu` but returned **no adapter**.
  - With SwiftShader (`isFallbackAdapter: true`), a WGSL u32 hash kernel over 1M elements matched the JS reference **bit for bit**.
  - Dispatch + copy + `mapAsync` readback took 42 ms median [37–78] on that CPU emulation. This is not representative of real GPUs, only of the asynchronous readback path.
  - [measured here](../prototypes/compute/results/probe-chromium-webgpu.json).

### Inferences
- **Country model plan:**
  - CSR adjacency with k ≈ 8–24 per settlement (roads, rivers, sea lanes) and two-phase flows: proposals in parallel, application in fixed edge order.
  - Integer-valued cents in Float64Array (exact to 2^53 ≈ $90 trillion) or i64 in WASM; no BigInt (JSC penalty).
  - Settlements updated round-robin across ticks (e.g. 10k settlements over 10 ticks ≈ 0.8–1.0 ms of JS per tick).
- **Long-distance interactions:** if a gravity model is needed, aggregate into regions (e.g. 100 regions → a 10k-entry dense matrix) instead of a settlement-level N×N.
- **WebGPU** should be reserved for optional, non-authoritative work (visual effects, heatmaps). If ever used for sim state, kernels must be integer-only and results read back asynchronously, at least a frame later. The CPU budget (≤5 ms/day in WASM at 10k) does not justify it.

### Gaps
- No real-GPU WebGPU timing (no GPU in the container). Typical dispatch→readback latency on phones/desktops is unmeasured here.
- The settlement model is a representative stand-in (32 cohorts, 1 food good). A richer model (e.g. 16 goods, classes) will scale roughly linearly in goods × cohorts.

## 6. Phones: published JS benchmark ratios to scale desktop measurements

### Takeaway
On Speedometer 3.x, published phone and desktop scores relative to this machine's measured **9.5 (Speedometer 3.1, headless Chromium 141)** are:
- budget Android ≈0.77×;
- mid-range Android (Pixel 8a) ≈1.7×;
- flagship Android / recent iPhone ≈3–3.8×;
- Apple-silicon Macs ≈4.5–5.5×.

All device scores are **snippet-only**, and this VM's score is depressed by software rendering. For **budgets, treat the RM as roughly a mid-range Android phone**:
- Budget phones are ≈1.3× slower than the RM; budgets use ×1.5 to add a thermal margin.
- Capable phones and modern desktops are probably ≥2× faster, but budgets credit only ≈1.7× (×0.6) for capable phones and ≈1.33× (×0.75) for desktops, so older laptops are covered.

### Cited Findings
- **This machine:** Speedometer 3.1 (WebKit/Speedometer `release/3.1` branch, 10 iterations) in headless Chromium 141 scored **9.43 ± 0.51, 9.54 ± 0.53, 9.52 ± 0.46** (3 runs, median 9.52; load 1.5–2.3). That is headless, no GPU, software raster — [measured here: run-speedometer.mjs](../prototypes/compute/browser/run-speedometer.mjs); suite source [WebKit/Speedometer release/3.1 (opened, cloned)](https://github.com/WebKit/Speedometer/tree/release/3.1).
- Budget Android SoCs on Speedometer 3: Snapdragon 4 Gen 2 **7.29**, Snapdragon 6s Gen 4 **7.43** — [Beebom SD 4 Gen 2 (snippet only)](https://gadgets.beebom.com/guides/snapdragon-4-gen-2-benchmark-specs); [Beebom SD 6s Gen 4 (snippet only)](https://gadgets.beebom.com/guides/snapdragon-6s-gen-4-benchmark-specs).
- Pixel 8a on Speedometer 3.1 (Chrome): **16.2**; iPhone 16 on Speedometer 3.1 (Safari): **36.3** — [je1sgh blog "スマホのSpeedoMeter3.1 スコア" (snippet only; page blocked)](https://je1sgh.mydns.jp/je1sghblog/?p=29400).
- iPhone 16 Pro Speedometer 3: **28.1** vs a Snapdragon 8 Elite phone **33.2** (late 2024) — [Tom's Guide (snippet only)](https://www.tomsguide.com/phones/android-phones/snapdragon-8-elite-benchmarks).
- Chrome on Android with Qualcomm's then-latest flagship chip: **33.3** vs an older 18.4 — [Android Central (snippet only; attribution uncertain among the result set)](https://www.androidcentral.com/apps-software/google-chrome-blows-the-competition-away-in-speedometer-3-tests).
- Desktop: M4 MacBook Pro, Chrome 139, Speedometer 3.1: **52.35** (June 2025) — [Chromium blog (snippet only; blocked)](https://blog.chromium.org/2025/06/chrome-achieves-highest-score-ever-on.html). M2 MacBook Air Speedometer 3.1: Chrome **42.7** / Safari **41.9** (January 2026) — [supasidebar (snippet only)](https://supasidebar.com/blog/fastest-browser-mac-2026).
- One search summary reported a "Galaxy A55 Speedometer 3 score of 3.0", which is implausible next to the figures above. I discarded it — [Notebookcheck Galaxy A55 review (snippet only; blocked)](https://www.notebookcheck.net/Samsung-Galaxy-A55-5G-review-A-lot-of-premium-features-in-a-midrange-smartphone.835803.0.html).

### Inferences
- **Device multipliers for "RM ms → device ms"** (cost multiplier; >1 = slower than the RM):

  | Device class | Raw Speedometer multiplier | Conservative budgeting multiplier |
  |---|---|---|
  | Budget Android (SD 4 Gen 2 class) | ≈1.3 (9.5/7.3) | ×1.5 (adds a thermal margin of ≈1.15) |
  | Mid-range Android (Pixel 8a) | ≈0.59 | ×1.0 |
  | Flagship Android / iPhone 15–16 | ≈0.26–0.34 | ×0.6 |
  | Apple-silicon / modern desktop | ≈0.18–0.22 | ×0.75 to also cover older laptops near the RM |

  The conservative factors assume the true compute gap is smaller than Speedometer's because the RM's score includes software rendering.
- **Why not use the raw ratios:** Speedometer is a DOM/UI benchmark, so it is a weak proxy for typed-array kernels. JetStream (pure JS + WASM) would be better, but no phone JetStream 2.2/3 scores were found. On-device measurement with the same harness (the Chromium page above runs as-is on a phone) should replace these factors.

### Gaps
- No phone was available, and every device score is snippet-only (source pages blocked).
- Sustained-load thermal throttling, big.LITTLE placement of workers and battery cost are unquantified.
- The rendering penalty in the RM's Speedometer score was not isolated.
- No JetStream 2.2/3 phone data was found.

## 7. Deliverable: per-tier tick budgets, sub-budgets, memory, rules and CI checks

### Takeaway
At 10 ticks/s and 1×, with a single sim worker, the budgets are:
- **10k agents on any phone: 5.3 ms on the RM (≈8 ms on a budget Android)**;
- **25k on capable phones: 13.3 ms RM (≈8 ms device)**;
- **100k on desktop: 16 ms RM (≈12 ms device)**;
- **country day: 1.5 ms RM at 1k settlements and 12 ms RM at 10k**.

All measured optimised-JS paths fit with ≥20% slack. At 100k this holds only if perception uses cell aggregates (or WASM SIMD / workers for exact queries) and decisions are event-driven or staggered. CI must gate on **min-of-samples** (not median) on this kind of shared runner.

### Cited Findings
- **RM costs used for the table** (Chromium 141, ms per tick at 10k / 25k / 100k):
  - movement JS 0.061 / 0.153 / 0.642;
  - grid JS 0.203 / 0.471 / 2.48;
  - exact query JS 2.90 / 6.99 / 28.9 and WASM SIMD 0.98 / 2.41 / 10.7;
  - cell aggregates JS ≈0.57 (scaled from 25k) / 1.42 / 5.61;
  - utility, all agents: JS 0.42 / 1.07 / 4.43 and WASM 0.32 / 0.80 / 3.25;
  - utility via timing wheel: ≈0.03 / 0.082 / 0.40;
  - ledger transfer ≈3.7 ns each.
  - [measured here](../prototypes/compute/results/kernels-chromium.json); [algo](../prototypes/compute/results/algo-chromium.json).
- **Snapshot transfer** ≈0.1 ms (project's earlier measurement, not re-measured here).
- **Benchmark noise on this shared 4-vCPU VM:**
  - Within-run spread of 9 samples, (max−min)/median: p50 10–14%, p90 44–62%.
  - Between two runs: medians differed by p50 2.2%, p90 10.8%, max 46%; **min-of-samples by p50 1.0%, p90 4.3%**, max 23.5%.
  - [measured here](../prototypes/compute/results).
- **Measured memory layout of the benchmarked systems:**
  - 56 B/agent: positions + velocities 16; grid cell + sorted index 8; sorted position copies 8; perception outputs 12; needs 5; decision 5. Plus grid 2 B/agent.
  - Settlement state 168 B (32 Int32 cohorts + 4 Int32 + 3 Float64 cents) + sparse edge arrays ≈64 B (k=8) or ≈190 B (k=24).
  - [measured here](../prototypes/compute/js/common.mjs).

### Inferences
**Assumptions:** sim tick = 100 ms of game time; 10 ticks/s at 1×. Device budgets are 8 ms (phones) and 12 ms (desktop), which allows ≈4× fast-forward on phones and ≈4× on desktop at <50% of one core. The RM column = device budget ÷ conservative multiplier from section 6. Re-scale with: `budget_ms = 1000 / (ticks_per_s × max_speed) × duty_cycle`.

**Agent tick sub-budgets (RM ms per tick, one sim worker; these are the CI gate values):**

| System | 10k (any phone) | 25k (capable phone) | 100k (desktop) | Measured RM, optimised JS (10k / 25k / 100k) |
|---|---|---|---|---|
| Movement / integration | 0.10 | 0.25 | 0.8 | 0.061 / 0.153 / 0.642 |
| Spatial grid rebuild | 0.30 | 0.70 | 2.8 | 0.203 / 0.471 / 2.48 |
| Perception (cell aggregates + capped, staggered exact queries) | 1.0 | 2.5 | 6.0 | ≈0.57 (scaled) / 1.42 / 5.61 (exact every tick: 2.90 / 6.99 / 28.9; WASM SIMD 0.98 / 2.41 / 10.7) |
| Decisions (utility via timing wheel or ≥1/8 stagger) | 0.20 | 0.50 | 0.6 | ≈0.03 (scaled) / 0.082 / 0.40 |
| Other per-agent systems (needs, jobs, inventory, social) | 1.2 | 3.0 | 1.4 | not measured |
| Pathfinding and events | 1.0 | 2.8 | 0.8 | not measured |
| Ledger / economy transfers | 0.15 | 0.4 | 0.3 | ≈3.7 ns per transfer |
| Snapshot to render thread | 0.10 | 0.2 | 0.3 | ≈0.1 (project) |
| **Slack: GC, jitter, spikes (19–24%)** | 1.25 | 2.95 | 3.0 | — |
| **Tick total (RM ms)** | **5.3** | **13.3** | **16.0** | 0.90 / 2.2 / 9.1 + unmeasured systems |
| Device ms (× multiplier) | ≈8 (budget Android ×1.5) | ≈8 (×0.6) | ≈12 (×0.75) | |

- **At 100k, perception is the binding constraint.** Single-thread JS fits only with cell aggregates (5.6 ms). Exact radius queries need one of:
  - WASM SIMD with ≥1/2 staggering (≈5.4 ms);
  - 4 JS workers (neighbour phase 8.8–12.7 ms in Node/Bun, so also staggered);
  - WASM SIMD + 3–4 workers (neighbour phase ≈3.8–4.1 ms).
- **Naive budget breakers:** exact every tick at 100k (28.9 ms), and every-agent utility at 100k (4.4 ms).

**Country day (RM ms per sim day; spread round-robin across the ticks of a day):**

| | 1k settlements (phones) | 10k settlements (desktop) |
|---|---|---|
| Budget | 1.5 (≈2.3 ms on a budget Android) | 12 |
| Measured JS, settle + flows k=8 | 0.76 (k=24: 1.05) | 8.4 (k=24: 12.1, so k=24 needs WASM) |
| Measured WASM | 0.44 | 4.7 (k=24: 6.9) |
| Dense N×N flows | Allowed only up to ~1k as a precomputed matrix (2.2–3.3 ms, 4 MB) | Forbidden (376–564 ms JS / 58–63 ms WASM SIMD per day; 400 MB) |

**Memory budgets:**
- Agent hot SoA ≤ 256 B/agent plus a 24 B/agent double-buffered render snapshot: 2.8 MB (10k), 7 MB (25k), 28 MB (100k). The measured systems use 56 B.
- Settlements ≤ 1 KB each including the CSR edges: 1 MB (1k), 10 MB (10k). The measured model uses 232–360 B.
- WASM linear memory reserved once at startup: 32 MB on phones, 64–128 MB on desktop, never grown in play.

**Rules to enforce:**
1. **Hot systems:** SoA typed arrays in one preallocated (WASM) memory; zero allocation per tick; no BigInt, closures, array methods, `for…of`, strings or Date/`performance.now` in the sim core.
2. **Determinism:** all replay-relevant state integer or fixed-point. Floats only in a single canonical implementation per system; no relaxed SIMD, FMA or `Math` transcendentals; squared distances or correctly rounded `Math.sqrt` only. Power-of-two grid cells.
3. **Perception:** cell aggregates by default; exact queries opt-in, staggered and candidate-capped. Decisions event-driven (timing wheel) or staggered. Sleeping/LOD agents in dense index lists.
4. **Country:** sparse CSR flows (k ≤ 24), two-phase application in fixed order, round-robin settlement updates; dense only at the region level.
5. **WASM:** port perception first, then the cohort/flow models; raw exports with pointer arguments; ship the SIMD build. A scalar or JS fallback is safe only for integer systems.
6. **Workers:** only when crossOriginIsolated and the phase carries ≥0.5 ms (≈≥20–25k agents). Fixed 1,024-agent chunks, chunk-ordered reductions, spin ≤50 µs then `Atomics.wait`, ≤ cores − 2 helpers.

**CI checks:**
- **(a) Budget gate.** Playwright + headless Chromium (plus Node) runs each system at 10k/25k/100k and the country model at 1k/10k. Take the **min of ≥9 samples** after warm-up. Fail if min > sub-budget × 1.10. Optionally normalise by a fixed calibration kernel run in the same job. Record loadavg; re-run once if load > 1.5 (or use a dedicated runner). Median-based gating would flake (p90 between-run drift 10.8%).
- **(b) Allocation gate.** Node `perf_hooks` GC observer: 0 scavenges over 1,000 ticks per system after warm-up, and heap growth < 64 KB per tick under a large semi-space.
- **(c) Lint gate.** The `no-restricted-syntax` hot-path profile.
- **(d) Determinism gate.** Golden state hashes after N ticks for fixed seeds, required to match exactly across Node (V8), Bun (JSC as a Safari proxy) and Chromium, and between JS and WASM for integer systems. Use full-mantissa data, not quantised initial states.
- **(e) Ledger invariant.** Exact total-cents equality every tick.
- **(f) Size gate.** WASM core < 64 KB gzip (currently 5.8 KB).

### Gaps
- The "other agent systems", pathfinding and events sub-budgets are allocations, not measurements.
- The device multipliers rest on snippet-only Speedometer scores and an RM score depressed by software rendering. They should be replaced by running this harness on real budget, mid-range and capable phones.
- Tick rate and fast-forward targets were assumptions; the project did not specify them.
