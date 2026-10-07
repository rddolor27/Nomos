# M2.7 Street link and the 112-day year

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - the economy glyphs (a coin with "+" for wages, an empty purse and a closing shutter for bankruptcy, stock pips on stalls), with one coin glyph for bubbles, price-chart ticks and the legend; the coin, its bubble and a closed market stall exist, so draw the wage coin, the purse and the stock pips, then wire them in (R3);
  - a follow-the-money view in the inspector that animates coins between counterparties (R1, R3);
  - recalibration to the 112-day year: daily wage = annual income ÷ 80 workdays, item prices that keep the calibrated shares of income, and interest, debt limits and loan terms per in-game year (Calendar).
- **Needs:** M1.3's bubble pass and M0.5's charts. The inspector itself is an M3 task (R1), and the housing share in the last check needs M3's rents and mortgages.
- **Verify first:** round 6's calibrated targets on the 112-day year, including the 1.5–3% monthly carrying cost and the ≤ 7% pest loss a season. They decide daily wages, prices and storage rates, though the storage rates apply only in M3 and M7.
- **Exit checks:**
  - every economy event maps to exactly one glyph across bubble, log, chart marker and legend, and price-chart ticks coincide with purchase bubbles in a replay (R3);
  - over 50 paired seeds, food, housing and saving shares and the wealth Gini stay within their calibrated bands on the 112-day year (Calendar).
