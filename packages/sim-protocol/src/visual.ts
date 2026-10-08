export {
  ACTION_CARRY,
  ACTION_IDLE,
  ACTION_NAMES,
  ACTION_SIT,
  ACTION_SLEEP,
  ACTION_SNEAK,
  ACTION_TALK,
  ACTION_WALK,
  ACTION_WORK,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
} from '@nomos/sim-core';

// Snapshot v1's visual word (interfaces.md). Bit 7 and bits 27-31 are reserved, and there is no wanted bit (R1, R3).
const LOOK_SHIFT = 0;
const LOOK_BITS = 7;
const ACTION_SHIFT = 8;
const ACTION_BITS = 3;
const EMOTE_SHIFT = 11;
const EMOTE_BITS = 5;
const JOB_SHIFT = 16;
const JOB_BITS = 8;
const FACING_SHIFT = 24;
const FACING_BITS = 2;
const TRUE_ONLY_SHIFT = 26;
const TRUE_ONLY_BITS = 1;

export const VISUAL_FIELDS: readonly { name: string; shift: number; bits: number }[] = [
  { name: 'look', shift: LOOK_SHIFT, bits: LOOK_BITS },
  { name: 'action', shift: ACTION_SHIFT, bits: ACTION_BITS },
  { name: 'emote', shift: EMOTE_SHIFT, bits: EMOTE_BITS },
  { name: 'job', shift: JOB_SHIFT, bits: JOB_BITS },
  { name: 'facing', shift: FACING_SHIFT, bits: FACING_BITS },
  { name: 'trueOnly', shift: TRUE_ONLY_SHIFT, bits: TRUE_ONLY_BITS },
];

function maskOf(bits: number): number {
  return (1 << bits) - 1;
}

function placeBits(value: number, shift: number, bits: number): number {
  return (value & maskOf(bits)) << shift;
}

function readBits(word: number, shift: number, bits: number): number {
  return (word >>> shift) & maskOf(bits);
}

// Each field is masked so a stray value never reaches a neighbour or a reserved bit. The top bit used is 26, so the
// result is a non-negative int32, which is already a valid uint32 and needs no >>> 0.
export function packVisual(
  look: number,
  action: number,
  emote: number,
  job: number,
  facing: number,
  trueOnly: number,
): number {
  return (
    placeBits(look, LOOK_SHIFT, LOOK_BITS) |
    placeBits(action, ACTION_SHIFT, ACTION_BITS) |
    placeBits(emote, EMOTE_SHIFT, EMOTE_BITS) |
    placeBits(job, JOB_SHIFT, JOB_BITS) |
    placeBits(facing, FACING_SHIFT, FACING_BITS) |
    placeBits(trueOnly, TRUE_ONLY_SHIFT, TRUE_ONLY_BITS)
  );
}

export function lookOf(word: number): number {
  return readBits(word, LOOK_SHIFT, LOOK_BITS);
}

export function actionOf(word: number): number {
  return readBits(word, ACTION_SHIFT, ACTION_BITS);
}

export function emoteOf(word: number): number {
  return readBits(word, EMOTE_SHIFT, EMOTE_BITS);
}

export function jobOf(word: number): number {
  return readBits(word, JOB_SHIFT, JOB_BITS);
}

export function facingOf(word: number): number {
  return readBits(word, FACING_SHIFT, FACING_BITS);
}

export function isTrueOnly(word: number): number {
  return readBits(word, TRUE_ONLY_SHIFT, TRUE_ONLY_BITS);
}
