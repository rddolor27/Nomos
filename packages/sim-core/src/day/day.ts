import { dayOf, dayOfYear, yearOf } from '../time/calendar.ts';
import { INPUT_CAPACITY, INPUT_FOCUS, INPUT_LAYOFFS } from '../world/inputs.ts';
import { openDayWindow } from './slices.ts';
import { rekeyStride } from './stride.ts';
import { DAY_LAYOFFS, TICK, type World } from '../world/world.ts';

const LOGGED = 0;
const APPLIED = 1;

export function logInput(world: World, kind: number, a: number, b: number): boolean {
  const log = world.inputs;
  const n = log.cursor[LOGGED];
  if (n >= INPUT_CAPACITY) return false;
  log.tick[n] = world.globals[TICK];
  log.kind[n] = kind;
  log.a[n] = a;
  log.b[n] = b;
  log.cursor[LOGGED] = n + 1;
  return true;
}

export function logFocus(world: World, settlement: number): boolean {
  return logInput(world, INPUT_FOCUS, settlement, 0);
}

export function logLayoffs(world: World, people: number): boolean {
  return logInput(world, INPUT_LAYOFFS, people, 0);
}

// Inputs wait here so that every replay applies them at the same tick, in log order (R4 architecture §3.3).
export function dayBoundary(world: World): void {
  const log = world.inputs;
  const logged = log.cursor[LOGGED];
  let layoffs = 0;
  for (let n = log.cursor[APPLIED]; n < logged; n++) {
    const kind = log.kind[n];
    if (kind === INPUT_FOCUS) world.focus[0] = log.a[n];
    else if (kind === INPUT_LAYOFFS) layoffs += log.a[n];
  }
  log.cursor[APPLIED] = logged;
  world.globals[DAY_LAYOFFS] = layoffs;
  const day = dayOf(world.globals[TICK]);
  if (dayOfYear(day) === 0) rekeyStride(world.stride, world.seed, yearOf(day));
  openDayWindow(world);
}
