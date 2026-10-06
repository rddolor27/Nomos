// WGSL for the round 7 GPU path. Integer-only; every reduction is either an integer atomic sum (order-free)
// or followed by a canonicalising sort, so results match the CPU path bit for bit.
import { EAT_T, RATE_H, FULL } from '../compute/world.mjs';

export const PARAMS = /* wgsl */ `
struct P { tick: i32, n: u32, w: i32, cw: i32, nc: u32, nt: u32, h: u32, seedH: u32, stream: u32, pad0: u32, pad1: u32, pad2: u32 };
@group(0) @binding(0) var<uniform> p: P;
`;

// lowbias32 and the keyed draw, identical to world.mjs (u32 multiply wraps modulo 2^32 in WGSL).
export const HASH = /* wgsl */ `
fn mix32(x: u32) -> u32 {
  var h = x;
  h = h ^ (h >> 16u); h = h * 0x7feb352du;
  h = h ^ (h >> 15u); h = h * 0x846ca68bu;
  h = h ^ (h >> 16u); return h;
}
fn draw(seedH: u32, entity: u32, tick: u32, stream: u32) -> u32 {
  return mix32(seedH ^ mix32((entity ^ (stream * 0x85ebca6bu)) + tick * 0x9e3779b9u));
}
`;

export const HASH_KERNEL = PARAMS + HASH + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> outv: array<u32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.n) { return; }
  outv[i] = draw(p.seedH, i, u32(p.tick), p.stream);
}
`;

export const MOVE_KERNEL = PARAMS + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> px: array<i32>;
@group(0) @binding(2) var<storage, read_write> py: array<i32>;
@group(0) @binding(3) var<storage, read_write> attrA: array<u32>;   // dest | dir << 8 | speed << 16 | role << 24
@group(0) @binding(4) var<storage, read> metab: array<u32>;
@group(0) @binding(5) var<storage, read> needZ: array<i32>;
@group(0) @binding(6) var<storage, read> flow: array<u32>;          // 4 direction bytes per word
@group(0) @binding(7) var<storage, read_write> cell: array<u32>;
@group(0) @binding(8) var<storage, read_write> agg: array<atomic<u32>>;
var<private> DX: array<i32, 9> = array<i32, 9>(0, 1, 1, 0, -1, -1, -1, 0, 1);
var<private> DY: array<i32, 9> = array<i32, 9>(0, 0, 1, 1, 1, 0, -1, -1, -1);
fn flowAt(idx: u32) -> u32 { return (flow[idx >> 2u] >> ((idx & 3u) * 8u)) & 0xffu; }
fn clampStep(d0: i32, sp: i32) -> i32 {
  var d = d0;
  var h = d - sp; d = d - (h & ~(h >> 31u));
  h = d + sp; d = d - (h & (h >> 31u));
  return d;
}
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.n) { return; }
  var x = px[i];
  var y = py[i];
  let a = attrA[i];
  let dest = a & 0xffu;
  let dir = (a >> 8u) & 0xffu;
  let sp = i32((a >> 16u) & 0xffu);
  let role = a >> 24u;
  let tx = x >> 8u;
  let ty = y >> 8u;
  x = x + clampStep(((tx + DX[dir]) << 8u) + 128 - x, sp);
  y = y + clampStep(((ty + DY[dir]) << 8u) + 128 - y, sp);
  px[i] = x;
  py[i] = y;
  let nx = x >> 8u;
  let ny = y >> 8u;
  if (nx != tx || ny != ty) {
    let nd = flowAt(dest * p.nt + u32(ny * p.w + nx));
    attrA[i] = (a & 0xffff00ffu) | (nd << 8u);
  }
  let c = u32((y >> 10u) * p.cw + (x >> 10u));
  cell[i] = c;
  atomicAdd(&agg[c * 4u], 1u);
  if (role == 2u) { atomicAdd(&agg[c * 4u + 1u], 1u); } else if (role == 1u) { atomicAdd(&agg[c * 4u + 2u], 1u); }
  let rate = (${RATE_H} * i32(metab[i])) >> 7u;
  if ((needZ[i * 4u] - p.tick) * rate < ${EAT_T}) { atomicAdd(&agg[c * 4u + 3u], 1u); }
}
`;

// Exclusive scan of per-cell counts in a fixed order: one workgroup, contiguous ranges per invocation,
// then a Hillis-Steele scan of the 256 range totals in workgroup memory.
export const SCAN_KERNEL = PARAMS + /* wgsl */ `
@group(0) @binding(1) var<storage, read> agg: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellStart: array<u32>;
@group(0) @binding(3) var<storage, read_write> cursor: array<u32>;
var<workgroup> tot: array<u32, 256>;
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_index) li: u32) {
  let per = (p.nc + 255u) / 256u;
  let c0 = min(li * per, p.nc);
  let c1 = min(c0 + per, p.nc);
  var s = 0u;
  for (var c = c0; c < c1; c++) { s += agg[c * 4u]; }
  tot[li] = s;
  workgroupBarrier();
  for (var off = 1u; off < 256u; off = off << 1u) {
    var v = 0u;
    if (li >= off) { v = tot[li - off]; }
    workgroupBarrier();
    tot[li] += v;
    workgroupBarrier();
  }
  var run = tot[li] - s;
  for (var c = c0; c < c1; c++) { cellStart[c] = run; cursor[c] = run; run += agg[c * 4u]; }
  if (li == 255u) { cellStart[p.nc] = tot[255u]; }
}
`;

// Scatter with atomic slot claims: the order inside a cell depends on scheduling...
export const SCATTER_KERNEL = PARAMS + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cell: array<u32>;
@group(0) @binding(2) var<storage, read_write> cursor: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> sorted: array<u32>;
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= p.n) { return; }
  let k = atomicAdd(&cursor[cell[i]], 1u);
  sorted[k] = i;
}
`;

// ...so each cell's segment is then sorted by agent index, which restores the CPU's stable order exactly.
export const CELLSORT_KERNEL = PARAMS + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cellStart: array<u32>;
@group(0) @binding(2) var<storage, read_write> sorted: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= p.nc) { return; }
  let s0 = cellStart[c];
  let s1 = cellStart[c + 1u];
  for (var k = s0 + 1u; k < s1; k++) {
    let v = sorted[k];
    var j = k;
    while (j > s0 && sorted[j - 1u] > v) { sorted[j] = sorted[j - 1u]; j--; }
    sorted[j] = v;
  }
}
`;

// Meals, owner-computes: one invocation per household walks its members in index order, so the pantry is
// never written by two invocations and the result does not depend on scheduling.
export const MEALS_KERNEL = PARAMS + /* wgsl */ `
@group(0) @binding(1) var<storage, read> metab: array<u32>;
@group(0) @binding(2) var<storage, read_write> needZ: array<i32>;
@group(0) @binding(3) var<storage, read_write> food: array<i32>;
@group(0) @binding(4) var<storage, read> hhFirst: array<u32>;
@group(0) @binding(5) var<storage, read> hhSize: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let h = gid.x;
  if (h >= p.h) { return; }
  var f = food[h];
  let first = hhFirst[h];
  let n = hhSize[h];
  for (var k = 0u; k < n; k++) {
    let i = first + k;
    let rate = (${RATE_H} * i32(metab[i])) >> 7u;
    if ((needZ[i * 4u] - p.tick) * rate < ${EAT_T} && f > 0) {
      f = f - 1;
      needZ[i * 4u] = p.tick + (${FULL} + rate - 1) / rate;
    }
  }
  food[h] = f;
}
`;
