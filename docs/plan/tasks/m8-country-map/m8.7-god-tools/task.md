# M8.7 God tools

Part of [M8 Country map](../milestone.md).

Needs: M3's Build mode tools and M6's per-stage edit layers.

- **Builds:**
  - god tools on the country: lock and re-roll with per-stage keyed counters; raise, lower and smooth brushes; biome paint; drawn rivers and roads; town and wonder placement; pins, tombstones that lower counts, a conflict list and one undo log; every edit reruns from its first dirty stage, and the generator re-places cultures (R9).
- **Exit checks:**
  - the Ongoing rerun test covers country edits: a partial rerun from the first dirty stage equals a full rerun, byte for byte, for random edit logs (R9).
