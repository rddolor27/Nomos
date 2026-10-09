import { mix } from '@nomos/sim-core/kernels';

export type Part = number | ArrayLike<number>;

const FOLD_SEED = 0x57a6e;

// goldens.py's fold: each part's length, then its values, so [1], [2] and [1, 2] differ.
export function fold(...parts: Part[]): number {
  let h = mix(FOLD_SEED);
  for (const part of parts) {
    if (typeof part === 'number') {
      h = mix(mix(h ^ 1) ^ part);
      continue;
    }
    h = mix(h ^ part.length);
    for (let i = 0; i < part.length; i++) h = mix(h ^ part[i]);
  }
  return h;
}

export function rows(records: readonly (readonly number[])[]): number[] {
  const out: number[] = [];
  for (const record of records) out.push(...record);
  return out;
}

export function paths(cellPaths: readonly (readonly number[])[]): number[] {
  const out: number[] = [];
  for (const path of cellPaths) out.push(path.length, ...path);
  return out;
}
