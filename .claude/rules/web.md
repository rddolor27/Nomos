---
paths:
  - "apps/web/**"
  - "packages/render-gl/**"
---

# Web app and renderer rules

## Rendering

- Use one custom WebGL2 renderer: no PixiJS or Phaser. Skins A (dots), B (blobs) and C (pixel town) all read the same 12-byte snapshot per agent: x, y and a 32-bit visual word.
- Zoom only in integer device-pixel steps, snap texels and camera, and never scale with CSS. Keep the Canvas2D fallback working.
- The recorded view must never show a true-only cue. A render-filter test checks this.

## Load order and bytes

- An inline `<head>` script starts the sim worker and the map fetch. The first frame needs only the dots skin, the HUD and the worker.
- Load uPlot and lil-gui after the first frame and the town atlas in idle time. Load country mode, the inspector and WebGPU on demand.
- Budgets:
  - at most 100 KB brotli before the first frame, of which at most 35 KB is JS;
  - first frame within 1.5 s and interactive within 2.0 s on cold Fast 4G with mid-tier phone CPU.

  size-limit gates every chunk.
- Write the HUD in vanilla TypeScript. Write richer UI in Solid, or Preact with signals. Never use React.

## Assets

- Ship the atlas as lossless WebP at native resolution, with an oxipng PNG fallback. Never use lossless AVIF.
- Convert maps from LDtk JSON to a compact binary at build time. Serve them with a compressible content type.

## Hosting

- Serve static files only, with `_headers` for:
  - `Cache-Control: public, max-age=31536000, immutable` on hashed `/assets/*`;
  - COOP/COEP, so workers can share memory.
- Use the hand-written service worker for offline starts.

## Accessibility

- Play/Pause comes first in tab order, and the sim starts paused under `prefers-reduced-motion`.
- Every chart has a data table.
- Use the colour-blind-safe palette (body #F7C948, police #283A7C, merchant #2A9D8F). Give characters a 1-px dark outline by day.
