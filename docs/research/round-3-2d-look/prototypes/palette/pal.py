import json, re, itertools, math, ast
tol = json.load(open('tolpkg/tol_colors/colors.json'))['colorsets']
src = open('mpl_cm.py').read()
def petroff(n):
    blk = re.search(r'_petroff%d_data = \((.*?)\n\)' % n, src, re.S).group(1)
    return ['#'+h.upper() for h in re.findall(r'#\s*([0-9a-fA-F]{6})', blk)]
bok = open('bokeh_palettes.py').read()
okabe = list(ast.literal_eval(re.search(r"^Colorblind8 = (\(.*?\))", bok, re.M).group(1)))
# Machado 2009 severity 1.0 matrices (index 10) parsed from DaltonLens simulate.py
dl = open('daltonlens_simulate.py').read()
def mach(defname):
    blk = dl[dl.index('Deficiency.%s: {' % defname):]
    m = re.search(r'\n\s*10: np\.array\(\[(.*?)\]\)', blk, re.S).group(1)
    rows = re.findall(r'\[([^\[\]]+)\]', m)
    return [[float(v) for v in r.split(',')] for r in rows]
M = {'protan': mach('PROTAN'), 'deutan': mach('DEUTAN'), 'tritan': mach('TRITAN')}
PAL = {
 'Okabe-Ito (no black)': [c for c in okabe if c.upper() != '#000000'],
 'Tol bright': list(tol['bright'].values()),
 'Tol vibrant': list(tol['vibrant'].values()),
 'Tol muted': list(tol['muted'].values()),
 'Petroff6': petroff(6), 'Petroff8': petroff(8), 'Petroff10': petroff(10),
}
def lin(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def unlin(c): c=min(max(c,0.0),1.0); return 12.92*c if c <= 0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def lum(h): r,g,b = [lin(c) for c in hex2rgb(h)]; return 0.2126*r+0.7152*g+0.0722*b
def contrast(a,b): la,lb = sorted([lum(a),lum(b)], reverse=True); return (la+0.05)/(lb+0.05)
def sim(h, d):
    rgb = [lin(c) for c in hex2rgb(h)]
    if d == 'normal': out = rgb
    else: m = M[d]; out = [sum(m[i][j]*rgb[j] for j in range(3)) for i in range(3)]
    return [unlin(c) for c in out]
def lab(rgb):
    r,g,b = [lin(c) for c in rgb]
    X = (0.4124564*r+0.3575761*g+0.1804375*b)/0.95047; Y = (0.2126729*r+0.7151522*g+0.0721750*b); Z = (0.0193339*r+0.1191920*g+0.9503041*b)/1.08883
    f = lambda t: t**(1/3) if t > 216/24389 else (24389/27*t+16)/116
    fx,fy,fz = f(X),f(Y),f(Z); return (116*fy-16, 500*(fx-fy), 200*(fy-fz))
def de2000(l1,l2):
    L1,a1,b1=l1; L2,a2,b2=l2; C1=math.hypot(a1,b1); C2=math.hypot(a2,b2); Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7))); a1p=(1+G)*a1; a2p=(1+G)*a2
    C1p=math.hypot(a1p,b1); C2p=math.hypot(a2p,b2)
    h1p=math.degrees(math.atan2(b1,a1p))%360; h2p=math.degrees(math.atan2(b2,a2p))%360
    dLp=L2-L1; dCp=C2p-C1p
    dhp=0 if C1p*C2p==0 else (h2p-h1p if abs(h2p-h1p)<=180 else (h2p-h1p-360 if h2p-h1p>180 else h2p-h1p+360))
    dHp=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dhp/2))
    Lbp=(L1+L2)/2; Cbp=(C1p+C2p)/2
    hbp=h1p+h2p if C1p*C2p==0 else ((h1p+h2p)/2 if abs(h1p-h2p)<=180 else ((h1p+h2p+360)/2 if h1p+h2p<360 else (h1p+h2p-360)/2))
    T=1-0.17*math.cos(math.radians(hbp-30))+0.24*math.cos(math.radians(2*hbp))+0.32*math.cos(math.radians(3*hbp+6))-0.20*math.cos(math.radians(4*hbp-63))
    dth=30*math.exp(-((hbp-275)/25)**2); Rc=2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    Sl=1+0.015*(Lbp-50)**2/math.sqrt(20+(Lbp-50)**2); Sc=1+0.045*Cbp; Sh=1+0.015*Cbp*T; Rt=-math.sin(math.radians(2*dth))*Rc
    return math.sqrt((dLp/Sl)**2+(dCp/Sc)**2+(dHp/Sh)**2+Rt*(dCp/Sc)*(dHp/Sh))
VIS = ['normal','protan','deutan','tritan']
def mind(cols):
    res = {}
    for v in VIS:
        L = [lab(sim(c,v)) for c in cols]
        res[v] = min(de2000(L[i],L[j]) for i in range(len(L)) for j in range(i+1,len(L)))
    return res
BGS = ['#000000','#0B0F14','#121212','#1E1E1E']
print('Machado sev1.0 deutan row0:', M['deutan'][0])
print('\n== Contrast of each colour vs dark backgrounds (WCAG ratio; 1.4.11 needs >= 3:1)')
for name, cols in PAL.items():
    print(f'{name}:', ', '.join(f"{c} {contrast(c,'#0B0F14'):.1f}" for c in cols), ' [vs #0B0F14]')
print('\n== Best subsets: maximise worst-case min pairwise CIEDE2000 over normal/protan/deutan/tritan; all colours >= 3:1 vs #121212')
for k in (4,5,6):
    print(f'-- k={k}')
    for name, cols in PAL.items():
        ok = [c for c in cols if contrast(c,'#121212') >= 3.0]
        best = None
        for sub in itertools.combinations(ok, k):
            m = mind(sub); w = min(m.values())
            if best is None or w > best[0]: best = (w, sub, m)
        if best: print(f'{name:22s} worst={best[0]:5.1f}  {" ".join(best[1])}  ' + ' '.join(f'{v}={best[2][v]:.1f}' for v in VIS))
        else: print(f'{name:22s} (fewer than {k} colours pass 3:1)')
