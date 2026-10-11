import { SHOP_NAMES } from '@nomos/sim-protocol';

// A shop takes its good's name until buildings name it. Shops count from 1 on screen and firm rows from 0 in the sim, so
// Bakery N is firm row N - 1 wherever the page names a shop.
export function shopName(good: number, firm: number): string {
  return `${SHOP_NAMES[good]} ${firm + 1}`;
}
