import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WALK_ROAD, parseMap } from '@nomos/sim-protocol';
import { buildPlace } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { TOWN } from '../src/map/town.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TOWN_MAP = new URL('../../../assets/maps/town.nmap', import.meta.url);
// export_map.py's TOWN as JSON, which writes its landmarks tuple as a list and None as null.
const PRINT_TOWN = [
  'import dataclasses, json, sys',
  "sys.path.insert(0, 'tools/worldgen')",
  'from export_map import TOWN',
  'print(json.dumps(dataclasses.asdict(TOWN)))',
].join('\n');
const PAVED = 'nature/terrain_paving';

describe("Highcourt's place context", { timeout: 60_000 }, () => {
  it('pins the context export_map.py exports the town map from', () => {
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    const printed = execFileSync('python', ['-c', PRINT_TOWN], { cwd: ROOT, encoding: 'utf8', env });

    expect(TOWN).toEqual(JSON.parse(printed));
  });

  // So the Town skin draws the ground the sim walks on. export_map.py paves a footbridge's water cells, which the place
  // draws as water under the bridge's sprite.
  it('lays out the committed town map tile for tile', () => {
    const map = parseMap(new Uint8Array(readFileSync(TOWN_MAP)).buffer);
    const { layout } = buildPlace(TOWN);
    const differ = [...layout.tiles.keys()].filter((i) => layout.frames[layout.tiles[i]] !== map.frames[map.tiles[i]]);

    expect([layout.width, layout.height]).toEqual([map.width, map.height]);
    expect(differ.filter((i) => map.frames[map.tiles[i]] !== PAVED || map.walk[i] !== WALK_ROAD)).toEqual([]);
    expect(differ.length).toBeLessThan(layout.tiles.length / 100);
  });
});
