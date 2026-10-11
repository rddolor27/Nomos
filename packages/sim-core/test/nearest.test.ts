import { describe, expect, it } from 'vitest';
import { nearestAgent } from '../src/agents/nearest.ts';
import { addAgent, createAgentStore } from '../src/agents/store.ts';
import { reserveArena } from '../src/memory/arena.ts';
import { PHASE_ASLEEP, PHASE_GOING, PHASE_KEEPING, PHASE_WORKING, PURPOSE_FOOD } from '../src/street/errands.ts';

const RADIUS_Q8 = 4_096;

describe('the nearest blob', () => {
  it('is the closest within the radius, inclusive, ties to the lower index', () => {
    const store = createAgentStore(reserveArena(65_536), 4);
    for (let id = 0; id < 4; id++) addAgent(store, 1, id, 1, 0);
    store.x.set([0, 100, -100, 5_000]);

    const cases: [xQ8: number, yQ8: number, agent: number][] = [
      [0, 0, 0],
      [50, 0, 0],
      [-50, 0, 0],
      [60, 0, 1],
      [9_096, 0, 3],
      [9_097, 0, -1],
      [0, RADIUS_Q8, 0],
      [0, RADIUS_Q8 + 1, -1],
    ];
    for (const [xQ8, yQ8, agent] of cases) {
      expect(nearestAgent(store, xQ8, yQ8, RADIUS_Q8), `at ${xQ8}, ${yQ8}`).toBe(agent);
    }
  });

  it('skips a blob whose errand phase is indoors when the phases are passed, and finds nobody if all are', () => {
    const store = createAgentStore(reserveArena(65_536), 4);
    for (let id = 0; id < 4; id++) addAgent(store, 1, id, 1, 0);
    store.x.set([0, 100, -100, 5_000]);
    // Blob 0 is asleep and 2 at work, both indoors, while 1 walks out for food and 3 keeps a stall's counter in the open.
    const phase = Uint8Array.of(PHASE_ASLEEP, PHASE_GOING + PURPOSE_FOOD, PHASE_WORKING, PHASE_KEEPING);

    expect(nearestAgent(store, 0, 0, RADIUS_Q8)).toBe(0);
    expect(nearestAgent(store, 0, 0, RADIUS_Q8, phase)).toBe(1);
    expect(nearestAgent(store, -100, 0, RADIUS_Q8, phase)).toBe(1);
    expect(nearestAgent(store, 5_000, 0, RADIUS_Q8, phase)).toBe(3);
    expect(nearestAgent(store, 0, 0, RADIUS_Q8, new Uint8Array(4))).toBe(-1);
  });
});
