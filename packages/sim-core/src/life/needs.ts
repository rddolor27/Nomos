import { FIRST_WALKING, PHASE_LEAVING, type Errands } from '../street/errands.ts';
import { NEEDS, NEED_HUNGER, type Life } from './store.ts';
import {
  MEAL_RELIEF,
  MODE_BED,
  MODE_BUSY,
  MODE_DOORSTEP,
  MODE_GREEN,
  MODE_HOME,
  MODE_PLAZA,
  MODE_TRAVEL,
  NEED_RATES,
} from './table.ts';

// A need changes only when a blob's state does (M3.2 Ruling 1): it settles as level + rate × the ticks since its last settle, clamped
// to the Uint16 range, with the rate of the mode the blob was in over that whole stretch. So whatever changes a blob's mode settles
// it first, while its phase and activity still say what it was doing, and no pass decays a need every tick.
export const MAX_LEVEL = 65_535;

// By activity: the mode of a blob standing still or waiting, then of one on its way (LEAVING, GOING and COMING).
const STILL_MODE = Uint8Array.of(MODE_BED, MODE_BUSY, MODE_BUSY, MODE_BUSY, MODE_HOME, MODE_DOORSTEP, MODE_PLAZA, MODE_GREEN);
const MOVING_MODE = Uint8Array.of(MODE_BED, MODE_BUSY, MODE_BUSY, MODE_BUSY, MODE_HOME, MODE_DOORSTEP, MODE_TRAVEL, MODE_TRAVEL);

export function modeOf(phase: number, activity: number): number {
  return phase === PHASE_LEAVING || phase >= FIRST_WALKING ? MOVING_MODE[activity] : STILL_MODE[activity];
}

// What a mode takes off a need each tick: the rate when it is a relief, else nothing. The life system's drive for an outing is
// the relief it brings (life/choose.ts).
export function reliefOf(mode: number, need: number): number {
  return Math.max(0, -NEED_RATES[mode * NEEDS + need]);
}

// A need as of `tick` for a reader: the level at its last settle carried on at the rate of the mode the blob is in, and clamped. It
// writes nothing, so the card can show a need that nothing has settled for hours.
export function levelAt(life: Life, errands: Errands, blob: number, need: number, tick: number): number {
  const perTick = NEED_RATES[modeOf(errands.phase[blob], errands.activity[blob]) * NEEDS + need];
  const level = life.needs[blob * NEEDS + need] + perTick * (tick - life.settleTick[blob]);
  return Math.min(MAX_LEVEL, Math.max(0, level));
}

export function settleNeeds(life: Life, errands: Errands, blob: number, tick: number): void {
  const elapsed = tick - life.settleTick[blob];
  if (elapsed <= 0) return;
  life.settleTick[blob] = tick;
  const rates = modeOf(errands.phase[blob], errands.activity[blob]) * NEEDS;
  const base = blob * NEEDS;
  for (let need = 0; need < NEEDS; need++) {
    life.needs[base + need] = Math.min(MAX_LEVEL, Math.max(0, life.needs[base + need] + NEED_RATES[rates + need] * elapsed));
  }
}

export function relieveNeed(life: Life, blob: number, need: number, amount: number): void {
  const at = blob * NEEDS + need;
  life.needs[at] = Math.max(0, life.needs[at] - amount);
}

// A blob that has just sat down to eat: its needs settle to now, and the meal takes its lump off hunger.
export function mealEaten(life: Life, errands: Errands, blob: number, tick: number): void {
  settleNeeds(life, errands, blob, tick);
  relieveNeed(life, blob, NEED_HUNGER, MEAL_RELIEF);
}
