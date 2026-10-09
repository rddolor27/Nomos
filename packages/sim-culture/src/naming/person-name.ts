import { NAME_WORDS } from './words.ts';

const HALF_MASK = 0xffff;
const HALF_BITS = 16;

function capitalised(word: string): string {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

// "Given Family" from one table (R8). The family word moves on when it would match the given word, so no name repeats one.
export function personName(nameKey: number): string {
  const size = NAME_WORDS.length;
  const given = (nameKey & HALF_MASK) % size;
  let family = (nameKey >>> HALF_BITS) % size;
  if (family === given) family = (family + 1) % size;
  return `${capitalised(NAME_WORDS[given])} ${capitalised(NAME_WORDS[family])}`;
}
