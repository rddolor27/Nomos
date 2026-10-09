import {
  ACTION_IDLE,
  ACTION_WALK,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SNAPSHOT_BYTES,
  packVisual,
} from '@nomos/sim-protocol';
import { NO_CODE, PLACE_EXPRESSIONS, PLACE_FACINGS, PLACE_POSES } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import type { Retained } from '../src/renderer/types.ts';
import { TownPeople } from '../src/town/people.ts';

// An agent in one snapshot: its world px, and its visual word.
type Agent = [x: number, y: number, word: number];

function walker(look: number, facing = FACING_DOWN): number {
  return packVisual(look, ACTION_WALK, 0, 0, facing, 0);
}

function idler(look: number, facing = FACING_DOWN): number {
  return packVisual(look, ACTION_IDLE, 0, 0, facing, 0);
}

// The renderer's two latest snapshots, slot 0 the current one, as pushSnapshot leaves them.
function retained(prev: Agent[], cur: Agent[]): Retained {
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
  };
}

function written(prev: Agent[], cur: Agent[], alpha = 1): TownPeople {
  const people = new TownPeople();
  const snapshots = retained(prev, cur);
  people.fit(snapshots.count);
  people.write(snapshots, alpha);
  return people;
}

const facing = (name: (typeof PLACE_FACINGS)[number]): number => PLACE_FACINGS.indexOf(name);
const pose = (name: (typeof PLACE_POSES)[number]): number => PLACE_POSES.indexOf(name);

describe('the Town skin\'s people', () => {
  it('stand where the dots would, eased by alpha, rounded to whole art px, and at once after a jump', () => {
    const { columns } = written(
      [[100, 200, walker(0)], [10, 10, walker(0)], [50, 50, idler(0)]],
      [[104, 203, walker(0)], [40, 10, walker(0)], [50, 50, idler(0)]],
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
    expect(people.columns.look.length).toBe(5);
  });
});
