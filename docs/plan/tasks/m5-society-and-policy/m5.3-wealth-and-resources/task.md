# M5.3 Wealth and resources

Part of [M5 Society and policy](../milestone.md).

- **Builds:**
  - wealth-tax (0–3% above 4× mean net worth), estate-tax (0–70%), property-tax (0–2%, default 1%) and credit-access (0–2× income) policies, with the Gini and negative-net-worth sizes from the Goods & wellbeing tab (R6);
  - a note on each wealth policy that Nomos has no avoidance channel, so top-end effects are upper bounds (Denmark's long-run elasticity is about 0.5), and 3% labelled as above Denmark's historical 2.2% (R6);
  - the poverty-trap meter: households stuck at the credit limit for at least 5 years (R6);
  - if a wealth term is enabled, liquid wealth measured in years of settlement median income (+50 per year, capped at +150), never by fixed coin thresholds (R6);
  - euro-like and US-like wealth presets with CI bands, measured from a spawned start (R6);
  - development presets setting productivity per sector from World Bank 2023 bands: 0.7, 1.5, 4.4 and 47 t of cereal per farm worker a year (R6);
  - resource policies with predicted sizes: fishing effort (collapse above 0.75 r), logging quota (recovery in 70–85 years), and manure or fertiliser (an unfertilised floor of 0.35–0.45 of manured) (R6);
  - a markdown-and-donation policy predicting about 20% less shop waste, and a home-refrigeration subsidy moving homes from ambient to cool storage (R6);
  - harvest shocks as logged scenario inputs, announced as forecasts with uncertainty (R6).
- **Needs:** M2.5's household balance sheets; M2.4's goods and food; M3.5's harvest; M5.1's policy settings.
- **Verify first:** Sanders's 21% shop-waste figure, before the markdown policy predicts from it (R6).
- **Exit checks:**
  - every policy moves its metric in the predicted direction and by roughly the predicted size, and the Gini falls steadily as the wealth tax rises (R1, R2);
  - the food share falls about 7.8 points per doubling of income across presets (R6);
  - without policy changes, wealth drift over 50 years stays within 0.03 Gini and 3 points of top-10% share, and the wealth-tax Gini check runs from a spawned near-stationary state (R6).
