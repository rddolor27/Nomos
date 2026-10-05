import json, math, numpy as np, csv
g=json.load(open('ny_counties.geojson'))
pop={}; cen={}
for f in g['features']:
    p=f['properties']; tid=str(p.get('tile_id') or p.get('tile_ID'))
    pop[tid]=p['population']
    geom=f['geometry']; coords=[]
    polys=geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
    for poly in polys:
        coords+=poly[0]
    xs=[c[0] for c in coords]; ys=[c[1] for c in coords]
    cen[tid]=(sum(xs)/len(xs), sum(ys)/len(ys))
def hav(a,b):
    p=math.pi/180; dlat=(b[1]-a[1])*p; dlon=(b[0]-a[0])*p
    h=math.sin(dlat/2)**2+math.cos(a[1]*p)*math.cos(b[1]*p)*math.sin(dlon/2)**2
    return 2*6371*math.asin(math.sqrt(h))
flows={}
for r in csv.DictReader(open('ny_flows.csv')):
    flows[(r['origin'],r['destination'])]=float(r['flow'])
tot=sum(flows.values()); self_=sum(v for (o,d),v in flows.items() if o==d)
print(f'NY 2011 county commuting: total workers in table {tot:,.0f}; share working in home county {self_/tot:.3f}; counties {len(pop)}')
# distance-binned share
off=[(hav(cen[o],cen[d]),v) for (o,d),v in flows.items() if o!=d and o in cen and d in cen]
for lo,hi in [(0,25),(25,50),(50,100),(100,200),(200,1000)]:
    s=sum(v for dd,v in off if lo<=dd<hi); print(f'  inter-county commuters with centroid distance {lo}-{hi} km: {s/tot*100:.2f}% of all workers')
# log-linear gravity fit on positive inter-county flows: ln T = a + b1 ln Pi + b2 ln Pj + g ln d
X=[];Y=[]
for (o,d),v in flows.items():
    if o!=d and v>0 and o in pop and d in pop:
        X.append([1,math.log(pop[o]),math.log(pop[d]),math.log(hav(cen[o],cen[d]))]); Y.append(math.log(v))
X=np.array(X); Y=np.array(Y)
b,*_=np.linalg.lstsq(X,Y,rcond=None)
print('  OLS gravity (positive flows only): ln T = %.2f + %.2f ln Pop_o + %.2f ln Pop_d + %.2f ln dist ; n=%d'%(b[0],b[1],b[2],b[3],len(Y)))
# compare radiation vs singly-constrained gravity (power -2) using CPC
ids=sorted(pop); idx={k:i for i,k in enumerate(ids)}; n=len(ids)
D=np.array([[hav(cen[a],cen[b]) if a!=b else 0 for b in ids] for a in ids])
P=np.array([pop[k] for k in ids],float)
O=np.zeros(n); Tobs=np.zeros((n,n))
for (o,d),v in flows.items():
    if o!=d and o in idx and d in idx: Tobs[idx[o],idx[d]]=v
O=Tobs.sum(1)
def cpc(A,B): return 2*np.minimum(A,B).sum()/(A.sum()+B.sum())
M=P.sum(); Trad=np.zeros((n,n))
for i in range(n):
    order=np.argsort(D[i]); s=0.0
    for j in order:
        if j==i: continue
        Trad[i,j]=O[i]*(1/(1-P[i]/M))*P[i]*P[j]/((P[i]+s)*(P[i]+s+P[j])); s+=P[j]
for expo in [-1.0,-2.0,-3.0]:
    W=np.where(D>0,P[None,:]*np.where(D>0,D,1.0)**expo,0.0)
    Tg=O[:,None]*W/W.sum(1,keepdims=True)
    print(f'  singly-constrained gravity, distance exponent {expo}: CPC={cpc(Tobs,Tg):.3f}')
print(f'  radiation model (parameter-free, finite-size normalised): CPC={cpc(Tobs,Trad):.3f}')
