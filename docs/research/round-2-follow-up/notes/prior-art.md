# Prior art follow-up for a browser-only "society of dots" (citizens, police, thieves, merchants, market economy), status as of 4 October 2026

Conventions used below:
- "(opened)" means I read the page or file itself: a GitHub page, a raw README or source file, GitHub search-API JSON, npm registry JSON or a PDF.
- "(snippet only)" means the fact comes only from a web-search result snippet or summary. The page itself could not be opened.
- "(listing only)" means the fact comes from a one-line entry in a GitHub search listing or a curated index. The repository or paper behind it was not read.
- Some repository metadata comes from GitHub search-API batch queries. Those links are long, so they are labelled "metadata A/B/C/D" and given in full every time.
- Every date is the GitHub `pushed_at` value or the npm publish date, as of 2026-10-04.

## Which projects on itch.io, Reddit, Hacker News, GitHub and Steam combine a live agent/dot view in the browser, crime or police, a market economy, or distinct roles?

### Takeaway
No project I could reach combines all five elements (browser-only + rule-based + live dot view + police/thief/merchant roles + market economy) in one world. The coverage behind that is GitHub in full, itch.io and Hacker News through search snippets only, and Reddit and Steam not at all. Two tiny hobby projects from 2025–2026 each cover part of the combination:
- **pietro-works/SocSim** has a canvas dot view in which tax-funded "Enforcers" chase "Predators" who steal and build hideouts. It has no money market, and crime is a fixed agent type rather than a choice any agent can make.
- **AtakanAytar/economySim** is an architectural near-twin of the plan: TypeScript structure-of-arrays typed arrays, an integer-cent ledger conserved to the cent, seeded bit-identical determinism and a Canvas city map. Its crime layer is explicitly deferred.

Both have 0 stars, so hobby projects in this exact niche are appearing undetected, as the first pass suspected.

### Cited Findings

#### Closest matches (GitHub, README opened)
- **pietro-works/SocSim**
  - **Roles:** "a few hundred square creatures" in five fixed types. These are Cooperators, Competitors, Defectors, Predators ("Takes mass straight off other bodies. Builds hideouts.") and Enforcers ("Paid out of taxes to chase predators and raid hideouts"). There are also co-op nodes ("club goods with a bouncer") and predator hideouts ("organized crime run as a real-estate play") — [README](https://github.com/pietro-works/SocSim) (opened)
  - **Claims:** predation alone produces "Pareto's eighty-twenty split", and enforcement is framed as Becker-style deterrence ("crime is a math problem") — [README](https://github.com/pietro-works/SocSim) (opened)
  - **UI:** an intel feed (faction counts, mass bars, stability, predator network, reciprocity), "sixteen sliders", speed from 1× to 1000×, "Pure vanilla JavaScript and Canvas. No build step" — [README](https://github.com/pietro-works/SocSim) (opened)
  - **Status:** "Stable. The simulation is frozen from v0.3"; v0.4 is presentation only. It runs by opening `index.htm` locally and no live demo URL is given — [GitHub page](https://github.com/pietro-works/SocSim) (opened)
  - **What it lacks:** money, prices, firms and merchants (food "mass" is the only good). Crime is a type, not an action open to every agent. The README as read says nothing about seeding or determinism — [README](https://github.com/pietro-works/SocSim) (opened)
  - **Popularity and licence:** MIT, 0 stars, created 2025-11-01, last push 2026-06-28 — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **AtakanAytar/economySim**
  - **Core:** "~25k individually-simulated people and firms" as "typed-array agents (Structure-of-Arrays)", "targeting ~25k agents at a few thousand ticks/sec headless" — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **Ledger:** "Money is conserved to the exact cent", with "every transfer is a matched integer-cent debit/credit". All randomness goes through one seeded RNG, and "Same seed + commands ⇒ identical run". It has 77 tests covering conservation, determinism and bit-identical resume — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **Economy:** goods markets in 4 sectors; a labour market with skills and wage dispersion; firms with bankruptcy and startups; housing with mortgages and foreclosure; banks; a central bank following a Taylor rule; and income, wealth and property taxes — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **UI:** a Canvas2D city map, live dashboards, an inspector, heatmap overlays, an event feed and 1–32× speed — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **Crime is deferred, and the reason is explicit:** "A later phase layers money-laundering flows and a regulator trying to detect them on top of the finished economy … Deliberately deferred: it's only interesting against a rich 'normal', and it's thin and additive on flows the ledger already double-entries" — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **What it lacks:** crime and police. The engine "runs on the main thread for now (a Web Worker + WebGL is the documented scale-up path)". There is no live demo — [README](https://github.com/AtakanAytar/economySim) (opened)
  - **Popularity and licence:** MIT, 0 stars, created and pushed 2026-08-27, which suggests a one-day import — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **NeoLorenzo/Econ-Engine**
  - **Model:** a "deterministic browser-based agent economic simulation built to make outcomes inspectable". It has 100 households, eight competitive firms of 10 workers each and a monopoly Transport firm — [README](https://github.com/NeoLorenzo/Econ-Engine) (opened)
  - **Money and policy:** "Money uses integer cents and remains exactly household count × $50". "Tax rates use integer basis points; liabilities use floor-to-cent rounding." Transfers use "deterministic means-tested water filling", and the government "cannot borrow or create money" — [README](https://github.com/NeoLorenzo/Econ-Engine) (opened)
  - **Architecture:** a pure TS core in `src/sim`; React is used for "controls and presentation only"; a static Vite bundle is deployed to GitHub Pages — [README](https://github.com/NeoLorenzo/Econ-Engine) (opened)
  - **What it lacks:** crime, police and a dot view (the observer has five tabs) — [GitHub page](https://github.com/NeoLorenzo/Econ-Engine) (opened)
  - **Popularity and licence:** AGPL-3.0, 1 star, created 2026-08-11, last push 2026-09-30 — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **dotshome/dots (dotshome.world)**
  - **Setting:** four "dots" on an island in "One shared world, running live around the clock"; one island day is one real hour. Their needs are energy, food, health and mood — [README](https://github.com/dotshome/dots) (opened)
  - **Buildings and politics:** buildings include a market stall, courthouse and watch post. Through votes they "pass laws" that can "recognise private property, create a currency, sell land, set up a court, appoint a warden … or introduce a tax" — [README](https://github.com/dotshome/dots) (opened)
  - **Economy and roles:** "with a currency come prices, a ledger, businesses and a treasury". Roles such as Builder, Farmer, Trader and Judge "are never assigned; they are earned from what each dot keeps doing" — [README](https://github.com/dotshome/dots) (opened)
  - **Decision layer:** `minds.decide()` is "the single point where a dot chooses". It is "built to have a language model plugged in", but "Today a local policy makes the choice". Every decision is recorded "with the reasoning, the options that were weighed" — [README](https://github.com/dotshome/dots) (opened)
  - **What it lacks:** scale (4 agents), and it is server-run rather than browser-only (visitors "can only watch")
  - **Popularity and licence:** JS, MIT, 1 star, created 2026-09-09, last push 2026-10-02 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **zeikar/cimulity**
  - **Model:** a SimCity-style browser city builder in which "An aggregate labor market matches workers to jobs over the road graph; the resulting commute flows load each road tile". Police, fire, hospital and school coverage use "road-network + distance falloff". Crime is not simulated — [README](https://github.com/zeikar/cimulity) (opened)
  - **Stack:** "PixiJS 8.15.0 (auto-detected renderer: WebGL, falling back to WebGPU)", Next.js and strict TypeScript — [README](https://github.com/zeikar/cimulity) (opened)
  - **Architecture:** "input emits tile coords + active tool; engine (`CommandDispatcher`) calls pure tool helpers to build commands, then writes to core; render reads core". The repo has 555 commits — [GitHub page](https://github.com/zeikar/cimulity) (opened)
  - **Popularity and licence:** MIT, 4 stars, created 2026-01-07, last push 2026-09-22, live at zeikar.dev/cimulity (not opened) — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **fellipegoncalvesleite/society-engine**
  - **Model:** a deterministic TS core ("the same seed produces the same history") with React, Vite and Zustand. "The world is drawn on canvas, and a worker keeps the simulation moving." It simulates mobile human bands with ecology, memory and demography — [README](https://github.com/fellipegoncalvesleite/society-engine) (opened)
  - **Tooling:** a "Benchmark CLI" with scenarios, and a Chronicle event-history viewer — [README](https://github.com/fellipegoncalvesleite/society-engine) (opened)
  - **What it lacks:** crime, institutions and norms are "roadmap goals, **not claims about the current build**" — [README](https://github.com/fellipegoncalvesleite/society-engine) (opened)
  - **Popularity and licence:** MIT, 0 stars, created 2026-07-04, last push 2026-10-03 — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **aygaydukov/grim-village**
  - **Model:** "Peasants eat, sleep, gather, build, breed, pay tithe, starve, and die". It runs as a TS, Vite and Canvas2D app on a "Headless daemon for 24/7 world ticks". "Browser watches the server world", so it is not browser-only. The code is evolved by "daily Cursor cloud agents" — [README](https://github.com/aygaydukov/grim-village) (opened)
  - **What it lacks:** crime and guards
  - **Popularity and licence:** no licence detected, 0 stars, created 2026-07-24, last push 2026-09-14 — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **Chessiee/ModelingCivilViolence**
  - **Model:** a NetLogo extension of Epstein's civil-violence model with "Ordinary cops" and "Violent cops" who "can arbitrarily arrest quiet civilians". Legitimacy is dynamic: "L(t+1) = L(t) + α × (N_fair − β × N_arbitrary)" with α = 0.005 and β = 2. A trauma term rises from arrests the agent witnessed — [README](https://github.com/Chessiee/ModelingCivilViolence) (opened)
  - **Authors:** University of Groningen, 2025 — [README](https://github.com/Chessiee/ModelingCivilViolence) (opened)
  - **Popularity and licence:** HTML, no licence detected, 0 stars, last push 2025-11-07 — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened)
- **casaisdev/primordial** (a-life, not a society, but strong engineering lessons)
  - **Off-main-thread rendering:** "The simulation and the renderer live entirely in a **Web Worker** painting a transferred **`OffscreenCanvas`**". The per-frame arrays "never cross the worker boundary" — [README](https://github.com/casaisdev/primordial) (opened)
  - **Determinism:** one seeded `mulberry32` stream, and "ID counters live on the `World` instance, not module globals". A reproducibility test suite "runs two seeded worlds in lockstep and asserts the snapshots match" — [README](https://github.com/casaisdev/primordial) (opened)
  - **Hot-path fixes:** a uniform-grid spatial hash with integer cell keys ("string keys were allocating ~40k short-lived strings per tick"), ring-buffer history and level-of-detail backoff — [README](https://github.com/casaisdev/primordial) (opened)
  - **Popularity and licence:** MIT, 1 star, last push 2026-06-18, live at primordial.martincasais.com (not opened) — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)

#### Economy-only and design-tool projects (GitHub)
- **zntznt/simulations**
  - **What it is:** a browser "economy & game-systems designer", similar to Machinations. Its nodes are pools, sources, drains, gates, converters, registers, delays, queues and traders — [README](https://github.com/zntznt/simulations) (opened)
  - **Allocation and analysis:** contended pools split output "max‑min fairly and work‑conservingly, so allocation is order‑independent and never creates or destroys resources". It runs Monte Carlo batches, shares diagrams by URL, and is vanilla JS + SVG with no build step — [README](https://github.com/zntznt/simulations) (opened)
  - **Popularity and licence:** AGPL-3.0, 2 stars, last push 2026-08-31 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **omikun/EconSim**
  - **Model:** a Unity3D agent economy "based on 'Emergent Economies for Role Playing Games' … bazzarBot". It has an AuctionHouse ("sellers enter their asking price and bidders buy from lowest price up"). "Agents that go bankrupt respawn in a more lucrative profession", and a government taxes profits to fund respawns — [README](https://github.com/omikun/EconSim) (opened)
  - **Popularity and licence:** MIT, 112 stars, last push 2025-04-17 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
  - **Related:** a "much simpler MVP", omikun/SimpleEconSim (Python), was pushed 2026-09-30 — [user listing](https://api.github.com/search/repositories?q=user:omikun&sort=stars&order=desc&per_page=20) (opened)
  - **Browser build:** an HTML5 version is on itch.io, see the itch.io section below (snippet only)
- **serapath/economy**
  - **What it is:** a JS balance-sheet DSL. It turns stories ("taking a loan", "sells table") into double-entry records of four types: extension, shortening, asset exchange and liability/equity exchange — [README](https://github.com/serapath/economy) (opened)
  - **Popularity and licence:** MIT, 5 stars, last push 2017-02-10 — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened)
- **Neoplayer/space ("Gatebound")**
  - **Model:** a Rust + Bevy desktop prototype with 25 star systems and 7 commodities. Its "Pressure signals" are price index, stock coverage, net flow, congestion, fuel stress and anomaly score — [README](https://github.com/Neoplayer/space) (opened)
  - **Show HN post:** "markets price everything off supply with shortage-urgency multipliers, factions tax and subsidize, populations migrate when they're unhappy, and stations that go broke get abandoned" — [Show HN](https://news.ycombinator.com/item?id=48996187) (snippet only)
  - **Popularity and licence:** no licence detected, 1 star, last push 2026-03-09 — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened)
- **Small or early projects** — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened); READMEs (opened):
  - **lmartinez51/MyVirtualCommunity:** a TS "World Core" with zero dependencies and deterministic NPC routines. It is at milestone 5 (restaurants open 09:00–17:00 UTC). No licence detected, last push 2026-10-01 — [README](https://github.com/lmartinez51/MyVirtualCommunity)
  - **cap-jmk-real/civic-simulation:** a Next.js + TS + Rust/WASM agent-based lab for IP and data-sharing regimes. MIT, last push 2026-05-06 — [README](https://github.com/cap-jmk-real/civic-simulation)
  - **Areso/1255-burgomaster:** a vanilla-JS canvas town-management game, not an agent-based model. GPL-3.0, 142 stars, last push 2024-04-09 — [README](https://github.com/Areso/1255-burgomaster)
  - **jorow/econSim:** "Graphical simulation of emergent city/primitive economy". The README is empty and the last push was 2017-07-07 — [README](https://github.com/jorow/econSim)
  - **protos/sugarscape:** JS, Apache-2.0, 3 stars, last push 2026-05-01. Its README is two lines — [README](https://github.com/protos/sugarscape)

#### Crime and police agent-based models (not browser dot sims) — GitHub
- **Search results:**
  - A star-sorted search for "crime police simulation" returns only 7 repositories, all with 0–2 stars. They include SumiraMakaju/Crime_Simulation_AI (Python, 2 stars, 2026-06-04), MuhammadMustafa23/CityMind-AI-Simulation ("police deployment", Python, 1 star) and pietro-works/SocSim — [GitHub search](https://api.github.com/search/repositories?q=crime+police+simulation&sort=stars&order=desc&per_page=40) (opened)
  - "crime agent-based" returns 17 repositories — [GitHub search](https://api.github.com/search/repositories?q=crime+agent-based&sort=stars&order=desc&per_page=20) (opened). They include:
    - LABSS/PyPROTON-OC (organised-crime recruitment, Python, MIT, 6 stars, 2022-08-10)
    - ManuelMunozBer/CrimeSIM ("urban crime dynamics on real city maps", Python, MIT, 2026-07-09)
    - baolihao/UrbanCrime-Sim ("Finite element framework for simulating residential burglary based on PDE models", Python, BSD-3-Clause, 2026-08-03)
    - AtakanAytar/economySim
- **Epstein civil-violence ports:** there are 12 repositories, none in JS/TS except an HTML NetLogo export (Chessiee). They include lrufiner/Civil_Violence_LLM ("Epstein's civil violence model with LLM … citizens", Mesa + Solara, MIT, 2026-09-27) — [GitHub search](https://api.github.com/search/repositories?q=civil+violence+epstein&sort=stars&order=desc&per_page=20) (opened)
- **Sugarscape ports (232 results):** the top ones are Python. They include nkremerh/sugarscape (Unlicense, 22 stars, last push 2026-10-03), yukincom/llm-SugarScape ("using LLMs for agent autonomy", MIT, 7 stars) and flexwang-zz/Sugarscape (JS, 6 stars, 2015) — [GitHub search](https://api.github.com/search/repositories?q=sugarscape&sort=stars&order=desc&per_page=15) (opened)

#### LLM-driven "society" repositories (mostly 2026, mostly 0–13 stars)
These are all listing only:
- **TypeScript "society simulation" search** — [GitHub search](https://api.github.com/search/repositories?q=society+simulation+language:TypeScript&sort=stars&order=desc&per_page=40):
  - noopolis/simfile (deterministic world for AI agents, MIT, 7 stars)
  - utamir/aicivilization (6 stars)
  - rayhankhilji/epoch-engine (3 stars)
  - HuanfuLi/IdealWorld (AGPL-3.0)
  - nenadmarinkovic/nomos ("agents follow rules and AI theorists observe", MIT)
- **TypeScript "economy simulation" search** — [GitHub search](https://api.github.com/search/repositories?q=economy+simulation+language:TypeScript&sort=stars&order=desc&per_page=40):
  - brunnfeld (covered by the first pass, 136 stars)
  - "Island-Economy-Sim" ("100 animated residents")
  - "skyshift" ("Self-running 2D space economy with trading nations", MIT)
  - "econ-sim" ("Gatherer/bartering economy simulation")
  - "simtown" (AI-driven residents with jobs)
  - The owner names of these four were not captured in the listing
- **sleuthy-sloth/autopolis:** LLM agents build a city in the browser. TS, MIT, 13 stars, last push 2026-09-30 — [GitHub search](https://api.github.com/search/repositories?q=topic:city-simulation&sort=stars&order=desc&per_page=40)
- **SignalLayerLabs/CYMONIA:** JS, MIT, 7 stars — [GitHub search](https://api.github.com/search/repositories?q=topic:agent-based-modeling+language:JavaScript&sort=stars&order=desc&per_page=15)

#### itch.io (blocked; search snippets only)
- **EconSim by omikun:** an "agent-based market economy simulator in HTML5" with "agents with jobs, trading mechanics, consumption patterns, and a banking system with interest and lending" — [itch.io](https://omikun.itch.io/econsim) (snippet only)
- **Legends of Justice: 1897, devlog "On Deep Simulation of Criminal NPCs":** "simulates individual NPCs such that their combined behavior produces crimes and mysteries", motivated by "NPC personality, situation, goals, and past events" — [itch devlog](https://legendsofjustice.itch.io/legends-of-justice-1897/devlog/1386025/on-deep-simulation-of-criminal-npcs) (snippet only)
- **ChigooX RPG Maker plugins:** an "ED5 Crime & Stealth Plugin", an "Emergent World Simulation Director" and NPC Schedules — [itch.io](https://chigoox.itch.io/) (snippet only)
- **Advanced NPC Routines Plugin by Geck-Wiz:** RPG Maker MZ schedules using A* pathfinding with route caching — [itch.io](https://geck-wiz.itch.io/advanced-npc-routines-plugin) (snippet only)
- **Agent Sim by AphoticApps:** "emergent behavior of complex group dynamics from moderately simple rules", with code provided — [itch.io](https://aphoticapps.itch.io/agent-sim) (snippet only)
- **Command Economy by Ben Eskildsen:** you set labourers, wages and prices, and deficits raise unrest — [itch.io](https://beneskildsen.itch.io/command-economy) (snippet only)
- **UCSC Wildfire devlog "Balancing and Tuning Social Simulation"** — [itch devlog](https://ucsc-wildfire-games.itch.io/wildfire-minigames-collection/devlog/1003502/balancing-and-tuning-social-simulation) (snippet only; title only)
- **Tag pages that were relevant but not opened:** [simulation + thief](https://itch.io/games/free/genre-simulation/tag-thief), [simulation + crime](https://itch.io/games/genre-simulation/tag-crime), [HTML5 + economy](https://itch.io/games/html5/tag-economy) (snippet only). The search tool's summary reported that none of the matching itch.io results combined citizens, thieves, guards, merchants and an economy in one browser game (snippet only)

#### Hacker News (Algolia API and item pages blocked; search snippets only)
- [Show HN: Multi-Agent Market Simulator for Studying Emergent Trading Dynamics](https://news.ycombinator.com/item?id=45026449): "simple trading agents interacting with an order book can create emergent patterns—volatility, clustering, even chaos" (snippet only)
- [Show HN: AgentMaps](https://news.ycombinator.com/item?id=17913029) (snippet only)
- [Ask HN: Economy Simulator](https://news.ycombinator.com/item?id=31971236) (snippet only)
- [Building an economy simulator from scratch](https://news.ycombinator.com/item?id=37527773) (snippet only)
- [Show HN: A central bank simulator game](https://news.ycombinator.com/item?id=31785199) (snippet only)
- [Show HN: MoneyGame](https://news.ycombinator.com/item?id=15670355) (snippet only)
- [Show HN: MicroState](https://news.ycombinator.com/item?id=46700051), a vanilla-JS Canvas city builder (snippet only)
- [Show HN: SimTower, Decompiled, Rewritten, and in the Browser](https://news.ycombinator.com/item?id=49676394) (snippet only)
- [Show HN: interactive heatmap of SF crime](https://news.ycombinator.com/item?id=41182101) (snippet only)
- [Show HN: State Sandbox](https://news.ycombinator.com/item?id=42866904), an AI-driven political simulation (snippet only)
- None of these snippets describes a project with police, thieves or merchants as agents (snippet only)

### Inferences
- **The first-pass conclusion still holds, with a narrower margin:**
  - SocSim covers the police/thief roles and the canvas dot view, but has no market.
  - economySim covers the market, the conserved ledger and the SoA design, but has no crime.
  - ndouglas/SugarScape now has cops (Civil Violence), theft and watching (Minds 6 and 8) and markets (ZI traders, firms), but in separate models, not one society.
  - A project that merged these would be the competitor to watch for.
- **New 2026 hobby simulations are hard to find:** they are often AI-assisted (grim-village is evolved daily by Cursor agents; ndouglas/SugarScape logged about 1,093 commits in 12 days) and have 0–13 stars. Star-sorted search therefore under-surfaces them. Searching by topic and language plus recency is more effective than searching by stars.
- **Concrete things worth borrowing:**
  - Econ-Engine's integer basis points and floor-to-cent rounding.
  - economySim's sequencing argument: crime is "thin and additive on flows the ledger already double-entries", and a detecting regulator is a ready "true vs recorded" frame.
  - SocSim's tax-funded enforcers, which make the police budget a visible trade-off.
  - Chessiee's legitimacy feedback from fair versus arbitrary arrests, a candidate cost of over-policing hot spots.
  - Primordial's Worker + OffscreenCanvas setup and its lockstep reproducibility test.

### Gaps
- **Reddit was entirely unreachable:** bash CONNECT got 403 for old.reddit.com and www.reddit.com; WebFetch was "unable to fetch from old.reddit.com"; and WebSearch refused reddit.com ("not accessible to our user agent"). No subreddit could be checked (r/simulations, r/proceduralgeneration, r/gamedev, r/javascript, r/webdev, r/cellular_automata, r/incremental_games).
- **Steam was unreachable:** store.steampowered.com returned CONNECT 403, and the WebSearch budget ran out before Steam searches could be made.
- **itch.io and Hacker News were snippet-only:** itch.io pages and tag pages could not be opened, so no project there was verified beyond its snippet. Hacker News comment threads (e.g. "Ask HN: Economy Simulator") could not be read.
- **Live demos were not opened:** github.io demos (ndouglas, Common Ground, Econ-Engine, grim-village metrics) are blocked by the egress policy, and other demo domains were not tried. Features are therefore as described in READMEs, not verified in the running apps.
- **GitHub CLI search was unusable:** `gh search repos` returned "This GitHub API path is not available: sessions are bound to their configured repositories", and `gh api` reported "No linked GitHub account". Star-sorted searches were done instead through unauthenticated GitHub search-API calls via WebFetch. Those calls return at most about 15–18 visible items per query because responses are truncated, so lower-ranked results were not seen.

#### Access log
- **Bash egress:** only registry.npmjs.org, gitlab.com and raw.githubusercontent.com were reachable. CONNECT returned 403 for about 70 hosts, including:
  - hn.algolia.com, old.reddit.com, www.reddit.com, itch.io
  - store.steampowered.com, steamcommunity.com
  - export.arxiv.org, api.npmjs.org, api.semanticscholar.org
  - ncase.me, complexity-explorables.org, meltingasphalt.com, www.redblobgames.com, ciechanow.ski
  - cityboundsim.com, hash.ai, insightmaker.com, flocc.network
  - forum.egosoft.com, ostriv.com, ludeon.com, tgstation13.org, manorlords.com
  - www.indiedb.com, web.archive.org, www.youtube.com, medium.com
- **WebFetch:** api.github.com search endpoints and github.com pages worked. `/repos/*/commits` returned HTTP 403. These hosts were blocked: hn.algolia.com, news.ycombinator.com, itch.io, arxiv.org, huggingface.co, en.wikipedia.org, colepowered.com, www.gamedeveloper.com, www.gdcvault.com, www.moddb.com and ndouglas.github.io.
- **WebSearch:** the session's shared budget ("200 of 200 WebSearch calls") was exhausted partway through this task, after 10 searches by this researcher.

## Which commercial games simulate individual citizens' routines, crime or policing in ways this project can learn from?

### Takeaway
Developer sites, the GDC Vault, Game Developer and Steam were all blocked, so the verifiable lessons come from open-source game code. Three are directly usable:
- **Micropolis (open-sourced SimCity):** a cheap crime field that police coverage pushes down, scaled by police funding, with feedback through land value.
- **Space Station 13:** a separate "wanted status" record layer driven by evidence and officers, which is a ready state machine for "recorded" crime.
- **Citybound:** needs weighted by time of day become "problems". Households search a market registry of offers and filter deals by opening hours shifted by travel time.

Shadows of Doubt and Watch Dogs: Legion are covered at snippet level only:
- Shadows of Doubt precomputes each citizen's daily plan, and witnesses arise from a global visibility check.
- Watch Dogs: Legion's "Census" is a relational database of generated people, relationships and schedules.

### Cited Findings
- **Micropolis (open-sourced SimCity, GPL v3), crime model, opened from source**
  - **Formula:** `crimeScan()` computes, per block, `z = 128 − landValue + populationDensity`, caps it at 300, subtracts `policeStationMap`, and clamps the result to 0–250 — [scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (opened)
  - **Police coverage:** the police map is diffused with `smoothStationMap` three times before use — [scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (opened)
  - **Hot spot:** the maximum cell is tracked as the "crime hot-spot", with random tie-breaking — [scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (opened)
  - **Feedback:** land value drops by 20 wherever crime exceeds 190 (`if (crimeRateMap.get(x, y) > 190) dis -= 20`), which feeds back into crime — [scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (opened)
  - **Funding:** police effect scales with funding (`policeEffect * policeSpend / policeFund`) — [simulate.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/simulate.cpp) (opened)
  - **Smoothing and scheduling:** the crime history is smoothed with `crimeRamp += (crimeAverage − crimeRamp) / 4`, and the crime scan runs every N cycles depending on game speed — [simulate.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/simulate.cpp) (opened)
  - **Licence and popularity:** the source header grants the GNU GPL v3 (Copyright 1989–2007 Electronic Arts) — [scan.cpp](https://github.com/SimHacker/micropolis/blob/master/MicropolisCore/src/MicropolisEngine/src/scan.cpp) (opened). The repositories are SimHacker/micropolis (1,114 stars, last push 2026-02-10) and the JS port graememcc/micropolisJS (727 stars, last push 2025-07-13, GitHub licence "Other") — [metadata D](https://api.github.com/search/repositories?q=repo:ncase/crowds+repo:ncase/loopy+repo:ncase/sim+repo:ncase/trust+repo:ncase/polygons+repo:hashintel/hash+repo:citybound/citybound+repo:a-b-street/abstreet+repo:graememcc/micropolisJS+repo:SimHacker/micropolis+repo:Primer-Learning/PrimerTools+repo:redblobgames/redblobgames.github.io&per_page=30) (opened)
- **Space Station 13 (tgstation, AGPL-3.0, 1,937 stars, last push 2026-10-04), security records, opened from source**
  - **Wanted statuses:** `WANTED_NONE`, `WANTED_SUSPECT` ("Suspected"), `WANTED_ARREST`, `WANTED_PRISONER` ("Incarcerated"), `WANTED_PAROLE` and `WANTED_DISCHARGED` — [security.dm](https://github.com/tgstation/tgstation/blob/master/code/__DEFINES/security.dm) (opened)
  - **Detective evidence categories:** "Prints", "Blood", "Fibers", "Reagents" and "ID Access" — [security.dm](https://github.com/tgstation/tgstation/blob/master/code/__DEFINES/security.dm) (opened)
  - **Popularity and licence** — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **Citybound (AGPL-3.0, 8,168 stars, dormant since 2023-01-07), household economy, opened from source**
  - **Resources:** the `Resource` enum is Wakefulness, Satiety, Money, Groceries, Produce, Grain, Flour, BakedGoods, Meat and DairyGoods — [resources.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/resources.rs) (opened)
  - **Needs:** households define `importance(resource, time: TimeOfDay)` and `graveness = -amount * importance`, choose `top_problems` per member, and wait `DECISION_PAUSE: Ticks = Ticks(200)` when there are no problems — [households/mod.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/households/mod.rs) (opened)
  - **Market:** the `Market` keeps `offers_by_resource`. A `TripCostEstimator` shifts each deal's `opening_hours` earlier by the estimated travel time (`distance / ASSUMED_AVG_SPEED`) — [market/mod.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/market/mod.rs) (opened)
  - **Rejections:** deals are rejected as "not open" or "not more useful" — [households/mod.rs](https://github.com/citybound/citybound/blob/master/cb_simulation/src/economy/households/mod.rs) (opened)
  - **Popularity and licence** — [metadata D](https://api.github.com/search/repositories?q=repo:ncase/crowds+repo:ncase/loopy+repo:ncase/sim+repo:ncase/trust+repo:ncase/polygons+repo:hashintel/hash+repo:citybound/citybound+repo:a-b-street/abstreet+repo:graememcc/micropolisJS+repo:SimHacker/micropolis+repo:Primer-Learning/PrimerTools+repo:redblobgames/redblobgames.github.io&per_page=30) (opened)
- **Shadows of Doubt (ColePowered Games devblogs)**
  - **Scale and routines:** "the simulation of hundreds of little citizens, all going about their daily routines"; "The average citizen currently makes about 4-10 different journeys every day" — [DevBlog 8: Simulating a City](https://colepowered.com/shadows-of-doubt-devblog-8-simulating-a-city/) (snippet only); [DevBlog 15: Moving in the Citizens](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/) (snippet only)
  - **Planning:** a "goal-based system" with "a new sims-like stat system". "A brief period of calculation time before the start of each day where activities for the day are chosen and mapped out", with deviations recalculated in real time — [DevBlog 15](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/) (snippet only); [itch mirror](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens) (snippet only)
  - **Witnesses:** "Most 'memories' the citizens form are sightings- these are triggered by a global check that loops through travelling citizens and checks if they can see one another" — [DevBlog 15](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/) (snippet only)
- **Watch Dogs: Legion**
  - **The talk:** the GDC talk is "Census: The Systemic Backbone Behind Play As Anyone in 'Watch Dogs: Legion'" by Christopher Dragert (Ubisoft Toronto). Census "generates characters, simulates their lives, and inserts them into gameplay", with "dynamically-generated schedules … including meetings with friends, relations, and adversaries" — [GDC Vault](https://www.gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind) (snippet only)
  - **Hard parts:** the talk covers "optimizing the runtime performance of the relational database" and "large-scale tagging" — [GDC Vault](https://www.gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind) (snippet only)
  - **Further coverage:** Census is described as a "Relational Database" — [PlayStation LifeStyle](https://www.playstationlifestyle.net/2019/06/28/watch-dogs-legion-npcs/) (snippet only); [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works) (title only, blocked)
- **RimWorld:** no first-party source was reachable. GitHub storyteller mods show the director pattern being swapped out:
  - S4L7/ClaudeStoryteller is an "AI-powered storyteller using Claude API" (C#, MIT, 3 stars, 2026-02-14)
  - Rim-Of-Madness-Team/HP-Lovecraft-Storyteller "rewrites the threat cycle"
  - Source: [GitHub search](https://api.github.com/search/repositories?q=rimworld+storyteller&sort=stars&order=desc&per_page=15) (listing only)

### Inferences
- **A two-level scheduler fits well.** Shadows of Doubt plans each citizen's day at dawn and re-plans on interruption; Citybound turns needs × time of day into ranked problems and backs off for 200 ticks when idle. Combining these is cheap for thousands of SoA agents, and the idle back-off saves CPU.
- **Witness-gated recording follows naturally.** Shadows of Doubt's global sighting pass plus SS13's record states (None → Suspected → Arrest → Incarcerated → Parole → Discharged) map onto the plan's "true vs recorded crime" view. True crime is the event log; recorded crime is what entered a record through a witness, an officer or evidence.
- **Micropolis gives a field baseline.** Its crime field (land value, density, diffused police coverage, funding multiplier and the crime → land-value feedback) is a few dozen lines. It could serve as a "Compare" baseline against the agent-level Becker crime and the Short et al. field.
- **Off-screen fidelity is unresolved.** Census's "relational database" framing suggests storing relationships and schedules as tables (the plan's SoA plus index arrays). Watch Dogs' actual off-screen fidelity rules are not verified (see Gaps).

### Gaps
- **Not reached:** developer talks, devlogs or postmortems for RimWorld (storyteller), Tropico, Frostpunk (laws), Manor Lords, Going Medieval, Kenshi, X4: Foundations, Patrician, Ostriv and Workers & Resources. Their sites (ludeon.com, forum.egosoft.com, ostriv.com, manorlords.com, gamedeveloper.com, gdcvault.com, Steam) were blocked, and the WebSearch budget ran out before searches could be made. Not even snippet-level lessons could be cited for them.
- **Snippet-only facts:** the Shadows of Doubt and Watch Dogs: Legion facts are snippet-level. Citizen counts beyond "hundreds" and Census's off-screen level of detail and NPC counts are unverified.
- **Not researched:** Majesty (thieves' guild, bounty flags) and The Guild series (thieves, guards, trials) are plausible further prior art.

## Which explorable-explanation collections and tools are relevant, what are their licenses, and what can be borrowed?

### Takeaway
Nicky Case's pieces are the safest to borrow: crowds, LOOPY, the Emoji Simulator, trust and polygons are all marked CC0 on GitHub. However, "crowds" bundles third-party sounds under CC BY and CC BY-NC. Complexity Explorables re-released its explorables in 2025 as individual GitHub repos under CC BY 4.0, while the older repos carry no licence and the helper library d3-widgets is GPL-3.0. Red Blob Games' code repos are mostly Apache-2.0. Licences for Kevin Simler's "Going Critical" and Bartosz Ciechanowski's articles could not be verified. Primer's own tooling has no licence file.

### Cited Findings
- **Nicky Case**
  - **Licences (metadata D):** ncase/crowds is CC0-1.0 (449 stars, last push 2021-09-30); ncase/loopy is CC0-1.0 (1,746 stars, 2024-07-08); ncase/sim ("Relaunch of EMOJI SIMULATOR") is CC0-1.0 (95 stars, 2021-03-23); ncase/trust (6,301) and ncase/polygons (1,358) are also CC0-1.0 — [metadata D](https://api.github.com/search/repositories?q=repo:ncase/crowds+repo:ncase/loopy+repo:ncase/sim+repo:ncase/trust+repo:ncase/polygons+repo:hashintel/hash+repo:citybound/citybound+repo:a-b-street/abstreet+repo:graememcc/micropolisJS+repo:SimHacker/micropolis+repo:Primer-Learning/PrimerTools+repo:redblobgames/redblobgames.github.io&per_page=30) (opened)
  - **crowds:** "is dedicated to the public domain", but credits third-party sounds. These include "Various button sounds … by Owdeo (CC BY-NC)" and "Pencil Scratching … (CC BY)" — [crowds README](https://github.com/ncase/crowds) (opened)
  - **LOOPY:** "Zero Rights Reserved: LOOPY is entirely open source/public domain" — [LOOPY README](https://github.com/ncase/loopy) (opened)
  - **Emoji Simulator:** "Dedicated to the public domain with Creative Commons Zero! I'm giving away all my art/code/words" — [sim README](https://github.com/ncase/sim) (opened)
- **Complexity Explorables (Dirk Brockmann)**
  - **2025 re-releases (CC BY 4.0):** echo_chambers, critical_hexsirsize, prisoners_kaleidoscope, flockn_roll, baristas_secret (percolation), lotka_martini and others, last pushed between December 2025 and January 2026 — [user listing](https://api.github.com/search/repositories?q=user:dirkbrockmann&sort=stars&order=desc&per_page=25) (opened)
  - **Older repos (no licence):** complexity_explorable_orlis_flocknroll (32 stars, 2018) and complexity-explorables-reduced-selection — [user listing](https://api.github.com/search/repositories?q=user:dirkbrockmann&sort=stars&order=desc&per_page=25) (opened)
  - **Helper libraries:** d3-widgets is GPL-3.0 and lattices is MIT — [user listing](https://api.github.com/search/repositories?q=user:dirkbrockmann&sort=stars&order=desc&per_page=25) (opened)
  - **Echo Chambers:** "a dynamic network that explains the emergence of groups of uniform opinion. Nodes can change their opinion based on their open-mindedness and can rewire their connections" — [README](https://github.com/dirkbrockmann/echo_chambers) (opened)
  - **Critical HexSIRSize:** a "stochastic, spatial SIRS model" on a hex lattice — [README](https://github.com/dirkbrockmann/critical_hexsirsize) (opened)
  - **The Prisoner's Kaleidoscope:** the prisoner's dilemma "on a lattice … can yield beautiful patterns and chaos" — [README](https://github.com/dirkbrockmann/prisoners_kaleidoscope) (opened)
- **Red Blob Games (Amit Patel)**
  - **Apache-2.0 repos:** mapgen4 (917 stars), mapgen2, dual-mesh and circular-obstacle-pathfinding; also making-of-line-drawing ("How I make an interactive tutorial using d3.js") and making-of-circle-drawing (Vue) — [user listing](https://api.github.com/search/repositories?q=user:redblobgames&sort=stars&order=desc&per_page=20) (opened)
  - **Repos with no licence detected:** 2014-starter-page ("Code for writing tutorials with interactive diagrams") and making-of-draggable ("How I handle mouse and touch events to drag objects") — [user listing](https://api.github.com/search/repositories?q=user:redblobgames&sort=stars&order=desc&per_page=20) (opened)
- **Kevin Simler, "Going Critical":** a GitHub search for "going critical", meltingasphalt and user:ksimler returned 0 repositories — [GitHub search](https://api.github.com/search/repositories?q=%22going+critical%22+OR+meltingasphalt+OR+user:ksimler&sort=stars&order=desc&per_page=15) (opened)
- **Primer (the YouTube channel), Primer-Learning/PrimerTools**
  - **Repo:** C#, 123 stars, last push 2026-10-02; GitHub detects no licence — [metadata D](https://api.github.com/search/repositories?q=repo:ncase/crowds+repo:ncase/loopy+repo:ncase/sim+repo:ncase/trust+repo:ncase/polygons+repo:hashintel/hash+repo:citybound/citybound+repo:a-b-street/abstreet+repo:graememcc/micropolisJS+repo:SimHacker/micropolis+repo:Primer-Learning/PrimerTools+repo:redblobgames/redblobgames.github.io&per_page=30) (opened)
  - **No licence file:** `LICENSE` returns 404 on both main and master — [raw LICENSE probe](https://raw.githubusercontent.com/Primer-Learning/PrimerTools/main/LICENSE) (opened, 404)
  - **README:** "I've given up on the idea of designing this to be usable by others. The core of the tool is public, but some classes will refer to assets that are private" (the blob models) — [README](https://github.com/Primer-Learning/PrimerTools) (opened)
- **Other explorable-style resources found**
  - **ndouglas/SugarScape:** an MIT browser playground of 25+ classic social-science agent-based models, with Compare mode, seek and share links (details under the last question) — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **zntznt/simulations:** an AGPL resource-flow designer — [README](https://github.com/zntznt/simulations) (opened)
  - **Flocc's examples site** (flocc.net, not opened) — [README](https://github.com/scottpdo/flocc) (opened)
  - **Agentscape's examples:** ants, boids, predators-and-prey and traffic congestion — [README](https://gitlab.com/ben_goodman/agentscape/-/raw/main/README.md) (opened)

### Inferences
- **What to borrow:**
  - For explaining the police → recording → crime-statistics feedback loop, LOOPY's CC0 causal-loop diagrams can be embedded or re-implemented.
  - Echo Chambers' opinion-plus-rewiring and Critical HexSIRSize's spatial contagion are CC BY 4.0 visual templates for "fear or reputation contagion" and hot-spot spread; they need attribution.
  - The Prisoner's Kaleidoscope matches the cooperate/steal choice.
  - Red Blob's Apache-2.0 "making-of" repos are practical references for draggable, interactive diagrams.
- **Two licence traps:** the GPL-3.0 d3-widgets dependency inside the Complexity Explorables, and the CC BY-NC sound assets bundled in crowds.

### Gaps
- **Not opened:** the Complexity Explorables site licence (complexity-explorables.org) and the site-level text licence of Red Blob Games — both sites blocked.
- **Unknown licences:** "Going Critical" (meltingasphalt.com blocked, no repository found) and Bartosz Ciechanowski's articles (ciechanow.ski blocked; not researched further).
- **Content not opened:** the crowds explorable itself, so its specific mechanics (e.g. complex contagion) are not verified here.

## Which JS/TS agent-based-modelling libraries exist that the plan does not mention?

### Takeaway
A handful of maintained JS/TS ABM libraries exist, but all are small (29–963 stars; tens to hundreds of npm downloads a month). None of their READMEs mentions struct-of-arrays, typed arrays or Web Workers, and none publishes agent-count benchmarks.
- **Flocc** (TS, updated 2026) and **agentscape** (GitLab, updated 2026) are the active ones.
- **scottfr/simulation** (Insight Maker's engine) is AGPL.
- **AgentMaps**, **atomic-agents**, **js-simulator** and **organelle** are dormant.

HASH's hEngine survives only as an "alpha", experimental Rust engine under the Elastic License 2.0 in hashintel/labs; its in-browser hCore uses a legacy engine that is no longer maintained.

### Cited Findings
- **Flocc (scottpdo/flocc)**
  - **Package:** npm 0.7.0, published 2026-03-12 (91 versions since 2018-04-25) — [npm registry](https://registry.npmjs.org/flocc) (opened). About 368 downloads a month — [npm search](https://registry.npmjs.org/-/v1/search?text=keywords%3Aabm&size=25) (opened)
  - **Features:** "~150KB minified, no dependencies"; Canvas renderer, heatmaps, charts and tables; continuous space, grids, networks and terrains; sequential, random or priority scheduling; an event system; "Seeded randomness"; a rule DSL — [README](https://github.com/scottpdo/flocc) (opened)
  - **Performance:** the quick-start example uses per-agent `agent.get/set` objects, and there is no agent-count benchmark — [README](https://github.com/scottpdo/flocc) (opened)
  - **Licence (conflicting):** ISC per the README badge and npm, MIT per the GitHub API — [npm registry](https://registry.npmjs.org/flocc) (opened); [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
  - **Popularity:** 29 stars, last push 2026-04-15, 560 commits — [GitHub page](https://github.com/scottpdo/flocc) (opened)
- **scottfr/simulation (the npm package `simulation`, Insight Maker's engine)**
  - **Features:** system dynamics plus agent-based modelling with Agent, Population, State and Transition primitives; it can import models "in the ModelJSON format or the Insight Maker format"; Euler or RK4 solvers; no performance or seeding claims — [README](https://github.com/scottfr/simulation) (opened)
  - **Package and licence:** npm 9.0.0, published 2026-06-27, licence "AGPL" — [npm registry](https://registry.npmjs.org/simulation) (opened)
  - **Popularity:** 159 stars, last push 2026-06-27; GitHub reports the licence as "Other" — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
- **AgentMaps (noncomputable/AgentMaps)**
  - **What it is:** "Social Simulations on Real World Maps", built on Leaflet and Turf, with demos (Simple; Contagion with commuting agents) — [README](https://github.com/noncomputable/AgentMaps) (opened)
  - **Popularity and licence:** BSD-2-Clause, 963 stars, last push 2024-09-17 — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
  - **Package:** the last npm release is 2.2.2 from 2018-11-08 — [npm registry](https://registry.npmjs.org/agentmaps) (opened). About 226 downloads a month — [npm search](https://registry.npmjs.org/-/v1/search?text=agent-based%20modeling&size=25) (opened)
  - **History:** there was a Show HN — [HN](https://news.ycombinator.com/item?id=17913029) (snippet only)
- **atomic-agents (gjmcn)**
  - **What it is:** "Spatial agent-based modeling in JavaScript", written for a UKRI-funded COVID contact-network project (Warwick and Swansea). It "is still under active development" — [README](https://github.com/gjmcn/atomic-agents) (opened)
  - **Activity contradicts that claim:** the last push was 2023-08-21 and the last npm release was 0.1.11 on 2022-08-22. MIT, 41 stars, dependencies d3-ease and d3-random — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened); [npm registry](https://registry.npmjs.org/@gjmcn%2Fatomic-agents) (opened)
- **js-simulator (chen0040)**
  - **What it is:** "Inspired by the MASON Multiagent Simulation library", a discrete-event multi-agent simulator. Its demos are flocking, Game of Life and School Yard — [README](https://github.com/chen0040/js-simulator) (opened)
  - **Popularity and licence:** MIT, 72 stars, last push 2017-06-24, npm 1.0.17 from 2017-06-16 — [npm registry](https://registry.npmjs.org/js-simulator) (opened)
- **agentscape (Ben Goodman, GitLab)**
  - **Package:** npm 1.6.2, published 2026-02-26 (51 versions since 2024-12-01), MIT. Dependencies: chart.js, concaveman, marked, pure-rand, simplex-noise and uuid — [npm registry](https://registry.npmjs.org/agentscape) (opened)
  - **Repository:** 0 stars on GitLab, last activity 2026-04-15 — [GitLab API](https://gitlab.com/api/v4/projects/ben_goodman%2Fagentscape) (opened)
  - **Features:** `npx agentscape my-model` scaffolding, plus examples for ants, boids, predators-and-prey and traffic — [README](https://gitlab.com/ben_goodman/agentscape/-/raw/main/README.md) (opened)
  - **Usage:** about 249 downloads a month — [npm search](https://registry.npmjs.org/-/v1/search?text=keywords%3Aabm&size=25) (opened)
- **organelle (Concord Consortium):** "An agent-based modeling library based on SVG and declarative rules". npm 0.0.15 from 2020-05-05, MIT — [npm registry](https://registry.npmjs.org/organelle) (opened). 4 stars, last push 2023-03-01 — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened)
- **Newer small TS packages**
  - **@fallom/simkit:** "A TypeScript simulation framework with built-in telemetry, deterministic randomness, and state management". Version 0.2.2 from 2025-09-23, MIT, with OpenTelemetry dependencies — [npm registry](https://registry.npmjs.org/@fallom%2Fsimkit) (opened)
  - **simullm:** an "Event-driven Agent-Based Modeling framework for TypeScript" built on the ai-sdk LLM packages. Version 0.3.0 from 2025-08-14, MIT — [npm registry](https://registry.npmjs.org/simullm) (opened)
  - **agentjs-core:** uses p5.js and TensorFlow.js. Version 1.0.1 from 2025-08-06, MIT — [npm registry](https://registry.npmjs.org/agentjs-core) (opened)
  - **walkout-engine:** "A deterministic simulation of the coordination problem behind general strikes". Version 0.1.0 from 2026-07-28, MIT — [npm registry](https://registry.npmjs.org/walkout-engine) (opened)
  - **chances/agents:** a "JavaScript agent-based modeling framework" in TS, BSD-3-Clause, 0 stars, last push 2026-08-05 — [GitHub search](https://api.github.com/search/repositories?q=topic:agent-based-simulation+language:TypeScript&sort=stars&order=desc&per_page=15) (listing only)
- **HASH / hEngine**
  - **Repo description:** hashintel/hash is now described as "The open-source, multi-tenant platform for self-building knowledge graphs and simulation" (1,667 stars, last push 2026-10-04, licence "Other") — [metadata D](https://api.github.com/search/repositories?q=repo:ncase/crowds+repo:ncase/loopy+repo:ncase/sim+repo:ncase/trust+repo:ncase/polygons+repo:hashintel/hash+repo:citybound/citybound+repo:a-b-street/abstreet+repo:graememcc/micropolisJS+repo:SimHacker/micropolis+repo:Primer-Learning/PrimerTools+repo:redblobgames/redblobgames.github.io&per_page=30) (opened)
  - **Where the tools live now:** the simulation tools sit in hashintel/labs, which says "These simulation tools remain experimental" — [labs README](https://github.com/hashintel/labs) (opened)
  - **hEngine status:** "This public version of hEngine is our 'alpha' engine whose architecture and performance characteristics differ significantly to the stable engine powering hCore" — [sim-engine README](https://github.com/hashintel/labs/tree/main/apps/sim-engine) (opened)
  - **hEngine licence:** Elastic License 2.0 ("You may not provide the software to third parties as a hosted or managed service") — [sim-engine LICENSE.md](https://github.com/hashintel/labs/blob/main/apps/sim-engine/LICENSE.md) (opened)
  - **hCore status:** hCore "uses a legacy version of hEngine which is no longer maintained", and "Much of this code dates from 2019-2020" — [sim-core README](https://github.com/hashintel/labs/tree/main/apps/sim-core) (opened)
  - **labs repo:** 37 stars, last push 2026-10-02, licence NOASSERTION — [metadata C](https://api.github.com/search/repositories?q=repo:cap-jmk-real/civic-simulation+repo:Neoplayer/space+repo:Areso/1255-burgomaster+repo:hashintel/labs+repo:AIScientists-Dev/WorldSeed+repo:concord-consortium/organelle+repo:serapath/economy+repo:jorow/econSim+repo:lmartinez51/MyVirtualCommunity+repo:Chessiee/ModelingCivilViolence+repo:LABSS/PyPROTON-OC+repo:baolihao/UrbanCrime-Sim+repo:yuuretsu/evolution-of-artificial-life+repo:pvigier/Simulopolis&per_page=30) (opened)
  - **Performance claim (unverified, snippet only):** a search summary said hEngine runs "millions of agents" and is "actively maintained" — [HASH Engine page](https://simulation.hash.ai/platform/engine) (snippet only). This conflicts with the labs READMEs' "alpha", "experimental" and "no longer maintained" wording.

### Inferences
- **No library replaces the planned core.** All the libraries above are object-per-agent APIs, have no published benchmarks and do not mention Workers or typed arrays. The plan's custom SoA + Worker core remains the right call. Flocc (rule DSL, scheduling modes, seeded RNG, heatmap and chart renderers) and agentscape (scaffolding, examples) are useful design references, not dependencies.
- **Licences constrain borrowing.** Copying code from `simulation` (AGPL) or hEngine (ELv2) into a static site would carry licence obligations. The permissive options are Flocc (ISC or MIT), AgentMaps (BSD-2), atomic-agents, js-simulator, organelle and agentscape (all MIT).

### Gaps
- **Insight Maker's own site** (insightmaker.com) was blocked, so the status of its hosted product is unverified.
- **atomic-agents docs** (gjmcn.github.io) were blocked, so any performance claims there are unverified.
- **npm monthly downloads** come from the registry search API's `downloads.monthly` field (api.npmjs.org was blocked). `simulation` and `js-simulator` did not appear in those search results, so they have no download figure.

## What did 2024–2026 large LLM-agent society projects find, at what compute cost, and is there a browser-capable hybrid?

### Takeaway
The large LLM societies show roles, rule-following, tax amendment and cultural spread, but they are compute-bound:
- **Project Sid** observed agents specialising (including an agent that chose to guard tax chests), obeying a 20% tax law, and amending it under influencers' sway. Its runs with over 1,000 agents "exceeded the computational constraints" of its server.
- **OASIS** measured about 3,356 input tokens per agent-step.

None of the verified projects studies crime or policing. The browser-viable pattern is a deterministic rule-based core with one pluggable decision call site, invoked rarely and asynchronously and replaced by a deterministic local policy when no model is present. dots, Autopolis and CYMONIA all do this. WebLLM (Apache-2.0) is the in-browser inference option.

### Cited Findings
- **Project Sid (Altera, report dated 2024-10-31, arXiv:2411.00114; PDF opened from the repo)**
  - **Scale:** "10 – 1000+ AI agents" in Minecraft using the PIANO architecture — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Specialisation:** run with 30-agent groups for 20 minutes. Without the social-awareness module, "roles did not persist across time and were also homogeneous". Role-specific actions were "largely exclusive to a single role" (e.g. Guard: crafting fences) — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Tax experiment:** 25 constituents, 3 pro- or anti-tax influencers and 1 election-manager agent; tax seasons every 120 s; the constitution changes at 10 minutes — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Tax results:** "agents deposited roughly 20% of their inventory, as stipulated". Influencers drove amendments. "When the tax rate decreased from 20% to 5-10%, agents reduced taxes paid from 20% to 9%". "The only exception is the guard, who decides to guard the chests consistently in multiple experiment runs" — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Compute limits:** the culture and religion results use a single 500-agent run, because runs "with over 1000 agents … exceeded the computational constraints of our Minecraft server environment, causing agents to be sporadically unresponsive". Item-acquisition performance "was only enabled by the latest base LM (GPT-4o)" — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Hallucination cascades:** a small rate of hallucinations "can poison downstream agent behavior when agents continuously interact" — [report PDF](https://github.com/altera-al/project-sid/blob/main/2024-10-31.pdf) (opened)
  - **Repo popularity:** 1,384 stars; the last push was 2024-11-04 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **OASIS (CAMEL-AI, arXiv:2411.11581)**
  - **Scale:** "up to ***one million agents***" on simulated Twitter and Reddit, with "23 actions" — [README](https://github.com/camel-ai/oasis) (opened)
  - **Measured cost:** 100 agents × 1 time step at activation 1 used 335,600 input tokens and 16,750 output tokens (QWEN_TURBO) — [README](https://github.com/camel-ai/oasis) (opened)
  - **Estimated cost per step at activation 0.1:** qwen-plus ¥0.026848, ¥0.26848 and ¥2.6848 for 100, 1,000 and 10,000 agents; qwen-max ¥0.717, ¥7.717 and ¥77.17 (Qwen pricing as of 2024-12-14) — [README](https://github.com/camel-ai/oasis) (opened)
  - **Popularity and licence:** Apache-2.0, 5,223 stars, last push 2026-09-30 — [GitHub topic search](https://api.github.com/search/repositories?q=topic:agent-based-simulation&sort=stars&order=desc&per_page=60) (opened)
- **AgentSociety (Tsinghua FIB Lab)**
  - **v1:** "AgentSociety: Large-Scale Simulation of LLM-Driven Generative Agents Advances Understanding of Human Behaviors and Society" (arXiv:2502.08691) is now labelled "1.x (legacy)" — [v1 package README](https://github.com/tsinghua-fib-lab/AgentSociety/tree/main/packages/agentsociety) (opened)
  - **v2:** AgentSociety 2 (arXiv:2607.11895) is "LLM-native", with "Agents … workspace-bound stateless records driven by Ray Tasks" — [README](https://github.com/tsinghua-fib-lab/AgentSociety) (opened)
  - **Popularity and licence:** Apache-2.0 except a `commercial` folder, 1,321 stars, last push 2026-10-01 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)
- **Concordia (Google DeepMind, arXiv:2312.03664)**
  - **Pattern:** "a special entity called the **Game Master** (GM) simulates the environment", and resolution includes "checking physical plausibility in simulated worlds" — [README](https://github.com/google-deepmind/concordia) (opened)
  - **Popularity and licence:** Apache-2.0, 1,756 stars, last push 2026-10-01 — [GitHub topic search](https://api.github.com/search/repositories?q=topic:agent-based-simulation&sort=stars&order=desc&per_page=60) (opened)
- **"Generative Agent Simulations of 1,000 People" (Park et al. 2024; joonspk-research/genagents)**
  - **Data:** agents are built from "2,000 hours of interviews". The 1,000-person bank is "not publicly available" for privacy reasons, and a restricted research API is planned — [README](https://github.com/joonspk-research/genagents) (opened)
  - **Public release:** a "bank of over 3,000 agents" seeded from General Social Survey demographics, an OpenAI GPT-4/3.5 key requirement, MIT licence — [README](https://github.com/joonspk-research/genagents) (opened)
- **Newer 2025–2026 papers (listing only)** — these come from a GitHub-hosted daily arXiv index (Nicolas99-9/llm-agent-simulation-papers, last push 2026-10-02) — [index](https://github.com/Nicolas99-9/llm-agent-simulation-papers):
  - "But How Would AI Agents Run a Town's Economy?" (arXiv:2609.11108; "100 agents operating a closed monetary system")
  - "From Certain Doom to Survival: Agent-Driven Self-Governance in LLM Agent Societies" (2609.22600)
  - "Behavior is Not Enough: … Social Norm Emergence in LLM Societies" (2609.26481)
  - "The Politician, the Liar, and the Obedient Worker" (2608.09574; "corruption, deception, free-riding")
  - "AIvilization v0" (2602.10429)
  - "Artificial Leviathan" (2406.14373; Hobbesian social contract)
  - "LLM-based Human Simulations Have Not Yet Been Reliable" (2501.08579)
  - Hybrid frameworks: "Towards Agentic Agent-based Models" (2607.17948; "combining symbolic rules with LLM-driven decisions"), "AgoraSim: A Hybrid Agent-Based Modeling Framework" (2607.05999) and "GASim: A Graph-Accelerated Hybrid Framework" (2605.07692)
- **Hybrid rule-based + LLM projects (opened)**
  - **dots:** decisions go through one call site (`minds.decide()`); "Today a local policy makes the choice", and it is "built to have a language model plugged in" — [README](https://github.com/dotshome/dots) (opened)
  - **Autopolis:** a "Deterministic Tick Loop (1 Hz)". It has an "Async agent loop — decisions every 15 ticks from tick 120; never blocks the 1 Hz loop", a "Mock agent (default) — deterministic, schema-valid decisions" and Zod-validated JSON actions — [README](https://github.com/sleuthy-sloth/autopolis) (opened)
  - **CYMONIA:** "LLM calls are one bounded cognition mechanism. Biology, physics, action execution, material conservation … are deterministic kernel responsibilities"; the runtime lives in a Cloudflare Durable Object — [README](https://github.com/SignalLayerLabs/CYMONIA) (opened)
  - **simfile:** "Every message, wake, turn, memory write, and variable change is a ledger event", making runs replayable — [README](https://github.com/noopolis/simfile) (opened)
  - **Hybrid ports of classic models:** yukincom/llm-SugarScape and lrufiner/Civil_Violence_LLM — [Sugarscape search](https://api.github.com/search/repositories?q=sugarscape&sort=stars&order=desc&per_page=15); [civil-violence search](https://api.github.com/search/repositories?q=civil+violence+epstein&sort=stars&order=desc&per_page=20) (listing only)
- **WebLLM (mlc-ai/web-llm):** "High-performance In-browser LLM Inference Engine". TypeScript, Apache-2.0, 19,223 stars, last push 2026-10-03 — [metadata B](https://api.github.com/search/repositories?q=repo:mlc-ai/web-llm+repo:tgstation/tgstation+repo:joonspk-research/genagents+repo:altera-al/project-sid+repo:tsinghua-fib-lab/AgentSociety+repo:microsoft/TinyTroupe+repo:SignalLayerLabs/CYMONIA+repo:dotshome/dots+repo:sleuthy-sloth/autopolis+repo:casaisdev/primordial+repo:zntznt/simulations+repo:omikun/EconSim+repo:AtakanAytar/economySim+repo:Nicolas99-9/llm-agent-simulation-papers&per_page=30) (opened)

### Inferences
- **Per-agent-per-tick LLM calls cannot run in a static, browser-only simulation of hundreds to thousands of dots.** OASIS's ~3.4k input tokens per agent-step implies millions of tokens per simulated day.
- **A viable optional LLM layer** would:
  - sit at a single decision point, as dots does, or act as a Concordia-style "game master" narrator;
  - run rarely and asynchronously, as Autopolis does every 15 ticks;
  - always have a deterministic fallback;
  - log its outputs as ledger events so seeded replays stay bit-identical, as simfile does.
- **Project Sid's emergent "guard" is suggestive but not a crime study.** No opened LLM-society source addresses theft, policing or recorded-versus-true crime, so the plan's rule-based Becker/Short approach is not duplicated by this literature.

### Gaps
- **AgentSociety v1's quantitative results** (agent counts, interaction counts, its economic and UBI experiments) could not be verified: arXiv was blocked and the READMEs do not state them.
- **The 1,000-people paper's accuracy figure** could not be verified, for the same reasons.
- **The 2025–2026 papers above were not opened** (arXiv blocked); only their index one-liners were seen.

## Has anything changed since late September 2026 for ndouglas/SugarScape or Common Ground?

### Takeaway
**ndouglas/SugarScape changed substantially.** Between 2026-09-25 and 2026-10-03 it grew into a browser playground of 25+ classic artificial-society models, still with 0 stars. New models include Civil Violence (with cops and arrests), Norms and Metanorms, Altruistic Punishment, Zero-Intelligence Traders and the Emergence of Firms. It also added a "Minds" programme whose milestone 6 adds **theft** (spec dated 2026-09-30) and milestone 8 adds **watching** — observational memory of other agents' caches (spec dated 2026-10-01). Commit messages mention an upcoming "underworld" campaign. **Common Ground (fraferra/agents-world) is unchanged**: last push 2026-09-26, 0 stars, no licence, no crime or police.

### Cited Findings
- **ndouglas/SugarScape — repository**
  - **Metadata:** created 2026-09-22, last push 2026-10-03, 0 stars, 0 forks, MIT, homepage ndouglas.github.io/SugarScape — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
  - **Size:** 1,093 commits — [GitHub page](https://github.com/ndouglas/SugarScape) (opened)
  - **Stack:** a Rust core compiled to WebAssembly, with a TypeScript front end — [README](https://github.com/ndouglas/SugarScape) (opened)
- **ndouglas/SugarScape — models added**
  - **Model menu:** the README lists Sugarscape, Minds, Schelling, Ring World, Artificial Anasazi, Civil Violence, Tag Cooperation, Spatial Games, Axelrod Culture, Emergence of Classes, Ethnocentrism, Bounded Confidence, Social Structure, Demographic PD, Norms and Metanorms, Relative Agreement, Image Scoring, El Farol and the Minority Game, Ants and Recruitment, Threshold Models, The Timing of Retirement, Altruistic Punishment, Zero-Intelligence Traders, Balinese Water Temples and The Emergence of Firms. Later sections cover Q-learning Auctions, Emergent polarity and GeoSim war sizes — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Spec dates:** civil-violence 2026-09-25; norms 2026-09-26; punishment and zi-traders 2026-09-28; emergence-of-firms and minds-6-theft 2026-09-30; minds-8-watching and algorithmic-collusion 2026-10-01; q-learning-auctions and emergent-polarity 2026-10-02; geosim 2026-10-03 — [README spec references](https://github.com/ndouglas/SugarScape) (opened)
- **ndouglas/SugarScape — crime and police features**
  - **Civil Violence (Epstein 2002):** cops arrest agents whose "grievance exceeds that risk plus a threshold". The grid colours "quiet agents blue, active red, cops light gray". The README reports that "Run 5 (cop reductions) tips every one of 20 seeds into rebellion" — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Minds 6 (theft):** "Minds 6 lets Minds 5's agents steal each other's caches". It models "Theft by stumbling" (`theft.find`), owner memory and "Cheaters" who never bury. Loot can be kept and re-buried, so "Reciprocal pilfering then arises; it isn't scripted". Every cache's fate can be logged ("dug by its owner, pilfered (and by whom), lost with a dead owner") — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Minds 8 (watching):** "an agent who sees another bury remembers the cache, and goes to take it on purpose". Watchers see along lattice lines within vision unless walls block them. "The owner never knows it was seen". Memory span defaults to 7 ticks. "Four audits found that three of the first design's five judged results were foreseeable … so they weren't tests", which led to a second design round — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Upcoming:** every visible commit is dated 2026-10-03 and concerns GeoSim, Burrow and Minds. One reads "docs: preserve culture and underworld campaigns with burrow priority" — [commits page](https://github.com/ndouglas/SugarScape/commits/main) (opened)
- **ndouglas/SugarScape — UI and runtime patterns worth borrowing**
  - **Worker and determinism:** "The simulation runs in a Web Worker". "A run does not depend on the speed: the same setup and seed give the same world at the same tick" — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Step back and branches:** "⟲1 steps back a tick", with a slider to seek. "Playing on replays the same recorded future until you make an edit, which drops it and starts a new branch" — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Stop and measure:** "Stop at" rules trigger on a tick or on a series threshold, and a ticks-per-second readout is shown — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Charts:** "Largest-Triangle-Three-Buckets keeps about 2 000 points of each line" — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Compare mode:** "Compare pairs two worlds of one model" in lockstep, alongside share links, CSV export and a CLI — [README](https://github.com/ndouglas/SugarScape) (opened)
  - **Limits and deployment:** worlds stop at 1,000,000 ticks. GitHub Pages is deployed through an Actions workflow — [README](https://github.com/ndouglas/SugarScape) (opened)
- **Common Ground (fraferra/agents-world)**
  - **Metadata:** created 2026-09-24, last push 2026-09-26, 0 stars, no licence, no homepage field — [metadata A](https://api.github.com/search/repositories?q=repo:ndouglas/SugarScape+repo:fraferra/agents-world+repo:pietro-works/SocSim+repo:NeoLorenzo/Econ-Engine+repo:fellipegoncalvesleite/society-engine+repo:aygaydukov/grim-village+repo:zeikar/cimulity+repo:noopolis/simfile+repo:protos/sugarscape+repo:scottfr/simulation+repo:noncomputable/AgentMaps+repo:gjmcn/atomic-agents+repo:chen0040/js-simulator+repo:scottpdo/flocc&per_page=30) (opened)
  - **README:** "Play online: https://fraferra.github.io/agents-world/". It starts with "120 people, a large 224 × 144 world, and the seed `moss-17`", runs on module workers, Canvas 2D and IndexedDB, and covers trade, alliances, wars, eight cultural norms, thirty technologies and twenty-seven buildings — [README](https://github.com/fraferra/agents-world) (opened)
  - **Scope:** a grep of the README for crime, police, theft and steal found no matches. It describes itself as "a rule-based artificial-life model, not an LLM-driven society" — [README](https://github.com/fraferra/agents-world) (opened)

### Inferences
- **ndouglas/SugarScape is now the most relevant reference** among the two watched repos:
  - Minds 6 theft and Minds 8 watching are rule-based models of pilfering and witnessed theft, close to "crime as an action any dot can take" plus witnesses. The planned "underworld" campaign suggests crime may grow further (unverified intent).
  - Its UI patterns (two-world lockstep Compare, branchable seek, LTTB-downsampled charts, Stop-at rules) are directly applicable to the plan's "true vs recorded crime" and policy comparisons.
  - It is still a replication playground of separate models, not one society with merchants and police coexisting.
- **The pace** — 25+ models in about 12 days, with spec documents for each — suggests heavy AI assistance. The repository may change weekly, so it is worth re-checking before publication.

### Gaps
- **The live demo was not verified:** ndouglas.github.io and fraferra.github.io are blocked by egress. Whether the GitHub Pages builds are actually live is not confirmed.
- **The first pass's exact snapshot is unknown,** so it is unclear which of the 2026-09-25/26 models it saw. Everything dated 2026-09-27 or later is new since late September.
- **The "underworld" campaign's content is unknown:** only the commit message was seen, and the docs file was not opened.
