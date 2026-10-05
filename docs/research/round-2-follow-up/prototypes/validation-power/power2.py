import math, random
from statistics import NormalDist
N01 = NormalDist(); Phi, Phinv = N01.cdf, N01.inv_cdf
random.seed(12345)
def t_pdf(x, df): return math.exp(math.lgamma((df+1)/2)-math.lgamma(df/2))/math.sqrt(df*math.pi)*(1+x*x/df)**(-(df+1)/2)
def t_cdf(x, df, steps=4000):
    # integrate pdf from 0 to x (Simpson) + 0.5
    h = x/steps; s = t_pdf(0,df)+t_pdf(x,df)
    for i in range(1,steps): s += (4 if i%2 else 2)*t_pdf(i*h,df)
    return 0.5 + s*h/3
def t_ppf(q, df):
    lo, hi = 0.0, 50.0
    for _ in range(60):
        mid=(lo+hi)/2
        if t_cdf(mid,df) < q: lo=mid
        else: hi=mid
    return (lo+hi)/2
def binom_cdf(k, n, p): return sum(math.comb(n,i)*p**i*(1-p)**(n-i) for i in range(k+1))
def cp_lower(k, n, conf=0.95):
    # one-sided lower bound: smallest p with P(X>=k | p) >= 1-conf
    if k==0: return 0.0
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid=(lo+hi)/2
        if 1-binom_cdf(k-1,n,mid) < 1-conf: lo=mid
        else: hi=mid
    return (lo+hi)/2
print("A <-> d mapping (normal, equal variances): A = Phi(d/sqrt2)")
for d in (0.2,0.5,0.8,1.0,1.2): print(f"  d={d}: A={Phi(d/math.sqrt(2)):.3f}")
for A in (0.56,0.64,0.71): print(f"  A={A}: d={math.sqrt(2)*Phinv(A):.3f}")
def mwu_p(x, y):
    m, n = len(x), len(y)
    allv = sorted([(v,0) for v in x]+[(v,1) for v in y])
    r1 = sum(i+1 for i,(v,g) in enumerate(allv) if g==1)
    U = r1 - n*(n+1)/2   # U for y
    mu = m*n/2; sd = math.sqrt(m*n*(m+n+1)/12)
    z = (U-mu)/sd
    return 2*(1-Phi(abs(z))), U/(m*n)
def sim(n, A, alpha, reps=3000):
    d = math.sqrt(2)*Phinv(A); hits=0; Ahs=[]
    for _ in range(reps):
        x=[random.gauss(0,1) for _ in range(n)]; y=[random.gauss(d,1) for _ in range(n)]
        p, Ah = mwu_p(x,y); hits += p<alpha; Ahs.append(Ah)
    Ahs.sort()
    return hits/reps, Ahs[int(0.025*reps)], Ahs[int(0.975*reps)]
print("\nSimulated two-sided Mann-Whitney power (normal shift, 3000 reps/cell, asymptotic p)")
print("n/arm | alpha | A=0.56 | A=0.64 | A=0.71 | A=0.80")
for n in (10,20,30,50,100):
    for a in (0.05,0.01):
        row=[sim(n,A,a)[0] for A in (0.56,0.64,0.71,0.80)]
        print(f"{n:5d} | {a:5.2f} | " + " | ".join(f"{r:.2f}" for r in row))
def noether(A, alpha, power):
    z = Phinv(1-alpha/2)+Phinv(power); N = z*z/(3*(A-0.5)**2); return math.ceil(N/2)
print("\nNoether (1987) n per arm, two-sided MWU, equal allocation")
for a in (0.05,0.01):
    for pw in (0.8,0.9):
        print(f"  alpha={a}, power={pw}: " + ", ".join(f"A={A}: {noether(A,a,pw)}" for A in (0.56,0.64,0.71,0.80)))
print("\nMinimum detectable A at 80% power (Noether approx)")
for n in (10,20,30,50,100,200):
    f=lambda a: 0.5+(Phinv(1-a/2)+Phinv(0.8))/math.sqrt(6*n)
    print(f"  n/arm={n}: alpha=0.05 -> A>={f(0.05):.3f}; alpha=0.01 -> A>={f(0.01):.3f}")
print("\nSpread of A-hat (2.5%-97.5%) under null A=0.5 and true A=0.71")
for n in (20,50,100):
    for A in (0.5,0.71):
        _,lo,hi = sim(n,A,0.05,reps=3000)
        print(f"  n={n} trueA={A}: [{lo:.3f}, {hi:.3f}]")
print("\nAll/most seeds pass: one-sided 95% Clopper-Pearson lower bound on P(claim holds per seed)")
for n in (10,20,30,50,100,300):
    print(f"  {n}/{n}: >= {0.05**(1/n):.3f}  (rule of three: failure rate <= ~{3/n:.3f})")
for k,n in ((19,20),(18,20),(49,50),(48,50),(45,50),(95,100)):
    print(f"  {k}/{n}: >= {cp_lower(k,n):.3f}")
print("\nP(at least one failure observed) for true per-seed failure rate f")
for f in (0.01,0.02,0.05,0.10):
    print(f"  f={f}: n=20 -> {1-(1-f)**20:.2f}; n=50 -> {1-(1-f)**50:.2f}; n=100 -> {1-(1-f)**100:.2f}")
print("\n95% CI half-width of a mean in SD units (t-based)")
for n in (5,10,20,30,50,100,200,400):
    print(f"  n={n}: +/- {t_ppf(0.975,n-1)/math.sqrt(n):.3f} SD")
print("\nRuns for 95% CI half-width E (SD units), n=(1.96/E)^2")
for E in (0.5,0.25,0.2,0.1,0.05): print(f"  E={E} SD -> n={math.ceil((1.96/E)**2)}")
print("\nWald SPRT (Bernoulli): H0 p>=p0 ('holds') vs H1 p<=p1")
for p0,p1 in ((0.95,0.85),(0.99,0.95),(0.90,0.70)):
    for a in (0.05,0.01):
        b=a; upper=math.log((1-b)/a); lower=math.log(b/(1-a))
        sp=math.log(p1/p0); sf=math.log((1-p1)/(1-p0))
        print(f"  p0={p0},p1={p1},a=b={a}: accept 'holds' after {math.ceil(lower/sp)} straight passes; reject after {math.ceil(upper/sf)} straight fails; 1 fail costs ~{sf/(-sp):.1f} extra passes")
print("\nChernoff-Hoeffding/Okamoto n >= ln(2/delta)/(2 eps^2)")
for eps,dl in ((0.1,0.05),(0.05,0.05),(0.05,0.01),(0.02,0.05)):
    print(f"  eps={eps}, delta={dl}: n >= {math.ceil(math.log(2/dl)/(2*eps*eps))}")
