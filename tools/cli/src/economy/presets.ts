import { CITY, LENGNICK } from '@nomos/sim-core';

export const PRESETS = { lengnick: LENGNICK, city: CITY } as const;

export type PresetName = keyof typeof PRESETS;

export function isPreset(name: unknown): name is PresetName {
  return typeof name === 'string' && Object.hasOwn(PRESETS, name);
}
