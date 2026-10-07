# M1.2 Bet cards and watch-only runs

Part of [M1 Lab mode](../milestone.md).

- **Builds:**
  - bet cards that lock in a prediction before Run, with hand-picked, labelled first seeds, neutral names, and city sliders unlocked through lab cards (R2);
  - the bet card "Does money buy happiness?": doubling one agent's income gives +0.60 at first and +0.35 for good, and doubling everyone's gives +0.30 and then +0.05 (R6);
  - the bet card "Jobs or prices?": one point of unemployment against one point of inflation, about 4 : 1 in this model (R6);
  - the bet card "Evening events: are people out at night stopped more?" on paired seeds, framed by place and hour, never by culture; in the toy, evening festivals raised victimisation 8.7% and stops 1.3% against daytime ones, at the same rate per outdoor hour (R8);
  - speed controls: pause, 1×, 4×, 16× and skip to the next season or year, with Space and keys 1–4, per-tier speed caps, and the paused start under reduced motion that M0.5 already builds (Calendar);
  - the HUD date, such as "Spring 12, Year 3 · 08:40 · rest day", with a season icon and the year's progress; art exists; wire it in (Calendar);
  - watch-only runs: while a run plays, the worker accepts only pause, speed, skip and read-only queries, and lab cards set treatments before Run (Calendar).
- **Needs:** M1.1's claim tests, M0.1's calendar, M0.3's protocol, M0.5's HUD and device tiers, and M0.6's name lint. The city sliders these cards unlock arrive in M5. The round 6 cards rest on life-satisfaction rules from M3 and M5, and the round 8 card on stops from M4. In M1, each needs its own lab rules from its round's prototype.
- **Owner decision first:** how long a lab day lasts at 1×. Round 1's engine runs discrete days with animated phases, while the calendar makes a day at 1× last 144 s.
- **Exit checks:**
  - changing speed or skipping never changes the state hash at any date, and the worker refuses settings messages while a run plays (Calendar).
