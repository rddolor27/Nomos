import {
  NO_CODE,
  PLACE_EMOTES,
  PLACE_EXPRESSIONS,
  PLACE_FACINGS,
  PLACE_JOBS,
  PLACE_POSES,
  type PlaceLayout,
  type PlacePeople,
} from '@nomos/sim-protocol/place';
import type { Person, Site, Sprite } from './site.ts';
import { tileFor } from './tiles.ts';

// Frame names as "<sheet>/<frame>", each once, numbered in order of first use.
class FrameCodes {
  readonly names: string[] = [];
  private readonly index = new Map<string, number>();

  code(category: string, name: string): number {
    const key = `${category}/${name}`;
    const known = this.index.get(key);
    if (known !== undefined) return known;
    this.index.set(key, this.names.length);
    this.names.push(key);
    return this.names.length - 1;
  }
}

// A site as sim-protocol's PlaceLayout: frames by first use in the tiles row by row, then ground, then standing.
export function layoutOf(site: Site): PlaceLayout {
  const frames = new FrameCodes();
  const tiles = new Uint16Array(site.w * site.h);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) tiles[site.at(x, y)] = frames.code(...tileFor(site, x, y));
  }
  const ground = spriteCodes(site.ground, frames);
  const standing = spriteCodes(site.standing, frames);
  return { width: site.w, height: site.h, frames: frames.names, tiles, ground, standing, people: peopleCodes(site.people) };
}

function spriteCodes(sprites: readonly Sprite[], frames: FrameCodes): Int32Array {
  const out = new Int32Array(sprites.length * 3);
  sprites.forEach((s, i) => {
    out[3 * i] = frames.code(s.category, s.name);
    out[3 * i + 1] = s.x;
    out[3 * i + 2] = s.y;
  });
  return out;
}

function codeOf(codes: readonly string[], value: string | null): number {
  if (value === null) return NO_CODE;
  const code = codes.indexOf(value);
  if (code < 0) throw new Error(`${value} has no code in sim-protocol's place lists`);
  return code;
}

function peopleCodes(people: readonly Person[]): PlacePeople {
  const n = people.length;
  const out: PlacePeople = {
    look: new Uint8Array(n),
    pose: new Uint8Array(n),
    facing: new Uint8Array(n),
    step: new Uint8Array(n),
    expression: new Uint8Array(n),
    job: new Uint8Array(n),
    emote: new Uint8Array(n),
    x: new Int32Array(n),
    y: new Int32Array(n),
    lift: new Uint8Array(n),
  };
  people.forEach((p, i) => {
    out.look[i] = p.look;
    out.pose[i] = codeOf(PLACE_POSES, p.pose);
    out.facing[i] = codeOf(PLACE_FACINGS, p.facing);
    out.step[i] = p.step;
    out.expression[i] = codeOf(PLACE_EXPRESSIONS, p.expression);
    out.job[i] = codeOf(PLACE_JOBS, p.job);
    out.emote[i] = codeOf(PLACE_EMOTES, p.emote);
    out.x[i] = p.x;
    out.y[i] = p.y;
    out.lift[i] = p.lift;
  });
  return out;
}
