# M7.6 Cultures

Part of [M7 Country of ledgers](../milestone.md).

Needs M2's culture β shifts and the M3–M5 agent runs.

- **Builds:**
  - the settlement culture block: counts by primary culture plus mixed counts (2K Int32, 64 B at 8 cultures) and a region id, stepped yearly on each settlement's stride day: births by homogamy and conformist learning, then mixing and switching hazards (R8);
  - every migration flow split by culture exactly, outflow by culture first and then by destination, with about 20% long-distance movers weighted by pop^1.5, spread over the month with sparse loops, while migration itself never reads culture (R8);
  - settlement demand shifts derived as Σ share × Δβ, recomputed only when counts change (R8);
  - culture hazards fitted from M3–M5 agent runs and docked on held-out runs, as M7.2 does for other flows (R8).
- **Exit checks:**
  - people by culture sum exactly to population every day, spawn and fold are exact per culture, and minority move rates stay within 5% of their population share over 30 years (R8);
  - over 100 years, regional G\_ST stays at 0.3 or more with acculturation, at least 90% of settlements keep their dominant culture, and the capital's effective number of cultures exceeds the village median (R8);
  - culture is independent of settlement wealth bands within the audit's bands (R8).
