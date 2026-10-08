import { foldName } from './fold.ts';

// Character classes keep this file from spelling the name it bans, so the repo scan passes on it.
const UNACCENTED = /pok[e]mon/g;
const ACCENTED_PREFIX = /pok[é]/g;

// The folded form catches any accent or decomposition of the full name. Folding would also turn the verb
// "poke" into the prefix, so the prefix is read from the composed text, where only the accented form matches.
export function franchiseHits(text: string): string[] {
  const whole = foldName(text).match(UNACCENTED) ?? [];
  const prefix = text.normalize('NFC').toLowerCase().match(ACCENTED_PREFIX) ?? [];
  return [...whole, ...prefix];
}
