# M4.2 Crime and justice loop

Part of [M4 Crime and police](../milestone.md).

- **Builds:**
  - the offend action, the Short hotspot field, respond, pursue, hot-spot and random patrol, lingering deterrence, jail, stigma, recidivism, true versus recorded crime, and guardrails against cascades (R1);
  - the Short decay as (1 − ω·δt), with one time step for every rate and never ω = 1/15 per hourly update, plus a rescaled θ and the police suppression term (R2);
  - police at about 0.25% of the population (0.2–0.5%) by default, or police dots labelled as patrol units, with exaggerated shares kept to labelled lab cards (R2).
- **Needs:** M3.2's daily routines, per-cell aggregates and soldier job, and its optional witness pass, built here if M3 skipped it; M2.4's shop stock as theft targets.
- **Owner decision first:** police near 0.25% of the population, or police dots labelled as patrol units; round 2 allows either.
- **Verify first:** Short et al.'s A0, time step and grid spacing, and NCVS 2024 reporting and FBI 2025 clearance by crime type. They set the hotspot constants here and the capture and reporting constants in M4.3.
- **Exit checks:**
  - a unit test: mean hotspot attractiveness equals θΓ/ω at steady state (R2);
  - no code path sends soldiers into a town to keep order, and town stops and arrests come only from the police (Military).
