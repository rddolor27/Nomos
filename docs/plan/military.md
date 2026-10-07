# Military plan

Status: draft, 7 October 2026. No code exists yet. This plan is not in the shared plan doc, and its tasks carry no round tag, because no research round has checked them. Every figure is an unsourced estimate unless marked otherwise.

## The answer

- **The military defends; it never polices towns.** Soldiers are a paid public job: garrisons, forts and watchtowers, and patrols on the roads between settlements. There are no wars.
- **Patrols guard the routes.** Round 4 already plans route ledgers with bandit pressure, patrols and incidents (M7–M9). The military supplies those patrols, so more patrols mean fewer raids on caravans.
- **The same lesson holds on the roads:** what gets watched shapes what gets recorded. A raid on an unpatrolled stretch happens but is rarely recorded.
- **Defence costs money.** A defence budget slider (M5) pays soldiers from taxes, a guns-and-butter trade-off. Its predicted effect is shown before Run, like every policy slider.
- **The setting is storybook pre-industrial:** soldiers wear a steel helmet and a leather baldric, and carry a sheathed sword or a spear at rest. No weapon is ever drawn, and there is no blood, no guns, no flags and no heroic poses.

## Rules

1. **Soldiers never police towns.** Town crime, stops and arrests stay with the police. Nothing in the game sends soldiers into a town to keep order.
2. **Weapons stay at rest:** a sheathed sword or a shouldered spear. Nothing is drawn, no fight is animated, and there is no blood.
3. **No flags, heraldry or heroic poses.** Soldiers follow the police iconography rule: neutral, never glorified.
4. **Soldiers are a removable job,** like every role. The helmet and baldric come off at home, and nobody is born a soldier.
5. **Soldiers carry no culture.** Recruitment and postings never read culture, region or looks. No uniform colour matches a culture emblem colour.
6. **Route stops are drawn like town stops.** If patrols stop travellers, wrongful stops show as prominently as arrests, and bandits are an act, never a costume.

## How it works in the sim

| Piece | Rule | Milestone |
|---|---|---|
| Soldier job | A public-sector job, paid wages from taxes, with shifts like other jobs | M2–M3 |
| Defence budget | A policy slider that sets the number of soldier posts and their pay, funded from taxes | M5 |
| Garrisons | Barracks in the capital and in coastal or border towns, sized by the defence budget | M7–M8 |
| Forts and watchtowers | Generated on roads: forts at junctions near coasts and borders, watchtowers along long stretches | M8 |
| Patrols | Each route ledger gets a patrol intensity from nearby garrisons. Raids fall as patrols rise, and are recorded only when reported or seen | M7 |
| Route strip view | Patrols appear as soldiers walking the road, aligned to the route ledger | M9 |

## Art (tools/sprites)

- **The soldier job item** follows every pose, like the other job items:
  - a grey steel helmet (rounded kettle hat);
  - a brown leather baldric crossing the body diagonally, so it never reads as the merchant's horizontal sash;
  - a sheathed sword at the hip.
  - It avoids police navy, merchant teal, crime reds and oranges, black and the eight culture emblem colours.
- **Buildings:**
  - barracks (a civic building);
  - a wooden or stone watchtower;
  - a small fort with a gate, as a set piece on roads.
- **Map icons:** forts and watchtowers at 16 and 8 px for the Region and Country views.

## Sound (tools/sounds)

- **A drum cadence for drills,** a short horn call for the change of watch, marching steps and a gate creak.
- **No battle sounds,** and no heroic fanfare.

## Tasks by milestone (draft)

**M2–M3**
- [ ] Add the soldier job: wages from taxes, shifts, home after work. The job item comes off at home (1 day).

**M5 Society and policy**
- [ ] Add a defence budget slider with a predicted effect on raids and taxes, shown before Run (1–2 days).

**M7 Country of ledgers**
- [ ] Give each route ledger a patrol intensity from garrisons and the defence budget. Raids fall as patrols rise, and records follow reports and sightings (1–2 days).

**M8 Country map**
- [ ] Generate garrisons, forts at junctions near coasts and borders, and watchtowers along long roads. Draw their map icons (1–2 days).

**M9 Zoom across scales**
- [ ] Show patrols walking the route strip view, aligned to the ledger (1 day).

**Art and sound**
- [ ] Soldier job item, barracks, watchtower, fort, and map icons (2–3 days).
- [ ] Military sounds (0.5 day).

In all, about 7.5–12 days.

## Exit checks

- [ ] No code path sends soldiers into a town to keep order, and town stops and arrests come only from the police.
- [ ] Recruitment and postings never read culture, region, looks or wealth: the existing appearance and culture audits extend to soldiers.
- [ ] No weapon sprite is drawn out of its sheath, and no soldier frame shows a fight.
- [ ] On paired seeds, more patrols cut true raids. Recorded raids rise or fall with sightings, as the true-versus-recorded lesson predicts.
