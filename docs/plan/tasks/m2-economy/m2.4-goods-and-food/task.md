# M2.4 Goods and food

Part of [M2 Economy](../milestone.md). It runs in two parts: Part 1, the visible cut the owner asked for on 11 October 2026, then Part 2, the rest.

- **Builds, Part 1** (owner request, R6):
  - seven goods, one to each supplier link: bread, vegetables, fish and milk as food in portions, and cloth, tools and fuel in units, with each firm selling one in exact shares and keeping Lengnick's price rule for it;
  - food dated by the day it was made, in a 16-day ring per shop, sold oldest first and spoiled at the day's start after 3–14 days on sale;
  - 3 portions a day for every blob, bought before other goods from a month's set-aside, with each portion it can't afford or find logged as unmet for M3's needs system;
  - food shops that hire when they run short and shed a worker after wasting a worker-month of output;
  - each good's daily sales, stock, price and spoilage, and food eaten and short, in the flow log, the feed and the economy panel, with trades that name the good and the shop.
- **Builds, Part 2:**
  - one of eight sectors per firm (grain, fresh food, timber, stone, metal, fuel, wares, services), with an integer recipe of at most two inputs, one output and worker-days per batch (R6);
  - the wholesale call auction once per tradable good, never for services, with unmet demand per good logged for the needs system (R6);
  - household baskets per good, seeded from ICP 2021 shares by development preset (food 45 / 33 / 19 / 9% of consumption) with the Stone–Geary rule (R6);
  - shops stocked with dated food lots in six categories (≤ 32 per shelf), sold first-expiry-first, with expired lots moved to per-category waste counters only at the day boundary (R6);
  - food priced as base × grade (100 / 135 / 180%) × freshness (100% fresh, 75% stale, 50% last day) in integer cents, flooring after each multiply, with markdown sales and waste logged per category (R6);
  - food grade chosen from the household's consumption budget per adult relative to the price index, never from a wealth band, with food value kept as a memo line outside net worth and tax bases (R6).
- **Needs:** for Part 1, M2.3's `CITY` and M2.2b's town, feed and panel; for Part 2, Part 1, and M0.3's day slices with the owner's late-spoilage ruling, `skip-expired` (round 6 conflict e, decided 8 October 2026). The needs system that reads unmet demand arrives in M3.
- **Exit checks, Part 1:**
  - in portions, every day and exactly, each food's made = sold + spoiled + Δstock, and eaten = food sold (R6's identity, without trade or in-transit);
  - `LENGNICK` replays unchanged: the economy golden `6a652730`, `42/phone` `746a06a3`, the other tick goldens and the 20 spawn hashes hold, and `{ ...CITY, goods: 0 }` matches M2.3's `CITY` exactly;
  - a ticked goods town matches `economyDay` on a twin;
  - on 50 fresh seeds, `CITY`'s tier-1 targets hold or are recorded here as gaps, with food's share of spending reported against ICP's upper-middle 18.6%, and the shares of food spoiled and short reported;
  - the panel shows the day's goods and the food chart after Play, and axe passes.
- **Exit checks, Part 2:**
  - in portions, every day and exactly: produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit, and city-preset shops spoil 0.5–3% of throughput (R6);
  - swapping the lot layout (packed against field arrays) leaves state hashes identical (R6).
