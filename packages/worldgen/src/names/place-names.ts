import { TIER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';

// Stand-ins until the place-name table lands (M8.1, Task 33): countries by id, and settlements as Python names them.
export function placeNames(map: WorldMap): string[] {
  const names: string[] = [];
  for (let k = 1; k <= map.countries.capital.length; k++) names.push(`country-${k}`);
  for (let id = 0; id < map.settlements.tier.length; id++) names.push(`${TIER_NAMES[map.settlements.tier[id]]}-${id}`);
  return names;
}
