import type { MapV1 } from '@nomos/sim-protocol';
import { edgeFor } from './colour.ts';

const OUTLINE_ALPHA = 0;
const RIM_ALPHA = 255;

// One RGBA texel per tile. Alpha only flags which edge a dot standing on the tile takes.
export function minimapPixels(map: MapV1): Uint8Array {
  const alphas = map.kinds.map((kind) => (edgeFor(kind.rgb) === 'outline' ? OUTLINE_ALPHA : RIM_ALPHA));
  const pixels = new Uint8Array(map.terrain.length * 4);
  for (let i = 0; i < map.terrain.length; i++) {
    const kind = map.terrain[i];
    const rgb = map.kinds[kind].rgb;
    pixels[i * 4] = rgb >> 16;
    pixels[i * 4 + 1] = (rgb >> 8) & 255;
    pixels[i * 4 + 2] = rgb & 255;
    pixels[i * 4 + 3] = alphas[kind];
  }
  return pixels;
}
