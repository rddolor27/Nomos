"""Nature sprites for Nomos: terrain tiles, crops, trees, rocks and props.

GBA-era top-down pixel art in three-quarter view with light from the top left, drawn fresh as
ASCII grids in the shared 32-colour palette. Terrain and crop tiles have no outline and tile
seamlessly with themselves; trees, rocks and props get the 1-px outline ring.
"""
from spritekit import TILE, Sheet, add_outline, cmap, from_ascii, mirror, pad

# One symbol per palette colour; where colours pair up, uppercase is the lighter one.
# The BODY_* colours are left out on purpose so the blob body stays unique on the map,
# and NAVY (the police colour) is not used; NAVY_D only darkens coal and well water.
P = cmap(
    O='OUTLINE', W='WHITE', C='CREAM', c='CREAM_D', S='SAND', s='SAND_D',
    L='WOOD_L', w='WOOD', d='WOOD_D', G='GRASS_L', g='GRASS', k='LEAF_D',
    T='TEAL', t='TEAL_D', A='WATER_L', a='WATER', N='NAVY', n='NAVY_D',
    H='STONE_L', h='STONE', x='STONE_D', R='ROOF', r='ROOF_D', V='VERMILLION',
    Y='GOLD', P='PINK', p='PINK_D', U='PLUM',
)


def grid(rows, size=None):
    """Render one hand-drawn grid; rows must all be the same width."""
    width = len(rows[0])
    ragged = [i for i, r in enumerate(rows) if len(r) != width]
    if ragged:
        raise ValueError(f'ragged rows {ragged} (expected width {width})')
    if size and (width, len(rows)) != size:
        raise ValueError(f'grid is {width}x{len(rows)}, expected {size[0]}x{size[1]}')
    return from_ascii(rows, P)


def tile(rows):
    return grid(rows, (TILE, TILE))


def over(base, rows):
    """Lay a sparse grid ('.' = see-through) over a copy of base."""
    out = base.copy()
    out.alpha_composite(grid(rows, base.size))
    return out


def outlined(rows):
    return add_outline(pad(grid(rows)))


def transposed(rows):
    """The grid mirrored on its diagonal, so a run across the tile runs down it."""
    return [''.join(row[x] for row in rows) for x in range(len(rows[0]))]


# --------------------------------------------------------------------------- terrain
# Every detail stays inside its tile, so the three grass variants mix in any order.

GRASS = [
    [
        'gggggggggggggggg',
        'ggGgkggggggggggg',
        'gggkgggggggggggg',
        'ggggggggggkgkggg',
        'gggggggggggkgggg',
        'gggggggggggggggg',
        'gggggggggggggggg',
        'gggggGgkgkgggggg',
        'ggggggkgkggggggg',
        'gggggggggggggggg',
        'gggggggggggggkgk',
        'ggggggggggggggkg',
        'gGgkgggggggggggg',
        'ggkggggggggggggg',
        'ggggggggkgkggggg',
        'gggggggggkgggggg',
    ],
    [
        'ggggggkgkggggggg',
        'gggggggkgggggggg',
        'gggggggggggggggg',
        'gggggggggggGgkgk',
        'ggggggggggggkgkg',
        'gGgkgggggggggggg',
        'ggkggggggggggggg',
        'gggggggggggggggg',
        'ggggggggkgkggggg',
        'gggggggggkgggggg',
        'gggggggggggggggg',
        'ggGgkgkggggggggg',
        'gggkgkgggggggggg',
        'gggggggggggGgkgg',
        'ggggggggggggkggg',
        'gggggggggggggggg',
    ],
    [
        'ggggggggggGgkggg',
        'gggggggggggkgggg',
        'ggkgkggggggggggg',
        'gggkgggggggggggg',
        'gggggggggggggggg',
        'ggggggggGggggggg',
        'gggggggGkGgggggg',
        'gggggggggkgggggg',
        'gggggggggggggGgk',
        'ggggggggggggggkg',
        'gggGgkgkgggggggg',
        'ggggkgkggggggggg',
        'gggggggggggggggg',
        'ggggggggggkgkggg',
        'gggggggggggkgggg',
        'gggggggggggggggg',
    ],
]

DIRT = [
    'ssssssssssssssss',
    'ssssssssssssLsss',
    'ssSsssssssssssss',
    'ssssssssssssssss',
    'sssssssLLsssssss',
    'ssssssssssssssSs',
    'sLssssssssssssss',
    'ssssssssssCSssss',
    'ssssSsssssSSLsss',
    'sssssssssssLLsss',
    'ssssssssssssssss',
    'sssLssssssssssss',
    'sssssssssSssssss',
    'ssssssLLsssssLss',
    'ssssssssssssssss',
    'ssSsssssssssssss',
]

SAND = [
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSCCSSSSS',
    'SSSSSSSSSSsssSSS',
    'SSSSSSSSSSSSSSSS',
    'SCCSSSSSSSSSSSSS',
    'SSsssSSSSSSSSSSS',
    'SSSSSSSSSSSSSSsS',
    'SSSSSSSSSSSSCCSS',
    'SSSSSSSCSSSSSsss',
    'SSSSSSSSSSSSSSSS',
    'SSSSSCCSSSSSSSSS',
    'SSSSSSsssSSSSSSS',
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSCSSSS',
    'SSCCSSSSSSSSSSSS',
    'SSSsssSSSSSSSsSS',
]

SOIL = [
    'LLLLwLLLLLLLLLwL',
    'LwLLLLLLLwLLLLLL',
    'wwwwwLwwwwwwwwww',
    'wwwwwwwwwwwwLwww',
    'wwwwwwwwwwwwwwww',
    'wwdwwwwwwwdwwwww',
    'dddddddddddddddd',
    'dddddwddddddddwd',
    'LLLLLLLwLLLLLLLL',
    'LLLwLLLLLLLLLwLL',
    'wwwwwwwwwLwwwwww',
    'wwLwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwdwwwwwwwwdw',
    'dddddddddddddddd',
    'ddwddddddddwdddd',
]

# Cream flagstones in a running bond with sand-coloured joints.
PAVING = [
    'sCCCCsssCCCCCCss',
    'CccccHsCccccccHs',
    'CccccHsCccccccHs',
    'CccccHsCccccccHs',
    'CccccHsCccccccHs',
    'CccccHsCccccccHs',
    'sHHHHsssHHHHHHss',
    'ssssssssssssssss',
    'CsssCCCCCCsssCCC',
    'cHsCccccccHsCccc',
    'cHsCccccccHsCccc',
    'cHsCccccccHsCccc',
    'cHsCccccccHsCccc',
    'cHsCccccccHsCccc',
    'HsssHHHHHHsssHHH',
    'ssssssssssssssss',
]

# Two frames: each wave crest flattens into a line below it, with the same number of lit pixels.
WATER = [
    [
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaAAaaa',
        'aaaaaaaaaaAaaAaa',
        'aaaaaaaaaaaaaaaa',
        'aaAAaaaaaaaaaaaa',
        'aAaaAaaaaaaaaaaa',
        'aaaaaaaaaaaaaaAa',
        'aaaaaaaaAAaaaaaa',
        'aaaaaaaAaaAaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaAAaa',
        'aaaaaaaaaaaAaaAa',
        'aaaaaaaaaaaaaaaa',
        'aaaaAAaaaaaaaaaa',
        'aaaAaaAaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
    ],
    [
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaAAAAaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aAAAAaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaAAAAaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaAaaaaaaaaa',
        'aaaaaaaaaaaAAAAa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaAAAAaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
    ],
]

PASTURE = [
    'gGgGgggggggggggg',
    'gkGkggggGgGgGggg',
    'ggkgggggkgkgkggg',
    'gggggggggkgkgggg',
    'gggggggggggggggg',
    'ggggGgGggggggGgG',
    'ggggkGkggggggkGk',
    'gggggkgggWggggkg',
    'gggggggggkgggggg',
    'ggGgGgGggggggggg',
    'ggkgkgkgggGgGggg',
    'gggkgkggggkGkggg',
    'gggggggggggkgggg',
    'gWggggGgGggggGgG',
    'gkggggkGkggggkGk',
    'gggggggkggggggkg',
]

# --------------------------------------------------------------------------- roads
# Roads by role (owner, 10 October 2026): cut stone for main roads, cobbles for streets, gravel for
# country roads and a rutted track between fields; lanes keep terrain_dirt-path. Like the dirt path
# and the paving they have no edge tiles: every tile ends cleanly against grass, so a road of any
# width is a plain run of one surface.

# Dressed grey slabs in two courses, each lit on its top-left corner, with 1-px joints.
CUT_STONE = [
    'ccHHHHhccHHHHHHh',
    'cHHHHHhcHHHHhHHh',
    'HHHHHHhHHHHHHHHh',
    'HHhHHHhHHHHHHHHh',
    'HHHHHHhHHHHHHHHh',
    'HHHHHHhHHHHHHhHh',
    'HHHHHhhHHHHHHHhh',
    'hhhhhhhhhhhhhhhh',
    'HHhccHHHHHhccHHH',
    'HHhcHHHHHHhcHHHH',
    'HHhHHHHhHHhHHHHH',
    'HHhHHHHHHHhHHHHH',
    'HHhHHHHHHHhHHHhH',
    'HHhHHHHHHHhHHHHH',
    'HhhHHHHHHhhHHHHH',
    'hhhhhhhhhhhhhhhh',
]

# Round grey cobbles bedded in sand, each lit on its top-left; stones run across the tile edges.
COBBLES = [
    [
        'cHccsscccssccchs',
        'cHHHsscHHhscHHhs',
        'cHhhschHHhsshhhs',
        'csssssshhsssssss',
        'ssccccssssccccss',
        'ccHHHHHcscHHHHhs',
        'sshHHHHhscHHHHhs',
        'csshhhsssshhhhss',
        'Hhsssssccssssssc',
        'HHHcsccHHHcsccss',
        'cHHhscHHHHsscHhs',
        'shsssshhhssshhhs',
        'sssccssssscssshh',
        'sccHHHcsccHHcsss',
        'sshhhHhschHhhsss',
        'cssssssssssssscs',
    ],
    [
        'ccHcssssccHhsccs',
        'sHHHhsscHHHsschs',
        'scHHHhschhsscHHh',
        'sshhssssssscHHHh',
        'sssssccccsschhhs',
        'ccsscHHHHsssssss',
        'HHhscHHHhscccssc',
        'HHhssHhhsscHHhsc',
        'hhhhsssssshhHhss',
        'sssssscccssshhhs',
        'cccccscHHHcsssss',
        'sHHHhsshHHHssccs',
        'scHHHssshhsscHHh',
        'sshhsscsssscHHHh',
        'hsssscHHcssshhhh',
        'ssssshHssscsssss',
    ],
]

# Pale grit with pebbles of grey, cream and sand, each pebble lit above its shadow.
GRAVEL = [
    [
        'cccccWcccccscscc',
        'hcchcchcscccccsc',
        'cccccScccccscWcc',
        'cccHccsccWcccchc',
        'csccxccccchccccc',
        'cccsccccHcccchcW',
        'hccccCcccxCccccc',
        'cccccchhccchsccC',
        'hccCccccccHccccc',
        'cccchccchcchccWc',
        'chccccWcccccccch',
        'cccHccchccscHccc',
        'HcccxHccccccchcc',
        'cxcCccxcccHccccc',
        'cccchccHccchchcH',
        'xchcccccxccccccc',
    ],
    [
        'cscccCcccxcccccc',
        'ccsCcchHccWcScsc',
        'Cccchcccxcchcscc',
        'chcccccHccccWccc',
        'cccWchccxcscchcS',
        'sccchccccccccccc',
        'ccccccschcccCccc',
        'ccHccccsccHcchcc',
        'HcchccScccchcWcc',
        'cxcccccscccccchc',
        'cccchcccccWccccc',
        'hcccccScscchcccc',
        'cchccccscsccccHc',
        'SccccHccccccccch',
        'cssccchcccWccScc',
        'ccccccccHcchccsh',
    ],
]

# Two wheel ruts with grass along the crown, running across the tile; the vertical track is its
# transpose. Lay terrain_dirt-path where tracks cross or turn.
FARM_TRACK = [
    'sssssgsssssssssL',
    'ssLssssssssSssss',
    'sssssssLssssssss',
    'sSssssssssssLsss',
    'ssssssssssssssss',
    'sgssssgssskssssg',
    'ggksggggkgggkgsg',
    'gGgggkggGggggGgk',
    'ggkgGgggggkggggg',
    'gsgggsgkggsgggsg',
    'ssssssssssssssss',
    'sssLssssssSsssss',
    'ssssssssLsssssss',
    'sssssSssssssssLs',
    'ssssssssssssssss',
    'ssgsssssssgsssss',
]

# --------------------------------------------------------------------------- crops
# Crop tiles are tilled soil with plants laid over it; both rows of plants sit on the ridges.

GRAIN_SEEDLING = [
    '................',
    '................',
    '................',
    'G...G...G...G...',
    'gG..gG..gG..gG..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..G...G...G...G.',
    '..gG..gG..gG..gG',
    '................',
    '................',
    '................',
]

GRAIN_GROWING = [
    '.G...G..G...G...',
    'GgG.GgG.gG.GgG.G',
    'ggGgggggggGggggg',
    'gkgggkgggkgggkgg',
    'kgkkgkkgkkgkkgkk',
    '................',
    '................',
    '................',
    '...G...G..G...G.',
    '.GgG.GgG.GgG.GgG',
    'GgggGgggggggGggg',
    'gggkgggkgggkgggk',
    'kkgkkkgkkkgkkkgk',
    '................',
    '................',
    '................',
]

# Golden ears in upright columns: tall and short ears alternate, with shadowed gaps between.
GRAIN_RIPE = [
    'Y..Y..Y...Y..Y.Y',
    'YYsYsYYsYsYYsYsY',
    'SYsSsYSsYsSYsSsS',
    'sSLsLSsLSLsSLsLs',
    'ssLsLssLsLssLsLs',
    '................',
    '................',
    '................',
    '..Y.YY..Y..Y...Y',
    'YsYsYYYsYsYYsYsY',
    'YsSsSSYsSsYSsYsS',
    'SLsLssSLsLSsLSLs',
    'sLsLsssLsLssLsLs',
    '................',
    '................',
    '................',
]

GRAIN_STUBBLE = [
    '................',
    '................',
    'S.S..S.S.S..S.S.',
    's.s..s.s.s..s.s.',
    '................',
    '................',
    '.....SSs........',
    '...........Ss...',
    '................',
    '................',
    '.S.S..S.S..S.S.S',
    '.s.s..s.s..s.s.s',
    '................',
    '................',
    '..sSS...........',
    '..........SS....',
]

VEG_SEEDLING = [
    '................',
    '................',
    '..G...G...G...G.',
    '...GgG.....GgG..',
    '....g.......g...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..G...G...G...G.',
    '...GgG.....GgG..',
    '....g.......g...',
    '................',
    '................',
    '................',
]

VEG_GROWING = [
    '...GGg......GGg.',
    '..GGggk....GGggk',
    '.GGgGgkk..GGgGgk',
    '.gGggkgk..gGggkg',
    '..gkgkk....gkgkk',
    '...kkk......kkk.',
    '................',
    '................',
    '...GGg......GGg.',
    '..GGggk....GGggk',
    '.GGgGgkk..GGgGgk',
    '.gGggkgk..gGggkg',
    '..gkgkk....gkgkk',
    '...kkk......kkk.',
    '................',
    '................',
]

# Full leaf heads, each with one ripe squash at its foot.
VEG_RIPE = [
    '.GGGGg...GGGGg..',
    'GGgGggk.GGgGggk.',
    'GgGggkkkGgGggkkk',
    '.gkRRkk.kRRgkkk.',
    '..RYRRr.RYRRrk..',
    '..RRRrr.RRRrr...',
    '...rrr...rrr....',
    '................',
    '.GGGGg...GGGGg..',
    'GGgGggk.GGgGggk.',
    'GgGggkkkGgGggkkk',
    'kRRgkkk..gkRRkk.',
    'RYRRrk....RYRRr.',
    'RRRrr.....RRRrr.',
    '.rrr.......rrr..',
    '................',
]

# Rice paddies for hot, wet land: every tile is a plot ringed by an earth bund, lit on its bottom
# and right edges and shaded on its top and left ones, so plots side by side share a 2-px bund. The
# rice stands in flooded plots and is drained for harvest, so stubble sits on mud.
PADDY = [
    'dwwwwkwwwwwwwwwL',
    'wttttttttttttttL',
    'wtaaaaaaaaaaaaaL',
    'wtaaaaaaaaAAaaaG',
    'ktaaaaaaaaaaaaaL',
    'wtaaAAaaaaaaaaaL',
    'wtaaaaaaaaaaaaaL',
    'wtaaaaaaaaaaaaaL',
    'wtaaaaaaaaaaAAag',
    'wtaaaaaaaaaaaaaL',
    'wtaaaaaAAaaaaaaL',
    'wtaaaaaaaaaaaaaL',
    'wtaAAaaaaaaaaaaL',
    'wtaaaaaaaaaaaaaL',
    'wtaaaaaaaaaaaaaL',
    'LLLLGLLLLLLgLLLL',
]

PADDY_DRAINED = [
    'dwwwwkwwwwwwwwwL',
    'wddddddddddddddL',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwwwwwaawwG',
    'kdwwwwwwwwwwwwwL',
    'wdwaawwwwwwwwwwL',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwwwwwwwwwg',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwaawwwwwwL',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwwwwwwwwwL',
    'wdwwwwwwwwwwaawL',
    'wdwwwwwwwwwwwwwL',
    'LLLLGLLLLLLgLLLL',
]

RICE_SEEDLING = [
    '................',
    '................',
    '...G.G.G.G.G.G..',
    '....g...g...g...',
    '...AkA.AkA.AkA..',
    '................',
    '...G.G.G.G.G.G..',
    '....g...g...g...',
    '...AkA.AkA.AkA..',
    '................',
    '...G.G.G.G.G.G..',
    '....g...g...g...',
    '...AkA.AkA.AkA..',
    '................',
    '................',
    '................',
]

RICE_GROWING = [
    '................',
    '..G.G..G.G..G.G.',
    '.GgGgGGgGgGGgGg.',
    '.gGgkgGgGkgGgkg.',
    '.kgkkkkgkkkkgkk.',
    '..k.k..k.k..k.k.',
    '.G.G..G.G..G.G..',
    'GgGgGGgGgGGgGgG.',
    'gGgkggGgkggGgkg.',
    'kgkkkkgkkkkgkkk.',
    '.k.k..k.k..k.k..',
    '..G.G..G.G..G.G.',
    '.GgGgGGgGgGGgGg.',
    '.gGgkgGgGkgGgkg.',
    '.kgkkkkgkkkkgkk.',
    '................',
]

# Golden heads nodding over the last green of the stems.
RICE_RIPE = [
    '................',
    '.YY.YS.YY.YS.YY.',
    'YSYsYSYSYsYSYSY.',
    'sYsYsYsYsYsYsYs.',
    'gsSsgsSsgsSsgsS.',
    'kgkgkgkgkgkgkgk.',
    'YY.YS.YY.YS.YY..',
    'SYsYSYSYsYSYSYs.',
    'YsYsYsYsYsYsYsY.',
    'sSsgsSsgsSsgsSs.',
    'gkgkgkgkgkgkgkg.',
    '.YY.YS.YY.YS.YY.',
    'YSYsYSYSYsYSYSY.',
    'sYsYsYsYsYsYsYs.',
    'gsSsgsSsgsSsgsS.',
    '................',
]

RICE_STUBBLE = [
    '................',
    '................',
    '..S...S...S..S..',
    '..s.S.s.S.s..s..',
    '....s...s.......',
    '................',
    '....S...S...S...',
    '..S.s.S.s.S.s...',
    '..s...s...s.....',
    '................',
    '..S...S...S..S..',
    '..s.S.s.S.s..s..',
    '....s...s.......',
    '................',
    '................',
    '................',
]

# Vineyards for warm, dry land: two trellised rows a tile on dusty ground, posts every 4 px. The
# stages follow the field crops' year: bud on pruned stocks, full leaf, grapes, then bare canes.
VINE_SEEDLING = [
    '................',
    '.G...G...G...G..',
    'wkwwwkwwwkwwwkww',
    '.d...d...d...d..',
    '.d...d...d...d..',
    'dd..dd..dd..dd..',
    '................',
    '................',
    '................',
    '...G...G...G...G',
    'wwwkwwwkwwwkwwwk',
    '...d...d...d...d',
    '...d...d...d...d',
    '..dd..dd..dd..dd',
    '................',
    '................',
]

VINE_GROWING = [
    '..GGg..GGg..GGg.',
    '.GGggGGGggGGGggG',
    'GgggkgGgggkgGggk',
    'gkgkkkgkgkkkgkkk',
    'kkdkkkkdkkkkdkkk',
    '.d...d...d...d..',
    'dd..dd..dd..dd..',
    '................',
    'Gg..GGg..GGg..GG',
    'ggGGGggGGGggGGGg',
    'kgGggkgGggkgGggk',
    'kkgkgkkkgkgkkkgk',
    'kkkkdkkkkdkkkkdk',
    '...d...d...d...d',
    '..dd..dd..dd..dd',
    '................',
]

VINE_RIPE = [
    '..GGg..GGg..GGg.',
    '.GGggGGGggGGGggG',
    'GgggkgGgggkgGggk',
    'gkUUkkgkgUUkgkkk',
    'kkUnkkkdkUnkkkUU',
    '.d.n.d...dn..dUn',
    'dd..dd..dd..dd.n',
    '................',
    'Gg..GGg..GGg..GG',
    'ggGGGggGGGggGGGg',
    'kgGggkgGggkgGggk',
    'UUgkgkUUgkgkkUUk',
    'UnkkdkUnkkdkkUnk',
    '.n.d...n.d...nd.',
    '..dd..dd..dd..dd',
    '................',
]

VINE_STUBBLE = [
    '..w...w...L...w.',
    '.wLw.wLw.wLw.wLw',
    'dwwdwwdwwdwwdwwd',
    '.d..Yd...d..Sd..',
    '.d...d...d...d..',
    'dd..dd..dd..dd..',
    '................',
    '................',
    'w...L...w...w...',
    'Lw.wLw.wLw.wLw.w',
    'wdwwdwwdwwdwwdww',
    '...dS..Yd...d...',
    '...d...d...d...d',
    '..dd..dd..dd..dd',
    '................',
    '................',
]

# --------------------------------------------------------------------------- trees
# Fill grids; outlined() adds the 1-px ring, so each sprite is 2 px wider and taller.
# Crowns are clumps lit on their top-left edge, with dark rims where a clump tucks behind another.

TREE_MATURE = [
    '............GGGGGg............',
    '..........GGGGGGGGgg..........',
    '.........GGGGGGGggggg.........',
    '........GGGGGggggggggg........',
    '........kkkGgggggggkkk........',
    '.....GGGGGGkkggggkkGGGGgg.....',
    '...GGGGGGGGGgkggkGGGGGGgggg...',
    '..GGGGggggggggkkGGGggggggggg..',
    '..GGggggggggggkkGGgggggggggg..',
    '..gkkkkkkggkkkkkkkkggkkkkkkg..',
    '..kGGGGGGkkGGGGGGGGkkGGGGggk..',
    '.GGGGGGggGGGGGGGGggggGGGGgggg.',
    'GGGgggggGGGGGgggggggggGGgggggg',
    'GGggggggGGGgggggggggggGggggggk',
    'GgggggggGGggggggggggggggkggggk',
    'ggggkgggggggggggkggggggggkggkk',
    'gggggkgggggggggggkgggggggggkkk',
    '.kkggggggggggggggggggkgggkkkk.',
    '..kkkkkkkkgggggggggkkkkkkkkk..',
    '....kkkkk.kkkkkkkkkk.kkkkk....',
    '...........kkkkkkkk...........',
    '............kkkkkk............',
    '............dddddd............',
    '............Lwwwdd............',
    '............Lwwwdd............',
    '............LwLwdd............',
    '............Lwwwwd............',
    '...........dLwwwwdd...........',
    '..........LLwwwwwwdd..........',
    '.........LLww.wwww.dd.........',
]

TREE_YOUNG = [
    '.......GGGg.......',
    '.....GGGGGggg.....',
    '....GGGGgggggk....',
    '....GGggggggkk....',
    '..GGkkgggggkkGGg..',
    '.GGGGGkkkkkGGGggg.',
    '.GGggGGGGGGGgggggk',
    'GGGggGGGGggggggkkk',
    'GGggggggggggggkkkk',
    'Gggggggggggggkkkk.',
    '.kkggggggggkkkkk..',
    '..kkkkkkkkkkkkk...',
    '....kkkkkkkkkk....',
    '.......dddd.......',
    '.......Lwdd.......',
    '.......Lwdd.......',
    '.......Lwwd.......',
    '......dLwwdd......',
    '.....LLw..wdd.....',
]

TREE_SAPLING = [
    '..GGg..',
    '.GGGgg.',
    'GGGgggk',
    'GGggggk',
    'Gggggkk',
    '.gggkk.',
    '..kkk..',
    '...w...',
    '...w...',
    '...w...',
    '...w...',
    '..Lwd..',
]

TREE_STUMP = [
    '...LLLLLL...',
    '..LSSSSSSw..',
    '.LSSsssSSSw.',
    '.LSsSSSsSSw.',
    '.wSSsssSSSd.',
    '.LwSSSSSSdd.',
    '.LwwwLwwwdd.',
    '.LwwLwwwwdd.',
    'LLwwLwwwwddd',
]

TREE_LOG = [
    '...LLLLLLLLLLLLLLLLLLLLL..',
    '..SSLLLLLLLLLLLLLLLLLLLLw.',
    '.SSsSLwwwwwwLwwwwwwwwLwwwd',
    '.SsSsSwwwdwwwwwwwwdwwwwwwd',
    '.SsSSswwwwwwwwwLwwwwwwdwwd',
    '.SSssSwwLwwwwwwwwwwwwwwwwd',
    '..SSSdwwwwwwwdwwwwwwwwdwdd',
    '...ddddddddddddddddddddddd',
]

# Four tiers, each lit down its left slope, shadowed under the fringe above and on the right.
TREE_CONIFER = [
    '..............gk..............',
    '..............Gk..............',
    '.............Ggkk.............',
    '............Gggkkt............',
    '...........Gggkkkkt...........',
    '...........ggkkkkkt...........',
    '..........Gggkkkkkkt..........',
    '.........Ggggkkkkkktt.........',
    '........G.ggk.kkk.ktt.........',
    '..........kkkttttttt..........',
    '..........Gggkkkkktt..........',
    '.........Ggggkkkkkktt.........',
    '........GGgggkkkkkkktt........',
    '........Ggggkkkkkkkktt........',
    '.......gggggkkkkkkkkttt.......',
    '......Ggggggkkkkkkkkkttt......',
    '.....Gggggggkkkkkkkkkkttt.....',
    '.....Gg.ggg.kkk.kkk.ktt.t.....',
    '........kkkktttttttttt........',
    '.......GGgggkkkkkkkkttt.......',
    '......GGggggkkkkkkkkkttt......',
    '......Gggggkkkkkkkkkkttt......',
    '.....Ggggggkkkkkkkkkkkttt.....',
    '....Gggggggkkkkkkkkkkkkttt....',
    '....ggggggkkkkkkkkkkkkkttt....',
    '...Gggggggkkkkkkkkkkkkkkttt...',
    '..Gg.ggg.gkk.kkk.kkk.ktt.ttt..',
    '.....kkkktttttttttttttttt.....',
    '....GGgggkkkkkkkkkkkkkkttt....',
    '....GGggggkkkkkkkkkkkkkttt....',
    '...Gggggggkkkkkkkkkkkkkkttt...',
    '..Ggggggggkkkkkkkkkkkkkkkttt..',
    '.Gggggggggkkkkkkkkkkkkkkkkttt.',
    '.ggggggggkkkkkkkkkkkkkkkkkttt.',
    'Gg.ggg.ggk.kkkdkkk.kkk.ktt.ttt',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '............LLwwdd............',
]

# A spreading two-lobed crown on a slimmer trunk; apples are added on lit leaves.
TREE_FRUIT = [
    '.........GG........Gg.........',
    '.......GGGGGg....GGGGgg.......',
    '......GGGGGggg..GGGGgggg......',
    '......GGGggggg..GGgggggg......',
    '.....GGggggggggGGgggggggg.....',
    '.....GGkkggkkGGGGkkggkkGG.....',
    '...GGGGGgkkGGGGGGggkkGGGGgg...',
    '..GGGgggggGGGgggggggGGGggggg..',
    '.GGgggggggGGggggggggGGggggggg.',
    '.GgggggggGGggggggggggGggggggg.',
    '.gggggggkkggggggggggkkggggggg.',
    '.gggggkkGGkkggggggkkGGkkggggg.',
    '.ggggkGGGGGgkggggkGGGGggkgggg.',
    '..kkkGGGgggggggggGGGgggggkkk..',
    '...kkGGggggggggggGGggggggkk...',
    '.....GgggggggkkkkGggggggg.....',
    '.....ggggggkkkkkkgggggkkk.....',
    '......gggkkk.kkkk.ggkkkk......',
    '.......kkkk..dddd..kkkk.......',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '............dLwwdd............',
    '...........LLwwwwdd...........',
    '..........LLw.ww.ddd..........',
]
FRUIT = [(9, 2), (19, 3), (3, 8), (14, 8), (24, 8), (8, 13), (20, 13), (26, 11)]

# A pruned orchard tree, a tile wide so trees stand in rows; the season map swaps in the blossom
# in spring and seasons.py's bare tree in winter.
TREE_ORCHARD = [
    '....GGGg.GGg....',
    '..GGGGGggGGGgg..',
    '.GGGGGgggGGgggg.',
    '.GGGggggkgggggk.',
    'GGGgggggkgggggkk',
    'GGgggkkggggggkkk',
    'GggggGGkkggggkkk',
    'ggggGGGgggkgkkkk',
    'ggggGggggkkkkkk.',
    '.ggggggkkkkkkk..',
    '..kkkkkkkkkkk...',
    '....kkkdddkk....',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '......dLwdd.....',
    '.....LLw.wdd....',
]
ORCHARD_FRUIT = [(3, 3), (10, 2), (12, 6), (2, 7), (7, 8)]

TREE_ORCHARD_BLOSSOM = [
    '....WWWP.WWP....',
    '..WWWWWPPWWWPP..',
    '.WWPWWPPPWWPPPP.',
    '.WWWPPgPpPPPPPp.',
    'WWWPPPPPpPPgPPpp',
    'WWPPPppPPPPPPppp',
    'WgPPPWWppPPPPppU',
    'PPPPWWWPPPpPpppU',
    'PPPPWPPPPppppUU.',
    '.PPPPgPppppUUU..',
    '..pUppppUppUU...',
    '....UUUdddUU....',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '......dLwdd.....',
    '.....LLw.wdd....',
]

# --------------------------------------------------------------------------- rocks

ROCK_BOULDER = [
    '....HHHHHh....',
    '..HHHHHHHHhh..',
    '.HHHHHHHHhhhh.',
    '.HHHHHHhhhhhhx',
    'HHHhhhhhhhhhhx',
    'Hhhhhhhxhhhhxx',
    'hhhhhhhxhhhxxx',
    'hhhhhhxhhhxxxx',
    'hhhhhhhhhxxxxx',
    '.xhhhhhxxxxxx.',
    '..xxxxxxxxxx..',
]

ROCK_ORE = [
    '....HHHHH.....',
    '..HHHHHHhhh...',
    '.HHHRYHhhhhh..',
    '.HHhRRhhhhhhx.',
    'HHhhhhhhRrhhxx',
    'Hhhhhhhhrhhxxx',
    'hhhYhhhhhhxxxx',
    'hhRRrhhhhYxxxx',
    'hhhrhhhhxRRxxx',
    '.xhhhxxxxxrxx.',
    '..xxxxxxxxxx..',
]

# Three quarried blocks: flat lit tops, cliff faces with strata and cracks, shadowed right sides.
ROCK_OUTCROP = [
    '......HHHHHHHHHHHH............',
    '....HHHHHHHHHHHHHHHh..........',
    '...HHHHHHHHHHHHHHHHhh.........',
    '...HHHHHHHHHHHHHHHHhx.........',
    '...hhhhhhhhhhhhhhhhhx.........',
    '...hhhhhxhhhhhhhhhhhx.........',
    '...hhhhhxhhhhhhhhhhxx.........',
    '...xxhhhxxxhhhhxxhhHHHHHHHHH..',
    '...hhhhhhhhhxhhhhhHHHHHHHHHHh.',
    '...hhhhhhhhhxhhhxHHHHHHHHHHHhh',
    '...hhhhhhhhhhhhhxhhhhhhhhhhhhx',
    '...xhhxxxhhhhxxhxhhhhhhhhhhhhx',
    '.HHHHHHHHhhhhhhhxhhhhxhhhhhhhx',
    'HHHHHHHHHhhhhhhhxxxhhhxxxhhhxx',
    'hhhhhhhhhxhhhhhhxhhhhhhhhhhhhx',
    'hhxhhhhhhxxxxxxxxhhhhhhhhhhhhx',
    'hhxhhhhhhx.......hhhhhhhhhhhhx',
    'hhhhhhhhhx.......xxxxxxxxxxxxx',
    'xxxxxxxxxx....................',
]

# A heap of coal lumps, each with a glint on its top-left.
ROCK_COAL = [
    '......Hh......',
    '...Hh.hxx.....',
    '..hxxnxxnHh...',
    '.Hhxnn.Hhxxn..',
    '.hxxnHhxxnxxn.',
    'Hhxnnhxxnnhxxn',
    'hxxnnxxnnnxxnn',
    '.xxxxxxxxxxxx.',
]

# --------------------------------------------------------------------------- props

BENCH = [
    'LLLLLLLLLLLLLL',
    'wwwwwwwwwwwwww',
    '.w..........w.',
    'LLLLLLLLLLLLLL',
    'wwwwwwwwwwwwww',
    'LLLLLLLLLLLLLL',
    'dddddddddddddd',
    '.dd........dd.',
    '.dd........dd.',
]

LAMP_POST = [
    '..xxx..',
    '.xhhhx.',
    'xxxxxxx',
    '.hCCCx.',
    '.hCYCx.',
    '.hCCCx.',
    '.xxxxx.',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '..hx...',
    '.hhxx..',
    'hhhxxx.',
]

# A stone well under a small roof: winch bar, rope and bucket over dark water.
WELL = [
    '...RRRRRRRR...',
    '..RRRRRRRRRR..',
    '.RrRRrRRrRRrR.',
    'rrrrrrrrrrrrrr',
    '.LwdLLLLLLdLw.',
    '.Lw....c...Lw.',
    '.Lw....c...Lw.',
    'HHHHHHHcHHHHHh',
    'Hxxxxxwcwxxxhh',
    'Hnannnwdwnnnhx',
    'HHHHHHHHHHHHhx',
    'Hhhhhhhhhhhhhx',
    'Hhhhxhhhhxhhxx',
    'Hhhhhhhhhhhhhx',
    'Hhxhhhhxhhhhxx',
    'Hhhhhhhhhhhhhx',
    '.xxxxxxxxxxxx.',
]

BARREL = [
    '..wwwwww..',
    '.wLLLLLLw.',
    '.wLLLLLLw.',
    '..wwwwww..',
    '.hHhhhhhx.',
    'LwwLwwLwwd',
    'LwwLwwLwwd',
    'LwwLwwLwwd',
    'LwwLwwLwwd',
    '.hHhhhhhx.',
    '.wwLwwLwd.',
    '..dddddd..',
]

CRATE = [
    'LLLLLLLLLLLL',
    'LwwwwwwwwwwL',
    'LLLLLLLLLLLL',
    'wwwwwwwwwwwd',
    'LwwwwwwwwwLd',
    'LdddddddddLd',
    'LwwwwwwwwwLd',
    'LdddddddddLd',
    'LwwwwwwwwwLd',
    'LdddddddddLd',
    'LwwwwwwwwwLd',
    'dddddddddddd',
]

# A square bale: lit straw on top, shaded straw in front, two bands of twine.
HAY_BALE = [
    'SYYwSSYYSSwYSS',
    'SSswsSSSsswSss',
    'YSSwSYYSSYwSSs',
    'SsswSSssSSwsSs',
    'ssswsSSssswssL',
    'LsSwsssLsSwsLL',
    'sSswLsSSsswSsL',
    'LsswsSssLswsLL',
    'sLswssLsSswLsL',
    'LLLdLLLLLLdLLL',
]

SIGNPOST = [
    'wwwwwwwwwwww',
    'wLLLLLLLLLLw',
    'wLSSSSSSSSLw',
    'wLSSSSSSSSLw',
    'wLLLLLLLLLLw',
    'dddddddddddd',
    '....Lwd.....',
    '....Lwd.....',
    '....Lwd.....',
    '....Lwd.....',
    '....Lwd.....',
    '...LLwdd....',
]

FLOWER_PATCH = [
    '...P....W.....',
    '..PYP..WYW..V.',
    '...PG..gWg.VYV',
    '.GgGgkGgkGgkVk',
    'GgVgGgkgGUgkgk',
    'gVYVgkGgUYUgkk',
    '.gVgkgkgkUgkk.',
    '..kkkkkkkkkk..',
]

BUSH = [
    '.....GGGg.....',
    '....GGGGggg...',
    '...GkkgggggG..',
    '.GGGGGkkkGGgg.',
    'GGGgGGGGggggg.',
    'GgggGGgggggkkk',
    'gggGggggggggkk',
    'ggggggggggkgkk',
    '.kggggkgggkkk.',
    '..kkkkkkkkkk..',
    '....kkkkkk....',
]

# Garden pieces for the greens inside town walls. A hedge is one clipped block a tile wide that
# stands 1 px into the tile above, so blocks in a row or a column meet on a single outline.
HEDGE = [
    '..GGGGgGGGGGgg..',
    '.GGGgGGGGGgGGGg.',
    'GGgGGGGgGGGGGggk',
    'GGGGGgGGGgGGgGgk',
    'GgGGGGGGGGGGGGgk',
    'gGGgGGGgGGgGGggk',
    'ggggggggggggggkk',
    'gkgkgggkggkgggkk',
    'kggkgkggkgggkgkk',
    'gkggkggkgkgkggkk',
    'kgkgggkggkggkgkk',
    'gkgkkgkkgkkgkkkk',
    'kkgkkgkkgkkgkkkk',
    'kkkkkkkkkkkkkkkk',
    '.kkkkkkkkkkkkkk.',
]

# Two rows of mixed flowers on dark earth, laid as terrain in beds of any size.
FLOWER_BED = [
    'wwdwwwwdwwwwwdww',
    'wPPwwYwwWWwwUUww',
    'PYPPwYYWYWWwUYUw',
    'pPpgGgkgWWgGgUkw',
    'gkgkgkkgkgkkgkkg',
    'kgkkwkkkkwkkkgkw',
    'wwwdwwwwwdwwwwww',
    'wwwwwdwwwwwwwdww',
    'wwWWwwwUUwwPPwwY',
    'wWYWWwUYUwPYPPYY',
    'wgWWgGgUkGpPpgYw',
    'gkgkgkkgkgkgkkgk',
    'kkgkkwkkgkkkwkgk',
    'wwwwwwwwwwwwwwww',
    'wdwwwwwdwwwwdwww',
    'wwwwdwwwwwwwwwdw',
]

# Fence parts on a full 16x16 tile so rails reach the tile edges and join their neighbours.
# A tile only draws the rail that runs up from its post; the tile below draws the join.
FENCE_POST = [
    '................',
    '................',
    '................',
    '................',
    '.......LLw......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......Lwd......',
    '.......wdd......',
    '................',
]
FENCE_RAIL_LEFT = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    'LLLLLLLL........',
    'wwwwwwww........',
    '................',
    '................',
    '................',
    'LLLLLLLL........',
    'wwwwwwww........',
    '................',
    '................',
    '................',
]
FENCE_RAIL_UP = [
    '.......Lw.......',
    '.......Lw.......',
    '.......Lw.......',
    '.......Lw.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]

CART_BODY = [
    '..............................',
    '..............................',
    '.........LLLLLLLLLLLLLLLLLLLLL',
    '........LwddddddddddddddddddwL',
    '........LdwwwwwwwwwwwwwwwwwwdL',
    '........LdwdwwwwwdwwwwwwdwwwdL',
    '........LdwwwwwwwwwwwwwwwwwwdL',
    '.wwwwwwwLddddddddddddddddddddL',
    '........LLLLLLLLLLLLLLLLLLLLLL',
    '........LwwwwwwwwwwwwwwwwwwwwL',
    'LLLLLLLLLdddddddddddddddddddLd',
    'wwwwwwwwLwwwwwwwwwwwwwwwwwwwLd',
    '........Lwwwwwwwwwwwwwwwwwwwwd',
    '........dddddddddddddddddddddd',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
]
WHEEL = [
    '...xxxxx...',
    '.xxwwwwwxx.',
    '.xwddLddwx.',
    'xwdLdLdLdwx',
    'xwddLLLddwx',
    'xwLLLHLLLwx',
    'xwddLLLddwx',
    'xwdLdLdLdwx',
    '.xwddLddwx.',
    '.xxwwwwwxx.',
    '...xxxxx...',
]
WHEEL_AT = (14, 8)        # top-left of the wheel in cart fill coordinates
HITCH = (0, 11)           # tip of the near shaft in cart fill coordinates, where the horse is harnessed
CART_LOADS = {
    'empty': None,
    'grain': [
        '..................LL..........',
        '............LL...CSSs...LL....',
        '...........CSSs.CCSSss.CSSs...',
        '..........CCSSssCSSSssCCSSss..',
        '..........CSSSssSSSsssCSSSss..',
        '..........SSSsssSsssssSSSsss..',
        '..........SsssssssssssSsssss..',
        '..........ssssssssssssssssss..',
    ],
    'logs': [
        '..............................',
        '...........SSwwwwwwwwwwwwwSS..',
        '...........CSddwdddddddddsSC..',
        '...........SSddddddddddddssS..',
        '........SSwwwwwwwwwwwwwwwwwwSS',
        '........CSddddddwdddddddddsdSC',
        '........SSddddddddddddddddddsS',
        '.........ddddddddddddddddddddd',
    ],
    'stone': [
        '..............................',
        '...........HHHh....HHh........',
        '.........HHHhhhxHHHhhhx.......',
        '.........HhhhhxxHhhhhxxHHHh...',
        '.........hhhhxxxhhhhxxxHhhhx..',
        '.........xxxxxxxxxxxxxxhhhxx..',
        '..............................',
        '..............................',
    ],
}


# Props for bigger towns. The notice board's sheets carry pictograms only, never words.
NOTICE_BOARD = [
    '..rrrrrrrrrrrr..',
    '.rRRRRRRRRRRRRr.',
    'rrrrrrrrrrrrrrrr',
    '.dddddddddddddd.',
    '.dLLLLLLLLLLLLd.',
    '.dLCCCLLLLWWWLd.',
    '.dLCaCLLLLWgWLd.',
    '.dLCCCLCCCWWWLd.',
    '.dLLLLLCxCLLLLd.',
    '.dLLLLLCCCLLLLd.',
    '.dLLLLLLLLLLLLd.',
    '.dddddddddddddd.',
    '..Lw........Lw..',
    '..Lw........Lw..',
    '..Lw........Lw..',
    '..Lw........Lw..',
    '..dd........dd..',
]

PLANTER = [
    '....gG..Gg....',
    '..PgGgk.gGgP..',
    '.kgGPggkgPgGk.',
    '.kggggkggggkk.',
    'HHHHHHHHHHHHHh',
    'Hhhhhhhhhhhhhx',
    'Hhhxhhhhhxhhhx',
    'Hhhhhhhhhhhhhx',
    '.xxxxxxxxxxxx.',
]

TROUGH = [
    'LLLLLLLLLLLLLLLw',
    'LaAAaaaaaaaAaaad',
    'LaaaaaAaaaaaaaad',
    'wwwwwwwwwwwwwwwd',
    'Lwwwwwdwwwwwwwwd',
    'Lwwwwwdwwwwwwwwd',
    'dddddddddddddddd',
    '.Ld..........Ld.',
]

PUMP = [
    '....HHh.....',
    '...Hhhhx....',
    'Lw.hhhhx....',
    '.Lwhhhhxhhx.',
    '..Lhhhhxxxx.',
    '...hhhhx..x.',
    '...hhhhx....',
    '...hhhhx....',
    '...hhhhx....',
    '..HHHHHHh...',
    '.Hhhhhhhhhx.',
    '.xxxxxxxxxx.',
]

SACK = [
    '..ss..',
    '.sSSs.',
    'SCCCCs',
    'SCWCCs',
    'SCCCSs',
    '.ssss.',
]
SACK_PILE = ((3, 0), (0, 5), (6, 5))                       # back to front

WOOD_END = [
    '.ww.',
    'wSLw',
    'wLSd',
    '.dd.',
]
WOOD_PILE = ((5, 0), (3, 4), (8, 4), (0, 8), (5, 8), (10, 8))


# --------------------------------------------------------------------------- assembly

def fence_piece(left=False, right=False, up=False):
    """Compose one fence tile; rails sit behind the post and each part keeps its own outline."""
    out = grid(['.' * TILE] * TILE)
    if left:
        out.alpha_composite(add_outline(grid(FENCE_RAIL_LEFT, (TILE, TILE))))
    if right:
        out.alpha_composite(add_outline(mirror(grid(FENCE_RAIL_LEFT, (TILE, TILE)))))
    if up:
        out.alpha_composite(add_outline(grid(FENCE_RAIL_UP, (TILE, TILE))))
    out.alpha_composite(add_outline(grid(FENCE_POST, (TILE, TILE))))
    return out


def pile(part, places, size):
    """Outlined copies of one part, stacked back to front, each keeping its own outline."""
    out = grid(['.' * size[0]] * size[1])
    piece = add_outline(pad(grid(part)))
    for at in places:
        out.alpha_composite(piece, at)
    return out


def cart(load):
    body = grid(CART_BODY)
    if CART_LOADS[load]:
        # cargo rows stop above the near board, so the board still hides the cargo's base
        body.alpha_composite(grid(CART_LOADS[load]))
    body.alpha_composite(grid(WHEEL), WHEEL_AT)
    return add_outline(pad(body))


def fruit_tree(rows, places):
    im = grid(rows)
    apple = grid(['PV', 'Vr'])
    for x, y in places:
        im.alpha_composite(apple, (x, y))
    return add_outline(pad(im))


def build():
    sheet = Sheet('nature')
    soil = tile(SOIL)

    for i, rows in enumerate(GRASS):
        sheet.add(f'terrain_grass_{i}', tile(rows))
    sheet.add('terrain_dirt-path', tile(DIRT))
    sheet.add('terrain_paving', tile(PAVING))
    sheet.add('terrain_sand', tile(SAND))
    sheet.add('terrain_soil-tilled', soil)
    for i, rows in enumerate(WATER):
        sheet.add(f'terrain_water_{i}', tile(rows))
    sheet.add('terrain_cut-stone', tile(CUT_STONE))
    for i, rows in enumerate(COBBLES):
        sheet.add(f'terrain_cobbles_{i}', tile(rows))
    for i, rows in enumerate(GRAVEL):
        sheet.add(f'terrain_gravel_{i}', tile(rows))
    sheet.add('terrain_farm-track_horizontal', tile(FARM_TRACK))
    sheet.add('terrain_farm-track_vertical', tile(transposed(FARM_TRACK)))
    sheet.add('terrain_flower-bed', tile(FLOWER_BED))

    sheet.add('crop_grain_seedling', over(soil, GRAIN_SEEDLING))
    sheet.add('crop_grain_growing', over(soil, GRAIN_GROWING))
    sheet.add('crop_grain_ripe', over(soil, GRAIN_RIPE))
    sheet.add('crop_grain_stubble', over(soil, GRAIN_STUBBLE))
    sheet.add('crop_veg_seedling', over(soil, VEG_SEEDLING))
    sheet.add('crop_veg_growing', over(soil, VEG_GROWING))
    sheet.add('crop_veg_ripe', over(soil, VEG_RIPE))
    sheet.add('crop_pasture', tile(PASTURE))
    paddy, dust = tile(PADDY), tile(DIRT)
    for stage, rows in (('seedling', RICE_SEEDLING), ('growing', RICE_GROWING), ('ripe', RICE_RIPE)):
        sheet.add(f'crop_rice_{stage}', over(paddy, rows))
    sheet.add('crop_rice_stubble', over(tile(PADDY_DRAINED), RICE_STUBBLE))
    for stage, rows in (('seedling', VINE_SEEDLING), ('growing', VINE_GROWING), ('ripe', VINE_RIPE),
                        ('stubble', VINE_STUBBLE)):
        sheet.add(f'crop_vine_{stage}', over(dust, rows))

    # trees anchor at the bottom centre, which is the base of every trunk
    sheet.add('tree_deciduous_sapling', outlined(TREE_SAPLING))
    sheet.add('tree_deciduous_young', outlined(TREE_YOUNG))
    sheet.add('tree_deciduous_mature', outlined(TREE_MATURE))
    sheet.add('tree_deciduous_stump', outlined(TREE_STUMP))
    sheet.add('tree_conifer', outlined(TREE_CONIFER))
    sheet.add('tree_fruit', fruit_tree(TREE_FRUIT, FRUIT))
    sheet.add('tree_orchard', fruit_tree(TREE_ORCHARD, ORCHARD_FRUIT))
    sheet.add('tree_orchard_blossom', outlined(TREE_ORCHARD_BLOSSOM))
    sheet.add('tree_log', outlined(TREE_LOG))

    sheet.add('rock_boulder', outlined(ROCK_BOULDER))
    sheet.add('rock_ore', outlined(ROCK_ORE))
    sheet.add('rock_outcrop', outlined(ROCK_OUTCROP))
    sheet.add('rock_coal', outlined(ROCK_COAL))

    sheet.add('prop_bench', outlined(BENCH))
    sheet.add('prop_lamp-post', outlined(LAMP_POST))
    sheet.add('prop_well', outlined(WELL))
    sheet.add('prop_barrel', outlined(BARREL))
    sheet.add('prop_crate', outlined(CRATE))
    sheet.add('prop_hay-bale', outlined(HAY_BALE))
    sheet.add('prop_signpost', outlined(SIGNPOST))
    sheet.add('prop_flower-patch', outlined(FLOWER_PATCH))
    sheet.add('prop_bush', outlined(BUSH))
    sheet.add('prop_hedge', outlined(HEDGE))
    sheet.add('prop_notice-board', outlined(NOTICE_BOARD))
    sheet.add('prop_planter', outlined(PLANTER))
    sheet.add('prop_trough', outlined(TROUGH))
    sheet.add('prop_pump', outlined(PUMP))
    sheet.add('prop_sacks', pile(SACK, SACK_PILE, (14, 13)))
    sheet.add('prop_woodpile', pile(WOOD_END, WOOD_PILE, (16, 14)))

    # joins lists the sides a piece's rails reach; downward joins are drawn by the piece below
    sheet.add('prop_fence_post', fence_piece(), joins='')
    sheet.add('prop_fence_horizontal', fence_piece(left=True, right=True), joins='lr')
    sheet.add('prop_fence_vertical', fence_piece(up=True), joins='u')
    sheet.add('prop_fence_corner_top-left', fence_piece(right=True), joins='r')
    sheet.add('prop_fence_corner_top-right', fence_piece(left=True), joins='l')
    sheet.add('prop_fence_corner_bottom-left', fence_piece(up=True, right=True), joins='ur')
    sheet.add('prop_fence_corner_bottom-right', fence_piece(up=True, left=True), joins='ul')

    # carts face the horse; anchor on the wheel's ground point, hitch at the shaft tip
    wx = WHEEL_AT[0] + 1 + len(WHEEL[0]) // 2
    for load in CART_LOADS:
        im = cart(load)
        w, h = im.size
        hx, hy = HITCH[0] + 1, HITCH[1] + 1
        sheet.add(f'prop_cart_{load}_left', im, anchor=(wx, h - 1), hitch=[hx, hy])
        sheet.add(f'prop_cart_{load}_right', mirror(im), anchor=(w - 1 - wx, h - 1), hitch=[w - 1 - hx, hy])
    return sheet


if __name__ == '__main__':
    build().save()
