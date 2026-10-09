// Slots of the Float64Array in EconomyScratch.stats, which the state hash skips. The economy day sets the day-end slots from
// state, and each system adds to its own sums.
export const STAT_UNEMPLOYED = 0;
export const STAT_VACANCIES = 1;
export const STAT_PRICE_MEAN = 2;
export const STAT_WAGE_MEAN = 3;
export const STAT_HOUSEHOLD_CASH = 4;
export const STAT_FIRM_CASH = 5;

// Summed over the day.
export const STAT_SALES_UNITS = 6;
export const STAT_SALES_CENTS = 7;

// Summed over the month. STAT_PRICE_CHANGE_PPM adds up the sizes of the changes.
export const STAT_PRICE_CHANGES = 8;
export const STAT_PRICE_CHANGE_PPM = 9;
export const STAT_HIRES = 10;
export const STAT_SWITCHES = 11;
export const STAT_FIRINGS = 12;
export const STAT_WAGE_BILL = 13;
export const STAT_PROFITS_PAID = 14;
export const STAT_EXITS = 15;
export const STAT_ISSUED = 16;

export const STATS = 17;
