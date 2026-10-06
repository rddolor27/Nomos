# Round 7 · Million agents: questions and status

The owner wants Nomos to scale eventually to both a country of millions of people and up to 1 million people simulated individually in the place being watched, on machines strong enough to run it. The browser should use the GPU and extra RAM when the machine has them, and fall back gracefully when it does not. Everything stays client-side, with no backend. The plan currently tops out at 100k agents on desktops, and round 4 estimated 50–90 ns per agent-tick on one core, so 1 million would take 50–90 ms a tick.

This is a lean round, as the owner chose: three researchers, then a report, a fact-check and plan tasks tagged (R7), following `/research-round`.

| # | Question | Notes | Status |
|---|---|---|---|
| 1 | Can 1 million agents tick in a browser tab, deterministically, with workers, WASM and WebGPU compute? | `notes/compute-gpu.md` | Stopped before notes; prototypes and results in `prototypes/compute/` and `prototypes/gpu/` |
| 2 | How much memory does 1 million need, what will browsers allow, and how should Nomos detect the hardware and pick a tier? | `notes/memory-tiers.md` | Stopped before notes; prototypes, including a browser harness, in `prototypes/memory/` |
| 3 | How should 1 million agents and a country of millions be drawn and zoomed? | `notes/rendering-lod.md` | Stopped before notes; a static WebGL2/WebGPU prototype in `prototypes/rendering/` |

On 2026-10-06 the three researchers were stopped mid-task by a usage limit and an interrupt, before writing their notes. Their prototypes and results are uncommitted in the working tree; the WebGPU test package in `prototypes/gpu/node_modules/` is ignored. Resuming the round means a new researcher per question writing the notes from these prototypes, which the owner has to approve first.

## Still to do

1. Finish the notes for questions 1–3.
2. Write `report.md` from the notes, leading with the answer and flagging every search-summary figure.
3. Fact-check the report against the notes with the `fact-checker` agent.
4. Update the shared Claude doc with a summary tab and (R7) plan tasks, then export it with `/sync-plan-doc` and add the round to `docs/README.md`. The owner approved this flow for round 6; confirm again before editing the doc.
