# M9 Zoom across scales: sub-milestones

M9 holds 22 build tasks and 7 exit checks in the [implementation plan](../implementation-plan.md#m9-zoom-across-scales), so it runs as six sub-milestones. Each one ends with software that runs and passes its own checks. M9 comes after launch, because round 9 moved launch to follow M8. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in earlier milestones can rescale them. The plan's M9 effort line, 20–30 days after round 9 dropped the village-kit authoring, covers round 4 only. The owner's plans add 1 day for patrols and 0.5–1 for the sound crossfade. The 8 tasks from rounds 6, 8 and 9 carry no estimate of their own. The plan's own figures sum to 21.5–32 days, and this breakdown to 25–40.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M9.1 Spawn and fold | Zooming in spawns a settlement's people from its ledger, and zooming out folds them back exactly | 8–12 days | | | |
| M9.2 Daily alignment | Spawned agents kept in line with the ledger each day, with a divergence meter | 3–4 days | | | |
| M9.3 Streets from the generator | Every settlement's streets generated on hover, with stable plans and dormant edits | 5–8 days | | | |
| M9.4 Villages and the district window | Village rules, and agents only in the districts in view above the device cap | 3–5 days | | | |
| M9.5 Route strips and wonder views | Roads drawn as strips whose caravans, bandits and patrols match the route ledger | 3–6 days | | | |
| M9.6 Consequential focus | The opt-in mode where watching changes history, and optional pinned live settlements | 3–5 days | | | |
| **Total** | | **25–40 days** | | | |

Two points apply throughout:
- **The ledger owns history.** Under the default shadow-canonical mode, agents never write the canonical ledger, so where the camera looks never changes the result (M7's decision).
- **Every switch is exact.** Spawning and folding must conserve money, goods, people, customs and life-satisfaction bands to the unit, or the zoom breaks the ledger's identities.

## M9.1 Spawn and fold

- **Builds:**
  - camera focus turned into switch requests with hysteresis (enter below z(1 − f), leave above z(1 + f)) and a minimum dwell of one simulated day, logged as inputs (R4);
  - spawn on focus with M2's spawner, keyed by (seed, settlement, entry tick, purpose): agents start indoors or at their scheduled places, with notables and the cached field loaded, or a per-map template scaled to the ledger (R4);
  - two ledgers: the canonical one, which agents never touch, and an apportioned micro-ledger that changes across the boundary only through mirrored flows, with a reconciliation band between households and firms (R4);
  - fold on leave: drop the micro-ledger, and cache in an LRU the notables (officers, owners, anyone with a record, anyone followed or named), the 2 KB hotspot field and the price list (R4);
  - each notable's balance sheet (home ID, shares, debts) in the notables cache, so a revisited owner still owns the same home and firm (R6);
  - pantry and shop lots folded into the ring and cohorts exactly in portions; lots spawned by largest remainder, with keyed expiry offsets inside wide slots and the category mix drawn from demand shares (R6);
  - spawn drawing set points so spawned life-satisfaction bands match the ledger, and fold returning exact band counts and summed life satisfaction (R6);
  - customs spawned and folded exactly from the culture block, with notables keeping their customs across visits (R8).
- **Needs:** M2.2's spawner and fold; M7's settlement ledgers and blocks, including M7.6's culture block; M2.5's balance sheets.
- **Exit checks:**
  - every switch is a spawn-fold identity, both ledgers sum to zero every day, and the micro-ledger total equals the canonical total at every tick (R4).

## M9.2 Daily alignment

- **Builds:**
  - interior totals aligned daily by sorting, carrying each day's shortfall, with boundary flows executed exactly: arrivals released and departures removed at entry tiles (R4);
  - a divergence meter: daily z-scores per flow in the developer panel, logged for emulator refits (R4).
- **Needs:** M9.1; M7.2's emulator, which the logs refit.
- **Owner decision first:** the proposed bar of |z| < 2 on at least 95% of flow-days.
- **Exit checks:**
  - on presets, daily |z| < 2 on at least 95% of flow-days, and a camera oscillating across the threshold causes at most one switch per dwell period (R4).

## M9.3 Streets from the generator

- **Builds:**
  - every tier's street maps built with the district generator, prefetched on hover and cross-faded in; building interiors stay abstract, as building cards (R4, R9);
  - place record version 2: a stable id and cell, edge biomes per side, elevation and relief, river size, road rank, region, founding tier and versions, with temperature and moisture quantised to the place generator's bands (R9);
  - each place's plan type locked at its founding tier, and keyed lots built by population, so growth never moves a street (R9);
  - place edits as reservations the generator flows around, stored per place uid with the place version and a record hash, going dormant rather than being dropped (R9);
  - music and ambience crossfaded between country, region, city and street (Sound; the music and ambience exist, so wire them in).
- **Needs:** M6.1's generated cities; M8.1's world generator and place records; M3.8's music player.
- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones, which set the phone tier for country mode.
- **Exit checks:**
  - zooming from Region to City shows agents with no dropped frame: interior generation (≤ 60 ms; 59 ms warm in Node) and spawning (≤ 10 ms) start on hover and finish under the cross-fade (R4);
  - a zoom-consistency CI test passes: road, river and sea sides match the country exactly, every landmark icon appears in its place, and edge farmland shows as fields (R9).

## M9.4 Villages and the district window

- **Builds:**
  - the district window: above the device cap, agents run only in the districts in view, and the district tier with a 16×16 crime lattice runs elsewhere (R4);
  - village agent rules: one general shop, own-farm work as the default for the unemployed, kin credit that nets to zero, and a market day with itinerant merchants (R4).
- **Needs:** M7.3's villages and flows; M4's crime model for the lattice.
- **Exit checks:**
  - a village preset shows money and transactions per head well below the city's at equal real consumption (R4).

## M9.5 Route strips and wonder views

- **Builds:**
  - the route strip view: a seeded strip map 20–40 tiles wide whose caravans, bandits and patrols are aligned to the route's ledger (R4);
  - route strips built from route cells with the place code, and wonder views with vista props (R9; the wonder art exists, so wire it in);
  - patrols shown walking the route strip view, aligned to the route ledger (Military; the soldier art exists).
- **Needs:** M7.7's route ledgers and patrols; M8.4's route view on the map; M8.3's 11 wonder loops, which play in full in these wonder views.
- **Exit checks:** the plan sets none here. Proposed: on presets, a strip's caravans, bandits and patrols match its route ledger's daily counts.

## M9.6 Consequential focus

- **Builds:**
  - consequential focus as an opt-in, with an observer-effect notice and the focus log in share URLs (R4);
  - optional: pinned live settlements chosen at world creation (one on phones, up to three on desktops), agent-canonical and folded exactly into the national accounts every day (R4).
- **Needs:** M9.1–M9.2; M6.3's share links.
- **Owner decision first:** whether pinned live settlements ship.
- **Verify first:** alignment nudges with the real emulator, read on M9.2's divergence meter; they decide between shadow-canonical as the default and pinned live cities.
- **Exit checks:**
  - under shadow-canonical, replay hashes match across three different focus logs for one seed; under consequential focus they match for the same log (R4);
  - notables and followed agents reappear on revisits with consistent records; under consequential focus, the hand-off twin test keeps output, prices, crime and money per head within the ledger's noise; under shadow-canonical it passes by construction, so the divergence meter does that job (R4).
