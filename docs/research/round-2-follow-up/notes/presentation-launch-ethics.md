# Presenting, launching and responsibly framing a public crime-and-policing "society of dots" explorable

Access note (status as of 4 Oct 2026). This session's egress proxy blocked most of the web, for both WebFetch and curl. Blocked hosts I actually tried: hn.algolia.com, news.ycombinator.com, hacker-news.firebaseio.com, www.reddit.com, old.reddit.com, www.patreon.com, graphtreon.com, www.youtube.com, socialblade.com, itch.io, store.steampowered.com, en.wikipedia.org, blog.ncase.me, ai.ncase.me, worrydream.com, www.redblobgames.com, explorabl.es, phet.colorado.edu, arxiv.org, www.meltingasphalt.com, www.gamedeveloper.com, www.pcgamer.com, rimworldwiki.com, dwarffortresswiki.org, songsofsyx.com, skylines.paradoxwikis.com, frostpunk.fandom.com, choosealicense.com, creativecommons.org, opensource.org, www.gnu.org, ogp.me, infra.apache.org, www.poynter.org, www.niemanlab.org, source.opennews.org, themarkup.org, www.washingtonpost.com, proceedings.mlr.press, www.nyulawreview.org, papers.ssrn.com, rss.onlinelibrary.wiley.com, academic.oup.com, www.jasss.org, web.archive.org and www.gdcvault.com. The BigQuery public HN dataset had no credentials. Hosts I could reach: github.com (pages, raw files, git clone) and www.apache.org. Where an author keeps the source of a blocked page in their own GitHub repo, I read that source. Those items are marked **opened (author's source repo)** and cite the GitHub file, with the public URL noted. Everything else comes from web-search result summaries and is marked **snippet only**. The session-wide WebSearch cap (200) ran out near the end, so a few planned checks were not done; they are listed under Gaps.

## Q1. Design guidance for explorables and simulation sandboxes, beyond the kit already in the plan

### Takeaway
The patterns with the best evidence: (1) have the reader commit to a prediction before a run. In Crouch et al. (2004), predicting was the active ingredient and watching alone did nothing. (2) Let the reader's own questions drive the interaction. In PhET's 275+ interviews, engagement depended on this. Guide them through affordances and constraints, not instructions. (3) Gate content once playtests show people skimming (Earth: A Primer). (4) For comparing runs, use static small multiples or trails, and keep animation for the hook (Robertson et al. 2008). (5) Show uncertainty as several animated draws (HOPs). Nicky Case's seven playtested rules from Neurotic Neurons and Amit Patel's build order add concrete, testable craft rules on top.

### Cited Findings
**Nicky Case (all opened, author's source repo for blog.ncase.me)**
- "How I Make Explorable Explanations" (20 Sep 2017) has a three-step structure. (1) "Start With 🤔?": "you've got to make them love your question" (after Strogatz). (2) "Up The Ladder of Abstraction": "start on the ground. The very first thing you should do is give the reader a concrete experience", then climb step by step, linking steps with "BUT" and "THEREFORE" (after Parker and Stone) so that each step is a counter-intuitive plot twist. (3) "End With 🤔?", a sandbox: "In the beginning, I start by giving the player my question. And at the end, I want them to explore their own questions." He says Bret Victor's "Up & Down the Ladder of Abstraction" "has inspired, like, 90% of my work." — [ncase/blog source](https://github.com/ncase/blog/blob/main/src/posts/how-i-make-an-explorable-explanation.md) (public: https://blog.ncase.me/how-i-make-an-explorable-explanation/) — opened (author's source repo)
- "Explorable Explanations: 4 More Design Patterns" (20 Jun 2018) is drawn from "100+ Explorables":
  - **#1 Puzzle It Out** (SineRider, District, Crowds): puzzles make players "prove they actually understand… 'Teaching' and 'Assessment' get rolled up in one." Suited to topics that lend themselves to simulation.
  - **#2 Place Your Bets** (NYT Upshot "You Draw It", The Pudding's Birthday Paradox, Trust): "give them the answer, but only after they've wrestled with the question." Suited to topics with clear right or wrong answers.
  - **#3 Role Play** (BBC "A Syrian Journey"): for ethics and politics.
  - **#4 Sandbox Mode**: "The downside is they could drown." TensorFlow Playground was "information overload" for a novice. His fixes: a "kiddy pool" sandbox that is very simple, or putting the full sandbox at the end after introducing its parts (Earth: A Primer, Polygons).
  - Open question he lists: "Can an explorable let you go beyond its author, and let you challenge the author's conclusions using the author's own simulation?" (Bret Victor's vision). — [source](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md) — opened (author's source repo)
- "Neurotic Neurons: Design Patterns" (27 Sep 2015): after 9 months of prototypes, "with the feedback of dozens of playtesters", the final version took 4 weeks. Seven rules:
  1. **Huge possibility space.** An earlier version with few interactive elements "didn't feel like a system, it felt like an obtuse animation."
  2. **Direct manipulation.** "Not even one in-between."
  3. **Juice.** He hand-built the network because a randomly generated one left some neurons with no outgoing connections, "so they were boring to click."
  4. **Low non-interaction.** Something is always interactive, even during narration.
  5. **No crap-interaction.** Click-to-progress is out, except to build anticipation or panic.
  6. **Keep mechanics consistent.** Enforce constraints with mechanics that already exist (spatial distance). Toggling rules on and off "just made it more confusing."
  7. **Clarity > Cleverness.** A rhyme mnemonic and a mascot "confused everyone". "More clarity =/= more exposition": "the more redundant information, the less players paid attention."
  — [source](https://github.com/ncase/blog/blob/main/src/posts/neurotic-neurons-design-patterns.md) — opened (author's source repo)
- 2014 Explorable Explanations meetup notes (8 Sep 2014), "A quick note on playtesting": in Earth: A Primer, playtesters skimmed and got confused, so "content gating was added. And paradoxically, by withholding some content, the explorer learned more." Under "See, Model, Apply": "Let the explorer create their own data points, and form their own model" (Angry Physics). — [source](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations.md) — opened (author's source repo)
- Trust "Feetnotes": he renamed Tit For Tat to "Copycat" because players who knew the name "might just place their bets on this character because they've already heard of 'Tit For Tat'". In other words, jargon can leak the answer to a prediction prompt. — [ncase/trust notes source](https://github.com/ncase/trust/blob/gh-pages/notes/index.html) — opened (author's source repo)
- We Become What We Behold post-mortem (12 Nov 2016): playtests showed players "'got it', but had no emotional connection", so he added named Circle and Square characters whose stories weave into each other. — [source](https://github.com/ncase/blog/blob/main/src/posts/we-become-what-we-behold-a-post-mortem.md) — opened (author's source repo)
- The first Coming Out Simulator prototype went to reddit's Feedback Friday and Twitter, plus "a few in-person playtests". — [source](https://github.com/ncase/blog/blob/main/src/posts/coming-out-simulator-2014.md) — opened (author's source repo)
- "Why Simulate?" (15 Apr 2016) describes Bret Victor's Explorable Explanations reactive document this way: "one can ask 'what if' of a policy proposal, by dragging numbers." It also cites policy-slider pieces: the Marshall Project's "New Science of Sentencing" simulator and Jon Uy's "Gun Suicides". — [source](https://github.com/ncase/blog/blob/main/src/posts/why-simulate.md) — opened (author's source repo)

**Amit Patel / Red Blob Games** (opened via his "Making of: Circle drawing" source; the public page https://www.redblobgames.com/making-of/circle-drawing/ was blocked)
- "The code for the diagram is not the same as the original algorithm. The point of the diagram is help the reader understand the concepts. It's not to demonstrate that I know how to implement the algorithm." — [index.org](https://github.com/redblobgames/making-of-circle-drawing/blob/main/index.org) — opened (author's source repo)
- His build order: show the algorithm's output, then let the reader change inputs with sliders, then add drag handles. "When editing a geometric parameter like position, it's often better to directly manipulate the position by dragging it than to indirectly manipulate it by using a slider"; "I often start with sliders and try out the diagram before implementing drag handles." Drag handles took the JS from about 40 to about 100 lines. — [index.org](https://github.com/redblobgames/making-of-circle-drawing/blob/main/index.org) — opened (author's source repo)
- Design each diagram around its main idea. "The red is a bold color and draws the reader's attention. If distances are the main idea here, then distances should draw the reader's attention." He uses "negative space" by drawing grid edges in the background colour so attention stays on the paths. Several diagrams can share state or keep it separate, as needed. — [index.org](https://github.com/redblobgames/making-of-circle-drawing/blob/main/index.org) — opened (author's source repo)
- Red Blob articles are free, with no signup and no ads. Patel began experimenting in 2004 and settled his current style in 2007. — [Red Blob Games](https://www.redblobgames.com/) — snippet only

**Bret Victor** (snippet only; worrydream.com blocked)
- "Up and Down the Ladder of Abstraction" (Oct 2011) works through a car-steering simulation: controlling time, abstracting over time (a time slider with whole trajectories shown), and abstracting over algorithm parameters, moving between concrete runs and summaries. — [worrydream.com/LadderOfAbstraction](https://worrydream.com/LadderOfAbstraction/) — snippet only

**PhET** (snippet only; phet.colorado.edu and arxiv blocked)
- Adams, Reid, LeMaster, McKagan, Perkins, Dubson & Wieman (2008), *Journal of Interactive Learning Research* 19(3), drew on 275+ individual think-aloud interviews. Simulations "can be highly engaging and educationally effective, but only if the student's interaction with the simulation is directed by the student's own questioning." — [PER-Central record](https://www.per-central.org/items/detail.cfm?ID=12269); [PhET PDF](https://phet.colorado.edu/publications/archive/PhET%20interview%20Paper%20Part%20I.pdf) — snippet only
- Podolefsky, Moore & Perkins (2013), "Implicit scaffolding in interactive simulations": scaffolding is built into design elements and interactivity, without instructions, so that "students [are] guided without feeling guided". The tools are affordances, constraints, cueing and feedback. An earlier PERC 2012 paper by Podolefsky, Paul & Perkins is titled "Guiding without feeling guided". — [arXiv 1306.6544](https://arxiv.org/pdf/1306.6544); [PER-Central](https://www.per-central.org/items/detail.cfm?ID=16318) — snippet only

**Predict, then run** (snippet only)
- Crouch, Fagen, Callan & Mazur (2004), *Am. J. Phys.* 72:835–838: students who passively watch a demonstration "understand the underlying concepts no better than students who do not see the demonstration at all". Students who predict the outcome first "display significantly greater understanding". — [Mazur group page](https://mazur.harvard.edu/publications/classroom-demonstrations-learning-tools-or-entertainment) — snippet only

**Scrubbable time, side-by-side runs and spread across seeds** (snippet only)
- Robertson, Fernandez, Fisher, Lee & Stasko (2008), *IEEE TVCG* (InfoVis "Test of Time" award 2018) compared Gapminder-style animation, small multiples and superimposed trails. For analysis, animation was the least effective, both static designs were faster, and small multiples were more accurate. People found animation "more fun and exciting", and it was faster in the presentation setting. — [ACM DL](https://dl.acm.org/doi/10.1109/TVCG.2008.125) — snippet only
- Hullman, Resnick & Adar (2015), *PLOS ONE* 10(11): e0142444: Hypothetical Outcome Plots, which animate individual draws, gave "much more accurate judgments" than error bars or violin plots for comparing two or three quantities, and similar accuracy for single-quantity questions. — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0142444) — snippet only

### Inferences
- **Testable patterns for this project:**
  - **(a) Prediction gate in lab mode.** Each rules card asks for a bet (a slider or "draw the curve") that is locked in before Run. The paper-worked answer is revealed afterwards. Test: share of playtesters who can explain the result, with and without the bet.
  - **(b) Curated first seeds.** As with the hand-built neuron network, ship hand-picked seeds for the first lab scenarios so the first run always shows the effect. Use random seeds only after that.
  - **(c) No answer-leaking labels.** Name policies neutrally ("Hotspot patrol"), not "Biased predictor" (the Copycat lesson).
  - **(d) Gate city mode.** Unlock each policy slider only after the lab scenario that introduces it (Earth: A Primer's content gating; "sandbox at the end"). This avoids the TF Playground overload.
  - **(e) Side-by-side for analysis.** For the "true vs recorded crime" lesson, show two synced small panels or trails rather than one animated map toggling between them. Keep the animated city as the hook.
  - **(f) Seed spread as HOPs.** Show results from N seeds as a flickering sequence of outcomes, or a fan of thin lines, never a single run.
  - **(g) Sliders first, then direct manipulation.** Prototype with sliders. Promote to dragging only where the parameter is spatial, such as the police station location.
  - **(h) Reader-challenges-author.** Expose the same engine and rules to readers (Victor's vision, via Case).
- These are the playtest metrics the sources imply: time to first interaction, whether interaction is ever blocked, how often a reader clicks "next" without interacting, and whether players can state the "BUT" at each step.

### Gaps
- I could not open Bret Victor's essays, PhET's papers, Red Blob's main site or Nicky Case's Patreon posts, so the Victor and PhET claims are snippet only.
- I found no controlled study of scrubbable timelines or side-by-side runs in explorables themselves; the evidence comes from visualization studies (Robertson, Hullman).
- I found no standalone Nicky Case "playtesting notes" essay; playtesting lessons are spread across the posts above.
- Evan Miller's critique of Victor's agenda ("Don't Kill Math", https://www.evanmiller.org/dont-kill-math.html) appeared in results but was not examined.

## Q2. How colony-sim and god-game interfaces make many agents' states readable (crime, wealth, money)

### Takeaway
Four recurring interface patterns:
1. A severity-coded event queue. RimWorld letters are blue (good), grey (neutral), yellow (bad) and red (threat), and separate corner alerts cover ongoing conditions.
2. Per-system overlays that encode two variables at once. In the Cities: Skylines police view, roads show police coverage and buildings show crime probability, both green to red.
3. A few society meters that can both be high at once, with qualitative previews of policy effects (Frostpunk's hope and discontent).
4. Inspect-anything tooltips and nested tooltips that explain where a number comes from (Dwarf Fortress Steam had 350 tooltips by a pre-release preview, plus its Look panel; Victoria 3 took nested tooltips from Crusader Kings III).

All of this is snippet-level: every game wiki and outlet was blocked.

### Cited Findings
- **RimWorld letters:** most events create a letter (an envelope icon on the right of the screen), dismissed with a right-click. "Blue envelopes are good events, grey is neutral, yellow is bad, and red denotes direct threats." — [RimWorld Wiki: Events](https://rimworldwiki.com/wiki/Events) — snippet only
- **RimWorld alerts:** messages "hovering in the corner of the screen" flag issues "like low food or a colonist about to go berserk". This comes from a secondary analysis. — [Qazi, "The Story Generator"](https://zaydqazi.substack.com/p/the-story-generator-a-game-design) — snippet only
- **RimWorld as "story generator":** designer Tynan Sylvester frames RimWorld as a "story generator" run by AI "storytellers". GDC 2017 talk: "RimWorld: Contrarian, Ridiculous, and Impossible Game Design Methods". — [GDC slides PDF](https://media.gdcvault.com/gdc2017/Presentations/Sylvester_Tynan_RimWorld_Contrarian_Ridiculous.pdf) — snippet only
- **Dwarf Fortress Steam edition** (released 6 Dec 2022):
  - Mouse control, clickable tabs and buttons, menus that scale with screen size, and text filtering and search, including in a stockpile interface.
  - "350 [tooltips] so far and more being added until everything makes sense."
  - The Look command shows what a dwarf is "feeling and thinking" and what they carry and wear.
  - A "Places" tab lists zones in order, with a recenter button.
  — [PC Gamer preview](https://www.pcgamer.com/dwarf-fortress-upcoming-mouse-support-tooltips-and-good-ui-are-messing-with-me/); [PCGamesN](https://www.pcgamesn.com/dwarf-fortress/menus) — snippet only
- **Who built the DF UI:** "mostly by Zach and Tarn Adams", with art from Mike and Meph and "later input from a UX person" who helped refine the building menu. — [Game Developer](https://www.gamedeveloper.com/programming/how-tarn-adams-upgraded-and-optimized-dwarf-fortress-for-its-official-steam-release); [PC Gamer](https://www.pcgamer.com/the-new-dwarf-fortress-ui-looks-so-much-better/) — snippet only
- **Cities: Skylines police/crime info view:** green streets mean good police coverage and green buildings mean low crime probability; red means you may need stations. In CS2, roads are shaded green to red for coverage and buildings green to red for crime probability. — [Cities: Skylines Wiki: Info views](https://skylines.paradoxwikis.com/Info_views); [CS2 Wiki: Info views](https://cs2.paradoxwikis.com/Info_views); [TheGamer](https://www.thegamer.com/cities-skylines-2-reduce-lower-crime-rate-police/) — snippet only
- **Songs of Syx:**
  - A "Crime" overlay sits under the minimap.
  - A crime map records where each crime happened, showing the crime's colour, the offender's work group (race and citizen/slave icon) and a yellow diamond. This description comes from a Steam Workshop "Crime Map" item, so it may be a mod rather than the base game.
  - Overlays were improved in update V63 (2 Jan 2023).
  - Criminal types are thieves, vandalisers, streakers and murderers, spawned according to "law and happiness".
  — [Steam Workshop: Crime Map](https://steamcommunity.com/sharedfiles/filedetails/?id=3622353839); [GOG DB release notes](https://www.gogdb.org/product/2000476666/releasenotes); [Steam discussion](https://steamcommunity.com/app/1162750/discussions/0/3040479910541406727/) — snippet only
- **Frostpunk:**
  - Two meters, hope and discontent, are "influenced by different things and can both be full and empty". The developers said research into survival in harsh conditions pointed to hope as the key factor.
  - Laws in the Book of Laws tell players how they will affect hope and discontent, but in relative terms ("hope will increase slightly"). This adds uncertainty to risk–reward choices.
  — [PC Gamer dev interview](https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws/); [Medium analysis](https://medium.com/@rjsikesmedia/frostpunks-book-of-laws-the-subtext-of-city-building-decisions-61f344129b93) — snippet only
- **Nested tooltips (Crusader Kings III, reused by Victoria 3):** hovering highlighted text opens a tooltip whose own highlighted terms open further tooltips, "indefinitely", so relevant information is "a mouse move away". This is progressive disclosure. Victoria 3 adopted it so "you don't need an econ degree". — [CK3 Dev Diary #16](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-16-tutorials-and-tooltips-and-encyclopedias-oh-my.1345581/); [PCGamesN](https://www.pcgamesn.com/victoria-3/nested-tooltip-system); [Philip Ardeljan, "Tooltips in tooltips"](https://philip.design/blog/tooltips-in-tooltips/) — snippet only

### Inferences
- **Crime layers.** Borrow Cities: Skylines' dual encoding to put *true* and *recorded* crime on one map. Shade cells by true incidents, which only the omniscient view can see. Mark recorded incidents as Syx-style diamonds. Draw patrol routes or police presence as line weight. Divergence between the layers is then visible at a glance; small multiples are still better for analysis (Q1).
- **Event queue.** A RimWorld-style queue for discrete events (theft, arrest, bankruptcy, merchant closure) gives a readable "story" layer over a crowd of dots. Keep its severity colours distinct from the one-colour-per-agent-state palette the plan already has, to avoid collisions.
- **Meters.** Prefer two independent society meters (say, "fear of crime" and "trust in police", or "inequality" and "average wealth") over one composite. Frostpunk shows players read two meters that can both be high.
- **Money flows.** Nested "why is this number this?" breakdowns (CK3/Victoria 3) fit the click-to-explain panel and the follow-the-money trace. Every balance should expand into its inflows and outflows by counterparty.
- **Policy previews.** Frostpunk's adjective previews ("slightly") create deliberate uncertainty in a game. In a teaching explorable, the honest version is a preview *range* computed from seeds.

### Gaps
- No primary dev blog, GDC talk or wiki page could be opened; all game UI claims are snippet only.
- I could not establish whether the Songs of Syx crime map is base game or a mod.
- I did not find sources on money-flow visualisation inside these games (market and trade screens, budget breakdowns) beyond nested tooltips; the search budget ran out.

## Q3. Distribution: how comparable explorables and toys found audiences, plus a launch checklist

### Takeaway
The firmest reach numbers are Nicky Case's own:

| Explorable | Year | Reach (Case's figures) |
|---|---|---|
| Parable of the Polygons | 2014 | 3 million plays |
| Coming Out Simulator | 2014 | about 1 million people |
| The Evolution of Trust | 2017 | 5 million plays |
| Adventures With Anxiety | 2019 | 2 million people |

Case attributes the hits partly to timing with the news: Ferguson and #GamerGate for Polygons, 2017's "zero-trust" mood for Trust, and "a second boost" for We Become What We Behold from the 2016 election.

Successful explorables ship large share cards: Trust and What Happens Next? use 1200×600 images. Shareable URL state is an established practice (TensorFlow Playground, Epidemic Calculator).

I could not retrieve HN, Reddit or YouTube counts because those hosts and the Algolia API were blocked.

### Cited Findings
- **Case's decade review** (31 Dec 2019) — [source](https://github.com/ncase/blog/blob/main/src/posts/2010-2019.md) — opened (author's source repo):
  - Polygons "got 3 million plays. Remember, 2014 was the year of #GamerGate and Ferguson, so, 'it was timely'."
  - Coming Out Simulator "reached a million folks".
  - Trust "got 5 million plays, and doubled my Patreon income… maybe because 2017 seemed like a zero-trust dumpster fire".
  - "Adventures With Anxiety reached 2 million people."
- **News timing, We Become What We Behold:** released October 2016; "This week's election results also gave it a second boost!" (written 12 Nov 2016). — [source](https://github.com/ncase/blog/blob/main/src/posts/we-become-what-we-behold-a-post-mortem.md) — opened (author's source repo)
- **Parable of the Polygons page** — [ncase/polygons index.html](https://github.com/ncase/polygons/blob/gh-pages/index.html) — opened (author's source repo):
  - "Also Seen On": WIRED, Washington Post, BoingBoing, Creative Commons, KillScreen, JayIsGames, Hacker News, MetaFilter, New York Magazine, The Atlantic's CityLab, Salon, Polygon, Gamasutra.
  - Credits 11 beta-readers.
  - Links 18 translations.
  - Lists fan-made derivatives ("Polygons with Pentagons", "Polygons in Snap!", a playthrough video).
- **The Evolution of Trust repo:** CC0; 50+ community translations, with translators told to fork, edit HTML, test locally and submit. The GitHub repo showed 6.3k stars and 1.0k forks when fetched on 4 Oct 2026. — [ncase/trust](https://github.com/ncase/trust) — opened
- **"What Happens Next?"** (launched about 1 May 2020; blog post 15 May 2020): a "30 min play/read" made with epidemiologist Marcel Salathé. 3Blue1Brown made a video adaptation of their contact-tracing comic, which is cross-medium amplification. — [source](https://github.com/ncase/blog/blob/main/src/posts/new-explorable-covid-19-futures-explained-with-playable-simulations.md) — opened (author's source repo)
- **Share metadata on famous explorables:**
  - Polygons, Trust and What Happens Next? all set `twitter:card=summary_large_image`, `twitter:image`, `og:title` and `og:type`. What Happens Next? also sets `og:url` and `og:image`.
  - Share image sizes, measured from the repo files: Trust 1200×600, What Happens Next? 1200×600, Polygons 800×317.
  — [Polygons](https://github.com/ncase/polygons/blob/gh-pages/index.html), [Trust](https://github.com/ncase/trust/blob/gh-pages/index.html), [WHN](https://github.com/ncase/covid-19/blob/master/index.html) — opened (author's source repos)
- **Open Graph protocol:** "The four required properties for every page are: og:title… og:type… og:image… og:url". On alt text: "If the page specifies an og:image it should specify og:image:alt." og:image:width and og:image:height are optional structured properties. — [ogp.me source repo](https://github.com/facebook/open-graph-protocol/blob/master/index.html) — opened (author's source repo)
- **Shareable run state:**
  - TensorFlow Playground serializes its whole state into `window.location.hash` and restores it on load (`serialize()`, `deserializeState()`). — [state.ts](https://github.com/tensorflow/playground/blob/master/src/state.ts) — opened
  - Gabriel Goh's Epidemic Calculator builds a URL from every parameter with `query-string` and parses `window.location.search` on load. — [App.svelte](https://github.com/gabgoh/epcalc/blob/master/src/App.svelte) — opened
- **explorabl.es directory:**
  - About 180 entries in `explorables.csv` (181 rows including the header) at the 16 May 2026 commit.
  - The FAQ says Featured picks favour work that is free and needs no download ("if there's a thing that's otherwise amazing & educational, but only uses minimal interaction (or isn't free, or requires a download), we maaaaay not pick it").
  — [explorabl.es source repo](https://github.com/explorableexplanations/explorableexplanations.github.io) — opened (author's source repo)
- **Show HN rules:** "Show HN is for something you've made that other people can play with"; "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails"; blog posts and other reading material are off topic for Show HN and should be regular submissions. — [news.ycombinator.com/showhn.html](https://news.ycombinator.com/showhn.html) — snippet only
- **HN threads identified, counts not retrievable:**
  - The Evolution of Trust: [item 14864183](https://news.ycombinator.com/item?id=14864183) (2017) and the "(2017)" repost [item 35807981](https://news.ycombinator.com/item?id=35807981).
  - Kevin Simler's "Going Critical": [item 19905677](https://news.ycombinator.com/item?id=19905677).
  - Ciechanowski's "Sound": [item 33249215](https://news.ycombinator.com/item?id=33249215).
  - HN commenters on Trust criticised "low-contrast captions" and "colorblind-unfriendly colors".
  — snippet only
- **Going Critical** was published 13 May 2019, with "sliders to pull, buttons to push, and things that dance around". — [meltingasphalt.com](https://meltingasphalt.com/going-critical/) — snippet only
- **Universal Paperclips** (9 Oct 2017; web, then $1.99 mobile): "In the first 11 days, 450,000 people played the game", citing Wired. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips) — snippet only
- **Cookie Clicker** (browser, 2013): peaked at "1.5 million hits in one day" in August 2013, with about 225,000 a day by January 2014. — [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker) — snippet only
- **Distill on self-publishing:** after its hiatus, Distill pointed authors to "self publication on one-off websites", for example the World Models article built with the Distill template and GitHub Pages. — [Distill hiatus source](https://github.com/distillpub/post--distill-hiatus/blob/master/index.md) (public: https://distill.pub/2021/distill-hiatus/) — opened (author's source repo)

### Inferences
- **Launch checklist** (synthesised from the sources above):
  1. **Playable at the URL, no signup.** Required for Show HN, and the explorabl.es Featured list favours free, no-download work.
  2. **Reproducible share links.** Encode scenario id, seed, all slider values and optionally a timestep in the URL hash, as TF Playground and the Epidemic Calculator do. A "Copy link to this run" button should restore the exact run.
  3. **Share card.** Include og:title, og:type, og:image and og:url (OGP's required four) plus og:image:alt and twitter:card=summary_large_image. Use an image of roughly 1200×600, like Trust and What Happens Next?. Make one card per lab scenario so a shared scenario previews correctly.
  4. **"What to try" prompts.** Put a one-line bet in the share text and on the landing card (Place Your Bets), e.g. "Predict: if crime is identical everywhere, where will the predictor send police after 50 days?"
  5. **Short clips.** A 10–20 s loop of the true-vs-recorded divergence is the hook. Animation works better for presentation than analysis (Robertson), which suits social clips.
  6. **Accessibility before launch.** HN criticised Trust's contrast and colours, so check colour-blind-safe state colours and caption contrast.
  7. **Translation-ready text** in separate files, so a fork-and-PR flow like Trust's (50+ translations) is possible.
  8. **Submit to explorabl.es.**
  9. **Time the city mode or a lab card to relevant news**, as Case's hits were. Have the "simplifications / what this toy leaves out" page live *before* a news-timed launch (see Q4), because topical launches draw critical readers.
  10. **Ship lab mode early.** The plan already does this; it allows staged "BUT" reveals across several launches.
- **Treat reach numbers with care.** The play counts are the author's own figures, a mix of plays and "people reached", and are not independently audited.

### Gaps
- Hacker News points and comment counts (Algolia API, item pages, Firebase API), Reddit posts and YouTube coverage numbers could not be retrieved because the hosts were blocked. The BigQuery HN dataset was unavailable without credentials.
- I found no public traffic numbers for Going Critical or Ciechanowski's articles. WaPo "simulitis" was excluded as already in the plan.
- I did not find newsletter-specific evidence (e.g. which newsletters drove Polygons or Trust traffic) beyond the Polygons "Also Seen On" list.
- itch.io was not checked (blocked).

## Q4. Ethics and framing of a crime/policing simulation

### Takeaway
Three academic critiques together say predictive policing learns from police records, which reflect where police look rather than where crime is:
- **Lum & Isaac (2016):** drug use spread evenly, but recorded drug crime and PredPol targets were concentrated in non-white, low-income areas.
- **Ensign et al. (2018):** police are sent back to the same neighbourhoods "regardless of the true crime rate".
- **Richardson, Schultz & Crawford (2019):** "dirty data" from 13 jurisdictions with documented unlawful practices.

That is exactly the true-vs-recorded view the project plans. Journalism backs it up: The Markup found PredPol targeted Black and Latino neighbourhoods across 38 cities (2021), and found under 0.5% accuracy in Plainfield (2023).

For a public toy, the precedents suggest:
- Keep agents abstract (shapes or dots), and put the structural asymmetry in *places, patrols and records*, not in agent identities.
- Publish an explicit "everything I simplified" companion, as Case did for Neurotic Neurons.
- Frame scenarios conditionally ("IF we did nothing") and invite readers to challenge the assumptions with sliders, as What Happens Next? does.
- Show spread across seeds.
- Pre-empt the known Schelling-style critique that abstract, symmetric toys erase institutional causes and one-sided exclusion.

### Cited Findings
- **Lum & Isaac (2016), "To predict and serve?"**, *Significance* 13(5):
  - Method: a synthetic Oakland population combined with National Survey on Drug Use and Health data.
  - Estimated drug use was "fairly even across the city", but police-recorded drug crimes were concentrated in "non-white and low-income" areas.
  - PredPol trained on those records flagged the same areas.
  - Black people would be targeted at "roughly twice" the rate of white people despite similar drug use.
  - The summary I saw attributes to them the line "It [predictive policing] is predicting future policing, not future crime". That attribution comes from a secondary source.
  — [Wiley (blocked)](https://rss.onlinelibrary.wiley.com/doi/full/10.1111/j.1740-9713.2016.00960.x); [secondary summary](https://www.crimejusticejournal.com/article/download/2189/1195/8656) — snippet only
- **Ensign, Friedler, Neville, Scheidegger & Venkatasubramanian (2018)**, "Runaway Feedback Loops in Predictive Policing", PMLR 81 (FAT* 2018): such systems are "susceptible to runaway feedback loops, where police are repeatedly sent back to the same neighborhoods regardless of the true crime rate". The authors model this mathematically and show how changing the system's inputs, treating it as a black box, lets the true rate be learned. — [PMLR](https://proceedings.mlr.press/v81/ensign18a.html); [arXiv 1706.09847](https://arxiv.org/pdf/1706.09847) — snippet only
- **Ensign et al. code:** the authors' code models the system as a generalized Pólya urn. It has options such as `--partial_surprise` and `--weighted_surprise`, described as "Incorporate a … surprise factor in urn update, adding only reported crimes". These are concrete update rules a "lab mode" card could mirror. — [algofairness/runaway-feedback-loops-src](https://github.com/algofairness/runaway-feedback-loops-src) (README and `src/main.py`) — opened (author's source repo)
- **Richardson, Schultz & Crawford (2019)**, "Dirty Data, Bad Predictions", *NYU Law Review Online* 94:
  - 13 jurisdictions where predictive-policing development or use overlapped in time with "government investigations, consent decrees, or other documentation of corrupt, racially biased, or otherwise illegal police practices".
  - Case studies: Chicago (dirty data fed directly into the system), New Orleans and Maricopa County.
  - Systems built on such data "cannot escape the legacies of the unlawful or biased policing practices that they are built on".
  — [NYU Law Review PDF](https://www.nyulawreview.org/wp-content/uploads/2019/04/NYULawReview-94-Richardson_etal-FIN.pdf) — snippet only
- **The Markup and Gizmodo, 2 Dec 2021:**
  - More than 5.9 million PredPol predictions across 38 cities, found on an unsecured server.
  - Predictions "mostly avoided Whiter neighborhoods" and targeted Black and Latino ones; some whiter areas went years without a single prediction.
  - A 2018 paper by PredPol's co-founders found the algorithm would have targeted Black and Latino neighbourhoods "up to 400 percent more" than White residents in Indianapolis.
  — [The Markup](https://themarkup.org/prediction-bias/2021/12/02/crime-prediction-software-promised-to-be-free-of-biases-new-data-shows-it-perpetuates-them) — snippet only
- **The Markup's analysis repo** confirms the scope: metadata for "the 38 departments", arrest records for 13 departments, use-of-force data for six, and 2018 ACS race and income estimates. Its headline is "How We Determined Predictive Policing Software Disproportionately Targeted Low-Income, Black, and Latino Neighborhoods". — [the-markup/investigation-prediction-bias](https://github.com/the-markup/investigation-prediction-bias) — opened
- **The Markup, 2 Oct 2023:**
  - Of 23,631 Geolitica (formerly PredPol) predictions for Plainfield, NJ (25 Feb – 18 Dec 2018), the success rate was "less than half a percent": 0.6% for robbery and aggravated assault, 0.1% for burglary.
  - Fewer than 100 predictions matched a later-reported crime.
  - Plainfield police then stopped using the product.
  — [The Markup](https://themarkup.org/prediction-bias/2023/10/02/predictive-policing-software-terrible-at-predicting-crimes) — snippet only
- **Critique of Schelling-style toys:** the realism critique is that they ignore "institutional causes of segregation, of income effects, of cities' social structure". Also, "segregation is generally not a symmetric process… but rather is a mechanism by which one group excludes the other", which the Schelling model leaves out. — [arXiv review 0907.1777](https://arxiv.org/pdf/0907.1777); [American Scientist, "The Math of Segregation"](https://www.americanscientist.org/article/the-math-of-segregation) — snippet only
- **How Parable of the Polygons handles its limits:**
  - "Schelling's model gets the general gist of it, but of course, real life is more nuanced."
  - It links real-world data (W.A.V. Clark's 1991 "A Test of the Schelling Segregation Model") and "other mathematical models of institutionalized bias".
  - It says plainly that it changed the original: "we gave his model a happy ending."
  - Agents are abstract blue squares and yellow triangles.
  — [ncase/polygons index.html](https://github.com/ncase/polygons/blob/gh-pages/index.html) — opened (author's source repo)
- **Case's own retrospective note on Polygons** voices, through his anxious "inner voice", the worry that "we're just preaching to the SJW choir!" This is self-criticism, not a reply to a published critique. — [2010-2019](https://github.com/ncase/blog/blob/main/src/posts/2010-2019.md) — opened (author's source repo)
- **"Neurotic Neurons: Simplifications"** (26 Sep 2015) is a companion post: "for the sake of intellectual honesty, here's everything I know I lied about, why I simplified them the way I did, and what I know I don't even know." On the value of simplifying: "a street map is useful not just despite simplifying the city, but because it simplifies the city." He made the model deterministic because "adding unpredictability to a model makes it harder to learn". — [source](https://github.com/ncase/blog/blob/main/src/posts/neurotic-neurons-simplifications.md) — opened (author's source repo)
- **"What Happens Next?" framing:**
  - "If you think R0 or the other numbers in our simulations are too low/high, that's good you're challenging our assumptions! There'll be a 'Sandbox Mode'…"
  - On masks: "discounted for our uncertainty. (Again, you can challenge our assumptions by turning the sliders up/down)".
  - It criticises coverage that reported "80% will be infected" without "IF WE DO NOTHING": "Fear was channelled into clicks, not understanding."
  — [words.md](https://github.com/ncase/covid-19/blob/master/words/words.md) — opened (author's source repo)
- **Epidemic Calculator** labels its SEIR core "an idealized model of spread". — [App.svelte](https://github.com/gabgoh/epcalc/blob/master/src/App.svelte) — opened
- **Trust's notes on crime framing:** Case avoided the Prisoner's Dilemma's crime framing ("snitching") because "in this case, both players 'cooperating' would be bad for society". In crime stories, "cooperation" can flip moral valence. — [Trust notes](https://github.com/ncase/trust/blob/gh-pages/notes/index.html) — opened (author's source repo)
- **Abstract groups in We Become What We Behold:** "Circle People" and "Square People", where the media feedback loop has "a ratchet" toward conflict. — [WBWWB post-mortem](https://github.com/ncase/blog/blob/main/src/posts/we-become-what-we-behold-a-post-mortem.md) — opened (author's source repo)
- **Case on prediction:** prediction is "totally overrated… for any complex system, one should only predict probabilities, not specifics". He recommends Epstein's "Why Model?". — [Why Simulate?](https://github.com/ncase/blog/blob/main/src/posts/why-simulate.md) — opened (author's source repo)
- **Epstein (2008), "Why Model?"**, JASSS 11(4) 12, gives sixteen reasons to model other than prediction, including "explain", "illuminate core dynamics", "bound (bracket) outcomes to plausible ranges", "illuminate core uncertainties", "demonstrate tradeoffs" and "challenge the robustness of prevailing theory through perturbations". — [JASSS](https://www.jasss.org/11/4/12.html) — snippet only
- **Hypothetical Outcome Plots** (see Q1) are evidence for showing spread across seeds as animated draws. — [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0142444) — snippet only

### Inferences
- **Agents.** Keep them as role and state only (citizen, merchant, thief, police; wealth; employment). Give them no demographic attributes, names, skin tones or real places. Make "thief" a *state* a citizen can enter, for example under economic pressure, and leave, rather than a fixed kind of person. That avoids encoding a criminal "type".
- **Where the asymmetry lives.** Abstract agents alone risk the Schelling critique of a symmetric, institution-free story. Put the asymmetry in what Lum & Isaac and Richardson et al. point to: unequal patrol allocation, record-keeping and historical records. In the headline lab card, two districts have *identical* true crime but different starting records. The urn-style predictor (Ensign et al.) then runs away. The reader bets first.
- **Three views of one city.** Use the same palette for each and label them plainly: (1) true crime (omniscient, "only the simulator knows this"), (2) recorded crime (what the police data contains), (3) predicted hotspots (what the algorithm sees). Add a short note that real predictors are trained on view 2.
- **Ship a "What this toy leaves out" page at launch**, in the Neurotic Neurons style. It should cover: no courts or sentencing; simplified victim reporting; no demographics; no history of segregation or redlining; deterministic or stochastic choices made for teaching; and why each simplification was made. Link out to the real studies (Lum & Isaac; Ensign; Richardson; The Markup), as Polygons links to Clark 1991.
- **Conditional language everywhere.** "In this toy, IF police follow last week's records, THEN…", following What Happens Next?'s "IF WE DO NOTHING". Never give a forecast-style number without the condition. A visible "This is a toy, not a forecast" note should sit next to every chart, not only in an About page.
- **Show spread, not a single run.** Run N seeds per policy and show the distribution: a HOP flicker, a fan of lines, or "in 87 of 100 runs…". Avoid single dramatic runs in share clips unless they are labelled "one run of many".
- **Let readers challenge the author.** Expose the predictor's update rule and the reporting probabilities as sliders (Victor via Case; WHN). This defuses "rigged toy" accusations.
- **Pre-empt misreadings** such as "policing is useless" or "crime is fake". Include a scenario where policing visibly reduces true crime under some settings, so the lesson is about *feedback from records*, not anti-police messaging. This is my inference; I found no published guidance on it.
- **Naming.** Avoid real product names (PredPol, Geolitica) inside the simulation. Cite them only in the notes page with the evidence.

### Gaps
- I could not open the primary papers (Wiley/OUP, PMLR, NYU Law Review, arXiv); all claims about their content are snippet only. In particular, the "predicting future policing" quote's attribution is from a secondary summary.
- I found no documented public critique of Parable of the Polygons by a named critic that the authors answered. The Aperiodical's "The Other Half – Parable of the Polygons" (Haensch & Rorem, 29 May 2015) seems to be a podcast feature rather than a critique, and its content was not opened. — [aperiodical.com](https://aperiodical.com/2015/05/the-other-half-parable-of-the-polygons/) — snippet only
- Guidance from the evidence-communication and data-journalism communities was not checked because the search budget ran out. Examples: Blastland, Freeman, van der Linden, Marteau & Spiegelhalter's "Five rules for evidence communication" (Nature, 2020); SPJ's code on stereotyping; the Data Journalism Handbook on uncertainty. These are pointers only, not verified.
- Agent-based modelling documentation standards (e.g. the ODD protocol) were not checked.

## Q5. Licensing the project (ports MIT, Apache-2.0 and CC0 code; code and content licence choices)

### Takeaway
These are what the licence texts and common practice say, not legal advice:
- **MIT inputs:** keep the copyright and permission notice in all copies or substantial portions.
- **Apache-2.0 inputs:** give recipients a copy of the licence; mark modified files with prominent change notices; keep the original copyright, patent, trademark and attribution notices; and carry forward the relevant contents of any upstream NOTICE file, either in a NOTICE file, in source or docs, or in a display such as a credits screen.
- **CC0 inputs:** no conditions, but also no patent licence.

For the whole project, MIT or Apache-2.0 both sit comfortably on top of these inputs; the Apache-derived files keep their own obligations either way. GPLv3 can absorb Apache-2.0, but the FSF does not consider Apache-2.0 compatible with GPLv2.

For the explanatory text, CC BY 4.0 (attribution required) and CC0 are both standard. Creative Commons does not recommend its licences for software.

Precedents: Nicky Case puts whole works (code and content) under CC0. Red Blob Games licenses page code Apache-2.0 and sample code CC0.

### Cited Findings
- **Apache-2.0 §4, Redistribution:**
  - "(a) You must give any other recipients of the Work or Derivative Works a copy of this License."
  - "(b) You must cause any modified files to carry prominent notices stating that You changed the files."
  - "(c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work…"
  - "(d) If the Work includes a 'NOTICE' text file… any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file… in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation…; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear."
  - On top of that, "You may add Your own copyright statement to Your modifications and may provide additional or different license terms… for any such Derivative Works as a whole, provided Your use… otherwise complies with the conditions stated in this License."
  - §6 grants no trademark rights beyond describing origin.
  — [apache.org LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0) — opened
- **ASF "Applying the Apache License":** "Section 4d… provides for attribution notices to be included with a work in a NOTICE file, so the attribution notices remains, in some form, within any derivative works." The "must include correct NOTICE documents in every distribution" rule is stated for Apache projects. For third parties, §4(d) applies only if the upstream work includes a NOTICE file. — [apache.org apply-license](https://www.apache.org/legal/apply-license.html) — opened
- **ASF on GPL compatibility:** "Apache 2 software can therefore be included in GPLv3 projects… However, GPLv3 software cannot be included in Apache projects." Also: "the FSF has never considered the Apache License to be compatible with GPL version 2, citing the patent termination and indemnification provisions." — [apache.org GPL-compatibility](https://www.apache.org/licenses/GPL-compatibility.html) — opened
- **MIT:** "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software." choosealicense summarises it as conditions: include-copyright; permissions: commercial use, modification, distribution, private use; no patent grant listed. — [choosealicense source: mit.txt](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/mit.txt) — opened (source repo of choosealicense.com)
- **choosealicense metadata for the other licences** — [source _licenses/](https://github.com/github/choosealicense.com/tree/gh-pages/_licenses) — opened (source repo of choosealicense.com):
  - **Apache-2.0:** conditions include-copyright and document-changes; permissions include patent-use; limitations include trademark-use. "Contributors provide an express grant of patent rights."
  - **GPL-3.0:** conditions include-copyright, document-changes, disclose-source and same-license; "larger works using a licensed work" must be under the same licence.
  - **AGPL-3.0:** adds network-use-disclose.
  - **MPL-2.0:** file-level copyleft (same-license--file).
  - **CC-BY-4.0:** "Not recommended for software"; conditions include-copyright and document-changes; limitations include patent-use and trademark-use.
  - **CC0-1.0:** conditions `[]`; limitations include patent-use and trademark-use; "CC0 is very similar to the Unlicense".
- **choosealicense "Non-Software Licenses":**
  - CC0-1.0, CC-BY-4.0 and CC-BY-SA-4.0 are "open licenses used for non-software material".
  - "Creative Commons does not recommend its licenses be used for software."
  - For documentation under a different licence, "be sure to specify that source code examples in the documentation are also licensed under the software license."
  - Mixed projects may "include multiple licenses, as long as you are explicit about which license applies to each part".
  — [non-software.md](https://github.com/github/choosealicense.com/blob/gh-pages/non-software.md) — opened (source repo of choosealicense.com)
- **Precedent, Parable of the Polygons:** LICENSE is CC0 1.0 Universal. — [LICENSE.txt](https://github.com/ncase/polygons/blob/gh-pages/LICENSE.txt) — opened. Its credits call Nicky's Patreon one that "makes public domain playables (such as this one!)". — [index.html](https://github.com/ncase/polygons/blob/gh-pages/index.html) — opened
- **Precedent, The Evolution of Trust:** a "Creative Commons Zero" dedication: "do whatever you want! Attribution is super appreciated". Third-party parts are still credited individually: music (CC0), nine sound effects (CC0 or CC Sampling+), and libraries (PIXI.js, Howler.js, Tween.js, Balloon.css, Q, MinPubSub). — [ncase/trust README](https://github.com/ncase/trust) — opened
- **Precedent, Red Blob Games:** "My code for the page itself is licensed under Apache v2. The sample code presented on the page… is CC0. Vue v2 is MIT licensed." — [README.org](https://github.com/redblobgames/making-of-circle-drawing/blob/main/README.org) — opened
- **Other precedents:** The Markup's investigation code is BSD-3-Clause (GitHub listing, opened). Distill's article template is open source (hiatus post, opened).

### Inferences
- **Practical obligations for the port:**
  1. Keep a `LICENSES/` or `THIRD_PARTY_NOTICES` file listing every ported source with its licence text.
  2. In files derived from MIT code, keep the original copyright line and the MIT text.
  3. In files derived from Apache code, keep the original headers and add a "Modified by [you], [year]: ported/changed …" notice. Ship the Apache text. If the upstream repo had a NOTICE file, copy its relevant lines into your NOTICE or credits screen; §4(d) allows "a display", so an in-app credits panel counts.
  4. For CC0 sources, nothing is required, but crediting them (as Trust does) is good practice.
- **Choosing the code licence** (trade-offs, not advice):
  - **MIT:** the simplest; compatible with everything above. No explicit patent grant.
  - **Apache-2.0:** an explicit patent grant and change-notice duty. Ports from Apache code already carry those obligations. Compatible with GPLv3 downstream, but not GPLv2-only.
  - **GPLv3 or AGPLv3:** forks must stay open. This adds friction for newsrooms and educators who want to embed or remix inside proprietary sites. AGPL's network clause matters little for a browser-only app with no server.
- **Content licence.** CC BY 4.0 suits text, rules cards and diagrams if attribution matters, for example to keep the "toy, not forecast" framing attached when reused. CC0, Case's choice, maximises spread and translations but loses any attribution requirement. Either way, follow choosealicense's mixed-project advice: say explicitly which licence covers code, which covers prose and art, and that code snippets in the prose fall under the code licence.
- **Names and logos.** Trademarks and project names are not licensed by Apache (§6) or CC0, so a separate note on the project name's use is reasonable.

### Gaps
- creativecommons.org (CC FAQ, CC0 FAQ), opensource.org (OSI's position on CC0), gnu.org (GPL FAQ, including how "conveying" applies to client-side JavaScript) and infra.apache.org (ASF's licensing how-to for bundled dependencies) were all blocked, so those positions are unverified.
- This summarises licence texts and common practice only; it is not legal advice.

## Q6. Sustainability: how creators of free explorables and simulation channels fund their work

### Takeaway
Patronage for free explorables is real but modest, and it moves in steps after hits:
- **Nicky Case:** Patreon began as "side-income" in 2014 and "wasn't enough to sustain me" in 2015. After Trust (5M plays) it "doubled" and "now paid my food and rent". Case cites 1000+ supporters over the years, and a current snippet shows 640 paid members and $2,061 a month (undated).
- **Primer:** 548 paid Patreon members (snippet).
- **Ciechanowski:** 544 paid Patreon members (snippet).

The large sums come from *paid editions of things that are free elsewhere*:
- **Dwarf Fortress:** about $15k a month in donations while free, then $7.23M gross in January 2023 after the Steam release.
- **Cookie Clicker:** a $5 Steam version beside the free web "master version". Unit and revenue figures are third-party estimates.
- **Universal Paperclips:** a $1.99 mobile version.

Distill's 2021 hiatus is a warning about how labour-intensive the work is: editors spent 50+ hours on some articles, and volunteers burned out.

### Cited Findings
- **Nicky Case's own account** (31 Dec 2019) — [2010-2019](https://github.com/ncase/blog/blob/main/src/posts/2010-2019.md) — opened (author's source repo):
  - Started Patreon around 2014 "for side-income".
  - 2015: "my Patreon wasn't enough to sustain me. I took on random freelance gigs while burning through my savings." A crowdfunded game was cancelled with a "75% partial refund".
  - 2017: Trust "doubled my Patreon income… my Patreon now paid my food and rent".
  - "1000+ of y'all who have supported me via Patreon over the past few years".
- **Patreon as an audience-research tool:** Case polled patrons and Twitter followers (700+ responses) to choose the next project. Results were similar across the two groups, and the top request was "How to make explorable explanations". — [survey results](https://github.com/ncase/blog/blob/main/src/posts/nickys-next-explorable-survey-results.md) — opened (author's source repo)
- **Fellowship funding:** Case had a 2016 OpenNews Fellowship, embedded at PBS Frontline. — [WBWWB post-mortem](https://github.com/ncase/blog/blob/main/src/posts/we-become-what-we-behold-a-post-mortem.md) — opened (author's source repo)
- **Nicky Case's current Patreon:** 640 paid members, "$2,061 per month", membership from $2 a month. Undated, and possibly a different snapshot from the counts above. — [patreon.com/ncase](https://www.patreon.com/ncase) — snippet only
- **Primer (Justin Helps):**
  - "nearly two million subscribers and 100 million total views".
  - Patreon "has 548 paid members".
  - Helps previously spent 4.5 years at Khan Academy.
  — [YouTube Wiki (fandom)](https://youtube.fandom.com/wiki/Primer); [patreon.com/primerlearning](https://www.patreon.com/primerlearning) — snippet only
- **Primer's animation code** is public: a Blender-based library structured after 3Blue1Brown's manim. The repo is archived with a warning that getting it running "is extremely likely to waste your time". — [Helpsypoo/primer](https://github.com/Helpsypoo/primer) — opened
- **Bartosz Ciechanowski:** "544 paid members… membership starts at $3/month". His content is "accessible to everyone without annoying ads or paywalls". A claim that patrons funded "full-time dedication… by 2021" comes from Grokipedia, a low-reliability source. — [patreon.com/ciechanowski](https://www.patreon.com/ciechanowski); [Grokipedia](https://grokipedia.com/page/Bartosz_Ciechanowski) — snippet only
- **Dwarf Fortress** (free and donation-funded before a paid Steam/itch edition launched on 6 Dec 2022):
  - About $15,000 a month in donations while free.
  - $164,666 for all of 2022.
  - $7,230,123 in January 2023.
  - 160,000 units in the first 24 hours; nearly 500,000 by the end of December 2022; later more than 1 million on Steam.
  — [Game World Observer](https://gameworldobserver.com/2023/02/02/dwarf-fortress-revenue-7-million-january-bay-12-games); [PCGamesN](https://www.pcgamesn.com/dwarf-fortress/sales-numbers-steam-december); [Game Developer](https://www.gamedeveloper.com/business/dwarf-fortress-has-topped-1-million-sales-on-steam); [Hitmarker](https://hitmarker.net/news/dwarf-fortress-sells-160-000-copies-first-day-1743512) — snippet only
- **Cookie Clicker:** Steam release on 1 Sep 2021 at $5. The browser version stays free and remains the "master version" that gets updates first. "Approximately 2.8 million units" and "$21.9M gross" are third-party estimates. — [NME](https://www.nme.com/news/gaming-news/cookie-clicker-has-quickly-become-one-of-the-most-popular-games-on-steam-3038588); [games-stats.com (estimate)](https://games-stats.com/steam/game/cookie-clicker/) — snippet only
- **Universal Paperclips:** a paid $1.99 mobile version followed the free web game. No sales figures were found. — [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips) — snippet only
- **Distill hiatus** (July 2021) — [Distill hiatus source](https://github.com/distillpub/post--distill-hiatus/blob/master/index.md) — opened (author's source repo):
  - "Distill is volunteer run and these frictions have caused our team to struggle with burnout."
  - "For some of our early articles, we provided more than 50 hours of help with designing diagrams, improving writing style, and shaping scientific communication."
  - "the primary bottleneck is the amount of effort it takes to produce these articles and the unusual combination of scientific and design expertise required."
  - Distill pointed authors to self-publishing instead.
- **Red Blob Games** is free, with "no signup and no ads". — [redblobgames.com](https://www.redblobgames.com/) — snippet only

### Inferences
- **Patronage scale.** For a solo developer, expect patronage in the hundreds of paying members, not thousands. Those numbers are clustered around 540–640 for three well-known creators (snippets, undated). Step-changes follow viral hits, as with Trust.
- **Free web, paid edition.** The most lucrative model in the evidence keeps the web version free and canonical and sells a convenience or deluxe edition: Dwarf Fortress, Cookie Clicker, Paperclips. For this project, that could be a Steam or itch build of city mode with extra scenarios, offline play and a save system, while lab mode stays free and CC-licensed.
- **Other routes.** Fellowships and newsroom collaborations (OpenNews and Frontline; Case and Salathé) give one-off funding and distribution together.
- **Scope.** Distill's burnout points to keeping scope to what one person can maintain. Release lab cards one at a time, which the plan's "ship lab mode early" already supports, rather than polishing everything at once.

### Gaps
- Patreon, Graphtreon and Social Blade were blocked, so there are no time series or verified current counts. All Patreon numbers are undated snippets and may mix snapshots.
- I found no information on Primer's sponsorship deals or Ciechanowski's income.
- A Dark Room's paid iOS version and neal.fun's funding model were not checked because the search budget ran out.
- No independent (non-estimate) Cookie Clicker sales figure was found.
