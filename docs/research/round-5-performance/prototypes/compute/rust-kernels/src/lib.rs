//! Hot-loop kernels for the browser civ-sim benchmark (no_std, raw C ABI, pointers into linear memory).
#![no_std]
#![allow(clippy::missing_safety_doc, clippy::too_many_arguments)]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

#[inline(always)]
fn mix32(mut h: u32) -> u32 {
    h ^= h >> 16;
    h = h.wrapping_mul(0x7feb_352d);
    h ^= h >> 15;
    h = h.wrapping_mul(0x846c_a68b);
    h ^= h >> 16;
    h
}
#[inline(always)]
fn key3(seed: u32, entity: u32, tick: u32) -> u32 {
    mix32(seed ^ mix32(entity.wrapping_add(tick.wrapping_mul(0x9E37_79B9))))
}
#[inline(always)]
fn umin(a: i32, b: i32) -> i32 { if a < b { a } else { b } }
#[inline(always)]
fn umax(a: i32, b: i32) -> i32 { if a > b { a } else { b } }

// ------------------------------------------------------------------ movement
#[no_mangle]
pub unsafe extern "C" fn move_f32(px: *mut f32, py: *mut f32, vx: *mut f32, vy: *mut f32, n: usize, dt: f32, w: f32, h: f32) {
    let w2 = w + w;
    let h2 = h + h;
    for i in 0..n {
        let x = *px.add(i) + *vx.add(i) * dt;
        let y = *py.add(i) + *vy.add(i) * dt;
        let (lx, hx) = (x < 0.0, x >= w);
        let (ly, hy) = (y < 0.0, y >= h);
        *px.add(i) = if lx { -x } else if hx { w2 - x } else { x };
        *py.add(i) = if ly { -y } else if hy { h2 - y } else { y };
        let a = *vx.add(i);
        *vx.add(i) = if lx | hx { -a } else { a };
        let b = *vy.add(i);
        *vy.add(i) = if ly | hy { -b } else { b };
    }
}

#[no_mangle]
pub unsafe extern "C" fn move_i32(px: *mut i32, py: *mut i32, vx: *mut i32, vy: *mut i32, n: usize, w: i32, h: i32) {
    let w2 = 2 * w - 1;
    let h2 = 2 * h - 1;
    for i in 0..n {
        let x = (*px.add(i)).wrapping_add(*vx.add(i));
        let y = (*py.add(i)).wrapping_add(*vy.add(i));
        let (lx, hx) = (x < 0, x >= w);
        let (ly, hy) = (y < 0, y >= h);
        *px.add(i) = if lx { -x } else if hx { w2 - x } else { x };
        *py.add(i) = if ly { -y } else if hy { h2 - y } else { y };
        let a = *vx.add(i);
        *vx.add(i) = if lx | hx { -a } else { a };
        let b = *vy.add(i);
        *vy.add(i) = if ly | hy { -b } else { b };
    }
}

#[cfg(target_feature = "simd128")]
#[no_mangle]
pub unsafe extern "C" fn move_f32_simd(px: *mut f32, py: *mut f32, vx: *mut f32, vy: *mut f32, n: usize, dt: f32, w: f32, h: f32) {
    use core::arch::wasm32::*;
    let vdt = f32x4_splat(dt);
    let z = f32x4_splat(0.0);
    let (vw, vh, vw2, vh2) = (f32x4_splat(w), f32x4_splat(h), f32x4_splat(w + w), f32x4_splat(h + h));
    let mut i = 0usize;
    while i + 4 <= n {
        let (ppx, ppy, pvx, pvy) = (px.add(i) as *mut v128, py.add(i) as *mut v128, vx.add(i) as *mut v128, vy.add(i) as *mut v128);
        let (a, b) = (v128_load(pvx), v128_load(pvy));
        let x = f32x4_add(v128_load(ppx), f32x4_mul(a, vdt));
        let y = f32x4_add(v128_load(ppy), f32x4_mul(b, vdt));
        let (lx, hx) = (f32x4_lt(x, z), f32x4_ge(x, vw));
        let (ly, hy) = (f32x4_lt(y, z), f32x4_ge(y, vh));
        v128_store(ppx, v128_bitselect(f32x4_neg(x), v128_bitselect(f32x4_sub(vw2, x), x, hx), lx));
        v128_store(ppy, v128_bitselect(f32x4_neg(y), v128_bitselect(f32x4_sub(vh2, y), y, hy), ly));
        v128_store(pvx, v128_bitselect(f32x4_neg(a), a, v128_or(lx, hx)));
        v128_store(pvy, v128_bitselect(f32x4_neg(b), b, v128_or(ly, hy)));
        i += 4;
    }
    if i < n { move_f32(px.add(i), py.add(i), vx.add(i), vy.add(i), n - i, dt, w, h); }
}

#[cfg(target_feature = "simd128")]
#[no_mangle]
pub unsafe extern "C" fn move_i32_simd(px: *mut i32, py: *mut i32, vx: *mut i32, vy: *mut i32, n: usize, w: i32, h: i32) {
    use core::arch::wasm32::*;
    let z = i32x4_splat(0);
    let (vw, vh, vw2, vh2) = (i32x4_splat(w), i32x4_splat(h), i32x4_splat(2 * w - 1), i32x4_splat(2 * h - 1));
    let mut i = 0usize;
    while i + 4 <= n {
        let (ppx, ppy, pvx, pvy) = (px.add(i) as *mut v128, py.add(i) as *mut v128, vx.add(i) as *mut v128, vy.add(i) as *mut v128);
        let (a, b) = (v128_load(pvx), v128_load(pvy));
        let x = i32x4_add(v128_load(ppx), a);
        let y = i32x4_add(v128_load(ppy), b);
        let (lx, hx) = (i32x4_lt(x, z), i32x4_ge(x, vw));
        let (ly, hy) = (i32x4_lt(y, z), i32x4_ge(y, vh));
        v128_store(ppx, v128_bitselect(i32x4_neg(x), v128_bitselect(i32x4_sub(vw2, x), x, hx), lx));
        v128_store(ppy, v128_bitselect(i32x4_neg(y), v128_bitselect(i32x4_sub(vh2, y), y, hy), ly));
        v128_store(pvx, v128_bitselect(i32x4_neg(a), a, v128_or(lx, hx)));
        v128_store(pvy, v128_bitselect(i32x4_neg(b), b, v128_or(ly, hy)));
        i += 4;
    }
    if i < n { move_i32(px.add(i), py.add(i), vx.add(i), vy.add(i), n - i, w, h); }
}

// ------------------------------------------------------------------ uniform grid (counting sort)
// cell_start has ncell+1 entries; cursor has ncell entries; sorted copies sx/sy are cache friendly.
#[no_mangle]
pub unsafe extern "C" fn grid_build_f32(px: *const f32, py: *const f32, n: usize, inv_cell: f32, gw: u32, gh: u32,
    cell_of: *mut u32, cell_start: *mut u32, cursor: *mut u32, sorted: *mut u32, sx: *mut f32, sy: *mut f32) {
    let nc = (gw * gh) as usize;
    for c in 0..=nc { *cell_start.add(c) = 0; }
    for i in 0..n {
        let cx = umin((*px.add(i) * inv_cell) as i32, gw as i32 - 1);
        let cy = umin((*py.add(i) * inv_cell) as i32, gh as i32 - 1);
        let c = (cy as u32 * gw + cx as u32) as usize;
        *cell_of.add(i) = c as u32;
        *cell_start.add(c + 1) += 1;
    }
    for c in 0..nc { *cell_start.add(c + 1) += *cell_start.add(c); }
    for c in 0..nc { *cursor.add(c) = *cell_start.add(c); }
    for i in 0..n {
        let c = *cell_of.add(i) as usize;
        let k = *cursor.add(c) as usize;
        *cursor.add(c) = k as u32 + 1;
        *sorted.add(k) = i as u32;
        *sx.add(k) = *px.add(i);
        *sy.add(k) = *py.add(i);
    }
}

#[no_mangle]
pub unsafe extern "C" fn grid_build_i32(px: *const i32, py: *const i32, n: usize, shift: u32, gw: u32, gh: u32,
    cell_of: *mut u32, cell_start: *mut u32, cursor: *mut u32, sorted: *mut u32, sx: *mut i32, sy: *mut i32) {
    let nc = (gw * gh) as usize;
    for c in 0..=nc { *cell_start.add(c) = 0; }
    for i in 0..n {
        let cx = umin(*px.add(i) >> shift, gw as i32 - 1);
        let cy = umin(*py.add(i) >> shift, gh as i32 - 1);
        let c = (cy as u32 * gw + cx as u32) as usize;
        *cell_of.add(i) = c as u32;
        *cell_start.add(c + 1) += 1;
    }
    for c in 0..nc { *cell_start.add(c + 1) += *cell_start.add(c); }
    for c in 0..nc { *cursor.add(c) = *cell_start.add(c); }
    for i in 0..n {
        let c = *cell_of.add(i) as usize;
        let k = *cursor.add(c) as usize;
        *cursor.add(c) = k as u32 + 1;
        *sorted.add(k) = i as u32;
        *sx.add(k) = *px.add(i);
        *sy.add(k) = *py.add(i);
    }
}

// ------------------------------------------------------------------ neighbour query (3 contiguous row spans per agent)
#[no_mangle]
pub unsafe extern "C" fn nq_f32(sx: *const f32, sy: *const f32, cs: *const u32, gw: u32, gh: u32, inv_cell: f32, r2: f32,
    out_cnt: *mut u32, out_ax: *mut f32, out_ay: *mut f32, i0: usize, i1: usize) {
    let (gwi, ghi) = (gw as i32, gh as i32);
    for i in i0..i1 {
        let (x, y) = (*sx.add(i), *sy.add(i));
        let cx = umin((x * inv_cell) as i32, gwi - 1);
        let cy = umin((y * inv_cell) as i32, ghi - 1);
        let (x0, x1) = (umax(cx - 1, 0) as u32, umin(cx + 1, gwi - 1) as u32);
        let (y0, y1) = (umax(cy - 1, 0) as u32, umin(cy + 1, ghi - 1) as u32);
        let mut cnt = 0u32;
        let (mut ax, mut ay) = (0f32, 0f32);
        for r in y0..=y1 {
            let s = *cs.add((r * gw + x0) as usize) as usize;
            let e = *cs.add((r * gw + x1 + 1) as usize) as usize;
            for j in s..e {
                let dx = *sx.add(j) - x;
                let dy = *sy.add(j) - y;
                let d2 = dx * dx + dy * dy;
                if d2 < r2 && j != i { cnt += 1; ax += dx; ay += dy; }
            }
        }
        *out_cnt.add(i) = cnt; *out_ax.add(i) = ax; *out_ay.add(i) = ay;
    }
}

/// Same as nq_f32 but mirrors JavaScript number semantics (f64 intermediates, f32 storage) -> bit-identical to JS.
#[no_mangle]
pub unsafe extern "C" fn nq_f64m(sx: *const f32, sy: *const f32, cs: *const u32, gw: u32, gh: u32, inv_cell: f32, r2: f32,
    out_cnt: *mut u32, out_ax: *mut f32, out_ay: *mut f32, i0: usize, i1: usize) {
    let (gwi, ghi) = (gw as i32, gh as i32);
    let r2 = r2 as f64;
    let ic = inv_cell as f64;
    for i in i0..i1 {
        let (x, y) = (*sx.add(i) as f64, *sy.add(i) as f64);
        let cx = umin((x * ic) as i32, gwi - 1);
        let cy = umin((y * ic) as i32, ghi - 1);
        let (x0, x1) = (umax(cx - 1, 0) as u32, umin(cx + 1, gwi - 1) as u32);
        let (y0, y1) = (umax(cy - 1, 0) as u32, umin(cy + 1, ghi - 1) as u32);
        let mut cnt = 0u32;
        let (mut ax, mut ay) = (0f64, 0f64);
        for r in y0..=y1 {
            let s = *cs.add((r * gw + x0) as usize) as usize;
            let e = *cs.add((r * gw + x1 + 1) as usize) as usize;
            for j in s..e {
                let dx = *sx.add(j) as f64 - x;
                let dy = *sy.add(j) as f64 - y;
                let d2 = dx * dx + dy * dy;
                if d2 < r2 && j != i { cnt += 1; ax += dx; ay += dy; }
            }
        }
        *out_cnt.add(i) = cnt; *out_ax.add(i) = ax as f32; *out_ay.add(i) = ay as f32;
    }
}

#[cfg(target_feature = "simd128")]
#[no_mangle]
pub unsafe extern "C" fn nq_f32_simd(sx: *const f32, sy: *const f32, cs: *const u32, gw: u32, gh: u32, inv_cell: f32, r2: f32,
    out_cnt: *mut u32, out_ax: *mut f32, out_ay: *mut f32, i0: usize, i1: usize) {
    use core::arch::wasm32::*;
    let (gwi, ghi) = (gw as i32, gh as i32);
    let vr2 = f32x4_splat(r2);
    let iota = i32x4(0, 1, 2, 3);
    for i in i0..i1 {
        let (x, y) = (*sx.add(i), *sy.add(i));
        let (vx, vy, vi) = (f32x4_splat(x), f32x4_splat(y), i32x4_splat(i as i32));
        let cx = umin((x * inv_cell) as i32, gwi - 1);
        let cy = umin((y * inv_cell) as i32, ghi - 1);
        let (x0, x1) = (umax(cx - 1, 0) as u32, umin(cx + 1, gwi - 1) as u32);
        let (y0, y1) = (umax(cy - 1, 0) as u32, umin(cy + 1, ghi - 1) as u32);
        let mut vc = i32x4_splat(0);
        let (mut vax, mut vay) = (f32x4_splat(0.0), f32x4_splat(0.0));
        let mut cnt = 0u32;
        let (mut ax, mut ay) = (0f32, 0f32);
        for r in y0..=y1 {
            let s = *cs.add((r * gw + x0) as usize) as usize;
            let e = *cs.add((r * gw + x1 + 1) as usize) as usize;
            let mut j = s;
            while j + 4 <= e {
                let dx = f32x4_sub(v128_load(sx.add(j) as *const v128), vx);
                let dy = f32x4_sub(v128_load(sy.add(j) as *const v128), vy);
                let d2 = f32x4_add(f32x4_mul(dx, dx), f32x4_mul(dy, dy));
                let jv = i32x4_add(i32x4_splat(j as i32), iota);
                let m = v128_andnot(f32x4_lt(d2, vr2), i32x4_eq(jv, vi));
                vc = i32x4_sub(vc, m);
                vax = f32x4_add(vax, v128_and(dx, m));
                vay = f32x4_add(vay, v128_and(dy, m));
                j += 4;
            }
            while j < e {
                let dx = *sx.add(j) - x;
                let dy = *sy.add(j) - y;
                let d2 = dx * dx + dy * dy;
                if d2 < r2 && j != i { cnt += 1; ax += dx; ay += dy; }
                j += 1;
            }
        }
        cnt += (i32x4_extract_lane::<0>(vc) + i32x4_extract_lane::<1>(vc) + i32x4_extract_lane::<2>(vc) + i32x4_extract_lane::<3>(vc)) as u32;
        let sxl = (f32x4_extract_lane::<0>(vax) + f32x4_extract_lane::<1>(vax)) + (f32x4_extract_lane::<2>(vax) + f32x4_extract_lane::<3>(vax));
        let syl = (f32x4_extract_lane::<0>(vay) + f32x4_extract_lane::<1>(vay)) + (f32x4_extract_lane::<2>(vay) + f32x4_extract_lane::<3>(vay));
        *out_cnt.add(i) = cnt; *out_ax.add(i) = sxl + ax; *out_ay.add(i) = syl + ay;
    }
}

#[no_mangle]
pub unsafe extern "C" fn nq_i32(sx: *const i32, sy: *const i32, cs: *const u32, gw: u32, gh: u32, shift: u32, r2: i32,
    out_cnt: *mut u32, out_ax: *mut i32, out_ay: *mut i32, i0: usize, i1: usize) {
    let (gwi, ghi) = (gw as i32, gh as i32);
    for i in i0..i1 {
        let (x, y) = (*sx.add(i), *sy.add(i));
        let cx = umin(x >> shift, gwi - 1);
        let cy = umin(y >> shift, ghi - 1);
        let (x0, x1) = (umax(cx - 1, 0) as u32, umin(cx + 1, gwi - 1) as u32);
        let (y0, y1) = (umax(cy - 1, 0) as u32, umin(cy + 1, ghi - 1) as u32);
        let mut cnt = 0u32;
        let (mut ax, mut ay) = (0i32, 0i32);
        for r in y0..=y1 {
            let s = *cs.add((r * gw + x0) as usize) as usize;
            let e = *cs.add((r * gw + x1 + 1) as usize) as usize;
            for j in s..e {
                let dx = (*sx.add(j)).wrapping_sub(x);
                let dy = (*sy.add(j)).wrapping_sub(y);
                let d2 = dx.wrapping_mul(dx).wrapping_add(dy.wrapping_mul(dy));
                if d2 < r2 && j != i { cnt += 1; ax = ax.wrapping_add(dx); ay = ay.wrapping_add(dy); }
            }
        }
        *out_cnt.add(i) = cnt; *out_ax.add(i) = ax; *out_ay.add(i) = ay;
    }
}

#[cfg(target_feature = "simd128")]
#[no_mangle]
pub unsafe extern "C" fn nq_i32_simd(sx: *const i32, sy: *const i32, cs: *const u32, gw: u32, gh: u32, shift: u32, r2: i32,
    out_cnt: *mut u32, out_ax: *mut i32, out_ay: *mut i32, i0: usize, i1: usize) {
    use core::arch::wasm32::*;
    let (gwi, ghi) = (gw as i32, gh as i32);
    let vr2 = i32x4_splat(r2);
    let iota = i32x4(0, 1, 2, 3);
    for i in i0..i1 {
        let (x, y) = (*sx.add(i), *sy.add(i));
        let (vx, vy, vi) = (i32x4_splat(x), i32x4_splat(y), i32x4_splat(i as i32));
        let cx = umin(x >> shift, gwi - 1);
        let cy = umin(y >> shift, ghi - 1);
        let (x0, x1) = (umax(cx - 1, 0) as u32, umin(cx + 1, gwi - 1) as u32);
        let (y0, y1) = (umax(cy - 1, 0) as u32, umin(cy + 1, ghi - 1) as u32);
        let (mut vc, mut vax, mut vay) = (i32x4_splat(0), i32x4_splat(0), i32x4_splat(0));
        let mut cnt = 0u32;
        let (mut ax, mut ay) = (0i32, 0i32);
        for r in y0..=y1 {
            let s = *cs.add((r * gw + x0) as usize) as usize;
            let e = *cs.add((r * gw + x1 + 1) as usize) as usize;
            let mut j = s;
            while j + 4 <= e {
                let dx = i32x4_sub(v128_load(sx.add(j) as *const v128), vx);
                let dy = i32x4_sub(v128_load(sy.add(j) as *const v128), vy);
                let d2 = i32x4_add(i32x4_mul(dx, dx), i32x4_mul(dy, dy));
                let jv = i32x4_add(i32x4_splat(j as i32), iota);
                let m = v128_andnot(i32x4_lt(d2, vr2), i32x4_eq(jv, vi));
                vc = i32x4_sub(vc, m);
                vax = i32x4_add(vax, v128_and(dx, m));
                vay = i32x4_add(vay, v128_and(dy, m));
                j += 4;
            }
            while j < e {
                let dx = (*sx.add(j)).wrapping_sub(x);
                let dy = (*sy.add(j)).wrapping_sub(y);
                let d2 = dx.wrapping_mul(dx).wrapping_add(dy.wrapping_mul(dy));
                if d2 < r2 && j != i { cnt += 1; ax = ax.wrapping_add(dx); ay = ay.wrapping_add(dy); }
                j += 1;
            }
        }
        let hs = |v: v128| i32x4_extract_lane::<0>(v).wrapping_add(i32x4_extract_lane::<1>(v)).wrapping_add(i32x4_extract_lane::<2>(v)).wrapping_add(i32x4_extract_lane::<3>(v));
        *out_cnt.add(i) = cnt + hs(vc) as u32;
        *out_ax.add(i) = ax.wrapping_add(hs(vax));
        *out_ay.add(i) = ay.wrapping_add(hs(vay));
    }
}

// ------------------------------------------------------------------ utility scoring (integer, LUT curves)
// needs: 5 SoA byte arrays back to back (need k of agent i at needs[k*n+i]); lut: 8 curves x 256 u16;
// cons: 6 actions x 3 considerations x (need, curve) bytes; wts: 6 u16 weights (<=255).
#[no_mangle]
pub unsafe extern "C" fn util_score(needs: *const u8, n: usize, lut: *const u16, cons: *const u8, wts: *const u16,
    tick: u32, seed: u32, out_act: *mut u8, out_score: *mut u32, i0: usize, i1: usize, stride: usize) {
    let mut i = i0;
    while i < i1 {
        let hh = key3(seed, i as u32, tick);
        let mut best = 0u32;
        let mut besta = 0u32;
        for a in 0..6usize {
            let mut s = (*wts.add(a) as u32) << 8;
            for c in 0..3usize {
                let k = *cons.add(a * 6 + c * 2) as usize;
                let cv = *cons.add(a * 6 + c * 2 + 1) as usize;
                let v = *needs.add(k * n + i) as usize;
                let f = *lut.add(cv * 256 + v) as u32;
                s = s.wrapping_mul(f) >> 16;
            }
            s = (s << 4) + ((hh >> (a as u32 * 4)) & 15);
            if s > best { best = s; besta = a as u32; }
        }
        *out_act.add(i) = besta as u8;
        *out_score.add(i) = best;
        i += stride;
    }
}

// ------------------------------------------------------------------ aggregate settlement day (integer, cohort model)
const A: usize = 32;
#[no_mangle]
pub unsafe extern "C" fn settle_day(ns: usize, day: u32, seed: u32, pop: *mut i32, food: *mut i32, price: *mut i32, prod: *const i32,
    hh: *mut i64, farm: *mut i64, treas: *mut i64, workers_out: *mut i32, mort: *const i32, fert: *const i32, aging: i32) {
    let mut aged = [0i32; A];
    for s in 0..ns {
        let mut h = key3(seed, s as u32, day);
        let base = s * A;
        let (mut births, mut workers, mut total) = (0i64, 0i64, 0i64);
        for a in 0..A {
            let mut p = *pop.add(base + a) as i64;
            h = mix32(h.wrapping_add(0x6D2B_79F5));
            let deaths = (p * *mort.add(a) as i64 + (h & 0x0FFF_FFFF) as i64) >> 28;
            p -= deaths;
            let band = a & 15;
            let mut up = 0i64;
            if band < 15 {
                h = mix32(h.wrapping_add(0x6D2B_79F5));
                up = (p * aging as i64 + (h & 0x0FFF_FFFF) as i64) >> 28;
                p -= up;
            }
            aged[a] = up as i32;
            if a < 16 {
                let fr = *fert.add(band);
                if fr != 0 {
                    h = mix32(h.wrapping_add(0x6D2B_79F5));
                    births += (p * fr as i64 + (h & 0x0FFF_FFFF) as i64) >> 28;
                }
            }
            if (3..=12).contains(&band) { workers += p; }
            total += p;
            *pop.add(base + a) = p as i32;
        }
        for a in 0..A { if (a & 15) < 15 { *pop.add(base + a + 1) += aged[a]; } }
        let bf = births >> 1;
        *pop.add(base) += bf as i32;
        *pop.add(base + 16) += (births - bf) as i32;
        total += births;
        *workers_out.add(s) = workers as i32;
        let produced = (workers * *prod.add(s) as i64) >> 16;
        let mut f = *food.add(s) as i64 + produced;
        let eat = if total < f { total } else { f };
        f -= eat;
        if f > 0x3FFF_FFFF { f = 0x3FFF_FFFF; }
        *food.add(s) = f as i32;
        let target = total * 30;
        let mut pr = *price.add(s);
        if f < target { pr = pr + (pr >> 5) + 1; } else { pr -= pr >> 6; }
        if pr < 1 { pr = 1; } else if pr > 1_000_000 { pr = 1_000_000; }
        *price.add(s) = pr;
        let mut cost = eat * pr as i64;
        let cash = *hh.add(s);
        if cost > cash { cost = cash; }
        let tax = cost >> 4;
        *hh.add(s) = cash - cost;
        *farm.add(s) += cost - tax;
        *treas.add(s) += tax;
        let wage = *farm.add(s) >> 3;
        *farm.add(s) -= wage;
        *hh.add(s) += wage;
    }
}

// ------------------------------------------------------------------ inter-settlement flows: sparse two-phase
#[no_mangle]
pub unsafe extern "C" fn flows_sparse(ne: usize, ea: *const i32, eb: *const i32, day: u32, seed: u32, pop: *mut i32, food: *mut i32,
    price: *const i32, hh: *mut i64, farm: *mut i64, workers: *const i32, mig_q28: i32, fq: *mut i32, mq: *mut i32) {
    // phase 1: read-only proposal per edge (parallelisable, order independent)
    for e in 0..ne {
        let (a, b) = (*ea.add(e) as usize, *eb.add(e) as usize);
        let (pa, pb) = (*price.add(a), *price.add(b));
        let mut q = 0i32;
        if pa != pb {
            let lo = if pa < pb { a } else { b };
            let (dmin, dd) = if pa < pb { (pa, pb - pa) } else { (pb, pa - pb) };
            if dd * 16 > dmin {
                let mut v = *food.add(lo) >> 7;
                if v > 100_000 { v = 100_000; }
                q = if lo == a { v } else { -v };
            }
        }
        *fq.add(e) = q;
        let mut m = 0i32;
        if pa > pb + (pb >> 3) || pb > pa + (pa >> 3) {
            let from = if pa > pb { a } else { b };
            let h = key3(seed ^ 0xA511_E9B3, e as u32, day);
            let mm = ((*workers.add(from) as i64 * mig_q28 as i64 + (h & 0x0FFF_FFFF) as i64) >> 28) as i32;
            m = if from == a { mm } else { -mm };
        }
        *mq.add(e) = m;
    }
    // phase 2: apply in fixed edge order with clamping (zero-sum for food, money, people)
    for e in 0..ne {
        let (a, b) = (*ea.add(e) as usize, *eb.add(e) as usize);
        let q = *fq.add(e);
        if q != 0 {
            let (src, dst, mut v) = if q > 0 { (a, b, q) } else { (b, a, -q) };
            if v > *food.add(src) { v = *food.add(src); }
            let mid = ((*price.add(a) as i64) + (*price.add(b) as i64)) >> 1;
            let mut pay = v as i64 * mid;
            if pay > *hh.add(dst) { pay = *hh.add(dst); }
            *food.add(src) -= v; *food.add(dst) += v;
            *hh.add(dst) -= pay; *farm.add(src) += pay;
        }
        let m = *mq.add(e);
        if m != 0 {
            let (src, dst, v) = if m > 0 { (a, b, m) } else { (b, a, -m) };
            let mut vf = v >> 1;
            let mut vm = v - vf;
            let (fi, mi) = (src * A + 5, src * A + 21);
            if vf > *pop.add(fi) { vf = *pop.add(fi); }
            if vm > *pop.add(mi) { vm = *pop.add(mi); }
            *pop.add(fi) -= vf; *pop.add(dst * A + 5) += vf;
            *pop.add(mi) -= vm; *pop.add(dst * A + 21) += vm;
        }
    }
}

// ------------------------------------------------------------------ dense all-pairs gravity (cost reference)
#[no_mangle]
pub unsafe extern "C" fn dense_f32(n: usize, x: *const f32, y: *const f32, m: *const f32, p: *const f32, out: *mut f32) {
    for i in 0..n {
        let (xi, yi, pi) = (*x.add(i), *y.add(i), *p.add(i));
        let mut acc = 0f32;
        for j in 0..n {
            let dx = *x.add(j) - xi;
            let dy = *y.add(j) - yi;
            let d2 = dx * dx + dy * dy + 1.0;
            acc += *m.add(j) * (*p.add(j) - pi) / d2;
        }
        *out.add(i) = acc;
    }
}

#[cfg(target_feature = "simd128")]
#[no_mangle]
pub unsafe extern "C" fn dense_f32_simd(n: usize, x: *const f32, y: *const f32, m: *const f32, p: *const f32, out: *mut f32) {
    use core::arch::wasm32::*;
    let one = f32x4_splat(1.0);
    for i in 0..n {
        let (xi, yi, pi) = (f32x4_splat(*x.add(i)), f32x4_splat(*y.add(i)), f32x4_splat(*p.add(i)));
        let mut acc = f32x4_splat(0.0);
        let mut j = 0;
        while j + 4 <= n {
            let dx = f32x4_sub(v128_load(x.add(j) as *const v128), xi);
            let dy = f32x4_sub(v128_load(y.add(j) as *const v128), yi);
            let d2 = f32x4_add(f32x4_add(f32x4_mul(dx, dx), f32x4_mul(dy, dy)), one);
            let num = f32x4_mul(v128_load(m.add(j) as *const v128), f32x4_sub(v128_load(p.add(j) as *const v128), pi));
            acc = f32x4_add(acc, f32x4_div(num, d2));
            j += 4;
        }
        let mut s = (f32x4_extract_lane::<0>(acc) + f32x4_extract_lane::<1>(acc)) + (f32x4_extract_lane::<2>(acc) + f32x4_extract_lane::<3>(acc));
        let (xs, ys, ps) = (*x.add(i), *y.add(i), *p.add(i));
        while j < n {
            let dx = *x.add(j) - xs; let dy = *y.add(j) - ys;
            s += *m.add(j) * (*p.add(j) - ps) / (dx * dx + dy * dy + 1.0);
            j += 1;
        }
        *out.add(i) = s;
    }
}

// ------------------------------------------------------------------ ledger transfers (i64 cents)
#[no_mangle]
pub unsafe extern "C" fn ledger_i64(bal: *mut i64, nacc: u32, ntx: u32, seed: u32) -> i64 {
    let mut h = seed;
    for t in 0..ntx {
        h = mix32(h.wrapping_add(t));
        let a = (h % nacc) as usize;
        let b = ((h >> 7) % nacc) as usize;
        let amt = (h & 0xFFFF) as i64 * 37;
        *bal.add(a) -= amt;
        *bal.add(b) += amt;
    }
    let mut s = 0i64;
    for i in 0..nacc as usize { s += *bal.add(i); }
    s
}

#[no_mangle]
pub unsafe extern "C" fn ledger_apply_i64(bal: *mut i64, ta: *const i32, tb: *const i32, amt: *const i64, ntx: usize) {
    for t in 0..ntx {
        let v = *amt.add(t);
        *bal.add(*ta.add(t) as usize) -= v;
        *bal.add(*tb.add(t) as usize) += v;
    }
}
