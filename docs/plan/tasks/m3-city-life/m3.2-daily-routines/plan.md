# M3.2 Daily routines: brief

> **Status:** a brief for blobs with lives of their own (owner, 12 October 2026). Nothing is built until the owner says go. Task 8, the riskiest, gets a step plan on Opus first.

**Task:** [task.md](task.md). Each task writes its code, then its tests (the main case and one edge), runs only those and a typecheck at `nice -n 19`, then commits. Bare sim paths are in `packages/sim-core/src/`.

## Rulings

These are the architect's rulings of 12 October 2026. The owner can overturn any of them.

1. **Needs and personality.**
   - **Needs:** `hunger`, `rest`, `fun` and `company`, each a `Uint16` from 0 (met) to 65,535. Each changes at a whole-unit rate a tick for the blob's state.
   - **Settling:** a need settles only when the state changes, as level + rate × ticks since an `Int32` settle tick, clamped. That is a per-tick update with no decay pass (R6's rule, without its deadlines). Chats and meals relieve in one lump.
   - **Hunger** (M2.4): `buyPortions` writes `dayPortions` beside `dayFood`. Once the day's food is home, each doorstep meal eats a portion and relieves a third of a day's rise. So meals never exceed what the economy sold.
   - **Rest** falls in the night indoors (22:00–06:00, as built) and in naps at home.
   - **Money is the work duty,** not a level: workers keep M2.7's keyed shift. No need reads a wallet (content rule 5).
   - **Personality:** three bytes, `sociable`, `homebody` and `restless`. `spawn/spawn.ts` draws them at birth as `draw1(seed, TRAIT_DRAW, id)`, from the id that look and name key on. They never come from a look or a culture.
2. **Choosing (R1's utility scoring).**
   - **When:** a blob decides only when its `endTick` comes; R1's dot also "thinks only when its activity ends". M2.7's `endTick` scan is the schedule, at 0.077 ms a tick for 10,000 blobs, walking included (measured, `interfaces.md`, Street link Task 4). A bucketed wheel waits for a failing gate.
   - **Score:** a Q16 product of integer ramps and squares. The inputs are a need, a trait, the time left, a site's crowd and the Manhattan way in ticks, a lower bound of the fields' metric. A zero vetoes, and a choice must end, with its way home, by 21:30.
   - **Pick:** a keyed draw on `LIFE_DRAW` among the top three, weighted by score. `pathRuns` gives the real ways; a missing way passes the turn on.
   - **Systems:** `move` walks and lists who is due, then `life` decides and `chat` pairs. `life` and `chat` join `SYSTEM_NAMES` after `economy`, so each meets its own budget row.
   - **Cost** (inference): 6 decisions a blob a day at about 2 µs, 0.84 µs of it a measured `pathRuns`. That is 0.13 ms a tick at 10,000 blobs and 1.25 ms at 100,000, against 1.2 and 1.4 ms for the decisions and pathfinding rows. If 100,000 fails, decisions past a per-tick cap wait a tick.
3. **Activities.** `phase` says where and how a blob is. A new `activity` byte says why, so M2.7's purposes leave the phase.

   | Activity | Where | Ticks | Eases | Shows |
   | --- | --- | --- | --- | --- |
   | Work | the employer's premises | the shift | company, a little | the commute |
   | Fetch | the purchase's premises: after work, on the way or when near | 10 | starts meals | the coin, then the good carried |
   | Eat | its doorstep | 24 a portion | hunger | eating frames |
   | Sleep, stay in | home | night; 30–120 | rest; company with family | indoors |
   | Doorstep | its door tile | 30–120 | fun; company by chats | sitting |
   | Plaza | a plaza spot | 30–120 | fun, company; more with a crowd, capped at 40 | the ball |
   | Green, water | a spot or bench | 30–120 | fun, rest | music; a heart by water |
   | Browse | a premises' front | 10–30 | fun | facing the front |
   | Wander | a keyed site nearby | 0: it decides there | fun | walking |
   | Visit | a friend's home | 60–120 | company, friendship | a question if nobody is home |
   | Chat | where two free blobs meet | 20–60 | company, friendship | speech bubbles |

   - **The mailbox:** chats use R5's per-cell aggregate, one waiting blob per 2 × 2-tile cell, stamped with the tick.
   - **Lookers:** each tick a quarter of blobs (`(i + tick) & 3` of 0) may look. A looker must be out and free, and lonelier than a threshold that sociability lowers.
   - **Pairing:** a looker pairs with a free blob within 1.5 tiles in its cell, or waits there: one exact check, under the cap of 16.
   - **The chat:** the pair stops face to face. `endTick` moves on by the chat's length, and walkers pause until `chatUntil`. No chat starts after 21:00.
   - **Signs:** an outing's sign shows a quarter of the time, staggered by blob.
4. **Friendships.** Six slots a blob, each a friend + 1 (`Int32`) and a strength (`Uint8`), 30 bytes in all.
   - **Strength:** a chat adds 32 to both sides, capped at 255. A newcomer takes a free slot, or one under 32. Each day's first decision fades every slot by 4, so an unmet friend is gone in about 64 days.
   - **Visits:** a keyed draw weighted by strength picks the friend. A host at home eases both blobs' company; a host away turns the visitor back. The household is the family, easing company at home.
   - **Only the card shows friendship.** Every chat shows the same bubble, and the heart is one blob's own pleasure.
5. **Determinism and M2.7's street code.**
   - **The timetable:** Tasks 3–7 hand the chooser any free time before 21:30. Task 8 cuts the timetable to the night, the wake and the shift.
   - **Sites** are premises plus leisure places: the plaza (its fountain, or a village's well), meadow greens and up to 3 water edges.
     - `sim-protocol`'s `map/leisure.ts` finds them in the map. Frames and terrain alone couldn't tell a green from a field, so the generator declares the plaza and the greens as `ENTITY_PLAZA` and `ENTITY_GREEN`. Water banks come from terrain (Task 2, as built).
     - `MAX_SITES` is 32, a field each: 631 KB at 176 × 112 (computed). Highcourt's 29 take 571,648 bytes and a median 16.5 ms to build (measured, Task 2).
   - **Legs:** a leg runs forward on a site's field to the site, or backward along a cell's own runs to a home or spot. So no home needs a field.
     - Between two cells, both ways run to the hub with the least Manhattan sum, and the walk switches where they meet.
     - Stamping cells in a scratch grid finds the meeting point.
     - An unfetched purchase makes its premises the hub.
   - **The store,** `life/store.ts`, sits at the arena's end, so no offset moves.
     - It holds 64 hashed bytes a blob: needs 8, settle tick 4, traits 3, the reason 1, purchases and portions 2, `chatUntil`, `chatWith`, `host` and the leg's end cell 4 each, and friends 30. It also hashes each site's crowd.
     - Task 2 put `activity` in the errand store, hashed there. The home cell, the household size and the hub sit outside the hash.
     - In all it is about 72 bytes a blob, 7.2 MB at 100,000 (computed). A blob then totals about 172 of the plan's 256 bytes (inference).
   - **The hash:** the store mixes in after the errand store while `STREETS` is 1. Only Highcourt's pins move, so `42/phone` `746a06a3`, the economy `6a652730` and the other goldens hold.
   - **Checkpoints:** every end is an absolute tick, so a checkpoint mid-chat replays.
   - **Money** moves only at the economy tick. The street reads `dayFood`, `dayGoods` and `dayPortions` and never writes them.
   - **Rows:** pairs and hosts write a second row in index order, deterministic on one worker. R7's chunked workers would plan pairs per chunk.
   - **The wall:** `life/` joins the guarded folders and may not import `money/`, since M4's crime will read where blobs are.
6. **What the owner sees:** the table's last column on the street. The card shows what the blob is doing and why ("Chatting with Wenda", "At the plaza: wants company"). It also shows its feeling (its strongest need past 60%), its needs and traits, its three strongest friends, and its top three options with scores (R1).
7. **Art:** three new 12 × 12 bubbles on `icons.py`'s base: `emote_speech`, `emote_music` and `emote_ball`. The heart, question and coin bubbles, `sit_*`, `prop_bench`, `prop_well` and the fountain already exist. Mockups go to the owner first.
8. **Dropped:**
   - Huff's shop choice (R1), since the economy picks the firm;
   - the bucketed wheel and dense lists (R5);
   - need deadlines (R6);
   - `scripts/curves.ts`;
   - R2's options.

## Tasks

**The order:** Task 1 beside Task 2, then Tasks 3 and 4, then Task 5 beside Task 6. That finishes the first visible slice: blobs chatting on the plaza, greens and doorsteps. Tasks 7 and 8 follow. Task 9 follows the owner's pick, Task 10 the payer call, and Task 11 closes.

1. **Mockups** (`asset-designer`, Sonnet), in `docs/mockups/m3.2-lives/`: the bubbles, a chatting pair, a doorstep evening, the plaza at 17:00, a bench by water and a visit turned back. Check: the owner picks.
2. **Sites and legs** (`sim-engineer`, Sonnet). Files: `map/leisure.ts`; site kinds in `street/shops.ts`; a new `street/legs.ts`; home cells and hubs in `street/open.ts`; the `activity` split in `errands.ts` and `timetable.ts`.
   - **Check:** `legs.test.ts`. Every Highcourt home reaches the plaza and back, and two homes' legs meet and end at the other's door. Edge: a cut-off home gets none.
   - **Print:** each detour over its Manhattan length, mean and 90th percentile.
3. **The life store and free time** (`sim-engineer`, Sonnet). Files: `life/store.ts`, `traits.ts`, `needs.ts`, `choose.ts` and `activities.ts`; traits in `spawn/spawn.ts`; `TRAIT_DRAW` (0x10F) and `LIFE_DRAW` (0x110); the `life` system and due list in `step/step.ts` and `street/walk.ts`; the hash; the guard lists. Free time goes to staying in, the doorstep, the plaza or a green.
   - **Check:** `life.test.ts` on Highcourt's day 0, where blobs who made the morning's food trip are free:
     - by 14:00 blobs stand at plaza spots;
     - all are home by 22:00;
     - a twin replays from a 13:30 checkpoint.
   - **Edge:** no time left means bed, as before.
4. **Chats** (`sim-engineer`, Sonnet). Files: `street/chat.ts`, `chatUntil` and `chatWith`, the walk's pause, and the emote ids in `sim-protocol`'s `visual.ts` and `snapshot/street.ts`. Check: `chat.test.ts`, where two free walkers in a cell stop face to face under bubbles, then arrive exactly the chat's length late. Edge: a blob going to work never stops.
5. **Drawing** (`render-engineer`, Sonnet). `town/people.ts` maps the emotes and draws sitting at spots, with stand-in bubbles until Task 9. Check: `town-people.test.ts`, where a chatting pair draws two bubbles. Edge: a blob indoors draws none.
6. **The card** (`senior-game-engineer`, Sonnet). `inspected` gains activity, reason, partner, needs and traits, read through `blobReply` and `panels/inspector.ts`. Check: `inspector.test.ts` covers each activity's words, and in `street.spec.ts` a pair chats on the plaza at 16× by 14:00 on day 0, with axe passing.
7. **Friendships and visits** (`sim-engineer`, Sonnet). Files: `life/friends.ts`, visits in `choose.ts` and `legs.ts`, the household at home, and the card's Friends row.
   - **Check:** `friends.test.ts`:
     - blobs who chat daily become friends within 5 days, and drift apart once they stop;
     - a visit ends indoors at the friend's.
   - **Edge:** a friend away turns the visitor back.
8. **The whole day by needs** (`sim-engineer`, Sonnet; Opus for the step plan or a failure of unknown cause). It adds hunger through `dayPortions`, naps, water and browsing outings, wandering, fetching by deadline, nearness and hub, and the win counters. Its [step plan](#task-8-step-plan) is below.
   - **Check:** `life-day.test.ts`, over 2 worlds × 28 days:
     - every activity wins and loses;
     - each purchase with a way is fetched by 22:00, and meals stay within portions;
     - departures peak within ±1 hour of shift starts and ends;
     - nobody is out at 23:00;
     - the non-street goldens hold.
   - **Timing:** time `life` and `chat` at 10,000 and 25,000 blobs.
9. **Sprites** (`asset-designer`, Sonnet), after the pick: the bubbles in `icons.py`, `assets/LICENSES.md` rows and the atlas. Check: `test_sprites.py`. Edge: each glyph stays inside its bubble.
10. **Soldiers** (`sim-engineer`, Sonnet), after the payer call: `labour/soldier.ts`, shifts like any job, the helmet off at home (Military). Check: the sprite test's sheathed-weapon case, and a soldier's day.
11. **Close** (the coordinator):
    - push;
    - the owner starts `perf.yml` once;
    - run one Opus `determinism-review`.

## Task 8 step plan

> **Opus, 12 October 2026,** for one Sonnet `sim-engineer`, once Task 7 and the polish are pushed. Each step writes its code, then its tests (the main case and one edge), runs only those and `nice -n 19 pnpm --filter <package> typecheck`, and commits. A step that moves the street sim reruns `node packages/sim-core/scripts/goldens.ts`, whose diff may change only `streets`, and re-pins `town-map.test.ts`. New `ACTIVITY_*` codes and `LIFE_DRAW` purposes follow Task 7's.

### Rulings for Task 8

The architect's, 12 October 2026. The owner can overturn any.

1. **A fetch is a chain of stops.** It walks from home, or from work when the shift ends, to each waiting purchase's premises: goods first, then food, 10 ticks at each door. Then it walks home on the last premises' field, by 22:00.
   - Each hop is one `pathRuns` on the next premises' field, so the premises is the hub.
   - When both stops don't fit, goods is dropped first. A dropped purchase is missed for the day.
2. **A waiting purchase keeps the blob at home.**
   - Outings, browsing, wandering and visits wait until nothing waits, and home stays end by the deadline.
   - A waiting blob neither looks for a chat nor waits for one.
   - So no chat or outing makes a blob miss a fetch it could make, and every walk out starts at home.
3. **The deadline** is the last tick the chain can leave home and be back by 22:00.
   - Fetch's drive ramps from a floor to the full range over the 240 ticks before it. With under 30 ticks left, the fetch is forced.
   - "Near" is the way term, and "on the way" is the walk home from work.
   - A stop on the way to work is Step 2b, built only on Step 0's figure.
4. **Hunger rises 20 a tick in every mode, bed included:** 28,800 a day.
   - A meal relieves 9,600 over its 24 ticks, at `MODE_EAT`'s 400 a tick, so Eat scores like any stay. Ruling 1 had a lump.
   - Food coming home starts the first meal, and the rest are chosen while `portions` lasts.
5. **The life system plans every walk that needs a path.** A shift's end and a buy's end list the blob as due, as `parkFree` does. So `move` keeps its 0.748 of 0.88 ms at 100k (measured, M3.1 Task 23), and the paths count in `life`'s row.
6. **The day's first choice falls at 06:00 plus a keyed 0–119 ticks.** Otherwise every blob not at work, all 100,000 on a rest day, would choose in one tick (inference).
7. **Wander** walks to a spot at a keyed site among the 4 nearest, of any kind.
   - There it chooses between that site's stay and home, and never goes on to a second site.
   - So a walk home is always the way out backward, and the chat's `dueHome` stays exact.
8. **A water edge covers the 3 × 3 tiles round its bank** in `leisureOf`, so its sitters stand a tile apart. A browser stands facing a premises' front, on the least-held tile of the 3 × 2 at its door.
9. **Win counters** count, for each option, the choices where it scored above 0 and the ones it won, outside the hash. A forced choice counts in neither.

### Data

- **The errand store:**
  - `dayPortions` (`Uint8`, hashed, after `dayGoods`): `buyPortions` adds what it sells, and `openDay` clears it.
  - `siteTicks` (`Uint16`, `MAX_SITES` squared, outside the hash like `siteX`): ticks from site a's door to site b's, on b's field, or `NO_WAY`. `createStreets` builds it: 812 `pathRuns` at Highcourt, about 0.7 ms (computed from 0.84 µs a path).
- **The life store, hashed:**
  - `purchases`, with bits `WAITING_GOODS`, `WAITING_FOOD`, `FETCHED_GOODS` and `FETCHED_FOOD`;
  - `portions`, the food at home not yet eaten;
  - `wayGoods` and `wayFood` (`Uint16`): 0 until the life system first needs one each day, then the ticks from home + 1, or `NO_WAY`.
- **Outside the hash:** `candidates` and `wins`, an `Int32` for each option.
- **In all:** 7 bytes a blob and 2 KB, or 0.7 MB at 100,000 (computed). A chain's fit is then a sum, with no `pathRuns`.

### Steps

0. **Measure first,** in a scratch script that is not committed. Use Highcourt on seeds 42 and 7, days 0–6, and today's code.
   - For each purchase, ask whether its chain fits by 22:00. A blob not at work starts from home at 06:30, and a worker from its employer's door at its drawn shift end.
   - Print the shares for food and goods, and for workers and others.
   - If over a third of workers' food can't fit, the coordinator settles Step 2b before Step 2.
1. **Portions and the store,** in `street/errands.ts`, `consumption/food.ts`, `economy/economy.ts`, `street/open.ts` and `life/store.ts`. It adds the data above and changes no behaviour.
   - **Test,** `portions.test.ts` (sim-core): a day's `dayPortions` sum to its `eaten` stat and clear the next day, and `siteTicks` matches `pathTicks` of `pathRuns`.
   - **Edge:** a site cut off from another reads `NO_WAY`.
2. **The fetch chain** (risky). It adds `life/fetch.ts` and changes `street/timetable.ts`, `life/choose.ts`, `life/activities.ts` and `street/chat.ts`.
   - `planDay` sets the day's waiting bits and clears `portions` and the ways, then plans work or parks the blob.
   - `fitChain` keeps what fits from a cell by 22:00, dropping goods first. A chain leaves no sooner than the next tick, and never before 06:00.
   - `decideLives` takes a due blob by its phase: at work, `leaveWork`; at a door after buying, `goOn`; at home, the choice.
   - The choice gains Fetch, with Rulings 2, 3 and 6: the deadline, the caps, the forced fetch, the vetoes and the keyed first choice.
   - Arriving home with food sets `portions` and starts the first meal.
   - In `chat.ts`, a waiting blob is not free to chat.
   - **Cut:** `planShopping`, `startOf`, `NO_START`, the food and goods spreads, `afterFood`'s goods trip, and `trip-start.test.ts`.
   - **Test,** `fetch.test.ts` (sim-protocol): a blob not at work walks from home to its goods premises and then its food premises, buying for 10 ticks at each. It walks home and eats. A worker's chain starts at its employer's door when its shift ends.
   - **Edge:** a chain too long for 22:00 drops the goods and keeps the food.
   - **Also:** update `errands.test.ts`, and the cases in `life.test.ts` that waited for the morning food trip. Print the µs a decision takes and the decisions a blob makes a day.
   - **2b, the morning stop,** only on Step 0's figure: a worker whose evening chain won't fit takes it on the way to work, if it arrives by 12:00. It then walks home on a fresh `pathRuns` from its door.
3. **Meals and naps,** in `life/table.ts`, `life/needs.ts`, `life/choose.ts` and `life/activities.ts`.
   - It adds Ruling 4's rates, `MODE_EAT` and `MODE_NAP`, the Eat option while `portions` lasts, and a Nap indoors for 30–120 ticks.
   - **Test,** `meals.test.ts` (sim-protocol): over 3 days, no blob eats more meals than its `dayPortions` or before its food is home, and a nap lowers rest.
   - **Edge:** a blob whose food is missed doesn't eat that day.
4. **Water, browsing and wandering,** in `life/`, `street/errands.ts` and sim-protocol's `map/leisure.ts`, `snapshot/street.ts` and `messages/messages.ts`.
   - It adds `ACTIVITY_WATER`, `ACTIVITY_BROWSE` (10–30 ticks, standing in the snapshot) and `ACTIVITY_WANDER`, by Rulings 7 and 8.
   - **Test,** `outings.test.ts` (sim-protocol), on an open ground: a water sitter shows the heart a quarter of the time, and a browser stands facing the front. A wanderer arrives, then stays as its site's activity or walks home.
   - `decideLives` takes a wanderer at its spot to the choice there.
   - **Edge:** a wander with no site in reach is vetoed.
   - **Then** a `junior-game-engineer` words the new activities in `panels/inspector.ts` and `inspector.test.ts`. Until then they read "Out and about".
5. **The whole day** (risky): the counters in `life/choose.ts`, then tuning in `life/table.ts`. **Test,** `life-day.test.ts` (sim-protocol), Highcourt on seeds 42 and 7, 28 days each:
   - every option wins sometimes and loses sometimes;
   - a purchase is home by 22:00 when its chain fits, by the test's own `pathRuns`: from home at 08:00 for a blob not at work, or from the observed shift end for a worker;
   - a missed purchase doesn't fit from home at 06:00, or from the shift end for a worker;
   - no blob eats more meals than its `dayPortions`;
   - on workdays, the busiest hour of departures falls in 05:00–07:59 before noon and in 14:00–16:59 after it;
   - the plaza's crowd peaks from 16:00;
   - nobody is out at 23:00;
   - a twin restored at 11:00 on day 3 ends day 4 at the same hash.

   Print the counters, the fetched and missed shares, the portions eaten, and fed blobs' hunger at 21:30 on day 27. Tune until fed blobs read Content.
6. **Cost** (risky at 100k), in `tools/bench`'s `budgets.ts`, `sample.ts` and `budget.ts`.
   - `STREET_ROWS` add two systems, sampled on the street bench world in the Node gate. `life` is judged against decisions plus pathfinding (1.2, 3.3 and 1.4 ms), and `chat` against perception (1.0, 2.5 and 6.0 ms).
   - The gate prints `life`'s worst tick. Chromium's street rows wait for the backlog's streets flag.
   - Locally, time only 10k and 25k, over 3 days with a scratch run. The 100k figure comes from perf.yml, which the owner starts at Task 11.
   - **Check:** `alloc.test.ts`, since the street day's code grew.

### Cost

- **The estimate** (inference):
  - Today `life` takes 0.41 µs a decision: 0.0102 ms a tick over 25 decisions at 10k (computed from the measured figures).
  - Say 1 µs a decision with 11 options, at about 8 decisions a blob a day. Each blob that fetches adds 3 hops at 0.84 µs.
  - That makes about 0.08, 0.21 and 0.84 ms a tick at 10k, 25k and 100k, against 1.2, 3.3 and 1.4. A rest day's first two hours bring about 830 decisions a tick at 100k.
  - `chat` stays near 0.017, 0.043 and 0.17 ms.
- **If 100k fails,** in order:
  1. skip vetoed options before scoring them;
  2. lengthen the least stay from 30 to 45 ticks;
  3. add Ruling 2's cap. It bounds only the worst tick, and a blob it skips is listed again by its own row.

### Determinism

- **Hashed:** `dayPortions` with the errand store and the new columns with the life store, both only while `STREETS` is 1. `siteTicks` and the counters stay outside the hash, and a checkpoint carries all of them.
- **Mid-outing:** every end is an absolute tick. A chain's progress is its row's bits, `shop` and runs, and the scratch for fits keeps nothing between calls. So a checkpoint taken mid-chain replays (Step 5).
- **Goldens:** `buyPortions` writes `dayPortions` in every goods world, but no non-street golden hashes the errand store. So `42/phone` `746a06a3`, the economy `6a652730` and the rest hold, and CI's Chromium engines spec checks them.

### Risks

- **Step 2** cuts the timetable and moves every street hash, so `errands.test.ts`, `life.test.ts` and `chat.test.ts` run after it.
- **Step 5's tuning:** a far option such as water may never win. Raise its base, not its reach.
- **The pace:** at 4 ticks a tile, a worker's walk home has 361–420 ticks after a 15:00–15:59 shift end, so many workers' food may not fit (Step 0).
- **Browser specs:** waiting purchases move the first plaza chat later in the day, so `street.spec.ts` waits longer.

## Open questions

- **The owner, before Task 8: what pace should blobs walk at?** At 4 ticks a tile, Highcourt's ways average 259 ticks, about 4.3 game hours (measured), so a worker's evening is mostly its walk home. Suggested: keep the pace, and judge Task 6's evenings on screen.
- **The owner, before Task 7: should blobs have family in other homes?** That needs M5's births. Suggested: household members are the family, and visits go to friends.
- **The owner, before Task 10: who pays soldiers until M5's treasury?** Suggested: M0.2's local-government account.
- **Measure:** Task 2's detours, where long ones add waypoint sites, and the `life` and `chat` rows at 100,000 blobs in `perf.yml`.
- **Risk:** `warmUp` has no street town (M2.7 backlog), so `life` starts cold.
