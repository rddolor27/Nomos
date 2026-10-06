# Prior art and ethics for fictional, learned cultures (round 8, question 3), status 6 October 2026

Conventions:
- **Labels:** "opened" (read in full), "search summary" (seen only in a search result), "computed", "measured here" and "inference", per `.claude/rules/docs.md`.
- **"opened (Steam News API)":** the full text of an official dev diary, fetched on 6 Oct 2026 from `api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=<id>&count=1000&maxlength=0` (CK3 1158310, Victoria 3 529340, Norland 1857090). The Steam posts reproduce the forum diaries. The forum itself returned a browser challenge.
- **"opened (community wiki)":** full wikitext read through the wiki's MediaWiki API (rimworldwiki.com, dwarffortresswiki.org). Community wikis are secondary and can lag patches, so each citation gives the revision ID.
- **"opened (WebFetch extract)":** the page was fetched whole but read through WebFetch's extraction model, because the host blocks plain HTTP clients (the Paradox wikis and some publishers). Quotes are as the extractor returned them, so exact wording is slightly less certain than "opened".
- **Papers:** "opened" means the full text was read: from PubMed Central, an author-hosted PDF or a third-party PDF copy, as stated.
- **Access:** paradoxwikis.com and forum.paradoxplaza.com returned a "Client Challenge" to curl. The main cbc.ca site returned 403, but CBC Lite worked. PC Gamer article bodies and two interviews did not load. SAGE and Wiley pages were paywalled.
- **Scope:** prior art and ethics only. Transmission is in `transmission.md`; how customs feed preferences is in `customs-preferences.md`.
- **Copying:** quotes are kept short. No game text, image, asset or code was copied into the repo.

## a) Game prior art on cultures

### Takeaway
- **Every major game ties culture or species to mechanics Nomos forbids.** CK3 ethoses grant combat bonuses (Bellicose: +2 prowess, +10% levy size). Stellaris species traits are "innate functions, abilities, and personality" (Intelligent: +10% researcher output). RimWorld genes make whole xenotypes aggressive (×2–×3 social fights). Dwarf Fortress gives each species its own theft and lying ethic.
- **The structures are worth borrowing without the bonuses.** CK3's acceptance is a symmetric 0–100% number per pair of cultures, raised by contact and decaying to a baseline. Victoria 3's "obsessions" are favourite goods that can emerge when a good is locally abundant. RimWorld's certainty falls about 6% per conversion attempt before modifiers and recovers 1–3% a day, and a child adopts a belief at age 3, weighted by who interacted with them.
- **Victoria 3 puts discrimination in law, not in culture.** Each pop's acceptance (0–100, five statuses) comes from Citizenship and Church & State laws plus community age. It is the clearest model of systemic discrimination. It also shows how such a lens recreates real racism: its United States starts under Racial Segregation.
- **Players reject forced identity change and opaque effects.** Civilization VII's forced civ switching drew enough criticism that its 19 May 2026 update let players "start and stay as any civilization". Real cultures need consultation: the Poundmaker Cree Nation objected in 2018 to its unconsulted portrayal in Civilization VI.
- **Dwarf Fortress shows invented cultures at scale.** It generates a per-world language from random sound pools (words VC to CVCVC), gives names "not inherited from the parents", and generates music, poetry and dance forms "by culture" with invented instruments, scales and rhythms.

### Cited Findings

**Crusader Kings III**
- Cultures were reworked in 2021 into five pillars: Ethos, Heritage, Language, Martial Custom and Aesthetics, plus up to five traditions that grow by one per era. Aesthetics sets clothes, coats of arms, architecture, armour and "naming practices". Traditions give "flavour or gameplay bonuses"; one, "Only the Strong", is cheaper with six knights of prowess 12 or more. — [Dev Diary #64 "Cultures Are Forever", 15 Jun 2021](https://store.steampowered.com/news/app/1158310/view/5019805792179151642) (opened, Steam News API)
- Acceptance is "how well intermingled two cultures are". It is a percentage shared by both cultures: at 0% the "different culture" opinion penalty applies in full, and at 100% it vanishes. A baseline rises with shared religion, ethos and language, and most with shared heritage. Above the baseline acceptance decays; below it, it never rises by itself ("A bad relation between cultures won't disappear overnight"). Living in one realm raises it; war or revoking titles lowers it, more so for small cultures. — [Dev Diary #64](https://store.steampowered.com/news/app/1158310/view/5019805792179151642) (opened, Steam News API)
- Current values (PC 1.20): +20 baseline for shared heritage, +10 for shared language, +10 for shared ethos in the same region. A hybrid culture needs 40% acceptance and starts at 100% with both parents. A divergent culture gets a conversion bonus in the parent's counties for 50 years. Bellicose gives "+2 Prowess" and "+10% Levy Size"; Stoic gives "−15% Stress Gain". — [CK3 Wiki: Culture](https://ck3.paradoxwikis.com/Culture) (opened, WebFetch extract)
- Knowing another culture's language halves the "Different Culture" opinion penalty. The "Learn Language" scheme gives young children "a vastly increased chance of success/progress, by virtue of being young". — [Dev Diary #77 "Becoming a Polyglot", 12 Oct 2021](https://store.steampowered.com/news/app/1158310/view/4069556867222418917) (opened, Steam News API)
- Court languages form a "pecking order": the grandest court of a language gains grandeur from every court that adopts it. Language is thus a prestige ranking. — [Dev Diary #78 "Taking Language to Court", 19 Oct 2021](https://store.steampowered.com/news/app/1158310/view/4698935641773317560) (opened, Steam News API)
- After player feedback, rulers can "reform" a culture (ethos, martial custom, traditions) instead of founding a new one. Changes take longer in larger cultures, only one may be pending, and heritage and language cannot be swapped. The designer closed with "Giving valid and constructive criticism does, at times, pay off." — [Dev Diary #79 "An Update on Cultures", 26 Oct 2021](https://store.steampowered.com/news/app/1158310/view/4103335143123739417) (opened, Steam News API)

**Victoria 3**
- A pop is one unit per combination of profession, culture, religion and workplace. "Every Pop is visualized so you can see which demographic sports the best moustache." — [Dev Diary #1 "Pops", 27 May 2021](https://store.steampowered.com/news/app/529340/view/4069544815356705730) (opened, Steam News API)
- Discriminated pops "have barely any Political Strength and cannot vote", "get paid substantially less", find qualifications harder and feed radicalism and turmoil. Status comes from five Citizenship laws (Ethnostate, National Supremacy, Racial Segregation, Cultural Exclusion, Multiculturalism) and three Church & State laws. — [Dev Diary #47 "Conversion and Assimilation", 19 May 2022](https://store.steampowered.com/news/app/529340/view/4292505348825755143) (opened, Steam News API)
- Conversion and assimilation run at 0.2% a month, "almost 30 years" for half a population; with maximum effort half assimilates in about 18 years. Only accepted pops assimilate, never in their homeland, and only into a primary culture. The game's United States starts under Racial Segregation, so Indigenous and African-American pops are discriminated against until the law changes. — [Dev Diary #47](https://store.steampowered.com/news/app/529340/view/4292505348825755143) (opened, Steam News API)
- Cultures carry traits: a language and a heritage, "where a certain culture originated from geographically". "Obsessions" tie a culture to a good it pays more for ("the French culture being obsessed with wine"). Obsessions "can emerge organically" when a good is abundant in a market, while religious taboos never change. A Comanche leader gets "culturally defined clothes and headdress". — [Dev Diary #56 "Cultures and Religions", 25 Aug 2022](https://store.steampowered.com/news/app/529340/view/4514316500003104117) (opened, Steam News API)
- The 2024 rework replaced binary discrimination with acceptance from 0 to 100, set mainly by laws, and five statuses "from Full Acceptance to Violent Hostility". Status sets tax burden and access to government jobs and the military. An immigrant community "fresh off the boat" starts lower than one present for 30 years. Progressive laws take effect only gradually. — [Dev Diary #129 "Discrimination Rework", 26 Sep 2024](https://store.steampowered.com/news/app/529340/view/6339469370182122616) (opened, Steam News API)
- The 2025 nationalism update opens with a limits statement: "we make certain abstractions and assumptions for gameplay purposes" and "cannot claim to have developed the most accurate possible simulation of reality". It adds that "Cultures in Victoria 3 are broad abstractions, encompassing thousands of local variations", and models national feeling after Benedict Anderson's *Imagined Communities*. — [Dev Diary #154 "Imagined Communities", 14 Aug 2025](https://store.steampowered.com/news/app/529340/view/1808061939341454) (opened, Steam News API)

**Dwarf Fortress**
- There are six languages. Four have fixed vocabularies of 3,301 words over 2,196 roots, with "no real morphology". — [DF Wiki: Language, rev 318568](https://dwarffortresswiki.org/index.php/Language) (opened, community wiki)
- The divine language is generated per world from random consonant and vowel pools, without diacritics. Every word is VC, CVC, VCV, CVCV, VCVC or CVCVC, and 80% of sounds come from a short list of five. — [DF Wiki: Divine language, rev 305522](https://dwarffortresswiki.org/index.php/Divine_language) (opened, community wiki)
- First and last names are given at birth and are "quite random"; "neither name is inherited from the parents". Each civilisation's chosen word themes bias names: dwarves favour "artifice" words and never use "flowery" ones. — [DF Wiki: Name, rev 313447](https://dwarffortresswiki.org/index.php/Name) and [Language](https://dwarffortresswiki.org/index.php/Language) (opened, community wiki)
- Each civilisation has ethics tokens, including THEFT, LYING, ASSAULT and VANDALISM. Goblins treat theft, lying and assault as a "Personal matter", while dwarves and humans give theft "Serious punishment". Conflicting ethics "often trigger wars during world generation". — [DF Wiki: Ethic, rev 320629](https://dwarffortresswiki.org/index.php/Ethic) (opened, community wiki)
- Festivals arise from fairs, temples or commemorations. Their programmes come from the civilisation's "values and ethics": performances, competitions, processions, "candle processions, poetry recitals, foot races". — [DF Wiki: Festival, rev 276864](https://dwarffortresswiki.org/index.php/Festival) (opened, community wiki)
- Tarn Adams posted generated musical forms in February 2015, "examples from different civilizations". Each names invented instruments, a scale system, rhythms with named beats, tempo and loudness. Forms from one civilisation share rhythm patterns and "the same scale system". — [Bay 12 Games: early musical forms, 26 Feb 2015](http://www.bay12games.com/dwarves/early_musical_forms.html) (opened)
- "Poetic, musical and dance forms will be generated by culture", with knowledge and skill components. — Tarn Adams, quoted in [DF Wiki: Performer, rev 313291](https://dwarffortresswiki.org/index.php/Performer) (opened, community wiki)

**RimWorld**
- Ideology (20 Jul 2021) gives "each person in the game" a belief system. Beliefs "guide preferences around food, comfort, love, technology, and violence" and make people "desire different apparel and tattoos". Styles include "Totemic: A tribal-inspired look" and imagery descended from Hindu, Christian, Islamic and Buddhist traditions. Rituals range from skylantern festivals to cannibal feasts, blindings and gladiator duels. — [RimWorld Wiki: Ideology (DLC), rev 173598](https://rimworldwiki.com/wiki/Ideology_(DLC)) (opened, community wiki, quoting the store text)
- Aggressive beliefs may make colonists "demand" raids, and a trial lets the convicted be "punished without social consequences". — [Ideology (DLC)](https://rimworldwiki.com/wiki/Ideology_(DLC)) (opened, community wiki)
- Belief is learned. Certainty drops with each conversion attempt (6% × modifiers), which also happens "during day-to-day conversation". It recovers 1% a day at mood 20% or less and 3% at 80% or more. A convert starts at 50%. — [RimWorld Wiki: Certainty, rev 183826](https://rimworldwiki.com/wiki/Certainty) (opened, community wiki)
- A child gets an ideoligion at age 3 by "weighted random selection", weighted by which believers interacted with the baby; any belief it was exposed to can win. — [RimWorld Wiki: Children, Ideoligion section](https://rimworldwiki.com/wiki/Children) (opened, community wiki)
- Xenotypes are innate and partly inherited ("Germline genes are freely distributed through and only through reproduction"). Genies are "great at crafting and intellect, but are fragile and otherwise socially inept"; Neanderthals are "slow to learn"; Hussars are "great at combat"; Highmates are "incapable of violence". — [RimWorld Wiki: Xenotypes, rev 174905](https://rimworldwiki.com/wiki/Xenotypes) and [Genes, rev 184104](https://rimworldwiki.com/wiki/Genes) (opened, community wiki)
- The Aggressive gene doubles social fights and violent breaks and is carried by four xenotypes. Hyper-aggressive triples fights and is carried by Hussars. — [Genes, Violence section](https://rimworldwiki.com/wiki/Genes) (opened, community wiki)
- Tribes are "nominally neolithic tech level factions" in gentle, fierce and savage variants, the savage ones "permanently hostile". A "savage impid tribe" always consists of the Impid xenotype. — [RimWorld Wiki: Tribes, rev 183576](https://rimworldwiki.com/wiki/Tribes) (opened, community wiki)

**Stellaris**
- "Species traits represent a species' innate functions, abilities, and personality." Traits are set per species; genetic modification can split subspecies. — [Stellaris Wiki: Species traits, v4.4](https://stellaris.paradoxwikis.com/Species_traits) (opened, WebFetch extract of the raw wikitext)
- Biological traits (v4.5): Intelligent "+10% Researcher job efficiency"; Strong "+20% Army damage"; Weak "−20% Army Damage"; Repugnant "−20% Influential job efficiency"; Decadent "−10% Worker happiness"; Slow Learners "−10% Leader experience gain". — [Stellaris Wiki: Biological traits](https://stellaris.paradoxwikis.com/Biological_traits) (opened, WebFetch extract of the raw wikitext)
- Citizenship types run from Full Citizenship to Slaves and "Undesirables" (purged, −100% political power). Xenophobe empires cannot grant aliens full citizenship without a special civic. — [Stellaris Wiki: Species rights, v4.4](https://stellaris.paradoxwikis.com/Species_rights) (opened, WebFetch extract)

**Civilization and Humankind**
- Poundmaker Cree Nation headman Milton Tootoosis said the Civilization VI portrayal "perpetuates this myth that First Nations had similar values that the colonial culture has, and that is one of conquering other peoples". He said nobody consulted the Nation, and 2K had not responded by publication. — [CBC News, David Shield, 4 Jan 2018](https://www.cbc.ca/lite/story/1.4473089) (opened, CBC Lite)
- For Civilization VII, Firaxis worked with the Shawnee Tribe from 2021: the Shawnee language in game, cultural knowledge-keepers and a Shawnee voice actor. The studio says it takes "great care to thoughtfully and authentically portray every culture on our roster". — [Civilization VII: Shawnee Tribe partnership](https://civilization.2k.com/civ-vii/news/civilization-vii-shawnee-tribe-partnership/) (opened, WebFetch extract)
- Civilization VII made players switch civilisation at each age, around the pillar "history is built in layers". — [Rappler interview](https://www.rappler.com/technology/gaming/civilization-vii-interview-ages-system-dennis-shirk/) (search summary; the page returned 403)
- The Test of Time update lets players "start and stay as any civilization from any Age". The page lists the feedback it answers: a broken series tradition, lost agency and forced transitions that felt jarring. It promises "no break in identity". — [Civilization VII: Time-Tested Civs](https://civilization.2k.com/civ-vii/game-guide/gameplay/time-tested-civs/) (opened, WebFetch extract). Release date 19 May 2026 — [official patch notes URL](https://civilization.2k.com/civ-vii/game-update-notes/2026-may-19-patch-1-4-0/) (search summary)
- Civilization VII replaced barbarians with "Independent Powers" that can be befriended into city-states. — [Civilization Wiki: Independent Power (Civ7)](https://civilization.fandom.com/wiki/Independent_Power_(Civ7)) (search summary)
- Humankind's switch of culture each era drew complaints that the name changes break immersion and make rivals hard to track. — [Ancient World Magazine review](https://www.ancientworldmagazine.com/reviews/humankind-game/) and [Amplitude forum thread](https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design-and-ideas/threads/51298-why-the-culture-change-mechanic-was-a-bad-idea) (search summary)

### Inferences
- **Legible.** The devices players can read are single numbers with stated causes: CK3's acceptance percentage, Victoria 3's acceptance status and RimWorld's certainty bar. Nomos can show a person's custom mix and a district's custom shares the same way, with the reason in click-to-explain.
- **Fair, as players judge it.** Players accept culture change they choose and resent change forced on them (Civilization VII, Humankind). In Nomos, switching should be gradual, caused by visible contact, and shown as a personal history rather than a sudden relabel.
- **Borrow the shapes, drop the payloads.** CK3's pillars become a bundle of preference-only customs: foods, festivals, music, naming, home region. Acceptance and certainty become rates of learning, never opinion penalties that change trade, jobs or trust.
- **Obsessions are a neat dynamic for favourite foods.** A favourite food can emerge from what is locally abundant. That ties customs to places and harvests (round 6) instead of authored themes, which lowers the chance of a real-world food stereotype.
- **Avoid every innate group trait.** Stellaris, RimWorld xenotypes and Dwarf Fortress ethics all make group membership predict ability, temperament or crime. That is the essentialist structure Nomos exists to argue against (see b).
- **Victoria 3's lesson is double-edged.** It shows that discrimination is institutional and policy-made, which is correct. In a crime toy, the same lens would put real racial disparities on screen with fictional labels, so Nomos should name it on the "What this toy leaves out" page rather than simulate it.
- **Prestige hierarchies leak.** CK3's language pecking order and RimWorld's "neolithic" tribes rank cultures. Nomos needs no ranking of cultures, languages or "development".

### Gaps
- The CK3 Dev Diary #65 on hybrids and divergence was not readable: the forum blocked access and the Steam feed has no copy. Its rules come from the wiki extract only.
- Paradox wiki pages were read only through WebFetch extracts, so exact numbers there are slightly less certain.
- No designer talk on CK3 or Victoria 3 culture was found. Player views on fairness come from patch feedback and the Civilization VII page, not from surveys.
- Civilization VI's civilisation abilities were not catalogued. Humankind and the Civilization VII "layers" interview are search summaries only.

## b) Explorables and education

### Takeaway
- **Abstract labels do not stop stereotypes forming.** In Hamilton & Gifford's design, observers read about "Group A" and "Group B" and still linked the smaller group with rare bad acts. A meta-analysis found the effect "of moderate strength": r = 0.34 over 28 tests of frequency estimates and r = 0.26 over 23 tests of group assignment. It is stronger when the rare behaviour is negative and when more events are shown. That is exactly a stream of crime events in a simulation.
- **Wording can essentialise a fictional group.** Generic sentences about the invented "Zarpies" ("Zarpies are scared of ladybugs") raised adults' odds of essentialist answers 6.07 times [4.56–8.08] against unlabelled sentences. Four-year-olds showed the same pattern.
- **Lessons about fictional groups do transfer to real ones, both ways.** Six weekly Harry Potter sessions improved 34 children's attitudes toward immigrants, but only for those who identified with Harry (weak evidence). Polygons and Survival of the Best Fit rely on this transfer: equal-size abstract groups, with bias placed in individual rules or institutional data.
- **Classroom simulations of fictional cultures can backfire.** BaFá BaFá raised students' ethnocentrism and dogmatism in a 1993 study (search summary). Jane Elliott's eye-colour exercise (n = 47) improved some attitudes but caused distress (search summary). In Tiltfactor's small studies, a deck with fewer bias-themed cards worked better (89% against 63%), and one game of *Buffalo* raised social identity complexity (n = 38).
- **Strength of evidence:** illusory correlation is meta-analytic and robust in the lab; generic-language essentialism rests on well-controlled experiments from one lab; transfer and game-intervention studies are small or correlational. No study tested whether an abstract group in a simulation changes stereotypes of real groups.

### Cited Findings
- Polygons opens "This is a story of how harmless choices can make a harmful world." Its shapes are "50% Triangles, 50% Squares, and 100% slightly shapist", and each wants to move "if less than 1/3 of my neighbors are like me". It concludes "Small individual bias can lead to large collective bias" and "it's not about triangles vs squares". It credits Schelling, says "we gave his model a happy ending" and links W.A.V. Clark's 1991 test with real data. — [ncase/polygons index.html](https://github.com/ncase/polygons/blob/gh-pages/index.html) (opened)
- We Become What We Behold uses "Circle People" and "Square People" for a media feedback loop. — [WBWWB post-mortem](https://github.com/ncase/blog/blob/main/src/posts/we-become-what-we-behold-a-post-mortem.md) (opened in round 2, `docs/research/round-2-follow-up/notes/presentation-launch-ethics.md`)
- Survival of the Best Fit (2019, NYU Abu Dhabi students, Mozilla Creative Media Award) shows "how using ML in hiring practices can reinforce workforce inequality". The repository has no licence, so it is study-only. — [survivalofthebestfit README](https://github.com/survivalofthebestfit/survivalofthebestfit/blob/master/README.md) (opened). Its applicants are abstract blue and orange people, and the model learns to favour blue ones because past hires were mostly blue. — [TechTalks](https://bdtechtalks.com/2019/07/08/ai-bias-survival-of-the-best-fit/) (search summary)
- The known critique of Schelling-style toys is that they omit "institutional causes of segregation", while real segregation "is generally not a symmetric process". — [arXiv 0907.1777](https://arxiv.org/pdf/0907.1777) (search summary, round 2)
- Mullen & Johnson integrated the illusory-correlation literature. Combined effects: estimation, k = 28 tests, r = 0.344 (d = 0.73); assignment, k = 23, r = 0.259 (d = 0.54), both "highly significant" and heterogeneous. Effects were "stronger when the distinctive behaviour is negative" and grew with "the number of exemplars presented". — [Mullen & Johnson 1990, *Brit. J. Soc. Psychol.* 29:11–28](https://bulidomics.com/w/images/2/29/Mullen1990.pdf) (opened, third-party PDF copy)
- Hamilton & Gifford (1976) used abstract groups "so that no previously established stereotypes would influence results"; the minority group was rated more negatively. — [Wikipedia: Illusory correlation](https://en.wikipedia.org/wiki/Illusory_correlation) (search summary)
- Children also link infrequent behaviours with minority groups. — [Primi & Agnoli 2002, *Cognitive Development*](https://www.sciencedirect.com/science/article/abs/pii/S088520140200076X) (search summary; authors and year from Crossref metadata)
- Rhodes, Leslie & Tworek introduced "Zarpies" in a storybook whose characters "were diverse with respect to sex, race, and age". Generic wording ("Zarpies are scared of ladybugs") raised essentialist answers over specific wording ("This Zarpie is scared of ladybugs!") and no label; for adults the odds ratio was 6.07 [95% CI 4.56–8.08]. Parents told Zarpies were "a distinct kind of people" used generics in 14.3% of references against 6.0%, and made more negative remarks (2.55 against 0.70). — [Rhodes et al. 2012, *PNAS* 109:13526, PMC3427061](https://pmc.ncbi.nlm.nih.gov/articles/PMC3427061/) (opened)
- High perceived entitativity leads perceivers to abstract a group stereotype and transfer it to all members; "additional exemplars are processed in terms of this group impression, not as individuals". — [Crawford, Sherman & Hamilton 2002, *JPSP* 83:1076](https://www.researchgate.net/publication/11048735_Perceived_entitativity_stereotype_formation_and_the_interchangeability_of_group_members) (search summary)
- In Tajfel's minimal-group studies, boys split by a preference for Klee or Kandinsky gave more money to their own group, maximising the difference between groups. — [Simply Psychology summary](https://www.simplypsychology.org/social-identity-theory.html) (search summary)
- Reading about genetic similarities between Jews and Arabs raised support for peacemaking more than reading about genetic differences. — [Kimel et al. 2016, *PSPB* 42:688](https://www.kimellab.com/publications) (search summary)
- Vezzali et al. ran six weekly Harry Potter sessions with 34 Italian fifth-graders (17 per arm), plus two correlational studies. Attitudes toward immigrants, gay people and refugees improved for readers who identified with Harry; perspective taking carried the effect. The authors note Studies 2 and 3 "cannot strictly allow us to draw causal relations". — [Vezzali et al. 2015, *J. Appl. Soc. Psychol.* 45:105](https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/vezzali_et_al._2015_-_the_greatest_magic_of_harry_potter.pdf) (opened, author-hosted PDF)
- Kaufman & Flanagan define distancing as offering "a safe space or buffer" from uncomfortable themes. A zombie version of a disease game raised empathy for infected people. In *Awkward Moment*, 5 bias cards in 12 beat 9 in 12 (89% against 63% other-oriented choices). After one *Buffalo* game, social identity complexity was 6.5 against 4.8, F(1, 36) = 4.87. They warn that overt persuasion triggers reactance. — [Kaufman & Flanagan 2015, *Cyberpsychology* 9(3)](https://cyberpsychology.eu/article/view/4343) (opened, WebFetch extract)
- BaFá BaFá motivated students but increased their ethnocentrism and dogmatism compared with courses without it. — [Bruschke, Gartner & Seiter 1993, *Simulation & Gaming* 24:9](https://digitalcommons.usu.edu/lpsc_facpub/86) (search summary)
- In a randomised evaluation of Elliott's blue-eyes/brown-eyes exercise (n = 47), White students became more positive toward Asian Americans and Latinos, only marginally toward African Americans, and reported negative feelings about their group's advantages. — [Stewart et al. 2003, *J. Appl. Soc. Psychol.* 33:1898](https://prejudicereduction.princeton.edu/publications/do-eyes-have-it-program-evaluation-jane-elliotts-blue-eyesbrown-eyes-diversity) (search summary)
- With 221 high-school students, reading a brief report on three classic social-psychology studies cut in-group bias only under high motivation and arguments matching students' experience. — [Educating to Tolerance, PMC4873057](https://pmc.ncbi.nlm.nih.gov/articles/PMC4873057/) (opened, abstract)

### Inferences
- **Never pair culture with crime on screen.** Illusory correlation works with meaningless labels, needs only a smaller group plus rare negative events, and grows with the number of events. A culture tint, culture-styled name or culture column on crime events would build a stereotype about that fictional culture even at equal true rates.
- **Then expect transfer.** Lessons about fictional groups map onto real ones (Vezzali; the whole premise of Polygons). A stereotype formed about a Nomos culture could attach to whichever real people it seems to resemble.
- **Keep groups fluid and similar in size.** Mixing, switching and within-culture variety lower entitativity, and similar shares remove the "minority" that distinctiveness needs. Polygons used 50/50 groups.
- **Wording is a lever Nomos controls.** Use specific and distributional sentences ("6 in 10 people raised with Velan customs pick fish"), never bare-plural generics ("Velans love fish").
- **Teach by mechanism, not by group.** Survival of the Best Fit and Nomos's own true-versus-recorded lesson place bias in records and institutions. Culture adds nothing to that lesson and adds risk.
- **Keep customs playful and off-message.** Tiltfactor's results and the BaFá BaFá backfire suggest culture-clash framing hardens views; customs should be texture, not a lesson about difference.

### Gaps
- No study was found on stereotype transfer from abstract groups in a simulation or explorable, so the main risk is inferred from lab paradigms.
- Hamilton & Gifford (1976), Crawford et al. (2002), Tajfel and Kimel et al. were not opened. BaFá BaFá and the eye-colour evaluation are search summaries only.
- The illusory-correlation literature uses static lists of sentences; whether animated agents produce larger or smaller effects is unknown.
- No evaluation of Parable of the Polygons or Survival of the Best Fit as learning tools was found.

## c) Respectful fictional cultures

### Takeaway
- **Fictional peoples get read as real ones when they borrow a real people's markers.** The Vistani "echoes some stereotypes associated with the Romani people". World of Warcraft's trolls speak with "a stereotypical Jamaican accent" among "witch doctors" and talk of voodoo. Horizon Zero Dawn's "braves" and wardrobe drew an appropriation critique (search summary). In Disney films about 40% of non-native English speakers were villains, against about 20% of US-English speakers (search summary).
- **The tabletop industry has removed innate ability by fictional people.** Wizards of the Coast said in 2020 that orcs and drow had been described in ways "painfully reminiscent" of how real ethnic groups are denigrated. It made ability increases changeable so each person "is an individual with capabilities all their own", and in 2022 replaced "race" with "species" after outside cultural consultants.
- **Invented sounds and spellings still evoke real languages.** A naming-language designer notes that "Hawaiian sounds" feel different from "Arabic ones", and that spelling patches read as "French-inspired" or "Slavic-inspired". He dropped one language per map region because "it was too hard to make it clear".
- **Educators warn against the "tourist" approach.** Derman-Sparks calls the foods-and-holidays curriculum a "tourist" visit to "strange, exotic people" (search summary). Nomos's customs are this thin by design, so they must be framed as toy preferences, not as a picture of culture.
- **Even everyday foods can carry stereotypes.** The watermelon became an anti-Black trope after emancipation (search summary). Favourite foods should be generic categories assigned by draw or local abundance, never themed to a people.

### Cited Findings
- "Diversity and Dungeons & Dragons": orcs and drow "have been characterized as monstrous and evil, using descriptions that are painfully reminiscent of how real-world ethnic groups have been and continue to be denigrated". Future books show peoples "as free as humans to decide who they are and what they do". A new option lets players change racial ability score increases, which "emphasizes that each person in the game is an individual with capabilities all their own". The Vistani depiction "echoes some stereotypes associated with the Romani people in the real world", now revised "working with a Romani consultant". Sensitivity readers join the process. — [Wizards of the Coast, 17 Jun 2020](https://web.archive.org/web/2020/https://dnd.wizards.com/articles/features/diversity-and-dnd) (opened, Wayback snapshot)
- "Race" is "a problematic term that has had prejudiced links between real world people and the fantasy peoples of D&D worlds"; "species" was chosen "in close coordination with multiple outside cultural consultants". — [D&D Beyond, "Moving On From 'Race'", 1 Dec 2022](https://www.dndbeyond.com/posts/1393-moving-on-from-race-in-one-d-d) (opened, WebFetch extract)
- The 2022 *Spelljammer* hadozee lore and art drew criticism for echoing slavery tropes and minstrel imagery. Wizards apologised ("We failed you") and replaced the text. — [PC Gamer](https://www.pcgamer.com/wizards-of-the-coast-apologizes-for-and-removes-racist-elements-of-spelljammer/) (search summary; the article body did not load)
- Monson: Azeroth "mirrors elements of real-world race-based societies where culture is thought to be immutably linked to race", and "race determines alliances, language, intellect, temperament, occupation, strength, and technological aptitude". Its peoples draw on "stereotypical imagery from real-world ethnic groups". Trolls "speak with a stereotypical Jamaican accent". — [Monson 2012, *Games and Culture* 7:48](https://citeseerx.ist.psu.edu/document?doi=1023f3922c7417dcc752eb8da9557520b07a3a52&repid=rep1&type=pdf) (opened, CiteSeerX copy)
- Dia Lacina criticised Horizon Zero Dawn's "braves", "savages" and "tribes", and a world-building "lifted almost entirely from our cultures". Narrative director John Gonzales said the team "weren't looking for inspiration from one particular group". — [Vice](https://www.vice.com/en/article/horizon-zero-dawn-writer-responds-to-criticism-of-native-american-appropriation/) (search summary)
- Lippi-Green's study of 371 characters in 24 Disney films found about 20% of US-English speakers were villains against about 40% of non-native speakers. — [Penn handout summarising Lippi-Green 1997](https://ccat.sas.upenn.edu/~haroldfs/popcult/handouts/wenkeric.htm) (search summary)
- Martin O'Leary built a "naming language" generator for map names. Adding varied consonants gave personality: "The Hawaiian sounds definitely have a different feel to the Arabic ones." Phonotactics carry "a lot of the way a language feels", and spelling patches give "a French-inspired" or "Slavic-inspired" look. He abandoned per-region languages: "it was too hard to make it clear that this was what was going on". He points to Mark Rosenfelder's *Language Construction Kit*. — [mewo2.com, "Generating naming languages"](https://web.archive.org/web/2020/http://mewo2.com/notes/naming-language/) (opened, Wayback snapshot). Its [code](https://github.com/mewo2/naming-language) has a non-standard licence, so it is study-only.
- Banks's "contributions approach" adds "foods, dances, music, and artifacts" but gives "little attention" to their meanings. Derman-Sparks names the "tourist-multicultural" trap: a curriculum that "drops in" on "strange, exotic people to see their holidays and taste their foods". — [Banks, Approaches to Multicultural Curriculum Reform](https://www.pcc.edu/teaching-learning-center/wp-content/uploads/sites/95/2018/11/multicultural-banks.pdf) and [Derman-Sparks, Anti-Bias Education](https://www.antibiasleadersece.com/wp-content/uploads/2015/01/what-is-ABE-derman-sparks.pdf) (search summary)
- After emancipation, free Black people grew and sold watermelons; white backlash made the fruit a symbol of supposed "uncleanliness, childishness, idleness". — [William R. Black, *The Atlantic*, 8 Dec 2014, via HNN](https://historynewsnetwork.org/article/157828) (search summary)
- Norland calls its groups "cultures" rather than "ethnicities" or "races" because culture is "a social construct rather than a genetic one". It still gives them work skills ("Warlike Kaiden", "skilled Makha" in alchemy), a "Former barbarians" origin and slurs such as "The greedy babblers of the Makha". — [Norland Devlog #12 "Cultures", 15 Nov 2023](https://store.steampowered.com/news/app/1857090/view/5322753221339713464) (opened, Steam News API)

### Inferences
- **What reads as real.** The markers that map a fictional people onto a real one are dress, accent, music genre, religion, architecture, food themes and naming sounds. Rule 8 already removes dress and bodies. Names, music, festivals and food are the open channels.
- **Invented phonology rules.** Use one shared naming phonology for all cultures, drawn from broad Latin letters without diacritics, as Dwarf Fortress's divine language does. Avoid signature sounds and spellings that point to one real language family (for example ʔ, q, x, š, ž, or a fixed two-syllable rhythm).
- **No hierarchy words.** Avoid "primitive", "savage", "tribe", "barbarian", "neolithic", "civilised", "advanced", "native", "foreign", "exotic" and "race". No culture is older, purer, more developed or closer to nature.
- **Varied, symmetric customs.** Every culture gets the same kinds of customs at the same cost: one food preference, one festival calendar of equal length, one music preference, one naming structure. No culture is defined by money, war, faith or nature.
- **Present culture as a toy layer.** In line with the tourist critique, the "What this toy leaves out" page should say real cultures are far richer, and that Nomos's customs exist for texture and for showing how customs spread.
- **Review before launch.** Wizards' practice of sensitivity readers fits Nomos's existing diverse playtest panel: run the custom catalogue and a name sample past it.

### Gaps
- No game-industry guide written specifically for fictional cultures was found. The guidance here is assembled from publisher statements, academic critiques and conlang practice.
- Research on how players read invented phonologies as real languages was not found; the phonology rules are inferences.
- Lippi-Green, Banks, Derman-Sparks, Horizon Zero Dawn and the hadozee case are search summaries only.

## d) Risks specific to Nomos

### Takeaway
- **Calling culture "learned" is not enough.** Norland frames culture as "a social construct rather than a genetic one", yet gave cultures work skills, war- or money-loving values, xenophobic riots and repression. In November 2025 "Makha migrants will have twice as much money". It removed "cultural bonuses for work tasks" in May 2025.
- **Five indirect channels could leak culture into crime or wealth in Nomos.** Culture is learned from parents, so it drifts with inherited wealth and neighbourhood (round 3's warning). Costly customs lower savings, which raises need-driven food theft. Public festivals change exposure to patrols, witnesses and theft. Home regions could line up with poor development presets in country mode. Names or lens colours could reveal culture on crime events.
- **Real customs have been policed through rules about music and gatherings.** London's Form 696 (2005–2017) was reviewed after claims it targeted grime, garage and R&B; the mayor said it should not "unfairly target one community or music genre". New York's 1926 cabaret law was used against Harlem jazz clubs until its 2017 repeal (search summary).
- **The answer is structural.** Keep culture off every crime surface. Make customs cost- and time-neutral. Spawn culture independently of wealth and home. Audit per-culture outcomes in CI. Offer an opt-in lens that shows customs only and hides justice cues while on.

### Cited Findings
- Norland's cultures change "through assimilation (for example, among children during education)". Cultures have "traditional skills" and xenophobia: unhappy characters "may start a riot by attacking representatives of the disliked culture", which the developers call "a realistic element we've included". Players can "engage in the repression of a particular culture". — [Norland Devlog #12, 15 Nov 2023](https://store.steampowered.com/news/app/1857090/view/5322753221339713464) (opened, Steam News API)
- Norland characters "rejoice when you terrorize a culture they dislike". — [Progress Update, 2 May 2024](https://store.steampowered.com/news/app/1857090/view/5766372999943585936) (opened, Steam News API)
- "Cultural bonuses for work tasks have been removed". — [Patch #37, 16 May 2025](https://store.steampowered.com/news/app/1857090/view/1799817379503234) (opened, Steam News API)
- "Cultures now differ more strongly"; "Makha migrants will have twice as much money". — [Patch #43 (beta), 21 Nov 2025](https://store.steampowered.com/news/app/1857090/view/1816849002015273) (opened, Steam News API)
- Round 6 put Norland's "cultures with xenophobic riots, repression and culture-linked disease" on the avoid list, including "Rutabaga Typhus" advice keyed to one culture. — `docs/research/round-6-goods-and-wellbeing/notes/norland-prior-art.md` (opened, in repo)
- Round 3: "wealth passes to heirs and households sort away from feared areas, so any appearance that is inherited would drift into correlation with neighbourhood, poverty and arrests (an inference, not a tested result)". — `docs/research/round-3-2d-look/report.md` (opened, in repo)
- The plan's M4 food theft has "gain [that] rises with unmet food need", and M5 adds "Schelling moves". — `docs/plan/implementation-plan.md` (opened, in repo)
- The Mayor of London ordered a review of Form 696 on 21 Sep 2017, saying it "shouldn't compromise the capital's vibrant grassroots music industry or unfairly target one community or music genre". The form was alleged to target "grime, garage, and R 'n' B acts", and an equality impact assessment was under way. — [Mayor of London press release](https://www.london.gov.uk/press-releases/mayoral/mayor-orders-review-of-form-696) (opened, WebFetch extract)
- Form 696 asked about music genre and audience ethnicity until 2009 and was scrapped on 10 Nov 2017. — [NME](https://www.nme.com/news/music/london-mayor-sadiq-khan-scraps-racist-live-music-form-2158346) and [Resident Advisor](https://ra.co/news/40408) (search summary)
- New York's 1926 cabaret law required a licence for dancing, limited instruments and musicians, and was used against jazz clubs patronised by people of colour; it was repealed in 2017. — [The Fader](https://www.thefader.com/2017/10/30/new-york-city-repeal-no-dancing-cabaret-law) and [NPR](https://www.npr.org/2017/11/04/561942585/what-new-york-city-has-in-common-with-footloose) (search summary)
- Victoria 3 models newcomers as less accepted until their community has been present for years. — [Dev Diary #129](https://store.steampowered.com/news/app/529340/view/6339469370182122616) (opened, Steam News API)
- Distinctiveness-based illusory correlation is stronger for negative acts and more events. — [Mullen & Johnson 1990](https://bulidomics.com/w/images/2/29/Mullen1990.pdf) (opened, third-party PDF copy)

### Inferences

**The five leak channels and their fixes**

| Channel | How culture could reach crime or wealth | Fix |
| --- | --- | --- |
| Inheritance drift | Culture is learned at home, wealth passes to heirs, and households sort by fear and price. Culture then tracks district, and district tracks patrols and records. | Spawn culture on its own keyed stream, independent of wealth rank, home and job. Schelling moves, home choice and partner choice never read culture. Audit culture against wealth decile and district. |
| Custom costs | A pricier favourite food or a costly festival lowers savings, raises unmet need and so raises food theft. | Customs only swap goods within a category budget and never add spending. Festivals draw one equal per-person budget for every culture. |
| Time and place | Night festivals and public music put one culture's members in front of patrols, witnesses and thieves more often. | Equal festival days per culture, calendars spread across the year, festivals open to everyone. Patrols never read crowds or culture. No offence or report type tied to customs (noise, gathering, street vending). |
| Home regions | In country mode a culture's home region may sit in a poor development preset, giving a culture–wealth–crime gradient. | Each culture spans regions of different development; each region hosts at least two cultures. Migration never reads culture. |
| Visible cues | Culture-styled names, a culture tint or an inspector column on crime events builds an illusory correlation. | One shared naming phonology. Justice bubbles, logs and records never show culture. The culture lens hides justice cues while on. |

**Recommended checks**
- **Code:** only the customs module may read culture columns, as no rule may read body hue. A lint bans culture in the offend utility, patrol allocation, stops, hiring, wages, credit, records and migration.
- **Spawn independence:** over 50 seeds, |Spearman| < 0.05 between culture and wealth rank, home district and job at spawn (the M5 appearance-audit bar).
- **Parity by construction:** expected custom spending and festival days per year are equal across cultures, asserted exactly in a unit test.
- **Outcome audit:** over 50 paired seeds × 20 simulated years, each culture's rates of true offending, victimisation, stops, wrongful stops, arrests and records, and its mean wealth decile, sit within an equivalence band of the population rate. A proposed band is 0.9–1.1 for the 90% interval of the ratio, tested with M1's equivalence framework.
- **Single-culture null twin:** a world where everyone shares one culture matches the default world's crime, Gini and unemployment within the same bands.
- **Sorting metric:** log the dissimilarity index of culture across districts; flag default presets above 0.2 (a proposed bar).
- **Appearance audit:** outside the lens, no rendered attribute differs by culture (|Spearman| < 0.05), and the true and recorded panels never show culture.
- **Text and name lints:** reject bare-plural generic sentences about cultures and a banned-word list in culture strings. Reject generated names within edit distance 2 of a fixture of real countries, demonyms, languages, ethnonyms and religions, as the Pokémon filter does.
- **Playtest:** ask a diverse panel which real people each culture resembles and which culture commits more crime. A proposed bar: at least 8 of 10 name no real people and answer "no difference" or "can't tell".

**Wording**
- Say "people raised with Velan customs" or "Velan festival", never "the Velans" as a kind of people.
- Use shares and ranges ("6 in 10 pick fish"), not generics ("Velans love fish").
- Describe change as learning: "learned from parents", "picked up from friends", "now follows both".
- Never compare cultures on anything but preferences.

**Opt-in culture lens**
- Off by default, like the wealth lens. Never used in preview cards, share clips or default replays.
- Shows customs only: district shares of each custom as small multiples, the festival calendar, and a person's custom mix and history in a Customs tab of the inspector.
- While it is on, crime and justice cues (act rings, justice bubbles, record markers, patrol overlays, the true and recorded panels) are hidden, with a one-line note. Turning on a justice view turns the lens off.
- Records and customs live in separate inspector tabs that never show together.
- Its palette avoids the six body hues and the crime reds and oranges, and adds icons or patterns so colour is never the only cue (WCAG 1.4.1).
- A fairness statement on the "What this toy leaves out" page reports the CI audit result, so the guarantee is visible without pairing culture and crime on screen.

### Gaps
- No game or explorable was found that audits per-culture crime or wealth outcomes, so the checks above are untested designs.
- The 0.9–1.1 band, the 0.2 dissimilarity bar and the 8-of-10 playtest bar are proposed bars, not sourced thresholds.
- Whether customs should ever raise victimisation (crowded festivals attract theft) is a modelling choice for the owner; the parity fix assumes equal exposure across cultures.
- The cabaret-law and Form 696 histories beyond the mayor's release are search summaries only.

## e) Borrow, adapt or avoid

Checked against `.claude/rules/content.md` rules 1 and 8 (one blob body; cultures fictional, learned, preference-only, independent of hue, never shown by body or clothes, never mapped to real peoples).

| Prior art | Verdict | Nomos form | Milestone | Rule check |
| --- | --- | --- | --- | --- |
| CK3 pairwise acceptance with stated causes | Adapt | Familiarity between custom sets speeds learning only; shown with its causes | M3, M5 | Preference-only |
| CK3 pillars as a bundle | Adapt | Custom bundle: food, festival, music, naming, home region | M3 | Rule 8 |
| CK3 ethos and tradition bonuses | Avoid | — | — | Ability by group |
| CK3 aesthetics (clothes, architecture) by culture | Avoid | Homes, roofs and clothes never vary by culture | — | Rules 1, 8 |
| CK3 court-language pecking order | Avoid | No ranking of cultures or languages | — | Hierarchy |
| CK3 young children learn faster | Borrow | Higher learning rate in childhood (transmission) | M3 | — |
| Victoria 3 obsessions from local abundance | Adapt | Favourite foods emerge from local abundance within a category, cost-neutral | M3, M7 | Food parity |
| Victoria 3 discrimination by law | Avoid in the sim | Named on the "What this toy leaves out" page | M6 | Crime surface |
| Victoria 3 limits statement and "broad abstractions" | Borrow | Same tone on the leaves-out page | M6 | — |
| Victoria 3 portraits and dress by culture | Avoid | — | — | Rules 1, 8 |
| Victoria 3 assimilation into a primary culture | Avoid | Symmetric switching; no default or majority culture | M3 | Hierarchy |
| DF generated divine language | Adapt | One shared naming phonology, no diacritics, broad letter pools | M3, M8 | Real-language mapping |
| DF names not inherited | Adapt | Personal names drawn fresh; naming customs set structure only | M3 | Visible cues |
| DF word themes for names | Borrow | Theme words for place and festival names | M8 | Name lint |
| DF musical forms generated by culture | Adapt | Music custom as abstract tempo, loudness and structure with invented names | M3 | No real genres |
| DF festivals from values | Adapt | Scheduled public festivals, equal days per culture, open to all | M3 | Time parity |
| DF species ethics on theft and lying | Avoid | — | — | Honesty by group |
| RimWorld certainty and conversation | Adapt | Gradual learned switching through contact, with a visible bar (transmission) | M3, M5 | Preference-only |
| RimWorld child belief at age 3 by interaction | Borrow | Exposure-weighted childhood learning (transmission) | M3 | — |
| RimWorld beliefs driving raids, trials and dress | Avoid | — | — | Crime by group; rule 8 |
| RimWorld xenotypes and aggression genes | Avoid | — | — | Innate traits |
| RimWorld "neolithic" and "savage" tribes | Avoid | — | — | Hierarchy |
| Stellaris species traits and purges | Avoid | — | — | Innate traits |
| Civilization real cultures | Avoid | No real peoples; consult if any real reference is ever added | — | Rule 8 |
| Civilization VII forced civ switching | Avoid | Switching voluntary and gradual, shown as personal history | M3 | Legibility |
| Civilization VII "no break in identity" | Adapt | Name and history persist through switches | M3 | — |
| Civilization VII Independent Powers, no barbarians | Borrow | No outsider or barbarian labels | M3 | Hierarchy |
| Norland: culture as a social construct | Borrow (wording) | "Learned, not inherited" in the leaves-out page | M6 | — |
| Norland: skills, money, xenophobia, riots, repression | Avoid | — | — | Rule 8 |
| Polygons: equal abstract groups, limits and real data | Borrow | Similar culture shares in presets; links on the leaves-out page | M3, M6 | Illusory correlation |
| Survival of the Best Fit: bias from institutional data | Borrow (framing) | Already the true-versus-recorded lesson, never by culture | M4 | — |
| Illusory-correlation research | Adapt | Culture never shown on crime events; similar shares | M4, M5 | Visible cues |
| Generic-language research | Borrow | Wording lint for culture strings | M3 | — |
| Distancing and intermixing | Borrow | Customs as playful texture, mostly off-message | M3 | — |
| BaFá BaFá culture-clash framing | Avoid | No misunderstanding or clash mechanics | — | Backfire risk |
| Wizards: individual capabilities, consultants, sensitivity readers | Borrow | Panel review of custom catalogue and names | M5, M6 | — |
| Form 696 and the cabaret law | Avoid | No offence or report type tied to customs | M4 | Crime surface |
| Tourist-curriculum critique | Adapt | Customs framed as toy preferences; real cultures far richer | M6 | — |

## Recommendation for the plan

Cultures are safe in Nomos only if they never touch a crime surface, cost the same for everyone and stay fluid. Every precedent that let culture or species reach ability, honesty, wealth or violence produced group stereotypes, including Norland, which calls culture learned. The evidence on illusory correlation says abstract labels alone do not prevent stereotyping. So the safeguards must be structural and audited, not only cosmetic.

Draft tasks, worded for the plan (cross-check with `transmission.md` and `customs-preferences.md`):

**M0 Pipeline**
- [ ] Reserve culture columns in `AgentStore` with their own keyed stream, separate from wealth, home and job draws, and add a lint that lets only the customs module read them, as for body hue (R8).
- [ ] Extend the name lint to accept a real-world fixture: countries, demonyms, languages, ethnonyms and religions, rejected within edit distance 2 (R8).

**M2 Economy**
- [ ] Assign culture in `spawnFromLedger` independently of wealth rank, home and job, and test |Spearman| < 0.05 against each over 50 seeds (R8).
- [ ] Make customs cost-neutral: favourite foods swap goods within a category budget, and festivals draw one equal per-person budget for every culture, asserted exactly in a unit test (R8).

**M3 City life**
- [ ] Ship customs as preferences only: favourite foods from the six food categories by keyed draw or local abundance, equal festival days per culture spread across the year and open to all, a music preference as abstract parameters, a naming structure and a home region (R8).
- [ ] Draw all personal names from one shared invented phonology without diacritics; naming customs set only structure, such as name order and which family name passes on (R8).
- [ ] Draw festival decorations from one neutral set, never in national-flag colours or the six body hues (R8).
- [ ] Lint culture strings: no bare-plural generic sentences and no hierarchy words (primitive, savage, tribe, barbarian, civilised, native, foreign, exotic, race) (R8).
- [ ] Make switching gradual and caused by contact, keep the person's name, and show their custom history in the inspector (R8).

**M4 Crime and police**
- [ ] Add a per-culture outcome audit over 50 paired seeds × 20 years: true offending, victimisation, stops, wrongful stops, arrests and records within a proposed 0.9–1.1 equivalence band, plus a single-culture null twin (R8).
- [ ] Never show culture in justice bubbles, log lines, record states or the true and recorded panels; add no offence or report type tied to customs, and never let patrols read culture or festival crowds (R8).

**M5 Society and policy**
- [ ] Add the opt-in culture lens: customs only, district shares as small multiples, hidden justice cues while on, separate Customs and Records tabs, a palette apart from body hues and crime colours, never in share cards (R8).
- [ ] Extend the appearance audit to culture (|Spearman| < 0.05 outside the lens), keep Schelling moves, home choice and partner choice blind to culture, and log the culture dissimilarity index with a proposed 0.2 flag (R8).
- [ ] Let no policy slider read culture (R8).
- [ ] Run the diverse playtest panel on customs and names: which real people does each culture resemble, and which commits more crime (proposed bar: 8 of 10 name none and see no difference) (R8).

**M6 Scale and sharing**
- [ ] On the "What this toy leaves out" page, explain that cultures are fictional, learned and preference-only; publish the outcome-audit result; name what Nomos leaves out (real cultures, discrimination by law as in Victoria 3, xenophobia and culture conflict as in Norland); and link the illusory-correlation and generic-language studies (R8).
- [ ] Review the custom catalogue and a sample of generated names with sensitivity readers or the diverse panel before launch (R8).

**M7 Country of ledgers**
- [ ] Spread each culture's home regions across development presets, give every region at least two cultures, keep migration blind to culture, and audit culture against settlement wealth bands (R8).

**M8 Country map**
- [ ] Run culture, festival and place names from the country generator through the real-world name fixture for 1,000 seeds (R8).

**Verify before hard-coding**

| Figure or question | Decides | Milestone |
| --- | --- | --- |
| The outcome-audit band (0.9–1.1) and its power over 50 paired seeds | Whether the audit can detect a leak | M4 |
| The dissimilarity flag (0.2) against the transmission model's homophily | Whether sorting by culture is allowed | M5 |
| Whether a stream of animated events produces illusory correlation like static sentence lists | How strict the lens rules must be | M5 |
| Hamilton & Gifford (1976) and Crawford et al. (2002) in full | How the leaves-out page cites them | M6 |
