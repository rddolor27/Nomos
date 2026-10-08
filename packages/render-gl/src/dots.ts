import { JOB_ITEMS } from '@nomos/sim-protocol';

export type Role = 'citizen' | 'merchant' | 'police';
export type Shape = 'circle' | 'square' | 'diamond';

export const ROLE_SHAPE: Record<Role, Shape> = { citizen: 'circle', merchant: 'square', police: 'diamond' };

export const MASK_GROUND = 0;
export const MASK_FILL = 1;
export const MASK_EDGE = 2;

const MERCHANT_JOB = JOB_ITEMS.indexOf('merchant') + 1;
const POLICE_JOB = JOB_ITEMS.indexOf('police') + 1;

export function roleOfJob(job: number): Role {
  if (job === MERCHANT_JOB) return 'merchant';
  if (job === POLICE_JOB) return 'police';
  return 'citizen';
}

// Round 3 asks for dots at least 5 device pixels across, which zoom 1 gives; the plan caps them at 11.
export function dotFill(zoom: number): number {
  return Math.min(11, 3 + 2 * zoom);
}

// The circle's "+ half" keeps a 5-pixel circle from collapsing into the diamond.
function inFill(shape: Shape, dx: number, dy: number, half: number): boolean {
  if (Math.abs(dx) > half || Math.abs(dy) > half) return false;
  if (shape === 'circle') return dx * dx + dy * dy <= half * half + half;
  if (shape === 'diamond') return Math.abs(dx) + Math.abs(dy) <= half;
  return true;
}

function touchesFill(mask: Uint8Array, side: number, x: number, y: number): boolean {
  for (let ny = Math.max(0, y - 1); ny <= Math.min(side - 1, y + 1); ny++) {
    for (let nx = Math.max(0, x - 1); nx <= Math.min(side - 1, x + 1); nx++) {
      if (mask[ny * side + nx] === MASK_FILL) return true;
    }
  }
  return false;
}

// (fill + 2)^2 cells, row-major, with a one-cell ring for the edge around the fill.
export function dotMask(shape: Shape, fill: number): Uint8Array {
  const side = fill + 2;
  const half = (fill - 1) / 2;
  const centre = half + 1;
  const mask = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (inFill(shape, x - centre, y - centre, half)) mask[y * side + x] = MASK_FILL;
    }
  }
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (mask[y * side + x] === MASK_GROUND && touchesFill(mask, side, x, y)) mask[y * side + x] = MASK_EDGE;
    }
  }
  return mask;
}

export function dotCentre(world: number, camDev: number, zoom: number): number {
  return Math.floor(world) * zoom + (zoom >> 1) - camDev;
}
