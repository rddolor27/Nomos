import { readFileSync } from 'node:fs';
const rd = f => new BigUint64Array(new Uint8Array(readFileSync(f)).buffer);
const names = ['sin_small','sin_mid','cos_mid','exp','ln','pow','atan2','hypot'];
function cmp(a,b){ let d=0, maxUlp=0n; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]){ d++; const u = a[i]>b[i]? a[i]-b[i] : b[i]-a[i]; if (u>maxUlp) maxUlp=u; } } return {d, pct:(100*d/a.length).toFixed(2)+'%', maxUlp: maxUlp.toString()}; }
console.log('case'.padEnd(10), '| Math V8 vs Math JSC | stdlib V8 vs stdlib JSC | Math V8 vs stdlib | Math JSC vs stdlib');
for (const n of names) {
  const mv=rd(`out/v8_${n}_math.bin`), mj=rd(`out/jsc_${n}_math.bin`), sv=rd(`out/v8_${n}_stdlib.bin`), sj=rd(`out/jsc_${n}_stdlib.bin`);
  const f = r => `${r.d} (${r.pct}, max ${r.maxUlp} ulp)`;
  console.log(n.padEnd(10), '|', f(cmp(mv,mj)).padEnd(28), '|', f(cmp(sv,sj)).padEnd(24), '|', f(cmp(mv,sv)).padEnd(26), '|', f(cmp(mj,sj)));
}
