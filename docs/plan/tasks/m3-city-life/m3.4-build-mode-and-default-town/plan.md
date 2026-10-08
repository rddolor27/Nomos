# M3.4 Build mode and default town: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **A minimal Build mode behind a developer flag.** It is the first slice of the player editor that M6 and later grow, and it loads as a lazy chunk only when chosen, so the first frame keeps its 8 KB of JS (R9).
- **Tools:**
  - a terrain brush, with the smallest land brush 3 tiles;
  - rectangle and fill;
  - prefab stamps;
  - cell-diff undo: each edit is a command holding the cells it changed, and 100 strokes hold about 0.27 MB (R9);
  - save and load in a versioned container;
  - Play, which hands the edited map to the worker.
- **The renderer gains one method:** `WorldRenderer.patchTiles(chunkX, chunkY, cells)`, which patches 32×32-tile chunks. Map-wide edits go to the worker (R9).
- **Shores tidy once per stroke,** judging every cell before changing any. This reuses M3.1's plan-then-apply tidying.
- **Edits apply before day 0 only** (owner, R9). Build mode is part of setup, never of a running world, which matches M1.2's watch-only protocol.
- **The default town:**
  - a 256×256 town, generated as a fixed seed of M3.1's place generator;
  - it holds apartment blocks, house rows, shop rows, a market square and a park;
  - it is then hand-edited in Build mode, and its edit log and seed are committed as the town's source.

  If the port slips, hand-author it in LDtk as the fallback (R3, R9).

## Packages and files

- `apps/web/src/build/`, a lazy chunk:
  - `tools/brush.ts`, `tools/rect.ts`, `tools/fill.ts` and `tools/stamp.ts`;
  - `undo.ts`, `container.ts` and `play.ts`.
- `packages/render-gl`: `patchTiles`, added to `WorldRenderer`. This refines M0.4's interface; update [interfaces.md](../../m0-pipeline/interfaces.md).
- `packages/worldgen`: an edit-log replay on top of a seeded generation.
- `assets/maps/default-town/`: `seed.json` and `edits.json`, from which the binary map is built at build time.

## Interfaces and data

- **Edit command:** `{ stage, cells: Uint32Array }`, where each cell packs index, old value and new value. Undo applies the cells in reverse.
- **Save container:** a versioned header with a magic word, version, generator version and seed, then the edit log, compressed with `CompressionStream('deflate-raw')`. Loading refuses unknown versions with a message, never by guessing.
- **Edit identity:** edits keep entity ids stable, because paired lab arms need them. Re-keyed ids made paired arms as noisy as unpaired seeds, costing 7–8× the seeds (R9).

## Method and sources

- **Editor scope, tools, timings, undo and LDtk's role:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md), "Editor: a Build mode inside the app". Notes: [editor tech](../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md), [edits and saves](../../../../research/round-9-maps-and-world-builder/notes/edits-and-saves.md) and [builder scope](../../../../research/round-9-maps-and-world-builder/notes/builder-scope.md).
- **Default town from the generator:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md), owner decisions.
- **Tick and render budgets:** the Performance budget in the [implementation plan](../../../implementation-plan.md#performance-budget).

## Tests for the exit checks

- `10k agents fit in the default town`: M0.6's budget gate runs 10,000 agents in the 256² town, and every system stays within its sub-budget.
- `renders at 3× in budget`: M0.6's frame gate draws the town at 3× with 10,000 agents, and main-thread draw time stays within the Performance budget.
- **Re-measure on phones:** the same scene on one mid-range Android phone and one iPhone, recorded in the playtest record. This is manual, with device and browser versions noted.
- **Round 9's ongoing edit checks apply from here:**
  - `a no-op edit changes nothing`: the replay hash is unchanged;
  - `a treatment edit keeps ids`: no unrelated entity id changes;
  - `partial rerun equals full rerun`: for random edit logs, rerunning from the first dirty stage equals a full rerun, byte for byte.
- `undo restores exactly`: 100 random strokes, then 100 undos, give a byte-identical map.

## Risks and unknowns

- **8–12 days** for the minimal Build mode is round 9's estimate. The default town's hand edits add 3–5 days.
- **The port must land first.** If M3.1's port slips, the LDtk fallback town keeps M3.5–M3.8 moving; switch back once the port passes.
- **The save format is forever.** Version the container from the first save, and keep a loader per version.

## Open questions

- **Owner:** What must the default town show to count as done? The hand edits take 3–5 days, and no exit check judges them. Suggested: the task's apartment blocks, house rows, shop rows, market square and park, plus one workplace per sector and passing budget runs. Needed before: building.
- **Owner:** Build the compressed save container now, or keep the committed JSON edit log until players can save? Once players save, the format is forever, and M3's Build mode is developer-only. Suggested: the JSON edit log now, and the versioned container with M6's player editor. Needed before: the step plan.
- **Measure:** Does the edited 256² default town fit the 40 KB map budget ([Performance budget](../../../implementation-plan.md#performance-budget))? It sits on the critical path, and round 5's stand-in binary map was 33 KB (measured there). Suggested: add it to size-limit when the first edits land. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** `patchTiles` and one brush with undo first, as the core loop. Then the Play hand-off, the other tools, the default town's edits, and the 10k budget and phone runs last.
- **Reuse:** M3.1's generator and plan-then-apply tidying; M3.3's tile chunks and M0.4's `MapV1`; M0.5's lazy loading; M0.6's budget gate and M0.4's frame budget test; M1.2's watch-only protocol.
- **Keep it simple:** a short fixed prefab list for stamps, with no LDtk import, multi-select or prefab editor.
- **Pitfalls:**
  - A generator change shifts the base town under the edit log. Pin the generator version in `seed.json`, and fail the build when an edit's old value doesn't match.
  - Keep one source of truth for the edited map; map-wide edits done in the worker come back as cell patches.
- **Hard and easy parts:** stable entity ids and partial-rerun equality are the hard parts. The tools and undo are mechanical.
