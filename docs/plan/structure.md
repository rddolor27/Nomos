# Structure

Oct 9, 2026 · @Rd

The owner's decisions of 9 October 2026 on how the code is organised and what each blob knows. Their tasks are in Implementation plan, tagged (Structure), and in the repo's M0.7 Modules and blob facts.

## Decisions

1. **Modular file organization.** Each package groups its source into module folders by concern, built from small single-purpose functions. Only entry files stay at `src/`.
2. **OOP for blobs, as a handle class.** A `Blob` reads and writes one row of the shared agent arrays, as in `blob.x`, while the data stays in those arrays. One handle is made once and re-pointed per blob, so ticks stay allocation-free and replays stay exact. One object per blob is rejected.
3. **Speed-critical loops use the handle's accessors.** They cost about 7% in the four-way movement loop (measured here, Node 24.18.0, V8 only). A loop measured more than 10% slower than plain arrays keeps its arrays. A method per blob, such as `blob.walk()`, measured 2.0–2.8× slower, so it stays out of per-tick loops.
4. **The first blob facts are a name and a wallet.** No home or job yet. Names mix Greek-like sounds with sounds from several other languages, one style shared by everyone, so no culture owns a sound (the owner replaced round 8's design H on 9 October 2026); they show only in the inspector. Every wallet opens with 1,000.00 (100,000 cents) from MINT, so all accounts plus MINT still sum to zero.
5. **Blobs walk in any direction,** not only up, down, left and right along straight lines.
6. **Map first.** After the current M0 work, an explorable map of 3–5 countries comes before M1; the Countries tab holds it.
7. **Plans first.** Plans, agents and the implementation plan are updated before any code.
