import {
  ACTION_IDLE,
  ACTION_SIT,
  ACTION_TALK,
  ACTION_WALK,
  ACTION_WORK,
  EMOTE_BALL,
  EMOTE_COIN,
  EMOTE_HEART,
  EMOTE_MUSIC,
  EMOTE_QUESTION,
  EMOTE_SPEECH,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SNAPSHOT_BYTES,
  packVisual,
} from '@nomos/sim-protocol';
import { NO_CODE, PLACE_EMOTES, PLACE_EXPRESSIONS, PLACE_FACINGS, PLACE_POSES, type PlaceLayout } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { NO_MARK, RING } from '../src/place/marker.ts';
import { personFrames } from '../src/place/people.ts';
import { SOLID_DARK, SOLID_LIGHT, SOLID_X } from '../src/place/solid.ts';
import { INSTANCE_SHORTS, PlaceSprites } from '../src/place/sprites.ts';
import type { Retained } from '../src/renderer/types.ts';
import { TownPeople } from '../src/town/people.ts';
import { manifestFrames } from './manifest-frames.ts';

// An agent in one snapshot: its world px, and its visual word.
type Agent = [x: number, y: number, word: number];

function walker(look: number, facing = FACING_DOWN): number {
  return packVisual(look, ACTION_WALK, 0, 0, facing, 0);
}

function idler(look: number, facing = FACING_DOWN): number {
  return packVisual(look, ACTION_IDLE, 0, 0, facing, 0);
}

// A blob standing in the street: the good it carries, whether it eats and whether it is indoors.
function streeter(look: number, item: number, eating: number, indoors: number): number {
  return packVisual(look, ACTION_IDLE, 0, 0, FACING_DOWN, 0, indoors, item, eating);
}

// A blob at a counter, facing it, under an emote id of the word.
function bubbler(look: number, emote: number): number {
  return packVisual(look, ACTION_IDLE, emote, 0, FACING_UP, 0);
}

// A blob the street sat at its doorstep or spot, facing a keyed way.
function sitter(look: number, facing: number): number {
  return packVisual(look, ACTION_SIT, 0, 0, facing, 0);
}

// A blob in a chat, facing its partner, under the speech bubble every chatter shows.
function chatter(look: number, facing: number): number {
  return packVisual(look, ACTION_TALK, EMOTE_SPEECH, 0, facing, 0);
}

// The renderer's two latest snapshots, slot 0 the current one, as pushSnapshot leaves them.
function retained(prev: Agent[], cur: Agent[], tick = 0): Retained {
  const copies = [cur, prev].map((agents) => {
    const bytes = new Uint8Array(agents.length * SNAPSHOT_BYTES);
    const view = new DataView(bytes.buffer);
    agents.forEach(([x, y, word], i) => {
      view.setFloat32(i * SNAPSHOT_BYTES, x, true);
      view.setFloat32(i * SNAPSHOT_BYTES + 4, y, true);
      view.setUint32(i * SNAPSHOT_BYTES + 8, word, true);
    });
    return bytes;
  });
  return {
    map: null,
    minimap: null,
    copies,
    floats: copies.map((copy) => new Float32Array(copy.buffer)),
    words: copies.map((copy) => new Uint32Array(copy.buffer)),
    slot: 0,
    count: cur.length,
    tick,
  };
}

function written(prev: Agent[], cur: Agent[], alpha = 1, tick = 0): TownPeople {
  const people = new TownPeople();
  const snapshots = retained(prev, cur, tick);
  people.fit(snapshots.count);
  people.write(snapshots, alpha);
  return people;
}

const FRAMES = manifestFrames();
const NAME_AT = new Map(Object.entries(FRAMES).map(([name, frame]) => [frame.x, name]));
const PEOPLE = personFrames(FRAMES);

// The sprites the place pass is sent for these agents, standing still, over a one-tile place, with the selection ring under the
// marked row if there is one, in drawing order.
function packed(agents: Agent[], marked: number): PlaceSprites {
  const place: PlaceLayout = {
    width: 1,
    height: 1,
    frames: ['nature/terrain_paving'],
    tiles: Uint16Array.of(0),
    ground: new Int32Array(0),
    standing: new Int32Array(0),
    people: written(agents, agents).columns,
  };
  const sprites = new PlaceSprites(place, FRAMES, PEOPLE);
  sprites.mark(marked);
  sprites.pack();
  return sprites;
}

// Each person's body, face and bubble in drawing order, by the name of its frame, and each solid quad of a ring as `solid` and the
// number of its colour.
function drawnNames(agents: Agent[], marked = NO_MARK): string[] {
  const sprites = packed(agents, marked);
  const names: string[] = [];
  for (let i = sprites.fixed; i < sprites.count; i++) {
    const at = INSTANCE_SHORTS * i;
    names.push(sprites.data[at + 2] === SOLID_X ? `solid ${sprites.data[at + 3]}` : (NAME_AT.get(sprites.data[at + 2]) ?? '?'));
  }
  return names;
}

// The solid quads of a ring, in order, each as its left, top, width and height in art px.
function solidBoxes(agents: Agent[], marked: number): number[][] {
  const sprites = packed(agents, marked);
  const boxes: number[][] = [];
  for (let i = sprites.fixed; i < sprites.count; i++) {
    const at = INSTANCE_SHORTS * i;
    if (sprites.data[at + 2] === SOLID_X) boxes.push([sprites.data[at], sprites.data[at + 1], sprites.data[at + 4], sprites.data[at + 5]]);
  }
  return boxes;
}

// The left, top, right and bottom, right and bottom exclusive, that boxes of left, top, width and height cover.
function boundsOf(boxes: number[][]): number[] {
  return [
    Math.min(...boxes.map(([x]) => x)),
    Math.min(...boxes.map(([, y]) => y)),
    Math.max(...boxes.map(([x, , w]) => x + w)),
    Math.max(...boxes.map(([, y, , h]) => y + h)),
  ];
}

// A ring's solid quads as drawnNames lists them: every run's dark edge, then its cream.
const RUNS = RING.length / 4;
const RING_NAMES = [...Array<string>(RUNS).fill(`solid ${SOLID_DARK}`), ...Array<string>(RUNS).fill(`solid ${SOLID_LIGHT}`)];

const facing = (name: (typeof PLACE_FACINGS)[number]): number => PLACE_FACINGS.indexOf(name);
const pose = (name: (typeof PLACE_POSES)[number]): number => PLACE_POSES.indexOf(name);

describe('the Town skin\'s people', () => {
  it('stand where the dots would, eased by alpha, rounded to whole art px, and at once after a jump', () => {
    // Standers, who stay where the dots would put them: a walker is moved across its heading into its lane.
    const { columns } = written(
      [[100, 200, idler(0)], [10, 10, idler(0)], [50, 50, idler(0)]],
      [[104, 203, idler(0)], [40, 10, idler(0)], [50, 50, idler(0)]],
      0.5,
    );

    expect([...columns.x]).toEqual([102, 40, 50]);
    expect([...columns.y]).toEqual([202, 10, 50]);
  });

  it('wear the look in the word, walk while the word walks and stand otherwise, neutral with no job or emote', () => {
    const { columns } = written([[0, 0, walker(95)], [0, 0, idler(37)]], [[4, 0, walker(95)], [0, 0, idler(37)]]);

    expect([...columns.look]).toEqual([95, 37]);
    expect([...columns.pose]).toEqual([pose('walk'), pose('stand')]);
    expect([...columns.expression].map((code) => PLACE_EXPRESSIONS[code])).toEqual(['neutral', 'neutral']);
    expect([...columns.job, ...columns.emote]).toEqual([NO_CODE, NO_CODE, NO_CODE, NO_CODE]);
    expect([...columns.lift]).toEqual([0, 0]);
  });

  it("face the way they moved along its larger axis, and the word's way when still or after a jump", () => {
    const up = walker(0, FACING_UP);
    // From (50, 50) to each, with the word the current snapshot carries.
    const moves: Agent[] = [[54, 51, up], [46, 52, up], [51, 54, up], [52, 46, up], [50, 50, walker(0, FACING_LEFT)], [90, 50, up], [53, 53, up]];
    const { columns } = written(moves.map((): Agent => [50, 50, up]), moves);

    expect([...columns.facing].map((code) => PLACE_FACINGS[code])).toEqual(['right', 'left', 'down', 'up', 'left', 'up', 'down']);
  });

  it("maps every facing code in the word to the place's", () => {
    const codes = [FACING_DOWN, FACING_LEFT, FACING_UP, FACING_RIGHT];
    const { columns } = written(
      codes.map((code): Agent => [8, 8, idler(0, code)]),
      codes.map((code): Agent => [8, 8, idler(0, code)]),
    );

    expect([...columns.facing]).toEqual([facing('down'), facing('left'), facing('up'), facing('right')]);
  });

  it('step every 8 art px along the way a walker faces, and never while standing', () => {
    const rightward = [0, 7, 8, 15, 16, 24].map((x): [Agent, Agent] => [[x - 2, 40, walker(0)], [x, 40, walker(0)]]);
    const downward = [0, 8, 16].map((y): [Agent, Agent] => [[13, y - 2, walker(0)], [13, y, walker(0)]]);
    const standing: [Agent, Agent] = [[8, 8, idler(0)], [8, 8, idler(0)]];
    const pairs = [...rightward, ...downward, standing];
    const { columns } = written(pairs.map(([before]) => before), pairs.map(([, after]) => after));

    expect([...columns.step]).toEqual([0, 0, 1, 1, 0, 1, 0, 1, 0, 0]);
  });

  it('read the street bits of the word: the good carried, eating by the tick, and indoors, all 0 for a bare word', () => {
    const agents: Agent[] = [[8, 8, streeter(1, 1, 0, 0)], [8, 8, streeter(2, 7, 1, 0)], [8, 8, streeter(3, 2, 0, 1)], [8, 8, idler(4)]];
    const { columns } = written(agents, agents, 1, 7);

    expect([...columns.item]).toEqual([1, 7, 2, 0]);
    expect([...columns.eat]).toEqual([0, 3, 0, 0]);
    expect([...columns.indoors]).toEqual([0, 0, 1, 0]);
  });

  it("show a buyer's coin as the place's coin emote, and no emote for a bare word or an id with none", () => {
    const agents: Agent[] = [[8, 8, bubbler(1, EMOTE_COIN)], [8, 8, idler(2)], [8, 8, bubbler(3, 31)]];
    const { columns } = written(agents, agents);

    expect([...columns.emote]).toEqual([PLACE_EMOTES.indexOf('coin'), NO_CODE, NO_CODE]);
  });

  it("show a chat's speech, an outing's sign and a visitor's question as the place's bubbles, by one table", () => {
    const ids = [EMOTE_SPEECH, EMOTE_MUSIC, EMOTE_BALL, EMOTE_HEART, EMOTE_QUESTION];
    const agents = ids.map((id, i): Agent => [8, 8, bubbler(i, id)]);
    const { columns } = written(agents, agents);

    expect([...columns.emote].map((code) => PLACE_EMOTES[code])).toEqual(['speech', 'music', 'ball', 'heart', 'question']);
  });

  it('face a chatter and a sitter as the word says, though they moved to stop, and sit a sitter that faces up', () => {
    // Each moved up to the point it stops at: a walker halted to chat with a partner on its left, and three that took a seat.
    const stopped: Agent[] = [
      [100, 50, chatter(1, FACING_LEFT)],
      [60, 50, sitter(2, FACING_DOWN)],
      [60, 50, sitter(3, FACING_RIGHT)],
      [60, 50, sitter(4, FACING_UP)],
    ];
    const moved = stopped.map(([x, y, word]): Agent => [x, y + 6, word]);
    const { columns } = written(moved, stopped);

    expect([...columns.facing].map((code) => PLACE_FACINGS[code])).toEqual(['left', 'down', 'right', 'up']);
    expect([...columns.pose].map((code) => PLACE_POSES[code])).toEqual(['stand', 'sit', 'sit', 'sit']);
    expect([...columns.step, ...columns.lift]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('draw a chatting pair face to face under speech bubbles, and a sitter in its sit frame', () => {
    const pair = drawnNames([[100, 80, chatter(0, FACING_RIGHT)], [120, 80, chatter(1, FACING_LEFT)]]);
    const seated = drawnNames([[40, 40, sitter(2, FACING_LEFT)]]);

    expect(pair).toEqual([
      'characters/blob_sun_stand_right',
      'characters/face_neutral_right',
      'icons/emote_speech',
      'characters/blob_lilac_stand_left',
      'characters/face_neutral_left',
      'icons/emote_speech',
    ]);
    expect(seated).toEqual(['characters/blob_rose_sit_left', 'characters/face_neutral_left']);
  });

  it('draw a sitter that faces up in its sit_up frame, seen from behind with no face', () => {
    expect(drawnNames([[40, 40, sitter(2, FACING_UP)]])).toEqual(['characters/blob_rose_sit_up']);
  });

  it('draw nothing for a blob indoors, whatever else its word says', () => {
    const indoors = packVisual(3, ACTION_SIT, EMOTE_SPEECH, 0, FACING_DOWN, 0, 1);

    expect(drawnNames([[40, 40, indoors]])).toEqual([]);
    expect(drawnNames([[40, 40, indoors], [60, 40, sitter(2, FACING_DOWN)]])).toEqual(drawnNames([[60, 40, sitter(2, FACING_DOWN)]]));
  });

  it('step the eating loop every 3 ticks through 4 steps, and start it again after the fourth', () => {
    const eater: Agent[] = [[8, 8, streeter(1, 1, 1, 0)]];
    const steps = [0, 2, 3, 5, 6, 9, 11, 12, 15].map((tick) => written(eater, eater, 1, tick).columns.eat[0]);

    expect(steps).toEqual([1, 1, 2, 2, 3, 4, 4, 1, 2]);
  });

  it('keep a walker in one of three lanes across its heading, the same lane on every road, and move it no other way', () => {
    const rows = Array.from({ length: 48 }, (_, i) => i);
    // 48 walkers on one run, 4 px apart as the sim spaces them, each just walked 4 px along it: down the road at x 200, or right
    // along it at y 300.
    const downBefore = rows.map((i): Agent => [200, 100 + 4 * i, walker(i)]);
    const downNow = rows.map((i): Agent => [200, 104 + 4 * i, walker(i)]);
    const rightBefore = rows.map((i): Agent => [100 + 4 * i, 300, walker(i)]);
    const rightNow = rows.map((i): Agent => [104 + 4 * i, 300, walker(i)]);
    const down = written(downBefore, downNow).columns;
    const right = written(rightBefore, rightNow).columns;
    const acrossDown = Array.from(down.x, (x) => x - 200);

    expect([...new Set(acrossDown)].sort((a, b) => a - b)).toEqual([-5, 0, 5]);
    expect(Array.from(right.y, (y) => y - 300)).toEqual(acrossDown);
    expect([...down.y]).toEqual(rows.map((i) => 104 + 4 * i));
    expect([...right.x]).toEqual(rows.map((i) => 104 + 4 * i));
    // The row keys the lane, so a frame at another alpha leaves it alone.
    expect(Array.from(written(downBefore, downNow, 0.5).columns.x, (x) => x - 200)).toEqual(acrossDown);
  });

  it('leave a sitter, a chatter, a stander and a worker where the sim puts them, in any row', () => {
    const rows = Array.from({ length: 30 }, (_, i) => i);
    // Each moved 6 px down to the point it stops at, so a walker of the row would take a lane.
    const stopped = (word: (row: number) => number): number[][] => {
      const now = rows.map((i): Agent => [200, 300 + 4 * i, word(i)]);
      const { x, y } = written(now.map(([px, py, w]): Agent => [px, py - 6, w]), now).columns;
      return [[...x], [...y]];
    };
    const words = [
      (i: number) => sitter(i, FACING_LEFT),
      (i: number) => chatter(i, FACING_RIGHT),
      (i: number) => idler(i),
      (i: number) => packVisual(i, ACTION_WORK, 0, 0, FACING_UP, 0),
    ];

    expect(stopped(walker)[0].some((x) => x !== 200)).toBe(true);
    for (const word of words) expect(stopped(word)).toEqual([rows.map(() => 200), rows.map((i) => 300 + 4 * i)]);
  });

  it('draw the selection ring under the marked blob only, in its depth, and take it away at -1', () => {
    // Row 1 stands behind row 0. A ring goes down before its own blob's body, so the blob in front draws over a ring behind it,
    // and a blob behind never covers a ring in front.
    const agents: Agent[] = [[100, 90, idler(0)], [104, 80, idler(1)]];
    const front = ['characters/blob_sun_stand_down', 'characters/face_neutral_down'];
    const behind = ['characters/blob_lilac_stand_down', 'characters/face_neutral_down'];

    expect(drawnNames(agents, 1)).toEqual([...RING_NAMES, ...behind, ...front]);
    expect(drawnNames(agents, 0)).toEqual([...behind, ...RING_NAMES, ...front]);
    expect(drawnNames(agents, NO_MARK)).toEqual([...behind, ...front]);
    expect(drawnNames(agents, 2)).toEqual([...behind, ...front]);
  });

  it("draw the ring 22 px wide and 9 tall round the marked blob's anchor, with a pixel of edge, where its lane puts it", () => {
    // Twelve walkers facing down, some in a lane off their x, and the ring goes round the first of those, where it is drawn.
    const agents = Array.from({ length: 12 }, (_, i): Agent => [100, 80 + i, walker(i)]);
    const { x, y } = written(agents, agents).columns;
    const row = x.findIndex((px) => px !== 100);
    const boxes = solidBoxes(agents, row);

    expect(row).toBeGreaterThanOrEqual(0);
    expect(boundsOf(boxes.slice(RUNS))).toEqual([x[row] - 11, y[row] - 4, x[row] + 11, y[row] + 5]);
    expect(boundsOf(boxes.slice(0, RUNS))).toEqual([x[row] - 12, y[row] - 5, x[row] + 12, y[row] + 6]);
  });

  it('draw no ring round a marked blob that is indoors, and nothing else of it', () => {
    const indoors = packVisual(3, ACTION_SIT, EMOTE_SPEECH, 0, FACING_DOWN, 0, 1);
    const crowd: Agent[] = [[40, 40, indoors], [60, 40, sitter(2, FACING_DOWN)]];

    expect(drawnNames(crowd, 0)).toEqual(['characters/blob_rose_sit_down', 'characters/face_neutral_down']);
    expect(drawnNames(crowd, 0)).toEqual(drawnNames(crowd));
  });

  it('make their columns again only when the agent count changes', () => {
    const people = new TownPeople();
    const before = people.columns;

    expect([people.fit(0), people.columns]).toEqual([false, before]);
    expect(people.fit(3)).toBe(true);
    const three = people.columns;
    const agents: Agent[] = [[1, 1, walker(1)], [2, 2, walker(2)], [3, 3, walker(3)]];
    people.write(retained(agents, agents), 1);
    expect([people.fit(3), people.columns === three, three.x.length]).toEqual([false, true, 3]);
    expect(people.fit(5)).toBe(true);
    expect([people.columns.look.length, people.columns.item.length, people.columns.eat.length, people.columns.indoors.length]).toEqual([5, 5, 5, 5]);
  });
});
