# M10.1 Weather in the sim

Part of [M10 Weather](../milestone.md).

The [Weather plan](../../../weather.md) gives the design. Its odds are labelled design values until research round 10 sets them.

- **Builds:**
  - each region's weather, drawn once a day at the day boundary: clear, cloudy, rain, storm, fog or snow, with start and end minutes for showers, storms and fog; a chain on `draw(seed, WEATHER, region, day)`, with odds by season and biome, makes wet and dry spells (Weather);
  - one source of weather: M3's harvest draw and M7's settlement weather agree with the weather on screen, and share links made before M10 still replay (Weather).
- **Needs:** M0.1's keyed draw and calendar, M3.1's place generator with each place's biome, temperature and moisture, M3.5's harvest weather draw, M6.3's share links, M7.3's region tier, M7.4's settlement store and M8.1's biomes.
- **Owner decision first:**
  - when research round 10 runs: just before M10, or before M3.5's step plan, so the harvest and the later weather share one design;
  - how runs from before M10 keep replaying: fit the daily weather to M3.5's harvest draw as it is, or let each run's version pick the rule.
- **Verify first:** research round 10's odds by season and biome, and its spell lengths, which set the chain's tables and the bands below.
- **Exit checks:**
  - the same seed gives the same weather every day in Node and all three browser engines (Weather);
  - over 50 seeds, each biome's share of rain, storm, fog and snow days per season lands in its target band (Weather).
