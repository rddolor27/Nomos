import { describe, expect, it } from 'vitest';
import { NO_CODE, layoutBuffers, placeBuffers, type PlaceLayout } from '../src/place/place-layout.ts';

function tinyPlace(): { layout: PlaceLayout; map: ArrayBuffer } {
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
  return { layout, map: new Uint8Array([78, 77, 65, 80]).buffer };
}

function views(value: unknown): ArrayBufferView[] {
  if (ArrayBuffer.isView(value)) return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(views);
}

describe('the place layout', () => {
  it('lists every column buffer and the ground once, so one transfer moves them all', () => {
    const place = tinyPlace();
    const buffers = placeBuffers(place.layout, place.map);
    expect(new Set(buffers).size).toBe(buffers.length);
    expect(new Set(buffers)).toEqual(new Set([...views(place.layout).map((view) => view.buffer), place.map]));
    const moved = structuredClone(place, { transfer: buffers });
    expect(moved.layout.people.look[0]).toBe(95);
    expect(new Uint8Array(moved.map)[0]).toBe(78);
    expect(place.layout.tiles.byteLength).toBe(0);
    expect(place.map.byteLength).toBe(0);
  });

  it("lists the layout alone for a wonder's vista, which has no ground", () => {
    const { layout } = tinyPlace();
    expect(placeBuffers(layout, null)).toEqual(layoutBuffers(layout));
  });
});
