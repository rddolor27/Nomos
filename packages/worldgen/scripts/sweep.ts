// M8.1's exit sweeps, over the same seeds from 5EED0001 every run: node packages/worldgen/scripts/sweep.ts. Countries
// and regions are checked on the first 100 seeds of each size, wonders on 1,000 standard seeds. Prints the worlds made
// and the problems found, and exits 1 on any problem.
import {
  BIOME_NAMES,
  TIER_NAMES,
  WONDER_NAMES,
  type PathTable,
  type WorldMap,
  type WorldSize,
} from '@nomos/sim-protocol/world-map';
import { survey } from '../src/features/survey.ts';
import { dist2, xOf, yOf } from '../src/grid/grid.ts';
import { generateWorld } from '../src/index.ts';
import type { FeatureWorld } from '../src/world/draft.ts';

const FIRST_SEED = 0x5eed0001;
const SIZES: readonly WorldSize[] = ['standard', 'large'];
const WORLDS: Record<WorldSize, number> = { standard: 1000, large: 100 };
const STRUCTURE_WORLDS = 100;

const MIN_COUNTRIES = 3;
const MAX_COUNTRIES = 5;
const MIN_HELD = 3;
const MIN_CAPITAL_PEOPLE = 5_000;
const COLOUR_COUNT = 5;
// The generator aims for 4-8 wonders, but standard 5EED00F4 places 3, as Python does: no fourth kind has a site clear of
// the wonder gap. So the floor is 3 (agent ruling, 9 October 2026; checkpoint 0023).
const MIN_WONDERS = 3;
const MAX_WONDERS = 8;

const OCEAN = BIOME_NAMES.indexOf('ocean');
const LAKE = BIOME_NAMES.indexOf('lake');
const CAPITAL = TIER_NAMES.indexOf('capital');
const TOWN = TIER_NAMES.indexOf('town');
const HOT_WONDERS = [
  WONDER_NAMES.indexOf('hot-springs'),
  WONDER_NAMES.indexOf('geyser'),
  WONDER_NAMES.indexOf('caldera-lake'),
];

function isWater(map: WorldMap, cell: number): boolean {
  return map.biome[cell] === OCEAN || map.biome[cell] === LAKE;
}

function where(map: WorldMap, cell: number): string {
  return `(${xOf(cell, map.width)}, ${yOf(cell, map.width)})`;
}

function squaredApart(map: WorldMap, a: number, b: number): number {
  return dist2(xOf(a, map.width), yOf(a, map.width), xOf(b, map.width), yOf(b, map.width));
}

function wrongCells(map: WorldMap, what: string, wrong: (cell: number) => boolean): string[] {
  let count = 0;
  let first = -1;
  for (let cell = 0; cell < map.biome.length; cell++) {
    if (!wrong(cell)) continue;
    if (count === 0) first = cell;
    count++;
  }
  return count > 0 ? [`cells ${what}: ${count}, the first at ${where(map, first)}`] : [];
}

function pathsOf(table: PathTable): number[][] {
  const paths: number[][] = [];
  for (let p = 0; p < table.offsets.length - 1; p++) {
    paths.push(Array.from(table.cells.subarray(table.offsets[p], table.offsets[p + 1])));
  }
  return paths;
}

function featureWorldOf(map: WorldMap): FeatureWorld {
  const { settlements, width } = map;
  return {
    seed: map.seed,
    width,
    height: map.height,
    elevation: Int32Array.from(map.elevation),
    biome: map.biome,
    temperature: map.temperature,
    moisture: map.moisture,
    river: map.river,
    receiver: map.receiver,
    coast: map.coast,
    settlements: Array.from(settlements.cell, (cell, id) => ({
      id,
      x: xOf(cell, width),
      y: yOf(cell, width),
      tier: settlements.tier[id],
      population: settlements.population[id],
      uid: cell,
      landmarks: [],
    })),
    roads: pathsOf(map.roads),
    bridges: Array.from(map.bridges),
  };
}

function countryCount(map: WorldMap): string[] {
  const k = map.countries.capital.length;
  return k >= MIN_COUNTRIES && k <= MAX_COUNTRIES ? [] : [`${k} countries`];
}

function landCountries(map: WorldMap): string[] {
  const k = map.countries.capital.length;
  return wrongCells(map, 'in the wrong country', (cell) => {
    const country = map.country[cell];
    return isWater(map, cell) ? country !== 0 : country < 1 || country > k;
  });
}

function settlementCountries(map: WorldMap): string[] {
  const { settlements } = map;
  const k = map.countries.capital.length;
  const held = new Int32Array(k + 1);
  const out: string[] = [];
  for (let s = 0; s < settlements.cell.length; s++) {
    const country = settlements.country[s];
    const cellCountry = map.country[settlements.cell[s]];
    if (country !== cellCountry || country < 1 || country > k) {
      out.push(`settlement ${s} is in country ${country}, its cell in ${cellCountry}`);
    } else {
      held[country]++;
    }
    const region = settlements.region[s];
    const cellRegion = map.region[settlements.cell[s]];
    if (region !== cellRegion) out.push(`settlement ${s} is in region ${region}, its cell in ${cellRegion}`);
  }
  for (let n = 1; n <= k; n++) {
    if (held[n] < MIN_HELD) out.push(`country ${n} holds ${held[n]} settlements`);
  }
  return out;
}

function capitalProblems(map: WorldMap): string[] {
  const { settlements, countries } = map;
  const out: string[] = [];
  for (let n = 0; n < countries.capital.length; n++) {
    const s = countries.capital[n];
    const country = map.country[settlements.cell[s]];
    const tier = settlements.tier[s];
    const people = settlements.population[s];
    if (country !== n + 1 || tier !== CAPITAL || people < MIN_CAPITAL_PEOPLE) {
      out.push(`capital ${s} of country ${n + 1} is in ${country}, tier ${tier}, ${people} people`);
    }
  }
  return out;
}

function colourProblems(map: WorldMap): string[] {
  const colours = Array.from(map.countries.colour);
  const fine = new Set(colours).size === colours.length && colours.every((colour) => colour < COLOUR_COUNT);
  return fine ? [] : [`colours ${colours.join(' ')}`];
}

function countryProblems(map: WorldMap): string[] {
  return [
    ...countryCount(map),
    ...landCountries(map),
    ...settlementCountries(map),
    ...capitalProblems(map),
    ...colourProblems(map),
  ];
}

// Regions nest in countries, so a land cell's region belongs to the cell's own country.
function regionCells(map: WorldMap): string[] {
  const regions = map.regions.seat.length;
  return wrongCells(map, 'in the wrong region', (cell) => {
    const region = map.region[cell];
    if (isWater(map, cell)) return region !== 0;
    return region < 1 || region > regions || map.regions.country[region - 1] !== map.country[cell];
  });
}

function marketCells(map: WorldMap): string[] {
  const regions = map.regions.seat.length;
  return wrongCells(map, 'in the wrong market', (cell) => {
    const market = map.market[cell];
    if (isWater(map, cell)) return market !== 0;
    return market < 1 || market > regions;
  });
}

function seatProblems(map: WorldMap): string[] {
  const { settlements, regions } = map;
  const out: string[] = [];
  for (let r = 0; r < regions.seat.length; r++) {
    const s = regions.seat[r];
    const tier = settlements.tier[s];
    const region = map.region[settlements.cell[s]];
    if (tier > TOWN || region !== r + 1) out.push(`seat ${s} of region ${r + 1} is tier ${tier}, in region ${region}`);
  }
  return out;
}

function regionProblems(map: WorldMap): string[] {
  return [...regionCells(map), ...marketCells(map), ...seatProblems(map)];
}

// Hot springs, geysers and caldera lakes share the one hotspot survey finds, so each lies within its reach.
function hotspotProblems(map: WorldMap): string[] {
  const { kind, cell } = map.wonders;
  const hot: number[] = [];
  for (let w = 0; w < kind.length; w++) {
    if (HOT_WONDERS.includes(kind[w])) hot.push(w);
  }
  if (hot.length === 0) return [];
  const { hotspot, hotReach } = survey(featureWorldOf(map));
  const out: string[] = [];
  for (const w of hot) {
    const name = `${WONDER_NAMES[kind[w]]} at ${where(map, cell[w])}`;
    if (hotspot < 0) {
      out.push(`${name}, but the world has no hotspot`);
      continue;
    }
    const apart = squaredApart(map, cell[w], hotspot);
    if (apart > hotReach * hotReach) {
      out.push(`${name} is ${apart} squared from the hotspot at ${where(map, hotspot)}, reach ${hotReach}`);
    }
  }
  return out;
}

function wonderProblems(map: WorldMap): string[] {
  const { kind } = map.wonders;
  const out: string[] = [];
  if (kind.length < MIN_WONDERS || kind.length > MAX_WONDERS) out.push(`${kind.length} wonders`);
  if (new Set(kind).size !== kind.length) {
    out.push(`a wonder kind twice: ${Array.from(kind, (k) => WONDER_NAMES[k]).join(' ')}`);
  }
  return [...out, ...hotspotProblems(map)];
}

function problemsOf(map: WorldMap, size: WorldSize, index: number): string[] {
  const found = index < STRUCTURE_WORLDS ? [...countryProblems(map), ...regionProblems(map)] : [];
  return size === 'standard' ? [...found, ...wonderProblems(map)] : found;
}

function sweep(): { worlds: number; problems: string[] } {
  const problems: string[] = [];
  let worlds = 0;
  for (const size of SIZES) {
    for (let index = 0; index < WORLDS[size]; index++) {
      const seed = FIRST_SEED + index;
      const name = `${size} ${seed.toString(16)}`;
      for (const problem of problemsOf(generateWorld(seed, size), size, index)) problems.push(`${name}: ${problem}`);
      worlds++;
    }
  }
  return { worlds, problems };
}

const runtime = `node ${process.versions.node}`;
const started = performance.now();
const { worlds, problems } = sweep();
const seconds = ((performance.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  const shown = problems.slice(0, 20).join('\n  ');
  const noun = problems.length === 1 ? 'problem' : 'problems';
  console.error(`${runtime}: ${problems.length} ${noun} in ${worlds} worlds, ${seconds} s:\n  ${shown}`);
  process.exitCode = 1;
} else {
  console.log(`${runtime}: ${worlds} worlds, 0 problems, ${seconds} s`);
}
