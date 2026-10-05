# Build a dot society from proven parts

The complete written report from the research, about 11,500 words with code and configs. The main tab summarises it; the Sources tab lists everything it cites.

## Bottom line

Build it as a deterministic TypeScript simulation in a Web Worker. Agent state lives in struct-of-arrays typed arrays, randomness comes from seeded PRNG streams, and money sits in an integer-cent ledger whose balances always sum to zero, with snapshots streamed to a WebGL2 dot renderer. Take the society's rules from published, replicated models rather than inventing them: Lengnick's posted-price household–firm loop for the economy, a Becker-style payoff test priced by Epstein's local arrest risk for crime, a Short-style repeat-victimisation field for hotspots, and patrols that stop at hot spots for the 10–15 minutes Koper found works best. The hunch that someone has already built this is half right: every ingredient exists, but no project found as of October 2026 combines a static-hosted, rule-based dot view with police, thieves, merchants and an emergent market. Common Ground has the browser architecture but no crime, Songs of Syx has guards and emergent criminals but is a closed desktop game, Brunnfeld has theft and an order book but runs every agent through an LLM on a server, and BazaarBot's market core has been dormant since 2017 with a documented price-collapse bug. Primer never simulated money, crime or police and his repositories carry no license, so what transfers is his method: one mechanic at a time, one trait per visual channel, charts that move with the creatures, small on-screen populations backed by large unanimated runs, and an equilibrium worked out on paper before the simulation is trusted. Performance is the least risky part, since local benchmarks put movement at about 0.5 ms and snapshot transfer at about 0.1 ms per tick for 100,000 agents. The real risks are an economy that leaks money or herds into one role, crime cascades like the ones that got Oblivion's Radiant AI toned down, and dynamics too subtle to read. A seven-milestone plan keeps those risks measurable: it starts with a Primer-style lab mode, grows to a 100k-dot city, and closes every milestone with automated seed-sweep tests.

## Five projects each cover a fifth of the idea

The research found no project, as of 4 October 2026, that combines all five properties the brief implies: **browser-only static hosting, rule-based agents, a live dot view, a police/thief/merchant role set and a market economy**. One caveat limits that claim. Reddit, itch.io's tag pages and GitHub's star-sorted search were unreachable during research, so a small hobby project could exist undetected. What the search did find is a set of partial matches that together work as a parts catalogue.

| Project | What matches | What is missing | What to borrow |
| --- | --- | --- | --- |
| [Common Ground (fraferra/agents-world)](https://github.com/fraferra/agents-world) | Native JS modules, Canvas 2D, zero dependencies. The simulation runs in a Web Worker that posts only changed state. Deterministic replay ("rendering and playback speed do not change the random sequence"). 120 agents trade, barter and work for companies founded by entrepreneurs; Gini emerges at ≈0.25 for foragers and 0.48 for farmers | No crime, law or police. 0 stars and 15 commits, dated 24–26 Sep 2026. No visible license | Worker that sends only diffs, seeded determinism, browser saves |
| [Songs of Syx](https://songsofsyx.com/wiki/index.php/Guardpost) | Thousands of simulated citizens; criminals appear in numbers set by law and happiness; guards patrol and pursue; courts set punishments | Closed-source Java desktop city-builder, still pre-1.0 | The crime loop: unhappiness → offenders → guards → court or jail → back into the population |
| [Brunnfeld](https://github.com/marcopatzelt/brunnfeld-agentic-world) | About 19 roles. An order book where orders expire after 16 ticks and prices follow a 10-trade rolling average. Debt. A wheat → flour → bread chain and a 10% weekly wealth tax. A `steal` action and banishment to prison by council vote. TypeScript, MIT, 136 stars | Every agent is an LLM call: 8–15 s per tick for 20 agents and $0.03–$0.23 per tick depending on the model. Needs a Node server. No police role | Supply-chain bottlenecks; an inequality bar that is always visible |
| [Civitas (NehvX/simulated-society)](https://github.com/NehvX/simulated-society) | About 600 founding citizens plus about 300 born over 40 years; police and prisoners; property-crime decisions grounded in Becker (1968) and Tyler (1990), with recidivism and corruption; no LLM | Python batch model with HTML dashboards and no live animation; 1 star | Research-grounded crime equations |
| [BazaarBot](https://github.com/larsiusprime/bazaarBot) / [Economia.js](https://github.com/Jimimimi/economia) | Farmers, miners, refiners and blacksmiths trade through a clearing house, and prices emerge; bankrupt agents switch to the most profitable role; Economia runs in a browser | No space, movement or crime. Last BazaarBot commit 10 July 2017. An open issue reports prices trending to pennies | Price beliefs and role switching after bankruptcy, once fixed |

Common Ground is the most instructive entry, and not because of its features. Its 15 commits span three days and are co-authored by "claude" ([GitHub commits](https://github.com/fraferra/agents-world/commits/main)). A deterministic browser society running in a worker, with trade, employment and an emergent Gini, is now a few days' work with an AI coding assistant. Technology will not set this project apart. What will set it apart is the police–thief–merchant loops that none of these projects close, and how clearly those loops read on screen.

The best architectural reference is not a society game at all. **ndouglas/SugarScape** pairs a Rust core compiled to WebAssembly with a TypeScript front end. It runs in a Web Worker and is deterministic for a given config and seed. It offers share links, side-by-side Compare, and parameter sweeps spread over one Web Worker per core. It already implements Epstein's civil-violence model, Schelling segregation, Axtell's emergent firms and zero-intelligence traders, all under the MIT license, and its last commit was on 3 October 2026 ([GitHub ndouglas/SugarScape](https://github.com/ndouglas/SugarScape)). It is a single-author project from late 2026, so read it but don't depend on it. Primer's own browser collaboration, the **MinuteLabs Evolution Simulator**, proves the same pattern: Vue 2, Three.js and Chart.js wrapped around a Rust/WASM core that runs in a worker behind Comlink. It is GPL-3.0, though, and has not changed since May 2021 ([GitHub minutelabsio/evolution-simulator](https://github.com/minutelabsio/evolution-simulator/blob/master/package.json)).

Explorable explanations set the presentation standard. The Washington Post's 2020 "simulitis" piece moved **200 bouncing dots** through a fictional outbreak and became the most-read story in the site's history ([Poynter](https://www.poynter.org/reporting-editing/2020/how-a-blockbuster-washington-post-story-made-social-distancing-easy-to-understand/)). Its author used a fake disease because modelling the real one was "too complicated". Nicky Case's Parable of the Polygons and The Evolution of Trust are public domain, and Trust is built on PIXI.js ([GitHub ncase/trust](https://github.com/ncase/trust); [GitHub ncase/polygons](https://github.com/ncase/polygons)). None of them combines roles, money and crime. They do share a kit worth adopting wholesale: a population small enough to follow individuals, one state per colour, a live aggregate chart beside the animation, rules introduced one at a time, a fictional model that avoids arguments about accuracy, and a free sandbox at the end. Prison Architect adds one more tool, the ability to trace "the journey of any particular piece of contraband" ([Quarter to Three](https://www.quartertothree.com/fp/2015/10/16/serious-and-seriously-good-prison-architect-is-the-game-you-never-knew-you-wanted/)), which here becomes a "follow this coin" view.

### Shipped games already wrote the failure report

Commercial games show what breaks when economies and crime are simulated seriously. Dwarf Fortress disabled its dwarven economy in version 0.31 because coins were physical objects, which dwarves spent their work time hauling and scattering around the fortress ([DF Wiki](https://dwarffortresswiki.org/index.php/DF2014:Dwarven_economy)). Ultima Online's closed resource loop failed because its designers "had not counted on the deflationary effects of hoarding"; one character held over 10,000 identical shirts ([Simpson, GDC 2000](https://dergigi.com/assets/files/UO-Economics.pdf)). Its AI was cut for a separate reason, the cost of radial searches followed by pathfinding ([Raph Koster](https://www.raphkoster.com/games/snippets/did-players-destroy-the-uo-ecology/)). Oblivion's Radiant AI produced NPCs who killed a quest's skooma dealer before the player arrived, and a leaf-raker who killed someone for a rake. It was toned down because cities became lawless ([The Escapist](https://www.escapistmagazine.com/oblivion-npcs-brought-their-world-to-life-then-they-nearly-killed-it/)). In 2026 the Grok-run world in Emergence World collapsed on day four in a "retaliatory violence cascade" ([GitHub EmergenceAI/Emergence-World](https://github.com/EmergenceAI/Emergence-World)).

Even mature studios struggle. Cities: Skylines II's "Economy 2.0" overhaul pushed unemployment in some cities from about 1% to about 38% ([PCGamesN](https://www.pcgamesn.com/cities-skylines-2/update-economy-2-0)). SimCity 2013's GlassBox engine sent workers to the nearest available job and gave them no persistent home ([PC Gamer](https://www.pcgamer.com/simcity-inside-the-glassbox-engine/)). These lessons become requirements. Money stays an abstract balance, and every faucet and sink is metered, as EVE Online's monthly economic report still does in 2026 ([CCP MER April 2026](https://www.eveonline.com/news/view/monthly-economic-report-april-2026)). Offending gets hard caps and cooldowns, every dot keeps a persistent home and job, and the schedule includes time for a stabilisation pass.

### LLM agents are the wrong engine but a useful garnish

The richest emergent societies of the last two years are LLM-driven, and they are slow and expensive in ways a static site cannot absorb. Generative Agents cost "thousands of dollars in token credits" to run 25 agents for two game days ([ACM UIST 2023](https://dl.acm.org/doi/fullHtml/10.1145/3586183.3606763)). Brunnfeld takes 8–15 s per tick for 20 agents on Claude Haiku, about $25 per simulated week ([GitHub](https://github.com/marcopatzelt/brunnfeld-agentic-world)). AI Town renders with PixiJS in the browser but needs a Convex backend ([GitHub a16z-infra/ai-town](https://github.com/a16z-infra/ai-town)).

Running models in the browser does not change the arithmetic. WebLLM decodes Llama 3.1 8B at **41.1 tokens/s on an M3 Max** ([WebLLM paper](https://arxiv.org/html/2412.15803v2)), and a 4-bit Llama 3.2 1B is a 695 MB download ([Loft Tools](https://lofttools.com/blog/browser-llms-2026-webllm-transformers-js/)). At 15–80 tokens/s, even a 30-token decision takes 0.4–2 s, so 200 dots would need minutes per tick.

Keep the core rule-based. If language is wanted, make it opt-in and occasional. One option is a one-paragraph diary entry, generated from structured facts when a dot is clicked or arrested. Another is a set of parameter nudges per archetype every few simulated days. That second pattern is how AgentTorch reached 8.4 million agents: it queried the LLM once per archetype rather than once per agent ([TechTalks](https://bdtechtalks.com/2024/10/02/agenttorch-llm-agents/)).

### Published models supply the rules, under very different licenses

Every role in the brief already has a published, replicated agent-based model. Sugarscape covers resource economies and two-good trade, and Epstein's civil-violence model covers citizens and cops. Lengnick's 2013 baseline covers a closed economy of households and firms. Short et al.'s lattice model covers burglary hotspots, and Schelling covers residential sorting. The mechanics section below details each.

The toolkits that host these models fit worse than the models themselves. NetLogo Web runs fully client-side but is GPL ([GitHub NetLogo/Tortoise](https://github.com/NetLogo/Tortoise)), and AgentScript is GPL-3.0 ([GitHub backspaces/agentscript](https://github.com/backspaces/agentscript)). Mesa reaches the browser only through Pyodide, and its py.cafe demo rendered a blank screen in mid-2026 ([Mesa issue #3778](https://github.com/mesa/mesa/issues/3778)). krABMaga's WASM visualisation is still a release candidate ([GitHub krABMaga](https://github.com/krABMaga/krABMaga)). The right foundation is a small TypeScript core that ports the rules, with NetLogo Web as a throwaway sandbox for trying a rule in an afternoon. Licensing then decides what can be copied and what must be reimplemented from the published rules (this is not legal advice):

| Source | License | Practical rule |
| --- | --- | --- |
| [Primer's repos](https://github.com/Primer-Learning/PrimerTools) (Helpsypoo/primer, PrimerTools, RockPaperScissors) | None | Study, then reimplement the rules; the blob models are deliberately private |
| [MinuteLabs Evolution Simulator](https://github.com/minutelabsio/evolution-simulator) | GPL-3.0 | Study only, unless the app can be GPL |
| [NetLogo library models](https://github.com/NetLogo/models/blob/main/Sample%20Models/Social%20Science/Rebellion.nlogox) (Rebellion, Sugarscape, Segregation) | CC BY-NC-SA 3.0 | Reimplement from the published rules |
| NetLogo Web/Tortoise, AgentScript | GPL | Use as a sandbox only |
| [Mesa examples](https://github.com/mesa/mesa/blob/main/LICENSE) | Apache-2.0 | Port with attribution |
| [ndouglas/SugarScape](https://github.com/ndouglas/SugarScape/blob/main/LICENSE), Brunnfeld, [Lengnick replication](https://github.com/avakeeling199/Lengnick-replication) | MIT | Port with attribution |
| [Parable of the Polygons](https://github.com/ncase/polygons/blob/gh-pages/README.md), Evolution of Trust | CC0 / public domain | Reuse freely |
| Common Ground; older JS Sugarscapes ([bragin](https://github.com/bragin/sugarscape) and others) | None visible | Study only |

## Primer contributes a verification habit, not reusable code

### What the blob videos actually simulate

Primer's channel had 1.94 million subscribers, about 98 million views and 24 videos as of mid-2026 ([Social Blade](https://socialblade.com/youtube/handle/primerblobs)). It built its reputation on a handful of agent simulations. They are [Simulating Natural Selection](https://www.youtube.com/watch?v=0ZGbIKd0XrM) (November 2018), [Simulating Supply and Demand](https://www.youtube.com/watch?v=PNtKXWNKGN8) (April 2019) and [Simulating the Evolution of Aggression](https://www.youtube.com/watch?v=YNMkADpvO4w) (mid-2019), followed by two altruism videos, a voting-systems video (November 2020), [Rock-Paper-Scissors](https://www.youtube.com/watch?v=tCoEYFbDVoI) (July 2024) and the Evolution of Aging (around 2025). Two corrections matter for anyone drawing on his work. First, the well-known "Simulating an Epidemic" is 3Blue1Brown's video, not Primer's ([FlowingData](https://flowingdata.com/2020/03/30/simulating-an-epidemic/)). Second, **no Primer video simulates crime, police, wealth or an economy with several goods**. Every role mapping below is extrapolated from his mechanics, not taken from his content. The rules that follow were checked line by line against his source code. That is more reliable than the videos' narration, though the code can differ slightly from the builds he rendered.

Every Primer simulation shares one skeleton. Days are discrete and food resets each morning. A creature with 0 food dies, one with 1 food survives, and one with 2 survives and has an offspring. Offspring copy their parent with small mutations, a 5% chance of ±0.1 per trait. Each video adds exactly one interacting mechanic to that skeleton ([natural\_sim.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/natural_sim.py)). In Simulating Natural Selection, each step costs `size³·speed² + sense` energy out of a daily budget of 800. A creature sees food within 10 + 25·sense units, and can eat another creature whose size times 1.2 is at most its own ([natural\_sim.py L377–382](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/natural_sim.py#L377-L382)). His balancing comments in that file are the most transferable advice in the repository. He warns that multiplying costs "encourages extreme tradeoffs, making the traits that matter less (sense) into dump stats", and tells himself to "rebalance using non-animated sims to get a sense for things more quickly".

The two videos closest to the brief are the market and the contest. In Supply and Demand, each buyer and seller has a private price limit drawn from 0–50 and a goal price that starts at 30. The seller asks `max(goal − concession, limit)`, and the trade goes through at that ask if the ask is at or below the buyer's bid. After a trade the buyer's goal drops by 1 and the seller's rises by 1, while an agent that fails to trade moves 1 toward its own limit. Each agent trades at most one unit per session, across 20 sessions ([market\_sim.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/market_sim.py); [supply\_and\_demand.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/video_scenes/supply_and_demand.py)).

In the Evolution of Aggression, creatures choose among 61 food sites worth 2 food each. A creature alone at a site eats both pieces and two doves get 1 each. A hawk meeting a dove takes 1.5 and leaves 0.5, and two hawks each end with 0 after paying a fight cost. A creature survives if its score beats `random()` and reproduces if it beats `1 + random()` ([hawk\_dove.py L120–135](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/hawk_dove.py#L120-L135); [aggression.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/video_scenes/aggression.py)). Several community re-implementations get these payoffs wrong; one has the hawk take both pieces outright ([kalpitborkar/Simulating-Aggression](https://github.com/kalpitborkar/Simulating-Aggression)). Take them from his code. The 2024 Rock-Paper-Scissors sim adds a `tieCost`, set to 0.5 in the "find stability" scene with 800 blobs and 400 trees ([FindStabilityScene.cs](https://github.com/Primer-Learning/RockPaperScissors/blob/main/Video%20scenes/FindStabilityScene.cs)). In standard evolutionary game theory, a positive tie cost makes being common costly, and that is what stabilises a three-way mix.

### Legibility tricks worth copying

Primer's presentation is deliberately designed. Each simulated day plays in five labelled phases: 0.5 s at dawn to place food and creatures, a 0.25 s pause, 4 s of activity, another 0.25 s pause and a 0.5 s night reset. Once viewers know the rules, scenes compress to one second per day ([natural\_sim.py L51–57](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/natural_sim.py#L51-L57); [natural\_selection.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/video_scenes/natural_selection.py)). Each trait owns exactly one visual channel. Body scale shows size, eye size shows sense, and body colour steps through the palette every 0.3 units of speed. A beard marks the green-beard gene, and hawk–dove blobs shade from blue to red by their chance of fighting, all against a dark slate background ([drawn\_contest\_world.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/drawn_contest_world.py); [constants.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/constants.py)). Graphs are tied to the world object and update in step with the creatures. For three strategies he uses a ternary plot whose tracking points are themselves blobs ([RockPaperScissors commits](https://github.com/Primer-Learning/RockPaperScissors/commits/main)).

On-screen populations stay small, at most 122 blobs in the hawk–dove world, while statistical claims come from unanimated runs of up to 11,000 creatures ([hawk\_dove\_basic.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/hawk_dove_basic.py)). A small vocabulary of angry eyes, winces, cheers, an "evil pose" and random blinks carries emotion cheaply ([blobject.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/blobject.py)). He simulates first and renders second, saving runs and reloading them by name. In December 2024 he added call counting to his RNG while "trying to track down sources to non-determinism" ([PrimerTools commits](https://github.com/Primer-Learning/PrimerTools/commits/main)). Demand for a playable version is on record in his own words: "By far, the most common YouTube comment is a request to be able to play with the simulation" ([Primer on X](https://twitter.com/primerlearning/status/1252988730916380673)).

For reading code, his Godot-era PrimerTools is the more useful reference architecture. It has an ECS-like `EntityRegistry` with component structs, systems such as `CreatureSystem`, visual event managers that keep the simulation separate from rendering, a 30 Hz physics step and a seekable `StateChangeAnimationSystem` ([PrimerTools Simulation](https://github.com/Primer-Learning/PrimerTools/tree/main/Simulation)). That separation maps directly onto a split between a simulation worker and a renderer. The worker emits state plus a small event list with each snapshot (a theft at x,y, an arrest, a trade). The renderer turns those events into brief effects, such as a red ring pulse for a robbery or a coin particle for a sale, the 2D equivalents of his wince and cheer. None of his repositories has a license file, and his README says the blob models are kept private on purpose ([PrimerTools README](https://github.com/Primer-Learning/PrimerTools/blob/main/README.md)), so read the code and reimplement the rules.

### Blob mechanics map onto citizens, thieves and police

Each Primer mechanic has an analogue in a society of dots. The table lists the mappings worth building; all are design proposals, not anything Primer published.

| Primer mechanic | Society-of-dots analogue |
| --- | --- |
| 0 / 1 / 2 food → die / survive / reproduce | Daily income against cost of living. A shortfall builds hardship. A surplus above a threshold lets a dot open a shop, hire, or raise a child who inherits its dispositions |
| Trait costs `size³·speed² + sense` | Dispositions (diligence, greed, honesty, boldness, perception) with additive or mildly convex upkeep, so no trait becomes a dump stat |
| 5% chance of ±0.1 mutation | Children copy dispositions with ±0.1 drift, clamped to \[0, 1\] |
| Hawk–dove contest over a food site | Two dots over a purse or a stall: two traders split it, a thief takes ¾ from a trader, two thieves fight. Police act as a third "retaliator" strategy |
| Rock-paper-scissors with a tie cost | Police beat thieves, thieves beat merchants, merchants fund or lobby the police. Plot role shares on a ternary chart; crowding within one role acts as the tie cost |
| Green beard with separate "has beard" and "helps beards" genes ([inclusive\_fitness.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/video_scenes/inclusive_fitness.py)) | Guild badges that trigger mutual aid; free riders who wear the badge without helping invade unless badges are costly |
| ±1 goal-price learning | Merchant pricing that converges on the supply–demand intersection and visibly shifts after shocks |
| Dawn → day → evening → night | Jobs and goods appear; work and shopping; commute home; at night, books settle, births and deaths happen, and charts update |
| Aging and death causes | A mortality schedule, with histograms of age at death split by poverty, violence and old age |

The habit to copy matters more than any single row. Primer works out the expected outcome before trusting the simulation; his scenes include a `payoff_grid` and `hypotheticals` ([aggression.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/video_scenes/aggression.py)). When that check broke down, he published an altruism video claiming "Hamilton's rule is a lie" ([YouTube fandom wiki](https://youtube.fandom.com/wiki/Primer)), then withdrew it and published a self-critique, "How I deceived myself" ([IMDb](https://www.imdb.com/title/tt22051430/)). For a two-strategy contest, let a be the payoff for hawk against hawk, b for hawk against dove, c for dove against hawk, and d for dove against dove. The stable mixed share of hawks is p\* = (b − d)/((b − d) + (c − a)). Primer's payoffs give p\* = 0.5, matching the 50/50 hawk–dove equilibrium a Cornell course blog analysed ([Cornell INFO 2040](https://blogs.cornell.edu/info2040/2022/09/12/game-theory-simulating-the-evolution-of-aggression)). The same payoffs show aggression cutting the average food of each contested creature from 1 to 0.75. Encode the habit as a test from the first week:

```ts
// Primer's habit as a test: derive the equilibrium on paper, then make the sim prove it.
// Two-strategy contest, payoffs to the row player: a = H|H, b = H|D, c = D|H, d = D|D.
export const mixedEquilibrium = (a: number, b: number, c: number, d: number) =>
  (b - d) / ((b - d) + (c - a));

test('lab: thief/trader contest settles near the analytic mix', () => {
  const pStar = mixedEquilibrium(0, 1.5, 0.5, 1);           // Primer's hawk–dove payoffs → 0.5
  const finals = range(50).map(seed => runLab('contest', { seed, days: 400 }).hawkShare);
  expect(Math.abs(median(finals) - pStar)).toBeLessThan(0.05);
});
```

What Primer leaves out is exactly what the brief adds: money as a stock that accumulates, spatial structure, learning within a lifetime, inventories of several units, and institutions such as taxes and police budgets. Each of these breaks the equilibria that can be computed by hand, which is what makes his videos trustworthy. The fix is two modes sharing one engine. **Lab mode** runs Primer-style scenarios in discrete days, with small populations, rules cards and analytic expectations. It doubles as the test oracle and the shareable teaching layer. **City mode** runs the continuous economy, crime and policing together.

## Compose published sub-models into one city loop

In social simulations, interesting dynamics come reliably from memory plus local interaction plus feedback. Every role in the brief already has a published model built that way, so the design work is integration rather than invention. The first integration decision is to treat roles as states that dots move through, not as identities. A dot belongs to a household, and it may hold a job at a firm, own a shop or farm, fill a treasury-funded police slot, sit in jail, or choose the "offend" action at any moment. Rules move dots between these states. An employer's bankruptcy makes its workers unemployed, and hiring happens with probability proportional to openings per job seeker times (1 − stigma). A dot with savings above a startup cost can found a firm when some good is under-supplied, reusing BazaarBot's test for a good whose bids outnumber asks by 1.5× over ten rounds ([BazaarBot DoranAndParberryEconomy.hx](https://github.com/larsiusprime/bazaarBot/blob/master/examples/doran_and_parberry/source/DoranAndParberryEconomy.hx)). BazaarBot also hands every bankrupt agent the single most profitable class, so agents that fail in the same round pile into the same role. Avoid that herding by choosing roles by softmax over a moving average of profit that values inventory at market price, capping role switches at about 0.5% of agents per tick, and making switching cost retraining time.

The brief's "others" fit the same pattern. Couriers who restock shops create traffic that can be robbed, guards hired by shops add guardianship, and courts can be a timer as in Songs of Syx ([Songs of Syx Wiki: Law](https://www.songsofsyx.com/wiki/index.php/Law)). Leave landlords out for now, since Cities: Skylines II removed them to fix runaway rents ([PCGamesN](https://www.pcgamesn.com/cities-skylines-2/update-economy-2-0)). Demographics follow Sugarscape ([JASSS appendix](https://jasss.soc.surrey.ac.uk/12/1/6/appendixB/EpsteinAxtell1996.html)). Dots die at a maximum age or of starvation, births or immigrants replace them toward a target population, and estates pass to heirs or to the treasury. Floors on the number of police, merchants and producers keep the economy from dying out.

### Brains: utility scoring over place advertisements

Planner-based architectures solve a problem dots don't have. GOAP, which Jeff Orkin built for F.E.A.R., runs A\* search over world states to produce multi-step tactical plans ([Orkin, GDC 2006](https://www.gamedevs.org/uploads/three-states-plan-ai-of-fear.pdf)). Practitioners describe GOAP and HTN planners as expensive at runtime, and behaviour trees are cheap but static. A better fit combines two ideas from shipped games. Dave Mark's Infinite Axis Utility System scores each action as the product of "considerations": inputs normalised to \[0, 1\] and passed through response curves. A zero on any consideration rules the action out. The behaviour that won last time gets a flat 25% momentum bonus, which stops agents flip-flopping ([Curvature wiki](https://github.com/apoch/curvature/wiki/Utility-Theory-Crash-Course)). The Sims supplies the targets. Objects advertise actions whose appeal depends on a Sim's motives and distance, and the Sim picks at random among the top several ads ([Don Hopkins](https://donhopkins.medium.com/dumbold-voting-machine-for-the-sims-1-3e76f394452c)).

In the dot city, places publish ads (`{action, needDeltas, duration, cost, roleMask, timeWindow}`). A dot thinks only when its activity ends, an interrupt fires, or a slow timer expires. An activity state machine then carries out the choice, with states TRAVEL, WORK, SLEEP, SHOP, PATROL, PURSUE, STEAL, FLEE and JAILED:

```ts
// Places publish ads; a dot scores (action, target) pairs only when it thinks.
interface Ad { action: Act; roleMask: number; window: [number, number]; durationMin: number;
               costCents: number; needDelta: Float32Array }
interface Consideration { input: (a: number, tgt: number) => number; curve: Float32Array } // 65-entry LUT
interface ActionDef { id: Act; weight: number; cons: Consideration[] }

const lut = (t: Float32Array, x: number) => t[x <= 0 ? 0 : x >= 1 ? 64 : (x * 64 + 0.5) | 0];

function score(a: number, act: ActionDef, tgt: number, best: number): number {
  let s = act.weight * (act.id === activity[a] ? 1.25 : 1);   // momentum: +25% for the running behaviour
  for (const c of act.cons) {
    s *= lut(c.curve, c.input(a, tgt));                       // inputs in [0,1]; any 0 vetoes the action
    if (s <= best) return 0;                                   // curves are <= 1, so s only falls: early out
  }
  return s;
}
// think(a): for each action allowed by roleMask × the 3–8 nearest candidate places from the ad index,
// keep the top 3 and choose weighted-random among those within ~90% of the best (Sims-style).
```

Keep needs to four to six urgencies in \[0, 1\], because every extra need adds tuning burden and noise. Hunger, fatigue and social contact build up steadily. Fear jumps when a dot witnesses a crime and decays with a half-life of roughly half a day. Financial stress is derived as `1 − savings/(7 × dailyCost)`. The decay rates are design guesses, but the daily rhythm they must produce is measured: in 2024 Americans slept 9 hours 2 minutes a day, and full-time workers worked 8.1 hours on days they worked ([BLS ATUS 2024](https://www.bls.gov/news.release/archives/atus_06262025.htm)). Express schedules as soft curves rather than scripts, for example an `inShift(t)` consideration that ramps up over the hour before a shift, with ±30 minutes of jitter per dot. Rush hours then emerge on their own. Update needs lazily at think time (`need += rate × (now − lastUpdate)`), and drive thinking from a timing wheel of 64–256 buckets with ±20% jitter so decisions never line up.

Utility AI's known weakness is that it can be "too subtle – making choices that are logically consistent but don't 'read' well to the player" ([Curvature wiki](https://github.com/apoch/curvature/wiki/Utility-Theory-Crash-Course)). That makes a click-to-explain panel a core feature rather than polish. It should show the top three scored actions and every consideration value. Dave Mark's "compensation factor" corrects for the shrinkage caused by multiplying many considerations, but the formula commonly reproduced online could not be verified during research.

### Economy: posted prices, a zero-sum ledger and bounded steps

BazaarBot's design is appealing. Each agent holds a \[low, high\] price belief, sizes its orders by "favorability" and trades through a clearing house per good, and bankrupt agents are replaced by the most profitable class. Its code does not hold up, though. The clearing house never checks that a bid meets an ask, or that the buyer can pay. Asks have no anchor in production cost, which is why an issue open since 2018 reports prices trending to pennies with no agent profitable ([BazaarBot issue #17](https://github.com/larsiusprime/bazaarBot/issues/17)). Idle agents are fined $2 that goes to no one while replacements arrive with $100, so the money stock drifts with the bankruptcy rate ([Logic.hx](https://github.com/larsiusprime/bazaarBot/blob/master/bazaarbot/agent/Logic.hx); [settings.json](https://github.com/larsiusprime/bazaarBot/blob/master/examples/doran_and_parberry/Assets/settings.json)). And its "significant deviation" threshold of 0.25 is in currency units, although the comment calls it a percentage ([Agent.hx](https://github.com/larsiusprime/bazaarBot/blob/master/bazaarbot/Agent.hx)). Its author's own verdict stands: "Emergent complexity is no magic formula for fun, and is often quite the opposite" ([Game Developer](https://www.gamedeveloper.com/design/bazaarbot-an-open-source-economics-engine)). Gode and Sunder's result points to the fix. Random traders that are merely forbidden to sell below cost or buy above value reach nearly 100% allocative efficiency, so market structure and budget constraints matter more than how smart the traders are ([IDEAS/RePEc](https://ideas.repec.org/a/ucp/jpolec/v101y1993i1p119-37.html)).

The robust default is posted prices for retail, a fixed call auction only for wholesale, and bounded random search for labour. Lengnick's 2013 baseline has only households and firms, a fixed money stock, daily buying and production, and monthly decisions. Without any market clearing, it reproduces business cycles plus Phillips and Beveridge curves ([IDEAS/RePEc](https://ideas.repec.org/a/eee/jeborg/v86y2013icp102-120.html)). A 2026 MIT-licensed replication supplies concrete parameters ([config.py](https://github.com/avakeeling199/Lengnick-replication/blob/main/src/config.py)):

| Parameter | Value | What it governs |
| --- | --- | --- |
| Households / firms | 1,000 / 100 | Population |
| Month | 21 days | Decision cadence |
| α | 0.9 | Consumption plan `c = min((m/P̄)^α, m/P̄)` |
| Supplier links | 7 per household | Shop network |
| λ | 3 goods per worker-day | Productivity |
| Wage step δ, patience γ | At most 1.9% per month; cuts only after 24 fully staffed months | Wage stickiness |
| Inventory band | \[0.25, 1.0\] × last month's demand | Hire below the band, fire above it |
| Price band | \[1.025, 1.15\] × marginal cost | Markup limits |
| Price step ϑ, probability θ | At most 2% per month, applied with probability 0.75 | Price stickiness |
| Search | ψ = 0.25 for cheaper shops and rationed buyers; unemployed sample β = 5 firms a month; employed search with π = 0.1 | Matching |
| Initial values (replication) | Household cash 3,100, price 25, wage 1,428 | A start near steady state |

```ts
// Firm decisions at month start (tick = day, month = 21 days). Constants: Lengnick 2013 via the replication.
function firmMonth(f: Firm) {
  if (f.vacancyUnfilled) { f.wage *= 1 + rng.econ.uniform(0, 0.019); f.monthsFull = 0; }
  else if (++f.monthsFull >= 24) { f.wage *= 1 - rng.econ.uniform(0, 0.019); f.monthsFull = 0; }
  f.wage = Math.max(f.wage, policy.minWage);
  const demand = Math.max(f.lastDemand, f.demandFloor);            // floor prevents "zombie" firms
  const lo = 0.25 * demand, hi = 1.0 * demand;
  if (f.inventory < lo) f.openVacancy();                            // at most one hire per month
  else if (f.inventory > hi && f.workers.length) f.giveNotice();     // fired next month
  const mc = f.wage / (21 * f.productivity) + f.inputCostPerUnit;   // λ = 3 goods per worker-day
  if (f.inventory < lo && f.price <= 1.15 * mc && rng.econ.next() < 0.75) f.price *= 1 + rng.econ.uniform(0, 0.02);
  else if (f.inventory > hi && f.price >= 1.025 * mc && rng.econ.next() < 0.75) f.price *= 1 - rng.econ.uniform(0, 0.02);
  f.price = Math.max(Math.round(f.price), Math.ceil(mc), 1);       // integer cents, cost floor
}
```

Four properties keep this loop stable across seeds without retuning for each run: a floor at cost, a bounded step size, probabilistic stickiness and random noise. Every price rule in the city should share them. Lengnick's known gaps have known fixes. "Zombie" firms with no workers, inventory or demand never hire again, and the replication ships a diagnostic for them. A demand floor of about one worker's output, exit after three idle months, and BAM-style entry keep the firm population alive; in BAM, new firms start at half the average firm's size with a 1.20 markup over the average price ([GitHub kganitis/bam-engine](https://github.com/kganitis/bam-engine); [Lengnick replication README](https://github.com/avakeeling199/Lengnick-replication)). The paper leaves initial conditions unspecified, so start near steady state and run a headless burn-in before showing charts; Lengnick used 1,000 months of burn-in. For wholesale goods between producers and merchants, run a uniform-price call auction every k ticks. It sorts bids descending and asks ascending, matches only while the best bid is at least the best ask, and caps each bid at `floor(cash / limit)`. Every matched unit then settles at the midpoint of the last matched bid and ask, so every buyer pays no more than its bid and every seller gets no less than its ask.

Money needs one structural decision. Route every change to a balance through a ledger in integer cents that records payer, payee and reason. Make creating and destroying money explicit transfers from and to a MINT account. Then "money is conserved unless deliberately created" becomes a one-line assertion. This is the agent-level version of the stock-flow-consistent rule that every row and column of the transactions matrix sums to zero ([Levy Institute WP 891](https://www.levyinstitute.org/pubs/wp_891.pdf)):

```ts
// All money is integer cents; every mutation is a transfer with a reason. MINT holds −(all money issued).
export const MINT = 0, TREASURY = 1, FIRST_AGENT = 8;
export const enum Reason { WAGE, PURCHASE, WHOLESALE, DIVIDEND, TAX_INCOME, TAX_SALES, TAX_WEALTH,
  WELFARE, POLICE_PAY, THEFT, FINE, RENT, MINT_ISSUE, BURN, ESTATE }
export class Ledger {
  constructor(readonly bal: Float64Array, readonly flow = new Float64Array(32)) {}
  transfer(from: number, to: number, cents: number, r: Reason): boolean {
    if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`bad amount ${cents}`);
    if (from !== MINT && this.bal[from] < cents) return false;      // no overdrafts until credit exists
    this.bal[from] -= cents; this.bal[to] += cents; this.flow[r] += cents; return true;
  }
  moneySupply() { return -this.bal[MINT]; }
}
// Asserted every tick in dev/test: Σ bal === 0 exactly; agent balances >= 0;
// Δ moneySupply === flow[MINT_ISSUE] − flow[BURN]. Theft is just transfer(victim, thief, x, THEFT).
```

Pick a monetary regime per scenario. Closed money, as in Lengnick, ties the price level to money per household, so population growth without new money is deflationary unless each newcomer is minted roughly M/N through a logged faucet. Government-issued money follows Godley and Lavoie's SIM model. With households consuming 0.6 of income and 0.4 of wealth, a 20% tax and government spending of 20, output climbs from 38.44 to 47.9 over the first two periods ([GitHub brianr747/SFC\_models](https://github.com/brianr747/SFC_models)). It heads toward a steady state of Y\* = G/θ = 100 with household money at H\* = 80, because deficit minting stops on its own once tax revenue equals spending. That makes it a robust automatic stabiliser for a game, as long as issuance is capped (for example at 1% of the money supply per month) and shown in the UI.

Households should budget with Stone–Geary (linear expenditure) demand: subsistence food and housing first, then the remainder split by fixed shares. When cash runs short, food comes before housing and housing before goods. Shortages must be real quantity rationing that raises hunger, not just high prices. Victoria 3 is the cautionary tale: prices are clamped at 25–175% of base and pop needs never ran short, so "food is always available, just expensive" ([Paradox forum](https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-131-famines-starvation-harvest-conditions.1708680/page-8); [Vic3 wiki](https://vic3.paradoxwikis.com/Market)). Drawing the flows in Machinations terms (sources, drains, converters, traders and pools) shows the dangerous positive loops ([Dormans, AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/download/12477/12336/16005)). Wealth feeds dividends that feed more wealth. Unemployment cuts demand, which triggers more layoffs. And a profitable role draws mass entry until the market gluts.

Inequality needs a counterweight that ships switched on. Random exchange alone, with money conserved, already produces an exponential wealth distribution with a Gini of 0.5. In Yard-Sale exchange, where the stake is proportional to the poorer party's wealth, all wealth ends up with one agent unless the redistribution rate χ exceeds any advantage ζ that wealth itself confers ([arXiv:2006.15008](https://arxiv.org/pdf/2006.15008); [Scientific American](https://www.scientificamerican.com/article/is-inequality-inevitable/)). Even voluntary trade that leaves both sides better off concentrates holdings. In a 2026 Sugarscape replication, trade raised the Gini from 0.320 to 0.365 in 20 of 20 seeds because "the desperate pay more": the partner closer to starving lost units about 62% of the time ([ndouglas trade-and-inequality study](https://github.com/ndouglas/SugarScape/blob/main/docs/studies/2026-09-27-trade-and-inequality.md)). Lengnick's rule of paying profits to all households in proportion to their cash is itself a rich-get-richer channel. Ship a wealth tax above an exemption, on by default, with the revenue recycled as transfers. Test the Gini code against answers that can be derived by hand: 0.5 for pure random exchange, and about 0.27 when every agent saves half its money in each exchange.

### Crime: a decision any dot can make, priced by local risk

Don't spawn "criminals" as a fixed role; four bodies of theory together define a decision any dot can make. Becker's model says a dot offends when the expected utility p·U(Y − f) + (1 − p)·U(Y) beats the legal alternative, where Y is the gain, p the probability of conviction and f the punishment ([Becker 1968](https://laws21.classes.ryansafner.com/readings/Becker-1968.pdf)). The evidence weights these terms unevenly: "the certainty of being caught is a vastly more powerful deterrent than the punishment" ([NIJ](https://nij.ojp.gov/topics/articles/five-things-about-deterrence)). Routine activity theory supplies opportunity, since crime happens when a motivated offender, a suitable target and the absence of a capable guardian meet in time and space ([Simply Psychology](https://www.simplypsychology.org/routine-activities-theory.html)). Crime pattern theory limits the search to the offender's "awareness space" of familiar places and routes ([KPU Introduction to Criminology](https://kpu.pressbooks.pub/introcrim/chapter/16-5-geometric-theory/)). Epstein's civil-violence model supplies perceived risk. Estimated arrest probability is `P = 1 − exp(−k·C/A)`, where C counts cops and A counts active offenders within vision, and k = 2.3 makes one cop per active offender give P ≈ 0.9 ([NetLogo Rebellion](https://github.com/NetLogo/models/blob/main/Sample%20Models/Social%20Science/Rebellion.nlogox)). The offend score multiplies motivation, opportunity and deterrence:

```ts
// Any dot with propensity > 0 can win this action. Motivation × opportunity × deterrence.
function offendScore(a: number): number {
  const tgt = bestTargetInAwareness(a);                  // awareness cells × (A0 + B) field × suitability
  if (tgt < 0) return 0;
  const desperation = Math.max(finStress[a], 0.7 * hunger[a]);
  const legal = employed(a) ? dailyWageCents[a] : DAILY_COST / 4;      // Becker's opportunity cost
  const loot = expectedLootCents(tgt);
  const gain = loot / (loot + legal + 1);
  const C = Math.min(copsWithin(a, VISION), 15), A = Math.min(1 + offendersWithin(a, VISION), 15);
  const pCop = ARREST[arrestRule][C * 16 + A];           // precomputed: smooth 1 − e^(−2.3·C/A) | floor | round
  let silent = 1;                                        // P(no witness reports): multiplication only
  for (let w = witnessesNear(tgt); w > 0; w--) silent *= 1 - P_REPORT * legitimacy;
  const pCaught = 1 - (1 - pCop) * (1 - (1 - silent) * P_RESPONSE) * (1 - policeRecent[cellOf(a)]);
  return lut(DESPERATION, desperation) * propensity[a] * lut(GAIN, gain)
       * lut(DETER[riskBucket[a]], 1 - pCaught);         // ≈ (1 − pCaught)^(1 + 2·riskAversion)
}
```

One replication detail decides whether crowds riot. A 2026 replication ran Epstein's formula exactly as published, with his Run 2 settings, and saw no outburst at all in three seeds of 3,000 ticks; at most 34 agents were active at once. Even a crowd that outnumbers the cops three to one faces P ≈ 0.54 ([ndouglas civil-violence spec](https://github.com/ndouglas/SugarScape/blob/main/docs/superpowers/specs/2026-09-25-civil-violence-design.md)). NetLogo floors C/A and Mesa rounds it. Mesa's code notes that "without it, its impossible to replicate the dynamics shown there" ([Mesa agents.py](https://github.com/mesa/mesa/blob/main/mesa/examples/advanced/epstein_civil_violence/agents.py)). With floor, P drops to 0 once offenders outnumber police locally. That creates safety-in-numbers tipping and sudden bursts. The smooth form gives graded deterrence, which suits individual theft. Expose the rule as a named switch (`arrestRule: 'smooth' | 'floor' | 'round'`) and test both.

Calibrate the population rather than individual rules. Draw propensity from a skewed distribution such as Beta(0.5, 4), so that a small tail commits about half of all crime, one of the three "known facts" Weisburd's hot-spot model was built on ([Semantic Scholar](https://www.semanticscholar.org/paper/CAN-HOT-SPOTS-POLICING-REDUCE-CRIME-IN-URBAN-AREAS-Weisburd-Braga/816e3a7b75bdd674d7394d7861c20cc956dafaa7)). Let desperation come from the economy, then check that the emergent response lands near the measured one: property crime rises 2.8–5% for each percentage point of unemployment ([Raphael & Winter-Ebmer](https://escholarship.org/uc/item/5hb4h56g)). Let offending friends raise a dot's propensity for petty crime, where Glaeser, Sacerdote and Scheinkman found social interactions strongest ([SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=225805)).

Where crime happens should come from a Short et al. attractiveness field. Each cell's attractiveness is a fixed land-use term plus a dynamic term that each burglary boosts and that then decays and spreads to neighbouring cells. Depending on parameters, the field produces no hotspots, stationary hotspots or drifting ones ([Short et al. 2008](https://www.math.ucla.edu/~bertozzi/papers/M3AS-final.pdf)). Run it per sim-hour as `B[c] = ((1 − η)·B[c] + η·mean4(B, c))·(1 − ω) + θ·crimes[c]`, and use `A0[c] + B[c]` to weight offenders' choice of target. Set the decay so the half-life is one to two sim-weeks, and the spread so it reaches two to four cells. That matches real near-repeat burglary risk, which stays raised for 2–4 weeks within 200–400 m ([National Policing Institute](https://www.policinginstitute.org/wp-content/uploads/2018/09/Burglary_9.12.18.pdf)). The update above is a reconstruction that still needs checking against the paper; the reported dimensionless values are ω = 1/15 and A0 = 1/30.

Jail should cost the offender a job with high probability and leave a hiring stigma afterwards. Model re-offending as a hazard `h(t) = h0·e^(−t/τ) + h∞`, fitted to the shape of the US record: 43% of released prisoners are arrested in year one, 22% in year ten, and 82% within ten years ([BJS](https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018)). Because certainty deters more than severity, a sentence-length slider should mainly work by keeping offenders off the street. Finally, add guardrails. Cap the number of simultaneous offenders, add cooldowns, keep violent crime off by default, and protect the last few merchants and officers so they cannot be robbed out of existence.

### Police: dwell at hot spots, and never trust recorded crime

The policing evidence is unusually clean. Kansas City's 1974 experiment found that raising or lowering routine preventive patrol changed nothing: not crime, fear, attitudes or response times ([Kelling et al.](https://www.policinginstitute.org/wp-content/uploads/2015/07/Kelling-et-al.-1974-THE-KANSAS-CITY-PREVENTIVE-PATROL-EXPERIMENT.pdf)). Koper's reanalysis of Minneapolis hot-spot patrols found the ideal stop lasts **10–15 minutes**. The chance of crime within 30 minutes of the officer leaving was 16% after a drive-by but 4% after a stop that long, and each extra minute of presence lengthened the time to the next incident by 23% ([CEBCP](https://cebcp.org/wp-content/onepagers/KoperHotSpots.pdf)). A Campbell review of 65 studies found noteworthy reductions in 62 of 78 tests, and on balance the benefits spread to nearby areas rather than pushing crime there ([Braga et al. 2019](https://onlinelibrary.wiley.com/doi/full/10.1002/cl2.1046)). Weisburd et al.'s agent-based model reproduced hot-spot patrol beating both random patrol and no police ([Semantic Scholar](https://www.semanticscholar.org/paper/CAN-HOT-SPOTS-POLICING-REDUCE-CRIME-IN-URBAN-AREAS-Weisburd-Braga/816e3a7b75bdd674d7394d7861c20cc956dafaa7)). At city level, Chalfin and McCrary's best estimate is that murder falls 0.67% for each 1% increase in police, ± 0.48 ([Chalfin & McCrary 2018](https://eml.berkeley.edu/~jmccrary/chalfin_mccrary2018.pdf)).

Give officers four utility actions. Respond sends the nearest free officer to a reported crime, found by a ring search over the spatial hash. Pursue steers Reynolds-style toward the suspect's predicted position, gives up after five to ten sim-minutes or when sight is lost, and marks the suspect "wanted". Hot-spot patrol stays 10–15 sim-minutes and then picks the next hotspot by weighted random so the pattern stays unpredictable, while random patrol is a low, constant baseline. Booking an arrest takes the officer off the street for 30–90 sim-minutes, so arrests cost patrol time. Each cell keeps a `policeRecent` value that decays with a half-life of about 30 sim-minutes and feeds into offenders' perceived risk. That way Koper's dwell curve and the spread of benefits can emerge instead of being scripted.

The feature that would make this sim more than a toy is keeping true crime and recorded crime separate. A crime becomes known only if an officer sees it or a witness reports it, and the reporting probability scales with police legitimacy. Two published results make that split worth watching. Ensign et al. modelled predictive policing as a Pólya urn and showed that sending patrols in proportion to discovered incidents locks resources onto places that had an early lead, which they call "runaway feedback" ([PMLR](https://proceedings.mlr.press/v81/ensign18a.html)). Short et al. showed that police suppression wipes out some hotspots (subcritical ones) for good but only moves others (supercritical ones) elsewhere ([Short et al. 2010](https://pdodds.w3.uvm.edu/files/papers/others/2010/short2010a.pdf)). Add a patrol-strategy toggle (random, hot-spot, reactive, or predictive from recorded crime) to a city that tracks both counts, and viewers can watch over-policing feed on its own records. No explorable found does this.

For staffing, Epstein's defaults of 4% cops against 70% citizens ([NetLogo Rebellion](https://github.com/NetLogo/models/blob/main/Sample%20Models/Social%20Science/Rebellion.nlogox)) work out to about one officer per 17–18 citizens. A city feels right with police at 1–3% of the population, funded from taxes. Limit headcount changes to 10% per month so the crime → budget → police loop does not oscillate. If corruption is added, it should lower local legitimacy, which raises Epstein's grievance term and lowers reporting.

### Eight feedback loops separate emergence from noise

Every dynamic worth watching in this design comes from a loop with memory. The table lists the loops to build on purpose and how to tell each one is working.

| Loop | Mechanism | What you should see | Basis |
| --- | --- | --- | --- |
| Hotspot (+) | Each crime raises a cell's attractiveness, which decays and spreads | Clustered, drifting hotspots; crime concentrated in the top 5% of cells | [Short 2008](https://www.math.ucla.edu/~bertozzi/papers/M3AS-final.pdf) |
| Guardianship (+) | Crime → fear → fewer people outside → fewer guardians | Evening dead zones and "no-go" blocks | [Groff 2007](https://nij.ojp.gov/library/publications/simulation-theory-testing-and-experimentation-example-using-routine-activity) |
| Poverty trap (+) | Theft → lower shop revenue → bankruptcies → unemployment → desperation | Neighbourhoods spiralling into decline | [Raphael & Winter-Ebmer](https://escholarship.org/uc/item/5hb4h56g) |
| Jail and stigma (+) | Arrest → lost job and hiring stigma → re-offending | A persistent core of chronic offenders | [BJS](https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018) |
| Police allocation (− and +) | Police presence deters crime, and also discovers crime that attracts more patrols | Suppression, displacement or runaway over-policing | [Ensign 2018](https://proceedings.mlr.press/v81/ensign18a.html) |
| Legitimacy | Unfair arrests or corruption → lower legitimacy → more grievance, less reporting | Bursts after sudden shocks but not after gradual erosion | [Epstein 2002](https://doi.org/10.1073/pnas.092080199) |
| Sorting | Richer households leave high-fear areas; rents follow demand | Segregation by income | [NetLogo Segregation](https://github.com/NetLogo/models/blob/main/Sample%20Models/Social%20Science/Segregation.nlogox) |
| Contagion | Offending friends raise propensity; tipping thresholds differ between dots | Crime waves that tip whole clusters | [Granovetter 1978](https://gwern.net/doc/sociology/1978-granovetter.pdf) |

Noise has equally recognisable sources. The usual culprits are crime dice rolled every tick with no target, guardian or memory, and decisions re-rolled every tick without momentum. More than about six needs, or many actions with near-identical scores, also add noise, as do global knobs with no local feedback and police who know where true crime is. So do identical agents, since cascades depend on thresholds that differ between dots ([Granovetter 1978](https://gwern.net/doc/sociology/1978-granovetter.pdf)). The social layer that carries fear and contagion is cheap. Each dot keeps a fixed list of K = 4–8 friends in an `Int32Array(N × K)`, with ties forming when dots share a place and favouring similar wealth and role. Rumours add `severity × 0.5^hops × trust` to a listener's fear. Shop choice follows the Huff gravity model, P ∝ A\_j / D\_ij^β with β usually 1.5–2 ([ArcGIS Huff model](https://pro.arcgis.com/en/pro-app/3.5/tool-reference/business-analyst/understanding-huff-model.htm)), and fear scales down a shop's attractiveness so crime reaches merchant revenue. Schelling relocation on a weekly timer completes the city. In NetLogo's implementation, agents that want just 30% similar neighbours end up with about 70% on average ([NetLogo Segregation](https://github.com/NetLogo/models/blob/main/Sample%20Models/Social%20Science/Segregation.nlogox)). Applied to income terciles and fear, the same rule produces gentrification-like sorting.

## A worker-owned typed-array core scales from 1k to 100k dots

The performance budgets come from the research team's own micro-benchmarks. They ran in Node 22 (V8) and Bun 1.3 (JavaScriptCore, Safari's engine) on a 4-vCPU cloud container, not in a browser. Treat them as order-of-magnitude calibration. The scripts lived in the research session's scratchpad and are not published. Costs at 100,000 agents:

| Workload | Cost |
| --- | --- |
| Movement pass over struct-of-arrays columns | **0.48 ms** (V8), 0.36 ms (JSC) |
| Same update in immutable `map`/spread style | **33.2 ms** (V8), 5.5 ms (JSC): 14–60× slower than in-place mutation |
| Round-trip of 100,000 plain objects to a worker | **261 ms** |
| Round-trip of the equivalent transferred typed array | **\~0.1 ms** |
| Uniform grid rebuild | About 1–1.4 ms |
| Neighbour query for every agent | 22–26 ms with a cell-ordered copy; 41–52 ms without |
| 256×256 BFS flow field | About 1.1–1.25 ms |
| One long A\* path | About 0.5 ms |

Two conclusions follow. Below 100k agents, avoiding any allocation per agent per tick matters more than the data layout. Neighbour sensing is the one task that blows a 16.7 ms frame at 100k, so it must be staggered, replaced by per-cell aggregates, or spread across workers.

### Typed columns, a counting-sort grid and three message planes

Store agents in a hand-written, fixed-capacity store of typed columns, with a free list and generation counters. bitECS 0.4.0, a full TypeScript rewrite published in December 2025, accepts plain typed arrays as components and weighs about 5 kB. Its docs recommend typed struct-of-arrays storage "for threading and eliminating memory thrash" ([bitECS Intro](https://github.com/NateTheGreatt/bitECS/blob/main/docs/Intro.md); [release notes](https://github.com/NateTheGreatt/bitECS/blob/main/docs/RELEASE_NOTES_0.4.0.md)). Adopt it if relations or observers become useful, though a society with fixed roles and few component combinations rarely needs an ECS's query machinery. Of the alternatives, koota suits React-heavy apps, miniplex has been quiet since 2023, and ecsy was slowest in an older cross-library benchmark ([noctjs/ecs-benchmark](https://github.com/noctjs/ecs-benchmark)). At 1M agents, struct-of-arrays was 3× faster than mutating objects in place on both engines, and its columns can be transferred, shared and uploaded to the GPU without repacking.

```ts
export class AgentStore {
  x: Float32Array; y: Float32Array; vx: Float32Array; vy: Float32Array;
  role: Uint8Array; activity: Uint8Array; actUntil: Uint32Array;        // FSM state; no thinking before actUntil
  home: Int32Array; job: Int32Array; target: Int32Array;                 // indices into place tables
  hunger: Float32Array; fatigue: Float32Array; fear: Float32Array; finStress: Float32Array;
  propensity: Float32Array; riskBucket: Uint8Array; alive: Uint8Array; gen: Uint16Array;
  constructor(readonly cap: number) {
    const f32 = () => new Float32Array(cap), u8 = () => new Uint8Array(cap), i32 = () => new Int32Array(cap);
    this.x = f32(); this.y = f32(); this.vx = f32(); this.vy = f32();
    this.role = u8(); this.activity = u8(); this.actUntil = new Uint32Array(cap);
    this.home = i32(); this.job = i32(); this.target = i32();
    this.hunger = f32(); this.fatigue = f32(); this.fear = f32(); this.finStress = f32();
    this.propensity = f32(); this.riskBucket = u8(); this.alive = u8(); this.gen = new Uint16Array(cap);
  }
}
// Cash is not a column: it lives in the Ledger's Float64Array (integer cents, exact to 2^53).
// Names, memories and inventories live in side tables touched only by the inspector and economy.
```

Neighbour queries use a uniform grid rebuilt every tick by counting sort. Set the cell size equal to the interaction radius, and copy positions into cell order, which halved query time in the benchmark. A spatial hash is the single most important optimisation at this scale. In a Unity benchmark of 10,000 agents that seek a goal and push apart, it cut frame time from 670.95 ms to 16.68 ms ([frame-budget](https://github.com/jdseo921/frame-budget)). Keep kdbush or flatbush for points of interest that don't move; rebuilding a kdbush index every tick was 20–120× slower than rebuilding the grid ([kdbush](https://github.com/mourner/kdbush)).

```ts
// Uniform grid rebuilt every tick in O(N + C); cell size ≈ interaction radius; zero allocation.
start.fill(0);                                                     // start has length C + 1
for (let i = 0; i < n; i++) { const c = cellIndex(x[i], y[i]); cellOf[i] = c; start[c + 1]++; }
for (let c = 0; c < C; c++) start[c + 1] += start[c];             // prefix sum
cursor.set(start.subarray(0, C));
for (let i = 0; i < n; i++) { const k = cursor[cellOf[i]]++; ids[k] = i; sx[k] = x[i]; sy[k] = y[i]; }
// query: for the 3×3 block of cells, scan k in [start[c], start[c+1]) over the cell-ordered sx/sy copies
```

Movement rarely needs pathfinding per agent. A society has few kinds of destination, so precompute shared distance maps, one per destination class, such as "nearest open shop" or "nearest police station". Dots then step to the downhill neighbour at O(1) cost per step. This is the idea behind the flow-field tiles that moved large crowds in Supreme Commander 2 ([Game AI Pro ch. 23](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf)). A 256² `Uint16Array` field is 128 KB, so about a hundred fields fit in roughly 13 MB. Unique trips, such as home to a specific workplace, use cached A\* with a fixed number of requests per tick. Write the typed-array BFS and A\* yourself in about 80 lines; PathFinding.js was last published in 2016 ([PathFinding.js](https://github.com/qiao/PathFinding.js)).

The simulation worker owns the store, the PRNG streams and the loop, and three message planes leave it. The control plane carries small commands (`setParam`, `pause`, `setSpeed`, `inspect(id)`, `save`) through Comlink, which weighs about 1.1 kB ([Comlink](https://github.com/GoogleChromeLabs/comlink)). The frame plane is raw `postMessage` calls that transfer a pooled `Float32Array` of positions and colours, with three pre-allocated buffers circulating so neither side allocates. The stats plane sends aggregated metrics at 4–10 Hz. SharedArrayBuffer is a tier-3 tool only. It requires cross-origin isolation (`Cross-Origin-Opener-Policy: same-origin` plus `Cross-Origin-Embedder-Policy: require-corp`), Chrome has withheld it from non-isolated pages since Chrome 92 ([Vercel KB](https://vercel.com/kb/guide/fix-shared-array-buffer-not-defined-nextjs-react)), and the main thread cannot block in `Atomics.wait` ([V8 blog](https://v8.dev/features/atomics)). Move to multiple workers only when the in-app HUD shows the simulation worker using more than about 60% of its tick budget at target speed. Tick rates step down with scale. Around 1k agents, run 30–60 ticks per second with every agent deciding every tick. Around 10k, run 20–30 ticks per second and stagger decisions so each agent decides every 2–4 ticks. At 100k, run 10–20 ticks per second with each agent deciding every 5–20 ticks. The loop itself is Glenn Fiedler's fixed-timestep accumulator ([Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)), with one rule added for determinism: wall-clock time decides how many ticks run, never what a tick does.

```ts
// sim.worker.ts — wall clock decides HOW MANY ticks run, never WHAT a tick does (determinism).
const DT = 1 / 20;                                     // 20 ticks per simulated second
let speed = 1, acc = 0, last = performance.now(), paused = false, fastForward = false;
const yieldNow = new MessageChannel(); yieldNow.port1.onmessage = loop;  // sidesteps the 4 ms setTimeout clamp
function loop() {
  const now = performance.now();
  if (!paused) acc += Math.min((now - last) / 1000, 0.25) * speed;     // clamp avoids the spiral of death
  last = now;
  const sliceEnd = now + 10;                           // <=10 ms per slice keeps control messages responsive
  while (acc >= DT && performance.now() < sliceEnd) { step(); acc -= DT; }
  if (acc > 5 * DT) { acc = 5 * DT; stats.fallingBehind++; }
  publishSnapshotIfBufferFree();                       // transfers a pooled Float32Array (x, y, rgba per dot)
  if (fastForward) yieldNow.port2.postMessage(0); else setTimeout(loop, 4);
}
// step(): movement every tick; decisions when (id + tick) % K === 0 or on interrupt; economy clears
// hourly; Gini every N ticks; pathfinding queue drained at a fixed quota per tick.
```

### Instanced WebGL2 beats WebGPU as the default renderer

Pick the renderer by tier, but write tier-2 code from day one. Canvas 2D batched by colour handles about a thousand dots. PixiJS v8's ParticleContainer held **365,007 moving sprites at 60 fps on WebGL and 401,508 on WebGPU** on an i7-3770 with an RTX 2070 Super, against only 46,866 for ordinary Pixi sprites ([webgl-engine-bench](https://github.com/KilledByAPixel/webgl-engine-bench/blob/main/RESULTS.md)). That benchmark's README discloses it was started by the author of the competing LittleJS engine. Beyond that scale, raw WebGL2 instanced quads fed straight from the transferred snapshot cost almost nothing per dot in JavaScript.

Don't make WebGPU a dependency. It ships in desktop Chrome, Safari 26, and Firefox on Windows (141+) and Apple Silicon Macs (145+), but not in Firefox on Linux or Android or in Chrome on many Linux GPU configurations ([gpuweb Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)). PixiJS switched its default back to WebGL in v8.1.0, citing inconsistent WebGPU behaviour ([PixiJS v8.1.0](https://github.com/pixijs/pixijs/releases/tag/v8.1.0)). A cross-engine benchmark also found that "WebGPU isn't automatically faster": without instancing, three.js's classic renderer took 7 ms where its WebGPU renderer took 29 ms ([mvaligursky benchmarks](https://github.com/mvaligursky/webgpu-webgl-benchmarks)). WebGPU compute becomes interesting only at tier 3, for movement and separation, behind feature detection and with a CPU fallback. Mixed economic logic and the inspector's frequent reads back from the GPU suit the CPU better. The core of the renderer is one instanced draw that interpolates between ticks on the GPU:

```glsl
#version 300 es
layout(location=0) in vec2 aCorner;   // quad corner (-1..1), TRIANGLE_STRIP of 4
layout(location=1) in vec2 aPrev;     // per instance (divisor 1): position at tick t-1
layout(location=2) in vec2 aCurr;     // per instance: position at tick t
layout(location=3) in vec4 aColor;    // per instance, UNSIGNED_BYTE normalised: hue = role, ring/alpha = state
uniform vec2 uScale, uOffset, uPxToClip; uniform float uAlpha, uRadiusPx;
out vec2 vCorner; out vec4 vColor;
void main() {
  vec2 world = mix(aPrev, aCurr, uAlpha);              // 20 Hz ticks interpolated to display rate on the GPU
  gl_Position = vec4(world * uScale + uOffset + aCorner * uRadiusPx * uPxToClip, 0.0, 1.0);
  vCorner = aCorner; vColor = aColor;
}
// fragment: if (dot(vCorner, vCorner) > 1.0) discard; outColor = vColor;
// draw: gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, agentCount)
```

Picking needs no GPU. On click, invert the camera transform, scan the latest snapshot for the nearest dot (about one movement pass, \~0.5 ms at 100k), and ask the worker for details. GPU picking by ID colour adds a render pass and a synchronous readback for no benefit ([three.js manual](https://threejs.org/manual/en/picking.html)). When zoomed out past one dot per pixel, draw a per-cell density texture coloured by role mix instead. Follow Primer's rule of one channel per trait: role is hue, and short-lived states (carrying goods, wanted, jailed, broke) are an outline or ring.

For charts, uPlot is the clear choice for streaming data. Updating 3,600 points at 60 fps used 10% CPU and 12.3 MB, against 40% and 77 MB for Chart.js and 70% and 85 MB for ECharts ([uPlot](https://github.com/leeoniya/uPlot)). Keep each series in a preallocated `Float64Array` ring buffer and call `setData` at 4–10 Hz. Never let React see per-agent arrays. The canvas runs its own animation-frame loop, and a small zustand store or `useSyncExternalStore` holds per-tick aggregates. lil-gui or Tweakpane covers parameter panels during development ([lil-gui](https://github.com/georgealways/lil-gui)).

### Determinism survives everything except transcendental math

The same seed, build and engine reproduce a run exactly if `step()` draws randomness only from seeded streams, iterates in index order, uses fixed per-tick quotas rather than time budgets, and never reads `Math.random` or `Date.now`. Use sfc32, which passes the PractRand and TestU01 BigCrush test suites and is among the fastest JavaScript generators ([bryc PRNG survey](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)), or pure-rand's generators with `jump()` for independent streams ([pure-rand](https://github.com/dubzzz/pure-rand)). Give each subsystem its own stream, so adding crime does not shift the economy's random draws.

Replaying across browsers is harder. On 100,000 identical inputs, V8 and JavaScriptCore returned bit-different results for 3.4% of `sin` calls, 9.9% of `exp`, 9.7% of `pow`, 16.4% of `atan2` and 42.7% of `hypot`. They returned no differences for `+ − × ÷`, `sqrt` or `Math.fround` (local benchmark script, not published). That has concrete design consequences. Keep money in integer cents, compare squared distances, and choose Huff's β = 2 so distance decay is a multiplication. Ship response curves and arrest-probability tables as precomputed literals instead of building them with `Math.exp` at startup. Lengnick's `(m/P̄)^0.9` needs the same treatment if cross-browser replay matters; otherwise, document the guarantee as "same engine only".

```ts
// tools/gen-curves.ts runs once (any engine) and emits literals; step() never calls Math.exp/pow/atan2/hypot.
export const ARREST_FLOOR = [0, 0.89974, 0.98995, 0.99899];   // 1 − e^(−2.3·n), n = ⌊C/A⌋ clamped to 3
export const LOGISTIC_K10_X06 = new Float32Array([/* 65 generated values */]);
export const DETER = [/* one 65-entry curve per risk-aversion bucket */];
// Distances: compare dx*dx + dy*dy against r*r; Huff with β = 2 is A / d²; money is integer cents.
```

A save is a JSON header (schema version, seed, tick, config, PRNG states) followed by each column's bytes. Compress it with `CompressionStream`, available in Chrome 80+, Firefox 113+ and Safari 16.4+ ([web.dev](https://web.dev/blog/compressionstreams)). Write it to IndexedDB, or to OPFS through synchronous access handles, which workers can use in Chrome 108+, Firefox 111+ and Safari 17+ ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle)). At about twenty 4-byte columns, 100k agents take roughly 8 MB raw. A replay is the seed, the config and a log of commands stamped with tick numbers. A share link is `#v=1&seed=12345&cfg=<base64url(deflate-raw(JSON))>`, keeping the schema version so old links keep working. The inspector keeps a ring buffer of recent events for each agent. Combined with the ledger's reason codes, that buffer reproduces Prison Architect's contraband-tracing trick as a "follow the money" view.

### Static hosting needs headers only for SharedArrayBuffer

Tiers 1 and 2 need no special headers, so any static host works. To keep SharedArrayBuffer available for tier 3, host on Cloudflare Pages or Netlify, which read a `_headers` file ([Cloudflare Pages docs](https://developers.cloudflare.com/pages/configuration/headers/)), or on Vercel, using a `headers` array in `vercel.json`. GitHub Pages cannot set response headers ([GitHub community #13309](https://github.com/orgs/community/discussions/13309)). Its workaround, coi-serviceworker, must be served as a separate file from your own origin and reloads the page on the first visit ([coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker)). The app embeds nothing from other origins, so `require-corp` is safe. It also avoids `credentialless`, the alternative COEP setting, on whose Safari support sources disagree.

```text
# public/_headers — Cloudflare Pages and Netlify; needed only once SharedArrayBuffer is enabled
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

```ts
// vite.config.ts — mirror production isolation in dev and preview; ES-module workers
import { defineConfig } from 'vite';
const coi = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
export default defineConfig({ server: { headers: coi }, preview: { headers: coi }, worker: { format: 'es' } });
// main.ts: const sim = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
// at runtime: if (!self.crossOriginIsolated) fall back to single-worker transfer mode
```

For the toolchain, use Vite 8, stable since 12 March 2026 with Rolldown as its only bundler ([Vite blog](https://vite.dev/blog/announcing-vite8)), and Vitest 5, which needs Node 22.12+ ([Vitest blog](https://vitest.dev/blog/vitest-5.html)). Organise the code as a pnpm workspace whose `sim-core` package compiles with `"lib": ["ES2023"]` and no DOM types, a boundary enforced by a dependency-cruiser or `no-restricted-imports` rule. With that boundary, the same core runs in the browser worker, in Vitest, and in Node or Bun command-line tools for seed sweeps; the benchmark modules ran unchanged on both runtimes. Wrap each system in `performance.mark`/`measure`, show milliseconds per system in an in-app HUD, and run the benchmark suite under both Node (V8) and Bun (JSC) in CI to catch Safari-engine surprises early.

Defer WebAssembly. For branch-heavy logic over typed arrays, JavaScript reaches the same peak speed as WASM; WASM mainly buys predictable speed without JIT warm-up ([surma.dev](https://surma.dev/things/js-to-asc/)). Multithreaded Rust via wasm-bindgen-rayon needs nightly Rust plus the same cross-origin isolation ([wasm-bindgen-rayon](https://github.com/RReverser/wasm-bindgen-rayon)). The neighbour query is the only plausible candidate. Running the JavaScript version across four SharedArrayBuffer workers gives a similar speed-up without a second language.

```text
packages/
  sim-core/      pure TS ("lib": ["ES2023"], no DOM): AgentStore, Ledger, PRNG streams, grid, flow fields,
                 economy, crime, police, metrics, invariants
  sim-protocol/  message types shared by worker and UI: commands, snapshots, stats, events
  sim-worker/    worker entry: loop, snapshot pool, transfer/SAB modes, save/load
  render-gl/     WebGL2 instanced dots, density LOD, camera, picking
apps/web/        Vite app: React UI, uPlot charts, lil-gui, inspector, public/_headers
tools/cli/       Node/Bun headless runs and seed sweeps (worker_threads pool), CSV output
tools/bench/     micro-benchmarks run in CI under V8 (Node) and JSC (Bun)
```

## Seven milestones, each closed by a falsifiable test

The plan builds the pipeline and the testing harness before the hard economics, ships shareable content early through lab mode, and puts off scale until profiling demands it. Every milestone ends in automated checks rather than a demo, because published sub-models often fail to replicate from their own text. Epstein's arrest rule, applied as written, produces no rebellions. Axtell's firm-size exponent of 1.28 came out at 1.70–2.24 in replication ([ndouglas firms spec](https://github.com/ndouglas/SugarScape/blob/main/docs/superpowers/specs/2026-09-30-emergence-of-firms-design.md)). And Sugarscape's chapter VI-2 population crash could not be reproduced in 216 configurations ([ndouglas README](https://github.com/ndouglas/SugarScape)). The effort column gives rough full-time estimates for one developer; they are not sourced, and an AI coding assistant shortens them considerably.

| Milestone | Builds | Exit criteria (automated) | Rough effort |
| --- | --- | --- | --- |
| M0 Pipeline | pnpm monorepo; `AgentStore`; sfc32 streams; ledger with `checkInvariants`; worker loop; buffer transfer back and forth; WebGL2 instanced dots; uPlot; per-system HUD | Identical state hash at tick 1,000 for seed 42 across runs; ledger sums to 0 every tick; 10k randomly walking dots at 60 fps | 1 week |
| M1 Lab mode | Engine for discrete days; thief/trader contest; Primer's ±1 market; animated day phases; linked charts; rules cards | Contest median within 0.05 of p\* over 50 seeds; market price converges on the supply–demand intersection | 1–2 weeks |
| M2 Economy | Lengnick households and firms; posted prices; labour search; Stone–Geary budgets; closed and fiat money regimes; BAM entry and exit; wholesale call auction; headless burn-in | Over 50 seeds × 20k ticks: CPI stays between ¼× and 4× its post-burn-in level; unemployment stays within 1–40%; firms stay above 50% of target; no NaN; exact money conservation. Gini returns ≈0.5 and ≈0.27 on the known-answer tests; SIM gives 38.44 → 47.9 | 2–3 weeks |
| M3 City life | 128²–256² grid; homes, jobs, shops; flow fields; timing wheel; needs plus utility scoring plus state machine; Huff shop choice; inspector with explain panel | Rush hours emerge without scripting; the win counters show no action that never wins or always wins; 10k agents fit the tick budget | 2–3 weeks |
| M4 Crime and police | Offend action; Short field; respond, pursue, hot-spot and random patrol; lingering deterrence; jail, stigma, recidivism; true vs recorded crime; guardrails | Raising police from 1% to 3% cuts theft in at least 90% of 50 seeds; hot-spot patrol beats random; crime concentration and near-repeat clustering appear | 2–3 weeks |
| M5 Society and policy | Friend network; rumours and fear; contagion; Schelling moves; treasury, taxes, welfare, police budget; sliders; role transitions | Every slider moves its metric in the predicted direction; Gini falls steadily as the wealth tax rises; no role goes extinct across seeds | 2 weeks |
| M6 Scale and sharing | Staggered decisions; per-cell aggregates; SharedArrayBuffer workers behind a `crossOriginIsolated` check; density view when zoomed out; saves; share URLs; optional LLM narration | 100k agents with decisions at 10–20 Hz and rendering at 60 fps on a desktop; a share URL replays identically on the same engine | 2–4 weeks |

The test harness is the same at every milestone. Write a one-page ODD description (Overview, Design concepts, Details) for each sub-model, following Grimm et al.'s 2020 update ([Semantic Scholar](https://www.semanticscholar.org/paper/The-ODD-Protocol-for-Describing-Agent-Based-and-A-Grimm-Railsback/d6d8e7eae851ab79b5e4f398c1a3ddd1795e28e8)), and expose every magic number as a named parameter that cites its source. Assert invariants every tick in development and property-test them with fast-check. Money is conserved exactly and cash never goes negative. Goods are conserved too: stock equals the previous stock plus production, minus consumption and spoilage. Each worker has one employer, and prices are finite and positive. Pin golden fingerprints, meaning a hash of all columns after N ticks for a fixed seed, to catch accidental behaviour changes. The ndouglas suite pins one for every preset and judges each published claim over 20 seeds as Holds or Fails ([ndouglas civil-violence spec](https://github.com/ndouglas/SugarScape/blob/main/docs/superpowers/specs/2026-09-25-civil-violence-design.md)). Run headless seed sweeps across a worker pool with one worker per core, less one.

Give every policy slider a predicted direction and test it. Raising income tax should cut consumption after a lag and fund police. A wealth tax should make money circulate faster and lower the Gini. A minimum wage above roughly `p·21·λ/1.025` should leave firms unable to price within their band and push unemployment up. More police should cut theft, with diminishing returns. Then check qualitative patterns rather than exact numbers: crime concentrated in the top 5% of cells, near-repeat clustering, offenders travelling short distances more often than long ones, and a recidivism hazard that falls over time. Look also for Phillips and Beveridge curves, and for bursts after a sudden legitimacy shock but not after gradual erosion, Epstein's "salami tactics" result.

Each major risk already has a mitigation in the plan. Economic instability is the most likely failure, and the zero-sum ledger, Lengnick and BAM's bounded rules, burn-in and an EVE-style monthly panel of money created and destroyed handle it structurally. Role herding is handled by softmax role choice, a bonus for under-supplied goods and rate limits. So is the "abandoned job" trap, in which a role nobody holds reports zero profit and is never chosen again ([Game Developer](https://www.gamedeveloper.com/design/bazaarbot-an-open-source-economics-engine)). Caps, cooldowns and protected roles contain crime cascades. Illegibility is the risk most likely to sink the project as an explorable. Lab mode, rules cards, the explain panel, follow-the-money tracing and one visual channel per state address it. Precomputed lookup tables plus a documented "same engine" guarantee handle cross-browser replay drift, and reimplementing from published rules settles licensing.

## Conclusion

The research moves the hard part of this project away from engineering. Rendering and moving 100,000 dots is solved, and Common Ground shows that a competent browser society can now be generated in days. What remains scarce is emergence a viewer can trust, in a field where the source models often fail to reproduce from their own papers. That makes testing discipline the advantage. The same DOM-free core that animates the city can run fifty seeds in parallel workers, so every chart on screen can be backed by a passing test. Clones built in a weekend with AI assistants will rarely meet that standard. Two capable browser projects in this space were both built in autumn 2026, so the window for being first with a polished, trustworthy explorable is open but closing. That argues for shipping lab mode publicly as soon as M1 passes.

The most original thing on offer is a tool for understanding, not a spectacle. No explorable found lets a viewer switch patrol strategies and watch predictive policing chase its own records while the true crime rate moves somewhere else. Yet the models needed to show it are small enough to port in weeks. Built on a stable economy, that gives the dot society a question worth asking. A timely question was the same ingredient that made two hundred bouncing dots the Washington Post's most-read story.
