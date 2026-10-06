// Share-link sizes, capacity and codec timings (round 9, question 3).
//   node bench.mjs sizes | capacity | timing | bomb
import { cpus, platform, release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { deflateRawSync } from 'node:zlib';
import {
  canonical, decodeColumns, deflate, encodeBinary, encodeColumns, encodeJson, encodeLayers, inflate, openLink, pack, shareLink, toUrl,
  unpack,
} from './codec.mjs';
import { MIXES, session } from './synth.mjs';

const PREFIX = 'https://nomos.example/#w1.';
const HEADER = { gen: 3, placeGen: 2, seed: 0x5eed0001, fingerprint: 0x24637520 };
const GRIDS = { 'reference 96x64': [96, 64], 'mesh stand-in 200x150': [200, 150] };
const SALTS = 20;
const med = v => { const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const fmt = v => `${med(v)} [${Math.min(...v)}-${Math.max(...v)}]`;
const urlChars = bytes => PREFIX.length + toUrl(bytes).length;

function env() {
  console.log(`node ${process.version} v8 ${process.versions.v8} zlib ${process.versions.zlib} | ${cpus()[0].model.trim()} x${cpus().length} | ${platform()} ${release()}`);
}

function sizes() {
  env();
  const encoders = {
    'JSON objects': ops => encodeJson(HEADER, ops),
    'JSON arrays': ops => encodeJson(HEADER, ops, true),
    'binary, absolute cells': ops => encodeBinary(HEADER, ops, false),
    'binary, delta cells': ops => encodeBinary(HEADER, ops, true),
    'binary columns, delta': ops => encodeColumns(HEADER, ops),
  };
  for (const [gridName, [width, height]] of Object.entries(GRIDS)) {
    for (const [mixName, mix] of Object.entries(MIXES)) {
      for (const n of [10, 100, 1000, 10000]) {
        if (mixName !== 'mixed' && n !== 1000) continue;
        const logs = Array.from({ length: SALTS }, (_, s) => session(s + 1, n, { width, height, mix }));
        console.log(`\n${gridName} | mix ${mixName} | ${n} ops | ${SALTS} logs | URL chars = ${PREFIX.length} prefix + base64url(deflate-raw level 9)`);
        for (const [name, enc] of Object.entries(encoders)) {
          const raw = logs.map(ops => enc(ops).length);
          const url = logs.map(ops => urlChars(deflate(enc(ops))));
          console.log(`  ${name.padEnd(26)} raw ${fmt(raw).padEnd(26)} URL chars ${fmt(url)}`);
        }
        const layered = logs.map(ops => urlChars(deflate(encodeLayers(HEADER, ops, width))));
        console.log(`  ${'per-cell override layers'.padEnd(26)} ${''.padEnd(30)} URL chars ${fmt(layered)}`);
        const bytesPerOp = logs.map(ops => Math.round(100 * deflate(encodeBinary(HEADER, ops)).length / n) / 100);
        console.log(`  binary delta, deflated bytes per op: ${fmt(bytesPerOp)}`);
      }
    }
  }
}

function capacity() {
  env();
  const limits = [2000, 8000, 16000];
  for (const [gridName, [width, height]] of Object.entries(GRIDS)) {
    for (const [mixName, mix] of Object.entries(MIXES)) {
      for (const [encName, enc] of [['columns', encodeColumns], ['rows', encodeBinary]]) {
        const best = Object.fromEntries(limits.map(l => [l, []]));
        for (let s = 1; s <= SALTS; s++) {
          const all = session(s, 20000, { width, height, mix });
          const len = n => urlChars(deflate(enc(HEADER, all.slice(0, n))));
          for (const limit of limits) {
            let lo = 0, hi = all.length;
            while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (len(mid) <= limit) lo = mid; else hi = mid - 1; }
            best[limit].push(lo);
          }
        }
        console.log(`${gridName.padEnd(22)} mix ${mixName.padEnd(8)} ${encName.padEnd(7)} ops that fit: ` + limits.map(l => `${l} chars ${fmt(best[l])}`).join(' | '));
      }
    }
  }
}

function time(fn, warm, samples) {
  for (let i = 0; i < warm; i++) fn();
  const t = [];
  for (let i = 0; i < samples; i++) { const a = performance.now(); fn(); t.push(performance.now() - a); }
  return t;
}

async function timeAsync(fn, warm, samples) {
  for (let i = 0; i < warm; i++) await fn();
  const t = [];
  for (let i = 0; i < samples; i++) { const a = performance.now(); await fn(); t.push(performance.now() - a); }
  return t;
}

const ms = v => `${med(v).toFixed(3)} ms [${Math.min(...v).toFixed(3)}-${Math.max(...v).toFixed(3)}]`;

async function streamBytes(stream, max = Infinity) {
  const reader = stream.getReader();
  const parts = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel(); throw new Error('too large'); }
    parts.push(value);
  }
  return Buffer.concat(parts);
}

const csEncode = async ops => toUrl(await streamBytes(new Blob([pack(HEADER, ops)]).stream().pipeThrough(new CompressionStream('deflate-raw'))));
const csDecode = async (b64, world) => unpack(await streamBytes(new Blob([Buffer.from(b64, 'base64url')]).stream().pipeThrough(new DecompressionStream('deflate-raw')), 1 << 20), world);

async function timing() {
  env();
  const world = { cells: 96 * 64 };
  for (const n of [10, 100, 1000, 10000]) {
    const ops = session(1, n);
    const [warm, samples] = n >= 10000 ? [20, 60] : [200, 400];
    const link = shareLink(PREFIX, HEADER, ops);
    const back = openLink(PREFIX, link, world);
    if (JSON.stringify(back.ops) !== JSON.stringify(canonical(ops))) throw new Error('round trip differs');
    const enc = time(() => shareLink(PREFIX, HEADER, ops), warm, samples);
    const dec = time(() => openLink(PREFIX, link, world), warm, samples);
    const b64 = link.slice(PREFIX.length);
    const cenc = await timeAsync(() => csEncode(ops), Math.min(warm, 50), Math.min(samples, 100));
    const cdec = await timeAsync(() => csDecode(b64, world), Math.min(warm, 50), Math.min(samples, 100));
    console.log(`${String(n).padStart(5)} ops, ${link.length} chars | zlib sync: encode ${ms(enc)}, decode ${ms(dec)} (warm-up ${warm}, samples ${samples})`);
    console.log(`${''.padStart(5)}       ${''.padStart(String(link.length).length)}       | CompressionStream: encode ${ms(cenc)}, decode ${ms(cdec)} (warm-up ${Math.min(warm, 50)}, samples ${Math.min(samples, 100)})`);
  }
}

async function bomb() {
  env();
  const zeros = Buffer.alloc(64 << 20);
  const packed = deflateRawSync(zeros, { level: 9 });
  const link = PREFIX + toUrl(packed);
  console.log(`64 MiB of zeros deflate to ${packed.length} B (${(zeros.length / packed.length).toFixed(0)}:1); as a link ${link.length} chars`);
  let t = performance.now();
  try { openLink(PREFIX, link, { cells: 6144 }); } catch (e) { console.log(`openLink, default 32 KiB char cap: rejected in ${(performance.now() - t).toFixed(3)} ms (${e.message})`); }
  t = performance.now();
  try { openLink(PREFIX, link, { cells: 6144 }, 1 << 20); } catch (e) { console.log(`openLink, 1 Mi char cap and 1 MiB byte cap: rejected in ${(performance.now() - t).toFixed(2)} ms (${e.code ?? e.message})`); }
  t = performance.now();
  try { inflate(packed, 1 << 20); } catch (e) { console.log(`inflateRawSync maxOutputLength 1 MiB: rejected in ${(performance.now() - t).toFixed(2)} ms (${e.code ?? e.message})`); }
  t = performance.now();
  try { await streamBytes(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')), 1 << 20); } catch (e) { console.log(`DecompressionStream with a byte counter: rejected in ${(performance.now() - t).toFixed(2)} ms (${e.message})`); }
  t = performance.now();
  const full = inflate(packed, 1 << 30).length;
  console.log(`inflate without a useful cap: ${full} B in ${(performance.now() - t).toFixed(1)} ms`);
}

function corrupt() {
  env();
  const world = { cells: 96 * 64 };
  const plain = s => decodeColumns(inflate(Buffer.from(s, 'base64url')), world);
  const tally = { plain: { rejected: 0, wrong: 0 }, crc: { rejected: 0, wrong: 0 } };
  let changes = 0, cuts = 0, cutsAccepted = 0, extra = [];
  for (let salt = 1; salt <= SALTS; salt++) {
    const ops = session(salt, 200);
    const want = JSON.stringify(canonical(ops));
    const bare = toUrl(deflate(encodeColumns(HEADER, ops)));
    const link = shareLink(PREFIX, HEADER, ops);
    extra.push(link.length - PREFIX.length - bare.length);
    for (const [name, text, open] of [['plain', bare, plain], ['crc', link.slice(PREFIX.length), s => openLink(PREFIX, PREFIX + s, world)]]) {
      for (let i = 0; i < 500; i++) {
        const p = (i * 7919 + salt) % text.length;
        const ch = 'AZaz09-_QxM3'[(i * 31 + salt) % 12];
        if (text[p] === ch) continue;
        if (name === 'plain') changes++;
        try { if (JSON.stringify(open(text.slice(0, p) + ch + text.slice(p + 1)).ops) !== want) tally[name].wrong++; } catch { tally[name].rejected++; }
      }
    }
    for (let cut = 1; cut < link.length - PREFIX.length; cut += 3) {
      cuts++;
      try { openLink(PREFIX, link.slice(0, PREFIX.length + cut), world); cutsAccepted++; } catch { /* rejected */ }
    }
  }
  console.log(`single-character changes per variant: ${changes} (20 logs of 200 ops)`);
  for (const [name, t] of Object.entries(tally)) console.log(`  ${name.padEnd(5)} rejected ${t.rejected}, decoded to a different world ${t.wrong}`);
  console.log(`truncations of CRC links: ${cuts}, accepted ${cutsAccepted}; CRC adds ${fmt(extra)} chars`);
}

const mode = process.argv[2] ?? 'sizes';
await { sizes, capacity, timing, bomb, corrupt }[mode]();
