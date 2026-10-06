# Summarise USDA FoodKeeper storage times (days) by FoodKeeper category and by
# hand-picked representative items. Reads a FoodKeeper CSV export with the
# official column names (e.g. jelera/food-shelflife-db lib/seeds/ingredients.csv).
# The data file is NOT committed; pass its path as argv[1].
import csv, sys, statistics as st

DAYS = {"days": 1, "day": 1, "weeks": 7, "week": 7, "months": 30.4, "month": 30.4,
        "years": 365, "year": 365, "hours": 1 / 24, "hour": 1 / 24}
CATS = ["Baby Food", "Bakery", "Baking and Cooking", "Refrigerated Dough", "Beverages",
        "Condiments, Sauces & Canned Goods", "Dairy Products & Eggs", "Food Purchased Frozen",
        "Grains, Beans & Pasta", "Meat Fresh", "Meat Shelf Stable", "Meat Smoked/Processed",
        "Meat Stuffed", "Poultry Cooked/Processed", "Poultry Fresh", "Poultry Shelf Stable",
        "Poultry Stuffed", "Fresh Fruits", "Fresh Vegetables", "Seafood Fresh", "Shellfish",
        "Seafood Smoked", "Shelf Stable Foods", "Vegetarian Proteins", "Deli & Prepared"]


def span(r, lo, hi, unit):
    u = (r.get(unit) or "").strip().lower()
    if u not in DAYS:
        return None
    a, b = r.get(lo), r.get(hi)
    try:
        a = float(a) if a not in (None, "") else None
        b = float(b) if b not in (None, "") else None
    except ValueError:
        return None
    if a is None and b is None:
        return None
    a = a if a is not None else b
    b = b if b is not None else a
    return (a * DAYS[u], b * DAYS[u])


def modes(r):
    pantry = span(r, "Pantry_Min", "Pantry_Max", "Pantry_Metric") or \
        span(r, "DOP_Pantry_Min", "DOP_Pantry_Max", "DOP_Pantry_Metric")
    fridge = span(r, "Refrigerate_Min", "Refrigerate_Max", "Refrigerate_Metric") or \
        span(r, "DOP_Refrigerate_Min", "DOP_Refrigerate_Max", "DOP_Refrigerate_Metric")
    freeze = span(r, "Freeze_Min", "Freeze_Max", "Freeze_Metric") or \
        span(r, "DOP_Freeze_Min", "DOP_Freeze_Max", "DOP_Freeze_Metric")
    return pantry, fridge, freeze


def fmt(s):
    if s is None:
        return "-"
    return f"{s[0]:.0f}-{s[1]:.0f}" if s[0] != s[1] else f"{s[0]:.0f}"


def main(path, picks):
    rows = list(csv.DictReader(open(path, encoding="utf-8", errors="replace")))
    print(f"records: {len(rows)}")
    by = {}
    for r in rows:
        c = int(r["Category_ID"])
        by.setdefault(c, []).append(r)
    print("\n== category medians of the max bound (days): n, pantry, fridge, freezer ==")
    for c in sorted(by):
        out = []
        for k in range(3):
            v = [modes(r)[k][1] for r in by[c] if modes(r)[k]]
            out.append(f"{len(v):3d}:{st.median(v):7.0f}" if v else f"{0:3d}:      -")
        print(f"{c:2d} {CATS[c-1]:36s} n={len(by[c]):3d} " + "  ".join(out))
    print("\n== picked items (days): pantry | fridge | freezer ==")
    for needle in picks:
        hits = [r for r in rows if needle.lower() in (r["Name"] + " " + (r["Name_subtitle"] or "")).lower()]
        for r in hits[:4]:
            p, f, z = modes(r)
            name = (r["Name"] + (" / " + r["Name_subtitle"] if r["Name_subtitle"] else ""))[:70]
            print(f"[{needle}] {name:70s} {fmt(p):>9s} | {fmt(f):>9s} | {fmt(z):>9s}")


NOMOS = {
    "Grain": ["Flour / white", "Flour / whole wheat", "Rice / white", "Rice / brown", "Oats / whole",
              "Cornmeal / regular", "Pasta / dry", "Beans / dried", "Lentils / dried"],
    "Bread": ["Commercial bread products", "Bread / homemade", "Bagels", "Muffins"],
    "Produce": ["Apples", "Bananas", "Potatoes", "Onions / yellow", "Lettuce / iceberg", "Lettuce / leaf",
                "Carrots, parsnips", "Cabbage", "Cherry tomatoes", "Berries / blackberries", "Blueberries",
                "Citrus fruit", "Broccoli", "Cucumbers", "Peppers"],
    "Dairy & eggs": ["Eggs / in shell", "Yogurt", "Buttermilk", "Cheese / hard", "Butter", "Cottage cheese",
                     "Cream / half"],
    "Fresh meat": ["Beef / ground", "Beef / rib roast, bone", "Pork / loin chops, bone", "Chicken / whole",
                   "Chicken parts / breast halves, bone", "Lamb / chops", "Sausage / raw"],
    "Fresh fish": ["Lean fish / cod", "Lean fish / pollock", "Fatty fish", "Shrimp", "Scallops"],
    "Preserved": ["Jerky / commercially", "Sausage / hard, dry", "Fish / hot smoked, vac", "Fish / cold smoked",
                  "Pickles", "Sun dried tomatoes", "Fruit / dried", "Ham / country", "Bacon / fully cooked"],
    "Canned": ["Canned goods / low acid", "Canned goods / high acid", "Meat products / canned",
               "Canned chicken", "Applesauce / commercial"],
}


def nomos_table(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8", errors="replace")))
    print("\n== proposed Nomos categories: median [min-max] of item (min,max) days; n items per mode ==")
    for cat, needles in NOMOS.items():
        found = []
        for nd in needles:
            hit = [r for r in rows if (r["Name"] + " / " + (r["Name_subtitle"] or "")).lower().startswith(nd.lower())]
            if hit:
                found.append(hit[0])
        out = []
        for k, label in enumerate(["ambient", "cool", "frozen"]):
            spans = [modes(r)[k] for r in found if modes(r)[k]]
            if not spans:
                out.append(f"{label}: -")
                continue
            lo = [s[0] for s in spans]; hi = [s[1] for s in spans]
            out.append(f"{label}: n={len(spans)} min-med {st.median(lo):.0f}, max-med {st.median(hi):.0f} "
                       f"[{min(lo):.0f}-{max(hi):.0f}]")
        print(f"{cat:13s} items={len(found):2d} | " + " | ".join(out))
        print("              matched: " + "; ".join((r["Name"] + "/" + (r["Name_subtitle"] or ""))[:28] for r in found))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "nomos":
        nomos_table(sys.argv[1])
        sys.exit(0)
    PICKS = ["Flour", "Rice", "Pasta", "Oats", "Cornmeal", "Bread", "Beans", "Lentils",
             "Apples", "Bananas", "Potatoes", "Onions", "Lettuce", "Carrots", "Cabbage", "Tomatoes",
             "Berries", "Citrus", "Milk", "Cheese", "Butter", "Eggs", "Yogurt",
             "Beef", "Ground", "Chicken", "Pork", "Ham", "Bacon", "Jerky", "Sausage",
             "Lean fish", "Fatty fish", "Fish", "Smoked", "Canned", "Dried", "Honey", "Sugar",
             "Salt"]
    main(sys.argv[1], PICKS)
