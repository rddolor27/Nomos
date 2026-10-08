import {
  ACTION_WALK,
  FACING_DOWN,
  FACING_RIGHT,
  SNAPSHOT_BYTES,
  TILE_PX,
  jobId,
  packVisual,
  type MapV1,
} from '@nomos/sim-protocol';

const LOOKS = 96;
const POLICE_JOB = jobId('police');
const MERCHANT_JOB = jobId('merchant');

// lowbias32, so every engine fills the same frame.
function hash(x: number): number {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

// 2% police and 5% merchants.
function jobFor(roll: number): number {
  if (roll < 2) return POLICE_JOB;
  return roll < 7 ? MERCHANT_JOB : 0;
}

// Agent i stands on a walkable cell hashed from i and walks 1 px a frame on a hashed axis, wrapping inside its cell.
export function fillReplayFrame(map: MapV1, frame: number, count: number, out: ArrayBuffer): void {
  const open: number[] = [];
  for (let cell = 0; cell < map.walk.length; cell++) if (map.walk[cell] !== 0) open.push(cell);
  if (count > 0 && open.length === 0) throw new RangeError('the map has no walkable cell');
  const view = new DataView(out);
  for (let i = 0; i < count; i++) {
    const h = hash(i);
    const cell = open[h % open.length];
    const step = ((frame + (h >>> 8)) & 15) - 8;
    const alongX = (h >>> 12) & 1;
    const x = (cell % map.width) * TILE_PX + TILE_PX / 2 + alongX * step;
    const y = Math.floor(cell / map.width) * TILE_PX + TILE_PX / 2 + (1 - alongX) * step;
    const word = packVisual(h % LOOKS, ACTION_WALK, 0, jobFor(hash(h) % 100), alongX ? FACING_RIGHT : FACING_DOWN, 0);
    view.setFloat32(i * SNAPSHOT_BYTES, x, true);
    view.setFloat32(i * SNAPSHOT_BYTES + 4, y, true);
    view.setUint32(i * SNAPSHOT_BYTES + 8, word, true);
  }
}
