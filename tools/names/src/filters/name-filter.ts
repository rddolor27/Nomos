import { readFileSync } from 'node:fs';
import { withinDistance } from '../text/edit.ts';
import { foldName } from '../text/fold.ts';
import { franchiseHits } from './franchise.ts';
import { FIXTURES, allowedEdits, loadRealWorld, nearRealWorld, type RealWorld } from './real-world.ts';

export type Rule = 'franchise' | 'real-world' | 'place' | 'species' | 'profanity' | 'denied';

// Creature-style names end in "mon" (content rules; round 8's proposed filter).
const CREATURE_ENDING = /mon$/;
// A 3-letter entry inside a longer word is mostly innocent, the Scunthorpe problem, so it matches whole words only
// (R8 customs notes, part c).
const SUBSTRING_MIN_LETTERS = 4;

interface Lists {
  readonly realWorld: RealWorld;
  readonly places: readonly string[];
  readonly species: readonly string[];
  readonly profanity: readonly string[];
  readonly denied: ReadonlySet<string>;
}

let lists: Lists | null = null;

function fixture(file: string): string[] {
  return readFileSync(new URL(file, FIXTURES), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line !== '');
}

function loaded(): Lists {
  lists ??= {
    realWorld: loadRealWorld(),
    places: fixture('avoid-places.txt'),
    species: fixture('avoid-species.txt'),
    profanity: fixture('profanity.txt'),
    denied: new Set(fixture('denied.txt')),
  };
  return lists;
}

export function nearAny(word: string, tokens: readonly string[]): boolean {
  const edits = allowedEdits(word);
  return tokens.some((token) => withinDistance(word, token, edits));
}

export function profane(word: string, entries: readonly string[]): boolean {
  return entries.some((entry) => (entry.length < SUBSTRING_MIN_LETTERS ? word === entry : word.includes(entry)));
}

// The first rule a candidate name word breaks, or null when it passes them all.
export function rejectName(word: string): Rule | null {
  const folded = foldName(word);
  const { realWorld, places, species, profanity, denied } = loaded();
  if (franchiseHits(folded).length > 0 || CREATURE_ENDING.test(folded)) return 'franchise';
  if (nearRealWorld(folded, realWorld) !== null) return 'real-world';
  if (nearAny(folded, places)) return 'place';
  if (nearAny(folded, species)) return 'species';
  if (profane(folded, profanity)) return 'profanity';
  // Words a reviewer read in the table that the lists miss: dictionary words, slang, brands, faiths and famous people.
  if (denied.has(folded)) return 'denied';
  return null;
}
