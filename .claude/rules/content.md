# Content, IP and art rules

These apply everywhere: code, file names, assets, docs and store text. They summarise the round 3 research and are not legal advice.

## Pokémon style, never Pokémon property

- Never copy, trace or recolour Nintendo assets. That includes the pret decompilations, which may be used for numbers only, such as frame timings.
- Never use "Pokémon", "Poké-" or creature-style "-mon" names in titles, repo or package names, domains, file names, code identifiers, tags or store text.
- Give buildings generic names such as Clinic, Market, Police Station and Town Hall, with no look-alike healing centre or "Mart".
- Describe the look as "GBA-era top-down pixel art".
- Generated place names must pass the CI filter, which rejects names within edit distance 2 of Pokémon place names (kept only as a test fixture) and a profanity list.

## Assets and licences

- CC0 packs (Ninja Adventure, Kenney) may be committed, each with its licence file beside it.
- Paid packs such as LimeZu stay out of the public repo. Mana Seed is excluded.
- Record every asset file in `assets/LICENSES.md`: author, commit-pinned source URL, licence, SHA-256 and any edits.

## Art direction

1. Everyone shares one non-realistic blob body: no hair, age, gender or ethnic dress.
2. Jobs are removable clothes, such as a cap with a badge or an apron.
3. Crime is an act, never a costume: no mask, stripes, sack or lasting icon.
4. Records live at institutions, never as marks over heads.
5. Wealth never shows in bodies, clothes or houses by default.
6. Police iconography stays neutral: no weapons, flags or heroic poses. Wrongful stops are drawn as heavily as arrests.
7. No role wears black.
