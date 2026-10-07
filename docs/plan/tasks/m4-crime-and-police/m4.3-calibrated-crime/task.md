# M4.3 Calibrated crime

Part of [M4 Crime and police](../milestone.md).

- **Builds:**
  - true and recorded offences, arrests, releases and the top-5% concentration share logged per district per day, and the hotspot field exported and imported as a 32×32 Uint16 grid (2 KB), upsampled on revisits in M9 (R4);
  - realised arrests calibrated so clearances per true theft land near 3–7% (robbery about 20%), with damping of Epstein's perceived risk considered (R2);
  - trip lengths, exp(−d/λ) per cell with λ drawn per offender, and displacement, with about 25% of deterred offenders moving nearby (R2);
  - reporting by crime type within a 2.5× band between districts, legitimacy that falls with arbitrary arrests, and separate switches for reporting bias and patrol feedback (R2);
  - targets per offender that grow with density and detection that falls with anonymity, each channel's share of offending logged, and a police reaction-delay parameter for M9's district tier (R4);
  - food theft as an offend option whose gain rises with unmet food need, inside the opportunity-based utility, where no agent ever becomes a "criminal" type and LS never enters the offend utility (R6).
- **Needs:** M2.3's design runner over seeds, city sizes, police shares and unemployment shocks; M3.5's missed meals and food-insecurity tally, which measure unmet food need.
- **Exit checks:**
  - tripling police from the new default cuts true theft by about 15%, certified on paired seeds, and a tipping test shows the police effect nearly flat near the default and steep at very low staffing (R2);
  - 50% of crime falls in 2–6% of cells, recorded crime is more concentrated than true crime when patrols follow records, and cumulative re-arrest runs about 43% / 66% / 82% at 1 / 3 / 10 years (R2);
  - district logs sum exactly to city totals, recorded never exceeds true on any district-day, and a re-imported field keeps the top-5% share within 0.05 (R4);
  - in a 1,000–100,000-agent size sweep, loot and detection explain no more than about 45% of the per-capita theft gradient, Glaeser and Sacerdote's bound (R4);
  - at full employment, true theft stays above zero on paired seeds (R6).
