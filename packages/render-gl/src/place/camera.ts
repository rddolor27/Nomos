// x and y are the art pixel at the view's top-left, fractional; scale is whole device pixels per art pixel. Every
// draw snaps the view's top-left to round(x * scale) and round(y * scale) device pixels, so each texel lands on whole
// pixels.
export interface PlaceCamera {
  x: number;
  y: number;
  scale: number;
}
