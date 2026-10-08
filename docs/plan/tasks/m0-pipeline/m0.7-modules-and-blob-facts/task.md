# M0.7 Modules and blob facts

Part of [M0 Pipeline](../milestone.md).

The owner decided on 9 October 2026 to group every package into module folders by concern, to read and write blobs through a handle class, and to give each blob two facts first: a name and a wallet. [interfaces.md](../interfaces.md) holds the layout, the `Blob` API, the new column and the wallet accounts.

Needs M0.5 and M0.6 closed and committed, since every package moves. It comes before the map work the owner put ahead of M1, so that work starts in the new layout and can reuse this name filter for place names.

- **Builds:**
  - module folders: every source file of the nine packages moved into concern folders directly under `src/`, as `interfaces.md` lays out, with no change of behaviour, leaving only entry files at `src/` (Structure);
  - the lints that hold the layout: a profile that reports any other file at `src/`, a hot-path lint that names folders instead of files and checks class methods, getters and setters, `erasableSyntaxOnly` in the base tsconfig, and a dependency-cruiser rule that keeps `sim-culture` out of every `sim-core` folder but `consumption/` (Structure, R5, R8);
  - the `Blob` handle: one per world, made in `layoutWorld` and re-pointed with `at(index)`, with accessors for position, velocity, action, facing, `nameKey`, the wallet and its cash; per-tick loops use its accessors or plain columns and call no method per blob (Structure, R5);
  - names: a 32-bit `nameKey` column drawn at birth on a new `PERSON_NAME` stream and never read by the sim, and `personName(nameKey)` in `sim-culture`, which builds "Given Family" from a generated table of 1,024 words of the shared sound set (Structure, R8);
  - the one shared sound set, round 8's design H, in `tools/names`, which writes the name table; M8.1's place names reuse it (R8);
  - the person-name filter in `tools/names`, pulled forward from M3.7: M0.6's franchise ban and real-world fixture, plus distinctive Pokémon town and city names and species names (edit distance 1 up to 5 letters, 2 above) and the LDNOOBW Latin-script lists, so every word in the name table passes it (R3, R8);
  - wallets: one cash account per blob in the cash ledger, after the settlement accounts, opened at birth from MINT at the owner's opening balance, inside the invariant that all accounts plus MINT sum to zero (Structure, R1, R4);
  - per-tick invariant checks in development builds, tests and the CLI, set by a `checks` flag on `init`, because wallets make the check grow with population (Structure, R1);
  - the inspector's shell: a click or Enter on the view asks the worker for the nearest blob within one tile, and a small panel, loaded on demand, shows its name and wallet. M3.2 grows it into the click-to-explain inspector (Structure, R1).
- **Owner decided:** on 9 October 2026 the owner chose:
  - an opening wallet balance of 100,000 cents (1,000.00) for every blob, today's stand-in amount, until M2.5 calibrates wealth;
  - accessors in per-tick loops. Loops read blobs through the `Blob` handle, which cost 7% in `move`, and a loop measured more than 10% slower than plain columns keeps its columns. A method per blob, such as `blob.walk()`, measured 2.0–2.7× slower in `move`, past the movement budget, so it stays out of per-tick loops;
  - round 8's design H for the shared sound set.
- **Verify first:** a source for the Pokémon town, city and species names other than the pret decompilations, which content rules allow for numbers only, and the licence of each new fixture, which decide what `tools/names/fixtures/` may hold.
- **Exit checks:**
  - after the move, seed 42's replay hashes equal the goldens at every tier, every test, lint, typecheck, dependency-cruiser and name check that passed before still passes, and every built chunk is gated (Structure);
  - the layout lint rejects a planted file at `src/`, and the hot-path lint catches a planted allocation in a class method in a hot folder (Structure, R5);
  - `move` through the handle's accessors stays within 10% of the column loop at every tier, fastest of at least 9 interleaved samples, or `move` keeps its columns; the allocation gate counts zero scavenges at every tier (Structure, R5);
  - every word in the name table passes the full person-name filter and has at least 4 letters, and the table matches a fresh build (Structure, R8);
  - with a wallet per blob, all accounts plus MINT sum to zero every tick in CI's ledger gate at every tier, and the wallets sum to the population times the opening balance at tick 0 (Structure, R1);
  - clicking a blob shows its name and wallet in Chromium, Firefox and WebKit, and size-limit gates the inspector's chunk (Structure, R1).
