# M6.2 100,000 agents

Part of [M6 Scale and sharing](../milestone.md).

Needs M6.1's large cities, and M3's timing wheel, per-cell aggregates and voice caps.

- **Builds:**
  - a `_headers` file with immutable caching for hashed assets plus COOP/COEP, and a hand-written service worker for offline starts (R5);
  - staggered decisions and per-cell aggregates at 100k, extending M3's timing wheel and default aggregates (R1);
  - SharedArrayBuffer workers only when `crossOriginIsolated` is true and a phase carries at least 0.5 ms: fixed 1,024-agent chunks, chunk-ordered reductions, a spin of at most 50 µs before `Atomics.wait`, and at most min(hardwareConcurrency − 2, 3) helpers (R1, R5);
  - the exact neighbour query in Rust compiled to WASM SIMD, with raw pointer exports, no wasm-bindgen and integer JS fallbacks; the settlement model joins in M7.5, once M7 has built it (R5);
  - semantic zoom for 25k and 100k agents: a Skin A heatmap from 128×128 render-side bins with a log ramp, visible-set compaction, and optional 16-bit positions at 8 bytes per agent (R3);
  - the Canvas2D fallback for all three skins (R3);
  - sound profiled at 100,000 agents: aggregation, voice caps and worklet cost within budget (Sound);
  - the Memory and frames load gate, which the owner moved here from M0.6 on 8 October 2026: `measureUserAgentSpecificMemory` in full Chromium against the tier budgets, with growth of at most 2 MB over 60 s, plus frame-time regression checks, and no absolute frame-rate gate under software WebGL (R5).
- **Exit checks:**
  - on a desktop, 100k agents keep decisions at 10–20 Hz and rendering at 60 fps, in Skin A at city zoom and Skin C at street zoom (R1, R3);
  - a 100k-agent tick fits 16 ms on the reference machine, exact queries run only through WASM SIMD or workers, and state hashes match for one to four workers (R5);
  - the audio chunks stay within budget, and main-thread audio work stays under about 0.5 ms a frame at 100,000 agents (Sound).
