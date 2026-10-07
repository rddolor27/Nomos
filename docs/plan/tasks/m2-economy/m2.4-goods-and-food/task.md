# M2.4 Goods and food

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - one of eight sectors per firm (grain, fresh food, timber, stone, metal, fuel, wares, services), with an integer recipe of at most two inputs, one output and worker-days per batch (R6);
  - the wholesale call auction once per tradable good, never for services, with unmet demand per good logged for the needs system (R6);
  - household baskets per good, seeded from ICP 2021 shares by development preset (food 45 / 33 / 19 / 9% of consumption) with the Stone–Geary rule (R6);
  - shops stocked with dated food lots in six categories (≤ 32 per shelf), sold first-expiry-first, with expired lots moved to per-category waste counters only at the day boundary (R6);
  - food priced as base × grade (100 / 135 / 180%) × freshness (100% fresh, 75% stale, 50% last day) in integer cents, flooring after each multiply, with markdown sales and waste logged per category (R6);
  - food grade chosen from the household's consumption budget per adult relative to the price index, never from a wealth band, with food value kept as a memo line outside net worth and tax bases (R6).
- **Needs:** M2.3's calibrated core, and M0.3's day slices after the owner's ruling on late spoilage (round 6 conflict e). The needs system that reads unmet demand arrives in M3.
- **Exit checks:**
  - in portions, every day and exactly: produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit, and city-preset shops spoil 0.5–3% of throughput (R6);
  - swapping the lot layout (packed against field arrays) leaves state hashes identical (R6).
