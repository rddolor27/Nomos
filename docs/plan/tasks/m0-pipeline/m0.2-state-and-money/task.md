# M0.2 State and money

Part of [M0 Pipeline](../milestone.md).

- **Builds:**
  - `AgentStore`: struct-of-arrays columns in one `WebAssembly.Memory`, reserved for the device tier (32 MB on phones, 64–128 MB on desktops) and never grown, with JS views created once (R1, R5);
  - Q8 or Q16 fixed-point Int32 positions with power-of-two grid cells, integer-valued `Float64Array` cents, and no `BigInt` in hot code (R5);
  - the culture columns (`culture`, `birthCulture`, `customs` and `homeRegion`, at most 8 cultures per world, drawn on their own keyed stream) and the one-byte look column: one of 96 looks, drawn uniformly at birth, never inherited and read only by the renderer (R8, R9);
  - the integer-cent ledger with MINT, reserved account ranges (a national treasury, per-settlement households, firms, local government and police budget, and a rounding account) under the one-line Σ = 0 invariant, and `checkInvariants` every tick in development (R1, R4);
  - separate draw salts for agents and ledgers, so a focus change can never shift another draw (R4);
  - the claims ledger, one record per loan (lender, borrower, principal in cents, rate in ppm, payment); the quantity registries for homes, property titles and firm shares, revalued at the day boundary and never posted to MINT; and `mulPpm`, an exact floor of cents × ppm, with a lint ban on raw cents × rate (R6);
  - exact apportionment (largest remainder, ties by index, leftover cents along a keyed stride) with a `BigInt` path once total × weight reaches 2^53, which needs an exception to M0.1's `BigInt` ban; and keyed stochastic rounding for flows of people by culture, never flooring or plain largest remainder (R4, R8);
  - the plan-then-apply helper with its shuffle test (R4);
  - the @stdlib tables built at build time and shipped as data: a Q16 log2 table, fade tables for 0.35-, 1- and 2.6-year half-lives, an inverse-normal table for set points, the ledger band-share table and a Gaussian-copula table for wealth ranks; code outside per-agent loops may call @stdlib directly (R2, R6).
- **Verify first:** @stdlib bit-identity in Firefox, on ARM64 and with Apple's math library, which decides the cross-browser replay promise.
- **Exit checks:**
  - the ledger sums to zero on every tick (R1);
  - apportionment sums exactly and matches a `BigInt` reference over 10,000 random cases, including totals above 2^53 ÷ 4,095 (R4);
  - the claims and cash identities hold exactly every day, and no revaluation changes the MINT balance (R6).
