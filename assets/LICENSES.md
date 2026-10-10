# Asset licences

Every asset file in this folder, with its author, source, licence and SHA-256. `python tools/licenses.py` rewrites this file, and `python tools/licenses.py --check` fails when it is stale or a file lies outside the families below.

## Families

| Folder | What it holds | Licence |
|---|---|---|
| `sprites/`, `sounds/`, `maps/` | Originals, drawn, composed and generated as code for Nomos by the tools each row names. No third-party art or audio was copied, traced, sampled or recoloured. | The repository's licence once one is chosen (none yet; the plan assumes MIT for code) |
| `cc0/<pack>/` | A CC0 pack, kept only as a placeholder, with its licence file and a `SOURCE.json` (`author`, `url` pinned to a commit, `licence`, `edits`) that fills its rows. | CC0 1.0 |
| `paid/` | Paid packs, for local use only. The folder is git-ignored: nothing in it is committed or listed here. | The seller's terms |

Each SHA-256 is of the bytes git stores. Git stores `.json`, `.md` and `.txt` files with LF line ends, so the CRLF copies a Windows checkout writes hash as LF.

## Pack licences read on 8 October 2026

| Pack | Page read | What it says | Decision |
|---|---|---|---|
| Ninja Adventure (Pixel-boy and AAA) | https://pixel-boy.itch.io/ninja-adventure-asset-pack | The assets are "released under the Creative Commons Zero (CC0) license", the page lists the asset licence as Creative Commons Zero v1.0 Universal, and attribution is "not required but appreciated". The pack's own licence file is inside the download, which needs a browser, so it was not read; round 3 read a mirror's copy. | Commit only as a placeholder, with its licence file beside it. Nothing committed now. |
| Kenney | https://kenney.nl/support and the asset pages for Tiny Town, RPG Urban Pack, Roguelike Modern City and Emotes Pack, under https://kenney.nl/assets/ | "all game assets on the asset pages are public domain licensed (CC0)", credit is optional, and "Do not use our logo". Each of the four asset pages lists the licence as Creative Commons CC0. | Commit only as a placeholder, with its licence file beside it, and never use the Kenney logo. Nothing committed now. |
| LimeZu Modern Exteriors | https://limezu.itch.io/modernexteriors | You can edit and use it in any commercial or non-commercial project. You can't resell or distribute it to others, or edit and resell it. Credit is required. $5.00 list price. Tagged "No generative AI was used". The page states no AI-training clause, which round 3 had from a search summary; the licence .txt in the download was not read. | Not bought. If bought, it stays in the git-ignored `paid/` folder, with credit to LimeZu. |
| LimeZu Modern Interiors | https://limezu.itch.io/moderninteriors | The same terms for the complete version, which costs at least $1.50. | Not bought; as above. |
| Mana Seed (Seliel the Shaper) | https://seliel-the-shaper.itch.io/character-base | The page links its User License at https://selieltheshaper.weebly.com/user-license.html, which did not answer (the connection timed out twice), so the AI clause is still round 3's search summary. | Drop. Nomos excludes it. |

## Files

| File | Author | Source | Licence | SHA-256 | Edits |
|---|---|---|---|---|---|
| `maps/town.nmap` | Nomos contributors | `tools/worldgen/export_map.py` | Original; repository licence | `37dbc38fdbc9334a81b4085fcf1565500a268b3c3e99ad4e95f6ee144b76c515` | None |
| `sounds/ambience.json` | Nomos contributors | `tools/sounds/ambience.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `770042da91802b6d199e1a54d6217ac576e9d3efd631fc9ade68a9362d2541a8` | None |
| `sounds/events.json` | Nomos contributors | `tools/sounds/events.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `614fe2fc1bd7442c4f126c676f05a45660094e54b8f0df00e432e59d50aaa12f` | None |
| `sounds/justice.json` | Nomos contributors | `tools/sounds/justice.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `0bbd0ac878d350f02ff9becad449c16f641a4ae222a6ac1080765b4625d0a4d5` | None |
| `sounds/military.json` | Nomos contributors | `tools/sounds/military.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `63ecf6a75f9bd0b52723130b34f73073b4ee59c958f003a6b082c43cb3a26df5` | None |
| `sounds/music.json` | Nomos contributors | `tools/sounds/music.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `adc6ff3a17bbbd32bb61db7cd42c514285b49438d33035ce713d933a553b1028` | None |
| `sounds/ui.json` | Nomos contributors | `tools/sounds/ui.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `493f592ce33310a905b9968db533c3f50b5750cd96c5880adb650e12c82fdf5d` | None |
| `sounds/wonders.json` | Nomos contributors | `tools/sounds/wonders.py`, built by `tools/sounds/build_all.py` | Original; repository licence | `d1c2a64837c6536abf4c3c8042c811f3629c3de13e4a5a548e7b4fcebc5b8b95` | None |
| `sprites/animals.json` | Nomos contributors | `tools/sprites/animals.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `aea6239018a703f213e064da0a3f8fe9ce00e38461c24e3333b1d8bf43bf5826` | None |
| `sprites/animals.png` | Nomos contributors | `tools/sprites/animals.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `a698aa325234cb5da42e0cd6624f9e634578a90c8face0af6539f8ce026b0c75` | None |
| `sprites/buildings.json` | Nomos contributors | `tools/sprites/buildings.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `a780a81fc25c98272b105659c181767a09bb728fa1672752ff5233a708799f2b` | None |
| `sprites/buildings.png` | Nomos contributors | `tools/sprites/buildings.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `c648b320365ac0fae14b0e5b781767374b1dd4e797bdb7346fb39e35cf90bba6` | None |
| `sprites/characters.json` | Nomos contributors | `tools/sprites/characters.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `530924cccefcd36f1cbc9386f444ce7ad0f18eedfdf503c5974511826969f5f8` | None |
| `sprites/characters.png` | Nomos contributors | `tools/sprites/characters.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `19b8af5268558c7d7a4867bbb56757fef18932d9e35677566183f8039c868bb8` | None |
| `sprites/culture.json` | Nomos contributors | `tools/sprites/culture.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `910c58ce4bed1ad4697a84775a5b50921140c3f773124c57b7a55ecda5fa2f7d` | None |
| `sprites/culture.png` | Nomos contributors | `tools/sprites/culture.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `ea123eefd85439ef90964d5653347672c684a5fef16dfe66b0a80e5ed34dcf29` | None |
| `sprites/houses.json` | Nomos contributors | `tools/sprites/houses.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `c13300c41662e5f150b42ae0d2f378c2de98a9255435b55950c1f97f9820ca66` | None |
| `sprites/houses.png` | Nomos contributors | `tools/sprites/houses.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `593594d5947aa2f8398e92880a242decbe15a239f20ec6aa5fc37e44ec3e64b7` | None |
| `sprites/icons.json` | Nomos contributors | `tools/sprites/icons.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `31eb1746033757c73b8835aabbec6b265bfadb40c3bece9db69f671897b481f2` | None |
| `sprites/icons.png` | Nomos contributors | `tools/sprites/icons.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `82755a0fbd775e9d8070b4c1a02752e8f5e91bc5bb883b25f103b3053c491a8d` | None |
| `sprites/landmarks.json` | Nomos contributors | `tools/sprites/landmarks.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `71b415a26fc14702b03057d8a5028b9705598ccd671ca8691edc6acbe5d57cf5` | None |
| `sprites/landmarks.png` | Nomos contributors | `tools/sprites/landmarks.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `0a19a9554c7bcb789650edd2cf6b727752fca44e46ede63b9b062af5b21e2bb0` | None |
| `sprites/map.json` | Nomos contributors | `tools/sprites/map.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `2b8e8b9fb6db20f481b8c045070d308ca7ac050a81038ed56e839cc08b071c1d` | None |
| `sprites/map.png` | Nomos contributors | `tools/sprites/map.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `55433733bc5f03ee8fa49b818fda475e790607f580f5576c43bc85e1f13e153d` | None |
| `sprites/military.json` | Nomos contributors | `tools/sprites/military.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `7fa172163541582d08b69612fd9132eb46cf652a0c71a6c33e8b0d5590defda5` | None |
| `sprites/military.png` | Nomos contributors | `tools/sprites/military.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `562176d04933325025b5addb091fb2d5ad0512b09b71218a38623cf22b34e3b2` | None |
| `sprites/nature.json` | Nomos contributors | `tools/sprites/nature.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `1c462977e2228cbc55193c409c04cd4289df50aa6762d460b5bd3bc6ebc1610b` | None |
| `sprites/nature.png` | Nomos contributors | `tools/sprites/nature.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `e0995682ea48f25f3f519c925bad26b5c079e6325ee5da680c361b73d47bc937` | None |
| `sprites/scenery.json` | Nomos contributors | `tools/sprites/scenery.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `7fbd75061ca8c5384110bd8a8349b18444a3ce8406e552e808f534c3eeb9b40a` | None |
| `sprites/scenery.png` | Nomos contributors | `tools/sprites/scenery.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `b6ef609ff06d56d6f67d5a36587127fc0ee83f0b1bf5a27393ff8a4b8c6c5541` | None |
| `sprites/season_map.json` | Nomos contributors | `tools/sprites/seasons.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `3cefeec8f707527df7318c1f7261df06afa23c662ba06221039f5cf7c7545be6` | None |
| `sprites/seasons.json` | Nomos contributors | `tools/sprites/seasons.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `08be50fc22d2946f774883d31b4470604c17eb758d8dea7c98634307ccffa7af` | None |
| `sprites/seasons.png` | Nomos contributors | `tools/sprites/seasons.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `3fcb6a753fd91a8080a652a4cfe0ffdc764466a0ec7a3f74a4b4cc9978311ed4` | None |
| `sprites/walls.json` | Nomos contributors | `tools/sprites/walls.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `82cf5e2f622c6cf3e8ba0436bbdc41f21234f4926dfec99ea97fbc89119614e4` | None |
| `sprites/walls.png` | Nomos contributors | `tools/sprites/walls.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `d195be95ffc86f82b775034cb5de8bca5fbff760750480bba974e8947d390f5c` | None |
| `sprites/wonders.json` | Nomos contributors | `tools/sprites/wonders.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `c8664528b829579f4ef473dbf709a43af99aa73b1ddd2ff74060b0b207139160` | None |
| `sprites/wonders.png` | Nomos contributors | `tools/sprites/wonders.py`, built by `tools/sprites/build_all.py` | Original; repository licence | `9835bffd8099cf0bebf6760fe2a5d9d5cbb2261dc937ee1a9d9ec67af11fac0c` | None |
