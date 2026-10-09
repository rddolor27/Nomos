import { foldName } from '../text/fold.ts';

// R8 prior-art notes, part c: no culture is older, purer, more developed or closer to nature.
export const HIERARCHY_WORDS: readonly string[] = [
  'primitive', 'savage', 'tribe', 'barbarian', 'neolithic', 'civilised', 'civilized',
  'advanced', 'native', 'foreign', 'exotic', 'race',
  'primitives', 'savages', 'tribes', 'tribal', 'barbarians', 'barbaric', 'natives', 'races', 'racial',
];

export const CUSTOM_NOUNS: readonly string[] = [
  'custom', 'customs', 'festival', 'festivals', 'food', 'foods', 'dish', 'dishes',
  'music', 'song', 'songs', 'dance', 'dances', 'name', 'names', 'naming', 'calendar', 'region', 'holiday', 'holidays',
];

export interface LineHit {
  readonly line: number;
  readonly text: string;
}

const HIERARCHY = new Set(HIERARCHY_WORDS);
const CUSTOMS = new Set(CUSTOM_NOUNS);
const SENTENCE_END = new Set(['.', '!', '?']);

// A number keeps its decimal point, and a {placeholder} counts as a letter of the word it touches,
// so "{culture}s" is one word.
const TOKEN = /\p{N}+(?:[.,]\p{N}+)*|(?:\{[^}\s]*\}|\p{L})+|\S/gu;

// A key is matched with its colon, so that its closing quote cannot be read as the start of a string.
const JSON_STRING = /"(?:[^"\\]|\\.)*"(\s*:)?/g;

function tokenize(text: string): string[] {
  return foldName(text).match(TOKEN) ?? [];
}

function oneWord(name: string): string {
  const words = tokenize(name);
  if (words.length !== 1) throw new RangeError(`a culture name is one word, not ${JSON.stringify(name)}`);
  return words[0];
}

function isWord(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}

function isShare(token: string): boolean {
  return token === '{share}' || /\p{N}/u.test(token);
}

// R8: the name is an adjective for a custom, never a noun for people.
function nameClaim(name: string, next: string | undefined): string | null {
  if (next !== undefined && CUSTOMS.has(next)) return null;
  return next !== undefined && isWord(next) ? `${name} ${next}` : name;
}

function nameHits(tokens: readonly string[], names: ReadonlySet<string>, plurals: ReadonlySet<string>): string[] {
  const hits: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (plurals.has(token)) hits.push(token);
    const claim = names.has(token) ? nameClaim(token, tokens[i + 1]) : null;
    if (claim !== null) hits.push(claim);
  }
  return hits;
}

function sentences(tokens: readonly string[]): string[][] {
  const found: string[][] = [[]];
  for (const token of tokens) {
    found[found.length - 1].push(token);
    if (SENTENCE_END.has(token)) found.push([]);
  }
  return found;
}

function raisedWithCustoms(sentence: readonly string[], i: number, names: ReadonlySet<string>): boolean {
  const opens = sentence[i] === 'raised' && sentence[i + 1] === 'with';
  return opens && names.has(sentence[i + 2]) && sentence[i + 3] === 'customs';
}

// R8: "6 in 10 people raised with Velan customs pick fish", never the same claim without a share.
function unsharedClaims(tokens: readonly string[], names: ReadonlySet<string>): string[] {
  const hits: string[] = [];
  for (const sentence of sentences(tokens)) {
    if (sentence.some(isShare)) continue;
    for (let i = 0; i < sentence.length; i++) {
      if (raisedWithCustoms(sentence, i, names)) hits.push(`raised with ${sentence[i + 2]} customs`);
    }
  }
  return hits;
}

function hierarchyHits(tokens: readonly string[]): string[] {
  return tokens.filter((token) => HIERARCHY.has(token));
}

export function cultureTextHits(text: string, cultureNames: readonly string[] = ['{culture}']): string[] {
  const names = new Set(cultureNames.map(oneWord));
  const plurals = new Set([...names].flatMap((name) => [`${name}s`, `${name}es`]));
  const tokens = tokenize(text);
  return [...hierarchyHits(tokens), ...nameHits(tokens, names, plurals), ...unsharedClaims(tokens, names)];
}

function tableLineHits(line: string, lineNumber: number): LineHit[] {
  const hits: LineHit[] = [];
  for (const [literal, key] of line.matchAll(JSON_STRING)) {
    if (key !== undefined) continue;
    const value = JSON.parse(literal) as string;
    const found = cultureTextHits(value);
    if (found.length > 0) hits.push({ line: lineNumber, text: `${value} [${found.join(', ')}]` });
  }
  return hits;
}

export function cultureTableHits(json: string): LineHit[] {
  return json.split('\n').flatMap((line, i) => tableLineHits(line, i + 1));
}
