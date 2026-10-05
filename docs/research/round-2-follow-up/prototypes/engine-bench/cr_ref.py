# Correctly rounded (round-to-nearest-even) reference via mpmath at 160-bit precision; compare each engine's outputs.
import struct, array, sys
from multiprocessing import Pool
import mpmath
from mpmath.libmp import to_float, round_nearest
mpmath.mp.prec = 160
def rd(path):
    a = array.array('d'); a.frombytes(open(path,'rb').read()); return a
CASES = {  # name: (inputs, mpmath fn)
 'sin_small': (['sin_small'], lambda x: mpmath.sin(x)),
 'sin_mid':   (['sin_mid'],   lambda x: mpmath.sin(x)),
 'cos_mid':   (['sin_mid'],   lambda x: mpmath.cos(x)),
 'exp':       (['exp'],       lambda x: mpmath.exp(x)),
 'ln':        (['ln'],        lambda x: mpmath.log(x)),
 'pow':       (['pow_x','pow_y'], lambda x,y: mpmath.power(x,y)),
 'atan2':     (['atan2_y','atan2_x'], lambda y,x: mpmath.atan2(y,x)),
 'hypot':     (['hypot_x','hypot_y'], lambda x,y: mpmath.hypot(x,y)),
}
N = int(sys.argv[1]) if len(sys.argv) > 1 else 100000
def work(name):
    ins, fn = CASES[name]
    arrs = [rd(f'out/in_{k}.bin') for k in ins]
    ref = array.array('d')
    for i in range(N):
        args = [mpmath.mpf(a[i]) for a in arrs]
        ref.append(to_float(fn(*args)._mpf_, rnd=round_nearest))
    return name, ref
def bits(x): return struct.unpack('<q', struct.pack('<d', x))[0]
if __name__ == '__main__':
    with Pool(4) as p: res = dict(p.map(work, list(CASES)))
    impls = [('V8 12.4 Math (node 22)','v8','math'), ('V8 15.0 Math (deno 2.9.7)','v8new','math'), ('JSC Math (bun 1.3.14, glibc)','jsc','math'), ('@stdlib (any engine)','v8','stdlib')]
    print(f'N={N} inputs per case; % of results NOT correctly rounded (max ulp error vs CR reference)')
    print('case'.ljust(10) + ''.join(n.ljust(32) for n,_,_ in impls))
    for name in CASES:
        ref = res[name]; row = name.ljust(10)
        for label, tag, impl in impls:
            out = rd(f'out/{tag}_{name}_{impl}.bin'); bad = 0; mx = 0
            for i in range(N):
                d = abs(bits(out[i]) - bits(ref[i]))
                if d: bad += 1; mx = max(mx, d)
            row += f'{100*bad/N:6.2f}% (max {mx} ulp)'.ljust(32)
        print(row)
