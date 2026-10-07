# M5.2 Ageing and social ties

Part of [M5 Society and policy](../milestone.md).

- **Builds:**
  - ageing: one year per 112-day year, with real lifespans, birthdays spread over the year, and age hazards converted as 1 − (1 − p)^(1/112) into build-time integer tables (Calendar);
  - the friend network, rumours and fear, contagion and Schelling moves (R1);
  - culture-blind housing and Schelling moves: any kin placement is a labelled knob, off by default, shown with the dissimilarity index and the place-driven disparity monitor; round 1's Schelling known-answer test stays on neutral colours, and culture dissimilarity above 0.2 is flagged (R8);
  - partner candidates weighted by how many customs they share, calibrated to the prototype's exogamy bands (own-culture preference 0.2 plus 0.1 per own custom kept), never by hue (R8);
  - the friend network offered as an optional source for adoption, with district counts the default; festival contact stays transient and builds no lasting ties unless an employment-by-culture audit also runs (R8).
- **Needs:** M3's homes and routines; M3.7's cultures and festivals; M4's crimes as the source of fear rumours.
- **Exit checks:**
  - the age pyramid stays within its band, no culture's festivals cluster in one season, and a branch replays identically from (seed, settings, fork day, change) (Calendar).
