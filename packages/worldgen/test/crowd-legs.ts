import { CROWD_Q, CROWD_STOPS, type MapCrowd } from '@nomos/sim-protocol/world-map';

const STEPS = 16;

// The cell under 17 points, at t = 0, 1/16, ..., 1, along each of a dot's four straight legs: stop 0 to 1, 1 to 2,
// 2 to 3, then 3 back to 0. A point is (from * (16 - i) + to * i) / 16 in Q8 units, kept times 16 to stay exact.
export function legCells(crowd: MapCrowd, dot: number, width: number): number[] {
  const cells: number[] = [];
  for (let leg = 0; leg < CROWD_STOPS; leg++) {
    const from = 2 * (dot * CROWD_STOPS + leg);
    const to = 2 * (dot * CROWD_STOPS + ((leg + 1) % CROWD_STOPS));
    for (let i = 0; i <= STEPS; i++) {
      const x = crowd.stops[from] * (STEPS - i) + crowd.stops[to] * i;
      const y = crowd.stops[from + 1] * (STEPS - i) + crowd.stops[to + 1] * i;
      cells.push(Math.floor(y / (STEPS * CROWD_Q)) * width + Math.floor(x / (STEPS * CROWD_Q)));
    }
  }
  return cells;
}
