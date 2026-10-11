import { indoorsIn } from '../street/errands.ts';
import type { AgentStore } from './store.ts';

// Squared Q8 distances are whole numbers, so "below the radius squared plus one" is "within the radius", and the strict
// comparison keeps the lower index on a tie. A town with streets passes its errand phases, so a blob indoors, which no painter
// draws, is never the nearest. Any other world passes none, since its empty store reads every blob as asleep, and so indoors.
export function nearestAgent(agents: AgentStore, xQ8: number, yQ8: number, radiusQ8: number, phase?: Uint8Array): number {
  const { x, y } = agents;
  const count = agents.count[0];
  let nearest = -1;
  let nearestSq = radiusQ8 * radiusQ8 + 1;
  for (let i = 0; i < count; i++) {
    if (phase !== undefined && indoorsIn(phase[i])) continue;
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
