import { readFileSync } from 'node:fs';
const rd = f => new BigUint64Array(new Uint8Array(readFileSync(f)).buffer);
const names = ['sin_small','sin_mid','cos_mid','exp','ln','pow','atan2','hypot'];
function cmp(a,b){ let d=0, maxUlp=0n; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]){ d++; const u = a[i]>b[i]? a[i]-b[i] : b[i]-a[i]; if (u>maxUlp) maxUlp=u; } } return `${(100*d/a.length).toFixed(2)}% (max ${maxUlp} ulp)`; }
console.log('case      | V8-15.0 Math vs V8-12.4 Math | V8-15.0 Math vs JSC Math | V8-15.0 Math vs stdlib | stdlib V8-15.0 vs stdlib V8-12.4 vs JSC');
for (const n of names) {
  const m15=rd(`out/v8new_${n}_math.bin`), m12=rd(`out/v8_${n}_math.bin`), mj=rd(`out/jsc_${n}_math.bin`), s15=rd(`out/v8new_${n}_stdlib.bin`), s12=rd(`out/v8_${n}_stdlib.bin`), sj=rd(`out/jsc_${n}_stdlib.bin`);
  console.log(n.padEnd(9), '|', cmp(m15,m12).padEnd(28), '|', cmp(m15,mj).padEnd(24), '|', cmp(m15,s15).padEnd(22), '|', cmp(s15,s12), '/', cmp(s15,sj));
}
