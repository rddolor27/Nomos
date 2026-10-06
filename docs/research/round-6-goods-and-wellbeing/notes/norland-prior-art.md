# Norland as prior art for needs, food, goods, wealth and crime (round 6, question 6), status 5 October 2026

Norland is a medieval colony and kingdom sim by Long Jaunt, published by Hooded Horse, in Steam Early Access since 18 July 2024. The main branch is at Patch 56 (31 July 2026) and the beta at Patch 58 (2 October 2026). A "fundamental update" before the end of 2026 will rework knowledge, trade and lords' pay. Norland simulates every resident of one town as an autonomous agent, so it is the closest commercial relative of Nomos's city mode. Round 2's prior-art survey could not reach any commercial colony sim, so this note does not repeat it.

Conventions:
- **"opened":** I read the source in full.
  - **Steam posts:** 207 official posts (18 Jan 2022 to 2 Oct 2026) came through the Steam News API, `api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1857090&count=300&maxlength=0`, which returns each post's full text. Fetched 5 Oct 2026.
  - **Links:** Steam links use the store form `store.steampowered.com/news/app/1857090/view/<id>`. Two were checked and returned HTTP 200.
- **"community wiki":** the publisher-hosted wiki calls itself the "Official Community Wiki", and anyone can edit it (CC BY-SA). The live site returned a Cloudflare 403. I read each page in full from a Wayback snapshot, and each citation gives the page's last-edit date. Treat it as secondary and often stale.
- **"player opinion":** Steam reviews (read through the official review API) and player guides. These are secondary sources.
- **Other labels:** "search summary", "computed", "measured here" and "inference" follow `.claude/rules/docs.md`.
- **Dates and numbers:** mechanics change almost weekly, so every finding carries its patch date. All numbers are game-balance values, not empirical evidence.
- **Copying:** I quote at most 25 words at a time. No text, image or asset from Norland was copied into the repo. The production-scheme image was viewed only.
- **Access:**
  - **Blocked:** the live wiki (Cloudflare 403 to curl and WebFetch), Reddit (an interstitial page, so the designer's "Why are there so many bugs" post went unread), SteamDB (403) and the Discord.
  - **Unread:** GameRant was seen only in search results. I did not play the game, so nothing here was checked in-game.

## a) Needs, mood and happiness

### Takeaway
- **Mood is a sum of thoughts:** mood is a 0–100 sum of timed "thoughts". Needs matter only through the thoughts they emit. The needs are sleep, food, rest and piety, plus care for children and sex for adults. Below 25, a character counts as "unhappy".
- **Low mood acts through thresholds on day averages:**
  - A group rebels when its day-average mood falls below 25.
  - Migration adds one migrant per 10 points of day-average mood above 30. Unhappy residents can leave; the beta rule set that at 25.
  - Peasants who wake at mood 75 or more get +50% productivity for 2 days.
- **Lords have extra failure modes:**
  - They refuse work when depressed.
  - Below mood 80 they can start "resolutions", such as robbing rings, which last at most 3 days.
  - They have nervous breakdowns, which run from binge drinking to self-harm and get worse the lower the mood.
- **Legibility was retrofitted under criticism:**
  - Thought lists show values.
  - A panel lists the strongest thoughts of the last 24 hours, weighted by how long each lasted.
  - Tooltips state each good's daily mood effect.
  - A map overlay shows each house's average mood.
  - Hidden meters (rest, satiety) lost their hard effects because players could not see them.

### Cited Findings
- **Mood scale and needs:**
  - "Every character has a Mood, which ranges from 0 to 100 and is the sum of all thoughts". Needs: Sleep, Food, Rest, Piety, Care (children) and Sex (adults aged 14–50). "If Mood falls below 25 the character will become unhappy" — [Population, last edited 2 Feb 2025](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population) (opened, community wiki)
  - An empty sleep meter makes a character collapse. Low food leads to starvation and death. Rest refills slowly when idle and quickly with alcohol or nectar. Piety refills through prayer at 8–9 AM, faster at temples — [Population](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population) (opened, community wiki)
- **Example thoughts:**
  - Own home, a meal and a drink "within the last days" give "Life is fulfilling", +10 — [Population](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population) (opened, community wiki)
  - "Morning service" gives +8 for 8 h, and "Separate housing" gives +10 — [Construction, last edited 22 Aug 2024](https://web.archive.org/web/20250429150734/https://wiki.hoodedhorse.com/Norland/Construction) (opened, community wiki)
  - Later values: "New Resident Optimism" +20, "I've Been Insulted!" −14, "Separate Housing" +18, "Fanatic" +12 — [Beta Branch Update, 24 Mar 2025](https://store.steampowered.com/news/app/1857090/view/1794830911005142) (opened)
- **Durations are tuned per patch:** "Was on Patrol" went from 24 h to 12 h, and "Fear of Death" from 7 to 5 days. The "Overpopulation" thought now starts at 125 residents instead of 100 — [Patch #37, 16 May 2025](https://store.steampowered.com/news/app/1857090/view/1799817379503234) (opened)
- **Design intent:** residents' needs "are met by the consumption of goods". "The better they satisfy them, the greater their happiness". Residents may leave or rob others when unhappy — [Devlog #9 Economic model, 19 May 2022](https://store.steampowered.com/news/app/1857090/view/4292505348825722484) (opened)
- **Daily rhythm:**
  - Residents wake at 7:00, work 9:00–18:00 and spend evenings at the tavern, square and market. Criminals act after dark, and lights go out around 2:00 — [Devlog #6 Daily life, 9 Mar 2022](https://store.steampowered.com/news/app/1857090/view/4247463006800979975) (opened)
  - Market hours were cut from 18:00–22:30 to 18:00–20:00 — [Patch #24, 8 Oct 2024](https://store.steampowered.com/news/app/1857090/view/6350729003512211208) (opened)
- **Migration:**
  - The rule is "Plus one migrant for every 10 points of average mood per day (starting from 30 mood points)". A negative thought about overcrowding appears at large populations — [Major Update #35, 8 Apr 2025](https://store.steampowered.com/news/app/1857090/view/1795917897488927) (opened)
  - The beta version used steps instead: above 50, 3 people arrive; above 80, 5 arrive; below 25, people leave — [A Damn Big Update (beta), 21 Mar 2025](https://store.steampowered.com/news/app/1857090/view/1794830910909048) (opened)
  - Modifiers: a neighbour's war adds +1 migrant and terror subtracts 3 — [Beta Branch Update 3, 28 Mar 2025](https://store.steampowered.com/news/app/1857090/view/1795283637856117) (opened)
  - More than 10 free jobs triggers a migration bonus — [Patch #39 (beta), 22 Aug 2025](https://store.steampowered.com/news/app/1857090/view/1808601382484465) (opened)
  - "Migration can be stopped with one button" — [Big Autumn Update, 12 Dec 2025](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **Rebellion triggers:**
  - Prisoners or warriors rebel if their mood averaged over a day falls below 25.
  - Fanatics rebel if the average peasant mood over a day falls below 25.
  - The heir rebels if loyalty reaches 0.
  - Source: [Population](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population) (opened, community wiki)
- **Happiness and productivity:**
  - Characters "who wake up happy in the morning receive an energy surge that lasts for 2 days". Peasants get +50% productivity, including construction; warriors get +7 Combat; lords get +5 to skills for 1 day. Peasants qualify at mood 75 or more at 8:00 or after a sermon — [Patches 46–48, 20 Feb 2026](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
  - Lords' Inspiration now requires waking with mood 90 or more — [Patch #42, 7 Nov 2025](https://store.steampowered.com/news/app/1857090/view/1815580768299345) (opened)
  - Earlier, "Loyalists" grew out of happy peasants. They were 20% more productive and never turned criminal or rebelled — [October Progress Update, 29 Oct 2023](https://store.steampowered.com/news/app/1857090/view/5229301621586491810) (opened). Their productivity bonus was removed in February 2026 — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **The designer's own diagnosis:** mood tools' "effects are not transparent" and, "once you solve the migration issue, these tools become mostly unnecessary". Energy surges were added to give happiness a payoff — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **Lords' failure modes:**
  - "Lords will refuse to work only when they are depressed" — [Patch #2, 20 Jul 2024](https://store.steampowered.com/news/app/1857090/view/5969041959971985255) (opened)
  - Resolutions start only when a lord's mood is below 80 and last at most 3 days — [Patch #28, 13 Dec 2024](https://store.steampowered.com/news/app/1857090/view/1785774543562366) (opened)
  - Breakdown severity depends on how low the mood was, from "binge drinking to severe forms like suicide". A character's first breakdown is mild. Portraits are green, yellow or red by mood — [Lords, last edited 30 Apr 2026](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Lords) (opened, community wiki)
  - The "Self-Harm" breakdown was limited to three cuts — [Patches 54–56, 31 Jul 2026](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Soft gates replaced hard ones:** "bad mood or low hunger/sleep/rest no longer fully block actions; they'll just happen less frequently". Tasks now have three priority levels — [Patch #42](https://store.steampowered.com/news/app/1857090/view/1815580768299345) (opened)
- **Hidden meters lost their hard effects:**
  - The "Malnutrition" thought, triggered when hidden satiety fell below 20, was removed.
  - Low Rest no longer stops work, "since this is a hidden parameter not visible to the player".
  - Source: [Patch #42 Hotfix, 10 Nov 2025](https://store.steampowered.com/news/app/1857090/view/1815580768393909) (opened)
- **Needs were thinned for elites:**
  - The Needs tab was removed, because physiological needs "didn't apply well to elites who never worry about food or shelter".
  - The "Fatigue" thought was removed, so alcohol is now "a straightforward, long-lasting mood boost".
  - Source: [A Damn Big Update (beta)](https://store.steampowered.com/news/app/1857090/view/1794830910909048) (opened)
- **Legibility tools:**
  - The citizen panel shows "the strongest positive and negative thoughts over the last 24 hours" — [Patch #41, 10 Oct 2025](https://store.steampowered.com/news/app/1857090/view/1813041031246909) (opened)
  - "If a thought lasted only 1 hour out of 24, it will appear as 24× weaker" — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
  - Tooltips give daily mood bonuses for food, alcohol, nectar, punishments and sermons. The King's Eye overlay shows the average happiness of each house — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
  - The low-happiness alert moved from 40 to 30 — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Housing comfort:**
  - Neighbours change a house's comfort: industry lowers it, while housing, the hall and social buildings raise it — [Big Summer Update, 14 Jul 2025](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
  - Spaciousness and commute length matter — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
  - Temple range matters — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
  - Rivers and lakes add comfort — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
  - The rationale: "Densification lowers quality of life" — [Spring-Summer 2025 Roadmap, 5 Mar 2025](https://store.steampowered.com/news/app/1857090/view/1793384379345308) (opened)
- **Press:** "The cause and effect of Norland's systems is incredibly lucid". But Holy Rings "can arbitrarily screw you over in ways you cannot resolve" — [PC Gamer, Rick Lane, 16 Jul 2024](https://www.pcgamer.com/games/strategy/i-tried-to-stop-my-peasants-from-starving-in-norland-but-their-lords-only-care-about-sex-and-holy-rings/) (opened)
- **Players:**
  - One player with 276 h complains of "non transparent ways" to set the player back — [review, 1 Jun 2025](https://steamcommunity.com/profiles/76561198022659517/recommended/1857090/) (opened, player opinion)
  - Another finds "too many mechanics in the background which are not clear" — [review, 30 Jun 2026](https://steamcommunity.com/profiles/76561198013383739/recommended/1857090/) (opened, player opinion)

### Inferences
- **The model ports to integers:** "mood = bounded sum of typed, expiring thoughts" maps directly onto integer state. Each thought slot can hold a type (u8), a value (i8) and an expiry hour (u16), with mood = clamp(Σ, 0, 100). No transcendental maths is needed.
- **Day averages fit the day boundary:** Norland drives migration, rebellion and alerts from duration-weighted day averages. Nomos can accumulate integer mood-hours per agent and commit district aggregates only at the day boundary, as `sim-core.md` requires.
- **Biases, not hard gates:** Norland's arc ran from need meters that gated actions to thoughts that bias choices, with every effect visible. M3's utility scoring should work the same way, and the click-to-explain panel should name the thought behind each effect.
- **Wellbeing must pay off:** Norland had to add energy surges because happiness bought nothing once migration was solved. In Nomos, wellbeing should feed productivity, crime propensity and migration, or it becomes a decorative statistic. Norland's +50% is a balance number; the happiness researcher should supply the calibration.
- **Same needs for everyone:** Norland exempts elites from physiological needs, an explicit class asymmetry. Nomos's single shared body points the other way: everyone has the same needs, and differences come only from circumstances.

### Gaps
- No base mood, need-decay rates or full thought catalogue is published. The in-game encyclopedia was not reachable because I do not own the game.
- I could not tell whether the 0–100 range is a hard clamp or only typical.
- The wiki's need list predates the April 2025 needs rework.

## b) Food: types, quality, spoilage, cooking chains and famine

### Takeaway
- **Food is an ordinal quality ladder eaten best-first:** meat > flour ≈ carrots > rutabaga, plus berries since February 2026. Drinks follow ale > beer > moonshine. A peasant eats one food unit a day and stores any surplus at home.
- **Quality acts only through mood thoughts, scaled by class:**
  - Rutabaga and moonshine hurt lords and warriors most.
  - Meat pleases peasants and prisoners most.
  - Since November 2025, flour and carrots also upset lords and soldiers.
- **Spoilage arrived in July 2025 as a storage mechanic, not food safety:**
  - Warehouses have capacity per category, and overflow spoils.
  - Food always spoils in regular warehouses, at 5% and then 10% from April 2026. The time period is not stated.
  - Granaries reduce spoilage, and the hall and barn stop it unless overfilled.
- **Famine comes from shocks and seasons:**
  - Crops can fail for 3 days, rats can take 10–15% of food for 7 days, and drought can strike.
  - A warning comes 5–8 days ahead if church relations allow.
  - Prices spike (×3 for a failed crop, ×1.5 in a drought), which rewards stockpiles.
  - Since April 2026, each 12-day cycle has a harsh season of 4 days (7 in the north) in which crops do not grow.

### Cited Findings
- **Food and drink ladder:**
  - Meat is "Bought and eaten first" and raises mood, "especially for peasants and prisoners". Flour leaves mood unaffected and is eaten second. Rutabaga lowers mood, "especially for lords and warriors", and is eaten last. Ale, beer and moonshine follow the same pattern. Lords take food free from the warehouse or hall, while peasants buy at the market or from the caravan — [Resources, last edited 30 Jun 2024](https://web.archive.org/web/20250429011211/https://wiki.hoodedhorse.com/Norland/Resources) (opened, community wiki)
  - The same order (meat, flour, rutabaga) appears in a guide — [GameRant](https://gamerant.com/how-to-make-every-type-of-food-norland/) (search summary only)
- **Class-scaled taste:** "Lords and warriors now get more upset when they have to eat rutabagas and drink moonshine than peasants, and meat and ale please them less" — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened)
- **Tuning history:**
  - The rutabaga and moonshine thoughts for lords and soldiers were softened on easier difficulties — [Patch #1, 19 Jul 2024](https://store.steampowered.com/news/app/1857090/view/5969041959968858365) (opened)
  - Later, flour and carrots gained negative thoughts for lords and soldiers. The turnip thought became "1.5× stronger and lasts twice as long", the meat thought became weaker, and alcohol thoughts were halved for lords — [Patch #42](https://store.steampowered.com/news/app/1857090/view/1815580768299345) (opened)
  - Meat and berry thoughts were then doubled — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **Carrots:** they yield every day and "in terms of quality, they're like Flour", but are unproductive — [Patch #39 (beta)](https://store.steampowered.com/news/app/1857090/view/1808601382484465) (opened). Their sale price fell from 5 to 3 coins and their yield by 20% — [Patch #40, 12 Sep 2025](https://store.steampowered.com/news/app/1857090/view/1810503566453341) (opened)
- **Household buffer:** peasants "consume one food per day, and all the excess is stored in the basements of their homes". The developers added notices because players missed this, and the Economy menu now shows food kept in homes — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **Buying rules:**
  - Poor residents skip luxury food or alcohol if they were fed that day, and receiving ale stops them buying beer or moonshine — [Beta update, 1 Jul 2025](https://store.steampowered.com/news/app/1857090/view/1803527891672028) (opened)
  - Meat or ale is bought only above 45 coins, and residents buy from the caravan when not supplied — [Big Summer Update](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
  - Later, 120 gold or more is needed to buy them from the caravan — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **Storage and spoilage:**
  - Warehouses have "fixed capacity by resource category". "Overfilled resources will spoil. Food always spoils". A granary reduces spoilage, and resources are still pooled across warehouses ("the cloud structure remains") — [Big Summer Update](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
  - In the hall and barn, food "no longer spoil[s] there unless overfilled" — [Beta update, 25 Jun 2025](https://store.steampowered.com/news/app/1857090/view/1803527891478225) (opened)
  - "Spoilage of food and plant resources in a regular warehouse has been increased from 5% to 10%" — [Patches 50–53, 11 May 2026](https://store.steampowered.com/news/app/1857090/view/1832065502822072) (opened)
  - Before then, "food doesn't go bad in this game (except for one disaster)" — [GameRant](https://gamerant.com/how-to-make-every-type-of-food-norland/) (search summary only)
- **Why storage was added:** in a shared "cloud", "materials can be accessed from any warehouse … This makes logistics irrelevant" — [Spring-Summer 2025 Roadmap](https://store.steampowered.com/news/app/1857090/view/1793384379345308) (opened)
- **Shocks:**
  - Crop fields can produce nothing for 3 days, with prices ×3. For 7 days, "10–15% of each food and crop will be lost", with prices ×3. A prophecy comes 5–8 days ahead if relations with the church head (the Matriarch) are above −25 — [Beginner's Guide, last edited 2 Aug 2025](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Beginner%27s_Guide) (opened, community wiki)
  - There are nine disasters, and a crop failure lets stockpilers profit — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened)
  - Drought raises food prices — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened). The drought multiplier fell from ×2 to ×1.5 — [Patch #49, 27 Feb 2026](https://store.steampowered.com/news/app/1857090/view/1825727806710941) (opened)
- **Seasons:**
  - Normal seasons last 12 days, and the harsh season 4 days (7 in the north). Vegetables grow in 3 days, and wheat and hops in 6. Harvesting early halves the yield. Crops that cannot grow in the harsh season rise in price — [Patches 50–53](https://store.steampowered.com/news/app/1857090/view/1832065502822072) (opened)
  - The rain fertility bonus fell from +30% to +10% — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Food, crime and illness:**
  - "A starving peasant when attempting to steal food will immediately become a bandit" — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
  - "Rutabaga Typhus" advice appears when at least three susceptible residents of one culture recently ate rutabaga — [Patch #58 (beta), 2 Oct 2026](https://store.steampowered.com/news/app/1857090/view/1845383656387035) (opened)
- **Planned chains:** a bakery (flour + firewood → bread), a smokehouse (meat + firewood → smoked meat), a hunter's lodge and berries are planned — [production scheme in the H2 2025 Roadmap](https://store.steampowered.com/news/app/1857090/view/1811138915430110) (opened, image viewed). A livestock system is also planned — [Fundamental Update devlog, 2 Oct 2026](https://store.steampowered.com/news/app/1857090/view/1845383656387036) (opened)

### Inferences
- **Spoilage is aggregate stock decay:** Norland decays stock by storage type rather than expiring individual items. The cost scales with stock categories, not item counts. Nomos can apply one daily integer loss per (pantry or shop, tier, storage type) at the day boundary, with keyed stochastic rounding, so it stays deterministic.
- **Half-life:** if 10% is per day, stock halves in about 6.6 days (computed: ln 0.5 ÷ ln 0.9). The period is not stated, so treat this only as an order of magnitude.
- **Taste by class must not be copied:** Nomos has no visible classes. A defensible substitute (inference) is habituation: an agent's reference quality is its recent average, and eating below it gives a negative thought.
- **Shocks make good teaching scenarios:** a shock leads to a price spike, which leads to stockpiling. Nomos should present forecasts with uncertainty, not prophecies, and log each shock as an input.
- **Make home buffers visible:** Norland's hidden home stocks blunted shortages and confused players until they were shown. The Nomos inspector should show household food reserves from the start.

### Gaps
- The spoilage period, the granary rate and any per-food differences are unpublished.
- The satiety decay rate and any health effect of food quality beyond typhus are unknown.

## c) Resources, production chains, seasons and trade

### Takeaway
- **Chains are short:** they run 1–3 steps. About 11 raw sources feed about 10 workshops and about 30 goods. The September 2025 target scheme "would roughly double the current economy".
- **Production needs lords:** a lord's instructions last 3 days. After that, output drops 50%, or 80% on the hardcore difficulty. A chancellery automates 10–25 buildings for paper.
- **Scarcity and nature carry the strategy:**
  - Iron is finite: 100–150 units per mine level, after which output falls to about a third.
  - Soil erodes once more than 80% of the forest is cleared (later 50%).
  - Forests regrow 1 unit per 10 h, and fields need wood as fertiliser every 10 days.
  - Seasons restrict growing.
- **An outside price-setter dominates trade:**
  - The Holy Caravan (the church's trader) visits every few days and caps internal prices.
  - It saturates when oversupplied and spikes prices ×2–×3.
  - Neighbours trade through contracts, with at most 12.
  - A late-2026 rework removes contracts and limits the caravan to buying raw goods at full price.

### Cited Findings
- **Buildings:** fields are harvested every 3 days and need wood equal to half their cost every 10 days. Production runs 9:00–18:00 and service buildings 17:00–23:00. Roads cost 4 gold per tile and add +30% speed — [Construction](https://web.archive.org/web/20250429150734/https://wiki.hoodedhorse.com/Norland/Construction) (opened, community wiki)
- **Scheme:** the image marks existing and planned buildings and goods, with dark-blue buildings and yellow resources "not in the game yet". The roadmap says the full scheme "would roughly double the current economy" — [H2 2025 Roadmap, 19 Sep 2025](https://store.steampowered.com/news/app/1857090/view/1811138915430110) (opened, image viewed only)
- **Lord instructions:**
  - Inspections "always lasted for three days" — [November Progress Update, 1 Dec 2023](https://store.steampowered.com/news/app/1857090/view/5395937983665561423) (opened)
  - When supervision ends, productivity falls 50% (80% on hardcore) — [Patch #8, 25 Jul 2024](https://store.steampowered.com/news/app/1857090/view/5963413094348849904) (opened)
  - One lord can manage 7–10 buildings — [Beginner's Guide](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Beginner%27s_Guide) (opened, community wiki)
  - The chancellery cap was 15 buildings — [Major Update #35](https://store.steampowered.com/news/app/1857090/view/1795917897488927) (opened). It then became 10, with 3 paper a day per linked chancellery — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Scarcity:**
  - Soil erodes from 80% deforestation, iron is finite at 100 units per mine level, markets saturate, and speculators appear — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened)
  - Erosion now starts only at 50% clearance — [Patch #2](https://store.steampowered.com/news/app/1857090/view/5969041959971985255) (opened)
  - Iron is 150 per level on medium difficulty, and a depleted mine produces 70% less, about 10 units a day — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
  - Trees grow 1 unit every 10 hours — [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **Progression:**
  - Population tiers are 20, 40 and 55, then rise by 15 each — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
  - The final tier rose from 100 to 110 — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
  - A knowledge tree will replace the tiers, separate from population and gold — [Fundamental Update devlog](https://store.steampowered.com/news/app/1857090/view/1845383656387036) (opened)
- **Trade:**
  - The caravan "can increase the price of goods in high demand", and residents trade with it too — [Devlog #9](https://store.steampowered.com/news/app/1857090/view/4292505348825722484) (opened)
  - A province under attack sees "the prices of the goods it sells double" — [Global Map devlog, 18 Dec 2023](https://store.steampowered.com/news/app/1857090/view/5409450219988213267) (opened)
  - Random caravan price rises went from ×1.5 — [Patch #27](https://store.steampowered.com/news/app/1857090/view/1783872412015968) (opened) — to ×2–×3 — [Patch #39 (beta)](https://store.steampowered.com/news/app/1857090/view/1808601382484465) (opened) — and are now capped at ×2 — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
  - Trade agreements are capped at 12 — [Patch #20, 30 Aug 2024](https://store.steampowered.com/news/app/1857090/view/6240387642458101381) (opened)
  - Planned: caravans will buy "only certain goods at full price, mostly basic raw materials"; contracts go; a Caravan Stop building arrives — [Fundamental Update devlog](https://store.steampowered.com/news/app/1857090/view/1845383656387036) (opened)
- **Distribution:**
  - Food and alcohol can be handed out directly instead of sold — [Big Summer Update](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
  - A barter-to-cash transition was planned, with daily local traders — [Spring-Summer 2025 Roadmap](https://store.steampowered.com/news/app/1857090/view/1793384379345308) (opened)
- **Technological transition:** basic goods are to lose value as the world develops, pushing low-level industry out to villages — [H2 2026 Roadmap, 29 May 2026](https://store.steampowered.com/news/app/1857090/view/1833968530891374) (opened)

### Inferences
- **Depth comes from scarcity, seasons and an outside price:** Norland's economy gets its depth from these, not from deep chains. This supports keeping Nomos's chains shallow, as the resources researcher is testing.
- **Skip the lord-instruction mechanic:** it is a control device that ties nobles to production, not a model of firms. Reviewers attacked it as micromanagement.
- **The caravan is a teachable price band:** its price acts as an import-parity ceiling, and speculators buy below it. That is a parity band with arbitrage, which M7's trade layer can teach directly.

### Gaps
- Building output rates, the market-saturation curve and the caravan's price formula are unpublished.

## d) Wealth and money

### Takeaway
- **Everyone holds coins:**
  - Every peasant and soldier holds personal coins, and lords have too since July 2025 (before that, Holy Rings).
  - The player pays daily wages per class and sets internal market and tavern prices.
  - There is no household tax, so money returns through player-priced sales, confiscation and paid sermons.
- **The money loop is explicit:**
  - Inflows come from caravan sales and migrants' savings.
  - Outflows come from emigrants, mercenaries and residents buying from the caravan.
  - The caravan price caps internal prices.
- **Wealth enters mood through fixed coin thresholds:**
  - "Wealth" at 31 coins or more, and "Empty Pockets" at −12.
  - Luxury food is bought above 45 coins.
  - "Greedy" after 7 days without gold, and "Contemptuous" after 10 days at 500 or more.
  - "Indecently Rich" for lords at 1,000.
  - Gifts count for less above 700 gold.
- **Inequality is structural:**
  - Lords eat free while peasants pay, tastes depend on class, and Holy Rings breed envy.
  - Wealth shows as numbers in panels, but class shows in clothing colour.

### Cited Findings
- **Model summary:**
  - "Residents have personal property and money. It is possible to take it away, but it causes resentment".
  - The player sets wages and the internal market price.
  - Money enters with the caravan and migrants' savings, and leaves with emigrants and mercenaries.
  - Prices above the caravan's mean "the money goes out of the economy".
  - Taverns "work as agents of equalizing inequality".
  - Source: [Devlog #9](https://store.steampowered.com/news/app/1857090/view/4292505348825722484) (opened)
- **Finance tab:** wages are set per class (peasants, warriors, unemployed), along with daily quantity and price per good. "Make sure that each peasant earns enough money to be able to buy one unit of food once a day" — [gamepressure guide, 23 Jul 2024](https://www.gamepressure.com/norland/how-to-take-care-of-peasants-needs/za11512) (opened, guide)
- **Two currencies:** gold pays wages and trade. Holy Rings serve lords' actions; having few gives a negative thought, and gaps between lords breed envy — [Resources](https://web.archive.org/web/20250429011211/https://wiki.hoodedhorse.com/Norland/Resources) (opened, community wiki)
- **Holy Rings criticised:** lords "constantly want rings", and the shortage creates "deteriorating cycles of ring-related sadness that you often can't address" — [PC Gamer](https://www.pcgamer.com/games/strategy/i-tried-to-stop-my-peasants-from-starving-in-norland-but-their-lords-only-care-about-sex-and-holy-rings/) (opened)
- **Lords' gold:**
  - "Now, lords have gold, which ties them to the main economy".
  - The "Wealth" thought starts at 31 coins or more.
  - "Greedy" means 7 days without gold, and "Contemptuous" means 10 days at 500 or more.
  - Rewards are paid from the treasury.
  - Source: [Big Summer Update](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
- **Luxury thresholds:** luxury purchases started above 50 coins — [Beta update, 1 Jul 2025](https://store.steampowered.com/news/app/1857090/view/1803527891672028) (opened). Later, buying from the caravan needs 120 gold or more — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **Poverty and gifts:** "Empty pockets" was strengthened to −12. Gifts work better when the recipient has under 100 coins, and a lord counts as rich above 700. Migrants of one culture (Makha) bring twice as much money — [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **Diminishing value:**
  - Confiscation now "takes all the money instead of half".
  - A mechanic was added "where the value of a gift decreases depending on the recipient lord's wealth".
  - Source: [Patch #39 (beta)](https://store.steampowered.com/news/app/1857090/view/1808601382484465) (opened)
- **Wealth thresholds and money flows:**
  - A bug fix moved "Indecently Rich" back to 1,000 gold.
  - A politician's followers donate "20% of their money" a day, keeping at least 150.
  - Sermons hand 100–350 gold to listeners.
  - The King's Eye shows the total money of a building's residents.
  - Source: [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **Taxes are on the player, not households:**
  - A church "army tax" was charged on the player through the caravan — [Update v0.2912, 27 Jul 2023](https://store.steampowered.com/news/app/1857090/view/5124584686245553020) (opened). It was removed in May 2025 — [Patch #37](https://store.steampowered.com/news/app/1857090/view/1799817379503234) (opened)
  - A "progressive tax scale on trade" applies to contracts — [Patch #18, 14 Aug 2024](https://store.steampowered.com/news/app/1857090/view/5875594803674645053) (opened)
  - No post mentions taxing residents (grep of all 207 posts for "tax", "tithe" and "levy").
- **Speculators:** an internal price below the caravan's "attracts vagabond speculators" who export cheap goods, making it harder to drain peasants' money — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened)
- **Planned:** lords will draw a daily gold upkeep, and warriors will move to the same system instead of contracts — [Fundamental Update devlog](https://store.steampowered.com/news/app/1857090/view/1845383656387036) (opened). Craftsmen will "demand payment in gold" and live only in high-comfort houses — [H2 2025 Roadmap](https://store.steampowered.com/news/app/1857090/view/1811138915430110) (opened)
- **Class colours:** "The figures dressed in green are representatives of the peasantry" — [gamepressure](https://www.gamepressure.com/norland/how-to-take-care-of-peasants-needs/za11512) (opened, guide). Lords wear red — [magicgameworld](https://www.magicgameworld.com/norland-characters/) (search summary only)

### Inferences
- **Fixed thresholds break under moving prices:** Norland prices are mostly player-set, so fixed coin thresholds hold. Nomos prices are endogenous and drift (M2), so wealth thoughts should use cash relative to the price index, or a log ratio to the agent's own recent income through a lookup table.
- **Avoid unresolvable positional loops:** if Nomos models relative income, the comparison should be a local reference group that is never rendered, and every such desire must have a reachable resolution.
- **Nomos is more realistic on taxes:** Norland's lack of household tax is a simplification. Nomos's M5 taxes and welfare already go further. The tavern "equalizer" is a designer framing of luxury spending that recirculates money, not evidence.

### Gaps
- Default wages, price formulas and money-supply statistics are unpublished.
- Whether wealth changes who gets robbed is unclear: bandits leave after 40 coins and cutthroats steal gold, but targeting rules are unknown.

## e) Crime and law, and the true-versus-recorded comparison

### Takeaway
- **Who offends, and why, changed three times:**
  - **2022–2024:** crime was internal. Unemployed or unpaid "miserable workers" became vagabonds and then cutthroats.
  - **December 2025:** with migration control, unemployment was easy to avoid and crime "almost disappeared". Vagrants were then imported with war refugees (15–50% chances).
  - **February 2026:** most criminals come from bandit camps in the player's province, and starving peasants who try to steal food become bandits.
- **Detection is patrols plus being caught in the act:** patrols cover a radius around flags, and caught criminals surrender after 3 strikes. A September 2023 system tagged unseen culprits and "a couple of other vagabonds" as suspects, for identification at the gallows. It was removed in March 2025 ("Executioners no longer conduct investigations").
- **Punishment is a public spectacle:** executions, forced labour, a shame mask or blinding give onlookers a mood bonus that scales with brutality. "Terror" (punishing innocents) deters crime but subtracts 3 from the migrant count and marks 3–5 of an innocent victim's acquaintances as "Terror Victim".
- **Victims and witnesses carry the cost:** victims keep an "unpunished" thought until the offender is punished. Since February 2026, only witnesses get crime thoughts, and crime scenes show on the map for 24 h. Players still complain that patrols fail and nobody investigates.

### Cited Findings
- **The original design:**
  - The social groups are lords, workers, soldiers, enslaved people and criminals, "people who for some reason (most often economic) choose to break the rules"; "miserable workers become criminals".
  - Soldiers dislike patrol duty, and paying the unemployed to patrol is an alternative.
  - Punishments include "execution, enslavement, cutting off a hand or a disgraceful mask".
  - Executing random innocents is "terror": it cuts criminality, but frightened people leave.
  - Source: [Devlog #4, 16 Feb 2022](https://store.steampowered.com/news/app/1857090/view/4246335198889511593) (opened)
- **Crisis spiral:**
  - Criminals rob residents.
  - Mood falls, some residents leave, and others turn criminal.
  - Fighting crime "requires resources, and there aren't enough of them".
  - Source: [Devlog #9](https://store.steampowered.com/news/app/1857090/view/4292505348825722484) (opened)
- **The September 2023 crime reform:**
  - "We've renamed criminals to avoid implying guilt through their names".
  - Unnoticed crimes give the culprit "and a couple of other vagabonds" the "suspect" trait.
  - Executioners bring suspects to the gallows, where spectators may identify them. Innocents are released.
  - Executioners also intimidate vagabonds, and guards react to anyone leaving a building with loot.
  - Source: [September Progress Update, 19 Sep 2023](https://store.steampowered.com/news/app/1857090/view/5480373588800549281) (opened)
- **Early 2024 balance:** bandits break into dormitories more often and leave "after stealing 40 coins" — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened)
- **The 2025 rework:**
  - Patrols catch criminals in the act, and they "surrender after three strikes".
  - Executioners "no longer conduct investigations" and carry out one execution a day in the evening.
  - "Crimes now have a greater impact, lowering the average mood of all city residents".
  - The chance of bandits arriving with migrants rose from 15% to 25%.
  - Source: [Major Update #35](https://store.steampowered.com/news/app/1857090/view/1795917897488927) (opened)
- **Vagabond limits:**
  - At most 3 vagabonds can appear per day — [Big Summer Update](https://store.steampowered.com/news/app/1857090/view/1805065414338643) (opened)
  - Vagabonds steal the most valuable goods and flee. Guards chase them, and stolen goods return if they are caught — [Patch #42](https://store.steampowered.com/news/app/1857090/view/1815580768299345) (opened)
- **Crime made external:**
  - The new settlement levels made "criminals … almost disappear", so vagrants were added who arrive when neighbours are at war.
  - "Full elimination of crime is possible if you gain control over your neighbors and establish peace on all your borders".
  - A migrant from a war zone is a vagrant with 15% chance, and with a bandit camp nearby, one migrant is a thug with 50% chance.
  - Source: [Big Autumn Update](https://store.steampowered.com/news/app/1857090/view/1818752592127950) (opened)
- **February 2026 fixes:**
  - "The main flow of criminals now comes from bandit camps in your own province".
  - Crime scenes appear in King's View for 24 h, and crimes show a speech bubble.
  - "The thought caused by crime is now received only by witnesses", and only two peasants get "Crime in the city".
  - Patrols start an hour early.
  - A starving peasant who tries to steal food becomes a bandit.
  - A victim drops the "criminal went unpunished" thought once the criminal is caught.
  - Source: [Patches 46–48](https://store.steampowered.com/news/app/1857090/view/1825093633188129) (opened)
- **Vagabonds:**
  - Peasants "who are unemployed and did not receive wages for too long can become vagabonds".
  - Victims and loved ones keep a negative thought "until the guilty vagabond is punished".
  - Vagabonds turn into cutthroats over time, partly through watching executions.
  - The scaffold intimidates non-offending vagabonds for a day.
  - Source: [Population](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Population) (opened, community wiki)
- **Terror and spectacle:**
  - The scaffold's "Terror" option punishes vagabonds, then the unemployed, then peasants. Happiness and migration fall, and "unhappy peasants will not become vagabonds".
  - Onlookers get an "Execution spectacle" mood bonus that scales with the punishment.
  - Source: [Construction](https://web.archive.org/web/20250429150734/https://wiki.hoodedhorse.com/Norland/Construction) (opened, community wiki)
- **Punishing the innocent:** punishing an innocent gives 3–5 of the victim's acquaintances "the Terror Victim status". Punishment removes victims' "thought of impunity". The punishments are execution, the mask of shame (anyone in a bad mood may beat the wearer) and blinding — [Actions, last edited 13 Mar 2025](https://web.archive.org/web/20260504201149/https://wiki.hoodedhorse.com/Norland/Actions) (opened, community wiki)
- **Player guide:**
  - "Criminals mostly come from migration", and "if your people are too happy, you will receive more criminals".
  - A criminal offends only given "an opportunity", meaning nobody there to stop them, and leaves after days without one.
  - The guide recommends "15% of your population as warriors on patrol".
  - Killing criminals before they offend causes terror, because they are "innocent until proven guilty".
  - Source: [Steam guide "How to handle crime in Norland", updated 10 Jan 2026](https://steamcommunity.com/sharedfiles/filedetails/?id=3643395980) (opened, player guide; Steam now marks it removed)
- **Player complaints:**
  - "If you don't catch them in the act … your peasants are apparently too stupid to accuse the criminals" — [review, 6 Jan 2026](https://steamcommunity.com/profiles/76561198047102011/recommended/1857090/) (opened, player opinion)
  - With 42 warriors and 62 peasants, a player still saw "Crimes go unresolved" and "The game doesn't tell you where they happen" — [review, 9 Feb 2026](https://steamcommunity.com/profiles/76561197993748063/recommended/1857090/) (opened, player opinion)
  - "20 soldiers on night patrol to catch 5 criminals and they fail every time" — [review, 4 Feb 2026](https://steamcommunity.com/profiles/76561198027005844/recommended/1857090/) (opened, player opinion)

### Comparison with Nomos's "true versus recorded crime"
- **No recorded-crime statistic:** Norland gives the player a nearly omniscient true view (crime bubbles, crime scenes for 24 h), while the town's record is only arrests made in the act. The gap between true and recorded exists but is never shown as a statistic. Showing that gap is Nomos's core lesson (inference).
- **The 2023 suspect system came closest:** it was a real "recorded ≠ true" device with false positives, close to Nomos's "suspected" record state. It was removed in March 2025, and by January–February 2026 players were asking for investigation and crime locations (inference from the sources above).
- **Visible marks break Nomos's rules:** Norland marks punished people visibly (shame mask, blinding, scars) and stages punishment as entertainment. This breaks art rules 3, 4 and 6 in `.claude/rules/content.md`.

### Inferences
- **Keep crime internal but not eliminable:** if full employment removes the only crime driver, crime vanishes; if crime is imported, players feel powerless. Nomos's opportunity-based offending, open to any agent, plus the hotspot field keep crime internal without one lever removing it.
- **Cascade guardrails are justified:** Norland's spiral (crime, then misery, then emigration and labour shortage, then more crime) is the cascade M4 already plans guardrails against.
- **Link clearance to wellbeing:** the "unpunished" thought ties the clearance rate (3–7% per true theft in M4) to victims' wellbeing. That makes it a concrete mechanism for M5's fear-of-crime meter.
- **Terror maps to wrongful stops:** "Terror Victim" spreading to acquaintances, plus lower in-migration, is a ready shape for wrongful stops lowering trust in police and legitimacy (M4).
- **Patrol ratios do not transfer:** the guide's 15% patrol share is 60 times Nomos's 0.25% police default (computed). It reflects a 100-person medieval town where soldiers double as guards, so it should not be imported.

### Gaps
- Detection probabilities, patrol radii and crime rates are unpublished.
- How many innocents the 2023 system tagged is known only as "a couple".
- The 15% patrol figure is unverified.

## f) Simulation architecture hints

### Takeaway
- **Every resident is a full agent:**
  - Each resident has needs, thoughts, relationships and a schedule.
  - A city holds dozens to about 200 people, and progression stops at 110.
  - The designer says population "is curbed by CPU performance, since our residents have complex AI".
- **Growth goes upward, not outward:** craftsmen are to replace peasants, "keeping the total population (and thus game performance) stable". An engine upgrade in September 2026 gave +60% average FPS, halved video memory, and allows "roughly twice the population".
- **Time is real-time with daily beats:**
  - The schedule acts as pseudo-turns, and the global map updates "once a day at 11 o'clock".
  - Wishes are issued at 21:00, jobs are rebalanced at night, and an Event Director (July 2026) times random events.
- **Choices are probabilistic:** activity choice uses priorities and probabilities rather than hard gates. Politicians pick their best target 53% of the time, the second 26%, the third 13% and the fourth 8%. Combat draws "tickets" from a bag, balanced offline with "thousands of virtual fights".

### Cited Findings
- **City size:**
  - The model targets "up to 200 people" — [Devlog #9](https://store.steampowered.com/news/app/1857090/view/4292505348825722484) (opened)
  - Early cities are kept small "by such mechanisms as migration, control at city gates, and fertility" — [Devlog #3, 9 Feb 2022](https://store.steampowered.com/news/app/1857090/view/4235075565595463619) (opened)
- **CPU as the population limit:**
  - "Our city population is curbed by CPU performance, since our residents have complex AI" — [H2 2025 Roadmap](https://store.steampowered.com/news/app/1857090/view/1811138915430110) (opened)
  - Characters are "very complex in behavior (and thus in computational resources)", and progression stops at 100 — [Plans for 2026, 7 Jan 2026](https://store.steampowered.com/news/app/1857090/view/1821288646577688) (opened)
  - The final tier is 110 — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Engine upgrade:** after the move "to a new version of the engine", cities support "roughly twice the population", and "average FPS increased by 60%, while video memory usage was cut in half" — [Patch #57 (beta), 4 Sep 2026](https://store.steampowered.com/news/app/1857090/view/1842846814446802) (opened)
- **Other technical limits:**
  - Squads are capped at 20 soldiers "due to technical constraints" — [Patch #38 (beta), 25 Jul 2025](https://store.steampowered.com/news/app/1857090/view/1806064758649920) (opened)
  - Autosaves "became progressively slower" until fixed — [Patch #23, 27 Sep 2024](https://store.steampowered.com/news/app/1857090/view/6339469370185782533) (opened)
  - Players report late-game lag from save size — [review, 1 Jun 2025](https://steamcommunity.com/profiles/76561198015913328/recommended/1857090/) (opened, player opinion)
- **Daily beats:**
  - "Map updates occur once a day at 11 o'clock". Map simulations settle into 3–4 large states by day 30–50 — [Global Map devlog](https://store.steampowered.com/news/app/1857090/view/5409450219988213267) (opened)
  - Wishes are issued at 21:00 — [Major Update #35](https://store.steampowered.com/news/app/1857090/view/1795917897488927) (opened)
  - "Political activity takes place between hours 16 and 24" — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
  - Full job rebalancing happens at night — [Patches 50–53](https://store.steampowered.com/news/app/1857090/view/1832065502822072) (opened)
- **Event Director:** it decides "when exactly" events happen: "a rebellion will still require unhappy characters" — [H2 2026 Roadmap](https://store.steampowered.com/news/app/1857090/view/1833968530891374) (opened). It covers attacks, prophecies, guests, conspiracies, uprisings and recovery "opportunities" — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Decision noise:** politicians choose their best target with 53% probability, then 26%, 13% and 8% — [Patches 54–56](https://store.steampowered.com/news/app/1857090/view/1839676055888772) (opened)
- **Combat model:**
  - Injuries have "tickets" pulled from a "bag".
  - The model simulator runs "tens, hundreds or thousands of virtual fights".
  - A character flees "if the pain level exceeds a character's mood".
  - Source: [Devlog #10, 21 Jun 2022](https://store.steampowered.com/news/app/1857090/view/6214419350722404998) (opened)
- **Determinism claims:** story generators are "complex, deterministic, and chaotic systems" — [Devlog #5](https://store.steampowered.com/news/app/1857090/view/4246335832505192684) (opened). A map seed reproduces a map only with the same generation settings — [Patch #58](https://store.steampowered.com/news/app/1857090/view/1845383656387035) (opened). No post claims bit-identical replays.
- **Team and history:** one designer, three full-time programmers, a freelance artist and a community manager. Development began "approximately 5 years ago". The game has "dozens of semi-autonomous characters" — [IndieGames interview with Dmitry Glaznev, 2 Nov 2023](https://www.indie-games.eu/interview-dmitry-glaznev-norland/) (opened)
- **Engine and hardware:**
  - The engine is GameMaker — [PCGamingWiki](https://www.pcgamingwiki.com/wiki/Norland) (opened, community wiki) and a [search result](https://www.mobygames.com/game/227837/norland/) (search summary)
  - Minimum spec is an i5-4570T with 8 GB; recommended is an i5-10700 or Ryzen 7 3700X with 16 GB — [Steam store page](https://store.steampowered.com/app/1857090/Norland/) (fetched summary)
- **Reception:** the review API reports 10,538 reviews, 8,603 of them positive (81.6%, computed) — [review API](https://store.steampowered.com/appreviews/1857090?json=1&language=all&num_per_page=0) (measured here, 5 Oct 2026)

### Inferences
- **The scale gap is two to three orders of magnitude:** Norland's per-agent richness saturates a desktop CPU at about 100–200 residents. Nomos needs 10,000–100,000 agents, which is 91–909 times Norland's 110-resident cap (computed). Nomos's "other agent systems" budget is 1.2 ms per tick at 10k agents, or 120 ns per agent per tick (computed from the plan's table).
- **Borrow the rules, not the deliberation:** Nomos should copy Norland's rules (thresholds, thought types, day beats) but not its per-agent deliberation. Thoughts should be fixed slots written by events, aggregates should be committed daily, and decisions should run on the timing wheel.
- **Opposite answers to scale:** Norland's "vertical" growth (fewer, richer agents) is the opposite trade-off to Nomos's per-cell aggregates and country ledger (M7).
- **No determinism precedent:** Norland offers no replay-determinism precedent; the designer's "deterministic" describes system design, not bitwise replay.
- **The Event Director would confound comparisons:** state-dependent timing breaks Nomos's paired-seed comparisons, so it should stay out of the sim core.
- **Weighted top-k choice is cheap:** the 53/26/13/8 rule is a softmax substitute that a keyed draw over an integer cumulative table can evaluate.

### Gaps
- No tick rate, thread model, per-agent cost or profiling data is published.
- The GameMaker claim rests on community wiki and search sources.
- Real peak populations reported by players were not verified.

## g) Borrow, adapt or avoid

Checked against `.claude/rules/content.md` (one shared body, jobs as clothes, crime as an act, records at institutions, wealth never shown, neutral police) and `.claude/rules/sim-core.md` (integers, keyed draws, zero allocation, canonical writes at the day boundary).

| Norland mechanic | Verdict | Nomos form | Milestone | Art and determinism check |
| --- | --- | --- | --- | --- |
| Mood = clamp(Σ timed thoughts, 0, 100); needs emit thoughts | Borrow | Up to 8 slots per agent (type u8, value i8, expiry hour u16) | M3 | Not rendered; integer only |
| Day-average thresholds: unhappy < 25, migration above 30, surge ≥ 75 | Adapt | Integer mood-hour accumulators; district aggregates; calibrate the numbers | M3, M5, M7 | Written at the day boundary |
| Strongest-thoughts panel weighted by duration over 24 h; tooltips with daily effects | Borrow | District panel plus a data table; inspector thought list | M3, M5 | Panels, never over heads |
| Hidden meters may not gate behaviour | Borrow (principle) | Every effect traces to a visible thought in click-to-explain | M3 | — |
| Low needs reduce frequency instead of blocking | Borrow | Utility weights, never hard blocks except collapse | M3 | Keyed draws |
| Quality ladder eaten best-first; 1 unit a day; surplus stored at home | Adapt | Pantry counts by food tier; buy best affordable | M3 (goods from M2) | Neutral bread or coin glyphs; integer counts |
| Taste scaled by class | Avoid as class; adapt as habituation | Reference quality = recent average | M3 | No class identity exists |
| Spoilage as % stock loss by storage type; overflow spoils | Adapt | Daily integer loss per (pantry or shop, tier, storage) | M3 | Day boundary; keyed stochastic rounding |
| Harvest shocks with warnings and price spikes | Adapt | Scenario inputs; forecasts with uncertainty, no prophecy | M5, M7 | Logged inputs |
| Caravan price ceiling, speculators, market saturation | Adapt | Import-parity band, arbitrage flows, demand memory | M7 | Plan-then-apply flows |
| Per-agent coins plus coin-threshold thoughts | Adapt | Thresholds relative to the price index, or log ratio to own income | M5 | Integer cents; log via lookup table; wealth stays unrendered |
| Holy Rings: a scarce positional currency with envy | Avoid | No unresolvable positional desires; any reference group stays local and hidden | M5 | Wealth never shows |
| Gift value falls with the recipient's wealth | Borrow | Log utility of transfers | M2, M5 | Lookup table |
| Migration from mood, vacancies, war and terror | Adapt | Amenity term beside expected wage in the migration hazard | M7 | Monthly, at the day boundary |
| Happiness gives +50% productivity | Adapt (small, calibrated) | Bounded productivity term | M3, M5 | Integer basis points |
| Crime from unemployment and unpaid wages | Adapt | Need term inside the opportunity-based offend utility; several channels | M4 | Crime is an act |
| Starving peasant who steals food becomes a "bandit" | Adapt the act; avoid the class change | Food theft as a need-driven offend option | M4 | No criminal class or label |
| "Unpunished" thought until the offender is punished | Adapt | "Case unresolved" thought until the records office clears it | M4, M5 | Records live at institutions |
| Crime thoughts only for witnesses | Borrow | Witness pass feeds the fear-of-crime meter | M4, M5 | — |
| Suspect tags that include innocents; identification at the gallows | Adapt the record logic; avoid the gallows | "Suspected" state with false positives, kept at the records office | M4 | Never over heads |
| Terror: punishing innocents frightens 3–5 acquaintances and costs 3 migrants | Adapt | Wrongful stops cut trust in police for the person and 3–5 acquaintances | M4, M5 | Wrongful stops drawn as heavily as arrests |
| Punishment spectacles with mood bonuses; shame mask, blinding, execution, slavery | Avoid | — | M4 | Breaks art rules 3, 4 and 6 |
| Patrol flags with radii; guards at gates | Adapt | Existing patrol overlays; police default stays 0.25%, not 15% | M4 | Neutral police iconography |
| Crime bubbles and crime scenes for 24 h | Adapt | True view only; recorded view shows reported incidents | M4 | Recorded view filters true-view cues |
| Cultures with xenophobic riots, repression and culture-linked disease | Avoid | — | — | Stereotype risk |
| Class clothing colours (peasant green, lord red), fanatic body marks, scars | Avoid | — | — | Breaks art rules 1, 2 and 5 |
| Housing comfort from neighbours, space and amenities | Adapt | Amenity term in wellbeing; home sprites never encode it | M3, M5 | Roofs random, never by wealth |
| Event Director timing events by state | Avoid in the sim core | Only as logged lab-card or scenario inputs | M1, M5 | Would confound paired seeds |
| Offline simulator running thousands of fights | Borrow | Already the M2 headless design runner | M2 | — |
| Weighted top-k choice (53/26/13/8) | Borrow | Integer cumulative table plus a keyed draw | M3 | Keyed draw |
| Daily schedule as pseudo-turns | Borrow | M3 day plans at dawn | M3 | — |
| City size capped by CPU | Avoid | Aggregates and the ledger instead | M6, M7 | — |

## Recommendation for the plan

Norland confirms the round-6 direction for wellbeing. Model happiness as a bounded integer sum of short-lived thoughts. Let thresholds on daily averages drive behaviour, and make every effect legible. It also shows the traps:
- crime that full employment can switch off;
- spoilage that is invisible to the player;
- hidden meters that gate actions;
- positional status goods that cannot be satisfied;
- class and culture markers that Nomos's art rules forbid.

Draft tasks, worded for the plan:

**M3 City life**
- [ ] Store each agent's mood as at most 8 thought slots (type, value, expiry hour) and compute mood as clamp(Σ, 0, 100) when a decision fires. Needs emit thoughts at thresholds instead of gating actions (R6).
- [ ] Let low needs and low mood only lower utility weights, except physiological collapse. Every effect on a choice must name its thought in the click-to-explain panel (R6).
- [ ] Keep household pantries as integer counts by food tier. Agents eat one unit per meal slot, best affordable first, and keep the surplus at home. The inspector shows household reserves (R6).
- [ ] Apply spoilage once per day at the day boundary as an integer loss per pantry or shop, tier and storage type, rounded by keyed stochastic rounding. The storage type sets the rate (R6).
- [ ] Add a district wellbeing panel: duration-weighted daily average mood, share below 25, and the strongest positive and negative thoughts over 24 h, with a data table. Goods tooltips state their daily mood effect (R6).
- [ ] Add habituation instead of class taste: each agent's reference food quality is its recent average, and meals below it give a negative thought (R6).

**M4 Crime and police**
- [ ] Add food theft as an offend option whose gain rises with unmet food need, inside the existing opportunity-based utility. An agent never becomes a "criminal" type (R6).
- [ ] Give victims and 1–3 close contacts a "case unresolved" thought until the records office clears the case. Log its prevalence, so the clearance rate shows up in wellbeing (R6).
- [ ] Limit crime thoughts to agents the witness pass marks as having seen the act, and feed them into the fear-of-crime meter (R6).
- [ ] Wrongful stops lower trust in police for the person stopped and 3–5 acquaintances. Chart them beside arrests (R6).
- [ ] Extend the appearance audit and content lint to forbid punishment spectacles, shame marks, scars from punishment and mood rewards from punishment (R6).
- [ ] Add a test: at full employment, true theft stays above zero on paired seeds, because opportunity and gain channels remain (R6).

**M5 Society and policy**
- [ ] Express wealth thoughts relative to the price index or the agent's own recent income, as a log ratio through a lookup table, never as fixed coin thresholds (R6).
- [ ] If relative income matters, compare agents with a local reference group that is never rendered. Every wealth desire must have a reachable resolution (R6).
- [ ] Optional, once calibrated: a bounded happiness-to-productivity term, for example waking mood of 75 or more giving a small output bonus in basis points (R6).

**M7 Country of ledgers**
- [ ] Bound settlement prices by import and export parity plus transport cost, add arbitrage flows when local prices fall outside the band, and model market saturation as decaying demand memory (R6).
- [ ] Add a wellbeing term (duration-weighted mood, vacancies) beside expected wage in the monthly migration hazard, with weights fitted from city runs (R6).
- [ ] Add harvest shocks with price responses as logged scenario inputs, announced as forecasts with uncertainty (R6).

**M6 Scale and sharing, and ongoing**
- [ ] On the "What this toy leaves out" page, name the class colours, culture conflict and punishment spectacles that games like Norland use and Nomos excludes (R6).
- [ ] Re-check Norland's "fundamental update", due before the end of 2026, for its trade, lord-upkeep and knowledge reworks (R6).
