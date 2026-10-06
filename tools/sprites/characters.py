"""Characters: the shared blob body, its face overlays and the job items worn over it.

Every frame sits on one 18x22 canvas with the ground on row 20 and the anchor at (9, 20), so a
character is three layers drawn at the same point: body, then face, then job item. The body
geometry is that of docs/mockups/generator/blobs.py ('stand', the 'squash' walk frame, 'sit' and
the crouched 'sneak'). Bodies carry no face; each body frame's manifest entry gives the offset
(`face`) at which to draw the face overlays, which are drawn for the standing pose. The back
view has no face.

Crime is an act, never a costume: the sneak is a pose any agent may take, with no sack, mask or
mark. Faces show events (a purchase, a refused price, a blink), never income, wealth or a level
of happiness. Job items are removable clothing and follow the body into every pose.

Build: python tools/sprites/characters.py
"""
import numpy as np
from PIL import Image

import spritekit as sk

# The same key as icons.py. Upper case is the lighter tone of a pair.
KEY = sk.cmap(
    O='OUTLINE', W='WHITE',
    C='CREAM', c='CREAM_D',
    G='GRASS_L', g='GRASS', f='LEAF_D',
    E='TEAL', e='TEAL_D',
    A='WATER_L',
    N='NAVY', n='NAVY_D',
    Y='GOLD',
    L='BODY_L', B='BODY', b='BODY_S', D='BODY_D',
    p='PINK_D',
)
OUTLINE = sk.PALETTE['OUTLINE']
W, H, GROUND = 18, 22, 20
ANCHOR = (W // 2, GROUND)
FACINGS = ('down', 'left', 'right', 'up')


def _sym(widths, bottom=GROUND):
    """Rows of a shape symmetric about x = 8.5, its bottom row on `bottom` (as blobs.py)."""
    top = bottom - len(widths) + 1
    return {top + i: ((W - w) // 2, (W - w) // 2 + w - 1) for i, w in enumerate(widths)}


STAND = [4, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 14, 12, 10]
SHAPES = {
    'stand': _sym(STAND),
    'hop': _sym(STAND, bottom=GROUND - 1),        # the walk's second frame: one pixel off the ground
    'squash': _sym([6, 10, 12, 14, 16, 16, 16, 16, 16, 16, 16, 14, 12]),
    'sit': _sym([6, 10, 12, 14, 16, 16, 16, 16, 16, 16, 14, 12]),
    'sneak': {11: (9, 13), 12: (6, 14), 13: (4, 15), 14: (3, 16), 15: (2, 16), 16: (1, 16),
              17: (1, 16), 18: (1, 16), 19: (1, 16), 20: (2, 15)},   # crouched, leaning left
}
# pose: (shape, offset of the face overlays for the down and left views; right mirrors dx)
POSES = {
    'stand': ('stand', (0, 0)),
    'walk_0': ('squash', (0, 1)),
    'walk_1': ('hop', (0, -1)),
    'sit': ('sit', (0, 2)),
    'sneak': ('sneak', (1, 4)),
}


def frames():
    """(name stem, pose, facing) for every body frame, in sheet order."""
    out = [(f'stand_{f}', 'stand', f) for f in FACINGS]
    out += [(f'walk_{f}_{i}', f'walk_{i}', f) for f in FACINGS for i in (0, 1)]
    out += [(f'sit_{f}', 'sit', f) for f in ('down', 'left', 'right')]
    out += [(f'sneak_{f}', 'sneak', f) for f in ('left', 'right')]
    return out


def _blank():
    return [['.'] * W for _ in range(H)]


def _rows(g):
    return [''.join(r) for r in g]


def _stamp(stamps):
    """A blank canvas with (row, x, text) strings stamped in; '.' leaves a pixel clear."""
    g = _blank()
    for y, x, text in stamps:
        for i, ch in enumerate(text):
            if ch != '.':
                g[y][x + i] = ch
    return _rows(g)


def _flip(im, facing):
    return sk.mirror(im) if facing == 'right' else im


def _shift(im, dx, dy):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.alpha_composite(im, (max(dx, 0), max(dy, 0)), (max(-dx, 0), max(-dy, 0)))
    return out


def _mask(im):
    return np.array(im)[:, :, 3] > 0


# ---------------------------------------------------------------------------- the body
def body_rows(pose):
    """The faceless blob of blobs.py in palette colours: shade on the right and the base,
    a highlight on the upper left of the dome."""
    spans = SHAPES[POSES[pose][0]]
    g = _blank()
    ys = sorted(spans)
    top, bot = ys[0], ys[-1]
    for y in ys:
        x0, x1 = spans[y]
        for x in range(x0, x1 + 1):
            ch = 'B'
            if x == x1 or (x == x1 - 1 and y > top + 3):
                ch = 'b'
            if y == bot - 1:
                ch = 'b'
            if y == bot:
                ch = 'D' if (x <= x0 + 1 or x >= x1 - 1) else 'b'
            g[y][x] = ch
    for dy, dxs in ((1, (1,)), (2, (1, 2)), (3, (1,))):
        for dx in dxs:
            g[top + dy][spans[top + dy][0] + dx] = 'L'
    return _rows(g)


def body_fill(pose, facing):
    return _flip(sk.from_ascii(body_rows(pose), KEY), facing)


def body(pose, facing):
    return sk.add_outline(body_fill(pose, facing))


def face_offset(pose, facing):
    dx, dy = POSES[pose][1]
    return [-dx if facing == 'right' else dx, dy]


# ---------------------------------------------------------------------------- faces
EYE_X = {'down': (4, 10), 'left': (2, 8)}    # each eye's left column in the standing pose
EYE_ROW = 11
# expression: {view: (left eye, right eye)}, 4x4 each. '.' lets the body show through; O is the
# pupil or the line of a closed eye. A face uses no other dark pixels and no mouth (hidden by default).
FACES = {
    'neutral': {'down': (["WWWW", "WWWW", "WOOW", "WOOW"],) * 2,
                'left': (["WWWW", "WWWW", "OOWW", "OOWW"],) * 2},
    'blink': {'down': (["....", "....", "OOOO", "...."],) * 2,
              'left': (["....", "....", "OOOO", "...."],) * 2},
    'happy': {'down': (["....", ".OO.", "O..O", "p..."], ["....", ".OO.", "O..O", "...p"]),
              'left': (["....", ".OO.", "O..O", "p..."], ["....", ".OO.", "O..O", "...p"])},
    'angry': {'down': (["WWO.", "WWWO", "WOOW", "WOOW"], [".OWW", "OWWW", "WOOW", "WOOW"]),
              'left': (["WWO.", "WWWO", "OOWW", "OOWW"], [".OWW", "OWWW", "OOWW", "OOWW"])},
    'wince': {'down': (["....", "OO..", "..OO", "OO.."], ["....", "..OO", "OO..", "..OO"]),
              'left': (["....", "OO..", "..OO", "OO.."], ["....", "..OO", "OO..", "..OO"])},
    'sleep': {'down': (["....", "....", "O..O", ".OO."],) * 2,
              'left': (["....", "....", "O..O", ".OO."],) * 2},
}


def face(expression, facing):
    """A face for the standing pose, clipped to the body so it never changes the silhouette."""
    view = 'left' if facing == 'right' else facing
    stamps = []
    for x, eye in zip(EYE_X[view], FACES[expression][view]):
        stamps += [(EYE_ROW + i, x, row) for i, row in enumerate(eye)]
    a = np.array(sk.from_ascii(_stamp(stamps), KEY))
    a[~_mask(body_fill('stand', 'left'))] = 0
    return _flip(Image.fromarray(a), facing)


# ---------------------------------------------------------------------------- job items
# Head items: (row relative to the body's top row, x, text) for the narrow head (stand, hop) and
# the wider head of the squash and sit frames, whose top four rows are one pixel wider each side.
HEADS = {
    'police': {  # navy peaked cap with a gold badge
        'narrow': {
            'down': [(-1, 5, 'NANNNNNN'), (0, 4, 'NNNNYYNNNn'), (1, 4, 'NNNNYbNNNn'), (2, 4, 'nnnnnnnnnn'),
                     (3, 2, 'NNNNNNNNNNNNNn')],
            'left': [(-1, 5, 'NANNNNNN'), (0, 4, 'NYYNNNNNNn'), (1, 4, 'NYbNNNNNNn'), (2, 4, 'nnnnnnnnnn'),
                     (3, 1, 'NNNNNNnnnnnn')],
            'up': [(-1, 5, 'NANNNNNN'), (0, 4, 'NNNNNNNNNn'), (1, 4, 'NNNNNNNNNn'), (2, 4, 'nnnnnnnnnn'),
                   (3, 4, 'nnnnnnnnnn')],
        },
        'wide': {
            'down': [(-1, 4, 'NANNNNNNNN'), (0, 3, 'NNNNNYYNNNNn'), (1, 3, 'NNNNNYbNNNNn'),
                     (2, 3, 'nnnnnnnnnnnn'), (3, 1, 'NNNNNNNNNNNNNNNn')],
            'left': [(-1, 4, 'NANNNNNNNN'), (0, 3, 'NYYNNNNNNNNn'), (1, 3, 'NYbNNNNNNNNn'),
                     (2, 3, 'nnnnnnnnnnnn'), (3, 1, 'NNNNNNnnnnnnn')],
            'up': [(-1, 4, 'NANNNNNNNN'), (0, 3, 'NNNNNNNNNNNn'), (1, 3, 'NNNNNNNNNNNn'),
                   (2, 3, 'nnnnnnnnnnnn'), (3, 3, 'nnnnnnnnnnnn')],
        },
    },
    'merchant': {  # teal headband with a side knot (web.md: merchants are teal)
        'narrow': {
            'down': [(2, 4, 'EEEEEEEEEE'), (3, 3, 'eeeeeeeeeeeeEE'), (4, 16, 'e')],
            'left': [(2, 4, 'EEEEEEEEEE'), (3, 3, 'eeeeeeeeeeeeEE'), (4, 16, 'e')],
            'up': [(2, 4, 'EEEEEEEEEE'), (3, 3, 'eeeeeeeeeeee'), (4, 8, 'EE'), (5, 8, 'ee')],
        },
        'wide': {
            'down': [(2, 3, 'EEEEEEEEEEEE'), (3, 2, 'eeeeeeeeeeeeeeE'), (4, 16, 'e')],
            'left': [(2, 3, 'EEEEEEEEEEEE'), (3, 2, 'eeeeeeeeeeeeeeE'), (4, 16, 'e')],
            'up': [(2, 3, 'EEEEEEEEEEEE'), (3, 2, 'eeeeeeeeeeeeee'), (4, 8, 'EE'), (5, 8, 'ee')],
        },
    },
    'clinic': {  # white headband with a small green cross (never red); a body row keeps it off the eyes
        'narrow': {
            'down': [(0, 8, 'gg'), (1, 5, 'WWggggWc'), (2, 4, 'WWWWggWWWc'), (2, 14, 'W'), (3, 15, 'c')],
            'left': [(0, 7, 'gg'), (1, 5, 'WggggWWc'), (2, 4, 'WWWggWWWWc'), (2, 14, 'W'), (3, 15, 'c')],
            'up': [(1, 5, 'WWWWWWWc'), (2, 4, 'WWWWWWWWWc'), (3, 8, 'Wc'), (4, 7, 'c..c')],
        },
        'wide': {
            'down': [(0, 8, 'gg'), (1, 4, 'WWWggggWWc'), (2, 3, 'WWWWWggWWWWc'), (2, 15, 'W'), (3, 16, 'c')],
            'left': [(0, 7, 'gg'), (1, 4, 'WWggggWWWc'), (2, 3, 'WWWWggWWWWWc'), (2, 15, 'W'), (3, 16, 'c')],
            'up': [(1, 4, 'WWWWWWWWWc'), (2, 3, 'WWWWWWWWWWWc'), (3, 8, 'Wc'), (4, 7, 'c..c')],
        },
    },
    'builder': {  # gold hard hat: ridged dome, and a dark brim that parts it from the yellow body
        'narrow': {
            'down': [(-3, 7, 'LLYb'), (-2, 5, 'LYYLYYbb'), (-1, 4, 'LYYYLYYYbD'), (0, 4, 'YYYYLYYYbD'),
                     (1, 4, 'YYYYYYYYbD'), (2, 2, 'DDDDDDDDDDDDDD')],
            'left': [(-3, 7, 'LLYb'), (-2, 5, 'LYYYYYbb'), (-1, 4, 'LYYYYYYYbD'), (0, 4, 'YYYYYYYYbD'),
                     (1, 4, 'YYYYYYYYbD'), (2, 1, 'DDDDDDDDDDDDDD')],
            'up': [(-3, 7, 'LLYb'), (-2, 5, 'LYYLYYbb'), (-1, 4, 'LYYYLYYYbD'), (0, 4, 'YYYYLYYYbD'),
                   (1, 4, 'YYYYYYYYbD'), (2, 3, 'DDDDDDDDDDDD')],
        },
        'wide': {
            'down': [(-3, 6, 'LYLYbb'), (-2, 4, 'LYYYLYYYbb'), (-1, 3, 'LYYYYLYYYYbD'), (0, 3, 'YYYYYLYYYYbD'),
                     (1, 3, 'YYYYYYYYYYbD'), (2, 1, 'DDDDDDDDDDDDDDDD')],
            'left': [(-3, 6, 'LLYYbb'), (-2, 4, 'LYYYYYYYbb'), (-1, 3, 'LYYYYYYYYYbD'), (0, 3, 'YYYYYYYYYYbD'),
                     (1, 3, 'YYYYYYYYYYbD'), (2, 1, 'DDDDDDDDDDDDDDD')],
            'up': [(-3, 6, 'LYLYbb'), (-2, 4, 'LYYYLYYYbb'), (-1, 3, 'LYYYYLYYYYbD'), (0, 3, 'YYYYYLYYYYbD'),
                   (1, 3, 'YYYYYYYYYYbD'), (2, 2, 'DDDDDDDDDDDDDD')],
        },
    },
}
# Body items: absolute (row, x, text) per body shape; the hop frame uses the stand rows one higher.
BODIES = {
    'merchant': {  # teal sash knotted at the back; on a blob any panel under the eyes reads as teeth or a mask
        'stand': {
            'down': [(17, 2, 'EEEEEEEEEEEEEe'), (18, 2, 'eeeeeeeeeeeeee')],
            'left': [(17, 2, 'EEEEEEEEEEEEEeE'), (18, 2, 'eeeeeeeeeeeeeee')],
            'up': [(17, 2, 'EEEEEEeeEEEEEe'), (18, 2, 'eeeeeeeeeeeeee'), (19, 7, 'e..e')],
        },
        'squash': {
            'down': [(18, 1, 'EEEEEEEEEEEEEEEe'), (19, 2, 'eeeeeeeeeeeeee')],
            'left': [(18, 1, 'EEEEEEEEEEEEEEEe'), (19, 2, 'eeeeeeeeeeeeee')],
            'up': [(18, 1, 'EEEEEEEeeEEEEEEe'), (19, 2, 'eeeeeeeeeeeeee'), (20, 7, 'e..e')],
        },
        'sit': {
            'down': [(18, 1, 'EEEEEEEEEEEEEEEe'), (19, 2, 'eeeeeeeeeeeeee')],
            'left': [(18, 1, 'EEEEEEEEEEEEEEEe'), (19, 2, 'eeeeeeeeeeeeee')],
        },
        'sneak': {  # crouched, the sash's knot rings the body behind the face
            'left': [(15, 14, 'Ee'), (16, 14, 'EeE'), (17, 14, 'Ee'), (18, 14, 'EeE'), (19, 14, 'Ee'),
                     (20, 14, 'ee')],
        },
    },
    'farmer': {  # dark green neckerchief, point at the front: kept below the face (no mask), dark so mint bodies show it
        'stand': {
            'down': [(16, 2, 'ggggggggggggff'), (17, 2, 'ffffffffffffff'), (18, 6, 'ffffff'), (19, 8, 'ff')],
            'left': [(16, 2, 'ggggggggggggff'), (17, 2, 'fffffffffffffff'), (18, 2, 'ffff'), (18, 16, 'f'),
                     (19, 3, 'ff')],
            'up': [(16, 2, 'ggggggffggggff'), (17, 2, 'ffffffffffffff'), (18, 7, 'f..f'), (19, 7, 'f..f')],
        },
        'squash': {
            'down': [(17, 1, 'ggggggggggggggff'), (18, 1, 'ffffffffffffffff'), (19, 6, 'ffffff'), (20, 8, 'ff')],
            'left': [(17, 1, 'ggggggggggggggff'), (18, 1, 'ffffffffffffffff'), (19, 2, 'ffff'), (19, 15, 'f'),
                     (20, 3, 'ff')],
            'up': [(17, 1, 'gggggggffgggggff'), (18, 1, 'ffffffffffffffff'), (19, 7, 'f..f'), (20, 7, 'f..f')],
        },
        'sit': {
            'down': [(18, 1, 'ggggggggggggggff'), (19, 2, 'ffffffffffffff'), (20, 6, 'ffffff')],
            'left': [(18, 1, 'ggggggggggggggff'), (19, 2, 'ffffffffffffff'), (19, 15, 'f'), (20, 3, 'fff')],
        },
        'sneak': {  # the band rings the neck behind the face; nothing sits under the low eyes (no mask look)
            'left': [(13, 13, 'gf'), (14, 13, 'gf'), (15, 13, 'gf'), (16, 13, 'gf'), (17, 13, 'gf'),
                     (18, 13, 'gf'), (19, 13, 'ff'), (20, 13, 'ff')],
        },
    },
}
# Head items on the crouched sneak (facing left): the standing pose's left view moved with the face.
SNEAK_HEADS = {
    'police': [(10, 6, 'NANNNNNN'), (11, 5, 'NYYNNNNNNn'), (12, 5, 'NYbNNNNNNn'), (13, 5, 'nnnnnnnnnn'),
               (14, 2, 'NNNNNNnnnnnn')],
    'merchant': [(13, 4, 'EEEEEEEEEEEE'), (14, 3, 'eeeeeeeeeeeeee')],     # the knot is behind the hunch
    'clinic': [(11, 9, 'gg'), (12, 6, 'WWggggWWc'), (13, 4, 'WWWWWggWWWWc'), (13, 16, 'W'), (14, 16, 'c')],
    'builder': [(8, 8, 'LLYb'), (9, 6, 'LYYYYYbb'), (10, 5, 'LYYYYYYYbD'), (11, 5, 'YYYYYYYYbD'),
                (12, 5, 'YYYYYYYYbD'), (13, 2, 'DDDDDDDDDDDDDD')],
}
JOBS = ('police', 'merchant', 'clinic', 'builder', 'farmer')


def job_rows(job, pose, view):
    """A job item's grid for a pose and a drawn view (down, left or up)."""
    shape = POSES[pose][0]
    stamps = []
    if shape == 'sneak':
        stamps += SNEAK_HEADS.get(job, [])
    elif job in HEADS:
        top = min(SHAPES[shape])
        head = HEADS[job]['narrow' if shape in ('stand', 'hop') else 'wide'][view]
        stamps += [(top + r, x, text) for r, x, text in head]
    if job in BODIES:
        rows = BODIES[job]['stand' if shape == 'hop' else shape][view]
        stamps += [(y - (shape == 'hop'), x, text) for y, x, text in rows]
    return _stamp(stamps)


def job_item(job, pose, facing):
    """The item on the blob canvas plus the outline it needs where it leaves the body."""
    view = 'left' if facing == 'right' else facing
    a = np.array(sk.from_ascii(job_rows(job, pose, view), KEY))
    item = a[:, :, 3] > 0
    near = np.zeros_like(item)
    near[1:, :] |= item[:-1, :]
    near[:-1, :] |= item[1:, :]
    near[:, 1:] |= item[:, :-1]
    near[:, :-1] |= item[:, 1:]
    a[near & ~item & ~_mask(body_fill(pose, view))] = (*OUTLINE, 255)
    return _flip(Image.fromarray(a), facing)


# ---------------------------------------------------------------------------- composites
def character(pose, facing, job=None, expression='neutral', hue='sun'):
    """Body, face and job item drawn together, as the renderer stacks them."""
    im = sk.body_hue(body(pose, facing), hue)
    if facing != 'up' and expression:
        im.alpha_composite(_shift(face(expression, facing), *face_offset(pose, facing)))
    if job:
        im.alpha_composite(job_item(job, pose, facing))
    return im


def strip(cells):
    out = Image.new('RGBA', (len(cells) * (W + 1) - 1, H), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        out.alpha_composite(character(*cell), (i * (W + 1), 0))
    return out


PREVIEW_POSES = [('stand', 'down', 'neutral'), ('walk_0', 'left', 'happy'), ('walk_1', 'left', 'neutral'),
                 ('sit', 'right', 'sleep'), ('sneak', 'left', 'neutral'), ('stand', 'up', None)]


def build():
    sheet = sk.Sheet('characters')
    for stem, pose, facing in frames():
        meta = {'layer': 'body', 'pose': pose.split('_')[0], 'facing': facing}
        if pose.startswith('walk'):
            meta['frame'] = int(pose[-1])
        if facing != 'up':
            meta['face'] = face_offset(pose, facing)
        for hue in sk.BODY_HUES:
            sheet.add(f'blob_{hue}_{stem}', sk.body_hue(body(pose, facing), hue), anchor=ANCHOR, hue=hue, **meta)
    for expression in FACES:
        for facing in ('down', 'left', 'right'):
            sheet.add(f'face_{expression}_{facing}', face(expression, facing), anchor=ANCHOR,
                      layer='face', facing=facing)
    for job in JOBS:
        for stem, pose, facing in frames():
            sheet.add(f'job_{job}_{stem}', job_item(job, pose, facing), anchor=ANCHOR,
                      layer='job', job=job, facing=facing)
    sheet.add('preview_plain', strip([(p, f, None, e) for p, f, e in PREVIEW_POSES]), review_only=True)
    for job in JOBS:
        sheet.add(f'preview_{job}', strip([(p, f, job, e) for p, f, e in PREVIEW_POSES]), review_only=True)
    sheet.add('preview_faces_down', strip([('stand', 'down', None, e) for e in FACES]), review_only=True)
    sheet.add('preview_faces_left', strip([('walk_0', 'left', None, e) for e in FACES]), review_only=True)
    hues = list(sk.BODY_HUES)
    sheet.add('preview_hues', strip([('stand', 'down', None, 'neutral', h) for h in hues]), review_only=True)
    sheet.add('preview_hues_jobs', strip([('stand', 'down', job, 'neutral', h) for job, h in zip(JOBS, hues[1:])]),
              review_only=True)
    return sheet


if __name__ == '__main__':
    build().save()
