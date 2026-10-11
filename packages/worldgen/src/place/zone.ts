import type { Site } from './site.ts';

export type Zone = 'centre' | 'rim' | 'outside' | 'open';

// Where a point lies in a town, by how far out from the plaza's middle it is (M3.1's Part 3, Task 13): the centre where
// the ring line still holds the point twice as far out, the rim where it holds the point itself, and outside beyond it.
// A place with no wall is open.
export function zone(site: Site, x: number, y: number): Zone {
  const { wall, cx, cy } = site;
  if (wall === null) return 'open';
  if (!wall.contains(x, y)) return 'outside';
  return wall.contains(2 * x - cx, 2 * y - cy) ? 'centre' : 'rim';
}
