# Gazette

Oct 7, 2026 · @Rd

Every settlement prints a short paper each morning, written only from what its institutions recorded. A crime nobody reports never makes the paper, so the gazette teaches the core lesson by itself: the record is not the crime. It also gives a watch-only player stories to follow. The owner asked for it on 7 October 2026; the tasks are in Implementation plan, tagged (Gazette).

## What it prints

An edition is one screen: a front-page story and up to five more, each one or two plain sentences, dated like the HUD ("Spring 12, Year 3").

| Section | Drawn from | Example |
| --- | --- | --- |
| Front page | The day's highest-priority story from any section | "The harvest has begun in the east fields" |
| Town | Town hall registry and business records: births, deaths, moves, openings, closures, building work | "Three births and one death were registered yesterday" |
| Market | Market records: staple prices and their change, shortages, the harvest's progress | "Bread rose 4 cents; flour is short" |
| Justice | Police and court records: reports, stops, arrests, wrongful stops, releases, verdicts | "Two thefts were reported near the market (cases 412 and 413). One stop on Mill Lane was found wrongful" |
| Calendar | The festival calendar and the date: festivals ahead, the season, day length | "A lantern festival falls on the next rest day" |
| Roads | Route ledgers, in country mode: reported raids and patrols | "One raid was reported on the coast road" |

## Rules

The gazette prints the recorded world, under the same content rules as the rest of the game.

1. **Records only.** Every story comes from a record with an id. The gazette module reads only the record store, never true state, so an unrecorded event cannot be printed.
2. **No personal names anywhere.** People appear only as roles and counts ("a baker", "three births"). Names carry culture through naming customs, and a paper that mixes names with crime stories could pair the two.
3. **The justice column shows case numbers and roles**, never names, culture, looks or wealth, and no pictures of people. A wrongful stop gets the same priority and length as an arrest, and releases and acquittals are printed too.
4. **Crime never leads by default.** Town events such as a harvest, a festival or a new building outrank routine reports, so the front page is not a crime feed.
5. **Culture appears only in festival and music stories**, never in the justice column. Festival text avoids generic claims about a culture and hierarchy words (round 8).
6. **Plain words.** No sensational terms such as "crime wave" and no adjectives about people. Every story is a template with slots.
7. **Wealth never shows.** No rich lists, and no story says what a person owns or earns.
8. **The true view adds one margin note:** how many crimes happened that day that nobody recorded. The paper itself never changes.
9. **Text passes the CI filters** for names, profanity, generic claims and hierarchy words.

## How it works

An edition is a pure function of the records: edition(settlement, day) = f(records up to that day's boundary). The gazette reads the sim's records and never feeds the sim.

- **When:** one edition per settlement at 06:00, covering the day before. At 4× and 16× editions keep coming and the panel shows the latest. A skip prints only the edition for the day it lands on.
- **Choosing stories:** each new record maps to a story type with a fixed priority. The front page is the top story, and ties break by record id. At most two stories come from one section, so no section crowds the paper. No randomness is involved.
- **Templates:** each story type has a few plain sentences with slots for counts, case numbers, places, goods and prices. The variant comes from a keyed draw on (world seed, settlement, day, story), outside the sim's own streams. Templates live in one string table, so they can be translated later.
- **Determinism:** a replay prints byte-identical editions, and turning the gazette off changes no state hash. Saves never store editions; they are rebuilt from the records.
- **The panel:** a paper-styled panel in the HUD, in HTML rather than canvas so screen readers can read it. A dot on the gazette button marks a new edition, and the run never pauses for it. Back issues browse by date, and a replay that seeks to a date shows that day's edition.
- **Follow the news:** an opt-in camera that, at 4× and 16×, eases to the place of the front-page story with each new edition. It answers the open question about steering at fast speeds (Time & calendar).
- **The year-end edition** is the year-in-review card, printed as the gazette's special issue.
- **Country mode** keeps one paper per town, built from each town's ledger (owner, 7 October 2026), and adds a national gazette from the aggregate ledgers: harvests, prices, migration and recorded raids on the roads.
- **Cost:** an edition is a few hundred bytes of text from tens of records a day, well under 1 ms to build (unsourced estimate).
- **Art and sound:** a rolled-paper button icon at 16 and 8 px, and a paper panel frame. No new sound: a new edition shows only the dot.

## Work by milestone

The gazette takes about 5.5–9 days, all before launch (unsourced estimate). Each task is in Implementation plan, tagged (Gazette).

| Milestone | Work | Days |
| --- | --- | --- |
| M3 City life | The core: record queries, story priorities, templates, the daily edition and the panel with back issues, with town, market and calendar sections (2–3); the button icon and panel frame (0.5–1) | 2.5–4 |
| M4 Crime and police | The justice column, the true-view margin note and the audits | 1–2 |
| M5 Society and policy | The year-end edition and the follow-the-news camera | 1 |
| M8 Country map | Each town's paper from its ledger, and the national gazette | 1–2 |

**Exit checks:**

- M3: every story in 100 editions traces to a record id, the gazette module imports only the record store, a replay prints byte-identical editions, and turning the gazette off changes no state hash.
- M3: every template and printed edition passes the name, profanity, generic-claim and hierarchy-word filters.
- M4: over 50 paired seeds, the justice column's counts equal the recorded counts, never the true ones.
- M4: no justice story carries a name, culture, look or wealth term; a wrongful stop and an arrest get the same priority; and the culture flip test leaves every story outside festivals unchanged.
- M5: the follow-the-news camera is off by default and never changes the state hash, and the year-end edition never breaks figures down by culture.
- M8: the national edition's figures equal the ledgers' recorded figures.

## Open questions

- Should the true view's margin note exist, or should players find unrecorded crime only on the true-view map?
- Do street and district names ever come from a culture's naming custom? If so, justice stories should name districts by number.
- Does a daily justice column build the illusory correlation that round 8 flagged for streams of crime events? Test it with the playtest panel before M4 ships.
