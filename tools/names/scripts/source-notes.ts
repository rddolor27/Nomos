import { readFileSync, writeFileSync } from 'node:fs';
import { FIXTURES } from '../src/filters/real-world.ts';

export interface SourceNote {
  readonly query: string;
  readonly date: string;
  readonly licence: string;
  readonly count: number;
  readonly credit?: string;
}

const SOURCES = new URL('sources.json', FIXTURES);
const USER_AGENT = 'NomosNameFixture/1.0 (https://github.com/rddolor27/Nomos)';

export async function get(url: string, accept = '*/*'): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  return response.text();
}

// Each build script owns some notes, so a rerun of one keeps the others' notes as they are, in place.
export function mergeSourceNotes(notes: Readonly<Record<string, SourceNote>>): void {
  const all = JSON.parse(readFileSync(SOURCES, 'utf8')) as Record<string, SourceNote>;
  writeFileSync(SOURCES, `${JSON.stringify({ ...all, ...notes }, null, 2)}\n`);
}
