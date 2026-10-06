// SharedArrayBuffer snapshot channel: a 256-byte header, then three slots (lock-free triple buffer).
// Header Int32[0] holds the middle slot index plus a FRESH bit. The writer swaps its finished back slot
// into the middle; the reader swaps its front slot out only when FRESH is set. Neither side ever
// touches a slot the other holds, so a frame can never mix two ticks.
export const HDR = 256;
export const ST = 0;
export const FRESH = 4;
export const CAM_F32 = 8;    // Float32 index: camX, camY, ppt, width, height (written by the renderer)
export const COUNT_I32 = 16; // Int32 index + slot: records in that slot
export const TICK_I32 = 20;  // Int32 index + slot: tick number
export const TIME_F64 = 16;  // Float64 index + slot: epoch ms when the slot was published
export const VIS_I32 = 24;   // Int32 index + slot: agents inside the camera rectangle

export const recordBytes = (mode) => (mode === 'visible' ? 20 : 12);
export const slotBytes = (n, mode) => n * recordBytes(mode);
export const slotOffset = (k, n, mode) => HDR + k * slotBytes(n, mode);
export const sabBytes = (n, mode) => HDR + 3 * slotBytes(n, mode);

export function views(sab) {
  return { i32: new Int32Array(sab, 0, HDR / 4), f32: new Float32Array(sab, 0, HDR / 4), f64: new Float64Array(sab, 0, HDR / 8) };
}
