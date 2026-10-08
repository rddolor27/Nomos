# M7 Country of ledgers: sub-milestones

M7 holds 30 build tasks and 14 exit checks in the [implementation plan](../../implementation-plan.md#m7-country-of-ledgers), so it runs as seven sub-milestones. Each one ends with a headless country that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the later estimates can be rescaled to the measured pace. The plan's own M7 effort line, 19–28 days with 5–8 of them for the emulator, comes from round 4. The Calendar plan adds 0.5 days and the Military plan 1–2. Rounds 5, 6 and 8 add work nobody estimated, mostly round 6's goods and wellbeing blocks. With those, the sub-milestones below come to 37–59 days.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M7.1 Ledgers and national accounts](m7.1-ledgers-and-national-accounts/task.md) | Integer settlement ledgers on a test country, with one treasury and one issuer | 7–11 days | | | |
| [M7.2 Emulator](m7.2-emulator/task.md) | Ledger hazards fitted from the city model and docked against it | 5–8 days | | | |
| [M7.3 Flows and villages](m7.3-flows-and-villages/task.md) | Trade, migration and commuting between settlements, village rules and the country CI suite | 8–11 days | | | |
| [M7.4 Goods and food](m7.4-goods-and-food/task.md) | Eight goods stepped weekly, dated food, harvest stores and trade priced by distance | 6–10 days | | | |
| [M7.5 Happiness, wealth and WASM](m7.5-happiness-wealth-and-wasm/task.md) | Happiness and wealth blocks, and a WASM settlement model inside the 12 ms budget | 5–9 days | | | |
| [M7.6 Cultures](m7.6-cultures/task.md) | Culture counts per settlement, kept exact through births, switching and migration | 4–6 days | | | |
| [M7.7 Spin-up and patrols](m7.7-spin-up-and-patrols/task.md) | A 50–100-year spin-up, skip-ahead, garrisons and road patrols | 2–4 days | | | |
| **Total** | | **37–59 days** | | | |

Three decisions apply throughout:
- **The ledger owns history.** Agents never write it (shadow-canonical), so one seed yields the same country wherever anyone looks.
- **A year is 112 days.** Annual rates, hazards and test horizons run per 112-day year, and daily hazards come from 1 − (1 − p)^(1/112) in build-time integer tables (Calendar).
- **Settlement counts are provisional.** Round 9's standard 96×64 world lists only 40–61 places, and M8 re-baselines M7's counts to listed places plus a region tier (R9). Until then, the 1,000- and 10,000-settlement budgets run on M7.1's terrain-free generator.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
