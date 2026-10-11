"""Icons: goods and food, freshness badges, the coin, emote bubbles, HUD pips, the goods a blob carries and the pips that
show a premises's stock.

Every sprite is a hand-drawn ASCII grid in the 32-colour palette. Icons are drawn as fills
with a clear 1-px border, and spritekit.add_outline gives each the same OUTLINE ring.
Job items for the blob body live with the body in characters.py.

Build: python tools/sprites/icons.py
"""
import spritekit as sk

# One key for every grid. Upper case is the lighter tone of a pair.
KEY = sk.cmap(
    O='OUTLINE', W='WHITE',
    C='CREAM', c='CREAM_D',
    S='SAND', s='SAND_D',
    T='WOOD_L', t='WOOD', u='WOOD_D',
    G='GRASS_L', g='GRASS', f='LEAF_D',
    E='TEAL', e='TEAL_D',
    A='WATER_L', a='WATER',
    N='NAVY', n='NAVY_D',
    **{'1': 'STONE_L', '2': 'STONE', '3': 'STONE_D'},
    R='ROOF', r='ROOF_D',
    V='VERMILLION',
    Y='GOLD',
    L='BODY_L', B='BODY', b='BODY_S', D='BODY_D',
    P='PINK', p='PINK_D',
    M='PLUM',
    I='ICE_L', i='ICE', J='ICE_S', j='ICE_D',
    K='LILAC_L', k='LILAC', Q='LILAC_S', q='LILAC_D',
)
OUTLINE = sk.PALETTE['OUTLINE']


def _check(rows, w, h, name):
    if len(rows) != h or any(len(r) != w for r in rows):
        raise ValueError(f'{name}: grid must be {w}x{h}')


def icon(rows, size, name):
    """A hand-drawn fill with a clear 1-px border, ringed with the shared outline."""
    _check(rows, size, size, name)
    if rows[0].strip('.') or rows[-1].strip('.') or any(r[0] != '.' or r[-1] != '.' for r in rows):
        raise ValueError(f'{name}: keep a clear 1-px border for the outline')
    return sk.add_outline(sk.from_ascii(rows, KEY))


# ---------------------------------------------------------------------------- goods, 16x16
GOODS_16 = {
    'grain': [  # a sheaf: three ears, a twine tie, splayed stalks
        "................",
        ".......LY.......",
        "..LY...Yb...LY..",
        "..Yb...LY...Yb..",
        "...LY..Yb..LY...",
        "...Yb..LY..Yb...",
        "....LY.Yb.LY....",
        "....Yb.Ss.Yb....",
        ".....S.Ss.S.....",
        "......SSsS......",
        "......TTtt......",
        "......SsSs......",
        ".....SsSsSs.....",
        "....SsSsSsSs....",
        "....SsSsSsSs....",
        "................",
    ],
    'fresh-food': [  # a wicker basket of greens and a carrot
        "................",
        "............G...",
        "...GGg.....GgGf.",
        "..GGgGg....fgf..",
        "..GgGggf..RRr...",
        "..gGgggf.RRr....",
        "..ggfggfRRr.....",
        "...fffffRr......",
        ".SSSSSSSSSSSSSs.",
        ".TTttTTttTTttTu.",
        "..ttTTttTTttTu..",
        "..TTttTTttTTtu..",
        "...ttTTttTTtu...",
        "...TTttTTttTu...",
        "....uuuuuuuu....",
        "................",
    ],
    'timber': [  # three logs stacked, end grain out
        "................",
        "................",
        "................",
        "......Ttt.......",
        ".....TSSSt......",
        ".....TSTSu......",
        ".....tSSSu......",
        "......tuu.......",
        "................",
        "...Ttt...Ttt....",
        "..TSSSt.TSSSt...",
        "..TSTSu.TSTSu...",
        "..tSSSu.tSSSu...",
        "...tuu...tuu....",
        "................",
        "................",
    ],
    'stone': [  # a cut block: lit top, front face, shaded side
        "................",
        ".....111111111..",
        "....1W11111113..",
        "...1W111111133..",
        "..1W1111111333..",
        "..222222222333..",
        "..222232222333..",
        "..222322222333..",
        "..222222222333..",
        "..222222322333..",
        "..222223222333..",
        "..222222222333..",
        "..22222222233...",
        "..3333333333....",
        "................",
        "................",
    ],
    'metal': [  # an ingot: lit top face, sloped front, lit left end, shaded right end
        "................",
        "................",
        "................",
        "................",
        "................",
        "....WW1111111...",
        "....W11111111...",
        "...12222222223..",
        "..1222222222223.",
        "..1222222222223.",
        "..3333333333333.",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    'fuel': [  # charcoal lumps with one glowing ember
        "................",
        "................",
        "................",
        "................",
        "......2223......",
        ".....221233.....",
        "....22223333....",
        "...2122333n.....",
        "..21223n.2223...",
        "..2223nn22123...",
        ".2122333nRY33n..",
        ".2223333nRR3nn..",
        ".233333nn3333n..",
        "..nnnnn..nnnn...",
        "................",
        "................",
    ],
    'wares': [  # a clay pot with a painted band
        "................",
        "....RRRRRRRR....",
        ".....rrrrrr.....",
        "......RRrr......",
        "....RRRRRRrr....",
        "...RCRRRRRRrr...",
        "..RRRRRRRRRRrr..",
        "..CCcCCcCCcCCc..",
        "..rCrrCrrCrrCr..",
        "..RRRRRRRRRRrr..",
        "...RRRRRRRRrr...",
        "....RRRRRrrr....",
        ".....rrrrrr.....",
        ".....rrrrrr.....",
        "................",
        "................",
    ],
    'services': [  # a desk service bell
        "................",
        "................",
        "................",
        "......1122......",
        ".......33.......",
        ".....11111......",
        "....1W11112.....",
        "...1W1111122....",
        "..1W11111122....",
        "..1111111122....",
        "..2222222223....",
        ".TTTTTTTTTTTTt..",
        ".tttttttttttuu..",
        "................",
        "................",
        "................",
    ],
}

# ---------------------------------------------------------------------------- goods, 8x8
GOODS_8 = {
    'grain': [
        "........",
        ".L.LY.Y.",
        ".YbYbYb.",
        "..YbYb..",
        "...tt...",
        "..SsSs..",
        ".SsSsSs.",
        "........",
    ],
    'fresh-food': [
        "........",
        "..Gg.g..",
        ".GggfRr.",
        ".SSSSSS.",
        ".TtTtTu.",
        "..tTtu..",
        "..uuuu..",
        "........",
    ],
    'timber': [
        "........",
        ".STTTT..",
        ".sttuu..",
        "........",
        "..STTTT.",
        "..sttuu.",
        "........",
        "........",
    ],
    'stone': [
        "........",
        "..11111.",
        ".1W1113.",
        ".222233.",
        ".232233.",
        ".222233.",
        ".33333..",
        "........",
    ],
    'metal': [
        "........",
        "........",
        "..WW11..",
        ".122223.",
        ".122223.",
        ".333333.",
        "........",
        "........",
    ],
    'fuel': [
        "........",
        "...12...",
        "..1223..",
        ".12.333.",
        ".123.R3.",
        ".2333Y3.",
        "........",
        "........",
    ],
    'wares': [
        "........",
        "..RRRR..",
        "...Rr...",
        ".RRRRRr.",
        ".CCcCCc.",
        ".RRRRrr.",
        "..rrrr..",
        "........",
    ],
    'services': [
        "........",
        "...33...",
        "..W112..",
        ".1W1122.",
        ".111122.",
        ".TTTTTt.",
        ".ttttuu.",
        "........",
    ],
}

# ---------------------------------------------------------------------------- food, 16x16
FOOD_16 = {
    'grain': [  # a bowl of cooked grain
        "................",
        "................",
        "................",
        "................",
        "......CCCC......",
        "....CWCCSCCc....",
        "...CCSCCCCScc...",
        "..CSCCCScCCSCc..",
        ".EEEEEEEEEEEEEe.",
        ".EAAEEEEEEEEEee.",
        "..EEEEEEEEEEee..",
        "...eEEEEEEEee...",
        "....eeeeeeee....",
        ".....eeeeee.....",
        "................",
        "................",
    ],
    'bread': [  # a scored loaf
        "................",
        "................",
        "................",
        "................",
        "......SSSST.....",
        "....SSCSSTSTT...",
        "...SCSSTSSTSTt..",
        "..STSSTSSTSSTTt.",
        "..TSSTSSTSSTTTt.",
        "..TTTTTTTTTTTtt.",
        "..TTTTTTTTTTttt.",
        "...tttttttttttu.",
        "....uuuuuuuuuu..",
        "................",
        "................",
        "................",
    ],
    'produce': [  # a carrot
        "................",
        "...........G.G..",
        "..........gGgG..",
        "...........ggf..",
        ".........RRRf...",
        "........RYRRr...",
        ".......RYRRr....",
        "......RRRrr.....",
        ".....RYRrr......",
        "....RRRr........",
        "....RRrr........",
        "...RRr..........",
        "..Rr............",
        "..r.............",
        "................",
        "................",
    ],
    'dairy': [  # a milk bottle
        "................",
        "......aaaa......",
        "......Aaaa......",
        "......WWWc......",
        "......WWWc......",
        ".....WWWWcc.....",
        "....WWWWWWcc....",
        "....WWWWWWWc....",
        "....aaaaaaaa....",
        "....aAAaaaan....",
        "....aaaaaaan....",
        "....WWWWWWWc....",
        "....WWWWWWcc....",
        "....cccccccc....",
        "................",
        "................",
    ],
    'fresh-protein': [  # a fish
        "................",
        "................",
        "................",
        "................",
        "......aaaa..aa..",
        "....aaAAaaa.aa..",
        "...a1O11A1aaaa..",
        "..1111111111aa..",
        "..WW1111111aaa..",
        "...WWWW1111.aa..",
        ".....WWWW...aa..",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    'preserved': [  # a jar of preserves
        "................",
        "................",
        "....YYYYYYY.....",
        "....bbbbbbb.....",
        ".....AAAAA......",
        "....AMMMMMA.....",
        "...AWMMMMMMA....",
        "...AWMMpMMMA....",
        "...ACCCCCCcA....",
        "...ACCCCCCcA....",
        "...AWMMMMMMA....",
        "...AMMMMMMMA....",
        "....AMMMMMA.....",
        ".....AAAAA......",
        "................",
        "................",
    ],
}

FOOD_8 = {
    'grain': [
        "........",
        "........",
        "..CCCC..",
        ".CSCCSc.",
        ".EEEEEe.",
        "..EEEe..",
        "...ee...",
        "........",
    ],
    'bread': [
        "........",
        "...TTT..",
        "..TSCTt.",
        ".TSTSTt.",
        ".TTTTTt.",
        "..ttuu..",
        "........",
        "........",
    ],
    'produce': [
        "........",
        ".....Gg.",
        "....RRf.",
        "...RYr..",
        "..RRr...",
        ".Rr.....",
        "........",
        "........",
    ],
    'dairy': [
        "........",
        "...aa...",
        "...Wc...",
        "..WWWc..",
        "..aaan..",
        "..WWWc..",
        "..cccc..",
        "........",
    ],
    'fresh-protein': [
        "........",
        "........",
        "..aaa.a.",
        ".1Oa1aa.",
        ".W111aa.",
        "..WWW.a.",
        "........",
        "........",
    ],
    'preserved': [  # square shoulders and base, unlike the round-bellied pot
        "........",
        "..YYYY..",
        "..AAAA..",
        ".AWMMMA.",
        ".ACCCcA.",
        ".AMMMMA.",
        ".AAAAAA.",
        "........",
    ],
}

FRESHNESS_8 = {
    'fresh': [  # an upright leaf
        "........",
        "....GG..",
        "...GGgg.",
        "..GgGgf.",
        "..ggGff.",
        "..gGff..",
        ".ff.....",
        "........",
    ],
    'stale': [  # the same leaf wilted: hanging from its stem, in dull browns
        "........",
        ".tt.....",
        "..sstt..",
        "..sSstt.",
        "..sssst.",
        "...sstu.",
        "....tu..",
        "........",
    ],
    'last-day': [  # a tiny clock
        "........",
        "..WWWW..",
        ".WWNWWc.",
        ".WWNWWc.",
        ".WWNNNc.",
        ".WWWWcc.",
        "..cccc..",
        "........",
    ],
}

# ---------------------------------------------------------------------------- carried goods, 8x8
# What a blob carries home from the street (M2.7): one frame per good, held by every hue alike, so no item says what its
# carrier earns. Plain pictograms, and never a sack, which reads as a crime costume.
CARRY_8 = {
    'bread': [  # a scored loaf
        "........",
        "..SSSS..",
        ".STCTCt.",
        ".TTSTSt.",
        ".TTTTTt.",
        "..tttu..",
        "........",
        "........",
    ],
    'vegetables': [  # a bunch of greens tied with twine, two carrots below
        "........",
        ".G.Gg.g.",
        ".GgGgGf.",
        "..gGgf..",
        "..SSSs..",
        ".RR.RRr.",
        "..R..Rr.",
        "........",
    ],
    'fish': [  # a silver fish with a blue tail
        "........",
        "........",
        "..111.a.",
        ".1O11aa.",
        ".W111aa.",
        "..WWW.a.",
        "........",
        "........",
    ],
    'milk': [  # a jug with a blue stopper and a handle
        "........",
        "..aa....",
        "..Wc....",
        ".WWWc.c.",
        ".WWWc.c.",
        ".WaWcc..",
        ".WWWc...",
        "........",
    ],
    'cloth': [  # a bolt folded over twice: lilac on ice
        "........",
        ".KKKKQ..",
        ".kkkkQM.",
        ".qqqqqM.",
        ".Iiiiij.",
        ".JJJJJj.",
        "........",
        "........",
    ],
    'tools': [  # a hammer and a saw
        "........",
        ".111.t..",
        ".232.t..",
        "..t.11..",
        "..t.11..",
        "..t.23..",
        "..u.3...",
        "........",
    ],
    'fuel': [  # firewood: a pile of three log ends, as the Fuel Store's sign and woodpile show it
        "........",
        "..tTt...",
        "..TST...",
        "..tTt...",
        ".tTttTt.",
        ".TSTTST.",
        ".tTttTt.",
        "........",
    ],
}

COIN_16 = [
    "................",
    ".....bbbbbb.....",
    "...LLYYYYYYbb...",
    "..LYYYYYYYYYbb..",
    "..LYWYbbbbYYYb..",
    ".LYWYbYYYYbYYbD.",
    ".LYYbYYYYYYbYbD.",
    ".LYYbYYYYYYbYbD.",
    ".LYYbYYYYYYbYbD.",
    ".bYYbYYYYYYbYbD.",
    ".bYYYbYYYYbYbbD.",
    "..bYYYbbbbYYbD..",
    "..bbYYYYYYYbbD..",
    "...bbbbbbbbDD...",
    ".....DDDDDD.....",
    "................",
]
COIN_8 = [
    "........",
    "..LYYb..",
    ".LWYYYb.",
    ".YYYYbD.",
    ".YYYYbD.",
    ".bYbbbD.",
    "..DDDD..",
    "........",
]

# ---------------------------------------------------------------------------- emote bubbles, 12x12
BUBBLE = [
    "..OOOOOOOO..",
    ".OWWWWWWWWO.",
    "OWWWWWWWWWWO",
    "OWWWWWWWWWWO",
    "OWWWWWWWWWWO",
    "OWWWWWWWWWWO",
    "OWWWWWWWWWWO",
    "OWWWWWWWWWWO",
    ".OWWWWWWWWO.",
    "..OOOOWWOO..",
    ".....OWO....",
    "......O.....",
]
BUBBLE_TIP = (6, 11)
# Glyphs are drawn on the bubble's own 12x12 grid; '.' keeps the bubble underneath.
EMOTES = {
    'heart': [
        "............",
        "............",
        "...pp..pp...",
        "..pPPppppp..",
        "..pPpppppM..",
        "...pppppM...",
        "....ppMM....",
        ".....pM.....",
        "............",
        "............",
        "............",
        "............",
    ],
    'sweat': [
        "............",
        "......a.....",
        ".....aa.....",
        "....aaaa....",
        "...aAaaaa...",
        "...AWaaaa...",
        "...Aaaaan...",
        "....aaan....",
        ".....nn.....",
        "............",
        "............",
        "............",
    ],
    'sleep': [  # a big Z and a small z that never touch
        "............",
        "............",
        ".......NNNN.",
        ".........N..",
        "..NNNNN.N...",
        "....NN.NNNN.",
        "...NN.......",
        "..NN........",
        "..NNNNN.....",
        "............",
        "............",
        "............",
    ],
    'coin': [
        "............",
        ".....DD.....",
        "....DDDDD...",
        "...DD.......",
        "....DDDD....",
        ".......DD...",
        "...DDDDD....",
        ".....DD.....",
        "............",
        "............",
        "............",
        "............",
    ],
    'exclaim': [
        "............",
        ".....VV.....",
        ".....VV.....",
        ".....VV.....",
        ".....VV.....",
        ".....rr.....",
        "............",
        ".....VV.....",
        ".....rr.....",
        "............",
        "............",
        "............",
    ],
    'question': [
        "............",
        "....aaaa....",
        "...aa..aa...",
        ".......aa...",
        ".....aaa....",
        ".....aa.....",
        "............",
        ".....aa.....",
        ".....aa.....",
        "............",
        "............",
        "............",
    ],
    'food': [
        "............",
        "............",
        "....SSSS....",
        "...SCSTSt...",
        "..SCSTSTtt..",
        "..TTTTTTtt..",
        "..tttttttu..",
        "...uuuuuu...",
        "............",
        "............",
        "............",
        "............",
    ],
}

# ---------------------------------------------------------------------------- HUD pips, 8x8
_METER = [  # three rising steps, numbered 1-3; each step is two pixels wide (light, dark)
    "........",
    ".....33.",
    ".....33.",
    "...2233.",
    "...2233.",
    ".112233.",
    ".112233.",
    "........",
]


def _meter(filled, light, dark):
    """A three-step wellbeing meter with the first `filled` steps lit (shape, not just colour)."""
    rows = []
    for row in _METER:
        out = ''
        for x, ch in enumerate(row):
            if ch in '123':
                step = int(ch)
                lit = step <= filled
                left = x % 2 == 1
                out += (light if left else dark) if lit else 'c'
            else:
                out += ch
        rows.append(out)
    return rows


PIPS = {
    'suffering': _meter(1, 'p', 'M'),
    'struggling': _meter(2, 'Y', 'b'),
    'thriving': _meter(3, 'G', 'g'),
    'house': [
        "........",
        "...RR...",
        "..RRRr..",
        ".RRRRrr.",
        "..CCCc..",
        "..CtCc..",
        "..CtCc..",
        "........",
    ],
    'crime-alert': [
        "........",
        "...VV...",
        "...VV...",
        "..VWWV..",
        "..VWWV..",
        ".VVVVVV.",
        ".VVWWVV.",
        "........",
    ],
    'records': [
        "........",
        ".SSSSSs.",
        "..C22c..",
        "..CCCc..",
        "..C22c..",
        "..CCCc..",
        ".SSSSSs.",
        "........",
    ],
}

# Stock pips (M2.7): a premises's stock against a day's demand, 0 to 3, over its roof. Three beads in a triangle light
# bottom left, bottom right, then top; the unlit ones show the capacity. A bead is 2x2, so it stays a bead and not a tally mark.
BEADS = ((1, 5), (5, 5), (3, 1))


def _beads(level):
    rows = [['.'] * 8 for _ in range(8)]
    for i, (x, y) in enumerate(BEADS):
        for dy, line in enumerate(('WC', 'Cc') if i < level else ('12', '23')):
            rows[y + dy][x:x + 2] = line
    return [''.join(row) for row in rows]


STOCK_PIPS = [_beads(level) for level in range(4)]


def bubble(name):
    rows = [''.join(g if g != '.' else b for g, b in zip(glyph, base))
            for glyph, base in zip(EMOTES[name], BUBBLE)]
    _check(rows, 12, 12, f'emote {name}')
    return sk.from_ascii(rows, KEY)


def build():
    sheet = sk.Sheet('icons')
    for name in GOODS_16:
        sheet.add(f'good_{name}_16', icon(GOODS_16[name], 16, name))
        sheet.add(f'good_{name}_8', icon(GOODS_8[name], 8, name))
    for name in FOOD_16:
        sheet.add(f'food_{name}_16', icon(FOOD_16[name], 16, name))
        sheet.add(f'food_{name}_8', icon(FOOD_8[name], 8, name))
    for name, rows in FRESHNESS_8.items():
        sheet.add(f'freshness_{name}_8', icon(rows, 8, name))
    sheet.add('coin_16', icon(COIN_16, 16, 'coin'))
    sheet.add('coin_8', icon(COIN_8, 8, 'coin'))
    for name in EMOTES:
        sheet.add(f'emote_{name}', bubble(name), anchor=BUBBLE_TIP)
    for name, rows in PIPS.items():
        sheet.add(f'pip_{name}', icon(rows, 8, name))
    for name, rows in CARRY_8.items():
        sheet.add(f'carry_{name}', icon(rows, 8, name))
    for level, rows in enumerate(STOCK_PIPS):
        sheet.add(f'pip_stock_{level}', icon(rows, 8, f'stock {level}'))
    return sheet


if __name__ == '__main__':
    build().save()
