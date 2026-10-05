"""Original modular 16x22 overworld characters (drawn for this mockup).

Every character uses the same body. Appearance (skin tone, hair style/colour, clothes colours)
is chosen independently of role. Roles are shown only by accessories/uniform:
  police   -> peaked cap with badge + navy uniform + chest badge
  merchant -> green/cream striped apron + headscarf with side knot
  stealing -> not a costume: the citizen's own look, in a crouched sneaking pose holding a loot sack
"""
from PIL import Image
from pix import from_ascii, add_outline, OUTLINE

W, H = 18, 22  # 16px body centred in an 18px canvas so outlines/knots never clip

# ---------------------------------------------------------------- body templates
# S skin, s skin shade, E eye, e closed eye, T top, t top shade, u top highlight,
# P pants, p pants shade, F shoe, O inner line
BODY = {}
BODY['down'] = [
    "................",  # 0
    "................",  # 1
    "................",  # 2
    "......SSSS......",  # 3
    "....SSSSSSSS....",  # 4
    "...SSSSSSSSSS...",  # 5
    "..SSSSSSSSSSSS..",  # 6
    "..SSSSSSSSSSSS..",  # 7
    "..SSSSSSSSSSSS..",  # 8
    "..SSSESSSSESSS..",  # 9
    "..SSSESSSSESSS..",  # 10
    "..sSSSSSSSSSSs..",  # 11
    "...ssSSSSSSss...",  # 12
    "....uTTTTTTu....",  # 13
    "...TTTTTTTTTT...",  # 14
    "...TTTTTTTTTT...",  # 15
    "...TOtTTTTtOT...",  # 16
    "...SOPPPPPPOS...",  # 17
    "....PPPPPPPP....",  # 18
    "....PPPppPPP....",  # 19
    "....FFF..FFF....",  # 20
    "................",  # 21
]
BODY['down_walk'] = BODY['down'][:16] + [
    "...TOtTTTTtOS...",  # 16 right arm swings forward (hand higher)
    "...SOPPPPPPO....",  # 17
    "....PPPPPPPP....",  # 18
    "....PPPpFFF.....",  # 19 right foot lifted
    "....FFF.........",  # 20
    "................",  # 21
]
BODY['down_sleep'] = [r.replace('E', 'e') for r in BODY['down']]
# sitting (front): body lowered by one row, short legs, hands on lap
BODY['down_sit'] = [
    "................",
    "................",
    "................",
    "................",
] + [r.replace('E', 'e') for r in BODY['down'][3:13]] + [
    "....uTTTTTTu....",  # 14
    "...TTTTTTTTTT...",  # 15
    "...TOtTTTTtOT...",  # 16
    "...TSPPPPPPST...",  # 17 hands on lap
    "....PPPPPPPP....",  # 18 thighs toward viewer
    "....FFF..FFF....",  # 19
    "................",  # 20
    "................",  # 21
]
BODY['up'] = [
    "................",
    "................",
    "................",
    "......SSSS......",
    "....SSSSSSSS....",
    "...SSSSSSSSSS...",
    "..SSSSSSSSSSSS..",
    "..SSSSSSSSSSSS..",
    "..SSSSSSSSSSSS..",
    "..SSSSSSSSSSSS..",
    "..SSSSSSSSSSSS..",
    "..sSSSSSSSSSSs..",
    "...ssSSSSSSss...",
    "....uTTTTTTu....",
    "...TTTTTTTTTT...",
    "...TTTTTTTTTT...",
    "...TOtTTTTtOT...",
    "...SOPPPPPPOS...",
    "....PPPPPPPP....",
    "....PPPppPPP....",
    "....FFF..FFF....",
    "................",
]
BODY['up_walk'] = BODY['up'][:16] + [
    "...SOtTTTTtOT...",
    "....OPPPPPPOS...",
    "....PPPPPPPP....",
    "....FFFpPPPP....",
    ".........FFF....",
    "................",
]
# facing left; right-facing sprites are mirrored
BODY['left'] = [
    "................",  # 0
    "................",  # 1
    "................",  # 2
    ".....SSSS.......",  # 3
    "....SSSSSSS.....",  # 4
    "...SSSSSSSSS....",  # 5
    "..SSSSSSSSSSS...",  # 6
    "..SSSSSSSSSSS...",  # 7
    "..SSSSSSSSSSS...",  # 8
    "..SSESSSSSSSS...",  # 9
    "..SSESSSSSSSS...",  # 10
    "..sSSSSSSSSSs...",  # 11
    "...ssSSSSSss....",  # 12
    ".....uTTTTu.....",  # 13
    ".....TTTTTT.....",  # 14
    ".....TTTTTT.....",  # 15
    ".....TtSTTT.....",  # 16  hand in front of body
    ".....PPPPPP.....",  # 17
    ".....PPPPPP.....",  # 18
    ".....PPp.PP.....",  # 19
    "....FFF..FFF....",  # 20 (rear shoe heel)
    "................",  # 21
]
BODY['left_walk'] = BODY['left'][:13] + [
    ".....uTTTTu.....",  # 13
    ".....TTTTTT.....",  # 14
    "....STTTTTT.....",  # 15 front arm swings forward
    ".....tTTTTTS....",  # 16 back hand
    ".....PPPPPP.....",  # 17
    "....PPPPPPPP....",  # 18
    "...PPp....PP....",  # 19 stride
    "..FFF.....FFF...",  # 20
    "................",  # 21
]
# crouched sneak, facing left: head low and forward, back hunched, knees bent, arm reaching.
_head_left = BODY['left'][3:13]
BODY['left_sneak'] = [
    "................",  # 0
    "................",  # 1
    "................",  # 2
    "................",  # 3
    "................",  # 4
] + [r[1:] + '.' for r in _head_left[:9]] + [  # head rows 5..13, shifted 1 px forward
    "..ssSSSSSssTT...",  # 14 hunched back rises behind the head
    "....uTTTTTTTT...",  # 15
    "..SSTTTTTTTTT...",  # 16 arm reaching forward
    "....tTTTTTTTP...",  # 17
    "....PPPPPPPPPP..",  # 18 thighs
    "...PPP.....PPP..",  # 19 shins
    "..FFF......FFF..",  # 20 feet (tiptoe stride)
    "................",  # 21
]

# ---------------------------------------------------------------- hair overlays
# H hair, h hair shade, L hair highlight, '.' leave as is, 'x' erase pixel
HAIR = {
    'short': {
        'down': [
            "................",
            "................",
            "................",
            "......HHHH......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHH..",
            "..HHhHHhHHhHHH..",
            "..Hh.h....h.hH..",
            "..h..........h..",
        ],
        'up': [
            "................",
            "................",
            "................",
            "......HHHH......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..hHHHHHHHHHHh..",
            "..hhHhHHhHhHhh..",
            "...h........h...",
        ],
        'left': [
            "................",
            "................",
            "................",
            ".....HHHH.......",
            "....HHLLHHH.....",
            "...HHLLHHHHH....",
            "..HHHHHHHHHHH...",
            "..HhHHhHHHHHH...",
            "..h..h..HHHHH...",
            "........hHHHH...",
            "........hHHHH...",
            ".........hHHh...",
            "..........hh....",
        ],
    },
    'bob': {
        'down': [
            "................",
            "................",
            "......HHHH......",
            "....HHHHHHHH....",
            "...HHHLLHHHHH...",
            "..HHHLLHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHhHHHHhHHH..",
            "..HHh......hHH..",
            "..Hh........hH..",
            "..Hh........hH..",
            "..hh........hh..",
            "..hh........hh..",
            "..hh........hh..",
        ],
        'up': [
            "................",
            "................",
            "......HHHH......",
            "....HHHHHHHH....",
            "...HHHLLHHHHH...",
            "..HHHLLHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..hHHHHHHHHHHh..",
            "..hHHHHHHHHHHh..",
            "..hhHHHHHHHHhh..",
            "..hhhhhhhhhhhh..",
        ],
        'left': [
            "................",
            "................",
            ".....HHHH.......",
            "....HHHHHHH.....",
            "...HHLLHHHHH....",
            "..HHLLHHHHHHH...",
            "..HHHHHHHHHHH...",
            "..HhHHHHHHHHH...",
            "..h....HHHHHH...",
            ".......hHHHHH...",
            ".......hHHHHH...",
            ".......hHHHHh...",
            ".......hhHHhh...",
            "........hhhh....",
        ],
    },
    'curly': {
        'down': [
            "................",
            "................",
            "....H.HHHH.H....",
            "...HHHHHHHHHH...",
            "..HHHLHHHHLHHH..",
            ".HHHLLHHHLLHHHH.",
            ".HHHHHHHHHHHHHH.",
            ".HHHHhHHHHhHHHH.",
            ".HHh.h....h.hHH.",
            "..Hh........hH..",
            "..h..........h..",
        ],
        'up': [
            "................",
            "................",
            "....H.HHHH.H....",
            "...HHHHHHHHHH...",
            "..HHHLHHHHLHHH..",
            ".HHHLLHHHLLHHHH.",
            ".HHHHHHHHHHHHHH.",
            ".HHHHHHHHHHHHHH.",
            ".HHHHHHHHHHHHHH.",
            ".HHHHHHHHHHHHHH.",
            "..hHHHHHHHHHHh..",
            "..hhHhHHHhHhhh..",
            "...h.h....h.h...",
        ],
        'left': [
            "................",
            "................",
            "....H.HHHH.H....",
            "...HHHHHHHHHH...",
            "..HHLHHHLHHHHH..",
            ".HHLLHHLLHHHHHH.",
            ".HHHHHHHHHHHHHH.",
            ".HHhHHhHHHHHHHH.",
            "..h..h..HHHHHHH.",
            "........hHHHHHh.",
            "........hHHHHh..",
            ".........hhHh...",
        ],
    },
    'bun': {
        'down': [
            "................",
            "......HHHH......",
            ".....HHLLHH.....",
            "......hHHh......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHH..",
            "..HHHHhHHhHHHH..",
            "..Hh........hH..",
            "..h..........h..",
        ],
        'up': [
            "................",
            "......HHHH......",
            ".....HHLLHH.....",
            "......hHHh......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..hHHHHHHHHHHh..",
            "..hhHHHHHHHHhh..",
            "...h........h...",
        ],
        'left': [
            "................",
            "........HHHH....",
            ".......HHLLHH...",
            ".....HHHhHHh....",
            "....HHLLHHH.....",
            "...HHLLHHHHH....",
            "..HHHHHHHHHHH...",
            "..HhHHhHHHHHH...",
            "..h.....HHHHH...",
            "........hHHHH...",
            "........hHHHH...",
            ".........hHHh...",
            "..........hh....",
        ],
    },
    'pony': {
        'down': [
            "................",
            "................",
            "................",
            "......HHHH......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHHH.",
            "..HhHHHhHHHHhHHH",
            "..Hh........hHHh",
            "..h..........hHh",
            "..............hh",
        ],
        'up': [
            "................",
            "................",
            "................",
            "......HHHH......",
            "....HHHLLHHH....",
            "...HHHLLHHHHH...",
            "..HHHHHHHHHHHH..",
            "..HHHHHHHHHHHH..",
            "..HHHHHhhHHHHH..",
            "..HHHHHLHHHHHH..",
            "..hHHHHHHHHHHh..",
            "..hhHHHHHHHHhh..",
            "...h..HHHh..h...",
            "......hHHh......",
            "......hHh.......",
            ".......h........",
        ],
        'left': [
            "................",
            "................",
            "................",
            ".....HHHH.......",
            "....HHLLHHH.....",
            "...HHLLHHHHH....",
            "..HHHHHHHHHHHH..",
            "..HhHHhHHHHHHHH.",
            "..h.....HHHHHHH.",
            "........hHHHhHH.",
            "........hHHH.hH.",
            ".........hHh.hh.",
            "..........hh..h.",
        ],
    },
}

# ---------------------------------------------------------------- role overlays
# Police cap: C crown, c crown shade, V visor (black), G gold badge, k cap band
CAP = {
    'down': [
        "................",
        "....CCCCCCCC....",
        "...CCCCCCCCCC...",
        "..CCCCCGGCCCCC..",
        "..cCCCCGGCCCCc..",
        "..kkkkkkkkkkkk..",
        ".VVVVVVVVVVVVVV.",
    ],
    'up': [
        "................",
        "....CCCCCCCC....",
        "...CCCCCCCCCC...",
        "..CCCCCCCCCCCC..",
        "..cCCCCCCCCCCc..",
        "..kkkkkkkkkkkk..",
        "..cccccccccccc..",
    ],
    'left': [
        "................",
        "....CCCCCCCC....",
        "...CCCCCCCCCC...",
        "..CGGCCCCCCCCC..",
        "..CGGCCCCCCCCc..",
        "..kkkkkkkkkkkk..",
        ".VVVVcccccc.....",
    ],
}
CAP_ROW0 = 1  # cap overlay starts at row 1 (above the skull: silhouette cue)

# Merchant headband tied round the forehead; the knot tails stick out at the side (silhouette cue)
SCARF = {
    'down': [
        "..DDDDDDDDDDDDd.",
        "..dDDDDDDDDDDdDd",
        "..............dD",
    ],
    'up': [
        "..DDDDDDDDDDDD..",
        "..dDDDDDDDDDDd..",
        "......dDDd......",
        ".......DDd......",
    ],
    'left': [
        "..DDDDDDDDDDDD..",
        "..dDDDDDDDDDdDd.",
        "............dDDd",
    ],
}
SCARF_ROW0 = 6

# Long shop apron (covers the legs: different silhouette). Y apron, y shade, Z green trim
APRON = {
    'down': [  # rows 13..19
        "....uZTTTTZu....",
        "...TTYYYYYYTT...",
        "...TTYYYYYYTT...",
        "...TOYYYYYYOT...",
        "...SYYyyyyYYS...",
        "....YYyyyyYY....",
        "....ZZZZZZZZ....",
    ],
    'left': [
        ".....uTTTTu.....",
        ".....YYTTTT.....",
        ".....YYTTTT.....",
        ".....YYSTTT.....",
        "....YYYPPPP.....",
        "....YYYPPPP.....",
        "....ZZZZ.PP.....",
    ],
    'up': [
        "....uZTTTTZu....",
        "...TTZTTTTZTT...",
        "...TTZTTTTZTT...",
        "...TOZTTTTZOT...",
        "...SOZZZZZZOS...",
        "....YYYZZYYY....",
        "....ZZZ..ZZZ....",
    ],
}
APRON_ROW0 = 13


def _p(rows):
    return ['.' + r + '.' for r in rows]


for _k in list(BODY):
    BODY[_k] = _p(BODY[_k])
for _s in HAIR:
    for _d in HAIR[_s]:
        HAIR[_s][_d] = _p(HAIR[_s][_d])
for _d in CAP:
    CAP[_d] = _p(CAP[_d])
for _d in SCARF:
    SCARF[_d] = _p(SCARF[_d])
for _d in APRON:
    APRON[_d] = _p(APRON[_d])


def _overlay(base_rows, ov_rows, row0, offset_x=0):
    rows = [list(r) for r in base_rows]
    for dy, orow in enumerate(ov_rows):
        y = row0 + dy
        if y < 0 or y >= len(rows):
            continue
        for x, ch in enumerate(orow):
            X = x + offset_x
            if ch == '.' or X < 0 or X >= W:
                continue
            rows[y][X] = ' ' if ch == 'x' else ch
    return [''.join(r) for r in rows]


def _shift(rows, dy=0, dx=0):
    out = [['.'] * W for _ in range(H)]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '.':
                continue
            Y, X = y + dy, x + dx
            if 0 <= Y < H and 0 <= X < W:
                out[Y][X] = ch
    return [''.join(r) for r in out]


# ---------------------------------------------------------------- palettes (all chosen for this mockup)
SKIN = {  # base, shade
    1: ((255, 222, 194), (226, 172, 140)),
    2: ((240, 192, 150), (204, 146, 106)),
    3: ((214, 158, 112), (176, 116, 78)),
    4: ((176, 116, 76), (138, 84, 54)),
    5: ((128, 82, 56), (98, 60, 42)),
    6: ((92, 58, 44), (68, 42, 34)),
}
HAIRC = {  # base, shade, highlight
    'black': ((46, 40, 56), (26, 22, 34), (88, 82, 108)),
    'brown': ((122, 74, 42), (88, 50, 28), (168, 112, 66)),
    'blonde': ((240, 196, 84), (200, 146, 54), (255, 236, 150)),
    'ginger': ((206, 92, 46), (156, 58, 32), (240, 140, 80)),
    'grey': ((206, 206, 214), (160, 160, 176), (246, 246, 252)),
    'dark': ((70, 44, 34), (46, 28, 22), (110, 74, 54)),
}
CLOTH = {  # base, shade, highlight
    'teal': ((48, 150, 140), (30, 104, 100), (100, 200, 182)),
    'orange': ((238, 138, 52), (194, 94, 34), (255, 186, 106)),
    'purple': ((146, 94, 184), (102, 62, 138), (186, 142, 218)),
    'green': ((112, 172, 64), (74, 126, 44), (156, 208, 102)),
    'yellow': ((246, 204, 70), (206, 156, 40), (255, 236, 140)),
    'red': ((214, 68, 58), (160, 42, 38), (242, 122, 102)),
    'pink': ((234, 128, 160), (192, 88, 120), (252, 182, 204)),
    'white': ((236, 236, 240), (192, 192, 204), (255, 255, 255)),
    'brown': ((150, 100, 64), (110, 70, 44), (190, 138, 96)),
}
PANTS = {
    'denim': ((76, 100, 150), (52, 70, 112)),
    'brown': ((122, 84, 56), (88, 58, 38)),
    'grey': ((116, 116, 128), (84, 84, 96)),
    'olive': ((112, 118, 62), (80, 86, 42)),
    'black': ((56, 54, 66), (36, 34, 44)),
    'tan': ((200, 170, 120), (160, 130, 88)),
}
SHOE = (70, 46, 36)
EYE = (24, 20, 34)

POLICE_TOP = ((44, 62, 128), (28, 40, 88), (74, 100, 170))
POLICE_PANTS = ((36, 50, 104), (24, 32, 72))
POLICE_CAP = ((40, 56, 118), (26, 36, 82))
POLICE_BAND = (18, 18, 26)
VISOR = (14, 14, 20)
GOLD = (255, 204, 64)
GOLD_D = (200, 140, 30)
SCARF_C = ((70, 158, 92), (44, 112, 62))       # merchant green (matches shop awning)
APRON_C = ((246, 238, 214), (212, 198, 170))
APRON_STRIPE = (70, 158, 92)


class Person:
    def __init__(self, skin=2, hair='short', hair_color='brown', top='teal', pants='denim',
                 role='citizen'):
        self.skin, self.hair, self.hair_color = skin, hair, hair_color
        self.top, self.pants, self.role = top, pants, role

    def sprite(self, direction='down', pose='', mirror=None, loot=False):
        """direction: down/up/left/right. pose: '', 'walk', 'sleep', 'sit', 'sneak'."""
        if direction == 'right':
            im = self.sprite('left', pose, loot=loot)
            return im.transpose(Image.FLIP_LEFT_RIGHT)
        key = direction + ('_' + pose if pose else '')
        rows = list(BODY[key])
        hdir = direction
        dy = 0
        dx = 0
        if pose == 'sit':
            dy = 1
        if pose == 'sneak':
            dy, dx = 2, -1
        hair_style = self.hair
        # police cap hides most hair: keep only sides/back
        hair_rows = HAIR[hair_style][hdir]
        hair_rows = _shift(hair_rows + ['.' * W] * (H - len(hair_rows)), dy=dy, dx=dx)
        rows = _overlay(rows, hair_rows, 0)
        if self.role == 'police':
            cap = CAP[hdir]
            rows = _overlay(rows, cap, CAP_ROW0 + dy + 1, dx)
        if self.role == 'merchant':
            rows = _overlay(rows, SCARF[hdir], SCARF_ROW0 + dy, dx)
            if hdir in APRON and pose in ('', 'walk'):
                rows = _overlay(rows, APRON[hdir], APRON_ROW0)
        if self.role == 'police' and hdir == 'down' and pose in ('', 'walk'):
            # light-blue collar + gold chest badge
            rows = _overlay(rows, _p(["......WWWW......", "................", "........G.......",
                                      "................"]), 13)
        if self.role == 'police' and hdir == 'left':
            rows = _overlay(rows, _p(["................", "......G.........", ]), 14 + (2 if pose == 'sneak' else 0))

        sk, sk_s = SKIN[self.skin]
        hc, hc_s, hc_l = HAIRC[self.hair_color]
        if self.role == 'police':
            tc, tc_s, tc_h = POLICE_TOP
            pc, pc_s = POLICE_PANTS
        else:
            tc, tc_s, tc_h = CLOTH[self.top]
            pc, pc_s = PANTS[self.pants]
        cmap = {
            'S': sk, 's': sk_s, 'E': EYE, 'e': sk_s,
            'T': tc, 't': tc_s, 'u': tc_h,
            'P': pc, 'p': pc_s, 'F': SHOE, 'O': OUTLINE,
            'H': hc, 'h': hc_s, 'L': hc_l,
            'C': POLICE_CAP[0], 'c': POLICE_CAP[1], 'k': POLICE_BAND, 'V': VISOR, 'G': GOLD,
            'W': (176, 214, 246),
            'D': SCARF_C[0], 'd': SCARF_C[1], 'w': (240, 244, 230),
            'Y': APRON_C[0], 'y': APRON_C[1], 'Z': APRON_STRIPE,
        }
        if pose == 'sleep' or pose == 'sit':
            cmap['e'] = (60, 40, 40)
        im = from_ascii(rows, cmap)
        im = add_outline(im)
        if loot:
            im = _add_loot(im, direction)
        return im


SACK = [
    "..OOO..",
    ".OkkkO.",
    "..OBO..",
    ".OBBBO.",
    "OBBGBBO",
    "OBBBBbO",
    ".OOOOO.",
]


def _add_loot(im, direction):
    """Loot sack slung on the back of the sneaking citizen (drawn for the left-facing sprite)."""
    sack = from_ascii(SACK, {'O': OUTLINE, 'k': (110, 74, 44), 'B': (204, 160, 100), 'b': (150, 108, 64),
                             'G': GOLD})
    out = Image.new('RGBA', (W + 3, H), (0, 0, 0, 0))
    out.alpha_composite(sack, (13, 10))
    out.alpha_composite(im, (0, 0))
    return out


# ---------------------------------------------------------------- emote bubbles (original)
BUBBLE = [
    "..OOOOOOOOO..",
    ".OWWWWWWWWWO.",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    "OWWWWWWWWWWWO",
    ".OWWWWWWWWWO.",
    "..OOOOWWOOO..",
    "......WO.....",
    "......O......",
]
ICONS = {
    '!': (["..RR..", "..RR..", "..RR..", "..RR..", "..rr..", "......", "..RR.."],
          {'R': (226, 52, 44), 'r': (170, 30, 30)}),
    '$': (["..G..", ".GGGG", "G.G..", ".GGG.", "..G.G", "GGGG.", "..G.."],
          {'G': (190, 132, 12)}),
    'z': ([".....BBBB", ".......B.", "......B..", ".....BBBB", "BBBBB....", "...B.....", "..B......",
           ".B.......", "BBBBB...."],
          {'B': (64, 104, 196)}),
    'food': (["..ooo....", ".oMMMo...", "oMMmMMo..", "oMmMMMo..", "oMMMMo...", ".oMMoWW..", "..oo.oWW.",
              "......WW."],
             {'M': (206, 112, 56), 'm': (240, 170, 110), 'o': (120, 60, 30), 'W': (236, 228, 210)}),
    '?': (["..BBB.", ".B...B", ".....B", "...BB.", "...B..", "......", "...B.."],
          {'B': (70, 110, 200)}),
}


def bubble(icon):
    im = from_ascii(BUBBLE, {'O': OUTLINE, 'W': (255, 255, 255)})
    rows, cmap = ICONS[icon]
    ic = from_ascii(rows, cmap)
    x = (13 - ic.width + 1) // 2
    y = 1 + (10 - ic.height + 1) // 2
    im.alpha_composite(ic, (x, y))
    return im


COIN = [
    ".OOOO.",
    "OWGGgO",
    "OGGGgO",
    "OGGGgO",
    "OgggdO",
    ".OOOO.",
]


def coin():
    return from_ascii(COIN, {'O': (70, 40, 8), 'G': GOLD, 'g': GOLD_D, 'd': (150, 96, 20), 'W': (255, 250, 210)})


def shadow(w=10, h=3, alpha=90):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            # ellipse
            dx = (x + 0.5 - w / 2) / (w / 2)
            dy = (y + 0.5 - h / 2) / (h / 2)
            if dx * dx + dy * dy <= 1.0:
                px[x, y] = (20, 30, 20, alpha)
    return im
