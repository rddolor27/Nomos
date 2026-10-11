import { TICK, type World } from '../world/world.ts';
import { FIRST_WALKING, PHASE_COMING } from './errands.ts';
import { resumeRun, snapToTile, startRun } from './motion.ts';
import { MAX_RUNS, RUN_BYTES } from './runs.ts';
import { arrive, wake } from './timetable.ts';

// A run is done. The blob steps to the centre of its cell, which a diagonal run overshoots by up to a sub-pixel step, and takes
// the next run of its way, or stops at the end of it.
function endRun(world: World, i: number, tick: number): void {
  const errands = world.errands;
  snapToTile(world, i);
  const backward = errands.phase[i] >= PHASE_COMING;
  const next = errands.run[i] + (backward ? -1 : 1);
  if (next >= 0 && next < MAX_RUNS && errands.runs[i * RUN_BYTES + 2 * next + 1] !== 0) startRun(world, i, tick, next, backward);
  else arrive(world, i, tick);
}

// Movement for a town with streets, in move's place: every blob is indoors, at a post or on a run (M2.7). A blob that is not
// walking waits for its end tick, and one that walks takes its heading's step, with no wall to check, since pathRuns' ways lie
// over open cells. Only the blob's own row and the town's errand rows change here, never money, stock or an economy row. A blob
// that comes free is listed, in blob order, for the life system to choose for this same tick (M3.2 Ruling 2).
//
// A walker that a chat stopped (street/chat.ts) has no step, and its run's end tick is already moved on by the chat, so the pause
// needs no check but the one tick the chat ends: the walker sets off again with the heading it had, and arrives the chat's length late.
export function walkStreets(world: World): void {
  const tick = world.globals[TICK];
  const { agents, errands, life } = world;
  const count = agents.count[0];
  life.dueCount[0] = 0;
  const { x, y, vx, vy } = agents;
  const { phase, endTick } = errands;
  const chatUntil = life.chatUntil;
  for (let i = 0; i < count; i++) {
    if (phase[i] < FIRST_WALKING) {
      if (tick >= endTick[i]) wake(world, i, tick);
    } else {
      x[i] += vx[i];
      y[i] += vy[i];
      if (tick >= endTick[i]) endRun(world, i, tick);
      else if (tick === chatUntil[i]) resumeRun(world, i, phase[i] >= PHASE_COMING);
    }
  }
}
