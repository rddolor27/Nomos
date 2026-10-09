import type { World } from '@nomos/sim-core';
import { CUSTOM_FESTIVAL, CUSTOM_FOOD, CUSTOM_MUSIC, CUSTOM_NAMING, customOf, withCustom } from '@nomos/sim-core/kernels';

const CUSTOM_DOMAINS = [CUSTOM_FOOD, CUSTOM_FESTIVAL, CUSTOM_MUSIC, CUSTOM_NAMING];

// The regions relabelCultures rewrites. The non-culture hash skips them and keeps homeRegion.
export function cultureViews(world: World): readonly ArrayBufferView[] {
  const { culture, birthCulture, customs } = world.agents;
  return [culture, birthCulture, customs, world.cultureUid];
}

// Renumbers culture c as perm[c] in every column and custom, and moves its uid along, so each culture keeps its
// identity and no state outside cultureViews may change (R8's relabel test).
export function relabelCultures(world: World, perm: Uint8Array): void {
  const uids = world.cultureUid;
  const cultures = culturesInUse(uids);
  if (!isPermutation(perm, cultures)) {
    throw new RangeError(`perm must reorder cultures 0-${cultures - 1}, not [${perm.join(', ')}]`);
  }
  const { count, culture, birthCulture, customs } = world.agents;
  for (let i = 0; i < count[0]; i++) {
    culture[i] = perm[culture[i]];
    birthCulture[i] = perm[birthCulture[i]];
    customs[i] = relabelCustoms(customs[i], perm);
  }
  const oldUids = uids.slice(0, cultures);
  for (let c = 0; c < cultures; c++) uids[perm[c]] = oldUids[c];
}

function culturesInUse(uids: Uint8Array): number {
  let cultures = 0;
  for (let c = 0; c < uids.length; c++) if (uids[c] !== 0) cultures++;
  return cultures;
}

function isPermutation(perm: Uint8Array, n: number): boolean {
  if (perm.length !== n) return false;
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (perm[i] >= n || seen[perm[i]] === 1) return false;
    seen[perm[i]] = 1;
  }
  return true;
}

function relabelCustoms(customs: number, perm: Uint8Array): number {
  let relabelled = customs;
  for (let d = 0; d < CUSTOM_DOMAINS.length; d++) {
    relabelled = withCustom(relabelled, CUSTOM_DOMAINS[d], perm[customOf(customs, CUSTOM_DOMAINS[d])]);
  }
  return relabelled;
}
