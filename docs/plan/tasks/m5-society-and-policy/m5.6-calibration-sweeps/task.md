# M5.6 Calibration sweeps

Part of [M5 Society and policy](../milestone.md).

- **Builds:**
  - Morris screening and then Sobol indices via SALib text files beside the policy sweeps, calibrated against patterns with one or two held out (R2);
  - city size as a factor in the calibration sweeps (at least four sizes from 1,000 to 100,000 agents), with every run's daily flow logs kept so the same runs train the country emulator (R4).
- **Needs:** every policy from M5.1 and M5.3; M7.2's emulator fitter reads the logs.
- **Exit checks:**
  - the emulator fitter reads the sweep logs without conversion (R4).
