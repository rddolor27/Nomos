import { readFileSync, readdirSync } from 'node:fs';
import {
  ITEM_GOODS,
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
import { NO_FRAME, NO_POINT, frameRecords, personFrames } from '../src/place/people.ts';
import { INSTANCE_SHORTS, PlaceSprites } from '../src/place/sprites.ts';
import { PLACE_NAMES, placeLayout } from './place-fixtures.ts';

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);

type Point = [number, number];

interface Manifest {
  frames: Record<string, Omit<AtlasFrame, 'x' | 'y'>>;
}

// Every manifest frame on a one-row test page, frame i at x = i, so an instance's atlas x names its frame.
function testFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const file of readdirSync(SPRITES).filter((name) => name.endsWith('.json') && name !== 'season_map.json').sort()) {
    const manifest = JSON.parse(readFileSync(new URL(file, SPRITES), 'utf8')) as Manifest;
    for (const [name, f] of Object.entries(manifest.frames)) {
      const { w, h, anchor, face, hold, eat } = f;
      frames[`${file.slice(0, -5)}/${name}`] = { x: x++, y: 0, w, h, anchor, ...(face && { face }), ...(hold && { hold }), ...(eat && { eat }) };
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

// The eating loop's four steps: where the item sits among the body frame's eating steps, and which mouth chews.
const EAT_ITEM = [0, 1, 2, 1];
const EAT_MOUTH = [0, 1, 0, 1];

// A street column's value for person j, 0 where the layout has no such column.
function streetOf(layout: PlaceLayout, column: 'item' | 'eat' | 'indoors', j: number): number {
  return layout.people[column]?.[j] ?? 0;
}

// looks.py's face: the resting one, which varies with the eye shape, or the chewing mouth of the eating loop.
function faceFrame(expression: string, eyes: string, facing: string, eat: number): string {
  if (eat > 0) return `characters/face_chew_${EAT_MOUTH[eat - 1]}_${facing}`;
  const style = (expression === 'neutral' || expression === 'blink') && eyes !== 'round' ? `-${eyes}` : '';
  return `characters/face_${expression}${style}_${facing}`;
}

// The carried good over the body, at the frame's eating step while its person eats, else its hold point: nothing where the
// frame carries nothing, or the person faces up.
function itemLayer(good: number, body: string, facing: string, eat: number, x: number, y: number): Drawn[] {
  const frame = FRAMES[body];
  const point = eat > 0 ? (frame.eat?.[EAT_ITEM[eat - 1]] ?? frame.hold) : frame.hold;
  if (good === 0 || !point || facing === 'up') return [];
  return [[`icons/carry_${ITEM_GOODS[good - 1]}`, x - frame.anchor[0] + point[0], y - frame.anchor[1] + point[1]]];
}

// looks.py's layers and placedraw.py's person_layers, written with names as Python writes them, then the street's: a person
// indoors has none, an eater chews instead of resting, and the good carried follows the job item.
function personLayers(layout: PlaceLayout, j: number): Drawn[] {
  const p = layout.people;
  if (streetOf(layout, 'indoors', j)) return [];
  const eat = streetOf(layout, 'eat', j);
  const look = p.look[j];
  const hue = LOOK_HUES[look % 6];
  const eyes = LOOK_EYES[Math.floor(look / 6) % 4];
  const pattern = LOOK_PATTERNS[Math.floor(look / 24)];
  const facing = PLACE_FACINGS[p.facing[j]];
  const pose = PLACE_POSES[p.pose[j]];
  const stem = pose === 'walk' ? `walk_${facing}_${p.step[j]}` : `${pose}_${facing}`;
  const body = `characters/blob_${hue}_${stem}`;
  const [fdx, fdy] = FRAMES[body].face ?? [0, 0];
  const x = p.x[j];
  const y = p.y[j] - p.lift[j];
  const out = [at(body, x, y)];
  if (pattern !== 'plain') out.push(at(`characters/pattern_${pattern}_${hue}_${stem}`, x, y));
  if (facing !== 'up') out.push(at(faceFrame(PLACE_EXPRESSIONS[p.expression[j]], eyes, facing, eat), x + fdx, y + fdy));
  if (p.job[j] !== NO_CODE) out.push(at(`characters/job_${PLACE_JOBS[p.job[j]]}_${stem}`, x, y));
  out.push(...itemLayer(streetOf(layout, 'item', j), body, facing, eat, x, y));
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

// A one-tile place whose people are given as rows of codes: look, pose, facing, step, expression, job, emote, x, y, and then,
// where a row goes on, the street's item, eat and indoors. A crowd with no such row has no street columns at all, as a
// layout from the map worker has none.
function crowd(rows: number[][], standing: number[] = []): PlaceLayout {
  const column = (k: number): number[] => rows.map((row) => (k < row.length ? row[k] : 0));
  const street = rows.some((row) => row.length > 9);
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
      ...(street && { item: Uint8Array.from(column(9)), eat: Uint8Array.from(column(10)), indoors: Uint8Array.from(column(11)) }),
    },
  };
}

const WALK = PLACE_POSES.indexOf('walk');
const SIT = PLACE_POSES.indexOf('sit');
const UP = PLACE_FACINGS.indexOf('up');

// Every pose, facing and step the atlas draws.
function stems(): [pose: number, facing: number, step: number][] {
  const out: [number, number, number][] = [];
  PLACE_POSES.forEach((_, pose) => {
    PLACE_FACINGS.forEach((_, facing) => {
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

  it('has a sprite for a sitter facing up as for every other pose, and draws it with no face', () => {
    expect(Array.from(PEOPLE.body.keys()).filter((slot) => PEOPLE.body[slot] === NO_FRAME)).toEqual([]);
    const sitter = crowd([[0, SIT, UP, 0, 0, NO_CODE, NO_CODE, 8, 8]]);
    expect(drawn(packed(sitter)).slice(1)).toEqual([at('characters/blob_sun_sit_up', 8, 8)]);
  });

  it('names a frame the atlas lacks', () => {
    const layout = crowd([]);
    layout.frames[1] = 'nature/prop_no-such-thing';
    expect(() => new PlaceSprites(layout, FRAMES, PEOPLE)).toThrow('the atlas has no frame nature/prop_no-such-thing');
  });
});

const STAND = PLACE_POSES.indexOf('stand');
const DOWN = PLACE_FACINGS.indexOf('down');
const LEFT = PLACE_FACINGS.indexOf('left');
const RIGHT = PLACE_FACINGS.indexOf('right');

// One person at (40, 30), of look 0, with the street's codes.
function streeter(pose: number, facing: number, item: number, eat = 0, indoors = 0, step = 0): number[] {
  return [0, pose, facing, step, 0, NO_CODE, NO_CODE, 40, 30, item, eat, indoors];
}

// The person layers a crowd draws, without the ground.
function layersOf(rows: number[][]): Drawn[] {
  return drawn(packed(crowd(rows))).filter(([name]) => name.startsWith('characters/') || name.startsWith('icons/'));
}

describe('the street on the place sprite list', () => {
  it('dresses every pose and facing with each good and each step of the eating loop, as the street draws them', () => {
    const rows: number[][] = [];
    for (const [pose, facing, step] of stems()) {
      for (let good = 0; good <= ITEM_GOODS.length; good++) {
        for (let eat = 0; eat <= 4; eat++) {
          rows.push([good, pose, facing, step, 0, NO_CODE, NO_CODE, 40 + (rows.length % 13), 30 + (rows.length % 5), good, eat, 0]);
        }
      }
    }
    const layout = crowd(rows);
    expect(drawn(packed(layout))).toEqual(reference(layout));
  });

  it("draws the good carried over the body at the frame's hold point, unmirrored, and none facing up", () => {
    const carried = (facing: number): Drawn | undefined => layersOf([streeter(STAND, facing, 1)]).at(-1);

    expect(carried(DOWN)).toEqual(['icons/carry_bread', 31, 25]);
    expect(carried(LEFT)).toEqual(['icons/carry_bread', 31, 25]);
    // The hold is mirrored about the 18 px canvas, and the 8 px item itself is not.
    expect(carried(RIGHT)).toEqual(['icons/carry_bread', 41, 25]);
    expect(layersOf([streeter(STAND, UP, 1)]).filter(([name]) => name.startsWith('icons/'))).toEqual([]);
  });

  it('chews with the mouths 0, 1, 0, 1 and lifts the item through its steps 0, 1, 2, 1 while a person eats', () => {
    for (const facing of [DOWN, LEFT, RIGHT]) {
      const loop = [1, 2, 3, 4].map((eat) => layersOf([streeter(STAND, facing, 1, eat)]));
      const mouths = loop.map((layers) => layers.find(([name]) => name.includes('/face_'))?.[0]);
      const corners = loop.map((layers) => layers.at(-1)?.slice(1));
      const held = layersOf([streeter(STAND, facing, 1)]).at(-1)?.slice(1);

      expect(mouths).toEqual([0, 1, 0, 1].map((mouth) => `characters/face_chew_${mouth}_${PLACE_FACINGS[facing]}`));
      expect(corners[0]).toEqual(held);
      expect(corners[1]).toEqual(corners[3]);
      expect(new Set(corners.map(String)).size).toBe(3);
    }
  });

  it('keeps the good in hand for an eater who walks, shows none for an eater with none, and draws no mouth facing up', () => {
    const walking = layersOf([streeter(WALK, DOWN, 3, 3)]);
    const held = layersOf([streeter(WALK, DOWN, 3)]);
    const bare = layersOf([streeter(STAND, DOWN, 0, 2)]);

    expect(walking.at(-1)).toEqual(held.at(-1));
    expect(walking.at(-1)?.[0]).toBe('icons/carry_fish');
    expect(bare.some(([name]) => name.startsWith('icons/'))).toBe(false);
    expect(bare.some(([name]) => name.includes('face_chew_'))).toBe(true);
    expect(layersOf([streeter(STAND, UP, 1, 2)]).some(([name]) => name.includes('/face_'))).toBe(false);
  });

  it("draws a buyer's coin bubble last, over its body and face, where the emote layer puts it", () => {
    const buyer = [0, STAND, UP, 0, 0, NO_CODE, PLACE_EMOTES.indexOf('coin'), 40, 30, 0, 0, 0];
    const layout = crowd([buyer]);

    expect(layersOf([buyer]).at(-1)?.[0]).toBe('icons/emote_coin');
    expect(drawn(packed(layout))).toEqual(reference(layout));
  });

  it('draws nothing for a person indoors, however much it carries, and leaves the others as they were', () => {
    const outside = (x: number, facing: number): number[] => [0, STAND, facing, 0, 0, NO_CODE, NO_CODE, x, 30, 1];
    const home = [3, STAND, DOWN, 0, 0, NO_CODE, NO_CODE, 50, 30, 7, 2, 1];
    const crowded = packed(crowd([outside(20, DOWN), home, outside(60, LEFT)]));
    const alone = packed(crowd([outside(20, DOWN), outside(60, LEFT)]));

    expect(drawn(crowded)).toEqual(drawn(alone));
    expect(crowded.count).toBe(alone.count);
  });

  it("records a body frame's hold and eating steps, repeating the hold where it has no steps and marking none where it carries none", () => {
    const frame = { x: 1, y: 2, w: 18, h: 22, anchor: [9, 20] as Point };
    const records = frameRecords(['stands', 'walks', 'bare'], {
      stands: { ...frame, hold: [3, 4], eat: [[3, 4], [5, 6], [7, 8]] },
      walks: { ...frame, hold: [-1, 16] },
      bare: frame,
    });
    const itemPoints = (i: number): number[] => Array.from(records.subarray(16 * i + 8, 16 * i + 16));

    expect(itemPoints(0)).toEqual([3, 4, 3, 4, 5, 6, 7, 8]);
    expect(itemPoints(1)).toEqual([-1, 16, -1, 16, -1, 16, -1, 16]);
    expect(itemPoints(2)).toEqual(Array<number>(8).fill(NO_POINT));
  });

  it('says so when the atlas lacks the good a person carries', () => {
    const without = { ...FRAMES };
    delete without['icons/carry_fish'];
    const sprites = new PlaceSprites(crowd([streeter(STAND, DOWN, 3)]), FRAMES, personFrames(without));

    expect(() => sprites.pack()).toThrow('the atlas has no sprite for a carried good');
  });
});
