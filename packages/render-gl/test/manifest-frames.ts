import { readFileSync, readdirSync } from 'node:fs';
import type { AtlasFrame } from '../src/map/frames.ts';

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);

interface Manifest {
  frames: Record<string, Omit<AtlasFrame, 'x' | 'y'>>;
}

// Every manifest frame on a one-row test page, frame i at x = i, so a drawn sprite's atlas x names its frame.
export function manifestFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const file of readdirSync(SPRITES).filter((name) => name.endsWith('.json') && name !== 'season_map.json').sort()) {
    const manifest = JSON.parse(readFileSync(new URL(file, SPRITES), 'utf8')) as Manifest;
    for (const [name, f] of Object.entries(manifest.frames)) {
      const { w, h, anchor, face, hold, eat } = f;
      frames[`${file.slice(0, -5)}/${name}`] = { x: x++, y: 0, w, h, anchor, ...(face && { face }), ...(hold && { hold }), ...(eat && { eat }) };
    }
  }
  return frames;
}
