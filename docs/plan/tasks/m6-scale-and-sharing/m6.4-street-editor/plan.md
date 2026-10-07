# M6.4 Street editor: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Open M3.4's developer Build mode to players** as a street editor. It adds:
  - an eraser, an eyedropper and a line tool;
  - buildings and props;
  - home, shop and workplace zones.
- **The palette offers building kinds, never styles (R9).** A building's style comes from a keyed uniform draw, and a "restyle" button re-draws it.
- **What the editor never offers:**
  - person, costume, culture or hue tools;
  - asset import.

  The content rules hold by construction.
- **Hard validation** before an edit applies:
  - doors on roads;
  - capacity limits;
  - reachability: every home, shop and workplace connects to the road network.

  Invalid edits are refused with the reason shown on the map.
- **Edits apply before day 0 only,** and are shared as M6.3 links or `.nomos` files.
- **Player-made worlds (R9),** when one opens:
  - a "made by a player" badge;
  - a "hide custom names" switch;
  - a report button that emails the owner. The address shows as text, because `mailto:` links are unreliable in some hosts.
- **Builder sounds:** `ui_build_*` for brush, place, erase and undo, from M1.4's player. The sounds exist; wire them in.

## Packages and files

- `apps/web/src/build/`, extending M3.4:
  - `tools/eraser.ts`, `tools/eyedropper.ts`, `tools/line.ts` and `tools/zone.ts`;
  - `palette.ts`, kinds only;
  - `validate.ts`;
  - `player-world.ts`: the badge, the name switch and the report.
- `packages/worldgen/src/restyle.ts`: style by keyed draw on (seed, building id, restyle count).
- `packages/audio`: the builder sound mapping.

## Interfaces and data

- **Edit layer:** M3.4's command format, unchanged, so edit logs from the developer mode still load.
- **Validation result:** `{ ok: boolean, reasons: { cell, rule }[] }`, where `rule` is one of door-on-road, capacity or reachable.
- **Custom names:** short labels on places only, never on people. They pass M0.6's and M3.7's name filters. The "hide custom names" switch replaces them with generated names.

## Method and sources

- **Builder scope, the content rules by construction, the badge, names and reports:** [R9 builder scope notes](../../../../research/round-9-maps-and-world-builder/notes/builder-scope.md), and the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md): "Players never paint cultures" and "Cards stay honest".
- **Editor tech, tools and undo:** [R9 editor tech notes](../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md).

## Tests for the exit checks

M6 lists no exit check for the editor, so two of the plan's ongoing tests close it:
- `a no-op edit leaves the replay hash unchanged`: apply and undo an edit, or place a building identical to what's there; the replay hash is unchanged.
- `partial rerun equals full rerun`: for 100 random edit logs, rerunning from the first dirty stage equals a full rerun, byte for byte.

Its own tests:
- `validation refuses bad edits`: a door off-road, an over-capacity zone and an unreachable home are each refused with the right rule.
- `no forbidden tools`: the palette and tool registry contain no person, costume, culture or hue tool, checked by a table test.

## Risks and unknowns

- **Player-made names** are the main moderation risk. The filters, the hide switch and the report button are the whole defence; there are no accounts and no server.
- **Reachability checks on 1,024² maps** must stay fast. Run them per stroke, in the worker.
- **The report button needs the owner's address** shown in the app, which the owner must approve.
