# M3.4 Build mode and default town

Part of [M3 City life](../milestone.md).

Builds on M3.3's tile pass and M3.1's shore tidying. The estimate is the Build mode's 8–12 days plus the plan's 3–5 days of editing. The plan sets no exit check on the Build mode itself; the ongoing edit checks (R9) come closest.

- **Builds:**
  - the minimal developer-flag Build mode as a lazy chunk, in 8–12 days: `WorldRenderer.patchTiles` over 32×32 chunks, a terrain brush, rectangle and fill with a 3-tile minimum land brush, prefab stamps, cell-diff undo, save and load in a versioned container, and a Play hand-off to the worker (R9);
  - the 256×256 default town as a fixed seed of the place generator, with apartment blocks, house rows, shop rows, a market square and a park, hand-edited in Build mode; hand-authoring it in LDtk is the fallback if the port slips (R3, R9).
- **Exit checks:**
  - 10k agents in the 256² town stay within the tick budget, and rendering at 3× stays in budget in CI and when re-measured on one mid-range Android phone and one iPhone (R1, R3).
