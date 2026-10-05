---
name: determinism-review
description: Review simulation changes for determinism and hot-path violations, such as unkeyed randomness, Math transcendentals, float and integer mixing, order-dependent flows, allocation in per-tick code, and canonical writes outside the day boundary. Use when reviewing, or before committing, changes under packages/sim-*.
---

# Determinism review

1. Collect the diff: `git diff --merge-base origin/main -- packages/sim-core packages/sim-worker packages/sim-protocol`, or the files the user names.
2. Check each hunk against `.claude/rules/sim-core.md`, and flag:
   - `Math.random`, `Date`, `performance.now`, or any random number not drawn from `draw(seed, entity, tick, stream)`;
   - `Math.sin`, `cos`, `tan`, `exp`, `log`, `pow`, `hypot`, `atan2` or `cbrt`, or `**`;
   - floats in replay-relevant state, money that is not integer cents, or `BigInt` in hot code;
   - iteration order that can depend on insertion, hashing or the worker count;
   - flows applied while they are still being planned;
   - allocation inside per-tick functions, or `Memory.grow` after start;
   - canonical writes outside the day boundary.
3. Run whatever exists: the hot-path lint profile, the invariant tests, and the cross-engine replay-hash test.
4. Report each finding, most severe first, with `file:line`, the rule broken and a one-line fix. If nothing is wrong, say so plainly.
