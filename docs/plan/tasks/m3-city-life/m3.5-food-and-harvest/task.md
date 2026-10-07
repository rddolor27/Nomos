# M3.5 Food and harvest

Part of [M3 City life](../milestone.md).

Needs M2's dated shop lots, food prices and grades, and M3.1's farms. Pantry expiry follows M0.3's ruling on how late spoilage may land in day slices.

- **Builds:**
  - the grain season: crops accrue daily and are harvested over 9–14 days of autumn once a year (round 6's 30–45 days on the 112-day year) as dated lots, scaled by Q16 soil fertility and a keyed weather draw (SD 0.13–0.22, regional plus local) (R6, Calendar);
  - production shown through places only (stock pips; fields, forests and docks that empty and regrow), with at most four or five removable job items, none black; art exists; wire it in (R6);
  - each pantry as at most 8 Uint32 lots (`exp:16 | cat:3 | grade:2 | storage:2 | qty:9`) sorted by expiry, merging only equal keys, or into the same-category lot with the earlier expiry when full (R6);
  - the 6 × 3 shelf-life table from FoodKeeper and the FDA chart, with freshness derived from it, storage moves converted by integer proportion, and a 0.015–0.04% daily pest loss only for staples in poor storage (R6);
  - a 6-bit weekly category mask and an 8-item monthly FIES-style tally per household, and food poisoning at 0.01% per meal, ×10 when stale and 2% for spoiled food eaten when starving (R6).
- **Exit checks:**
  - with cool storage, households spoil 3–6% of purchased portions, a no-fridge, weekly-market variant spoils at least 15% of perishables, and no per-day random loss exists for perishables (R6);
  - in the default town, 5–15% of households score 4 or more on the tally (R6);
  - the harvest comes once a year in autumn, and stores carry the town through winter (Calendar).
