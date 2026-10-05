import array, struct, mpmath
from mpmath.libmp import to_float, round_nearest
def rd(p):
    a=array.array('d'); a.frombytes(open(p,'rb').read()); return a
X=rd('out/in_pow_x.bin'); Y=rd('out/in_pow_y.bin'); V=rd('out/v8new_pow_math.bin'); J=rd('out/jsc_pow_math.bin')
b=lambda x: struct.unpack('<q',struct.pack('<d',x))[0]
shown=0; agree_hi=0; tot=0
for i in range(len(X)):
    mpmath.mp.prec=160; r160=to_float(mpmath.power(mpmath.mpf(X[i]),mpmath.mpf(Y[i]))._mpf_, rnd=round_nearest)
    if b(r160)!=b(V[i]):
        tot+=1
        mpmath.mp.prec=600; r600=to_float(mpmath.power(mpmath.mpf(X[i]),mpmath.mpf(Y[i]))._mpf_, rnd=round_nearest)
        if b(r600)==b(V[i]): agree_hi+=1
        if shown<3: print('x=%r y=%r v8=%r jsc=%r ref160=%r ref600=%r'%(X[i],Y[i],V[i],J[i],r160,r600)); shown+=1
print('mismatches at 160 bits:',tot,' of which V8-15 equals 600-bit reference:',agree_hi)
