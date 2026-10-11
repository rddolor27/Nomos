// Every rate and weight of a blob's life in one place (M3.2 Rulings 1 and 2), so that tuning it is a matter of reading one file.
// needs.ts settles the needs by the rates, and choose.ts scores the options by the weights. No entry reads a wallet, a look or a
// culture, and the traits move only the attitude column.

// The mode a blob is in sets its rates (needs.ts maps a phase and an activity to one).
export const MODE_BED = 0;
export const MODE_BUSY = 1;
export const MODE_HOME = 2;
export const MODE_DOORSTEP = 3;
export const MODE_PLAZA = 4;
export const MODE_GREEN = 5;
export const MODE_TRAVEL = 6;

// What each mode does to each need every tick, in units of a level of 0 to 65,535, for hunger, rest, fun and company. A positive
// rate raises a need and a negative one relieves it. Work and errands are the busy mode: they wear down rest and use up fun and
// company. A night in bed rests, and leisure relieves fun and company, most at the plaza. A walk out for leisure wears little.
// Hunger is kept simple until Task 8 ties it to the day's portions: it rises awake, and the household's meals ease it in bed.
export const NEED_RATES = Int16Array.of(
  //  hunger  rest   fun  company
  -40, -130, -45, -45, // bed
  20, 50, 45, 35, // busy
  20, -30, 35, 25, // home, staying in
  20, 10, -90, -50, // the doorstep
  20, 10, -260, -220, // the plaza
  20, -40, -260, -100, // a green
  20, 30, 15, 10, // on the way to or from leisure
);

// A meal on the doorstep relieves hunger in one lump, a third of a waking day's rise at the awake rate (Ruling 1). Task 8 ties
// meals to the day's portions.
export const MEAL_RELIEF = 6_400;

// An option's score is the product of four Q16 ramps (choose.ts), and a row of this table sets the last three. The drive is the
// relief the option's mode brings, as NEED_RATES gives it, times the urgency of each need, shifted down by DRIVE_SHIFT, plus the
// row's floor, which keeps staying in from ever being vetoed. The attitude is the base plus each trait's weight times how far the
// trait is from the mean of 128, over 128, clamped to MIN_ATTITUDE and up. The way's put-off is SLOPE in Q16 for each tick of
// Manhattan way, and the crowd is its base plus its step for each blob at the site, up to CROWD_CAP.
export const COL_FLOOR = 0;
export const COL_BASE = 1;
export const COL_SOCIABLE = 2;
export const COL_HOMEBODY = 3;
export const COL_RESTLESS = 4;
export const COL_SLOPE = 5;
export const COL_CROWD_BASE = 6;
export const COL_CROWD_STEP = 7;
export const OPTION_COLS = 8;
export const OPTION_WEIGHTS = Int32Array.of(
  // floor  base    social  home     restless slope  crowd0  step
  3_000, 32_768, 0, 24_000, -16_000, 0, 65_535, 0, // staying in
  0, 36_000, 8_000, 12_000, -4_000, 0, 65_535, 0, // the doorstep
  0, 44_000, 30_000, -22_000, 10_000, 60, 44_000, 700, // the plaza
  0, 38_000, 0, -14_000, 22_000, 80, 50_000, 300, // a green
);

// Relief is units a tick times an urgency in Q16, and this scales the plaza's 480 a tick of fun and company at full urgency to most
// of the Q16 range.
export const DRIVE_SHIFT = 9;
export const MIN_ATTITUDE = 4_096;
export const CROWD_CAP = 40;
