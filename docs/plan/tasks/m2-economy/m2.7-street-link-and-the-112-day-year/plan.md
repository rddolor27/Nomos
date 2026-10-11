# M2.7 Street link and the 112-day year: brief

> **Status:** two parts (owner request, 11 October 2026: "We should be able to see blobs eating and buying"). Part 1, life on the street, is a brief to build from after M2.2c's homes land; ask the owner for a go first. Part 2 becomes a step plan after Part 1.

**Task:** [task.md](task.md). Each task writes its code, then its tests (the main case and one edge), runs only those and a typecheck at `nice -n 19`, then commits. Bare sim paths are in `packages/sim-core/src/`.

## Part 1: life on the street

### Rulings

The architect's, 11 October 2026. The owner can overturn any of them.

1. **Where blobs buy.** A *premises* is a shop or stall in the place's map, and every firm row trades from its good's premises (row r from the (r mod n)-th of n). So "Bakery 12" is a business at the town's Bakery.
   - **The market** (stalls on the plaza) sells vegetables, fish and milk. **Shops** sell bread (the Bakery, `shop_bakery`, drawn), tools (the Smithy, `work_smithy`, drawn), cloth (the Draper) and fuel (the Fuel Store), the last two new fronts.
   - **The layout:** worldgen's `place/settlement.ts` gains `placeTrades`, after `placePlaza`. Towns, cities and capitals get the three food stalls (towns rise from 2 to 3) and the four shops on lots off the plaza, found as `placeVillageShop` finds its lot. A village's general shop or 1–2 stalls sell every good.
   - `sim-protocol`'s `map/premises.ts` reads each shop entity's frame as the goods it sells, so the map format doesn't change.
   - **Cost if wrong:** the place goldens and `town.nmap` move once, by M2.2c's script. Several premises per trade is one count in `placeTrades`.
2. **Money moves at the economy tick, as now (option a).** The trip is the purchase's visible consequence, later the same day.
   - `buyFood` and `shopDay` write each blob's first food and first goods firm of the day into two scratch columns, `dayFood` and `dayGoods`, which the trips read. `economyDay` stays the town's economy, so `6a652730`, `CITY_RECORD` and M2.3's calibration hold. The determinism cost is nil.
   - **Option b** (pay on arrival) would tie each sale's tick and each shop's stock to paths. `economyDay` could then no longer stand in for a town, and the design runner and every economy golden would need a street model, at a cost of weeks.
   - **The price of a:** the ledger leads the street by hours, so the card shows the debit before the blob walks out. The card adds "Bought 3 bread at Bakery 12".
3. **The day's timetable.** Ticks are minutes. Every time is a keyed draw on the new stream `STREET_DRAW` (0x10E), keyed (blob, day, purpose), and no rule reads a look.
   - **Night:** from 22:00 to 06:00 everyone is indoors at home.
   - **Work:** on the 5 workdays, the employed leave home at 06:00 + 0–59 minutes, go indoors at the employer's premises, and leave at 15:00 + 0–59.
   - **The food trip:** a blob with a food purchase today walks to that firm's premises. The employed go when home from work, and the rest at 08:00 + 0–479.
     - At the door it buys for 10 ticks under the coin bubble, then walks home carrying the good.
     - At home it eats one portion on its doorstep for 24 ticks, then goes in.
     - No trip starts after 19:00, since the ledger already holds the sale.
   - **The goods trip:** on a rest day, or out of work, a blob that bought goods makes a second trip in the afternoon, to the goods premises.
   - **Stall keepers:** each stall's first working employee stands at its counter through the workday, one tile behind the door. Other workers stay indoors.
   - **Opening hour:** a spawned or switched town opens at 06:00, as the worker runs ticks 0–359 at once with no snapshots, as M2.2c's switch runs out a day.
   - **Pure in the tick:** each phase ends at an absolute tick fixed when it begins, from a keyed time or the path's length. Nothing reads clocks, frames or speed.
4. **Paths: one flow field per premises.**
   - **The fields:** at spawn or switch, a breadth-first field toward each premises' door over the walk grid. It moves 8 ways without cutting corners, stores 1 byte a cell (the step toward the door), and breaks ties in a fixed neighbour order.
     - Highcourt holds 7 fields of 19,712 cells, 138 KB (computed), built in about 2 ms (inference).
     - Fields derive from the ground, so they sit in the arena outside the hash.
   - **A trip:** each trip leaves from home. At departure the field's path from the home door is written as at most 16 straight runs (heading, length), 32 bytes in the blob's errand row, with ties broken to go straight.
     - The blob walks the runs forward to the premises and backward to get home, so no home needs a field.
     - A heading is a multiple of 32, a step from `WALK_X_Q8` and `WALK_Y_Q8`, and the walker snaps to the cell centre at a run's end, so no trigonometry is needed.
     - A home that can't reach a premises within 16 runs takes no trip there.
   - **Blobs pass through each other**, as now. Buyers and eaters stand at a keyed point in the door's tile, as `populate` scatters spawns, so they don't stack.
   - **The step:** a town with premises runs `walkStreets` in `move`'s slot, under the same `SYSTEM_NAMES`. A world without premises, such as the stand-ins, the bench and the CLI, still runs `move`.
   - **The tick:** per walker the cost is a few adds, and a departure walks at most about 300 cells. That is well under 1 ms at 10,000 blobs (inference), and Task 4 measures it.
5. **State and determinism.**
   - **The errand store:** one row a blob at the arena's end, so no offset moves. A row holds the phase, premises, good, run index and step, the absolute end tick and the runs, 40 bytes, or 4 MB at the desktop tier's 100,000 rows (computed).
   - **The hash:** `stateHash` mixes the store in after the goods store while `TOWN` is 1. So `42/phone` `746a06a3` and the other non-town goldens hold, and `town` and Highcourt's pins move, as M2.2c moves them anyway.
   - **Writes:** the street step is movement. Like `move`, it writes positions and its own rows each tick, and never money, stock or economy rows.
   - **Allocation:** fields build only at spawn or in the `open` handler, so ticks allocate nothing.
   - **The culture wall:** `street/` joins the culture lint's guarded folders, since it reads jobs and homes.
6. **Carrying and eating, the same for everyone.**
   - **The visual word:** reserved bit 7 becomes `indoors`, which neither the Town skin nor the dots draw and `nearestAgent` skips. Bits 27–29 hold `item`, 0 or the good carried, and bit 30 `eating`, so the snapshot stays 12 bytes.
   - **One icon per good,** whatever the units or the wallet, held at a new `hold` point on each body frame. Facing up hides it.
   - **Eating** shows 3 frames, the food raised to a chewing face, timed from the snapshot's tick.
   - **The Town skin:** its people gain `item` and `eat` columns and draw the coin emote. A carrier adds one 12-byte instance to the place pass.
   - **Bytes:** the atlas grows by about 30 small frames, all loaded after interactive. The first-load renderer chunk gains only the dots' `indoors` test, about 100 B (inference).
7. **Trading, in this cut,** is the stall: the keeper is a blob. Each sale shows the buyer's coin bubble at the counter and the good passing to the buyer. Households selling their own goods at a stall need M3.5's pantries, so they wait for the owner's call.
8. **Glyphs.** Part 1 lands:
   - the purchase bubble, the existing `emote_coin`;
   - stock pips over each premises, 0–3 by its good's stock in the daily feed against a day's demand;
   - the closed stall at 0.

   The wage coin, the empty purse, `ECONOMY_GLYPHS` and follow-the-money are Part 2's.

### Tasks

The order:
- **Now:** Task 1 starts beside M2.2c.
- **After M2.2c's Task 1** (the port): Task 2. **After its Task 2** (one blob per bed): Tasks 3–5.
- **Then:** Task 6, then Task 7 once the owner picks, then Tasks 8 and 9.

**The smallest visible slice** is Tasks 2–6: blobs carry bread home from the Bakery, drawn with the existing `icons/food_bread_8`.

1. **Mockups** (`asset-designer`, Sonnet). In `docs/mockups/`, draw the asset list below on 3 hues and 4 facings, a street scene and the market. Check: the owner picks.
2. **Premises in the layout** (`sim-engineer`, Sonnet). The work is worldgen's `placeTrades`, and `place/frames.ts`, which gains the Bakery's and the Smithy's rows, with stand-in frames (the generic stall, `shop_general`) until Task 7, and `sim-protocol`'s `map/premises.ts`. Regenerate the place goldens and `town.nmap`.
   - Check: `premises.test.ts`, where every town of 2 worlds sells all 7 goods with each door on a walkable cell; edge: a village's one stall sells all 7.
3. **Fields and runs** (`sim-engineer`, Sonnet), in a new `street/` folder: `fields.ts` (`buildFields`) and `runs.ts` (`pathRuns(field, from, out)`).
   - Check: `fields.test.ts`, where every Highcourt home reaches every premises within 16 runs and the walked runs end on the door; edge: a walled-off home gets no runs. Print the most runs found.
4. **Errands** (`sim-engineer`, Sonnet; Opus if a twin fails for an unknown cause).
   - **Files:** `street/errands.ts` (the store, the timetable) and `street/walk.ts` (`walkStreets`); `STREET_DRAW`; `dayFood` and `dayGoods` in `consumption/food.ts` and `shop.ts`; the step's choice in `step/step.ts`; the hash rule; the 06:00 opening in `sim-worker`'s loop.
   - **Goldens:** regenerate `town` and Highcourt's pins.
   - Check: `errands.test.ts` on Highcourt over 2 days, where a blob that bought bread walks home, Bakery, home, carrying bread, and eats on its doorstep. A twin replays to the same hash, and the non-town goldens don't move. Edge: a blob with no purchase stays indoors. Time `walkStreets` at Highcourt and at 10,000 blobs.
5. **The visual word** (`sim-engineer`, Sonnet). `sim-protocol`'s `visual.ts` gains `indoorsOf`, `itemOf` and `eatingOf`, and `packVisual` takes all three. `writeSnapshot` fills them from the store.
   - Check: `visual.test.ts`, a round trip of each field; edge: item 7 with `indoors` leaves look and `trueOnly` unchanged.
6. **Drawing** (`render-engineer`, Sonnet). `place/people.ts` and `place/sprites.ts` draw the item at `hold`, the eat frames and the emote. `town/people.ts` fills them and skips `indoors`, and so do the dots. Until Task 7, the 8 × 8 food and goods icons stand in.
   - Check: `town-people.test.ts`, where a carrying walker draws its item over its body; edge: an indoors blob draws nothing, and a frame allocates nothing.
7. **Sprites** (`asset-designer`, Sonnet), after the pick. `characters.py` gains `hold` and the chewing faces, `icons.py` the carried goods, and `buildings.py` the stalls and fronts with snow. Add `assets/LICENSES.md` rows and rebuild the atlas. Swap Task 2's stand-ins and regenerate the place goldens.
   - Check: `python tools/sprites/test_sprites.py`; edge: each carried good is the same frame on all six hues.
8. **Pips and the card** (`senior-game-engineer`, Sonnet). Draw the stock pips and the closed stall from the daily feed, and add the card's "Bought" line.
   - Check: `street.spec.ts`, where at 16× by 10:00 a blob carries bread, one eats and the Bakery shows pips, and axe passes; edge: a good with 0 stock shows the closed stall.
9. **Close** (the coordinator). Push. The owner starts perf.yml once, since the tick path changed. Then one `determinism-review` on Opus.

### The asset list (for the `asset-designer`)

GBA-era top-down pixel art, original only, in `spritekit.PALETTE`, 1-px `OUTLINE`, lit from the top left. Nothing is black, nothing marks wealth, and signs are pictograms with no words.

| Sprite | Size | Frames and states |
| --- | --- | --- |
| `icons/carry_<good>`: bread, vegetables, fish, milk, cloth, tools, fuel | 8 × 8 | 1 each: a loaf, a bunch of greens, a fish, a jug, a folded bolt, a hammer and saw, a bundle of firewood. No sack (content rule 3) |
| `hold` on every body frame | a point | stand and walk 0–1, for down, left and right; facing up hides the item |
| `characters/face_chew_<0,1>_<facing>` | on the 18 × 22 canvas | 2 frames for down, left and right; eating is these faces with the item raised 0, 2 and 3 px |
| `buildings/shop_market-stall_<good>`, for vegetables, fish and milk | 48 × 48, 3 × 2 | open, with its good on the counter; the existing closed stall serves all three |
| `buildings/shop_draper` and `shop_fuel-store` | 64 × 48, 4 × 2 | open, plus `_snow` through `buildings.snowfall()`; a cloth or log pictogram sign, and a woodpile prop for fuel |
| `icons/pip_stock_<1,2,3>` | 8 × 8 | 1–3 dots on a small board over a premises |

The coin bubble (`emote_coin`), the Bakery and the Smithy exist. Mockups go to the owner first.

### Risks and open questions

- **The owner:** nights are indoors, so streets stand empty 8 hours in 24, 48 s of each 144-s day at 1× (computed). Keep that, or pass nights faster?
- **The owner:** 82% of jobs are cloth, tools and fuel, so about 2,000 of Highcourt's 2,688 blobs stream into three premises each morning (computed). Accept that until Part 2's sectors send them to farms and docks, or place several premises per goods trade now?
- **The owner:** household stalls (Ruling 7), after M3.5's pantries.
- **Measure:** commutes of 120–240 ticks each way (inference) may crowd out the evening trip, so Task 4 counts the trips skipped after 19:00. Also measure the opening's 360 ticks in the worker, and the most runs per path.

## Part 2: the 112-day year and the money glyphs (later)

Part 2 becomes a step plan against the code as it then stands.

- **One glyph per economy event, everywhere.** An `ECONOMY_GLYPHS` table maps each event kind to one frame. The bubble pass (M1.3), the event log, uPlot markers and the chart legend all read it.
  - Wages: a coin with "+".
  - A purchase: Part 1's coin.
  - Bankruptcy: an empty purse, and a closing shutter on the stall.
  - Stock: Part 1's pips.

  Draw the wage coin and the purse in `tools/sprites` under the art rules ([R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md)).
- **Price-chart ticks** come from the same event stream as purchase bubbles, sharing an event id and a sim tick, so they coincide in a replay.
- **Follow the money (R1, R3):** an overlay animates coins along straight paths between counterparties for the selected agent's transfers. It reads ledger transfer events only, and shows amounts only in the follow view, never as marks on bodies, clothes or houses. M2.7 ships it with a minimal developer panel, and M3's inspector mounts it.
- **Recalibrate to the 112-day year** ([calendar.md](../../../calendar.md), "Rescaling rules"):
  - daily wage = annual income ÷ 80 workdays;
  - prices keep the calibrated shares of income;
  - interest, debt limits and loan terms are per in-game year;
  - annual rates convert to daily ones through exact build-time tables in `packages/sim-core/scripts/rates.ts`. Hazards use p_day = 1 − (1 − p)^(1/112) and interest (1 + r)^(1/112) − 1, since at 20% a year the hazard formula runs about 22% high (computed).
- **Files:**
  - `tools/sprites/icons.py`;
  - `sim-protocol`'s `events.ts`, which holds the event record `{ id, tick, kind, from, to, cents }` in M1.3's pooled buffer and `ECONOMY_GLYPHS: Record<EconomyEventKind, FrameName>`;
  - `render-gl`'s `follow-money.ts`;
  - `apps/web`'s log, markers, legend and panel;
  - the M2.3 and M2.5 presets, re-tuned.
- **Tests:**
  - every kind has one glyph, one to one;
  - over seed 42's 3 days, each price tick has a purchase bubble of the same id and tick, apart from bubbles the cap sent to the ticker, which keep the id;
  - over 50 paired seeds, food and saving shares and the Gini hold their bands, with housing added once M3's rents exist;
  - the daily wage apportions leftover cents exactly across the year.
- **Pitfalls:**
  - daily interest on small balances floors to 0 cents, so accrue monthly or carry a remainder;
  - event ids come from the sim in tick order;
  - bankruptcy glyphs attach to the stall, never a person.
- **Open:**
  - **The owner:** what a day's wage should read as, suggested a mean of 100 coins, before the step plan.
  - **Measure:** peak economy events per tick in the city preset at 10,000 agents, to size the pool.
  - **Research:** whether round 6's 1.5–3% monthly carrying cost and ≤ 7% seasonal pest loss are per day or per year; suggested physical losses per day and the carrying cost per year.
