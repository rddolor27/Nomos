// Rebuilds fixtures/name-bases.json, the sounds the shared mixed sound set learns from: Fantasy Map Generator's
// real-world name bases at a pinned commit, with its licence verbatim beside them. Needs the network, so it is run by
// hand and its output committed: tokens only, never the raw file.
import { writeFileSync } from 'node:fs';
import { FIXTURES } from '../src/filters/real-world.ts';
import { nameTokens } from '../src/text/fold.ts';
import { get, mergeSourceNotes } from './source-notes.ts';

const COMMIT = '546c41d37e1daf842df620139e3228553e2f0847';
const RAW = `https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/${COMMIT}/`;
const BASES_FILE = 'src/data/name-bases.ts';
// The 33 real-world bases: indices 0-31, by Azgaar, and 42, Levantine, by Avengium. Dopu's fantasy bases stay out.
const REAL_WORLD = [
  'German', 'English', 'French', 'Italian', 'Castillian', 'Ruthenian', 'Nordic', 'Greek', 'Roman', 'Finnic', 'Korean',
  'Chinese', 'Japanese', 'Portuguese', 'Nahuatl', 'Hungarian', 'Turkish', 'Amazigh', 'Arabic', 'Inuit', 'Basque',
  'Nigerian', 'Celtic', 'Mesopotamian', 'Iranian', 'Hawaiian', 'Karnataka', 'Quechua', 'Swahili', 'Vietnamese',
  'Cantonese', 'Mongolian', 'Levantine',
];
const CREDIT =
  'Name bases by Azgaar (real-world), Dopu (fantasy) and Avengium (additional), as name-bases.ts credits them; ' +
  'Nomos uses the 32 real-world bases and Levantine.';
const BASE = /name:\s*"([^"]+)",\s*i:\s*\d+[\s\S]*?b:\s*"([^"]*)"/g;

const source = await get(`${RAW}${BASES_FILE}`);
const found = new Map([...source.matchAll(BASE)].map((match) => [match[1], match[2]]));
const missing = REAL_WORLD.filter((name) => !found.has(name));
if (missing.length > 0) {
  throw new Error(`${BASES_FILE} at ${COMMIT} has no base named ${missing.join(', ')}; fix REAL_WORLD and report it`);
}

const bases = [...REAL_WORLD].sort().map((name): [string, string[]] => {
  const names = (found.get(name) ?? '').split(',');
  return [name, [...new Set(names.flatMap((place) => nameTokens(place)))].sort()];
});
// One base a line keeps diffs readable.
const json = `{\n${bases.map(([name, tokens]) => `  ${JSON.stringify(name)}: ${JSON.stringify(tokens)}`).join(',\n')}\n}\n`;
writeFileSync(new URL('name-bases.json', FIXTURES), json);
writeFileSync(new URL('LICENSE-fmg.txt', FIXTURES), await get(`${RAW}LICENSE`));

const count = bases.reduce((sum, [, tokens]) => sum + tokens.length, 0);
mergeSourceNotes({
  'name-bases': {
    query: `${RAW}${BASES_FILE}`,
    date: new Date().toISOString().slice(0, 10),
    licence: 'MIT',
    count,
    credit: CREDIT,
  },
});
for (const [name, tokens] of bases) console.log(`${name}: ${tokens.length}`);
console.log(`${bases.length} bases, ${count} tokens`);
