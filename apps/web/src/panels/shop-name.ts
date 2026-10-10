// Shops count from 1 on screen and firm rows from 0 in the sim, so Shop N is firm row N - 1 wherever the page names a shop.
export function shopName(firm: number): string {
  return `Shop ${firm + 1}`;
}
