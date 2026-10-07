# M8.6 New country settings

Part of [M8 Country map](../milestone.md).

Needs: M6's share links and per-stage edit layers.

- **Builds:**
  - a "New country" settings panel: about 10 overrides, grouped by stage and badged ("keeps coastline", "new world"); standard or large size; a culture count and a single-culture switch; presets, a live preview and validation (R9);
  - validation on Play, on Share and on every open: every settlement reaches the capital by road or sea lane, food capacity per country, no pin in water, names through round 8's filter in ASCII, and payload caps (R9).
- **Exit checks:**
  - the Ongoing edit tests cover country settings: a no-op edit leaves the replay hash unchanged, and a treatment edit changes no unrelated entity id (R9).
