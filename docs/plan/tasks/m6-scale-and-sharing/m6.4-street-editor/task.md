# M6.4 Street editor

Part of [M6 Scale and sharing](../milestone.md).

Needs M3's developer Build mode and M6.3's links.

- **Builds:**
  - the Build mode opened to players as a street editor: M3's tools plus an eraser, an eyedropper and a line tool, buildings and props, and home, shop and workplace zones; a palette of building kinds, never styles, which come from a keyed uniform draw with a "restyle" button; no person, costume, culture or hue tools and no asset import; edits under hard validation (doors on roads, capacity, reachability), applied before day 0 and shared as links or `.nomos` files (R9);
  - a "made by a player" badge, a "hide custom names" switch and a report button that emails the owner, shown when a player-made world opens (R9);
  - the builder sounds (`ui_build_*`) for brush, place, erase and undo in the street editor; the sounds exist, so wire them in (Sound).
- **Exit checks:** M6 lists none for the editor, so two of the plan's ongoing tests close it:
  - a no-op edit leaves the replay hash unchanged (R9);
  - a partial rerun from the first dirty stage equals a full rerun, byte for byte, for random edit logs (R9).
