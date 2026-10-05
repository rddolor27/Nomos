import numpy as np
from scipy import stats
rng = np.random.default_rng(12345)
Phi, Phinv = stats.norm.cdf, stats.norm.ppf
print("A <-> d mapping (normal, equal var): A = Phi(d/sqrt2)")
for d in (0.2,0.5,0.8,1.0,1.2): print(f"  d={d}: A={Phi(d/np.sqrt(2)):.3f}")
for A in (0.56,0.64,0.71): print(f"  A={A}: d={np.sqrt(2)*Phinv(A):.3f}")
def sim_power(n, A, alpha, reps=4000):
    d = np.sqrt(2)*Phinv(A)
    x = rng.normal(0,1,(reps,n)); y = rng.normal(d,1,(reps,n))
    p = stats.mannwhitneyu(y, x, alternative='two-sided', axis=1, method='asymptotic').pvalue
    return (p < alpha).mean()
print("\nSimulated two-sided Mann-Whitney power (normal shift, 4000 reps/cell)")
print("n/arm | alpha | A=0.56 | A=0.64 | A=0.71 | A=0.80")
for n in (10,20,30,50,100,200):
    for a in (0.05,0.01):
        row=[sim_power(n,A,a) for A in (0.56,0.64,0.71,0.80)]
        print(f"{n:5d} | {a:5.2f} | " + " | ".join(f"{r:.2f}" for r in row))
def noether_n_per_arm(A, alpha, power):
    z = Phinv(1-alpha/2)+Phinv(power)
    N = z**2/(3*(A-0.5)**2)   # Noether 1987, equal allocation
    return int(np.ceil(N/2))
print("\nNoether (1987) n per arm for two-sided MWU")
for a in (0.05,0.01):
    for pw in (0.8,0.9):
        print(f"  alpha={a}, power={pw}: " + ", ".join(f"A={A}: {noether_n_per_arm(A,a,pw)}" for A in (0.56,0.64,0.71,0.80)))
def min_detectable_A(n, alpha, power):
    z = Phinv(1-alpha/2)+Phinv(power)
    return 0.5 + z/np.sqrt(3*2*n)
print("\nMinimum detectable A (Noether approx) at 80% power")
for n in (10,20,30,50,100):
    print(f"  n/arm={n}: alpha=0.05 -> A>={min_detectable_A(n,0.05,0.8):.3f}; alpha=0.01 -> A>={min_detectable_A(n,0.01,0.8):.3f}")
# Sampling variability of A-hat under H0 and at true A=0.71: 95% range
print("\nSpread of A-hat (2.5%-97.5%) when true A=0.71, and under null (A=0.5)")
for n in (20,50,100):
    for A in (0.5,0.71):
        d=np.sqrt(2)*Phinv(A); x=rng.normal(0,1,(4000,n)); y=rng.normal(d,1,(4000,n))
        U=stats.mannwhitneyu(y,x,axis=1,method='asymptotic').statistic; Ah=U/(n*n)
        print(f"  n={n} trueA={A}: A-hat 95% range [{np.quantile(Ah,0.025):.3f}, {np.quantile(Ah,0.975):.3f}]")
print("\nAll-seeds-pass binomial bounds (one-sided 95% Clopper-Pearson lower bound on P(holds))")
for n in (10,20,30,50,100,300):
    lb = 0.05**(1/n)
    print(f"  {n}/{n} pass: P(holds) >= {lb:.3f}; rule-of-three failure-rate upper bound ~ {3/n:.3f}")
for (k,n) in ((19,20),(18,20),(48,50),(45,50),(95,100)):
    lb = stats.beta.ppf(0.05, k, n-k+1)
    print(f"  {k}/{n} pass: one-sided 95% lower bound {lb:.3f}")
print("\nChance a claim with true per-seed failure rate f shows >=1 failure in n seeds")
for f in (0.01,0.02,0.05,0.10):
    print(f"  f={f}: n=20 -> {1-(1-f)**20:.2f}; n=50 -> {1-(1-f)**50:.2f}; n=100 -> {1-(1-f)**100:.2f}")
print("\nCI half-width of a mean, in SD units (t-based, 95%)")
for n in (5,10,20,30,50,100,200,400):
    print(f"  n={n}: +/- {stats.t.ppf(0.975,n-1)/np.sqrt(n):.3f} SD")
print("\nRuns for 95% CI half-width E (in SD units): n=(1.96/E)^2")
for E in (0.5,0.25,0.2,0.1,0.05): print(f"  E={E} SD -> n={int(np.ceil((1.96/E)**2))}")
print("\nWald SPRT: H0 p>=p0 (claim holds) vs H1 p<=p1; number of consecutive passes to accept H0, and passes needed per failure")
for p0,p1 in ((0.95,0.85),(0.99,0.95),(0.9,0.7)):
    for a,b in ((0.05,0.05),(0.01,0.01)):
        A_=np.log((1-b)/a); B_=np.log(b/(1-a))  # LR = L1/L0
        s_pass=np.log(p1/p0); s_fail=np.log((1-p1)/(1-p0))
        n_accept=int(np.ceil(B_/s_pass)); n_reject=int(np.ceil(A_/s_fail))
        print(f"  p0={p0},p1={p1},alpha=beta={a}: accept 'holds' after {n_accept} straight passes; reject after {n_reject} straight fails; each fail costs ~{s_fail/(-s_pass):.1f} extra passes")
print("\nChernoff-Hoeffding (Okamoto) bound n >= ln(2/delta)/(2 eps^2)")
for eps,delt in ((0.1,0.05),(0.05,0.05),(0.05,0.01),(0.02,0.05)):
    print(f"  eps={eps}, delta={delt}: n >= {int(np.ceil(np.log(2/delt)/(2*eps**2)))}")
