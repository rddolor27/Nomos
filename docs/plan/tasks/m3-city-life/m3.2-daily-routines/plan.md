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
     - `sim-protocol`'s `map/leisure.ts` finds them from frames and terrain alone, so M3.1 Part 4's layouts suit it.
     - `MAX_SITES` is 32, a field each: 631 KB at 176 × 112 (computed), about 14 ms to build (inference).
   - **Legs:** a leg runs forward on a site's field to the site, or backward along a cell's own runs to a home or spot. So no home needs a field.
     - Between two cells, both ways run to the hub with the least Manhattan sum, and the walk switches where they meet.
     - Stamping cells in a scratch grid finds the meeting point.
     - An unfetched purchase makes its premises the hub.
   - **The store,** `life/store.ts`, sits at the arena's end, so no offset moves.
     - It holds 65 hashed bytes a blob: needs 8, settle tick 4, traits 3, activity and reason 2, purchases and portions 2, `chatUntil`, `chatWith`, `host` and the leg's end cell 4 each, and friends 30. It also hashes each site's crowd.
     - The home cell, household size and hub sit outside the hash.
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
8. **The whole day by needs** (`sim-engineer`, Sonnet; Opus for the step plan or a failure of unknown cause). It adds hunger through `dayPortions`, naps, water and browsing outings, wandering, fetching by deadline, nearness and hub, and the win counters.
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

## Open questions

- **The owner, before Task 8: what pace should blobs walk at?** At 4 ticks a tile, Highcourt's ways average 259 ticks, about 4.3 game hours (measured), so a worker's evening is mostly its walk home. Suggested: keep the pace, and judge Task 6's evenings on screen.
- **The owner, before Task 7: should blobs have family in other homes?** That needs M5's births. Suggested: household members are the family, and visits go to friends.
- **The owner, before Task 10: who pays soldiers until M5's treasury?** Suggested: M0.2's local-government account.
- **Measure:** Task 2's detours, where long ones add waypoint sites, and the `life` and `chat` rows at 100,000 blobs in `perf.yml`.
- **Risk:** `warmUp` has no street town (M2.7 backlog), so `life` starts cold.
