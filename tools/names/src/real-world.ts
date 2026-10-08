import { readFileSync } from 'node:fs';
import { withinDistance } from './edit.ts';
import { nameTokens } from './fold.ts';

export const CATEGORIES = ['countries', 'languages', 'demonyms', 'ethnonyms', 'religions'] as const;
export type Category = (typeof CATEGORIES)[number];
export type RealWorld = ReadonlyMap<string, Category>;

export const FIXTURES = new URL('../fixtures/', import.meta.url);

// R8 customs notes, part c: two edits rejected 35-42% of 3-4 letter names, so names up to this length get one.
const ONE_EDIT_MAX_LETTERS = 5;

export function loadRealWorld(): RealWorld {
  const world = new Map<string, Category>();
  for (const category of CATEGORIES) {
    const tokens = readFileSync(new URL(`${category}.txt`, FIXTURES), 'utf8').split(/\r?\n/);
    for (const token of tokens) {
      if (token !== '' && !world.has(token)) world.set(token, category);
    }
  }
  return world;
}

function allowedEdits(word: string): number {
  return word.length <= ONE_EDIT_MAX_LETTERS ? 1 : 2;
}

export function nearRealWorld(name: string, fixture: RealWorld): string | null {
  for (const word of nameTokens(name)) {
    const edits = allowedEdits(word);
    for (const real of fixture.keys()) {
      if (withinDistance(word, real, edits)) return real;
    }
  }
  return null;
}
