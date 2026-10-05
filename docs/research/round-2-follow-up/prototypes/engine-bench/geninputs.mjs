// Generate identical inputs for all engines using only + - * / on seeded sfc32 output (no Math.* transcendental calls).
import { writeFileSync } from 'node:fs';
function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;let t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=c<<21|c>>>11;c=c+t|0;return (t>>>0)/4294967296;};}
const N = 100000;
const r = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, 12345);
for (let i=0;i<64;i++) r();
const u = () => r() + r()/4294967296; // ~53-bit uniform in [0,1)
const pow2 = new Float64Array(121); // 2^-60 .. 2^60 built exactly
pow2[60]=1; for(let k=61;k<121;k++) pow2[k]=pow2[k-1]*2; for(let k=59;k>=0;k--) pow2[k]=pow2[k+1]/2;
const sets = {
  sin_small: () => (u()*2-1)*6.283185307179586,   // [-2pi, 2pi]
  sin_mid:   () => (u()*2-1)*1000,                // [-1e3, 1e3]
  exp:       () => (u()*2-1)*50,                  // [-50, 50]
  ln:        () => (0.5+u()) * pow2[20 + Math.floor(u()*81)], // log-uniform-ish 2^-41 .. 2^41 (floor is exact)
  pow_x:     () => u()*10 + 1e-3,                  // base (0,10]
  pow_y:     () => (u()*2-1)*10,                  // exponent [-10,10]
  atan2_y:   () => (u()*2-1)*1000,
  atan2_x:   () => (u()*2-1)*1000,
  hypot_x:   () => (u()*2-1)*1000,
  hypot_y:   () => (u()*2-1)*1000,
};
const out = {};
for (const [k,g] of Object.entries(sets)) { const a=new Float64Array(N); for(let i=0;i<N;i++) a[i]=g(); out[k]=a; writeFileSync(`out/in_${k}.bin`, Buffer.from(a.buffer)); }
console.log('wrote inputs', Object.keys(out).join(','), 'N=',N);
