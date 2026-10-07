# M8.5 Focus, fork and history

Part of [M8 Country map](../milestone.md).

Needs: M2's spawner, M5's what-if branches, and M6's city generator and country save sections.

- **Builds:**
  - the focus state, the breadcrumb (Country › Region › Settlement › District) and charts re-keyed by focus, with shared colour scales and "estimated" labels on every ledger-driven panel (R4);
  - "Open in City mode": a detached City-mode run seeded from a settlement's ledger and labelled as a what-if (R4);
  - multi-resolution history, weekly for a year and monthly before that, quantised to Uint16 with delta coding (R4).
- **Exit checks:**
  - a render-filter test checks that the recorded view never shows a true-only cue; a fork's fold at its first tick equals the source ledger; a save with ten years of history stays under about 3 MB gzip, since history alone came to about 1.9 MB on synthetic data (R4).
