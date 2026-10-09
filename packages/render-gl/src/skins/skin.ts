export const SKINS = ['dots', 'blobs', 'town'] as const;
export type Skin = (typeof SKINS)[number];

export const BUILT_SKINS: readonly Skin[] = ['dots'];

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
  enter: { minPxPerTile: 6.9, maxAgents: 425 },
  stay: { minPxPerTile: 5.1, maxAgents: 575 },
};

export function autoSkin(current: Skin, cssPxPerTile: number, visibleAgents: number): 'dots' | 'town' {
  const limits = current === 'town' ? TOWN_LIMITS.stay : TOWN_LIMITS.enter;
  return cssPxPerTile >= limits.minPxPerTile && visibleAgents <= limits.maxAgents ? 'town' : 'dots';
}
