# Wealth beyond the cash wallet: balance sheets, calibration targets, accumulation, accounting and display (round 6, question 4)

Researched 5 Oct 2026. Scope: how wealth should work beyond cash, calibrated to real distributions. Resources, food quality and spoilage, happiness and the cost prototype belong to the other four researchers; meeting points are marked **Hand-off**.

Read this first.

- **Labels.** "opened" = I read the source or data file myself. "computed" = I derived the figure from opened data or from my own prototype. "measured here" = a timing I ran. "search summary" = seen only in a search result. "inference" = my reasoning.
- **Access this session.** Reachable: federalreserve.gov (SCF microdata, DFA), ecb.europa.eu (HFCS 2023 tables), sdmx.oecd.org (WDD, IDD, How's Life, Revenue Statistics), nber.org and arxiv.org PDFs, ourworldindata.org (WID mirror), fred.stlouisfed.org, unstats.un.org (SNA 2008), econstor.eu, piketty.pse.ens.fr, brookings.edu. Blocked: oecd.org web pages and aeaweb.org (403), ifn.se (403). The WID API needs a key, and wid.world's bulk file redirected to a landing page, so WID figures come from Our World in Data's copy.
- **Prototype.** The throwaway code is in `prototypes/wealth/` (`wealth.mjs` is the model, `policy.mjs` the slider runs, whose output is in `pol_E.txt` and `pol_U.txt`). It models household balance sheets in integer cents with keyed hash draws, ppm rates, lookup tables and exact double-entry cash. Its method is described in section c so it can be rebuilt under `prototypes/` if wanted.
- **Benchmark machine.** Node v24.18.0 (V8 13.6.233.17-node.50), AMD Ryzen 5 3600 desktop (12 threads), Windows 10. These are desktop timings, not phone timings.

---

## a) Asset types and balance sheets

### Takeaway

- **The bottom holds homes and cars, the middle holds homes and pensions, the top holds firms.** In the US SCF 2022, the bottom 50% own 2.2% of net worth. Their gross assets are 62% main home and 16% vehicles, with debts at 60% of assets. The top 1% hold 40% business equity, 31% stocks and funds and 7% main home, with debts at 2% of assets (computed).
- **Euro-area households are more real-asset heavy.** In HFCS 2023, real assets are 79.3% of gross assets: the main residence is 59.3% of real assets, other property 24.1% and self-employment businesses 10.9%. Mortgages are 88.3% of debt, and 41.5% of households hold any debt (opened).
- **National-accounts data agree on the shape.** In the Fed's DFA for 2026 Q2, the top 0.1% hold 57% of assets in equities and funds and 17% in private businesses. The bottom 50% hold 47% in real estate and 21% in consumer durables, with liabilities at 58% of assets (opened).
- **Nomos needs five asset lines and two debts:** cash and deposits, a home, other property (land, forests, mines), firm equity and durables, minus a mortgage and unsecured debt. Food stores are a memo line, as the SNA treats household stocks of consumer goods (inference).

### Cited Findings

- **SCF 2022 is still the latest survey.** The Fed's SCF page says the 2022 SCF "is the most recent survey conducted" ([SCF index](https://www.federalreserve.gov/econres/scfindex.htm), opened). Round 2's note expected SCF 2025 in late 2026; it is not out yet.
- **SCF 2022 Bulletin headline figures:** real median net worth rose 37% to $192,900, and the mean rose 23% to $1,063,700. The median home was worth "more than 4.6 times the median family income". The median leverage ratio (debt over assets, among debtors) fell to a 20-year low of 29.2% ([SCF 2023 Bulletin PDF](https://www.federalreserve.gov/publications/files/scf23.pdf), opened).
- **My SCF microdata run reproduces the Bulletin.** From the summary extract `SCFP2022.csv` (22,975 records, 5 implicates pooled, weights summing to 131.3M families) I get a median of $192,700 and a mean of $1,059,457. The Bulletin's $192,900 and $1,063,700 average the implicates separately ([SCF summary extract](https://www.federalreserve.gov/econres/files/scfp2022excel.zip), computed).
- **SCF 2022 portfolio by WID-style wealth group** (computed from the same file). Shares are of the group's gross assets; "equity" is directly held stocks, funds, bonds and managed accounts; "retirement" is retirement accounts plus cash-value life insurance.

  | Group | Net-worth share | Median NW | Median income | Median age | Own home | Debt / assets | Cash | Main home | Other property | Equity | Retirement | Business | Vehicles |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Bottom 50% | 2.2% | $27.0k | $43.2k | 43 | 39% | 0.60 | 6.5% | 61.8% | 2.5% | 1.2% | 9.0% | 1.0% | 16.4% |
  | Next 40% | 24.4% | $492k | $98.4k | 58 | 92% | 0.18 | 7.3% | 49.1% | 6.8% | 7.1% | 19.5% | 3.9% | 5.2% |
  | P90–99 | 38.3% | $3.34M | $281k | 62 | 95% | 0.06 | 6.2% | 21.5% | 9.1% | 21.8% | 22.7% | 15.8% | 1.6% |
  | Top 1% | 35.1% | $20.4M | $1.00M | 65 | 96% | 0.02 | 4.4% | 7.1% | 8.5% | 31.1% | 6.7% | 40.3% | 0.5% |

  Debt mix: mortgages are 63% of the bottom half's debt and installment loans 32%. Mortgages are 85–91% of debt for the next 49%.
- **SCF 2022 by net-worth decile** (computed): the bottom decile has a median net worth of −$9,800 and debts of 1.90× its assets. Vehicles are 30% and 47% of gross assets in deciles 1 and 2. The main home peaks at 68% of assets in deciles 4–5, and business equity jumps from 4.8% in decile 9 to 27.2% in decile 10.
- **HFCS 2023, euro area** ([HFCS statistical tables, wave 2023, June 2026](https://www.ecb.europa.eu/home/pdf/research/hfcn/HFCS_Statistical_Tables_Wave_2023_June_2026.zip), opened):
  - Table D1: real assets 79.3% and financial assets 20.7% of total assets. Real assets range from 72.8% (Finland) to 93.2% (Slovakia).
  - Table D2, shares of real assets: main residence 59.3%, other real estate 24.1%, vehicles 3.9%, valuables 1.8%, self-employment businesses 10.9%.
  - Table D3, shares of financial assets: deposits 44.1%, mutual funds 13.3%, bonds 3.0%, listed shares 9.7%, money owed to the household 1.8%, voluntary pensions and whole-life insurance 18.3%, other 9.8%.
  - Table E3: mortgages are 88.3% of liabilities (69.7% on the main residence, 18.7% on other property); non-mortgage debt is 11.7%, of which credit cards are 0.2%.
  - Table A1: 60.1% own their home (41.8% Germany to 91.6% Lithuania), and 41.5% hold debt.
  - Table H1: 20.6% applied for credit in 3 years, 11.0% of applicants were refused or cut back, and 6.6% are credit constrained.
- **The HFCS excludes public and occupational pensions.** The results report lists "private pensions" among the measured items ([HFCS 2023 results, Statistics Paper 53](https://www.ecb.europa.eu/pub/pdf/scpsps/ecb.sps53.en.pdf), opened).
- **Fed Distributional Financial Accounts, 2026 Q2** ([DFA levels CSV](https://www.federalreserve.gov/releases/z1/dataviz/download/dfa-networth-levels.csv), opened):
  - Net-worth shares: top 0.1% 15.0%, rest of top 1% 17.5% (32.5% together), next 9% 36.4%, next 40% 28.8%, bottom 50% 2.3%.
  - Top 0.1% assets: corporate equities and funds 57%, unincorporated businesses 17%, real estate 7%.
  - Bottom 50% assets: real estate 47%, consumer durables 21%, DC pensions 8%; liabilities are 58% of assets.
- **Where idiosyncratic return risk lives:** principal residences and private businesses plus investment real estate were 28.2% and 27% of US household wealth (2001 SCF, cited by Benhabib & Bisin) ([NBER w21924](https://www.nber.org/system/files/working_papers/w21924/w21924.pdf), opened).
- **Consumer durables are not SNA assets.** They "are not regarded as assets in the SNA", but their stock should appear "as a memorandum item in the balance sheet but not be integrated into the totals" (para 3.47; also 13.93) ([SNA 2008](https://unstats.un.org/unsd/nationalaccount/docs/SNA2008.pdf), opened). The SCF counts vehicles and the HFCS counts vehicles and valuables; the DFA counts consumer durables.

### Inferences

- **Minimal Nomos balance sheet per household:**
  - deposits, in exact cents;
  - one home or none, with an owned/rented flag;
  - other property titles (land, forest, mine), counted in integer units;
  - firm equity as integer shares in named firms;
  - durables as one integer-cent stock;
  - minus mortgage principal and unsecured debt, in exact cents.

  Agents keep their own pocket cash, which the M0 ledger already has.
- **Make firm ownership concentrated, not pooled.** Business equity is 40% of top-1% assets. Lengnick pays profits in proportion to household liquidity (round 2), which gives everyone the same return rate. Owner stakes in specific firms are the in-model source of the top tail (see section c).
- **Durables are the bottom half's main asset after housing.** In a pixel town they must stay abstract (an integer value, never a visible cart or bike that varies by owner), or rule 5 breaks (inference).
- **Hand-off to resources (question 1):** dwellings built from timber and stone enter the house registry. Land, forests and mines are property titles owned by households or firms, so resource rents become cent flows to owners. Other property is 6.8–9.1% of gross assets from the middle 40% to P90–99 (SCF, computed), so a small rentier class is realistic.

### Gaps

- HFCS composition by wealth decile was not opened; only country aggregates. The HFCS Statistics Paper describes changes by net-wealth quintile but gives no decile portfolio table.
- The SCF and HFCS exclude Social Security and defined-benefit pension wealth (HFCS also excludes occupational pensions). Including them would lower the measured concentration. Round 2's snippet said the top-10% share falls from 69% to about 60% with Social Security wealth (snippet, not re-checked).
- No low- or middle-income country survey was opened; WID gives only top shares there.

---

## b) Calibration targets

### Takeaway

- **Wealth Gini ≈ 2.1 × disposable-income Gini.** Across 21 countries the ratio runs 1.64–2.53 (median 2.13), and the two correlate at 0.66 (computed: HFCS 2023 and SCF 2022 against OECD IDD).
- **Ranges across rich countries:**
  - wealth Gini 0.47 (Slovakia) to 0.73 (Germany) in the euro area, and 0.83 in the US;
  - top-10% share 35–57% (HFCS surveys) or 45.5–69.5% (WID, which corrects the top);
  - top-1% share 14% (Netherlands) to 34.8% (US) in WID;
  - negative net worth 0.4% (Lithuania) to 12.1% (Finland), 3.6% in the euro area and 7.5% in the US (7.9% with zero);
  - median wealth over median income 2.74 (US) and 3.78 (euro area), 2.05 (Germany) to 10.2 (Malta).
- **Implied Pareto tails:** α runs from 1.24 (South Africa) to 2.05 (Netherlands), with the US at 1.43 and France and Germany at 1.48–1.50 (computed from WID top shares).
- **Use two presets with bands, not one point.** A euro-like preset (Gini about 0.69, top 10% about 52–58%, bottom 50% about 6%) and a US-like preset (Gini 0.83, top 10% about 73%, top 1% about 33–35%, bottom 50% about 2%).

### Cited Findings

- **SCF 2022, my computation** ([summary extract](https://www.federalreserve.gov/econres/files/scfp2022excel.zip), computed):
  - wealth Gini 0.830; income Gini 0.607 (prior-year income) and 0.559 ("usual" income);
  - top 1% 35.1%, top 5% 61.0%, top 10% 73.4%; bottom 50% 2.20%;
  - net worth ≤ 0 for 7.9% of families (< 0: 7.5%; exactly 0: 0.3%); below one month of income: 12.6%;
  - percentiles: P5 −$9,800, P10 $450, P25 $27,000, P50 $192,700, P75 $659,000, P90 $1.94M, P95 $3.80M, P99 $13.6M;
  - median NW ÷ median income 2.74; median of household ratios 2.61; mean ÷ mean 7.49;
  - homeownership 66.1%, any business 14.6%, any debt 77.4%;
  - weighted Spearman correlation of income and wealth ranks 0.63;
  - a threshold of 4× mean net worth ($4.24M) catches the top 4.5%; 10× mean catches the top 1.45%.
- **This confirms round 2's snippet-only "SCF wealth Gini about 0.83, top 1% about 35%"** ([economy-calibration notes](../../round-2-follow-up/notes/economy-calibration.md)).
- **HFCS 2023, Tables J4, F3, A1 and I1** ([statistical tables](https://www.ecb.europa.eu/home/pdf/research/hfcn/HFCS_Statistical_Tables_Wave_2023_June_2026.zip), opened):

  | Country | Wealth Gini | Top 10% | NW < 0 | Median NW (€k) | Median gross income (€k) | NW / income (computed) | Own home |
  |---|---|---|---|---|---|---|---|
  | Euro area | 0.685 | 51.8% | 3.6% | 140.1 | 37.1 | 3.78 | 60.1% |
  | Germany | 0.725 | 53.7% | 5.6% | 103.3 | 50.4 | 2.05 | 41.8% |
  | France | 0.679 | 50.7% | 1.8% | 149.0 | 36.2 | 4.12 | 57.2% |
  | Italy | 0.646 | 51.3% | 1.3% | 162.8 | 29.7 | 5.48 | 74.5% |
  | Spain | 0.674 | 52.7% | 5.3% | 151.6 | 29.2 | 5.19 | 72.1% |
  | Netherlands | 0.652 | 44.8% | 5.1% | 143.5 | 48.9 | 2.93 | 56.6% |
  | Finland | 0.707 | 51.8% | 12.1% | 96.0 | 45.7 | 2.10 | 64.0% |
  | Slovakia | 0.473 | 35.7% | 0.9% | 125.4 | 26.8 | 4.68 | 90.4% |

  Euro-area extremes: top-10% share 34.5% (Malta) to 57.4% (Latvia); negative wealth under 0.1% (Malta) to 12.1% (Finland). Negative wealth is concentrated among renters (7.9%) and under-35s (7.9%), and is near zero for outright owners.
- **HFCS euro-area trend 2010–2023:** Gini 68.2 → 69.7 (2014) → 68.5 (2023); top 10% 50.8% → 52.6% → 51.8%; bottom 50% 6.0% → 5.4% → 6.2%; P90/P50 4.7 → 5.3 → 5.0 ([Statistics Paper 53, Table 10](https://www.ecb.europa.eu/pub/pdf/scpsps/ecb.sps53.en.pdf), opened).
- **OECD Wealth Distribution Database**, latest year per country ([SDMX dataflow OECD.WISE.INE DSD_WEALTH@DF_WEALTH](https://sdmx.oecd.org/public/rest/data/OECD.WISE.INE,DSD_WEALTH@DF_WEALTH,1.0/all), opened):
  - top-10% share: Slovakia 32.6%, Czechia 39.1%, France 49.9%, Germany 55.5%, Netherlands 56.7%, Denmark 70.1%, US 75.1%;
  - top-1% share: Slovakia 8.1%, Germany 17.7%, Spain 22.1%, UK 22.6%, Netherlands 25.1%, Denmark 37.7%, US 37.4%;
  - bottom-40% share: negative in Denmark (−3.7%), Netherlands (−0.4%) and Norway (−0.8%); 0.6% in the US; 12.7% in Slovakia;
  - mean ÷ median: 1.3 (Slovakia) to 5.9 (US);
  - net wealth below 25% of the annual poverty line: US 17.2%, Germany 18.6%, France 11.1%, Norway 21.6%, Denmark 25.0%;
  - liquid financial assets below 25% of the annual poverty line (about three months): US 46.3%, Germany 34.5%, France 35.9%, Netherlands 11.0%.
- **WID wealth shares, 2024**, via Our World in Data, MICS method, updated 18 June 2026 ([OWID top 1%](https://ourworldindata.org/grapher/wealth-share-richest-1-percent), [top 10%](https://ourworldindata.org/grapher/wealth-share-richest-10-percent), opened data files):

  | Country | Top 1% | Top 10% | α (computed) |
  |---|---|---|---|
  | US | 34.8% | 69.5% | 1.43 |
  | France | 27.7% | 59.9% | 1.50 |
  | Germany | 27.9% | 58.5% | 1.48 |
  | UK | 21.3% | 57.1% | 1.75 |
  | Italy | 22.0% | 56.1% | 1.68 |
  | Netherlands | 14.0% | 45.5% | 2.05 |
  | Denmark | 20.8% | 50.3% | 1.62 |
  | Japan | 24.6% | 59.1% | 1.61 |
  | China | 30.4% | 68.0% | 1.54 |
  | Brazil | 39.5% | 71.9% | 1.35 |
  | South Africa | 54.9% | 85.7% | 1.24 |

  α comes from the Pareto identity S(1%)/S(10%) = 0.1^(1 − 1/α). The SCF gives α = 1.47 the same way (computed).
- **OECD disposable-income Gini, latest year** ([SDMX DSD_WISE_IDD@DF_IDD](https://sdmx.oecd.org/public/rest/data/OECD.WISE.INE,DSD_WISE_IDD@DF_IDD,/.A.INC_DISP_GINI+INC_MRKT_GINI......), opened): US 0.394 (market 0.506), Germany 0.307, France 0.299, Italy 0.325, Spain 0.312, Netherlands 0.311, Finland 0.279, Slovakia 0.213, UK 0.367.
- **Wealth versus earnings Gini:** in all cases wealth Ginis exceed earnings Ginis. For 9 countries with both, the average ratio of wealth Gini to earnings Gini is 1.73 (Benhabib & Bisin citing Davies et al. 2011) ([NBER w21924, footnote 56](https://www.nber.org/system/files/working_papers/w21924/w21924.pdf), opened).
- **Benhabib, Bisin & Luo** quote a US wealth Gini of 0.78, a top-1% share above 33% and a 5-year Shorrocks mobility index of 0.67–0.88 ([NBER w21721](https://www.nber.org/system/files/working_papers/w21721/w21721.pdf), opened).
- **Norway:** households with roughly zero net worth sit around the 15th percentile of the wealth distribution (Fagereng, Holm, Moll & Natvik) ([NBER w26588](https://www.nber.org/system/files/working_papers/w26588/w26588.pdf), opened).

### Inferences

- **Wealth versus income Gini (computed).** Over the 20 euro-area countries plus the US, the wealth/income Gini ratio is 1.64 (Lithuania) to 2.53 (Finland), median 2.13. The cross-country correlation is 0.66, and 0.51 for the euro area alone. The OLS slope is 1.29 wealth-Gini points per income-Gini point.
  - For Nomos's income targets: the plan's US Census money-income Gini of 0.49 pre-tax maps to wealth 0.83 (ratio 1.69). Its 0.45 post-tax maps to about 1.85.
  - So the M5 move from 0.49 to 0.45 income Gini predicts, by ratio, only about 0.07 lower wealth Gini in the long run. It takes decades (section c).
- **Homeownership and wealth inequality move opposite ways.** Across 22 euro-area countries the correlation is −0.70: about 0.037 lower Gini per 10 points of ownership (computed from HFCS A1 and J4).
- **Survey and tax data differ at the top.** HFCS top-10% shares for France, Germany, Italy and Spain are 50.7–53.7%. WID gives 56–60% for the same countries. Use WID or DFA for top-1% targets and surveys for the bottom half (inference).
- **Proposed preset bands** (inference, built from the figures above):

  | Statistic | Euro-like | US-like |
  |---|---|---|
  | Wealth Gini | 0.62–0.74 | 0.78–0.86 |
  | Top-10% share | 45–58% | 67–76% |
  | Top-1% share | 15–28% | 30–37% |
  | Bottom-50% share | 4–8% | 1–3% |
  | Net worth < 0 (or ≤ 0) | 1–6% | 6–10% |
  | Median wealth ÷ median income | 2–6 | 2.3–3.2 |
  | Homeownership | 50–75% | 60–70% |
  | Pareto α | 1.5–2.0 | 1.35–1.55 |

### Gaps

- The comparisons mix concepts: HFCS income is gross household income, while OECD IDD is equivalised disposable income per person. The ratio of about 2.1 is therefore approximate.
- WID shares are model-based (MICS). They are the best available top shares but are not survey facts.
- No developing-country wealth survey was opened. The South African and Brazilian α values rest on WID alone.
- SCF 2025 is not released yet; refresh the US preset when it is.

---

## c) Accumulation: saving, returns, inheritance, housing costs, credit and the minimal mechanism

### Takeaway

- **Saving rises with income, and "saving by holding" rises with wealth.**
  - SCF median saving rates go from −2% (bottom income quintile) to 27% (top quintile), 37% for the top 5% and 49% for the top 1% (Dynan, Skinner & Zeldes, opened).
  - Bottom-90% wealth holders save about 3% of income long-run but about 0% in 1986–2012. The top 1% save 20–25% long-run and 36% in 1986–2012 (Saez & Zucman, opened).
  - Norway's net saving is flat at about 7% across positive wealth. Gross saving, which includes held capital gains, rises to 35% for the top 1% (Fagereng et al., opened).
- **Returns:** housing 7.06% real a year (SD 9.9%), equity 6.88% (SD 21.8%), bonds 2.53% and bills 1.03% across 16 countries, 1870–2015 (Jordà et al., opened). Individual returns average 3.7% with an SD of 6.1%. They have a persistent component (SD 2.8 points) and rise with wealth (Fagereng, Guiso, Malacrino & Pistaferri, opened).
- **Inheritance is large in aggregate but small in most lives.** It is 50–60% of European private wealth around 2010 (Alvaredo et al., opened). Yet gifts and inheritances are only about 3% of lifetime inflows in Norway, 6–10% for the top 1% (Black et al., opened).
- **The minimal mechanism has four parts:**
  1. persistent earnings differences;
  2. saving that rises with income and wealth;
  3. persistent, idiosyncratic returns on illiquid assets;
  4. finite lives with bequests.

  Earnings alone give a wealth Gini near the earnings Gini (prototype 0.42–0.53). Removing return risk cuts the top-1% share to about a sixth (Benhabib et al., opened).
- **It converges too slowly to emerge in play.** In my prototype the Gini is half-way to its long-run value after 20 years and the top-1% share after 70 years. Random-growth theory gives 20.8–26 years on average and about 100 years in the tail (Gabaix et al., opened). Nomos must spawn the distribution and only maintain it.

### Cited Findings

**Saving**

- **Dynan, Skinner & Zeldes (2004 JPE)**, Table 3, median regressions for household heads aged 40–49 ([NBER w7906](https://www.nber.org/system/files/working_papers/w7906/w7906.pdf), opened):
  - SCF change-in-wealth saving: −2% in the bottom income quintile, 27% in the top quintile, 37% in the top 5%, 49% in the top 1%;
  - CEX income minus consumption: −22.6%, 15.1%, 26.9%, 34.8% and 45.5% by quintile;
  - PSID active saving: 0.0%, 1.9%, 4.8%, 5.4% and 10.6%; adding imputed pension and Social Security saving gives 8.6–23.0%.
  - "The rich do save more" holds with permanent-income proxies too.
- **Saez & Zucman (2016 QJE)** ([NBER w20625](https://www.nber.org/system/files/working_papers/w20625/w20625.pdf), opened):
  - Synthetic saving rates by wealth group: the bottom 90% save about 3% of income, the next 9% about 15% and the top 1% about 20–25%.
  - Bottom-90% saving fell from 5–10% in the late 1970s to about −5% in the mid-2000s, then about 0%.
  - Over 1986–2012 the bottom 90% saved 0% on average and the top 1% 36%.
  - Had the bottom 90% saved 3% a year over 1986–2012, they would own 30% of US wealth in 2012 instead of 23%.
- **Fagereng, Holm, Moll & Natvik** ([NBER w26588](https://www.nber.org/system/files/working_papers/w26588/w26588.pdf), opened):
  - The net saving rate (excluding capital gains) is "remarkably flat around seven percent" among households with positive wealth.
  - The gross rate rises "from around zero for households with zero net worth, to thirty-five percent for the top one percent".
  - Norway's wealth-to-income ratio rose from about 4 to 7 over 1995–2015, and "saving by holding" accounts for up to 80% of the rise.
- **Benhabib, Bisin & Luo** report synthetic saving rates against Saez–Zucman 2000–2009 ([NBER w21721, Table 5](https://www.nber.org/system/files/working_papers/w21721/w21721.pdf), opened). The table extracted out of column order; read with the text, the data are bottom 90% −4%, top 10–1% 9% and top 1% 35%. The model gives −5.65%, 29.3% and 42.2%.

**Returns**

- **Jordà, Knoll, Kuvshinov, Schularick & Taylor**, Table II, 16 countries, 1870–2015, real returns ([NBER w24112](https://www.nber.org/system/files/working_papers/w24112/w24112.pdf), opened):

  | Asset | Mean a year | SD | Geometric mean | Post-1950 mean |
  |---|---|---|---|---|
  | Bills | 1.03% | 6.00% | 0.83% | 0.88% |
  | Bonds | 2.53% | 10.69% | 1.97% | 2.79% |
  | Equity | 6.88% | 21.79% | 4.66% | 8.30% |
  | Housing | 7.06% | 9.93% | 6.62% | 7.42% |

  This is the working-paper version; housing returns are rental yield plus capital gains, net of costs. It cites Favilukis et al. for a 5–7% net real return on US housing.
- **Fagereng, Guiso, Malacrino & Pistaferri** (Norway, 20 years of tax records) ([NBER w22822](https://www.nber.org/system/files/working_papers/w22822/w22822.pdf), opened):
  - In 2013 the value-weighted mean return on wealth was 3.7% with an SD of 6.1%, and the P90–P10 gap was 500 basis points.
  - Median returns at the 90th wealth percentile exceed those at the 10th by 180 basis points.
  - Individual fixed effects have an SD of 2.8 points, with a P90–P10 gap of 6.4 points. They "account for 60% of the explained variation".
  - Below the 95th percentile the return–wealth correlation is mostly the persistent component; above it, mostly risk compensation.
  - Returns are mildly correlated across generations, with strong mean reversion.
- **Return dispersion by asset**, cited by Benhabib & Bisin ([NBER w21924](https://www.nber.org/system/files/working_papers/w21924/w21924.pdf), opened):
  - owner-occupied housing capital gains have an SD of about 15% a year (Case & Shiller) or 14% (Flavin & Yamashita);
  - private equity averages about 13% conditional on survival, with a fat right tail (Moskowitz & Vissing-Jørgensen);
  - Swedish top-1% households earn 4.1 points more than median households (Bach, Calvet & Sodini).
- **Estimated return process.** Benhabib, Bisin & Luo estimate a 5-state Markov chain for lifetime returns: grid 0.24%, 1.43%, 2.34%, 6.65% and 7.41%, nearly i.i.d. across generations. Its mean is 3.35% and SD 2.73% (growth-detrended, real, after tax) ([NBER w21721, Table 2](https://www.nber.org/system/files/working_papers/w21721/w21721.pdf), opened). With stationary weights of 18/23/24/19/15% the grid gives a mean of 3.31% and an SD of 2.73% (computed; the weights are my reading of a garbled table).

**Inheritance**

- **Alvaredo, Garbinti & Piketty:** inherited wealth was 70–80% of private wealth in Europe before 1910 and 30–40% in 1950–1980. It was back to 50–60% around 2010 and rising. The US pattern is "U-shaped, albeit less marked" and uncertain. Modigliani's 20–30% and Kotlikoff–Summers' 80% come from different definitions ([AGP 2015 PDF](http://piketty.pse.ens.fr/files/AlvaredoGarbintiPiketty2015.pdf), opened).
- **Black, Devereux, Landaud & Salvanes (Norway, 19-year panel)** ([PDF](https://www.sandraeblack.com/wp-content/uploads/2022/01/inheritances_bdls.pdf), opened):
  - Gifts and inheritances are about 3% of total inflows on average (2–5% by age), and 6–10% for the top 1% of inflows or wealth.
  - They are about 40% for people whose parents were in the top 0.1%.
  - About 29% of individuals received a gift or inheritance over 1995–2013.
  - Norway's property tax is 0.2–0.7% of assessed value, with assessed value at 20–50% of market value. Its wealth tax is about 1% above an exemption.
  - Inheritance tax for children in 2013 was 0% up to NOK 470,000, 6% to 800,000 and 10% above.
- **Elinder, Erixson & Waldenström (Sweden, registers):** inheritances cut relative wealth inequality, with the Gini falling 5–10%, but raise absolute dispersion. The top decile's share falls, and the bottom half's share turns from negative to positive. Poorer heirs consume more of what they inherit. The Swedish inheritance tax reduced the equalising effect, but recycling the revenue could reverse that ([IZA DP 9839](https://www.econstor.eu/bitstream/10419/141598/1/dp9839.pdf), opened).

**Housing costs**

- **SCF 2022 renters**, my computation: median annual rent over income by income quintile is 45.7%, 27.2%, 20.8%, 17.7% and 11.3%. Renters are 56%, 51%, 31%, 20% and 10% of each quintile, and owners 42%, 49%, 69%, 81% and 89% ([summary extract](https://www.federalreserve.gov/econres/files/scfp2022excel.zip), computed).
- **HFCS 2023, Table F1:** median mortgage debt service is 14.0% of income among euro-area mortgagors. The loan-to-value ratio on main residences is 36.8%, and net liquid assets are 28.1% of annual gross income (opened).
- **OECD How's Life** ([SDMX DSD_HSL@DF_HSL_CWB](https://sdmx.oecd.org/public/rest/data/OECD.WISE.WDP,DSD_HSL@DF_HSL_CWB,/.3_2+3_3+11_1+1_3......), opened):
  - "Housing affordability", the share of adjusted disposable income left after housing costs, is 74–86%: US 81.7%, Germany 81.9%, UK 76.4%.
  - "Housing cost overburden" is US 29.3%, Germany 9.4%, France 10.7%, Spain 19.1%, Japan 25.9%.
  - The SDMX feed gives no definitions, so the reading of both indicators is my inference from the OECD's usual wording.
- **US Consumer Expenditure 2024:** housing is 33.4% of spending (round 2, snippet only).

**Credit and default**

- **Debt holding:** 77.4% of US families hold debt (SCF, computed) against 41.5% of euro-area households (HFCS). 6.6% of euro-area households are credit constrained (opened).
- **US charge-off rates**, all commercial banks, annualised, seasonally adjusted ([FRED CORCCACBS, CORCACBS, CORSFRMACBS, DRSFRMACBS, DRCCLACBS](https://fred.stlouisfed.org/graph/fredgraph.csv?id=CORCCACBS), opened):
  - credit cards 3.82% (2026 Q2), mean 3.38% since 2015, peak 10.54%;
  - consumer loans 2.66%, peak 6.60%;
  - single-family mortgages 0.00%, peak 2.80%;
  - delinquency: mortgages 1.86% and credit cards 2.85%.
  - The 30-year mortgage rate was 7.28% on 1 Oct 2026 ([FRED MORTGAGE30US](https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US), opened).

**Poverty traps**

- **Balboni, Bandiera, Burgess, Ghatak & Heil:** 6,000 ultra-poor households in rural Bangladesh received a randomised cow transfer and were tracked for 11 years. The poverty-trap threshold is 9,309 taka (504 USD PPP) of initial assets. Above it households accumulate assets and move into livestock businesses; below it they slide back ([NBER w29340](https://www.nber.org/system/files/working_papers/w29340/w29340.pdf), opened).
- **Kraay & McKenzie (2014)** "argue that there is no conclusive evidence supporting the assumptions of many poverty trap models" (as cited by Balboni et al., opened; the JEP article itself was blocked).

**Mechanisms in the literature**

- **Benhabib & Bisin (JEL survey)** ([NBER w21924](https://www.nber.org/system/files/working_papers/w21924/w21924.pdf), opened):
  - There are three mechanisms: skewed earnings, stochastic returns and explosive accumulation.
  - Earnings tail indices are about 2 (US, Canada) and about 3 (Sweden). Wealth tail indices are about 1.5 (US), 1.4 (Canada) and 1.7 (Sweden). So earnings "cannot by itself explain the thick tail".
  - Models that fit wealth with earnings need an "awesome state". In Castañeda et al. the top 0.039% earn about 1,000× the bottom 61%, against about 200× in the data.
  - Estate and capital-income taxes matter when returns are stochastic.
- **Benhabib, Bisin & Luo counterfactuals** ([NBER w21721, Table 6](https://www.nber.org/system/files/working_papers/w21721/w21721.pdf), opened). All three factors are needed:

  | Run | Top-1% share |
  |---|---|
  | Data (SCF 2007) | 33.6% |
  | Baseline | 34.1% |
  | Constant return | 5.7% |
  | Homogeneous saving | 6.8% |
  | Constant low wage | 5.7% |
  | Constant high wage | 28.6% |

  "Stochastic earnings prevent poverty traps"; capital-income risk "assures downward mobility as well as a thick tail".
- **Benhabib, Bisin & Zhu (Econometrica 2011):** capital-income risk, not labour income, drives the Pareto tail. In their calibration the tail Gini runs from 0.24 to 0.91 as the capital-income tax goes from 15% to 20% and the estate tax from 10% to 20%. Raising the estate tax from 10% to 20% lowers the tail Gini by 20–30% ([NBER w14730](https://www.nber.org/system/files/working_papers/w14730/w14730.pdf), opened).
- **Gabaix, Lasry, Lions & Moll** ([NBER w21363](https://www.nber.org/system/files/working_papers/w21363/w21363.pdf), opened):
  - Standard random-growth models give transitions "an order of magnitude too slow".
  - The average half-life is log 2 / ζ = 20.8 years. The first moment takes about 40 years, and high moments near the tail exponent take about 100 years.
  - For SCF wealth the half-life is about 26 years.
  - Fast dynamics need heterogeneous mean growth ("superstars") or deviations from Gibrat's law.
- **Bouchaud & Mézard** ([arXiv cond-mat/0002374](https://arxiv.org/pdf/cond-mat/0002374), opened):
  - With random multiplicative returns plus exchange at rate J, the mean-field Pareto exponent tends to α = 1 + J/σ².
  - On sparse networks α can fall below 1, producing "wealth condensation"; for connectivity 4 this happens at J/σ² ≈ 0.3.
  - "Favoring exchanges (and, less surprisingly, increasing taxes)" reduces inequality.
- **Boghosian et al. on the Yard-Sale model** ([arXiv 1511.00770](https://arxiv.org/pdf/1511.00770), opened): without redistribution the Gini is a Lyapunov functional and tends to 1, all wealth to one agent. With bias toward the wealthier party above a critical value, a finite fraction condenses into an oligarch.
- **Li, Boghosian & Li, the Affine Wealth Model** ([arXiv 1604.02370](https://arxiv.org/pdf/1604.02370), opened):
  - Three parameters fit SCF Lorenz curves for 1989–2016 with average error under 0.16%. Fitted Gini rose from 79.2% to 86.2%.
  - Parameters stay small, about 0.04–0.10 for redistribution and 0.05–0.15 for the wealth-attained advantage.
  - The fits imply an oligarch holding 20–30% of US wealth in every year.
- **Critiques of the Yard-Sale model (search summary):** its long-run oligarchy is not observed, it treats exchange as zero-sum, and it "can't really inform specific policy decisions" ([search results incl. pudding.cool and SIAM News](https://pudding.cool/2022/12/yard-sale/)).

### Inferences: prototype

**Method** (computed; throwaway code in `prototypes/wealth/`):

- **Households:** 20,000 households, annual steps, integer cents in integer-valued `Float64Array`, rates in ppm.
- **Arithmetic:** cents × rate uses an exact split, floor(x / 10⁶) × ppm + floor((x mod 10⁶) × ppm / 10⁶), with a ±1 correction on the high part. Every product stays below 2^53.
- **Randomness:** every draw is `draw(seed, household, year, stream)` from an `imul` hash. Normals come from a 4,096-entry inverse-normal table built at start.
- **Balance sheet:** deposits or unsecured debt (credit limit k × earnings, 12% a year), one house with an annuity mortgage (4% real, 30 years, 20% down, payment ≤ 35% of income above subsistence, minimum price 2× median earnings), risky assets (stocks, funds and business) and durables (0.35× earnings).
- **Earnings:** 20 equal-mass lognormal bins (σ 0.75–0.9) with a Pareto top (α 2), moving one bin with 10% probability a year.
- **Returns and income:** risky returns use the Benhabib–Bisin–Luo grid plus a transitory shock (SD 15–25%), paying out 30%. Houses get idiosyncratic shocks (SD 10%, detrended drift 0). Renters pay 7% of 3× income.
- **Consumption:** a subsistence floor, plus income above floor and housing minus a saving share that rises by income quintile (0–18%). Add 5% of liquid wealth and a wealth-banded share of illiquid net wealth.
- **Generations:** turnover is 1/40 a year. The heir keeps 50% of liquid and risky assets, and a sibling household from the same wealth band (±2 percentiles) gets the rest. Earnings and return type are redrawn.
- **Accounts:** a REST account is the counterparty of every outside flow, BANK of deposits and loans, and GOV of taxes. Tax revenue goes back to all households equally.
- **Checks:** Σ cash over households and accounts equals exactly 0, and Σ mortgages equals the bank's loan book, at the end of every 400-year run.

**Mechanism ladder** (computed; seed 42, equal start):

| Rung | Added mechanism | Result |
|---|---|---|
| L0 | Earnings plus one saving rule, cash only | Gini 0.42 with a uniform rule, 0.53 with saving rising by income quintile; top 1% 5–6%; stationary within 50 years. Earnings Gini 0.44. |
| L1 | Houses with mortgages, risky assets, one common return (3.31%) | Gini 0.49–0.51, top 1% 8–9% by year 300 |
| L2 | Persistent return types (BBL grid), uniform 3% consumption of illiquid wealth | Gini 0.52 → 0.63 → 0.72 → 0.79 at years 100–400, top 1% 11% → 51%; never stationary |
| L3 | Consumption of illiquid wealth falling with wealth (6% → 1.5–1.8%) | Condensation: Gini 0.90–0.99 and top 1% 80–98% by year 400, still rising |
| L4 | Return types redrawn within life (5–10% a year), expense shocks, credit with a 7-year discharge | Stationary: "euro-like" Gini 0.73–0.74, "US-like" 0.79–0.80 (table below) |

**Presets at year 200–250** (computed, 3 seeds; targets from section b):

| Statistic | Euro-like preset | HFCS euro area | US-like preset | SCF US |
|---|---|---|---|---|
| Gini | 0.735–0.743 | 0.685 | 0.793–0.800 | 0.830 |
| Top 10% | 59.1–60.2% | 51.8% | 65.0–66.3% | 73.4% |
| Top 1% | 18.3–20.9% | WID 22–28% | 22.5–25.4% | 35.1% |
| Bottom 50% | 4.7–4.9% | 6.2% | 2.3–2.4% | 2.2% |
| Net worth ≤ 0 | 4.3–4.6% | 3.6% | 12.5–12.7% | 7.9% |
| Homeownership | 49.4–49.8% | 60.1% | 38.8–39.1% | 66.1% |
| Median wealth ÷ median income | 1.22–1.24 | 3.78 | 0.83–0.84 | 2.74 |

- **What the presets miss.** They match the Gini, top-10% and bottom-half shares within a few points. They miss homeownership by 10–27 points and median wealth over income by a factor of 3. The missing piece is age: SCF median age rises from 43 (bottom half) to 65 (top 1%), and the prototype has no life cycle or pensions.
- **The US-like top 1% (23–25%) falls short of the SCF's 35%.** Lowering top consumption further tipped the model into condensation.
- **Convergence from an equal start** (computed, euro-like preset, 3 seeds, sampled every 5 years against the year-250–300 mean):

  | Statistic | Year 5 | Year 25 | Year 50 | Year 100 | Years 250–300 | Half-way | 90% |
  |---|---|---|---|---|---|---|---|
  | Gini | 0.363 | 0.594 | 0.663 | 0.709 | 0.744 | year 20 | year 100 |
  | Top 10% | 29.3% | 46.4% | 51.8% | 56.1% | 60.4% | year 25 | year 130 |
  | Top 1% | 4.5% | 9.8% | 11.1% | 15.2% | 20.7% | year 70 | year 210 |
  | Bottom 50% | 26.1% | 12.4% | 8.3% | 6.0% | 4.7% | year 20 | year 75 |

  This matches Gabaix et al.'s 20.8–26-year average half-life and much slower tail.

**What the prototype shows:**

- **The tail is a knife edge** (computed and inference). The stationary tail is a Kesten process: the per-generation multiplier a satisfies E[a^α] = 1. Only the top one or two return types have a > 1, so α depends almost entirely on their net growth.
  - Worked example: a 7.41% return with 70% retained and a 1.5% draw-down gives α ≈ 1.2. A 3% draw-down gives α ≈ 10.
  - In the runs, with return types re-drawn at 10% a year, a top draw-down of 1.8% held the Gini at 0.62–0.64 for 300 years (0.67 by year 400). A top draw-down of 1.5% ran up to Gini 0.72 and top 1% 30% by year 400. Without re-drawing, 1.8% condensed. Benhabib–Bisin–Zhu's tail Gini spanning 0.24–0.91 over modest tax changes is the same sensitivity.
- **Return persistence must be bounded.** Lifetime-constant return types (40 years) plus saving that rises with wealth condensed. Re-drawing types at 5–10% a year (persistence of 10–20 years) stabilised the tail. That persistence fits a 20-year panel in which fixed effects explain 60% of the explained variance (Fagereng et al.).
- **Credit creates a debt-trap threshold.** Without discharge, negative net worth jumped from 0.1% to 40% of households. The first setting had expense shocks of 0.6× income hitting 12% of households a year (credit limit 0.75× income). The second had shocks of 1.0× income hitting 20% (limit 1× income). Borrowing cost 12% a year in both. With a 7-year discharge and a limit of 1× income it moved smoothly. Negative net worth was 1.4–2.7% (shocks of 0.8× income, 20% a year), 2.9–4.2% (0.9×, 15%) and 27.6% (1.0×, 20%). So unsecured credit needs a bankruptcy discharge, or the bottom condenses into permanent debt.
- **Houses must be a fixed stock with a market price.** The prototype prices a house at a fixed multiple of income. A 20% flat income tax recycled equally then raised homeownership by 46 points and cut the wealth Gini by 0.35 within 10 years. That is an artifact: with fixed supply, prices would capitalise the extra demand.
- **The Yard-Sale model is a known answer, not a mechanism.** Its exchange is a zero-sum coin flip on the poorer party's wealth. Nomos's trades happen at posted prices between willing parties, so the Yard-Sale model belongs in tests (Gini → 1 without redistribution), beside random exchange (Gini ≈ 0.5) already in the plan.
- **Poverty traps should be measured, not imposed.** The Bangladesh threshold is a real but local finding, and the review literature is sceptical. In Nomos a trap can emerge from credit interest exceeding saving capacity and from minimum house prices. Log the share of households stuck at the credit limit for at least 5 years instead of scripting a threshold.
- **Cost** (measured here): one annual step costs 699 ns per household-year at 10,000 households (median, range 663–1,255) and 731 ns at 100,000 (708–895). That covers all balance-sheet updates, taxes, turnover and redistribution, with about 10 keyed draws per household.
  - Settings: 20 warm-up steps, 30 samples; load average 0.77 / 0.78 / 0.95 before and 0.71 / 0.77 / 0.95 after.
  - At 10k agents (about 4,050 households) a monthly step is about 2.8 ms on this desktop. Staggered over 21 days it is about 0.14 ms a day (computed).
  - The cost study's daily wealth pass is 20 ns per household on its machine ([integration-cost](integration-cost.md)). Daily interest accrual needs no draws and stays in that pass.

### Gaps

- The prototype has no age structure, pensions, behavioural tax response or link from returns to actual firms. Its effect sizes are mechanical plus rule-of-thumb saving only.
- It never reproduced the US top-1% share (35%) without tipping into condensation. A more careful model would add the BBL bequest motive or explicit "superstar" firm growth (Gabaix et al.).
- Marginal propensities to consume out of housing and stock wealth were not researched. The 2–7% draw-downs are tuning values (unsourced estimate).
- No source was opened for foreclosure rates or bankruptcy discharge times. The prototype forced-sold about 1.4% of households a year, which looks high (inference).
- Saez–Zucman's capitalisation method and the SCF disagree on the top-1% level (42% vs 35% around 2012–2016). The US top-1% target band therefore spans 30–37%.

---

## d) Accounting: non-money assets beside MINT-conserved cash

### Takeaway

- **Keep three kinds of number:**
  1. exact cents that obey Σ = 0 (cash, deposits, loans, taxes due, rents, dividends, sale proceeds);
  2. integer quantities (homes, land parcels, firm shares, food lots, durables);
  3. integer price indices.

  Valuation is index × quantity, recomputed at the day boundary. A revaluation never moves a cent and never touches MINT.
- **Loans need a claims ledger:** Σ household debt = Σ bank loan assets, exactly, every day. The prototype held both identities exactly over 20,000 households × 400 years (computed).
- **This is the SNA 2008 rule set:**
  - value at prices current on the balance-sheet date;
  - non-traded claims at "the amount the debtor must pay to the creditor to extinguish the claim";
  - closing stock = opening stock + transactions + other volume changes + holding gains;
  - recurrent wastage of stored goods counts in changes in inventories, not as a holding loss (opened).

### Cited Findings

- **Valuation, para 13.16:** "every item in the balance sheet should be valued as if it were being acquired on the date to which the balance sheet relates". Non-traded financial claims are valued at "the amount the debtor must pay to the creditor to extinguish the claim" ([SNA 2008](https://unstats.un.org/unsd/nationalaccount/docs/SNA2008.pdf), opened).
- **Valuation methods, paras 13.18–13.23:**
  - use observable market prices, or an average over transactions in an active market;
  - otherwise accumulate and revalue acquisitions less disposals ("written-down replacement cost", the preferred method for fixed assets);
  - or use the present value of future returns (subsoil assets, forests).
  - Information from markets for existing dwellings can price similar untraded assets (opened).
- **Stock identity, para 12.80:** opening stock + transactions + other volume changes + nominal holding gains = closing stock. A holding gain is realised only when the asset is sold (opened).
- **Inventories, para 6.109:** goods held in inventories deteriorate; "recurrent losses due to normal rates of wastage" are recorded with changes in inventories (opened).
- **Consumer durables, paras 3.47 and 13.93:** not assets, but recommended as a memo item in the balance sheet (opened).
- **Regional sectoral balance** from Godley & Lavoie's Model REG, already in round 4: ΔV_s equals government net spending plus net exports plus net factor income, and Σ ΔV_s equals the national deficit ([round 4 economy notes, section 7](../../round-4-multi-scale/notes/economy-demography.md), opened in round 4).
- **Integer-cent arithmetic:** `Float64Array` cents are exact below 2^53, and `BigInt64Array` was 115× slower in JavaScriptCore ([implementation plan, Performance budget](../../../plan/implementation-plan.md), opened).

### Inferences

**What must be exact, what is an index**

| Item | Representation | Canonical? | Notes |
|---|---|---|---|
| Pocket cash, deposits, firm and government accounts | Integer cents (`Float64Array`) | Yes, Σ = 0 with MINT | Unchanged from M0 |
| Mortgage and unsecured principal, accrued interest | Integer cents in a claims ledger | Yes, Σ debtors = Σ lender assets | SNA "amount to extinguish" |
| Rent, dividends, wages, interest, taxes paid | Integer-cent transfers | Yes | Every change two-sided |
| Homes, land parcels, forests, mines | Integer units with owner IDs | Yes | Fixed stock from the map; changes only by construction or demolition |
| Firm equity | Integer shares per firm | Yes | Dividends are cents from the firm account |
| Food lots | Integer units, grade, expiry | Yes (food notes) | Spoilage is a quantity change, not a cash flow |
| Durables | Integer cents of written-down value, or a count | Yes, if they affect behaviour | SNA memo item |
| District house-price index | Integer cents per standard unit | Yes, if it drives taxes, collateral or migration | Set at the day boundary from the median of recent sales |
| Share price | Derived: book equity ÷ shares | No (display) | Book value avoids a stock market |
| Net worth, wealth band | Derived at the day boundary from integers | Only if behaviour reads them | Deterministic: integer products, floor rounding |
| Food value in net worth | Derived: units × shop price index | No | Memo line; excluded from tax bases (Hand-off) |

- **Integer price × integer quantity is exact.** 10,000 homes at $10M is 10^13 cents, far below 2^53.
- **Rates need the split multiplication.** Products such as $1.2B × 7.41% in ppm exceed 2^53 if done directly. The rounding residue of every tax or interest run goes to the reserved rounding account (inference).
- **Revaluations are a separate, non-cash ledger line per settlement.** Δprice × quantity is logged for analysis, like the SNA revaluation account. Fixed-money mode still has zero aggregate cash saving (round 2). Wealth grows in fixed-money mode only through revaluation and real accumulation, which is "saving by holding" (inference).
- **Taxes on assessed values produce exact cents due.** Use floor(assessed value × rate) per household, paid from deposits, then by forced sale of shares. Homes should get a one-year deferral that books a tax debt in the claims ledger, so a tax change cannot evict households overnight (inference).
- **Firm equity at book value:** cash plus inventory at cost, minus debt, divided by shares. It is cheap, deterministic and needs no exchange. A BAM-style exit writes equity to zero: an "other volume change" that moves no cents (inference).
- **Hand-off to the cost study:** `homeValue` should not be a free `Float64` per household that drifts on its own. It should be derived from the house registry (owner, quality multiplier) × the district index, so a home's value cannot diverge from the stock.

### Gaps

- Book versus market valuation of firm equity is a design choice. No source decides it for a toy economy.
- How to value land, forests and mines with no recent sales (present value of rents versus accumulated cost) is open. It belongs with question 1's production model.

---

## e) Integration and display

### Takeaway

- **Fields:** about 64 bytes per household, or 26 bytes per agent at 2.47 people per household. That is 0.26 MB at 10k agents and 2.6 MB at 100k, well under the 256-byte cap (computed). Each LDtk home adds about 16 bytes.
- **Settlement ledger:** add about 10 numbers. Store net-worth totals for the bottom 50%, next 40% and top 10%, plus a top-1% total. Add counts with net worth ≤ 0 and owners, mortgage and unsecured totals, the district price index and two tail-shape parameters. This fits the 30–80 budget. It is separate from the plan's "top-5% concentration share", which measures crime.
- **Food stores are about 0.12–0.24% of median wealth.** The SCF median spend on food at home is $6,000 a year, so 2–4 weeks of pantry is $230–460 against $192,700. Keep food out of wealth bands and tax bases (computed; Hand-off).
- **Happiness: wealth matters a little and lastingly.** A $100,000 lottery prize raises life satisfaction 0.037 SD for over a decade; affective measures move less (Lindqvist et al., opened). Income and wealth ranks correlate at 0.63, so any face driven by levels of wealth or income fails the M5 audit. Faces stay event-driven.
- **Sliders worth adding:** wealth tax with a threshold, estate tax, property tax and credit access, each with a predicted size (table in Inferences). Flag the plan's 3% a year as above Denmark's historical top rate of 2.2%.

### Cited Findings

- **Lindqvist, Östling & Cesarini:** large-prize lottery winners show "sustained increases in overall life satisfaction that persist for over a decade". An after-tax prize of $100,000 raises life satisfaction by 0.037 SD. Effects on happiness and mental health are "significantly smaller", and financial life satisfaction mediates ([NBER w24667](https://www.nber.org/system/files/working_papers/w24667/w24667.pdf), opened).
- **Question 3's model** has income drivers (+300 milli-ladder per doubling against the settlement median, +50 against subsistence, +250 against own habit) and no wealth driver. Its display rule is "no resting faces or plumbobs from LS" ([happiness-wellbeing notes](happiness-wellbeing.md), opened).
- **The cost study** found a wealth pass of 20 ns per household. A 16-bins-per-octave log2 histogram gives the top-10% share within 0.03 points of a sort, and `TypedArray.sort` on shared memory allocates ([integration-cost notes](integration-cost.md), opened). Its prototype adds `foodValue` to net worth, picks food grade by wealth band (`QUAL_PICK`) and adds a wealth-band term to happiness (`WB_DRIVE`) ([daily.mjs](../prototypes/integration-cost/daily.mjs), [world.mjs](../prototypes/integration-cost/world.mjs), opened).
- **Question 2** asks that "wealthier households should shift toward standard and fine grades", with grade kept out of bubbles ([food-quality-spoilage notes](food-quality-spoilage.md), opened).
- **Question 6:** Norland shows class through clothing colour. Its fixed coin thresholds would break under Nomos's moving prices, so wealth thoughts should be relative to the price index or own income ([norland-prior-art notes](norland-prior-art.md), opened).
- **Wealth taxes:**
  - Denmark's marginal wealth tax "equalled 2.2% up until the late 1980s" above an exemption near the 98th percentile. From 1989 the rate was cut to 1% and the exemption doubled for married couples, before abolition in 1997.
  - Taxable wealth rose by about 30% after 8 years for the very wealthy and about 10% for the moderately wealthy. Mechanical effects were about a quarter and a tenth of those.
  - The long-run elasticity of wealth to the net-of-tax return is "about 0.5" ([Jakobsen, Jakobsen, Kleven & Zucman, NBER w24371](https://www.nber.org/system/files/working_papers/w24371/w24371.pdf), opened).
  - This working paper does not contain the 8.9 and 11.3 elasticities that round 2 took from a snippet.
- **Saez & Zucman (2019):** a 2% tax above $50M and 3% above $1B since 1982 would have left the Forbes 400 with about 2% of wealth in 2018 instead of 3.5%; a 10% billionaire tax, about 1%.
  - Reported-wealth responses: Sweden −0.2% per 1% tax (bunching), Colombia 2–3%, Switzerland 23–34% ([BPEA draft](https://www.brookings.edu/wp-content/uploads/2019/09/Saez-Zucman_conference-draft.pdf), opened).
- **OECD Revenue Statistics, % of GDP, 2024 (OECD average 2023)** ([SDMX DSD_REV_COMP_OECD@DF_RSOECD](https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,/..S13.T_4100+T_4110+T_4200+T_4300+TOTALTAX._T.PT_B1GQ.A), opened):
  - recurrent property taxes: OECD 0.95, US 2.67, UK 2.80, France 1.95, Germany 0.37;
  - net wealth taxes: OECD 0.16, Switzerland 1.34, Norway 0.62, Spain 0.20;
  - estate, inheritance and gift taxes: OECD 0.15, US 0.13, France 0.73.
- **US property tax:** "the average effective tax rate on a median valued homestead was 1.22 percent in 2024" across the 53 largest cities, from 0.30% (Honolulu) to 3.02% (Detroit) ([Lincoln Institute press release, 16 Jul 2025](https://www.prnewswire.com/news-releases/new-report-analyzes-variation-in-effective-property-tax-rates-across-us-states-302506330.html), opened via a fetch-tool summary).
- **The plan's wallet bars.** M1 draws "Primer-style wallet and hunger bars that ride with the sprite" for up to four lab protagonists, and the M5 audit requires no rendered attribute to correlate with wealth decile outside the lens ([implementation plan](../../../plan/implementation-plan.md), opened).

### Inferences

**Household fields** (computed; `Float64` for cents):

| Field | Type | Bytes |
|---|---|---|
| deposits | `Float64` | 8 |
| unsecured debt | `Float64` | 8 |
| home ID (−1 = renter) | `Int32` | 4 |
| mortgage principal, payment | `Float64` ×2 | 16 |
| equity: firm ID, shares | `Int32` ×2 | 8 |
| durables | `Int32` cents | 4 |
| property titles head (linked list into a title registry) | `Int32` | 4 |
| arrears / discharge counter, wealth band, flags, spare | `Uint8` ×4 | 4 |
| net-worth cache (day boundary) | `Float64` | 8 |
| **Total** | | **64** |

- **House registry, per LDtk home:** owner `Int32`, quality multiplier `Uint16` Q8.8, district `Uint16`, last sale `Float64`, about 16 bytes. **Title registry** (land, forest, mine): owner, kind, units, about 12 bytes per title.

**Settlement-ledger wealth block** (M7): about 10 numbers.

- 3 `Float64`: net-worth totals for the bottom 50%, next 40% and top 10%.
- 1 `Float64`: top-1% total.
- 2 `Int32`: households with net worth ≤ 0, and owner households.
- 2 `Float64`: mortgage and unsecured debt totals.
- 1 `Int32`: district house-price index.
- 2 Q8.8: lognormal body σ and Pareto tail α, for spawning.

Quantile groups follow the WID and DFA convention, so they compare directly with the targets. The cost study's 8 log2 bands can stay as a working histogram for agent mode.

**Spawning a wealth distribution** (inference; extends round 4's `spawnFromLedger`):

1. Draw each household's wealth rank from a keyed draw. Correlate it with income rank through a Gaussian-copula table at Spearman ≈ 0.6 (SCF 0.63).
2. Map rank to net worth with a 16–32-knot quantile table per preset (for example the SCF percentiles above, scaled to settlement mean income).
3. Apportion exactly so the three group totals and the top-1% total match the ledger, by largest remainder.
4. Split net worth into a portfolio from the group table in section a (home, cash, equity, retirement, business, durables, debts), with ownership probability by group.
5. Assign actual LDtk homes by wealth rank plus noise. Never assign sprites by wealth.

**Food (Hand-off to question 2):** choose food grade from the household's daily consumption budget per adult, relative to the price index. That budget already includes consumption out of wealth, so wealth enters through spending, not directly. Keep food value as a memo line, and out of wealth bands and tax bases. The cost prototype's `foodValue` in `netWorth` should move to a separate total.

**Happiness (Hand-off to question 3).** Income for the happiness drivers should be household disposable income per adult: wages, dividends, interest, rent received and transfers, minus taxes, rent paid and debt interest. It should exclude unrealised holding gains. Three options for a wealth term:

- **Default:** none. Lindqvist's +0.037 SD per $100,000 is about +70 milli-ladder, smaller than one income doubling (+300).
- **Option:** +50 milli-ladder per year of the settlement median income held in liquid wealth, capped at +150. Scaled from Lindqvist through the SCF median income of $70,259 (inference).
- **Option:** a debt-stress term for households at their credit limit. No effect size was found (gap).

Replace the cost prototype's `WB_DRIVE` with whichever is chosen. Faces must never read it.

**Keeping wealth invisible** (inference; leak channels to audit):

- **Wallet bars:** only on M1 lab cards, labelled as lab-only. Never in city or town skins outside the lens.
- **Faces and emotes:** event-driven only. Slow wellbeing lives in the inspector, the lens and charts (with question 3).
- **Carried goods:** drawn by category, never by grade or price (with question 2).
- **Homes:** tiles, roofs, size and decoration come from the map. They never depend on occupant wealth or house price; the plan already says "never by wealth".
- **Districts:** sorting by house prices and Schelling moves (M5) may cluster wealth spatially. Decorations must stay map-driven; the lens may show the pattern.
- **Durables:** abstract values, not visible carts or bikes per owner.
- **Bubble rates:** coin bubbles from purchases may rise with spending. Cap bubbles per agent per day so rates by wealth decile differ only through events (agrees with question 3).
- **Audit:** compute |Spearman| between every rendered attribute (outfit, accessory, face state, carried sprite, home sprite, bubble count per day) and wealth decile over 50 seeds. Pass below 0.05, excluding true-view act cues.

**Predicted slider effects** (computed in the prototype; paired against the no-policy control on 3 seeds; tax revenue recycled as an equal transfer per household; no behavioural or avoidance response; seed spread of the Gini difference within ±0.005 at +10 years unless noted):

| Slider change | Preset | Gini +10 / +25 / +50 y | Top 10% (pp) | Top 1% (pp) | NW ≤ 0 (pp) | Ownership (pp) | Revenue (% of income) |
|---|---|---|---|---|---|---|---|
| Wealth tax 1% above 4× mean NW (top 5.8%) | Euro | −0.018 / −0.036 / −0.050 | −1.8 / −3.6 / −5.2 | −1.4 / −3.0 / −4.8 | −1.8 / −2.6 / −3.1 | +1.6 / +4.3 / +6.9 | 0.6–0.7 |
| same | US | −0.022 / −0.042 / −0.052 | −2.3 / −4.4 / −5.3 | −1.8 / −3.9 / −3.9 | −4.1 / −6.4 / −7.5 | +1.4 / +4.0 / +6.3 | 0.7–0.8 |
| Wealth tax 3% above 4× mean NW | Euro | −0.052 / −0.087 / −0.110 | −5.1 / −8.9 / −11.5 | −4.1 / −7.0 / −10.1 | −3.3 / −3.7 / −4.0 | +5.1 / +12.6 / +16.1 | 1.2–1.8 |
| same | US | −0.065 / −0.110 / −0.128 | −6.4 / −11.4 / −13.5 | −5.2 / −9.8 / −11.1 | −9.0 / −10.6 / −10.7 | +4.8 / +12.8 / +17.1 | 1.4–2.1 |
| Wealth tax 3% on all net worth | Euro | −0.163 / −0.265 / −0.302 | −11.7 / −20.0 / −23.8 | −5.0 / −9.2 / −12.8 | −4.2 / −4.4 / −4.5 | +23.6 / +29.6 / +31.2 | 8.4–9.2 |
| same | US | −0.175 / −0.289 / −0.334 | −13.2 / −23.2 / −27.2 | −6.1 / −12.2 / −14.7 | −12.5 | +22.3 / +36.9 / +38.8 | 8.0–8.7 |
| Estate tax 40% above 4× mean NW | Euro | −0.016 / −0.031 / −0.053 | −1.6 / −3.0 / −5.2 | −1.1 / −2.0 / −4.2 | −1.6 / −2.5 / −3.3 | +1.3 / +4.1 / +7.7 | 0.6–1.5 (lumpy) |
| same | US | −0.017 / −0.037 / −0.052 | −1.8 / −3.7 / −5.2 | −1.1 / −2.9 / −3.9 | −3.4 / −5.9 / −7.3 | +1.0 / +3.5 / +6.2 | 0.6–1.0 |
| Property tax 1% → 0% | Euro | +0.030 / +0.051 / +0.070 | +2.0 / +3.6 / +6.1 | +0.8 / +1.0 / +4.9 | +7.0 / +13.7 / +15.9 | −1.8 / −5.3 / −8.4 | −1.5 |
| same | US | +0.028 / +0.044 / +0.053 | +2.0 / +3.5 / +4.4 | +0.7 / +1.7 / +1.7 | +8.5 / +12.9 / +14.7 | −1.1 / −3.5 / −5.4 | −1.4 |
| Property tax 1% → 2% | Euro | −0.027 / −0.042 / −0.049 | −1.7 / −2.4 / −2.7 | −0.6 / −0.4 / −0.3 | −2.9 / −3.8 / −4.0 | −4.0 / −7.0 / −8.0 | +1.2–1.3 |
| same | US | −0.028 / −0.048 / −0.062 | −1.8 / −3.1 / −3.8 | −0.6 / −0.9 / −0.8 | −6.5 / −9.2 / −10.3 | −2.5 / −4.1 / −4.4 | +1.3 |
| Unsecured credit 1× income → 0 | Euro | −0.006 / −0.006 / −0.001 | +0.3 / +0.3 / +1.1 | +0.2 / +0.2 / +1.7 | −4.2 / −4.4 / −4.5 | −6.3 / −6.7 / −7.1 | — |
| same | US | −0.029 / −0.029 / −0.030 | −0.8 / −0.5 / −0.5 | −0.1 / +0.5 / +0.7 | −12.6 | −5.3 / −5.8 / −6.1 | — |
| Unsecured credit 1× → 2× income | Euro | +0.003 / +0.013 / +0.022 | +0.1 / +0.9 / +1.8 | 0 / +0.3 / +1.0 | +0.7 / +2.0 / +3.4 | +1.7 / +0.4 / −1.1 | — |
| same | US | +0.011 / +0.024 / +0.038 | +0.4 / +1.5 / +3.2 | +0.1 / +0.8 / +3.1 | +2.2 / +3.9 / +5.1 | +1.7 / +0.7 / 0 | — |

Seed spread is wider for the estate tax at +50 years (−0.068 to −0.037 Gini, euro-like), for property tax 1% → 0% (Gini +0.061 to +0.076 at +50 years) and for credit 2× (US-like +0.034 to +0.045 at +50 years).

- **Reading the table:**
  - A threshold wealth tax works at roughly 0.02 Gini per point of tax per decade, and the effect roughly doubles by 25 years.
  - A flat 3% tax on all wealth is a different instrument. Its revenue is 8–9% of income, and through the equal transfer it acts mainly as redistribution. Present it as extreme.
  - Property-tax and credit effects run mainly through the bottom (negative net worth and ownership), and partly through recycled revenue.
  - All effects are mechanical. Real responses (Denmark's elasticity of about 0.5, avoidance) would shrink wealth-tax effects at the top. Nomos has no avoidance channel, so the toy will overstate them; say so on the slider card.
- **Agreement with the literature:**
  - Denmark's 1989 cut (about 1.2–1.8 points) raised top taxable wealth 10–30% in 8 years. The prototype's 1% tax lowers the top-10% share by about 2–3% (relative) in 10 years, smaller because it has no avoidance.
  - The Saez–Zucman counterfactual (Forbes 400 share −43% over 36 years at 2–3%) is the same order as the prototype's 3% threshold tax (top 1% −36% to −49% relative over 25–50 years).
- **Revise the M5 claim "the Gini falls steadily as the wealth tax rises".** It holds in every run here (monotone in rate and over time), but only from a spawned near-stationary state. Starting from an equal distribution, the rising baseline swamps the slider for decades (inference).

### Gaps

- No study gave a wealth term for happiness separate from income beyond Lindqvist. A debt-stress effect size is missing.
- The leak audit thresholds (|Spearman| < 0.05) are a proposal, not a sourced standard.
- No behavioural saving or avoidance response is in the slider effects. The Swiss 23–34% response shows how far off a no-avoidance toy can be in low-enforcement settings.
- The effect of house supply (LDtk home capacity) on prices and ownership was not modelled. It is the main missing piece behind the income-tax artifact.

---

## Recommendation for the plan

**Mechanics, in one paragraph.** Each household holds a small balance sheet in integers: deposits and unsecured debt in cents, one or no home from the map's fixed stock, property titles, shares in named firms and durables, with a mortgage in a claims ledger. Firms pay dividends to their own shareholders, so return dispersion and downside risk come from firm profits and BAM exits. Target an individual return SD near 6% a year with a persistent part near 3 points that re-draws every 10–20 years. Households save more as income rises (about 0% to 15–18% of spare income by quintile). They consume 5% of liquid and 2–7% of illiquid wealth a year, less as wealth rises, and keep capital gains ("saving by holding"). Generations hand estates on, split among heirs from the same wealth band. Unsecured credit has a limit of 0.5–1× income at 12–20% a year and a discharge after 5–7 years at the limit. Because the tail is a knife edge and takes 70–200 years to form, a run spawns its wealth distribution from a preset (euro-like or US-like) and the dynamics only maintain it. CI checks drift and slider sizes from that state.

**Milestones and draft tasks**

M0 Pipeline

- [ ] Add a claims ledger beside the cash ledger: one record per loan (lender, borrower, principal in cents, rate in ppm, payment in cents), with Σ borrower debt = Σ lender loan assets asserted every day (R6).
- [ ] Add `mulPpm`, an exact floor of cents × ppm through a 10⁶ split with a ±1 correction, and lint-ban raw `cents * rate` in `sim-core` (R6).
- [ ] Reserve integer quantity registries for homes (one per LDtk home), property titles and firm shares. Valuations are integer price index × quantity at the day boundary, logged as a revaluation line and never posted to MINT (R6).

M2 Economy

- [ ] Give households a balance sheet: deposits, unsecured debt (limit 0.5–1× annual income, 12–20% a year, discharge after 5–7 years at ≥ 80% of the limit), durables (about 0.35× earnings) and shares in named firms (R6).
- [ ] Pay firm profits as dividends to each firm's shareholders, not by household liquidity. Log the return distribution and check an SD near 6% a year and a persistent part near 3 points (Fagereng et al.) (R6).
- [ ] Use a saving rule with active saving rising by income quintile (about 0, 2, 6, 9 and 15–18% of income above subsistence and housing), consumption of 5% a year of liquid wealth, and consumption of illiquid wealth falling with wealth (about 7% below the mean, 2% above 16× the mean) (R6).
- [ ] Extend `spawnFromLedger` to wealth: keyed rank → per-preset quantile table, income–wealth rank correlation about 0.6, exact apportionment to the group totals, a portfolio split by group, and homes by rank plus noise (R6).
- [ ] Add known-answer tests: an earnings-only economy settles within 0.1 of the earnings Gini; the Yard-Sale model without redistribution drifts toward Gini 1; cash and loan identities hold exactly over 50 seeds × 400 simulated years (R6).

M3 City life

- [ ] Make housing a fixed stock of LDtk homes with owners or renters. Rent is paid in cents to the owner. Mortgages need LTV ≤ 80% and a payment ≤ 35% of income above subsistence. Default forces a sale at a 10% discount. A district price index takes the median of recent sales monthly (R6).
- [ ] Draw every home from the map. No tile, roof, size or decoration may depend on the occupant's wealth or the home's price (R6).

M5 Society and policy

- [ ] Ship two wealth presets with CI bands, measured from a spawned start (R6):
  - euro-like: Gini 0.62–0.74, top 10% 45–58%, bottom 50% 4–8%, net worth < 0 for 1–6%;
  - US-like: Gini 0.78–0.86, top 10% 67–76%, top 1% 30–37%, bottom 50% 1–3%, net worth ≤ 0 for 6–10%;
  - without policy changes, drift over 50 years stays within 0.03 Gini and 3 points of top-10% share.
- [ ] Wealth-tax slider: 0–3% a year above a threshold, default 4× mean net worth (about the top 5–6%) (R6):
  - predicted Gini −0.02 at 1% and −0.05 to −0.07 at 3% after 10 years, about double after 25;
  - label 3% as above Denmark's historical top rate of 2.2%;
  - offer the flat 3% on all wealth only as an extreme (−0.16 to −0.18 in 10 years).
- [ ] Estate-tax slider, 0–70% above 4× mean net worth: 40% predicts Gini −0.02 after 10 years and −0.05 after 50 (R6).
- [ ] Property-tax slider, 0–2% of assessed value, default 1% (US big-city median 1.22%): each point changes the Gini by about 0.03 within 10 years through recycled revenue, and +1 point lowers ownership 2–4 points (R6).
- [ ] Credit-access slider, unsecured limit 0–2× income (R6):
  - mainly moves the share with negative net worth: −4 to −13 points at 0, +1 to +5 points at 2×;
  - moves the Gini by at most 0.04;
  - log households stuck at the limit for at least 5 years as the poverty-trap meter.
- [ ] State on every slider card that Nomos has no avoidance channel, so wealth-tax effects at the top are upper bounds; Denmark's measured long-run elasticity is about 0.5 (R6).
- [ ] Wealth lens and audit (R6):
  - wallet bars appear only on lab cards;
  - faces and emotes are event-driven, never set by wealth or income levels;
  - carried goods are drawn by category, not grade;
  - over 50 seeds, every rendered attribute (outfit, accessory, face state, carried sprite, home sprite, bubbles per day) has |Spearman| < 0.05 with wealth decile outside the lens.

M7 Country of ledgers

- [ ] Add the settlement wealth block, about 10 numbers, kept separate from the crime top-5% concentration share (R6):
  - net-worth totals for the bottom 50%, next 40% and top 10%, and a top-1% total;
  - households with net worth ≤ 0, and owner households;
  - mortgage and unsecured debt totals;
  - the district price index;
  - body σ and tail α in Q8.8 for spawning.
- [ ] Fit group-transition hazards from the M5 sweep logs. Spawn and fold must reproduce the group totals exactly in cents (R6).

M9 Zoom across scales

- [ ] Add each notable's balance sheet (home ID, shares, debts) to the notables cache, so a revisited owner still owns the same home and firm (R6).

**Verify before hard-coding**

| Figure or question | Decides | Milestone |
|---|---|---|
| SCF 2025 (expected late 2026) | Refresh the US preset | M5 |
| HFCS portfolio by wealth decile | Euro-preset portfolio split | M2 |
| Whether Nomos models age (3 bands in the settlement store) | Ownership and median wealth/income; the prototype missed them by 10–27 points and 3× without age | M2, M7 |
| Marginal propensities to consume out of housing and stock wealth | The 2–7% draw-down table | M2 |
| Foreclosure and bankruptcy-discharge rates | Default and discharge parameters | M2, M3 |
| Book versus market value for firm equity | Share prices and tax bases | M2 |

**Hand-offs**

- **To question 1 (resources):** homes, land, forests and mines are integer titles in registries. Resource rents are cent flows to owners. Untraded titles need a valuation rule (present value of rents or accumulated cost).
- **To question 2 (food):** choose grade from consumption per adult relative to the price index, not from the wealth band. Food value is a memo line, outside wealth bands and tax bases. Never draw carried goods by grade.
- **To question 3 (happiness):** use the income definition in section e, no wealth driver by default (optionally a liquid-wealth term of up to +150), event-driven faces, and replace `WB_DRIVE`.
- **To question 5 (cost):** derive `homeValue` from the registry × index, move `foodValue` out of `netWorth`, stagger the monthly wealth step (about 2.8 ms per month at 10k agents on this desktop, about 0.14 ms a day when staggered), and use about 64 bytes per household.
