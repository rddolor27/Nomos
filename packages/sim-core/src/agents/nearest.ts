import type { AgentStore } from './store.ts';

// Squared Q8 distances are whole numbers, so "below the radius squared plus one" is "within the radius", and the strict
// comparison keeps the lower index on a tie.
export function nearestAgent(agents: AgentStore, xQ8: number, yQ8: number, radiusQ8: number): number {
  const { x, y } = agents;
  const count = agents.count[0];
  let nearest = -1;
  let nearestSq = radiusQ8 * radiusQ8 + 1;
  for (let i = 0; i < count; i++) {
    const dx = x[i] - xQ8;
    const dy = y[i] - yQ8;
    const sq = dx * dx + dy * dy;
    if (sq < nearestSq) {
      nearest = i;
      nearestSq = sq;
    }
  }
  return nearest;
}
