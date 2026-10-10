export const SKINS = ['dots', 'blobs', 'town'] as const;
export type Skin = (typeof SKINS)[number];

// The town loads after the first frame, and the renderer draws dots in its place until then.
export const BUILT_SKINS: readonly Skin[] = ['dots', 'town'];

function isSkin(value: string | null): value is Skin {
  return SKINS.some((skin) => skin === value);
}

export function skinFromQuery(search: string): Skin | null {
  const value = new URLSearchParams(search).get('skin');
  return isSkin(value) ? value : null;
}

export function builtSkin(skin: Skin): Skin {
  return BUILT_SKINS.includes(skin) ? skin : 'dots';
}

// Round 3's semantic zoom takes the coarser of two levels: dots below 6 CSS px a tile or above 500 agents in view, else
// the town. A switch needs 15% more than that, so a camera resting on a limit does not flicker.
const TOWN_LIMITS = {
  // The town draws a whole first screen's crowd, up to about 9,000 blobs in view, so the first screen opens in the town's
  // art (owner, 10 October 2026); 176x112 Highcourt starts 7,931 on desktop. The perf tiers' 10k and more stay dots.
  enter: { minPxPerTile: 6.9, maxAgents: 9000 },
  stay: { minPxPerTile: 5.1, maxAgents: 10350 },
};

export function autoSkin(current: Skin, cssPxPerTile: number, visibleAgents: number): 'dots' | 'town' {
  const limits = current === 'town' ? TOWN_LIMITS.stay : TOWN_LIMITS.enter;
  return cssPxPerTile >= limits.minPxPerTile && visibleAgents <= limits.maxAgents ? 'town' : 'dots';
}
