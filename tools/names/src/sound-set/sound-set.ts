import { readFileSync } from 'node:fs';
import { draw2 } from '@nomos/sim-core/kernels';

// A two-letter context, from ^^ at a word's start, mapped to each next letter, or $ for the end, and its count.
export type Chain = ReadonlyMap<string, ReadonlyMap<string, number>>;

export interface SoundSet {
  readonly lead: Chain;
  readonly others: readonly Chain[];
  // Every base's names, so a table can drop a word that copies a real place whole.
  readonly sources: ReadonlySet<string>;
}

export const NAME_BASES = new URL('../../fixtures/name-bases.json', import.meta.url);

// One style for everyone (owner, 9 October 2026): every word mixes Greek-like sounds with those of two other
// real-world bases picked for it, Greek weighing as much as the two together.
const LEAD_BASE = 'Greek';
const LEAD_WEIGHT = 2;
const OTHER_WEIGHT = 1;
// One stream: each table differs by its seed.
const WORDS = 1;
const START = '^^';
const END = '$';
// One letter past a table's longest word, so an overlong run ends as a reject instead of being cut into a word.
const MAX_LETTERS = 11;
const NEXT_IN_ORDER = 'abcdefghijklmnopqrstuvwxyz$';

export function chainOf(tokens: readonly string[]): Chain {
  const chain = new Map<string, Map<string, number>>();
  for (const token of tokens) {
    const padded = `${START}${token}${END}`;
    for (let k = START.length; k < padded.length; k++) {
      const context = padded.slice(k - 2, k);
      const counts = chain.get(context) ?? new Map<string, number>();
      counts.set(padded[k], (counts.get(padded[k]) ?? 0) + 1);
      chain.set(context, counts);
    }
  }
  return chain;
}

export function loadSoundSet(): SoundSet {
  const bases = JSON.parse(readFileSync(NAME_BASES, 'utf8')) as Record<string, string[]>;
  const names = Object.keys(bases).sort();
  return {
    lead: chainOf(bases[LEAD_BASE]),
    others: names.filter((name) => name !== LEAD_BASE).map((name) => chainOf(bases[name])),
    sources: new Set(names.flatMap((name) => bases[name])),
  };
}

// Two different bases out of count, the second skipping past the first.
export function pickOthers(count: number, seed: number, n: number): [number, number] {
  const first = draw2(seed, WORDS, n, 0) % count;
  const second = draw2(seed, WORDS, n, 1) % (count - 1);
  return [first, second >= first ? second + 1 : second];
}

// Candidate n of the table built on seed. Each letter follows the last two, weighted over the word's three bases.
// A context always continues in the base that gave its last letter, so the weighted total is never 0.
export function drawWord(sounds: SoundSet, seed: number, n: number): string {
  const [first, second] = pickOthers(sounds.others.length, seed, n);
  const chains = [sounds.lead, sounds.others[first], sounds.others[second]];
  const weights = [LEAD_WEIGHT, OTHER_WEIGHT, OTHER_WEIGHT];
  let word = '';
  let context = START;
  for (let k = 2; word.length < MAX_LETTERS; k++) {
    const next = pickNext(chains, weights, context, draw2(seed, WORDS, n, k));
    if (next === END) break;
    word += next;
    context = `${context[1]}${next}`;
  }
  return word;
}

function weightOf(chains: readonly Chain[], weights: readonly number[], context: string, next: string): number {
  let weight = 0;
  for (let c = 0; c < chains.length; c++) weight += weights[c] * (chains[c].get(context)?.get(next) ?? 0);
  return weight;
}

function pickNext(chains: readonly Chain[], weights: readonly number[], context: string, roll: number): string {
  let total = 0;
  for (const next of NEXT_IN_ORDER) total += weightOf(chains, weights, context, next);
  let rest = roll % total;
  for (const next of NEXT_IN_ORDER) {
    const weight = weightOf(chains, weights, context, next);
    if (rest < weight) return next;
    rest -= weight;
  }
  throw new Error(`no letter follows ${context}`);
}
