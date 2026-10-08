# M0.7 Modules and blob facts: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Order:** the move, the lints, the handle, wallets, names, then the inspector.
  - The move comes first and changes no behaviour, so the goldens prove it: seed 42 still hashes what `goldens.json` holds when the move starts, at tick 1,000 on every tier.
  - Wallets and names then move the goldens once each. Regenerate them with `node packages/sim-core/scripts/goldens.ts` in the commit that moves them.
- **The move (Structure):**
  - Move each file with `git mv`, so history follows it. Make one commit per package, and never mix a move with a change of behaviour.
  - Each package's commit also updates every reference to its files from elsewhere, such as `apps/web`'s import of `tools/bench`'s `loadavg.ts` and the Python test that reads render-gl's `skin-a.json`.
  - Entry files stay at `src/`. So `package.json` exports and scripts, CI workflows and the commands in `CLAUDE.md` need no change.
  - [interfaces.md](../interfaces.md), "Layout", gives every file's folder. Two files are renamed and one is split:
    - `memory.ts` becomes `memory/arena.ts`, and `money.ts` becomes `money/ppm.ts`;
    - `world.ts` splits into `world/world.ts` and `world/checkpoint.ts`, which takes the hash, checkpoints and restore.
  - "The move's path references", below, lists everything that names a source path.
- **Lints that hold the layout (Structure, R5, R8):**
  - **Layout:** a profile with its own copy of `no-restricted-syntax` reports the `Program` of any `{packages,apps,tools}/*/src/*.ts` that is not an entry file. The entry list lives in `eslint.config.js`.
  - **Hot folders:** `HOT_FILES` becomes every `packages/sim-core/src/*/**` folder except `random/` and `memory/`, plus `packages/sim-protocol/src/snapshot/**`. `maths/apportion.ts` and `step/warm.ts` stay out, as today. A new concern folder is then hot by default, and cold code says so with a `COLD` name.
  - **Classes:** `IN_HOT` adds every `MethodDefinition` that is not a constructor and has no `COLD` name, so methods, getters and setters are checked. A new selector bans arrow-function class fields in hot folders.
  - **TypeScript:** `erasableSyntaxOnly` joins `tsconfig.base.json`. Node runs `.ts` files by stripping types, and it rejects parameter properties and enums only when the file runs.
  - **Culture:** a dependency-cruiser rule, `culture-stays-in-consumption`, lets no `sim-core` module outside `consumption/` and `index.ts` reach `sim-culture`. Every other folder, `agents/` among them, then stays safe for guarded code to import.
  - **The page:** in `apps/web`, only `src/panels/inspector.ts` may import `@nomos/sim-culture`, so names reach the screen only through the inspector (R8).
- **The `Blob` handle (Structure, R5):**
  - `layoutWorld` makes `world.blob` once, so `createWorld`, `restoreWorld` and `warmUp` all get one. Its API is in `interfaces.md`, "Agents and the Blob handle".
  - It copies the column references it exposes at construction and keeps its row in a private field.
  - `at(index)` returns nothing. A handle then can't be held under two names, so code that needs two rows makes a second handle at world creation.
  - **The probe** (measured here, Node 24.18.0, AMD Ryzen 5 3600 desktop, MSYS `/proc/loadavg` 0.57–1.93 across runs). Each figure is the fastest of 15 samples of 200 ticks after 2 warm samples. Worlds of seed 42 stepped identical trajectories, and their positions matched at the end. Variant order was rotated between runs.

    | `move`'s walking loop | 10k agents | 100k agents | Against columns |
    | --- | --- | --- | --- |
    | Hoisted columns, today's code | 0.0390 ms | 0.391–0.392 ms | 1.00× |
    | Accessors on one re-pointed handle | 0.0417 ms | 0.420 ms | 1.07× |
    | `blob.walk()`, a method per blob that calls `walkableAt` | 0.106–0.107 ms | 1.056–1.090 ms | 2.69–2.78× |
    | A `walk` method with the tile test written out | 0.0763 ms | 0.773 ms | 1.96–1.98× |

  - By the plan's ×0.75 desktop multiplier, a method per blob puts the walking loop alone near 0.14 ms RM at 10k and 1.41 ms RM at 100k, against `move`'s budgets of 0.10 and 0.8 ms. Accessors stay near 0.056 and 0.56 ms RM (inference). The probe timed the walking loop only; `move`'s redraw pass touches a 64th of the agents each tick.
  - M0.6 Task 10 saw the same effect: writing out a `turnAround` call that V8 left uninlined took `move` from 0.460 to 0.405 ms at 100k (measured there, same machine).
  - **The rule that follows:** per-tick loops read rows through the accessors or plain columns, and call no method per blob. A method on `Blob` acts on its own row and may serve births, the inspector and anything else that touches a few blobs a tick.
  - **The A/B check:** `move` moves to accessors only if it stays within 10% of the column loop at every tier. Use R5's statistic, the fastest of at least 9 samples, in interleaved order, run twice with the order reversed. Otherwise `move` keeps its columns: that is the fallback. The step plan keeps one `move`, never both.
  - **When a system may be a class (ruling):** a system stays a plain function unless it owns working objects made once, such as a second handle or scratch arrays. Then it is a class made once at world creation, with a per-tick method under the hot-path rules. Sim classes use no inheritance, and every canonical value stays in the arena.
  - The name `Blob` is the owner's. It shadows the Web API's `Blob` in modules that import it, and only sim packages and tools do, none of which uses the Web one.
- **Names (Structure, R8):**
  - `addAgent` draws `nameKey` at birth as `draw1(seed, PERSON_NAME, id)`. The sim stores it, never reads it, and hashes it with the other canonical columns.
  - `personName(nameKey)` in `sim-culture` turns it into "Given Family" from `NAME_WORDS`. M3.7 adds the naming custom's structure as a second argument.
  - **One sound set, beside its filter.** `tools/names/src/sound-set/sound-set.ts` holds round 8's design H and draws its candidate words. M8.1's place-name table and its trigram screen use the same module, so Nomos has one sound set.
  - **The word table is built, not filtered at run time.** `tools/names/scripts/words.ts` draws candidates on a fixed build seed. It keeps a word only if it has 4–10 letters, is new and passes `rejectName`, and stops at 1,024 words. It writes them sorted to `sim-culture`'s generated `src/naming/words.ts`, and `--check` fails when that file is stale.
    - Round 8 proposed filtering on display, at about 0.5 ms a name. That would ship the franchise and real-world lists to every visitor, while content rules keep them "only as test fixtures".
    - A table ships only words that passed, and every name passes for every seed, which a sample of seeds can't promise.
  - **The 45% problem** (checkpoint 0015: 45% of 2–3 syllable names hit the real-world fixture) now costs only build time, as the script draws until 1,024 words pass.
    - **Ruling:** a 4-letter floor. The filter's tokens start at 3 letters, so 4 keeps a margin, and the shortest words are likeliest to spell an English word (inference). Round 8's naive rule hit 3- and 4-letter names alike, 41.7% and 42.0%, so the floor is for reading, not for the filter.
    - The script prints its rejection rate by length and by rule, the evidence M3.7's 5% target asks for. At run time that target then holds by construction.
  - **Design H** is round 8's lowest-scoring passing design, 0.209 against a 0.26 review bar ([R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, measured there). It has 12 consonants, an r cluster, the vowels a, e, i, o, u and ae, and syllables CVC, CV, CCV and a word-initial V. Words have 2 syllables 70% of the time and 3 otherwise. The trigram screen comes later, in M8.1's brief, and re-screens the sound set.
  - **One table serves given and family names,** as round 8's one shared sound set asks (decision k). That gives 1,024² ≈ 1.05 million full names. At 100k agents about 4,800 pairs share a full name, and each given word serves about 98 people (computed).
- **The person-name filter (R3, R8):** `rejectName(word)` in `tools/names/src/filters/name-filter.ts` joins four checks:
  - M0.6's franchise ban and real-world fixture;
  - distinctive Pokémon town and city names, and species names, at edit distance 1 up to 5 letters and 2 above, from `fixtures/avoid-places.txt` and `fixtures/avoid-species.txt`. No file name holds the franchise name;
  - the LDNOOBW Latin-script lists in `fixtures/profanity.txt`, exact for 3-letter entries and by substring for 4 or more. LDNOOBW is CC BY 4.0, so its licence file and attribution sit beside it;
  - each new fixture gets a source note in `fixtures/sources.json`, as M0.6's CLDR and Wikidata lists have.
- **Wallets (Structure, R1, R4):**
  - `layoutWorld` calls `createLedger(arena, SETTLEMENTS, agents)`. `populate` re-points `world.blob` at each new row, sets its position, and issues `OPENING_CENTS` from MINT into `blob.wallet`.
  - The households sector account is no longer funded in city mode. MINT ends at −population × `OPENING_CENTS`: −10¹⁰ cents at 100k with the stand-in, far inside 2⁵³ (computed).
  - **Left to M2:** flows between wallets; non-negative cash, which checkpoint 0015 assigns to M2; household cash as a multiple of monthly wages (M2.1); cash apportioned from the ledger record (M2.2); and the wealth spread (M2.5).
  - **Nothing blocks M9's fold.** The canonical settlement ledger and a city's wallets can be two `Ledger`s, and the fold sums wallets into the households account.
- **Checks (Structure, R1):** wallets make `checkInvariants` grow with population.
  - Measured here (same machine and Node, fastest of 9 × 200 calls, load 1.93): 0.048, 0.107 and 0.329 ms a tick at 10k, 25k and 100k with wallets, against under 0.001 ms without. That is about 0.44 ms RM at 100k, a sixth of the tick's 2.7 ms slack (inference).
  - **Ruling:** per-tick checks run where `sim-core.md` asks, in development. That means tests, the CLI, CI's ledger gate and dev builds.
  - The app sends `init.checks` as `import.meta.env.DEV`, the render-gl harness sends true, and production workers skip the check.
- **The inspector's shell (Structure, R1):**
  - `view/camera-input.ts` tells a click from a drag. A pointer that moves under 4 CSS px between down and up is a click (unsourced estimate). Enter on the focused view inspects its centre, and the view's `aria-label` says so.
  - The app turns the device pixel into a world pixel with render-gl's new `worldAt` and posts `inspect`. The worker answers with `nearestAgent` within one tile.
  - `panels/inspector.ts` loads on demand at the first inspect. It is vanilla TypeScript, like the HUD, and shows the name and the wallet in an `aria-live="polite"` region, or "No blob here".
  - **Ruling:** two lines of text don't justify Solid's or Preact's bytes. M3.2's full inspector makes that choice.
  - **Ruling:** the wallet appears only in the inspector, never on bodies, bubbles or skins (content rule 5). Round 6 puts freshness and wellbeing drivers there too ([R6 report](../../../../research/round-6-goods-and-wellbeing/report.md), "On screen", at its lines 137 and 186).
  - Names appear only in the inspector, which round 8 allows with the follow-cam. No justice view exists yet.

## Packages and files

- `packages/sim-core`: the move; `agents/blob.ts` and `agents/nearest.ts`; `nameKey` and `PERSON_NAME` in `agents/store.ts` and `random/streams.ts`; wallets in `money/ledger.ts` and `world/world.ts`; tests.
- `packages/sim-protocol`: the move; `init.checks`, `inspect` and `inspected` in `messages/messages.ts`.
- `packages/sim-worker`: the move; `loop/loop.ts` sets `world.checks` from `init` and answers `inspect`.
- `packages/sim-culture`: the move; `naming/person-name.ts` and the generated `naming/words.ts`.
- `packages/render-gl`: the move; `worldAt` in `camera/camera.ts`; the harness sends `checks: true`.
- `apps/web`: the move; click and Enter in `view/camera-input.ts`; `panels/inspector.ts`; `inspect` in `app/app.ts`; a size-limit entry for `inspector-*.js`.
- `tools/bench`, `tools/cli`: the move only; `tools/cli` has nothing to move.
- `tools/names`: the move; `filters/name-filter.ts`, `sound-set/sound-set.ts` and `scripts/words.ts`; the new fixtures, licences and source notes.
- Root: `eslint.config.js`, `.dependency-cruiser.cjs` and `tsconfig.base.json`.

## The move's path references

- **`eslint.config.js`:**
  - `HOT_FILES` and `IN_HOT`, as above;
  - `GENERATOR_FILES`, which become `random/{draw,noise}.ts` and `sim-protocol`'s `map/map.ts`;
  - the exemption blocks for `agents/store.ts` (look writes), `money/ppm.ts` (`mulPpm`) and `maths/apportion.ts` (`BigInt`);
  - the `UNREAD_LOOK` message, which names `src/agents/store.ts`.

  `GUARDED` stays as it is.
- **`.dependency-cruiser.cjs`:** the `kernels.ts` paths stay, since entries don't move. Add `culture-stays-in-consumption`.
- **Lint tests that name paths:**
  - `packages/sim-core/test/{lint,culture-wall,depcruise}.test.ts`, whose real-tree paths `index.ts`, `kernels.ts` and `consumption/stand-in.ts` stay put;
  - `apps/web/test/frameworks.test.ts`.

  Tests that plant `src/planted.ts` move the plant into a neutral folder such as `memory/`, since the layout lint now reports any file at `src/`.
- **Test imports of moved modules:**
  - 25 files in `packages/sim-core/test`;
  - 7 in `packages/render-gl/test`, the browser specs among them;
  - 4 in `apps/web/test`, 7 in `tools/bench/test` and 3 in `tools/names/test`;
  - `packages/sim-protocol/test/sprite-manifest.test.ts`.

  Tests that import `../src/index.ts` need no change.
- **Scripts:**
  - `packages/sim-core/scripts/tables.ts`, with its output `src/maths/tables.ts`;
  - `day-length.ts`, with its output `src/time/day-length.ts`;
  - the imports in `goldens.ts` and `stdlib-probe.ts`;
  - `packages/sim-protocol/scripts/manifest-types.ts`, with its output `src/sprites/sprite-manifest.ts`;
  - `tools/names/scripts/build-real-world.ts`.

  Move a generated file and its generator's output path in the same commit.
- **Paths counted from a file's own place:**
  - `apps/web/src/app/boot.ts` imports `../../../../assets/maps/town.nmap?url`;
  - `tools/names/src/filters/real-world.ts`'s `FIXTURES` becomes `../../fixtures/`;
  - render-gl's `skin-a.json` imports in `backends/` and `dots/`.
- **Deep imports across packages:** `apps/web/test/browser/startup.spec.ts` imports `@nomos/bench/src/machine/loadavg.ts`.
- **Python:** `SKIN_A` in `tools/sprites/test_skin_a.py`, and the docstring of `tools/worldgen/mapfile.py`.
- **Unchanged by design:**
  - `package.json` exports and scripts, CI workflows, and `index.html`'s `/src/main.ts`;
  - the render-gl chunk group, which matches the package path;
  - size-limit's chunk globs, since lazy chunks keep their file names. Prove it with a build, `pnpm --filter @nomos/web size` and `node tools/bench/src/chunks.ts`.
- **After the move:** run `graphify update .`.

## Interfaces and data

- [interfaces.md](../interfaces.md) holds the contract this plan refines: "Layout", "Agents and the Blob handle", "Wallets", the new worker messages, `worldAt`, and "Names" and the person-name filter under "Culture".
- **Bytes per agent:** 4 for `nameKey`, 8 for the wallet and 16 for its claims rows, 28 in all.
- **Arena tops** before and after (computed from tops measured before the movement heading, plus its 1 byte per agent): 391 KB to 671 KB of 32 MiB on phones, 723 KB to 1.42 MB of 32 MiB at 25k, and 2.39 MB to 5.19 MB of 64 MiB at 100k. The warm-up world grows from 192 KB to 221 KB of its 1 MiB. `TIER_MEMORY_BYTES` stays.
- **Snapshot v1 stays 12 bytes:** no blob fact is drawn. Checkpoints grow with the arena, to about 5.2 MB at 100k (computed).

## Method and sources

- **Zero allocation, struct-of-arrays and the hot-path lint:** the Performance budget section of the [implementation plan](../../../implementation-plan.md) and its R5 gates, including the fastest-of-9 statistic and the 10% tolerance this plan's A/B check borrows.
- **Names, the filter and design H:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, and the [R8 report](../../../../research/round-8-cultures/report.md), decision (k) and "Names".
- **Wealth on screen:** the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md), "Wealth: start calibrated, keep it invisible", and content rule 5.
- **Accounts and MINT:** M0's ledger items (R1, R4) and [checkpoint 0015](../../../checkpoints/0015-m0-5-and-m0-6-closing.md)'s money rulings.
- **`move`'s earlier timings:** [M0.6's plan](../m0.6-gates-and-guards/plan.md), Task 10.
- **This brief's probes:** two throwaway scripts in the planning session's scratchpad, not kept. The A/B check re-measures before any decision.

## Tests for the exit checks

- `the move keeps every hash`:
  - after each package's commit, `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints the phone hash that `goldens.json` holds;
  - `node packages/sim-core/scripts/engines.ts` prints "kernels 865 ok, goldens 3 ok";
  - `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` passes.
- `the layout lint`: a planted `packages/sim-core/src/planted.ts` draws one layout message. `packages/sim-core/src/money/planted.ts` and each entry file draw none.
- `the hot lint sees classes`: in `agents/planted.ts`, every `HOT_PLANTS` entry inside a class method is caught. A constructor that allocates passes, and an arrow-function field is caught.
- `culture stays in consumption`: a fixture module under `agents/` that imports the barrel is flagged, and the real tree passes.
- `handle A/B`: a bench script times `move` on columns and on accessors, as in "The A/B check". The ratio stays at or below 1.10 at every tier, and the two worlds' positions match at the end.
- `allocation and budget`: `pnpm --filter @nomos/bench alloc` counts 0 scavenges at every tier, and `pnpm --filter @nomos/bench budget` passes.
- `a handle reads and writes its row`: for keyed random rows, every accessor equals its column, writes land in the column, and `cash` equals the wallet account's balance.
- `names`:
  - every `NAME_WORDS` entry has 4–10 letters and passes `rejectName`, and `node tools/names/scripts/words.ts --check` passes;
  - `personName` of a fixed key gives a fixed string, and no full name repeats a word;
  - a seed gives the same `nameKey` per id on every run.
- `the filter`: each rule rejects a planted near-miss, of a town name, a species name, a profanity entry and a real-world token, and passes a clean word.
- `wallets`:
  - at tick 0 the wallets sum to population × `OPENING_CENTS`, and MINT holds minus that;
  - after two days every wallet is unchanged, since nothing moves money yet;
  - CI's ledger gate, `node tools/cli/src/main.ts --seed 7 --tier <tier> --ticks 2880`, passes at every tier.
- `the checks flag`: a loop test sends `init` with `checks` false, then true, and reads `world.checks` back.
- `the inspector`: Playwright in Chromium, Firefox and WebKit pauses the run, clicks a blob placed by the tick-0 snapshot, and reads its name and wallet. Enter inspects the centre, and empty ground shows "No blob here". `pnpm --filter @nomos/web size` gates `inspector-*.js`.

## Risks and unknowns

- **The move touches every package at once.** Run it when no other work is open, after M0.5's fixes and M0.6's review are committed.
- **Accessors were measured only in V8.** JavaScriptCore and SpiderMonkey are unmeasured, and CI's browser budget spec runs Chromium only. The five-engine goldens catch a change of result, not of speed.
- **Verify first:** the fixture sources. Content rules allow the pret decompilations for numbers only, so the Pokémon lists need another source.
- **A new `NAME_WORDS` renames everyone.** No save exists before M6, which versions the generator with the save (M3.7's brief).
- **Production builds stop asserting the ledger each tick.** CI's ledger gate and the tests still do, at every tier.
- **Classes are new here.** The hot-path lint has never checked methods, so its planted tests must prove each new selector fires.
- **M8.1 reuses this sound set.** M0.7 comes first, so M8.1 reuses its sound set, filter and fixtures, and adds only a separate place-name table and its trigram screen (reconciled on 9 October 2026).

## Open questions

- **Owner, decided on 9 October 2026:**
  - the opening wallet balance is 100,000 cents (1,000.00) for every blob, today's stand-in amount, since M2.1 sets household cash from monthly wages and M2.2 apportions it from the ledger record;
  - per-tick loops use the handle's accessors, behind the A/B check, with columns as the fallback for any loop more than 10% slower;
  - the table uses round 8's design H, without a sample review.
- **Measure:** does the accessor cost hold in Chromium? Compare the browser budget spec's `move` row before and after. Needed before: closing M0.7.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:**
  1. The moves, in dependency order: `sim-core`, `sim-protocol`, `sim-worker`, `sim-culture`, `render-gl`, `apps/web`, `tools/bench` and `tools/names`. Hold the goldens at each.
  2. The lint, tsconfig and dependency-cruiser changes.
  3. The handle and the `move` A/B check.
  4. Wallets, regenerating the goldens.
  5. The filter fixtures, the word script and table, then the column, regenerating the goldens.
  6. The checks flag, then the inspector.
- **Keep it simple:**
  - add no subpath export, since the inspector's chunk should hold only `personName` and its table. Add a `./naming` export only if size-limit shows `sim-core` code in that chunk;
  - give a lone file its own folder, so a concern grows in place;
  - `Blob` copies only the columns it exposes.
- **Pitfalls:**
  - a file that resolves paths from `import.meta.url` changes depth when it moves; entries keep theirs by staying at `src/`;
  - lint profiles share core rule names, so a new profile needs its own plugin copy or it replaces the sim profile's options (`eslint.config.js` explains this);
  - `PROFILE_RULE` in `lint.test.ts` matches any `*/no-restricted-syntax`, so the layout and hot plugins count in profile tests. Plant files where only the intended profile applies;
  - `restoreWorld` and `warmUp` lay worlds out too, so they get a handle and wallets for free. Test that a restored world's handle reads the restored rows;
  - Vite names a dynamic import's chunk after its file, so import `./panels/inspector.ts` directly; a re-export through another module renames the chunk;
  - the M1+ briefs name some flat `src/<file>.ts` paths; each is re-pathed when its brief becomes a step plan.
- **Hard and easy parts:** the lint selectors and the three-engine inspector test need the most care. The move, the column, the wallets and the handle are mechanical once the A/B check has run.
