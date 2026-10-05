# Legal and licensing limits for a "Pokémon-looking" open-source browser simulation (status as of 5 October 2026)

**This is not legal advice.** It reports what licences, notices, registrations and reported cases say. US law is the default frame (GitHub, the DMCA, the US Copyright Office); Japanese and Chinese matters are noted where relevant.

**Source marking:** "(opened)" means I read the primary text myself, almost always as a GitHub-hosted copy fetched with git on 5 Oct 2026. "(snippet only)" means I saw only a search-engine snippet or summary because the host was blocked; treat those as lower confidence. Low-quality or SEO sites are flagged.

**Blocked hosts (HTTP 403 at the egress proxy, for both curl and WebFetch):** creativecommons.org, gnu.org, opengameart.org, itch.io, copyright.gov, en.wikipedia.org, courtlistener.com, law.justia.com, patents.google.com, uspto.gov (including patentsgazette.uspto.gov), nintendo.com, nintendo.co.jp, pokemon.com, pokemon.co.jp, pocketpair.jp, federalregister.gov, govinfo.gov, archive.org, web.archive.org, gamejolt.com, store.steampowered.com, spriters-resource.com, docs.midjourney.com, openai.com, stability.ai, huggingface.co, kenney.nl, temtem.com, reddit.com, and every news or legal-blog host I tried (reuters, theverge, polygon, kotaku, gamesindustry.biz, eurogamer, ign, gamedeveloper, pcgamer, engadget, windowscentral, nintendolife, gamesradar, siliconera, automaton-media, animenewsnetwork, ipfray, gamesfray, lexology, steptoe, scotusblog, copyrightlately, dglaw, loeb, business.cch.com, eff.org, lumendatabase.org). Reachable: github.com over git (the REST API only for session repos) and raw.githubusercontent.com. I used about 34 web searches; one query fanned out into three internal searches.

**Main primary sources opened:** GitHub's public DMCA notice archive (`github/dmca`: 90 files whose names contain "Nintendo", 2014–2026, a few of them counter-notices, plus TPC International's 2016 "Pokemon" notice); Game Jolt's DMCA archive (`gamejolt/dmca`); Creative Commons legal code (`creativecommons/cc-legal-tools-data`) and the CC FAQ (`creativecommons/faq`); licence texts in `github/choosealicense.com`; the Liberated Pixel Cup generator README and CREDITS.csv; generator terms of service archived by Open Terms Archive (`OpenTermsArchive/genai-versions`).

---

## 1. Enforcement history 2016–2026 by Nintendo / The Pokémon Company (TPC) against fan games and lookalikes, and what triggered each

### Takeaway
Apart from the Palworld patent suit (section 2), every documented Nintendo or TPC action from 2016 to 2026 that I found was against a project that did at least one of these: used the POKÉMON mark or a "Poké-" name, copied Nintendo assets (sprites, music, ROM code, character art), or mimicked a Nintendo logo. Publicity was often the immediate trigger: a viral release, an announced release date, or a big community hub. I found no reported action against a game that merely shared a GBA/DS-era top-down look while using original names and art. The closest "lookalike" actions were the Palworld patent suit (mechanics, not art; see section 2) and the September 2026 notice against "animal-island-ui", which contained copied Animal Crossing imagery as well as a mimicked logo.

### Cited Findings
**Correction to the brief.** The famous mass Game Jolt takedown (about 562 games) happened on **2 September 2016**, not in 2018. Nintendo of America (NoA) sent Game Jolt further mass notices on **27 April 2018** (439 game URLs) and **29 December 2020** (379 game URLs plus a separate trademark notice). The counts below are my own tallies of unique game URLs in the notices.

- **2015-07-06 (context, before the 2016–2026 window).** NoA sent a DMCA notice against a browser GBA emulator page (jsemu.github.io/gba), citing "copyrighted Pokémon characters and imagery". This shows browser-hosted copies of Pokémon games are a long-standing enforcement target. — [GitHub DMCA 2015-07-06](https://github.com/github/dmca/blob/master/2015/2015-07-06-nintendo.md) (opened)
- **2016-03-07.** A TPC International paralegal sent GitHub a DMCA notice against "pokereact", a Chrome extension. It listed individual image files of official Pokémon characters (Charizard, Meowth, Haunter, Pikachu, Togepi, Jigglypuff, Wobbuffet, Squirtle). Trigger: copied official character art. — [GitHub DMCA 2016-03-07](https://github.com/github/dmca/blob/master/2016/2016-03-07-Pokemon.md) (opened)
- **Pokémon Uranium.**
  - Released 6 August 2016 after nine years of development, and downloaded 1.5 million times in its first week.
  - On 13 August 2016 all download links were removed. The developers said they were not contacted personally but were told of multiple takedown notices sent by lawyers for NoA.
  - Development stopped entirely by September 2016.
  - Sources: [Wikipedia: Pokémon Uranium](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Uranium) (snippet only); [PokéCommunity Daily, 15 Aug 2016](https://daily.pokecommunity.com/2016/08/15/nintendo-orders-pokemon-uranium-creators-takedown-download-links/) (snippet only)
  - Four years later, NoA's 29 December 2020 *trademark* notice to Game Jolt still listed a page called "pokemon_uranium_working" under the POKÉMON mark (US Reg. No. 2297050). — [Game Jolt DMCA 2020-12-29](https://github.com/gamejolt/dmca/blob/main/2020/2020-12-29-nintendo.md) (opened)
- **Game Jolt, 2 September 2016.**
  - NoA's copyright notice asked Game Jolt to disable access to pages carrying Mario, Zelda and Pokémon material.
  - For Pokémon it claimed "the audiovisual work, music, fictional character depictions, and other imagery" and cited US copyright registrations for Pokémon Gold/Silver, Crystal, Diamond/Pearl, HeartGold/SoulSilver and others.
  - The notice contains 564 unique game URLs. 131 have "pokemon" in the slug; 139 use some Pokémon-related term.
  - Several slugs do not name the franchise at all, for example "tall-grass", "monster-battle-working-title", "lavender-town-s-gym" and "nomekop-another-pokemon-fan-game-wip". Nintendo's lawyers were identifying games by content, not only by title.
  - Source: [Game Jolt DMCA 2016-09-02](https://github.com/gamejolt/dmca/blob/main/2016/2016-09-02-nintendo.md) (opened). Game Jolt publishes every notice it receives "in the spirit of transparency" ([gamejolt/dmca README](https://github.com/gamejolt/dmca/blob/main/README.md), opened).
  - Press reported 562 games, which were "locked" so only their creators could still access them. — [Game Developer](https://www.gamedeveloper.com/business/500-fan-games-on-game-jolt-targeted-by-nintendo-dmca-takedown) (snippet only); [MCV/Develop, "Almost 600"](https://mcvuk.com/business-news/publishing/almost-600-game-jolt-titles-struck-by-nintendo-takedown-notice/) (snippet only); [Kotaku](https://kotaku.com/website-says-nintendo-threat-forced-them-to-pull-hundre-1786069047) (snippet only)
  - The 562 vs 564 difference is unexplained; possibly duplicate or dead entries.
- **Pokémon Prism.**
  - Received a cease-and-desist on **20 December 2016**, a few days before its announced 25 December 2016 release.
  - It was a ROM hack of Pokémon Crystal, distributed as a binary patch, in development for about eight to nine years.
  - The developer also had to remove download links to Pokémon Brown, and his website was taken down.
  - The game later leaked and was released anyway.
  - Triggers: Pokémon name, derivative of Nintendo ROM code and assets, and a publicised release date.
  - Sources: [Wikipedia: Pokémon Prism](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Prism) (snippet only); [PokéCommunity Daily, 21 Dec 2016](https://daily.pokecommunity.com/2016/12/21/rom-hack-pokemon-prism-receives-cease-desist/) (snippet only). The C&D text is on the Internet Archive but archive.org was blocked ([archive.org item](https://archive.org/details/pokemon-prism-cease-desist), not opened).
- **Game Jolt, 27 April 2018.** A second NoA notice with the same copyright claims, listing 439 unique game URLs. About 110 slugs contain "pok", "pkmn" or "pikachu"; many others have meaningless names ("12345678", "another_game"). — [Game Jolt DMCA 2018-04-27](https://github.com/gamejolt/dmca/blob/main/2018/2018-04-27-nintendo.md) (opened)
- **Pokémon Essentials (the RPG Maker XP fan-game kit).**
  - NoA's lawyers sent GitHub DMCA notices on **27 August 2018** (taylor1791/pokemon-essentials-mirror) and **30 August 2018** (AshishMahto/pokemon-essentials-mirror).
  - The notices alleged "unauthorized use of Nintendo's copyright protected Pokémon characters, sprites, icons, music and editing software" and listed registrations from Pokémon Gold through Ultra Sun/Ultra Moon.
  - Asked about other remedies: "Removal. No other changes are acceptable."
  - Sources: [GitHub DMCA 2018-08-27](https://github.com/github/dmca/blob/master/2018/2018-08-27-Nintendo.md) (opened); [GitHub DMCA 2018-08-30](https://github.com/github/dmca/blob/master/2018/2018-08-30-Nintendo.md) (opened)
  - Press described this as Nintendo shutting down Pokémon Essentials. — [Game Rant](https://gamerant.com/pokemon-essentials-game-shut-down-nintendo/) (snippet only); [TheGamer](https://www.thegamer.com/nintendo-pokemon-essentials-shut-down-fan-games/) (snippet only)
- **Game Jolt, 29 December 2020.**
  - The archived file holds both a copyright notice and a trademark notice; together they list 379 unique game URLs, about 79 with Pokémon-related slugs.
  - The **trademark** notice ("We represent Nintendo of America Inc. … in trademark matters") citing "POKÉMON IC9 US TM Reg. No. 2297050". That notice listed pages including "pokemon_uranium_working", "pokemon_insergence_working", "Pokemon_Hystoria", "PokemonGoldenVersion", "pkmncb", "pokevsdigi" and the parody title "Sun-Llama-e-Moon-Alpaca".
  - Trigger: the mark itself, or an evocation of it, in titles.
  - Source: [Game Jolt DMCA 2020-12-29](https://github.com/gamejolt/dmca/blob/main/2020/2020-12-29-nintendo.md) (opened). Game Jolt also received a one-game Mario notice on 23 Sept 2024 ([Game Jolt DMCA 2024-09-23](https://github.com/gamejolt/dmca/blob/main/2024/2024-09-23_nintendo), opened).
- **Palworld Pokémon mod, January 2024.**
  - A video promoting a mod that put Pokémon into Palworld was taken offline by a copyright claim within about 24 hours, and NexusMods staff began removing Pokémon mods.
  - The Palworld modding Discord banned links to the mod, saying it was "highly likely using ripped assets".
  - Trigger: ripped character models.
  - Sources: [GamesRadar](https://www.gamesradar.com/it-took-less-than-24-hours-for-palworlds-pokemon-mod-to-get-hit-by-nintendos-lawyers/) (snippet only); [My Nintendo News, 23 Jan 2024](https://mynintendonews.com/2024/01/23/nintendo-is-filing-takedown-requests-against-pokemon-mods-for-palworld/) (snippet only); [GameSpot](https://www.gamespot.com/articles/palworld-community-taking-precautions-over-pokemon-mod-that-is-likely-very-illegal/1100-6520511/) (snippet only)
- **Relic Castle, March 2024.**
  - A Pokémon fan-game hub founded in 2014, with about 20,000 members and 65,000 posts, shut down after a DMCA notice.
  - Games were not hosted on the site itself, only linked (for example on Mediafire).
  - The sender was not disclosed; press presumed TPC.
  - Trigger: being the central distribution hub.
  - Sources: [Nintendo Life, Mar 2024](https://www.nintendolife.com/news/2024/03/pokemon-fan-game-site-relic-castle-shut-down-following-dmca-takedown-notice) (snippet only); [Kotaku](https://kotaku.com/pokemon-fan-games-relic-castle-shutdown-dmca-reason-1851359618) (snippet only); [GamesRadar](https://www.gamesradar.com/after-almost-10-years-unofficial-pokemon-website-known-for-sharing-fan-made-games-shuts-down-after-reportedly-receiving-a-dmca-takedown-notice/) (snippet only)
- **Nintendo's GitHub enforcement, 2023–2026, is mostly about Switch emulation and console keys** (Yuzu, Suyu, Ryujinx and Citron forks, Lockpick_RCM, prod.keys, and others). The few fan-project notices target copied assets file by file.
  - Example: on **28 March 2024** Nintendo sent two notices against HeavenStudio, a fan-made Rhythm Heaven remix editor. They list hundreds of individual files such as `Assets/Resources/Sprites/Editor/GameIcons/RhythmTweezers.png` and cite the Rhythm Heaven copyright registrations.
  - Sources: [GitHub DMCA 2024-03-28](https://github.com/github/dmca/blob/master/2024/03/2024-03-28-nintendo.md) (opened); my review of all Nintendo-named files in the [github/dmca repo](https://github.com/github/dmca) (opened)
- **The Pokémon Company v. Chinese developers ("Pocket Monster Reissue").**
  - TPC announced on 17 September 2024 that the Shenzhen Intermediate People's Court had ruled in its favour. The snippet gives only "September 17"; the year comes from contemporaneous coverage.
  - The court ordered 107 million yuan (about US$15 million), finding violations including unfair competition.
  - The suit was filed in December 2021 against six companies behind a 2015 mobile game that copied Pokémon characters and creature designs, including Ash and Pikachu. The game reportedly earned more than $42 million in a year. TPC had claimed about $72 million.
  - Trigger: copied characters plus large monetisation.
  - Sources: [AUTOMATON West](https://automaton-media.com/en/news/the-pokemon-company-wins-15-million-copyright-infringement-lawsuit-against-china-based-game-developers/) (snippet only); [Gamereactor](https://www.gamereactor.eu/the-pokemon-company-wins-15-million-lawsuit-against-chinese-knockoff-1434623/) (snippet only)
- **"The Poké Court", New York City, early 2026.**
  - A Pokémon trading-card shop lost about $100,000 in a January 2026 armed robbery. Nintendo then asked it to change its name and logo.
  - It rebranded as "The Trainer Court" with a new green logo. The X post reporting the rebrand is dated 21 Feb 2026 (decoded from the post ID).
  - Trigger: a "Poké-" name and logo used commercially, even by a seller of genuine products.
  - Sources: [Kotaku](https://kotaku.com/pokemon-poke-court-nintendo-trainer-nyc-store-robbed-2000669827) (snippet only); [Vice](https://www.vice.com/en/article/nintendo-tells-new-york-pokemon-shop-to-change-its-name-after-it-was-just-robbed/) (snippet only); [TheGamer](https://www.thegamer.com/pokemon-store-armed-robbery-nintendo-name-change/) (snippet only); [X post](https://x.com/FunkoPOPsNews/status/2025341204502642746) (snippet only)
- **"animal-island-ui", 3 September 2026.**
  - Wildwood Law, acting for NoA, sent GitHub a *combined* DMCA and trademark notice. It said the repository showed "Nintendo's Animal Crossing characters and imagery and a logo designed to mimic Nintendo's Animal Crossing logo designs, in connection with the distribution of a UI component library".
  - It cited 17 U.S.C. § 501 and the Lanham Act, 15 U.S.C. § 1125.
  - Because the network exceeded 100 repositories and the forks were alleged to infringe to the same extent, GitHub disabled the entire network of 377 repositories (318 forks at the time of the letter).
  - The project's name did not use "Animal Crossing", but its imagery was copied and its logo mimicked Nintendo's. This is the most recent and closest "lookalike" precedent I found.
  - Source: [GitHub DMCA 2026-09-03](https://github.com/github/dmca/blob/master/2026/09/2026-09-03-nintendo.md) (opened)
- **Third-party marks matter too (October 2026).** The creator of a browser fan game, "Pokémon Wordle", announced it would come down on 3 October 2026 after The New York Times contacted them about infringing its Wordle rights. — [Siliconera](https://www.siliconera.com/fan-game-pokemon-wordle-to-be-taken-down/) (snippet only); [GoNintendo](https://gonintendo.com/contents/65645-fan-made-pokemon-wordle-browser-game-being-taken-down-due-to-new-york-times-request) (snippet only)
- **Counter-example: PokeRogue.**
  - I found no reported Nintendo takedown of PokeRogue, a viral browser Pokémon roguelike.
  - Its lead developer resigned on 16 May. The year is not in the snippet; 2024 is inferred from the game's launch.
  - Reports say he could not moderate his time on the project and that "it couldn't be monetized as a fangame".
  - Sources: [Game Rant](https://gamerant.com/pokerogue-lead-developer-quits-why/) (snippet only); [Dot Esports](https://dotesports.com/pokemon/news/pokerogue-creator-walks-away-from-viral-pokemon-project-after-adding-an-ending) (snippet only)

### Inferences
- **Trigger matrix** (my reading of the cases above):
  - Pokémon **name/mark**: Uranium, Prism, Game Jolt 2016/2018/2020 (the 2020 notice was explicitly a trademark notice), Poké Court.
  - **Ripped or copied assets or code**: pokereact, Game Jolt lists, Prism (ROM hack), Essentials ("sprites, icons, music"), Palworld mod, HeavenStudio, China case, animal-island-ui.
  - **Pokémon creatures/characters**: pokereact, China case, Palworld mod, most of the Game Jolt games.
  - **Publicity or virality**: Uranium (1.5M downloads in a week), Prism (announced release date), Relic Castle (biggest hub), Palworld mod (went viral within a day).
  - **Monetisation**: China case and Poké Court (commercial). It is not a precondition: Uranium, Prism, Essentials and the Game Jolt games were free.
  - **Logo mimicry**: animal-island-ui.
- Nintendo's notices identify games by content. A neutral title does not protect a project that contains Pokémon assets (the Game Jolt slugs "tall-grass" and "monster-battle-working-title").
- The converse looks true in practice: I found no notice, suit or C&D against a project whose only resemblance was the general top-down pixel-art look with original names and art. The public archives (GitHub, Game Jolt) are searchable, and none of their Nintendo notices is of that kind.
- An open-source repo is easy to scan. GitHub notices can take down a whole fork network (377 repos for animal-island-ui), so a single ripped sprite or mimicked logo committed to the repo could disable every fork.

### Gaps
- I could not open the Uranium or Prism notices or C&D letters themselves (archive.org and Wikipedia blocked). Uranium's mix of original "fakemon" and official Pokémon is not confirmed in sources I could open.
- Relic Castle's sender is unconfirmed (press presumed TPC).
- Private cease-and-desist letters that never became public cannot be captured. The absence of style-only cases is evidence from public records, not proof.
- itch.io publishes takedown notices (for example a listing titled "Takedown notice for 'Pokemon VR'", [itch.io/takedowns/14868](https://itch.io/takedowns/14868), snippet title only), but itch.io was blocked, so I could not review them.
- I could not find the reported "PokéCon" fan-event demand; my search returned nothing usable, so it is omitted.

---

## 2. Palworld: Nintendo and TPC v. Pocketpair (patents, Japan); what Pocketpair changed; status at October 2026; related Nintendo patents

### Takeaway
Nintendo and TPC sued Pocketpair in the Tokyo District Court on **18 September 2024**. The suit is about Japanese patents on specific mechanics, not about art or character copying:
- throwing an item to capture or summon a creature;
- capture judgement and probability display;
- riding a creature to fly or glide.

Pocketpair patched out ball-throw summoning in **v0.3.11 (November 2024)** and Pal-gliding in **v0.5.5 (May 2025)**, calling both changes preventive. In **late 2025** the plaintiffs narrowed the suit to pre-patch builds. As of early October 2026 no judgment had been reported; low-reliability sites put an evidence hearing on 1 October 2026 and an opinion on 9 November 2026.

Related Nintendo patents have fared badly:
- The Japan Patent Office (JPO) rejected related applications. One rejection cited a 2013 Pokémon *fan game* video as prior art.
- In a rare Director-ordered reexamination, the USPTO non-finally rejected all 26 claims of US 12,403,397 (the "summon and fight" patent) around 1 April 2026.

### Cited Findings
- **Filing.** Nintendo, together with TPC, filed the patent suit in the Tokyo District Court on 18 September 2024, alleging Palworld infringes multiple patents. — [Lexology](https://www.lexology.com/library/detail.aspx?g=877a30d3-dca1-48d0-a127-b701baa414f5) (snippet only); [TipRanks/The Fly](https://www.tipranks.com/news/the-fly/nintendo-pokemon-company-file-patent-infringement-suit-against-palworld-maker) (snippet only)
- **What the patents cover.** Three Japanese software patents on functional mechanics: capturing and summoning creatures by aiming and throwing an item, a real-time capture-probability indicator (also described as deciding whether a thrown object starts a battle or a capture), and mounting a creature to fly or glide. — summarised from [Game Developer](https://www.gamedeveloper.com/business/pocketpair-is-changing-palworld-further-due-to-ongoing-nintendo-and-pok-mon-lawsuit) and others (snippet only)
- **Patent numbers.** One site names JP 7545191 and JP 7493117, says both were filed and granted in 2024 after Palworld's January 2024 launch, and says Nintendo "is not claiming Pocketpair copied Pokemon's art". — [lawfold.com](https://lawfold.com/nintendo-palworld-patent-lawsuit/) (snippet only; low-quality SEO site, unverified). I did not verify the third patent number.
- **Pocketpair's changes.**
  - Patch **v0.3.11** (described as the November 2024 update) removed summoning Pals by throwing Pal Spheres; Pals now appear next to the player.
  - From **v0.5.5** gliding uses a glider rather than a Pal, though Pals in the party still give passive gliding buffs.
  - Pocketpair confirmed the changes were made because of the litigation, called them preventive so that development and distribution could continue, and did not treat them as an admission.
  - Sources: [Game Developer](https://www.gamedeveloper.com/business/pocketpair-is-changing-palworld-further-due-to-ongoing-nintendo-and-pok-mon-lawsuit) (snippet only); [The Sixth Axis, 9 May 2025](https://www.thesixthaxis.com/2025/05/09/pocketpair-confirms-palword-changes-are-in-response-to-pokemon-company-lawsuit/) (snippet only); [Out of Games](https://outof.games/news/8079-you-can-no-longer-use-your-pals-to-glide-in-palworld-thanks-to-the-nintendo-vs-pocketpair-lawsuit/) (snippet only)
- **Claims narrowed.** In late 2025 the plaintiffs amended their Tokyo complaint to target only older, pre-patch builds of Palworld sold in Japan. Reports say the case no longer threatens current versions. — [GoNintendo](https://www.gonintendo.com/contents/61830-report-claims-nintendo-s-current-palworld-patent-case-no-longer-threatens-new) (snippet only); [Massively OP, 15 Jun 2026](https://massivelyop.com/2026/06/15/nintendos-amended-infringement-suit-against-palworld-may-result-in-a-chump-change-payout/) (snippet only); [Windows Central](https://www.windowscentral.com/gaming/nintendo-wanted-to-block-palworld-now-it-faces-a-0-percent-chance-and-a-measly-usd30k-payout) (snippet only)
- **Damages (conflicting reports).**
  - Windows Central and Hitmarker put the maximum at about ¥5 million (about $30,000). — [Windows Central](https://www.windowscentral.com/gaming/nintendo-wanted-to-block-palworld-now-it-faces-a-0-percent-chance-and-a-measly-usd30k-payout) (snippet only); [Hitmarker](https://hitmarker.net/news/nintendos-legal-battle-against-palworld-may-result-in-a-small-30-000-settlement-1736972) (snippet only)
  - Another report gives about $66,000. — [GoNintendo](https://www.gonintendo.com/contents/61830-report-claims-nintendo-s-current-palworld-patent-case-no-longer-threatens-new) (snippet only)
- **Court timetable (low reliability).** An evidence hearing on 1 October 2026 and a court opinion on 9 November 2026. — [palworldguide.com](https://www.palworldguide.com/blog/nintendo-palworld-lawsuit-october-2026) and [thelawyerworld.com](https://thelawyerworld.com/blog/nintendo-palworld-lawsuit-update-the-patent-fight-heads-to-its-october-reckoning/) (snippet only; both low-reliability)
  - Another SEO site says that as of 8 July 2026 the case was pending with no judgment, settlement or injunction, and that Pocketpair's invalidation trials at the JPO were ongoing. — [lawfold.com](https://lawfold.com/nintendo-palworld-patent-lawsuit/) (snippet only; low reliability)
- **JPO rejection 1.** Nintendo application 2024-031879 was rejected for lack of inventive step, citing prior art from ARK, Monster Hunter 4, Craftopia, Kantai Collection and Pokémon GO. — [Windows Central](https://www.windowscentral.com/gaming/nintendos-palworld-case-japan-patent-office-rejects-claim-not-original-enough) (snippet only); [spilled.gg](https://spilled.gg/japan-patent-office-rejects-nintendo-patent-application-linked-palworld-lawsuit-third-party-submits-prior-art/) (snippet only). I did not capture the date.
- **JPO rejection 2.**
  - Nintendo's touchscreen monster-capture application (No. 2026-019762, December 2021 priority) was rejected citing a June 2013 YouTube video, "Pokemon Generations – 3D Indie Pokemon Gameplay", which shows a player selecting and throwing a Poké Ball to catch Pikachu.
  - Nintendo argued that footage of a copyright-infringing fan game should not count as prior art. The examiner rejected that argument, and the rejection stood.
  - Sources: [Dexerto](https://www.dexerto.com/pokemon/nintendos-pokemon-patent-rejected-after-examiner-cites-2013-fan-game-3388757/) (snippet only); [GamesRadar](https://www.gamesradar.com/games/pokemon/you-saved-the-entire-industry-the-13-year-old-video-of-a-pokemon-fan-game-now-cited-in-the-rejection-of-a-nintendo-patent-is-being-celebrated-by-fans-happy-to-see-creative-freedom-win/) (snippet only); [AUTOMATON West](https://automaton-media.com/en/news/nintendo-patent-central-to-palworld-lawsuit-stays-rejected-as-jpo-shuts-down-objections-in-unusually-sharp-tongued-notice/) (snippet only)
  - **Date conflict:** one low-quality site says 18 July 2026 ([meyka](https://meyka.com/blog/nintendos-palworld-patent-rejected-by-japan-office-on-july-18-1907/)), but a Game Rant X post on the story is dated 16 July 2026 by its post ID ([X/GameRant](https://x.com/GameRant/status/2077838238467633453)). Treat it as mid-July 2026.
- **US 12,403,397 (summon a character and let it fight).**
  - Granted September 2025.
  - USPTO Director John Squires personally ordered a Director-initiated ex parte reexamination in November 2025, citing prior-art references including a Konami patent application. Reported as the first Director-initiated reexamination since 2012.
  - Sources: [Engadget](https://www.engadget.com/gaming/nintendo/nintendos-patent-on-summoning-fighting-npcs-is-being-reexamined-180949135.html) (snippet only); [ipfray](https://ipfray.com/uspto-director-squires-orders-rare-director-initiated-ex-parte-reexamination-of-nintendo-patent-indirectly-as-result-of-games-fray-article/) (snippet only); [Steptoe](https://www.steptoe.com/en/news-publications/nintendo-patents-surprise-review-signals-a-us-priority-shift.html) (snippet only)
  - Around 1 April 2026 the USPTO issued a **non-final** rejection of all 26 claims, based on a 2002 Konami application and a 2019 Nintendo application. Nintendo had two months, extendable, to respond.
  - Sources: [Anime News Network, 2 Apr 2026](https://www.animenewsnetwork.com/news/2026-04-02/us-patent-office-rejects-nintendo-patent-involving-summoning-characters-to-fight/.236043) (snippet only); [My Nintendo News, 1 Apr 2026](https://mynintendonews.com/2026/04/01/uspto-has-rejected-nintendos-summon-character-and-let-it-fight-pokemon-patent/) (snippet only); [Nintendo Life](https://www.nintendolife.com/news/2026/04/nintendos-summon-character-to-fight-patent-rejected-by-us-patent-office) (snippet only); [PC Gamer](https://www.pcgamer.com/gaming-industry/us-patent-office-revokes-nintendos-controversial-pokemon-battling-patent-in-nonfinal-decision/) (snippet only)
- **US 12,409,387 B2 (switching between rideable characters, for example from a flying Pokémon to a ridden one).**
  - Filed 2 May 2024 with priority from a 22 December 2021 Japanese application; assigned to Nintendo and TPC.
  - The Official Gazette entry is dated 9 September 2025.
  - Sources: [USPTO Patents Gazette entry](https://patentsgazette.uspto.gov/week36/OG/html/1538-2/US12409387-20250909.html) (snippet only); [Game Developer](https://www.gamedeveloper.com/business/nintendo-patents-character-summoning-and-battling-mechanic-in-the-united-states) (snippet only)
  - A video-game IP lawyer quoted by PC Gamer called the new US patents "an embarrassing failure of the US patent system". — [PC Gamer](https://www.pcgamer.com/gaming-industry/an-embarrassing-failure-of-the-us-patent-system-videogame-ip-lawyer-says-nintendos-latest-patents-on-pokemon-mechanics-should-not-have-happened-full-stop/) (snippet only)

### Inferences
- Nintendo's legal lever against Palworld, a hugely commercial lookalike, was patents on particular mechanics, not copyright in art style. That suggests Nintendo's lawyers did not think "it looks and plays like Pokémon" was actionable by itself when the creatures and art were Pocketpair's own.
- A society simulation (citizens, police, thieves, merchants, markets) with **no capture, summon-to-fight or ride-switching mechanics** has essentially no overlap with these patents.
- Patents are territorial, and the asserted ones are Japanese. The US patents are under reexamination or rejection. For a free browser project this is low risk; it would only matter for a commercial edition that added those specific mechanics in Japan or the US.

### Gaps
- I could not access the Tokyo District Court docket or Pocketpair's and Nintendo's official statements (pocketpair.jp and nintendo.co.jp blocked). The result of the 1 Oct 2026 hearing, and whether a 9 Nov 2026 opinion date is real, are unverified.
- Exact JP patent numbers and claims are only partly verified (low-quality source).
- I found no information on whether Nintendo answered the April 2026 USPTO non-final rejection.
- Palworld's 1.0 release date (reported as 10 July 2026 by a low-quality site) is unverified and omitted from the findings.

---

## 3. Pokémon-like games that shipped without legal trouble, and why

### Takeaway
Temtem, Nexomon, Cassette Beasts and Coromon are openly Pokémon-inspired creature collectors, and they are sold on **Nintendo's own Switch eShop**. I found no reported Nintendo or TPC legal action against any of them. What they share is original creatures, names, worlds, art and music, and no Pokémon marks in their titles. The genre and core loop were never the problem. The only lookalike that was sued (Palworld) was sued over patented mechanics.

### Cited Findings
- **Temtem (Crema).**
  - Came to Switch in September 2022. Nintendo Life's May 2022 headline called it a "Pokémon-Inspired Online Adventure". — [Nintendo Life](https://www.nintendolife.com/news/2022/05/temtem-brings-pokemon-inspired-online-adventure-to-switch-this-september) (snippet only)
  - Crema's Lucía Prieto described it as "a love song, a love letter to Pokémon". — [Gamereactor](https://www.gamereactor.eu/temtem-vs-pokemon-crema-games-calls-its-game-a-love-letter-to-game-freaks-title-1228023/) (snippet only)
  - Fans and press speculated about a lawsuit, but none materialised. — [TheGamer, "Could Nintendo Sue Over Temtem?"](https://www.thegamer.com/could-nintendo-sue-over-temtem/) (snippet only)
- **Nexomon and Nexomon: Extinction** have official Nintendo store pages. The search summary gave a Switch release of 17 Sept 2021 for Nexomon (unverified). — [nintendo.com (CA) Nexomon](https://www.nintendo.com/en-ca/store/products/nexomon-switch/) (snippet only); [nintendo.com (US) Nexomon: Extinction](https://www.nintendo.com/us/store/products/nexomon-extinction-switch/) (snippet only)
- **Cassette Beasts** (Bytten Studio / Raw Fury) is on Nintendo's UK store; the search summary gave a Switch release of 25 May 2023. — [nintendo.com (UK)](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-download-software/Cassette-Beasts-2383755.html) (snippet only); [Nintendo Life game page](https://www.nintendolife.com/games/switch-eshop/cassette_beasts) (snippet only)
- **Coromon** (TRAGsoft) has an official Nintendo store page. — [nintendo.com (US) Coromon](https://www.nintendo.com/us/store/products/coromon-switch/) (snippet only)
- **Contrast cases:**
  - Pocket Monster Reissue, which copied Pokémon characters and creatures, lost about $15 million in China. — [AUTOMATON West](https://automaton-media.com/en/news/the-pokemon-company-wins-15-million-copyright-infringement-lawsuit-against-china-based-game-developers/) (snippet only)
  - Palworld was sued over patents, not art (section 2).

### Inferences
- What kept these games safe in practice was **original expression and branding**: their own creature designs and names, their own world maps and towns, their own UI and logos, and no "Pokémon" or "Poké-" in titles or marketing. They kept similar mechanics (turn-based battles, collecting, top-down exploration).
- Nintendo distributing them on its own store is strong practical evidence that the genre and general look are not treated as infringing. It is not a legal clearance.
- A society sim with no creatures at all is further still from Pokémon's protectable expression than any of these games.
- Developers describing their game as a "love letter to Pokémon" in interviews, and press calling it "Pokémon-inspired", did not draw action. That is different from putting "Pokémon" in a product title, tags or SEO metadata (see section 4).

### Gaps
- I found no official developer statements about legal review or design choices made to avoid infringement, and no Nintendo statements on why these titles were left alone.
- Store pages and developer sites were blocked, so release dates come from search summaries.
- Monster Sanctuary, Loomian Legacy, Kindred Fates and others were not researched.

---

## 4. What is and is not protectable, and do/don't rules

### Takeaway
- **Protected by copyright:** Pokémon's specific *expression*: character and creature designs, sprites, tiles, maps, icons, UI art, logos and music. Nintendo's own notices claim "the audiovisual work, music, fictional character depictions, and other imagery" and "characters, sprites, icons, music". Close copies or traces of particular expressive elements can infringe even when the rules are free to copy (Tetris v. Xio, 2012).
- **Protected by trademark:** POKÉMON (US Reg. No. 2297050, cited by Nintendo), POKÉ BALL (registered 21 April 2020) and "Poké-" branding. Nintendo has enforced these against fan-game titles (2020) and a shop name (2026).
- **Lanham Act § 1125 / trade dress:** Nintendo has invoked it against logo mimicry (2026).
- **Patents:** cover specific mechanics in Japan and the US.
- **Not owned by anyone:** a general art style (top-down 16×16-tile pixel art, a bright handheld-era palette, a grid-based overworld) is an idea or genre convention.
- **Biggest risk:** ripped or traced assets and Pokémon names in metadata.

### Cited Findings
- **What Nintendo claims as protected copyright expression:**
  - "The copyrighted works are Nintendo's Pokémon video game franchise, including but not limited to the audiovisual work, music, fictional character depictions, and other imagery…" — [Game Jolt DMCA 2016-09-02](https://github.com/gamejolt/dmca/blob/main/2016/2016-09-02-nintendo.md) (opened)
  - "…unauthorized use of Nintendo's copyright protected Pokémon characters, sprites, icons, music and editing software." — [GitHub DMCA 2018-08-30](https://github.com/github/dmca/blob/master/2018/2018-08-30-Nintendo.md) (opened)
  - Nintendo lists ripped sprite PNGs file by file. — [GitHub DMCA 2024-03-28](https://github.com/github/dmca/blob/master/2024/03/2024-03-28-nintendo.md) (opened)
- **Idea vs expression: *Tetris Holding v. Xio Interactive*** (D.N.J., decided 30 May 2012).
  - Copyright protects the artistic aspects and the original way the rules are expressed, but not mechanical or utilitarian features necessary to how the game works.
  - Xio's "Mino" copied expressive elements (piece design and movement, colour schemes, visual elements) and was held to infringe both copyright and trade dress.
  - Sources: [Wikipedia](https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.) (snippet only); [Loeb & Loeb](https://www.loeb.com/en/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc) (snippet only)
- **Trademarks:**
  - Nintendo's trademark notice to Game Jolt cites "POKÉMON IC9 US TM Reg. No. 2297050" against fan-game page titles. — [Game Jolt DMCA 2020-12-29](https://github.com/gamejolt/dmca/blob/main/2020/2020-12-29-nintendo.md) (opened)
  - POKÉ BALL is registered to Nintendo of America (serial 87982815, registered 21 April 2020) for video-game goods and toys and games. — [uspto.report](https://uspto.report/TM/87982815) (snippet only); [Justia Trademarks](https://trademark.justia.com/879/82/poke-87982815.html) (snippet only)
  - A US application for "POKEMON CENTER NEW YORK POKEMON" was abandoned in 2003. — [uspto.report](https://uspto.report/TM/76350247) (snippet only). I did not confirm the current registration status of "Pokémon Center" or "Poké Mart" as such.
- **Name/prefix enforcement:** Nintendo asked "The Poké Court" to change its name and logo; it became "The Trainer Court" (early 2026). — [Kotaku](https://kotaku.com/pokemon-poke-court-nintendo-trainer-nyc-store-robbed-2000669827) (snippet only)
- **Logo mimicry / Lanham Act § 1125:** "a logo designed to mimic Nintendo's Animal Crossing logo designs" was a named ground in a takedown that disabled 377 repos (3 Sept 2026). — [GitHub DMCA 2026-09-03](https://github.com/github/dmca/blob/master/2026/09/2026-09-03-nintendo.md) (opened)
- **Patents on mechanics:** see section 2 (JP patents asserted against Palworld; US 12,403,397 under reexamination and non-finally rejected; US 12,409,387 issued Sept 2025).
- **Nominative fair use (US, Ninth Circuit test from *New Kids on the Block v. News America Publishing*):** you may refer to another's mark when:
  1. the product is not readily identifiable without it;
  2. you use only as much of the mark as reasonably necessary;
  3. you do nothing to suggest sponsorship or endorsement.

  Comparative references are allowed if they are not misleading and do not cause confusion about source or affiliation. — [Davis+Gilbert](https://www.dglaw.com/nominative-fair-use-defense-may-enable-use-of-anothers-trademark/) (snippet only); [ABA Landslide](https://www.americanbar.org/groups/intellectual_property_law/resources/landslide/archive/nominative-trademark-use-affirmative-or-negative-defense-infringement/) (snippet only). The circuits apply the defence differently, and the Supreme Court declined to resolve this in 2017. — [Kilpatrick Townsend](https://ktslaw.com/en/Insights/Alert/2017/1/Circuit-Split-Remains-SCOTUS-Passes-on-Defining-Nominative-Fair-Use) (snippet only)
- **Free licences do not clear trademarks or third-party rights.**
  - CC0 § 4(a): "No trademark or patent rights held by Affirmer are waived…"
  - CC0 § 4(c): the Affirmer "disclaims responsibility for clearing rights of other persons that may apply to the Work".
  - So a CC0 sprite that depicts a Poké Ball or Pikachu is still a Nintendo problem. — [CC0 1.0 text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/cc0-1.0.txt) (opened)
  - CC also advises against CC-licensing logos and trademarks. — [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)

### Inferences
**Practical do/don't rules.** These are my synthesis of the evidence above; each points to the case that supports it.

**Do:**
1. **Use only original art, or permissively licensed art with documented provenance.** Every takedown found involved copied assets or marks (section 1). Keep a per-asset log: file, source URL, author, licence, date, modifications.
2. **Design your own buildings and icons.** No red-roofed healing centre with a Poké Ball emblem, no blue-roofed "mart", no ball-shaped capture icons. The POKÉ BALL is a registered mark, and Nintendo claims "other imagery" and "audiovisual work".
3. **Name everything generically or originally:** "Clinic", "Market", "Police Station", "Town Hall". Avoid "Center", "Mart" or "-mon" constructions that echo Pokémon.
4. **Compose original music and sound effects**, or use CC0/CC-BY audio. Avoid recognisable melodies and jingles (the healing jingle, battle intros). Nintendo lists "music" in its claims.
5. **Use your own or an openly licensed pixel font.** Do not rip the GBA/DS in-game font (ripped imagery) or imitate the Pokémon logo lettering (logo mimicry was actionable in 2026).
6. **Describe the look generically:** "top-down pixel-art RPG look", "GBA-era / handheld-era JRPG style", "16×16 tile pixel art".

**Don't:**
1. **No ripped sprites, tiles, fonts or music** from The Spriters Resource, ROMs, Pokémon Essentials or fan-game kits. This includes traced or recoloured versions; edits of protected expression are still derivative. (Essentials 2018; Game Jolt 2016–2020; HeavenStudio 2024; Tetris v. Xio.)
2. **No "Pokémon", "Poké-", "Pokéball", "PokéMart", "Pokémon Center", "Pikachu" or creature names** anywhere: game title, repo or package name, domain, tags, store or itch.io text, SEO keywords, file names or code identifiers that ship. (Game Jolt 2020 trademark notice; Poké Court 2026.)
3. **No logo or trade-dress mimicry** (animal-island-ui, 2026), and no Pokémon-like title screen or logo composition.
4. **No creatures, trainers or capture balls that resemble Pokémon designs**, and no Pokémon-named NPCs (pokereact 2016; China 2024).
5. **Don't add throw-to-capture/summon or ride-switching mechanics** without a patent check if a commercial edition is planned (section 2). Low relevance for a society sim.

**Is "Pokémon-style" or "inspired by Pokémon" risky?**
- **Low risk:** a single plain-text factual sentence in a README or devlog ("visual style inspired by Game Boy Advance-era RPGs such as Pokémon"), with no logo, no stylised lettering and no suggestion of endorsement. This fits the nominative-fair-use factors, and similar statements by Crema drew no action.
- **Higher risk:**
  - using "Pokémon" as a store tag, SEO keyword or headline, or in the title;
  - repeated keyword stuffing;
  - anything implying affiliation.

  These look like trading on the mark, and Nintendo's notices match on content and titles.
- **Safest:** leave the word out entirely and use generic era descriptors. It costs little discoverability for a free open-source project.

**Risk ranking for this project:**
- **High:** ripped, traced or recoloured assets; Pokémon names or marks; mimicked logos or iconic buildings; Pokémon music.
- **Medium:** "Pokémon" in tags, SEO or store copy.
- **Low:** genre, mechanics such as overworld movement, NPC routines and markets, and a general top-down pixel-art look with original assets.

### Gaps
- I could not open 17 U.S.C. § 102(b), the court opinions (*Tetris v. Xio*, *New Kids on the Block*) or trade-dress authorities (*Two Pesos*, *Wal-Mart v. Samara*); hosts were blocked.
- Current US/JP registration status of "Pokémon Center", "Poké Mart" and "PokéMart" is unconfirmed.
- I found no source on Pokémon fonts specifically (the fan "Pokémon Solid" logo-style font, or copyright in bitmap fonts). The font rule above is inferred from the ripped-imagery and logo-mimicry evidence.
- Steam, itch.io and app-store policies on using third-party trademarks in tags or metadata were not researched (the policy archives I checked do not include them).
- Japanese Unfair Competition Prevention Act exposure (product configuration, famous marks) was not researched.

---

## 5. Asset licence obligations in an MIT-licensed open-source web app

### Takeaway
- **CC0:** no conditions; credit is optional.
- **CC-BY 3.0/4.0:** requires attribution, which may go in any reasonable place. A credits screen plus a linked CREDITS file satisfies it.
  - Credit the creator, keep notices, link the licence, and say if you modified the work.
  - Version 3.0 also requires the work's title, and if the game credits all contributors, CC-BY credits must sit among them "at least as prominent" as the others.
  - Neither version allows DRM.
- **CC-BY-SA and GPL art:** share-alike reaches only *adaptations of the art* (your edited sprites), not separate MIT code that loads it. CC treats unmodified works in a collection as not being adaptations, and GPLv3 says inclusion in an "aggregate" does not spread the licence. Edited BY-SA/GPL sprites must stay BY-SA/GPL, and for GPL their "preferred form for making modifications" must be available.
- **LPC art:** requires crediting every listed author.
- **OGA-BY:** CC-BY 3.0-style attribution without the DRM clause.
- **itch.io custom licences** (for example LimeZu's) typically allow use in games but forbid redistributing the asset files, so they **cannot be committed to a public repo**.

### Cited Findings
- **MIT covers "the Software".** "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software." — [MIT text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/mit.txt) (opened)
- **CC licences for code.** "We recommend against using Creative Commons licenses for software… our licenses are currently not compatible with the major software licenses." — [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)
- **CC0.** Public-domain dedication with no attribution condition. The CC FAQ, using CC0 scientific data as its example, says "you are not required to give attribution at all" but recommends giving credit anyway. CC0 § 4(a)/(c) does not license trademarks or patents and disclaims third-party rights. — [CC0 1.0](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/cc0-1.0.txt) (opened); [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)
  - Kenney's packs ship a CC0 License.txt: "free to use in personal, educational and commercial projects… crediting Kenney or www.kenney.nl (this is not mandatory)". — quoted in [eturner58/game-assets LICENSES.md](https://github.com/eturner58/game-assets/blob/main/LICENSES.md) (opened; third-party copy, repo updated 26 Aug 2026)
- **CC-BY 4.0 § 3(a).**
  - You must keep the creator's identification, copyright notice, licence notice, disclaimer notice and a URI if supplied; indicate modifications; and link the licence.
  - "You may satisfy the conditions in Section 3(a)(1) in any reasonable manner based on the medium, means, and context… it may be reasonable to satisfy the conditions by providing a URI or hyperlink to a resource that includes the required information."
  - "No downstream restrictions": no additional terms or Effective Technological Measures.
  - Sources: [CC BY 4.0 legal code](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by/4.0/legalcode.en.html) (opened); [plain text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/cc-by-4.0.txt) (opened)
- **CC FAQ on attribution.**
  - The licensor cannot insist on exact placement; attribution may be a link to where the information is found.
  - Versions before 4.0 also require the work's title.
  - You must indicate modifications.
  - Source: [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)
- **CC-BY 3.0 § 4(b).**
  - Credit "may be implemented in any reasonable manner; provided, however, that in the case of a Adaptation or Collection, at a minimum such credit will appear, if a credit for all contributing authors of the Adaptation or Collection appears, then as part of these credits and in a manner at least as prominent as the credits for the other contributing authors."
  - Required elements: author, title if supplied, URI.
  - "You may not impose any effective technological measures on the Work…"
  - Source: [CC BY 3.0 legal code](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by/3.0/legalcode.en.html) (opened)
- **DRM vs packed atlases.** CC licences bar Effective Technological Measures. However, "merely converting material into a different format that is difficult to access or is only available for certain platforms does not violate the restriction". Packing sprites into an atlas or minified bundle is a format change, not DRM. — [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)
- **Share-alike scope, 3.0.**
  - "Adaptation" excludes Collections.
  - A Collection is a work "in which the Work is included in its entirety in unmodified form along with one or more other contributions, each constituting separate and independent works".
  - Adaptations may be distributed only under the same licence (or a later or compatible one).
  - Source: [CC BY-SA 3.0 legal code](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by-sa/3.0/legalcode.en.html) (opened)
- **Share-alike scope, 4.0.**
  - § 3(b) ShareAlike applies only "if You Share Adapted Material You produce". The Adapter's Licence must be BY-SA (same or later) or BY-SA-compatible, with no added restrictions or ETMs on the Adapted Material.
  - "Adapted Material" means material "derived from or based upon the Licensed Material… translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission".
  - Sources: [CC BY-SA 4.0 text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/cc-by-sa-4.0.txt) (opened); [CC BY 4.0 definitions](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by/4.0/legalcode.en.html) (opened)
- **CC FAQ on collections and adaptations.**
  - Whether a use is an adaptation "depends primarily on the applicable copyright law". Syncing music to moving images is always an adaptation; the FAQ says nothing specific about art in games.
  - For collections, "You may choose a license for the collection, however this does not change the license applicable to the original material."
  - If combining does not create an adaptation, "you may combine any CC-licensed content so long as you provide attribution" (and respect NonCommercial).
  - Source: [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) (opened)
- **GPLv3 § 5, "aggregate".** "A compilation of a covered work with other separate and independent works, which are not by their nature extensions of the covered work, and which are not combined with it such as to form a larger program… is called an 'aggregate'… Inclusion of a covered work in an aggregate does not cause this License to apply to the other parts of the aggregate."
- **GPLv3 § 1.** "The 'source code' for a work means the preferred form of the work for making modifications to it."
  - Source for both GPL clauses: [GPL-3.0 text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/gpl-3.0.txt) (opened)
- **GNU GPL FAQ.** Game art and audio can be licensed separately from a GPL game engine, and "mere aggregation" does not combine works into one. — [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.en.html) (snippet only; gnu.org blocked)
- **Liberated Pixel Cup (LPC) and the Universal LPC Spritesheet Character Generator.**
  - Each sprite is under one or more of CC0, CC-BY, CC-BY-SA, OGA-BY or GPL.
  - The README says **"If you wish to use LPC sprites in your project, you will need to credit everyone who helped contribute to the LPC sprites you are using."**
  - Per licence:
    - CC-BY-SA: "Must credit the authors, may not encrypt or protect… Must distribute any derivative artwork or modifications under CC-BY-SA 4.0 or later".
    - OGA-BY: "Must credit the authors, may encrypt in DRM protected games".
    - GPL: "Must distribute any derivative artwork or modifications under GPL 3.0 or later".
  - CC-BY-SA is called the most restrictive, but it "allows you to use the art in this generator in commercial games".
  - The credits must be "accessible from within your game or app and can be reasonably discovered by users (for instance, show the information on the 'Credits' screen directly, or provide a visible link)". The README offers a template: an author list, the OGA LPC collection URL, a CC-BY-SA 3.0 licence link and a link to CREDITS.csv.
  - A footnote warns that the CC DRM clause makes Steam or iOS release uncertain, and recommends CC0 and/or OGA-BY assets for such platforms because "The OGA-BY license removes the DRM clause for precisely this reason."
  - Sources: [LPC generator README](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator/blob/master/README.md) (opened; repo updated 4 Oct 2026). The generator's own code is GPL-3.0 ([LICENSE](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator/blob/master/LICENSE), opened).
- **LPC CREDITS.csv scale** (my tally of 13,915 sprite entries' licence fields): OGA-BY 3.0 (8,122), GPL 3.0 (7,636), CC-BY-SA 3.0 (5,340), OGA-BY 3.0+ (2,381), CC-BY 3.0+ (2,332), GPL 2.0 (1,031), CC0 (1,011), CC-BY 3.0 (752), CC-BY 4.0 (483), CC-BY-SA 4.0 (231). A typical base body lists about 10 authors and "OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0". — [CREDITS.csv](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator/blob/master/CREDITS.csv) (opened)
- **itch.io custom licence (LimeZu "Modern Interiors").**
  - Full version, verbatim: "YOU CAN: Edit and use the asset in any commercial or non commercial project… YOU CAN'T: Resell or distribute the asset to others; Edit and resell the asset to others; Credits required (limezu.itch.io)".
  - The free version adds "YOU CAN'T USE THE ASSET IN COMMERCIAL PROJECTS".
  - The cataloguing repo's reading: "Redistribute the raw art: NO — this includes committing it to a public repo", and "Shipping the art inside a game build is fine — that is normal use."
  - Source: [eturner58/game-assets LICENSES.md](https://github.com/eturner58/game-assets/blob/main/LICENSES.md) (opened; a third party's verbatim copy and interpretation)
  - Search snippets agree: the complete version (at least $1.50) can be edited and used commercially but not resold or distributed, credits required. LimeZu also said an older CC licence was applied by mistake and that old zips "still have CC-BY", which he will not revoke. — [limezu.itch.io/moderninteriors](https://limezu.itch.io/moderninteriors) (snippet only); [itch.io post by LimeZu](https://itch.io/post/2550685) (snippet only)

### Inferences
**Recommended layout for an MIT repo with mixed art:**
- `LICENSE`: MIT, stating it applies to source code only.
- `assets/LICENSES.md` or `CREDITS.md`: a per-file table (file → author → source URL → licence → modified yes/no).
- Separate subfolders per licence family (`assets/cc0/`, `assets/cc-by/`, `assets/by-sa-gpl/`).
- An in-game Credits screen that shows or links to the credits. This satisfies CC-BY 4.0's "reasonable manner"; for CC-BY 3.0 and LPC, put the art credits *in* the credits screen if you have one.

**CC-BY-SA and GPL art.** Unmodified sprites loaded at runtime look like a *collection* or *aggregate*, so the MIT code stays MIT. Any sprite you edit (recolour, new frames) becomes Adapted Material and must be released under BY-SA or GPL. For GPL edits, also publish the editable source file (for example `.aseprite`/`.psd`) if that is your preferred form for modification. Never relabel BY-SA or GPL art as MIT. Where an LPC asset is multi-licensed, choosing its OGA-BY or CC-BY option (if offered) avoids share-alike. Note: the README says "one or more" licences but does not spell out an election rule, so this is my reading of dual licensing.

**DRM.** A static web build has no DRM, so CC-BY/BY-SA is fine. If a paid edition ever ships on a DRM store, prefer CC0/OGA-BY art or keep a DRM-free channel. This follows the LPC README's caution.

**itch.io "no redistribution" packs:**
- Keep them out of the public repo: `.gitignore` plus a private assets repo or private submodule, or a CI step that fetches them from private storage using a secret.
- Public forks and clones then build with placeholder (for example CC0) art.
- The deployed static site still serves the PNGs to every browser. That is "use in a project", which these licences allow. Packing into atlases reduces casual extraction but changes nothing legally.
- Read each pack's terms: some forbid redistribution "even modified", and free tiers are often non-commercial. LimeZu's free tier is non-commercial, which conflicts with a planned paid edition and possibly with donation-funded distribution.

**Simplest compliant path:** mostly CC0 (for example Kenney) plus your own art; CC-BY/OGA-BY for anything else, with a credits screen; avoid BY-SA, GPL and itch-custom art unless you accept the obligations above.

### Gaps
- OpenGameArt's FAQ and the OGA-BY 3.0 text (static.opengameart.org) were blocked; OGA-BY's content is known here only from the LPC README summary.
- The GNU GPL FAQ was snippet only.
- I found no court ruling on whether a video game is a "collection" or an "adaptation" of BY-SA art; CC defers to national copyright law.
- I did not verify the licences of other popular top-down packs (Cup Nooble "Sprout Lands", Kenmi "Cute Fantasy RPG", Cainos, Pipoya, finalbossblues "Time Fantasy") because itch.io was blocked.
- Whether CI-fetched restricted assets deployed to a public static host count as "distribution to others" under a given custom licence depends on its wording; I found no authoritative interpretation beyond the third-party reading quoted above.

---

## 6. AI-generated pixel art: US Copyright Office position and generator terms

### Takeaway
US law as of October 2026: purely AI-generated images are **not copyrightable**. Protection extends only to human contributions: perceptible human-made inputs, creative selection and arrangement, and creative modification of outputs.
- *Zarya of the Dawn*, 21 Feb 2023.
- Copyright Office Report Part 2, 29 Jan 2025.
- *Thaler v. Perlmutter*: the Supreme Court denied cert on 2 March 2026.
- *Allen v. Perlmutter* (prompt-heavy Midjourney work) was still pending at last report.

A developer therefore cannot stop others from copying unedited AI sprites.

Major generators assign or leave you whatever rights exist and allow commercial use, with conditions. Midjourney, OpenAI and Google say so explicitly; Stability's ownership wording covers "Content that you submit". Midjourney requires a Pro or Mega plan for companies with more than $1M revenue, and none of them warrants that outputs are non-infringing.

### Cited Findings
- ***Zarya of the Dawn* (21 Feb 2023).** The Office held Kristina Kashtanova to be the author of the text and of the "selection, coordination, and arrangement" of text and images, but found the Midjourney-generated images were not "human works of authorship", even after iterative prompting. — [Creative Commons blog, 27 Feb 2023](https://creativecommons.org/2023/02/27/zarya-of-the-dawn-us-copyright-office-affirms-limits-on-copyright-of-ai-outputs/) (snippet only); [Forbes, 22 Feb 2023](https://www.forbes.com/sites/mattnovak/2023/02/22/ai-created-images-in-new-comic-book-arent-protected-by-copyright-law-according-to-us-copyright-office/) (snippet only)
- **Copyright and AI Report, Part 2: Copyrightability (29 January 2025).**
  - Prompts alone do not give sufficient human control over expressive elements. "Even exhaustive prompt engineering" does not yield copyrightable expression with current tools.
  - Protection may exist for (a) human-authored inputs perceptible in the output, (b) creative selection, coordination or arrangement, (c) creative modifications of outputs, and (d) prompts that are themselves original works.
  - Contributions are assessed case by case, and existing law is sufficient.
  - Sources: [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/us-copyright-office-releases-part-2-of-artificial-intelligence-report-clarifying-copyrightability-of-generative-ai-outputs) (snippet only); [Copyright Alliance](https://copyrightalliance.org/ai-report-part-2-copyrightability/) (snippet only); [National Law Review](https://natlawreview.com/article/two-takeaways-us-copyright-offices-jan-2025-report-ai-created-works) (snippet only); [copyright.gov/ai](https://www.copyright.gov/ai/) (blocked)
- ***Thaler v. Perlmutter*.** The Supreme Court denied certiorari on 2 March 2026 (docket 25-449). The D.C. Circuit's holding stands: copyright requires human authorship, so Thaler's AI-generated image (by his system DABUS) cannot be registered. — [Holland & Knight, Mar 2026](https://www.hklaw.com/en/insights/publications/2026/03/the-final-word-supreme-court-refuses-to-hear-case-on-ai-authorship) (snippet only); [Finnegan](https://www.finnegan.com/en/insights/ip-updates/supreme-court-declines-to-hear-thaler-v-perlmutter-leaving-human-authorship-requirement-intact.html) (snippet only); [Baker Donelson](https://www.bakerdonelson.com/supreme-court-denies-certiorari-in-thaler-v-perlmutter-ai-cannot-be-an-author-under-the-copyright-act) (snippet only); [SCOTUSblog case page](https://www.scotusblog.com/cases/thaler-v-perlmutter/) (snippet only)
- ***Allen v. Perlmutter* (D. Colo.).**
  - Complaint filed 26 Sept 2024 (per the filename of the filed complaint PDF, [CCH](https://business.cch.com/ipld/AllenPerlmutterComp20240926.pdf), snippet only).
  - It challenges the refusal to register "Théâtre D'opéra Spatial". Allen used at least 624 Midjourney prompts, then Photoshop edits and upscaling.
  - One low-quality site reports that as of 12 Aug 2026 summary-judgment briefing was complete with no merits decision. — [rottenwifi.com](https://rottenwifi.com/artist-appeals-copyright-denial-for-prize-winning-ai-generated-work-what-allen-v-perlmutter-could-decide/) (snippet only; low reliability)
- **Midjourney Terms of Service.**
  - "You own all Assets You create with the Services to the fullest extent possible under applicable law", subject to exceptions:
    - ownership is subject to the Agreement and third parties' rights;
    - "If you are a company or any employee of a company with more than $1,000,000 USD a year in revenue, you must be subscribed to a 'Pro' or 'Mega' plan to own Your Assets";
    - upscaled images of others remain theirs.
  - Midjourney takes a perpetual, irrevocable licence to your inputs and Assets.
  - "You may not use the Service to try to violate the intellectual property rights of others, including copyright, patent, or trademark rights."
  - Assets are provided as-is, with no non-infringement warranty.
  - Source: [Open Terms Archive copy](https://github.com/OpenTermsArchive/genai-versions/blob/main/Midjourney/Terms%20of%20Service.md) (opened; repo state 4 Oct 2026)
- **OpenAI Terms of Use.**
  - "As between you and OpenAI, and to the extent permitted by applicable law, you (a) retain your ownership rights in Input and (b) own the Output. We hereby assign to you all our right, title, and interest, if any, in and to Output."
  - "Output may not be unique and other users may receive similar output… Our assignment above does not extend to other users' output."
  - You may not "represent that Output was human-generated when it was not".
  - Source: [Open Terms Archive copy](https://github.com/OpenTermsArchive/genai-versions/blob/main/OpenAI/Terms%20of%20Service.md) (opened)
- **Stability AI Terms of Service.**
  - "Inputs and Outputs… are together 'Content'", and "References in these Terms to Content you provide include Content you submit to, and Content you generate using, our Services."
  - The ownership clause reads: "As between you and Stability, and to the extent permitted by applicable law, you retain your ownership right in the Content that you submit". It is not explicit whether "Content that you submit" covers generated Outputs.
  - Prohibited: implying an Output is human-generated, and removing watermarks or provenance markers.
  - Source: [Open Terms Archive copy](https://github.com/OpenTermsArchive/genai-versions/blob/main/Stability%20AI/Terms%20of%20Service.md) (opened)
  - Stability's separate self-hosted model licence (revenue thresholds) was not opened; stability.ai and huggingface.co were blocked.
- **Google Generative AI terms.** "Some of our services allow you to generate original content. Google won't claim ownership over that content." — [Open Terms Archive copy](https://github.com/OpenTermsArchive/genai-versions/blob/main/Google%20Generative%20AI%20Services/Terms%20of%20Service.md) (opened)

### Inferences
- **"Owning" generated sprites is mostly contractual.** The generator will not claim them. But unedited AI sprites likely have no US copyright, so anyone could reuse them, and a CC-BY or MIT label on them is unenforceable. In an open-source project, marking them CC0 is the honest default.
- **To get protectable art,** use AI only for reference or ideation, then hand-draw or substantially hand-edit at the pixel level (the "creative modifications" route), or contribute your own perceptible input sketches. The selection and arrangement of tilesets and maps is also a human contribution.
- **Infringement risk is separate from copyrightability.** Prompting for Pokémon characters, "Pokémon style" or named creatures breaches Midjourney's IP clause and can reproduce protected designs or marks; the copied-asset cases in section 1 would apply. No generator warrants non-infringement. Avoid franchise names in prompts and review outputs for accidental resemblance (Poké Ball shapes, Pokémon Center-like buildings).
- **Small-scale pixel art is more prone to convergent similarity** with famous sprites, so manual review matters more than for high-resolution art (my inference, not sourced).
- **Disclosure and revenue tiers.** If the developer ever registers the game's art, AI-generated portions would need to be identified and excluded (Zarya). Midjourney's $1M-revenue rule matters only if the project becomes a company above that threshold.

### Gaps
- copyright.gov was blocked, so I could not read the Part 2 report, the March 2023 registration guidance (88 FR 16190) or the Zarya letter directly; the content comes from law-firm summaries.
- The D.C. Circuit decision date in *Thaler* is not confirmed in sources I could open.
- I did not research the "A Single Piece of American Cheese" (Invoke) registration from early 2025, Part 3 of the report (training), non-US positions (UK CDPA § 9(3) computer-generated works, China's Beijing Internet Court AI-image decisions) or pixel-art-specific generators' terms (PixelLab, Retro Diffusion, Scenario).
- Open Terms Archive snapshots show the terms as archived on 4 Oct 2026; I did not determine when each clause was last changed.
