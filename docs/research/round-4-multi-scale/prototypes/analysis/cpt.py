import json, math
rows=json.load(open('cities.json'))
EXCL={'PPLX','PPLH','PPLQ','PPLW','PPLCH'}
def hav(a,b):
    lon1,lat1=a; lon2,lat2=b
    p=math.pi/180; dlat=(lat2-lat1)*p; dlon=(lon2-lon1)*p
    h=math.sin(dlat/2)**2+math.cos(lat1*p)*math.cos(lat2*p)*math.sin(dlon/2)**2
    return 2*6371*math.asin(math.sqrt(h))
def study(sel, area, label):
    print(f'== {label}: {len(sel)} places >=1k, area {area} km2')
    for T in [1000,3000,10000,30000,100000,300000]:
        pts=[(r[4],r[5]) for r in sel if r[3]>=T]
        n=len(pts)
        if n<3: continue
        nn=[]
        for i,a in enumerate(pts):
            d=min(hav(a,b) for j,b in enumerate(pts) if j!=i)
            nn.append(d)
        nn.sort()
        med=nn[len(nn)//2]; mean=sum(nn)/n
        hexd=math.sqrt(2*area/(math.sqrt(3)*n))
        # Clark-Evans ratio: observed mean NN / expected under Poisson 0.5/sqrt(density)
        ce=mean/(0.5/math.sqrt(n/area))
        print(f'  >= {T:>7}: n={n:5d}  mean NN={mean:6.1f} km  median NN={med:6.1f} km  hex-lattice spacing={hexd:6.1f} km  Clark-Evans R={ce:4.2f}  area per place={area/n:8.0f} km2')
de=[r for r in rows if r[1]=='DE' and r[2] not in EXCL]
study(de, 357600, 'Germany')
# Bavaria + Baden-Wurttemberg (Christaller's southern Germany): admin codes 02 = Bavaria, 01 = BW in geonames
south=[r for r in rows if r[1]=='DE' and r[2] not in EXCL and r[6] in ('01','02')]
study(south, 70550+35750, 'Southern Germany (BW+Bavaria)')
ia=[r for r in rows if r[1]=='US' and r[2] not in EXCL and r[6]=='IA']
study(ia, 145746, 'Iowa')
