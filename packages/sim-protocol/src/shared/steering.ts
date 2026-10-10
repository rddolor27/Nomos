// sim-core owns the wander rule. The town view's look-only walkers steer by it, with the same keyed draw and steps, so
// they walk as the sim's blobs do (owner request, 10 October 2026).
export {
  REDRAW_TICKS,
  STAND,
  WALK_X_Q8,
  WALK_Y_Q8,
  WANDER,
  draw2,
  firstRedraw,
  offWall,
  wanderTo,
} from '@nomos/sim-core';
