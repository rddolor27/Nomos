import json, math
from collections import Counter
rows=json.load(open('cities.json'))
fc=Counter(r[2] for r in rows)
print('feature codes:', fc.most_common(15))
EXCL={'PPLX','PPLH','PPLQ','PPLW','PPLCH'}
def ols(x,y):
    n=len(x); mx=sum(x)/n; my=sum(y)/n
    sxx=sum((a-mx)**2 for a in x); sxy=sum((a-mx)*(b-my) for a,b in zip(x,y))
    b=sxy/sxx; return b
def zipf_est(pops, label):
    pops=sorted(pops, reverse=True)
    n=len(pops)
    # Gabaix-Ibragimov: ln(rank-1/2) = a - zeta ln(size); SE = zeta*sqrt(2/n)
    x=[math.log(p) for p in pops]; y=[math.log(i+1-0.5) for i in range(n)]
    zeta=-ols(x,y)
    se=zeta*math.sqrt(2.0/n)
    # Hill MLE with xmin = smallest
    xmin=pops[-1]
    hill=n/sum(math.log(p/xmin) for p in pops)
    return zeta,se,hill,n
res={}
for cc in ['US','GB','FR','DE','IT','ES','PL','JP','IN','BR','MX','NG','CN','ID','RU']:
    pops=[r[3] for r in rows if r[1]==cc and r[2] not in EXCL and r[3]>0]
    tot=sum(pops)
    cnt={k:sum(1 for p in pops if p>=k) for k in [1000,5000,10000,50000,100000,500000,1000000]}
    out=[cc, len(pops), round(tot/1e6,1)]
    s=[]
    for thr in [10000, 100000]:
        sel=[p for p in pops if p>=thr]
        if len(sel)>=10:
            z,se,h,n=zipf_est(sel,cc)
            s.append(f'zeta(>={thr//1000}k)={z:.2f}±{1.96*se:.2f} Hill={h:.2f} n={n}')
    print(cc, 'n_places>=1k:',cnt[1000], '>=5k:',cnt[5000],'>=10k:',cnt[10000],'>=50k:',cnt[50000],'>=100k:',cnt[100000],'>=500k:',cnt[500000],'>=1M:',cnt[1000000], 'sum pop (M):', round(tot/1e6,1))
    print('    ', ' | '.join(s))
    top=sorted(pops,reverse=True)[:5]
    print('     top5:', top, ' primacy ratio P1/P2=%.2f'%(top[0]/top[1]))
