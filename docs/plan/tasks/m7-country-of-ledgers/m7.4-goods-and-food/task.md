# M7.4 Goods and food

Part of [M7 Country of ledgers](../milestone.md).

Needs M2's eight sectors and recipes, and M2's re-read of round 6's carrying cost and pest loss on the 112-day year.

- **Builds:**
  - the store extended with eight Int32 goods stocks and prices, a standing crop, Q16 fertility and weather, fish, forest and ore stocks as integer-valued Float64, and workers by sector, about 30 numbers in 130 B (R6);
  - the 12-number food block (a 6-slot perishable ring by days left {1, 2, 3, 4–6, 7–10, 11+}, two dated staple cohorts, eaten and spoiled), aged daily, with a second ring for weekly-market villages (R6); stored harvests kept as dated cohorts, never a single daily loss rate, which lost 19–29% of a year's harvest in testing against 0% for dated cohorts (R6);
  - goods stepped weekly, round-robin over seven days: extraction with logistic regrowth (Q24 rates, depensation below K/4), recipes, consumption, decay, then band prices clamped to 25–175% of base (R6);
  - storable seasonal goods stocked to demand × days to the next harvest, plus a carrying-cost drift of 1.5–3% a month (R6);
  - weekly market-day trade in grain, timber, metal and wares by margin per good (sea 1 : river 5–10 : road 23–52), with fresh food sent only under a day's travel and stone only to neighbours (R6);
  - settlement prices bounded by import and export parity plus transport cost, arbitrage flows when local prices leave the band, and market saturation as decaying demand memory, adapted from Norland's caravan ceiling (R6);
  - pre-retail food loss by group (fruit and vegetables 25.4%, meat 14.0%, roots 12.3%, cereals 8.4%), scaled by a cold-chain factor of 0.75–1.73 (R6).
- **Exit checks:**
  - the goods identity holds exactly per good every day, with spoilage as its own term, and harvest stores lose only pest loss (≤ 7% a season) (R6);
  - the fishery catch at u = r/2 lands within 0.1% of rK/4, and the ledger ring's waste stays within 1 point of an exact per-day ring on presets (R6);
  - seasonal price gaps run 17–33% in isolated villages and 2.5–3 times lower in integrated markets, and grain's price doubles at about 290 km by road (R6).
