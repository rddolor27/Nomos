import {
  LOOK_EYES,
  LOOK_HUES,
  LOOK_PATTERNS,
  PLACE_EMOTES,
  PLACE_EXPRESSIONS,
  PLACE_FACINGS,
  PLACE_JOBS,
  PLACE_POSES,
} from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';

export type Frames = AtlasPage['frames'];

// A frame's record: its atlas x, y, w and h, its anchor's x and y, and its face offset's x and y, 0 where it has none.
export const RECORD_SHORTS = 8;
export const NO_FRAME = -1;

export const HUES = LOOK_HUES.length;
export const EYES = LOOK_EYES.length;
export const FACINGS = PLACE_FACINGS.length;
// stemOf's index runs over every pose, facing and walk step.
export const STEMS = PLACE_POSES.length * FACINGS * 2;

// The records of the named frames, in order; a name the atlas lacks throws.
export function frameRecords(names: readonly string[], frames: Frames): Int16Array {
  const out = new Int16Array(RECORD_SHORTS * names.length);
  names.forEach((name, i) => {
    const frame = frames[name];
    if (!frame) throw new Error(`the atlas has no frame ${name}`);
    const [faceX, faceY] = frame.face ?? [0, 0];
    out.set([frame.x, frame.y, frame.w, frame.h, frame.anchor[0], frame.anchor[1], faceX, faceY], RECORD_SHORTS * i);
  });
  return out;
}

// place.py's stem: walk_<facing>_<step> for a walker, else <pose>_<facing>. A stander's or sitter's step is 0, and any
// other step draws the same frame.
export function stemOf(pose: number, facing: number, step: number): number {
  return (pose * FACINGS + facing) * 2 + step;
}

function stemName(stem: number): string {
  const pose = PLACE_POSES[Math.floor(stem / (2 * FACINGS))];
  const facing = PLACE_FACINGS[Math.floor(stem / 2) % FACINGS];
  return pose === 'walk' ? `walk_${facing}_${stem % 2}` : `${pose}_${facing}`;
}

function bodyName(slot: number): string {
  return `characters/blob_${LOOK_HUES[Math.floor(slot / STEMS)]}_${stemName(slot % STEMS)}`;
}

// looks.py's layers: only the resting faces vary with the eye shape.
function faceName(slot: number): string | null {
  const facing = PLACE_FACINGS[slot % FACINGS];
  if (facing === 'up') return null;
  const eyes = LOOK_EYES[Math.floor(slot / FACINGS) % EYES];
  const expression = PLACE_EXPRESSIONS[Math.floor(slot / (FACINGS * EYES))];
  const style = (expression === 'neutral' || expression === 'blink') && eyes !== 'round' ? `-${eyes}` : '';
  return `characters/face_${expression}${style}_${facing}`;
}

function patternName(slot: number): string | null {
  const pattern = LOOK_PATTERNS[Math.floor(slot / (HUES * STEMS))];
  const hue = LOOK_HUES[Math.floor(slot / STEMS) % HUES];
  return pattern === 'plain' ? null : `characters/pattern_${pattern}_${hue}_${stemName(slot % STEMS)}`;
}

function jobName(slot: number): string {
  return `characters/job_${PLACE_JOBS[Math.floor(slot / STEMS)]}_${stemName(slot % STEMS)}`;
}

// Every sprite a person can wear, as frame records with tables of indices into them. Each table holds NO_FRAME where
// the atlas has no sprite, such as for a sitter facing up, or where a person wears none, such as a plain pattern.
export interface PersonFrames {
  readonly records: Int16Array;
  // By hue * STEMS + stem.
  readonly body: Int16Array;
  // By (pattern * HUES + hue) * STEMS + stem.
  readonly pattern: Int16Array;
  // By (expression * EYES + eyes) * FACINGS + facing.
  readonly face: Int16Array;
  // By job * STEMS + stem.
  readonly job: Int16Array;
  readonly emote: Int16Array;
}

export function personFrames(frames: Frames): PersonFrames {
  const names: string[] = [];
  function table(size: number, nameOf: (slot: number) => string | null): Int16Array {
    return Int16Array.from({ length: size }, (_, slot) => {
      const name = nameOf(slot);
      if (name === null || !frames[name]) return NO_FRAME;
      names.push(name);
      return names.length - 1;
    });
  }
  const body = table(HUES * STEMS, bodyName);
  const pattern = table(LOOK_PATTERNS.length * HUES * STEMS, patternName);
  const face = table(PLACE_EXPRESSIONS.length * EYES * FACINGS, faceName);
  const job = table(PLACE_JOBS.length * STEMS, jobName);
  const emote = table(PLACE_EMOTES.length, (slot) => `icons/emote_${PLACE_EMOTES[slot]}`);
  return { records: frameRecords(names, frames), body, pattern, face, job, emote };
}
