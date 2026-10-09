import { DESKTOP_MEMORY_BYTES, PHONE_MEMORY_BYTES } from './arena.ts';

export type Tier = 'phone' | 'phone-plus' | 'desktop';

export const TIER_AGENTS: Readonly<Record<Tier, number>> = { phone: 10_000, 'phone-plus': 25_000, desktop: 100_000 };

// One firm to 10 agent slots, as in Lengnick (1,000 households, 100 firms).
export const TIER_FIRMS: Readonly<Record<Tier, number>> = { phone: 1_000, 'phone-plus': 2_500, desktop: 10_000 };

// Walkable tiles to a blob when a tier fills a town, so phones draw a thinner crowd than a desktop. TIER_AGENTS stays the
// cap, which the bench and the perf specs fill whole.
export const TIER_TILES_PER_AGENT: Readonly<Record<Tier, number>> = { phone: 4, 'phone-plus': 3, desktop: 2 };

export const TIER_MEMORY_BYTES: Readonly<Record<Tier, number>> = {
  phone: PHONE_MEMORY_BYTES,
  'phone-plus': PHONE_MEMORY_BYTES,
  desktop: DESKTOP_MEMORY_BYTES,
};
