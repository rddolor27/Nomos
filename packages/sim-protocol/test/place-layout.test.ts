import { describe, expect, it } from 'vitest';
import { NO_CODE, placeBuffers, type PlaceCrowd, type PlaceLayout, type PlaceWalks } from '../src/place/place-layout.ts';

function tinyPlace(): { layout: PlaceLayout; walks: PlaceWalks; crowd: PlaceCrowd } {
  const layout: PlaceLayout = {
    width: 2,
    height: 1,
    frames: ['map/grass', 'nature/tree_oak'],
    tiles: new Uint16Array([0, 0]),
    ground: new Int32Array(0),
    standing: new Int32Array([1, 8, 12]),
    people: {
      look: new Uint8Array([95]),
      pose: new Uint8Array([1]),
      facing: new Uint8Array([2]),
      step: new Uint8Array([1]),
      expression: new Uint8Array([0]),
      job: new Uint8Array([NO_CODE]),
      emote: new Uint8Array([NO_CODE]),
      x: new Int32Array([24]),
      y: new Int32Array([14]),
      lift: new Uint8Array([0]),
    },
  };
  const walks: PlaceWalks = { person: new Uint16Array([0]), offsets: new Int32Array([0, 2]), cells: new Int32Array([1, 0]) };
  const crowd: PlaceCrowd = {
    look: new Uint8Array([7]),
    expression: new Uint8Array([1]),
    loop: new Uint16Array([0]),
    phase: new Uint16Array([5]),
    offsets: new Int32Array([0, 2]),
    cells: new Int32Array([0, 1]),
  };
  return { layout, walks, crowd };
}

function views(value: unknown): ArrayBufferView[] {
  if (ArrayBuffer.isView(value)) return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(views);
}

describe('the place layout', () => {
  it('lists every column buffer once, so one transfer moves them all', () => {
    const place = tinyPlace();
    const buffers = placeBuffers(place.layout, place.walks, place.crowd);
    expect(new Set(buffers).size).toBe(buffers.length);
    expect(new Set(buffers)).toEqual(new Set(views(place).map((view) => view.buffer)));
    const moved = structuredClone(place, { transfer: buffers });
    expect(moved.layout.people.look[0]).toBe(95);
    expect(moved.walks.cells[0]).toBe(1);
    expect(place.layout.tiles.byteLength).toBe(0);
  });
});
