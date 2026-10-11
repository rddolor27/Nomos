import {
  ACTION_SIT,
  ACTION_TALK,
  ACTIVITY_PLAZA,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_STAYING,
  PHASE_WORKING,
  SITE_GREEN,
  SITE_PLAZA,
  SITE_WATER,
  TICK,
  carriedIn,
  type Errands,
  type Life,
  type World,
} from '@nomos/sim-core';
import { SNAPSHOT_BYTES } from '../messages/messages.ts';
import { EMOTE_BALL, EMOTE_COIN, EMOTE_HEART, EMOTE_MUSIC, EMOTE_SPEECH, packVisual } from './visual.ts';

// What a blob shows of its errand (M2.7) and of its free time (M3.2): the street's bits of its visual word, read from the errand and
// life stores in one pass over the town. A town without streets never writes the stores, whose zeroes read as asleep and so as
// indoors, so writeSnapshot asks only a town with streets. The words for the common cases are made once: one pass with a word
// for each phase took 0.12 to 0.14 ms at 10,000 blobs where a function for each bit, called for every blob, took 0.22 (measured
// here, Node 24.18.0 on Windows, load not recorded).
const SNAPSHOT_WORDS = SNAPSHOT_BYTES / Uint32Array.BYTES_PER_ELEMENT;
const INDOORS_WORD = packVisual(0, 0, 0, 0, 0, 0, 1);
const COIN_WORD = packVisual(0, 0, EMOTE_COIN, 0, 0, 0);
// A blob standing out at its doorstep or in a site sits, and one in a chat talks under a bubble of speech. The sim halts both, so its
// own action is idle and these bits add to nothing.
const SIT_WORD = packVisual(0, ACTION_SIT, 0, 0, 0, 0);
const TALK_WORD = packVisual(0, ACTION_TALK, EMOTE_SPEECH, 0, 0, 0);

// An outing's sign over a blob sitting in its site, by the kind of site: the ball at the plaza, music on a green and a heart by water.
const SIGN_WORDS = new Uint32Array(SITE_WATER + 1).fill(SIT_WORD);
SIGN_WORDS[SITE_PLAZA] = packVisual(0, ACTION_SIT, EMOTE_BALL, 0, 0, 0);
SIGN_WORDS[SITE_GREEN] = packVisual(0, ACTION_SIT, EMOTE_MUSIC, 0, 0, 0);
SIGN_WORDS[SITE_WATER] = packVisual(0, ACTION_SIT, EMOTE_HEART, 0, 0, 0);
// The sign shows in windows of 32 ticks, a quarter of the time, staggered by blob so that a crowd is not all lit at once.
const SIGN_SHIFT = 5;
const SIGN_STAGGER_MASK = 3;

function sittingWord(errands: Errands, blob: number, tick: number): number {
  if (errands.activity[blob] < ACTIVITY_PLAZA || ((tick >>> SIGN_SHIFT) + blob) & SIGN_STAGGER_MASK) return SIT_WORD;
  return SIGN_WORDS[errands.siteKind[errands.shop[blob]]];
}

// A blob in a chat stands to talk. A chat stops a walker for the ticks before chatUntil and sets it off again in the step of tick
// chatUntil, so the world, which waits to run that step, still shows the chat then. A blob that never chatted has no partner, which
// tells the world's first tick, with chatUntil still 0, from the last of a chat.
function chattingAt(life: Life, blob: number, tick: number): boolean {
  return life.chatWith[blob] !== 0 && tick <= life.chatUntil[blob];
}

// The bits of a blob out of doors: the coin of a buyer, the meal of an eater with the good it eats, a chat, a seat with a sign, or a
// walker's load on its way home.
function outdoorsWord(errands: Errands, life: Life, blob: number, phase: number, tick: number): number {
  if (phase === PHASE_BUYING) return COIN_WORD;
  if (phase === PHASE_EATING) return packVisual(0, 0, 0, 0, 0, 0, 0, carriedIn(phase, errands.good[blob]), 1);
  if (phase < PHASE_STAYING) return 0;
  if (chattingAt(life, blob, tick)) return TALK_WORD;
  if (phase === PHASE_STAYING) return sittingWord(errands, blob, tick);
  return phase === PHASE_COMING ? packVisual(0, 0, 0, 0, 0, 0, 0, carriedIn(phase, errands.good[blob])) : 0;
}

// Adds the street's bits to the words the base loop wrote for blobs 0 to agents - 1.
export function addStreet(world: World, view: Uint32Array, agents: number): void {
  const { errands, life } = world;
  const tick = world.globals[TICK];
  for (let i = 0; i < agents; i++) {
    const phase = errands.phase[i];
    view[i * SNAPSHOT_WORDS + 2] |= phase <= PHASE_WORKING ? INDOORS_WORD : outdoorsWord(errands, life, i, phase, tick);
  }
}
