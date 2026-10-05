import numpy as np, json, csv, re
rng=np.random.default_rng(42)
def fit(x,y,label,minpop=0):
    x=np.asarray(x,float); y=np.asarray(y,float)
    m=(x>minpop)&(y>0)&np.isfinite(x)&np.isfinite(y)
    zeros=int(((x>minpop)&(y<=0)).sum())
    x=x[m]; y=y[m]; n=len(x)
    lx=np.log(x); ly=np.log(y)
    b,a=np.polyfit(lx,ly,1)
    res=ly-(a+b*lx); r2=1-res.var()/ly.var()
    se=np.sqrt(res.var()*n/(n-2)/((lx-lx.mean())**2).sum())
    bs=[]
    for _ in range(2000):
        i=rng.integers(0,n,n); bs.append(np.polyfit(lx[i],ly[i],1)[0])
    lo,hi=np.percentile(bs,[2.5,97.5])
    print(f'{label:55s} n={n:5d} beta={b:5.3f}  95%CI(boot)=[{lo:5.3f},{hi:5.3f}]  +-1.96SE={1.96*se:5.3f}  R2={r2:4.2f}  dropped_zeros={zeros}')
    return b
def uk(fname,col):
    rows=list(csv.reader(open(fname),delimiter='\t'))
    h=rows[0]; j=h.index(col)
    x=[float(r[1]) for r in rows[1:] if len(r)>j]; y=[float(r[j]) for r in rows[1:] if len(r)>j]
    return x,y
print('--- UK (Arcaute et al. 2015 clusters, density threshold 14 ppl/ha, commuting 30%); P0 = all clusters, P50 = clusters >50k')
for col in [] and ['Income','NetIncome','Employed','Households','Dwellings','CarsVans','Patents','Train','Coach','Managers','Profess','Basic','AgricultHF','Manufact','FinanceInt']:
    for f,lab in [('uk/raw_data/SumsP0D14F30.txt','P0'),('uk/raw_data/SumsP50D14F30.txt','P50')]:
        x,y=uk(f,col); fit(x,y,f'UK {lab} {col}')
print('--- USA')
rows=[l.split('\t') for l in open('usa/USmetro_gdp_pop_2013').read().strip().split('\n')[1:]]
fit([float(r[1]) for r in rows],[float(r[2]) for r in rows],'USA MSA GDP 2013 (BEA)')
xs=[];ys=[]
for r in csv.reader(open('usa/metropolitan-miles.csv')):
    try:
        a=float(r[1].replace(',','').strip()); b=float(r[2].replace(',','').strip()); xs.append(a); ys.append(b)
    except: pass
fit(xs,ys,'USA urbanized areas road miles 2013 (FHWA HM-71)')
def acs(fname):
    d={}
    for r in list(csv.reader(open(fname)))[1:]:
        d[r[0]]=r[1:]
    return d
pop=acs('usa/us_2010_2022_population.csv'); inc=acs('usa/us_2010_2022_mean_inc_tot.csv'); tt=acs('usa/us_2010_2022_trav_time.csv')
for yi,yr in [(0,2010),(11,2022)]:
    x=[];y=[];x2=[];y2=[]
    for k in pop:
        try:
            p=float(pop[k][yi]); 
            if k in inc and inc[k][yi]: x.append(p); y.append(float(inc[k][yi]))
            if k in tt and tt[k][yi]: x2.append(p); y2.append(float(tt[k][yi]))
        except: pass
    fit(x,y,f'USA MSA mean household income (per household) ACS {yr}')
    fit(x2,y2,f'USA MSA aggregate travel time to work ACS {yr}')
print('--- Germany, Brazil, OECD')
for f,lab in [('germany/GERcity_gdp_pop_2012','Germany kreisfreie Staedte GDP 2012'),('germany/GERcounty_gdp_pop_2012','Germany all NUTS3 GDP 2012'),('oecd/OECD_gdp_pop_2010','OECD metro areas GDP 2010'),('oecd/OECD_patents_pop_2008','OECD metro areas patents 2008')]:
    rows=[l.split('\t') for l in open(f).read().strip().split('\n')[1:]]
    fit([float(r[1]) for r in rows],[float(r[2]) for r in rows],lab)
for f,key in [('brazil/json/data-GDP2010.json','gdp'),('brazil/json/data-externalCauses2010.json','externalCauses'),('brazil/json/data-aids2010.json','aids')]:
    d=json.load(open(f)); 
    k2=[k for k in list(d.values())[0].keys() if k not in ('name','population')][0]
    fit([v['population'] for v in d.values()],[v[k2] for v in d.values()],f'Brazil municipalities {k2} 2010 (all)')
    fit([v['population'] for v in d.values()],[v[k2] for v in d.values()],f'Brazil municipalities {k2} 2010 (pop>50k)',minpop=50000)
print('--- Eurostat urban audit cities, crimes')
def eu(fname):
    d={}
    rows=list(csv.reader(open(fname,encoding='latin-1')))
    h=rows[0]
    for r in rows[1:]:
        d[r[0]]={h[i]:r[i] for i in range(1,len(r))}
    return d
P=eu('eurostat/eu_1990_2023_population.csv')
def num(s):
    s=s.replace(',','').strip()
    try: return float(s)
    except: return None
for crime in ['burglaries','robberies','homicides','motortheft']:
    C=eu(f'eurostat/eu_2008_2020_{crime}.csv')
    for yr in ['2012','2016']:
        x=[];y=[]
        for c in C:
            if c in P:
                p=num(P[c].get(yr,'')); v=num(C[c].get(yr,''))
                if p and v is not None: x.append(p); y.append(v)
        fit(x,y,f'EU cities {crime} {yr}')
