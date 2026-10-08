# Military

Oct 7, 2026 · @Rd

The military defends and patrols the roads; it never polices towns. On 7 October 2026 the owner chose defence and route patrols only, sheathed swords or spears with no guns, and a storybook pre-industrial setting. The art and sounds already exist; the tasks are in Implementation plan, tagged (Military).

## Rules

Soldiers defend and patrol roads; they never police towns. Content rule 6 carries this, as the owner set it on 7 October 2026.

1. **Soldiers never police towns.** Town crime, stops and arrests stay with the police. Nothing in the game sends soldiers into a town to keep order.
2. **Weapons stay at rest:** a sheathed sword or a shouldered spear. Nothing is drawn, no fight is animated, and there is no blood.
3. **No guns, flags, heraldry or heroic poses.** The setting is storybook pre-industrial, and soldiers follow the police iconography rule: neutral, never glorified.
4. **Soldiers are a removable job,** like every role. The helmet and baldric come off at home, and nobody is born a soldier.
5. **Soldiers carry no culture.** Recruitment and postings never read culture, region, looks or wealth, and no uniform colour matches a culture emblem.
6. **Road stops are drawn like town stops.** If patrols stop travellers, wrongful stops show as prominently as arrests. Bandits are an act, never a costume.
7. **There are no wars.** The military deters raids on the roads. A world holds 3–5 countries, but neighbours share laws and money and are never enemies (owner, 9 October 2026). There is no enemy country, siege or battle, no checkpoint, toll or stop at a border, and no battle sound.

## How it works in the sim

The military is a paid public job plus three placed structures. Its one effect on the sim is the patrol intensity on round 4's route ledgers.

| Piece | Rule | Built on | Milestone |
| --- | --- | --- | --- |
| Soldier job | A public-sector job paid from taxes, with shifts like other jobs, home after work | M2 wages and taxes; M3 schedules | M3 |
| Defence budget | A policy set before Run: the number of soldier posts and their pay, funded from taxes. Its predicted effect on raids and taxes shows before Run, and a new value forks a branch | M5 treasury and policy sliders | M5 |
| Garrisons | Soldier posts in each country's capital and in coastal or border towns, sized by the budget; drawn as barracks | Settlement tiers, coasts and country borders from the generator | M7 ledger, M8 map |
| Patrols | Each route ledger gets a patrol intensity from nearby garrisons and the budget. Raids fall as patrols rise, and a raid is recorded only when reported or seen | Round 4's route ledgers: traffic, bandit pressure, patrols, incidents | M7 |
| Forts and watchtowers | Forts at road junctions near coasts and borders; watchtowers along long road stretches | The generator's road graph and country borders | M8 |
| Route strip view | Soldiers walk the road, aligned to the route ledger | Round 4's strip view | M9 |

- **Money stays exact.** Soldier wages move from the treasury to soldiers' accounts in whole cents, like any public wage, so all accounts plus MINT still sum to zero.
- **Draws are keyed** by (route, day, event). Changing patrols on one road never shifts another road's raids, so paired seeds stay comparable.
- **True and recorded stay apart.** The route ledger counts true and recorded raids separately. The chance a raid is recorded rises with patrol intensity and traffic, so a quiet, unpatrolled stretch records few of its raids.
- **Guarded decisions follow round 8:** each posting, patrol and stop is an integer threshold and one keyed draw, and the flip test covers them.
- **Watch-only:** the defence budget is set before Run, like every policy. Trying another budget forks a branch.
- **Placement reads the generator:** garrison towns from settlement tiers, coasts and borders, forts from road junctions near coasts and borders, watchtowers from long road segments. M8 tunes the spacing against generated previews.

Borders: each world now holds 3–5 countries (owner, 9 October 2026), so a border is the land boundary between two of them, where neighbouring land cells belong to different countries. Coasts stay their own case, and neither the map edge nor region lines count. A border town or fort lies within 3 cells of a border, a proposed reach tuned on previews. A road that crosses a border is patrolled from garrisons on both sides, and no soldier, barracks or fort carries a country's colour, name or emblem.

## Art and sound (done)

The art and sounds were built and tested on 7 October 2026; only the game code remains.

| Asset | Size | Footprint | Sheet |
| --- | --- | --- | --- |
| `job_soldier_<pose>`: steel kettle hat, diagonal leather baldric, sheathed sword | 18×22 px, 17 frames covering every pose | — | `characters` |
| `building_barracks` | 64×48 px | 4×2 tiles | `military` |
| `military_watchtower` | 32×64 px | 2×1 tiles | `military` |
| `military_fort`, a small fort with a gate | 96×64 px | 6×3 tiles | `military` |
| `map16_military_fort`, `map16_military_watchtower` | 16×16 and 16×20 px | Region view icons | `military` |
| `map8_military_fort`, `map8_military_watchtower` | 8×8 and 8×10 px | Country view icons | `military` |

- **Colours:** the soldier avoids police navy, merchant teal, crime reds and oranges, black and the eight culture emblem colours.
- **Shape:** the baldric crosses the body diagonally, so it never reads as the merchant's horizontal sash.
- **Sounds** (`assets/sounds/military.json`, 7 effects; see Sound):
  - `military_drill-drum`, a 2.65 s cadence at drills;
  - `military_watch-horn`, 1.56 s on D4–E4–D4, at the change of watch;
  - `military_march` (1.59 s) and `military_march-step` for patrols;
  - `military_gate-creak` for fort gates;
  - `military_spear-tap` and `military_helmet-clink`, small sounds for guards at rest.

## Work by milestone

With the art and sounds done, about 5–8 days of game code remain (unsourced estimate). Each task is in Implementation plan, tagged (Military).

| Milestone | Work | Days |
| --- | --- | --- |
| Done, 7 October 2026 | Soldier job item, barracks, watchtower, fort, map icons and 7 sounds | — |
| M3 City life | The soldier job: wages from taxes, shifts, home after work; the job item comes off at home | 1 |
| M5 Society and policy | The defence budget, set before Run, with its predicted effect on raids and taxes | 1–2 |
| M7 Country of ledgers | Garrison posts, and patrol intensity on route ledgers, with true and recorded raids kept apart | 1–2 |
| M8 Country map | Garrisons, forts and watchtowers placed by the generator, near coasts and country borders; their map icons; the military sounds | 1–2 |
| M9 Zoom across scales | Patrols walking the route strip view | 1 |

**Exit checks:**

- M3: no soldier frame draws a weapon out of its sheath or shows a fight.
- M4: no code path sends soldiers into a town to keep order; town stops and arrests come only from the police.
- M5: recruitment and postings never read culture, region, looks or wealth, and the appearance and culture audits cover soldiers.
- M7: on paired seeds, more patrols cut true raids, and recorded raids rise or fall with sightings, as the true-versus-recorded lesson predicts.
