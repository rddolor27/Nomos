// Run in node (V8) or bun (JSC): compute outputs of Math.* and @stdlib, save bit patterns, time them.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = {
  sin: require('@stdlib/math-base-special-sin'), cos: require('@stdlib/math-base-special-cos'),
  exp: require('@stdlib/math-base-special-exp'), ln: require('@stdlib/math-base-special-ln'),
  pow: require('@stdlib/math-base-special-pow'), atan2: require('@stdlib/math-base-special-atan2'),
  hypot: require('@stdlib/math-base-special-hypot'),
};
const isDeno = typeof Deno !== 'undefined';
const engine = isDeno ? `deno${Deno.version.deno}-v8_${Deno.version.v8}` : (typeof Bun !== 'undefined') ? `bun${Bun.version}-jsc` : `node${process.versions.node}-v8_${process.versions.v8}`;
const tag = isDeno ? 'v8new' : (typeof Bun !== 'undefined') ? 'jsc' : 'v8';
const rd = k => new Float64Array(new Uint8Array(readFileSync(`out/in_${k}.bin`)).buffer);
const I = {}; for (const k of ['sin_small','sin_mid','exp','ln','pow_x','pow_y','atan2_y','atan2_x','hypot_x','hypot_y']) I[k]=rd(k);
const cases = [
  ['sin_small', 'sin', Math.sin, S.sin, ['sin_small']],
  ['sin_mid',   'sin', Math.sin, S.sin, ['sin_mid']],
  ['cos_mid',   'cos', Math.cos, S.cos, ['sin_mid']],
  ['exp',       'exp', Math.exp, S.exp, ['exp']],
  ['ln',        'ln',  Math.log, S.ln,  ['ln']],
  ['pow',       'pow', Math.pow, S.pow, ['pow_x','pow_y']],
  ['atan2',     'atan2', Math.atan2, S.atan2, ['atan2_y','atan2_x']],
  ['hypot',     'hypot', Math.hypot, S.hypot, ['hypot_x','hypot_y']],
];
const timing = {};
for (const [name, fname, mf, sf, ins] of cases) {
  const N = I[ins[0]].length;
  for (const [impl, f] of [['math', mf], ['stdlib', sf]]) {
    const o = new Float64Array(N);
    if (ins.length === 1) { const a = I[ins[0]]; for (let i=0;i<N;i++) o[i]=f(a[i]); }
    else { const a = I[ins[0]], b = I[ins[1]]; for (let i=0;i<N;i++) o[i]=f(a[i], b[i]); }
    writeFileSync(`out/${tag}_${name}_${impl}.bin`, Buffer.from(o.buffer));
    // Timing: fresh specialized loop per (function, impl) to avoid shared/megamorphic call-site feedback.
    const body = ins.length === 1
      ? 'return function(a, reps){ let s=0; for(let r=0;r<reps;r++){ for(let i=0;i<a.length;i++) s+=f(a[i]); } return s; }'
      : 'return function(a, b, reps){ let s=0; for(let r=0;r<reps;r++){ for(let i=0;i<a.length;i++) s+=f(a[i], b[i]); } return s; }';
    const loop = new Function('f', body)(f);
    const args = ins.length === 1 ? [I[ins[0]]] : [I[ins[0]], I[ins[1]]];
    let sink = 0; for (let w=0; w<3; w++) sink += loop(...args, 2); // warm-up (600k calls)
    const samples = [];
    for (let rep=0; rep<9; rep++) { const t0 = performance.now(); sink += loop(...args, 10); const t1 = performance.now(); samples.push((t1-t0)*1e6/(N*10)); }
    samples.sort((x,y)=>x-y);
    timing[`${name}/${impl}`] = { median_ns_per_call: +samples[4].toFixed(2), min: +samples[0].toFixed(2), max: +samples[8].toFixed(2), sink };
  }
}
writeFileSync(`out/timing_${tag}.json`, JSON.stringify({ engine, timing }, null, 1));
console.log(engine);
for (const [k,v] of Object.entries(timing)) console.log(k.padEnd(20), String(v.median_ns_per_call).padStart(7), 'ns/call (min', v.min, 'max', v.max+')');
