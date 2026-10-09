import { below, floorDiv } from '@nomos/sim-core/kernels';
import { ORTHO, xOf, yOf } from '../grid/grid.ts';
import { MOISTURE } from '../random/streams.ts';

export const WIND = 0x100;
export const WET = 0x101;

function onMap(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Cells from the windward edge in: the highest projection on the step towards the keyed side first, then the highest
// cell. A cell reads only cells of a higher projection, so the order among equal projections never shows.
function windOrder(width: number, height: number, ux: number, uy: number): Int32Array {
  const projection = new Int32Array(width * height);
  const order = new Int32Array(projection.length);
  for (let i = 0; i < order.length; i++) {
    projection[i] = xOf(i, width) * ux + yOf(i, width) * uy;
    order[i] = i;
  }
  return order.sort((a, b) => projection[b] - projection[a] || b - a);
}

// The humidity carried in from the cell upwind at (px, py): that cell counted twice and the two cells beside it, where
// one off the map stands in as the upwind cell itself.
function upwindHumidity(
  carry: Int32Array,
  width: number,
  height: number,
  px: number,
  py: number,
  lx: number,
  ly: number,
): number {
  const up = py * width + px;
  const mid = carry[up];
  const sideA = onMap(px + lx, py + ly, width, height) ? carry[up + ly * width + lx] : mid;
  const sideB = onMap(px - lx, py - ly, width, height) ? carry[up - ly * width - lx] : mid;
  return floorDiv(sideA + 2 * mid + sideB, 4);
}

// Humidity of air blown across the map from the keyed side: it gains over water and loses crossing high ground. Returns
// the rain, 0..255 a cell, and the wind's side as an index into SIDE_NAMES.
export function rain(
  seed: number,
  width: number,
  height: number,
  elevation: Int32Array,
  water: Uint8Array,
): { rain: Int32Array; wind: number } {
  const side = below(4, seed, MOISTURE, WIND);
  const [ux, uy] = ORTHO[side];
  const lx = -uy;
  const ly = ux;
  const incoming = 170 + below(80, seed, MOISTURE, WET);
  const carry = new Int32Array(width * height);
  const out = new Int32Array(width * height);
  const order = windOrder(width, height, ux, uy);
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const px = xOf(i, width) + ux;
    const py = yOf(i, width) + uy;
    let humid = incoming;
    let rise = 0;
    if (onMap(px, py, width, height)) {
      humid = upwindHumidity(carry, width, height, px, py, lx, ly);
      rise = Math.max(0, elevation[i] - Math.max(0, elevation[py * width + px]));
    }
    if (water[i] !== 0) {
      carry[i] = humid + floorDiv(255 - humid, 3);
      out[i] = humid;
    } else {
      const loss = Math.min(floorDiv(humid * 3, 10), floorDiv(humid, 64) + floorDiv(rise * humid, 400));
      carry[i] = Math.max(0, humid - loss);
      out[i] = Math.min(255, floorDiv(humid * 7, 8) + loss * 2);
    }
  }
  return { rain: out, wind: side };
}
