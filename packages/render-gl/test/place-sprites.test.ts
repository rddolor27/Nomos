import { readFileSync, readdirSync } from 'node:fs';
import {
  LOOK_EYES,
  LOOK_HUES,
  LOOK_PATTERNS,
  NO_CODE,
  PLACE_EMOTES,
  PLACE_EXPRESSIONS,
  PLACE_FACINGS,
  PLACE_JOBS,
  PLACE_POSES,
  PLACE_TILE_PX,
  type PlaceLayout,
} from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import type { AtlasFrame } from '../src/map/frames.ts';
import { NO_FRAME, STEMS, personFrames, stemOf } from '../src/place/people.ts';
import { INSTANCE_SHORTS, PlaceSprites } from '../src/place/sprites.ts';
import { PLACE_NAMES, placeLayout } from './place-fixtures.ts';

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);

interface Manifest {
  frames: Record<string, { w: number; h: number; anchor: [number, number]; face?: [number, number] }>;
}

// Every manifest frame on a one-row test page, frame i at x = i, so an instance's atlas x names its frame.
function testFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const file of readdirSync(SPRITES).filter((name) => name.endsWith('.json') && name !== 'season_map.json').sort()) {
    const manifest = JSON.parse(readFileSync(new URL(file, SPRITES), 'utf8')) as Manifest;
    for (const [name, f] of Object.entries(manifest.frames)) {
      frames[`${file.slice(0, -5)}/${name}`] = { x: x++, y: 0, w: f.w, h: f.h, anchor: f.anchor, ...(f.face && { face: f.face }) };
    }
  }
  return frames;
}

const FRAMES = testFrames();
const NAME_AT = new Map(Object.entries(FRAMES).map(([name, frame]) => [frame.x, name]));
const PEOPLE = personFrames(FRAMES);

// A sprite as drawn: its frame and its top-left art pixel.
type Drawn = [name: string, x: number, y: number];

function at(name: string, x: number, y: number): Drawn {
  const frame = FRAMES[name];
  return [name, x - frame.anchor[0], y - frame.anchor[1]];
}

// looks.py's layers and placedraw.py's person_layers, written with names as Python writes them.
function personLayers(layout: PlaceLayout, j: number): Drawn[] {
  const p = layout.people;
  const look = p.look[j];
  const hue = LOOK_HUES[look % 6];
  const eyes = LOOK_EYES[Math.floor(look / 6) % 4];
  const pattern = LOOK_PATTERNS[Math.floor(look / 24)];
  const facing = PLACE_FACINGS[p.facing[j]];
  const pose = PLACE_POSES[p.pose[j]];
  const stem = pose === 'walk' ? `walk_${facing}_${p.step[j]}` : `${pose}_${facing}`;
  const expression = PLACE_EXPRESSIONS[p.expression[j]];
  const body = `characters/blob_${hue}_${stem}`;
  const [fdx, fdy] = FRAMES[body].face ?? [0, 0];
  const x = p.x[j];
  const y = p.y[j] - p.lift[j];
  const out = [at(body, x, y)];
  if (pattern !== 'plain') out.push(at(`characters/pattern_${pattern}_${hue}_${stem}`, x, y));
  if (facing !== 'up') {
    const style = (expression === 'neutral' || expression === 'blink') && eyes !== 'round' ? `-${eyes}` : '';
    out.push(at(`characters/face_${expression}${style}_${facing}`, x + fdx, y + fdy));
  }
  if (p.job[j] !== NO_CODE) out.push(at(`characters/job_${PLACE_JOBS[p.job[j]]}_${stem}`, x, y));
  if (p.emote[j] !== NO_CODE) out.push(at(`icons/emote_${PLACE_EMOTES[p.emote[j]]}`, x + 7, y + fdy - 15));
  return out;
}

function sprite(layout: PlaceLayout, list: Int32Array, i: number): Drawn {
  return at(layout.frames[list[3 * i]], list[3 * i + 1], list[3 * i + 2]);
}

// placedraw.draw's order: tiles row by row, ground by y, then standing sprites and people by (y, index).
function reference(layout: PlaceLayout): Drawn[] {
  const out: Drawn[] = [];
  layout.tiles.forEach((frame, t) => {
    const x = (t % layout.width) * PLACE_TILE_PX + PLACE_TILE_PX / 2;
    const y = Math.floor(t / layout.width) * PLACE_TILE_PX + PLACE_TILE_PX - 1;
    out.push(at(layout.frames[frame], x, y));
  });
  const ground = Array.from({ length: layout.ground.length / 3 }, (_, i) => i);
  ground.sort((a, b) => layout.ground[3 * a + 2] - layout.ground[3 * b + 2] || a - b);
  for (const i of ground) out.push(sprite(layout, layout.ground, i));
  const standing = layout.standing.length / 3;
  const queue: [y: number, index: number, sprites: () => Drawn[]][] = [];
  for (let i = 0; i < standing; i++) queue.push([layout.standing[3 * i + 2], i, () => [sprite(layout, layout.standing, i)]]);
  layout.people.y.forEach((y, j) => queue.push([y, standing + j, () => personLayers(layout, j)]));
  queue.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, , sprites] of queue) out.push(...sprites());
  return out;
}

function drawn(sprites: PlaceSprites): Drawn[] {
  const out: Drawn[] = [];
  for (let i = 0; i < sprites.count; i++) {
    const [x, y, srcX] = sprites.data.subarray(INSTANCE_SHORTS * i, INSTANCE_SHORTS * i + 3);
    out.push([NAME_AT.get(srcX) ?? `atlas x ${srcX}`, x, y]);
  }
  return out;
}

function packed(layout: PlaceLayout): PlaceSprites {
  const sprites = new PlaceSprites(layout, FRAMES, PEOPLE);
  sprites.pack();
  return sprites;
}

// A one-tile place whose people are given as rows of codes: look, pose, facing, step, expression, job, emote, x, y.
function crowd(rows: number[][], standing: number[] = []): PlaceLayout {
  const column = (k: number): number[] => rows.map((row) => row[k]);
  return {
    width: 1,
    height: 1,
    frames: ['nature/terrain_grass_0', 'nature/prop_bench'],
    tiles: Uint16Array.of(0),
    ground: new Int32Array(0),
    standing: Int32Array.from(standing),
    people: {
      look: Uint8Array.from(column(0)),
      pose: Uint8Array.from(column(1)),
      facing: Uint8Array.from(column(2)),
      step: Uint8Array.from(column(3)),
      expression: Uint8Array.from(column(4)),
      job: Uint8Array.from(column(5)),
      emote: Uint8Array.from(column(6)),
      x: Int32Array.from(column(7)),
      y: Int32Array.from(column(8)),
      lift: new Uint8Array(rows.length),
    },
  };
}

const WALK = PLACE_POSES.indexOf('walk');
const SIT = PLACE_POSES.indexOf('sit');
const UP = PLACE_FACINGS.indexOf('up');

// Every pose, facing and step the atlas draws: all but a sitter facing up.
function stems(): [pose: number, facing: number, step: number][] {
  const out: [number, number, number][] = [];
  PLACE_POSES.forEach((_, pose) => {
    PLACE_FACINGS.forEach((_, facing) => {
      if (pose === SIT && facing === UP) return;
      for (let step = 0; step < (pose === WALK ? 2 : 1); step++) out.push([pose, facing, step]);
    });
  });
  return out;
}

describe('the place sprite list', () => {
  it.each(PLACE_NAMES)('draws the %s fixture in placedraw.py order', (name) => {
    const layout = placeLayout(name);
    expect(drawn(packed(layout))).toEqual(reference(layout));
  });

  it('dresses every look in every pose, face, job item and emote as placedraw.py does', () => {
    const rows: number[][] = [];
    const add = (look: number, [pose, facing, step]: number[], expression: number, job: number, emote: number): void => {
      rows.push([look, pose, facing, step, expression, job, emote, 40 + (rows.length % 13), 30 + (rows.length % 5)]);
    };
    for (let look = 0; look < 96; look++) for (const stem of stems()) add(look, stem, 0, NO_CODE, NO_CODE);
    for (let expression = 0; expression < 3; expression++) {
      for (let eyes = 0; eyes < 4; eyes++) for (const stem of stems()) add(6 * eyes, stem, expression, NO_CODE, NO_CODE);
    }
    for (let job = 0; job < PLACE_JOBS.length; job++) for (const stem of stems()) add(0, stem, 1, job, NO_CODE);
    for (let emote = 0; emote < PLACE_EMOTES.length; emote++) for (const stem of stems()) add(5, stem, 2, NO_CODE, emote);
    const layout = crowd(rows);
    expect(drawn(packed(layout))).toEqual(reference(layout));
  });

  it('draws a standing sprite before the people on its row, and people on one row by index', () => {
    const person = (x: number, y: number): number[] => [0, 0, 0, 0, 0, NO_CODE, NO_CODE, x, y];
    const layout = crowd([person(10, 50), person(20, 50), person(30, 49)], [1, 15, 50]);
    const bodies = drawn(packed(layout)).filter(([name]) => !name.includes('/face_') && !name.includes('/terrain_'));
    const blob = 'characters/blob_sun_stand_down';
    expect(bodies).toEqual([at(blob, 30, 49), at('nature/prop_bench', 15, 50), at(blob, 10, 50), at(blob, 20, 50)]);
  });

  it('re-sorts and redraws people as they move, keeping the tiles and ground as they were', () => {
    const layout = placeLayout('capital');
    const sprites = packed(layout);
    const fixed = sprites.data.slice(0, INSTANCE_SHORTS * sprites.fixed);
    const { people } = layout;
    let seed = 7;
    const next = (n: number): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return (seed >>> 16) % n;
    };
    for (let round = 0; round < 40; round++) {
      for (let j = 0; j < people.y.length; j++) {
        people.x[j] += next(17) - 8;
        people.y[j] += next(17) - 8;
        if (people.pose[j] === WALK) {
          people.facing[j] = next(4);
          people.step[j] = next(2);
        }
      }
      sprites.pack();
      expect(drawn(sprites)).toEqual(reference(layout));
    }
    expect(sprites.data.slice(0, INSTANCE_SHORTS * sprites.fixed)).toEqual(fixed);
  });

  it('has no sprite for a sitter facing up, and says so when asked to draw one', () => {
    const missing = Array.from(PEOPLE.body.keys()).filter((slot) => PEOPLE.body[slot] === NO_FRAME);
    expect(missing).toEqual(LOOK_HUES.flatMap((_, hue) => [0, 1].map((step) => hue * STEMS + stemOf(SIT, UP, step))));
    const sitter = crowd([[0, SIT, UP, 0, 0, NO_CODE, NO_CODE, 8, 8]]);
    expect(() => packed(sitter)).toThrow('no sprite for a person in this pose and facing');
  });

  it('names a frame the atlas lacks', () => {
    const layout = crowd([]);
    layout.frames[1] = 'nature/prop_no-such-thing';
    expect(() => new PlaceSprites(layout, FRAMES, PEOPLE)).toThrow('the atlas has no frame nature/prop_no-such-thing');
  });
});
