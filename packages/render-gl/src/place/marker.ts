// The selection ring (owner request, 12 October 2026): a flat oval of 1 px runs on the ground round a blob's feet, in cream with a dark
// edge so it reads on any ground. It is 22 px wide and 9 tall, centred on the body's 18 px, and the back of the oval passes behind the
// body. It is drawn with solid quads, so it needs no art.
//
// Each run is its offset from the blob's anchor, then its width and height. A row below is one run, or a mirrored pair. The dark edge
// is every run grown by 1 px all round.
export const NO_MARK = -1;
export const RING = Int8Array.of(
  -5, -4, 10, 1,
  -8, -3, 4, 1, 4, -3, 4, 1,
  -10, -2, 2, 1, 8, -2, 2, 1,
  -11, -1, 2, 3, 9, -1, 2, 3,
  -10, 2, 2, 1, 8, 2, 2, 1,
  -8, 3, 4, 1, 4, 3, 4, 1,
  -5, 4, 10, 1,
);
export const RUN_VALUES = 4;
// The edge's runs, then the cream's.
export const MARKER_QUADS = (2 * RING.length) / RUN_VALUES;
