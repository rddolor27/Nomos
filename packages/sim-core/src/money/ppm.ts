export const PPM = 1_000_000;

// Floor of cents * ppm / PPM for whole |cents| up to MAX_SAFE_CENTS and ppm in 0..PPM. Splitting cents at PPM keeps every
// product exact, which cents * ppm alone is not. Below 2^34 * PPM the division never rounds across a whole quotient (half an
// ulp, 9.5e-7, is under the 1e-6 gap), so the high part needs no correction.
export function mulPpm(cents: number, ppm: number): number {
  const hi = Math.floor(cents / PPM);
  const lo = cents - hi * PPM;
  return hi * ppm + Math.floor((lo * ppm) / PPM);
}
