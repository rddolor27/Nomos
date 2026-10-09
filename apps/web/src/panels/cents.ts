import { formatCount } from './hud.ts';

const CENTS_PER_UNIT = 100;

// Whole cents split by integer maths, so every balance below 2^53 prints exactly; digits are grouped as the HUD groups
// them, since a first Intl formatter costs about 100 ms on a phone.
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const units = Math.floor(abs / CENTS_PER_UNIT);
  const rest = abs - units * CENTS_PER_UNIT;
  return `${sign}${formatCount(units)}.${String(rest).padStart(2, '0')}`;
}
