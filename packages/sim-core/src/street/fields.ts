import type { Ground } from '../world/ground.ts';

// A blob steps to one of its eight neighbours, on the heading 32 * k: 0 down, then clockwise on screen through left and up to
// right, as the facings run (movement/walk.ts). So k is a heading shifted down by 5.
export const DIRECTIONS = 8;
export const CELL_DX = new Int8Array([0, -1, -1, -1, 0, 1, 1, 1]);
export const CELL_DY = new Int8Array([1, 1, 0, -1, -1, -1, 0, 1]);
// The bit of the step back along step k, half a turn on.
const BACK = new Uint8Array([16, 32, 64, 128, 1, 2, 4, 8]);

// A capital's or a city's 176 x 112 district is the largest ground, and has the most premises: 3 market trades of 2 stalls and 4
// shop trades of 4 shops (worldgen's place/build.ts and trades.ts). A town has 18 on 152 x 96.
export const MAX_FIELD_CELLS = 176 * 112;
export const MAX_PREMISES = 22;
// What a tier's layout reserves: a field takes a byte a cell, so 433,664 bytes.
export const FIELD_BYTES = MAX_FIELD_CELLS * MAX_PREMISES;
// A straight run's length fits the byte runs.ts gives it, so neither side is longer than 256 cells.
const MAX_SIDE = 256;

// A field byte has bit k set when step k brings a blob closer to the door, so a cell keeps every equally short way and the runs
// can choose to go straight. 0 is the door itself. 255 is a cell that does not reach the door; a reached cell with all eight
// steps closing in would read so too, which only a contrived ring of walls makes, and it costs that cell its trips.
export const AT_DOOR = 0;
export const UNREACHED = 255;
const UNSEEN = 0xffff;

// One flood at a time, every byte written before it is read, so these hold no state between builds. They are sized for the
// largest ground and stay out of the arena, as move's blocked list does.
const queue = new Uint16Array(MAX_FIELD_CELLS);
const distance = new Uint16Array(MAX_FIELD_CELLS);
const openSteps = new Uint8Array(MAX_FIELD_CELLS);
// The cell index each step adds on the ground being built: a table read where a multiply took the flood twice as long.
const cellStep = new Int32Array(DIRECTIONS);

export function cellStepOf(k: number, width: number): number {
  return CELL_DY[k] * width + CELL_DX[k];
}

// One field for each door cell (y * width + x), field p in out from byte p * width * height, built at a spawn or a switch and
// never in a tick. Blobs move 8 ways over the walk grid, a diagonal only where both cells it passes between are open, so none
// squeezes through a corner.
//
// A diagonal step costs what the two steps it replaces do, so a way across a street grid ties with every staircase of the same
// corners, and the runs can take the straight one. Costed as one step, every shortest way cut each corner it could, and 520 of
// Highcourt's 8,250 home-to-premises ways needed over 16 runs even at their fewest, up to 28 (measured here).
export function buildFields(ground: Ground, doors: Int32Array, out: Uint8Array): void {
  const count = doors.length;
  if (count === 0) return;
  const { width, height } = ground;
  const cells = width * height;
  requireRoom(width, height, count, out.length);
  for (let p = 0; p < count; p++) requireDoor(doors[p], cells, p);
  markOpenSteps(ground.walk, width, height);
  for (let k = 0; k < DIRECTIONS; k++) cellStep[k] = cellStepOf(k, width);
  for (let p = 0; p < count; p++) flood(doors[p], cells, out, p * cells);
}

function requireRoom(width: number, height: number, count: number, room: number): void {
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_FIELD_CELLS) {
    throw new RangeError(`a ${width} x ${height} ground is past the ${MAX_SIDE} per side and ${MAX_FIELD_CELLS} cells a field holds`);
  }
  if (count * width * height > room) {
    throw new RangeError(`${count} fields of ${width * height} cells need ${count * width * height} bytes, and the layout has ${room}`);
  }
}

function requireDoor(door: number, cells: number, premises: number): void {
  if (door < 0 || door >= cells) throw new RangeError(`premises ${premises} has its door at cell ${door}, outside ${cells} cells`);
}

// Which steps each open cell can take, once for the ground: the floods of all its premises share them.
function markOpenSteps(walk: Uint8Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      openSteps[cell] = walk[cell] === 0 ? 0 : stepsFrom(walk, width, height, x, y);
    }
  }
}

function stepsFrom(walk: Uint8Array, width: number, height: number, x: number, y: number): number {
  let steps = 0;
  for (let k = 0; k < DIRECTIONS; k++) if (canStep(walk, width, height, x, y, k)) steps |= 1 << k;
  return steps;
}

function canStep(walk: Uint8Array, width: number, height: number, x: number, y: number, k: number): boolean {
  const nx = x + CELL_DX[k];
  const ny = y + CELL_DY[k];
  if (nx < 0 || ny < 0 || nx >= width || ny >= height || walk[ny * width + nx] === 0) return false;
  return nx === x || ny === y || (walk[y * width + nx] !== 0 && walk[ny * width + x] !== 0);
}

// Floods outward from the door in layers over the four orthogonal steps. A cell found from a cell one layer in takes the step
// back to it, and one found again from another cell of that layer adds its step, so the field holds every shortest way. When a
// cell is taken from the queue the layers two in are complete, and each open diagonal step to one of them is a shortest way too.
function flood(door: number, cells: number, out: Uint8Array, first: number): void {
  out.fill(UNREACHED, first, first + cells);
  distance.fill(UNSEEN, 0, cells);
  out[first + door] = AT_DOOR;
  distance[door] = 0;
  queue[0] = door;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const cell = queue[head++];
    const depth = distance[cell];
    const open = openSteps[cell];
    for (let k = 0; k < DIRECTIONS; k += 2) {
      if (((open >> k) & 1) === 0) continue;
      const beyond = cell + cellStep[k];
      const seen = distance[beyond];
      if (seen === UNSEEN) {
        distance[beyond] = depth + 1;
        queue[tail++] = beyond;
        out[first + beyond] = BACK[k];
      } else if (seen === depth + 1) {
        out[first + beyond] |= BACK[k];
      }
    }
    for (let k = 1; k < DIRECTIONS; k += 2) {
      if (((open >> k) & 1) === 1 && distance[cell + cellStep[k]] + 2 === depth) out[first + cell] |= 1 << k;
    }
  }
}
