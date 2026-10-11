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

// Place p is settlement p, or wonder p minus the settlement count: the order of tools/worldgen/world.py's place_contexts.
export type PlaceRequest = { type: 'place'; place: number };
// map is a settlement's ground as .nmap bytes, which the page hands the sim worker in an open message to run the town live
// (M2.2c), or null for a wonder's vista, which has none.
export type PlaceReply = { type: 'place'; place: number; layout: PlaceLayout; map: ArrayBuffer | null; ms: number };
// The map worker's answer instead when it cannot build place p: an unknown index, no world yet, or a failed build.
export type PlaceError = { type: 'place-error'; place: number; message: string };

// The starting town, Highcourt, which the first screen's Town skin draws under the sim's agents (owner request,
// 10 October 2026). It needs no world: the town is the one tools/worldgen/export_map.py exports as the sim's map.
export type TownRequest = { type: 'town' };
export type TownReply = { type: 'town'; layout: PlaceLayout; ms: number };
export type TownError = { type: 'town-error'; message: string };

function buffersOf(views: readonly ArrayBufferView[]): ArrayBuffer[] {
  return views.map((view) => view.buffer as ArrayBuffer);
}

// Every column owns its buffer, so each is listed once and the map worker can transfer them all.
export function layoutBuffers(layout: PlaceLayout): ArrayBuffer[] {
  const p = layout.people;
  return buffersOf([
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
  ]);
}

export function placeBuffers(layout: PlaceLayout, map: ArrayBuffer | null): ArrayBuffer[] {
  return map ? [...layoutBuffers(layout), map] : layoutBuffers(layout);
}
