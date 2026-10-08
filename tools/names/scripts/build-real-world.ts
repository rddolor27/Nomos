// Rebuilds fixtures/ from CLDR and Wikidata. Needs the network, so it is run by hand and its output committed:
// tokens only, never the raw query output.
import { readFileSync, writeFileSync } from 'node:fs';
import { nameTokens } from '../src/fold.ts';
import { CATEGORIES, FIXTURES, type Category } from '../src/real-world.ts';

const CLDR_TAG = '47.0.0';
const CLDR_PACKAGE = `https://raw.githubusercontent.com/unicode-org/cldr-json/${CLDR_TAG}/cldr-json/cldr-localenames-full/`;
const CC0_TEXT = 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt';
const WIKIDATA = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'NomosNameFixture/1.0 (https://github.com/rddolor27/Nomos)';
const MIN_SITELINKS = 5;
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'XA', 'XB', 'ZZ']);
const RECURRING_LABELS = 3;

interface CldrNames {
  readonly main: { readonly en: { readonly localeDisplayNames: Record<string, Record<string, string>> } };
}
interface SparqlRows {
  readonly results: { readonly bindings: readonly { readonly label: { readonly value: string } }[] };
}
interface Fetched {
  readonly labels: string[];
  readonly query: string;
  readonly licence: string;
}

const SPARQL: Record<'demonyms' | 'ethnonyms' | 'religions', string> = {
  demonyms: `SELECT DISTINCT ?label WHERE {
    ?item wdt:P1549 ?label ; wikibase:sitelinks ?links .
    FILTER(LANG(?label) = "en" && ?links >= ${MIN_SITELINKS}) }`,
  ethnonyms: `SELECT DISTINCT ?label WHERE {
    ?item wdt:P31 wd:Q41710 ; wikibase:sitelinks ?links ; rdfs:label ?label .
    FILTER(LANG(?label) = "en" && ?links >= ${MIN_SITELINKS}) }`,
  religions: `SELECT DISTINCT ?label WHERE {
    VALUES ?kind { wd:Q9174 wd:Q13414953 }
    ?item wdt:P31 ?kind ; wikibase:sitelinks ?links ; rdfs:label ?label .
    FILTER(LANG(?label) = "en" && ?links >= ${MIN_SITELINKS}) }`,
};

async function get(url: string, accept = '*/*'): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  return response.text();
}

function isCountryKey(key: string): boolean {
  return /^[A-Z]{2}(-alt-[a-z]+)?$/.test(key) && !NOT_COUNTRIES.has(key.slice(0, 2));
}

async function cldr(file: 'territories' | 'languages'): Promise<Fetched> {
  const url = `${CLDR_PACKAGE}main/en/${file}.json`;
  const names = (JSON.parse(await get(url)) as CldrNames).main.en.localeDisplayNames[file];
  const keep = file === 'territories' ? isCountryKey : () => true;
  const labels = Object.entries(names).filter(([key]) => keep(key)).map(([, label]) => label);
  return { labels, query: url, licence: 'Unicode-3.0' };
}

async function wikidata(sparql: string): Promise<Fetched> {
  const query = sparql.replace(/\s+/g, ' ').trim();
  const rows = JSON.parse(await get(`${WIKIDATA}?format=json&query=${encodeURIComponent(query)}`, 'application/sparql-results+json'));
  return { labels: (rows as SparqlRows).results.bindings.map((row) => row.label.value), query, licence: 'CC0-1.0' };
}

function labelsPerToken(labels: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const label of labels) {
    for (const token of new Set(nameTokens(label))) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

// A token in many labels is often a structural word, so print them for a person to move into generic-words.txt.
function review(category: Category, counts: Map<string, number>, generic: ReadonlySet<string>): void {
  const kept = [...counts].filter(([token]) => !generic.has(token));
  const recurring = kept.filter(([, n]) => n >= RECURRING_LABELS).sort((a, b) => b[1] - a[1]);
  console.log(`${category}: ${kept.length} tokens; in ${RECURRING_LABELS}+ labels: ${recurring.map(([token, n]) => `${token}:${n}`).join(' ')}`);
}

const generic = new Set(readFileSync(new URL('generic-words.txt', FIXTURES), 'utf8').split(/\r?\n/).filter((line) => line !== ''));
const fetched: Record<Category, Fetched> = {
  countries: await cldr('territories'),
  languages: await cldr('languages'),
  demonyms: await wikidata(SPARQL.demonyms),
  ethnonyms: await wikidata(SPARQL.ethnonyms),
  religions: await wikidata(SPARQL.religions),
};
const licences = { cldr: await get(`${CLDR_PACKAGE}LICENSE`), wikidata: await get(CC0_TEXT) };

const date = new Date().toISOString().slice(0, 10);
const sources: Record<string, { query: string; date: string; licence: string; count: number }> = {};
for (const category of CATEGORIES) {
  const { labels, query, licence } = fetched[category];
  const counts = labelsPerToken(labels);
  const tokens = [...counts.keys()].filter((token) => !generic.has(token)).sort();
  writeFileSync(new URL(`${category}.txt`, FIXTURES), tokens.map((token) => `${token}\n`).join(''));
  sources[category] = { query, date, licence, count: tokens.length };
  review(category, counts, generic);
}
writeFileSync(new URL('LICENSE-cldr.txt', FIXTURES), licences.cldr);
writeFileSync(new URL('LICENSE-wikidata.txt', FIXTURES), licences.wikidata);
writeFileSync(new URL('sources.json', FIXTURES), `${JSON.stringify(sources, null, 2)}\n`);
