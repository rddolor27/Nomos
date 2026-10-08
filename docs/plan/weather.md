# Weather

Oct 8, 2026 · @Rd

Weather comes last, in M10 after M9 and after launch (owner, 8 October 2026). Rain, snow, fog and storms change how the world looks and sounds, and they replay exactly from the seed. Time of day comes first, from M1, in Time & calendar. The tasks are in Implementation plan, tagged (Weather).

## What weather is

Each region draws one weather a day at the day boundary, so a seed always brings the same rain. The odds below are design values until a research round sets them.

| Kind | Most common in | On screen | Sound |
| --- | --- | --- | --- |
| Clear | Summer; deserts | Full light | Biome ambience alone |
| Cloudy | Any season | Greyer light; drifting cloud shadows | Biome ambience, more wind |
| Rain | Spring and autumn; coasts and forests | Falling streaks; wet ground and puddles that dry after | Light or heavy rain |
| Storm | Summer | Heavy rain, darker light, soft lightning glows | Storm wind, distant thunder |
| Fog | Autumn mornings; coasts and marshes | A soft white veil that lifts by mid-morning | Muffled ambience |
| Snow | Winter; cold biomes and mountains | Falling flakes over winter's snow cover | Soft cold wind (`amb_snow`) |

- **Spells, not coin flips.** Tomorrow's weather depends on today's, through a chain whose odds follow season and biome, so wet and dry spells form. Each step is one keyed draw, draw(seed, WEATHER, region, day).
- **Weather within the day.** Showers, storms and fog get a start and an end minute, so rain can begin in the afternoon and fog can lift by mid-morning.
- **Biomes set the odds** through the world generator's temperature and moisture: deserts stay dry, coasts and marshes fog over, and cold biomes snow.
- **One source.** M3's harvest already scales by a keyed weather draw, and M7's settlement store keeps a weather value. In M10 both agree with the weather on screen, so a wet year looks wet.
- **Old runs still replay.** Weather lands after launch, so a share link made before it must replay unchanged.
- **Exact and cheap:** a few bytes per region per day, stepped day by day through a skip, and bit for bit the same in every engine.

## On screen and in sound

Weather is drawn over the world layer and heard over the biome ambience, and it never marks a person.

- **Particles:** rain streaks and snowflakes fall in screen space, fewer when zoomed out. Fog is a soft overlay, and clouds cast drifting shadows.
- **Weather tints stack on the light periods,** so a rainy afternoon is greyer and a stormy night darker. People stay untinted, as with the light.
- **Calm to watch.** Lightning is a soft glow at most once every few seconds, never a full-screen flash, far under WCAG's limit of three flashes a second. Under reduced motion, rain and snow draw as still overlays.
- **Art drawn as code** in `tools/sprites`: rain streaks, snowflakes, puddles, wet-ground palettes, fog and HUD weather icons at 16 and 8 px. Nothing in it depends on wealth or culture.
- **Sounds made as synth data** in `tools/sounds`: light rain, heavy rain, storm wind and distant thunder, layered over the biome ambience within the voice caps. The owner listens to each for likeness to known jingles.
- **The HUD** shows a weather icon beside the season icon, and the gazette's calendar stories can report the weather.
- **The country map** shows each region's weather, and zooming into a region (M9) shows the same weather.

## In daily life

Whether weather changes what people do is the owner's call, due before M10's step plans.

| Option | What changes | What it can teach |
| --- | --- | --- |
| Looks only | Picture and sound; the run is identical | Nothing new |
| Routines (suggested) | People shelter in rain and storms, markets and festivals thin, and travel slows | Fewer people outside means fewer victims and fewer witnesses, so the record can fall faster than the crime |

- **Never a direct rule.** Weather never raises or lowers crime by itself; any change comes through who is out and who sees it.
- **A bet card** could ask: "Does rain lower crime, or only the record of it?"
- **Research first.** A research round, round 10, should cover season and biome odds, wet and dry spells, and the evidence on weather, time outdoors and crime, before any rate is hard-coded.

## Work by milestone

M10 takes about 16–27 days over four parts (unsourced estimate). Each task is in Implementation plan, tagged (Weather).

| Part | Work | Days |
| --- | --- | --- |
| Weather in the sim | Kinds, spells, odds by season and biome, and one source with the harvest and the ledger | 3–5 |
| On screen and in sound | Particles, fog, cloud shadows, wet ground, tints, art, sounds and the HUD icon | 7–11 |
| Daily life | Shelter, thinner markets and festivals, and slower travel, if the owner chooses routines | 4–7 |
| Across the country | Each region's weather on the map, and the same weather when zooming in | 2–4 |

**Exit checks:**

- The same seed gives the same weather every day in Node and all three browser engines, and drawing or hiding the weather never changes the state hash.
- Over 50 seeds, each biome's share of rain, storm, fog and snow days per season lands in its target band.
- No frame sequence flashes more than three times a second, and a reduced-motion golden run has no falling particles.
- At its heaviest, weather keeps the town within its frame budget at 3×.
- Every weather sound has a visual twin, and the owner has listened to each.
- If weather changes routines: on paired seeds, rain lowers outdoor hours, and true against recorded crime is reported by weather, never by culture.

## Open questions

- Does weather change what people do, or only how the world looks and sounds?
- How do runs from before M10 keep replaying: fit the daily weather to M3's existing harvest draw, or let each run's version pick the rule?
- Should snow cover follow snowfall instead of winter's fixed schedule?
- When should research round 10 run: just before M10, or before M3's harvest draw, so the harvest and the later weather share one design?
