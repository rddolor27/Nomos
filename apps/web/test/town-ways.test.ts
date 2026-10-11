import { FIELD_BYTES, NO_PATH, RUN_BYTES, TOO_FAR, buildFields, pathRuns } from '@nomos/sim-core';
import { ENTITY_HOME } from '@nomos/sim-protocol/map';
import { premisesOf } from '@nomos/sim-protocol/premises';
import { buildPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';

// M3.1's Part 4, Task 23: once `connect` joins every road to the plaza, every home has a way to every premises, and a way
// of over 32 runs is rare (Rulings 6 and 7).
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
const WALLED = ['capital', 'city', 'town'];
const TOO_FAR_SHARE = 0.001;

describe(`the ways of the capitals, cities and towns of the first ${WORLDS} standard worlds`, { timeout: 600_000 }, () => {
  it('lead from every home to every premises, in at most 32 runs for all but a thousandth', () => {
    const fields = new Uint8Array(FIELD_BYTES);
    const runs = new Uint8Array(RUN_BYTES);
    const cutOff: string[] = [];
    let places = 0;
    let ways = 0;
    let tooFar = 0;
    let most = 0;
    for (let k = 0; k < WORLDS; k++) {
      placeContexts(generateWorld(FIRST_SEED + k, 'standard')).forEach((ctx, i) => {
        if (!WALLED.includes(ctx.tier ?? '')) return;
        const { map } = buildPlace(ctx);
        if (map === null) throw new Error(`place ${i} has no ground`);
        const premises = premisesOf(map);
        buildFields(map, Int32Array.from(premises, (p) => p.doorY * map.width + p.doorX), fields);
        const cells = map.width * map.height;
        const homes = map.entities.filter((entity) => entity.kind === ENTITY_HOME);
        places++;
        for (let p = 0; p < premises.length; p++) {
          for (const home of homes) {
            const count = pathRuns(fields, p * cells, map.width, home.doorY * map.width + home.doorX, runs, 0);
            ways++;
            most = Math.max(most, count);
            if (count === TOO_FAR) tooFar++;
            if (count === NO_PATH) cutOff.push(`${(FIRST_SEED + k).toString(16)} place ${i}: home at ${home.doorX},${home.doorY}, premises ${p}`);
          }
        }
      });
    }

    console.info(`${places} places, ${ways} ways, ${tooFar} over 32 runs, most ${most}`);
    expect(places).toBeGreaterThan(15 * WORLDS);
    expect(ways).toBeGreaterThan(100_000 * WORLDS);
    expect(cutOff.slice(0, 20)).toEqual([]);
    expect(tooFar).toBeLessThanOrEqual(ways * TOO_FAR_SHARE);
  });
});
