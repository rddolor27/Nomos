// Procedural, fictional name generator per culture: syllable inventories plus simple phonotactics.
// Throwaway research code. Deterministic: every draw is a counter-based hash of (seed, entity, k).
// Names are display-only strings, built outside the sim core; nothing in the sim may read them.
// No gender: Nomos bodies have none, so no template or affix may encode it.

export function hash32(a, b, c, d) { // counter-based mix from Math.imul, xor and shifts
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h ^= b; h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= c; h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h ^= d; h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

// Weighted pick with integer weights (no floats needed).
function pick(items, weights, r) {
  let total = 0; for (const w of weights) total += w;
  let x = r % total;
  for (let i = 0; i < items.length; i++) { if (x < weights[i]) return items[i]; x -= weights[i]; }
  return items[items.length - 1];
}
// Rank "dropoff": earlier graphemes are commoner (weight 2n - i), as in many conlang word generators.
const drop = n => Array.from({ length: n }, (_, i) => 2 * n - i);

// Six example cultures. Inventories use only Latin letters; digraphs are kept rare on purpose.
// tpl: syllable templates and weights; coda: allowed final consonants; syl: syllable counts for given/family.
export const CULTURES = {
  A: { // open CV syllables with long vowels (a deliberate risk case: reads Polynesian or Finnic?)
    C: ['k', 'l', 'm', 'n', 'h', 'v', 't', 'r'], V: ['a', 'i', 'u', 'e', 'o', 'aa', 'ii', 'uu'],
    tpl: [['CV', 7], ['V', 1]], coda: [], syl: [[2, 5], [3, 4], [4, 1]], custom: 'given+family',
  },
  B: { // closed syllables with liquid and nasal codas (risk: generic European)
    C: ['d', 'r', 'l', 'm', 'b', 'v', 'g', 's', 't', 'n'], V: ['a', 'e', 'o', 'i', 'u'],
    tpl: [['CVC', 5], ['CV', 4], ['V', 1]], coda: ['n', 'r', 'l', 's'], syl: [[2, 7], [3, 3]], custom: 'given+parent',
  },
  C: { // three-vowel system, vowel-initial words common (risk: Quechua, Inuit, Arabic transliteration)
    C: ['k', 'q', 't', 'n', 'm', 'l', 's', 'w', 'y', 'p'], V: ['a', 'i', 'u'],
    tpl: [['CV', 5], ['V', 2], ['CVC', 3]], coda: ['n', 'q', 't', 'k'], syl: [[2, 5], [3, 5]], custom: 'given+place',
  },
  D: { // designed to be non-specific: mixed CV/CVC, common segments, no digraphs, vowel or n/l/r endings
    C: ['t', 'l', 'm', 'n', 'r', 'v', 'k', 's', 'f', 'd'], V: ['e', 'a', 'o', 'i', 'u'],
    tpl: [['CV', 6], ['CVC', 3], ['V', 1]], coda: ['l', 'n', 'r'], syl: [[2, 6], [3, 4]], custom: 'given+family',
  },
  E: { // designed: rare letter mix (z, f, y as vowel) without any one language's digraphs
    C: ['z', 'f', 'l', 'r', 'n', 'm', 'b', 't', 'p', 'v'], V: ['a', 'y', 'e', 'o', 'i'],
    tpl: [['CV', 5], ['CVC', 4], ['V', 1]], coda: ['n', 'l', 'f', 'r'], syl: [[2, 6], [3, 4]], custom: 'given+parent',
  },
  A2: { // culture A after one screen-and-revise pass: no long vowels or h, some closed syllables
    C: ['k', 'l', 'm', 'n', 't', 'r', 's', 'd'], V: ['a', 'e', 'i', 'o', 'u'],
    tpl: [['CV', 5], ['CVC', 3], ['V', 1]], coda: ['n', 'r', 's'], syl: [[2, 6], [3, 4]], custom: 'given+family',
  },
  G: { // moderately complex: 13 consonants, obstruent+liquid onsets, 6 vowel letters incl. y
    C: ['t', 'k', 'v', 'r', 'n', 'm', 's', 'p', 'd', 'l', 'f', 'b', 'z'], L: ['r', 'l'], V: ['e', 'a', 'o', 'i', 'y', 'u'],
    tpl: [['CV', 5], ['CVC', 3], ['CCV', 2], ['V', 1]], coda: ['n', 'r', 's', 'l', 'm'], syl: [[2, 6], [3, 4]], custom: 'given+family',
  },
  H: { // moderately complex: 12 consonants, v/z-heavy onsets, f and v codas, 5 vowels + ae digraph
    C: ['v', 'd', 'z', 'l', 'n', 'k', 't', 'r', 'm', 'g', 'f', 's'], L: ['r'], V: ['a', 'e', 'i', 'o', 'ae', 'u'],
    tpl: [['CVC', 4], ['CV', 4], ['CCV', 1], ['V', 1]], coda: ['n', 'v', 'r', 'f', 'd'], syl: [[2, 7], [3, 3]], custom: 'given+parent',
  },
  F: { // designed: open syllables, five vowels, voiced stops, no long vowels, ends in vowel
    C: ['b', 'd', 'g', 'l', 'm', 'n', 'r', 'w', 's', 'v'], V: ['o', 'a', 'e', 'i', 'u'],
    tpl: [['CV', 8], ['CVC', 2], ['V', 1]], coda: ['m', 'n'], syl: [[2, 5], [3, 5]], custom: 'given+place',
  },
};

// Global phonotactic bans (any culture): identical vowel graphemes clashing across syllables, and
// three vowels in a row. The IP and profanity filters live in the screen, not here.
function legal(s) { return !/[aeiouy]{3}/.test(s) && !/(.)\1\1/.test(s); }

export function word(cult, seed, entity, salt) {
  const k = CULTURES[cult];
  for (let attempt = 0; attempt < 16; attempt++) {
    let k0 = 0; const r = () => hash32(seed, entity, salt * 64 + attempt, k0++);
    const n = pick(k.syl.map(x => x[0]), k.syl.map(x => x[1]), r());
    let s = '';
    for (let i = 0; i < n; i++) {
      let t = pick(k.tpl.map(x => x[0]), k.tpl.map(x => x[1]), r());
      if (i > 0 && t[0] === 'V') t = 'C' + t; // no vowel-initial syllables word-internally (avoids hiatus)
      let onset = t[0] === 'C' ? pick(k.C, drop(k.C.length), r()) : '';
      if (t.startsWith('CC') && k.L) onset += pick(k.L, drop(k.L.length), r()); // obstruent + liquid clusters only
      const nucleus = pick(k.V, drop(k.V.length), r());
      const coda = t.endsWith('VC') && k.coda.length ? pick(k.coda, drop(k.coda.length), r()) : '';
      s += onset + nucleus + coda;
    }
    if (legal(s) && s.length >= 3 && s.length <= 10) return s[0].toUpperCase() + s.slice(1);
  }
  return null; // caller treats null as a rejection
}

// Full display name by naming custom. 'given+parent' uses the parent's given name with a neutral linker
// letter; 'given+place' uses the home place stem. All parts come from the same culture's generator.
export function fullName(cult, seed, person, parent, place) {
  const given = word(cult, seed, person, 1);
  const k = CULTURES[cult];
  if (!given) return null;
  if (k.custom === 'given+family') { const fam = word(cult, seed, parent, 2); return fam ? `${given} ${fam}` : null; }
  if (k.custom === 'given+parent') { const p = word(cult, seed, parent, 1); return p ? `${given} ${p}` : null; }
  const pl = word(cult, seed, place, 3); return pl ? `${given} of ${pl}` : null;
}
