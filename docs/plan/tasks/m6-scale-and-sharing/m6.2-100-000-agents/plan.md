# M6.2 100,000 agents: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Hosting first (R5):**
  - a `_headers` file with `Cache-Control: public, max-age=31536000, immutable` on hashed assets;
  - COOP and COEP headers, so the page is cross-origin isolated and workers can share memory;
  - a hand-written service worker of about 0.5 KB for offline starts.

  M1.5 may already ship these. If so, this step only checks them.
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
