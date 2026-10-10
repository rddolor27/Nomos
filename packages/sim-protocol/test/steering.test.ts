import { describe, expect, it } from 'vitest';
import * as core from '@nomos/sim-core';
import * as protocol from '@nomos/sim-protocol';

const SHARED = [
  'REDRAW_TICKS',
  'STAND',
  'WALK_X_Q8',
  'WALK_Y_Q8',
  'WANDER',
  'draw2',
  'firstRedraw',
  'offWall',
  'wanderTo',
] as const;

describe('the shared wander rule', () => {
  it("hands the app sim-core's own rule, draw and steps, so the town view's walkers steer by the one copy", () => {
    for (const name of SHARED) expect(protocol[name], name).toBe(core[name]);
  });
});
