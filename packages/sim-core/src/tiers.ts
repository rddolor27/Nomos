import { DESKTOP_MEMORY_BYTES, PHONE_MEMORY_BYTES } from './memory.ts';

export type Tier = 'phone' | 'phone-plus' | 'desktop';

export const TIER_AGENTS: Readonly<Record<Tier, number>> = { phone: 10_000, 'phone-plus': 25_000, desktop: 100_000 };

export const TIER_MEMORY_BYTES: Readonly<Record<Tier, number>> = {
  phone: PHONE_MEMORY_BYTES,
  'phone-plus': PHONE_MEMORY_BYTES,
  desktop: DESKTOP_MEMORY_BYTES,
};
