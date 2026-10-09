import { readFileSync, writeFileSync } from 'node:fs';
import { FIXTURES } from '../src/filters/real-world.ts';

export interface SourceNote {
  readonly query: string;
  readonly date: string;
  readonly licence: string;
  readonly count: number;
}

const SOURCES = new URL('sources.json', FIXTURES);

// Each build script owns some notes, so a rerun of one keeps the others' notes as they are, in place.
export function mergeSourceNotes(notes: Readonly<Record<string, SourceNote>>): void {
  const all = JSON.parse(readFileSync(SOURCES, 'utf8')) as Record<string, SourceNote>;
  writeFileSync(SOURCES, `${JSON.stringify({ ...all, ...notes }, null, 2)}\n`);
}
