import { LANDMARK_NAMES } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { BEACH, GRASSLAND, INLAND, LAKE } from '../src/climate/biomes.ts';
import { CHANCES, landmarks } from '../src/features/landmarks.ts';
import { survey } from '../src/features/survey.ts';
import { CITY, TOWN, VILLAGE } from '../src/settle/settle.ts';
import type { FeatureWorld } from '../src/world/draft.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves every golden fingerprint
// unchanged. Every expected value is what tools/worldgen/features.py returns for the same scene.

// On this seed the draws fall so that the rule each scene pins decides its output. On many seeds they do not, and the
// rule goes unseen.
const SEED = 14;

// A glyph for each biome code: sea, lake, grassland, farmland, broadleaf forest, conifer forest, marsh, sand, hills,
// mountain, peak and snow. Two more mark a beach: b, grassland on one, and l, a lake on one.
const GLYPHS = '~L.fdcmshMPn';
const ON_BEACH: Record<string, number> = { b: GRASSLAND, l: LAKE };

type Xy = readonly [number, number];

interface Scene {
  rows: readonly string[];
  // Elevation by 'x,y'; every other cell stands 100 high.
  heights?: Record<string, number>;
  places?: readonly (readonly [x: number, y: number, tier: number])[];
  roads?: readonly (readonly Xy[])[];
  bridges?: readonly Xy[];
}

function grass(width: number, height: number): string[] {
  return Array.from({ length: height }, () => '.'.repeat(width));
}

function withRow(rows: readonly string[], y: number, text: string): string[] {
  return rows.map((row, at) => (at === y ? text : row));
}

// The cells of row y from x0 to x1.
function line(x0: number, x1: number, y: number): Xy[] {
  return Array.from({ length: x1 - x0 + 1 }, (_, k): Xy => [x0 + k, y]);
}

function worldOf(scene: Scene, seed: number): FeatureWorld {
  const width = scene.rows[0].length;
  const glyphs = scene.rows.join('');
  const elevation = new Int32Array(glyphs.length).fill(100);
  for (const [key, height] of Object.entries(scene.heights ?? {})) {
    const [x, y] = key.split(',').map(Number);
    elevation[y * width + x] = height;
  }
  const cellOf = ([x, y]: Xy) => y * width + x;
  return {
    seed,
    width,
    height: scene.rows.length,
    elevation,
    biome: Uint8Array.from(glyphs, (glyph) => ON_BEACH[glyph] ?? GLYPHS.indexOf(glyph)),
    // Cold everywhere, so no glasshouse fits.
    temperature: new Uint8Array(glyphs.length),
    moisture: new Uint8Array(glyphs.length),
    river: new Uint8Array(glyphs.length),
    receiver: new Int32Array(glyphs.length).fill(-1),
    coast: Uint8Array.from(glyphs, (glyph) => (glyph in ON_BEACH ? BEACH : INLAND)),
    settlements: (scene.places ?? []).map(([x, y, tier], id) => ({
      id,
      x,
      y,
      tier,
      population: 1_000,
      uid: y * width + x,
      landmarks: [],
    })),
    roads: (scene.roads ?? []).map((path) => path.map(cellOf)),
    bridges: (scene.bridges ?? []).map(cellOf),
  };
}

// The landmarks with cells of their own, and each settlement's own, by name.
function landmarksOf(scene: Scene, seed = SEED) {
  const world = worldOf(scene, seed);
  const spots = landmarks(world, survey(world), []);
  return {
    spots: spots.map((p) => [LANDMARK_NAMES[p.kind], p.x, p.y]),
    kinds: world.settlements.map((s) => s.landmarks.map((kind) => LANDMARK_NAMES[kind])),
  };
}

const SEA_11 = '~'.repeat(11);
const SEA_13 = '~'.repeat(13);

describe('the landmark choices the goldens barely see', () => {
  it("keeps features.py's odds, kind by kind, in its order", () => {
    // A per mille shows only where a draw lands exactly on it. Nudging 20 of these 40 numbers by one, one at a time,
    // changes no golden world.
    expect(CHANCES.map(([kind, perMille]) => [LANDMARK_NAMES[kind], ...perMille])).toEqual([
      ['clock-tower', 1000, 600, 300, 0, 0],
      ['library', 800, 500, 0, 0, 0],
      ['fountain', 500, 400, 250, 0, 0],
      ['glasshouse', 300, 300, 250, 0, 0],
      ['amphitheatre', 700, 600, 0, 0, 0],
      ['garden-terraces', 0, 0, 500, 500, 0],
      ['windmill', 0, 0, 0, 450, 400],
      ['lighthouse', 700, 700, 600, 100, 0],
    ]);
  });

  it('puts a lookout exactly 2 cells from its town', () => {
    // The lookout window runs from 2 to 4 cells, squared 4 to 16. The only high ground is 2 cells east of the town, at
    // the near edge. Shutting that distance out changes no golden world.
    const scene: Scene = { rows: grass(13, 9), heights: { '8,4': 400 }, places: [[6, 4, TOWN]] };
    expect(landmarksOf(scene).spots).toEqual([['observatory', 8, 4]]);
  });

  it('counts ground at 380 as high enough for a lookout and ground at 379 as not', () => {
    // They lie 4 cells either side of the town, so 8 apart, which is just room for two lookouts, and this seed wants
    // two. A bar one lower would place both. Lowering it by one changes no golden world.
    const scene: Scene = { rows: grass(13, 9), heights: { '2,4': 380, '10,4': 379 }, places: [[6, 4, TOWN]] };
    expect(landmarksOf(scene).spots).toEqual([['observatory', 2, 4]]);
  });

  it('keeps a lookout out of the top row, where its icon would leave the map', () => {
    // The cell in row 1 is higher but has no room above it, so the lookout stands one row down. Dropping the margin
    // changes no golden world.
    const scene: Scene = { rows: grass(13, 9), heights: { '4,1': 450, '4,2': 400 }, places: [[6, 3, TOWN]] };
    expect(landmarksOf(scene).spots).toEqual([['observatory', 4, 2]]);
  });

  it('keeps a lookout out of a lake, however high', () => {
    // The lake at (8, 4) is the highest cell in the window, but the lookout stands on dry land to the west. Letting
    // lakes in changes no golden world.
    const scene: Scene = {
      rows: withRow(grass(13, 9), 4, '........L....'),
      heights: { '8,4': 450, '4,4': 390 },
      places: [[6, 4, TOWN]],
    };
    expect(landmarksOf(scene).spots).toEqual([['observatory', 4, 4]]);
  });

  it("keeps a lookout off another settlement's cell", () => {
    // The village at (6, 5) stands on the highest ground in the town's window and ranks first on this seed. The lookout
    // takes the next site, at (10, 8), because the village's cell is already taken. Leaving settlements out of the
    // cells taken changes no golden world.
    const scene: Scene = {
      rows: grass(13, 11),
      heights: { '6,5': 420, '10,8': 400 },
      places: [
        [6, 8, TOWN],
        [6, 5, VILLAGE],
      ],
    };
    expect(landmarksOf(scene).spots).toEqual([['observatory', 10, 8]]);
  });

  it("keeps a lookout off a viaduct's cell", () => {
    // The bridge at (4, 4) is the only high ground off the peaks in the town's window, and the viaduct is placed first.
    // The lookout would stand on the same cell if the viaduct left it free.
    const scene: Scene = {
      rows: withRow(grass(13, 9), 4, '..PP.PP......'),
      heights: { '2,4': 700, '3,4': 700, '4,4': 400, '5,4': 700, '6,4': 700 },
      places: [[4, 6, TOWN]],
      roads: [line(2, 6, 4)],
      bridges: [[4, 4]],
    };
    expect(landmarksOf(scene).spots).toEqual([['viaduct', 4, 4]]);
  });

  it('chooses between two bridges of equal depth by their keyed draw, then by cell', () => {
    // A road runs over two valleys 2 cells apart, each dropping 50 from its banks, so only one becomes a viaduct. The
    // draw puts (4, 4) first on seed 13 and (6, 4) first on seed 14. In cell order, descending, (6, 4) would always
    // come first, and a draw read the other way up would swap both.
    const scene: Scene = {
      rows: grass(13, 9),
      heights: Object.fromEntries(line(1, 9, 4).map(([x, y]) => [`${x},${y}`, x === 4 || x === 6 ? 100 : 150])),
      roads: [line(1, 9, 4)],
      bridges: [
        [4, 4],
        [6, 4],
      ],
    };
    expect(landmarksOf(scene, 13).spots).toEqual([['viaduct', 4, 4]]);
    expect(landmarksOf(scene, 14).spots).toEqual([['viaduct', 6, 4]]);
  });

  it('keeps a second lighthouse off the cell the first took', () => {
    // The towns at (6, 4) and (8, 4) share the shore cell (7, 4). The first town's lighthouse takes it, so the second's
    // goes to (9, 4). A lighthouse that ignored the cells taken would take (7, 4) again.
    const scene: Scene = {
      rows: [SEA_13, SEA_13, SEA_13, SEA_13, '.bbbbbbbbbbb.', ...grass(13, 2)],
      places: [
        [6, 4, TOWN],
        [8, 4, TOWN],
      ],
    };
    expect(landmarksOf(scene)).toEqual({
      spots: [
        ['lighthouse', 7, 4],
        ['lighthouse', 9, 4],
      ],
      kinds: [['lighthouse'], ['lighthouse']],
    });
  });

  it('gives a settlement no lighthouse when the only land beside it is inland', () => {
    // The town stands on a spit one cell wide, with sea on three sides. The three cells below it are land but not
    // coast. A lighthouse that took any land beside the town would stand on one of them.
    const scene: Scene = {
      rows: [SEA_11, SEA_11, SEA_11, SEA_11, '~~~~~b~~~~~', ...grass(11, 3)],
      places: [[5, 4, TOWN]],
    };
    expect(landmarksOf(scene)).toEqual({ spots: [], kinds: [[]] });
  });

  it('gives a settlement no lighthouse when the only coast beside it is in the top row', () => {
    // Row 1 is coast, but a lighthouse there would leave the map, and the cells with room above are inland.
    const scene: Scene = {
      rows: [SEA_11, 'b'.repeat(11), '.....b.....', ...grass(11, 3)],
      places: [[5, 2, TOWN]],
    };
    expect(landmarksOf(scene)).toEqual({ spots: [], kinds: [['clock-tower', 'fountain']] });
  });

  it('gives a settlement no lighthouse when its only shore cell is a lake that touches the sea', () => {
    // A lake beside the sea counts as coast, but a lighthouse stands only on land. Without the water test it would
    // stand in the lake at (6, 4).
    const scene: Scene = {
      rows: [SEA_11, SEA_11, SEA_11, SEA_11, '~~~~~bl~~~~', ...grass(11, 3)],
      places: [[5, 4, TOWN]],
    };
    expect(landmarksOf(scene)).toEqual({ spots: [], kinds: [[]] });
  });

  it('counts only the sea, not a lake, when choosing which shore cell takes the lighthouse', () => {
    // The town has two shore cells to choose between. West, (4, 4) has three sea neighbours and three lake neighbours;
    // east, (6, 4) has four sea neighbours and one lake neighbour. The sea alone puts the lighthouse east, 4 against 3.
    // Counting the lake too would put it west, 6 against 5, and changes no golden world.
    const scene: Scene = {
      rows: [SEA_11, SEA_11, SEA_11, SEA_11, '....bbb~~~~', '...LLL.....', ...grass(11, 2)],
      places: [[5, 4, TOWN]],
    };
    expect(landmarksOf(scene)).toEqual({ spots: [['lighthouse', 6, 4]], kinds: [['lighthouse']] });
  });

  it('fits an amphitheatre where two neighbours are hills or mountain, and a peak is no hill', () => {
    // A city rolls its amphitheatre at 600 per mille. One hill beside it is not enough; two hills, or a hill and a
    // mountain, are; a hill and a peak are not. Needing three would turn away the second, and counting hills alone or
    // mountain alone would turn away the third.
    const city = (ring: string): Scene => ({ rows: withRow(grass(7, 5), 1, ring), places: [[3, 2, CITY]] });
    expect(landmarksOf(city('..h....')).kinds).toEqual([['fountain', 'clock-tower']]);
    expect(landmarksOf(city('..hh...')).kinds).toEqual([['amphitheatre', 'fountain']]);
    expect(landmarksOf(city('..hM...')).kinds).toEqual([['amphitheatre', 'fountain']]);
    expect(landmarksOf(city('..hP...')).kinds).toEqual([['fountain', 'clock-tower']]);
  });

  it('fits garden terraces to a village on hills, and not to one beside a hill and a mountain', () => {
    // A village rolls its terraces at 500 per mille. Standing on hills is enough, whatever is beside it. A hill and a
    // mountain beside it are not, since only hills count, so the village takes a windmill, which grassland fits.
    const village = (rows: readonly string[]): Scene => ({ rows, places: [[3, 2, VILLAGE]] });
    expect(landmarksOf(village(withRow(grass(7, 5), 2, '...h...'))).kinds).toEqual([['garden-terraces']]);
    expect(landmarksOf(village(withRow(grass(7, 5), 1, '..hM...'))).kinds).toEqual([['windmill']]);
  });

  it('fits a windmill to a village standing on farmland', () => {
    // The fields skip every settlement's cell, so in a generated world nothing stands on farmland and only a map made
    // by hand reaches this rule.
    const scene: Scene = { rows: withRow(grass(7, 5), 2, '...f...'), places: [[3, 2, VILLAGE]] };
    expect(landmarksOf(scene).kinds).toEqual([['windmill']]);
  });
});
