import { describe, expect, it } from 'vitest';
import { adjacency, anyAround, distances, neighbours, parts, unionCells, type Adjacency } from '../src/grid/grid.ts';
import { MinHeap } from '../src/grid/heap.ts';
import { chance, shuffled } from '../src/random/keyed.ts';
import { fold } from './engines/fold.ts';

function lists(nbrs: Adjacency): number[][] {
  const out: number[][] = [];
  for (let c = 0; c + 1 < nbrs.start.length; c++) out.push([...nbrs.cells.subarray(nbrs.start[c], nbrs.start[c + 1])]);
  return out;
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

describe('the grid helpers, as grid.py and rng.py', () => {
  it('lists neighbours in grid.py order', () => {
    expect(lists(neighbours(3, 2))).toEqual([[1, 3, 4], [2, 4, 0, 5, 3], [5, 1, 4], [0, 4, 1], [1, 5, 3, 2, 0], [2, 4, 1]]);
    expect(lists(neighbours(3, 2, false))).toEqual([[1, 3], [2, 4, 0], [5, 1], [0, 4], [1, 5, 3], [2, 4]]);
    expect(adjacency([[1], [], [0, 1]])).toEqual({ start: new Int32Array([0, 1, 1, 3]), cells: new Int32Array([1, 0, 1]) });
  });

  it('measures distances and parts', () => {
    expect([...distances(neighbours(4, 3), [0], null, 255)]).toEqual([0, 1, 2, 3, 1, 1, 2, 3, 2, 2, 2, 3]);
    const passable = new Uint8Array([1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1]);
    expect([...distances(neighbours(4, 3), [0, 11], passable, 3)]).toEqual([0, 1, 3, 2, 1, 3, 1, 1, 2, 2, 1, 0]);
    const split = parts(neighbours(4, 3, false), new Uint8Array([1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1]));
    expect([...split.label]).toEqual([0, 0, -1, 1, -1, -1, 1, 1, 2, -1, -1, 1]);
    expect(split.sizes).toEqual([2, 4, 1]);
  });

  it('finds a flag among the neighbours in the list it is given, never on the cell itself', () => {
    const flagAt = (cell: number): Uint8Array => Uint8Array.from({ length: 9 }, (_, i) => (i === cell ? 3 : 0));
    const eight = neighbours(3, 3);
    const four = neighbours(3, 3, false);
    expect(anyAround(flagAt(4), eight, 4)).toBe(false);
    expect(anyAround(flagAt(4), eight, 0)).toBe(true);
    expect(anyAround(flagAt(4), four, 0)).toBe(false);
    expect(anyAround(flagAt(4), four, 1)).toBe(true);
    // The corner's first neighbour counts, and a flag two cells away does not, though it starts the next cell's list.
    expect(anyAround(flagAt(1), eight, 0)).toBe(true);
    expect(anyAround(flagAt(2), eight, 0)).toBe(false);
    // The last cell's list ends where the grid's cells do.
    expect(anyAround(flagAt(0), eight, 8)).toBe(false);
  });

  it('lists the cells set in either flag array, in index order', () => {
    expect(unionCells(new Uint8Array([1, 0, 0, 1, 0]), new Uint8Array([0, 0, 7, 1, 5]))).toEqual([0, 2, 3, 4]);
  });

  it('shuffles and draws chances as rng.py', () => {
    expect(shuffled([0, 1, 2, 3, 4], 42, 13, 1)).toEqual([4, 2, 1, 3, 0]);
    expect(shuffled(['a', 'b', 'c'], 7, 9, 2, 5)).toEqual(['c', 'a', 'b']);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((k) => chance(500, 42, 9, k))).toEqual([false, true, false, false, true, true, true, true]);
  });

  it("folds as goldens.py's fold", () => {
    const prints = [
      fold(),
      fold([]),
      fold(0),
      fold(1, [2, 3], [-1]),
      fold([1], [2, 3, -1]),
      fold(new Uint8Array([255, 0, 7]), [2 ** 31, -(2 ** 31), 4_294_967_295, 250_000_000_000]),
    ];
    expect(prints.map(hex)).toEqual(['626ee42e', '8328c333', 'b074ca0d', 'ec093763', 'e01fa097', 'd2f755a2']);
  });
});

describe('the heap', () => {
  it('pops in sorted order, pushes and pops interleaved', () => {
    let state = 12_345;
    const next = (n: number): number => {
      state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
      return state % n;
    };
    const reference: number[][] = [];
    const heap = new MinHeap(1);
    for (let i = 0; i < 5_000; i++) {
      if (next(3) === 0 && reference.length > 0) {
        reference.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
        heap.pop();
        expect([heap.a, heap.b, heap.c]).toEqual(reference.shift());
      } else {
        const key = [next(1_000) - 500, 4_294_967_295 - next(7), i];
        reference.push(key);
        heap.push(key[0], key[1], key[2]);
      }
    }
    expect(heap.size).toBe(reference.length);
  });
});
