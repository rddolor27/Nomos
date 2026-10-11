# M2.7 Street link and the 112-day year

Part of [M2 Economy](../milestone.md).

- **Builds, Part 1, life on the street** (owner request, 11 October 2026):
  - premises by trade in every town's layout: market stalls for vegetables, fish and milk, and a Bakery, Draper, Smithy and Fuel Store, with a village's stall or shop selling all seven goods;
  - errands that blobs walk on one flow field per premises: home to work and back, and home to the shop of the day's purchase and back, carrying the good, then eating on the doorstep, while money still moves at the economy tick;
  - carried goods (one icon per good, the same for everyone), eating frames, indoor blobs that aren't drawn, the purchase bubble, stock pips on premises, and stall keepers who sell to buyers at the counter.
- **Builds, Part 2:**
  - the rest of the economy glyphs (a coin with "+" for wages, an empty purse and a closing shutter for bankruptcy), with one table driving bubbles, price-chart ticks and the legend (R3);
  - a follow-the-money view in the inspector that animates coins between counterparties (R1, R3);
  - recalibration to the 112-day year: daily wage = annual income ÷ 80 workdays, item prices that keep the calibrated shares of income, and interest, debt limits and loan terms per in-game year (Calendar).
- **Needs:** M2.2c's homes, then M2.4 Part 1's goods and feed for Part 1; M1.3's bubble pass and M0.5's charts for Part 2. The inspector itself is an M3 task (R1), and the housing share in the last check needs M3's rents and mortgages.
- **Verify first:** round 6's calibrated targets on the 112-day year, including the 1.5–3% monthly carrying cost and the ≤ 7% pest loss a season. They decide daily wages, prices and storage rates, though the storage rates apply only in M3 and M7.
- **Exit checks, Part 1:**
  - in Highcourt over 2 days, a blob that bought bread walks home, Bakery, home, carrying bread, and eats on its doorstep, and a logged twin replays to the same hash;
  - the non-town goldens and the economy golden `6a652730` don't move, since money still moves at the economy tick;
  - in the browser at 16×, by 10:00 a blob carries bread, one eats and the Bakery shows stock pips, and axe passes;
  - every carried good draws the same frame on all six hues, and the street step allocates nothing per tick.
- **Exit checks, Part 2:**
  - every economy event maps to exactly one glyph across bubble, log, chart marker and legend, and price-chart ticks coincide with purchase bubbles in a replay (R3);
  - over 50 paired seeds, food, housing and saving shares and the wealth Gini stay within their calibrated bands on the 112-day year (Calendar).
