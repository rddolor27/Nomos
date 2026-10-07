# M4.4 Victims, records and trust

Part of [M4 Crime and police](../milestone.md).

- **Builds:**
  - record states (none, suspected, arrest, incarcerated, parole, discharged) kept at the records office and in the inspector, never over heads (R2, R3);
  - victimisation in LS (−900 violent, −200 property, half-life 0.35 years), and a fear term of up to −300 from each cell's perceived danger, fed by true and recorded crime and the witness pass, never by police presence alone (R6);
  - a "case unresolved" flag on victims and 1–3 close contacts until the records office clears the case, with its prevalence logged and any LS effect an unsourced knob, default 0 (R6);
  - wrongful stops that lower trust in police for the person stopped and 3–5 acquaintances (a Norland design number, to calibrate), charted beside arrests (R6).
- **Needs:** M3.6's LS pass and M3.2's inspector. The case flag and the trust spread need close contacts and acquaintances, which the plan builds only in M5.2's friend network.
- **Exit checks:**
  - a violent-crime victim's LS averages 0.3–0.45 below baseline in the year of the crime, and under 0.1 the year after (R6).
