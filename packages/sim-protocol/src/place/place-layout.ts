import { CROWD_HUES } from '../world-map/world-map.ts';

// A zoomed-in place as tools/worldgen/place.py lays it out: a settlement's centre district or a wonder's vista, with its
// ground, buildings and props and its look-only blob people (owner, 9 October 2026). The map worker builds one on
// request and render-gl's place pass draws it (M3.1's plan, the town view).
export const PLACE_TILE_PX = 16;

// The codes of place.py's people. A look is one of tools/worldgen/looks.py's 96: hue look % 6, eyes floor(look / 6) % 4
// and pattern floor(look / 24). NO_CODE marks a person with no job, or with no emote.
export const LOOK_HUES = CROWD_HUES;
export const LOOK_EYES = ['round', 'dot', 'tall', 'wide'] as const;
export const LOOK_PATTERNS = ['plain', 'speckle', 'spots', 'patch'] as const;
export const PLACE_POSES = ['stand', 'walk', 'sit'] as const;
export const PLACE_FACINGS = ['down', 'up', 'left', 'right'] as const;
export const PLACE_EXPRESSIONS = ['neutral', 'happy', 'blink'] as const;
export const PLACE_JOBS = ['police', 'clinic', 'merchant', 'farmer', 'builder'] as const;
export const PLACE_EMOTES = ['heart', 'coin', 'food', 'question', 'sweat', 'sleep'] as const;
export const NO_CODE = 255;

// A column per field of place.py's Person. x and y are the anchor, the ground point, in art pixels from the place's
// top-left corner, and lift raises a sitter onto a bench. step is a walker's frame, 0 or 1, and 0 for anyone else.
export interface PlacePeople {
  look: Uint8Array;
  pose: Uint8Array;
  facing: Uint8Array;
  step: Uint8Array;
  expression: Uint8Array;
  job: Uint8Array;
  emote: Uint8Array;
  x: Int32Array;
  y: Int32Array;
  lift: Uint8Array;
}

// frames names each sprite once, as "<sheet>/<frame>", the key of tools/atlas's frame table, in order of first use:
// tiles row by row, then ground, then standing. tiles holds a frame per tile, row-major; an animated tile shows frame 0.
// A sprite is three numbers: its frame, then its anchor's x and y in art pixels. Ground sprites draw over the tiles,
// sorted by y; standing sprites and people then draw together, sorted by y and then by order, standing sprites first.
export interface PlaceLayout {
  width: number;
  height: number;
  frames: string[];
  tiles: Uint16Array;
  ground: Int32Array;
  standing: Int32Array;
  people: PlacePeople;
}

// The loops look-only walkers follow, which place.py has no part in. Loop r belongs to person[r] and steps through
// cells[offsets[r]] to cells[offsets[r + 1] - 1], 4-adjacent tiles people may walk on, each y * width + x. It then steps
// back to its first cell, the person's own tile.
export interface PlaceWalks {
  person: Uint16Array;
  offsets: Int32Array;
  cells: Int32Array;
}

// The street crowd (M3.1 part 2): look-only walkers in proportion to the population, on loops of their own spread over
// the place. Crowd loop r steps through cells[offsets[r]] to cells[offsets[r + 1] - 1] and back, as PlaceWalks' loops do.
// Walker k has look look[k] and expression expression[k], and follows loop loop[k], starting phase[k] art px along it.
export interface PlaceCrowd {
  look: Uint8Array;
  expression: Uint8Array;
  loop: Uint16Array;
  phase: Uint16Array;
  offsets: Int32Array;
  cells: Int32Array;
}

// Place p is settlement p, or wonder p minus the settlement count: the order of tools/worldgen/world.py's place_contexts.
export type PlaceRequest = { type: 'place'; place: number };
export type PlaceReply = { type: 'place'; place: number; layout: PlaceLayout; walks: PlaceWalks; crowd: PlaceCrowd; ms: number };
// The map worker's answer instead when it cannot build place p: an unknown index, no world yet, or a failed build.
export type PlaceError = { type: 'place-error'; place: number; message: string };

// Every column owns its buffer, so each is listed once and the map worker can transfer them all.
export function placeBuffers(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd): ArrayBuffer[] {
  const p = layout.people;
  const views: ArrayBufferView[] = [
    layout.tiles,
    layout.ground,
    layout.standing,
    p.look,
    p.pose,
    p.facing,
    p.step,
    p.expression,
    p.job,
    p.emote,
    p.x,
    p.y,
    p.lift,
    walks.person,
    walks.offsets,
    walks.cells,
    crowd.look,
    crowd.expression,
    crowd.loop,
    crowd.phase,
    crowd.offsets,
    crowd.cells,
  ];
  return views.map((view) => view.buffer as ArrayBuffer);
}
