import math, random
from statistics import NormalDist
N01=NormalDist(); Phi, Phinv = N01.cdf, N01.inv_cdf
random.seed(99)
def mwu(x,y):
    m,n=len(x),len(y); allv=sorted([(v,0) for v in x]+[(v,1) for v in y])
    r=sum(i+1 for i,(v,g) in enumerate(allv) if g==1); U=r-n*(n+1)/2
    z=(U-m*n/2)/math.sqrt(m*n*(m+n+1)/12); return 2*(1-Phi(abs(z))), U/(m*n)
def two_stage(A, reps=4000, n1=20, n2=50):
    d=math.sqrt(2)*Phinv(A); holds=0; futile=0; seeds=0
    for _ in range(reps):
        x=[random.gauss(0,1) for _ in range(n2)]; y=[random.gauss(d,1) for _ in range(n2)]
        p,Ah=mwu(x[:n1],y[:n1])
        if p<0.001 and Ah>0.5: holds+=1; seeds+=2*n1; continue
        if Ah<0.55: futile+=1; seeds+=2*n1; continue
        p,Ah=mwu(x,y); seeds+=2*n2
        if p<0.01 and Ah>=0.64: holds+=1
    return holds/reps, futile/reps, seeds/reps
print("Two-stage rule: stage1 20/arm -> Holds if p<0.001; stop (not large) if A^<0.55; else 50/arm -> Holds if p<0.01 & A^>=0.64")
print("trueA | P(Holds) | P(stopped for futility at 20) | mean total runs (both arms)")
for A in (0.5,0.56,0.64,0.71,0.75,0.8,0.9):
    h,f,s=two_stage(A); print(f" {A:.2f} |   {h:.2f}   |   {f:.2f}   |   {s:.0f}")
# A-hat SE / CI half-width under null for equal n
print("\n95% half-width of A-hat near 0.5 (normal approx): 1.96*sqrt((2n+1)/(12 n^2))")
for n in (20,50,100,180,300): print(f"  n/arm={n}: +/- {1.96*math.sqrt((2*n+1)/(12*n*n)):.3f}")
print("\nFraction of unit hypercube inside inscribed ball (region OFAT designs around the centre can reach)")
for k in (2,3,5,10,15,20): print(f"  k={k}: {math.pi**(k/2)/math.gamma(k/2+1)*0.5**k:.2e}")
print("\nSeri&Secchi-style conservative setting, 2 groups: f=0.1 (d=0.2), alpha=0.01, power=0.95 -> n/arm =", math.ceil(2*(Phinv(0.995)+Phinv(0.95))**2/0.2**2))
print("CRN/paired design: effective d multiplier 1/sqrt(1-rho):", ", ".join(f"rho={r}: x{1/math.sqrt(1-r):.2f} (n needed x{1-r:.2f})" for r in (0.3,0.5,0.8)))
