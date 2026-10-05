---
name: perf-check
description: Measure Nomos against its performance budgets (tick, frame, startup, bytes, memory, allocation, determinism) and judge pass or fail the way CI does. Use after changes to the sim core, worker protocol, renderer, build config or assets, or when asked how fast or heavy something is.
---

# Performance check

The budgets live in the Performance budget section of `docs/plan/implementation-plan.md`. The headline gates are:

| Gate | Budget |
|---|---|
| Tick on the reference machine | 10k agents ≤ 5.3 ms, 25k ≤ 13.3 ms, 100k ≤ 16 ms (per-system sub-budgets in the plan) |
| Country day | 1k settlements ≤ 1.5 ms, 10k ≤ 12 ms |
| Startup on cold Fast 4G with mid-tier CPU | first frame ≤ 1.5 s, interactive ≤ 2.0 s |
| Bytes before the first frame | ≤ 100 KB brotli, of which JS ≤ 35 KB |
| App memory | ≤ 64 / 72 / 160 MB at 10k / 25k / 100k agents, plus any WASM reservation |

## Method

1. Record `cat /proc/loadavg` beside every timing. Re-run headline numbers if the load is above 1.5.
2. **Micro-benchmarks:** warm up for at least 250 ms, take at least 9 samples, and gate on the minimum. Fail if the minimum exceeds the budget × 1.10. Medians drift about 11% between runs on shared machines.
3. **Startup:** take the median of 7 cold loads. It fails above the budget, or on a regression of more than 15% and more than 20 ms against `main`.
4. **Allocation:** zero scavenges over 1,000 ticks after warm-up (Node `perf_hooks` `gc` events), and heap growth under 64 KB per tick.
5. **Determinism:** state hashes for fixed seeds must be identical in Node, Bun and Chromium, and between the JS and WASM versions of integer systems.

Report a table with one row per gate: budget, measured (minimum and median), load average and verdict. Never present desktop or VM timings as phone timings.

The research harnesses are in `docs/research/round-5-performance/prototypes/`: `compute/`, `load/`, and draft CI configs in `load/ci/`.
