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

// Snapshot v1's visual word (interfaces.md). Bit 31 is reserved, and there is no wanted bit (R1, R3). M2.7's street bits
// are `indoors` (bit 7), `item`, the good carried (bits 27-29, 0 none or the good's id, BREAD 1 to FUEL 7), and `eating`
// (bit 30).
const LOOK_SHIFT = 0;
const LOOK_BITS = 7;
const INDOORS_SHIFT = 7;
const INDOORS_BITS = 1;
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
const ITEM_SHIFT = 27;
const ITEM_BITS = 3;
const EATING_SHIFT = 30;
const EATING_BITS = 1;

// The emote ids of the word's emote field, where 0 is none. The coin is the bubble over a buyer at a counter (M2.7 Ruling 8).
export const EMOTE_COIN = 1;

export const VISUAL_FIELDS: readonly { name: string; shift: number; bits: number }[] = [
  { name: 'look', shift: LOOK_SHIFT, bits: LOOK_BITS },
  { name: 'action', shift: ACTION_SHIFT, bits: ACTION_BITS },
  { name: 'emote', shift: EMOTE_SHIFT, bits: EMOTE_BITS },
  { name: 'job', shift: JOB_SHIFT, bits: JOB_BITS },
  { name: 'facing', shift: FACING_SHIFT, bits: FACING_BITS },
  { name: 'trueOnly', shift: TRUE_ONLY_SHIFT, bits: TRUE_ONLY_BITS },
  { name: 'indoors', shift: INDOORS_SHIFT, bits: INDOORS_BITS },
  { name: 'item', shift: ITEM_SHIFT, bits: ITEM_BITS },
  { name: 'eating', shift: EATING_SHIFT, bits: EATING_BITS },
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

// Each field is masked so a stray value never reaches a neighbour or a reserved bit. The top bit used is 30, so the
// result is a non-negative int32, which is already a valid uint32 and needs no >>> 0. The street's three default to 0, so
// a caller with no street keeps the words it always packed.
export function packVisual(
  look: number,
  action: number,
  emote: number,
  job: number,
  facing: number,
  trueOnly: number,
  indoors = 0,
  item = 0,
  eating = 0,
): number {
  return (
    placeBits(look, LOOK_SHIFT, LOOK_BITS) |
    placeBits(action, ACTION_SHIFT, ACTION_BITS) |
    placeBits(emote, EMOTE_SHIFT, EMOTE_BITS) |
    placeBits(job, JOB_SHIFT, JOB_BITS) |
    placeBits(facing, FACING_SHIFT, FACING_BITS) |
    placeBits(trueOnly, TRUE_ONLY_SHIFT, TRUE_ONLY_BITS) |
    placeBits(indoors, INDOORS_SHIFT, INDOORS_BITS) |
    placeBits(item, ITEM_SHIFT, ITEM_BITS) |
    placeBits(eating, EATING_SHIFT, EATING_BITS)
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

export function indoorsOf(word: number): number {
  return readBits(word, INDOORS_SHIFT, INDOORS_BITS);
}

export function itemOf(word: number): number {
  return readBits(word, ITEM_SHIFT, ITEM_BITS);
}

export function eatingOf(word: number): number {
  return readBits(word, EATING_SHIFT, EATING_BITS);
}
