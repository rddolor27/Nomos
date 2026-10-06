"""Animals: farm livestock and town animals for Nomos, drawn as hand-authored ASCII grids.

Cow and horse use 24x24 canvases; sheep, goat, pig, dog, cat, chicken and duck use 16x16; the
pigeon is 8x8 and the fish 16x8. Walkers get <animal>_idle_<dir> and <animal>_walk_<dir>_<0|1> for
down, up, left and right (right mirrors left). Extras: graze (cow, horse, sheep, goat), peck
(chicken, bird), swim (duck, fish) and fly (bird). Eyes are NAVY_D dots; OUTLINE only rings shapes.
"""
import spritekit as sk
from spritekit import add_outline, cmap, from_ascii, mirror, pad, recolor

EYE = 'NAVY_D'


def check(rows, w, h, name):
    assert len(rows) == h, f'{name}: {len(rows)} rows, want {h}'
    for i, r in enumerate(rows):
        assert len(r) == w, f'{name}: row {i} is {len(r)} wide, want {w}'
    return rows


def legs(body, strip):
    """Swap the bottom rows of a grid for a leg strip (one walk phase)."""
    return body[:len(body) - len(strip)] + strip


def render(rows, symbols):
    return add_outline(pad(from_ascii(rows, symbols)))


def with_ripples(im, rows, symbols):
    """Lay unoutlined ripples over a swimming sprite: the last row replaces the outline under its waterline."""
    out = im.copy()
    out.alpha_composite(from_ascii(rows, symbols), (1, im.height - 1 - len(rows)))
    return out


COW = cmap(w='WHITE', c='CREAM_D', s='STONE_L', k='STONE_D', p='PINK', q='PINK_D', h='SAND', e=EYE)

COW_LEFT = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '......................',  # 2
    '......................',  # 3
    '......................',  # 4
    '......................',  # 5
    '......................',  # 6
    '..h...................',  # 7
    '.wwhw...wwwwkkkkwww...',  # 8
    'wwwwwkk.wwwkkkkkwwkkww',  # 9
    'wwewwwkwwwwwkkkkwwkk.w',  # 10
    'wwwwwwwwwwwwwkkwwwwk.w',  # 11
    'ppwwwwwwwwwwwwwwwwwc.w',  # 12
    'pqpwwwwwwwwwwwwwwwwc.w',  # 13
    'pppcwwwwwwwwwwwwwwcc.k',  # 14
    '.....cwwwwwwwwwwwccc.k',  # 15
    '......ccwwwwwwwwwccc..',  # 16
    '.......cccccccccccc...',  # 17
    '.......wwcc.pp.ccww...',  # 18
    '.......wwcc....ccww...',  # 19
    '.......wwcc....ccww...',  # 20
    '.......kkkk....kkkk...',  # 21
]
COW_LEFT_WALK = [
    ['.......wwcc.pp.ccww...',
     '......ww..cc..cc..ww..',
     '......ww..cc..cc..ww..',
     '......kk..kk..kk..kk..'],
    ['.......wwcc.pp.ccww...',
     '.......cww......wwc...',
     '.......cww......wwc...',
     '.......kkk......kkk...'],
]
COW_LEFT_GRAZE = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '......................',  # 2
    '......................',  # 3
    '......................',  # 4
    '......................',  # 5
    '......................',  # 6
    '......................',  # 7
    '........wwwwkkkkwww...',  # 8
    '......wwwwwkkkkkwwkkww',  # 9
    '.....wwwwwwwkkkkwwkk.w',  # 10
    '....kwwwwwwwwkkwwwwk.w',  # 11
    '...kkwwwwwwwwwwwwwwc.w',  # 12
    '..hwwwwwwwwwwwwwwwwc.w',  # 13
    '.hwwwcwwwwwwwwwwwwcc.k',  # 14
    '.wwwwccwwwwwwwwwwccc.k',  # 15
    '.wewwc.cwwwwwwwwwccc..',  # 16
    '.wwwwc.cccccccccccc...',  # 17
    'wwwwc..wwcc.pp.ccww...',  # 18
    'ppwwc..wwcc....ccww...',  # 19
    'pqpc...wwcc....ccww...',  # 20
    'ppp....kkkk....kkkk...',  # 21
]

COW_DOWN = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '......................',  # 2
    '.......wwwwwwww.......',  # 3
    '.....wwwwwwkkkwww.....',  # 4
    '....wwwwwwkkkkkwwc....',  # 5
    '...wwkkwwwwwkkwwwcc...',  # 6
    '...wkkkwwwwwwwwwwcc...',  # 7
    '...wwkwhwwwwwwhwwcc...',  # 8
    '...wwwwwhwwwwhwwwcc...',  # 9
    '..kkkkwwwwwwwwwwkkkk..',  # 10
    '..kkkcwewwwwwwewckkk..',  # 11
    '...wwcwwwwwwwwwwccc...',  # 12
    '...wwccwwwwwwwwcccc...',  # 13
    '....wwcppppppppccc....',  # 14
    '....wwcpqppppqpccc....',  # 15
    '.....wcppppppppcc.....',  # 16
    '.....ww.pppppp.wc.....',  # 17
    '.....ww........wc.....',  # 18
    '.....ww........wc.....',  # 19
    '.....ww........wc.....',  # 20
    '.....kk........kk.....',  # 21
]
COW_DOWN_WALK = [
    ['.....ww........wc.....',
     '.....kk........wc.....',
     '...............wc.....',
     '...............kk.....'],
    ['.....ww........wc.....',
     '.....ww........kk.....',
     '.....ww...............',
     '.....kk...............'],
]

COW_UP = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '........h....h........',  # 2
    '......kkhwwwwhkk......',  # 3
    '.....kkkwwwwwwkkk.....',  # 4
    '.......wwwwwwww.......',  # 5
    '.....wwwwwwwwwwww.....',  # 6
    '....wwwwwwwkkkwwwc....',  # 7
    '...wwkkwwwwkkkkwwcc...',  # 8
    '...wkkkkwwwwkkwwwcc...',  # 9
    '...wwkkwwwwwwwwwwcc...',  # 10
    '...wwwwwwwwwwwkkkcc...',  # 11
    '...wwwwwwwwwwkkkkcc...',  # 12
    '...wwwwwwwwwwwkkccc...',  # 13
    '...cwwwwwwkwwwwwccc...',  # 14
    '....cwwwwwkwwwwccc....',  # 15
    '....ccwwwwkwwwwcc.....',  # 16
    '.....cccccqccccc......',  # 17
    '....ww...kkk...wc.....',  # 18
    '....ww...ppp...wc.....',  # 19
    '....ww.........wc.....',  # 20
    '....kk.........kk.....',  # 21
]
COW_UP_WALK = [
    ['....ww...kkk...wc.....',
     '....kk...ppp...wc.....',
     '...............wc.....',
     '...............kk.....'],
    ['....ww...kkk...wc.....',
     '....ww...ppp...kk.....',
     '....ww................',
     '....kk................'],
]


# Horse: a bay, WOOD coat with WOOD_D mane, tail and lower legs, and a CREAM blaze.
HORSE = cmap(b='WOOD', l='WOOD_L', d='WOOD_D', k='STONE_D', m='CREAM', e=EYE, n=EYE)

HORSE_LEFT = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '....bd................',  # 2
    '...lbdd...............',  # 3
    '..lbbbdd..............',  # 4
    '.mbebbbdd.............',  # 5
    'mbbbbbbbdd............',  # 6
    'bbbbbbbbbdd...........',  # 7
    'bbb..lbbbbdd..........',  # 8
    'dd...lbbbbbdllllllld..',  # 9
    '.....lbbbbbbbbbbbbbbdd',  # 10
    '......bbbbbbbbbbbbbb.d',  # 11
    '......bbbbbbbbbbbbbb.d',  # 12
    '......dbbbbbbbbbbbbd.d',  # 13
    '.......dbbbbbbbbbbbd.d',  # 14
    '.......bbdddddddddbbdd',  # 15
    '.......bb.dd...dd.bb..',  # 16
    '.......bb.dd...dd.bb..',  # 17
    '.......bb.dd...dd.bb..',  # 18
    '.......dd.dd...dd.dd..',  # 19
    '.......dd.dd...dd.dd..',  # 20
    '.......kk.kk...kk.kk..',  # 21
]
HORSE_LEFT_WALK = [
    ['.......bb.dd...dd.bb..',
     '......bb...dd.dd...bb.',
     '......bb...dd.dd...bb.',
     '.....dd....dd.dd...dd.',
     '.....dd....dd.dd...dd.',
     '.....kk....kk.kk...kk.'],
    ['.......bb.dd...dd.bb..',
     '.......dbb.....bbd....',
     '.......dbb.....bbd....',
     '.......ddd.....ddd....',
     '.......ddd.....ddd....',
     '.......kkk.....kkk....'],
]
HORSE_LEFT_GRAZE = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '......................',  # 2
    '......................',  # 3
    '......................',  # 4
    '......................',  # 5
    '......................',  # 6
    '......................',  # 7
    '......................',  # 8
    '..........ddllllllld..',  # 9
    '........ddbbbbbbbbbbdd',  # 10
    '.......ddlbbbbbbbbbb.d',  # 11
    '......ddlbbbbbbbbbbb.d',  # 12
    '.....bdlbbbbbbbbbbbd.d',  # 13
    '....lbbbbbbbbbbbbbbd.d',  # 14
    '...lbbbbbdddddddddbbdd',  # 15
    '..mbeb.bb.dd...dd.bb..',  # 16
    '..mbbd.bb.dd...dd.bb..',  # 17
    '..mbbd.bb.dd...dd.bb..',  # 18
    '..bbbd.dd.dd...dd.dd..',  # 19
    '..dbd..dd.dd...dd.dd..',  # 20
    '..dd...kk.kk...kk.kk..',  # 21
]

HORSE_DOWN = [
    # 0123456789012345678901
    '......................',  # 0
    '......................',  # 1
    '......................',  # 2
    '........b....b........',  # 3
    '........lbddbb........',  # 4
    '.......dlbddbbd.......',  # 5
    '......ldebbbbedb......',  # 6
    '.....lbdlbmbbbdbb.....',  # 7
    '.....lbdlbbbbbdbd.....',  # 8
    '.....lbdlbbbbbdbd.....',  # 9
    '.....lbdlbbbbbdbd.....',  # 10
    '.....lbbddddddbbd.....',  # 11
    '.....bbbdnddndbbd.....',  # 12
    '.....dbbbddddbbdd.....',  # 13
    '......bbbbbbbbbd......',  # 14
    '......bb......bd......',  # 15
    '......bb......bd......',  # 16
    '......bb......bd......',  # 17
    '......dd......dd......',  # 18
    '......dd......dd......',  # 19
    '......dd......dd......',  # 20
    '......kk......kk......',  # 21
]
HORSE_DOWN_WALK = [
    ['......bb......bd......',
     '......dd......bd......',
     '......dd......dd......',
     '......kk......dd......',
     '..............dd......',
     '..............kk......'],
    ['......bb......bd......',
     '......bb......dd......',
     '......dd......dd......',
     '......dd......kk......',
     '......dd..............',
     '......kk..............'],
]

HORSE_UP = [
    # 0123456789012345678901
    '......................',  # 0
    '........b....b........',  # 1
    '........bbddbb........',  # 2
    '........lbddbb........',  # 3
    '........lbddbb........',  # 4
    '.......lbbddbbb.......',  # 5
    '......lbbbddbbbb......',  # 6
    '.....lbbbbddbbbbd.....',  # 7
    '....lbbbbbbbbbbbbd....',  # 8
    '....lbbbbbbbbbbbbd....',  # 9
    '....lbbbbbbbbbbbbd....',  # 10
    '....lbbbbbddbbbbbd....',  # 11
    '....lbbbbbddbbbbbd....',  # 12
    '....bbbbbbddbbbbdd....',  # 13
    '.....bbbbbddbbbbd.....',  # 14
    '.....dbbbbddbbbdd.....',  # 15
    '......bb..dd..bd......',  # 16
    '......bb..dd..bd......',  # 17
    '......dd..dd..dd......',  # 18
    '......dd......dd......',  # 19
    '......dd......dd......',  # 20
    '......kk......kk......',  # 21
]
HORSE_UP_WALK = [
    ['......bb..dd..bd......',
     '......dd..dd..bd......',
     '......dd..dd..dd......',
     '......kk......dd......',
     '..............dd......',
     '..............kk......'],
    ['......bb..dd..bd......',
     '......bb..dd..dd......',
     '......dd..dd..dd......',
     '......dd......kk......',
     '......dd..............',
     '......kk..............'],
]


# Sheep: CREAM wool with a scalloped top, STONE_D face and legs.
SHEEP = cmap(w='CREAM', W='WHITE', c='CREAM_D', k='STONE_D', K='STONE', e=EYE)

SHEEP_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '....WW.Ww.ww..',  # 3
    '...wWWwwwwwww.',  # 4
    '.kkwWwwwwwwwwc',  # 5
    'kKKkkwwwwwwwwc',  # 6
    'kKekwwwwwwwwcc',  # 7
    'kkkkcwwwwwwccc',  # 8
    '.kk.ccwwwwcccc',  # 9
    '....cccccccc..',  # 10
    '....k.k...k.k.',  # 11
    '....k.k...k.k.',  # 12
    '....k.k...k.k.',  # 13
]
SHEEP_LEFT_WALK = [
    ['....k.k...k.k.',
     '...k...k.k...k',
     '...k...k.k...k'],
    ['....k.k...k.k.',
     '.....kk...kk..',
     '.....kk...kk..'],
]
SHEEP_LEFT_GRAZE = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '....WW.Ww.ww..',  # 3
    '...wWWwwwwwww.',  # 4
    '..wWwwwwwwwwwc',  # 5
    '..wwwwwwwwwwwc',  # 6
    '..kkwwwwwwwwcc',  # 7
    '.kKkkwwwwwwccc',  # 8
    'kKkk.ccwwwcccc',  # 9
    'kekk..cccccc..',  # 10
    'kkk.k.k...k.k.',  # 11
    'kkk.k.k...k.k.',  # 12
    '.k..k.k...k.k.',  # 13
]
SHEEP_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '...WW.ww.ww...',  # 2
    '..wWWwwwwwwc..',  # 3
    '.wWWwwwwwwwwc.',  # 4
    '.wWwwwwwwwwwc.',  # 5
    '.wwwwkkkkwwwc.',  # 6
    '.wwkkKkkkkkwc.',  # 7
    '.wwwwekkewwcc.',  # 8
    '.cwwwkkkkwwcc.',  # 9
    '..cccckkcccc..',  # 10
    '....k....k....',  # 11
    '....k....k....',  # 12
    '....k....k....',  # 13
]
SHEEP_DOWN_WALK = [
    ['....k....k....',
     '.........k....'],
    ['....k....k....',
     '....k.........'],
]
SHEEP_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '.....kkkk.....',  # 2
    '...kkkkkkkk...',  # 3
    '..wWWwwwwwwc..',  # 4
    '.wWWwwwwwwwwc.',  # 5
    '.wWwwwwwwwwwc.',  # 6
    '.wwwwwwwwwwwc.',  # 7
    '.wwwwwWWwwwcc.',  # 8
    '.cwwwwwwwwccc.',  # 9
    '..cccccccccc..',  # 10
    '....k....k....',  # 11
    '....k....k....',  # 12
    '....k....k....',  # 13
]

# Goat: SAND coat, CREAM_D beard and socks, STONE_L horns curving back.
GOAT = cmap(s='SAND', S='SAND_D', h='CREAM', c='CREAM_D', g='STONE_L', G='STONE', k='STONE_D', e=EYE)

GOAT_LEFT = [
    # 01234567890123
    '...gg.........',  # 0
    '..gG..........',  # 1
    '.hss..........',  # 2
    'hsesSS........',  # 3
    'sssss.......S.',  # 4
    'cssss.hhhhhhs.',  # 5
    '.cc.sssssssssS',  # 6
    '..c.sssssssssS',  # 7
    '....SsssssssSS',  # 8
    '.....SSSSSSSS.',  # 9
    '....s.S...S.s.',  # 10
    '....s.S...S.s.',  # 11
    '....c.S...S.c.',  # 12
    '....k.k...k.k.',  # 13
]
GOAT_LEFT_WALK = [
    ['....s.S...S.s.',
     '...s...S.S...s',
     '...c...S.S...c',
     '...k...k.k...k'],
    ['....s.S...S.s.',
     '.....sS...Ss..',
     '.....cS...Sc..',
     '.....kk...kk..'],
]
GOAT_LEFT_GRAZE = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '............S.',  # 4
    '......hhhhhhs.',  # 5
    '....hssssssssS',  # 6
    '..gGssssssssSS',  # 7
    '.ghsSSsssssSSS',  # 8
    '.hss..SSSSSSS.',  # 9
    'hses..S...S.s.',  # 10
    'sss.s.S...S.s.',  # 11
    'ccc.c.S...S.c.',  # 12
    '.c..k.k...k.k.',  # 13
]
GOAT_DOWN = [
    # 01234567890123
    '....g....g....',  # 0
    '.....g..g.....',  # 1
    '.....hsss.....',  # 2
    '..SSSssssSSS..',  # 3
    '...hSesseSS...',  # 4
    '..hsSssssSSS..',  # 5
    '..hsSccccSSS..',  # 6
    '..hsSSccSSSS..',  # 7
    '...SSSccSSS...',  # 8
    '....s.cc.S....',  # 9
    '....s....S....',  # 10
    '....s....S....',  # 11
    '....c....c....',  # 12
    '....k....k....',  # 13
]
GOAT_DOWN_WALK = [
    ['....s....S....',
     '....k....c....',
     '.........k....'],
    ['....s....S....',
     '....c....k....',
     '....k.........'],
]
GOAT_UP = [
    # 01234567890123
    '....g....g....',  # 0
    '.....gsssg....',  # 1
    '..SSShsssSSS..',  # 2
    '.....hsss.....',  # 3
    '...hhssssss...',  # 4
    '..hssssssssS..',  # 5
    '..hssssssssS..',  # 6
    '..hssssSsssS..',  # 7
    '..sssshhsssS..',  # 8
    '...SSSssSSS...',  # 9
    '....s....s....',  # 10
    '....s....S....',  # 11
    '....c....c....',  # 12
    '....k....k....',  # 13
]

# Pig: PINK with PINK_D shade, a flat snout and a curled tail.
PIG = cmap(p='PINK', q='PINK_D', h='CREAM', n='PLUM', e=EYE)

PIG_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '...qq.........',  # 4
    '..qqhhppppp.q.',  # 5
    '.qqpppppppppq.',  # 6
    'qpepppppppppp.',  # 7
    'nqppppppppppq.',  # 8
    'qqpppppppppqq.',  # 9
    '.qqppppppppqq.',  # 10
    '..qqqqqqqqqq..',  # 11
    '..pp.q...q.pp.',  # 12
    '..qq.q...q.qq.',  # 13
]
PIG_LEFT_WALK = [
    ['.pp..q...q..pp',
     '.qq..q...q..qq'],
    ['...ppq...qpp..',
     '...qqq...qqq..'],
]
PIG_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '...qq....qq...',  # 3
    '..qqqhhppqqq..',  # 4
    '..qhpppppppq..',  # 5
    '.ppepppppppep.',  # 6
    '.pppqqqqqqppq.',  # 7
    '.pppqnqqnqppq.',  # 8
    '..pppqqqqppq..',  # 9
    '..qpppppppqq..',  # 10
    '...qqqqqqqq...',  # 11
    '...pp....pp...',  # 12
    '...qq....qq...',  # 13
]
PIG_DOWN_WALK = [
    ['...qq....pp...',
     '.........qq...'],
    ['...pp....qq...',
     '...qq.........'],
]
PIG_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '...qq....qq...',  # 3
    '..qqqhhppqqq..',  # 4
    '..qhpppppppq..',  # 5
    '.phpppppppppq.',  # 6
    '.phppppppppqq.',  # 7
    '.pppppqqpppqq.',  # 8
    '.ppppqppqppqq.',  # 9
    '..pppqpqpppq..',  # 10
    '...qqqqqqqq...',  # 11
    '...pp....pp...',  # 12
    '...qq....qq...',  # 13
]

# Dog: WOOD_L coat, WOOD ears, SAND muzzle, chest and paws.
DOG = cmap(b='WOOD_L', d='WOOD', s='SAND', n='WOOD_D', e=EYE)

DOG_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..bbb.........',  # 3
    '.bbebd.....b..',  # 4
    'nssbbdd....bd.',  # 5
    '.sssbdd....bd.',  # 6
    '..ssbbbbbbbbd.',  # 7
    '...sbbbbbbbbd.',  # 8
    '...sbbbbbbbdd.',  # 9
    '....bd.....bd.',  # 10
    '....bd.....bd.',  # 11
    '....bd.....bd.',  # 12
    '....ss.....ss.',  # 13
]
DOG_LEFT_WALK = [
    ['....bd.....bd.',
     '...b..d...d..b',
     '...s..s...s..s'],
    ['....bd.....bd.',
     '....db.....db.',
     '....ss.....ss.'],
]
DOG_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..........b...',  # 2
    '...dbbbbbbdb..',  # 3
    '..ddbbbbbbdd..',  # 4
    '..ddebbbbedd..',  # 5
    '..ddbssssbdd..',  # 6
    '..dd.snns.dd..',  # 7
    '....bssssbd...',  # 8
    '....bssssbd...',  # 9
    '....bssssbd...',  # 10
    '....b.ss.bd...',  # 11
    '....b....d....',  # 12
    '....s....s....',  # 13
]
DOG_DOWN_WALK = [
    ['....s....d....',
     '.........s....'],
    ['....b....s....',
     '....s.........'],
]
DOG_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '....bbbbbb....',  # 3
    '...dbbbbbbd...',  # 4
    '...ddbbbbdd...',  # 5
    '...dd.bb.dd...',  # 6
    '....bbsbbd....',  # 7
    '...bbbdbbbd...',  # 8
    '...bbbdbbbd...',  # 9
    '...bbbdbbbd...',  # 10
    '....bbbbbd....',  # 11
    '....bb..bd....',  # 12
    '....ss..ss....',  # 13
]
DOG_UP_WALK = [
    ['....ss..bd....',
     '........ss....'],
    ['....bb..ss....',
     '....ss........'],
]

# Cat: ROOF orange tabby with ROOF_D stripes, SAND muzzle and a PINK nose.
CAT = cmap(o='ROOF', d='ROOF_D', s='SAND', p='PINK', e=EYE)

CAT_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '............o.',  # 2
    '.o.o.........o',  # 3
    '.oooo........o',  # 4
    'oeooo........o',  # 5
    'psood.......o.',  # 6
    '.ssoodoodooo..',  # 7
    '...soooooooo..',  # 8
    '...ssooooood..',  # 9
    '....od....od..',  # 10
    '....od....od..',  # 11
    '....od....od..',  # 12
    '....ss....ss..',  # 13
]
CAT_LEFT_WALK = [
    ['....od....od..',
     '...o..d..d..o.',
     '...s..s..s..s.'],
    ['....od....od..',
     '....do....do..',
     '....ss....ss..'],
]
CAT_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '...o....o.....',  # 3
    '...oo..oo.....',  # 4
    '..oooddooo..o.',  # 5
    '..ooeooeoo..o.',  # 6
    '..oooppooo.d..',  # 7
    '...dossod..o..',  # 8
    '....osso..o...',  # 9
    '...oossood....',  # 10
    '...oooood.....',  # 11
    '....o..d......',  # 12
    '....s..s......',  # 13
]
CAT_DOWN_WALK = [
    ['....s..d......',
     '.......s......'],
    ['....o..s......',
     '....s.........'],
]
CAT_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '...o....o.....',  # 3
    '...oo..oo.....',  # 4
    '...oddddo.....',  # 5
    '...oooooo.....',  # 6
    '....oddo......',  # 7
    '....oood..o...',  # 8
    '....oddd..o...',  # 9
    '....oood.o....',  # 10
    '....odddo.....',  # 11
    '....o..d......',  # 12
    '....s..s......',  # 13
]

# Chicken: WHITE hen, VERMILLION comb and wattle, GOLD beak and feet.
CHICKEN = cmap(w='WHITE', c='CREAM_D', s='STONE_L', r='VERMILLION', y='GOLD', e=EYE)

CHICKEN_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '....rr........',  # 3
    '...wwwr....w..',  # 4
    '..yewww...ww..',  # 5
    '...rwww..wwc..',  # 6
    '....wwwwwwwc..',  # 7
    '....wwwwwwcc..',  # 8
    '....cwwccwcc..',  # 9
    '.....cwwwcc...',  # 10
    '......cccc....',  # 11
    '.......y.y....',  # 12
    '......yy.yy...',  # 13
]
CHICKEN_LEFT_WALK = [
    ['......y...y...',
     '.....yy...yy..'],
    ['........yy....',
     '.......yyy....'],
]
CHICKEN_LEFT_PECK = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '..............',  # 4
    '...........w..',  # 5
    '..........ww..',  # 6
    '.....wwwwwwc..',  # 7
    '...rwwwwwwcc..',  # 8
    '..rwwwccwccc..',  # 9
    '..wewwcwwcc...',  # 10
    '..rwwccccc....',  # 11
    '.y.r...y.y....',  # 12
    '.y....yy.yy...',  # 13
]
CHICKEN_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '......rr......',  # 3
    '.....wrrw.....',  # 4
    '.....ewwe.....',  # 5
    '....wwyyww....',  # 6
    '...wwwrrwwc...',  # 7
    '...wwwwwwwc...',  # 8
    '...cwwwwwcc...',  # 9
    '...ccwwwwcc...',  # 10
    '....cccccc....',  # 11
    '.....y..y.....',  # 12
    '....yy..yy....',  # 13
]
CHICKEN_DOWN_WALK = [
    ['.....y..y.....',
     '........yy....'],
    ['.....y..y.....',
     '....yy........'],
]
CHICKEN_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '......rr......',  # 3
    '.....wrrw.....',  # 4
    '.....wwww.....',  # 5
    '....wwwwww....',  # 6
    '...wwwwwwwc...',  # 7
    '...wcwwwwcc...',  # 8
    '...wcwwwwcc...',  # 9
    '...ccwccwcc...',  # 10
    '....cccccc....',  # 11
    '.....y..y.....',  # 12
    '....yy..yy....',  # 13
]

# Duck: WHITE farm duck with a GOLD bill and feet. Swim frames sit in the water.
DUCK = cmap(w='WHITE', c='CREAM_D', y='GOLD', Y='ROOF', e=EYE, r='WATER_L')

DUCK_LEFT = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '...ww.........',  # 4
    '..wewc........',  # 5
    'yywwwc........',  # 6
    '.Yywwc.....ww.',  # 7
    '...wwwwwwwwwc.',  # 8
    '..wwwwwwwwwcc.',  # 9
    '..cwwwwwwwccc.',  # 10
    '...ccccccccc..',  # 11
    '......y..y....',  # 12
    '.....yy.yy....',  # 13
]
DUCK_LEFT_WALK = [
    ['.....y....y...',
     '....yy...yy...'],
    ['.......yy.....',
     '......yyy.....'],
]
DUCK_DOWN = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '.....wwww.....',  # 4
    '.....ewwe.....',  # 5
    '.....wyyw.....',  # 6
    '.....yYYy.....',  # 7
    '....wwwwwc....',  # 8
    '...wwwwwwwc...',  # 9
    '..wwwwwwwwcc..',  # 10
    '..ccwwwwwccc..',  # 11
    '....yy..yy....',  # 12
    '...yyy..yyy...',  # 13
]
DUCK_DOWN_WALK = [
    ['....yy..yy....',
     '........yyy...'],
    ['....yy..yy....',
     '...yyy........'],
]
DUCK_UP = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '.....wwww.....',  # 4
    '.....wwww.....',  # 5
    '......ww......',  # 6
    '....wwwwwc....',  # 7
    '...wwwwwwwc...',  # 8
    '..wwwwwwwwcc..',  # 9
    '..wwwwwwwwcc..',  # 10
    '..ccwwwwwccc..',  # 11
    '....yywwyy....',  # 12
    '...yyy..yyy...',  # 13
]
# Swimming: the body sits low, the legs are under water and ripples ring the waterline.
DUCK_SWIM = [
    # 01234567890123
    '..............',  # 0
    '..............',  # 1
    '..............',  # 2
    '..............',  # 3
    '..............',  # 4
    '..............',  # 5
    '...ww.........',  # 6
    '..wewc........',  # 7
    'yywwwc........',  # 8
    '.Yywwc.....ww.',  # 9
    '...wwwwwwwwwc.',  # 10
    '..wwwwwwwwwcc.',  # 11
    '..cccccccccc..',  # 12
    '..............',  # 13
]
DUCK_RIPPLES = [
    ['rr..........rr', '...rrrrrrrr...'],
    ['.rr........rr.', '..rrrrrrrrrr..'],
]

# Pigeon: an ambient town bird on an 8x8 canvas.
BIRD = cmap(g='STONE_L', G='STONE', k='STONE_D', t='TEAL', p='PINK_D', e=EYE)

BIRD_LEFT = [
    # 012345
    '.gg...',  # 0
    'kegg..',  # 1
    '.tgGG.',  # 2
    '.gGGGk',  # 3
    '..gGG.',  # 4
    '..p.p.',  # 5
]
BIRD_LEFT_PECK = [
    # 012345
    '......',  # 0
    '....Gk',  # 1
    '..gGGG',  # 2
    '.tgGG.',  # 3
    'egg...',  # 4
    'k.p.p.',  # 5
]
BIRD_FLY = [
    [  # wings up
        'g....g',
        'Gg..gG',
        '.Gggg.',
        '..gg..',
        '..kk..',
        '......',
    ],
    [  # wings down
        '......',
        '..gg..',
        '.GggG.',
        'GGggGG',
        'G.kk.G',
        '......',
    ],
]

# Fish: side view for market stalls and docks, and swimming frames with a flicking tail.
FISH = cmap(f='WATER', F='NAVY', l='WATER_L', e=EYE)

FISH_LEFT = [
    # 01234567890123
    '...FFFF.......',  # 0
    '.ffffffff...FF',  # 1
    'fefffffffff.F.',  # 2
    'flllllllllfFF.',  # 3
    '.llllllllf..FF',  # 4
    '...ll.........',  # 5
]
FISH_LEFT_SWIM = [
    FISH_LEFT,
    [
        # 01234567890123
        '....FFFF......',  # 0
        '.ffffffff.....',  # 1
        'fefffffffff.FF',  # 2
        'flllllllllfF..',  # 3
        '.llllllllfFF..',  # 4
        '...ll......FF.',  # 5
    ],
]
SILVER = {'WATER': 'STONE_L', 'NAVY': 'STONE', 'WATER_L': 'WHITE'}


def add_walker(sheet, name, symbols, views, size):
    """views: {'down'|'up'|'left': (idle_grid, [walk0_strip, walk1_strip])}. Right mirrors left."""
    w, h = size
    for d, (idle, walk) in views.items():
        check(idle, w, h, f'{name} {d}')
        frames = {'idle': render(idle, symbols)}
        for i, strip in enumerate(walk):
            frames[f'walk_{i}'] = render(check(legs(idle, strip), w, h, f'{name} {d} walk {i}'), symbols)
        for f, im in frames.items():
            parts = (name, f, d) if f == 'idle' else (name, 'walk', d, f[-1])
            sheet.add('_'.join(parts), im)
            if d == 'left':
                rparts = (name, f, 'right') if f == 'idle' else (name, 'walk', 'right', f[-1])
                sheet.add('_'.join(rparts), mirror(im))


def add_pair(sheet, name, im):
    """Add a left-facing frame and its mirrored right-facing twin (name contains '{d}')."""
    sheet.add(name.format(d='left'), im)
    sheet.add(name.format(d='right'), mirror(im))


def build():
    sheet = sk.Sheet('animals')
    add_walker(sheet, 'cow', COW, {
        'down': (COW_DOWN, COW_DOWN_WALK),
        'up': (COW_UP, COW_UP_WALK),
        'left': (COW_LEFT, COW_LEFT_WALK),
    }, (22, 22))
    add_pair(sheet, 'cow_graze_{d}', render(check(COW_LEFT_GRAZE, 22, 22, 'cow graze'), COW))
    add_walker(sheet, 'horse', HORSE, {
        'down': (HORSE_DOWN, HORSE_DOWN_WALK),
        'up': (HORSE_UP, HORSE_UP_WALK),
        'left': (HORSE_LEFT, HORSE_LEFT_WALK),
    }, (22, 22))
    add_pair(sheet, 'horse_graze_{d}', render(check(HORSE_LEFT_GRAZE, 22, 22, 'horse graze'), HORSE))

    small = (14, 14)
    add_walker(sheet, 'sheep', SHEEP, {
        'down': (SHEEP_DOWN, SHEEP_DOWN_WALK),
        'up': (SHEEP_UP, SHEEP_DOWN_WALK),
        'left': (SHEEP_LEFT, SHEEP_LEFT_WALK),
    }, small)
    add_pair(sheet, 'sheep_graze_{d}', render(check(SHEEP_LEFT_GRAZE, 14, 14, 'sheep graze'), SHEEP))
    add_walker(sheet, 'goat', GOAT, {
        'down': (GOAT_DOWN, GOAT_DOWN_WALK),
        'up': (GOAT_UP, GOAT_DOWN_WALK),
        'left': (GOAT_LEFT, GOAT_LEFT_WALK),
    }, small)
    add_pair(sheet, 'goat_graze_{d}', render(check(GOAT_LEFT_GRAZE, 14, 14, 'goat graze'), GOAT))
    add_walker(sheet, 'pig', PIG, {
        'down': (PIG_DOWN, PIG_DOWN_WALK),
        'up': (PIG_UP, PIG_DOWN_WALK),
        'left': (PIG_LEFT, PIG_LEFT_WALK),
    }, small)
    add_walker(sheet, 'dog', DOG, {
        'down': (DOG_DOWN, DOG_DOWN_WALK),
        'up': (DOG_UP, DOG_UP_WALK),
        'left': (DOG_LEFT, DOG_LEFT_WALK),
    }, small)
    add_walker(sheet, 'cat', CAT, {
        'down': (CAT_DOWN, CAT_DOWN_WALK),
        'up': (CAT_UP, CAT_DOWN_WALK),
        'left': (CAT_LEFT, CAT_LEFT_WALK),
    }, small)
    add_walker(sheet, 'chicken', CHICKEN, {
        'down': (CHICKEN_DOWN, CHICKEN_DOWN_WALK),
        'up': (CHICKEN_UP, CHICKEN_DOWN_WALK),
        'left': (CHICKEN_LEFT, CHICKEN_LEFT_WALK),
    }, small)
    add_pair(sheet, 'chicken_peck_{d}', render(check(CHICKEN_LEFT_PECK, 14, 14, 'chicken peck'), CHICKEN))
    add_walker(sheet, 'duck', DUCK, {
        'down': (DUCK_DOWN, DUCK_DOWN_WALK),
        'up': (DUCK_UP, DUCK_DOWN_WALK),
        'left': (DUCK_LEFT, DUCK_LEFT_WALK),
    }, small)
    body = render(check(DUCK_SWIM, 14, 14, 'duck swim'), DUCK)
    for i, ripple in enumerate(DUCK_RIPPLES):
        add_pair(sheet, 'duck_swim_{d}_' + str(i), with_ripples(body, ripple, DUCK))

    add_pair(sheet, 'bird_idle_{d}', render(check(BIRD_LEFT, 6, 6, 'bird'), BIRD))
    add_pair(sheet, 'bird_peck_{d}', render(check(BIRD_LEFT_PECK, 6, 6, 'bird peck'), BIRD))
    for i, rows in enumerate(BIRD_FLY):
        sheet.add(f'bird_fly_{i}', render(check(rows, 6, 6, 'bird fly'), BIRD))

    for variant, mapping in (('fish', None), ('fish-silver', SILVER)):
        def fish(rows):
            im = render(check(rows, 14, 6, variant), FISH)
            return recolor(im, mapping) if mapping else im
        add_pair(sheet, variant + '_idle_{d}', fish(FISH_LEFT))
        for i, rows in enumerate(FISH_LEFT_SWIM):
            add_pair(sheet, variant + '_swim_{d}_' + str(i), fish(rows))
    return sheet


if __name__ == '__main__':
    build().save()
