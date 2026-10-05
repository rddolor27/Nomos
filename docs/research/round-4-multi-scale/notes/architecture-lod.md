# Multi-scale ("level-of-detail") architecture: one browser simulation for a village, a city and a whole country

Scope: architecture research for the Dot Society plan. The plan is a TypeScript core on SoA typed arrays in a dedicated worker. It is seeded and deterministic and uses an integer-cent zero-sum ledger with a MINT account. The economy follows Lengnick 2013, and crime uses Becker/Epstein decisions with a Short et al. hotspot field. It runs 10k/25k/100k agents on a 256×256 LDtk map. Status as of October 2026.

Source labels used below:

| Label | Meaning |
|---|---|
| opened | I read the file or page myself (GitHub raw files or a git clone). |
| snippet only | I saw only a search-result summary. arXiv, JASSS, ScienceDirect, Paradox forum, Steam, itch.io, AAAI, GitHub Pages and most other hosts were blocked. |
| title only | I know only that the work exists. |
| own measurement | A local Node script I wrote and ran: Node 22.22.0 / V8 12.4, one thread of an Intel Xeon @ 2.80 GHz (4-vCPU container). The scripts are in `../prototypes/lod`. |
| sibling notes | Earlier Dot Society research notes on disk. |
| background, unverified | My prior knowledge, not checked in this session. |

I used all 18 allowed web searches.

## 1. Approaches agent-based modellers use to scale beyond what they can run individually, and what each does to emergent dynamics

### Takeaway
Modellers have four tools:
- **Super-individuals:** one agent stands for N people.
- **Hybrid ABM + equation-based models:** each region switches between agents and equations depending on head-counts.
- **Multi-level ABMs:** agents are aggregated and disaggregated dynamically by interest or focus.
- **Archetype agents:** decisions are shared across an attribute group.

Each tool keeps totals and loses structure in its own way:
- Super-individuals visibly distort spatial and temporal dynamics once N exceeds about 10.
- In my own run of a Short et al.-style burglary model, spatial aggregation kept total crime exactly (rate/Γ ≈ 1.00 with or without hotspots). It lost the pattern: hotspots put 47–59% of burglaries into 5% of sites, against 10–21% under a no-hotspot null. The number of active offenders also halved.

### Cited Findings
**Super-individuals**
- Scheffer, Baveco, DeAngelis, Rose & van Nes (1995), *Ecological Modelling* 80: 161–170. They add one variable to each model individual: the number of real individuals it represents. The model can then "zoom" from individual-by-individual, to cohorts, to an all-animals-are-equal view, without changing its formulation. Their motivation is that simply simulating fewer individuals causes loss of variation, irregular dynamics and strong sensitivity to the random seed. The approach also lets you test whether behaviour is an artifact of lumping. — [ScienceDirect abstract](https://www.sciencedirect.com/science/article/abs/pii/030438009400055M) (snippet only)
- Parry & Evans (2008), *Ecological Modelling* 214: 141, compared super-individuals with parallel computing on a spatially explicit aphid model:
  - Parallelisation preserved the model's structure and results, but sped it up only with more than 5 processors.
  - The super-individual version "caused significant changes to the model dynamics, both spatially and temporally".
  - When one super-individual represented more than about 10 individuals, aggregate statistics hid deviations from the individual-level model.
  - Source: [ADS abstract](https://ui.adsabs.harvard.edu/abs/2008EcMod.214..141P/abstract) (snippet only)
- Parry & Bithell (2012), "Large Scale Agent-Based Modelling: A Review and Guidelines for Model Scaling", a chapter in *Agent-Based Models of Geographical Systems*, names two routes:
  - **Change the model (super-individuals).** This gives large gains in speed and memory with little reformulation, but "significant challenges … when relating super-individuals to individuals in time and space".
  - **Change the hardware or software (parallel computing).** Their spatial examples use "agent-parallel" and "environment-parallel" decompositions.
  - Source: [Springer chapter](https://link.springer.com/chapter/10.1007/978-90-481-8927-4_14) (snippet only)
- A variant keeps a fixed density of super-individuals per spatial cell. — ["Spatially explicit individual-based modeling using a fixed super-individual density"](https://www.sciencedirect.com/science/article/abs/pii/S0098300407000647) (title only)

**Hybrid agent-based + equation-based / system-dynamics models**
- Bobashev et al. (2007), "A Hybrid Epidemic Model: Combining the Advantages of Agent-Based and Equation-Based Approaches", model a network of cities linked by transport. Each city starts as an ABM. It switches to an equation-based model once its count of infected people is large enough for population averaging, and switches back below the threshold. This "can dramatically save computational times". — [ResearchGate record](https://www.researchgate.net/publication/261459282_A_Hybrid_Epidemic_Model_Combining_The_Advantages_Of_Agent-Based_And_Equation-Based_Approaches) (snippet only)
- Later hybrids describe Bobashev's design as temporal coupling that alternates a region between an ABM state and a compartmental state when a count crosses a threshold. Sources:
  - "A Hybrid Agent-Based and Equation Based Model for the Spread of Infectious Diseases" — [JASSS 23(4) 14, 2020](https://www.jasss.org/23/4/14.html) (snippet only)
  - "Integrating Agent-Based and Compartmental Models for Infectious Disease Modeling: A Novel Hybrid Approach" — [JASSS 28(1) 5, 2025](https://www.jasss.org/28/1/5.html) (title only)
  - "Hybrid metapopulation agent-based epidemiological models for efficient insight on the individual scale: a contribution to green computing" — [Infectious Disease Modelling, 2024](https://www.sciencedirect.com/science/article/pii/S2468042724001477) (title only)

**Multi-level agent-based models**
- Morvan, "Multi-level agent-based modeling – A literature survey" (arXiv:1205.0561; submitted May 2012, revised November 2013). It is a structured review of works that add more levels of description to agent-based models, which it calls ML-ABM, with emphasis on social, flow, biological and biomedical models. — [arXiv abstract](https://arxiv.org/abs/1205.0561) (snippet only)
- Related work found:
  - "On time and consistency in multi-level agent-based simulations" — [arXiv 1703.02399](https://arxiv.org/html/1703.02399) (title only)
  - "Multi-level agent-based simulations: Four design patterns" — [ResearchGate](https://www.researchgate.net/publication/322387842_Multi-level_agent-based_simulations_Four_design_patterns) (title only)
  - NetLogo LevelSpace — [JASSS 23(1) 4](https://www.jasss.org/23/1/4.html) (title only)
  - Multi-Level Mesa — [arXiv 1904.08315](https://arxiv.org/pdf/1904.08315) (title only)
  - "Decoupling Complexity from Population Size: A Macro-Agent Architecture for Scalable Stochastic Simulations" — [ACM DL](https://dl.acm.org/doi/10.1145/3777911.3800629) (title only)
- Navarro, Flacher & Corruble (AAMAS 2011), "Dynamic level of detail for large scale agent-based urban simulations":
  - Level of detail is a parameter adapted automatically and dynamically during the run, "taking into account elements such as user focus or specific events".
  - Areas of high interest run microscopic models; other areas run macroscopic ones.
  - An affinity function measures how similar agents' internal and external states are, and decides which linked agents to aggregate.
  - First experiments showed "a major gain in CPU time … for a very limited loss of consistency".
  - Sources: [HAL record](https://hal.science/hal-01288047) (snippet only). Follow-up: "A Methodology to Engineer and Validate Dynamic Multi-level Multi-agent Based Simulations", [arXiv 1311.5108](https://arxiv.org/abs/1311.5108) (title only)

**Representative / archetype agents (AgentTorch)**
- Both AgentTorch model cards state "Agent Population: 8.4 million synthetic agents representing New York City".
  - The labour-market card uses "Execution Mode: Archetype (Large Language Model Archetype)", with 20 steps per episode and 4 substeps each.
  - The COVID (SEIRM) card uses "Execution Mode: Heuristic", with 21 steps per episode and 2 substeps each.
  - Sources: [macro_economics/model_card.md](https://github.com/AgentTorch/AgentTorch/blob/master/agent_torch/models/macro_economics/model_card.md), [covid/model_card.md](https://github.com/AgentTorch/AgentTorch/blob/master/agent_torch/models/covid/model_card.md) (opened via git clone, commit 86bb57e, 2026-09-12)
- How archetypes work in the code:
  - The population is split into groups by prompt attributes, e.g. "Male under 19, Female from 20 to 29 years of age".
  - The LLM is queried once per distinct group.
  - The answer is broadcast to every agent in that group through index masks (`sampled_behavior[idx, 0] += value_for_group`).
  - `n_arch` "is the number of archetypes to be created. This is used to calculate a distribution from which the outputs are then sampled".
  - Sources: [core/llm/behavior.py](https://github.com/AgentTorch/AgentTorch/blob/master/agent_torch/core/llm/behavior.py), [core/llm/archetype.py](https://github.com/AgentTorch/AgentTorch/blob/master/agent_torch/core/llm/archetype.py), [configure-behavior tutorial](https://github.com/AgentTorch/AgentTorch/blob/master/docs/tutorials/configure-behavior/index.md) (opened)

**Own experiment: what spatial aggregation keeps and loses for crime hotspots**

Setup: a discrete Short et al. (2008)-style burglary model on a 64×64 torus, with δt = 0.01, ω = 1/15, A0 = 1/30. Each run covers 600 time units and is measured over the last 300. A burglar is removed after burgling; new burglars arrive at rate Γ per site; attractiveness follows decay + diffusion (η) + θ per burglary.

| η | θ | Γ | burglaries per site per unit time ÷ Γ | share of burglaries in top 5% of sites | same share under a homogeneous-Poisson null | max ÷ mean attractiveness | active burglars at end |
|---|---|---|---|---|---|---|---|
| 0.03 | 0.56 | 0.019 | 1.011 | 0.594 | 0.098 | 18.9 | 199 |
| 0.20 | 0.56 | 0.019 | 0.997 | 0.100 | 0.098 | 4.2 | 410 |
| 0.03 | 5.6 | 0.002 | 1.018 | 0.469 | 0.213 | 29.6 | 28 |
| 0.20 | 5.6 | 0.002 | 1.018 | 0.217 | 0.213 | 6.6 | 39 |

Source: [short_model.mjs](../prototypes/lod/short_model.mjs) (own measurement). I chose the parameter values from memory of the ranges in Short et al. 2008; whether they match the paper's figures is background, unverified.

### Inferences
- **Volume is preserved; pattern and offender stock are not.** In a Short-type model, total crime volume is pinned by offender inflow: every burglar is removed after exactly one burglary, so burglaries equal arrivals in steady state. Hotspots only redistribute crime. A per-settlement aggregate can therefore get the total right from the inflow rate alone. It loses two things that matter for hot-spot policing and arrest counts:
  - the concentration (59% vs 10% of burglaries in the top 5% of sites);
  - the stock of offenders present at any moment (199 vs 410). Hotspots make burglars strike faster.

  The aggregate model should therefore carry a concentration index next to volume. It should also make policing efficiency a function of that index, emulated from the agent model.
- This conservation property belongs to Short's model only. In Dot Society, Becker/Epstein offenders are not removed after one crime, so volume will depend on deterrence and economics. The volume part must be emulated too.
- **Super-individuals are a poor fit for crime.** A super-thief standing for N people commits N crimes on one tile, which inflates the self-excitation that Short's field feeds on. Parry & Evans saw distortions above about 10× even in a simpler ecological model. For big cities, use real individuals in a district "window" rather than super-individuals.
- **Contagion** (fear of crime, rumours, illness): well-mixed compartments are acceptable for large settlements. Villages need stochastic integer flows, because small-number extinction and outbreak variance disappear in a deterministic mean field. This is exactly why Bobashev switches to equations only when counts are large.
- **Price formation:** representative or archetype firms remove the cross-firm dispersion that produces Lengnick's emergent price-change frequency. Per the sibling calibration notes, the paper reports a median price-change frequency of about 9% per month. An aggregate price index therefore needs an explicit Calvo-style "share of firms repricing" rule, fitted from agent-model runs. — frequency from [economy_calibration.md](../../round-2-follow-up/notes/economy-calibration.md) (sibling notes)
- **Archetypes buy little here.** AgentTorch's archetypes are super-individuals in decision space, not in physical space: agents keep their own state, but a group shares a decision. That pays off when a decision is expensive (an LLM call). Dot Society's decisions are cheap rules, so the trick is of little use.

### Gaps
- I did not retrieve Gaudou et al.'s multi-level and hybrid work (GAMA's nested species; hybrid ABM–EBM epidemic models such as "The importance of being hybrid for spatial epidemic models", background, unverified); the search budget ran out.
- No source compared super-individuals on crime or hotspot models. The crime inference rests on my Short experiment plus Parry & Evans' ecological result.
- All paper full texts were blocked (Scheffer, Parry & Evans, Parry & Bithell, Morvan, Navarro, Bobashev). Numbers beyond the snippets, such as Navarro's CPU gains or Bobashev's threshold, are unknown.

## 2. How games keep large worlds alive cheaply

### Takeaway
Games use three tricks, and all of them accept that outcomes depend on what the player watches:
1. **A coarser rule set when unobserved:** X4's low "attention", Bannerlord's simulated battles, STALKER's offline A-Life.
2. **Counts instead of people:** Dwarf Fortress world populations and site inhabitants, Stellaris pop groups, Cities: Skylines' citizens versus citizen instances.
3. **Static, label-like distant settlements:** RimWorld.

Only STALKER (OpenXRay) has engine source I could read. Its online/offline switch uses a hysteresis band, its scheduled updates run under a time budget, and it seeds its RNG from the CPU clock, so its world is not reproducible.

### Cited Findings
**X4: Foundations (high versus low attention)**
- Each X4 AI script carries separate action blocks per attention level. A mod's diff patches both `//aiscript/attention[@min='visible']/actions/...` and `//aiscript[@name='fight.attack.object.bigtarget']/attention[@min='unknown']/actions/...`. — [A11ectus/X4-Subsystem-Targeting-Orders, aiscripts/*.xml](https://github.com/A11ectus/X4-Subsystem-Targeting-Orders) (opened via git clone; last commit 2021-05-22)
- The same mod's changelog (v3.5, 2021-05-13) reads: "Significantly improved (fixed, really...) out of sector targeting performance. S/M ships and Carriers will now properly target appropriate subsystems in low attention mode." In other words, out-of-sector behaviour is scripted separately and can diverge from in-sector behaviour. — [readme.md](https://github.com/A11ectus/X4-Subsystem-Targeting-Orders/blob/master/readme.md) (opened)
- Players report that out-of-sector combat "is more like turn based combat with hit rates and damage modifiers". In low attention, small-ship shields recover after a turn without damage, so weak turrets never kill them. — [Steam: "OOS combat needs to perform equal to or worse than in-sector combat"](https://steamcommunity.com/app/392160/discussions/0/840627496100645234/), [Steam: "OOS combat doesn't make sense"](https://steamcommunity.com/app/392160/discussions/0/603025705548123835/) (snippet only; player forums, low reliability)

**Mount & Blade II: Bannerlord (abstract world map, auto-resolve)**
- A community breakdown of simulated (auto-resolved) battles, written for v1.3.2.96234 beta, says:
  - "Simulation battles don't take place with limited sizes and reinforcements, unlike regular missions."
  - Each round, one random attacker troop and one random defender troop are drawn from the rosters. Damage comes from troop power, battle advantage and morale. Troops can be wounded or killed, and heroes can die.
  - In simulations, defenders have an inherent advantage. Infantry are never penalised and cavalry are the worst unit. Settlements get a 2:1 to 7:1 defensive advantage.
  - Live missions instead draw priority troops through a "troop supply system", which also sends reinforcements.
  - Source: [jzebedee, "Bannerlord Combat Simulation System" gist](https://gist.github.com/jzebedee/be076d28f162c8d05fd7d2d72109a46f) (opened via git clone; community reverse engineering, last updated Nov 2025)
- On the campaign map, villages produce goods according to their production types. Villagers carry those goods to the local town by shuttling between village and town. Caravans buy in towns and sell elsewhere to maximise profit, and bandit parties operate from hideouts. — [TaleWorlds Developer Blog 12, "The Passage of Time", and other search results](https://www.taleworlds.com/en/Games/Bannerlord/Blog/14) (snippet only; which page the snippet came from is uncertain)

**Paradox: Stellaris pop groups; Victoria 3 pops**
- Stellaris 4.0 "Phoenix" (2025):
  - Pops are grouped into Pop Groups by species, strata and ethics. Pop groups produce "Workforce", which fills jobs, possibly partially and across several jobs.
  - The scale changed: "most things that previously affected or manipulated 1 Pop would now affect or manipulate 100".
  - Performance motive: pops "have long been one of the biggest causes of late-game performance issues", and referencing groups avoids "iterating through every single pop in the empire whenever a modifier needs to be re-calculated".
  - Sources: [Stellaris Dev Diary #372 "Modding: Pop Groups and Jobs"](https://forum.paradoxplaza.com/forum/developer-diary/stellaris-dev-diary-372-modding-pop-groups-and-jobs.1729994/), [Dev Diary #366 "Announcing Stellaris 4.0"](https://forum.paradoxplaza.com/forum/developer-diary/stellaris-dev-diary-366-announcing-stellaris-4-0.1726042/) (snippet only; forum blocked)
- Victoria 3 represents population as "pops": groups sharing culture, religion, profession and state, with real head-counts (background, unverified).

**Dwarf Fortress (world populations, site inhabitants, named figures)**

These come from DFHack's community-maintained memory layouts:
- `world_population` (DF's `regionpopst`) is kept per region and per race or plant. It holds `count_min` (original name `number`), `count_max` (`max_number`) and an owner entity. — [df.regionpop.xml](https://github.com/DFHack/df-structures/blob/master/df.regionpop.xml) (opened via git clone, commit 63efa5f, 2026-09-29)
- `local_population` (`wilderpopst`) holds `quantity` and `quantity_max`, plus these flags:
  - `discovered`
  - `extinct` (NULLIFIED)
  - `already_removed` ("no longer in world.populations")
  - `need_offload` (NEED_TO_OFFLOAD)

  It also keeps a reference back to its world population. — [df.wilderpop.xml](https://github.com/DFHack/df-structures/blob/master/df.wilderpop.xml) (opened)
- A spawned animal `unit` stores `animal.population`, the world population it came from, and `leave_countdown` ("once 0, it heads for the edge and leaves"). Units also carry `hist_figure_id`. — [df.unit.xml](https://github.com/DFHack/df-structures/blob/master/df.unit.xml) (opened)
- A site's `populacest` holds:
  - `nemesis`: ids of named, persistent figures;
  - `animals`: world populations;
  - `inhabitants`: `world_site_inhabitant` records of `count` plus a population specifier;
  - `units`: placement info.

  Source: [df.site.xml](https://github.com/DFHack/df-structures/blob/master/df.site.xml) (opened)
- Armies are world-level objects with a position, travel and wait counters, and member lists (`army`, `army_controller`). — [df.army.xml](https://github.com/DFHack/df-structures/blob/master/df.army.xml), [df.army_controller.xml](https://github.com/DFHack/df-structures/blob/master/df.army_controller.xml) (opened)
- World generation simulates centuries of history coarsely, while fortress mode simulates only the embark site in full detail (background, unverified).

**Songs of Syx (world map + city)**
- The world consists of regions and settlements. You start with one region; others hold settlements or open land. Regions produce resources if you tax them. NPC factions are simulated: they wage war and suffer political strife. A 2021 update added a world map with Total War-style conquest. — [itch.io devlog "The World and Beyond"](https://songsofsyx.itch.io/songs-of-syx/devlog/157425/the-world-and-beyond), [GamingOnLinux, July 2021](https://www.gamingonlinux.com/2021/07/massive-scale-city-builder-songs-of-syx-gets-a-new-world-map-total-war-styled-conquests/), [Songs of Syx wiki: World](https://songsofsyx.com/wiki/index.php/World) (snippet only)

**Cities: Skylines (agent caps)**
- Cities: Skylines 1 has three separate limits:
  - 65,536 "citizen instances": the cims and animals visibly walking around;
  - 1,048,576 citizens: the population count;
  - 524,288 "citizen units": citizens assigned to buildings and transport so they look inhabited.

  65,535 is the largest unsigned 16-bit index, so raising the instance limit doubles index memory from 2 to 4 bytes. — [Steam guide "Cities Skylines Game Limits"](https://steamcommunity.com/sharedfiles/filedetails/?id=2712549268) (snippet only; community guide)
- Cities: Skylines II "removes the agent limit". — [GamesRadar](https://www.gamesradar.com/cities-skylines-2-removes-the-agent-limit-finally-letting-city-builder-fans-utterly-melt-their-machines/) (snippet only)

**RimWorld (world tiles)**
- One player describes the world map as "just a bunch of points that represent where you can trade or who you can raid". Other factions "are just labels that spawn raids at you", and destroying 20 of a faction's settlements rather than 1 does not change its raid volume. — [Steam discussion](https://steamcommunity.com/app/294100/discussions/0/3390660147474846247/) (snippet only; player forum, low reliability)

**LOD AI near the player**
- STALKER's A-Life, from OpenXRay source:
  - `m_online_distance = m_switch_distance * (1.f - m_switch_factor)` and `m_offline_distance = m_switch_distance * (1.f + m_switch_factor)`.
  - An offline object goes online only if the actor is within `online_distance`. An online object goes offline only beyond `offline_distance`. This is a hysteresis band.
  - The switch manager seeds its RNG with `seed(u32(CPU::QPC() & 0xffffffff))`, i.e. from the clock.
  - Sources: [alife_switch_manager_inline.h](https://github.com/OpenXRay/xray-16/blob/master/src/xrGame/alife_switch_manager_inline.h), [alife_dynamic_object.cpp](https://github.com/OpenXRay/xray-16/blob/master/src/xrGame/alife_dynamic_object.cpp) (opened)
- A-Life's update manager reads a time budget (`process_time`, applied via `set_process_time(int microseconds)`) and an `objects_per_update` cap from config, and applies them to its graph and scheduled-object updates. — [alife_update_manager.cpp](https://github.com/OpenXRay/xray-16/blob/master/src/xrGame/alife_update_manager.cpp) (opened)
- Sunshine-Hill & Badler, "Perceptually Realistic Behavior through Alibi Generation" (AIIDE):
  - A cheap "perceptual simulation" covers only a small part of the world at a time, with a statistical guarantee that the results are perceptually indistinguishable from the full simulation.
  - "Alibi generation" retroactively elaborates an agent's behaviour, giving plausible explanations for random decisions, when the player scrutinises it.
  - Sunshine-Hill's dissertation "Perceptually Driven Simulation" adds "perceptual criticality modeling" and the "LOD Trader" framework for choosing level of detail.
  - Sources: [AAAI OJS](https://ojs.aaai.org/index.php/AIIDE/article/view/12389), [UPenn repository](https://repository.upenn.edu/edissertations/435/) (snippet only)

### Inferences
- **The universal pattern** is an always-existing cheap record plus an expensive instance that exists only near the viewer:
  - the A-Life server entity and its online object;
  - the DF world population or historical figure and its unit;
  - the Bannerlord party roster and its mission troops;
  - the Cities: Skylines citizen and its citizen instance.

  Dot Society should copy this: settlements are always records, and agents are instances drawn from them.
- **Every game here accepts an observer effect, then lives with its exploits.** Players call X4's out-of-sector combat nonsensical. Bannerlord's auto-resolve systematically favours defenders and penalises cavalry, so whether you watch a battle changes its outcome. Dot Society must make this choice explicitly (Question 3).
- **Two mechanisms port directly:** hysteresis (STALKER's ±switch_factor band) prevents thrashing, and a time-budgeted offline update (`process_time`) prevents frame spikes.
- **Conservation by construction:** in DF (`need_offload`, units pointing back to their population) and in Cities: Skylines (citizens versus instances), the abstract count is the truth. Instances are drawn from it and returned to it.
- **Don't copy STALKER's clock seed.** Seeding from the clock makes the world unreproducible. Dot Society's keyed, counter-based RNG avoids this (Question 3).

### Gaps
- No developer primary source was readable for X4, Paradox, Songs of Syx, Cities: Skylines, RimWorld or Victoria 3, because those hosts were blocked. Their mechanics above rest on snippets or community analyses.
- I could not open Bannerlord's live-battle size cap and reinforcement waves, nor Warband's module system: no repository name was known and GitHub search was blocked.
- Two classic observer-effect cases are background, unverified: Minecraft chunks not ticking when out of simulation distance, and Brockington's LOD AI for Neverwinter Nights (AI Game Programming Wisdom, 2002).

## 3. Design for this project: which settlements run as individuals, zoom-in and zoom-out, exact conservation, determinism, pitfalls

### Takeaway
**Recommendation:** make an aggregate stock-flow model the canonical history of every settlement, the focused one included. The focused settlement's agents become an elaboration that is aligned daily to that canonical shadow, using microsimulation "alignment by sorting". This delivers:
- The same seed produces the same country wherever the viewer looks.
- Money and people stay exactly conserved in two separate zero-sum ledgers.
- Zooming in on 100k people costs about 7 ms of spawning (own measurement).

Keep today's single-city game as its own mode, where the agent model is canonical. Offer "consequential focus", which is view-dependent but deterministic given a recorded focus log, only as a documented opt-in.

### Cited Findings
- **Microsimulation alignment in LIAM2:**
  - LIAM2 aligns the number of events per category to externally defined proportions by "alignment by sorting": "for each category, the N individuals with the highest scores are selected".
  - The modeller supplies the score, usually `logit_score`. The docs advise including a random component, "because otherwise the individuals with the smaller scores will never be selected".
  - `frac_need` controls fractional needs: "uniform" adds one individual if u < fractional need; "round" and "cutoff" are the alternatives.
  - `errors='carry'` stores each period's alignment error and adds it to the next period's target.
  - `take` and `leave` force or exclude individuals.
  - LIAM2 points to Li & O'Donoghue, "Evaluating Alignment Methods in Dynamic Microsimulation Models".
  - Source: [LIAM2 doc/usersguide/source/processes.rst](https://github.com/liam2/liam2/blob/master/doc/usersguide/source/processes.rst) (opened via git clone, commit 06288f1, 2026-01-16)
- **Hysteresis switching:** STALKER switches online inside `switch_distance·(1−f)` and offline outside `switch_distance·(1+f)`. — [OpenXRay alife_switch_manager_inline.h](https://github.com/OpenXRay/xray-16/blob/master/src/xrGame/alife_switch_manager_inline.h) (opened)
- **Count → instance → count:** DF's `local_population` carries `need_offload`, and spawned units point back to their `world_population`. **Named persistent figures** (`nemesis`) are kept apart from anonymous `inhabitants` counts. — [df.wilderpop.xml](https://github.com/DFHack/df-structures/blob/master/df.wilderpop.xml), [df.unit.xml](https://github.com/DFHack/df-structures/blob/master/df.unit.xml), [df.site.xml](https://github.com/DFHack/df-structures/blob/master/df.site.xml) (opened)
- **Perceptual rather than exact equivalence:** alibi generation and the LOD Trader. — [AIIDE paper](https://ojs.aaai.org/index.php/AIIDE/article/view/12389) (snippet only)
- **Visible agents are a subset even in a one-city game:** Cities: Skylines shows 65,536 instances against 1,048,576 citizens. — [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2712549268) (snippet only)
- **Project constraints from the sibling notes:**
  - The core uses seeded sfc32 and integer cents.
  - `Math.*` transcendentals are not deterministic across engines. Chrome ≥ 150 uses LLVM libc, and a replay recorded in Chrome 149 would diverge on about 9.6% of `exp` calls. The core must use @stdlib ports or build-time lookup tables.
  - ECMAScript lists exp, log, pow, sin and others as "implementation-approximated". `sqrt`, `floor` and `imul` are not on that list.
  - Source: [engineering_gaps.md](../../round-2-follow-up/notes/engineering-gaps.md) (sibling notes)
- **Own measurement: zoom-in and zoom-out.** Spawn = exact role counts with a keyed Fisher–Yates shuffle, homes, and money apportioned with 12-bit lognormal weights. `floor(H·w/W)` is exact while H·4095 < 2^53, and the leftover cents (< N) go +1 to a keyed stride of agents. Fold = exact sums by role and of money. "Align 1%" = alignment-by-sorting re-sync of 1% of agents from employed to unemployed.

| agents | spawn (ms) | fold (ms) | align 1% (ms) | money and counts exact after round trip | same (seed, settlement, day) gives identical micro-state | Gini of spawned wealth |
|---|---|---|---|---|---|---|
| 10,000 | 3.4 (includes JIT warm-up) | 0.41 | 4.6 | yes | yes | 0.477 |
| 100,000 | 7.1 | 0.36 | 19.4 | yes | yes | 0.474 |
| 1,000,000 | 66.7 | 3.05 | 158.6 | yes | yes | 0.472 |

Source: [bench_spawn.mjs](../prototypes/lod/bench_spawn.mjs) (own measurement)

- **Own measurement: exact apportionment.** Largest-remainder (Hamilton) apportionment of 98,765,432,101 cents over 10,000 settlements, weighted by population, took 3.45 ms and was exact. — [bench_spawn.mjs](../prototypes/lod/bench_spawn.mjs) (own measurement)
- **Own measurement: keyed counter-based RNG.** A `lowbias32` integer hash of (seed, entity, tick, stream), using only `Math.imul`, xor and shifts, costs 6.2 ns per draw, versus 7.7 ns for a closure-based sequential sfc32. χ² over 16 buckets across 1M entities was 15.1 with 15 degrees of freedom. — [bench_rng.mjs](../prototypes/lod/bench_rng.mjs), [common.mjs](../prototypes/lod/common.mjs) (own measurement)
- **Own measurement: deterministic, order-independent aggregate.** Two runs of 10,000 settlements over 365 days with the same seed gave identical state hashes, and the ledger was exactly zero. Cross-settlement flows are planned from a read-only snapshot and then applied, so the result does not depend on iteration order. — [bench_agg.mjs](../prototypes/lod/bench_agg.mjs) (own measurement)

### Inferences

The architecture below is my synthesis of the sources above.

**3.1 Detail levels: which settlements run as individuals**

| Level | What runs | Who gets it | Cost (own measurements, one desktop core) |
|---|---|---|---|
| L0: individuals | The existing SoA agent model on the LDtk map | The focused settlement. If it exceeds the device cap (10k/25k/100k), only the districts in view (a "window"); its other districts run at L1. | ~50–90 ns per agent-tick; 100k agents ≈ 5 ms/tick |
| L1: district aggregate | Stock–flow per district plus a coarse crime lattice (e.g. 16×16 per city) | The focused city outside the window, and neighbouring towns visible at town zoom | ~0.5 µs per district-day + ~30 ns per lattice cell-step (16×16 ≈ 8 µs) |
| L2: settlement aggregate | Stock–flow per settlement: population compartments, sector money, price and wage index, true and recorded crime, police | Every other town and city | ~0.5 µs per settlement-day; 10k settlements ≈ 5 ms per simulated day |
| L3: regional SFC | A Godley–Lavoie REG-style region holding a "rural remainder" | Hamlets too small to list, and far regions | negligible |

Do not use super-individuals at L0 for crime; Parry & Evans saw distortion above about 10×. Use the district window instead. Pick L1 neighbours with an "LOD Trader"-style budget: maximise visible value under a ms budget (Sunshine-Hill).

**3.2 The determinism decision**

You can have only two of these three:
- (a) outcomes independent of viewing;
- (b) individual agents that causally change the macro history;
- (c) individuals that persist across visits without rewriting history.

The options:

| Option | How it works | Gets | Gives up / risk |
|---|---|---|---|
| **A. Shadow-canonical** (recommended for country mode) | The aggregate model runs for every settlement every day, including the focused one. Agents never write canonical state; they are aligned to it. | (a), plus (c) for notable persons | (b) is suppressed. Agents decide who, where and when; the shadow decides how many. |
| **B. Consequential focus** (opt-in) | Agents are canonical while a settlement is focused, and fold back into the aggregate on exit. Focus changes are logged as inputs, at a day boundary, like player commands. | (b) | Deterministic only for the same (seed, inputs, focus log). Different viewers get different countries, so the observer effect must be documented, and exploits are possible (X4, Bannerlord). |
| **C. Fixed-detail world** | The set of L0 settlements is fixed at world creation or by in-world rules. Looking anywhere else shows non-causal "puppets", like alibi generation. | (a) and (b) | Constant CPU cost; only one L0 city fits on phones. |

Today's single-city game is option C with one city, so keep it unchanged as "City mode".

**3.3 Zoom-in (instantiate), always at a day boundary**
1. **Request.** The focus request is logged with its tick and takes effect at the next day boundary. Apply hysteresis on zoom (enter L0 below z·(1−f), leave above z·(1+f)) and a minimum dwell of at least one day.
2. **Read canonical state:** counts per compartment, sector balances, price and wage index, crime volume and concentration, police.
3. **Spawn:**
   - exact counts per compartment, then a keyed shuffle;
   - homes from LDtk capacity;
   - jobs matched to firm sizes;
   - money apportioned exactly (floor plus leftover; switch to BigInt when H × max weight ≥ 2^53);
   - posted prices drawn around the price index;
   - the hotspot field from the persistence cache on a revisit, otherwise a precomputed per-map template scaled to the aggregate's volume and concentration;
   - notables from the cache, re-aligned to current counts.
4. **Hide the pop-in.** Optionally pre-roll a few ticks off-screen, and spawn agents indoors or at homes.
5. **Key the draws.** All spawn draws are keyed by (seed, settlement, entry day, purpose), so zooming in on the same day in any run produces the same people.

**3.4 While focused (option A)**
- **Boundary flows are exact.** The shadow keeps running and sets the day's budgets for flows that cross the settlement boundary: migration, births and deaths, trade, taxes and transfers. The agent model executes those amounts exactly; alignment by sorting on agent-derived scores picks *who*.
- **Interior totals track the shadow.** Hires, separations, offences and arrests are aligned to the shadow's targets. Use alignment by sorting with LIAM2-style error carry, or a daily multiplier on offence propensity steered toward the target. Agents' own rules still decide where and when, so hotspots, patrols and posted prices stay emergent.
- **Two ledgers, each exactly zero-sum:**
  - the canonical ledger (aggregate accounts plus MINT), which the agent model never touches;
  - an elaboration micro-ledger of agent cents, created from canonical balances by exact apportionment.

  The micro-ledger changes only through mirrored boundary flows, so the city's total money always equals the canonical total. Only its split between households and firms can drift; apply an apportioned households↔firms reconciliation transfer at the day boundary if the split leaves a band.
- **Divergence meter.** Every day, compare the agent fold-up with the shadow (z-scores per flow). Show it in a developer panel and log it to recalibrate the emulator.

**3.5 Zoom-out (fold)**
- **Option A:** drop the micro-ledger. Cache a persistence record: notables such as agents with records, police and firm owners (~1–5% of people at ~32 B each), the coarse hotspot field (a 32×32 Uint16 is 2 KB) and the firms' price list. Keep at most N cities in an LRU cache.
- **Option B:** sum exactly into sector accounts and compartments, and set the aggregate's recent rates and concentration index from the agents. The ledger stays exact because spawn and fold are exact and every agent transaction is a transfer.

**3.6 Conservation rules**
- Every money change is a transfer between two accounts, in integer cents stored as integers in Float64 (exact below 2^53 ≈ 9.0e15 cents). MINT is the only source or sink.
- People change only through integer flows between compartments; births and deaths go through explicit source and sink counters.
- Property tests at every day boundary:
  - Σ accounts + MINT = 0;
  - Σ population = initial + births − deaths;
  - spawn → fold is an identity;
  - replay hashes are equal (option A: across *different* focus logs; option B: for the same focus log).

**3.7 Determinism rules**
- Use counter-based keyed RNG streams, with separate salts for the aggregate and agent layers. Never share one sequential RNG across layers: any focus change would then shift every later draw in the country.
- Compute cross-settlement flows in two phases: plan from a snapshot, then apply.
- Use only exactly specified arithmetic in the core: + − × ÷, `sqrt`, `floor`, `imul`. Transcendentals come from build-time tables.
- Switch levels only at day boundaries, and log every switch as an input.
- If the aggregate update is time-sliced STALKER-style, double-buffer it and commit at the day boundary, so slicing can never change results.

**3.8 Pitfalls and mitigations**

| Pitfall | Mitigation |
|---|---|
| Popping: agents appearing or vanishing | Spawn at homes or indoors, fade in, use hysteresis |
| Discontinuities: rates jump at the switch | Calibrated emulator, alignment, divergence meter; label aggregate panels "estimated" |
| Observer effect and exploits | Default to option A; document option B |
| Thrashing | Hysteresis, minimum dwell, day-boundary switching |
| Lost spatial structure (59% vs 10% top-5% share in my Short run) | Store a concentration index and coarse field cache; emulate hot-spot policing efficiency |
| Super-individual artifacts | Avoid at L0 |
| Small-number effects in villages | Integer stochastic flows, not continuous ODEs |
| RNG coupling and order dependence | Keyed streams; two-phase flows |
| Save bloat | Cache notables only, with an LRU cap |
| Identity churn on revisits ("a new police chief every visit") | Persistent notables, the DF `nemesis` analogue |

### Gaps
- I found no published design that combines microsimulation alignment with a live, viewer-driven level of detail in a game. Option A is my synthesis.
- How large the alignment nudges will be depends on emulator quality, which can only be measured against the project's real agent model.
- Spawn timings exclude LDtk building lookups, firm/job matching and GPU buffer upload. Alignment by sorting used a full sort; a partial selection would be faster.

## 4. Aggregate models suitable per settlement, and calibrating them from the individual model

### Takeaway
**Per settlement:** a small stochastic stock-flow model with integer compartments for people and integer-cent sector accounts in the Godley–Lavoie style.

**Between settlements:** a REG-style layer for trade, migration and national taxes.

**Calibration:** every flow rate is fitted from headless runs of the city agent model (an emulator or surrogate), so agent rules map onto aggregate hazards.

My checks:
- SIM in integer cents converges exactly to its textbook steady state (Y = G/θ) with a zero-sum ledger.
- A settlement-day with 11 stochastic flows costs about 0.5 µs.

### Cited Findings
- **Godley–Lavoie model SIM** (*Monetary Economics*, ch. 3), as implemented with pysolve:
  - Supply equals demand: Cs = Cd, Gs = Gd, Ts = Td, Ns = Nd.
  - Income and taxes: YD = W·Ns − Ts and Td = θ·W·Ns.
  - Consumption: Cd = α1·YD + α2·Hh(−1).
  - Money stocks: Hs − Hs(−1) = Gd − Td and Hh − Hh(−1) = YD − Cd.
  - Output and labour: Y = Cs + Gs and Nd = Y/W.
  - Parameters: α1 = 0.6, α2 = 0.4, θ = 0.2, G = 20, W = 1.
  - Source: ["Chapter 3 Model SIM.ipynb", kennt/monetary-economics](https://github.com/kennt/monetary-economics) (opened; the implementation follows Zezza's EViews code)
- **Model REG** (ch. 6): two regions, N and S, share one government and central bank.
  - Income and trade: YN = CN + GN + XN − IMN, with IMN = μN·YN and XN = IMS.
  - Disposable income: YDN = YN − TN + R(−1)·BhN(−1), with TN = θ·(YN + R(−1)·BhN(−1)).
  - Wealth and consumption: VN − VN(−1) = YDN − CN, and CN = α1N·YDN + α2N·VN(−1).
  - Portfolio: HhN = VN − BhN, and BhN = VN·(λ0N + λ1N·R − λ2N·YDN/VN).
  - Government and central bank: Bs = Bs(−1) + (G + R(−1)·Bs(−1)) − (T + R(−1)·Bcb(−1)); Hs − Hs(−1) = Bcb − Bcb(−1); Bcb = Bs − Bh; R = R̄.
  - Base values: μ = 0.18781, θ = 0.2, R̄ = 0.025, GS = 20.
  - The notebook's experiments raise μS to 0.20781 and GS to 25, and change α1S and λ0S.
  - Source: ["Chapter 6 Model REG.ipynb"](https://github.com/kennt/monetary-economics) (opened)
- **sfc_models** (Brian Romanchuk) generates SFC equations algorithmically from `Country` and `Sector` objects. Its Godley–Lavoie examples include REG and REG2, and it supports "markets with multiple supply sources". — [SFC_models README](https://github.com/brianr747/SFC_models) (opened)
- **Own check: SIM in integer cents.** With G = 2,000 cents per period, θ = 20%, α1 = 0.6, α2 = 0.4 and government as the issuing account:
  - Y = 3,846 cents in period 1, 9,744 in period 20, and exactly 10,000 (= G/θ) from period 60 on;
  - household cash reaches 8,000 cents;
  - the ledger sums to exactly 0 every period.

  Source: [sim_sfc.mjs](../prototypes/lod/sim_sfc.mjs) (own measurement)
- **Continuum crime models with police:** "Cops on the dots" (Zipkin, Short & Bertozzi) compares police strategies in the hotspot model:
  - random patrols are largely ineffective;
  - "cops on the dots" (a walk biased toward attractiveness) works early on;
  - "peripheral interdiction" (biased toward hotspot edges) eventually does just as well;
  - cops on the dots sometimes disperses a hotspot and sometimes merely displaces it.

  Source: [UCLA PDF](https://www.math.ucla.edu/~bertozzi/papers/zipkin-cops-final.pdf) (snippet only)
- **A 2026 preprint**, "Crime hotspot dynamics in residential burglary models with police response", couples three PDEs and one ODE: criminal density, attractiveness, a delayed crime signal and police numbers.
  - A finite delay in police reaction can turn stable homogeneous states into oscillations with moving, splitting and merging hotspots.
  - Agent-based and continuum oscillation periods and amplitudes "match closely" near the predicted bifurcation.

  Source: [arXiv 2605.17709](https://arxiv.org/html/2605.17709) (snippet only)
- **Emulators and surrogates:** Lamperti, Roventini & Sani, "Agent-based model calibration using machine learning surrogates" (*JEDC* 90: 366–389, 2018). They learn a fast surrogate meta-model from a limited number of ABM runs with intelligent sampling. It approximates the nonlinear map from inputs (parameters and initial conditions) to outputs and "dramatically reduce[s]" calibration time. They applied it to Brock–Hommes (1998) and the "Island" growth model. — [RePEc record](https://ideas.repec.org/p/fce/doctra/1709.html) (snippet only)
- **Further emulator work** (titles only): "Calibrating Agent-Based Models with Linear Regressions" — [JASSS 23(1) 7](https://www.jasss.org/23/1/7.html); "Using machine learning as a surrogate model for agent-based simulations" — [PMC8830643](https://pmc.ncbi.nlm.nih.gov/articles/PMC8830643/).

### Inferences
**L2 state vector per settlement** (about 30–80 numbers):
- **People (Int32):** employed, unemployed, merchants/firm owners, police and jailed. Optionally multiply by 3 age bands × 3 wealth bands.
- **Money (integer cents):** households, firms, local government/police budget, and bank deposits. The national government and MINT sit outside.
- **Market:** price index, wage index, inventory, vacancies and firm count.
- **Crime:** true offences (cumulative and the last 21 days), recorded offences, arrests, a concentration index (top-5% share) and the police deployment mode. L1 adds a coarse field.

**Daily flows** (integer, stochastic; the hazards are fitted from agent-model runs):
- hires and separations, as functions of the vacancy rate and firm liquidity;
- wages from firms to households, then taxes;
- consumption from households to firms, using SIM-style α1/α2 calibrated per settlement;
- price revisions: the share of firms repricing (about 9% per month per the sibling notes) and the size of the change;
- offences, with a hazard in unemployment, wealth and deterrence (police per capita × clearance), adjusted by the concentration effect;
- recorded offences, as a reporting-rate thinning of true offences;
- arrests and releases;
- migration, by wage gap and gravity;
- REG-style trade: imports = μ·Y, and exports equal the partner's imports.

**Inter-settlement layer:** a single national government and central bank, as in REG, with regions holding the L3 rural remainder. Use Hamilton apportionment for any national-to-settlement allocation.

**Emulator pipeline:**
1. Run the L0 city headless in Node over a design of seeds × sizes × police shares × unemployment shocks, logging daily flows and states per district.
2. Fit each flow hazard as a binned lookup table or a GLM evaluated in integer or fixed-point arithmetic. This stays deterministic and small; avoid neural networks in the core.
3. Dock: compare L2 trajectories with agent fold-ups on means, variances, autocorrelations and concentration. Accept a fit when it lies within the seed-to-seed spread of the agent model.
4. Keep the in-game divergence meter (3.4) as continuous validation.

**Noise:** keep integer stochastic flows. My implementation uses stochastic rounding when the mean is below 8, and otherwise a normal approximation from a 4,096-entry inverse-normal table plus `sqrt`, which is exactly specified. This preserves village-scale variability that a deterministic mean field erases.

**Crime fields:** use the lattice mean-field (or continuum PDE) only at L1 and L0. L2 carries only volume plus a concentration index. Add police reaction delay in L1 if hot-spot policing oscillations matter (arXiv 2605.17709).

### Gaps
- I found no published emulator of Lengnick 2013 or of a Short-type model at settlement scale; its quality is unknown until the project builds one.
- I read only the pysolve notebooks of Godley–Lavoie, not the book; for example, REG's steady-state comparative statics were not opened.
- Snippets do not say which continuum formulation the 2026 preprint compares against agents, or under what parameters.

## 5. Browser budget: settlements, cells and agents per second in a worker; WebGPU; memory; saves

### Takeaway
On one desktop-class core (own measurements):
- An aggregate settlement-day costs about 0.5 µs, so 10k settlements take about 5 ms per simulated day and 1M take about 0.5 s.
- Individual agents cost about 50–90 ns per tick, so 100k agents take about 5 ms per tick and 1M about 49 ms.
- Saves are small: a 10k-settlement country is about 0.22 MB gzipped, and a 100k-agent city plus its field is about 1.3 MB.

WebGPU could run a million simple agents within its default limits, but WGSL lets implementations reassociate and fuse float operations. A GPU core would therefore not be bit-reproducible across devices unless it is integer-only. Phones still need a CPU fallback, and so do Firefox on Linux and Android and Intel Macs, which lack WebGPU.

### Cited Findings
**Own measurement: aggregate settlement model.** Each settlement-day runs 11 keyed stochastic flows and integer-cent transfers, then plans and applies migration and trade to 4 neighbours. Money stays zero-sum including MINT, and population is conserved.

| settlements | ms per day-step | ns per settlement-day | settlement-days per second | ledger exactly 0 | population conserved |
|---|---|---|---|---|---|
| 1,000 | 0.54 | 536 | 1.87M | yes | yes |
| 10,000 | 5.06 | 506 | 1.98M | yes | yes |
| 100,000 | 50.8 | 508 | 1.97M | yes | yes |
| 1,000,000 | 498 | 498 | 2.01M | yes | yes |

Source: [bench_agg.mjs](../prototypes/lod/bench_agg.mjs) (own measurement)

**Own measurement: individual agents.** SoA arrays at 34 B per agent on a 256×256 map. Each tick: movement, police climbing the hotspot field, a Becker/Epstein-style offence decision with a random victim (cache-unfriendly), purchases at random merchants, and decay and diffusion of a 65,536-cell field. Money is conserved.

| agents | ms per tick | ns per agent-tick | max ticks per second |
|---|---|---|---|
| 10,000 | 0.87 | 86.5 | 1,155 |
| 25,000 | 1.54 | 61.7 | 649 |
| 100,000 | 5.17 | 51.7 | 193 |
| 1,000,000 | 49.1 | 49.1 | 20 |

Source: [bench_abm_grid.mjs](../prototypes/lod/bench_abm_grid.mjs) (own measurement)

**Own measurement: mean-field crime lattice.** Expected burglars and attractiveness per cell, using the Short discrete-model update with a 4-neighbour biased walk; 40 B per cell (Float64).

| grid | cells | ms per step | ns per cell |
|---|---|---|---|
| 256×256 | 65,536 | 1.77 | 27.0 |
| 512×512 | 262,144 | 7.71 | 29.4 |
| 1024×1024 | 1,048,576 | 32.4 | 30.9 |

Source: [bench_abm_grid.mjs](../prototypes/lod/bench_abm_grid.mjs) (own measurement)

**Own measurement: save sizes.**
- 10k settlements after a simulated year, 13 typed arrays: 680,000 B raw (68 B per settlement), 224,406 B gzip-6, 182,174 B brotli.
- 100k agents after 100 ticks plus a 256×256 Float32 field: 3,662,144 B raw, 1,337,909 B gzip-6, 1,085,609 B brotli.

Sources: [bench_agg.mjs](../prototypes/lod/bench_agg.mjs), [bench_abm_grid.mjs](../prototypes/lod/bench_abm_grid.mjs) (own measurement)

**WebGPU limits (spec):** maxStorageBufferBindingSize 134,217,728 B (128 MiB), maxBufferSize 268,435,456 B (256 MiB), maxComputeInvocationsPerWorkgroup 256 (128 in compatibility mode), and maxComputeWorkgroupsPerDimension 65,535. — [gpuweb spec/index.bs](https://github.com/gpuweb/gpuweb/blob/main/spec/index.bs) (opened)

**WGSL floating point (spec):**
- "An implementation may reassociate operations. An implementation may fuse operations if the transformed expression is at least as accurate as the original formulation."
- `x + y` is correctly rounded, but `exp(x)` is accurate only to 3 + 2·|x| ULP for f32. The `fma` builtin may expand to a separate multiply and add.
- Atomic types must be u32 or i32, plus `atomic<vec2<u32>>`.

Source: [gpuweb wgsl/index.bs](https://github.com/gpuweb/gpuweb/blob/main/wgsl/index.bs) (opened)

**WebGPU browser support** (MDN browser-compat-data `api/GPU.json`):

| Browser | WebGPU support |
|---|---|
| Chrome desktop | 113 (ChromeOS, macOS, Windows; marked partial); 144 adds Linux on Intel Gen12+ GPUs |
| Chrome Android | 121 |
| Safari / iOS | 26 (iOS mirrors Safari) |
| Firefox desktop | 141, partial: Windows from 141; Apple-silicon macOS Tahoe from 145; older Apple-silicon macOS from 147; no Intel macOS; no Linux |
| Firefox Android | none |

Source: [mdn/browser-compat-data api/GPU.json](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json) (opened)

**Published WebGPU demos:**
- A galaxy with more than 1 million stars at 60 FPS, "Simulating 30 Million microbes in Browser", and 250,000 particles simulated and drawn on the GPU. — [Three.js Roadmap](https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders), [DEV Community](https://dev.to/gigafloppa/simulating-30-million-microbes-in-browser-3n86), [Medium](https://medium.com/@dev48v/webgpu-i-simulated-250-000-particles-entirely-on-the-gpu-in-the-browser-e5c64eb61c4f) (snippet only)
- A position-based crowd simulation uses WebGPU compute shaders "in replacement of CUDA kernels", with a hash-grid neighbour finder and agent counts selectable in powers of 2. Its README gives no performance numbers. — [wayne-wu/webgpu-crowd-simulation](https://github.com/wayne-wu/webgpu-crowd-simulation) (opened)

**Other frameworks:** mesa-frames, on Polars DataFrames, claims a practical maximum of "~10^6+" agents against "~10^3" for classic Mesa, and up to 10× faster bulk updates on 10k+ agents. It is "not a good fit" when "your model depends on strict per-agent sequencing". — [mesa-frames README](https://github.com/projectmesa/mesa-frames) (opened)

**Project tiers from the sibling notes:** offer 25k agents on phones only if p95 at 10k is ≤ 1.5 ms per tick at 30 Hz. 100k agents × ~16 four-byte fields = 6.4 MB. — [engineering_gaps.md](../../round-2-follow-up/notes/engineering-gaps.md) (sibling notes)

### Inferences
- **Desktop budget.** A 30 Hz frame allows 33 ms. L0 at 100k agents takes ~5 ms per tick (more for the real model). L2 for 10k settlements takes ~5 ms per simulated day; spread over the ticks in a day, that is negligible. L1 neighbours cost microseconds.
- **Phones.** Assume 2–4× slower per core (background, unverified) and a 25k cap: L0 ≈ 3–6 ms per tick, and L2 for 10k settlements ≈ 10–20 ms per day. Time-slice the day step and commit it at the day boundary.
- **Country size.** A country of tens of millions as 10k L2 settlements plus L3 regions costs ≈ 5 ms per simulated day on desktop. A finer grid of 100k census-tract-like units (≈ 50 ms per day) is fine at 1–5 days per second but not at 30.
- **Crime lattices stay local:** the L0 city (256² ≈ 1.8 ms per step) and L1 neighbours (16² per city ≈ 8 µs). A national lattice is unaffordable at Short's δt.
- **Memory.**
  - L0: 34–64 B per agent, so 100k ≈ 3.4–6.4 MB and 1M ≈ 34–64 MB.
  - L2: ~100–1,000 B per settlement depending on compartments, so 10k ≈ 1–10 MB.
  - Persistence caches: tens of KB per city.
- **Save size.** Country (≈ 0.22 MB gzip) + focused city (≈ 1.3 MB) + an LRU of notables and fields ≈ 1.5–2 MB per save, or less with seed-plus-checkpoint designs. Browser `CompressionStream` offers gzip and deflate; brotli support is background, unverified.
- **WebGPU: feasible in principle.** 1M agents × 64 B = 64 MB fits one storage binding (≤ 128 MiB), and 1M ÷ 256 = 3,907 workgroups, well under 65,535.
- **WebGPU and determinism.** To keep a GPU core canonical and deterministic you would need:
  - integer-only kernels;
  - no order-dependent logic, such as first-come atomic claims;
  - reductions only through integer atomics, which are associative.

  Otherwise, use WebGPU only for non-canonical ambient "puppet crowds" or rendering. The current renderer is WebGL2, so GPU compute results would need readback or a renderer port (inference).

### Gaps
- No measurements on real phones or inside a browser worker; these are Node only (same V8 JIT family, different CPU).
- No WebGPU measurement: the container has no GPU.
- My aggregate and agent models are simplified stand-ins. The real Lengnick + crime model will cost more per agent; use the sibling notes' in-app calibration.
- The 1M-star galaxy and 30M-microbe demos give no hardware details (snippets only).

## 6. Prior art at national scale (Axtell, BeforeIT, EURACE and village-to-country projects)

### Takeaway
National-scale ABMs exist but run on workstations or HPC: Axtell's 120M-agent US private sector, BeforeIT.jl at 1:1 for Austria, EURACE on FLAME, and AgentTorch's 8.4M-agent New York City. BeforeIT at 1:1 takes about 47 s per simulated quarter on one core.

None of them runs in a browser or switches level of detail around a viewer. Games span village to country only through abstraction: Songs of Syx, Dwarf Fortress, Bannerlord and Paradox pops. I found no browser project that goes from individuals to a whole country.

### Cited Findings
- **Axtell,** "120 Million Agents Self-Organize into 6 Million Firms: A Model of the U.S. Private Sector" (AAMAS 2016):
  - a full-scale agent model of the US private sector, with some 120 million agents;
  - calibrated to firm sizes, ages, growth rates, job tenure and labour flows;
  - the agent level stays in perpetual disequilibrium while aggregates approach a steady state;
  - reproduces "more than two dozen" empirical features without exogenous shocks;
  - made possible by large-scale parallel agent computing.

  Source: [AAMAS paper PDF (GMU)](https://cmepr.gmu.edu/wp-content/uploads/2017/09/Axtell-AAMAS-p806.pdf) (snippet only)
- **BeforeIT.jl** (Bank of Italy) is a Julia framework based on Poledna et al., "Economic forecasting with an agent-based model". The README calls that "the first ABM matching the forecasting performance of traditional economic tools". It ships Austria and Italy parametrisations, and CalibrateBeforeIT.jl can initialise all 27 EU member states (work in progress). — [README](https://github.com/bancaditalia/BeforeIT.jl) (opened via git clone, commit 060a206, 2026-07-31)
- **BeforeIT scale:**
  - `get_params_and_initial_conditions(...; scale = 0.001)` is the default.
  - The Italy example says "The model is in scale 1:2000, so it has around 30,000 households".
  - The benchmark example hard-codes time per step on an AMD Ryzen 5 5600H at 1:1:

| implementation | time per step at 1:1 |
|---|---|
| Julia, 1 core | ≈ 46.7 s |
| Julia, 4 threads | ≈ 21.6 s |
| MATLAB | ≈ 1,996 s |
| Generated C, 1 core / 4 cores | ≈ 575 s / 210 s |
| HPC implementation (Gill et al. 2021), 4 cores | 22.9 s |

  The HPC figure comes from Gill et al. 2021, "High-performance computing implementations of agent-based economic models for realizing 1:1 scale simulations of large economies". The README's example runs "20 quarters", so a step is a quarter. Sources: [examples/benchmark_w_matlab.jl](https://github.com/bancaditalia/BeforeIT.jl/blob/main/examples/benchmark_w_matlab.jl), [examples/multithreading_speedup.jl](https://github.com/bancaditalia/BeforeIT.jl/blob/main/examples/multithreading_speedup.jl), [src/utils/calibration.jl](https://github.com/bancaditalia/BeforeIT.jl/blob/main/src/utils/calibration.jl) (opened)
- **EURACE:**
  - an EU FP6 project to build an agent-based model of the European economy "with a very large population" of agents;
  - built on FLAME (University of Sheffield with STFC Rutherford Appleton Laboratory);
  - eight modules covering firms, households, malls, banks and governments;
  - the complete model was demonstrated with populations from a few hundred to tens of thousands of agents;
  - FLAME's benchmark test model used 10^6 simple agents that only communicate their (x,y) position.

  Sources: [EURACE, *Applied Mathematics and Computation* (2008)](https://www.sciencedirect.com/science/article/abs/pii/S0096300308003019), [STFC report RAL-TR-2012-006](https://epubs.stfc.ac.uk/manifestation/7678/RAL-TR-2012-006.pdf) (snippet only)
- **AgentTorch:** 8.4 million synthetic NYC agents. The labour-market model uses LLM archetypes; the COVID model uses heuristic execution (see Question 1). — [model card](https://github.com/AgentTorch/AgentTorch/blob/master/agent_torch/models/macro_economics/model_card.md) (opened)
- **FLAME GPU 2:** a GPU agent-based framework in release-candidate state. Its performance paper is "FLAME GPU 2: A framework for flexible and performant agent based simulation on GPUs" (*Software: Practice and Experience*, doi:10.1002/spe.3207). — [README](https://github.com/FLAMEGPU/FLAMEGPU2) (opened; no agent-count benchmarks in the README)
- **Games that span scales:** Songs of Syx (simulated factions and regions around a detailed city), Dwarf Fortress (world populations and historical figures around a detailed site), Bannerlord (world-map parties and simulated battles around live missions), and Stellaris (pop groups). Evidence and source labels are in Question 2.

### Inferences
- Even a 1:1 national model at quarterly steps needs tens of seconds per step on a desktop (BeforeIT). A browser cannot run a country as individuals at daily resolution. Aggregates for the country plus individuals in focus is the only feasible design, and every precedent found uses some form of it.
- The closest structural precedent for this design is microsimulation with alignment (LIAM2) combined with game-style instance spawning from counts (Dwarf Fortress, Cities: Skylines), not national ABMs. National ABMs use 1:1 or fixed scale factors (BeforeIT `scale`), not viewer-driven level of detail.
- BeforeIT's `scale` parameter (1:1000 by default, 1:2000 for Italy) is a fixed super-individual-style down-scaling for a whole economy. Its authors still benchmark 1:1, which suggests they treat scale effects as a cost to measure rather than ignore (inference).

### Gaps
- Axtell's paper could not be opened, so its hardware, runtime and memory per agent are unknown.
- EURACE's largest run sizes and runtimes are snippet-only.
- The Austrian population at BeforeIT's 1:1 scale (number of agents) is not stated in the files I read.
- I found no browser or open-source game that spans village → city → country with individuals in focus. Songs of Syx is closest in genre but closed source. A dedicated search for browser projects was not possible within the budget.
