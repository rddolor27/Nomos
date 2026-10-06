// Screens generated names: profanity, Pokemon place/species edit distance, and "reads as a real language".
// Fixtures and third-party tools stay OUTSIDE the repo and are passed in as paths:
//   node names_screen.mjs <fixturesDir> <francAllModulePath>
// fixturesDir holds: emerald_sections.json, firered_sections.json (pret, test fixture only), species_names.h,
// ldnoobw/<lang> (LDNOOBW lists, CC BY 4.0), fmg_name_bases.ts (Fantasy Map Generator name bases, MIT).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CULTURES, word, hash32 } from './names.mjs';

const [fx, francPath] = process.argv.slice(2);
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// ---------- fixtures ----------
const GENERIC = new Set('town city route cave mt mount island islands sea forest tower tunnel road path lake ruins victory safari zone chamber hideout abandoned ship desert underwater battle frontier trainer hill rock power plant mansion house center centre school pokemon league gym the of and southern northern western eastern ocean area entrance strait bay cove falls fields field woods garden gate dock port harbor harbour hall valley canyon peak meadow island grove pass point outcast tree trench sky pillar ever grande'.split(' '));
const placeTok = new Set();
for (const f of ['emerald_sections.json', 'firered_sections.json']) {
  const j = JSON.parse(fs.readFileSync(path.join(fx, f), 'utf8'));
  // Emerald sections carry display names; FireRed's carry only ids such as MAPSEC_PALLET_TOWN.
  for (const s of j.map_sections) for (const w of (s.name || s.id.replace(/^MAPSEC_/, '')).split(/[^A-Za-z]+/)) { const t = norm(w); if (t.length >= 4 && !GENERIC.has(t)) placeTok.add(t); }
}
const species = new Set([...fs.readFileSync(path.join(fx, 'species_names.h'), 'utf8').matchAll(/_\("([A-Z.'\- ]+)"\)/g)].map(m => norm(m[1])).filter(s => s.length >= 3 && !/^q+$/.test(s)));
const LATIN = ['cs', 'da', 'de', 'en', 'eo', 'es', 'fi', 'fil', 'fr', 'fr-CA-u-sd-caqc', 'hu', 'it', 'nl', 'no', 'pl', 'pt', 'sv', 'tr'];
const bad = new Set();
for (const l of LATIN) for (const line of fs.readFileSync(path.join(fx, 'ldnoobw', l), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || /\s/.test(line.trim())) continue; const t = norm(line); if (t.length >= 3) bad.add(t);
}
const badArr = [...bad];

// ---------- filters ----------
function osa(a, b, max) { // optimal string alignment distance with early exit above max
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length, m = b.length; const d = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[n][m];
}
const near = (t, set, max) => { for (const p of set) if (osa(t, p, max) <= max) return p; return null; };
const banned = t => t.includes('poke') || t.endsWith('mon') || t.endsWith('mons');
const profExact = t => bad.has(t);
const profSub = (t, minLen) => badArr.some(b => b.length >= minLen && t.includes(b));

// ---------- 1. rejection rates per culture ----------
const N = 5000, SEED = 20261006;
const res = { fixtures: { placeTokens: placeTok.size, species: species.size, profanityLatin: bad.size }, cultures: {} };
const byLen = {};
for (const c of Object.keys(CULTURES)) {
  const r = { n: 0, nullDraw: 0, banned: 0, profExact: 0, profSub4: 0, profSub3: 0, place2: 0, place1: 0, species2: 0, species1: 0, anyDefault: 0, unique: 0, examplesRejected: [] };
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const w = word(c, SEED, i, 1); r.n++;
    if (!w) { r.nullDraw++; continue; }
    const t = norm(w); seen.add(t);
    const L = Math.min(t.length, 9); byLen[L] ??= { n: 0, place2: 0, place1: 0, species2: 0 }; byLen[L].n++;
    const b = banned(t), pe = profExact(t), p4 = profSub(t, 4), p3 = profSub(t, 3);
    const pl2 = near(t, placeTok, 2), pl1 = pl2 ? near(t, placeTok, 1) : null, sp2 = near(t, species, 2), sp1 = sp2 ? near(t, species, 1) : null;
    r.banned += b; r.profExact += pe; r.profSub4 += p4; r.profSub3 += p3; r.place2 += !!pl2; r.place1 += !!pl1; r.species2 += !!sp2; r.species1 += !!sp1;
    if (pl2) byLen[L].place2++; if (pl1) byLen[L].place1++; if (sp2) byLen[L].species2++;
    const rej = b || pe || p4 || !!pl2 || !!sp2; r.anyDefault += rej;
    if (rej && r.examplesRejected.length < 6) r.examplesRejected.push(`${w}${pl2 ? '~' + pl2 : ''}${sp2 ? '~' + sp2 : ''}${p4 ? '~prof' : ''}${b ? '~ban' : ''}`);
  }
  r.unique = seen.size;
  for (const k of ['banned', 'profExact', 'profSub4', 'profSub3', 'place2', 'place1', 'species2', 'species1', 'anyDefault']) r[k + '_pct'] = +(100 * r[k] / r.n).toFixed(2);
  res.cultures[c] = r;
}
res.byLength = Object.fromEntries(Object.entries(byLen).map(([L, v]) => [L, { n: v.n, place2_pct: +(100 * v.place2 / v.n).toFixed(1), place1_pct: +(100 * v.place1 / v.n).toFixed(1), species2_pct: +(100 * v.species2 / v.n).toFixed(1) }]));

// ---------- 2. "reads as a real language": trigram similarity calibrated on FMG real-language bases ----------
const fmg = fs.readFileSync(path.join(fx, 'fmg_name_bases.ts'), 'utf8');
const bases = []; { const re = /name:\s*"([^"]+)",\s*i:\s*(\d+)[\s\S]*?b:\s*"([^"]*)"/g; let m; while ((m = re.exec(fmg))) { const i = +m[2]; if (i <= 31 || i === 42) bases.push({ name: m[1], names: m[3].split(',').map(norm).filter(s => s.length >= 2) }); } }
function tri(names) { const v = new Map(); for (const n of names) { const s = `^${n}$`; for (let i = 0; i + 3 <= s.length; i++) { const g = s.slice(i, i + 3); v.set(g, (v.get(g) || 0) + 1); } } return v; }
function cos(a, b) { let d = 0, na = 0, nb = 0; for (const [g, x] of a) { na += x * x; const y = b.get(g); if (y) d += x * y; } for (const y of b.values()) nb += y * y; return d / Math.sqrt(na * nb); }
const baseVec = bases.map(b => tri(b.names));
const self = bases.map((b, i) => { const h1 = b.names.filter((_, k) => hash32(7, i, k, 0) & 1), h2 = b.names.filter((_, k) => !(hash32(7, i, k, 0) & 1)); return cos(tri(h1), tri(h2)); });
const cross = []; for (let i = 0; i < bases.length; i++) for (let j = i + 1; j < bases.length; j++) cross.push(cos(baseVec[i], baseVec[j]));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
const halfN = 110; // compare corpora of similar size to a half base (bases hold 190-276 names)
res.trigram = { bases: bases.length, selfHalfSimilarity: { min: +q(self, 0).toFixed(3), median: +q(self, 0.5).toFixed(3) }, crossBase: { median: +q(cross, 0.5).toFixed(3), p90: +q(cross, 0.9).toFixed(3), p99: +q(cross, 0.99).toFixed(3), max: +q(cross, 1).toFixed(3) }, cultures: {} };
// Fixed-size samples so similarity is comparable: a culture sample vs each full base, and each half base vs the other bases.
for (const c of Object.keys(CULTURES)) {
  const names = []; for (let i = 0; names.length < halfN; i++) { const w = word(c, SEED + 1, i, 1); if (w) names.push(norm(w)); }
  const v = tri(names); const sims = baseVec.map((bv, i) => [bases[i].name, cos(v, bv)]).sort((a, b) => b[1] - a[1]);
  res.trigram.cultures[c] = sims.slice(0, 3).map(([n, s]) => `${n} ${s.toFixed(3)}`);
}
// Positive controls: a held-out half of each real base against all full bases (does the nearest base recover it?)
let hits = 0; const ctrl = [];
for (let i = 0; i < bases.length; i++) {
  const h = bases[i].names.filter((_, k) => hash32(9, i, k, 0) & 1); const v = tri(h);
  const others = baseVec.map((bv, j) => [bases[j].name, j === i ? cos(v, tri(bases[i].names.filter((_, k) => !(hash32(9, i, k, 0) & 1)))) : cos(v, bv)]).sort((a, b) => b[1] - a[1]);
  if (others[0][0] === bases[i].name) hits++; ctrl.push(`${bases[i].name}:${others[0][0]} ${others[0][1].toFixed(2)}/${others[1][1].toFixed(2)}`);
}
res.trigram.controlNearestIsSelf = `${hits}/${bases.length}`;
res.trigram.controlDetail = ctrl;

// ---------- 3. franc-all language ID on corpora (second opinion) ----------
if (francPath) {
  const { francAll } = await import(pathToFileURL(francPath).href);
  const top = (names) => francAll(names.join(' '), { minLength: 10 }).slice(0, 3).map(([l, s]) => `${l} ${s.toFixed(2)}`);
  res.franc = { controls: {}, cultures: {} };
  for (const b of bases) res.franc.controls[b.name] = top(b.names.slice(0, 120));
  for (const c of Object.keys(CULTURES)) { const names = []; for (let i = 0; names.length < 120; i++) { const w = word(c, SEED + 2, i, 1); if (w) names.push(norm(w)); } res.franc.cultures[c] = top(names); }
}

// ---------- 3b. refined IP filter: distinctive town and city names only, threshold scaled by length ----------
const townTok = new Set();
for (const f of ['emerald_sections.json', 'firered_sections.json']) {
  const j = JSON.parse(fs.readFileSync(path.join(fx, f), 'utf8'));
  for (const s of j.map_sections) { const nm = s.name || s.id.replace(/^MAPSEC_/, '').replace(/_/g, ' '); if (/\b(TOWN|CITY)\b/.test(nm) || /EVER GRANDE/.test(nm)) for (const w of nm.split(/[^A-Za-z]+/)) { const t = norm(w); if (t.length >= 4 && !GENERIC.has(t)) townTok.add(t); } }
}
const maxEd = t => (t.length <= 5 ? 1 : 2);
res.refined = { townTokens: [...townTok].sort(), cultures: {} };
for (const c of Object.keys(CULTURES)) {
  let n = 0, town = 0, sp = 0, prof = 0, any = 0;
  for (let i = 0; i < N; i++) { const w = word(c, SEED, i, 1); if (!w) continue; n++; const t = norm(w);
    const a = !!near(t, townTok, maxEd(t)), b = !!near(t, species, maxEd(t)), p = banned(t) || profExact(t) || profSub(t, 4);
    town += a; sp += b; prof += p; any += a || b || p; }
  res.refined.cultures[c] = { town_pct: +(100 * town / n).toFixed(2), species_pct: +(100 * sp / n).toFixed(2), profanity_or_ban_pct: +(100 * prof / n).toFixed(2), any_pct: +(100 * any / n).toFixed(2) };
}

// ---------- 4. throughput ----------
let t0 = performance.now(), made = 0;
for (let i = 0; i < 200000; i++) if (word('D', SEED, i, 1)) made++;
const genMs = performance.now() - t0;
t0 = performance.now(); let passed = 0;
for (let i = 0; i < 2000; i++) { const w = word('D', SEED, i, 1); if (!w) continue; const t = norm(w); if (!banned(t) && !profExact(t) && !profSub(t, 4) && !near(t, placeTok, 2) && !near(t, species, 2)) passed++; }
const filtMs = performance.now() - t0;
res.throughput = { node: process.version, generate_per_ms: +(made / genMs).toFixed(0), generate_plus_filters_per_ms: +(2000 / filtMs).toFixed(2), passed_of_2000: passed };
console.log(JSON.stringify(res, null, 1));
