import { describe, expect, it } from 'vitest';
import { WALK_X_Q8, WALK_Y_Q8 } from '../src/movement/walk.ts';
import { CELL_DX, CELL_DY, DIRECTIONS, FIELD_BYTES, MAX_SITES, buildFields, cellStepOf } from '../src/street/fields.ts';
import { MAX_RUNS, NO_PATH, RUN_BYTES, TOO_FAR, pathRuns } from '../src/street/runs.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import type { Ground } from '../src/world/ground.ts';
import { createWorld, layoutWorld } from '../src/world/world.ts';

const NONE = new Array<number>(RUN_BYTES).fill(0);

// '#' is a wall and any other character is open.
function groundOf(rows: string[]): Ground {
  const width = rows[0].length;
  const walk = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) walk[y * width + x] = row[x] === '#' ? 0 : 1;
  });
  return { width, height: rows.length, walk };
}

function open(width: number, height: number): Ground {
  return groundOf(new Array<string>(height).fill('.'.repeat(width)));
}

function fieldsOf(ground: Ground, doors: number[]): Uint8Array {
  const out = new Uint8Array(doors.length * ground.width * ground.height);
  buildFields(ground, Int32Array.from(doors), out);
  return out;
}

// The answer for the premises p, with the run bytes pathRuns left in a buffer that held 0xaa.
function runsFrom(ground: Ground, fields: Uint8Array, p: number, from: number): { count: number; bytes: number[] } {
  const bytes = new Uint8Array(RUN_BYTES).fill(0xaa);
  const count = pathRuns(fields, p * ground.width * ground.height, ground.width, from, bytes, 0);
  return { count, bytes: Array.from(bytes) };
}

// Where the runs leave a blob that starts at `from`: forward from home to the door, or backward from the door home.
function endOf(width: number, runs: number[], count: number, from: number, backward: boolean): number {
  let cell = from;
  for (let i = 0; i < count; i++) {
    const r = backward ? count - 1 - i : i;
    const k = backward ? ((runs[2 * r] >> 5) + 4) & 7 : runs[2 * r] >> 5;
    cell += runs[2 * r + 1] * cellStepOf(k, width);
  }
  return cell;
}

describe('a premises field and its runs', () => {
  it('walk from home to the door in the fewest straight runs, widest first, and back again', () => {
    const ground = open(12, 4);
    const door = 3 * 12 + 10;
    const fields = fieldsOf(ground, [door]);

    const { count, bytes } = runsFrom(ground, fields, 0, 0);

    // Along the top row 10 cells to the door's column, then 3 down. 3 diagonals and 7 along ties with it, and the wider run goes
    // first. A heading is 32 * k, so 192 is right and 0 is down.
    expect([count, bytes.slice(0, 6)]).toEqual([2, [192, 10, 0, 3, 0, 0]]);
    expect(bytes.slice(4).every((byte) => byte === 0)).toBe(true);
    expect(endOf(12, bytes, count, 0, false)).toBe(door);
    expect(endOf(12, bytes, count, door, true)).toBe(0);
    expect(runsFrom(ground, fields, 0, door)).toEqual({ count: 0, bytes: NONE });
  });

  it('take a diagonal step where it closes in the most, and give no runs to a cell cut off or at a corner', () => {
    const walled = groundOf(['..#..', '..#..', '..#..']);
    const fields = fieldsOf(walled, [1 * 5 + 4]);

    expect(runsFrom(walled, fields, 0, 2 * 5 + 3)).toEqual({ count: 1, bytes: [160, 1, ...NONE.slice(2)] });
    expect(runsFrom(walled, fields, 0, 1 * 5 + 0)).toEqual({ count: NO_PATH, bytes: NONE });
    expect(runsFrom(walled, fields, 0, 0 * 5 + 2)).toEqual({ count: NO_PATH, bytes: NONE });

    // Two walls touching at a corner do not let a blob through between them.
    const corner = groundOf(['.#', '#.']);
    expect(runsFrom(corner, fieldsOf(corner, [3]), 0, 0)).toEqual({ count: NO_PATH, bytes: NONE });
  });

  it('give up on a way of more than 32 runs, and take one of exactly 32', () => {
    // A corridor one cell wide that steps right and down 16 times, with no corner a blob may cut. Its door at (16, 16) is 32
    // steps from (0, 0), each a run of its own, and one cell on, at (17, 16), a 33rd.
    const half = MAX_RUNS / 2;
    const size = half + 2;
    const rows = new Array<string>(size).fill('#'.repeat(size)).map((row) => row.split(''));
    for (let i = 0; i < half; i++) {
      rows[i][i + 1] = '.';
      rows[i + 1][i + 1] = '.';
    }
    rows[0][0] = '.';
    rows[half][half + 1] = '.';
    const ground = groundOf(rows.map((row) => row.join('')));
    const fields = fieldsOf(ground, [half * size + half, half * size + half + 1]);

    const steps = Array.from({ length: MAX_RUNS }, (_, i) => [i % 2 === 0 ? 192 : 0, 1]).flat();
    expect(MAX_RUNS).toBe(32);
    expect(runsFrom(ground, fields, 0, 0)).toEqual({ count: MAX_RUNS, bytes: steps });
    expect(runsFrom(ground, fields, 1, 0)).toEqual({ count: TOO_FAR, bytes: NONE });
  });

  it('step on the headings the walk table walks', () => {
    for (let k = 0; k < DIRECTIONS; k++) {
      expect([Math.sign(WALK_X_Q8[32 * k]), Math.sign(WALK_Y_Q8[32 * k])], `heading ${32 * k}`).toEqual([CELL_DX[k], CELL_DY[k]]);
    }
  });
});

describe('the fields in a world', () => {
  it('sit outside the hash and build the same bytes whatever was built before', () => {
    const ground = groundOf(['......#...', '..##..#...', '..##......', '..........']);
    const doors = Int32Array.of(3, 24, 39);
    const bytes = doors.length * ground.width * ground.height;
    const world = createWorld(7, 'phone', ground, 10);
    const hash = stateHash(world);

    buildFields(ground, doors, world.fields);

    expect(stateHash(world)).toBe(hash);
    const other = createWorld(7, 'phone', ground, 10);
    buildFields(open(60, 40), Int32Array.of(5, 70, 900, 2_000), other.fields);
    buildFields(ground, doors, other.fields);
    expect(other.fields.subarray(0, bytes)).toEqual(world.fields.subarray(0, bytes));
  });

  it("are reserved by a tier's layout for a capital's 22 premises and its leisure sites, and refuse what they cannot hold", () => {
    const ground = open(12, 4);
    const world = createWorld(1, 'phone', ground, 10);

    expect(world.fields).toHaveLength(FIELD_BYTES);
    expect(FIELD_BYTES).toBe(32 * 176 * 112);
    expect(() => buildFields(ground, new Int32Array(MAX_SITES + 1), world.fields)).toThrow(/33 sites are past the 32/);
    expect(() => buildFields(ground, new Int32Array(MAX_SITES), world.fields)).not.toThrow();
    expect(() => buildFields(ground, Int32Array.of(48), world.fields)).toThrow(/outside 48 cells/);
    expect(() => buildFields(open(257, 1), Int32Array.of(0), world.fields)).toThrow(/past the 256 per side/);
    expect(() => buildFields(ground, new Int32Array(Math.floor(FIELD_BYTES / 48) + 1), world.fields)).toThrow(/need \d+ bytes/);
    const small = layoutWorld(1, 'phone', 1_024, 1 << 20);
    expect(small.fields).toHaveLength(0);
    expect(() => buildFields(ground, Int32Array.of(0), small.fields)).toThrow(RangeError);
  });
});
