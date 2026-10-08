import { ACTION_WALK } from './actions.ts';
import { dayOf } from './calendar.ts';
import type { Tier } from './tiers.ts';
import {
  DAY_AGENTS,
  DAY_HOUSEHOLDS,
  RECORD_DAY,
  RECORD_FIELDS,
  RECORD_FRONT,
  RECORD_POPULATION,
  RECORD_WALKING,
  TICK,
  type World,
} from './world.ts';

export type SpoilageRule = 'accept-lateness' | 'households-first' | 'skip-expired' | 'one-pass-at-10k';

// OWNER DECISION: R6 conflict (e). The owner chose skip-expired on 8 October 2026: slices keep R6's measured order,
// and M2's meals will skip a head lot past its expiry. Nothing else reads the rule until M2 adds food.
export const SPOILAGE_RULE: SpoilageRule = 'skip-expired';

export const SLICE = 1024;
export const KIND_AGENTS = 0;
export const KIND_HOUSEHOLDS = 1;

// Reused by every call, so runDaySlice allocates nothing.
const range = new Int32Array(3);

export function daySliceCount(agents: number, households: number, rule: SpoilageRule, tier: Tier): number {
  const onePass = isOnePass(rule, tier);
  return slicesOf(agents, onePass) + slicesOf(households, onePass);
}

// A pure function of its inputs, so every device and every worker count runs the same schedule.
export function daySlice(
  k: number,
  agents: number,
  households: number,
  rule: SpoilageRule,
  tier: Tier,
  out: Int32Array,
): void {
  const onePass = isOnePass(rule, tier);
  if (rule === 'households-first' || onePass) {
    pickSlice(k, KIND_HOUSEHOLDS, households, KIND_AGENTS, agents, onePass, out);
  } else {
    pickSlice(k, KIND_AGENTS, agents, KIND_HOUSEHOLDS, households, onePass, out);
  }
}

// dayBoundary opens the window: the day's counts stay fixed until its last slice, and the back record starts empty.
export function openDayWindow(world: World): void {
  const globals = world.globals;
  globals[DAY_AGENTS] = world.agents.count[0];
  globals[DAY_HOUSEHOLDS] = 0; // households arrive in M2
  const back = backRecord(world);
  world.record.fill(0, back, back + RECORD_FIELDS);
}

export function runDaySlice(world: World, k: number): void {
  const agents = world.globals[DAY_AGENTS];
  const households = world.globals[DAY_HOUSEHOLDS];
  daySlice(k, agents, households, SPOILAGE_RULE, world.tier, range);
  if (range[0] === KIND_AGENTS) foldAgents(world, range[1], range[2]);
  if (k === daySliceCount(agents, households, SPOILAGE_RULE, world.tier) - 1) commitRecord(world);
}

// R6's 10k case: one pass per kind on the phone tier, which R6 measured at 1.19 ms, past M0.6's 0.35 ms slice gate.
function isOnePass(rule: SpoilageRule, tier: Tier): boolean {
  return rule === 'one-pass-at-10k' && tier === 'phone';
}

// A kind with no entities gets no slice.
function slicesOf(count: number, onePass: boolean): number {
  if (onePass) return count > 0 ? 1 : 0;
  return Math.floor((count + SLICE - 1) / SLICE);
}

function pickSlice(
  k: number,
  firstKind: number,
  firstCount: number,
  secondKind: number,
  secondCount: number,
  onePass: boolean,
  out: Int32Array,
): void {
  const firstSlices = slicesOf(firstCount, onePass);
  if (k < firstSlices) writeSlice(firstKind, firstCount, k, onePass, out);
  else writeSlice(secondKind, secondCount, k - firstSlices, onePass, out);
}

function writeSlice(kind: number, count: number, j: number, onePass: boolean, out: Int32Array): void {
  const size = onePass ? count : SLICE;
  out[0] = kind;
  out[1] = j * size;
  out[2] = Math.min(count, (j + 1) * size);
}

function foldAgents(world: World, from: number, to: number): void {
  const action = world.agents.action;
  let walking = 0;
  for (let i = from; i < to; i++) {
    if (action[i] === ACTION_WALK) walking++;
  }
  const back = backRecord(world);
  world.record[back + RECORD_POPULATION] += to - from;
  world.record[back + RECORD_WALKING] += walking;
}

function commitRecord(world: World): void {
  world.record[backRecord(world) + RECORD_DAY] = dayOf(world.globals[TICK]);
  world.globals[RECORD_FRONT] = 1 - world.globals[RECORD_FRONT];
}

function backRecord(world: World): number {
  return (1 - world.globals[RECORD_FRONT]) * RECORD_FIELDS;
}
