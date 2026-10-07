# M0.5 Web app

Part of [M0 Pipeline](../milestone.md).

- **Builds:**
  - `apps/web` with an inline `<head>` script that starts the worker and the map fetch; uPlot and lil-gui load after the first frame (R5);
  - the HUD in vanilla TypeScript, with uPlot charts and a per-system millisecond HUD, and any richer UI (inspector, event log) in Solid, or Preact with signals, never React (R1, R5);
  - device tiers: 10,000 agents on phones, 25,000 after a start-up check, 100,000 on desktop only (R2);
  - accessibility basics: Play/Pause first in tab order, a paused start under reduced motion, and a data table for each chart (R2);
  - the `assets/` layout by licence family, with `assets/LICENSES.md`, a git-ignored slot for paid packs and an atlas build stub; and the sprite manifest as a versioned JSON Schema with generated TypeScript types, where maps name frames, never atlas indices (R3, R9).
- **Verify first:**
  - the canonical licence pages for Ninja Adventure, Kenney and LimeZu, and Mana Seed's AI clause, which decide the packs to commit, buy or drop;
  - tick and frame times on a mid-range Android phone and an iPhone, which decide the device tiers here and the phone framebuffer path in M3.3.
- **Exit checks:**
  - a library budget of about 45 KB gzip (R2, R3);
  - the first frame and byte budgets measured against the Performance budget section (R5).
