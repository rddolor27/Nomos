# M2.2b The economy on screen

Part of [M2 Economy](../milestone.md).

On 10 October 2026 the owner asked to see the economy run in the live app (owner request). Until now, M2.1–M2.3 ran it only headless, in tests and the CLI. [plan.md](plan.md) holds the rulings and the tasks.

- **Builds:**
  - **the town's economy:** `spawnFromLedger` spawns the first screen's town settled, from `CITY`'s ledger record (R*). It keeps the first screen's own crowd and runs `CITY`;
  - **the economy in the step:** every day starts with `economyDay`'s systems, one per tick, and a layoff shock arrives as a logged input through `world/inputs.ts`;
  - **the inspector:** a blob's job, employer and monthly wage, beside its name and wallet;
  - **the economy panel:** the mean price, the mean wage and unemployment by day, each with a data table, and the day's recent trades;
  - **speed:** M1.2's 1×, 4× and 16× buttons, brought forward so that a month passes in about 3 minutes at 16×.
- **Needs:** M2.3's `CITY`, with its exits off (M2.3 Ruling 19); M2.2's spawn and fold; M0.5's charts; M0.7's inspector.
- **Leaves for later:**
  - calibration, statistics and new speed budgets (owner);
  - money glyphs, bubbles and follow-the-money (M2.7);
  - the full inspector and the map's real homes (M3);
  - skipping, per-tier speed caps and the rest of the speed keys (M1.2);
  - slicing the economy for 100k agents (M6).
- **Exit checks:**
  - a town folds back into its scaled record exactly, in people and cents, and CI finds `CITY_RECORD` equal to a fresh `settledRecord(CITY)`;
  - a ticked town's economy equals `economyDay`'s on a twin after 21 days, and a checkpoint restored inside a day's economy ticks reaches the same hash;
  - `goldens.json`'s new `town` hash replays in Node and Chromium, and the economy golden stays `6a652730`;
  - no budget moves: first-load JS stays within 35 KB, and perf.yml's budget, allocation and startup gates pass with a town as the bench world;
  - clicking a blob shows its job, employer and wage. After Play, the panel shows each day's figures and trades, and axe finds no violations;
  - a logged layoff fires its people at the next day's start;
  - speed changes no hash: 1,000 ticks at 16× reach the same hash as at 1×.
