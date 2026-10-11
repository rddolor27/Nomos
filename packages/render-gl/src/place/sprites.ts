import { NO_CODE, PLACE_FACINGS, PLACE_TILE_PX, type PlaceLayout, type PlacePeople } from '@nomos/sim-protocol/place';
import {
  EAT_AT,
  EYES,
  FACE_AT,
  FACINGS,
  HOLD_AT,
  HUES,
  NO_FRAME,
  NO_POINT,
  RECORD_SHORTS,
  STEMS,
  frameRecords,
  stemOf,
  type Frames,
  type PersonFrames,
} from './people.ts';

// A sprite instance: its art-pixel corner, then its atlas x, y, w and h.
export const INSTANCE_SHORTS = 6;
// Body, pattern, face, job item, carried item and emote.
const MOST_LAYERS = 6;
const UP = PLACE_FACINGS.indexOf('up');
// placedraw.py's person_layers: an emote sits 7 px right of the anchor and 15 px above the face.
const EMOTE_X = 7;
const EMOTE_Y = -15;
// The eating loop runs four steps, 0, 1, 2, 1, over the body frame's three eating steps for the item, and the mouth alternates
// 0, 1, 0, 1 with the step's low bit. A person's eat column is 1 plus the loop's step, so 0 is not eating.
const EAT_POINT = Uint8Array.of(0, 1, 2, 1);

// The sprite's top-left art pixel at (left, top).
function putCorner(data: Int16Array, at: number, records: Int16Array, record: number, left: number, top: number): number {
  const r = RECORD_SHORTS * record;
  data[at] = left;
  data[at + 1] = top;
  data[at + 2] = records[r];
  data[at + 3] = records[r + 1];
  data[at + 4] = records[r + 2];
  data[at + 5] = records[r + 3];
  return at + INSTANCE_SHORTS;
}

// The sprite's anchor at (x, y).
function put(data: Int16Array, at: number, records: Int16Array, record: number, x: number, y: number): number {
  const r = RECORD_SHORTS * record;
  return putCorner(data, at, records, record, x - records[r + 4], y - records[r + 5]);
}

function worn(table: Int16Array, slot: number, what = 'a person in this pose and facing'): number {
  const record = table[slot];
  if (record === NO_FRAME) throw new Error(`the atlas has no sprite for ${what}`);
  return record;
}

// A street column's value for person j, or 0 where the people have no such column.
function streetOf(column: Uint8Array | undefined, j: number): number {
  return column === undefined ? 0 : column[j];
}

// Each tile's anchor is its bottom-centre art pixel, as placedraw.py stamps it.
function putTiles(data: Int16Array, layout: PlaceLayout, records: Int16Array): number {
  let at = 0;
  for (let tile = 0; tile < layout.tiles.length; tile++) {
    const x = (tile % layout.width) * PLACE_TILE_PX + PLACE_TILE_PX / 2;
    const y = Math.floor(tile / layout.width) * PLACE_TILE_PX + PLACE_TILE_PX - 1;
    at = put(data, at, records, layout.tiles[tile], x, y);
  }
  return at;
}

// Sorted by y, ties kept in layout order, as Python's stable sort leaves them.
function putGround(data: Int16Array, at: number, ground: Int32Array, records: Int16Array): void {
  const rows = Array.from({ length: ground.length / 3 }, (_, i) => i);
  rows.sort((a, b) => ground[3 * a + 2] - ground[3 * b + 2] || a - b);
  for (const i of rows) at = put(data, at, records, ground[3 * i], ground[3 * i + 1], ground[3 * i + 2]);
}

// The resting face, or the chewing one while the person eats, at (x, y), the body's anchor moved by its face offset. Facing
// up shows none.
function putFace(
  data: Int16Array,
  at: number,
  frames: PersonFrames,
  people: PlacePeople,
  j: number,
  eyes: number,
  x: number,
  y: number,
): number {
  const facing = people.facing[j];
  if (facing === UP) return at;
  const eat = streetOf(people.eat, j);
  const face =
    eat === 0
      ? worn(frames.face, (people.expression[j] * EYES + eyes) * FACINGS + facing)
      : worn(frames.chew, ((eat - 1) & 1) * FACINGS + facing);
  return put(data, at, frames.records, face, x, y);
}

// The good a person carries, never mirrored: its top-left is the body frame's hold point, or one of its eating steps while
// the person eats, on the body's own canvas. Facing up carries none, and neither does a frame with no hold, such as a sitter's.
function putItem(
  data: Int16Array,
  at: number,
  frames: PersonFrames,
  people: PlacePeople,
  j: number,
  body: number,
  x: number,
  y: number,
): number {
  const good = streetOf(people.item, j);
  if (good === 0 || people.facing[j] === UP) return at;
  const { records } = frames;
  const eat = streetOf(people.eat, j);
  const b = RECORD_SHORTS * body;
  const from = b + (eat === 0 ? HOLD_AT : EAT_AT + 2 * EAT_POINT[eat - 1]);
  if (records[from] === NO_POINT) return at;
  const left = x - records[b + 4] + records[from];
  const top = y - records[b + 5] + records[from + 1];
  return putCorner(data, at, records, worn(frames.carry, good, 'a carried good'), left, top);
}

// The face, job item, carried item and emote, placed from the body frame's face offset and hold point.
function putOverlays(
  data: Int16Array,
  at: number,
  frames: PersonFrames,
  people: PlacePeople,
  j: number,
  body: number,
  eyes: number,
  stem: number,
  x: number,
  y: number,
): number {
  const { records } = frames;
  const faceX = records[RECORD_SHORTS * body + FACE_AT];
  const faceY = records[RECORD_SHORTS * body + FACE_AT + 1];
  at = putFace(data, at, frames, people, j, eyes, x + faceX, y + faceY);
  if (people.job[j] !== NO_CODE) at = put(data, at, records, worn(frames.job, people.job[j] * STEMS + stem), x, y);
  at = putItem(data, at, frames, people, j, body, x, y);
  if (people.emote[j] !== NO_CODE) at = put(data, at, records, worn(frames.emote, people.emote[j]), x + EMOTE_X, y + faceY + EMOTE_Y);
  return at;
}

// looks.py's layers from the person's look and pose, then placedraw.py's person_layers, with the carried item after the job
// item. A look is hue look % 6, eyes floor(look / 6) % 4 and pattern floor(look / 24). A person indoors draws nothing.
export function putPerson(data: Int16Array, at: number, frames: PersonFrames, people: PlacePeople, j: number): number {
  if (streetOf(people.indoors, j) === 1) return at;
  const look = people.look[j];
  const hue = look % HUES;
  const pattern = Math.floor(look / (HUES * EYES));
  const stem = stemOf(people.pose[j], people.facing[j], people.step[j]);
  const x = people.x[j];
  const y = people.y[j] - people.lift[j];
  const body = worn(frames.body, hue * STEMS + stem);
  at = put(data, at, frames.records, body, x, y);
  if (pattern !== 0) at = put(data, at, frames.records, worn(frames.pattern, (pattern * HUES + hue) * STEMS + stem), x, y);
  return putOverlays(data, at, frames, people, j, body, Math.floor(look / HUES) % EYES, stem, x, y);
}

// Insertion sort by (y, index): in place, stable, and near linear when people moved little since the last pack.
function sortByRow(order: Int32Array, keys: Int32Array): void {
  for (let i = 1; i < order.length; i++) {
    const item = order[i];
    const key = keys[item];
    let k = i - 1;
    while (k >= 0 && (keys[order[k]] > key || (keys[order[k]] === key && order[k] > item))) {
      order[k + 1] = order[k];
      k--;
    }
    order[k + 1] = item;
  }
}

// A place's sprites in placedraw.py's drawing order: the tiles row by row and the ground sprites by y, which never
// change, then the standing sprites and people together by y and then index, standing sprites first. People move, so
// pack() sorts and rewrites that last part in place.
export class PlaceSprites {
  // The place's size in art px.
  readonly width: number;
  readonly height: number;
  // INSTANCE_SHORTS shorts a sprite, room for every person wearing all six layers.
  readonly data: Int16Array;
  // The tiles and ground sprites at the front of data.
  readonly fixed: number;
  private drawn: number;
  private readonly records: Int16Array;
  private readonly standing: Int32Array;
  private readonly people: PlacePeople;
  private readonly frames: PersonFrames;
  // Standing sprite i is item i and person j item firstPerson + j; keys holds each item's y.
  private readonly firstPerson: number;
  private readonly order: Int32Array;
  private readonly keys: Int32Array;

  constructor(layout: PlaceLayout, frames: Frames, people: PersonFrames) {
    this.width = layout.width * PLACE_TILE_PX;
    this.height = layout.height * PLACE_TILE_PX;
    this.firstPerson = layout.standing.length / 3;
    const items = this.firstPerson + layout.people.y.length;
    this.records = frameRecords(layout.frames, frames);
    this.standing = layout.standing;
    this.people = layout.people;
    this.frames = people;
    this.fixed = layout.tiles.length + layout.ground.length / 3;
    this.data = new Int16Array(INSTANCE_SHORTS * (this.fixed + this.firstPerson + MOST_LAYERS * layout.people.y.length));
    putGround(this.data, putTiles(this.data, layout, this.records), layout.ground, this.records);
    this.order = Int32Array.from({ length: items }, (_, i) => i);
    this.keys = new Int32Array(items);
    for (let i = 0; i < this.firstPerson; i++) this.keys[i] = layout.standing[3 * i + 2];
    this.drawn = this.fixed;
  }

  // Sprites in data as of the last pack.
  get count(): number {
    return this.drawn;
  }

  // Reads every person's columns again, so the caller moves people by rewriting them before a draw.
  pack(): void {
    const { firstPerson, standing } = this;
    for (let j = 0; j < this.people.y.length; j++) this.keys[firstPerson + j] = this.people.y[j];
    sortByRow(this.order, this.keys);
    let at = INSTANCE_SHORTS * this.fixed;
    for (let i = 0; i < this.order.length; i++) {
      const item = this.order[i];
      if (item < firstPerson) {
        at = put(this.data, at, this.records, standing[3 * item], standing[3 * item + 1], standing[3 * item + 2]);
      } else {
        at = putPerson(this.data, at, this.frames, this.people, item - firstPerson);
      }
    }
    this.drawn = at / INSTANCE_SHORTS;
  }
}
