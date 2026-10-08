# M6.2 100,000 agents: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Hosting first (R5):**
  - a `_headers` file with `Cache-Control: public, max-age=31536000, immutable` on hashed assets;
  - COOP and COEP headers, so the page is cross-origin isolated and workers can share memory;
  - a hand-written service worker of about 0.5 KB for offline starts.

  M0.5 writes the headers, and M1.6's smoke test already checks them on every deploy, so this step adds only the service worker. It names its cache after M1.6's deployed version, so each release replaces the last cache.
- **Scale the algorithms before adding threads (R1, R5).** Extend M3's timing wheel and per-cell aggregates to 100k, with staggered decisions and dense awake lists.
- **Workers only where they pay.** Use SharedArrayBuffer workers only when `crossOriginIsolated` is true and a phase carries at least 0.5 ms.
  - Work is split into fixed 1,024-agent chunks, and reductions run in chunk order.
  - A helper spins at most 50 µs before `Atomics.wait`.
  - There are at most min(hardwareConcurrency − 2, 3) helpers.
  - Results must be identical for 1–4 workers.
- **WASM SIMD for the exact neighbour query (R5):**
  - written in Rust, compiled to WASM SIMD, with raw pointer exports into the one `WebAssembly.Memory`;
  - no wasm-bindgen;
  - integer JS fallbacks, bit-identical to it;
  - the settlement model joins in M7.5.
- **Semantic zoom at 25k and 100k (R3):**
  - a Skin A heatmap from 128×128 render-side bins with a log ramp;
  - visible-set compaction;
  - optional 16-bit positions at 8 bytes per agent.
- **The Canvas2D fallback** covers all three skins.
- **Sound at 100,000 agents (Sound):** profile aggregation, voice caps and the worklet's cost, and keep them in budget.

## Packages and files

- `apps/web/public/_headers` and `apps/web/src/sw.ts`.
- `packages/sim-worker/src/helpers.ts`: the helper pool, chunk scheduling and the barrier (spin, then `Atomics.wait`).
- `packages/sim-wasm` (`@nomos/sim-wasm`), new:
  - `rust/` holds the crate: the neighbour query, with integer and SIMD paths;
  - `build.sh` uses `cargo build --target wasm32-unknown-unknown` with SIMD enabled, then strips and compresses;
  - the WASM core stays under 64 KB gzip (M0.6's size gate).
- `packages/render-gl/src/semantic-zoom.ts`: heatmap bins, the log ramp and compaction.
- `packages/render-gl/src/canvas2d/`: the fallback for dots, blobs and town.

## Interfaces and data

- **Neighbour query export:** `query(cellsPtr, posPtr, outPtr, count, radiusQ16): number`, with pointers into the shared memory. The JS fallback has the same signature over typed arrays.
- **Chunks:** 1,024 agents each, numbered. Each worker processes chunks in a fixed assignment, and reductions sum in chunk-number order.
- **Snapshot option:** a 16-bit position mode (8 bytes per agent), negotiated at `init`. This refines snapshot v1, so update [interfaces.md](../../m0-pipeline/interfaces.md), keeping v1's 12-byte layout as the default.

## Method and sources

- **Workers, barriers, chunks, WASM SIMD and gains:** [R5 compute notes](../../../../research/round-5-performance/notes/compute.md), and the Performance budget's "What the measurements settled" in the [implementation plan](../../../implementation-plan.md#performance-budget).
  - Barriers cost 50–130 µs.
  - Four Chromium workers gave 2.1–2.3×.
  - WASM SIMD ran the exact query 2.7–3.5× faster for floats and 2.8–4.4× for integers.
- **Hosting headers and the service worker:** [R5 load notes](../../../../research/round-5-performance/notes/load-memory.md).
- **Semantic zoom and the heatmap:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md).
- **Sound budget:** [sound.md](../../../sound.md), "Mixing, performance and controls".

## Tests for the exit checks

- `100k on a desktop`: M0.6's frame and budget gates show decisions at 10–20 Hz and rendering at 60 fps, in Skin A at city zoom and Skin C at street zoom.
- `100k tick fits 16 ms RM`: the fastest of 9 samples, in M0.6's budget gate.
- `exact queries only through WASM SIMD or workers`: a counter in development builds proves no exact query runs on the JS main path at 100k.
- `identical for 1–4 workers`: state hashes over 1,000 ticks match for 1, 2, 3 and 4 workers.
- `JS and WASM agree`: the integer neighbour query returns identical results in JS and WASM for 10,000 random cases.
- `audio within budget at 100k`: the audio chunks pass the size gate, and main-thread audio work stays under about 0.5 ms a frame.

## Risks and unknowns

- **Cross-origin isolation** blocks some embeds and third-party resources. Check that the static host serves COOP and COEP, and that nothing on the page breaks.
- **Rust joins the toolchain.** CI needs the wasm target, and the built `.wasm` is checked by size and hash. If Rust is a burden, the integer JS fallback ships alone at 25k.
- **Phones never get workers by default:** at 10k, staggering and aggregates save more than barriers cost (R5).

## Open questions

- **Owner:** Add Rust and WASM SIMD now, or only if a measured 100k tick misses 16 ms? JS cell aggregates alone took about 5.61 of perception's 6.0 ms at 100k (R5, Chromium 141), but the exit check accepts workers instead. Suggested: workers and JS first, adding the Rust kernel only if the budget gate fails or M7.5 needs it. Needed before: the step plan.
- **Measure:** Do M2–M5's other agent systems fit their 1.4 ms sub-budget at 100k? That is 14 ns per agent per tick, barely above the 1.2 ms allowed at 10k (computed). Suggested: profile each at 100k before adding helpers, and stagger slow ones or move them to the day boundary. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the service worker first. Then the algorithms at 100k on one thread, semantic zoom, helpers, and WASM only if needed. Canvas2D and the sound profile come last.
- **Reuse:** M3's timing wheel, per-cell aggregates and voice caps, M0.6's budget, allocation and size gates, and M0.3's snapshot pool.
- **Keep it simple:** skip the optional 16-bit positions unless the 100k snapshot misses its 0.3 ms sub-budget, so snapshot v1 stays unchanged. The plan's ≈0.1 ms is an older figure at an unstated size (R5 compute notes), so measure it at 100k.
- **Pitfalls:** reserve the shared memory for 100k at start, since `grow` detaches views. Reductions sum in chunk order even when a helper finishes early.
- **Hard and easy parts:** the barrier and order-fixed reductions need the most care; the headers and service worker are mechanical.
