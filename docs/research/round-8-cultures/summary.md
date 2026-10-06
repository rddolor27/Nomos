# Cultures

Oct 6, 2026 · @Rd

Blobs can belong to fictional, learned cultures with harmless customs (favourite foods, festivals, music, naming and a home region) at almost no cost, if one rule holds: culture shapes demand and leisure, never any judgement, and it never appears where crime is shown. Round 8 answered three questions: how cultures pass on and mix, how customs feed the simulation, and what games and research teach about doing this respectfully. The resulting tasks are in Implementation plan, tagged (R8).

## Transmission: three generations, kept mixed by structure

Customs fade over about three generations. In the US in 2000, 85% of second-generation Hispanic children spoke at least some Spanish at home, against 28% in the third ([Alba](https://ccis.ucsd.edu/_files/wp111.pdf)). Intermarriage is the main brake, and it rises by generation: 15% of immigrant and 39% of US-born Hispanic newlyweds married out ([Pew](https://www.pewresearch.org/wp-content/uploads/sites/20/2017/05/intermarriage-may-2017-full-report.pdf)).

Imitation alone collapses diversity, as Axelrod's model shows. A mix survives through structure: minority parents trying harder, partners from one's own culture, newcomers and conformist learning.

| Prototype result, 100 simulated years | Value |
| --- | --- |
| Second / third generation keeping the heritage food custom | 48% / 13–14% |
| Closed town with conformist learning, no newcomers | Small cultures gone within 150–200 years |
| Newcomers at 0.25% / 0.5% / 1% a year: share of the initially largest culture | 0.79 / 0.55 / 0.21 |
| Country of 1,000 settlements | 95% keep their dominant culture; capitals become melting pots |
| Checks every 30 days against daily | Same outcomes at 1/23 of the cost |

- **Storage:** 6 bytes per person (a current culture, a birth culture, four customs each stored as the culture it came from, a birth region), at most 8 cultures per world.
- **Customs are nominal, never a blend:** blending drives everyone to one culture.
- **Switching** is gradual, caused by contact and symmetric, with no default or majority culture; a person keeps their name, and the inspector shows the inherited label.

## Customs: preferences only, equal in cost and time

- **Food:** culture shifts only spending above subsistence, by at most ±25% per category, about as much as countries at similar income differ ([ICP 2021](https://api.worldbank.org/v2/sources/90/series?format=json)). Basic food, total spending, saving and work never read culture, so culture should not cause hunger, which drives food theft. Favourite foods come from what a culture's home region grows in abundance.
- **Festivals:** every culture gets 8–12 festival days a year, the same total and the same daytime and evening mix, on rest days or evenings only, open to all. Countries keep a median of 12 public holidays. Attending counts as social contact.
- **Music:** an abstract preference with invented style names, never a real genre.
- **Names:** one shared invented sound set; naming customs set the structure. Names never appear in justice views, because names cue group membership ([Bertrand and Mullainathan](https://www.nber.org/system/files/working_papers/w9873/w9873.pdf)).
- **Home regions:** 4–8 hearths on the country map, balanced for land quality; migration carries culture exactly and never reads it.

## Respect: never on a crime surface

Every game the round reviewed that tied culture or species to ability, honesty, wealth or violence produced group stereotypes, including Norland, which calls culture learned. Abstract labels do not prevent stereotypes: people link a smaller group with rare bad acts, more strongly for negative acts and longer streams of events ([Mullen and Johnson](https://bulidomics.com/w/images/2/29/Mullen1990.pdf)). A crime simulation is such a stream.

- **Never shown together:** culture never appears in justice bubbles, logs, records or the true and recorded panels. The opt-in culture lens shows customs only and hides justice cues.
- **Hue:** six abstract body hues, drawn at random at birth and read only by the renderer, never line up with culture.
- **Wording:** "people raised with Velan customs", shares not generics, and no hierarchy words such as "primitive", "tribe" or "foreign".
- **Borrow from games:** CK3's acceptance as learning speed only, RimWorld's gradual conversion, Victoria 3's favourite goods from local abundance, Dwarf Fortress's invented languages.
- **Avoid:** innate group traits, culture-styled clothes or buildings, ranked cultures, forced identity change, and any offence tied to customs, the lesson of London's Form 696.

## Guardrails: four test layers

Rules that never read culture are not enough. In toy tests, clustered housing alone gave 3.2× stop and 8.2× arrest gaps between cultures, and evening festivals raised one culture's victimisation by 8.7% through exposure, not treatment. So housing ignores culture, customs cost the same and keep the same hours, and patrols never read culture or festivals.

| Layer | What it catches |
| --- | --- |
| Package boundary and lint | Any crime, policing, labour, wage or wealth code that imports culture, even through helpers |
| Relabel test | Code that branches on a culture's id; hashes must match exactly |
| Flip test on thresholds and draw keys | Any rule whose threshold or random-draw key moves when culture is shuffled; outcome-only checks missed planted leaks |
| Outcome and exposure audit | Raw per-culture outcomes within 0.9–1.1, and no treatment gap at the same place and hour, over 50 paired seeds (proposed bands) |

## Budgets: what fits

Agents fit easily, and the country tier joins the planned WASM port.

| Item, reference-machine terms | Cost |
| --- | --- |
| Memory per agent | +6 B, about 176 of 256 B |
| Agents, per day at 100k | About 0.08 ms |
| Settlement record | +66 B, about 576–706 of 1,024 B |
| Country day at 10,000 settlements | Up to about 1.3 ms of 12 ms |
| Save at 10,000 settlements | +50–118 KB gzip, target about 0.55–0.62 MB |

Every timing is desktop Node 24.18 on a Ryzen 5 3600 scaled ×1.9 to the reference machine. None is a phone, browser or WASM timing.

## Decisions the owner settled

The owner accepted all seven recommended defaults on 6 October 2026, and the plan tasks use them.

| Decision | Adopted |
| --- | --- |
| Identity: follows practice, or an inherited label | The inspector shows the inherited label; practice drifts underneath |
| City-mode newcomers per year | 0.5% |
| Residential clustering by culture | None |
| Partner choice | Weighted by shared customs |
| Names | One shared sound set |
| Festival timing | The same daytime and evening mix for every culture |
| Pokémon name filter | Edit distance 1 for names up to 5 letters, 2 above |

The fact-checked report, with every source, conflict resolution and verify-first item, is `docs/research/round-8-cultures/report.md` in the repo. Its notes and prototypes sit beside it.
