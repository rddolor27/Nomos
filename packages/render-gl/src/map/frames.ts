import { BIOME_NAMES, LANDMARK_NAMES, TIER_NAMES, WONDER_NAMES } from '@nomos/sim-protocol/world-map';
import type { MapView } from './camera.ts';

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: [number, number];
  // A body frame's face offset in atlas.json, where the place pass draws its face and emote; no map frame has one.
  face?: [number, number];
}

// Frames are keyed "<sheet>/<frame>" and found by name, never by atlas index (R9).
export interface AtlasPage {
  image: ImageBitmap;
  frames: Readonly<Record<string, AtlasFrame>>;
}

function artPx(view: MapView): number {
  return view === 'region' ? 16 : 8;
}

// mapdraw.py's _tile: both waters draw as water, a peak's cell as mountain under its peak, and grassland and farmland
// take the variant's bit 0.
export function tileFrame(biome: number, variant: number, view: MapView): string {
  const name = BIOME_NAMES[biome];
  const px = artPx(view);
  if (name === 'ocean' || name === 'lake') return `map/map${px}_water_0`;
  if (name === 'peak') return `map/map${px}_mountain`;
  if (name === 'grassland' || name === 'farmland') return `map/map${px}_${name}_${variant & 1}`;
  return `map/map${px}_${name}`;
}

// mapdraw.py's _overlays: every peak rises over its tile, and in the Region view a low peak rises over each mountain
// whose variant has bit 1.
export function peakFrame(biome: number, variant: number, view: MapView): string | null {
  const name = BIOME_NAMES[biome];
  if (name === 'peak') return `map/map${artPx(view)}_peak`;
  return name === 'mountain' && view === 'region' && (variant & 2) !== 0 ? 'map/map16_peak-low' : null;
}

// mapdraw.py's _settlement_frame: capitals and cities draw walled and towns palisaded, in each view's art (M3.1's
// Part 3, Ruling 12).
export function settlementFrame(tier: number, view: MapView): string {
  const name = TIER_NAMES[tier];
  if (name === 'capital' || name === 'city') return `map/map${artPx(view)}_settlement_${name}-walled`;
  if (name === 'town') return `map/map${artPx(view)}_settlement_town-palisade`;
  return `map/settlement_${name}`;
}

export function wonderFrame(kind: number, view: MapView): string {
  return `wonders/map${artPx(view)}_wonder_${WONDER_NAMES[kind]}`;
}

export function landmarkFrame(kind: number, view: MapView): string {
  return `landmarks/map${artPx(view)}_landmark_${LANDMARK_NAMES[kind]}`;
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response;
}

// The page tools/atlas writes beside the town atlas: map.json holds the frame table and map.webp the pixels.
export async function loadAtlasPage(jsonUrl: string, imageUrl: string): Promise<AtlasPage> {
  const [index, pixels] = await Promise.all([
    fetchOk(jsonUrl).then((response) => response.json() as Promise<{ frames: Record<string, AtlasFrame> }>),
    fetchOk(imageUrl).then((response) => response.blob()),
  ]);
  return { image: await createImageBitmap(pixels), frames: index.frames };
}
