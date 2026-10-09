// The visual word's `job` field carries index + 1, with 0 for none (interfaces.md). Append new items, so no id shifts.
export const JOB_ITEMS = ['builder', 'clinic', 'farmer', 'merchant', 'police', 'soldier'] as const;

export type JobItem = (typeof JOB_ITEMS)[number];

export function jobId(item: JobItem): number {
  return JOB_ITEMS.indexOf(item) + 1;
}
