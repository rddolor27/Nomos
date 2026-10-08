# M6.3 Worlds, saves and links: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **A world is three things** (R9):
  - a seed;
  - pinned generator versions, from M6.1's registry;
  - per-stage edit layers, applied as stage inputs before day 0.

  Everything else regenerates.
- **Saves and share links encode a whole view:** seed, config, skin, zoom and camera. They replay identically across browsers (R1, R2, R3).
- **Share-link format (R9):**
  - `#w1.` + deflate-raw columns + base64url + CRC32, in the URL fragment so it never reaches a server;
  - caps of 32 KiB of link, 1 MiB inflated and 20,000 ops;
  - no free text anywhere in a link;
  - above 8,000 characters, the app offers a `.nomos` file instead.
- **Parsing is strict.** A bad CRC, an unknown version or a cap overrun is refused with a message, never repaired by guessing.
- **Saves are atomic (code rules, ACID):** written to a temporary key, then swapped in, so a crash never leaves half a save.

## Packages and files

- `packages/sim-protocol/src/world-def.ts`: the world definition and its columnar encoding.
- `packages/sim-protocol/src/link.ts`: `encodeLink` and `decodeLink`, using `CompressionStream('deflate-raw')`, base64url and CRC32.
- `apps/web/src/saves/`:
  - `store.ts`: IndexedDB or OPFS, with atomic swap;
  - `file.ts`: `.nomos` export and import;
  - `restore.ts`: skin, zoom and camera.
- `packages/sim-protocol/test/fixtures/links/`: golden links per format version.

## Interfaces and data

- **`WorldDef`:** `{ seed, versions: Record<Stage, number>, edits: EditLayer[], config: PolicySettings & ScenarioSettings }`.
- **`ViewState`:** `{ skin, zoom, cameraX, cameraY, lens: 'none' }`. The culture lens is never stored (M5.5).
- **Link:** `#w1.<base64url(deflateRaw(columns))>.<crc32>`, where the columns are fixed-order typed arrays of the definition and the view.
- **`.nomos` file:** the same bytes with a short header (magic word and version), for links over 8,000 characters.

## Method and sources

- **World definition, edit layers, the link format and its caps:** [R9 edits and saves notes](../../../../research/round-9-maps-and-world-builder/notes/edits-and-saves.md), and the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md): "Share links".
- **Replay across browsers:** M0.6's cross-engine harness, and [R2 engineering notes](../../../../research/round-2-follow-up/notes/engineering-gaps.md).

## Tests for the exit checks

- `a share URL restores skin and frame`:
  - Playwright opens a link in Chromium, Firefox and WebKit;
  - the skin, zoom and camera match;
  - the first frame matches a golden frame within M0.4's golden-frame statistics.
- `a share URL replays identically`: the state hash at day 28 matches across the three browsers.
- `strict parsing`: a flipped bit fails the CRC; links over 32 KiB, over 1 MiB inflated or over 20,000 ops are refused; and no field accepts free text.
- `atomic saves`: a test kills the write midway, and the previous save still loads.

## Risks and unknowns

- **Link size grows with edits.** The 8,000-character threshold sends large worlds to `.nomos` files, so test it with M6.4's editor.
- **Format versions are forever.** Keep a decoder per version, and golden links for each.
- **CompressionStream** is available in all three engines, but check its `deflate-raw` support in the oldest browsers the project supports.

## Open questions

- **Owner:** Must a link replay identically after the sim changes, or only reopen the same world? Identical replay across app versions means shipping old sim code, as M6.1 does for generators, and the [Weather plan](../../../weather.md) already promises it for links made before M10. Suggested: links pin a sim version, and a newer build reopens the world with a warning that the run may differ, except where the plan promises identical replay. Needed before: the step plan.
- **Owner:** What is the oldest browser Nomos supports? `CompressionStream('deflate-raw')` needs Chrome 103, Firefox 113 or Safari 16.4 (R9 edits and saves notes). Suggested: that floor, so no inflate fallback ships. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** `WorldDef` and its columns with golden fixtures first, then `encodeLink` and `decodeLink` with the caps, then saves, then view restore and the three-browser checks.
- **Reuse:** M6.1's version registry, M0.6's cross-engine harness, M0.4's golden-frame statistics, and R9's codec measurements as the size baseline.
- **Keep it simple:** use IndexedDB alone, where one readwrite transaction already gives the atomic swap without a temporary key; request strict durability where offered.
- **Pitfalls:** deflate bytes may differ between engines (inference), so golden tests compare decoded columns, and the CRC covers the inflated columns, as R9's encoder orders it. The strict parser still accepts R9's filtered place names, 2–24 ASCII characters, checked again on open.
- **Hard and easy parts:** keeping every format version decodable forever needs the most care; base64url and CRC32 are mechanical.
