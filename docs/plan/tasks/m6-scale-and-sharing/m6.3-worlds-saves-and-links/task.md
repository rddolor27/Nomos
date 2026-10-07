# M6.3 Worlds, saves and links

Part of [M6 Scale and sharing](../milestone.md).

Needs M6.1's frozen generator versions.

- **Builds:**
  - a world defined as seed + pinned generator versions + per-stage edit layers, with edits as stage inputs applied before day 0 (R9);
  - saves and share URLs that encode seed, config, skin, zoom and camera, and replay identically across browsers (R1, R2, R3);
  - share links as `#w1.` + deflate-raw columns + base64url + CRC32 in the URL fragment, capped at 32 KiB of link, 1 MiB inflated and 20,000 ops, with a `.nomos` file above 8,000 characters and no free text (R9).
- **Exit checks:**
  - a share URL restores the same skin and frame and replays identically in Chromium, Firefox and WebKit (R2, R3).
