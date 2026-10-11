import { readFileSync } from 'node:fs';
import { CELL_DX, CELL_DY, FIELD_BYTES, NO_PATH, RUN_BYTES, buildFields, createHomes, createTown, pathRuns, stateHash } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, WALK_BLOCKED, parseMap, premisesOf, type MapV1 } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;

function loadTown(): MapV1 {
  return parseMap(new Uint8Array(readFileSync(townFile)).buffer);
}

function homeDoors(town: MapV1): Int32Array {
  const homes = town.entities.filter((entity) => entity.kind === ENTITY_HOME);
  return Int32Array.from(homes, (home) => home.doorY * town.width + home.doorX);
}

// Steps from a door over the walk grid by the four orthogonal moves alone, which an independent breadth-first search counts
// without the field's diagonals.
function distancesFrom(town: MapV1, door: number): Int32Array {
  const { width, height, walk } = town;
  const distance = new Int32Array(width * height).fill(-1);
  const queue = [door];
  distance[door] = 0;
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i] % width;
    const y = (queue[i] - x) / width;
    for (const [dx, dy] of [[0, 1], [-1, 0], [0, -1], [1, 0]]) {
      const cell = (y + dy) * width + x + dx;
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      if (walk[cell] === WALK_BLOCKED || distance[cell] !== -1) continue;
      distance[cell] = distance[queue[i]] + 1;
      queue.push(cell);
    }
  }
  return distance;
}

interface Walked {
  end: number;
  cost: number;
  legal: boolean;
}

function isOpen(town: MapV1, x: number, y: number): boolean {
  return x >= 0 && x < town.width && y >= 0 && y < town.height && town.walk[y * town.width + x] !== WALK_BLOCKED;
}

// Whether a step k from the cell is onto an open cell and, on a diagonal, between two.
function canStep(town: MapV1, cell: number, k: number): boolean {
  const x = cell % town.width;
  const y = (cell - x) / town.width;
  if (!isOpen(town, x + CELL_DX[k], y + CELL_DY[k])) return false;
  return CELL_DX[k] === 0 || CELL_DY[k] === 0 || (isOpen(town, x + CELL_DX[k], y) && isOpen(town, x, y + CELL_DY[k]));
}

function countRuns(runs: Uint8Array): number {
  let count = 0;
  while (count < RUN_BYTES / 2 && runs[2 * count + 1] !== 0) count++;
  return count;
}

// Walks the runs cell by cell from `from`, forward or backward. A diagonal costs 2, as in the field.
function walkRuns(town: MapV1, runs: Uint8Array, from: number, backward: boolean): Walked {
  const walked: Walked = { end: from, cost: 0, legal: true };
  const count = countRuns(runs);
  for (let i = 0; i < count; i++) {
    const r = backward ? count - 1 - i : i;
    const k = backward ? ((runs[2 * r] >> 5) + 4) & 7 : runs[2 * r] >> 5;
    for (let n = 0; n < runs[2 * r + 1]; n++) {
      if (!canStep(town, walked.end, k)) walked.legal = false;
      walked.end += CELL_DY[k] * town.width + CELL_DX[k];
      walked.cost += CELL_DX[k] !== 0 && CELL_DY[k] !== 0 ? 2 : 1;
    }
  }
  return walked;
}

describe("Highcourt's premises fields", () => {
  it('give every home a way to every premises in at most 32 runs, the shortest, and back again', () => {
    const town = loadTown();
    const premises = premisesOf(town);
    const homes = homeDoors(town);
    const cells = town.width * town.height;
    const world = createTown(SEED, 'phone', town, createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME)));
    const hash = stateHash(world);
    const doors = Int32Array.from(premises, (p) => p.doorY * town.width + p.doorX);

    const started = performance.now();
    buildFields(town, doors, world.fields);
    const built = performance.now() - started;

    const runs = new Uint8Array(RUN_BYTES);
    const problems: string[] = [];
    let most = 0;
    for (let p = 0; p < premises.length; p++) {
      const distance = distancesFrom(town, doors[p]);
      for (let h = 0; h < homes.length; h++) {
        const count = pathRuns(world.fields, p * cells, town.width, homes[h], runs, 0);
        most = Math.max(most, count);
        const there = walkRuns(town, runs, homes[h], false);
        const back = walkRuns(town, runs, doors[p], true);
        const sound = count >= 0 && there.legal && there.end === doors[p] && there.cost === distance[homes[h]] && back.legal && back.end === homes[h];
        if (!sound) problems.push(`home ${h} to premises ${p}: ${count} runs`);
      }
    }

    console.info(
      `Highcourt: ${premises.length} premises and ${homes.length} homes, most runs ${most}; ` +
        `the fields took ${built.toFixed(1)} ms and ${premises.length * cells} of ${world.fields.length} reserved bytes`,
    );
    expect(problems).toEqual([]);
    expect([premises.length, homes.length, premises.length * cells, most]).toEqual([22, 387, FIELD_BYTES, 24]);
    expect(stateHash(world)).toBe(hash);
  });

  it('give a cell walled in no runs to any premises, and leave the homes their ways', () => {
    const town = loadTown();
    const homes = homeDoors(town);
    const premises = premisesOf(town);
    const cells = town.width * town.height;
    // A grass cell in the town's north-west corner, off every street, with eight open neighbours to wall up.
    const pocketX = 3;
    const pocketY = 3;
    const walled = pocketY * town.width + pocketX;
    const walk = town.walk.slice();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        expect(walk[(pocketY + dy) * town.width + pocketX + dx]).not.toBe(WALK_BLOCKED);
        if (dx !== 0 || dy !== 0) walk[(pocketY + dy) * town.width + pocketX + dx] = WALK_BLOCKED;
      }
    }
    const fields = new Uint8Array(FIELD_BYTES);
    buildFields({ width: town.width, height: town.height, walk }, Int32Array.from(premises, (p) => p.doorY * town.width + p.doorX), fields);

    const runs = new Uint8Array(RUN_BYTES).fill(0xaa);
    for (let p = 0; p < premises.length; p++) {
      expect(pathRuns(fields, p * cells, town.width, walled, runs, 0), `premises ${p}`).toBe(NO_PATH);
      expect(runs.every((byte) => byte === 0)).toBe(true);
      expect(pathRuns(fields, p * cells, town.width, homes[0], runs, 0), `premises ${p}`).toBeGreaterThan(0);
    }
  });
});
