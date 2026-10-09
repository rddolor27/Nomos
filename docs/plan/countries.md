# Countries

Oct 9, 2026 · @Rd

Each world holds 3–5 countries, picked by its seed. They differ only by map facts: name, map colour, capital, borders and towns. Laws, money and cultures stay shared. The explorable map that shows them comes first, right after M0 and before M1. The tasks are in Implementation plan, tagged (Countries).

## Rules

1. **Countries are map facts.** No sim rule reads a country id. Trade, migration, commuting and taxes cross borders as if they weren't there, and one treasury, one issuer and one tax serve every country.
2. **Borders are natural.** Each country grows out from its capital and bends to mountains, lakes, rivers and coasts. No player paints a border.
3. **There are no wars.** Neighbours are never enemies, and borders have no checkpoints, tolls or stops. The Military tab's rules hold unchanged.
4. **Cultures cross borders.** No country stands for a culture. Country names, colours and naming never come from a culture, and culture regions are checked to cut across countries.
5. **Countries never mark people.** A country's colour, name or emblem never appears on a body, clothes, building, soldier or police officer. Places look the same in every country, so no country gets a look that could turn into a stereotype.
6. **Names and colours follow the content rules.** Names pass the full name filter: no real country, demonym, language, ethnonym or religion, no Pokémon town, city or species name, and no profanity. Colours avoid the body hues, the police navy, the merchant teal, the crime reds and oranges, black and the eight culture emblem colours.

## How it works

| Piece | Rule | Milestone |
| --- | --- | --- |
| Count | 3–5 per world by a keyed draw, on both world sizes; the map shows the large 192×128 world | M8.1 |
| Capitals | The largest settlement, then each town or larger, in population order, at least isqrt(land cells ÷ countries) cells from every capital chosen; the spacing shrinks by a quarter until all fit | M8.1 |
| Borders | One multi-source Dijkstra from the capitals over terrain costs; sea and lakes cost far more than land, so an island without a capital joins the country that reaches it cheapest by sea | M8.1 |
| Towns | Each settlement belongs to its cell's country | M8.1 |
| Regions | Grow inside each country; market territories ignore borders, since trade crosses them | M8.1 |
| Names | One word each from a place-name table on the shared sound set, keyed on the capital's or the settlement's cell, never repeated in a world | M8.1 |
| Colours | A keyed shuffle of five map-only colours, picked by the owner from a swatch sheet | M8.1, M8.3 |
| The map | Borders with a band of each country's colour, country names at Country zoom, a legend, and a flat Countries view | M8.3 |
| Gazettes | One per country, from that country's aggregate ledgers | M8.4 |
| Military | Garrisons in each capital and in coastal or border towns; forts at junctions near coasts and borders | M7, M8 |
| Cultures | Hearths drawn near land borders, and a crossing check after spin-up | M8.2 |

- **Exact and replayable.** The stage uses integers and keyed draws only, and breaks ties by (cost, cell), so every engine draws the same borders from the same seed.
- **The Python generator lands it first.** `generate.py`'s previews then show borders and colours, so the owner sees countries before any TypeScript exists. Its fingerprint gains the country count, each capital, each colour and the country of every cell.
- **What a probe found** (measured here: a scratch probe on the Python generator, 20 large worlds):
  - the smallest country held 8–22% of the land, and every country held at least 3 settlements;
  - capitals sit on rivers, and most rivers are short streams to the coast, so rivers seldom lie between two capitals: 9.9% of border edges touched a river, against 7.7% of all land edges;
  - mountains and lakes shaped borders more, and the borders looked natural in previews;
  - culture regions placed without regard to countries lined up with them: every culture kept 15% or more of its land outside its main country in only 1 of 20 worlds. Placing hearths near borders raised that to 8 of 20, so a check after spin-up is needed.

## Map first

- **Build order:** M0 with M0.7, then M8.1 World generator, then M8.3 Country and Region views, then M1–M7, then the rest of M8, launch, M9 and M10.
- **What moves ahead of M1:** the port of the world generator, the countries stage and names (M8.1), and the Country and Region views with pan, zoom, labels and countries (M8.3).
- **What stays after M7:** military sites, the new coast and cliff tiles and the rest of the snow tiles, and country sound (M8.8); cultures across borders (M8.2); map modes, flows and papers; the fork into City mode and history; New country settings; god tools.
- **What comes with it from earlier plans:** `packages/worldgen`, planned for M3.1; the tile pass and a map atlas page, planned for M3.3; and the screen that drops words copying real names, planned for M3.7. Place names use the same mixed sound set as people, Greek-like sounds combined with other languages (owner, 9 October 2026). M0.7 already builds the shared sound set and the name filter.
- **The town stays the first view.** The map loads on demand in a worker of its own, so the 100 KB before the first frame is untouched. Blobs stay in the 48×28 town until M9.

## Work by milestone

The countries add about 3.5–5.5 days of new work (unsourced estimate). Each task is in Implementation plan, tagged (Countries).

| Milestone | Work | Days |
| --- | --- | --- |
| M8.1, before M1 | The countries stage in Python and TypeScript; the place-name table and its picks | 2–3 |
| M8.3, before M1 | Drawing countries, the legend and the flat Countries view | 1–1.5 |
| M8.2 | Hearths near borders and the crossing check | 0.5–1 |

**Exit checks:**

- Over 100 seeds of each size, every world has 3–5 countries, every land cell and settlement belongs to exactly one, and each country holds at least 3 settlements; the stage matches the Python goldens in five engines.
- Place and country names pass the name filter over 1,000 seeds, with no repeat within a world.
- After spin-up, cultures meet the crossing bars below in at least 90 of 100 seeds.

## Decided by the owner, 9 October 2026

- **Country colours:** five map-only colours outside the sprite palette, kept CIEDE2000 ≥ 15 from all 47 reserved colours. The owner picks them from a swatch sheet when M8.3 starts.
- **The first view:** the town, with the map a click away and loaded on demand.
- **The crossing bars:** every culture keeps at least 15% of its people outside its main country, and no country is over two-thirds one culture, in at least 90 of 100 seeds after spin-up.
- **Gazettes:** one per country, each built from its country's aggregate ledgers.

## Open

- **The number of countries in New country settings.** Suggested: an override, limited to 3–5.
