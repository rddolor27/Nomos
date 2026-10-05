import math, random
from statistics import NormalDist
N01=NormalDist(); Phi, Phinv = N01.cdf, N01.inv_cdf
random.seed(7)
def mwu(x,y):
    m,n=len(x),len(y); allv=sorted([(v,0) for v in x]+[(v,1) for v in y])
    r=sum(i+1 for i,(v,g) in enumerate(allv) if g==1); U=r-n*(n+1)/2
    z=(U-m*n/2)/math.sqrt(m*n*(m+n+1)/12); return 2*(1-Phi(abs(z))), U/(m*n)
def rule_rates(n, A, reps=3000):
    d=math.sqrt(2)*Phinv(A); c={'p01':0,'p01_A71':0,'p01_A64':0,'p05_A64':0}
    for _ in range(reps):
        x=[random.gauss(0,1) for _ in range(n)]; y=[random.gauss(d,1) for _ in range(n)]
        p,Ah=mwu(x,y)
        c['p01']+= p<0.01; c['p01_A71']+= (p<0.01 and Ah>=0.71); c['p01_A64']+=(p<0.01 and Ah>=0.64); c['p05_A64']+=(p<0.05 and Ah>=0.64)
    return {k:v/reps for k,v in c.items()}
print("P('Holds') under decision rules, by true A and seeds per arm (normal shift model, two-sided MWU)")
print("n  trueA | p<.01 | p<.01&A^>=.71 | p<.01&A^>=.64 | p<.05&A^>=.64")
for n in (20,50,100):
    for A in (0.5,0.56,0.64,0.71,0.75,0.80,0.90):
        r=rule_rates(n,A)
        print(f"{n:3d} {A:.2f}  | {r['p01']:.2f}  |     {r['p01_A71']:.2f}      |     {r['p01_A64']:.2f}      |    {r['p05_A64']:.2f}")
print("\nGSA run budgets (model runs = design points x seeds per point)")
for k in (10,15,20):
    print(f"k={k}: Morris r(k+1): r=10 -> {10*(k+1)}, r=20 -> {20*(k+1)}, r=50 -> {50*(k+1)} | "
          f"Sobol N(k+2): N=512 -> {512*(k+2)}, N=1024 -> {1024*(k+2)} | N(2k+2): N=512 -> {512*(2*k+2)}, N=1024 -> {1024*(2*k+2)}")
print("\nWall-clock hours on 6 parallel workers, for seconds-per-run t")
designs={'Morris k=20 r=20 x10 seeds':20*21*10,'Sobol k=20 N=512 (k+2) x10 seeds':512*22*10,
         'Sobol k=20 N=1024 (2k+2) x10 seeds':1024*42*10,'Sobol k=10 N=1024 (k+2) x5 seeds':1024*12*5,'LHS 1000 pts x10 seeds':10000}
for name,runs in designs.items():
    print(f"  {name}: {runs} runs -> " + ", ".join(f"t={t}s: {runs*t/6/3600:.1f} h" for t in (0.1,0.5,2.0,10.0)))
