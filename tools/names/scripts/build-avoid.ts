// Rebuilds the fixtures rejectName reads beside the real-world ones: the franchise's settlements and species, and the
// profanity lists. Needs the network, so it is run by hand and its output committed: tokens only, never raw output.
// The repo scan reads this file, so it names the franchise only as "the franchise".
import { writeFileSync } from 'node:fs';
import { franchiseHits } from '../src/filters/franchise.ts';
import { FIXTURES } from '../src/filters/real-world.ts';
import { foldName, nameTokens } from '../src/text/fold.ts';
import { mergeSourceNotes } from './source-notes.ts';

const WIKIDATA = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'NomosNameFixture/1.0 (https://github.com/rddolor27/Nomos)';
const LDNOOBW_COMMIT = '5faf2ba42d7b1c0977169ec3611df25a3c08eb13';
const LDNOOBW = `https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/${LDNOOBW_COMMIT}/`;
// The 21 Latin-script lists (researcher, 9 October 2026).
const LATIN_LISTS = [
  'cs', 'da', 'de', 'en', 'eo', 'es', 'fi', 'fil', 'fr', 'fr-CA-u-sd-caqc', 'hi', 'hu', 'it', 'kab', 'nl', 'no', 'pl', 'pt',
  'sv', 'tlh', 'tr',
];
// CC BY 4.0 asks that every change be named, so the last sentence lists what this script does to the lists.
const LDNOOBW_ATTRIBUTION =
  'Profanity entries from the List of Dirty, Naughty, Obscene, and Otherwise Bad Words, © 2012–2020 Shutterstock, Inc., ' +
  'https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, commit ' +
  `${LDNOOBW_COMMIT}, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Provided as is, ` +
  'without warranties (licence section 5). Modified: Latin-script lists merged, lowercased, diacritics stripped, ' +
  'entries other than single words of 3 or more letters a to z dropped, deduplicated and sorted.';

// Every item numbered in the franchise's national catalogue (Q20005020). Regional forms share their species' number,
// so the shortest label per number is the species.
const SPECIES_QUERY = `SELECT ?item ?label ?rev ?number WHERE {
  ?item p:P1685 ?statement .
  ?statement pq:P972 wd:Q20005020 ; ps:P1685 ?number .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  ?item schema:version ?rev . }`;
// The cities, towns, villages and settlements of the franchise's universe (Q17562848) or of its fictional locations
// (Q32860792).
const PLACES_QUERY = `SELECT DISTINCT ?item ?label ?rev WHERE {
  VALUES ?class { wd:Q1964689 wd:Q106921111 wd:Q82551957 wd:Q108078133 }
  ?item wdt:P31 ?class .
  { ?item wdt:P1080 wd:Q17562848 } UNION { ?item wdt:P31 wd:Q32860792 }
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  ?item schema:version ?rev . }`;
// The researcher's counts of 9 October 2026; a change means the catalogue moved, so review it before committing.
const EXPECTED_SPECIES = 1_025;
const EXPECTED_PLACES = 84;
// Only distinctive place names stay (R8 customs notes, part c): words naming a kind of place go, and so do everyday
// English and Spanish words that any invented name might brush against.
const PLACE_KINDS = new Set(['town', 'city', 'island', 'village', 'forest']);
const ORDINARY_WORDS = new Set(['new', 'bark', 'white', 'violet', 'ever', 'grande', 'los', 'cabo', 'poco', 'platos']);
const MIN_PLACE_LETTERS = 4;
const MIN_SPECIES_LETTERS = 3;

interface Item {
  readonly qid: string;
  readonly label: string;
  readonly revision: string;
}
interface SparqlRows {
  readonly results: { readonly bindings: readonly Record<string, { readonly value: string }>[] };
}

async function get(url: string, accept = '*/*'): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  return response.text();
}

function oneLine(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}

async function wikidata(query: string): Promise<Record<string, string>[]> {
  const url = `${WIKIDATA}?format=json&query=${encodeURIComponent(oneLine(query))}`;
  const rows = JSON.parse(await get(url, 'application/sparql-results+json')) as SparqlRows;
  return rows.results.bindings.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, cell.value.replace(/^.*\/entity\//, '')])),
  );
}

function asItem(row: Record<string, string>): Item {
  return { qid: row.item, label: row.label, revision: row.rev };
}

function species(rows: readonly Record<string, string>[]): Item[] {
  const byNumber = new Map<string, Item>();
  for (const row of rows) {
    const held = byNumber.get(row.number);
    const item = asItem(row);
    if (!held || item.label.length < held.label.length || (item.label.length === held.label.length && item.qid < held.qid)) {
      byNumber.set(row.number, item);
    }
  }
  return [...byNumber.values()];
}

function expectCount(what: string, items: readonly Item[], expected: number): void {
  if (items.length !== expected) {
    throw new Error(`Wikidata gave ${items.length} ${what}, not the ${expected} the researcher counted; review it first`);
  }
}

function sorted(tokens: Iterable<string>): string[] {
  return [...new Set(tokens)].sort();
}

function speciesTokens(items: readonly Item[]): string[] {
  return sorted(
    items.map((item) => foldName(item.label).replace(/[^a-z]/g, '')).filter((token) => token.length >= MIN_SPECIES_LETTERS),
  );
}

function placeTokens(items: readonly Item[]): string[] {
  const words = items.flatMap((item) => nameTokens(item.label));
  const dropped = sorted(words.filter((word) => PLACE_KINDS.has(word) || ORDINARY_WORDS.has(word)));
  console.log(`place words dropped: ${dropped.join(' ')}`);
  return sorted(words.filter((word) => word.length >= MIN_PLACE_LETTERS && !dropped.includes(word)));
}

async function profanity(): Promise<string[]> {
  const entries: string[] = [];
  for (const list of LATIN_LISTS) {
    for (const line of (await get(`${LDNOOBW}${list}`)).split(/\r?\n/)) {
      const entry = foldName(line.trim());
      if (/^[a-z]{3,}$/.test(entry)) entries.push(entry);
    }
  }
  return sorted(entries);
}

function writeLines(file: string, lines: readonly string[]): void {
  writeFileSync(new URL(file, FIXTURES), lines.map((line) => `${line}\n`).join(''));
}

const speciesItems = species(await wikidata(SPECIES_QUERY));
const placeItems = (await wikidata(PLACES_QUERY)).map(asItem);
expectCount('species', speciesItems, EXPECTED_SPECIES);
expectCount('settlements', placeItems, EXPECTED_PLACES);
const tables: Record<string, string[]> = {
  'avoid-species': speciesTokens(speciesItems),
  'avoid-places': placeTokens(placeItems),
  profanity: await profanity(),
};
const named = Object.values(tables).flat().filter((token) => franchiseHits(token).length > 0);
if (named.length > 0) throw new Error(`the repo scan would flag ${named.join(', ')}`);

const pins = [
  ...speciesItems.map((item) => `${item.qid} ${item.revision} species`),
  ...placeItems.map((item) => `${item.qid} ${item.revision} place`),
].sort();
for (const [name, tokens] of Object.entries(tables)) writeLines(`${name}.txt`, tokens);
writeLines('avoid-items.txt', pins);
writeFileSync(new URL('LICENSE-ldnoobw.txt', FIXTURES), `${LDNOOBW_ATTRIBUTION}\n\n${await get(`${LDNOOBW}LICENSE`)}`);

const date = new Date().toISOString().slice(0, 10);
mergeSourceNotes({
  'avoid-species': { query: oneLine(SPECIES_QUERY), date, licence: 'CC0-1.0', count: tables['avoid-species'].length },
  'avoid-places': { query: oneLine(PLACES_QUERY), date, licence: 'CC0-1.0', count: tables['avoid-places'].length },
  profanity: { query: `${LDNOOBW}{${LATIN_LISTS.join(',')}}`, date, licence: 'CC-BY-4.0', count: tables.profanity.length },
});
for (const [name, tokens] of Object.entries(tables)) console.log(`${name}: ${tokens.length} tokens`);
console.log(`avoid-items: ${pins.length} items pinned by revision`);
