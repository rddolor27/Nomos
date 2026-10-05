import sharp from 'sharp';
const [,, inp, out, kind] = process.argv;
const t0 = performance.now();
let s = sharp(inp);
if (kind === 'avif') s = s.avif({ lossless: true, effort: 9 });
else if (kind === 'webp') s = s.webp({ lossless: true, effort: 6, quality: 100, exact: false });
await s.toFile(out);
console.log(JSON.stringify({ ms: performance.now() - t0, versions: sharp.versions }));
