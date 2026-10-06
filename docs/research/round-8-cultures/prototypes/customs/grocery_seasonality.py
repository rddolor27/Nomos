# How big is the holiday-season spike in grocery spending? (scale anchor for festival food demand)
# Data: US Census Bureau Monthly Retail Trade, mrtssales92-present.xlsx, downloaded OUTSIDE the repo.
# Usage: python grocery_seasonality.py <path-to-mrtssales92-present.xlsx>
# Reads the not-seasonally-adjusted rows for NAICS 4451 (grocery stores) and 4452/4453 where present,
# and reports each month's sales as a ratio to that year's monthly mean, plus a daily-rate version
# (dividing by days in the month), median and range over 2015-2019 and 2022-2024 (pandemic years skipped).
import sys, statistics, calendar
import openpyxl

wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
YEARS = [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024]
TARGETS = {'4451': 'Grocery stores', '4453': 'Beer, wine, and liquor stores', '722': 'Food services and drinking places'}
out = {}
for y in YEARS:
    if str(y) not in wb.sheetnames:
        continue
    ws = wb[str(y)]
    rows = list(ws.iter_rows(values_only=True))
    # NSA block comes first in each sheet; take the first row whose code matches.
    seen = set()
    for r in rows:
        code = str(r[0]).strip() if r[0] is not None else ''
        if code in TARGETS and code not in seen:
            vals = [v for v in r[2:14]]
            if all(isinstance(v, (int, float)) for v in vals):
                seen.add(code)
                mean = sum(vals) / 12
                daily = [v / calendar.monthrange(y, m + 1)[1] for m, v in enumerate(vals)]
                dmean = sum(vals) / (366 if calendar.isleap(y) else 365)
                out.setdefault(code, []).append(([v / mean for v in vals], [d / dmean for d in daily]))
for code, series in out.items():
    print(TARGETS[code], f'({len(series)} years)')
    for label, idx in (('monthly total / mean month', 0), ('daily rate / mean day', 1)):
        cols = list(zip(*[s[idx] for s in series]))
        med = [round(statistics.median(c), 3) for c in cols]
        print(' ', label, 'median by month Jan..Dec:', med)
        print('   Dec range:', round(min(cols[11]), 3), '-', round(max(cols[11]), 3), ' Nov range:', round(min(cols[10]), 3), '-', round(max(cols[10]), 3))
