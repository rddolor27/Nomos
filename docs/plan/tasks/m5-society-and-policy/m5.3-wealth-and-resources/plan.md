# M5.3 Wealth and resources: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Wealth policies,** added to M5.1's `PolicySettings` with predicted Gini and negative-net-worth sizes from the Goods & wellbeing tab (R6):
  - a wealth tax of 0–3% a year above 4× mean net worth;
  - an estate tax of 0–70%;
  - a property tax of 0–2%, default 1%;
  - credit access of 0–2× income.
- **Honest limits.** Each wealth policy carries a note: Nomos has no avoidance channel, so top-end effects are upper bounds, given Denmark's long-run elasticity of about 0.5. The 3% setting is labelled as above Denmark's historical 2.2%.
- **The poverty-trap meter** counts households stuck at the credit limit for at least 5 years (R6).
- **A wealth term in LS, if enabled:** liquid wealth measured in years of settlement median income, +50 per year capped at +150, never by fixed coin thresholds (R6).
- **Presets with bands:** the euro-like and US-like wealth presets get CI bands, measured from a spawned start (M2.5).
- **Development presets** set productivity per sector from World Bank 2023 bands: 0.7, 1.5, 4.4 and 47 t of cereal per farm worker a year (R6).
- **Resource policies, each with a predicted size (R6):**
  - fishing effort: collapse above 0.75 r;
  - a logging quota: recovery in 70–85 years;
  - manure or fertiliser: an unfertilised floor of 0.35–0.45 of manured yield.
- **Food policies (R6):**
  - a markdown-and-donation policy predicting about 20% less shop waste;
  - a home-refrigeration subsidy moving homes from ambient to cool storage.
- **Harvest shocks** are logged scenario inputs, announced as forecasts with uncertainty, never surprises from a director (R6, M1.1's rule).

## Packages and files

- `packages/sim-core`:
  - `src/policy/wealth.ts`: the wealth, estate and property taxes, and credit access, all as transfers;
  - `src/policy/resources.ts`: fishing, logging and fertiliser;
  - `src/policy/food.ts`: markdown, donation and the refrigeration subsidy;
  - `src/wealth/poverty-trap.ts`.
- `src/economy/presets/development.ts`: the four productivity bands.
- `tools/analysis/policy_sizes.py`: checks each policy's measured size against its prediction from the design runner's logs.

## Interfaces and data

- **`PolicySettings` grows by:** `wealthTaxPpm`, `estateTaxPpm`, `propertyTaxPpm`, `creditMultiplePpm`, `fishingEffortPpm`, `loggingQuota`, `fertiliser`, `markdownDonation` and `fridgeSubsidyCents`.
- **The prediction table** from M5.1 gains each new policy's metric, size, band and source.
- **Scenario inputs:** `{ day, kind: 'harvestShock', region, sizePpm, forecastBandPpm }`, logged like player commands.

## Method and sources

- **Wealth policies, presets, the poverty trap and the honest-limits notes:** [R6 wealth notes](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), parts b, c and e, and the recommendation.
- **Resource dynamics and policy sizes:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), part b.
- **Food waste and storage:** [R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), part b.
- **Engel's law across presets:** the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md) and M2.6's check.

## Tests for the exit checks

- `policies move their metrics`: each policy's metric moves in the predicted direction, by roughly the predicted size, as an estimate claim on paired seeds.
- `Gini falls with the wealth tax`: sweep 0%, 0.5%, 1%, 2% and 3% from a spawned near-stationary state. The Gini falls monotonically, and every step's difference Holds as a comparison claim.
- `Engel across presets`: the food share falls about 7.8 points per doubling of income across the development presets.
- `no drift without policy changes`: over 50 years with default policies, the wealth Gini drifts by at most 0.03 and the top-10% share by at most 3 points.

## Risks and unknowns

- **Verify first:** Sanders's 21% shop-waste figure, before the markdown policy predicts from it (R6).
- **Fifty-year drift checks are long:** 5,600 days per seed. Keep them in the nightly job.
- **Resource collapse thresholds** depend on the regrowth model in M3.5 and M7. Re-check once M7's country resources exist.
