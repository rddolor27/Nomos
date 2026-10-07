# M3.2 Daily routines

Part of [M3 City life](../milestone.md).

Builds on M3.1's map, and needs M2's firms, wages, shops and `spawnFromLedger`.

- **Builds:**
  - homes, jobs and shops on a 128²–256² grid, with flow fields, a timing wheel, needs plus utility scoring plus a state machine, and Huff shop choice (R1);
  - each need stored as the Int32 tick at which it reaches zero, with meals scheduled on the timing wheel, no decay of every agent's needs every tick, and fractional (Q8) rates on the 1,440-tick day (R6, Calendar);
  - per-cell aggregates as the default perception, with exact radius queries only for agents that need them (collision, conversation, pursuit), staggered to at least 1/4 per tick and capped at 16 neighbours (R5);
  - sleeping and off-screen agents kept in dense index lists by swap-remove, never filtered by a flag in every system (R5);
  - the inspector, with a click-to-explain panel showing the top three scored actions; M2's follow-the-money view may already have built its shell (R1);
  - the soldier job: a public-sector job paid from taxes, with shifts like other jobs and home after work, where the helmet and baldric come off; art exists; wire it in (Military);
  - optional: idle back-off, shop hours shifted by travel time, day plans made at dawn and one global witness pass (R2).
- **Owner decision first:** soldiers are paid from taxes, which arrive only with M5's treasury (R1); choose a stopgap, such as M0.2's local-government account.
- **Exit checks:**
  - rush hours emerge without scripting, and the win counters show no action that never wins or always wins (R1);
  - at 10k and 25k agents, every system stays within its sub-budget in the CI budget gate (R5);
  - no soldier frame draws a weapon out of its sheath or shows a fight (Military).
