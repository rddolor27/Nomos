# M3.2 Daily routines

Part of [M3 City life](../milestone.md).

> **Status (12 October 2026):** a brief ([plan.md](plan.md)) answers the owner's request for blobs with lives of their own. Nothing is built until the owner says go.

It builds on M2.7 Part 1's street, M2.2c's households of 1–6 in drawn homes, and M3.1's places.

- **Already built by M2.7 Part 1** (5aa6991..c6ee30a):
  - premises by trade, one flow field each, and `pathRuns`;
  - the errand store and its phases;
  - a fixed day: work from 06:00 to 15:00 on workdays, one food trip a day, a goods trip on rest days, and everyone home by 22:00;
  - carrying goods and eating on the doorstep;
  - stall keepers and the coin bubble;
  - the `indoors` bit and fast nights;
  - the card's "Doing" and "Bought today".
- **Builds** (owner request, 12 October 2026, unless tagged):
  - **Needs and personality:**
    - needs that rise through the day (hunger, rest, fun and company), with work as a duty;
    - needs that change only when a blob's state changes (R6);
    - a personality of three keyed traits drawn at birth (sociable, homebody and restless), never from a look, a culture or a wallet (R8).
  - **Choice:** a utility choice when each activity ends, on integer ramps, with a keyed pick among the top three and win counters (R1).
  - **Activities:**
    - work;
    - fetching the day's purchase by its deadline;
    - eating, sleeping and staying in;
    - the doorstep;
    - outings to the plaza, greens and water;
    - browsing and wandering;
    - visits and chats.
  - **Places:** leisure sites with fields of their own, and legs between any two cells on M2.7's fields.
  - **Chats:** a per-cell mailbox, a quarter of blobs looking each tick, one exact check under the cap of 16 (R5).
  - **Friends:** six a blob, built by chats and visits and fading without them.
  - **The blob card:** what a blob is doing and why, its feeling, needs, personality and friends, and its top three options (R1).
  - **Art:** speech, music and ball bubbles, mocked up for the owner first.
  - **The soldier job:** a public-sector job paid from taxes, with shifts like other jobs and home after work, where the helmet and baldric come off. The art exists; wire it in (Military).
- **Dropped from the plan's list:**
  - Huff's shop choice (R1), since the economy picks each firm;
  - a bucketed timing wheel and dense lists (R5), unless a budget gate fails;
  - needs stored as Int32 deadlines (R6);
  - round 2's optional items.
- **Owner decision first:**
  - the street's pace, before Task 8: keep 4 ticks a tile, where Highcourt's ways average 259 ticks (measured), or walk twice as fast. Settled on 12 October 2026 by the coordinator: keep the pace until the owner sees Task 6's evenings on screen, then walk faster if they look like walking only;
  - family in other homes, before Task 7: until M5's births, household members are the only family, and visits go to friends. Settled on 12 October 2026 by the coordinator, as suggested;
  - who pays soldiers before Task 10: pay comes from taxes, which arrive only with M5's treasury (R1), so choose a stopgap, such as M0.2's local-government account. Settled on 12 October 2026 by the coordinator: the local-government account, until M5's treasury.
- **Exit checks:**
  - **Rush hours** emerge without scripting. Over 2 worlds, hourly departures peak within ±1 hour of shift starts and ends, and the plaza's crowd peaks after work (R1).
  - **Choices:** over 2 worlds × 28 days, every activity wins sometimes and loses sometimes when it is a candidate (R1).
  - **Money:**
    - every purchase with a way is fetched by 22:00;
    - meals never exceed the day's portions;
    - the economy golden `6a652730` and the non-street goldens don't move.
  - **Replay:** a logged twin replays to the same hash from a checkpoint taken mid-chat and mid-visit, and no blob is out at 23:00.
  - **Perception:** no exact query returns more than 16 neighbours, and at most a quarter of eligible blobs look for a chat in a tick (R5).
  - **Budgets:** at 10k and 25k agents, every system stays within its sub-budget in the CI budget gate (R5).
  - **Fairness:**
    - only the card shows friendship;
    - `life/` reads no look, culture or wallet, by lint.
  - **Soldiers:** no soldier frame draws a weapon out of its sheath or shows a fight (Military).
