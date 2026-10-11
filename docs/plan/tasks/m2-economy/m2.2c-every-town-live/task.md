# M2.2c Every town runs the sim

Part of [M2 Economy](../milestone.md).

On 11 October 2026 the owner chose Step 2: every town runs the sim (owner). Today the first screen's town, Highcourt, is crowded and alive. A town opened from the world map shows only a thin decorative crowd and runs no sim. This step makes every town the same kind of thing. [plan.md](plan.md) holds the rulings and the tasks.

- **Builds:**
  - **one ground for every town:** a TypeScript port of `export_map.py`'s walk grid and buildings, so any place gives the sim its walkable tiles and its homes with beds. Highcourt's `town.nmap` becomes this port's output for place 0;
  - **one blob per bed:** a town's people fill the beds of its drawn houses, in households of 1–6. Highcourt drops from 3,965–7,931 blobs to 2,688, on every tier;
  - **each town's record:** every settlement has a ledger row in the arena. A town's first record is `CITY`'s settled record scaled to its beds, with a household-size mix;
  - **switching towns:** entering a settlement from the map logs a focus input. At the next day boundary the worker folds the live town into its row and spawns the new one from its own;
  - **one live view:** a town opened from the map runs in the main view, drawn by the Town skin, with the inspector, the blob card and the economy panel. The decorative walkers, walk loops and street crowd go.
- **Needs:** M2.2's spawn and fold, with its households of 1–6; M2.2b's town, the Town skin and the economy panel; M3.1's place builder and map worker; M2.4 Part 1's goods, which spawn and fold already carry.
- **Leaves for later:**
  - trips to work and shops, and firms seated in drawn buildings (Step 3);
  - away towns that advance as ledgers, and districts beyond the one drawn (M9);
  - pooled household money, dependants and ages (M2.5 and later);
  - saves that hold the ledger table (M6).
- **Exit checks:**
  - the TypeScript port writes `town.nmap` byte for byte as Python wrote it, and its `--check` runs in CI;
  - Highcourt spawns 2,688 blobs in its 387 drawn homes with no bed empty or over-full, in households of 1–6. Every settlement of 2 worlds spawns and folds back exactly, in people and cents;
  - the blob card's "Lives with" names the other members of a blob's household, and "House N" is a drawn house;
  - a town left and re-entered spawns from its folded row exactly, and money plus MINT sums to zero across the switch;
  - a switch logged mid-day applies at the next day boundary, and a twin given the same log reaches the same hash at tick 3,000. `goldens.json`'s new `switch` hash replays in Node and Chromium;
  - in the browser, entering a town from the map shows its own blobs live in the Town skin, the economy panel restarts for it, and Back reaches Highcourt's folded crowd;
  - no budget moves: first-load JS stays within 35 KB, and perf.yml's budget, allocation and startup gates pass.
